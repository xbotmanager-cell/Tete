import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../providers/catalog_provider.dart';
import '../screens/detail_screen.dart';
import '../theme/edition_themes.dart';
import '../widgets/api_error_banner.dart';
import '../widgets/edition_media_card.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final _searchCtrl = TextEditingController();
  String _provider = 'moviebox'; // 'moviebox' | 'showbox'
  String _tab = 'trending'; // trending | popular-movies | popular-series | latest | upcoming
  String _selectedGenre = '';
  int _page = 1;
  bool _loading = true;
  Object? _error;
  List<MediaItem> _items = [];

  @override
  void initState() {
    super.initState();
    _fetchCatalog();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchCatalog() async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final q = _searchCtrl.text.trim();
      final prefix = _provider == 'showbox' ? 'v2' : 'v1';
      dynamic res;

      if (q.isNotEmpty) {
        res = await auth.apiClient.get('/api/fx/search', query: {
          'q': q,
          'mode': prefix,
          'page': _page,
        });
      } else if (_selectedGenre.isNotEmpty) {
        res = await auth.apiClient.get(
          '/api/fx/genres/${Uri.encodeComponent(_selectedGenre)}',
          query: {'provider': prefix, 'page': _page},
        );
      } else {
        final path = switch (_tab) {
          'popular-movies' => '/api/fx/movies/popular',
          'popular-series' => '/api/fx/series/popular',
          'latest' => '/api/fx/movies/latest',
          'upcoming' => '/api/fx/movies/upcoming',
          _ => '/api/fx/movies/trending',
        };
        res = await auth.apiClient.get(path, query: {
          'provider': prefix,
          'page': _page,
        });
      }

      final normalized = extractArray(res)
          .map((r) => MediaItem.fromRaw(
                r,
                defaultSource: _provider == 'showbox' ? 'showbox' : 'moviebox',
              ))
          .toList();

      if (mounted) {
        setState(() => _items = normalized);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _items = [];
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final catalog = context.watch<CatalogProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);
    final width = MediaQuery.of(context).size.width;
    final cols = width >= 900 ? 5 : width >= 600 ? 4 : 3;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      textInputAction: TextInputAction.search,
                      style: TextStyle(color: t.text, fontSize: 14),
                      onSubmitted: (_) {
                        setState(() => _page = 1);
                        _fetchCatalog();
                      },
                      decoration: InputDecoration(
                        hintText: 'Search movies, TV series, actors…',
                        hintStyle: TextStyle(color: t.mutedText),
                        prefixIcon: Icon(Icons.search, color: t.mutedText),
                        suffixIcon: _searchCtrl.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  _searchCtrl.clear();
                                  setState(() => _page = 1);
                                  _fetchCatalog();
                                },
                              )
                            : null,
                        filled: true,
                        fillColor: t.surface,
                        contentPadding: const EdgeInsets.symmetric(vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(t.buttonRadius),
                          borderSide: BorderSide(color: t.border),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  PopupMenuButton<String>(
                    initialValue: _provider,
                    onSelected: (v) {
                      setState(() {
                        _provider = v;
                        _page = 1;
                      });
                      _fetchCatalog();
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'moviebox', child: Text('MovieBox (v1)')),
                      PopupMenuItem(value: 'showbox', child: Text('Showbox (v2)')),
                    ],
                    child: Container(
                      height: 46,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: t.surface,
                        borderRadius: BorderRadius.circular(t.buttonRadius),
                        border: Border.all(color: t.border),
                      ),
                      child: Row(
                        children: [
                          Text(
                            _provider == 'showbox' ? 'Showbox' : 'MovieBox',
                            style: TextStyle(
                              color: t.accent,
                              fontWeight: FontWeight.w700,
                              fontSize: 12.5,
                            ),
                          ),
                          Icon(Icons.arrow_drop_down, color: t.accent),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 36,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    for (final tabOpt in const [
                      ('trending', 'Trending'),
                      ('popular-movies', 'Movies'),
                      ('popular-series', 'Series'),
                      ('latest', 'Latest'),
                      ('upcoming', 'Upcoming'),
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(tabOpt.$2),
                          selected: _selectedGenre.isEmpty && _tab == tabOpt.$1,
                          selectedColor: t.accent,
                          labelStyle: TextStyle(
                            color: (_selectedGenre.isEmpty && _tab == tabOpt.$1)
                                ? t.onAccent
                                : t.text,
                            fontSize: 12,
                          ),
                          onSelected: (_) {
                            setState(() {
                              _selectedGenre = '';
                              _tab = tabOpt.$1;
                              _page = 1;
                            });
                            _fetchCatalog();
                          },
                        ),
                      ),
                    ...catalog.genres.take(10).map((g) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(g.name),
                            selected: _selectedGenre == g.slug,
                            selectedColor: t.accent,
                            labelStyle: TextStyle(
                              color: _selectedGenre == g.slug ? t.onAccent : t.text,
                              fontSize: 12,
                            ),
                            onSelected: (_) {
                              setState(() {
                                _selectedGenre = _selectedGenre == g.slug ? '' : g.slug;
                                _page = 1;
                              });
                              _fetchCatalog();
                            },
                          ),
                        )),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: ApiErrorBanner(error: _error!, theme: t, onRetry: _fetchCatalog),
          ),
        Expanded(
          child: _loading
              ? Center(child: CircularProgressIndicator(color: t.accent))
              : _items.isEmpty
                  ? Center(
                      child: Text(
                        'No titles found for your selection.',
                        style: TextStyle(color: t.mutedText),
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: cols,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 14,
                        childAspectRatio: 0.54,
                      ),
                      itemCount: _items.length,
                      itemBuilder: (_, idx) => EditionMediaCard(
                        item: _items[idx],
                        theme: t,
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => TitleDetailScreen(item: _items[idx]),
                          ),
                        ),
                      ),
                    ),
        ),
        if (!_loading && _items.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                OutlinedButton(
                  onPressed: _page > 1
                      ? () {
                          setState(() => _page--);
                          _fetchCatalog();
                        }
                      : null,
                  child: const Text('Previous'),
                ),
                Text('Page $_page', style: TextStyle(color: t.mutedText, fontSize: 12.5)),
                OutlinedButton(
                  onPressed: () {
                    setState(() => _page++);
                    _fetchCatalog();
                  },
                  child: const Text('Next'),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
