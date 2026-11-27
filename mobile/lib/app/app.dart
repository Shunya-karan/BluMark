import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/config/app_role.dart';
import '../core/theme/app_theme.dart';
import 'router.dart';

class BluMarkApp extends ConsumerWidget {
  const BluMarkApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appRole = ref.watch(appRoleProvider);
    return MaterialApp.router(
      title: appRole.appTitle,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
