import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/app_config.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../theme/edition_themes.dart';

class SupportCenterScreen extends StatelessWidget {
  final ValueChanged<AppSection> onNavigateSection;

  const SupportCenterScreen({super.key, required this.onNavigateSection});

  Future<void> _launchExternal(String url) async {
    final uri = Uri.parse(url);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: t.surface,
            borderRadius: BorderRadius.circular(t.cardRadius),
            border: Border.all(color: t.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Support Center',
                  style: t.headingFont(TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w700,
                    color: t.text,
                  ))),
              const SizedBox(height: 6),
              Text(
                'Direct assistance for streaming playback, account sync, and official announcements.',
                style: TextStyle(color: t.mutedText, fontSize: 13.5, height: 1.45),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Card(
          color: t.surface,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('WhatsApp Support',
                    style: t.headingFont(TextStyle(fontSize: 20, color: t.text))),
                const SizedBox(height: 4),
                Text(AppConfig.whatsappSupportDisplay,
                    style: TextStyle(color: t.accent, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _launchExternal(AppConfig.whatsappSupportUrl),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: t.accent,
                      foregroundColor: t.onAccent,
                    ),
                    icon: const Icon(Icons.chat_outlined),
                    label: const Text('Open WhatsApp Support'),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        Card(
          color: t.surface,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Official WhatsApp Channel',
                    style: t.headingFont(TextStyle(fontSize: 20, color: t.text))),
                const SizedBox(height: 4),
                Text(
                  'Follow platform updates and newly indexed releases.',
                  style: TextStyle(color: t.mutedText, fontSize: 12.5),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _launchExternal(AppConfig.whatsappChannelUrl),
                    icon: const Icon(Icons.campaign_outlined),
                    label: const Text('Join WhatsApp Channel'),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        Card(
          color: t.surface,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Email & Contact Form',
                    style: t.headingFont(TextStyle(fontSize: 20, color: t.text))),
                const SizedBox(height: 4),
                Text(AppConfig.supportEmail, style: TextStyle(color: t.mutedText, fontSize: 13)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _launchExternal('mailto:${AppConfig.supportEmail}'),
                        child: const Text('Send Email'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => onNavigateSection(AppSection.contact),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: t.accent,
                          foregroundColor: t.onAccent,
                        ),
                        child: const Text('Contact Page'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        for (final faq in const [
          (
            'Why do signed links refresh automatically?',
            'FRAMEX playback URLs expire after 10 minutes. LUPIN MOVIES proactively refreshes the stream link before expiration at your current timestamp.'
          ),
          (
            'How do I switch between the 6 Editions?',
            'Open Profile & Settings or the Appearance palette icon in any screen to switch instantly between Cinematic, Classic, Sidebar, Editorial, Neon, and Minimalist.'
          ),
          (
            'Are MovieBox and Showbox playback handled differently?',
            'Yes. MovieBox streams directly with quality, audio language, and WebVTT/SRT captions, while Showbox discovery titles route via /api/fx/proxy/sources.'
          ),
        ])
          ExpansionTile(
            title: Text(faq.$1,
                style: TextStyle(color: t.text, fontWeight: FontWeight.w600, fontSize: 13.5)),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                child: Text(faq.$2, style: TextStyle(color: t.mutedText, fontSize: 12.5)),
              ),
            ],
          ),
      ],
    );
  }
}
