import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../screens/video_player_screen.dart';
import '../theme/edition_themes.dart';
import '../widgets/api_error_banner.dart';

class _AnimeItem {
  final String contentId;
  final String title;
  final String? poster;
  final String? year;
  final String? description;

  _AnimeItem({
    required this.contentId,
    required this.title,
    this.poster,
    this.year,
    this.description,
  });
}

class _AnimeEpisode {
  final String id;
  final int number;
  final String title;
  final String? thumbnail;

  _AnimeEpisode({
    required this.id,
    required this.number,
    required this.title,
    this.thumbnail,
  });
}

class _AnimeServer {
  final String id;
  final String name;
  final String type; // 'sub' | 'dub'

  _AnimeServer({required this.id, required this.name, required this.type});
}

class AnimeScreen extends StatefulWidget {
  const AnimeScreen({super.key});

  @override
  State<AnimeScreen> createState() => _AnimeScreenState();
}

class _AnimeScreenState extends State<AnimeScreen> {
  static const _featured = ['One Piece', 'Jujutsu Kaisen', 'Solo Leveling', 'Naruto', 'Demon Slayer'];
  final _searchCtrl = TextEditingController(text: 'One Piece');

  String _engine = 'animex'; // 'animex' | 'gotaku'
  bool _loading = true;
  Object? _error;
  List<_AnimeItem> _results = [];

  _AnimeItem? _selected;
  bool _loadingEpisodes = false;
  List<_AnimeEpisode> _episodes = [];
  String _subOrDub = 'sub';
  List<_AnimeServer> _servers = [];
  String _selectedServer = '';

  @override
  void initState() {
    super.initState();
    _runSearch(_searchCtrl.text);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _runSearch(String query) async {
    final term = query.trim();
    if (term.isEmpty) return;
    final auth = context.read<AuthProvider>();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final endpoint =
          _engine == 'animex' ? '/api/fx/anime/animex/search' : '/api/fx/anime/gotaku/search';
      final res = await auth.apiClient.get(endpoint, query: {'q': term, 'limit': 24});
      final items = extractArray(res)
          .map((raw) => _AnimeItem(
                contentId: (raw['contentId'] ?? raw['id'] ?? raw['slug'] ?? '').toString(),
                title: (raw['title'] ?? raw['name'] ?? 'Untitled Anime').toString(),
                poster: (raw['poster'] ?? raw['image'] ?? raw['cover'])?.toString(),
                year: raw['year']?.toString(),
                description: raw['description']?.toString(),
              ))
          .where((x) => x.contentId.isNotEmpty)
          .toList();
      if (mounted) setState(() => _results = items);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadServers(String contentId, int epNum) async {
    final auth = context.read<AuthProvider>();
    try {
      final res = await auth.apiClient.get('/api/fx/anime/animex/providers', query: {
        'contentId': contentId,
        'episode': epNum,
      });
      final list = <_AnimeServer>[];
      if (res is Map) {
        for (final s in (res['sub'] as List? ?? []).whereType<Map>()) {
          list.add(_AnimeServer(
            id: (s['providerId'] ?? s['id'] ?? s['name']).toString(),
            name: (s['name'] ?? s['providerName'] ?? s['id'] ?? 'Server').toString(),
            type: 'sub',
          ));
        }
        for (final d in (res['dub'] as List? ?? []).whereType<Map>()) {
          list.add(_AnimeServer(
            id: (d['providerId'] ?? d['id'] ?? d['name']).toString(),
            name: (d['name'] ?? d['providerName'] ?? d['id'] ?? 'Server').toString(),
            type: 'dub',
          ));
        }
      }
      if (list.isEmpty) {
        for (final p in extractArray(res)) {
          list.add(_AnimeServer(
            id: (p['providerId'] ?? p['id'] ?? p['name']).toString(),
            name: (p['name'] ?? p['providerName'] ?? p['id'] ?? 'Server').toString(),
            type: p['type'] == 'dub' ? 'dub' : 'sub',
          ));
        }
      }
      if (mounted) {
        setState(() {
          _servers = list;
          final match = list.where((s) => s.type == _subOrDub).firstOrNull ?? list.firstOrNull;
          _selectedServer = match?.id ?? '';
        });
      }
    } catch (_) {
      if (mounted) setState(() => _servers = []);
    }
  }

  Future<void> _openAnime(_AnimeItem item) async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _selected = item;
      _episodes = [];
      _servers = [];
      _loadingEpisodes = true;
    });

