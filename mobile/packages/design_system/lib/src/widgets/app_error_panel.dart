import 'package:flutter/material.dart';

import '../theme/mousumi_colors.dart';
import 'primary_button.dart';

class AppErrorPanel extends StatelessWidget {
  const AppErrorPanel({
    super.key,
    required this.message,
    this.onRetry,
  });

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: MousumiColors.error, size: 40),
            const SizedBox(height: 12),
            Text(
              message.contains('নেটওয়ার্ক') || message.toLowerCase().contains('network')
                  ? 'সংযোগ নেই। ইন্টারনেট দেখে আবার চেষ্টা করুন।'
                  : message,
              style: Theme.of(context).textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              PrimaryButton(label: 'আবার চেষ্টা', onPressed: onRetry),
            ],
          ],
        ),
      ),
    );
  }
}
