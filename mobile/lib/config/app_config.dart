class AppConfig {
  /// Default Vercel/production API base URL.
  /// Override at build time with:
  ///   flutter build apk --dart-define=API_BASE_URL=https://your-vercel-domain.vercel.app
  /// Or adjust inside Profile & Settings -> Backend Server URL at runtime.
  static const String defaultApiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://ais-pre-n3i22csvzas34xba3x2pvl-986205634764.europe-west2.run.app',
  );

  /// Optional override URL for direct-APK / CI release update manifest JSON.
  /// When empty, defaults to "<apiBaseUrl>/api/local/app-update".
  static const String defaultUpdateManifestUrl = String.fromEnvironment(
    'UPDATE_MANIFEST_URL',
    defaultValue: '',
  );

  static const String appName = 'LUPIN MOVIES';
  static const String bundleId = 'com.lupinmovies.app';
  static const String defaultVersionName = '1.0.0';
  static const int defaultVersionCode = 1;

  // Official Creator & Support Channels
  static const String creatorName = 'Lupin Starnley';
  static const String supportEmail = 'lupinstarnley009@gmail.com';
  static const String whatsappSupportUrl = 'https://wa.me/255780470905';
  static const String whatsappSupportDisplay = '+255 780 470 905';
  static const String whatsappChannelUrl =
      'https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0';

  // Local fallback showcase assets bundled with the app
  static const String assetLogo = 'assets/images/splash_logo.png';
  static const String assetCinemaHero = 'assets/images/cinema_hero.jpg';
  static const String assetAnimeShowcase = 'assets/images/anime_showcase.jpg';
  static const String assetSportsArena = 'assets/images/sports_arena.jpg';
  static const String assetNovelCover = 'assets/images/novel_cover.jpg';
}
