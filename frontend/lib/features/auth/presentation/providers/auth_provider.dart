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
  const AuthState(
    this.status, {
    this.user,
    this.message,
    this.redirecting = false,
  });

  final AuthStatus status;
  final AuthUser? user;
  final String? message;
  final bool redirecting;

  AuthState copyWith({
    AuthStatus? status,
    AuthUser? user,
    String? message,
    bool? redirecting,
  }) {
    return AuthState(
      status ?? this.status,
      user: user ?? this.user,
      message: message ?? this.message,
      redirecting: redirecting ?? this.redirecting,
    );
  }
}

final authRepositoryProvider = Provider(
  (ref) => AuthRepository(
    AuthRemoteDataSource(ApiClient()),
    SecureStorageService(),
  ),
);

final authProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) => AuthController(ref.read(authRepositoryProvider)),
);

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository) : super(const AuthState(AuthStatus.initial));
  final AuthRepository _repository;

  Future<void> restore() async {
    if (state.status == AuthStatus.loading ||
        state.status == AuthStatus.refreshing) {
      return;
    }
    state = const AuthState(AuthStatus.refreshing);
    try {
      final user = await _repository.restore();
      state = AuthState(AuthStatus.authenticated, user: user);
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
          message: 'The selected account type does not match your registered account.',
        );
        return false;
      }
      state = AuthState(
        AuthStatus.authenticated,
        user: user,
        redirecting: true,
      );
      return true;
    } catch (e) {
      state = AuthState(AuthStatus.error, message: _friendly(e));
      return false;
    }
  }

  Future<void> logout() async {
    if (state.status == AuthStatus.loading) return;
    state = const AuthState(AuthStatus.loading);
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

  Future<String?> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final currentUser = state.user;
    if (currentUser == null) {
      return 'Session expired. Please sign in again.';
    }
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final updatedUser = await _repository.changePassword(
        email: currentUser.email,
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      state = AuthState(
        AuthStatus.authenticated,
        user: updatedUser,
        redirecting: true,
      );
      return null;
    } catch (e) {
      state = AuthState(
        AuthStatus.authenticated,
        user: currentUser,
        message: _friendly(e),
      );
      return _friendly(e);
    }
  }

  void clearMessage() {
    if (state.message != null) {
      state = state.copyWith(message: null);
    }
  }

  String _friendly(Object error) {
    final msg = error.toString();
    if (msg.startsWith('ApiException: ')) {
      return msg.substring(13);
    }
    return msg;
  }
}
