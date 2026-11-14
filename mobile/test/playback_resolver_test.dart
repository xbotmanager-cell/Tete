import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:lupin_movies/models/framex_models.dart';
import 'package:lupin_movies/services/local_stream_proxy.dart';
import 'package:lupin_movies/services/stream_resolver.dart';

void main() {
  group('StreamResolver header & candidate extraction', () {
    test('extractHeaders normalizes provider headers and supplies default User-Agent', () {
      final headers = StreamResolver.extractHeaders({
        'referer': 'https://megacloud.example/',
        'origin': 'https://megacloud.example',
        'headers': {
          'Authorization': 'Bearer abc123',
          'Cookie': 'session=xyz',
        },
      });

      expect(headers['Referer'], 'https://megacloud.example/');
      expect(headers['Origin'], 'https://megacloud.example');
      expect(headers['Authorization'], 'Bearer abc123');
      expect(headers['Cookie'], 'session=xyz');
      expect(headers['User-Agent'], StreamResolver.defaultUserAgent);
    });

    test('extractCandidates handles relative API proxy URLs and nested sources', () {
      final candidates = StreamResolver.extractCandidates(
        {
          'proxyUrl': '/api/fx/proxy/stream?id=77',
          'headers': {'Referer': 'https://provider.test/'},
          'expiresIn': 300,
          'sources': [
            {
              'url': 'https://cdn.example.com/master.m3u8',
              'quality': '1080',
              'isM3U8': true,
            },
            {
              'embedUrl': 'https://player.example.com/embed/abc',
              'label': 'Backup Embed',
            },
          ],
        },
        apiBaseUrl: 'https://lupin-movies.vercel.app',
      );

      expect(candidates.length, 3);
      expect(candidates[0].url, 'https://lupin-movies.vercel.app/api/fx/proxy/stream?id=77');
      expect(candidates[0].headers['Referer'], 'https://provider.test/');
      expect(candidates[0].expiresIn, 300);

      expect(candidates[1].mode, PlayerMode.hls);
      expect(candidates[1].quality, '1080');

      expect(candidates[2].mode, PlayerMode.embed);
      expect(candidates[2].isEmbed, isTrue);
    });

    test('looksLikeHlsUrl and looksLikeDirectVideoFile classify standard & extensionless URLs', () {
      expect(StreamResolver.looksLikeHlsUrl('https://cdn.site/video/seg?type=hls'), isTrue);
      expect(StreamResolver.looksLikeHlsUrl('https://cdn.site/playlist.m3u8?token=1'), isTrue);
      expect(
        StreamResolver.looksLikeDirectVideoFile('https://cdn.site/movie_720p.mp4?expires=99'),
        isTrue,
      );
      expect(StreamResolver.looksLikeEmbedUrl('https://example.com/embed/xyz'), isTrue);
    });
  });

  group('StreamResolver.probeCandidate HTTP redirect & format sniffing', () {
    late HttpServer server;
    late String baseUrl;

    setUp(() async {
      server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      baseUrl = 'http://127.0.0.1:${server.port}';
      server.listen((req) async {
        if (req.uri.path == '/redirect-to-hls') {
          req.response.statusCode = HttpStatus.found;
          req.response.headers.set('Location', '$baseUrl/extensionless-hls');
          await req.response.close();
        } else if (req.uri.path == '/extensionless-hls') {
          final hasReferer = req.headers.value('referer') == 'https://ref.test/';
          if (!hasReferer) {
            req.response.statusCode = HttpStatus.forbidden;
            await req.response.close();
            return;
          }
          req.response.statusCode = HttpStatus.ok;
          req.response.headers.contentType = ContentType('application', 'vnd.apple.mpegurl');
          req.response.write('#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:6.0,\nseg0.ts\n');
          await req.response.close();
        } else if (req.uri.path == '/fake-mp4-html') {
          req.response.statusCode = HttpStatus.ok;
          req.response.headers.contentType = ContentType.html;
          req.response.write('<!DOCTYPE html><html><body>Embed Player</body></html>');
          await req.response.close();
        } else if (req.uri.path == '/real-mp4') {
          req.response.statusCode = HttpStatus.partialContent;
          req.response.headers.set('Content-Type', 'video/mp4');
          req.response.headers.set('Accept-Ranges', 'bytes');
          req.response.headers.set('Content-Range', 'bytes 0-3/1024');
          req.response.add([0, 0, 0, 24]);
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

    test('follows redirects preserving custom headers and detects extensionless HLS playlist', () async {
      final res = await StreamResolver.probeCandidate(
        StreamCandidate(
          url: '$baseUrl/redirect-to-hls',
          headers: const {'Referer': 'https://ref.test/'},
        ),
      );

      expect(res.finalUrl, '$baseUrl/extensionless-hls');
      expect(res.mode, PlayerMode.hls);
      expect(res.statusCode, 200);
    });

    test('routes HTML responses cleanly to PlayerMode.embed instead of crashing ExoPlayer', () async {
      final res = await StreamResolver.probeCandidate(
        StreamCandidate(url: '$baseUrl/fake-mp4-html'),
      );
      expect(res.mode, PlayerMode.embed);
      expect(res.isPlayableMedia, isFalse);
    });

    test('detects Content-Range total size and direct video mode for MP4', () async {
      final res = await StreamResolver.probeCandidate(
        StreamCandidate(url: '$baseUrl/real-mp4'),
      );
      expect(res.mode, PlayerMode.direct);
      expect(res.acceptsRanges, isTrue);
      expect(res.contentLength, 1024);
    });
  });

  group('LocalStreamProxy HLS rewriting & header preservation', () {
    test('rewriteHlsPlaylist resolves keys, maps, and segments through proxy', () {
      const playlist = '''
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-KEY:METHOD=AES-128,URI="keys/enc.key"
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.0,
seg1.ts
https://other.cdn.test/seg2.ts
''';
      final rewritten = LocalStreamProxy.rewriteHlsPlaylist(
        playlist,
        Uri.parse('https://edge.cdn.test/videos/1080/master.m3u8'),
        (uri) => 'http://127.0.0.1:9999/proxied?u=${Uri.encodeComponent(uri.toString())}',
      );

      expect(
        rewritten,
        contains('URI="http://127.0.0.1:9999/proxied?u=${Uri.encodeComponent('https://edge.cdn.test/videos/1080/keys/enc.key')}"'),
      );
      expect(
        rewritten,
        contains('URI="http://127.0.0.1:9999/proxied?u=${Uri.encodeComponent('https://edge.cdn.test/videos/1080/init.mp4')}"'),
      );
      expect(
        rewritten,
        contains('http://127.0.0.1:9999/proxied?u=${Uri.encodeComponent('https://edge.cdn.test/videos/1080/seg1.ts')}'),
      );
      expect(
        rewritten,
        contains('http://127.0.0.1:9999/proxied?u=${Uri.encodeComponent('https://other.cdn.test/seg2.ts')}'),
      );
    });

    test('proxies playlist and forwards custom Referer/Authorization to upstream segments', () async {
      final upstream = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      addTearDown(() async {
        await upstream.close(force: true);
        await LocalStreamProxy.instance.stop();
      });

      upstream.listen((req) async {
        if (req.headers.value('referer') != 'https://secret.ref/') {
          req.response.statusCode = HttpStatus.unauthorized;
          await req.response.close();
          return;
        }
        if (req.uri.path == '/live/master.m3u8') {
          req.response.headers.set('Content-Type', 'application/vnd.apple.mpegurl');
          req.response.write('#EXTM3U\n#EXTINF:4.0,\nchunk.ts\n');
          await req.response.close();
        } else if (req.uri.path == '/live/chunk.ts') {
          req.response.headers.set('Content-Type', 'video/mp2t');
          req.response.add(utf8.encode('TS_SEGMENT_BYTES'));
          await req.response.close();
        } else {
          req.response.statusCode = HttpStatus.notFound;
          await req.response.close();
        }
      });

      final localUrl = await LocalStreamProxy.instance.registerStream(
        'http://127.0.0.1:${upstream.port}/live/master.m3u8',
        headers: const {'Referer': 'https://secret.ref/'},
      );

      final client = HttpClient();
      try {
        final playlistReq = await client.getUrl(Uri.parse(localUrl));
        final playlistResp = await playlistReq.close();
        expect(playlistResp.statusCode, 200);
        final body = await utf8.decodeStream(playlistResp);

        final lines = const LineSplitter()
            .convert(body)
            .where((l) => l.startsWith('http://127.0.0.1:'))
            .toList();
        expect(lines.length, 1);

        final segReq = await client.getUrl(Uri.parse(lines.first));
        final segResp = await segReq.close();
        expect(segResp.statusCode, 200);
        final segBody = await utf8.decodeStream(segResp);
        expect(segBody, 'TS_SEGMENT_BYTES');
      } finally {
        client.close(force: true);
      }
    });
  });
}
