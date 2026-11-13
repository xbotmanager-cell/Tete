import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Search,
} from 'lucide-react';
import { apiFetch, buildQuery } from '../lib/api';
import { extractArray, FALLBACK_ART } from '../lib/mediaUtils';
import { useAuth } from '../context/AuthContext';
import { DomainNoticeBanner } from '../components/DomainNoticeBanner';

interface NovelItem {
  id: string;
  title: string;
  author?: string;
  cover?: string | null;
  description?: string;
  category?: string;
}

interface ChapterItem {
  id: string;
  title: string;
  order?: number;
}

export function NovelsPage() {
  const { saveReadingProgress, readingProgress, layoutMode } = useAuth();
  const isSidebar = layoutMode === 'sidebar';
  const isCinematic = layoutMode === 'cinematic';

  const panelClass = isSidebar
    ? 'rounded-lg border border-zinc-800 bg-[#0c0c0f]'
    : isCinematic
      ? 'rounded-lg bg-[#141414] border border-white/10'
      : 'glass-surface rounded-3xl';

  const elevatedClass = isSidebar
    ? 'rounded-lg border border-zinc-800 bg-[#0c0c0f]'
    : isCinematic
      ? 'rounded-lg bg-[#141414] border border-white/10'
      : 'glass-surface-elevated rounded-3xl';

  const primaryBtn = isSidebar
    ? 'bg-white text-black hover:bg-cyan-300 font-semibold rounded-md'
    : isCinematic
      ? 'bg-[#e50914] hover:bg-[#f40612] text-white font-bold rounded'
      : 'glass-btn-primary text-white font-semibold rounded-xl';

  const secondaryBtn = isSidebar
    ? 'border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 rounded-md'
    : isCinematic
      ? 'border border-neutral-700 bg-[#1c1c1c] text-white hover:border-white rounded'
      : 'glass-btn text-amber-100 rounded-xl';

  const headingClass = isSidebar
    ? 'font-console text-xl sm:text-2xl font-bold text-white'
    : isCinematic
      ? 'font-cinema text-3xl sm:text-5xl uppercase tracking-wide text-white leading-none'
      : 'font-editorial text-3xl sm:text-4xl font-semibold text-amber-50';

  const [section, setSection] = useState<'home' | 'recommendations' | 'ranks' | 'latest' | 'completed'>('home');
  const [query, setQuery] = useState('');
  const [novels, setNovels] = useState<NovelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const [selectedNovel, setSelectedNovel] = useState<NovelItem | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [chapterPage, setChapterPage] = useState(1);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const [activeChapter, setActiveChapter] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);
  const [loadingChapterText, setLoadingChapterText] = useState(false);
  const [fontSize, setFontSize] = useState(18);

  const normalizeNovels = (payload: unknown): NovelItem[] =>
    extractArray(payload)
      .map((n) => ({
        id: String(n.contentId || n.novelId || n.id || ''),
        title: String(n.title || n.name || n.bookName || 'Untitled Novel'),
        author: n.author ? String(n.author) : undefined,
        cover: (n.cover || n.coverUrl || n.poster || n.image || null) as string | null,
        description: (n.description || n.intro || n.synopsis) as string | undefined,
        category: (n.category || n.genreName) as string | undefined,
      }))
      .filter((n) => n.id);

  const loadNovels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/fx/novels/home?page=1&size=24';
      if (query.trim()) {
        url = `/api/fx/novels/search${buildQuery({ q: query.trim(), page: 1, size: 24 })}`;
      } else if (section === 'recommendations') {
        url = '/api/fx/novels/recommendations?page=1&size=24';
      } else if (section === 'ranks') {
        url = '/api/fx/novels/rank-groups?page=1&size=24';
      } else if (section === 'latest') {
        url = '/api/fx/novels/store?opConfId=5&page=1&size=24';
      } else if (section === 'completed') {
        url = '/api/fx/novels/store?opConfId=6&page=1&size=24';
      }

      const res = await apiFetch(url);
      setNovels(normalizeNovels(res));
    } catch (err) {
      setError(err);
      setNovels([]);
    } finally {
      setLoading(false);
    }
  }, [section, query]);

  useEffect(() => {
    void loadNovels();
  }, [section]);

  const openNovel = async (novel: NovelItem, pg = 1) => {
    setSelectedNovel(novel);
    setActiveChapter(null);
    setChapterPage(pg);
    setLoadingChapters(true);
    try {
      const [det, chaps] = await Promise.all([
        apiFetch<Record<string, unknown>>(
          `/api/fx/novels/detail${buildQuery({ contentId: novel.id })}`
        ).catch(() => null),
        apiFetch(
          `/api/fx/novels/chapters${buildQuery({ contentId: novel.id, page: pg, size: 50 })}`
        ),
      ]);
      if (det && (det.description || det.intro)) {
        setSelectedNovel((prev) =>
          prev ? { ...prev, description: String(det.description || det.intro) } : prev
        );
      }
      const list = extractArray(chaps).map((c, idx) => ({
        id: String(c.chapterId || c.id || ''),
        title: String(c.title || c.name || `Chapter ${(pg - 1) * 50 + idx + 1}`),
        order: Number(c.order ?? idx + 1),
      }));
      setChapters(list.filter((c) => c.id));
    } catch (err) {
      setError(err);
    } finally {
      setLoadingChapters(false);
    }
  };

  const openChapter = async (chap: ChapterItem) => {
    if (!selectedNovel) return;
    setLoadingChapterText(true);
    try {
      const res = await apiFetch<Record<string, unknown>>(
        `/api/fx/novels/chapter${buildQuery({ chapterId: chap.id })}`
      );
      const text = String(
        res.content || res.text || res.body || (res.data as Record<string, unknown>)?.content || ''
      );
      setActiveChapter({
        id: chap.id,
        title: String(res.title || chap.title),
        content: text || 'Chapter content could not be retrieved from NovelHub.',
      });
      const idx = chapters.findIndex((c) => c.id === chap.id);
      const pct = chapters.length > 0 ? Math.round(((idx + 1) / chapters.length) * 100) : 10;
      void saveReadingProgress({
        novel_id: selectedNovel.id,
        novel_title: selectedNovel.title,
        cover: selectedNovel.cover || null,
        chapter_id: chap.id,
        chapter_title: chap.title,
        progress_percent: pct,
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoadingChapterText(false);
    }
  };

  // Distraction-Free Reader View
  if (activeChapter && selectedNovel) {
    const currentIdx = chapters.findIndex((c) => c.id === activeChapter.id);
    const prevChap = currentIdx > 0 ? chapters[currentIdx - 1] : null;
    const nextChap = currentIdx >= 0 && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className={`${panelClass} p-4 flex flex-wrap items-center justify-between gap-3 sticky top-20 z-30`}>
          <button
            type="button"
            onClick={() => setActiveChapter(null)}
            className={`${secondaryBtn} h-10 px-3.5 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Chapters</span>
          </button>

          <div className="text-center min-w-0 flex-1">
            <p className="text-xs text-zinc-400 truncate">{selectedNovel.title}</p>
            <h2 className="font-display text-sm sm:text-base font-semibold text-white truncate">
              {activeChapter.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Decrease font size"
              onClick={() => setFontSize((s) => Math.max(14, s - 2))}
              className={`${secondaryBtn} w-9 h-9 flex items-center justify-center cursor-pointer`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs text-zinc-300 w-8 text-center">{fontSize}</span>
            <button
              type="button"
              aria-label="Increase font size"
              onClick={() => setFontSize((s) => Math.min(26, s + 2))}
              className={`${secondaryBtn} w-9 h-9 flex items-center justify-center cursor-pointer`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <article className={`${elevatedClass} p-6 sm:p-10`}>
          {loadingChapterText ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-white" />
            </div>
          ) : (
            <div
              style={{ fontSize: `${fontSize}px` }}
              className="text-zinc-100 leading-[1.85] whitespace-pre-wrap font-serif max-w-[68ch] mx-auto"
            >
              {activeChapter.content}
            </div>
          )}
        </article>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={!prevChap}
            onClick={() => prevChap && void openChapter(prevChap)}
            className={`${secondaryBtn} h-11 px-5 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-40 cursor-pointer`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Chapter</span>
          </button>
          <button
            type="button"
            disabled={!nextChap}
            onClick={() => nextChap && void openChapter(nextChap)}
            className={`${primaryBtn} h-11 px-5 text-sm inline-flex items-center gap-2 disabled:opacity-40 cursor-pointer`}
          >
            <span>Next Chapter</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className={`${panelClass} p-5 sm:p-6 space-y-5`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className={headingClass}>Novel Library</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Curated fiction from NovelHub & NovelStore with persistent reading progress.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'home', label: 'Featured' },
              { id: 'recommendations', label: 'Recommended' },
              { id: 'ranks', label: 'Rankings' },
              { id: 'latest', label: 'Latest' },
              { id: 'completed', label: 'Completed' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSection(s.id as typeof section);
                  setQuery('');
                  setSelectedNovel(null);
                }}
                className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap cursor-pointer ${
                  section === s.id ? primaryBtn : secondaryBtn
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void loadNovels();
          }}
          className="flex gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search novels by title or keyword…"
              className="w-full h-11 pl-11 pr-4 rounded-lg bg-black/50 border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/50"
            />
          </div>
          <button
            type="submit"
            className={`${primaryBtn} h-11 px-5 text-sm cursor-pointer`}
          >
            Search
          </button>
        </form>
      </section>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void loadNovels()} />}

      {/* Recent Reading History Strip */}
      {readingProgress.length > 0 && !selectedNovel && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-white">Continue Reading</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {readingProgress.slice(0, 3).map((rp) => (
              <button
                key={rp.novel_id}
                type="button"
                onClick={() =>
                  void openNovel({
                    id: rp.novel_id,
                    title: rp.novel_title,
                    cover: rp.cover,
                  })
                }
                className={`${panelClass} p-3.5 flex items-center gap-3 text-left cursor-pointer hover:border-white/35`}
              >
                <img
                  src={rp.cover || FALLBACK_ART.novelCover}
                  alt={rp.novel_title}
                  referrerPolicy="no-referrer"
                  className="w-12 h-16 object-cover rounded shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold text-white truncate">
                    {rp.novel_title}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">{rp.chapter_title}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Selected Novel Detail + Chapter Directory */}
      {selectedNovel ? (
        <section className={`${elevatedClass} p-5 sm:p-7 space-y-6`}>
          <button
            type="button"
            onClick={() => setSelectedNovel(null)}
            className={`${secondaryBtn} h-9 px-3.5 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Novels</span>
          </button>

          <div className="flex flex-col sm:flex-row gap-6">
            <img
              src={selectedNovel.cover || FALLBACK_ART.novelCover}
              alt={selectedNovel.title}
              referrerPolicy="no-referrer"
              className="w-32 sm:w-40 aspect-[3/4] object-cover rounded-lg border border-white/15 shrink-0"
            />
            <div className="space-y-2.5">
              <p className="text-xs text-zinc-400">
                {[selectedNovel.author, selectedNovel.category].filter(Boolean).join(' · ') || 'NovelHub'}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                {selectedNovel.title}
              </h2>
              {selectedNovel.description && (
                <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl">
                  {selectedNovel.description}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-white">Chapters</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={chapterPage <= 1}
                  onClick={() => void openNovel(selectedNovel, Math.max(1, chapterPage - 1))}
                  className={`${secondaryBtn} h-8 px-3 text-xs disabled:opacity-40 cursor-pointer`}
                >
                  Prev
                </button>
                <span className="font-mono text-xs text-zinc-400">Page {chapterPage}</span>
                <button
                  type="button"
                  disabled={chapters.length < 50}
                  onClick={() => void openNovel(selectedNovel, chapterPage + 1)}
                  className={`${secondaryBtn} h-8 px-3 text-xs disabled:opacity-40 cursor-pointer`}
                >
                  Next
                </button>
              </div>
            </div>

            {loadingChapters ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400 py-6">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Loading chapters…</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {chapters.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => void openChapter(ch)}
                    className={`${secondaryBtn} p-3 text-left flex items-center justify-between gap-2 cursor-pointer`}
                  >
                    <span className="text-xs sm:text-sm font-medium text-white truncate">
                      {ch.title}
                    </span>
                    <BookOpen className="w-4 h-4 text-zinc-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`${panelClass} overflow-hidden animate-pulse`}>
              <div className="aspect-[3/4] bg-zinc-900" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 bg-zinc-800 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {novels.map((novel) => (
            <button
              key={novel.id}
              type="button"
              onClick={() => void openNovel(novel)}
              className={`group ${panelClass} overflow-hidden text-left cursor-pointer transition-transform hover:-translate-y-1`}
            >
              <div className="aspect-[3/4] w-full overflow-hidden bg-black">
                <img
                  src={novel.cover || FALLBACK_ART.novelCover}
                  alt={novel.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 space-y-0.5">
                <h3 className="font-display text-sm font-semibold text-white truncate">
                  {novel.title}
                </h3>
                <p className="text-xs text-zinc-400 truncate">
                  {novel.author || novel.category || 'NovelHub'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
