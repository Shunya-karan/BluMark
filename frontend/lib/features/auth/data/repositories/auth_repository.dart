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
      final meData = await _remote.me(access);
      return AuthUser.fromJson(meData);
    } catch (_) {
      final refresh = await _storage.getRefreshToken();
      if (refresh == null) {
        await _storage.clearTokens();
        rethrow;
      }
      try {
        final data = await _remote.refresh(refresh);
        await _saveTokens(data);
        access = data['accessToken'] as String;
        final meData = await _remote.me(access);
        return AuthUser.fromJson(meData);
      } catch (_) {
        await _storage.clearTokens();
        rethrow;
      }
    }
  }

  Future<void> logout() async {
    final access = await _storage.getAccessToken();
    try {
      if (access != null) {
        await _remote.logout(access);
      }
    } catch (_) {
      // Ignore network errors on server-side logout, clear local tokens anyway
    } finally {
      await _storage.clearTokens();
    }
  }

  Future<void> forgotPassword(String email) => _remote.forgotPassword(email);

  Future<AuthUser> changePassword({
    required String email,
    required String currentPassword,
    required String newPassword,
  }) async {
    final access = await _storage.getAccessToken();
    if (access == null) throw StateError('Session has expired');
    await _remote.changePassword(access, currentPassword, newPassword);
    await _storage.clearTokens();

    // Re-authenticate with new password after backend confirmed password change
    return login(email, newPassword);
  }

  Future<void> _saveTokens(Map<String, dynamic> data) async {
    final accessToken = data['accessToken'] as String?;
    final refreshToken = data['refreshToken'] as String?;
    if (accessToken != null) {
      await _storage.saveAccessToken(accessToken);
    }
    if (refreshToken != null) {
      await _storage.saveRefreshToken(refreshToken);
    }
  }
}
