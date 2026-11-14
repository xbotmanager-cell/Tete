import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/edition_themes.dart';

Future<void> showAuthModalSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const _AuthModalSheet(),
  );
}

class _AuthModalSheet extends StatefulWidget {
  const _AuthModalSheet();

  @override
  State<_AuthModalSheet> createState() => _AuthModalSheetState();
}

class _AuthModalSheetState extends State<_AuthModalSheet> {
  bool _isRegister = false;
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      if (_isRegister) {
        await auth.register(_emailCtrl.text, _passwordCtrl.text, _nameCtrl.text);
      } else {
        await auth.login(_emailCtrl.text, _passwordCtrl.text);
      }
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: BoxDecoration(
          color: t.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          border: Border(top: BorderSide(color: t.border)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isRegister ? 'Create LUPIN MOVIES Account' : 'Sign In to LUPIN MOVIES',
                  style: t.headingFont(TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: t.text,
                  )),
                ),
                const SizedBox(height: 4),
                Text(
                  'Sync your watchlist, continue watching, reading progress, and edition across web and mobile.',
                  style: TextStyle(fontSize: 12.5, color: t.mutedText),
                ),
                const SizedBox(height: 16),
                if (_isRegister) ...[
                  TextField(
                    controller: _nameCtrl,
                    style: TextStyle(color: t.text),
                    decoration: InputDecoration(
                      labelText: 'Display Name',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(t.buttonRadius),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  style: TextStyle(color: t.text),
                  decoration: InputDecoration(
                    labelText: 'Email Address',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(t.buttonRadius),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _passwordCtrl,
                  obscureText: true,
                  style: TextStyle(color: t.text),
                  decoration: InputDecoration(
                    labelText: 'Password (min 8 chars)',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(t.buttonRadius),
                    ),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _error!,
                    style: const TextStyle(color: Colors.redAccent, fontSize: 12.5),
                  ),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: t.accent,
                      foregroundColor: t.onAccent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(t.buttonRadius),
                      ),
                    ),
                    child: _submitting
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: t.onAccent,
                            ),
                          )
                        : Text(
                            _isRegister ? 'Create Account' : 'Sign In',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                  ),
                ),
                const SizedBox(height: 10),
                Center(
                  child: TextButton(
                    onPressed: () => setState(() {
                      _isRegister = !_isRegister;
                      _error = null;
                    }),
                    child: Text(
                      _isRegister
                          ? 'Already have an account? Sign In'
                          : 'New to LUPIN MOVIES? Create an Account',
                      style: TextStyle(color: t.accent),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
