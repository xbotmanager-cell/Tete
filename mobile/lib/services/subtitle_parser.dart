import '../models/framex_models.dart';

class SubtitleParser {
  static List<SubtitleCue> parse(String rawText) {
    final normalized = rawText.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
    final lines = normalized.split('\n');
    final List<SubtitleCue> cues = [];

    final timeRegex = RegExp(
      r'^(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})',
    );

    int i = 0;
    while (i < lines.length) {
      final line = lines[i].trim();
      final match = timeRegex.firstMatch(line);
      if (match != null) {
        final start = _toDuration(match.group(1), match.group(2)!, match.group(3)!, match.group(4)!);
        final end = _toDuration(match.group(5), match.group(6)!, match.group(7)!, match.group(8)!);
        i++;
        final buffer = <String>[];
        while (i < lines.length && lines[i].trim().isNotEmpty) {
          final cleaned = lines[i].trim().replaceAll(RegExp(r'<[^>]*>'), '');
          if (cleaned.isNotEmpty) buffer.add(cleaned);
          i++;
        }
        if (buffer.isNotEmpty) {
          cues.add(SubtitleCue(start: start, end: end, text: buffer.join('\n')));
        }
      } else {
        i++;
      }
    }
    return cues;
  }

  static Duration _toDuration(String? hrsStr, String minsStr, String secsStr, String msStr) {
    final hrs = int.tryParse(hrsStr ?? '0') ?? 0;
    final mins = int.tryParse(minsStr) ?? 0;
    final secs = int.tryParse(secsStr) ?? 0;
    final ms = int.tryParse(msStr) ?? 0;
    return Duration(hours: hrs, minutes: mins, seconds: secs, milliseconds: ms);
  }

  static String? activeTextAt(List<SubtitleCue> cues, Duration position) {
    for (final cue in cues) {
      if (position >= cue.start && position <= cue.end) {
        return cue.text;
      }
    }
    return null;
  }
}
