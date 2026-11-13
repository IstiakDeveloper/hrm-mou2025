class ApiConfig {
  const ApiConfig({
    required this.baseUrl,
    this.connectTimeout = const Duration(seconds: 20),
    this.receiveTimeout = const Duration(seconds: 30),
  });

  /// Example: https://hrm.example.org/api/v1
  final String baseUrl;
  final Duration connectTimeout;
  final Duration receiveTimeout;
}
