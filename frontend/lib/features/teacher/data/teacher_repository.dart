import '../../../../core/storage/secure_storage_service.dart';
import 'teacher_remote_data_source.dart';

class TeacherRepository {
  TeacherRepository(this._remote, this._storage);
  final TeacherRemoteDataSource _remote;
  final SecureStorageService _storage;

  Future<String> _getToken() async {
    final token = await _storage.getAccessToken();
    if (token == null) throw StateError('Session has expired');
    return token;
  }

  Future<Map<String, dynamic>> getDashboardSummary() async {
    final token = await _getToken();
    return _remote.getDashboardSummary(token);
  }

  Future<Map<String, dynamic>> getTodaySchedule() async {
    final token = await _getToken();
    return _remote.getTodaySchedule(token);
  }

  Future<Map<String, dynamic>> getAssignedClasses() async {
    final token = await _getToken();
    return _remote.getAssignedClasses(token);
  }

  Future<Map<String, dynamic>> getClassDetails(String classId) async {
    final token = await _getToken();
    return _remote.getClassDetails(token, classId);
  }

  Future<Map<String, dynamic>> getClassStudents(String classId) async {
    final token = await _getToken();
    return _remote.getClassStudents(token, classId);
  }

  Future<Map<String, dynamic>> getTimetable() async {
    final token = await _getToken();
    return _remote.getTimetable(token);
  }

  Future<Map<String, dynamic>> getStudyMaterials() async {
    final token = await _getToken();
    return _remote.getStudyMaterials(token);
  }

  Future<Map<String, dynamic>> getAttendanceHistory() async {
    final token = await _getToken();
    return _remote.getAttendanceHistory(token);
  }

  Future<Map<String, dynamic>> getSessionAttendanceRoster(
      String sessionId) async {
    final token = await _getToken();
    return _remote.getSessionAttendanceRoster(token, sessionId);
  }

  Future<Map<String, dynamic>> createAttendanceSession(
      Map<String, dynamic> data) async {
    final token = await _getToken();
    return _remote.createAttendanceSession(token, data);
  }

  Future<Map<String, dynamic>> getLiveAttendanceSession(
      String sessionId) async {
    final token = await _getToken();
    return _remote.getLiveAttendanceSession(token, sessionId);
  }

  Future<Map<String, dynamic>> endAttendanceSession(String sessionId) async {
    final token = await _getToken();
    return _remote.endAttendanceSession(token, sessionId);
  }

  Future<Map<String, dynamic>> correctAttendanceRecord({
    required String sessionId,
    required String recordId,
    required String status,
    String? notes,
  }) async {
    final token = await _getToken();
    return _remote.correctAttendanceRecord(token, sessionId, recordId, {
      'status': status,
      'notes': ?notes,
    });
  }

  Future<Map<String, dynamic>> manuallyMarkAttendance({
    required String sessionId,
    required String studentId,
    required String status,
    String? notes,
  }) async {
    final token = await _getToken();
    return _remote.manuallyMarkAttendance(token, sessionId, {
      'studentId': studentId,
      'status': status,
      'notes': ?notes,
    });
  }

  Future<Map<String, dynamic>> bulkMarkAttendance({
    required String sessionId,
    required List<Map<String, dynamic>> records,
  }) async {
    final token = await _getToken();
    return _remote.bulkMarkAttendance(token, sessionId, records);
  }

  Future<Map<String, dynamic>> bulkUpdateAttendance({
    required String sessionId,
    required List<Map<String, dynamic>> records,
  }) async {
    final token = await _getToken();
    return _remote.bulkUpdateAttendance(token, sessionId, records);
  }

  Future<Map<String, dynamic>> getProfile() async {
    final token = await _getToken();
    return _remote.getProfile(token);
  }

  Future<Map<String, dynamic>> getSubjects() async {
    final token = await _getToken();
    return _remote.getSubjects(token);
  }

  Future<Map<String, dynamic>> updateProfile({
    required String fullName,
    String? phone,
  }) async {
    final token = await _getToken();
    return _remote.updateProfile(token, {
      'fullName': fullName,
      'phone': phone,
    });
  }
}
