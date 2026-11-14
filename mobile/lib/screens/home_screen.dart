import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../providers/catalog_provider.dart';
import '../screens/detail_screen.dart';
import '../theme/edition_themes.dart';
import '../widgets/api_error_banner.dart';
import '../widgets/edition_media_card.dart';

class HomeScreen extends StatelessWidget {
  final ValueChanged<AppSection> onNavigateSection;

  const HomeScreen({super.key, required this.onNavigateSection});

  void _openDetail(BuildContext context, MediaItem item) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TitleDetailScreen(item: item)),
    );
  }

  Widget _heroImage(MediaItem? hero) {
    final url = hero?.backdrop ?? hero?.poster;
    if (url != null && url.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: url,
        fit: BoxFit.cover,
        errorWidget: (_, __, ___) => Image.asset(AppConfig.assetCinemaHero, fit: BoxFit.cover),
      );
    }
    return Image.asset(AppConfig.assetCinemaHero, fit: BoxFit.cover);
  }

  Widget _buildHeroForEdition(
    BuildContext context,
    EditionVisualTheme t,
    MediaItem? hero,
  ) {
    switch (t.mode) {
      case LayoutMode.editorial:
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 18),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: t.surface,
            border: Border.all(color: t.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'FRONT PAGE FEATURE · VOL. IV',
                style: TextStyle(
                  fontSize: 10.5,
                  letterSpacing: 1.8,
                  fontWeight: FontWeight.w700,
                  color: t.accent,
                ),
              ),
              const SizedBox(height: 10),
              AspectRatio(
                aspectRatio: 16 / 9,
                child: _heroImage(hero),
              ),
              const SizedBox(height: 12),
              Text(
                hero?.title ?? 'LUPIN MOVIES Curated Cinema',
                style: t.headingFont(TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: t.text,
                  height: 1.1,
                )),
              ),
              if (hero?.description != null) ...[
                const SizedBox(height: 6),
                Text(
                  hero!.description!,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: t.mutedText, fontSize: 13.5, height: 1.5),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  ElevatedButton(
                    onPressed: hero != null ? () => _openDetail(context, hero) : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: t.accent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(t.buttonRadius),
                      ),
                    ),
                    child: const Text('Read Feature & Watch'),
                  ),
                  const SizedBox(width: 10),
                  OutlinedButton(
                    onPressed: () => onNavigateSection(AppSection.discover),
                    child: Text('Full Archive', style: TextStyle(color: t.text)),
                  ),
                ],
              ),
            ],
          ),
        );

      case LayoutMode.minimalist:
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'SELECTED FEATURE',
                style: TextStyle(
                  fontSize: 11,
                  letterSpacing: 1.4,
                  fontWeight: FontWeight.w600,
                  color: t.mutedText,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                hero?.title ?? 'LUPIN MOVIES',
                style: t.headingFont(TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w700,
                  color: t.text,
                  height: 1.12,
                )),
              ),
              const SizedBox(height: 14),
              ClipRRect(
                borderRadius: BorderRadius.circular(t.cardRadius),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: _heroImage(hero),
                ),
              ),
              const SizedBox(height: 14),
              if (hero?.description != null)
                Text(
                  hero!.description!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: t.mutedText, fontSize: 13.5, height: 1.5),
                ),
              const SizedBox(height: 12),
              Row(
                children: [
                  ElevatedButton(
                    onPressed: hero != null ? () => _openDetail(context, hero) : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: t.accent,
                      foregroundColor: t.onAccent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(t.buttonRadius),
                      ),
                    ),
                    child: const Text('Open Title'),
                  ),
                  const SizedBox(width: 10),
                  TextButton(
                    onPressed: () => onNavigateSection(AppSection.discover),
                    child: Text('Browse Catalog →', style: TextStyle(color: t.text)),
                  ),
                ],
              ),
            ],
          ),
        );

      case LayoutMode.sidebar:
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 18),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: t.surface,
            borderRadius: BorderRadius.circular(t.cardRadius),
            border: Border.all(color: t.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: t.accent.withOpacity(0.14),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'FRAMEX LIVE STREAM INDEX',
                      style: TextStyle(
                        color: t.accent,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const Spacer(),
                  if (hero?.year != null)
                    Text(hero!.year!, style: TextStyle(color: t.mutedText, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: AspectRatio(aspectRatio: 16 / 9, child: _heroImage(hero)),
              ),
              const SizedBox(height: 12),
              Text(
                hero?.title ?? 'LUPIN MOVIES Workspace',
                style: t.headingFont(TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: t.text,
                )),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ElevatedButton.icon(
                    onPressed: hero != null ? () => _openDetail(context, hero) : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: t.accent,
                      foregroundColor: t.onAccent,
                    ),
                    icon: const Icon(Icons.play_arrow_rounded, size: 18),
                    label: const Text('Inspect & Stream'),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => onNavigateSection(AppSection.anime),
                    icon: const Icon(Icons.auto_awesome, size: 16),
                    label: const Text('Anime Center'),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => onNavigateSection(AppSection.liveSports),
                    icon: const Icon(Icons.live_tv, size: 16),
                    label: const Text('Live & Sports'),
                  ),
                ],
              ),
            ],
          ),
        );

      case LayoutMode.neon:
      case LayoutMode.classic:
      case LayoutMode.cinematic:
        final isNeon = t.mode == LayoutMode.neon;
        final isClassic = t.mode == LayoutMode.classic;
        return Container(
          margin: EdgeInsets.all(isNeon || isClassic ? 14 : 0),
          height: 360,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(isNeon ? 16 : isClassic ? 20 : 0),
            border: isNeon
                ? Border.all(color: t.accent.withOpacity(0.7), width: 1.5)
                : isClassic
                    ? Border.all(color: t.border)
                    : null,
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              _heroImage(hero),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.25),
                      t.background.withOpacity(0.65),
                      t.background,
                    ],
                    stops: const [0.0, 0.55, 1.0],
                  ),
                ),
              ),
              Positioned(
                left: 18,
                right: 18,
                bottom: 18,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: t.accent,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        isNeon
                            ? 'CYBER PREMIERE'
                            : isClassic
                                ? 'SALON PREMIERE'
                                : 'TRENDING NOW',
                        style: TextStyle(
                          color: t.onAccent,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      hero?.title ?? 'LUPIN MOVIES',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: t.headingFont(TextStyle(
                        fontSize: t.mode == LayoutMode.cinematic ? 36 : 30,
                        fontWeight: FontWeight.w700,
                        color: t.text,
                        height: 1.05,
                      )),
                    ),
                    if (hero?.description != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        hero!.description!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: t.mutedText, fontSize: 12.5),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        ElevatedButton.icon(
                          onPressed: hero != null ? () => _openDetail(context, hero) : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: t.accent,
                            foregroundColor: t.onAccent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(t.buttonRadius),
                            ),
                          ),
                          icon: const Icon(Icons.play_arrow_rounded),
                          label: const Text('Play Feature',
                              style: TextStyle(fontWeight: FontWeight.w700)),
                        ),
                        const SizedBox(width: 10),
                        OutlinedButton(
                          onPressed: () => onNavigateSection(AppSection.discover),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: t.text,
                            side: BorderSide(color: t.border),
                          ),
                          child: const Text('Discover All'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
    }
  }

  Widget _buildRail(
    BuildContext context,
    EditionVisualTheme t,
    String title,
    List<MediaItem> items, {
    bool ranked = false,
  }) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: t.headingFont(TextStyle(
                  fontSize: t.mode == LayoutMode.cinematic ? 23 : 20,
                  fontWeight: FontWeight.w700,
                  color: t.text,
                )),
              ),
              TextButton(
                onPressed: () => onNavigateSection(AppSection.discover),
                child: Text('Explore →', style: TextStyle(color: t.accent, fontSize: 12.5)),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 248,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: items.length.clamp(0, 18),
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (_, idx) => EditionMediaCard(
              item: items[idx],
              theme: t,
              rankIndex: ranked ? idx : null,
              onTap: () => _openDetail(context, items[idx]),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final catalog = context.watch<CatalogProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);
    final hero = catalog.trending.firstOrNull ?? catalog.popularMovies.firstOrNull;

    return RefreshIndicator(
      color: t.accent,
      onRefresh: catalog.loadAll,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 28),
        children: [
          _buildHeroForEdition(context, t, hero),
          if (catalog.error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: ApiErrorBanner(
                error: catalog.error!,
                theme: t,
                onRetry: catalog.loadAll,
              ),
            ),
          // Continue Watching rail when user has saved watch progress
          if (auth.watchProgress.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
              child: Text(
                'Continue Watching',
                style: t.headingFont(TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: t.text,
                )),
              ),
            ),
            SizedBox(
              height: 112,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: auth.watchProgress.take(10).length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (_, idx) {
                  final wp = auth.watchProgress[idx];
                  return InkWell(
                    onTap: () => _openDetail(
                      context,
                      MediaItem(
                        id: wp.contentId,
                        subjectId: wp.contentId,
                        slug: wp.slug,
                        title: wp.title,
                        poster: wp.poster,
                        genres: const [],
                        type: wp.mediaType,
                        source: wp.provider,
                        raw: const {},
                      ),
                    ),
                    borderRadius: BorderRadius.circular(t.cardRadius),
                    child: Container(
                      width: 220,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: t.surface,
                        borderRadius: BorderRadius.circular(t.cardRadius),
                        border: Border.all(color: t.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            wp.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: t.text,
                              fontWeight: FontWeight.w600,
                              fontSize: 13.5,
                            ),
                          ),
                          Text(
                            wp.episode > 0
                                ? 'S${wp.season} · E${wp.episode} · ${formatTimecode(wp.positionSeconds)}'
                                : 'Paused at ${formatTimecode(wp.positionSeconds)}',
                            style: TextStyle(color: t.mutedText, fontSize: 11.5),
                          ),
                          LinearProgressIndicator(
                            value: wp.percent,
                            minHeight: 4,
                            color: t.accent,
                            backgroundColor: t.border,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
          if (catalog.loading && catalog.trending.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 48),
              child: Center(child: CircularProgressIndicator(color: t.accent)),
            )
          else ...[
            _buildRail(context, t, 'Trending Worldwide', catalog.trending, ranked: true),
            _buildRail(context, t, 'Popular Movies', catalog.popularMovies),
            _buildRail(context, t, 'Popular Series', catalog.popularSeries),
            _buildRail(context, t, 'Recently Added', catalog.latestMovies),
            _buildRail(context, t, 'Coming Soon', catalog.upcoming),
            ...catalog.genreCollections
                .map((col) => _buildRail(context, t, col.label, col.items)),
          ],
          // Quick portal shortcuts to Anime, Live TV/Sports, Novels & Support
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  label: const Text('Anime Center'),
                  onPressed: () => onNavigateSection(AppSection.anime),
                ),
                ActionChip(
                  label: const Text('Live TV & Sports'),
                  onPressed: () => onNavigateSection(AppSection.liveSports),
                ),
                ActionChip(
                  label: const Text('Novel Library'),
                  onPressed: () => onNavigateSection(AppSection.novels),
                ),
                ActionChip(
                  label: const Text('Support Center'),
                  onPressed: () => onNavigateSection(AppSection.support),
                ),
                ActionChip(
                  label: const Text('About Creator'),
                  onPressed: () => onNavigateSection(AppSection.about),
                ),
                ActionChip(
                  label: const Text('Contact Us'),
                  onPressed: () => onNavigateSection(AppSection.contact),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
