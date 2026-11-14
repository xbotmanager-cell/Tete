import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../screens/about_creator_screen.dart';
import '../screens/anime_screen.dart';
import '../screens/contact_screen.dart';
import '../screens/discover_screen.dart';
import '../screens/home_screen.dart';
import '../screens/library_screen.dart';
import '../screens/live_sports_screen.dart';
import '../screens/novels_screen.dart';
import '../screens/profile_settings_screen.dart';
import '../screens/support_center_screen.dart';
import '../theme/edition_themes.dart';
import '../widgets/appearance_sheet.dart';
import '../widgets/auth_sheet.dart';

class LupinShellScreen extends StatefulWidget {
  const LupinShellScreen({super.key});

  @override
  State<LupinShellScreen> createState() => _LupinShellScreenState();
}

class _LupinShellScreenState extends State<LupinShellScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  AppSection _section = AppSection.home;

  void _navigateTo(AppSection target) {
    setState(() => _section = target);
  }

  Widget _buildBody() {
    switch (_section) {
      case AppSection.home:
        return HomeScreen(onNavigateSection: _navigateTo);
      case AppSection.discover:
        return const DiscoverScreen();
      case AppSection.anime:
        return const AnimeScreen();
      case AppSection.liveSports:
        return const LiveSportsScreen();
      case AppSection.novels:
        return const NovelsScreen();
      case AppSection.library:
        return const LibraryScreen();
      case AppSection.support:
        return SupportCenterScreen(onNavigateSection: _navigateTo);
      case AppSection.about:
        return AboutCreatorScreen(onNavigateSection: _navigateTo);
      case AppSection.contact:
        return const ContactScreen();
      case AppSection.settings:
        return ProfileSettingsScreen(onNavigateSection: _navigateTo);
    }
  }

  String _sectionTitle(AppSection sec) {
    return switch (sec) {
      AppSection.home => 'LUPIN MOVIES',
      AppSection.discover => 'Discover & Search',
      AppSection.anime => 'Anime Center',
      AppSection.liveSports => 'Live TV & Sports',
      AppSection.novels => 'Novel Library',
      AppSection.library => 'My Library',
      AppSection.support => 'Support Center',
      AppSection.about => 'About Creator',
      AppSection.contact => 'Contact Us',
      AppSection.settings => 'Profile & Settings',
    };
  }

  int _bottomNavIndex() {
    return switch (_section) {
      AppSection.home => 0,
      AppSection.discover => 1,
      AppSection.anime => 2,
      AppSection.liveSports => 3,
      AppSection.library => 4,
      _ => 0,
    };
  }

  PreferredSizeWidget _buildEditionAppBar(EditionVisualTheme t, AuthProvider auth) {
    final user = auth.user;

    switch (t.mode) {
      case LayoutMode.sidebar:
        return AppBar(
          backgroundColor: t.surface,
          shape: Border(bottom: BorderSide(color: t.border)),
          leading: IconButton(
            icon: Icon(Icons.menu, color: t.text),
            onPressed: () => _scaffoldKey.currentState?.openDrawer(),
          ),
          title: Row(
            children: [
              Text('lupin', style: TextStyle(color: t.mutedText, fontSize: 13)),
              Text(' / ', style: TextStyle(color: t.mutedText, fontSize: 13)),
              Flexible(
                child: Text(
                  _sectionTitle(_section).toLowerCase(),
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: t.accent, fontWeight: FontWeight.w700, fontSize: 13.5),
                ),
              ),
            ],
          ),
          actions: [
            IconButton(
              tooltip: 'Switch Edition',
              icon: Icon(Icons.palette_outlined, color: t.text),
              onPressed: () => showAppearanceSwitcherSheet(context),
            ),
            IconButton(
              tooltip: user != null ? user.name : 'Sign In',
              icon: Icon(
                user != null ? Icons.account_circle : Icons.login,
                color: t.accent,
              ),
              onPressed: () => _navigateTo(AppSection.settings),
            ),
          ],
        );

      case LayoutMode.editorial:
        return AppBar(
          backgroundColor: t.background,
          shape: Border(bottom: BorderSide(color: t.text, width: 1.5)),
          leading: IconButton(
            icon: Icon(Icons.menu_book, color: t.text),
            onPressed: () => _scaffoldKey.currentState?.openDrawer(),
          ),
          centerTitle: true,
          title: Text(
            'THE LUPIN DISPATCH',
            style: t.headingFont(TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w700,
              color: t.text,
              letterSpacing: 1.1,
            )),
          ),
          actions: [
            IconButton(
              icon: Icon(Icons.palette_outlined, color: t.accent),
              onPressed: () => showAppearanceSwitcherSheet(context),
            ),
          ],
        );

      case LayoutMode.neon:
        return AppBar(
          backgroundColor: t.background,
          shape: Border(bottom: BorderSide(color: t.accent.withOpacity(0.5))),
          leading: IconButton(
            icon: Icon(Icons.bolt, color: t.accent),
            onPressed: () => _scaffoldKey.currentState?.openDrawer(),
          ),
          title: Text(
            'LUPIN // NEON',
            style: t.headingFont(TextStyle(
              fontSize: 24,
              letterSpacing: 1.5,
              color: t.accent,
            )),
          ),
          actions: [
            IconButton(
              icon: Icon(Icons.palette_outlined, color: t.secondaryAccent),
              onPressed: () => showAppearanceSwitcherSheet(context),
            ),
            IconButton(
              icon: Icon(Icons.settings_outlined, color: t.text),
              onPressed: () => _navigateTo(AppSection.settings),
            ),
          ],
        );

      case LayoutMode.minimalist:
        return AppBar(
          backgroundColor: t.background,
          shape: Border(bottom: BorderSide(color: t.border)),
          leading: IconButton(
            icon: Icon(Icons.segment, color: t.text),
            onPressed: () => _scaffoldKey.currentState?.openDrawer(),
          ),
          title: Text(
            'LUPIN MOVIES',
            style: t.headingFont(TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: t.text,
              letterSpacing: 0.4,
            )),
          ),
          actions: [
            IconButton(
              icon: Icon(Icons.palette_outlined, color: t.accent),
              onPressed: () => showAppearanceSwitcherSheet(context),
            ),
            IconButton(
              icon: Icon(Icons.person_outline, color: t.text),
              onPressed: () => _navigateTo(AppSection.settings),
            ),
          ],
        );

      case LayoutMode.classic:
        return AppBar(
          backgroundColor: t.surface,
          shape: Border(bottom: BorderSide(color: t.border)),
          leading: IconButton(
            icon: Icon(Icons.menu, color: t.accent),
            onPressed: () => _scaffoldKey.currentState?.openDrawer(),
          ),
          title: Text(
            'Lupin Salon Cinema',
            style: t.headingFont(TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: t.accent,
            )),
          ),
          actions: [
            IconButton(
              icon: Icon(Icons.palette_outlined, color: t.accent),
              onPressed: () => showAppearanceSwitcherSheet(context),
            ),
            IconButton(
              icon: Icon(Icons.person_outline, color: t.text),
              onPressed: () => _navigateTo(AppSection.settings),
            ),
          ],
        );

      case LayoutMode.cinematic:
        return AppBar(
          backgroundColor: t.background,
          leading: IconButton(
            icon: Icon(Icons.menu, color: t.text),
            onPressed: () => _scaffoldKey.currentState?.openDrawer(),
          ),
          title: Text(
            'LUPIN MOVIES',
            style: t.headingFont(TextStyle(
              fontSize: 26,
              letterSpacing: 1.8,
              color: t.accent,
            )),
          ),
          actions: [
            IconButton(
              tooltip: 'Search & Discover',
              icon: Icon(Icons.search, color: t.text),
              onPressed: () => _navigateTo(AppSection.discover),
            ),
            IconButton(
              tooltip: 'Editions',
              icon: Icon(Icons.palette_outlined, color: t.text),
              onPressed: () => showAppearanceSwitcherSheet(context),
            ),
            IconButton(
              tooltip: user != null ? user.name : 'Account',
              icon: Icon(
                user != null ? Icons.person : Icons.person_outline,
                color: user != null ? t.accent : t.text,
              ),
              onPressed: () {
                if (user == null) {
                  showAuthModalSheet(context);
                } else {
                  _navigateTo(AppSection.settings);
                }
              },
            ),
          ],
        );
    }
  }

  Widget _buildDrawer(EditionVisualTheme t, AuthProvider auth) {
    final entries = const [
      (AppSection.home, 'Home', Icons.home_outlined),
      (AppSection.discover, 'Movies & Series', Icons.movie_outlined),
      (AppSection.anime, 'Anime Center', Icons.auto_awesome_outlined),
      (AppSection.liveSports, 'Live TV, Sports & Wrestling', Icons.live_tv_outlined),
      (AppSection.novels, 'Novel Library', Icons.menu_book_outlined),
      (AppSection.library, 'My Library', Icons.bookmark_outline),
      (AppSection.support, 'Support Center', Icons.support_agent_outlined),
      (AppSection.about, 'About Lupin Starnley', Icons.person_outline),
      (AppSection.contact, 'Contact Us', Icons.mail_outline),
      (AppSection.settings, 'Profile & Settings', Icons.settings_outlined),
    ];

    return Drawer(
      backgroundColor: t.surface,
      child: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: t.border)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'LUPIN MOVIES',
                    style: t.headingFont(TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                      color: t.accent,
                    )),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    auth.layoutMode.label,
                    style: TextStyle(color: t.mutedText, fontSize: 12),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                children: entries.map((e) {
                  final active = _section == e.$1;
                  return ListTile(
                    selected: active,
                    selectedTileColor: t.accent.withOpacity(0.12),
                    leading: Icon(e.$3, color: active ? t.accent : t.mutedText),
                    title: Text(
                      e.$2,
                      style: TextStyle(
                        color: active ? t.accent : t.text,
                        fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                        fontSize: 14,
                      ),
                    ),
                    onTap: () {
                      Navigator.of(context).pop();
                      _navigateTo(e.$1);
                    },
                  );
                }).toList(),
              ),
            ),
            Divider(height: 1, color: t.border),
            ListTile(
              leading: Icon(Icons.palette_outlined, color: t.accent),
              title: Text('Switch Website Edition', style: TextStyle(color: t.text)),
              onTap: () {
                Navigator.of(context).pop();
                showAppearanceSwitcherSheet(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final t = getEditionVisualTheme(auth.layoutMode);

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: t.background,
      appBar: _buildEditionAppBar(t, auth),
      drawer: _buildDrawer(t, auth),
      body: _buildBody(),
      bottomNavigationBar: auth.layoutMode == LayoutMode.sidebar
          ? null // Sidebar edition uses its workspace drawer navigation cleanly
          : NavigationBar(
              backgroundColor: t.surface,
              indicatorColor: t.accent.withOpacity(0.18),
              selectedIndex: _bottomNavIndex(),
              onDestinationSelected: (idx) {
                const map = [
                  AppSection.home,
                  AppSection.discover,
                  AppSection.anime,
                  AppSection.liveSports,
                  AppSection.library,
                ];
                _navigateTo(map[idx]);
              },
              destinations: [
                NavigationDestination(
                  icon: Icon(Icons.home_outlined, color: t.mutedText),
                  selectedIcon: Icon(Icons.home, color: t.accent),
                  label: 'Home',
                ),
                NavigationDestination(
                  icon: Icon(Icons.explore_outlined, color: t.mutedText),
                  selectedIcon: Icon(Icons.explore, color: t.accent),
                  label: 'Discover',
                ),
                NavigationDestination(
                  icon: Icon(Icons.auto_awesome_outlined, color: t.mutedText),
                  selectedIcon: Icon(Icons.auto_awesome, color: t.accent),
                  label: 'Anime',
                ),
                NavigationDestination(
                  icon: Icon(Icons.live_tv_outlined, color: t.mutedText),
                  selectedIcon: Icon(Icons.live_tv, color: t.accent),
                  label: 'Live',
                ),
                NavigationDestination(
                  icon: Icon(Icons.bookmark_outline, color: t.mutedText),
                  selectedIcon: Icon(Icons.bookmark, color: t.accent),
                  label: 'Library',
                ),
              ],
            ),
    );
  }
}
