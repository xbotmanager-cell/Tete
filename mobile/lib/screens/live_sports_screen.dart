import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../screens/video_player_screen.dart';
import '../theme/edition_themes.dart';
import '../widgets/api_error_banner.dart';

class LiveSportsScreen extends StatefulWidget {
  const LiveSportsScreen({super.key});

  @override
  State<LiveSportsScreen> createState() => _LiveSportsScreenState();
}

class _LiveSportsScreenState extends State<LiveSportsScreen> {
  String _tab = 'tv'; // 'tv' | 'sports' | 'wrestling'
  Object? _error;

  // Live TV
  bool _loadingTv = false;
  List<Map<String, dynamic>> _citizenChannels = [];
  List<Map<String, dynamic>> _countries = [];
  String _selectedCountry = 'us';
  List<Map<String, dynamic>> _gardenChannels = [];
  String _channelFilter = '';

  // Sports
  bool _loadingSports = false;
  String _sportsSubTab = 'ongoing'; // ongoing | matches | replays | rankings
  List<Map<String, dynamic>> _matches = [];
  List<Map<String, dynamic>> _rankings = [];
  String _leagueId = '17';
  String? _activeMatchId;
  Map<String, dynamic>? _matchDetail;

  // Wrestling
  bool _loadingWrestling = false;
  String _wrestlingCatalog = 'official';
  List<Map<String, dynamic>> _wrestlingEvents = [];
  String? _selectedEventTitle;
  List<Map<String, dynamic>> _wrestlingParts = [];

  @override
  void initState() {
    super.initState();
    _loadTv();
  }

