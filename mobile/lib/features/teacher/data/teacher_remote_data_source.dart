import '../../../../core/network/api_client.dart';

class TeacherRemoteDataSource {
  const TeacherRemoteDataSource(this._client);
  final ApiClient _client;
  static const _base = '/api/v1/teacher';

  Future<Map<String, dynamic>> getDashboardSummary(String token) =>
      _client.get('$_base/dashboard/summary', accessToken: token);

  Future<Map<String, dynamic>> getTodaySchedule(String token) =>
      _client.get('$_base/dashboard/today-schedule', accessToken: token);

  Future<Map<String, dynamic>> getAssignedClasses(String token) =>
      _client.get('$_base/classes', accessToken: token);

  Future<Map<String, dynamic>> getClassDetails(String token, String classId) =>
      _client.get('$_base/classes/$classId', accessToken: token);

  Future<Map<String, dynamic>> getClassStudents(String token, String classId) =>
      _client.get('$_base/classes/$classId/students', accessToken: token);

  Future<Map<String, dynamic>> getTimetable(String token) =>
      _client.get('$_base/timetable', accessToken: token);

  Future<Map<String, dynamic>> getTimetableByDay(String token, int weekday) =>
      _client.get('$_base/timetable/day/$weekday', accessToken: token);

  Future<Map<String, dynamic>> getStudyMaterials(String token) =>
      _client.get('$_base/study-materials', accessToken: token);

  Future<Map<String, dynamic>> getAttendanceHistory(String token) =>
      _client.get('$_base/attendance/history', accessToken: token);

  Future<Map<String, dynamic>> getSessionAttendanceRoster(
    String token,
    String sessionId,
  ) =>
      _client.get('$_base/attendance/sessions/$sessionId/attendance',
          accessToken: token);

  Future<Map<String, dynamic>> createAttendanceSession(
    String token,
    Map<String, dynamic> data,
  ) =>
      _client.post('$_base/attendance/sessions',
          accessToken: token, data: data);

  Future<Map<String, dynamic>> getLiveAttendanceSession(
    String token,
    String sessionId,
  ) =>
      _client.get('$_base/attendance/sessions/$sessionId/live',
          accessToken: token);

  Future<Map<String, dynamic>> endAttendanceSession(
    String token,
    String sessionId,
  ) =>
      _client.patch('$_base/attendance/sessions/$sessionId/end',
          accessToken: token);

  Future<Map<String, dynamic>> correctAttendanceRecord(
    String token,
    String sessionId,
    String recordId,
    Map<String, dynamic> data,
  ) =>
      _client.patch(
        '$_base/attendance/sessions/$sessionId/records/$recordId',
        accessToken: token,
        data: data,
      );

  Future<Map<String, dynamic>> manuallyMarkAttendance(
    String token,
    String sessionId,
    Map<String, dynamic> data,
  ) =>
      _client.post(
        '$_base/attendance/sessions/$sessionId/records/manual',
        accessToken: token,
        data: data,
      );

  Future<Map<String, dynamic>> bulkMarkAttendance(
    String token,
    String sessionId,
    List<Map<String, dynamic>> records,
  ) =>
      _client.post(
        '$_base/attendance/sessions/$sessionId/records/bulk',
        accessToken: token,
        data: {'records': records},
      );

  Future<Map<String, dynamic>> bulkUpdateAttendance(
    String token,
    String sessionId,
    List<Map<String, dynamic>> records,
  ) =>
      _client.patch(
        '$_base/attendance/sessions/$sessionId/records/bulk',
        accessToken: token,
        data: {'records': records},
      );

  Future<Map<String, dynamic>> getProfile(String token) =>
      _client.get('$_base/profile', accessToken: token);

  Future<Map<String, dynamic>> getSubjects(String token) =>
      _client.get('$_base/profile/subjects', accessToken: token);

  Future<Map<String, dynamic>> updateProfile(
    String token,
    Map<String, dynamic> data,
  ) =>
      _client.patch('$_base/profile', accessToken: token, data: data);
}
