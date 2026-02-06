import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config/theme.dart';
import 'screens/actions_screen.dart';

void main() {
  runApp(const ProviderScope(child: TickedifyApp()));
}

class TickedifyApp extends StatelessWidget {
  const TickedifyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tickedify',
      theme: AppTheme.theme,
      debugShowCheckedModeBanner: false,
      home: const ActionsScreen(),
    );
  }
}
