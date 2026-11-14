import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/framex_models.dart';

class EditionVisualTheme {
  final LayoutMode mode;
  final Brightness brightness;
  final Color background;
  final Color surface;
  final Color elevatedSurface;
  final Color border;
  final Color text;
  final Color mutedText;
  final Color accent;
  final Color secondaryAccent;
  final Color onAccent;
  final double cardRadius;
  final double buttonRadius;
  final TextStyle Function(TextStyle) headingFont;
  final TextStyle Function(TextStyle) bodyFont;
  final SystemUiOverlayStyle overlayStyle;

  const EditionVisualTheme({
    required this.mode,
    required this.brightness,
    required this.background,
    required this.surface,
    required this.elevatedSurface,
    required this.border,
    required this.text,
    required this.mutedText,
    required this.accent,
    required this.secondaryAccent,
    required this.onAccent,
    required this.cardRadius,
    required this.buttonRadius,
    required this.headingFont,
    required this.bodyFont,
    required this.overlayStyle,
  });

  bool get isLight => brightness == Brightness.light;

  ThemeData toMaterialTheme() {
    final scheme = ColorScheme(
      brightness: brightness,
      primary: accent,
      onPrimary: onAccent,
      secondary: secondaryAccent,
      onSecondary: onAccent,
      error: const Color(0xFFEF4444),
      onError: Colors.white,
      surface: surface,
      onSurface: text,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      canvasColor: background,
      dividerColor: border,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: text,
        elevation: 0,
        systemOverlayStyle: overlayStyle,
      ),
      textTheme: TextTheme(
        displayLarge: headingFont(TextStyle(color: text, fontWeight: FontWeight.w700)),
        headlineMedium: headingFont(TextStyle(color: text, fontWeight: FontWeight.w700)),
        titleLarge: headingFont(TextStyle(color: text, fontWeight: FontWeight.w600)),
        bodyLarge: bodyFont(TextStyle(color: text)),
        bodyMedium: bodyFont(TextStyle(color: text)),
        bodySmall: bodyFont(TextStyle(color: mutedText)),
      ),
    );
  }
}

EditionVisualTheme getEditionVisualTheme(LayoutMode mode) {
  switch (mode) {
    case LayoutMode.cinematic:
      return EditionVisualTheme(
        mode: mode,
        brightness: Brightness.dark,
        background: const Color(0xFF040404),
        surface: const Color(0xFF0E0E10),
        elevatedSurface: const Color(0xFF17171B),
        border: const Color(0x26FFFFFF),
        text: const Color(0xFFF9FAFB),
        mutedText: const Color(0xFFA1A1AA),
        accent: const Color(0xFFE50914),
        secondaryAccent: const Color(0xFFF59E0B),
        onAccent: Colors.white,
        cardRadius: 8,
        buttonRadius: 6,
        headingFont: GoogleFonts.bebasNeue,
        bodyFont: GoogleFonts.inter,
        overlayStyle: SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: const Color(0xFF040404),
        ),
      );

    case LayoutMode.classic:
      return EditionVisualTheme(
        mode: mode,
        brightness: Brightness.dark,
        background: const Color(0xFF0C0407),
        surface: const Color(0xFF1A0910),
        elevatedSurface: const Color(0xFF260D17),
        border: const Color(0x38D4AF37),
        text: const Color(0xFFFDF2F4),
        mutedText: const Color(0xFFD6B4BD),
        accent: const Color(0xFFD4AF37),
        secondaryAccent: const Color(0xFFE11D48),
        onAccent: const Color(0xFF14050A),
        cardRadius: 16,
        buttonRadius: 24,
        headingFont: GoogleFonts.cormorantGaramond,
        bodyFont: GoogleFonts.plusJakartaSans,
        overlayStyle: SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: const Color(0xFF0C0407),
        ),
      );

    case LayoutMode.sidebar:
      return EditionVisualTheme(
        mode: mode,
        brightness: Brightness.dark,
        background: const Color(0xFF09090B),
        surface: const Color(0xFF111114),
        elevatedSurface: const Color(0xFF18181B),
        border: const Color(0xFF27272A),
        text: const Color(0xFFFAFAFA),
        mutedText: const Color(0xFFA1A1AA),
        accent: const Color(0xFF06B6D4),
        secondaryAccent: const Color(0xFF22D3EE),
        onAccent: const Color(0xFF041418),
        cardRadius: 10,
        buttonRadius: 8,
        headingFont: GoogleFonts.spaceGrotesk,
        bodyFont: GoogleFonts.inter,
        overlayStyle: SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: const Color(0xFF09090B),
        ),
      );

    case LayoutMode.editorial:
      return EditionVisualTheme(
        mode: mode,
        brightness: Brightness.light,
        background: const Color(0xFFF7F4EE),
        surface: const Color(0xFFFFFFFF),
        elevatedSurface: const Color(0xFFEFEAE0),
        border: const Color(0xFFD6CEC0),
        text: const Color(0xFF1C1917),
        mutedText: const Color(0xFF57534E),
        accent: const Color(0xFF9A3412),
        secondaryAccent: const Color(0xFF78350F),
        onAccent: Colors.white,
        cardRadius: 4,
        buttonRadius: 4,
        headingFont: GoogleFonts.playfairDisplay,
        bodyFont: GoogleFonts.sourceSerif4,
        overlayStyle: SystemUiOverlayStyle.dark.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: const Color(0xFFF7F4EE),
        ),
      );

    case LayoutMode.neon:
      return EditionVisualTheme(
        mode: mode,
        brightness: Brightness.dark,
        background: const Color(0xFF03050D),
        surface: const Color(0xFF090F24),
        elevatedSurface: const Color(0xFF101938),
        border: const Color(0x6600F0FF),
        text: const Color(0xFFEAF6FF),
        mutedText: const Color(0xFF94A3B8),
        accent: const Color(0xFF00F0FF),
        secondaryAccent: const Color(0xFFFF2BD6),
        onAccent: const Color(0xFF021218),
        cardRadius: 12,
        buttonRadius: 6,
        headingFont: GoogleFonts.barlowCondensed,
        bodyFont: GoogleFonts.inter,
        overlayStyle: SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: const Color(0xFF03050D),
        ),
      );

    case LayoutMode.minimalist:
      return EditionVisualTheme(
        mode: mode,
        brightness: Brightness.light,
        background: const Color(0xFFFFFFFF),
        surface: const Color(0xFFFAFAFA),
        elevatedSurface: const Color(0xFFF4F4F5),
        border: const Color(0xFFE4E4E7),
        text: const Color(0xFF111111),
        mutedText: const Color(0xFF52525B),
        accent: const Color(0xFF2563EB),
        secondaryAccent: const Color(0xFF111111),
        onAccent: Colors.white,
        cardRadius: 12,
        buttonRadius: 8,
        headingFont: GoogleFonts.dmSans,
        bodyFont: GoogleFonts.dmSans,
        overlayStyle: SystemUiOverlayStyle.dark.copyWith(
          statusBarColor: Colors.transparent,
          systemNavigationBarColor: const Color(0xFFFFFFFF),
        ),
      );
  }
}
