import 'dart:convert';

enum LayoutMode {
  cinematic('cinematic', 'Cinematic Edition', 'Immersive dark screening room'),
  classic('classic', 'Classic Edition', 'Burgundy & gold editorial salon'),
  sidebar('sidebar', 'Sidebar Edition', 'Monochrome & cyan command console'),
  editorial('editorial', 'Editorial Edition', 'Archival warm paper broadsheet'),
  neon('neon', 'Neon Edition', 'Cyber obsidian with dual neon accents'),
  minimalist('minimalist', 'Minimalist Edition', 'Swiss gallery white space');

  final String key;
  final String label;
  final String tagline;

  const LayoutMode(this.key, this.label, this.tagline);

  static LayoutMode fromKey(String? value) {
    if (value == null) return LayoutMode.cinematic;
    for (final mode in LayoutMode.values) {
      if (mode.key == value.trim().toLowerCase()) {
        return mode;
      }
    }
    return LayoutMode.cinematic;
  }
}

enum AppSection {
  home,
  discover,
  anime,
  liveSports,
  novels,
  library,
  downloads,
  support,
  about,
  contact,
  settings,
}

String? _pickStr(Map<String, dynamic> obj, List<String> keys) {
  for (final k in keys) {
    final v = obj[k];
    if (v is String && v.trim().isNotEmpty) return v.trim();
    if (v is num && !v.isNaN) return v.toString();
  }
  return null;
}

int _pickInt(dynamic value, [int fallback = 0]) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value.trim()) ?? fallback;
  return fallback;
}

double _pickDouble(dynamic value, [double fallback = 0]) {
  if (value is double) return value;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value.trim()) ?? fallback;
  return fallback;
}