  Future<void> _loadTv() async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _loadingTv = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        auth.apiClient.get('/api/fx/channels').catchError((_) => null),
        auth.apiClient.get('/api/fx/tvgarden/countries'),
      ]);
      final chRes = await auth.apiClient.get(
        '/api/fx/tvgarden/channels',
        query: {'country': _selectedCountry},
      );
      if (mounted) {
        setState(() {
          _citizenChannels = extractArray(results[0]);
          _countries = extractArray(results[1]);
          _gardenChannels = extractArray(chRes);
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loadingTv = false);
    }
  }

  Future<void> _loadGardenCountry(String countryCode) async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _selectedCountry = countryCode;
      _loadingTv = true;
    });
    try {
      final chRes = await auth.apiClient.get(
        '/api/fx/tvgarden/channels',
        query: {'country': countryCode},
      );
      if (mounted) setState(() => _gardenChannels = extractArray(chRes));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loadingTv = false);
    }
  }

  Future<void> _playCitizenChannel(Map<String, dynamic> ch) async {
    final auth = context.read<AuthProvider>();
    final id = (ch['id'] ?? ch['channelId'] ?? '').toString();
    final name = (ch['name'] ?? ch['title'] ?? 'Live Channel').toString();
    try {
      final res = await auth.apiClient.get('/api/fx/channels/${Uri.encodeComponent(id)}/stream');
      if (res is Map) {
        final hlsUrl = (res['hlsUrl'] ?? res['streamUrl'] ?? res['url'])?.toString();
        final embedUrl = res['embedUrl']?.toString();
        if (hlsUrl != null && hlsUrl.isNotEmpty && (embedUrl == null || embedUrl.isEmpty)) {
          _openPlayer(ActivePlaybackTarget(
            mode: PlayerMode.hls,
            title: name,
            subtitle: 'Live Television',
            provider: 'channels',
            contentId: id,
            mediaType: 'live',
            initialUrl: hlsUrl,
          ));
        } else if (embedUrl != null && embedUrl.isNotEmpty) {
          _openPlayer(ActivePlaybackTarget(
            mode: PlayerMode.embed,
            title: name,
            subtitle: 'Live Television (Embed)',
            provider: 'channels',
            contentId: id,
            mediaType: 'live',
            initialUrl: embedUrl,
          ));
        }
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _playGardenChannel(Map<String, dynamic> ch) async {
    final auth = context.read<AuthProvider>();
    final id = (ch['channelId'] ?? ch['id'] ?? ch['nanoid'] ?? '').toString();
    final name = (ch['name'] ?? ch['title'] ?? 'TVGarden Channel').toString();
    try {
      final res = await auth.apiClient.get(
        '/api/fx/tvgarden/stream',
        query: {'country': _selectedCountry, 'channelId': id},
      );
      if (res is Map) {
        final payload = res['data'] is Map ? Map<String, dynamic>.from(res['data'] as Map) : res;
        final proxyUrl = payload['proxyUrl']?.toString();
        final embedUrl = payload['embedUrl']?.toString();
        if (proxyUrl != null && proxyUrl.isNotEmpty) {
          _openPlayer(ActivePlaybackTarget(
            mode: PlayerMode.hls,
            title: name,
            subtitle: 'Live TV · ${_selectedCountry.toUpperCase()}',
            provider: 'tvgarden',
            contentId: id,
            countryCode: _selectedCountry,
            mediaType: 'live',
            initialUrl: proxyUrl,
          ));
        } else if (embedUrl != null && embedUrl.isNotEmpty) {
          _openPlayer(ActivePlaybackTarget(
            mode: PlayerMode.embed,
            title: name,
            subtitle: 'Live TV · ${_selectedCountry.toUpperCase()} (YouTube)',
            provider: 'tvgarden',
            contentId: id,
            countryCode: _selectedCountry,
            mediaType: 'live',
            initialUrl: embedUrl,
          ));
        }
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _loadSports() async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _loadingSports = true;
      _error = null;
    });
    try {
      final now = DateTime.now().millisecondsSinceEpoch;
      if (_sportsSubTab == 'ongoing') {
        final res = await auth.apiClient.get('/api/fx/sports/ongoing');
        if (mounted) setState(() => _matches = extractArray(res));
      } else if (_sportsSubTab == 'matches') {
        final res = await auth.apiClient.get('/api/fx/sports/matches', query: {
          'startTime': now - 86400000,
          'endTime': now + 86400000,
        });
        if (mounted) setState(() => _matches = extractArray(res));
      } else if (_sportsSubTab == 'replays') {
        final res = await auth.apiClient.get('/api/fx/sports/replays');
        if (mounted) setState(() => _matches = extractArray(res));
      } else {
        final res = await auth.apiClient.get(
          '/api/fx/sports/rankings',
          query: {'leagueId': _leagueId},
        );
        if (mounted) setState(() => _rankings = extractArray(res));
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loadingSports = false);
    }
  }

  Future<void> _inspectMatch(String matchId) async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _activeMatchId = matchId;
      _matchDetail = null;
    });
    try {
      final results = await Future.wait([
        auth.apiClient.get('/api/fx/sports/events', query: {'matchId': matchId}).catchError((_) => []),
        auth.apiClient.get('/api/fx/sports/stats', query: {'matchId': matchId}).catchError((_) => []),
      ]);
      if (mounted) {
        setState(() => _matchDetail = {'events': results[0], 'stats': results[1]});
      }
    } catch (_) {}
  }

  Future<void> _loadWrestling() async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _loadingWrestling = true;
      _error = null;
    });
    try {
      final res = await auth.apiClient.get('/api/fx/wrestling/events', query: {
        'catalog': _wrestlingCatalog,
        'page': 1,
      });
      if (mounted) setState(() => _wrestlingEvents = extractArray(res));
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loadingWrestling = false);
    }
  }

  Future<void> _inspectWrestlingEvent(Map<String, dynamic> ev) async {
    final auth = context.read<AuthProvider>();
    final url = (ev['url'] ?? ev['eventUrl'] ?? '').toString();
    final title = (ev['title'] ?? ev['name'] ?? 'Wrestling Event').toString();
    if (url.isEmpty) return;
    try {
      final res = await auth.apiClient.get('/api/fx/wrestling/event', query: {
        'url': url,
        'resolve': 1,
      });
      if (mounted) {
        setState(() {
          _selectedEventTitle = title;
          _wrestlingParts = extractArray(res is Map ? (res['parts'] ?? res) : res);
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _playWrestlingPart(Map<String, dynamic> part, String title) async {
    final auth = context.read<AuthProvider>();
    final partUrl = (part['url'] ?? part['streamUrl'] ?? '').toString();
    if (partUrl.isEmpty) return;
    try {
      final res = await auth.apiClient.get('/api/fx/wrestling/stream', query: {'url': partUrl});
      if (res is Map) {
        final hlsUrl = (res['hlsUrl'] ?? res['proxyUrl'] ?? res['url'] ?? '').toString();
        if (hlsUrl.isNotEmpty) {
          _openPlayer(ActivePlaybackTarget(
            mode: PlayerMode.hls,
            title: title,
            subtitle: (part['label'] ?? part['title'] ?? 'Event Stream').toString(),
            provider: 'wrestling',
            contentId: partUrl,
            mediaType: 'wrestling',
            initialUrl: hlsUrl,
          ));
        }
      }
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  void _openPlayer(ActivePlaybackTarget target) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => VideoPlayerScreen(initialTarget: target)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);

    final filteredGarden = _gardenChannels.where((c) {
      if (_channelFilter.trim().isEmpty) return true;
      final name = (c['name'] ?? c['title'] ?? '').toString().toLowerCase();
      return name.contains(_channelFilter.trim().toLowerCase());
    }).toList();

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
                'Live TV, Sports & Wrestling',
                style: t.headingFont(TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: t.text,
                )),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  for (final opt in const [
                    ('tv', 'Live TV'),
                    ('sports', 'Sports'),
                    ('wrestling', 'Wrestling'),
                  ])
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Center(child: Text(opt.$2, style: const TextStyle(fontSize: 12))),
                          selected: _tab == opt.$1,
                          selectedColor: t.accent,
                          onSelected: (_) {
                            setState(() => _tab = opt.$1);
                            if (opt.$1 == 'tv') _loadTv();
                            if (opt.$1 == 'sports') _loadSports();
                            if (opt.$1 == 'wrestling') _loadWrestling();
                          },
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          ApiErrorBanner(
            error: _error!,
            theme: t,
            onRetry: () {
              if (_tab == 'tv') _loadTv();
              if (_tab == 'sports') _loadSports();
              if (_tab == 'wrestling') _loadWrestling();
            },
          ),
        ],
        const SizedBox(height: 14),
        if (_tab == 'tv') ...[
          if (_citizenChannels.isNotEmpty) ...[
            Text(
              'Featured Live Channels',
              style: t.headingFont(TextStyle(fontSize: 20, color: t.text)),
            ),
            const SizedBox(height: 8),
            ..._citizenChannels.take(12).map((ch) => Card(
                  color: t.surface,
                  child: ListTile(
                    leading: Icon(Icons.radio, color: t.accent),
                    title: Text((ch['name'] ?? ch['title'] ?? 'Channel').toString(),
                        style: TextStyle(color: t.text, fontWeight: FontWeight.w600)),
                    trailing: ElevatedButton(
                      onPressed: () => _playCitizenChannel(ch),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: t.accent,
                        foregroundColor: t.onAccent,
                      ),
                      child: const Text('Watch'),
                    ),
                  ),
                )),
            const SizedBox(height: 14),
          ],
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _countries.any((c) =>
                          (c['code'] ?? c['countryCode'] ?? c['iso'] ?? '').toString().toLowerCase() ==
                          _selectedCountry)
                      ? _selectedCountry
                      : null,
                  decoration: InputDecoration(
                    labelText: 'Country',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(t.buttonRadius),
                    ),
                  ),
                  dropdownColor: t.surface,
                  items: _countries
                      .map((c) {
                        final code =
                            (c['code'] ?? c['countryCode'] ?? c['iso'] ?? '').toString().toLowerCase();
                        final name = (c['name'] ?? c['countryName'] ?? code).toString();
                        return DropdownMenuItem(
                          value: code,
                          child: Text('$name (${code.toUpperCase()})',
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(color: t.text, fontSize: 13)),
                        );
                      })
                      .where((e) => (e.value ?? '').isNotEmpty)
                      .toList(),
                  onChanged: (v) {
                    if (v != null) _loadGardenCountry(v);
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  onChanged: (v) => setState(() => _channelFilter = v),
                  style: TextStyle(color: t.text, fontSize: 13.5),
                  decoration: InputDecoration(
                    labelText: 'Filter channels',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(t.buttonRadius),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_loadingTv)
            Center(child: CircularProgressIndicator(color: t.accent))
          else
            ...filteredGarden.take(60).map((ch) {
              final name = (ch['name'] ?? ch['title'] ?? 'Channel').toString();
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: t.surface,
                  borderRadius: BorderRadius.circular(t.cardRadius),
                  border: Border.all(color: t.border),
                ),
                child: ListTile(
                  onTap: () => _playGardenChannel(ch),
                  leading: Icon(Icons.live_tv, color: t.accent),
                  title: Text(name, style: TextStyle(color: t.text, fontWeight: FontWeight.w600)),
                  subtitle: Text(
                    ch['hasHls'] == true ? 'HLS Relay' : 'Broadcast Stream',
                    style: TextStyle(color: t.mutedText, fontSize: 11.5),
                  ),
                  trailing: Icon(Icons.play_arrow_rounded, color: t.accent),
                ),
              );
            }),
        ] else if (_tab == 'sports') ...[
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final sub in const [
                  ('ongoing', 'Live Matches'),
                  ('matches', 'Fixtures'),
                  ('replays', 'Replays'),
                  ('rankings', 'Standings'),
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(sub.$2),
                      selected: _sportsSubTab == sub.$1,
                      selectedColor: t.accent,
                      onSelected: (_) {
                        setState(() => _sportsSubTab = sub.$1);
                        _loadSports();
                      },
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (_loadingSports)
            Center(child: CircularProgressIndicator(color: t.accent))
          else if (_sportsSubTab == 'rankings') ...[
            TextField(
              initialValue: _leagueId,
              style: TextStyle(color: t.text),
              decoration: const InputDecoration(labelText: 'League ID (e.g. 17)', border: OutlineInputBorder()),
              onSubmitted: (v) {
                setState(() => _leagueId = v.trim());
                _loadSports();
              },
            ),
            const SizedBox(height: 10),
            ..._rankings.map((row) => ListTile(
                  leading: Text(
                    '#${row['rank'] ?? row['position'] ?? '-'}',
                    style: TextStyle(color: t.accent, fontWeight: FontWeight.w700),
                  ),
                  title: Text((row['teamName'] ?? row['name'] ?? 'Club').toString(),
                      style: TextStyle(color: t.text)),
                  trailing: Text(
                    '${row['points'] ?? row['pts'] ?? '-'} PTS',
                    style: TextStyle(color: t.text, fontWeight: FontWeight.w700),
                  ),
                )),
          ] else
            ..._matches.map((m) {
              final matchId = (m['matchId'] ?? m['id'] ?? '').toString();
              final home = (m['homeTeamName'] ??
                      (m['home'] is Map ? (m['home'] as Map)['name'] : null) ??
                      'Home')
                  .toString();
              final away = (m['awayTeamName'] ??
                      (m['away'] is Map ? (m['away'] as Map)['name'] : null) ??
                      'Away')
                  .toString();
              final score = '${m['homeScore'] ?? '-'} : ${m['awayScore'] ?? '-'}';
              final proxyUrl = (m['proxyUrl'] ?? m['streamUrl'] ?? m['url'])?.toString();
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: t.surface,
                  borderRadius: BorderRadius.circular(t.cardRadius),
                  border: Border.all(color: t.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      (m['leagueName'] ?? m['competition'] ?? 'Football').toString(),
                      style: TextStyle(color: t.mutedText, fontSize: 11.5),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(home,
                              style: TextStyle(color: t.text, fontWeight: FontWeight.w600)),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          child: Text(
                            score,
                            style: TextStyle(
                              color: t.accent,
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Text(away,
                              textAlign: TextAlign.right,
                              style: TextStyle(color: t.text, fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => _inspectMatch(matchId),
                            child: const Text('Stats & Events'),
                          ),
                        ),
                        if (proxyUrl != null && proxyUrl.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            onPressed: () => _openPlayer(ActivePlaybackTarget(
                              mode: proxyUrl.contains('.m3u8') ? PlayerMode.hls : PlayerMode.direct,
                              title: '$home vs $away',
                              subtitle: (m['leagueName'] ?? 'Match Stream').toString(),
                              provider: 'sports',
                              contentId: matchId,
                              mediaType: 'sports',
                              initialUrl: proxyUrl,
                            )),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: t.accent,
                              foregroundColor: t.onAccent,
                            ),
                            icon: const Icon(Icons.play_arrow, size: 16),
                            label: const Text('Watch'),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              );
            }),
          if (_activeMatchId != null && _matchDetail != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: t.elevatedSurface,
                borderRadius: BorderRadius.circular(t.cardRadius),
                border: Border.all(color: t.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Match Center · $_activeMatchId',
                          style: TextStyle(color: t.text, fontWeight: FontWeight.w700)),
                      IconButton(
                        icon: Icon(Icons.close, color: t.mutedText),
                        onPressed: () => setState(() => _activeMatchId = null),
                      ),
                    ],
                  ),
                  Text(
                    const JsonEncoder.withIndent('  ').convert(_matchDetail),
                    style: TextStyle(color: t.mutedText, fontSize: 11, fontFamily: 'monospace'),
                  ),
                ],
              ),
            ),
          ],
        ] else ...[
          Row(
            children: [
              ChoiceChip(
                label: const Text('Official Catalog'),
                selected: _wrestlingCatalog == 'official',
                selectedColor: t.accent,
                onSelected: (_) {
                  setState(() => _wrestlingCatalog = 'official');
                  _loadWrestling();
                },
              ),
              const SizedBox(width: 8),
              ChoiceChip(
                label: const Text('Archive'),
                selected: _wrestlingCatalog == 'archive',
                selectedColor: t.accent,
                onSelected: (_) {
                  setState(() => _wrestlingCatalog = 'archive');
                  _loadWrestling();
                },
              ),
            ],
          ),
          if (_selectedEventTitle != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: t.elevatedSurface,
                borderRadius: BorderRadius.circular(t.cardRadius),
                border: Border.all(color: t.accent),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(_selectedEventTitle!,
                            style: TextStyle(color: t.text, fontWeight: FontWeight.w700)),
                      ),
                      IconButton(
                        icon: Icon(Icons.close, color: t.mutedText),
                        onPressed: () => setState(() => _selectedEventTitle = null),
                      ),
                    ],
                  ),
                  ..._wrestlingParts.asMap().entries.map((entry) => ListTile(
                        title: Text(
                          (entry.value['label'] ?? entry.value['title'] ?? 'Part ${entry.key + 1}')
                              .toString(),
                          style: TextStyle(color: t.text),
                        ),
                        trailing: Icon(Icons.play_arrow_rounded, color: t.accent),
                        onTap: () => _playWrestlingPart(entry.value, _selectedEventTitle!),
                      )),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          if (_loadingWrestling)
            Center(child: CircularProgressIndicator(color: t.accent))
          else
            ..._wrestlingEvents.map((ev) => Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: t.surface,
                    borderRadius: BorderRadius.circular(t.cardRadius),
                    border: Border.all(color: t.border),
                  ),
                  child: ListTile(
                    onTap: () => _inspectWrestlingEvent(ev),
                    title: Text(
                      (ev['title'] ?? ev['name'] ?? 'Wrestling Event').toString(),
                      style: TextStyle(color: t.text, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      [ev['date'], ev['promotion'] ?? _wrestlingCatalog]
                          .where((e) => e != null)
                          .join(' · '),
                      style: TextStyle(color: t.mutedText, fontSize: 12),
                    ),
                    trailing: Icon(Icons.chevron_right, color: t.accent),
                  ),
                )),
        ],
      ],
    );
  }
}
