import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/download_models.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../providers/download_provider.dart';
import '../screens/video_player_screen.dart';
import '../theme/edition_themes.dart';

class DownloadsScreen extends StatelessWidget {
  const DownloadsScreen({super.key});

  void _playOffline(BuildContext context, DownloadRecord rec) {
    if (rec.localFilePath == null || rec.localFilePath!.isEmpty) return;
    final target = ActivePlaybackTarget(
      mode: PlayerMode.direct,
      title: rec.title,
      subtitle: rec.subtitle ?? 'Offline Playback · ${rec.quality}',
      poster: rec.posterUrl,
      provider: rec.provider,
      contentId: rec.contentId,
      slug: rec.slug,
      mediaType: rec.mediaType,
      season: rec.season > 0 ? rec.season : null,
      episode: rec.episode > 0 ? rec.episode : null,
      localFilePath: rec.localFilePath,
    );
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => VideoPlayerScreen(initialTarget: target)),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    DownloadProvider provider,
    DownloadRecord rec,
    EditionVisualTheme t,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: t.surface,
        title: Text('Delete Download', style: t.headingFont(TextStyle(color: t.text))),
        content: Text(
          'Remove "${rec.title}" and delete its offline video file from device storage?',
          style: TextStyle(color: t.mutedText, fontSize: 13.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Keep'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await provider.deleteDownload(rec.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final dl = context.watch<DownloadProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);
    final records = dl.records;

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
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Downloads',
                      style: t.headingFont(TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: t.text,
                      )),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${dl.completedCount} ready offline · ${dl.activeCount} active in queue',
                      style: TextStyle(color: t.mutedText, fontSize: 12.5),
                    ),
                  ],
                ),
              ),
              Icon(Icons.download_for_offline_rounded, color: t.accent, size: 32),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (!dl.initialized)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 40),
            child: Center(child: CircularProgressIndicator(color: t.accent)),
          )
        else if (records.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 38),
            decoration: BoxDecoration(
              color: t.surface,
              borderRadius: BorderRadius.circular(t.cardRadius),
              border: Border.all(color: t.border),
            ),
            child: Column(
              children: [
                Icon(Icons.cloud_download_outlined, color: t.mutedText, size: 42),
                const SizedBox(height: 12),
                Text(
                  'No Offline Downloads Yet',
                  style: t.headingFont(TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: t.text,
                  )),
                ),
                const SizedBox(height: 6),
                Text(
                  'Open any downloadable MovieBox or Showbox title and tap Download to save video files directly to your device for offline playback.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: t.mutedText, fontSize: 13, height: 1.45),
                ),
              ],
            ),
          )
        else
          ...records.map((rec) {
            final isComplete = rec.status == DownloadStatus.completed;
            final isDownloading = rec.status == DownloadStatus.downloading;
            final isPaused = rec.status == DownloadStatus.paused;
            final isFailedOrCanceled =
                rec.status == DownloadStatus.failed || rec.status == DownloadStatus.canceled;

            final statusColor = switch (rec.status) {
              DownloadStatus.completed => const Color(0xFF10B981),
              DownloadStatus.downloading => t.accent,
              DownloadStatus.queued => t.secondaryAccent,
              DownloadStatus.paused => Colors.amber,
              DownloadStatus.failed => const Color(0xFFEF4444),
              DownloadStatus.canceled => t.mutedText,
            };

            final byteLine = rec.totalBytes > 0
                ? '${formatBytes(rec.downloadedBytes)} / ${formatBytes(rec.totalBytes)} · ${rec.progressPercent}%'
                : rec.downloadedBytes > 0
                    ? '${formatBytes(rec.downloadedBytes)} downloaded'
                    : rec.status.label;

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: t.surface,
                borderRadius: BorderRadius.circular(t.cardRadius),
                border: Border.all(color: t.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SizedBox(
                          width: 68,
                          height: 92,
                          child: rec.posterUrl != null && rec.posterUrl!.isNotEmpty
                              ? CachedNetworkImage(
                                  imageUrl: rec.posterUrl!,
                                  fit: BoxFit.cover,
                                  errorWidget: (_, __, ___) => Image.asset(
                                    AppConfig.assetCinemaHero,
                                    fit: BoxFit.cover,
                                  ),
                                )
                              : Image.asset(AppConfig.assetCinemaHero, fit: BoxFit.cover),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              rec.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: t.text,
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                              ),
                            ),
                            if (rec.subtitle != null) ...[
                              const SizedBox(height: 3),
                              Text(
                                rec.subtitle!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(color: t.mutedText, fontSize: 12),
                              ),
                            ],
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: statusColor.withOpacity(0.14),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: statusColor.withOpacity(0.45)),
                                  ),
                                  child: Text(
                                    rec.status.label.toUpperCase(),
                                    style: TextStyle(
                                      color: statusColor,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    byteLine,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(color: t.mutedText, fontSize: 11.5),
                                  ),
                                ),
                              ],
                            ),
                            if (rec.status.isActive) ...[
                              const SizedBox(height: 8),
                              LinearProgressIndicator(
                                value: rec.totalBytes > 0 ? rec.progress : null,
                                minHeight: 5,
                                color: t.accent,
                                backgroundColor: t.border,
                              ),
                            ],
                            if (rec.errorMessage != null && rec.errorMessage!.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                rec.errorMessage!,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Color(0xFFEF4444), fontSize: 11.5),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      if (isComplete)
                        ElevatedButton.icon(
                          onPressed: () => _playOffline(context, rec),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: t.accent,
                            foregroundColor: t.onAccent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(t.buttonRadius),
                            ),
                          ),
                          icon: const Icon(Icons.play_arrow_rounded, size: 18),
                          label: const Text('Play Offline',
                              style: TextStyle(fontWeight: FontWeight.w700)),
                        ),
                      if (isDownloading && dl.supportsManualPause)
                        OutlinedButton.icon(
                          onPressed: () => dl.pauseDownload(rec.id),
                          icon: const Icon(Icons.pause, size: 16),
                          label: const Text('Pause'),
                        ),
                      if (isPaused && dl.supportsManualPause)
                        ElevatedButton.icon(
                          onPressed: () => dl.resumeDownload(rec.id),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: t.accent,
                            foregroundColor: t.onAccent,
                          ),
                          icon: const Icon(Icons.play_arrow, size: 16),
                          label: const Text('Resume'),
                        ),
                      if (rec.status.isActive)
                        OutlinedButton.icon(
                          onPressed: () => dl.cancelDownload(rec.id),
                          icon: const Icon(Icons.close, size: 16),
                          label: const Text('Cancel'),
                        ),
                      if (isFailedOrCanceled)
                        ElevatedButton.icon(
                          onPressed: () => dl.retryDownload(rec.id),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: t.accent,
                            foregroundColor: t.onAccent,
                          ),
                          icon: const Icon(Icons.refresh, size: 16),
                          label: const Text('Retry'),
                        ),
                      OutlinedButton.icon(
                        onPressed: () => _confirmDelete(context, dl, rec, t),
                        icon: const Icon(Icons.delete_outline, size: 16),
                        label: const Text('Delete'),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }
}
