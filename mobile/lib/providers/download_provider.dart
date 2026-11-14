import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import '../models/download_models.dart';
import '../models/framex_models.dart';
import '../services/api_client.dart';
import '../services/download_store.dart';
import '../services/stream_resolver.dart';

class DownloadRequestResult {
  final bool started;
  final bool alreadyExists;
  final String message;
  final DownloadRecord? record;

  const DownloadRequestResult({
    required this.started,
    this.alreadyExists = false,
    required this.message,
    this.record,
  });
}

class _DartStreamTask {
  final HttpClient client;
  final Completer<void> done = Completer<void>();
  bool paused = false;
  bool canceled = false;

  _DartStreamTask(this.client);
}

class DownloadProvider extends ChangeNotifier {
  static const MethodChannel _androidChannel = MethodChannel('com.lupinmovies.app/downloads');

  final ApiClient apiClient;
  final DownloadStore _store;
  final bool _useAndroidDownloadManager;
  final Future<Directory> Function()? _storageDirectoryBuilder;

  List<DownloadRecord> _records = [];
  bool _initialized = false;
  Timer? _pollTimer;
  final Map<String, _DartStreamTask> _dartTasks = {};

  DownloadProvider(
    this.apiClient, {
    DownloadStore? store,
    bool? useAndroidDownloadManager,
    Future<Directory> Function()? storageDirectoryBuilder,
  })  : _store = store ?? SqliteDownloadStore(),
        _useAndroidDownloadManager = useAndroidDownloadManager ??
            (!kIsWeb && Platform.isAndroid),
        _storageDirectoryBuilder = storageDirectoryBuilder;

  List<DownloadRecord> get records => List.unmodifiable(_records);
  bool get initialized => _initialized;
  bool get supportsManualPause => !_useAndroidDownloadManager;

  int get activeCount => _records.where((r) => r.status.isActive).length;
  int get completedCount => _records.where((r) => r.status == DownloadStatus.completed).length;

  DownloadRecord? findByContent({
    required String provider,
    required String contentId,
    int season = 0,
    int episode = 0,
  }) {
    final key = DownloadRecord.buildDedupeKey(
      provider: provider,
      contentId: contentId,
      season: season,
      episode: episode,
    );
    for (final rec in _records) {
      if (rec.dedupeKey == key) return rec;
    }
    return null;
  }

