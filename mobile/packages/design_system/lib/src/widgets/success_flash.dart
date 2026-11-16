import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/mousumi_colors.dart';

class MousumiFeedback {
  static Future<void> tap() => HapticFeedback.selectionClick();

  static Future<void> success() => HapticFeedback.mediumImpact();

  static Future<void> flash(BuildContext context, String title, {String? message}) async {
    await success();
    if (!context.mounted) return;
    await showGeneralDialog<void>(
      context: context,
      barrierDismissible: false,
      barrierLabel: title,
      barrierColor: const Color(0x66000000),
      transitionDuration: const Duration(milliseconds: 180),
      pageBuilder: (dialogContext, _, __) {
        Future<void>.delayed(const Duration(milliseconds: 700), () {
          if (dialogContext.mounted) Navigator.of(dialogContext).pop();
        });
        return Center(
          child: Material(
            color: MousumiColors.surface,
            borderRadius: BorderRadius.circular(24),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(28, 24, 28, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_circle, color: MousumiColors.brandPrimary, size: 52),
                  const SizedBox(height: 12),
                  Text(title, style: Theme.of(dialogContext).textTheme.titleLarge, textAlign: TextAlign.center),
                  if (message != null) ...[
                    const SizedBox(height: 6),
                    Text(message, style: Theme.of(dialogContext).textTheme.bodyMedium, textAlign: TextAlign.center),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  static Future<void> receipt(
    BuildContext context, {
    required String title,
    required String message,
  }) async {
    await success();
    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: MousumiColors.surface,
      builder: (sheetContext) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.check_circle, color: MousumiColors.brandPrimary, size: 36),
              const SizedBox(height: 10),
              Text(title, style: Theme.of(sheetContext).textTheme.titleLarge),
              const SizedBox(height: 6),
              Text(message, style: Theme.of(sheetContext).textTheme.bodyLarge),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(sheetContext).pop(),
                  child: const Text('ঠিক আছে'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
