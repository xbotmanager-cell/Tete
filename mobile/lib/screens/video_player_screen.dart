import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../services/local_stream_proxy.dart';
import '../services/stream_resolver.dart';
import '../services/subtitle_parser.dart';
import '../theme/edition_themes.dart';

class VideoPlayerScreen extends StatefulWidget {
  final ActivePlaybackTarget initialTarget;

  const VideoPlayerScreen({super.key, required this.initialTarget});

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  static const List<String> _resolutions = ['1080', '720', '480', '360'];
  static const List<double> _speeds = [0.75, 1.0, 1.25, 1.5, 2.0];

  late ActivePlaybackTarget _target;
  VideoPlayerController? _videoController;
  WebViewController? _webViewController;

  PlayerMode _effectiveMode = PlayerMode.direct;
  String? _embedUrl;
  bool _loading = true;
  String? _error;

  late String _resolution;
  late String _audioLang;
  double _speed = 1.0;
  bool _isFullscreen = false;
  bool _hudVisible = true;
  bool _autoNextEnabled = true;
  int? _autoNextCountdown;
  Duration? _resumedFrom;

  List<SubtitleTrack> _subtitleTracks = [];
  String _activeSubUrl = 'off';
  List<SubtitleCue> _subtitleCues = [];

  Timer? _refreshTimer;
  Timer? _hudTimer;
  Timer? _autoNextTimer;
  double _lastSavedPos = 0;
  int _recoveryAttempts = 0;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    _target = widget.initialTarget;
    _resolution = auth.user?.preferredQuality ?? '1080';
    _audioLang = auth.user?.preferredAudioLang ?? '';
    WakelockPlus.enable();
    _loadTarget(_target);
  }

  @override
  void dispose() {
    _persistProgress(force: true);
    _refreshTimer?.cancel();
    _hudTimer?.cancel();
    _autoNextTimer?.cancel();
    _disposeVideo();
    WakelockPlus.disable();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    super.dispose();
  }

  void _disposeVideo() {
    final vc = _videoController;
    _videoController = null;
    if (vc != null) {
      vc.removeListener(_onVideoTick);
      vc.dispose();
    }
  }

  void _toggleFullscreen() {
    setState(() => _isFullscreen = !_isFullscreen);
    if (_isFullscreen) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    } else {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    }
    _wakeHud();
  }

  void _wakeHud() {
    setState(() => _hudVisible = true);
    _hudTimer?.cancel();
    _hudTimer = Timer(const Duration(seconds: 4), () {
      if (mounted && (_videoController?.value.isPlaying ?? false)) {
        setState(() => _hudVisible = false);
      }
    });
  }

  Future<void> _loadTarget(
    ActivePlaybackTarget target, {
    bool preservePosition = false,
  }) async {
    final auth = context.read<AuthProvider>();
    final prevPosition =
        preservePosition ? (_videoController?.value.position ?? Duration.zero) : Duration.zero;

    if (!preservePosition) {
      _autoNextTimer?.cancel();
      _refreshTimer?.cancel();
      _recoveryAttempts = 0;
      setState(() {
        _target = target;
        _loading = true;
        _error = null;
        _autoNextCountdown = null;
        _subtitleTracks = [];
        _subtitleCues = [];
        _activeSubUrl = 'off';
        _resumedFrom = null;
      });
    }

    try {
      // 0. Offline file playback from Download Manager
      if (target.localFilePath != null && target.localFilePath!.isNotEmpty) {
        final localFile = File(target.localFilePath!);
        if (!await localFile.exists()) {
          throw Exception('Offline file was removed from device storage.');
        }
        await _initLocalFilePlayer(localFile, preserveDuration: preservePosition ? prevPosition : null);
        return;
      }

      if (target.provider == 'moviebox') {
        final candidates = <StreamCandidate>[];
        final res = await auth.apiClient.get(
          '/api/fx/stream-url',
          query: {
            'subjectId': target.contentId,
            'resolution': _resolution,
            if (_audioLang.isNotEmpty) 'lang': _audioLang,
            if (target.season != null && target.season! > 0) 'se': target.season,
            if (target.episode != null && target.episode! > 0) 'ep': target.episode,
          },
        );
        candidates.addAll(
          StreamResolver.extractCandidates(
            res,
            apiBaseUrl: auth.apiClient.baseUrl,
          ),
        );

        // Also gather alternative mirrors from /api/fx/play-links
        try {
          final pl = await auth.apiClient.get(
            '/api/fx/play-links',
            query: {
              'subjectId': target.contentId,
              if (target.detailPath != null) 'detailPath': target.detailPath,
              if (target.season != null && target.season! > 0) 'se': target.season,
              if (target.episode != null && target.episode! > 0) 'ep': target.episode,
            },
          );
          candidates.addAll(
            StreamResolver.extractCandidates(
              pl,
              apiBaseUrl: auth.apiClient.baseUrl,
            ),
          );
        } catch (_) {}

        if (candidates.isEmpty) {
          throw Exception('FRAMEX did not return any playable stream URLs.');
        }

        final ttl = candidates.first.expiresIn ?? 600;
        _scheduleProactiveRefresh(ttl);
        await _initWithCandidateFallback(
          candidates,
          preserveDuration: preservePosition ? prevPosition : null,
        );

        if (!preservePosition) {
          _fetchSubtitles(target);
        }
      } else if (target.provider == 'gotaku') {
        final res = await auth.apiClient.get(
          '/api/fx/anime/gotaku/stream',
          query: {
            'episodeId': target.contentId,
            'type': target.animeType ?? 'hard_sub',
          },
        );
        final candidates = StreamResolver.extractCandidates(
          res,
          apiBaseUrl: auth.apiClient.baseUrl,
        );
        if (candidates.isEmpty) {
          throw Exception('Gotaku did not return a playable player URL.');
        }
        await _initWithCandidateFallback(
          candidates,
          preserveDuration: preservePosition ? prevPosition : null,
          forceEmbedIfUnknown: true,
        );
      } else if (target.provider == 'animex') {
        final candidates = <StreamCandidate>[];
        try {
          final res = await auth.apiClient.get(
            '/api/fx/anime/animex/stream',
            query: {
              'contentId': target.contentId,
              'episode': target.episode ?? 1,
              'type': target.animeType == 'dub' ? 'dub' : 'sub',
              if (target.animeProviderId != null && target.animeProviderId!.isNotEmpty)
                'providerId': target.animeProviderId,
            },
          );
          candidates.addAll(
            StreamResolver.extractCandidates(
              res,
              apiBaseUrl: auth.apiClient.baseUrl,
            ),
          );
        } catch (_) {}

        // Also prepare AnimeX embed fallback cleanly
        try {
          final emb = await auth.apiClient.get(
            '/api/fx/anime/animex/embed',
            query: {
              'contentId': target.contentId,
              'episode': target.episode ?? 1,
              'type': target.animeType == 'dub' ? 'dub' : 'sub',
              if (target.animeProviderId != null && target.animeProviderId!.isNotEmpty)
                'providerId': target.animeProviderId,
            },
          );
          for (final c in StreamResolver.extractCandidates(emb, apiBaseUrl: auth.apiClient.baseUrl)) {
            candidates.add(c.copyWith(mode: PlayerMode.embed, isEmbed: true));
          }
        } catch (_) {}

        if (candidates.isEmpty) {
          throw Exception('AnimeX stream and embed fallback are both unavailable.');
        }

        final ttl = candidates.first.expiresIn;
        if (ttl != null && ttl > 0) _scheduleProactiveRefresh(ttl);

        await _initWithCandidateFallback(
          candidates,
          preserveDuration: preservePosition ? prevPosition : null,
        );
      } else if (target.initialUrl != null && target.initialUrl!.isNotEmpty) {
        final initialCandidate = StreamCandidate(
          url: target.initialUrl!,
          headers: StreamResolver.extractHeaders(const {}, baseHeaders: target.httpHeaders),
          mode: target.mode,
          isEmbed: target.mode == PlayerMode.embed,
        );
        await _initWithCandidateFallback(
          [initialCandidate],
          preserveDuration: preservePosition ? prevPosition : null,
        );
      } else {
        throw Exception('Unsupported playback target configuration.');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = _formatReadableError(e);
          _loading = false;
        });
      }
    }
  }

  String _formatReadableError(Object err) {
    final msg = err.toString().replaceFirst('Exception: ', '').trim();
    if (msg.contains('Source error') || msg.contains('ExoPlaybackException')) {
      return 'Unable to decode this stream source directly on Android. Tap Reload Stream to retry an alternate server or source.';
    }
    return msg;
  }

  Future<void> _initWithCandidateFallback(
    List<StreamCandidate> candidates, {
    Duration? preserveDuration,
    bool forceEmbedIfUnknown = false,
  }) async {
    Object? lastError;

    for (final candidate in candidates) {
      if (!mounted) return;
      if (candidate.mode == PlayerMode.embed || candidate.isEmbed) {
        _initEmbedPlayer(candidate.url, headers: candidate.headers);
        return;
      }

      final probed = await StreamResolver.probeCandidate(candidate);
      if (!mounted) return;

      if (probed.mode == PlayerMode.embed || forceEmbedIfUnknown && probed.contentType?.contains('html') == true) {
        _initEmbedPlayer(probed.finalUrl, headers: probed.headers);
        return;
      }

      // Skip HTTP 4xx/5xx dead endpoints so we immediately try the next mirror
      if (probed.statusCode != null && probed.statusCode! >= 400) {
        lastError = Exception('Upstream stream returned HTTP ${probed.statusCode}');
        continue;
      }

      // 1. Direct ExoPlayer playback with resolved URL, headers, and explicit HLS/direct formatHint
      try {
        await _initNativeNetworkPlayer(
          probed.finalUrl,
          mode: probed.mode,
          httpHeaders: probed.headers,
          preserveDuration: preserveDuration,
        );
        return;
      } catch (e) {
        lastError = e;
      }

      // 2. Fallback via local 127.0.0.1 loopback proxy (rewrites HLS segment URIs + forwards custom headers/redirects)
      try {
        final proxiedUrl = await LocalStreamProxy.instance.registerStream(
          probed.finalUrl,
          headers: probed.headers,
        );
        await _initNativeNetworkPlayer(
          proxiedUrl,
          mode: probed.mode,
          httpHeaders: const {},
          preserveDuration: preserveDuration,
        );
        return;
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError ?? Exception('No playable stream source succeeded.');
  }

  Future<void> _initLocalFilePlayer(
    File file, {
    Duration? preserveDuration,
  }) async {
    _disposeVideo();
    final controller = VideoPlayerController.file(
      file,
      videoPlayerOptions: VideoPlayerOptions(mixWithOthers: false),
    );
    await _finalizeNativeController(
      controller,
      mode: PlayerMode.direct,
      preserveDuration: preserveDuration,
    );
  }

  Future<void> _initNativeNetworkPlayer(
    String url, {
    required PlayerMode mode,
    required Map<String, String> httpHeaders,
    Duration? preserveDuration,
  }) async {
    _disposeVideo();
    final controller = VideoPlayerController.networkUrl(
      Uri.parse(url),
      formatHint: mode == PlayerMode.hls ? VideoFormat.hls : VideoFormat.other,
      httpHeaders: httpHeaders,
      videoPlayerOptions: VideoPlayerOptions(mixWithOthers: false),
    );
    await _finalizeNativeController(
      controller,
      mode: mode,
      preserveDuration: preserveDuration,
    );
  }

  Future<void> _finalizeNativeController(
    VideoPlayerController controller, {
    required PlayerMode mode,
    Duration? preserveDuration,
  }) async {
    _videoController = controller;
    controller.addListener(_onVideoTick);

    await controller.initialize();
    if (!mounted || _videoController != controller) return;

    final auth = context.read<AuthProvider>();
    Duration? seekTarget = preserveDuration;
    if (seekTarget == null && _target.mediaType != 'live') {
      final saved = auth.getWatchProgress(
        _target.contentId,
        season: _target.season ?? 0,
        episode: _target.episode ?? 0,
      );
      if (saved != null &&
          saved.positionSeconds > 8 &&
          (saved.durationSeconds <= 0 || saved.positionSeconds < saved.durationSeconds - 15)) {
        seekTarget = Duration(seconds: saved.positionSeconds.floor());
        _resumedFrom = seekTarget;
      }
    }

    if (seekTarget != null && seekTarget > Duration.zero) {
      final totalDur = controller.value.duration;
      if (totalDur == Duration.zero || seekTarget < totalDur - const Duration(seconds: 2)) {
        await controller.seekTo(seekTarget);
      }
    }

    await controller.setPlaybackSpeed(_speed);
    await controller.play();

    setState(() {
      _effectiveMode = mode;
      _embedUrl = null;
      _loading = false;
      _error = null;
    });
    _wakeHud();
  }

  void _scheduleProactiveRefresh(int expiresInSeconds) {
    _refreshTimer?.cancel();
    final ttl = expiresInSeconds > 0 ? expiresInSeconds : 600;
    final delaySec = (ttl - 90).clamp(30, 540);
    _refreshTimer = Timer(Duration(seconds: delaySec), () {
      if (mounted && _effectiveMode != PlayerMode.embed && _target.localFilePath == null) {
        _loadTarget(_target, preservePosition: true);
      }
    });
  }

  Future<void> _fetchSubtitles(ActivePlaybackTarget target) async {
    final auth = context.read<AuthProvider>();
    try {
      final res = await auth.apiClient.get(
        '/api/fx/captions',
        query: {
          'subjectId': target.contentId,
          if (target.detailPath != null) 'detailPath': target.detailPath,
          'resolution': _resolution,
          if (target.season != null && target.season! > 0) 'se': target.season,
          if (target.episode != null && target.episode! > 0) 'ep': target.episode,
        },
      );
      final tracks = SubtitleTrack.normalizeList(res);
      if (!mounted) return;
      setState(() => _subtitleTracks = tracks);
      if (tracks.isNotEmpty) {
        final prefLang = (auth.user?.preferredSubtitleLang ?? 'en').toLowerCase();
        final match = tracks.firstWhere(
          (t) => t.lang.toLowerCase().contains(prefLang),
          orElse: () => tracks.first,
        );
        await _selectSubtitleTrack(match.url);
      }
    } catch (_) {}
  }

  Future<void> _selectSubtitleTrack(String url) async {
    setState(() => _activeSubUrl = url);
    if (url == 'off') {
      setState(() => _subtitleCues = []);
      return;
    }
    try {
      final auth = context.read<AuthProvider>();
      final proxied = auth.apiClient.buildUri('/api/fx/subtitle-proxy', {'url': url}).toString();
      final text = await auth.apiClient.getText(proxied);
      if (!mounted) return;
      setState(() => _subtitleCues = SubtitleParser.parse(text));
    } catch (_) {
      if (mounted) setState(() => _subtitleCues = []);
    }
  }

  void _initEmbedPlayer(String url, {Map<String, String> headers = const {}}) {
    _disposeVideo();
    final ua = headers['User-Agent'] ?? StreamResolver.defaultUserAgent;
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setUserAgent(ua)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (req) {
            final u = req.url.toLowerCase();
            if (u.startsWith('http://') || u.startsWith('https://')) {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(Uri.parse(url), headers: headers);

    setState(() {
      _effectiveMode = PlayerMode.embed;
      _embedUrl = url;
      _webViewController = controller;
      _loading = false;
      _error = null;
    });
  }

  void _onVideoTick() {
    final vc = _videoController;
    if (vc == null || !mounted) return;
    final val = vc.value;

    if (val.hasError && _error == null) {
      // Automatic bounded recovery when signed URL expires or drops mid-stream
      if (_recoveryAttempts < 2 &&
          _target.localFilePath == null &&
          (_target.provider == 'moviebox' || _target.provider == 'animex')) {
        _recoveryAttempts += 1;
        unawaited(_loadTarget(_target, preservePosition: true));
        return;
      }
      setState(() => _error = _formatReadableError(val.errorDescription ?? 'Stream playback error.'));
      return;
    }

    // Detect completion for auto-next episode
    if (val.isInitialized &&
        val.duration > Duration.zero &&
        val.position >= val.duration - const Duration(milliseconds: 500) &&
        !val.isPlaying &&
        _autoNextEnabled &&
        _target.nextEpisode != null &&
        _autoNextTimer == null) {
      _startAutoNext();
    }

    _persistProgress(force: false);
    setState(() {});
  }

  void _startAutoNext() {
    final nextEp = _target.nextEpisode;
    final builder = _target.buildForEpisode;
    if (nextEp == null || builder == null) return;
    setState(() => _autoNextCountdown = 5);
    _autoNextTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final current = _autoNextCountdown ?? 0;
      if (current <= 1) {
        timer.cancel();
        _autoNextTimer = null;
        _loadTarget(builder(nextEp));
      } else {
        setState(() => _autoNextCountdown = current - 1);
      }
    });
  }

  void _persistProgress({bool force = false}) {
    if (_target.mediaType == 'live') return;
    final vc = _videoController;
    if (vc == null || !vc.value.isInitialized) return;
    final pos = vc.value.position.inSeconds.toDouble();
    final dur = vc.value.duration.inSeconds.toDouble();
    if (!force && (pos - _lastSavedPos).abs() < 5) return;
    _lastSavedPos = pos;

    context.read<AuthProvider>().saveWatchProgress(
          WatchProgressEntry(
            contentId: _target.contentId,
            slug: _target.slug ?? _target.contentId,
            provider: _target.provider,
            mediaType: _target.mediaType,
            title: _target.title,
            poster: _target.poster,
            season: _target.season ?? 0,
            episode: _target.episode ?? 0,
            positionSeconds: pos,
            durationSeconds: dur,
          ),
        );
  }

  void _switchEpisode(PlayerEpisodeOption ep) {
    final builder = _target.buildForEpisode;
    if (builder == null) return;
    _persistProgress(force: true);
    _loadTarget(builder(ep));
  }

  void _openEpisodeSheet(EditionVisualTheme t) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: t.surface,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(14),
              child: Text(
                'Episodes (${_target.episodes.length})',
                style: t.headingFont(TextStyle(fontSize: 20, color: t.text)),
              ),
            ),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _target.episodes.length,
                itemBuilder: (_, idx) {
                  final ep = _target.episodes[idx];
                  final isCurrent = ep.episode == _target.episode;
                  return ListTile(
                    leading: Text(
                      'E${ep.episode}',
                      style: TextStyle(
                        color: isCurrent ? t.accent : t.mutedText,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    title: Text(
                      ep.title ?? 'Episode ${ep.episode}',
                      style: TextStyle(
                        color: isCurrent ? t.accent : t.text,
                        fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                    trailing: isCurrent ? Icon(Icons.equalizer, color: t.accent) : null,
                    onTap: () {
                      Navigator.of(context).pop();
                      _switchEpisode(ep);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openSettingsSheet(EditionVisualTheme t) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: t.surface,
      builder: (_) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Playback Controls',
                  style: t.headingFont(TextStyle(fontSize: 20, color: t.text))),
              const SizedBox(height: 14),
              if (_target.provider == 'moviebox' && _target.localFilePath == null) ...[
                Text('Resolution', style: TextStyle(color: t.mutedText, fontSize: 12)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  children: _resolutions.map((res) {
                    final active = _resolution == res;
                    return ChoiceChip(
                      label: Text('${res}p'),
                      selected: active,
                      selectedColor: t.accent,
                      onSelected: (_) {
                        Navigator.of(context).pop();
                        setState(() => _resolution = res);
                        _loadTarget(_target, preservePosition: true);
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),
              ],
              if (_target.availableLanguages.length > 1 && _target.localFilePath == null) ...[
                Text('Audio Language', style: TextStyle(color: t.mutedText, fontSize: 12)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  children: _target.availableLanguages.map((lang) {
                    final active = _audioLang == lang;
                    return ChoiceChip(
                      label: Text(lang.toUpperCase()),
                      selected: active,
                      selectedColor: t.accent,
                      onSelected: (_) {
                        Navigator.of(context).pop();
                        setState(() => _audioLang = lang);
                        _loadTarget(_target, preservePosition: true);
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),
              ],
              Text('Playback Speed', style: TextStyle(color: t.mutedText, fontSize: 12)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                children: _speeds.map((spd) {
                  final active = _speed == spd;
                  return ChoiceChip(
                    label: Text('${spd}x'),
                    selected: active,
                    selectedColor: t.accent,
                    onSelected: (_) {
                      Navigator.of(context).pop();
                      setState(() => _speed = spd);
                      _videoController?.setPlaybackSpeed(spd);
                    },
                  );
                }).toList(),
              ),
              if (_subtitleTracks.isNotEmpty) ...[
                const SizedBox(height: 14),
                Text('Subtitles', style: TextStyle(color: t.mutedText, fontSize: 12)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Off'),
                      selected: _activeSubUrl == 'off',
                      selectedColor: t.accent,
                      onSelected: (_) {
                        Navigator.of(context).pop();
                        _selectSubtitleTrack('off');
                      },
                    ),
                    ..._subtitleTracks.map((tr) => ChoiceChip(
                          label: Text(tr.label),
                          selected: _activeSubUrl == tr.url,
                          selectedColor: t.accent,
                          onSelected: (_) {
                            Navigator.of(context).pop();
                            _selectSubtitleTrack(tr.url);
                          },
                        )),
                  ],
                ),
              ],
              if (_target.episodes.isNotEmpty) ...[
                const SizedBox(height: 10),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Auto-play next episode', style: TextStyle(color: t.text)),
                  value: _autoNextEnabled,
                  onChanged: (v) {
                    setState(() => _autoNextEnabled = v);
                    Navigator.of(context).pop();
                  },
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);
    final vc = _videoController;
    final val = vc?.value;
    final pos = val?.position ?? Duration.zero;
    final dur = val?.duration ?? Duration.zero;
    final activeSubText =
        (_activeSubUrl != 'off' && _subtitleCues.isNotEmpty)
            ? SubtitleParser.activeTextAt(_subtitleCues, pos)
            : null;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        top: !_isFullscreen,
        bottom: !_isFullscreen,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {
            if (_hudVisible) {
              setState(() => _hudVisible = false);
            } else {
              _wakeHud();
            }
          },
          onDoubleTapDown: (details) {
            if (vc == null || !vc.value.isInitialized) return;
            final width = MediaQuery.of(context).size.width;
            final isRight = details.localPosition.dx > width / 2;
            final next = vc.value.position + Duration(seconds: isRight ? 10 : -10);
            vc.seekTo(next < Duration.zero ? Duration.zero : next);
            _wakeHud();
          },
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Core Video / Embed Stage
              if (_effectiveMode == PlayerMode.embed && _embedUrl != null && _webViewController != null)
                WebViewWidget(controller: _webViewController!)
              else if (vc != null && val != null && val.isInitialized)
                Center(
                  child: AspectRatio(
                    aspectRatio: val.aspectRatio > 0 ? val.aspectRatio : 16 / 9,
                    child: VideoPlayer(vc),
                  ),
                )
              else
                const ColoredBox(color: Colors.black),

              // Synchronized Subtitle Overlay
              if (activeSubText != null && activeSubText.isNotEmpty)
                Positioned(
                  left: 20,
                  right: 20,
                  bottom: _hudVisible ? 88 : 28,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.75),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        activeSubText,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          height: 1.35,
                        ),
                      ),
                    ),
                  ),
                ),

              // Buffering / Loading Spinner
              if (_loading || (val != null && val.isBuffering))
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: t.accent),
                      const SizedBox(height: 12),
                      Text(
                        _loading
                            ? (_target.localFilePath != null
                                ? 'Opening offline download…'
                                : 'Resolving stream (${_target.provider.toUpperCase()})…')
                            : 'Buffering…',
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                    ],
                  ),
                ),

              // Error Recovery Overlay
              if (_error != null)
                Container(
                  color: Colors.black.withOpacity(0.86),
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.error_outline, color: t.accent, size: 42),
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                        ),
                        const SizedBox(height: 16),
                        Wrap(
                          spacing: 12,
                          children: [
                            ElevatedButton.icon(
                              onPressed: () {
                                _recoveryAttempts = 0;
                                _loadTarget(_target, preservePosition: true);
                              },
                              style: ElevatedButton.styleFrom(backgroundColor: t.accent),
                              icon: const Icon(Icons.refresh, color: Colors.white),
                              label: const Text('Reload Stream',
                                  style: TextStyle(color: Colors.white)),
                            ),
                            OutlinedButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('Close Player',
                                  style: TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

              // Auto-Next Episode Countdown Banner
              if (_autoNextCountdown != null && _target.nextEpisode != null)
                Positioned(
                  right: 16,
                  bottom: 90,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.85),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: t.accent),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Next Ep in ${_autoNextCountdown}s',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(width: 10),
                        TextButton(
                          onPressed: () {
                            _autoNextTimer?.cancel();
                            _autoNextTimer = null;
                            setState(() => _autoNextCountdown = null);
                          },
                          child: const Text('Cancel'),
                        ),
                        ElevatedButton(
                          onPressed: () {
                            _autoNextTimer?.cancel();
                            _autoNextTimer = null;
                            _switchEpisode(_target.nextEpisode!);
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: t.accent),
                          child: const Text('Play Now', style: TextStyle(color: Colors.white)),
                        ),
                      ],
                    ),
                  ),
                ),

              // Top & Bottom HUD Overlay
              if (_hudVisible || _effectiveMode == PlayerMode.embed) ...[
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.black87, Colors.transparent],
                      ),
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back, color: Colors.white),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _target.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
                              if (_target.subtitle != null || _resumedFrom != null)
                                Text(
                                  [
                                    _target.subtitle,
                                    if (_resumedFrom != null)
                                      'Resumed at ${formatTimecode(_resumedFrom!.inSeconds)}',
                                  ].whereType<String>().join(' · '),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: Colors.white70, fontSize: 11.5),
                                ),
                            ],
                          ),
                        ),
                        if (_target.episodes.isNotEmpty)
                          IconButton(
                            tooltip: 'Episodes',
                            icon: const Icon(Icons.list_alt, color: Colors.white),
                            onPressed: () => _openEpisodeSheet(t),
                          ),
                        if (_effectiveMode != PlayerMode.embed)
                          IconButton(
                            tooltip: 'Playback Settings',
                            icon: const Icon(Icons.tune, color: Colors.white),
                            onPressed: () => _openSettingsSheet(t),
                          ),
                        IconButton(
                          tooltip: _isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Landscape',
                          icon: Icon(
                            _isFullscreen ? Icons.fullscreen_exit : Icons.fullscreen,
                            color: Colors.white,
                          ),
                          onPressed: _toggleFullscreen,
                        ),
                      ],
                    ),
                  ),
                ),

                if (_effectiveMode != PlayerMode.embed && vc != null && val != null && val.isInitialized)
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(12, 16, 12, 10),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                          colors: [Colors.black87, Colors.transparent],
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (dur > Duration.zero)
                            Row(
                              children: [
                                Text(
                                  formatTimecode(pos.inSeconds),
                                  style: const TextStyle(color: Colors.white, fontSize: 11.5),
                                ),
                                Expanded(
                                  child: Slider(
                                    value: pos.inMilliseconds
                                        .clamp(0, dur.inMilliseconds)
                                        .toDouble(),
                                    min: 0,
                                    max: dur.inMilliseconds.toDouble().clamp(1, double.infinity),
                                    activeColor: t.accent,
                                    inactiveColor: Colors.white24,
                                    onChanged: (ms) {
                                      vc.seekTo(Duration(milliseconds: ms.toInt()));
                                    },
                                  ),
                                ),
                                Text(
                                  formatTimecode(dur.inSeconds),
                                  style: const TextStyle(color: Colors.white70, fontSize: 11.5),
                                ),
                              ],
                            )
                          else
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                children: [
                                  Icon(Icons.circle, size: 10, color: t.accent),
                                  const SizedBox(width: 6),
                                  const Text('LIVE STREAM',
                                      style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 11)),
                                ],
                              ),
                            ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              if (_target.prevEpisode != null)
                                IconButton(
                                  tooltip: 'Previous Episode',
                                  icon: const Icon(Icons.skip_previous, color: Colors.white),
                                  onPressed: () => _switchEpisode(_target.prevEpisode!),
                                ),
                              IconButton(
                                tooltip: 'Rewind 10s',
                                icon: const Icon(Icons.replay_10, color: Colors.white),
                                onPressed: () {
                                  final next = pos - const Duration(seconds: 10);
                                  vc.seekTo(next < Duration.zero ? Duration.zero : next);
                                  _wakeHud();
                                },
                              ),
                              IconButton(
                                iconSize: 38,
                                icon: Icon(
                                  val.isPlaying ? Icons.pause_circle_filled : Icons.play_circle_fill,
                                  color: Colors.white,
                                ),
                                onPressed: () {
                                  if (val.isPlaying) {
                                    vc.pause();
                                    _persistProgress(force: true);
                                  } else {
                                    vc.play();
                                  }
                                  _wakeHud();
                                },
                              ),
                              IconButton(
                                tooltip: 'Forward 10s',
                                icon: const Icon(Icons.forward_10, color: Colors.white),
                                onPressed: () {
                                  vc.seekTo(pos + const Duration(seconds: 10));
                                  _wakeHud();
                                },
                              ),
                              if (_target.nextEpisode != null)
                                IconButton(
                                  tooltip: 'Next Episode',
                                  icon: const Icon(Icons.skip_next, color: Colors.white),
                                  onPressed: () => _switchEpisode(_target.nextEpisode!),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
