import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/download_models.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../providers/download_provider.dart';
import '../screens/video_player_screen.dart';
import '../services/stream_resolver.dart';
import '../theme/edition_themes.dart';
import '../widgets/api_error_banner.dart';
import '../widgets/edition_media_card.dart';

class TitleDetailScreen extends StatefulWidget {
  final MediaItem item;

  const TitleDetailScreen({super.key, required this.item});

  @override
  State<TitleDetailScreen> createState() => _TitleDetailScreenState();
}

class _TitleDetailScreenState extends State<TitleDetailScreen> {
  MediaDetail? _detail;
  bool _loading = true;
  Object? _error;
  int _selectedSeason = 1;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final providerParam = widget.item.source == 'showbox' ? 'v2' : 'v1';
      final slug = widget.item.detailPath ?? widget.item.slug;
      final res = await auth.apiClient.get(
        '/api/fx/movies/${Uri.encodeComponent(slug)}',
        query: {
          'provider': providerParam,
          'type': widget.item.type,
        },
      );
      final parsed = MediaDetail.fromPayload(res, fallback: widget.item);
      if (mounted) {
        setState(() {
          _detail = parsed;
          if (parsed.seasons.isNotEmpty) {
            _selectedSeason = parsed.seasons.first.season;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _detail = MediaDetail(
            item: widget.item,
            cast: const [],
            seasons: const [],
            related: const [],
            languages: const [],
          );
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? _actionNotice;
  bool _resolvingDownload = false;
  String? _resolvedSubjectId;

  Future<String> _resolveEffectiveSubjectId(MediaItem item) async {
    if (_resolvedSubjectId != null) return _resolvedSubjectId!;
    final contentId = item.subjectId ?? item.id;
    if (item.source == 'showbox' || RegExp(r'^\d+$').hasMatch(contentId)) {
      _resolvedSubjectId = contentId;
      return contentId;
    }
    try {
      final auth = context.read<AuthProvider>();
      final lookup = await auth.apiClient.get(
        '/api/fx/ids/lookup',
        query: {'detailPath': item.detailPath ?? item.slug},
      );
      if (lookup is Map && (lookup['subjectId'] != null || lookup['id'] != null)) {
        _resolvedSubjectId = (lookup['subjectId'] ?? lookup['id']).toString();
        return _resolvedSubjectId!;
      }
    } catch (_) {}
    _resolvedSubjectId = contentId;
    return contentId;
  }

  Future<void> _handleDownload({
    int season = 0,
    int episode = 0,
    String? episodeTitle,
  }) async {
    final d = _detail;
    if (d == null || _resolvingDownload) return;
    final auth = context.read<AuthProvider>();
    final dl = context.read<DownloadProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);
    final item = d.item;

    setState(() {
      _resolvingDownload = true;
      _actionNotice = null;
    });

    try {
      final resolvedId = await _resolveEffectiveSubjectId(item);
      final existing = dl.findByContent(
        provider: item.source,
        contentId: resolvedId,
        season: season,
        episode: episode,
      );

      if (existing != null && existing.status == DownloadStatus.completed && existing.localFilePath != null) {
        if (!mounted) return;
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VideoPlayerScreen(
              initialTarget: ActivePlaybackTarget(
                mode: PlayerMode.direct,
                title: existing.title,
                subtitle: existing.subtitle ?? 'Offline Playback',
                poster: existing.posterUrl,
                provider: existing.provider,
                contentId: existing.contentId,
                slug: existing.slug,
                mediaType: existing.mediaType,
                season: existing.season > 0 ? existing.season : null,
                episode: existing.episode > 0 ? existing.episode : null,
                localFilePath: existing.localFilePath,
              ),
            ),
          ),
        );
        return;
      }

      if (existing != null && existing.status.isActive) {
        if (mounted) {
          setState(() => _actionNotice =
              '${item.title} is already downloading (${existing.progressPercent}%). Check Downloads in the menu.');
        }
        return;
      }

      final options = await dl.fetchDownloadOptions(
        item: item,
        resolvedContentId: resolvedId,
        season: season,
        episode: episode,
        preferredQuality: auth.user?.preferredQuality ?? '1080',
      );

      if (!mounted) return;
      if (options.isEmpty) {
        setState(() => _actionNotice =
            'No direct downloadable video file is available from this provider. Use Watch Now to stream instead.');
        return;
      }

      DownloadQualityOption? chosen;
      if (options.length == 1) {
        chosen = options.first;
      } else {
        chosen = await showModalBottomSheet<DownloadQualityOption>(
          context: context,
          backgroundColor: t.surface,
          builder: (ctx) => SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: Text(
                    'Select Download Quality',
                    style: t.headingFont(TextStyle(fontSize: 20, color: t.text)),
                  ),
                ),
                ...options.map(
                  (opt) => ListTile(
                    leading: Icon(Icons.high_quality_outlined, color: t.accent),
                    title: Text(
                      '${opt.quality} (${(opt.format ?? 'mp4').toUpperCase()})',
                      style: TextStyle(color: t.text, fontWeight: FontWeight.w600),
                    ),
                    subtitle: opt.sizeBytes != null
                        ? Text(formatBytes(opt.sizeBytes!),
                            style: TextStyle(color: t.mutedText, fontSize: 12))
                        : null,
                    trailing: Icon(Icons.download_rounded, color: t.accent),
                    onTap: () => Navigator.of(ctx).pop(opt),
                  ),
                ),
              ],
            ),
          ),
        );
      }

      if (chosen == null || !mounted) return;
      final result = await dl.startDownload(
        item: item,
        resolvedContentId: resolvedId,
        option: chosen,
        season: season,
        episode: episode,
        episodeTitle: episodeTitle,
      );

      if (mounted) {
        setState(() => _actionNotice = result.message);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _actionNotice = 'Download check failed: $e');
      }
    } finally {
      if (mounted) setState(() => _resolvingDownload = false);
    }
  }

  Future<void> _launchPlay({int? season, int? episode}) async {
    final d = _detail;
    if (d == null) return;
    setState(() => _actionNotice = null);
    final auth = context.read<AuthProvider>();
    final item = d.item;
    final contentId = item.subjectId ?? item.id;
    final isShowbox = item.source == 'showbox';

    final seasonGroup = d.seasons.where((s) => s.season == (season ?? _selectedSeason)).firstOrNull;
    final playerEpisodes = (seasonGroup?.episodes ?? [])
        .map((ep) => PlayerEpisodeOption(
              id: ep.id,
              season: ep.season,
              episode: ep.episode,
              title: ep.title,
              thumbnail: ep.thumbnail,
              duration: ep.duration,
            ))
        .toList();

    if (isShowbox) {
      try {
        final sources = await auth.apiClient.get(
          '/api/fx/proxy/sources/${Uri.encodeComponent(item.slug)}',
          query: {
            'type': item.type,
            if (item.imdbId != null) 'imdb': item.imdbId,
            if (season != null) 'season': season,
            if (episode != null) 'episode': episode,
          },
        );
        final candidates = StreamResolver.extractCandidates(
          sources,
          apiBaseUrl: auth.apiClient.baseUrl,
        );
        if (candidates.isEmpty) {
          if (mounted) {
            setState(() => _actionNotice =
                'This Showbox discovery title does not currently have a playable proxy stream source.');
          }
          return;
        }
        final first = candidates.first;
        final isSeries = item.type == 'series' || d.seasons.isNotEmpty;
        final target = ActivePlaybackTarget(
          mode: first.mode,
          title: item.title,
          subtitle: season != null && episode != null ? 'S$season · E$episode' : item.year,
          poster: item.poster,
          provider: 'proxy',
          contentId: contentId,
          slug: item.slug,
          mediaType: isSeries ? 'series' : 'movie',
          season: season,
          episode: episode,
          episodes: playerEpisodes,
          initialUrl: first.url,
          httpHeaders: first.headers,
        );
        if (!mounted) return;
        await Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => VideoPlayerScreen(initialTarget: target)),
        );
      } catch (_) {
        if (mounted) {
          setState(() => _actionNotice =
              'Playback routes support MovieBox titles directly; no active proxy stream was found for this Showbox title.');
        }
      }
      return;
    }

    // Resolve MovieBox numeric subjectId if needed
    final resolvedSubjectId = await _resolveEffectiveSubjectId(item);

    ActivePlaybackTarget buildTargetForEpisode(PlayerEpisodeOption ep) {
      final seNum = ep.season ?? season ?? _selectedSeason;
      return ActivePlaybackTarget(
        mode: PlayerMode.direct,
        title: item.title,
        subtitle: 'S$seNum · E${ep.episode}${ep.title != null ? ' — ${ep.title}' : ''}',
        poster: item.poster,
        provider: 'moviebox',
        contentId: resolvedSubjectId,
        slug: item.slug,
        detailPath: item.detailPath,
        mediaType: 'series',
        season: seNum,
        episode: ep.episode,
        episodes: playerEpisodes,
        availableLanguages: d.languages,
        buildForEpisode: buildTargetForEpisode,
      );
    }

    final isSeries = item.type == 'series' || d.seasons.isNotEmpty;
    final target = (isSeries && episode != null)
        ? buildTargetForEpisode(
            playerEpisodes.firstWhere(
              (e) => e.episode == episode,
              orElse: () => PlayerEpisodeOption(
                season: season ?? _selectedSeason,
                episode: episode,
              ),
            ),
          )
        : ActivePlaybackTarget(
            mode: PlayerMode.direct,
            title: item.title,
            subtitle: item.year != null ? '${item.year} · Feature' : 'Feature Stream',
            poster: item.poster,
            provider: 'moviebox',
            contentId: resolvedSubjectId,
            slug: item.slug,
            detailPath: item.detailPath,
            mediaType: isSeries ? 'series' : 'movie',
            season: isSeries ? (season ?? _selectedSeason) : null,
            episode: isSeries ? (episode ?? 1) : null,
            episodes: playerEpisodes,
            availableLanguages: d.languages,
            buildForEpisode: isSeries ? buildTargetForEpisode : null,
          );

    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => VideoPlayerScreen(initialTarget: target)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);
    final item = _detail?.item ?? widget.item;
    final inWatchlist = auth.isInLibrary(item.subjectId ?? item.id, 'watchlist');
    final inFavorite = auth.isInLibrary(item.subjectId ?? item.id, 'favorite');

    final seasonGroup =
        _detail?.seasons.where((s) => s.season == _selectedSeason).firstOrNull;

    return Scaffold(
      backgroundColor: t.background,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            backgroundColor: t.background,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  if (item.backdrop != null || item.poster != null)
                    CachedNetworkImage(
                      imageUrl: item.backdrop ?? item.poster!,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => Image.asset(
                        AppConfig.assetCinemaHero,
                        fit: BoxFit.cover,
                      ),
                    )
                  else
                    Image.asset(AppConfig.assetCinemaHero, fit: BoxFit.cover),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withOpacity(0.35),
                          t.background,
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 36),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                Text(
                  item.title,
                  style: t.headingFont(TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w700,
                    color: t.text,
                  )),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 10,
                  runSpacing: 6,
                  children: [
                    if (item.year != null)
                      Text(item.year!, style: TextStyle(color: t.mutedText, fontSize: 13)),
                    if (item.rating != null)
                      Text('★ ${item.rating}',
                          style: TextStyle(color: t.accent, fontWeight: FontWeight.w700)),
                    if (item.duration != null)
                      Text(item.duration!, style: TextStyle(color: t.mutedText, fontSize: 13)),
                    Text(
                      item.type.toUpperCase(),
                      style: TextStyle(
                        color: t.accent,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                if (item.genres.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: item.genres
                        .take(5)
                        .map((g) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: t.surface,
                                borderRadius: BorderRadius.circular(t.buttonRadius),
                                border: Border.all(color: t.border),
                              ),
                              child: Text(g, style: TextStyle(fontSize: 11.5, color: t.text)),
                            ))
                        .toList(),
                  ),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 46,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            final firstEp = seasonGroup?.episodes.firstOrNull;
                            _launchPlay(
                              season: firstEp?.season ?? _selectedSeason,
                              episode: firstEp?.episode,
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: t.accent,
                            foregroundColor: t.onAccent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(t.buttonRadius),
                            ),
                          ),
                          icon: const Icon(Icons.play_arrow_rounded),
                          label: Text(
                            (_detail?.seasons.isNotEmpty ?? false) ? 'Play Episode 1' : 'Watch Now',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.outlined(
                      tooltip: 'Download for Offline Playback',
                      onPressed: _resolvingDownload
                          ? null
                          : () {
                              final firstEp = seasonGroup?.episodes.firstOrNull;
                              _handleDownload(
                                season: firstEp?.season ??
                                    ((_detail?.seasons.isNotEmpty ?? false) ? _selectedSeason : 0),
                                episode: firstEp?.episode ?? 0,
                                episodeTitle: firstEp?.title,
                              );
                            },
                      icon: _resolvingDownload
                          ? SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: t.accent),
                            )
                          : Icon(Icons.download_rounded, color: t.accent),
                    ),
                    IconButton.outlined(
                      tooltip: inWatchlist ? 'In Watchlist' : 'Add to Watchlist',
                      onPressed: () => auth.toggleLibraryItem(LibraryEntry(
                        listType: 'watchlist',
                        mediaType: item.type,
                        itemId: item.subjectId ?? item.id,
                        slug: item.slug,
                        provider: item.source,
                        title: item.title,
                        poster: item.poster,
                        year: item.year,
                      )),
                      icon: Icon(
                        inWatchlist ? Icons.bookmark : Icons.bookmark_border,
                        color: inWatchlist ? t.accent : t.text,
                      ),
                    ),
                    IconButton.outlined(
                      tooltip: inFavorite ? 'Favorited' : 'Add to Favorites',
                      onPressed: () => auth.toggleLibraryItem(LibraryEntry(
                        listType: 'favorite',
                        mediaType: item.type,
                        itemId: item.subjectId ?? item.id,
                        slug: item.slug,
                        provider: item.source,
                        title: item.title,
                        poster: item.poster,
                        year: item.year,
                      )),
                      icon: Icon(
                        inFavorite ? Icons.favorite : Icons.favorite_border,
                        color: inFavorite ? Colors.pinkAccent : t.text,
                      ),
                    ),
                  ],
                ),
                if (_actionNotice != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: t.surface,
                      borderRadius: BorderRadius.circular(t.cardRadius),
                      border: Border.all(color: Colors.amber.withOpacity(0.5)),
                    ),
                    child: Text(
                      _actionNotice!,
                      style: TextStyle(color: t.text, fontSize: 12.5),
                    ),
                  ),
                ],
                if (item.description != null && item.description!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(
                    item.description!,
                    style: TextStyle(color: t.text.withOpacity(0.9), height: 1.55, fontSize: 14),
                  ),
                ],
                if (_loading) ...[
                  const SizedBox(height: 24),
                  Center(child: CircularProgressIndicator(color: t.accent)),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  ApiErrorBanner(error: _error!, theme: t, onRetry: _loadDetail),
                ],
                if ((_detail?.seasons.isNotEmpty ?? false)) ...[
                  const SizedBox(height: 22),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Seasons & Episodes',
                        style: t.headingFont(TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: t.text,
                        )),
                      ),
                      DropdownButton<int>(
                        value: _selectedSeason,
                        dropdownColor: t.surface,
                        items: _detail!.seasons
                            .map((s) => DropdownMenuItem(
                                  value: s.season,
                                  child: Text('Season ${s.season}', style: TextStyle(color: t.text)),
                                ))
                            .toList(),
                        onChanged: (v) {
                          if (v != null) setState(() => _selectedSeason = v);
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (seasonGroup != null)
                    ...seasonGroup.episodes.map((ep) {
                      final prog = auth.getWatchProgress(
                        item.subjectId ?? item.id,
                        season: ep.season,
                        episode: ep.episode,
                      );
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: t.surface,
                          borderRadius: BorderRadius.circular(t.cardRadius),
                          border: Border.all(color: t.border),
                        ),
                        child: ListTile(
                          onTap: () => _launchPlay(season: ep.season, episode: ep.episode),
                          leading: Container(
                            width: 72,
                            height: 44,
                            decoration: BoxDecoration(
                              color: t.elevatedSurface,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: ep.thumbnail != null
                                ? CachedNetworkImage(imageUrl: ep.thumbnail!, fit: BoxFit.cover)
                                : Icon(Icons.play_circle_outline, color: t.accent),
                          ),
                          title: Text(
                            'E${ep.episode} · ${ep.title}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: t.text,
                              fontWeight: FontWeight.w600,
                              fontSize: 13.5,
                            ),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (ep.description != null)
                                Text(
                                  ep.description!,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: t.mutedText, fontSize: 11.5),
                                ),
                              if (prog != null && prog.percent > 0)
                                Padding(
                                  padding: const EdgeInsets.only(top: 5),
                                  child: LinearProgressIndicator(
                                    value: prog.percent,
                                    minHeight: 3,
                                    color: t.accent,
                                    backgroundColor: t.border,
                                  ),
                                ),
                            ],
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                tooltip: 'Download Episode',
                                icon: Icon(Icons.download_outlined, color: t.mutedText, size: 20),
                                onPressed: () => _handleDownload(
                                  season: ep.season,
                                  episode: ep.episode,
                                  episodeTitle: ep.title,
                                ),
                              ),
                              Icon(Icons.play_arrow_rounded, color: t.accent),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
                if ((_detail?.cast.isNotEmpty ?? false)) ...[
                  const SizedBox(height: 22),
                  Text(
                    'Cast',
                    style: t.headingFont(TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: t.text,
                    )),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 82,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _detail!.cast.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (_, idx) {
                        final c = _detail!.cast[idx];
                        return Container(
                          width: 150,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: t.surface,
                            borderRadius: BorderRadius.circular(t.cardRadius),
                            border: Border.all(color: t.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                c.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: t.text,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12.5,
                                ),
                              ),
                              if (c.role != null)
                                Text(
                                  c.role!,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: t.mutedText, fontSize: 11),
                                ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ],
                if ((_detail?.related.isNotEmpty ?? false)) ...[
                  const SizedBox(height: 22),
                  Text(
                    'More Like This',
                    style: t.headingFont(TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: t.text,
                    )),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 245,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _detail!.related.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (_, idx) {
                        final rel = _detail!.related[idx];
                        return EditionMediaCard(
                          item: rel,
                          theme: t,
                          width: 130,
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => TitleDetailScreen(item: rel)),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ]),
            ),
          ),
        ],
      ),
    );
  }
}
