import 'dart:async';
import 'dart:convert';
import 'dart:io';
import '../models/framex_models.dart';

class StreamCandidate {
  final String url;
  final Map<String, String> headers;
  final PlayerMode mode;
  final String? quality;
  final String? format;
  final String? label;
  final int? sizeBytes;
  final bool isEmbed;
  final bool isDownloadable;
  final int? expiresIn;

  const StreamCandidate({
    required this.url,
    this.headers = const {},
    this.mode = PlayerMode.direct,
    this.quality,
    this.format,
    this.label,
    this.sizeBytes,
    this.isEmbed = false,
    this.isDownloadable = false,
    this.expiresIn,
  });

  StreamCandidate copyWith({
    String? url,
    Map<String, String>? headers,
    PlayerMode? mode,
    String? quality,
    String? format,
    String? label,
    int? sizeBytes,
    bool? isEmbed,
    bool? isDownloadable,
    int? expiresIn,
  }) {
    return StreamCandidate(
      url: url ?? this.url,
      headers: headers ?? this.headers,
      mode: mode ?? this.mode,
      quality: quality ?? this.quality,
      format: format ?? this.format,
      label: label ?? this.label,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      isEmbed: isEmbed ?? this.isEmbed,
      isDownloadable: isDownloadable ?? this.isDownloadable,
      expiresIn: expiresIn ?? this.expiresIn,
    );
  }
}

class ProbedStreamResult {
  final String finalUrl;
  final Map<String, String> headers;
  final PlayerMode mode;
  final String? contentType;
  final int? contentLength;
  final bool acceptsRanges;
  final int? statusCode;

  const ProbedStreamResult({
    required this.finalUrl,
    required this.headers,
    required this.mode,
    this.contentType,
    this.contentLength,
    this.acceptsRanges = false,
    this.statusCode,
  });

  bool get isPlayableMedia => mode != PlayerMode.embed;
}

class StreamResolver {
  static const String defaultUserAgent =
      'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

  static Map<String, String> extractHeaders(
    Map<String, dynamic> map, {
    Map<String, String>? baseHeaders,
  }) {
    final out = <String, String>{};
    if (baseHeaders != null) {
      for (final e in baseHeaders.entries) {
        if (e.key.trim().isNotEmpty && e.value.trim().isNotEmpty) {
          out[e.key.trim()] = e.value.trim();
        }
      }
    }

    void mergeMap(dynamic raw) {
      if (raw is Map) {
        for (final entry in raw.entries) {
          final k = entry.key.toString().trim();
          final v = entry.value?.toString().trim() ?? '';
          if (k.isNotEmpty && v.isNotEmpty) {
            out[k] = v;
          }
        }
      }
    }

    mergeMap(map['headers']);
    mergeMap(map['httpHeaders']);
    mergeMap(map['requestHeaders']);

    void mergeField(List<String> keys, String headerName) {
      for (final k in keys) {
        final v = map[k]?.toString().trim();
        if (v != null && v.isNotEmpty) {
          out[headerName] = v;
          break;
        }
      }
    }

    mergeField(['referer', 'Referer', 'referrer'], 'Referer');
    mergeField(['origin', 'Origin'], 'Origin');
    mergeField(['userAgent', 'user_agent', 'User-Agent', 'user-agent'], 'User-Agent');
    mergeField(['authorization', 'Authorization', 'authHeader'], 'Authorization');
    mergeField(['cookie', 'Cookie'], 'Cookie');

    if (!out.keys.any((k) => k.toLowerCase() == 'user-agent')) {
      out['User-Agent'] = defaultUserAgent;
    }

    return out;
  }

