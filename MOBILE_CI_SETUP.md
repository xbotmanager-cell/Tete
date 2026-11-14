# LUPIN MOVIES Mobile CI/CD & Signing Guide

This guide explains how the **Flutter Android & iOS applications** (`/mobile`) connect to the existing **Vercel / Supabase / FRAMEX** web backend at the repository root and how to configure **GitHub Actions** (`/.github/workflows`) to produce store-ready signed builds.

---

## 1. Repository Architecture

- `/` — **Web App & Vercel Backend** (`src/`, `api/`, `server/`, `server.ts`, `vercel.json`)
  - Web files remain at `/` so Vercel Root Directory (`./`) continues deploying automatically with zero breaking changes.
  - `/api/local/*` supports both HTTP-only cookies (`lupin_session` on web) and `Authorization: Bearer <token>` (for Flutter Android/iOS via `FlutterSecureStorage`).
- `/mobile` — **Native Flutter App** (`LUPIN MOVIES`, `com.lupinmovies.app`)
  - Supports **Android** (phones & tablets, `minSdk 23`, `targetSdk 34`) and **iOS** (iPhones & iPads, `iOS 13.0+`).
  - Contains **no FRAMEX API keys or database secrets** — all catalog, streaming, subtitle proxy, auth, library sync, and watch-progress calls go through `API_BASE_URL` on your Vercel deployment.
- `/.github/workflows/` — **Automated CI/CD**:
  - `android-build.yml` (`ubuntu-latest`) — `flutter analyze`, `flutter test`, release `.apk` + `.aab`
  - `ios-build.yml` (`macos-14`) — `flutter analyze`, `flutter test`, CocoaPods, signed `.ipa` (or `--no-codesign` verification build when Apple secrets are not yet set)
  - `release.yml` — Triggered on `v*.*.*` git tags or manual dispatch to publish GitHub Releases with APK, AAB, and IPA assets.

---

## 2. GitHub Repository Variables

In GitHub → **Settings → Secrets and variables → Actions → Variables**:

| Variable | Description | Example |
|---|---|---|
| `API_BASE_URL` | Your production Vercel domain used by mobile builds (`--dart-define=API_BASE_URL=...`) | `https://lupin-movies.vercel.app` |
| `IOS_EXPORT_METHOD` | Optional Xcode export method (`app-store-connect`, `ad-hoc`, `development`, `enterprise`) | `app-store-connect` |

> Users can also override the backend URL inside the mobile app under **Profile & Settings → Backend Server URL**.

---

## 3. Android Release Signing (Google Play Store)

Without keystore secrets, `android-build.yml` falls back to debug signing so you can still test APKs locally, **but Google Play requires a release upload keystore**.

### Generate a Keystore
```bash
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
base64 -w 0 upload-keystore.jks > keystore.b64
```

### Add GitHub Secrets (**Settings → Secrets and variables → Actions → Secrets**)
| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Contents of `keystore.b64` |
| `ANDROID_KEY_ALIAS` | `upload` (your chosen alias) |
| `ANDROID_STORE_PASSWORD` | Keystore store password |
| `ANDROID_KEY_PASSWORD` | Key password |

---

## 4. iOS Signing & IPA Export (Apple Developer Account Required)

An **active Apple Developer Program membership ($99/year)** is mandatory to sign `.ipa` packages for TestFlight, App Store Connect, or Ad-Hoc distribution on physical iOS devices.

When Apple secrets are absent, `ios-build.yml` runs `flutter build ios --release --no-codesign` on `macos-14` to verify compilation and uploads `Runner-unsigned.app.zip`. **Unsigned builds cannot be installed on physical iPhones/iPads or submitted to App Store Connect.**

### Required Apple Secrets
1. Create an **App ID** for `com.lupinmovies.app` in Apple Developer Portal.
2. Create an **iOS Distribution Certificate** (`.cer`) in Keychain Access → export with private key as `.p12`.
3. Create an **App Store** or **Ad Hoc** Provisioning Profile (`.mobileprovision`) bound to `com.lupinmovies.app`.
4. Encode both files in base64:
   ```bash
   base64 -i Certificates.p12 | tr -d '\n' > cert.b64
   base64 -i Lupin_Movies_AppStore.mobileprovision | tr -d '\n' > profile.b64
   ```
5. Add these GitHub Secrets:

| Secret | Value |
|---|---|
| `IOS_BUILD_CERTIFICATE_BASE64` | Base64 `.p12` distribution certificate |
| `IOS_P12_PASSWORD` | Password used when exporting `.p12` |
| `IOS_PROVISION_PROFILE_BASE64` | Base64 `.mobileprovision` file |
| `IOS_TEAM_ID` | Your 10-character Apple Developer Team ID |
| `IOS_KEYCHAIN_PASSWORD` | Temporary CI keychain password (any strong random string) |

