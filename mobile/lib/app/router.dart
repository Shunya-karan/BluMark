import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/config/app_role.dart';
import '../features/auth/presentation/providers/auth_provider.dart';
import '../features/auth/presentation/screens/auth_screens.dart';
import '../features/teacher/dashboard/screens/teacher_dashboard_screen.dart';
import '../features/teacher/classes/screens/teacher_classes_screen.dart';
import '../features/teacher/classes/screens/class_details_screen.dart';
import '../features/teacher/students/screens/class_students_screen.dart';
import '../features/teacher/attendance/screens/teacher_attendance_screen.dart';
import '../features/teacher/attendance/screens/create_attendance_session_screen.dart';
import '../features/teacher/attendance/screens/active_attendance_screen.dart';
import '../features/teacher/attendance/screens/attendance_history_screen.dart';
import '../features/teacher/attendance/screens/attendance_session_details_screen.dart';
import '../features/teacher/timetable/screens/teacher_timetable_screen.dart';
import '../features/teacher/study_materials/screens/teacher_materials_screen.dart';
import '../features/teacher/study_materials/screens/upload_material_screen.dart';
import '../features/teacher/notifications/screens/teacher_notifications_screen.dart';
import '../features/teacher/profile/screens/teacher_profile_screen.dart';
import '../features/teacher/profile/screens/edit_teacher_profile_screen.dart';
import '../features/student/device/screens/device_information_screen.dart';
import '../features/student/notifications/screens/notifications_screen.dart';
import '../features/student/presentation/student_shell.dart';
import '../features/student/subjects/screens/subjects_screen.dart';
import '../features/student/profile/screens/edit_student_profile_screen.dart';
import '../features/student/attendance/screens/student_nearby_sessions_screen.dart';
import '../features/student/study_materials/screens/study_materials_screen.dart';

class RouterNotifier extends ChangeNotifier {
  RouterNotifier(this._ref) {
    _ref.listen<AuthState>(authProvider, (previous, next) => notifyListeners());
  }

  final Ref _ref;
}

final routerNotifierProvider = Provider<RouterNotifier>((ref) {
  return RouterNotifier(ref);
});

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = ref.watch(routerNotifierProvider);
  final appRole = ref.watch(appRoleProvider);
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: notifier,
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => LoginScreen(role: appRole.apiRole),
      ),
      GoRoute(
        path: '/forgot',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/change-password',
        builder: (context, state) => const ChangePasswordScreen(),
      ),

      // Student Routes
      GoRoute(
        path: '/student',
        builder: (context, state) => const StudentShell(),
        routes: [
          GoRoute(
            path: 'profile/edit',
            builder: (context, state) => const EditStudentProfileScreen(),
          ),
          GoRoute(
            path: 'subjects',
            builder: (context, state) => const SubjectsScreen(),
          ),
          GoRoute(
            path: 'materials',
            builder: (context, state) => const StudyMaterialsScreen(),
          ),
          GoRoute(
            path: 'notifications',
            builder: (context, state) => const NotificationsScreen(),
          ),
          GoRoute(
            path: 'device',
            builder: (context, state) => const DeviceInformationScreen(),
          ),
          GoRoute(
            path: 'attendance/nearby',
            builder: (context, state) => const StudentNearbySessionsScreen(),
          ),
        ],
      ),

      // Teacher Routes
      GoRoute(
        path: '/teacher',
        builder: (context, state) => const TeacherDashboardScreen(),
        routes: [
          GoRoute(
            path: 'classes',
            builder: (context, state) => const TeacherClassesScreen(),
            routes: [
              GoRoute(
                path: ':classId',
                builder: (context, state) => const ClassDetailsScreen(),
                routes: [
                  GoRoute(
                    path: 'students',
                    builder: (context, state) => const ClassStudentsScreen(),
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: 'attendance',
            builder: (context, state) => const TeacherAttendanceScreen(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) =>
                    const CreateAttendanceSessionScreen(),
              ),
              GoRoute(
                path: 'active/:sessionId',
                builder: (context, state) => const ActiveAttendanceScreen(),
              ),
              GoRoute(
                path: 'history',
                builder: (context, state) => const AttendanceHistoryScreen(),
                routes: [
                  GoRoute(
                    path: 'sessions/:sessionId',
                    builder: (context, state) =>
                        const AttendanceSessionDetailsScreen(),
                  ),
                ],
              ),
              GoRoute(
                path: 'sessions/:sessionId',
                builder: (context, state) =>
                    const AttendanceSessionDetailsScreen(),
              ),
            ],
          ),
          GoRoute(
            path: 'timetable',
            builder: (context, state) => const TeacherTimetableScreen(),
          ),
          GoRoute(
            path: 'materials',
            builder: (context, state) => const TeacherMaterialsScreen(),
            routes: [
              GoRoute(
                path: 'upload',
                builder: (context, state) => const UploadMaterialScreen(),
              ),
            ],
          ),
          GoRoute(
            path: 'notifications',
            builder: (context, state) => const TeacherNotificationsScreen(),
          ),
          GoRoute(
            path: 'profile',
            builder: (context, state) => const TeacherProfileScreen(),
            routes: [
              GoRoute(
                path: 'edit',
                builder: (context, state) => const EditTeacherProfileScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final path = state.matchedLocation;
      final isPublic =
          path == '/splash' || path == '/login' || path == '/forgot';

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
          return '/login';
        }
        if (isPublic) {
          return null;
        }
        return '/login';
      }

      if (auth.status == AuthStatus.loading) {
        return null;
      }

      if (auth.status == AuthStatus.authenticated) {
        final user = auth.user;
        if (user == null || user.role.toUpperCase() != appRole.apiRole) {
          return '/login';
        }

        if (user.mustChangePassword) {
          if (path == '/change-password') {
            return null;
          }
          return '/change-password';
        }

        final homePath = appRole.homePath;

        if (path == '/splash' || isPublic || path == '/change-password') {
          return homePath;
        }

        if (appRole == AppRole.student && path.startsWith('/teacher')) {
          return '/student';
        }

        if (appRole == AppRole.teacher && path.startsWith('/student')) {
          return '/teacher';
        }

        return null;
      }

      return null;
    },
  );
});
