class AppConfig {
  // Switch between staging and production
  static const bool useStaging = false;

  static String get baseUrl =>
      useStaging ? 'https://dev.example.com' : 'https://api.example.com';
}
