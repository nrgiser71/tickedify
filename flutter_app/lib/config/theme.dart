import 'package:flutter/material.dart';

class AppColors {
  // macOS System Colors
  static const Color blue = Color(0xFF007AFF);
  static const Color blueHover = Color(0xFF0056CC);
  static const Color green = Color(0xFF30D158);
  static const Color red = Color(0xFFFF3B30);
  static const Color orange = Color(0xFFFF9500);
  static const Color purple = Color(0xFFAF52DE);

  // macOS Gray Scale
  static const Color gray1 = Color(0xFF8E8E93);
  static const Color gray2 = Color(0xFFAEAEB2);
  static const Color gray3 = Color(0xFFC7C7CC);
  static const Color gray4 = Color(0xFFD1D1D6);
  static const Color gray5 = Color(0xFFE5E5EA);
  static const Color gray6 = Color(0xFFF2F2F7);

  // Background Colors
  static const Color bgPrimary = Color(0xFFFFFFFF);
  static const Color bgSecondary = Color(0xFFF2F2F7);

  // Text Colors
  static const Color textPrimary = Color(0xFF000000);
  static const Color textSecondary = Color(0xFF3C3C43);

  // Priority Colors
  static const Color priorityHigh = Color(0xFFFF4444);
  static const Color priorityMedium = Color(0xFFFF9500);
  static const Color priorityLow = Color(0xFF8E8E93);
}

class AppTheme {
  static const double radiusSmall = 6.0;
  static const double radiusMedium = 8.0;
  static const double radiusLarge = 12.0;

  static ThemeData get theme => ThemeData(
        colorSchemeSeed: AppColors.blue,
        useMaterial3: true,
        scaffoldBackgroundColor: AppColors.bgSecondary,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.bgPrimary,
          foregroundColor: AppColors.textPrimary,
          elevation: 0.5,
        ),
      );
}
