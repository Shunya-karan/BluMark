import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../data/teacher_remote_data_source.dart';
import '../data/teacher_repository.dart';

final teacherRepositoryProvider = Provider((ref) => TeacherRepository(
      TeacherRemoteDataSource(ApiClient()),
      SecureStorageService(),
    ));

final teacherDashboardSummaryProvider = FutureProvider.autoDispose((ref) {
  return ref.read(teacherRepositoryProvider).getDashboardSummary();
});

final teacherTodayScheduleProvider = FutureProvider.autoDispose((ref) {
  return ref.read(teacherRepositoryProvider).getTodaySchedule();
});

final teacherAssignedClassesProvider = FutureProvider.autoDispose((ref) {
  return ref.read(teacherRepositoryProvider).getAssignedClasses();
});

final teacherClassDetailsProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, classId) {
  return ref.read(teacherRepositoryProvider).getClassDetails(classId);
});

final teacherClassStudentsProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, classId) {
  return ref.read(teacherRepositoryProvider).getClassStudents(classId);
});

final teacherTimetableProvider = FutureProvider.autoDispose((ref) {
  return ref.read(teacherRepositoryProvider).getTimetable();
});

final teacherStudyMaterialsProvider = FutureProvider.autoDispose((ref) {
  return ref.read(teacherRepositoryProvider).getStudyMaterials();
});

final teacherAttendanceHistoryProvider = FutureProvider.autoDispose((ref) {
  return ref.read(teacherRepositoryProvider).getAttendanceHistory();
});

final teacherSessionRosterProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, sessionId) {
  return ref.read(teacherRepositoryProvider).getSessionAttendanceRoster(sessionId);
});

final teacherProfileProvider = FutureProvider.autoDispose((ref) {
  return ref.read(teacherRepositoryProvider).getProfile();
});

final teacherSubjectsProvider = FutureProvider.autoDispose((ref) {
  return ref.read(teacherRepositoryProvider).getSubjects();
});

final teacherLiveSessionProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, sessionId) {
  return ref.read(teacherRepositoryProvider).getLiveAttendanceSession(sessionId);
});
