import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../data/datasources/auth_remote_data_source.dart';
import '../../data/repositories/auth_repository.dart';
import '../../domain/entities/auth_user.dart';

enum AuthStatus {
  initial,
  loading,
  unauthenticated,
  authenticated,
  refreshing,
  error,
}

class AuthState {
  const AuthState(this.status, {this.user, this.message});
  final AuthStatus status;
  final AuthUser? user;
  final String? message;
}

final authRepositoryProvider = Provider(
  (ref) =>
      AuthRepository(AuthRemoteDataSource(ApiClient()), SecureStorageService()),
);

final authProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) => AuthController(ref.read(authRepositoryProvider)),
);

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository) : super(const AuthState(AuthStatus.initial));
  final AuthRepository _repository;

  Future<void> restore() async {
    if (state.status == AuthStatus.loading ||
        state.status == AuthStatus.refreshing)
      return;
    state = const AuthState(AuthStatus.refreshing);
    try {
      state = AuthState(
        AuthStatus.authenticated,
        user: await _repository.restore(),
      );
    } catch (_) {
      state = const AuthState(AuthStatus.unauthenticated);
    }
  }

  Future<bool> login(String email, String password, String selectedRole) async {
    if (state.status == AuthStatus.loading) return false;
    state = const AuthState(AuthStatus.loading);
    try {
      final user = await _repository.login(email, password);
      if (user.role != selectedRole) {
        await _repository.logout();
        state = const AuthState(
          AuthStatus.unauthenticated,
          message: 'This account does not match the selected role.',
        );
        return false;
      }
      state = AuthState(AuthStatus.authenticated, user: user);
      return true;
    } catch (e) {
      state = AuthState(AuthStatus.error, message: _friendly(e));
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _repository.logout();
    } finally {
      state = const AuthState(AuthStatus.unauthenticated);
    }
  }

  Future<String?> forgotPassword(String email) async {
    try {
      await _repository.forgotPassword(email);
      return null;
    } catch (e) {
      return _friendly(e);
    }
  }

  Future<String?> changePassword(String current, String next) async {
    try {
      await _repository.changePassword(current, next);
      state = const AuthState(AuthStatus.unauthenticated);
      return null;
    } catch (e) {
      return _friendly(e);
    }
  }

  String _friendly(Object error) =>
      error.toString().replaceFirst('ApiException: ', '');
}