List<Map<String, dynamic>> extractArray(dynamic payload) {
  if (payload == null) return [];
  if (payload is List) {
    return payload.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }
  if (payload is! Map) return [];
  final obj = Map<String, dynamic>.from(payload);
  const keys = [
    'results',
    'items',
    'data',
    'list',
    'movies',
    'series',
    'records',
    'channels',
    'countries',
    'events',
    'matches',
    'chapters',
    'novels',
    'episodes',
    'providers',
    'servers',
    'categories',
    'genres',
  ];
  for (final key in keys) {
    final val = obj[key];
    if (val is List) {
      return val.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    }
    if (val is Map) {
      for (final nested in ['items', 'list', 'results']) {
        final sub = val[nested];
        if (sub is List) {
          return sub.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    }
  }
  return [];
}

class MediaItem {
  final String id;
  final String? subjectId;
  final String slug;
  final String? detailPath;
  final String title;
  final String? description;
  final String? overview;
  final String? year;
  final String? releaseDate;
  final String? duration;
  final String? rating;
  final List<String> genres;
  final String? poster;
  final String? backdrop;
  final String type; // 'movie' or 'series'
  final String source; // 'moviebox' or 'showbox'
  final String? imdbId;
  final Map<String, dynamic> raw;

  MediaItem({
    required this.id,
    this.subjectId,
    required this.slug,
    this.detailPath,
    required this.title,
    this.description,
    this.overview,
    this.year,
    this.releaseDate,
    this.duration,
    this.rating,
    required this.genres,
    this.poster,
    this.backdrop,
    required this.type,
    required this.source,
    this.imdbId,
    required this.raw,
  });

  factory MediaItem.fromRaw(
    Map<String, dynamic> raw, {
    String defaultSource = 'moviebox',
  }) {
    final id = _pickStr(raw, ['subjectId', 'contentId', 'id', '_id']) ??
        _pickStr(raw, ['slug', 'detailPath']) ??
        'unknown';
    final slug = _pickStr(raw, ['slug', 'detailPath', 'path']) ?? id;
    final title = _pickStr(raw, ['title', 'name', 'subjectName']) ?? 'Untitled';

    String? poster = _pickStr(raw, ['poster', 'cover', 'image', 'thumbnail', 'posterUrl']);
    if (poster == null && raw['cover'] is Map) {
      poster = _pickStr(Map<String, dynamic>.from(raw['cover'] as Map), ['url', 'src']);
    }

    final backdrop = _pickStr(
          raw,
          ['backdrop', 'banner', 'coverWide', 'stills', 'backdropUrl'],
        ) ??
        poster;

    final rawType = (_pickStr(raw, ['type', 'mediaType', 'subjectType']) ?? 'movie').toLowerCase();
    final type = (rawType.contains('series') || rawType.contains('tv') || rawType == '2')
        ? 'series'
        : 'movie';

    final genresRaw = raw['genres'] ?? raw['genre'] ?? raw['tags'];
    final List<String> genres = [];
    if (genresRaw is List) {
      for (final g in genresRaw) {
        if (g is String && g.trim().isNotEmpty) {
          genres.add(g.trim());
        } else if (g is Map && g['name'] != null) {
          genres.add(g['name'].toString());
        }
      }
    } else if (genresRaw is String) {
      for (final part in genresRaw.split(RegExp(r'[,/]'))) {
        if (part.trim().isNotEmpty) genres.add(part.trim());
      }
    }

    final relDate = _pickStr(raw, ['releaseDate', 'released']);
    final year = _pickStr(raw, ['year', 'releaseYear']) ??
        (relDate != null && relDate.length >= 4 ? relDate.substring(0, 4) : null);

    return MediaItem(
      id: id,
      subjectId: _pickStr(raw, ['subjectId', 'id']),
      slug: slug,
      detailPath: _pickStr(raw, ['detailPath', 'slug']),
      title: title,
      description: _pickStr(raw, ['description', 'synopsis', 'overview', 'plot', 'intro']),
      overview: _pickStr(raw, ['overview', 'description', 'synopsis']),
      year: year,
      releaseDate: relDate,
      duration: _pickStr(raw, ['duration', 'runtime']),
      rating: _pickStr(raw, ['rating', 'imdbRatingValue', 'score', 'voteAverage']),
      genres: genres,
      poster: poster,
      backdrop: backdrop,
      type: type,
      source: (_pickStr(raw, ['source', 'provider']) ?? defaultSource).toLowerCase(),
      imdbId: _pickStr(raw, ['imdbId', 'imdb']),
      raw: raw,
    );
  }
}

class CastMember {
  final String name;
  final String? role;
  final String? avatar;

  CastMember({required this.name, this.role, this.avatar});
}

class SeasonEpisode {
  final int season;
  final int episode;
  final String title;
  final String? id;
  final String? duration;
  final String? thumbnail;
  final String? description;
  final String? airDate;

  SeasonEpisode({
    required this.season,
    required this.episode,
    required this.title,
    this.id,
    this.duration,
    this.thumbnail,
    this.description,
    this.airDate,
  });
}

class SeasonGroup {
  final int season;
  final List<SeasonEpisode> episodes;

  SeasonGroup({required this.season, required this.episodes});
}

class MediaDetail {
  final MediaItem item;
  final List<CastMember> cast;
  final List<SeasonGroup> seasons;
  final List<MediaItem> related;
  final List<String> languages;
  final String? trailerUrl;

  MediaDetail({
    required this.item,
    required this.cast,
    required this.seasons,
    required this.related,
    required this.languages,
    this.trailerUrl,
  });

  factory MediaDetail.fromPayload(dynamic payload, {MediaItem? fallback}) {
    Map<String, dynamic> root = {};
    if (payload is Map) {
      final map = Map<String, dynamic>.from(payload);
      if (map['data'] is Map) {
        root = Map<String, dynamic>.from(map['data'] as Map);
      } else {
        root = map;
      }
    }

    final mergedRaw = <String, dynamic>{...(fallback?.raw ?? {}), ...root};
    final base = MediaItem.fromRaw(
      mergedRaw,
      defaultSource: fallback?.source ?? 'moviebox',
    );

    final rawCast = root['cast'] ?? root['actors'] ?? root['stars'] ?? root['credits'];
    final List<CastMember> cast = [];
    if (rawCast is List) {
      for (final c in rawCast.take(16)) {
        if (c is String) {
          cast.add(CastMember(name: c));
        } else if (c is Map) {
          final co = Map<String, dynamic>.from(c);
          cast.add(
            CastMember(
              name: _pickStr(co, ['name', 'actorName', 'title']) ?? 'Cast Member',
              role: _pickStr(co, ['role', 'character']),
              avatar: _pickStr(co, ['avatar', 'photo', 'image', 'profile']),
            ),
          );
        }
      }
    }

    final Map<int, List<SeasonEpisode>> seasonsMap = {};
    final resourceMap = root['resource'] is Map
        ? Map<String, dynamic>.from(root['resource'] as Map)
        : null;
    final rawSeasons = root['seasons'] ?? root['seasonList'] ?? resourceMap?['seasons'];
    if (rawSeasons is List) {
      for (final s in rawSeasons) {
        if (s is! Map) continue;
        final so = Map<String, dynamic>.from(s);
        final seNum = _pickInt(so['se'] ?? so['season'] ?? so['seasonNumber'], 1);
        final epsRaw = so['episodes'] ?? so['epList'];
        if (epsRaw is List) {
          final List<SeasonEpisode> eps = [];
          for (var idx = 0; idx < epsRaw.length; idx++) {
            final ep = epsRaw[idx];
            if (ep is num) {
              eps.add(
                SeasonEpisode(
                  season: seNum,
                  episode: ep.toInt(),
                  title: 'Episode ${ep.toInt()}',
                ),
              );
            } else if (ep is Map) {
              final eo = Map<String, dynamic>.from(ep);
              final epNum = _pickInt(eo['ep'] ?? eo['episode'] ?? eo['episodeNumber'], idx + 1);
              eps.add(
                SeasonEpisode(
                  season: seNum,
                  episode: epNum,
                  title: _pickStr(eo, ['title', 'name', 'episodeName']) ?? 'Episode $epNum',
                  id: _pickStr(eo, ['id', 'episodeId']),
                  duration: _pickStr(eo, ['duration', 'runtime', 'timeLength']),
                  thumbnail: _pickStr(eo, [
                    'thumbnail',
                    'still',
                    'still_path',
                    'image',
                    'poster',
                    'cover',
                    'img',
                  ]),
                  description: _pickStr(eo, [
                    'description',
                    'overview',
                    'synopsis',
                    'summary',
                    'intro',
                  ]),
                  airDate: _pickStr(eo, ['airDate', 'releaseDate', 'aired']),
                ),
              );
            }
          }
          seasonsMap[seNum] = eps;
        } else if (so['maxEp'] is num && (so['maxEp'] as num) > 0) {
          final maxEp = (so['maxEp'] as num).toInt();
          seasonsMap[seNum] = List.generate(
            maxEp,
            (i) => SeasonEpisode(
              season: seNum,
              episode: i + 1,
              title: 'Episode ${i + 1}',
            ),
          );
        }
      }
    }

    if (seasonsMap.isEmpty && root['episodes'] is List) {
      for (final ep in (root['episodes'] as List).whereType<Map>()) {
        final eo = Map<String, dynamic>.from(ep);
        final seNum = _pickInt(eo['season'] ?? eo['se'], 1);
        final epNum = _pickInt(eo['episode'] ?? eo['ep'] ?? eo['number'], 1);
        seasonsMap.putIfAbsent(seNum, () => []).add(
              SeasonEpisode(
                season: seNum,
                episode: epNum,
                title: _pickStr(eo, ['title', 'name', 'episodeName']) ?? 'Episode $epNum',
                id: _pickStr(eo, ['id', 'episodeId']),
                duration: _pickStr(eo, ['duration', 'runtime', 'timeLength']),
                thumbnail: _pickStr(eo, [
                  'thumbnail',
                  'still',
                  'still_path',
                  'image',
                  'poster',
                  'cover',
                  'img',
                ]),
                description: _pickStr(eo, [
                  'description',
                  'overview',
                  'synopsis',
                  'summary',
                  'intro',
                ]),
                airDate: _pickStr(eo, ['airDate', 'releaseDate', 'aired']),
              ),
            );
      }
    }

    final seasons = seasonsMap.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    final seasonGroups = seasons.map((e) {
      final sortedEps = [...e.value]..sort((a, b) => a.episode.compareTo(b.episode));
      return SeasonGroup(season: e.key, episodes: sortedEps);
    }).toList();

    final relatedRaw = root['related'] ?? root['recommendations'] ?? root['similar'];
    final List<MediaItem> related = [];
    if (relatedRaw is List) {
      for (final r in relatedRaw.whereType<Map>()) {
        related.add(
          MediaItem.fromRaw(
            Map<String, dynamic>.from(r),
            defaultSource: base.source,
          ),
        );
      }
    }

    final rawLangs = root['languages'] ?? root['audioLanguages'] ?? root['langs'] ?? root['dubs'];
    final List<String> languages = [];
    if (rawLangs is List) {
      for (final l in rawLangs) {
        if (l is String && l.trim().isNotEmpty) {
          languages.add(l.trim());
        } else if (l is Map) {
          final code = _pickStr(Map<String, dynamic>.from(l), ['code', 'lang', 'name']);
          if (code != null) languages.add(code);
        }
      }
    }

    return MediaDetail(
      item: base,
      cast: cast,
      seasons: seasonGroups,
      related: related,
      languages: languages,
      trailerUrl: _pickStr(root, ['trailer', 'trailerUrl']),
    );
  }
}

class SubtitleTrack {
  final String? id;
  final String lang;
  final String label;
  final String url;
  final String? format;

  SubtitleTrack({
    this.id,
    required this.lang,
    required this.label,
    required this.url,
    this.format,
  });

  static List<SubtitleTrack> normalizeList(dynamic payload) {
    List<Map<String, dynamic>> rawList = extractArray(payload);
    if (payload is Map) {
      final map = Map<String, dynamic>.from(payload);
      if (map['captions'] is List) {
        rawList = (map['captions'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      } else if (map['subtitles'] is List) {
        rawList = (map['subtitles'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      }
    }

    final List<SubtitleTrack> out = [];
    for (final s in rawList) {
      final url = _pickStr(s, ['url', 'src', 'file', 'vttUrl', 'srtUrl']);
      if (url == null) continue;
      out.add(
        SubtitleTrack(
          id: _pickStr(s, ['id', 'lan']),
          lang: _pickStr(s, ['lang', 'lan', 'language', 'code']) ?? 'en',
          label: _pickStr(s, ['label', 'lanName', 'languageName', 'lang', 'name']) ?? 'Subtitles',
          url: url,
          format: _pickStr(s, ['format', 'ext']),
        ),
      );
    }
    return out;
  }
}

class SubtitleCue {
  final Duration start;
  final Duration end;
  final String text;

  SubtitleCue({required this.start, required this.end, required this.text});
}

enum PlayerMode { direct, hls, embed }

class PlayerEpisodeOption {
  final String? id;
  final int? season;
  final int episode;
  final String? title;
  final String? thumbnail;
  final String? duration;

  PlayerEpisodeOption({
    this.id,
    this.season,
    required this.episode,
    this.title,
    this.thumbnail,
    this.duration,
  });
}

class ActivePlaybackTarget {
  final PlayerMode mode;
  final String title;
  final String? subtitle;
  final String? poster;
  final String provider; // moviebox, showbox, gotaku, animex, channels, tvgarden, wrestling, sports
  final String contentId;
  final String? slug;
  final String? detailPath;
  final String mediaType; // movie, series, anime, live, sports, wrestling
  final int? season;
  final int? episode;
  final List<PlayerEpisodeOption> episodes;
  final List<String> availableLanguages;
  final String? initialUrl;
  final Map<String, String> httpHeaders;
  final String? localFilePath;
  final String? animeType; // sub, dub, hard_sub
  final String? animeProviderId;
  final String? countryCode;
  final ActivePlaybackTarget Function(PlayerEpisodeOption ep)? buildForEpisode;

  ActivePlaybackTarget({
    required this.mode,
    required this.title,
    this.subtitle,
    this.poster,
    required this.provider,
    required this.contentId,
    this.slug,
    this.detailPath,
    required this.mediaType,
    this.season,
    this.episode,
    this.episodes = const [],
    this.availableLanguages = const [],
    this.initialUrl,
    this.httpHeaders = const {},
    this.localFilePath,
    this.animeType,
    this.animeProviderId,
    this.countryCode,
    this.buildForEpisode,
  });

  int get currentEpisodeIndex {
    if (episode == null || episodes.isEmpty) return -1;
    return episodes.indexWhere(
      (e) => e.episode == episode && (season == null || e.season == null || e.season == season),
    );
  }

  PlayerEpisodeOption? get prevEpisode {
    final idx = currentEpisodeIndex;
    if (idx > 0) return episodes[idx - 1];
    return null;
  }

  PlayerEpisodeOption? get nextEpisode {
    final idx = currentEpisodeIndex;
    if (idx >= 0 && idx < episodes.length - 1) return episodes[idx + 1];
    return null;
  }
}

class UserProfile {
  final int id;
  final String email;
  final String name;
  final String preferredQuality;
  final String preferredSubtitleLang;
  final String preferredAudioLang;
  final LayoutMode preferredLayout;
  final String? createdAt;

  UserProfile({
    required this.id,
    required this.email,
    required this.name,
    required this.preferredQuality,
    required this.preferredSubtitleLang,
    required this.preferredAudioLang,
    required this.preferredLayout,
    this.createdAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: _pickInt(json['id']),
      email: (json['email'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      preferredQuality: (json['preferred_quality'] ?? '1080').toString(),
      preferredSubtitleLang: (json['preferred_subtitle_lang'] ?? 'en').toString(),
      preferredAudioLang: (json['preferred_audio_lang'] ?? 'en').toString(),
      preferredLayout: LayoutMode.fromKey(json['preferred_layout']?.toString()),
      createdAt: json['created_at']?.toString(),
    );
  }

  UserProfile copyWith({
    String? name,
    String? preferredQuality,
    String? preferredSubtitleLang,
    String? preferredAudioLang,
    LayoutMode? preferredLayout,
  }) {
    return UserProfile(
      id: id,
      email: email,
      name: name ?? this.name,
      preferredQuality: preferredQuality ?? this.preferredQuality,
      preferredSubtitleLang: preferredSubtitleLang ?? this.preferredSubtitleLang,
      preferredAudioLang: preferredAudioLang ?? this.preferredAudioLang,
      preferredLayout: preferredLayout ?? this.preferredLayout,
      createdAt: createdAt,
    );
  }
}

class LibraryEntry {
  final String listType; // 'watchlist' | 'favorite'
  final String mediaType;
  final String itemId;
  final String slug;
  final String provider;
  final String title;
  final String? poster;
  final String? year;
  final String? createdAt;

  LibraryEntry({
    required this.listType,
    required this.mediaType,
    required this.itemId,
    required this.slug,
    required this.provider,
    required this.title,
    this.poster,
    this.year,
    this.createdAt,
  });

  factory LibraryEntry.fromJson(Map<String, dynamic> json) {
    return LibraryEntry(
      listType: (json['list_type'] ?? 'watchlist').toString(),
      mediaType: (json['media_type'] ?? 'movie').toString(),
      itemId: (json['item_id'] ?? '').toString(),
      slug: (json['slug'] ?? json['item_id'] ?? '').toString(),
      provider: (json['provider'] ?? 'moviebox').toString(),
      title: (json['title'] ?? 'Untitled').toString(),
      poster: json['poster']?.toString(),
      year: json['year']?.toString(),
      createdAt: json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'list_type': listType,
        'media_type': mediaType,
        'item_id': itemId,
        'slug': slug,
        'provider': provider,
        'title': title,
        'poster': poster,
        'year': year,
        'created_at': createdAt,
      };
}

class WatchProgressEntry {
  final String contentId;
  final String slug;
  final String provider;
  final String mediaType;
  final String title;
  final String? poster;
  final int season;
  final int episode;
  final double positionSeconds;
  final double durationSeconds;
  final String? updatedAt;

  WatchProgressEntry({
    required this.contentId,
    required this.slug,
    required this.provider,
    required this.mediaType,
    required this.title,
    this.poster,
    required this.season,
    required this.episode,
    required this.positionSeconds,
    required this.durationSeconds,
    this.updatedAt,
  });

  double get percent => durationSeconds > 0
      ? (positionSeconds / durationSeconds).clamp(0.0, 1.0)
      : (positionSeconds > 5 ? 0.15 : 0.0);

  factory WatchProgressEntry.fromJson(Map<String, dynamic> json) {
    return WatchProgressEntry(
      contentId: (json['content_id'] ?? '').toString(),
      slug: (json['slug'] ?? json['content_id'] ?? '').toString(),
      provider: (json['provider'] ?? 'moviebox').toString(),
      mediaType: (json['media_type'] ?? 'movie').toString(),
      title: (json['title'] ?? 'Untitled').toString(),
      poster: json['poster']?.toString(),
      season: _pickInt(json['season']),
      episode: _pickInt(json['episode']),
      positionSeconds: _pickDouble(json['position_seconds']),
      durationSeconds: _pickDouble(json['duration_seconds']),
      updatedAt: json['updated_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'content_id': contentId,
        'slug': slug,
        'provider': provider,
        'media_type': mediaType,
        'title': title,
        'poster': poster,
        'season': season,
        'episode': episode,
        'position_seconds': positionSeconds,
        'duration_seconds': durationSeconds,
        'updated_at': updatedAt,
      };
}

class ReadingProgressEntry {
  final String novelId;
  final String novelTitle;
  final String? cover;
  final String chapterId;
  final String chapterTitle;
  final int progressPercent;
  final String? updatedAt;

  ReadingProgressEntry({
    required this.novelId,
    required this.novelTitle,
    this.cover,
    required this.chapterId,
    required this.chapterTitle,
    required this.progressPercent,
    this.updatedAt,
  });

  factory ReadingProgressEntry.fromJson(Map<String, dynamic> json) {
    return ReadingProgressEntry(
      novelId: (json['novel_id'] ?? '').toString(),
      novelTitle: (json['novel_title'] ?? 'Untitled Novel').toString(),
      cover: json['cover']?.toString(),
      chapterId: (json['chapter_id'] ?? '').toString(),
      chapterTitle: (json['chapter_title'] ?? 'Chapter').toString(),
      progressPercent: _pickInt(json['progress_percent']),
      updatedAt: json['updated_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'novel_id': novelId,
        'novel_title': novelTitle,
        'cover': cover,
        'chapter_id': chapterId,
        'chapter_title': chapterTitle,
        'progress_percent': progressPercent,
        'updated_at': updatedAt,
      };
}

class NovelItem {
  final String id;
  final String title;
  final String? author;
  final String? cover;
  final String? description;
  final String? category;

  NovelItem({
    required this.id,
    required this.title,
    this.author,
    this.cover,
    this.description,
    this.category,
  });
}

class ChapterItem {
  final String id;
  final String title;
  final int order;

  ChapterItem({required this.id, required this.title, required this.order});
}

String formatTimecode(num seconds) {
  final total = seconds.isFinite && seconds >= 0 ? seconds.floor() : 0;
  final hrs = total ~/ 3600;
  final mins = (total % 3600) ~/ 60;
  final secs = total % 60;
  String pad(int n) => n.toString().padLeft(2, '0');
  if (hrs > 0) return '$hrs:${pad(mins)}:${pad(secs)}';
  return '$mins:${pad(secs)}';
}

String encodeJson(Object value) => jsonEncode(value);
