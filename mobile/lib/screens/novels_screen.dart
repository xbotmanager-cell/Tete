import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../theme/edition_themes.dart';
import '../widgets/api_error_banner.dart';

class NovelsScreen extends StatefulWidget {
  const NovelsScreen({super.key});

  @override
  State<NovelsScreen> createState() => _NovelsScreenState();
}

class _NovelsScreenState extends State<NovelsScreen> {
  final _searchCtrl = TextEditingController();
  String _section = 'home'; // home | recommendations | ranks | latest | completed
  bool _loading = true;
  Object? _error;
  List<NovelItem> _novels = [];

  NovelItem? _selectedNovel;
  bool _loadingChapters = false;
  int _chapterPage = 1;
  List<ChapterItem> _chapters = [];

  String? _activeChapterId;
  String? _activeChapterTitle;
  String? _activeChapterText;
  bool _loadingChapterText = false;
  double _fontSize = 18;

  @override
  void initState() {
    super.initState();
    _loadNovels();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadNovels() async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final q = _searchCtrl.text.trim();
      dynamic res;
      if (q.isNotEmpty) {
        res = await auth.apiClient.get('/api/fx/novels/search', query: {
          'q': q,
          'page': 1,
          'size': 24,
        });
      } else {
        final path = switch (_section) {
          'recommendations' => '/api/fx/novels/recommendations',
          'ranks' => '/api/fx/novels/rank-groups',
          'latest' => '/api/fx/novels/store',
          'completed' => '/api/fx/novels/store',
          _ => '/api/fx/novels/home',
        };
        res = await auth.apiClient.get(path, query: {
          'page': 1,
          'size': 24,
          if (_section == 'latest') 'opConfId': 5,
          if (_section == 'completed') 'opConfId': 6,
        });
      }

      final items = extractArray(res)
          .map((n) => NovelItem(
                id: (n['contentId'] ?? n['novelId'] ?? n['id'] ?? '').toString(),
                title: (n['title'] ?? n['name'] ?? n['bookName'] ?? 'Untitled Novel').toString(),
                author: n['author']?.toString(),
                cover: (n['cover'] ?? n['coverUrl'] ?? n['poster'] ?? n['image'])?.toString(),
                description: (n['description'] ?? n['intro'] ?? n['synopsis'])?.toString(),
                category: (n['category'] ?? n['genreName'])?.toString(),
              ))
          .where((n) => n.id.isNotEmpty)
          .toList();

      if (mounted) setState(() => _novels = items);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openNovel(NovelItem novel, {int page = 1}) async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _selectedNovel = novel;
      _chapterPage = page;
      _loadingChapters = true;
      _activeChapterId = null;
    });
    try {
      final results = await Future.wait([
        auth.apiClient
            .get('/api/fx/novels/detail', query: {'contentId': novel.id})
            .catchError((_) => null),
        auth.apiClient.get('/api/fx/novels/chapters', query: {
          'contentId': novel.id,
          'page': page,
          'size': 50,
        }),
      ]);
      final det = results[0];
      if (det is Map && (det['description'] != null || det['intro'] != null)) {
        _selectedNovel = NovelItem(
          id: novel.id,
          title: novel.title,
          author: novel.author,
          cover: novel.cover,
          description: (det['description'] ?? det['intro']).toString(),
          category: novel.category,
        );
      }
      final chaps = extractArray(results[1])
          .asMap()
          .entries
          .map((e) => ChapterItem(
                id: (e.value['chapterId'] ?? e.value['id'] ?? '').toString(),
                title: (e.value['title'] ??
                        e.value['name'] ??
                        'Chapter ${(page - 1) * 50 + e.key + 1}')
                    .toString(),
                order: int.tryParse((e.value['order'] ?? '${e.key + 1}').toString()) ??
                    (e.key + 1),
              ))
          .where((c) => c.id.isNotEmpty)
          .toList();

      if (mounted) setState(() => _chapters = chaps);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loadingChapters = false);
    }
  }

  Future<void> _openChapter(ChapterItem chap) async {
    final novel = _selectedNovel;
    if (novel == null) return;
    final auth = context.read<AuthProvider>();
    setState(() {
      _activeChapterId = chap.id;
      _activeChapterTitle = chap.title;
      _loadingChapterText = true;
    });
    try {
      final res = await auth.apiClient.get(
        '/api/fx/novels/chapter',
        query: {'chapterId': chap.id},
      );
      String text = '';
      if (res is Map) {
        text = (res['content'] ??
                res['text'] ??
                res['body'] ??
                (res['data'] is Map ? (res['data'] as Map)['content'] : '') ??
                '')
            .toString();
      }
      if (mounted) {
        setState(() {
          _activeChapterTitle = (res is Map && res['title'] != null)
              ? res['title'].toString()
              : chap.title;
          _activeChapterText =
              text.isNotEmpty ? text : 'Chapter content could not be retrieved from NovelHub.';
        });
      }
      final idx = _chapters.indexWhere((c) => c.id == chap.id);
      final pct = _chapters.isNotEmpty ? (((idx + 1) / _chapters.length) * 100).round() : 10;
      await auth.saveReadingProgress(ReadingProgressEntry(
        novelId: novel.id,
        novelTitle: novel.title,
        cover: novel.cover,
        chapterId: chap.id,
        chapterTitle: chap.title,
        progressPercent: pct,
      ));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loadingChapterText = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);

    if (_activeChapterId != null && _selectedNovel != null) {
      final currentIdx = _chapters.indexWhere((c) => c.id == _activeChapterId);
      final prevChap = currentIdx > 0 ? _chapters[currentIdx - 1] : null;
      final nextChap =
          (currentIdx >= 0 && currentIdx < _chapters.length - 1) ? _chapters[currentIdx + 1] : null;

      return Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: t.surface,
              border: Border(bottom: BorderSide(color: t.border)),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: Icon(Icons.arrow_back, color: t.text),
                  onPressed: () => setState(() => _activeChapterId = null),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_selectedNovel!.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: t.mutedText, fontSize: 11)),
                      Text(_activeChapterTitle ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: t.text, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.remove, color: t.text, size: 18),
                  onPressed: () => setState(() => _fontSize = (_fontSize - 2).clamp(14, 28)),
                ),
                Text('${_fontSize.toInt()}', style: TextStyle(color: t.mutedText, fontSize: 12)),
                IconButton(
                  icon: Icon(Icons.add, color: t.text, size: 18),
                  onPressed: () => setState(() => _fontSize = (_fontSize + 2).clamp(14, 28)),
                ),
              ],
            ),
          ),
          Expanded(
            child: _loadingChapterText
                ? Center(child: CircularProgressIndicator(color: t.accent))
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      _activeChapterText ?? '',
                      style: TextStyle(
                        color: t.text,
                        fontSize: _fontSize,
                        height: 1.75,
                      ),
                    ),
                  ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: t.surface,
              border: Border(top: BorderSide(color: t.border)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                OutlinedButton(
                  onPressed: prevChap != null ? () => _openChapter(prevChap) : null,
                  child: const Text('Previous'),
                ),
                ElevatedButton(
                  onPressed: nextChap != null ? () => _openChapter(nextChap) : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: t.accent,
                    foregroundColor: t.onAccent,
                  ),
                  child: const Text('Next Chapter'),
                ),
              ],
            ),
          ),
        ],
      );
    }

    if (_selectedNovel != null) {
      final n = _selectedNovel!;
      return ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () => setState(() => _selectedNovel = null),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Back to Novels'),
            ),
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 110,
                  height: 150,
                  child: n.cover != null
                      ? CachedNetworkImage(
                          imageUrl: n.cover!,
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) =>
                              Image.asset(AppConfig.assetNovelCover, fit: BoxFit.cover),
                        )
                      : Image.asset(AppConfig.assetNovelCover, fit: BoxFit.cover),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      n.title,
                      style: t.headingFont(TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: t.text,
                      )),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      [n.author, n.category].whereType<String>().join(' · '),
                      style: TextStyle(color: t.accent, fontSize: 12.5),
                    ),
                    if (n.description != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        n.description!,
                        maxLines: 5,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: t.mutedText, fontSize: 12.5, height: 1.45),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Chapters', style: t.headingFont(TextStyle(fontSize: 20, color: t.text))),
              Row(
                children: [
                  TextButton(
                    onPressed:
                        _chapterPage > 1 ? () => _openNovel(n, page: _chapterPage - 1) : null,
                    child: const Text('Prev'),
                  ),
                  Text('P.$_chapterPage', style: TextStyle(color: t.mutedText, fontSize: 12)),
                  TextButton(
                    onPressed: _chapters.length >= 50
                        ? () => _openNovel(n, page: _chapterPage + 1)
                        : null,
                    child: const Text('Next'),
                  ),
                ],
              ),
            ],
          ),
          if (_loadingChapters)
            Center(child: CircularProgressIndicator(color: t.accent))
          else
            ..._chapters.map((c) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: t.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: t.border),
                  ),
                  child: ListTile(
                    onTap: () => _openChapter(c),
                    title: Text(c.title, style: TextStyle(color: t.text, fontSize: 13.5)),
                    trailing: Icon(Icons.menu_book, color: t.accent, size: 18),
                  ),
                )),
        ],
      );
    }

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
              Text('Novel Library',
                  style: t.headingFont(TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: t.text,
                  ))),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final sec in const [
                      ('home', 'Featured'),
                      ('recommendations', 'Recommended'),
                      ('ranks', 'Rankings'),
                      ('latest', 'Latest'),
                      ('completed', 'Completed'),
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text(sec.$2, style: const TextStyle(fontSize: 12)),
                          selected: _section == sec.$1,
                          selectedColor: t.accent,
                          onSelected: (_) {
                            setState(() {
                              _section = sec.$1;
                              _searchCtrl.clear();
                            });
                            _loadNovels();
                          },
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      style: TextStyle(color: t.text, fontSize: 14),
                      onSubmitted: (_) => _loadNovels(),
                      decoration: InputDecoration(
                        hintText: 'Search novels…',
                        prefixIcon: const Icon(Icons.search),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(t.buttonRadius),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _loadNovels,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: t.accent,
                      foregroundColor: t.onAccent,
                      minimumSize: const Size(64, 50),
                    ),
                    child: const Text('Find'),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          ApiErrorBanner(error: _error!, theme: t, onRetry: _loadNovels),
        ],
        if (auth.readingProgress.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text('Continue Reading',
              style: t.headingFont(TextStyle(fontSize: 20, color: t.text))),
          const SizedBox(height: 8),
          ...auth.readingProgress.take(3).map((rp) => Card(
                color: t.surface,
                child: ListTile(
                  onTap: () => _openNovel(NovelItem(
                    id: rp.novelId,
                    title: rp.novelTitle,
                    cover: rp.cover,
                  )),
                  leading: Icon(Icons.auto_stories, color: t.accent),
                  title: Text(rp.novelTitle, style: TextStyle(color: t.text)),
                  subtitle: Text('${rp.chapterTitle} · ${rp.progressPercent}%',
                      style: TextStyle(color: t.mutedText, fontSize: 12)),
                ),
              )),
        ],
        const SizedBox(height: 16),
        if (_loading)
          Center(child: CircularProgressIndicator(color: t.accent))
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
            itemCount: _novels.length,
            itemBuilder: (_, idx) {
              final novel = _novels[idx];
              return InkWell(
                onTap: () => _openNovel(novel),
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
                        child: novel.cover != null
                            ? CachedNetworkImage(
                                imageUrl: novel.cover!,
                                fit: BoxFit.cover,
                                width: double.infinity,
                                errorWidget: (_, __, ___) => Image.asset(
                                  AppConfig.assetNovelCover,
                                  fit: BoxFit.cover,
                                  width: double.infinity,
                                ),
                              )
                            : Image.asset(
                                AppConfig.assetNovelCover,
                                fit: BoxFit.cover,
                                width: double.infinity,
                              ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(7),
                        child: Text(
                          novel.title,
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
