# LUPIN MOVIES

**LUPIN MOVIES** is a multi-platform entertainment ecosystem built and designed by **Lupin Starnley** (`lupinstarnley009@gmail.com`), combining:

1. **Web Application & Vercel Serverless Backend (`/`, `/src`, `/api`, `/server`)**
   - React + TypeScript + Vite + Tailwind CSS + Express/Vercel Serverless Functions + Supabase/PostgreSQL.
   - Six complete selectable UI Editions (**Cinematic** default, **Classic**, **Sidebar**, **Editorial**, **Neon**, **Minimalist**).
   - FRAMEX media aggregation across Movies, TV Series, Anime Center (AnimeX & Gotaku), Live TV, Sports Center (GoalNivo), Wrestling, and Novel Library.

2. **Native Flutter Android & iOS Mobile App (`/mobile`)**
   - Package / Bundle ID: `com.lupinmovies.app`
   - Supports Android phones & tablets (`minSdk 23`) and iPhones & iPads (`iOS 13.0+`).
   - Recreates all 6 Editions natively in Flutter with edition-specific navigation, typography, and cards, plus a full landscape/portrait video player with provider-aware HLS/Showbox/AnimeX/WebView playback, subtitles (WebVTT/SRT), playback speed, episode switching, and cloud watchlist/history sync.

3. **GitHub Actions CI/CD (`/.github/workflows`)**
   - `android-build.yml` — Automated Dart analyze, Flutter tests, release APK, and AAB builds.
   - `ios-build.yml` — macOS Xcode + CocoaPods analyze, test, and signed `.ipa` export (with `--no-codesign` fallback when Apple secrets aren't set).
   - `release.yml` — Tag-driven (`v*.*.*`) and manual GitHub Release asset publishing.

See [MOBILE_CI_SETUP.md](./MOBILE_CI_SETUP.md) for Android keystore, Apple Developer certificate/provisioning profile, and `API_BASE_URL` configuration instructions.
