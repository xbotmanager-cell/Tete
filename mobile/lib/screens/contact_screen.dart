import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/app_config.dart';
import '../providers/auth_provider.dart';
import '../theme/edition_themes.dart';

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _subjectCtrl = TextEditingController();
  final _messageCtrl = TextEditingController();

  String? _validationError;
  Uri? _gmailUri;
  Uri? _mailtoUri;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    if (user != null) {
      _nameCtrl.text = user.name;
      _emailCtrl.text = user.email;
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _subjectCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  static Uri buildGmailComposeUri({
    required String name,
    required String email,
    required String subject,
    required String message,
  }) {
    final formattedBody = [
      'Name: $name',
      'Email: $email',
      '',
      'Message:',
      message,
    ].join('\n');

    return Uri.https('mail.google.com', '/mail/', {
      'view': 'cm',
      'fs': '1',
      'to': AppConfig.supportEmail,
      'su': subject,
      'body': formattedBody,
    });
  }

  static Uri buildMailtoUri({
    required String name,
    required String email,
    required String subject,
    required String message,
  }) {
    final formattedBody = [
      'Name: $name',
      'Email: $email',
      '',
      'Message:',
      message,
    ].join('\n');

    return Uri(
      scheme: 'mailto',
      path: AppConfig.supportEmail,
      query: 'subject=${Uri.encodeComponent(subject)}&body=${Uri.encodeComponent(formattedBody)}',
    );
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    final email = _emailCtrl.text.trim();
    final subject = _subjectCtrl.text.trim();
    final message = _messageCtrl.text.trim();

    if (name.length < 2) {
      setState(() => _validationError = 'Please enter your name (at least 2 characters).');
      return;
    }
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      setState(() => _validationError = 'Please enter a valid email address.');
      return;
    }
    if (subject.length < 3) {
      setState(() => _validationError = 'Please enter a subject (at least 3 characters).');
      return;
    }
    if (message.length < 10) {
      setState(() => _validationError = 'Please enter a message (at least 10 characters).');
      return;
    }

    final gmail = buildGmailComposeUri(
      name: name,
      email: email,
      subject: subject,
      message: message,
    );
    final mailto = buildMailtoUri(
      name: name,
      email: email,
      subject: subject,
      message: message,
    );

    setState(() {
      _validationError = null;
      _gmailUri = gmail;
      _mailtoUri = mailto;
    });

    final openedGmail = await launchUrl(gmail, mode: LaunchMode.externalApplication);
    if (!openedGmail) {
      await launchUrl(mailto, mode: LaunchMode.externalApplication);
    }
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
              Text('Contact Us',
                  style: t.headingFont(TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w700,
                    color: t.text,
                  ))),
              const SizedBox(height: 6),
              Text(
                'Reach creator Lupin Starnley via WhatsApp Support, Official WhatsApp Channel, or compose a pre-filled email in Gmail.',
                style: TextStyle(color: t.mutedText, fontSize: 13.5, height: 1.45),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  OutlinedButton.icon(
                    onPressed: () => launchUrl(
                      Uri.parse(AppConfig.whatsappSupportUrl),
                      mode: LaunchMode.externalApplication,
                    ),
                    icon: const Icon(Icons.chat_outlined, size: 17),
                    label: const Text('WhatsApp Support'),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => launchUrl(
                      Uri.parse(AppConfig.whatsappChannelUrl),
                      mode: LaunchMode.externalApplication,
                    ),
                    icon: const Icon(Icons.campaign_outlined, size: 17),
                    label: const Text('Official Channel'),
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
              Text('Send a Message',
                  style: t.headingFont(TextStyle(fontSize: 22, color: t.text))),
              const SizedBox(height: 4),
              Text(
                'Opens Gmail (or your default email app) addressed to ${AppConfig.supportEmail}.',
                style: TextStyle(color: t.mutedText, fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _nameCtrl,
                style: TextStyle(color: t.text),
                decoration: const InputDecoration(
                  labelText: 'Name',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                style: TextStyle(color: t.text),
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _subjectCtrl,
                style: TextStyle(color: t.text),
                decoration: const InputDecoration(
                  labelText: 'Subject',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _messageCtrl,
                maxLines: 4,
                style: TextStyle(color: t.text),
                decoration: const InputDecoration(
                  labelText: 'Message',
                  border: OutlineInputBorder(),
                ),
              ),
              if (_validationError != null) ...[
                const SizedBox(height: 12),
                Text(_validationError!,
                    style: const TextStyle(color: Colors.redAccent, fontSize: 12.5)),
              ],
              if (_gmailUri != null && _mailtoUri != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.lightBlue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.lightBlue.withOpacity(0.45)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your email application has opened with your message pre-filled for ${AppConfig.supportEmail}. Please review the details and press Send.',
                        style: TextStyle(color: t.text, fontSize: 12.5, height: 1.4),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ElevatedButton(
                            onPressed: () => launchUrl(
                              _gmailUri!,
                              mode: LaunchMode.externalApplication,
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: t.accent,
                              foregroundColor: t.onAccent,
                            ),
                            child: const Text('Open in Gmail'),
                          ),
                          OutlinedButton(
                            onPressed: () => launchUrl(
                              _mailtoUri!,
                              mode: LaunchMode.externalApplication,
                            ),
                            child: const Text('Open Default Email App'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: t.accent,
                    foregroundColor: t.onAccent,
                  ),
                  icon: const Icon(Icons.send),
                  label: const Text('Compose in Gmail',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
