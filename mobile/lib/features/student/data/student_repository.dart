import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import 'student_remote_data_source.dart';

class StudentRepository {
  StudentRepository(this._remote);
  final StudentRemoteDataSource _remote;

  Future<Map<String, dynamic>> dashboard() => _remote.get('/dashboard');
  Future<Map<String, dynamic>> attendanceSummary() =>
      _remote.get('/attendance/summary');
  Future<Map<String, dynamic>> attendanceHistory({
    int page = 1,
    String? status,
    String? subjectId,
    DateTime? from,
    DateTime? to,
  }) => _remote.get(
    '/attendance/history',
    query: {
      'page': page.toString(),
      'limit': '30',
      'status': ?status,
      'subjectId': ?subjectId,
      'from': ?from?.toUtc().toIso8601String(),
      'to': ?to?.toUtc().toIso8601String(),
    },
  );
  Future<Map<String, dynamic>> timetable() => _remote.get('/timetable');
  Future<Map<String, dynamic>> subjects() => _remote.get('/subjects');
  Future<Map<String, dynamic>> materials({String? search, String? subjectId}) =>
      _remote.get(
        '/study-materials',
        query: {
          'page': '1',
          'limit': '50',
          if (search != null && search.isNotEmpty) 'search': search,
          'subjectId': ?subjectId,
        },
      );
  Future<Map<String, dynamic>> notifications({bool unreadOnly = false}) =>
      _remote.get(
        '/notifications',
        query: {'page': '1', 'limit': '50', if (unreadOnly) 'unread': 'true'},
      );
  Future<void> readNotification(String id) async =>
      _remote.patch('/notifications/$id/read');
  Future<void> readAllNotifications() async =>
      _remote.patch('/notifications/read-all');
  Future<Map<String, dynamic>> profile() => _remote.get('/profile');
  Future<Map<String, dynamic>> updateProfile({
    required String fullName,
    String? phone,
  }) => _remote.patch('/profile', body: {'fullName': fullName, 'phone': phone});
  Future<Map<String, dynamic>> device() => _remote.get('/device');
  Future<Map<String, dynamic>> materialDownload(String id) =>
      _remote.get('/study-materials/$id/download');
}

StudentRepository createStudentRepository() => StudentRepository(
  StudentRemoteDataSource(ApiClient(), SecureStorageService()),
);
