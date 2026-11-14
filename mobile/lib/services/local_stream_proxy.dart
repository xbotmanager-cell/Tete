import 'dart:async';
import 'dart:convert';
import 'dart:io';

class _RegisteredStream {
  final Uri upstreamUri;
  final Map<String, String> headers;

  _RegisteredStream({required this.upstreamUri, required this.headers});
}

/// Lightweight loopback HTTP proxy (127.0.0.1) used as a recovery path when Android Media3
/// drops custom Referer/Cookie/Authorization headers across HLS playlists, segments,
/// encryption keys, or cross-protocol HTTP/HTTPS redirects.
class LocalStreamProxy {
  LocalStreamProxy._();

  static final LocalStreamProxy instance = LocalStreamProxy._();

  HttpServer? _server;
  int _counter = 0;
  final Map<String, _RegisteredStream> _registry = {};
  HttpClient? _httpClient;

  Future<void> _ensureStarted() async {
    if (_server != null) return;
    _httpClient ??= HttpClient()
      ..connectionTimeout = const Duration(seconds: 15)
      ..userAgent = null;
    _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    _server!.listen(_handleRequest);
  }

  Future<String> registerStream(
    String targetUrl, {
    Map<String, String> headers = const {},
  }) async {
    await _ensureStarted();
    final id = 's${++_counter}_${DateTime.now().millisecondsSinceEpoch}';
    if (_registry.length > 64) {
      final oldestKey = _registry.keys.first;
      _registry.remove(oldestKey);
    }
    _registry[id] = _RegisteredStream(
      upstreamUri: Uri.parse(targetUrl),
      headers: Map<String, String>.from(headers),
    );
    return 'http://127.0.0.1:${_server!.port}/stream/$id';
  }

  String _registerSubUrl(Uri targetUri, Map<String, String> headers) {
    final existing = _registry.entries.where((e) => e.value.upstreamUri == targetUri).firstOrNull;
    if (existing != null) {
      return 'http://127.0.0.1:${_server!.port}/stream/${existing.key}';
    }
    final id = 'sub_${++_counter}';
    if (_registry.length > 128) {
      final firstKey = _registry.keys.first;
      _registry.remove(firstKey);
    }
    _registry[id] = _RegisteredStream(upstreamUri: targetUri, headers: headers);
    return 'http://127.0.0.1:${_server!.port}/stream/$id';
  }

  Future<void> _handleRequest(HttpRequest req) async {
    try {
      final segments = req.uri.pathSegments;
      if (segments.length < 2 || segments[0] != 'stream') {
        req.response.statusCode = HttpStatus.notFound;
        await req.response.close();
        return;
      }

      final entry = _registry[segments[1]];
      if (entry == null) {
        req.response.statusCode = HttpStatus.notFound;
        await req.response.close();
        return;
      }

      final upstreamResp = await _openWithRedirects(
        entry.upstreamUri,
        method: req.method == 'HEAD' ? 'HEAD' : 'GET',
        baseHeaders: entry.headers,
        rangeHeader: req.headers.value(HttpHeaders.rangeHeader),
      );

      req.response.statusCode = upstreamResp.statusCode;
      final cType = upstreamResp.headers.value(HttpHeaders.contentTypeHeader);
      if (cType != null) {
        req.response.headers.set(HttpHeaders.contentTypeHeader, cType);
      }

      final isPlaylist = (cType ?? '').toLowerCase().contains('mpegurl') ||
          entry.upstreamUri.path.toLowerCase().endsWith('.m3u8');

      if (isPlaylist && req.method != 'HEAD') {
        final rawBody = await utf8.decodeStream(upstreamResp);
        final rewritten = rewriteHlsPlaylist(
          rawBody,
          entry.upstreamUri,
          (uri) => _registerSubUrl(uri, entry.headers),
        );
        final bytes = utf8.encode(rewritten);
        req.response.headers.set(HttpHeaders.contentTypeHeader, 'application/vnd.apple.mpegurl');
        req.response.headers.set(HttpHeaders.contentLengthHeader, bytes.length.toString());
        req.response.add(bytes);
        await req.response.close();
        return;
      }

      for (final h in [
        HttpHeaders.contentLengthHeader,
        HttpHeaders.contentRangeHeader,
        HttpHeaders.acceptRangesHeader,
        HttpHeaders.cacheControlHeader,
      ]) {
        final v = upstreamResp.headers.value(h);
        if (v != null) req.response.headers.set(h, v);
      }

      await upstreamResp.pipe(req.response);
    } catch (_) {
      try {
        req.response.statusCode = HttpStatus.badGateway;
        await req.response.close();
      } catch (_) {}
    }
  }

  Future<HttpClientResponse> _openWithRedirects(
    Uri uri, {
    required String method,
    required Map<String, String> baseHeaders,
    String? rangeHeader,
  }) async {
    var current = uri;
    final client = _httpClient!;
    for (var i = 0; i < 6; i++) {
      final request = await client.openUrl(method, current);
      request.followRedirects = false;
      baseHeaders.forEach((k, v) => request.headers.set(k, v));
      if (rangeHeader != null && rangeHeader.isNotEmpty) {
        request.headers.set(HttpHeaders.rangeHeader, rangeHeader);
      }
      final resp = await request.close();
      if (resp.statusCode >= 300 && resp.statusCode < 400) {
        final loc = resp.headers.value(HttpHeaders.locationHeader);
        await resp.drain<void>().catchError((_) {});
        if (loc == null || loc.trim().isEmpty) return resp;
        current = current.resolve(loc.trim());
        continue;
      }
      return resp;
    }
    throw const HttpException('Too many redirects');
  }

  static String rewriteHlsPlaylist(
    String playlist,
    Uri baseUri,
    String Function(Uri resolvedUri) rewriteUri,
  ) {
    final lines = const LineSplitter().convert(playlist);
    final out = StringBuffer();
    for (final line in lines) {
      final trimmed = line.trim();
      if (trimmed.isEmpty) {
        out.writeln();
        continue;
      }
      if (trimmed.startsWith('#')) {
        // Rewrite URI="..." inside #EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA, etc.
        final updated = line.replaceAllMapped(
          RegExp(r'URI="([^"]+)"'),
          (match) {
            final raw = match.group(1) ?? '';
            if (raw.isEmpty || raw.startsWith('data:')) return match.group(0)!;
            final abs = baseUri.resolve(raw);
            return 'URI="${rewriteUri(abs)}"';
          },
        );
        out.writeln(updated);
      } else {
        final abs = baseUri.resolve(trimmed);
        out.writeln(rewriteUri(abs));
      }
    }
    return out.toString();
  }

  Future<void> stop() async {
    _registry.clear();
    await _server?.close(force: true);
    _server = null;
    _httpClient?.close(force: true);
    _httpClient = null;
  }
}
