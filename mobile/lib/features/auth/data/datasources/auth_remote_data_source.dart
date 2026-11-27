import '../../../../core/network/api_client.dart';

class AuthRemoteDataSource {
  AuthRemoteDataSource(this._client);
  final ApiClient _client;
  static const _base = '/api/v1/auth';
  Future<Map<String, dynamic>> login(String email, String password) => _client
      .post('$_base/login', data: {'email': email, 'password': password});
  Future<Map<String, dynamic>> refresh(String refreshToken) =>
      _client.post('$_base/refresh', data: {'refreshToken': refreshToken});
  Future<Map<String, dynamic>> me(String accessToken) =>
      _client.get('$_base/me', accessToken: accessToken);
  Future<void> logout(String accessToken) async {
    await _client.post('$_base/logout', accessToken: accessToken);
  }

  Future<void> forgotPassword(String email) async {
    await _client.post('$_base/forgot-password', data: {'email': email});
  }

  Future<void> changePassword(
    String accessToken,
    String currentPassword,
    String newPassword,
  ) async {
    await _client.post(
      '$_base/change-password',
      accessToken: accessToken,
      data: {'currentPassword': currentPassword, 'newPassword': newPassword},
    );
  }
}
