import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../models/framex_models.dart';
import '../services/api_client.dart';

class AuthProvider extends ChangeNotifier {
  static const String _tokenStorageKey = 'lupin_session_token_v1';
  static const String _layoutPrefsKey = 'lupin_layout_mode_v1';
  static const String _apiUrlPrefsKey = 'lupin_api_base_url_v1';
  static const String _guestLibKey = 'lupin_guest_library_v1';
  static const String _guestWatchKey = 'lupin_guest_watch_v1';
  static const String _guestReadKey = 'lupin_guest_read_v1';

  final ApiClient apiClient;
  final FlutterSecureStorage _secureStorage;

  AuthProvider({
    ApiClient? client,
    FlutterSecureStorage? secureStorage,
  })  : apiClient = client ?? ApiClient(),
        _secureStorage = secureStorage ?? const FlutterSecureStorage();

  UserProfile? _user;
  bool _loading = true;
  LayoutMode _layoutMode = LayoutMode.cinematic; // Cinematic Edition MUST be default
  List<LibraryEntry> _library = [];
  List<WatchProgressEntry> _watchProgress = [];
  List<ReadingProgressEntry> _readingProgress = [];

  UserProfile? get user => _user;
  bool get loading => _loading;
  LayoutMode get layoutMode => _layoutMode;
  List<LibraryEntry> get library => _library;
  List<WatchProgressEntry> get watchProgress => _watchProgress;
  List<ReadingProgressEntry> get readingProgress => _readingProgress;
  String get apiBaseUrl => apiClient.baseUrl;

  Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUrl = prefs.getString(_apiUrlPrefsKey);
      if (savedUrl != null && savedUrl.isNotEmpty) {
        apiClient.setBaseUrl(savedUrl);
      } else {
        apiClient.setBaseUrl(AppConfig.defaultApiBaseUrl);
      }

      final savedLayout = prefs.getString(_layoutPrefsKey);
      _layoutMode = LayoutMode.fromKey(savedLayout);

      _loadGuestState(prefs);

      String? token;
      try {
        token = await _secureStorage.read(key: _tokenStorageKey);
      } catch (_) {
        token = null;
      }