    try {
      if (_engine == 'animex') {
        final res = await auth.apiClient.get(
          '/api/fx/anime/animex/episodes',
          query: {'contentId': item.contentId},
        );
        final eps = extractArray(res).asMap().entries.map((entry) {
          final ep = entry.value;
          final numVal = int.tryParse((ep['number'] ?? ep['episode'] ?? '${entry.key + 1}').toString()) ??
              (entry.key + 1);
          return _AnimeEpisode(
            id: (ep['episode'] ?? ep['number'] ?? '$numVal').toString(),
            number: numVal,
            title: ep['title']?.toString() ?? 'Episode $numVal',
            thumbnail: (ep['thumbnail'] ?? ep['image'] ?? ep['cover'])?.toString(),
          );
        }).toList();
        if (mounted) setState(() => _episodes = eps);
        if (eps.isNotEmpty) {
          _loadServers(item.contentId, eps.first.number);
        }
      } else {
        final res = await auth.apiClient.get(
          '/api/fx/anime/gotaku/episodes',
          query: {'contentId': item.contentId},
        );
        final eps = extractArray(res).asMap().entries.map((entry) {
          final ep = entry.value;
          final numVal = int.tryParse((ep['number'] ?? ep['episode'] ?? '${entry.key + 1}').toString()) ??
              (entry.key + 1);
          return _AnimeEpisode(
            id: (ep['episodeId'] ?? ep['id'] ?? '$numVal').toString(),
            number: numVal,
            title: ep['title']?.toString() ?? 'Episode $numVal',
            thumbnail: (ep['thumbnail'] ?? ep['image'] ?? ep['cover'])?.toString(),
          );
        }).toList();
        if (mounted) setState(() => _episodes = eps);
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loadingEpisodes = false);
    }
  }

  void _playEpisode(_AnimeItem item, _AnimeEpisode ep) {
    final playerEpisodes = _episodes
        .map((e) => PlayerEpisodeOption(
              id: e.id,
              episode: e.number,
              title: e.title,
              thumbnail: e.thumbnail,
            ))
        .toList();

    ActivePlaybackTarget buildTarget(PlayerEpisodeOption opt) {
      final matched = _episodes.firstWhere(
        (e) => e.number == opt.episode,
        orElse: () => ep,
      );
      if (_engine == 'animex') {
        return ActivePlaybackTarget(
          mode: PlayerMode.hls,
          title: item.title,
          subtitle: 'Episode ${matched.number} · ${_subOrDub.toUpperCase()} · AnimeX',
          poster: item.poster,
          provider: 'animex',
          contentId: item.contentId,
          mediaType: 'anime',
          episode: matched.number,
          animeType: _subOrDub,
          animeProviderId: _selectedServer.isNotEmpty ? _selectedServer : null,
          episodes: playerEpisodes,
          buildForEpisode: buildTarget,
        );
      }
      return ActivePlaybackTarget(
        mode: PlayerMode.embed,
        title: item.title,
        subtitle: 'Episode ${matched.number} · Gotaku',
        poster: item.poster,
        provider: 'gotaku',
        contentId: matched.id,
        mediaType: 'anime',
        episode: matched.number,
        animeType: 'hard_sub',
        episodes: playerEpisodes,
        buildForEpisode: buildTarget,
      );
    }

    final initial = buildTarget(
      PlayerEpisodeOption(id: ep.id, episode: ep.number, title: ep.title),
    );
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => VideoPlayerScreen(initialTarget: initial)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);
    final width = MediaQuery.of(context).size.width;
    final cols = width >= 900 ? 5 : width >= 600 ? 4 : 3;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: t.surface,
            borderRadius: BorderRadius.circular(t.cardRadius),
            border: Border.all(color: t.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Anime Center',
                style: t.headingFont(TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: t.text,
                )),
              ),
              const SizedBox(height: 4),
              Text(
                'AnimeX (HLS + SUB/DUB + Server Selection) & Gotaku (Embeds)',
                style: TextStyle(color: t.mutedText, fontSize: 12.5),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text('AnimeX (HLS)')),
                      selected: _engine == 'animex',
                      selectedColor: t.accent,
                      onSelected: (_) {
                        setState(() {
                          _engine = 'animex';
                          _selected = null;
                        });
                        _runSearch(_searchCtrl.text);
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text('Gotaku (Embeds)')),
                      selected: _engine == 'gotaku',
                      selectedColor: t.accent,
                      onSelected: (_) {
                        setState(() {
                          _engine = 'gotaku';
                          _selected = null;
                        });
                        _runSearch(_searchCtrl.text);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      style: TextStyle(color: t.text, fontSize: 14),
                      onSubmitted: _runSearch,
                      decoration: InputDecoration(
                        hintText: 'Search anime…',
                        prefixIcon: const Icon(Icons.search),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(t.buttonRadius),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () => _runSearch(_searchCtrl.text),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: t.accent,
                      foregroundColor: t.onAccent,
                      minimumSize: const Size(70, 50),
                    ),
                    child: const Text('Go'),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 34,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _featured.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, idx) => ActionChip(
                    label: Text(_featured[idx], style: const TextStyle(fontSize: 11.5)),
                    onPressed: () {
                      _searchCtrl.text = _featured[idx];
                      _runSearch(_featured[idx]);
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          ApiErrorBanner(error: _error!, theme: t, onRetry: () => _runSearch(_searchCtrl.text)),
        ],
        if (_selected != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: t.elevatedSurface,
              borderRadius: BorderRadius.circular(t.cardRadius),
              border: Border.all(color: t.accent.withOpacity(0.5)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _selected!.title,
                        style: t.headingFont(TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: t.text,
                        )),
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: t.mutedText),
                      onPressed: () => setState(() => _selected = null),
                    ),
                  ],
                ),
                if (_engine == 'animex')
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      ChoiceChip(
                        label: const Text('SUB'),
                        selected: _subOrDub == 'sub',
                        selectedColor: t.accent,
                        onSelected: (_) => setState(() => _subOrDub = 'sub'),
                      ),
                      ChoiceChip(
                        label: const Text('DUB'),
                        selected: _subOrDub == 'dub',
                        selectedColor: t.accent,
                        onSelected: (_) => setState(() => _subOrDub = 'dub'),
                      ),
                      if (_servers.where((s) => s.type == _subOrDub).isNotEmpty)
                        DropdownButton<String>(
                          value: _selectedServer.isNotEmpty ? _selectedServer : null,
                          hint: const Text('Auto Server'),
                          dropdownColor: t.surface,
                          items: _servers
                              .where((s) => s.type == _subOrDub)
                              .map((s) => DropdownMenuItem(
                                    value: s.id,
                                    child: Text(s.name, style: TextStyle(color: t.text)),
                                  ))
                              .toList(),
                          onChanged: (v) {
                            if (v != null) setState(() => _selectedServer = v);
                          },
                        ),
                    ],
                  ),
                const SizedBox(height: 10),
                if (_loadingEpisodes)
                  Center(child: CircularProgressIndicator(color: t.accent))
                else if (_episodes.isEmpty)
                  Text('No episodes available.', style: TextStyle(color: t.mutedText))
                else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _episodes.map((ep) {
                      return InkWell(
                        onTap: () => _playEpisode(_selected!, ep),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          width: 96,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: t.surface,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: t.border),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'EP ${ep.number}',
                                style: TextStyle(
                                  color: t.text,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                ),
                              ),
                              Icon(Icons.play_arrow, size: 15, color: t.accent),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 16),
        if (_loading)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 40),
            child: Center(child: CircularProgressIndicator(color: t.accent)),
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: cols,
              crossAxisSpacing: 10,
              mainAxisSpacing: 12,
              childAspectRatio: 0.56,
            ),
            itemCount: _results.length,
            itemBuilder: (_, idx) {
              final item = _results[idx];
              return InkWell(
                onTap: () => _openAnime(item),
                borderRadius: BorderRadius.circular(t.cardRadius),
                child: Container(
                  decoration: BoxDecoration(
                    color: t.surface,
                    borderRadius: BorderRadius.circular(t.cardRadius),
                    border: Border.all(color: t.border),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: item.poster != null
                            ? CachedNetworkImage(
                                imageUrl: item.poster!,
                                fit: BoxFit.cover,
                                width: double.infinity,
                                errorWidget: (_, __, ___) => Image.asset(
                                  AppConfig.assetAnimeShowcase,
                                  fit: BoxFit.cover,
                                  width: double.infinity,
                                ),
                              )
                            : Image.asset(
                                AppConfig.assetAnimeShowcase,
                                fit: BoxFit.cover,
                                width: double.infinity,
                              ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(7),
                        child: Text(
                          item.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: t.text,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }
}
