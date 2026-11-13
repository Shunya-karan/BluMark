import '../../../../core/storage/secure_storage_service.dart';
import '../../domain/entities/auth_user.dart';
import '../datasources/auth_remote_data_source.dart';

class AuthRepository {
  AuthRepository(this._remote, this._storage);
  final AuthRemoteDataSource _remote;
  final SecureStorageService _storage;

  Future<AuthUser> login(String email, String password) async {
    final data = await _remote.login(email, password);
    await _saveTokens(data);
    return AuthUser.fromJson(Map<String, dynamic>.from(data['profile'] as Map));
  }

  Future<AuthUser> restore() async {
    var access = await _storage.getAccessToken();
    if (access == null) throw StateError('No saved session');
    try {
      return AuthUser.fromJson(await _remote.me(access));
    } catch (_) {
      final refresh = await _storage.getRefreshToken();
      if (refresh == null) rethrow;
      try {
        final data = await _remote.refresh(refresh);
        await _saveTokens(data);
        access = data['accessToken'] as String;
        return AuthUser.fromJson(await _remote.me(access));
      } catch (_) {
        await _storage.clearTokens();
        rethrow;
      }
    }
  }

  Future<void> logout() async {
    final access = await _storage.getAccessToken();
    try {
      if (access != null) await _remote.logout(access);
    } finally {
      await _storage.clearTokens();
    }
  }

  Future<void> forgotPassword(String email) => _remote.forgotPassword(email);
  Future<void> changePassword(String current, String next) async {
    final access = await _storage.getAccessToken();
    if (access == null) throw StateError('Session has expired');
    await _remote.changePassword(access, current, next);
    await _storage.clearTokens();
  }

  Future<void> _saveTokens(Map<String, dynamic> data) async {
    await _storage.saveAccessToken(data['accessToken'] as String);
    await _storage.saveRefreshToken(data['refreshToken'] as String);
  }
}
