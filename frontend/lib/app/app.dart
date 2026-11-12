import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../features/home/home_screen.dart';

class BluMarkApp extends StatelessWidget {
  const BluMarkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Blu-Mark',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const HomeScreen(),
    );
  }
}
