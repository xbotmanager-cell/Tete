import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/framex_models.dart';
import '../providers/auth_provider.dart';
import '../theme/edition_themes.dart';

Future<void> showAppearanceSwitcherSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const _AppearanceSwitcherSheet(),
  );
}

class _AppearanceSwitcherSheet extends StatelessWidget {
  const _AppearanceSwitcherSheet();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final activeTheme = getEditionVisualTheme(auth.layoutMode);

    return Container(
      decoration: BoxDecoration(
        color: activeTheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(top: BorderSide(color: activeTheme.border)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: activeTheme.mutedText.withOpacity(0.35),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Website & App Editions',
              style: activeTheme.headingFont(TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: activeTheme.text,
              )),
            ),
            const SizedBox(height: 4),
            Text(
              'Switch instantly between all six LUPIN MOVIES visual experiences.',
              style: TextStyle(fontSize: 12.5, color: activeTheme.mutedText),
            ),
            const SizedBox(height: 16),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.75,
              children: LayoutMode.values.map((mode) {
                final preview = getEditionVisualTheme(mode);
                final selected = auth.layoutMode == mode;
                return InkWell(
                  onTap: () {
                    auth.setLayoutMode(mode);
                    Navigator.of(context).pop();
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: preview.background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: selected ? preview.accent : preview.border,
                        width: selected ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(
                                    color: preview.accent,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Container(
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(
                                    color: preview.secondaryAccent,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                            ),
                            if (selected)
                              Icon(Icons.check_circle, size: 16, color: preview.accent)
                            else if (mode == LayoutMode.cinematic)
                              Text(
                                'DEFAULT',
                                style: TextStyle(
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w700,
                                  color: preview.mutedText,
                                ),
                              ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              mode.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: preview.headingFont(TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: preview.text,
                              )),
                            ),
                            Text(
                              mode.tagline,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 10, color: preview.mutedText),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
