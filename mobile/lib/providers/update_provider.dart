import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:in_app_update/in_app_update.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../models/update_models.dart';
import '../services/api_client.dart';
import '../services/update_service.dart';

class UpdateProvider extends ChangeNotifier {
  static const String _skippedVersionKey = 'lupin_skipped_update_version_code_v1';
  static const String _remindAfterKey = 'lupin_update_remind_after_ms_v1';
  static const Duration _remindCooldown = Duration(hours: 24);
  static const Duration _periodicInterval = Duration(hours: 6);

  final UpdateService _service;

  String _installedVersion = AppConfig.defaultVersionName;
  int _installedVersionCode = AppConfig.defaultVersionCode;
  bool _isPlayStoreBuild = false;

  UpdateStage _stage = UpdateStage.idle;
  AppUpdateManifest? _manifest;
  AppUpdateInfo? _playInfo;
  bool _shouldPresentPrompt = false;
  bool _mandatory = false;
  int _downloadedBytes = 0;
  int _totalBytes = 0;
  String? _downloadedApkPath;
  String? _errorMessage;
  bool _cancelRequested = false;
  Timer? _periodicTimer;

  UpdateProvider(ApiClient client, {UpdateService? service})
      : _service = service ?? UpdateService(client);

  String get installedVersion => _installedVersion;
  int get installedVersionCode => _installedVersionCode;
  bool get isPlayStoreBuild => _isPlayStoreBuild;
  UpdateStage get stage => _stage;
  AppUpdateManifest? get manifest => _manifest;
  AppUpdateInfo? get playInfo => _playInfo;
  bool get shouldPresentPrompt => _shouldPresentPrompt;
  bool get mandatory => _mandatory;
  int get downloadedBytes => _downloadedBytes;
  int get totalBytes => _totalBytes;
  String? get downloadedApkPath => _downloadedApkPath;
  String? get errorMessage => _errorMessage;

  double get downloadProgress =>
      _totalBytes > 0 ? (_downloadedBytes / _totalBytes).clamp(0.0, 1.0) : 0.0;

  Future<void> initialize() async {
    try {
      final info = await PackageInfo.fromPlatform();
      _installedVersion = info.version.isNotEmpty ? info.version : AppConfig.defaultVersionName;
      _installedVersionCode = int.tryParse(info.buildNumber) ?? AppConfig.defaultVersionCode;
    } catch (_) {}

    _isPlayStoreBuild = await _service.isInstalledFromPlayStore();
    notifyListeners();

    await checkForUpdates(manual: false);

    _periodicTimer?.cancel();
    _periodicTimer = Timer.periodic(_periodicInterval, (_) {
      unawaited(checkForUpdates(manual: false));
    });
  }

  @override
  void dispose() {
    _periodicTimer?.cancel();
    super.dispose();
  }

  Future<void> checkForUpdates({bool manual = true}) async {
    if (!kIsWeb && !Platform.isAndroid && !manual) return;
    if (_stage == UpdateStage.downloading || _stage == UpdateStage.verifying) return;

    if (manual) {
      _stage = UpdateStage.checking;
      _errorMessage = null;
      notifyListeners();
    }

    // 1. If installed via Google Play, prioritize official Play Core In-App Updates
    if (_isPlayStoreBuild) {
      final play = await _service.checkPlayStoreUpdate();
      if (play != null) {
        _playInfo = play;
        if (play.installStatus == InstallStatus.downloaded) {
          _stage = UpdateStage.readyToInstall;
          _shouldPresentPrompt = true;
          notifyListeners();
          return;
        }
        if (play.updateAvailability == UpdateAvailability.updateAvailable) {
          _mandatory = play.immediateUpdateAllowed && !play.flexibleUpdateAllowed;
          _stage = UpdateStage.playStorePrompt;
          if (manual || _mandatory || await _canPromptOptional(play.availableVersionCode ?? 0)) {
            _shouldPresentPrompt = true;
          }
          notifyListeners();
          return;
        }
      }
    }

    // 2. Check configured remote / backend manifest endpoint
    try {
      final fetched = await _service.fetchManifest();
      _manifest = fetched;

      final available = fetched.configured &&
          fetched.isUpdateAvailable(
            installedVersion: _installedVersion,
            installedVersionCode: _installedVersionCode,
          );

      if (!available) {
        _stage = manual ? UpdateStage.upToDate : UpdateStage.idle;
        _shouldPresentPrompt = false;
        _mandatory = false;
        notifyListeners();
        return;
      }

      _mandatory = fetched.isMandatoryFor(_installedVersionCode);
      _stage = UpdateStage.available;

      if (manual || _mandatory || await _canPromptOptional(fetched.versionCode)) {
        _shouldPresentPrompt = true;
      }
      notifyListeners();
    } catch (e) {
      if (manual) {
        _stage = UpdateStage.error;
        _errorMessage = 'Unable to check for updates: $e';
        notifyListeners();
      }
    }
  }

