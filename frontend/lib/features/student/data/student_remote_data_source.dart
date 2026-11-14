import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage_service.dart';

/// Thin authenticated adapter for the backend-owned student API.
class StudentRemoteDataSource {
  StudentRemoteDataSource(this._api, this._storage);

  final ApiClient _api;
  final SecureStorageService _storage;
  static const _base = '/api/v1/student';

  Future<String> _token() async {
    final token = await _storage.getAccessToken();
    if (token == null) {
      throw StateError('Your session has expired. Please sign in again.');
    }
    return token;
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) async => _api.get(
    '$_base$path',
    accessToken: await _token(),
    queryParameters: query,
  );

  Future<Map<String, dynamic>> patch(String path, {Object? body}) async =>
      _api.patch('$_base$path', accessToken: await _token(), data: body);
}