---

## 5. Local Flutter Commands

```bash
cd mobile
flutter pub get
flutter analyze
flutter test

# Run against your deployed Vercel backend
flutter run --dart-define=API_BASE_URL=https://your-vercel-domain.vercel.app

# Build Android APK / AAB locally
flutter build apk --release --dart-define=API_BASE_URL=https://your-vercel-domain.vercel.app
flutter build appbundle --release --dart-define=API_BASE_URL=https://your-vercel-domain.vercel.app

# Build iOS IPA locally (macOS + Xcode required)
flutter build ipa --release --dart-define=API_BASE_URL=https://your-vercel-domain.vercel.app
```

---

## 6. Automatic App Update & Release Publishing Workflow

LUPIN MOVIES supports automatic startup, periodic (every 6 hours), and manual (**Profile & Settings → Check for Updates**) update checks using two delivery paths:

1. **Google Play Store builds (`installer == com.android.vending`)** — Uses the official Android Play Core **In-App Updates** API (Flexible update UI for optional updates, Immediate full-screen update UI when marked critical in Google Play Console).
2. **Direct APK / GitHub Release / Website builds** — Fetches the JSON manifest from `/api/local/app-update` (or an explicit `--dart-define=UPDATE_MANIFEST_URL=...`), downloads the signed APK over **HTTPS only**, validates the **SHA-256 checksum** AND verifies via Android `PackageManager` that `packageName == com.lupinmovies.app`, `versionCode >= installed`, and the **APK signing certificate matches** the installed build before triggering Android `FileProvider` installation (preserving user auth, library sync, and downloads).

### Release Publishing Steps

1. **Bump version in `mobile/pubspec.yaml`** (`versionName+versionCode`, e.g. `1.1.0+2`):
   ```yaml
   version: 1.1.0+2
   ```
2. **Build the signed release APK** using the **same upload/release keystore** (`ANDROID_KEYSTORE_BASE64`) used for previous releases:
   ```bash
   cd mobile
   flutter build apk --release \
     --dart-define=API_BASE_URL=https://your-vercel-domain.vercel.app
   ```
   *(Or tag a release `git tag v1.1.0 && git push --tags` so GitHub Actions builds and attaches the signed APK automatically.)*
3. **Compute the APK byte size and SHA-256 checksum**:
   ```bash
   sha256sum build/app/outputs/flutter-apk/app-release.apk
   wc -c build/app/outputs/flutter-apk/app-release.apk
   ```
4. **Host the APK over HTTPS** (e.g., GitHub Releases asset URL or HTTPS CDN).
5. **Publish the update metadata** via either:
   - **Option A — Vercel Environment Variables** (served directly by `/api/local/app-update`):
     ```env
     APP_LATEST_VERSION=1.1.0
     APP_LATEST_VERSION_CODE=2
     APP_APK_URL=https://github.com/lupinstarnley/lupin-movies/releases/download/v1.1.0/lupin-movies-v1.1.0.apk
     APP_APK_SHA256=<64-hex-sha256>
     APP_APK_FILE_SIZE=<bytes>
     APP_UPDATE_RELEASE_NOTES=Improved Android ExoPlayer playback, offline Download Manager, and stability fixes.
     APP_UPDATE_MANDATORY=false
     APP_MIN_SUPPORTED_VERSION_CODE=1
     ```
   - **Option B — External HTTPS JSON Manifest** (`APP_UPDATE_MANIFEST_URL=https://.../app-update.json` or `--dart-define=UPDATE_MANIFEST_URL=...`):
     ```json
     {
       "configured": true,
       "latestVersion": "1.1.0",
       "versionCode": 2,
       "apkUrl": "https://github.com/lupinstarnley/lupin-movies/releases/download/v1.1.0/lupin-movies-v1.1.0.apk",
       "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
       "fileSize": 48231940,
       "releaseNotes": "- Fixed ExoPlayer source errors across HLS and MP4 mirrors\n- Added background offline Download Manager\n- Performance improvements",
       "mandatory": false,
       "minSupportedVersionCode": 1,
       "playStoreUrl": "https://play.google.com/store/apps/details?id=com.lupinmovies.app"
     }
     ```

### Update Policy Behavior
- **Optional Update** (`mandatory: false` and `installedVersionCode >= minSupportedVersionCode`): Users can choose **Update Now**, **Remind Later** (24-hour cooldown), or **Skip Version** (won't re-prompt until a newer `versionCode` is published).
- **Mandatory Update** (`mandatory: true` or `installedVersionCode < minSupportedVersionCode`): Prompt is non-dismissible until updated.

