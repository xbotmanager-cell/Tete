import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:in_app_update/in_app_update.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import '../config/app_config.dart';
import '../models/update_models.dart';
import '../services/api_client.dart';

class ApkVerificationResult {
  final bool valid;
  final String? error;
  final String? packageName;
  final int? versionCode;
  final String? signingCertSha256;

  const ApkVerificationResult({
    required this.valid,
    this.error,
    this.packageName,
    this.versionCode,
    this.signingCertSha256,
  });
}

class UpdateService {
  static const MethodChannel _channel = MethodChannel('com.lupinmovies.app/updater');

  final ApiClient apiClient;
  final Future<Directory> Function()? _updatesDirectoryBuilder;

  UpdateService(
    this.apiClient, {
    Future<Directory> Function()? updatesDirectoryBuilder,
  }) : _updatesDirectoryBuilder = updatesDirectoryBuilder;

  Future<String?> getInstallerPackageName() async {
    if (kIsWeb || !Platform.isAndroid) return null;
    try {
      return await _channel.invokeMethod<String>('getInstallerPackageName');
    } catch (_) {
      return null;
    }
  }

  Future<bool> isInstalledFromPlayStore() async {
    final installer = await getInstallerPackageName();
    return installer == 'com.android.vending';
  }

  /// Checks Google Play Store In-App Update availability cleanly when Play-installed.
  Future<AppUpdateInfo?> checkPlayStoreUpdate() async {
    if (kIsWeb || !Platform.isAndroid) return null;
    try {
      return await InAppUpdate.checkForUpdate();
    } catch (_) {
      return null;
    }
  }

  Future<void> performPlayImmediateUpdate() async {
    await InAppUpdate.performImmediateUpdate();
  }

  Future<AppUpdateResult> startPlayFlexibleUpdate() async {
    return InAppUpdate.startFlexibleUpdate();
  }

  Future<void> completePlayFlexibleUpdate() async {
    await InAppUpdate.completeFlexibleUpdate();
  }

  String resolveManifestUrl() {
    const custom = AppConfig.defaultUpdateManifestUrl;
    if (custom.trim().isNotEmpty) return custom.trim();
    return '${apiClient.baseUrl}/api/local/app-update';
  }

