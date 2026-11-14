class AppUpdateManifest {
  final String latestVersion;
  final int versionCode;
  final String releaseNotes;
  final String apkUrl;
  final int fileSize;
  final String sha256;
  final bool mandatory;
  final int minSupportedVersionCode;
  final String playStoreUrl;
  final bool configured;

  const AppUpdateManifest({
    required this.latestVersion,
    required this.versionCode,
    required this.releaseNotes,
    required this.apkUrl,
    required this.fileSize,
    required this.sha256,
    required this.mandatory,
    required this.minSupportedVersionCode,
    required this.playStoreUrl,
    this.configured = true,
  });

  bool get hasValidHttpsApk {
    final uri = Uri.tryParse(apkUrl.trim());
    return uri != null &&
        uri.isAbsolute &&
        uri.scheme.toLowerCase() == 'https' &&
        RegExp(r'^[0-9a-f]{64}$').hasMatch(sha256.trim().toLowerCase());
  }

  factory AppUpdateManifest.fromJson(Map<String, dynamic> json) {
    final rawVersion = (json['latestVersion'] ?? json['version'] ?? '1.0.0').toString().trim();
    final rawCode = json['versionCode'] is num
        ? (json['versionCode'] as num).toInt()
        : int.tryParse((json['versionCode'] ?? '1').toString()) ?? 1;
    final rawSize = json['fileSize'] is num
        ? (json['fileSize'] as num).toInt()
        : int.tryParse((json['fileSize'] ?? '0').toString()) ?? 0;
    final rawMinCode = json['minSupportedVersionCode'] is num
        ? (json['minSupportedVersionCode'] as num).toInt()
        : int.tryParse((json['minSupportedVersionCode'] ?? '1').toString()) ?? 1;

    final apkUrl = (json['apkUrl'] ?? '').toString().trim();
    final sha256 = (json['sha256'] ?? '').toString().trim().toLowerCase();

    return AppUpdateManifest(
      latestVersion: rawVersion.isNotEmpty ? rawVersion : '1.0.0',
      versionCode: rawCode > 0 ? rawCode : 1,
      releaseNotes: (json['releaseNotes'] ?? '').toString().trim(),
      apkUrl: apkUrl,
      fileSize: rawSize >= 0 ? rawSize : 0,
      sha256: sha256,
      mandatory: json['mandatory'] == true,
      minSupportedVersionCode: rawMinCode > 0 ? rawMinCode : 1,
      playStoreUrl: (json['playStoreUrl'] ??
              'https://play.google.com/store/apps/details?id=com.lupinmovies.app')
          .toString()
          .trim(),
      configured: json['configured'] != false && apkUrl.isNotEmpty,
    );
  }

  /// Compares two semantic version strings (e.g., "1.2.0" vs "1.1.9").
  static int compareSemver(String a, String b) {
    List<int> parseParts(String v) => v
        .split('+')[0]
        .split('-')[0]
        .split('.')
        .map((s) => int.tryParse(s.trim()) ?? 0)
        .toList();
    final pa = parseParts(a);
    final pb = parseParts(b);
    final maxLen = pa.length > pb.length ? pa.length : pb.length;
    for (var i = 0; i < maxLen; i++) {
      final va = i < pa.length ? pa[i] : 0;
      final vb = i < pb.length ? pb[i] : 0;
      if (va != vb) return va.compareTo(vb);
    }
    return 0;
  }

  bool isUpdateAvailable({
    required String installedVersion,
    required int installedVersionCode,
  }) {
    if (versionCode > installedVersionCode) return true;
    if (versionCode == installedVersionCode &&
        compareSemver(latestVersion, installedVersion) > 0) {
      return true;
    }
    return false;
  }

  bool isMandatoryFor(int installedVersionCode) {
    return mandatory || installedVersionCode < minSupportedVersionCode;
  }
}

enum UpdateStage {
  idle,
  checking,
  available,
  downloading,
  verifying,
  awaitingPermission,
  readyToInstall,
  playStorePrompt,
  upToDate,
  error,
}
