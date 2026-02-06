import 'package:dio/dio.dart';
import 'package:dio/browser.dart';

void setupCookies(Dio dio) {
  // For Flutter Web: use withCredentials to send cookies cross-origin
  dio.httpClientAdapter = BrowserHttpClientAdapter(withCredentials: true);
}
