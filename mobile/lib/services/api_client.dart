import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';

class ApiException implements Exception {
  final int status;
  final String message;
  final String? code;
  final bool isDomainRestriction;
  final String? detectedOrigin;

  ApiException({
    required this.status,
    required this.message,
    this.code,
    this.isDomainRestriction = false,
    this.detectedOrigin,
  });

  @override
  String toString() => message;
}

class ApiClient {
  String _baseUrl = AppConfig.defaultApiBaseUrl;
  String? _bearerToken;

  String get baseUrl => _baseUrl;
  String? get bearerToken => _bearerToken;

  void setBaseUrl(String url) {
    final trimmed = url.trim().replaceAll(RegExp(r'/+$'), '');
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      _baseUrl = trimmed;
    }
  }

  void setBearerToken(String? token) {
    _bearerToken = (token != null && token.trim().isNotEmpty) ? token.trim() : null;
  }

  Uri buildUri(String path, [Map<String, dynamic>? query]) {
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('$_baseUrl$normalizedPath');
    if (query == null || query.isEmpty) return uri;
    final qp = <String, String>{};
    for (final entry in query.entries) {
      final v = entry.value;
      if (v != null && v.toString().trim().isNotEmpty) {
        qp[entry.key] = v.toString();
      }
    }
    return uri.replace(queryParameters: {...uri.queryParameters, ...qp});
  }

  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? query,
    Duration timeout = const Duration(seconds: 20),
  }) {
    return _request('GET', path, query: query, timeout: timeout);
  }

  Future<dynamic> post(
    String path, {
    Map<String, dynamic>? body,
    Map<String, dynamic>? query,
    Duration timeout = const Duration(seconds: 20),
  }) {
    return _request('POST', path, body: body, query: query, timeout: timeout);
  }

  Future<dynamic> patch(
    String path, {
    Map<String, dynamic>? body,
    Map<String, dynamic>? query,
    Duration timeout = const Duration(seconds: 20),
  }) {
    return _request('PATCH', path, body: body, query: query, timeout: timeout);
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, dynamic>? query,
    required Duration timeout,
  }) async {
    final uri = buildUri(path, query);
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (_bearerToken != null) 'Authorization': 'Bearer $_bearerToken',
    };

    late http.Response response;
    try {
      if (method == 'GET') {
        response = await http.get(uri, headers: headers).timeout(timeout);
      } else if (method == 'POST') {
        response = await http
            .post(uri, headers: headers, body: body != null ? jsonEncode(body) : null)
            .timeout(timeout);
      } else if (method == 'PATCH') {
        response = await http
            .patch(uri, headers: headers, body: body != null ? jsonEncode(body) : null)
            .timeout(timeout);
      } else {
        throw ApiException(status: 500, message: 'Unsupported HTTP method: $method');
      }
    } on TimeoutException {
      throw ApiException(status: 504, message: 'Request timed out contacting LUPIN MOVIES server.');
    } catch (e) {
      throw ApiException(
        status: 502,
        message: 'Unable to reach server ($_baseUrl): $e',
      );
    }

    dynamic decoded;
    if (response.body.isNotEmpty) {
      try {
        decoded = jsonDecode(response.body);
      } catch (_) {
        decoded = {'raw': response.body};
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'Request failed (${response.statusCode})';
      String? code;
      bool isDomain = false;
      String? origin;

      if (decoded is Map) {
        if (decoded['error'] is String && (decoded['error'] as String).isNotEmpty) {
          message = decoded['error'] as String;
        } else if (decoded['message'] is String && (decoded['message'] as String).isNotEmpty) {
          message = decoded['message'] as String;
        }
        code = decoded['code']?.toString();
        isDomain = decoded['isDomainRestriction'] == true;
        origin = decoded['detectedOrigin']?.toString();
      }

      throw ApiException(
        status: response.statusCode,
        message: message,
        code: code,
        isDomainRestriction: isDomain,
        detectedOrigin: origin,
      );
    }

    return decoded;
  }

  Future<String> getText(String rawUrl) async {
    final uri = Uri.parse(rawUrl);
    final res = await http.get(uri).timeout(const Duration(seconds: 15));
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(status: res.statusCode, message: 'Failed to load subtitle track');
    }
    return utf8.decode(res.bodyBytes, allowMalformed: true);
  }
}
