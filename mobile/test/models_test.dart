import 'package:flutter_test/flutter_test.dart';
import 'package:lupin_movies/models/framex_models.dart';
import 'package:lupin_movies/services/subtitle_parser.dart';

void main() {
  group('LayoutMode defaults & parsing', () {
    test('defaults to cinematic for null or unknown values', () {
      expect(LayoutMode.fromKey(null), LayoutMode.cinematic);
      expect(LayoutMode.fromKey('unknown'), LayoutMode.cinematic);
      expect(LayoutMode.fromKey('editorial'), LayoutMode.editorial);
      expect(LayoutMode.fromKey('minimalist'), LayoutMode.minimalist);
      expect(LayoutMode.values.length, 6);
    });
  });

  group('FRAMEX MediaItem & MediaDetail normalization', () {
    test('normalizes MovieBox and Showbox raw maps safely', () {
      final item = MediaItem.fromRaw({
        'subjectId': '12345',
        'detailPath': 'inception-2010',
        'title': 'Inception',
        'type': 'movie',
        'imdbRatingValue': '8.8',
        'genres': ['Sci-Fi', 'Thriller'],
      });
      expect(item.id, '12345');
      expect(item.slug, 'inception-2010');
      expect(item.rating, '8.8');
      expect(item.type, 'movie');
      expect(item.genres, ['Sci-Fi', 'Thriller']);
    });

    test('normalizes seasons and episodes', () {
      final detail = MediaDetail.fromPayload({
        'data': {
          'subjectId': '999',
          'title': 'Series Test',
          'type': 'series',
          'seasons': [
            {'se': 1, 'maxEp': 3},
          ],
        }
      });
      expect(detail.seasons.length, 1);
      expect(detail.seasons.first.episodes.length, 3);
      expect(detail.seasons.first.episodes[2].episode, 3);
    });
  });

  group('SubtitleParser', () {
    test('parses SRT timestamps and finds active cue', () {
      const srt = '''
1
00:00:01,500 --> 00:00:04,000
Hello world

2
00:00:05,000 --> 00:00:08,000
Second cue
''';
      final cues = SubtitleParser.parse(srt);
      expect(cues.length, 2);
      expect(SubtitleParser.activeTextAt(cues, const Duration(seconds: 2)), 'Hello world');
      expect(SubtitleParser.activeTextAt(cues, const Duration(seconds: 6)), 'Second cue');
      expect(SubtitleParser.activeTextAt(cues, const Duration(seconds: 10)), isNull);
    });
  });
}
