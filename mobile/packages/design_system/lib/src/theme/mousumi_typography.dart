import 'package:flutter/material.dart';

import 'mousumi_colors.dart';

abstract final class MousumiTypography {
  static const family = 'Noto Sans Bengali';

  static TextTheme textTheme({required bool banglaPreferred}) {
    final base = const TextStyle(
      fontFamily: family,
      height: 1.55,
    );

    return TextTheme(
      displaySmall: base.copyWith(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        color: MousumiColors.textPrimary,
      ),
      headlineMedium: base.copyWith(
        fontSize: 24,
        fontWeight: FontWeight.w700,
        color: MousumiColors.textPrimary,
      ),
      titleLarge: base.copyWith(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: MousumiColors.textPrimary,
      ),
      titleMedium: base.copyWith(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: MousumiColors.textPrimary,
      ),
      bodyLarge: base.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        color: MousumiColors.textPrimary,
      ),
      bodyMedium: base.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: MousumiColors.textSecondary,
      ),
      labelLarge: base.copyWith(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: MousumiColors.textPrimary,
      ),
      labelSmall: base.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: MousumiColors.textSecondary,
      ),
    );
  }
}
