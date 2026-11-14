import 'package:flutter/foundation.dart';
import '../models/framex_models.dart';
import '../services/api_client.dart';

class GenreCollection {
  final String id;
  final String label;
  final String slug;
  final List<MediaItem> items;

  GenreCollection({
    required this.id,
    required this.label,
    required this.slug,
    required this.items,
  });
}

class GenreOption {
  final String name;
  final String slug;

  GenreOption({required this.name, required this.slug});
}

class CatalogProvider extends ChangeNotifier {
  final ApiClient apiClient;

  CatalogProvider(this.apiClient);

  bool _loading = true;
  Object? _error;
  List<MediaItem> _trending = [];
  List<MediaItem> _popularMovies = [];
  List<MediaItem> _popularSeries = [];
  List<MediaItem> _latestMovies = [];
  List<MediaItem> _upcoming = [];
  List<GenreOption> _genres = [];
  List<GenreCollection> _genreCollections = [];

  bool get loading => _loading;
  Object? get error => _error;
  List<MediaItem> get trending => _trending;
  List<MediaItem> get popularMovies => _popularMovies;
  List<MediaItem> get popularSeries => _popularSeries;
  List<MediaItem> get latestMovies => _latestMovies;
  List<MediaItem> get upcoming => _upcoming;
  List<GenreOption> get genres => _genres;
  List<GenreCollection> get genreCollections => _genreCollections;

  List<MediaItem> _normalizeList(dynamic payload, {String defaultSource = 'moviebox'}) {
    return extractArray(payload)
        .map((r) => MediaItem.fromRaw(r, defaultSource: defaultSource))
        .toList();
  }

  Future<void> loadAll() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        apiClient.get('/api/fx/movies/trending'),
        apiClient.get('/api/fx/movies/popular'),
        apiClient.get('/api/fx/series/popular'),
        apiClient.get('/api/fx/movies/latest'),
        apiClient.get('/api/fx/movies/upcoming'),
        apiClient.get('/api/fx/genres').catchError((_) => <dynamic>[]),
      ]);

      _trending = _normalizeList(results[0]);
      _popularMovies = _normalizeList(results[1]);
      _popularSeries = _normalizeList(results[2]);
      _latestMovies = _normalizeList(results[3]);
      _upcoming = _normalizeList(results[4]);

      final rawGenres = extractArray(results[5]);
      _genres = rawGenres
          .map((g) => GenreOption(
                name: (g['name'] ?? g['title'] ?? g['slug'] ?? '').toString(),
                slug: (g['slug'] ?? g['name'] ?? '').toString(),
              ))
          .where((g) => g.slug.isNotEmpty)
          .toList();

      if (_genres.isNotEmpty) {
        final topGenres = _genres.take(3).toList();
        final colFutures = topGenres.map((g) async {
          try {
            final res = await apiClient.get('/api/fx/genres/${Uri.encodeComponent(g.slug)}');
            final items = _normalizeList(res);
            if (items.isEmpty) return null;
            return GenreCollection(id: g.slug, label: g.name, slug: g.slug, items: items);
          } catch (_) {
            return null;
          }
        });
        final cols = await Future.wait(colFutures);
        _genreCollections = cols.whereType<GenreCollection>().toList();
      }
    } catch (e) {
      _error = e;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
