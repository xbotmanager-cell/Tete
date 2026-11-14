import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../theme/edition_themes.dart';

class ApiErrorBanner extends StatelessWidget {
  final Object error;
  final EditionVisualTheme theme;
  final VoidCallback? onRetry;

  const ApiErrorBanner({
    super.key,
    required this.error,
    required this.theme,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    String message = error.toString();
    bool isDomain = false;
    String? origin;

    if (error is ApiException) {
      final apiErr = error as ApiException;
      message = apiErr.message;
      isDomain = apiErr.isDomainRestriction;
      origin = apiErr.detectedOrigin;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.surface,
        borderRadius: BorderRadius.circular(theme.cardRadius),
        border: Border.all(color: Colors.amber.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isDomain ? 'FRAMEX Domain Notice' : 'Service Notice',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: theme.text,
                    fontSize: 13.5,
                  ),
                ),
              ),
              if (onRetry != null)
                TextButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh, size: 16),
                  label: const Text('Retry'),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            message,
            style: TextStyle(color: theme.mutedText, fontSize: 12.5, height: 1.4),
          ),
          if (origin != null && origin.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Detected server origin: $origin',
              style: TextStyle(color: theme.mutedText, fontSize: 11),
            ),
          ],
        ],
      ),
    );
  }
}
