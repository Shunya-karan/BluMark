import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/app.dart';
import 'core/config/app_role.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final role = AppRole.fromEnvironment();
  runApp(
    ProviderScope(
      overrides: [appRoleProvider.overrideWithValue(role)],
      child: const BluMarkApp(),
    ),
  );
}