      if (token != null && token.isNotEmpty) {
        apiClient.setBearerToken(token);
        try {
          final me = await apiClient.get('/api/local/auth/me');
          if (me is Map && me['user'] is Map) {
            _user = UserProfile.fromJson(Map<String, dynamic>.from(me['user'] as Map));
            await _syncLayoutFromUser(_user!);
            await loadServerLibrary();
          } else {
            apiClient.setBearerToken(null);
            await _secureStorage.delete(key: _tokenStorageKey);
          }
        } catch (_) {
          // Offline or expired session; preserve local guest view safely
        }
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void _loadGuestState(SharedPreferences prefs) {
    try {
      final libRaw = prefs.getString(_guestLibKey);
      if (libRaw != null) {
        final decoded = jsonDecode(libRaw) as List;
        _library = decoded
            .whereType<Map>()
            .map((e) => LibraryEntry.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
    } catch (_) {}

    try {
      final watchRaw = prefs.getString(_guestWatchKey);
      if (watchRaw != null) {
        final decoded = jsonDecode(watchRaw) as List;
        _watchProgress = decoded
            .whereType<Map>()
            .map((e) => WatchProgressEntry.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
    } catch (_) {}

    try {
      final readRaw = prefs.getString(_guestReadKey);
      if (readRaw != null) {
        final decoded = jsonDecode(readRaw) as List;
        _readingProgress = decoded
            .whereType<Map>()
            .map((e) => ReadingProgressEntry.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
    } catch (_) {}
  }

  Future<void> _syncLayoutFromUser(UserProfile u) async {
    _layoutMode = u.preferredLayout;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_layoutPrefsKey, _layoutMode.key);
  }

  Future<void> setApiBaseUrl(String url) async {
    apiClient.setBaseUrl(url);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_apiUrlPrefsKey, apiClient.baseUrl);
    notifyListeners();
  }

  Future<void> setLayoutMode(LayoutMode mode) async {
    _layoutMode = mode;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_layoutPrefsKey, mode.key);

    if (_user != null) {
      _user = _user!.copyWith(preferredLayout: mode);
      try {
        await apiClient.patch('/api/local/auth/profile', body: {
          'preferred_layout': mode.key,
        });
      } catch (_) {
        // Local preference already stored; ignore background failure
      }
    }
  }

  Future<void> loadServerLibrary() async {
    if (_user == null) return;
    try {
      final res = await apiClient.get('/api/local/library');
      if (res is Map) {
        final items = (res['items'] as List? ?? [])
            .whereType<Map>()
            .map((e) => LibraryEntry.fromJson(Map<String, dynamic>.from(e)))
            .toList();
        final progress = (res['progress'] as List? ?? [])
            .whereType<Map>()
            .map((e) => WatchProgressEntry.fromJson(Map<String, dynamic>.from(e)))
            .toList();
        final reading = (res['reading'] as List? ?? [])
            .whereType<Map>()
            .map((e) => ReadingProgressEntry.fromJson(Map<String, dynamic>.from(e)))
            .toList();
        _library = items;
        _watchProgress = progress;
        _readingProgress = reading;
        notifyListeners();
      }
    } catch (_) {
      // Retain existing state if unreachable
    }
  }

  Future<void> login(String email, String password) async {
    final res = await apiClient.post('/api/local/auth/login', body: {
      'email': email.trim(),
      'password': password,
    });
    if (res is Map && res['user'] is Map) {
      final token = res['sessionToken']?.toString();
      if (token != null && token.isNotEmpty) {
        apiClient.setBearerToken(token);
        await _secureStorage.write(key: _tokenStorageKey, value: token);
      }
      _user = UserProfile.fromJson(Map<String, dynamic>.from(res['user'] as Map));
      await _syncLayoutFromUser(_user!);
      await loadServerLibrary();
      notifyListeners();
    } else {
      throw ApiException(status: 500, message: 'Unexpected login response from server.');
    }
  }

  Future<void> register(String email, String password, String name) async {
    final res = await apiClient.post('/api/local/auth/register', body: {
      'email': email.trim(),
      'password': password,
      'name': name.trim(),
    });
    if (res is Map && res['user'] is Map) {
      final token = res['sessionToken']?.toString();
      if (token != null && token.isNotEmpty) {
        apiClient.setBearerToken(token);
        await _secureStorage.write(key: _tokenStorageKey, value: token);
      }
      _user = UserProfile.fromJson(Map<String, dynamic>.from(res['user'] as Map));
      await _syncLayoutFromUser(_user!);
      await loadServerLibrary();
      notifyListeners();
    } else {
      throw ApiException(status: 500, message: 'Unexpected registration response from server.');
    }
  }

  Future<void> logout() async {
    try {
      await apiClient.post('/api/local/auth/logout');
    } catch (_) {}
    apiClient.setBearerToken(null);
    await _secureStorage.delete(key: _tokenStorageKey);
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    _loadGuestState(prefs);
    notifyListeners();
  }

  Future<void> updateProfile({
    String? name,
    String? preferredQuality,
    String? preferredSubtitleLang,
    String? preferredAudioLang,
    LayoutMode? preferredLayout,
  }) async {
    final res = await apiClient.patch('/api/local/auth/profile', body: {
      if (name != null) 'name': name,
      if (preferredQuality != null) 'preferred_quality': preferredQuality,
      if (preferredSubtitleLang != null) 'preferred_subtitle_lang': preferredSubtitleLang,
      if (preferredAudioLang != null) 'preferred_audio_lang': preferredAudioLang,
      if (preferredLayout != null) 'preferred_layout': preferredLayout.key,
    });
    if (res is Map && res['user'] is Map) {
      _user = UserProfile.fromJson(Map<String, dynamic>.from(res['user'] as Map));
      await _syncLayoutFromUser(_user!);
      notifyListeners();
    }
  }

  bool isInLibrary(String itemId, String listType, {String? mediaType}) {
    return _library.any((x) =>
        x.itemId == itemId &&
        x.listType == listType &&
        (mediaType == null || x.mediaType == mediaType));
  }

  Future<bool> toggleLibraryItem(LibraryEntry entry) async {
    if (_user != null) {
      final res = await apiClient.post('/api/local/library/toggle', body: {
        'list_type': entry.listType,
        'media_type': entry.mediaType,
        'item_id': entry.itemId,
        'slug': entry.slug,
        'provider': entry.provider,
        'title': entry.title,
        'poster': entry.poster,
        'year': entry.year,
      });
      await loadServerLibrary();
      return (res is Map && res['active'] == true);
    }

    final exists = _library.any((x) =>
        x.itemId == entry.itemId &&
        x.listType == entry.listType &&
        x.mediaType == entry.mediaType);

    if (exists) {
      _library = _library
          .where((x) => !(x.itemId == entry.itemId &&
              x.listType == entry.listType &&
              x.mediaType == entry.mediaType))
          .toList();
    } else {
      _library = [
        LibraryEntry(
          listType: entry.listType,
          mediaType: entry.mediaType,
          itemId: entry.itemId,
          slug: entry.slug,
          provider: entry.provider,
          title: entry.title,
          poster: entry.poster,
          year: entry.year,
          createdAt: DateTime.now().toIso8601String(),
        ),
        ..._library,
      ];
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _guestLibKey,
      jsonEncode(_library.map((e) => e.toJson()).toList()),
    );
    notifyListeners();
    return !exists;
  }

  WatchProgressEntry? getWatchProgress(String contentId, {int season = 0, int episode = 0}) {
    for (final p in _watchProgress) {
      if (p.contentId == contentId && p.season == season && p.episode == episode) {
        return p;
      }
    }
    return null;
  }

  Future<void> saveWatchProgress(WatchProgressEntry entry) async {
    final updated = WatchProgressEntry(
      contentId: entry.contentId,
      slug: entry.slug,
      provider: entry.provider,
      mediaType: entry.mediaType,
      title: entry.title,
      poster: entry.poster,
      season: entry.season,
      episode: entry.episode,
      positionSeconds: entry.positionSeconds,
      durationSeconds: entry.durationSeconds,
      updatedAt: DateTime.now().toIso8601String(),
    );

    final filtered = _watchProgress.where((p) => !(p.contentId == entry.contentId &&
        p.mediaType == entry.mediaType &&
        p.season == entry.season &&
        p.episode == entry.episode));
    _watchProgress = [updated, ...filtered].take(40).toList();
    notifyListeners();

    if (_user != null) {
      try {
        await apiClient.post('/api/local/progress/watch', body: {
          'content_id': entry.contentId,
          'slug': entry.slug,
          'provider': entry.provider,
          'media_type': entry.mediaType,
          'title': entry.title,
          'poster': entry.poster,
          'season': entry.season,
          'episode': entry.episode,
          'position_seconds': entry.positionSeconds,
          'duration_seconds': entry.durationSeconds,
        });
      } catch (_) {}
    } else {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _guestWatchKey,
        jsonEncode(_watchProgress.map((e) => e.toJson()).toList()),
      );
    }
  }

  Future<void> saveReadingProgress(ReadingProgressEntry entry) async {
    final updated = ReadingProgressEntry(
      novelId: entry.novelId,
      novelTitle: entry.novelTitle,
      cover: entry.cover,
      chapterId: entry.chapterId,
      chapterTitle: entry.chapterTitle,
      progressPercent: entry.progressPercent,
      updatedAt: DateTime.now().toIso8601String(),
    );

    final filtered = _readingProgress.where((r) => r.novelId != entry.novelId);
    _readingProgress = [updated, ...filtered].take(30).toList();
    notifyListeners();

    if (_user != null) {
      try {
        await apiClient.post('/api/local/progress/reading', body: {
          'novel_id': entry.novelId,
          'novel_title': entry.novelTitle,
          'cover': entry.cover,
          'chapter_id': entry.chapterId,
          'chapter_title': entry.chapterTitle,
          'progress_percent': entry.progressPercent,
        });
      } catch (_) {}
    } else {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _guestReadKey,
        jsonEncode(_readingProgress.map((e) => e.toJson()).toList()),
      );
    }
  }
}
