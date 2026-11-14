import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lupin_movies/models/update_models.dart';
import 'package:lupin_movies/providers/update_provider.dart';
import 'package:lupin_movies/services/api_client.dart';
import 'package:lupin_movies/services/update_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('AppUpdateManifest version comparison & security rules', () {
    test('detects update via buildNumber or semver bump', () {
      const m = AppUpdateManifest(
        latestVersion: '1.2.0',
        versionCode: 5,
        releaseNotes: 'Bug fixes',
        apkUrl: 'https://cdn.example.com/lupin.apk',
        fileSize: 1024,
        sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        mandatory: false,
        minSupportedVersionCode: 3,
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.lupinmovies.app',
      );

      expect(m.isUpdateAvailable(installedVersion: '1.1.0', installedVersionCode: 4), isTrue);
      expect(m.isUpdateAvailable(installedVersion: '1.1.9', installedVersionCode: 5), isTrue);
      expect(m.isUpdateAvailable(installedVersion: '1.2.0', installedVersionCode: 5), isFalse);
      expect(m.isUpdateAvailable(installedVersion: '1.3.0', installedVersionCode: 5), isFalse);

      expect(m.isMandatoryFor(2), isTrue); // below minSupportedVersionCode (3)
      expect(m.isMandatoryFor(3), isFalse);
    });

    test('enforces HTTPS URL and valid 64-hex SHA-256 digest', () {
      final validHttps = AppUpdateManifest.fromJson({
        'latestVersion': '2.0.0',
        'versionCode': 10,
        'apkUrl': 'https://github.com/lupinstarnley/lupin/releases/download/v2.0.0/app.apk',
        'sha256': '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      });
      expect(validHttps.hasValidHttpsApk, isTrue);
      expect(validHttps.configured, isTrue);

      final insecureHttp = AppUpdateManifest.fromJson({
        'latestVersion': '2.0.0',
        'versionCode': 10,
        'apkUrl': 'http://insecure.example.com/app.apk',
        'sha256': '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      });
      expect(insecureHttp.hasValidHttpsApk, isFalse);

      final badChecksum = AppUpdateManifest.fromJson({
        'latestVersion': '2.0.0',
        'versionCode': 10,
        'apkUrl': 'https://cdn.example.com/app.apk',
        'sha256': 'not-a-valid-sha',
      });
      expect(badChecksum.hasValidHttpsApk, isFalse);
    });
  });

  group('UpdateService & UpdateProvider prompt policy', () {
    late HttpServer server;
    late String baseUrl;
    late Map<String, dynamic> manifestPayload;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      baseUrl = 'http://127.0.0.1:${server.port}';
      manifestPayload = {
        'configured': true,
        'latestVersion': '1.5.0',
        'versionCode': 4,
        'apkUrl': 'https://releases.lupinmovies.app/lupin_v1.5.0.apk',
        'sha256': 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        'fileSize': 25000000,
        'releaseNotes': 'Faster ExoPlayer + Offline Downloads',
        'mandatory': false,
        'minSupportedVersionCode': 1,
      };
      server.listen((req) async {
        if (req.uri.path == '/api/local/app-update') {
          req.response.statusCode = HttpStatus.ok;
          req.response.headers.contentType = ContentType.json;
          req.response.write(jsonEncode(manifestPayload));
          await req.response.close();
        } else {
          req.response.statusCode = HttpStatus.notFound;
          await req.response.close();
        }
      });
    });

    tearDown(() async {
      await server.close(force: true);
    });

    test('optional update can be reminded later or skipped; mandatory cannot be suppressed', () async {
      final client = ApiClient()..setBaseUrl(baseUrl);
      final provider = UpdateProvider(client);

      await provider.checkForUpdates(manual: true);
      expect(provider.stage, UpdateStage.available);
      expect(provider.shouldPresentPrompt, isTrue);
      expect(provider.mandatory, isFalse);

      await provider.remindMeLater();
      expect(provider.shouldPresentPrompt, isFalse);

      // Non-manual check within 24h cooldown stays quiet
      await provider.checkForUpdates(manual: false);
      expect(provider.shouldPresentPrompt, isFalse);

      // Skip this version permanently suppresses non-manual prompt for v4
      await provider.skipThisVersion();
      await provider.checkForUpdates(manual: false);
      expect(provider.shouldPresentPrompt, isFalse);

      // Mandatory release ignores Remind/Skip suppression
      manifestPayload['mandatory'] = true;
      manifestPayload['versionCode'] = 5;
      await provider.checkForUpdates(manual: true);
      expect(provider.mandatory, isTrue);
      expect(provider.shouldPresentPrompt, isTrue);

      await provider.remindMeLater();
      await provider.skipThisVersion();
      expect(provider.shouldPresentPrompt, isTrue);

      provider.dispose();
    });

    test('computeFileSha256 matches known SHA-256 digest & downloadAndVerifyApk refuses HTTP links', () async {
      final dir = await Directory.systemTemp.createTemp('lupin_upd_test_');
      addTearDown(() async {
        if (await dir.exists()) await dir.delete(recursive: true);
      });

      final testFile = File('${dir.path}/sample.apk');
      final payload = utf8.encode('LUPIN_APK_PAYLOAD');
      await testFile.writeAsBytes(payload);
      final expected = sha256.convert(payload).toString();
      final actual = await UpdateService.computeFileSha256(testFile);
      expect(actual, expected);

      final service = UpdateService(
        ApiClient()..setBaseUrl(baseUrl),
        updatesDirectoryBuilder: () async => dir,
      );

      final insecureManifest = AppUpdateManifest(
        latestVersion: '2.0.0',
        versionCode: 9,
        releaseNotes: 'Insecure',
        apkUrl: '$baseUrl/app.apk', // HTTP (not HTTPS)
        fileSize: payload.length,
        sha256: expected,
        mandatory: false,
        minSupportedVersionCode: 1,
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.lupinmovies.app',
      );

      await expectLater(
        () => service.downloadAndVerifyApk(
          insecureManifest,
          onProgress: (_, __) {},
          isCanceled: () => false,
        ),
        throwsFormatException,
      );
    });
  });
}
