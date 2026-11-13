import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const _accessToken = 'auth.access_token';
  static const _refreshToken = 'auth.refresh_token';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  Future<void> saveAccessToken(String token) =>
      _storage.write(key: _accessToken, value: token);
  Future<String?> getAccessToken() => _storage.read(key: _accessToken);
  Future<void> saveRefreshToken(String token) =>
      _storage.write(key: _refreshToken, value: token);
  Future<String?> getRefreshToken() => _storage.read(key: _refreshToken);
  Future<void> clearTokens() => _storage.deleteAll();
}
