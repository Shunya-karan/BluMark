import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AppRole {
  student(
    apiRole: 'STUDENT',
    displayName: 'Student',
    appTitle: 'BluMark Student',
    homePath: '/student',
  ),
  teacher(
    apiRole: 'TEACHER',
    displayName: 'Teacher',
    appTitle: 'BluMark Teacher',
    homePath: '/teacher',
  );

  const AppRole({
    required this.apiRole,
    required this.displayName,
    required this.appTitle,
    required this.homePath,
  });

  final String apiRole;
  final String displayName;
  final String appTitle;
  final String homePath;

  static AppRole fromEnvironment() {
    const rawRole = String.fromEnvironment('APP_ROLE', defaultValue: 'STUDENT');
    return rawRole.trim().toUpperCase() == 'TEACHER'
        ? AppRole.teacher
        : AppRole.student;
  }
}

final appRoleProvider = Provider<AppRole>((ref) => AppRole.fromEnvironment());