  static String? resolveUrl(String? rawUrl, {String? apiBaseUrl}) {
    if (rawUrl == null) return null;
    final trimmed = rawUrl.trim();
    if (trimmed.isEmpty) return null;
    if (trimmed.startsWith('//')) {
      return 'https:$trimmed';
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (trimmed.startsWith('/') && apiBaseUrl != null && apiBaseUrl.isNotEmpty) {
      final base = apiBaseUrl.replaceAll(RegExp(r'/+$'), '');
      return '$base$trimmed';
    }
    return trimmed;
  }

  static bool looksLikeEmbedUrl(String url, {String? typeHint, String? formatHint, bool? isEmbedFlag}) {
    if (isEmbedFlag == true) return true;
    final combinedType = '${typeHint ?? ''} ${formatHint ?? ''}'.toLowerCase();
    if (combinedType.contains('embed') ||
        combinedType.contains('iframe') ||
        combinedType.contains('html')) {
      return true;
    }
    final lower = url.toLowerCase();
    if (lower.contains('.m3u8') ||
        lower.contains('.mp4') ||
        lower.contains('.mkv') ||
        lower.contains('.webm') ||
        lower.contains('.mpd')) {
      return false;
    }
    return lower.contains('youtube.com/') ||
        lower.contains('youtu.be/') ||
        lower.contains('youtube-nocookie.com/') ||
        lower.contains('/embed/') ||
        lower.contains('/embed?') ||
        lower.contains('player.html') ||
        lower.contains('iframe');
  }

  static bool looksLikeHlsUrl(String url, {String? typeHint, String? formatHint, bool? isM3U8Flag}) {
    if (isM3U8Flag == true) return true;
    final combinedType = '${typeHint ?? ''} ${formatHint ?? ''}'.toLowerCase();
    if (combinedType.contains('hls') ||
        combinedType.contains('m3u8') ||
        combinedType.contains('mpegurl')) {
      return true;
    }
    final lower = url.toLowerCase();
    return lower.contains('.m3u8') ||
        lower.contains('format=m3u8') ||
        lower.contains('type=hls') ||
        lower.contains('/hls/');
  }

  static bool looksLikeDirectVideoFile(String url, {String? typeHint, String? formatHint}) {
    final combined = '${typeHint ?? ''} ${formatHint ?? ''}'.toLowerCase();
    if (combined.contains('mp4') ||
        combined.contains('mkv') ||
        combined.contains('webm') ||
        combined.contains('video/')) {
      return !combined.contains('mpegurl');
    }
    final uri = Uri.tryParse(url);
    final path = (uri?.path ?? url).toLowerCase();
    return path.endsWith('.mp4') ||
        path.endsWith('.mkv') ||
        path.endsWith('.webm') ||
        path.endsWith('.m4v') ||
        path.endsWith('.mov') ||
        url.toLowerCase().contains('download=1');
  }

  static int? parseSizeBytes(dynamic rawSize) {
    if (rawSize is int) return rawSize;
    if (rawSize is num) return rawSize.toInt();
    if (rawSize is String) {
      final trimmed = rawSize.trim();
      final asInt = int.tryParse(trimmed);
      if (asInt != null) return asInt;
      final match = RegExp(r'([\d.]+)\s*(gb|mb|kb|b)', caseSensitive: false).firstMatch(trimmed);
      if (match != null) {
        final val = double.tryParse(match.group(1) ?? '');
        final unit = (match.group(2) ?? '').toLowerCase();
        if (val != null) {
          switch (unit) {
            case 'gb':
              return (val * 1024 * 1024 * 1024).round();
            case 'mb':
              return (val * 1024 * 1024).round();
            case 'kb':
              return (val * 1024).round();
            default:
              return val.round();
          }
        }
      }
    }
    return null;
  }

  static List<StreamCandidate> extractCandidates(
    dynamic payload, {
    String? apiBaseUrl,
    Map<String, String>? baseHeaders,
    bool preferProxyUrl = true,
  }) {
    final results = <StreamCandidate>[];
    final seenUrls = <String>{};

    void addCandidate(
      String? rawUrl, {
      required Map<String, String> headers,
      String? typeHint,
      String? formatHint,
      String? quality,
      String? label,
      int? sizeBytes,
      bool? isM3U8,
      bool? isEmbed,
      int? expiresIn,
    }) {
      final resolved = resolveUrl(rawUrl, apiBaseUrl: apiBaseUrl);
      if (resolved == null ||
          resolved.isEmpty ||
          (!resolved.startsWith('http://') && !resolved.startsWith('https://'))) {
        return;
      }
      if (!seenUrls.add(resolved)) return;

      final embedDetected = looksLikeEmbedUrl(
        resolved,
        typeHint: typeHint,
        formatHint: formatHint,
        isEmbedFlag: isEmbed,
      );
      final hlsDetected = !embedDetected &&
          looksLikeHlsUrl(
            resolved,
            typeHint: typeHint,
            formatHint: formatHint,
            isM3U8Flag: isM3U8,
          );
      final directVideoDetected = !embedDetected &&
          !hlsDetected &&
          looksLikeDirectVideoFile(resolved, typeHint: typeHint, formatHint: formatHint);

      final mode = embedDetected
          ? PlayerMode.embed
          : hlsDetected
              ? PlayerMode.hls
              : PlayerMode.direct;

      final downloadable = !embedDetected &&
          !hlsDetected &&
          (directVideoDetected || sizeBytes != null || (quality != null && !hlsDetected));

      results.add(
        StreamCandidate(
          url: resolved,
          headers: headers,
          mode: mode,
          quality: quality,
          format: formatHint ?? (hlsDetected ? 'hls' : embedDetected ? 'embed' : 'mp4'),
          label: label,
          sizeBytes: sizeBytes,
          isEmbed: embedDetected,
          isDownloadable: downloadable,
          expiresIn: expiresIn,
        ),
      );
    }

    void visitMap(Map<String, dynamic> map, {Map<String, String>? inheritedHeaders, int? inheritedTtl}) {
      final localHeaders = extractHeaders(map, baseHeaders: inheritedHeaders);
      final ttl = (map['expiresIn'] is num) ? (map['expiresIn'] as num).toInt() : inheritedTtl;
      final typeHint = (map['type'] ?? map['mimeType'] ?? map['contentType'])?.toString();
      final formatHint = (map['format'] ?? map['ext'])?.toString();
      final quality = (map['resolution'] ?? map['quality'] ?? map['res'] ?? map['label'])?.toString();
      final label = (map['label'] ?? map['name'] ?? map['title'] ?? quality)?.toString();
      final sizeBytes = parseSizeBytes(map['size'] ?? map['fileSize'] ?? map['sizeBytes']);
      final isM3U8 = map['isM3U8'] == true || map['isHls'] == true || map['hls'] == true;
      final isEmbedFlag = map['isEmbed'] == true || map['embed'] == true;

      final urlKeys = preferProxyUrl
          ? const ['proxyUrl', 'hlsUrl', 'streamUrl', 'url', 'file', 'src', 'downloadUrl']
          : const ['downloadUrl', 'url', 'streamUrl', 'hlsUrl', 'proxyUrl', 'file', 'src'];

      for (final key in urlKeys) {
        final val = map[key]?.toString();
        if (val != null && val.trim().isNotEmpty) {
          addCandidate(
            val,
            headers: localHeaders,
            typeHint: typeHint,
            formatHint: formatHint,
            quality: quality,
            label: label,
            sizeBytes: sizeBytes,
            isM3U8: isM3U8 || key == 'hlsUrl',
            isEmbed: isEmbedFlag,
            expiresIn: ttl,
          );
        }
      }

      if (map['embedUrl'] is String) {
        addCandidate(
          map['embedUrl'].toString(),
          headers: localHeaders,
          typeHint: 'embed',
          formatHint: 'embed',
          quality: quality,
          label: label,
          isEmbed: true,
          expiresIn: ttl,
        );
      }

      const listKeys = [
        'streams',
        'sources',
        'links',
        'playLinks',
        'downloadLinks',
        'downloads',
        'list',
        'files',
        'qualities',
        'mirrors',
        'urls',
      ];
      for (final lk in listKeys) {
        final rawList = map[lk];
        if (rawList is List) {
          for (final item in rawList) {
            if (item is Map) {
              visitMap(
                Map<String, dynamic>.from(item),
                inheritedHeaders: localHeaders,
                inheritedTtl: ttl,
              );
            } else if (item is String && item.trim().isNotEmpty) {
              addCandidate(
                item,
                headers: localHeaders,
                isEmbed: lk == 'embeds',
                expiresIn: ttl,
              );
            }
          }
        }
      }

      if (map['data'] is Map) {
        visitMap(
          Map<String, dynamic>.from(map['data'] as Map),
          inheritedHeaders: localHeaders,
          inheritedTtl: ttl,
        );
      } else if (map['data'] is List) {
        for (final item in (map['data'] as List).whereType<Map>()) {
          visitMap(
            Map<String, dynamic>.from(item),
            inheritedHeaders: localHeaders,
            inheritedTtl: ttl,
          );
        }
      }
    }

    if (payload is Map) {
      visitMap(Map<String, dynamic>.from(payload), inheritedHeaders: baseHeaders);
    } else if (payload is List) {
      for (final item in payload.whereType<Map>()) {
        visitMap(Map<String, dynamic>.from(item), inheritedHeaders: baseHeaders);
      }
    }

    return results;
  }

  /// Resolves redirects (including cross-protocol HTTP <-> HTTPS that Android Media3
  /// blocks by default) and probes Content-Type / first bytes to accurately classify
  /// HLS vs direct MP4 vs HTML/embed before initializing ExoPlayer.
  static Future<ProbedStreamResult> probeCandidate(
    StreamCandidate candidate, {
    Duration timeout = const Duration(seconds: 8),
  }) async {
    if (candidate.mode == PlayerMode.embed || candidate.isEmbed) {
      return ProbedStreamResult(
        finalUrl: candidate.url,
        headers: candidate.headers,
        mode: PlayerMode.embed,
      );
    }

    final client = HttpClient();
    client.connectionTimeout = timeout;
    client.userAgent = null; // Explicitly control User-Agent via request headers

    try {
      var currentUri = Uri.parse(candidate.url);
      final reqHeaders = Map<String, String>.from(candidate.headers);
      if (!reqHeaders.keys.any((k) => k.toLowerCase() == 'user-agent')) {
        reqHeaders['User-Agent'] = defaultUserAgent;
      }

      for (var hop = 0; hop < 6; hop++) {
        HttpClientRequest request;
        try {
          request = await client.openUrl('GET', currentUri).timeout(timeout);
        } catch (_) {
          break;
        }
        request.followRedirects = false;
        reqHeaders.forEach((k, v) {
          request.headers.set(k, v);
        });
        // Fetch only the first kilobyte so playlists/HTML sniff immediately without downloading video
        request.headers.set('Range', 'bytes=0-1023');

        final response = await request.close().timeout(timeout);
        final status = response.statusCode;

        if (status >= 300 && status < 400) {
          final loc = response.headers.value(HttpHeaders.locationHeader);
          await response.drain<void>().catchError((_) {});
          if (loc == null || loc.trim().isEmpty) {
            break;
          }
          currentUri = currentUri.resolve(loc.trim());
          continue;
        }

        final contentType = (response.headers.value(HttpHeaders.contentTypeHeader) ?? '').toLowerCase();
        final acceptRanges = (response.headers.value(HttpHeaders.acceptRangesHeader) ?? '').toLowerCase();
        final contentRange = response.headers.value(HttpHeaders.contentRangeHeader);
        int? totalLength = response.contentLength >= 0 ? response.contentLength : null;
        if (contentRange != null) {
          final slash = contentRange.lastIndexOf('/');
          if (slash != -1) {
            final parsed = int.tryParse(contentRange.substring(slash + 1).trim());
            if (parsed != null) totalLength = parsed;
          }
        }

        // Read small prefix safely to distinguish #EXTM3U vs HTML error/embed pages
        final bytes = <int>[];
        try {
          await for (final chunk in response.timeout(timeout)) {
            bytes.addAll(chunk);
            if (bytes.length >= 1024) break;
          }
        } catch (_) {}

        final prefix = utf8.decode(bytes, allowMalformed: true).trimLeft().toLowerCase();
        final resolvedStr = currentUri.toString();

        PlayerMode detectedMode = candidate.mode;
        if (contentType.contains('text/html') ||
            contentType.contains('application/xhtml') ||
            prefix.startsWith('<!doctype html') ||
            prefix.startsWith('<html')) {
          detectedMode = PlayerMode.embed;
        } else if (contentType.contains('mpegurl') ||
            prefix.startsWith('#extm3u') ||
            resolvedStr.toLowerCase().contains('.m3u8')) {
          detectedMode = PlayerMode.hls;
        } else if (contentType.contains('video/') ||
            contentType.contains('octet-stream') ||
            looksLikeDirectVideoFile(resolvedStr)) {
          detectedMode = PlayerMode.direct;
        }

        return ProbedStreamResult(
          finalUrl: resolvedStr,
          headers: reqHeaders,
          mode: detectedMode,
          contentType: contentType.isNotEmpty ? contentType : null,
          contentLength: totalLength,
          acceptsRanges: acceptRanges.contains('bytes') || status == 206,
          statusCode: status,
        );
      }

      return ProbedStreamResult(
        finalUrl: currentUri.toString(),
        headers: reqHeaders,
        mode: candidate.mode,
      );
    } catch (_) {
      return ProbedStreamResult(
        finalUrl: candidate.url,
        headers: candidate.headers,
        mode: candidate.mode,
      );
    } finally {
      client.close(force: true);
    }
  }
}