  Future<AppUpdateManifest> fetchManifest({String? overrideUrl}) async {
    final url = (overrideUrl != null && overrideUrl.trim().isNotEmpty)
        ? overrideUrl.trim()
        : resolveManifestUrl();
    final uri = Uri.parse(url);
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 12);
    try {
      final req = await client.getUrl(uri);
      req.headers.set(HttpHeaders.acceptHeader, 'application/json');
      final resp = await req.close().timeout(const Duration(seconds: 12));
      if (resp.statusCode < 200 || resp.statusCode >= 300) {
        throw HttpException('Update manifest HTTP ${resp.statusCode}');
      }
      final body = await utf8.decodeStream(resp);
      final decoded = jsonDecode(body);
      if (decoded is! Map) {
        throw const FormatException('Invalid update manifest JSON');
      }
      return AppUpdateManifest.fromJson(Map<String, dynamic>.from(decoded));
    } finally {
      client.close(force: true);
    }
  }

  Future<bool> canRequestPackageInstalls() async {
    if (kIsWeb || !Platform.isAndroid) return true;
    try {
      final allowed = await _channel.invokeMethod<bool>('canRequestPackageInstalls');
      return allowed ?? false;
    } catch (_) {
      return false;
    }
  }

  Future<void> openInstallPermissionSettings() async {
    if (kIsWeb || !Platform.isAndroid) return;
    await _channel.invokeMethod('openInstallPermissionSettings');
  }

  Future<Directory> _getUpdatesDir() async {
    if (_updatesDirectoryBuilder != null) {
      final d = await _updatesDirectoryBuilder();
      if (!await d.exists()) await d.create(recursive: true);
      return d;
    }
    if (!kIsWeb && Platform.isAndroid) {
      try {
        final dirPath = await _channel.invokeMethod<String>('getUpdatesDirectory');
        if (dirPath != null && dirPath.isNotEmpty) {
          final d = Directory(dirPath);
          if (!await d.exists()) await d.create(recursive: true);
          return d;
        }
      } catch (_) {}
    }
    final tmp = await getTemporaryDirectory();
    final dir = Directory(p.join(tmp.path, 'updates'));
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  /// Downloads APK over HTTPS only, verifies SHA-256 digest & Android package/signing certificate.
  Future<File> downloadAndVerifyApk(
    AppUpdateManifest manifest, {
    required void Function(int received, int total) onProgress,
    required bool Function() isCanceled,
  }) async {
    if (!manifest.hasValidHttpsApk) {
      throw const FormatException(
        'Update manifest missing a valid HTTPS APK URL or SHA-256 checksum.',
      );
    }

    final updatesDir = await _getUpdatesDir();
    final targetPath = p.join(updatesDir.path, 'lupin_movies_v${manifest.versionCode}.apk');
    final partFile = File('$targetPath.part');
    final targetFile = File(targetPath);

    if (await partFile.exists()) await partFile.delete();
    if (await targetFile.exists()) await targetFile.delete();

    final client = HttpClient()..connectionTimeout = const Duration(seconds: 20);
    try {
      var currentUri = Uri.parse(manifest.apkUrl);
      HttpClientResponse? response;
      for (var hop = 0; hop < 6; hop++) {
        if (currentUri.scheme.toLowerCase() != 'https') {
          throw const HttpException('Refusing non-HTTPS APK redirect for security.');
        }
        final req = await client.getUrl(currentUri);
        req.followRedirects = false;
        final resp = await req.close();
        if (resp.statusCode >= 300 && resp.statusCode < 400) {
          final loc = resp.headers.value(HttpHeaders.locationHeader);
          await resp.drain<void>().catchError((_) {});
          if (loc == null) break;
          currentUri = currentUri.resolve(loc.trim());
          continue;
        }
        response = resp;
        break;
      }

      if (response == null || response.statusCode != 200) {
        throw HttpException('APK download failed (HTTP ${response?.statusCode ?? 502}).');
      }

      final totalBytes = response.contentLength > 0 ? response.contentLength : manifest.fileSize;
      int received = 0;

      final sink = partFile.openWrite();
      try {
        await for (final chunk in response) {
          if (isCanceled()) {
            throw const HttpException('Update download canceled.');
          }
          sink.add(chunk);
          received += chunk.length;
          onProgress(received, totalBytes);
        }
      } finally {
        await sink.flush();
        await sink.close();
      }

      final actualSha = await computeFileSha256(partFile);
      if (actualSha.toLowerCase() != manifest.sha256.trim().toLowerCase()) {
        await partFile.delete();
        throw StateError('APK checksum verification failed (corrupted or tampered download).');
      }

      await partFile.rename(targetFile.path);

      if (!kIsWeb && Platform.isAndroid) {
        final apkCheck = await verifyApkSignature(targetFile.path);
        if (!apkCheck.valid) {
          await targetFile.delete();
          throw StateError(apkCheck.error ?? 'APK signing verification failed.');
        }
      }

      return targetFile;
    } catch (_) {
      if (await partFile.exists()) {
        await partFile.delete().catchError((_) => partFile);
      }
      rethrow;
    } finally {
      client.close(force: true);
    }
  }

  static Future<String> computeFileSha256(File file) async {
    final digest = await sha256.bind(file.openRead()).first;
    return digest.toString();
  }

  Future<ApkVerificationResult> verifyApkSignature(String filePath) async {
    if (kIsWeb || !Platform.isAndroid) {
      return const ApkVerificationResult(valid: true);
    }
    final res = await _channel.invokeMethod<Map>('verifyDownloadedApk', {
      'filePath': filePath,
    });
    return ApkVerificationResult(
      valid: res?['valid'] == true,
      error: res?['error']?.toString(),
      packageName: res?['packageName']?.toString(),
      versionCode: (res?['versionCode'] as num?)?.toInt(),
      signingCertSha256: res?['signingCertSha256']?.toString(),
    );
  }

  Future<void> installApk(String filePath) async {
    if (kIsWeb || !Platform.isAndroid) return;
    await _channel.invokeMethod('installApk', {'filePath': filePath});
  }
}
