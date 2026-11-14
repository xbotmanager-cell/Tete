import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:lupin_movies/models/download_models.dart';
import 'package:lupin_movies/models/framex_models.dart';
import 'package:lupin_movies/providers/download_provider.dart';
import 'package:lupin_movies/services/api_client.dart';
import 'package:lupin_movies/services/download_store.dart';

void main() {
  late HttpServer server;
  late String baseUrl;
  late Directory tempDir;

  final List<int> sampleVideoBytes = List<int>.generate(64 * 1024, (i) => i % 251);

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('lupin_dl_test_');
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    baseUrl = 'http://127.0.0.1:${server.port}';

    server.listen((req) async {
      if (req.uri.path == '/movie.mp4') {
        final range = req.headers.value('range');
        if (range != null && range.startsWith('bytes=')) {
          final match = RegExp(r'bytes=(\d+)-(\d*)').firstMatch(range);
          final start = int.parse(match!.group(1)!);
          final endStr = match.group(2);
          final end = (endStr != null && endStr.isNotEmpty)
              ? int.parse(endStr).clamp(start, sampleVideoBytes.length - 1)
              : sampleVideoBytes.length - 1;
          req.response.statusCode = HttpStatus.partialContent;
          req.response.headers.set('Content-Type', 'video/mp4');
          req.response.headers.set('Accept-Ranges', 'bytes');
          req.response.headers.set(
            'Content-Range',
            'bytes $start-$end/${sampleVideoBytes.length}',
          );
          req.response.add(sampleVideoBytes.sublist(start, end + 1));
          await req.response.close();
          return;
        }
        req.response.statusCode = HttpStatus.ok;
        req.response.headers.set('Content-Type', 'video/mp4');
        req.response.headers.contentLength = sampleVideoBytes.length;
        req.response.add(sampleVideoBytes);
        await req.response.close();
      } else if (req.uri.path == '/stream.m3u8') {
        req.response.statusCode = HttpStatus.ok;
        req.response.headers.contentType = ContentType('application', 'vnd.apple.mpegurl');
        req.response.write('#EXTM3U\n#EXTINF:5.0,\nseg0.ts\n');
        await req.response.close();
      } else if (req.uri.path == '/embed.html') {
        req.response.statusCode = HttpStatus.ok;
        req.response.headers.contentType = ContentType.html;
        req.response.write('<!doctype html><html><body>Web player</body></html>');
        await req.response.close();
      } else {
        req.response.statusCode = HttpStatus.notFound;
        await req.response.close();
      }
    });
  });

  tearDown(() async {
    await server.close(force: true);
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  MediaItem sampleMovie({String id = '42', String title = 'Lupin Heist'}) {
    return MediaItem(
      id: id,
      subjectId: id,
      slug: 'lupin-heist',
      title: title,
      type: 'movie',
      source: 'moviebox',
      year: '2026',
      genres: const [],
      raw: const {},
    );
  }

  Future<void> waitUntil(bool Function() cond, {Duration timeout = const Duration(seconds: 5)}) async {
    final deadline = DateTime.now().add(timeout);
    while (!cond()) {
      if (DateTime.now().isAfter(deadline)) {
        fail('Timed out waiting for download condition');
      }
      await Future<void>.delayed(const Duration(milliseconds: 40));
    }
  }

  group('DownloadProvider real file management, dedupe, persistence & actions', () {
    test('downloads real MP4 file, deduplicates repeats, persists across restart, and deletes cleanly', () async {
      final store = InMemoryDownloadStore();
      final client = ApiClient()..setBaseUrl(baseUrl);
      final provider = DownloadProvider(
        client,
        store: store,
        useAndroidDownloadManager: false,
        storageDirectoryBuilder: () async => tempDir,
      );

      final item = sampleMovie();
      final option = DownloadQualityOption(
        quality: '1080p',
        url: '$baseUrl/movie.mp4',
        format: 'mp4',
      );

      final res1 = await provider.startDownload(
        item: item,
        resolvedContentId: '42',
        option: option,
      );
      expect(res1.started, isTrue);

      await waitUntil(() {
        final r = provider.findByContent(provider: 'moviebox', contentId: '42');
        return r?.status == DownloadStatus.completed;
      });

      final completed = provider.findByContent(provider: 'moviebox', contentId: '42')!;
      expect(completed.downloadedBytes, sampleVideoBytes.length);
      expect(completed.totalBytes, sampleVideoBytes.length);
      expect(completed.localFilePath, isNotNull);
      final fileOnDisk = File(completed.localFilePath!);
      expect(await fileOnDisk.exists(), isTrue);
      expect(await fileOnDisk.length(), sampleVideoBytes.length);

      // Dedupe check
      final duplicate = await provider.startDownload(
        item: item,
        resolvedContentId: '42',
        option: option,
      );
      expect(duplicate.started, isFalse);
      expect(duplicate.alreadyExists, isTrue);

      provider.dispose();

      // Persistence check across new DownloadProvider instance
      final provider2 = DownloadProvider(
        client,
        store: store,
        useAndroidDownloadManager: false,
        storageDirectoryBuilder: () async => tempDir,
      );
      await provider2.initialize();
      final restored = provider2.findByContent(provider: 'moviebox', contentId: '42');
      expect(restored, isNotNull);
      expect(restored!.status, DownloadStatus.completed);

      // Delete removes both DB record and physical file
      await provider2.deleteDownload(restored.id);
      expect(provider2.findByContent(provider: 'moviebox', contentId: '42'), isNull);
      expect(await fileOnDisk.exists(), isFalse);
      provider2.dispose();
    });

    test('blocks HTML embed pages and HLS playlists from entering the Download Manager', () async {
      final store = InMemoryDownloadStore();
      final provider = DownloadProvider(
        ApiClient()..setBaseUrl(baseUrl),
        store: store,
        useAndroidDownloadManager: false,
        storageDirectoryBuilder: () async => tempDir,
      );

      final htmlRes = await provider.startDownload(
        item: sampleMovie(id: '91', title: 'Embed Only'),
        resolvedContentId: '91',
        option: DownloadQualityOption(quality: '720p', url: '$baseUrl/embed.html'),
      );
      expect(htmlRes.started, isFalse);
      expect(provider.records, isEmpty);

      final hlsRes = await provider.startDownload(
        item: sampleMovie(id: '92', title: 'HLS Stream'),
        resolvedContentId: '92',
        option: DownloadQualityOption(quality: '1080p', url: '$baseUrl/stream.m3u8'),
      );
      expect(hlsRes.started, isFalse);
      expect(provider.records, isEmpty);

      provider.dispose();
    });

    test('supports cancel and retry cleanly', () async {
      final store = InMemoryDownloadStore();
      final provider = DownloadProvider(
        ApiClient()..setBaseUrl(baseUrl),
        store: store,
        useAndroidDownloadManager: false,
        storageDirectoryBuilder: () async => tempDir,
      );

      final res = await provider.startDownload(
        item: sampleMovie(id: '55', title: 'Retry Movie'),
        resolvedContentId: '55',
        option: DownloadQualityOption(quality: '720p', url: '$baseUrl/movie.mp4'),
      );
      expect(res.started, isTrue);
      final recId = res.record!.id;

      await provider.cancelDownload(recId);
      final canceled = provider.findByContent(provider: 'moviebox', contentId: '55')!;
      expect(canceled.status, DownloadStatus.canceled);

      await provider.retryDownload(recId);
      await waitUntil(() {
        final r = provider.findByContent(provider: 'moviebox', contentId: '55');
        return r?.status == DownloadStatus.completed;
      });

      final retried = provider.findByContent(provider: 'moviebox', contentId: '55')!;
      expect(retried.status, DownloadStatus.completed);
      expect(await File(retried.localFilePath!).length(), sampleVideoBytes.length);

      provider.dispose();
    });
  });
}
