class AppConfig {
  // Switch between staging and production
  static const bool useStaging = false;

  static String get baseUrl =>
      useStaging ? 'https://dev.tickedify.com' : 'https://tickedify.com';
}
