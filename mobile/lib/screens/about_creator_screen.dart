import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/app_config.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../theme/edition_themes.dart';

class AboutCreatorScreen extends StatelessWidget {
  final ValueChanged<AppSection> onNavigateSection;

  const AboutCreatorScreen({super.key, required this.onNavigateSection});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: t.surface,
            borderRadius: BorderRadius.circular(t.cardRadius),
            border: Border.all(color: t.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                  color: t.elevatedSurface,
                  borderRadius: BorderRadius.circular(t.cardRadius),
                  border: Border.all(color: t.accent),
                ),
                child: Center(
                  child: Text(
                    'LS',
                    style: t.headingFont(TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.w700,
                      color: t.accent,
                    )),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Lupin Starnley',
                style: t.headingFont(TextStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w700,
                  color: t.text,
                )),
              ),
              Text(
                'Creator & Visionary · LUPIN MOVIES',
                style: TextStyle(color: t.accent, fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ElevatedButton.icon(
                    onPressed: () => onNavigateSection(AppSection.contact),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: t.accent,
                      foregroundColor: t.onAccent,
                    ),
                    icon: const Icon(Icons.mail_outline),
                    label: const Text('Contact Lupin Starnley'),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => launchUrl(
                      Uri.parse(AppConfig.whatsappSupportUrl),
                      mode: LaunchMode.externalApplication,
                    ),
                    icon: const Icon(Icons.chat_outlined),
                    label: const Text('WhatsApp Support'),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
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
              Text('Vision & Story',
                  style: t.headingFont(TextStyle(fontSize: 22, color: t.text))),
              const SizedBox(height: 12),
              Text(
                'Lupin Starnley is the creator and visionary behind LUPIN MOVIES, an entertainment platform built to make discovering and enjoying movies and series easier and more accessible.',
                style: TextStyle(color: t.text, fontSize: 14.5, height: 1.6),
              ),
              const SizedBox(height: 12),
              Text(
                'Driven by creativity, technology and a passion for digital experiences, Lupin Starnley aims to build innovative entertainment experiences that bring people closer to the content they love.',
                style: TextStyle(color: t.text, fontSize: 14.5, height: 1.6),
              ),
              const SizedBox(height: 12),
              Text(
                'LUPIN MOVIES represents a vision of modern entertainment, combining technology, creativity and simplicity into one platform.',
                style: TextStyle(color: t.text, fontSize: 14.5, height: 1.6),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
