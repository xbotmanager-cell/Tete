import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'config/app_config.dart';
import 'providers/auth_provider.dart';
import 'providers/catalog_provider.dart';
import 'providers/download_provider.dart';
import 'providers/update_provider.dart';
import 'screens/shell_screen.dart';
import 'theme/edition_themes.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LupinMoviesApp());
}

class LupinMoviesApp extends StatefulWidget {
  final bool skipInit;

  const LupinMoviesApp({super.key, this.skipInit = false});

  @override
  State<LupinMoviesApp> createState() => _LupinMoviesAppState();
}

class _LupinMoviesAppState extends State<LupinMoviesApp> {
  late final AuthProvider _authProvider;
  late final CatalogProvider _catalogProvider;
  late final DownloadProvider _downloadProvider;
  late final UpdateProvider _updateProvider;

  @override
  void initState() {
    super.initState();
    _authProvider = AuthProvider();
    _catalogProvider = CatalogProvider(_authProvider.apiClient);
    _downloadProvider = DownloadProvider(_authProvider.apiClient);
    _updateProvider = UpdateProvider(_authProvider.apiClient);
    if (!widget.skipInit) {
      _bootstrap();
    }
  }

  Future<void> _bootstrap() async {
    await _authProvider.initialize();
    _catalogProvider.loadAll();
    unawaited(_downloadProvider.initialize());
    unawaited(_updateProvider.initialize());
  }

  @override
  void dispose() {
    _downloadProvider.dispose();
    _updateProvider.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _authProvider),
        ChangeNotifierProvider.value(value: _catalogProvider),
        ChangeNotifierProvider.value(value: _downloadProvider),
        ChangeNotifierProvider.value(value: _updateProvider),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          final editionTheme = getEditionVisualTheme(auth.layoutMode);
          return AnnotatedRegion<SystemUiOverlayStyle>(
            value: editionTheme.overlayStyle,
            child: MaterialApp(
              title: AppConfig.appName,
              debugShowCheckedModeBanner: false,
              theme: editionTheme.toMaterialTheme(),
              home: auth.loading && !widget.skipInit
                  ? _SplashScreen(theme: editionTheme)
                  : const LupinShellScreen(),
            ),
          );
        },
      ),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  final EditionVisualTheme theme;

  const _SplashScreen({required this.theme});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF040404),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Image.asset(
                AppConfig.assetLogo,
                width: 112,
                height: 112,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'LUPIN MOVIES',
              style: theme.headingFont(const TextStyle(
                fontSize: 34,
                letterSpacing: 3,
                color: Colors.white,
              )),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: theme.accent,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
