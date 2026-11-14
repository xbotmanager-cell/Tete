import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../providers/download_provider.dart';
import '../screens/detail_screen.dart';
import '../screens/downloads_screen.dart';
import '../theme/edition_themes.dart';
import '../widgets/auth_sheet.dart';
import '../widgets/edition_media_card.dart';

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key});

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  String _tab = 'continue'; // continue | recent | watchlist | favorite | reading

  void _openItem(BuildContext context, MediaItem item) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TitleDetailScreen(item: item)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final dl = context.watch<DownloadProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);

    final continueList = auth.watchProgress.where((w) {
      if (w.durationSeconds > 0 && w.positionSeconds >= w.durationSeconds - 20) return false;
      return w.positionSeconds > 2;
    }).toList();

    final watchlist = auth.library.where((x) => x.listType == 'watchlist').toList();
    final favorites = auth.library.where((x) => x.listType == 'favorite').toList();

    final width = MediaQuery.of(context).size.width;
    final cols = width >= 900 ? 5 : width >= 600 ? 4 : 3;

    if (_tab == 'downloads') {
      return Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final opt in [
                    ('continue', 'Continue (${continueList.length})'),
                    ('recent', 'Recently Watched (${auth.watchProgress.length})'),
                    ('watchlist', 'Watchlist (${watchlist.length})'),
                    ('favorite', 'Favorites (${favorites.length})'),
                    ('reading', 'Reading (${auth.readingProgress.length})'),
                    ('downloads', 'Downloads (${dl.records.length})'),
                  ])
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(opt.$2, style: const TextStyle(fontSize: 12)),
                        selected: _tab == opt.$1,
                        selectedColor: t.accent,
                        onSelected: (_) => setState(() => _tab = opt.$1),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const Expanded(child: DownloadsScreen()),
        ],
      );
    }

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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('My Library',
                      style: t.headingFont(TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: t.text,
                      ))),
                  if (auth.user == null)
                    TextButton(
                      onPressed: () => showAuthModalSheet(context),
                      child: Text('Sign in to Sync', style: TextStyle(color: t.accent)),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final opt in [
                      ('continue', 'Continue (${continueList.length})'),
                      ('recent', 'Recently Watched (${auth.watchProgress.length})'),
                      ('watchlist', 'Watchlist (${watchlist.length})'),
                      ('favorite', 'Favorites (${favorites.length})'),
                      ('reading', 'Reading (${auth.readingProgress.length})'),
                      ('downloads', 'Downloads (${dl.records.length})'),
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(opt.$2, style: const TextStyle(fontSize: 12)),
                          selected: _tab == opt.$1,
                          selectedColor: t.accent,
                          onSelected: (_) => setState(() => _tab = opt.$1),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (_tab == 'continue' || _tab == 'recent') ...[
          finalEntries(
            context,
            t,
            _tab == 'continue' ? continueList : auth.watchProgress,
            emptyMessage: _tab == 'continue'
                ? 'Start watching any movie, series, or anime to resume here.'
                : 'No recently watched titles recorded yet.',
          ),
        ] else if (_tab == 'watchlist' || _tab == 'favorite') ...[
          (() {
            final list = _tab == 'watchlist' ? watchlist : favorites;
            if (list.isEmpty) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 40),
                child: Center(
                  child: Text(
                    _tab == 'watchlist'
                        ? 'Your watchlist is empty.'
                        : 'No favorite titles saved yet.',
                    style: TextStyle(color: t.mutedText),
                  ),
                ),
              );
            }
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: cols,
                crossAxisSpacing: 10,
                mainAxisSpacing: 14,
                childAspectRatio: 0.54,
              ),
              itemCount: list.length,
              itemBuilder: (_, idx) {
                final entry = list[idx];
                final item = MediaItem(
                  id: entry.itemId,
                  subjectId: entry.itemId,
                  slug: entry.slug,
                  title: entry.title,
                  poster: entry.poster,
                  year: entry.year,
                  genres: const [],
                  type: entry.mediaType,
                  source: entry.provider,
                  raw: const {},
                );
                return EditionMediaCard(
                  item: item,
                  theme: t,
                  onTap: () => _openItem(context, item),
                );
              },
            );
          })(),
        ] else ...[
          if (auth.readingProgress.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Center(
                child: Text('No novel reading history yet.', style: TextStyle(color: t.mutedText)),
              ),
            )
          else
            ...auth.readingProgress.map((rp) => Card(
                  color: t.surface,
                  child: ListTile(
                    leading: Icon(Icons.auto_stories, color: t.accent),
                    title: Text(rp.novelTitle, style: TextStyle(color: t.text)),
                    subtitle: Text('${rp.chapterTitle} · ${rp.progressPercent}% read',
                        style: TextStyle(color: t.mutedText, fontSize: 12)),
                  ),
                )),
        ],
      ],
    );
  }

  Widget finalEntries(
    BuildContext context,
    EditionVisualTheme t,
    List<WatchProgressEntry> entries, {
    required String emptyMessage,
  }) {
    if (entries.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Center(child: Text(emptyMessage, style: TextStyle(color: t.mutedText))),
      );
    }
    return Column(
      children: entries.map((wp) {
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: t.surface,
            borderRadius: BorderRadius.circular(t.cardRadius),
            border: Border.all(color: t.border),
          ),
          child: ListTile(
            onTap: () => _openItem(
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
            leading: Icon(Icons.play_circle_fill, color: t.accent, size: 32),
            title: Text(wp.title, style: TextStyle(color: t.text, fontWeight: FontWeight.w600)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  wp.episode > 0
                      ? 'S${wp.season} · E${wp.episode} · ${formatTimecode(wp.positionSeconds)}'
                      : 'Position: ${formatTimecode(wp.positionSeconds)}',
                  style: TextStyle(color: t.mutedText, fontSize: 12),
                ),
                const SizedBox(height: 5),
                LinearProgressIndicator(
                  value: wp.percent,
                  minHeight: 3,
                  color: t.accent,
                  backgroundColor: t.border,
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
