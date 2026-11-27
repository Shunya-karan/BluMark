import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/student_repository.dart';

final studentRepositoryProvider = Provider<StudentRepository>(
  (ref) => createStudentRepository(),
);
final studentDashboardProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>(
      (ref) => ref.watch(studentRepositoryProvider).dashboard(),
    );
final attendanceSummaryProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>(
      (ref) => ref.watch(studentRepositoryProvider).attendanceSummary(),
    );
final attendanceHistoryProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>(
      (ref) => ref.watch(studentRepositoryProvider).attendanceHistory(),
    );
final attendanceStatusFilterProvider = StateProvider<String?>((ref) => null);
final attendanceSubjectFilterProvider = StateProvider<String?>((ref) => null);
final attendanceFromFilterProvider = StateProvider<DateTime?>((ref) => null);
final attendanceToFilterProvider = StateProvider<DateTime?>((ref) => null);
final filteredAttendanceHistoryProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>(
      (ref) => ref
          .watch(studentRepositoryProvider)
          .attendanceHistory(
            status: ref.watch(attendanceStatusFilterProvider),
            subjectId: ref.watch(attendanceSubjectFilterProvider),
            from: ref.watch(attendanceFromFilterProvider),
            to: ref.watch(attendanceToFilterProvider),
          ),
    );
final timetableProvider = FutureProvider.autoDispose<Map<String, dynamic>>(
  (ref) => ref.watch(studentRepositoryProvider).timetable(),
);
final subjectsProvider = FutureProvider.autoDispose<Map<String, dynamic>>(
  (ref) => ref.watch(studentRepositoryProvider).subjects(),
);
final materialsQueryProvider = StateProvider<String>((ref) => '');
final materialsProvider = FutureProvider.autoDispose<Map<String, dynamic>>(
  (ref) => ref
      .watch(studentRepositoryProvider)
      .materials(search: ref.watch(materialsQueryProvider)),
);
final notificationsProvider = FutureProvider.autoDispose<Map<String, dynamic>>(
  (ref) => ref.watch(studentRepositoryProvider).notifications(),
);
final profileProvider = FutureProvider.autoDispose<Map<String, dynamic>>(
  (ref) => ref.watch(studentRepositoryProvider).profile(),
);
final deviceProvider = FutureProvider.autoDispose<Map<String, dynamic>>(
  (ref) => ref.watch(studentRepositoryProvider).device(),
);