  Future<void> initialize() async {
    if (_initialized) return;
    _records = await _store.getAll();

    // Reconcile file presence for completed downloads & unfinished Dart streams after restart
    final updatedList = <DownloadRecord>[];
    for (var rec in _records) {
      if (rec.status == DownloadStatus.completed && rec.localFilePath != null) {
        final exists = await File(rec.localFilePath!).exists();
        if (!exists) {
          rec = rec.copyWith(
            status: DownloadStatus.failed,
            errorMessage: 'Downloaded file was removed from device storage.',
            updatedAt: DateTime.now(),
          );
          await _store.upsert(rec);
        }
      } else if (!_useAndroidDownloadManager &&
          (rec.status == DownloadStatus.downloading || rec.status == DownloadStatus.queued)) {
        rec = rec.copyWith(
          status: DownloadStatus.paused,
          updatedAt: DateTime.now(),
        );
        await _store.upsert(rec);
      }
      updatedList.add(rec);
    }
    _records = updatedList;
    _initialized = true;
    notifyListeners();

    if (_useAndroidDownloadManager) {
      await _reconcileAndroidDownloads();
      _ensurePolling();
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    for (final t in _dartTasks.values) {
      t.canceled = true;
      t.client.close(force: true);
    }
    _dartTasks.clear();
    _store.close();
    super.dispose();
  }

  /// Queries FRAMEX download routes & verifies that real downloadable media files exist
  /// (never HTML pages, embed URLs, or live streams).
  Future<List<DownloadQualityOption>> fetchDownloadOptions({
    required MediaItem item,
    required String resolvedContentId,
    int season = 0,
    int episode = 0,
    String preferredQuality = '1080',
  }) async {
    final lowerProvider = item.source.toLowerCase();
    if (lowerProvider == 'gotaku' ||
        lowerProvider == 'animex' ||
        lowerProvider == 'channels' ||
        lowerProvider == 'tvgarden') {
      return const [];
    }

    final candidates = <StreamCandidate>[];

    if (lowerProvider == 'showbox' || lowerProvider == 'proxy') {
      try {
        final res = await apiClient.get(
          '/api/fx/proxy/sources/${Uri.encodeComponent(item.slug)}',
          query: {
            'type': item.type,
            if (item.imdbId != null) 'imdb': item.imdbId,
            if (season > 0) 'season': season,
            if (episode > 0) 'episode': episode,
          },
        );
        candidates.addAll(
          StreamResolver.extractCandidates(
            res,
            apiBaseUrl: apiClient.baseUrl,
            preferProxyUrl: false,
          ),
        );
      } catch (_) {}
    } else {
      // MovieBox: check /api/fx/download-links first, then /api/fx/stream-url?download=1 across qualities
      try {
        final dlRes = await apiClient.get(
          '/api/fx/download-links',
          query: {
            'subjectId': resolvedContentId,
            'detailPath': item.detailPath ?? item.slug,
            if (season > 0) 'se': season,
            if (episode > 0) 'ep': episode,
          },
        );
        candidates.addAll(
          StreamResolver.extractCandidates(
            dlRes,
            apiBaseUrl: apiClient.baseUrl,
            preferProxyUrl: false,
          ),
        );
      } catch (_) {}

      final qualities = <String>{preferredQuality, '1080', '720', '480'}.toList();
      for (final q in qualities) {
        if (candidates.any((c) => (c.quality ?? '').contains(q) && c.isDownloadable)) {
          continue;
        }
        try {
          final suRes = await apiClient.get(
            '/api/fx/stream-url',
            query: {
              'subjectId': resolvedContentId,
              'resolution': q,
              if (season > 0) 'se': season,
              if (episode > 0) 'ep': episode,
              'download': 1,
            },
          );
          final parsed = StreamResolver.extractCandidates(
            suRes,
            apiBaseUrl: apiClient.baseUrl,
            preferProxyUrl: false,
          );
          for (final c in parsed) {
            if (!c.isEmbed && c.mode != PlayerMode.hls) {
              candidates.add(c.copyWith(
                quality: c.quality ?? '${q}p',
                isDownloadable: true,
              ));
            }
          }
          if (candidates.isNotEmpty) break;
        } catch (_) {}
      }
    }

    final seen = <String>{};
    final out = <DownloadQualityOption>[];
    for (final c in candidates) {
      if (c.isEmbed || c.mode == PlayerMode.hls || StreamResolver.looksLikeHlsUrl(c.url)) {
        continue;
      }
      if (!seen.add(c.url)) continue;
      final qLabel = (c.quality != null && c.quality!.isNotEmpty)
          ? (c.quality!.endsWith('p') || int.tryParse(c.quality!) == null
              ? c.quality!
              : '${c.quality!}p')
          : 'HD MP4';
      out.add(DownloadQualityOption(
        quality: qLabel,
        url: c.url,
        headers: c.headers,
        sizeBytes: c.sizeBytes,
        format: c.format ?? 'mp4',
      ));
    }
    return out;
  }

  Future<DownloadRequestResult> startDownload({
    required MediaItem item,
    required String resolvedContentId,
    required DownloadQualityOption option,
    int season = 0,
    int episode = 0,
    String? episodeTitle,
  }) async {
    await initialize();

    final provider = item.source.toLowerCase();
    final dedupeKey = DownloadRecord.buildDedupeKey(
      provider: provider,
      contentId: resolvedContentId,
      season: season,
      episode: episode,
    );

    final existing = _records.where((r) => r.dedupeKey == dedupeKey).firstOrNull;
    if (existing != null) {
      if (existing.status == DownloadStatus.completed) {
        return DownloadRequestResult(
          started: false,
          alreadyExists: true,
          message: '${existing.title} is already downloaded for offline viewing.',
          record: existing,
        );
      }
      if (existing.status == DownloadStatus.downloading || existing.status == DownloadStatus.queued) {
        return DownloadRequestResult(
          started: false,
          alreadyExists: true,
          message: '${existing.title} is already in your download queue.',
          record: existing,
        );
      }
    }

    // Probe download URL to verify HTTP 2xx, real media MIME (not HTML / m3u8), and final CDN redirect URL
    final probed = await StreamResolver.probeCandidate(
      StreamCandidate(
        url: option.url,
        headers: option.headers,
        mode: PlayerMode.direct,
        quality: option.quality,
        format: option.format,
        sizeBytes: option.sizeBytes,
        isDownloadable: true,
      ),
    );

    if (probed.mode == PlayerMode.embed ||
        probed.mode == PlayerMode.hls ||
        (probed.statusCode != null && probed.statusCode! >= 400)) {
      return DownloadRequestResult(
        started: false,
        message: probed.mode == PlayerMode.embed
            ? 'Provider returned a web player instead of a downloadable video file.'
            : probed.mode == PlayerMode.hls
                ? 'This source is an adaptive HLS stream (.m3u8) and is not offered as a single downloadable file.'
                : 'Provider rejected the download link (HTTP ${probed.statusCode}).',
      );
    }

    final now = DateTime.now();
    final id = existing?.id ?? 'dl_${now.millisecondsSinceEpoch}_${resolvedContentId.hashCode.abs()}';
    final safeSlug = item.title
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
        .replaceAll(RegExp(r'^_+|_+$'), '');
    final epTag = episode > 0 ? '_s${season}e$episode' : '';
    final ext = (option.format ?? 'mp4').toLowerCase().contains('mkv') ? 'mkv' : 'mp4';
    final fileName = '${safeSlug.isEmpty ? 'video' : safeSlug}$epTag.$ext';

    final subtitle = episode > 0
        ? 'S$season · E$episode${episodeTitle != null ? ' — $episodeTitle' : ''} · ${option.quality}'
        : '${option.quality}${item.year != null ? ' · ${item.year}' : ''}';

    var record = DownloadRecord(
      id: id,
      dedupeKey: dedupeKey,
      title: item.title,
      subtitle: subtitle,
      posterUrl: item.poster,
      provider: provider,
      contentId: resolvedContentId,
      slug: item.slug,
      mediaType: item.type,
      season: season,
      episode: episode,
      quality: option.quality,
      sourceUrl: probed.finalUrl,
      headers: probed.headers,
      mimeType: probed.contentType ?? 'video/mp4',
      status: DownloadStatus.queued,
      downloadedBytes: 0,
      totalBytes: probed.contentLength ?? option.sizeBytes ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    );

    record = await _enqueueRecord(record, fileName);
    await _upsertInMemoryAndStore(record);

    return DownloadRequestResult(
      started: record.status != DownloadStatus.failed,
      message: record.status == DownloadStatus.failed
          ? (record.errorMessage ?? 'Download could not start.')
          : 'Download started in background: ${record.title}',
      record: record,
    );
  }

  Future<DownloadRecord> _enqueueRecord(DownloadRecord record, String fileName) async {
    if (_useAndroidDownloadManager) {
      try {
        final res = await _androidChannel.invokeMethod<Map>('enqueueDownload', {
          'url': record.sourceUrl,
          'fileName': fileName,
          'title': record.title,
          'description': record.subtitle ?? 'Offline movie download',
          'headers': record.headers,
        });
        final dlId = (res?['downloadId'] as num?)?.toInt();
        final targetPath = res?['targetPath']?.toString();
        final updated = record.copyWith(
          platformDownloadId: dlId,
          localFilePath: targetPath,
          status: DownloadStatus.downloading,
          clearError: true,
          updatedAt: DateTime.now(),
        );
        _ensurePolling();
        return updated;
      } catch (e) {
        return record.copyWith(
          status: DownloadStatus.failed,
          errorMessage: 'Failed to schedule Android download: $e',
          updatedAt: DateTime.now(),
        );
      }
    } else {
      final dir = await _getFallbackMoviesDirectory();
      final targetPath = p.join(dir.path, fileName);
      final updated = record.copyWith(
        localFilePath: targetPath,
        status: DownloadStatus.downloading,
        clearError: true,
        updatedAt: DateTime.now(),
      );
      unawaited(_runDartStreamDownload(updated));
      return updated;
    }
  }

  Future<Directory> _getFallbackMoviesDirectory() async {
    if (_storageDirectoryBuilder != null) {
      final dir = await _storageDirectoryBuilder();
      if (!await dir.exists()) await dir.create(recursive: true);
      return dir;
    }
    final base = await getApplicationDocumentsDirectory();
    final dir = Directory(p.join(base.path, 'LupinMovies'));
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  Future<void> _runDartStreamDownload(DownloadRecord initialRecord) async {
    var record = initialRecord;
    final targetPath = record.localFilePath;
    if (targetPath == null) return;
    final partFile = File('$targetPath.part');
    final client = HttpClient()..userAgent = null;
    final task = _DartStreamTask(client);
    _dartTasks[record.id] = task;

    try {
      int existingBytes = await partFile.exists() ? await partFile.length() : 0;
      var currentUri = Uri.parse(record.sourceUrl);
      HttpClientResponse? response;

      for (var hop = 0; hop < 6; hop++) {
        if (task.canceled || !identical(_dartTasks[record.id], task)) return;
        final req = await client.getUrl(currentUri);
        req.followRedirects = false;
        record.headers.forEach((k, v) => req.headers.set(k, v));
        if (existingBytes > 0) {
          req.headers.set(HttpHeaders.rangeHeader, 'bytes=$existingBytes-');
        }
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

      if (task.canceled || !identical(_dartTasks[record.id], task)) return;

      if (response == null || (response.statusCode != 200 && response.statusCode != 206)) {
        throw HttpException('Server returned HTTP ${response?.statusCode ?? 502}');
      }

      if (response.statusCode == 200 && existingBytes > 0) {
        existingBytes = 0;
      }

      final respLen = response.contentLength;
      final totalBytes = respLen > 0 ? existingBytes + respLen : record.totalBytes;

      final sink = partFile.openWrite(
        mode: existingBytes > 0 ? FileMode.append : FileMode.write,
      );
      int downloaded = existingBytes;
      var lastNotify = DateTime.now();

      try {
        await for (final chunk in response) {
          if (task.canceled || task.paused || !identical(_dartTasks[record.id], task)) {
            break;
          }
          sink.add(chunk);
          downloaded += chunk.length;
          final now = DateTime.now();
          if (now.difference(lastNotify).inMilliseconds >= 350) {
            lastNotify = now;
            record = record.copyWith(
              downloadedBytes: downloaded,
              totalBytes: totalBytes,
              status: DownloadStatus.downloading,
              updatedAt: now,
            );
            await _upsertInMemoryAndStore(record);
          }
        }
      } finally {
        await sink.flush().catchError((_) {});
        await sink.close().catchError((_) {});
      }

      if (task.canceled || !identical(_dartTasks[record.id], task)) {
        return;
      }

      if (task.paused) {
        record = record.copyWith(
          downloadedBytes: downloaded,
          totalBytes: totalBytes,
          status: DownloadStatus.paused,
          updatedAt: DateTime.now(),
        );
        await _upsertInMemoryAndStore(record);
        return;
      }

      final finalFile = File(targetPath);
      if (await finalFile.exists()) await finalFile.delete();
      await partFile.rename(targetPath);

      record = record.copyWith(
        downloadedBytes: downloaded,
        totalBytes: downloaded > 0 ? downloaded : totalBytes,
        status: DownloadStatus.completed,
        clearError: true,
        updatedAt: DateTime.now(),
      );
      await _upsertInMemoryAndStore(record);
    } catch (e) {
      if (!task.paused && !task.canceled && identical(_dartTasks[record.id], task)) {
        record = record.copyWith(
          status: DownloadStatus.failed,
          errorMessage: e.toString(),
          updatedAt: DateTime.now(),
        );
        await _upsertInMemoryAndStore(record);
      }
    } finally {
      if (identical(_dartTasks[record.id], task)) {
        _dartTasks.remove(record.id);
      }
      client.close(force: true);
      if (!task.done.isCompleted) {
        task.done.complete();
      }
    }
  }

  void _ensurePolling() {
    final hasActive = _records.any(
      (r) => r.platformDownloadId != null && r.status.isActive,
    );
    if (!hasActive) {
      _pollTimer?.cancel();
      _pollTimer = null;
      return;
    }
    _pollTimer ??= Timer.periodic(const Duration(seconds: 1), (_) {
      unawaited(_reconcileAndroidDownloads());
    });
  }

  Future<void> _reconcileAndroidDownloads() async {
    if (!_useAndroidDownloadManager) return;
    bool changed = false;
    final nextList = <DownloadRecord>[];

    for (var rec in _records) {
      if (rec.platformDownloadId != null && rec.status.isActive) {
        try {
          final info = await _androidChannel.invokeMethod<Map>('queryDownload', {
            'downloadId': rec.platformDownloadId,
          });
          final statusStr = (info?['status'] ?? 'not_found').toString();
          final dlBytes = (info?['bytesDownloaded'] as num?)?.toInt() ?? rec.downloadedBytes;
          final total = (info?['totalBytes'] as num?)?.toInt() ?? rec.totalBytes;
          final reason = (info?['reason'] as num?)?.toInt() ?? 0;

          final mappedStatus = switch (statusStr) {
            'pending' => DownloadStatus.queued,
            'running' => DownloadStatus.downloading,
            'paused' => DownloadStatus.paused,
            'successful' => DownloadStatus.completed,
            'failed' => DownloadStatus.failed,
            'not_found' => DownloadStatus.canceled,
            _ => rec.status,
          };

          String? err;
          if (mappedStatus == DownloadStatus.failed) {
            err = 'Download failed (Android reason code $reason). Tap Retry to fetch a fresh link.';
          }

          if (mappedStatus != rec.status ||
              dlBytes != rec.downloadedBytes ||
              total != rec.totalBytes ||
              err != rec.errorMessage) {
            rec = rec.copyWith(
              status: mappedStatus,
              downloadedBytes: dlBytes,
              totalBytes: total > 0 ? total : rec.totalBytes,
              errorMessage: err,
              clearError: err == null,
              updatedAt: DateTime.now(),
            );
            await _store.upsert(rec);
            changed = true;
          }
        } catch (_) {}
      }
      nextList.add(rec);
    }

    if (changed) {
      _records = nextList;
      notifyListeners();
    }
    _ensurePolling();
  }

  Future<void> pauseDownload(String id) async {
    if (!supportsManualPause) return;
    final rec = _records.where((r) => r.id == id).firstOrNull;
    if (rec == null) return;
    final task = _dartTasks[id];
    if (task != null) {
      task.paused = true;
    } else if (rec.status == DownloadStatus.downloading) {
      await _upsertInMemoryAndStore(
        rec.copyWith(status: DownloadStatus.paused, updatedAt: DateTime.now()),
      );
    }
  }

  Future<void> resumeDownload(String id) async {
    if (!supportsManualPause) return;
    final rec = _records.where((r) => r.id == id).firstOrNull;
    if (rec == null || rec.status != DownloadStatus.paused) return;
    final resumed = rec.copyWith(
      status: DownloadStatus.downloading,
      clearError: true,
      updatedAt: DateTime.now(),
    );
    await _upsertInMemoryAndStore(resumed);
    unawaited(_runDartStreamDownload(resumed));
  }

  Future<void> cancelDownload(String id) async {
    final rec = _records.where((r) => r.id == id).firstOrNull;
    if (rec == null) return;

    if (rec.platformDownloadId != null && _useAndroidDownloadManager) {
      try {
        await _androidChannel.invokeMethod('cancelDownload', {
          'downloadId': rec.platformDownloadId,
        });
      } catch (_) {}
    }

    final task = _dartTasks.remove(id);
    if (task != null) {
      task.canceled = true;
      task.client.close(force: true);
      await task.done.future.timeout(const Duration(seconds: 2), onTimeout: () {});
    }

    if (rec.localFilePath != null) {
      try {
        final f = File(rec.localFilePath!);
        if (await f.exists()) await f.delete();
        final pFile = File('${rec.localFilePath!}.part');
        if (await pFile.exists()) await pFile.delete();
      } catch (_) {}
    }

    final updated = rec.copyWith(
      status: DownloadStatus.canceled,
      clearPlatformDownloadId: true,
      updatedAt: DateTime.now(),
    );
    await _upsertInMemoryAndStore(updated);
    _ensurePolling();
  }

  Future<void> retryDownload(String id) async {
    final rec = _records.where((r) => r.id == id).firstOrNull;
    if (rec == null) return;

    // For expiring signed URLs (MovieBox), refresh the download URL before re-enqueuing
    String freshUrl = rec.sourceUrl;
    Map<String, String> freshHeaders = rec.headers;
    if (rec.provider == 'moviebox') {
      try {
        final qClean = rec.quality.replaceAll(RegExp(r'[^0-9]'), '');
        final suRes = await apiClient.get(
          '/api/fx/stream-url',
          query: {
            'subjectId': rec.contentId,
            if (qClean.isNotEmpty) 'resolution': qClean,
            if (rec.season > 0) 'se': rec.season,
            if (rec.episode > 0) 'ep': rec.episode,
            'download': 1,
          },
        );
        final cands = StreamResolver.extractCandidates(
          suRes,
          apiBaseUrl: apiClient.baseUrl,
          preferProxyUrl: false,
        );
        final valid = cands.where((c) => !c.isEmbed && c.mode != PlayerMode.hls).firstOrNull;
        if (valid != null) {
          freshUrl = valid.url;
          freshHeaders = valid.headers;
        }
      } catch (_) {}
    }

    final safeName = p.basename(rec.localFilePath ?? 'lupin_${rec.contentId}.mp4');
    final reset = rec.copyWith(
      sourceUrl: freshUrl,
      headers: freshHeaders,
      downloadedBytes: 0,
      status: DownloadStatus.queued,
      clearError: true,
      clearPlatformDownloadId: true,
      updatedAt: DateTime.now(),
    );
    final reEnqueued = await _enqueueRecord(reset, safeName);
    await _upsertInMemoryAndStore(reEnqueued);
  }

  Future<void> deleteDownload(String id) async {
    final rec = _records.where((r) => r.id == id).firstOrNull;
    if (rec == null) return;

    if (rec.platformDownloadId != null && _useAndroidDownloadManager && rec.status.isActive) {
      try {
        await _androidChannel.invokeMethod('cancelDownload', {
          'downloadId': rec.platformDownloadId,
        });
      } catch (_) {}
    }

    final task = _dartTasks.remove(id);
    if (task != null) {
      task.canceled = true;
      task.client.close(force: true);
      await task.done.future.timeout(const Duration(seconds: 2), onTimeout: () {});
    }

    if (rec.localFilePath != null) {
      try {
        final file = File(rec.localFilePath!);
        if (await file.exists()) await file.delete();
        final partFile = File('${rec.localFilePath!}.part');
        if (await partFile.exists()) await partFile.delete();
      } catch (_) {}
    }

    await _store.delete(id);
    _records = _records.where((r) => r.id != id).toList();
    notifyListeners();
    _ensurePolling();
  }

  Future<void> _upsertInMemoryAndStore(DownloadRecord record) async {
    await _store.upsert(record);
    final next = _records.where((r) => r.id != record.id && r.dedupeKey != record.dedupeKey).toList();
    next.insert(0, record);
    next.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    _records = next;
    notifyListeners();
  }
}
