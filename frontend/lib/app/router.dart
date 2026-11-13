import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/presentation/providers/auth_provider.dart';
import '../features/auth/presentation/screens/auth_screens.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);
  return GoRouter(
    initialLocation: '/splash',
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/role', builder: (_, __) => const RoleSelectionScreen()),
      GoRoute(
        path: '/login/:role',
        builder: (_, state) => LoginScreen(role: state.pathParameters['role']!),
      ),
      GoRoute(
        path: '/forgot',
        builder: (_, __) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/change-password',
        builder: (_, __) => const ChangePasswordScreen(),
      ),
      GoRoute(
        path: '/student',
        builder: (_, __) => const DashboardPlaceholder(role: 'Student'),
      ),
      GoRoute(
        path: '/teacher',
        builder: (_, __) => const DashboardPlaceholder(role: 'Teacher'),
      ),
    ],
    redirect: (_, state) {
      final path = state.matchedLocation;
      final isPublic =
          path == '/splash' ||
          path == '/role' ||
          path.startsWith('/login') ||
          path == '/forgot';
      if (auth.status == AuthStatus.initial ||
          auth.status == AuthStatus.loading ||
          auth.status == AuthStatus.refreshing)
        return path == '/splash' ? null : '/splash';
      if (auth.status != AuthStatus.authenticated) {
        // Splash is only a bootstrap route. Once restoration completes an
        // unauthenticated user must continue to role selection.
        if (path == '/splash') return '/role';
        return isPublic ? null : '/role';
      }
      final user = auth.user!;
      if (user.mustChangePassword)
        return path == '/change-password' ? null : '/change-password';
      final home = user.role == 'STUDENT'
          ? '/student'
          : user.role == 'TEACHER'
          ? '/teacher'
          : '/role';
      if (path == '/splash' || isPublic || path == '/change-password')
        return home;
      if (user.role == 'STUDENT' && path == '/teacher') return '/student';
      if (user.role == 'TEACHER' && path == '/student') return '/teacher';
      return null;
    },
  );
});
