import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/download_models.dart';
import '../models/update_models.dart';
import '../providers/auth_provider.dart';
import '../providers/update_provider.dart';
import '../theme/edition_themes.dart';

bool _updateDialogOpen = false;

Future<void> showLupinUpdateDialog(BuildContext context) async {
  if (_updateDialogOpen) return;
  _updateDialogOpen = true;
  final upd = context.read<UpdateProvider>();
  try {
    await showDialog<void>(
      context: context,
      barrierDismissible: !upd.mandatory,
      builder: (_) => const LupinUpdateDialog(),
    );
  } finally {
    _updateDialogOpen = false;
  }
}

class LupinUpdateBanner extends StatelessWidget {
  const LupinUpdateBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final upd = context.watch<UpdateProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);

    if (!upd.shouldPresentPrompt) return const SizedBox.shrink();

    final targetVersion = upd.manifest?.latestVersion ??
        (upd.playInfo?.availableVersionCode != null
            ? 'Build ${upd.playInfo!.availableVersionCode}'
            : 'New Version');

    return Material(
      color: t.elevatedSurface,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: t.accent.withOpacity(0.55))),
        ),
        child: Row(
          children: [
            Icon(Icons.system_update_rounded, color: t.accent, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    upd.mandatory
                        ? 'Required Update ($targetVersion)'
                        : 'Update Available: v$targetVersion',
                    style: TextStyle(
                      color: t.text,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    upd.mandatory
                        ? 'Install this critical update to continue.'
                        : 'Tap Update for improvements and fixes.',
                    style: TextStyle(color: t.mutedText, fontSize: 11.5),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: () => showLupinUpdateDialog(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: t.accent,
                foregroundColor: t.onAccent,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(t.buttonRadius),
                ),
              ),
              child: const Text('Update', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
            ),
            if (!upd.mandatory) ...[
              const SizedBox(width: 4),
              IconButton(
                visualDensity: VisualDensity.compact,
                tooltip: 'Remind Me Later',
                icon: Icon(Icons.close, color: t.mutedText, size: 18),
                onPressed: () => upd.remindMeLater(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class LupinUpdateDialog extends StatelessWidget {
  const LupinUpdateDialog({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final upd = context.watch<UpdateProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);
    final manifest = upd.manifest;
    final versionLabel = manifest != null
        ? 'v${manifest.latestVersion} (Build ${manifest.versionCode})'
        : (upd.playInfo?.availableVersionCode != null
            ? 'Google Play Build ${upd.playInfo!.availableVersionCode}'
            : 'Latest Release');

    return PopScope(
      canPop: !upd.mandatory,
      child: AlertDialog(
        backgroundColor: t.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(t.cardRadius),
          side: BorderSide(color: t.border),
        ),
        title: Row(
          children: [
            Icon(Icons.system_update_alt_rounded, color: t.accent),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                upd.mandatory ? 'Required App Update' : 'LUPIN MOVIES Update',
                style: t.headingFont(TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: t.text,
                )),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Installed: v${upd.installedVersion} (${upd.installedVersionCode})',
                style: TextStyle(color: t.mutedText, fontSize: 12),
              ),
              const SizedBox(height: 3),
              Text(
                'New: $versionLabel${manifest != null && manifest.fileSize > 0 ? ' · ${formatBytes(manifest.fileSize)}' : ''}',
                style: TextStyle(color: t.accent, fontWeight: FontWeight.w700, fontSize: 13.5),
              ),
              if (manifest != null && manifest.releaseNotes.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text('What\'s New',
                    style: TextStyle(color: t.text, fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  constraints: const BoxConstraints(maxHeight: 160),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: t.elevatedSurface,
                    borderRadius: BorderRadius.circular(t.cardRadius),
                    border: Border.all(color: t.border),
                  ),
                  child: SingleChildScrollView(
                    child: Text(
                      manifest.releaseNotes,
                      style: TextStyle(color: t.text.withOpacity(0.9), fontSize: 12.5, height: 1.45),
                    ),
                  ),
                ),
              ],
              if (upd.stage == UpdateStage.downloading || upd.stage == UpdateStage.verifying) ...[
                const SizedBox(height: 14),
                LinearProgressIndicator(
                  value: upd.stage == UpdateStage.downloading && upd.totalBytes > 0
                      ? upd.downloadProgress
                      : null,
                  minHeight: 6,
                  color: t.accent,
                  backgroundColor: t.border,
                ),
                const SizedBox(height: 6),
                Text(
                  upd.stage == UpdateStage.verifying
                      ? 'Verifying SHA-256 checksum & release signature…'
                      : upd.totalBytes > 0
                          ? 'Downloading APK: ${formatBytes(upd.downloadedBytes)} / ${formatBytes(upd.totalBytes)} (${(upd.downloadProgress * 100).round()}%)'
                          : 'Downloading update…',
                  style: TextStyle(color: t.mutedText, fontSize: 12),
                ),
              ],
              if (upd.stage == UpdateStage.awaitingPermission) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: t.elevatedSurface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.amber.withOpacity(0.6)),
                  ),
                  child: Text(
                    'APK verified! Grant "Install unknown apps" permission for LUPIN MOVIES in Android Settings, then tap Install Now.',
                    style: TextStyle(color: t.text, fontSize: 12),
                  ),
                ),
              ],
              if (upd.stage == UpdateStage.error && upd.errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(
                  upd.errorMessage!,
                  style: const TextStyle(color: Color(0xFFEF4444), fontSize: 12),
                ),
              ],
            ],
          ),
        ),
        actions: [
          if (!upd.mandatory &&
              upd.stage != UpdateStage.downloading &&
              upd.stage != UpdateStage.verifying) ...[
            TextButton(
              onPressed: () {
                upd.skipThisVersion();
                Navigator.of(context).pop();
              },
              child: Text('Skip Version', style: TextStyle(color: t.mutedText)),
            ),
            TextButton(
              onPressed: () {
                upd.remindMeLater();
                Navigator.of(context).pop();
              },
              child: Text('Remind Later', style: TextStyle(color: t.mutedText)),
            ),
          ],
          if (upd.stage == UpdateStage.downloading && !upd.mandatory)
            TextButton(
              onPressed: () => upd.cancelDownload(),
              child: const Text('Cancel'),
            )
          else if (upd.stage == UpdateStage.awaitingPermission) ...[
            OutlinedButton(
              onPressed: () => upd.openInstallPermissionSettings(),
              child: const Text('Open Settings'),
            ),
            ElevatedButton(
              onPressed: () => upd.resumeInstallAfterPermission(),
              style: ElevatedButton.styleFrom(
                backgroundColor: t.accent,
                foregroundColor: t.onAccent,
              ),
              child: const Text('Install Now'),
            ),
          ] else if (upd.stage != UpdateStage.downloading &&
              upd.stage != UpdateStage.verifying)
            ElevatedButton.icon(
              onPressed: () => upd.startUpdate(),
              style: ElevatedButton.styleFrom(
                backgroundColor: t.accent,
                foregroundColor: t.onAccent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(t.buttonRadius),
                ),
              ),
              icon: const Icon(Icons.download_rounded, size: 18),
              label: Text(
                upd.stage == UpdateStage.error ? 'Retry Update' : 'Update Now',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
        ],
      ),
    );
  }
}
