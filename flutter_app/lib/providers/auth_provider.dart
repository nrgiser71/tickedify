import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';

enum AuthState { unknown, authenticated, unauthenticated }

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService = AuthService();

  AuthNotifier() : super(AuthState.unknown);

  /// Auto-login with demo credentials
  Future<void> autoLogin() async {
    final result = await _authService.login(
      'demo@example.com',
      'demo-password',
    );
    state = result['success'] == true
        ? AuthState.authenticated
        : AuthState.unauthenticated;
  }

  Future<void> checkSession() async {
    final valid = await _authService.checkSession();
    if (valid) {
      state = AuthState.authenticated;
    } else {
      // Session expired, auto-login again
      await autoLogin();
    }
  }

  void forceLogout() {
    state = AuthState.unauthenticated;
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
