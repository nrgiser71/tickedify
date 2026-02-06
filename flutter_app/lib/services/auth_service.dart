import 'dart:developer' as dev;
import 'package:dio/dio.dart';
import 'api_service.dart';

class AuthService {
  final Dio _dio = ApiService().dio;

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      dev.log('AUTH: Attempting login to ${_dio.options.baseUrl}');
      final response = await _dio.post('/api/auth/login', data: {
        'email': email,
        'wachtwoord': password,
      });

      final data = response.data as Map<String, dynamic>;
      dev.log('AUTH: Login response: ${data['success']}');

      if (data['requiresUpgrade'] == true) {
        return {
          'success': false,
          'error': 'Account requires upgrade.',
        };
      }

      return {'success': true, 'user': data['user']};
    } on DioException catch (e) {
      dev.log('AUTH: Login error: ${e.type} - ${e.message}');
      dev.log('AUTH: Response status: ${e.response?.statusCode}');
      dev.log('AUTH: Response data: ${e.response?.data}');
      final msg = e.response?.data is Map
          ? (e.response!.data as Map)['error']?.toString() ?? 'Login failed'
          : 'Login failed';
      return {'success': false, 'error': msg};
    } catch (e) {
      dev.log('AUTH: Unexpected error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<bool> checkSession() async {
    try {
      final response = await _dio.get('/api/lijst/acties');
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
