import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/presentation/providers/auth_provider.dart';
import '../features/auth/presentation/screens/auth_screens.dart';
import '../features/dashboard/dashboard_screen.dart';

class RouterNotifier extends ChangeNotifier {
  RouterNotifier(this._ref) {
    _ref.listen<AuthState>(
      authProvider,
      (previous, next) => notifyListeners(),
    );
  }

  final Ref _ref;
}

final routerNotifierProvider = Provider<RouterNotifier>((ref) {
  return RouterNotifier(ref);
});

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = ref.watch(routerNotifierProvider);
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: notifier,
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/role',
        builder: (context, state) => const RoleSelectionScreen(),
      ),
      GoRoute(
        path: '/login/:role',
        builder: (context, state) => LoginScreen(
          role: state.pathParameters['role'] ?? 'STUDENT',
        ),
      ),
      GoRoute(
        path: '/forgot',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/change-password',
        builder: (context, state) => const ChangePasswordScreen(),
      ),
      GoRoute(
        path: '/student',
        builder: (context, state) => const DashboardScreen(roleTitle: 'Student'),
      ),
      GoRoute(
        path: '/teacher',
        builder: (context, state) => const DashboardScreen(roleTitle: 'Teacher'),
      ),
    ],
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final path = state.matchedLocation;
      final isPublic = path == '/splash' ||
          path == '/role' ||
          path.startsWith('/login') ||
          path == '/forgot';

      if (auth.status == AuthStatus.initial ||
          auth.status == AuthStatus.refreshing) {
        if (path == '/splash') {
          return null;
        }
        return '/splash';
      }

      if (auth.status == AuthStatus.unauthenticated ||
          auth.status == AuthStatus.error) {
        if (path == '/splash') {
          return '/role';
        }
        if (isPublic) {
          return null;
        }
        return '/role';
      }

      if (auth.status == AuthStatus.loading) {
        return null;
      }

      if (auth.status == AuthStatus.authenticated) {
        final user = auth.user;
        if (user == null) {
          return '/role';
        }

        if (user.mustChangePassword) {
          if (path == '/change-password') {
            return null;
          }
          return '/change-password';
        }

        final homePath = user.role.toUpperCase() == 'STUDENT'
            ? '/student'
            : user.role.toUpperCase() == 'TEACHER'
                ? '/teacher'
                : '/role';

        if (path == '/splash' || isPublic || path == '/change-password') {
          return homePath;
        }

        if (user.role.toUpperCase() == 'STUDENT' && path == '/teacher') {
          return '/student';
        }

        if (user.role.toUpperCase() == 'TEACHER' && path == '/student') {
          return '/teacher';
        }

        return null;
      }

      return null;
    },
  );
});
