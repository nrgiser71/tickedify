import 'dart:ui' show VoidCallback;
import 'package:dio/dio.dart';
import '../config/app_config.dart';

// Conditional imports for cookie management
import 'api_service_native.dart' if (dart.library.html) 'api_service_web.dart'
    as platform;

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio dio;

  ApiService._internal() {
    dio = Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      contentType: 'application/json',
    ));

    // Platform-specific cookie setup
    platform.setupCookies(dio);

    // Add 401 interceptor
    dio.interceptors.add(InterceptorsWrapper(
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          onUnauthorized?.call();
        }
        handler.next(error);
      },
    ));
  }

  // Callback for 401 handling
  VoidCallback? onUnauthorized;
}
