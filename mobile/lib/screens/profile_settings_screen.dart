import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/framex_models.dart';
import '../models/update_models.dart';
import '../providers/auth_provider.dart';
import '../providers/update_provider.dart';
import '../theme/edition_themes.dart';
import '../widgets/appearance_sheet.dart';
import '../widgets/auth_sheet.dart';
import '../widgets/update_dialog.dart';

class ProfileSettingsScreen extends StatefulWidget {
  final ValueChanged<AppSection> onNavigateSection;

  const ProfileSettingsScreen({super.key, required this.onNavigateSection});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  final _apiUrlCtrl = TextEditingController();
  bool _savingPrefs = false;

  @override
  void initState() {
    super.initState();
    _apiUrlCtrl.text = context.read<AuthProvider>().apiBaseUrl;
  }

  @override
  void dispose() {
    _apiUrlCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final upd = context.watch<UpdateProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);
    final user = auth.user;
    final versionLabel = '${upd.installedVersion} (${upd.installedVersionCode})';

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
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
                user != null ? user.name : 'Guest Profile',
                style: t.headingFont(TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: t.text,
                )),
              ),
              const SizedBox(height: 4),
              Text(
                user != null
                    ? user.email
                    : 'Sign in to sync your library, watch progress, and edition across devices.',
                style: TextStyle(color: t.mutedText, fontSize: 13),
              ),
              const SizedBox(height: 14),
              if (user == null)
                ElevatedButton.icon(
                  onPressed: () => showAuthModalSheet(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: t.accent,
                    foregroundColor: t.onAccent,
                  ),
                  icon: const Icon(Icons.login),
                  label: const Text('Sign In or Create Account'),
                )
              else
                OutlinedButton.icon(
                  onPressed: () => auth.logout(),
                  icon: const Icon(Icons.logout),
                  label: const Text('Sign Out'),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
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
              Text('Appearance & Edition',
                  style: t.headingFont(TextStyle(fontSize: 20, color: t.text))),
              const SizedBox(height: 6),
              Text('Current Edition: ${auth.layoutMode.label}',
                  style: TextStyle(color: t.mutedText, fontSize: 13)),
              const SizedBox(height: 10),
              ElevatedButton.icon(
                onPressed: () => showAppearanceSwitcherSheet(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: t.accent,
                  foregroundColor: t.onAccent,
                ),
                icon: const Icon(Icons.palette_outlined),
                label: const Text('Switch Website / App Edition (6 Designs)'),
              ),
            ],
          ),
        ),
        if (user != null) ...[
          const SizedBox(height: 16),
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
                Text('Playback Preferences',
                    style: t.headingFont(TextStyle(fontSize: 20, color: t.text))),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: ['1080', '720', '480', '360'].contains(user.preferredQuality)
                      ? user.preferredQuality
                      : '1080',
                  decoration: const InputDecoration(
                    labelText: 'Default Quality',
                    border: OutlineInputBorder(),
                  ),
                  dropdownColor: t.surface,
                  items: const ['1080', '720', '480', '360']
                      .map((q) => DropdownMenuItem(value: q, child: Text('${q}p')))
                      .toList(),
                  onChanged: _savingPrefs
                      ? null
                      : (v) async {
                          if (v == null) return;
                          setState(() => _savingPrefs = true);
                          await auth.updateProfile(preferredQuality: v);
                          if (mounted) setState(() => _savingPrefs = false);
                        },
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 16),
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
              Text('Backend Server Connection',
                  style: t.headingFont(TextStyle(fontSize: 20, color: t.text))),
              const SizedBox(height: 4),
              Text(
                'Connects to your Vercel deployment API (/api/fx/* and /api/local/*).',
                style: TextStyle(color: t.mutedText, fontSize: 12),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _apiUrlCtrl,
                style: TextStyle(color: t.text, fontSize: 13),
                decoration: const InputDecoration(
                  labelText: 'Vercel API Base URL',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: () async {
                  await auth.setApiBaseUrl(_apiUrlCtrl.text);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Backend URL updated to ${auth.apiBaseUrl}')),
                    );
                  }
                },
                child: const Text('Save Server URL'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
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
                  Text('App Updates',
                      style: t.headingFont(TextStyle(fontSize: 20, color: t.text))),
                  Text(
                    'v$versionLabel',
                    style: TextStyle(color: t.mutedText, fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                switch (upd.stage) {
                  UpdateStage.checking => 'Checking for new release…',
                  UpdateStage.available ||
                  UpdateStage.playStorePrompt =>
                    'Update available: v${upd.manifest?.latestVersion ?? upd.playInfo?.availableVersionCode ?? ''}',
                  UpdateStage.downloading =>
                    'Downloading update (${(upd.downloadProgress * 100).round()}%)…',
                  UpdateStage.verifying => 'Verifying APK signature & SHA-256…',
                  UpdateStage.upToDate => 'You are on the latest version.',
                  UpdateStage.error => upd.errorMessage ?? 'Update check failed.',
                  _ => upd.isPlayStoreBuild
                      ? 'Managed via Google Play In-App Updates & LUPIN MOVIES manifest.'
                      : 'Automatic verification checks over HTTPS with SHA-256 & signature validation.',
                },
                style: TextStyle(
                  color: upd.stage == UpdateStage.error ? const Color(0xFFEF4444) : t.mutedText,
                  fontSize: 12.5,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  OutlinedButton.icon(
                    onPressed: upd.stage == UpdateStage.checking
                        ? null
                        : () => upd.checkForUpdates(manual: true),
                    icon: const Icon(Icons.refresh, size: 17),
                    label: const Text('Check for Updates'),
                  ),
                  if (upd.stage == UpdateStage.available ||
                      upd.stage == UpdateStage.playStorePrompt ||
                      upd.stage == UpdateStage.awaitingPermission ||
                      upd.stage == UpdateStage.readyToInstall)
                    ElevatedButton.icon(
                      onPressed: () => showLupinUpdateDialog(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: t.accent,
                        foregroundColor: t.onAccent,
                      ),
                      icon: const Icon(Icons.system_update_rounded, size: 17),
                      label: const Text('View Update'),
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Card(
          color: t.surface,
          child: Column(
            children: [
              ListTile(
                leading: Icon(Icons.download_for_offline_outlined, color: t.accent),
                title: Text('Offline Downloads', style: TextStyle(color: t.text)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => widget.onNavigateSection(AppSection.downloads),
              ),
              Divider(height: 1, color: t.border),
              ListTile(
                leading: Icon(Icons.support_agent, color: t.accent),
                title: Text('Support Center', style: TextStyle(color: t.text)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => widget.onNavigateSection(AppSection.support),
              ),
              Divider(height: 1, color: t.border),
              ListTile(
                leading: Icon(Icons.person_outline, color: t.accent),
                title: Text('About Lupin Starnley', style: TextStyle(color: t.text)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => widget.onNavigateSection(AppSection.about),
              ),
              Divider(height: 1, color: t.border),
              ListTile(
                leading: Icon(Icons.mail_outline, color: t.accent),
                title: Text('Contact Us', style: TextStyle(color: t.text)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => widget.onNavigateSection(AppSection.contact),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: Text(
            'LUPIN MOVIES v$versionLabel',
            style: TextStyle(color: t.mutedText, fontSize: 12),
          ),
        ),
      ],
    );
  }
}
