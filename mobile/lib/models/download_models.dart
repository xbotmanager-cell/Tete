import 'dart:convert';

enum DownloadStatus {
  queued('queued', 'Queued'),
  downloading('downloading', 'Downloading'),
  paused('paused', 'Paused'),
  completed('completed', 'Completed'),
  failed('failed', 'Failed'),
  canceled('canceled', 'Canceled');

  final String key;
  final String label;

  const DownloadStatus(this.key, this.label);

  static DownloadStatus fromKey(String? value) {
    final lower = (value ?? '').trim().toLowerCase();
    for (final status in DownloadStatus.values) {
      if (status.key == lower) return status;
    }
    return DownloadStatus.queued;
  }

  bool get isActive =>
      this == DownloadStatus.queued ||
      this == DownloadStatus.downloading ||
      this == DownloadStatus.paused;
}

class DownloadQualityOption {
  final String quality;
  final String url;
  final Map<String, String> headers;
  final int? sizeBytes;
  final String? format;

  const DownloadQualityOption({
    required this.quality,
    required this.url,
    this.headers = const {},
    this.sizeBytes,
    this.format,
  });
}

class DownloadRecord {
  final String id;
  final String dedupeKey;
  final String title;
  final String? subtitle;
  final String? posterUrl;
  final String provider;
  final String contentId;
  final String slug;
  final String mediaType;
  final int season;
  final int episode;
  final String quality;
  final String sourceUrl;
  final Map<String, String> headers;
  final String? mimeType;
  final String? localFilePath;
  final int? platformDownloadId;
  final DownloadStatus status;
  final int downloadedBytes;
  final int totalBytes;
  final String? errorMessage;
  final DateTime createdAt;
  final DateTime updatedAt;

  const DownloadRecord({
    required this.id,
    required this.dedupeKey,
    required this.title,
    this.subtitle,
    this.posterUrl,
    required this.provider,
    required this.contentId,
    required this.slug,
    required this.mediaType,
    this.season = 0,
    this.episode = 0,
    this.quality = 'HD',
    required this.sourceUrl,
    this.headers = const {},
    this.mimeType,
    this.localFilePath,
    this.platformDownloadId,
    required this.status,
    this.downloadedBytes = 0,
    this.totalBytes = 0,
    this.errorMessage,
    required this.createdAt,
    required this.updatedAt,
  });

  static String buildDedupeKey({
    required String provider,
    required String contentId,
    int season = 0,
    int episode = 0,
  }) {
    return '${provider.trim().toLowerCase()}:${contentId.trim()}:s$season:e$episode';
  }

  double get progress {
    if (status == DownloadStatus.completed) return 1.0;
    if (totalBytes <= 0) return 0.0;
    return (downloadedBytes / totalBytes).clamp(0.0, 1.0);
  }

  int get progressPercent => (progress * 100).round().clamp(0, 100);

  DownloadRecord copyWith({
    String? sourceUrl,
    Map<String, String>? headers,
    String? mimeType,
    String? localFilePath,
    int? platformDownloadId,
    bool clearPlatformDownloadId = false,
    DownloadStatus? status,
    int? downloadedBytes,
    int? totalBytes,
    String? errorMessage,
    bool clearError = false,
    DateTime? updatedAt,
  }) {
    return DownloadRecord(
      id: id,
      dedupeKey: dedupeKey,
      title: title,
      subtitle: subtitle,
      posterUrl: posterUrl,
      provider: provider,
      contentId: contentId,
      slug: slug,
      mediaType: mediaType,
      season: season,
      episode: episode,
      quality: quality,
      sourceUrl: sourceUrl ?? this.sourceUrl,
      headers: headers ?? this.headers,
      mimeType: mimeType ?? this.mimeType,
      localFilePath: localFilePath ?? this.localFilePath,
      platformDownloadId:
          clearPlatformDownloadId ? null : (platformDownloadId ?? this.platformDownloadId),
      status: status ?? this.status,
      downloadedBytes: downloadedBytes ?? this.downloadedBytes,
      totalBytes: totalBytes ?? this.totalBytes,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toDbMap() {
    return {
      'id': id,
      'dedupe_key': dedupeKey,
      'title': title,
      'subtitle': subtitle,
      'poster_url': posterUrl,
      'provider': provider,
      'content_id': contentId,
      'slug': slug,
      'media_type': mediaType,
      'season': season,
      'episode': episode,
      'quality': quality,
      'source_url': sourceUrl,
      'headers_json': jsonEncode(headers),
      'mime_type': mimeType,
      'local_file_path': localFilePath,
      'platform_download_id': platformDownloadId,
      'status': status.key,
      'downloaded_bytes': downloadedBytes,
      'total_bytes': totalBytes,
      'error_message': errorMessage,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory DownloadRecord.fromDbMap(Map<String, dynamic> map) {
    Map<String, String> parsedHeaders = const {};
    final rawHeaders = map['headers_json']?.toString();
    if (rawHeaders != null && rawHeaders.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawHeaders);
        if (decoded is Map) {
          parsedHeaders = decoded.map((k, v) => MapEntry(k.toString(), v.toString()));
        }
      } catch (_) {}
    }

    return DownloadRecord(
      id: (map['id'] ?? '').toString(),
      dedupeKey: (map['dedupe_key'] ?? '').toString(),
      title: (map['title'] ?? 'Untitled').toString(),
      subtitle: map['subtitle']?.toString(),
      posterUrl: map['poster_url']?.toString(),
      provider: (map['provider'] ?? 'moviebox').toString(),
      contentId: (map['content_id'] ?? '').toString(),
      slug: (map['slug'] ?? '').toString(),
      mediaType: (map['media_type'] ?? 'movie').toString(),
      season: (map['season'] as num?)?.toInt() ?? 0,
      episode: (map['episode'] as num?)?.toInt() ?? 0,
      quality: (map['quality'] ?? 'HD').toString(),
      sourceUrl: (map['source_url'] ?? '').toString(),
      headers: parsedHeaders,
      mimeType: map['mime_type']?.toString(),
      localFilePath: map['local_file_path']?.toString(),
      platformDownloadId: (map['platform_download_id'] as num?)?.toInt(),
      status: DownloadStatus.fromKey(map['status']?.toString()),
      downloadedBytes: (map['downloaded_bytes'] as num?)?.toInt() ?? 0,
      totalBytes: (map['total_bytes'] as num?)?.toInt() ?? 0,
      errorMessage: map['error_message']?.toString(),
      createdAt: DateTime.tryParse((map['created_at'] ?? '').toString()) ?? DateTime.now(),
      updatedAt: DateTime.tryParse((map['updated_at'] ?? '').toString()) ?? DateTime.now(),
    );
  }
}

String formatBytes(int bytes) {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return '$bytes B';
  final kb = bytes / 1024;
  if (kb < 1024) return '${kb.toStringAsFixed(0)} KB';
  final mb = kb / 1024;
  if (mb < 1024) return '${mb.toStringAsFixed(1)} MB';
  final gb = mb / 1024;
  return '${gb.toStringAsFixed(2)} GB';
}
