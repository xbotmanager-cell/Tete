import 'package:flutter_test/flutter_test.dart';
import 'package:lupin_movies/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('LupinMoviesApp boots cleanly into Cinematic Edition shell', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const LupinMoviesApp(skipInit: true));
    await tester.pump();

    expect(find.text('LUPIN MOVIES'), findsWidgets);
  });
}
