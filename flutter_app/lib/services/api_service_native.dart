import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';

void setupCookies(Dio dio) {
  // Use in-memory cookie jar (works immediately, no async needed)
  // Cookies persist during app session, cleared on restart
  final cookieJar = CookieJar();
  dio.interceptors.add(CookieManager(cookieJar));
}
