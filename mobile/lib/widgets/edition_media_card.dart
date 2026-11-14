import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../config/app_config.dart';
import '../models/framex_models.dart';
import '../theme/edition_themes.dart';

class EditionMediaCard extends StatelessWidget {
  final MediaItem item;
  final EditionVisualTheme theme;
  final VoidCallback onTap;
  final double? width;
  final int? rankIndex;

  const EditionMediaCard({
    super.key,
    required this.item,
    required this.theme,
    required this.onTap,
    this.width,
    this.rankIndex,
  });

  Widget _posterImage() {
    final url = item.poster;
    if (url != null && url.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: url,
        fit: BoxFit.cover,
        placeholder: (_, __) => Container(color: theme.elevatedSurface),
        errorWidget: (_, __, ___) => Image.asset(
          AppConfig.assetCinemaHero,
          fit: BoxFit.cover,
        ),
      );
    }
    return Image.asset(AppConfig.assetCinemaHero, fit: BoxFit.cover);
  }

  @override
  Widget build(BuildContext context) {
    final w = width ?? 138;
    switch (theme.mode) {
      case LayoutMode.editorial:
        return SizedBox(
          width: w,
          child: InkWell(
            onTap: onTap,
            child: Container(
              decoration: BoxDecoration(
                color: theme.surface,
                border: Border.all(color: theme.border),
                borderRadius: BorderRadius.circular(theme.cardRadius),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AspectRatio(
                    aspectRatio: 2 / 3,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        _posterImage(),
                        if (rankIndex != null)
                          Positioned(
                            top: 6,
                            left: 6,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              color: theme.accent,
                              child: Text(
                                'No. ${rankIndex! + 1}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.type.toUpperCase(),
                          style: TextStyle(
                            fontSize: 9,
                            letterSpacing: 1.2,
                            fontWeight: FontWeight.w700,
                            color: theme.accent,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.headingFont(TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: theme.text,
                          )),
                        ),
                        Text(
                          [item.year, item.rating != null ? '★ ${item.rating}' : null]
                              .whereType<String>()
                              .join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 11, color: theme.mutedText),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );

      case LayoutMode.neon:
        return SizedBox(
          width: w,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(theme.cardRadius),
            child: Container(
              decoration: BoxDecoration(
                color: theme.surface,
                borderRadius: BorderRadius.circular(theme.cardRadius),
                border: Border.all(color: theme.accent.withOpacity(0.5)),
                boxShadow: [
                  BoxShadow(
                    color: theme.accent.withOpacity(0.14),
                    blurRadius: 10,
                    spreadRadius: 0,
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AspectRatio(
                    aspectRatio: 2 / 3,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        _posterImage(),
                        Positioned(
                          right: 6,
                          top: 6,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.75),
                              border: Border.all(color: theme.secondaryAccent),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              item.type == 'series' ? 'SERIES' : 'HD',
                              style: TextStyle(
                                color: theme.secondaryAccent,
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.headingFont(TextStyle(
                            fontSize: 15,
                            letterSpacing: 0.4,
                            color: theme.text,
                          )),
                        ),
                        Text(
                          [item.year, item.rating].whereType<String>().join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 11, color: theme.accent),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );

      case LayoutMode.minimalist:
        return SizedBox(
          width: w,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(theme.cardRadius),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 2 / 3,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(theme.cardRadius),
                      border: Border.all(color: theme.border),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: _posterImage(),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  item.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: theme.text,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  [item.type == 'series' ? 'Series' : 'Film', item.year]
                      .whereType<String>()
                      .join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, color: theme.mutedText),
                ),
              ],
            ),
          ),
        );

      case LayoutMode.sidebar:
        return SizedBox(
          width: w,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(theme.cardRadius),
            child: Container(
              decoration: BoxDecoration(
                color: theme.surface,
                borderRadius: BorderRadius.circular(theme.cardRadius),
                border: Border.all(color: theme.border),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AspectRatio(aspectRatio: 2 / 3, child: _posterImage()),
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: theme.text,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: theme.accent.withOpacity(0.14),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                item.type.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w600,
                                  color: theme.accent,
                                ),
                              ),
                            ),
                            if (item.year != null) ...[
                              const SizedBox(width: 6),
                              Text(
                                item.year!,
                                style: TextStyle(fontSize: 11, color: theme.mutedText),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );

      case LayoutMode.classic:
        return SizedBox(
          width: w,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(theme.cardRadius),
            child: Container(
              decoration: BoxDecoration(
                color: theme.surface,
                borderRadius: BorderRadius.circular(theme.cardRadius),
                border: Border.all(color: theme.border),
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                children: [
                  AspectRatio(aspectRatio: 2 / 3, child: _posterImage()),
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            theme.background.withOpacity(0.95),
                          ],
                          stops: const [0.45, 1.0],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 10,
                    right: 10,
                    bottom: 10,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.headingFont(TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: theme.text,
                            height: 1.1,
                          )),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          [item.year, item.rating != null ? '★ ${item.rating}' : null]
                              .whereType<String>()
                              .join(' · '),
                          style: TextStyle(fontSize: 11, color: theme.accent),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );

      case LayoutMode.cinematic:
        return SizedBox(
          width: w,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(theme.cardRadius),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 2 / 3,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(theme.cardRadius),
                      color: theme.surface,
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        _posterImage(),
                        if (item.rating != null)
                          Positioned(
                            top: 6,
                            right: 6,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.78),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                '★ ${item.rating}',
                                style: TextStyle(
                                  color: theme.secondaryAccent,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  item.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: theme.text,
                  ),
                ),
                Text(
                  [item.year, item.type == 'series' ? 'Series' : 'Movie']
                      .whereType<String>()
                      .join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, color: theme.mutedText),
                ),
              ],
            ),
          ),
        );
    }
  }
}