  Future<bool> _canPromptOptional(int targetVersionCode) async {
    final prefs = await SharedPreferences.getInstance();
    final skipped = prefs.getInt(_skippedVersionKey);
    if (skipped != null && skipped == targetVersionCode) {
      return false;
    }
    final remindAfterMs = prefs.getInt(_remindAfterKey) ?? 0;
    if (DateTime.now().millisecondsSinceEpoch < remindAfterMs) {
      return false;
    }
    return true;
  }

  Future<void> remindMeLater() async {
    if (_mandatory) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(
      _remindAfterKey,
      DateTime.now().add(_remindCooldown).millisecondsSinceEpoch,
    );
    _shouldPresentPrompt = false;
    notifyListeners();
  }

  Future<void> skipThisVersion() async {
    if (_mandatory) return;
    final targetCode = _manifest?.versionCode ?? _playInfo?.availableVersionCode;
    if (targetCode != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_skippedVersionKey, targetCode);
    }
    _shouldPresentPrompt = false;
    notifyListeners();
  }

  void dismissBannerOnly() {
    if (_mandatory) return;
    _shouldPresentPrompt = false;
    notifyListeners();
  }

  Future<void> startUpdate() async {
    if (_stage == UpdateStage.playStorePrompt || (_isPlayStoreBuild && _playInfo != null)) {
      await _startPlayUpdateFlow();
      return;
    }

    final m = _manifest;
    if (m == null) return;

    _cancelRequested = false;
    _errorMessage = null;
    _downloadedBytes = 0;
    _totalBytes = m.fileSize;
    _stage = UpdateStage.downloading;
    notifyListeners();

    try {
      final apkFile = await _service.downloadAndVerifyApk(
        m,
        isCanceled: () => _cancelRequested,
        onProgress: (received, total) {
          _downloadedBytes = received;
          if (total > 0) _totalBytes = total;
          notifyListeners();
        },
      );

      _downloadedApkPath = apkFile.path;
      _stage = UpdateStage.verifying;
      notifyListeners();

      final hasPerm = await _service.canRequestPackageInstalls();
      if (!hasPerm) {
        _stage = UpdateStage.awaitingPermission;
        notifyListeners();
        return;
      }

      _stage = UpdateStage.readyToInstall;
      notifyListeners();
      await _service.installApk(apkFile.path);
    } catch (e) {
      _stage = UpdateStage.error;
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  Future<void> _startPlayUpdateFlow() async {
    final play = _playInfo;
    if (play == null) return;
    try {
      if (play.installStatus == InstallStatus.downloaded) {
        await _service.completePlayFlexibleUpdate();
        return;
      }
      if (_mandatory || (play.immediateUpdateAllowed && !play.flexibleUpdateAllowed)) {
        await _service.performPlayImmediateUpdate();
      } else if (play.flexibleUpdateAllowed) {
        _stage = UpdateStage.downloading;
        notifyListeners();
        final result = await _service.startPlayFlexibleUpdate();
        if (result == AppUpdateResult.success) {
          await _service.completePlayFlexibleUpdate();
        } else {
          _stage = UpdateStage.playStorePrompt;
          notifyListeners();
        }
      }
    } catch (e) {
      _stage = UpdateStage.error;
      _errorMessage = 'Google Play update failed: $e';
      notifyListeners();
    }
  }

  Future<void> openInstallPermissionSettings() async {
    await _service.openInstallPermissionSettings();
  }

  Future<void> resumeInstallAfterPermission() async {
    final apkPath = _downloadedApkPath;
    if (apkPath == null) return;
    final hasPerm = await _service.canRequestPackageInstalls();
    if (!hasPerm) {
      _stage = UpdateStage.awaitingPermission;
      notifyListeners();
      return;
    }
    try {
      _stage = UpdateStage.readyToInstall;
      notifyListeners();
      await _service.installApk(apkPath);
    } catch (e) {
      _stage = UpdateStage.error;
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  void cancelDownload() {
    if (_mandatory) return;
    _cancelRequested = true;
    _stage = UpdateStage.available;
    notifyListeners();
  }
}
