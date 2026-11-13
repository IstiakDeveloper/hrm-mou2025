import 'package:flutter/material.dart';

import 'mousumi_colors.dart';
import 'mousumi_typography.dart';

abstract final class MousumiTheme {
  static ThemeData light({bool banglaPreferred = true}) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: MousumiColors.brandPrimary,
      primary: MousumiColors.brandPrimary,
      onPrimary: MousumiColors.onPrimary,
      secondary: MousumiColors.secondary,
      surface: MousumiColors.surface,
      error: MousumiColors.error,
      brightness: Brightness.light,
    );

    final textTheme = MousumiTypography.textTheme(banglaPreferred: banglaPreferred);

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: MousumiColors.canvas,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: MousumiColors.surface,
        foregroundColor: MousumiColors.textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: textTheme.titleMedium,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: MousumiColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: MousumiColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: MousumiColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: MousumiColors.brandPrimary, width: 1.5),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: textTheme.labelLarge?.copyWith(color: MousumiColors.onPrimary),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 68,
        backgroundColor: MousumiColors.surface,
        indicatorColor: MousumiColors.primarySubtle,
        labelTextStyle: WidgetStatePropertyAll(
          textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
      cardTheme: CardTheme(
        color: MousumiColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: MousumiColors.border),
        ),
      ),
    );
  }
}
