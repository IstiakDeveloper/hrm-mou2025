enum AppFlavor { development, staging, production }

class AppEnvironment {
  const AppEnvironment({
    required this.flavor,
    required this.apiBaseUrl,
    required this.appVersion,
  });

  final AppFlavor flavor;
  final String apiBaseUrl;
  final String appVersion;

  static AppEnvironment fromDartDefine() {
    const flavorName = String.fromEnvironment('FLAVOR', defaultValue: 'development');
    const configuredApi = String.fromEnvironment('API_BASE_URL');
    const appVersion = String.fromEnvironment('APP_VERSION', defaultValue: '1.0.0');

    final flavor = switch (flavorName) {
      'production' => AppFlavor.production,
      'staging' => AppFlavor.staging,
      _ => AppFlavor.development,
    };

    final apiBaseUrl = configuredApi.isNotEmpty
        ? configuredApi
        : switch (flavor) {
            AppFlavor.production => 'https://hrm.mousumibd.org/api/v1',
            AppFlavor.staging => 'https://hrm.mousumibd.org/api/v1',
            AppFlavor.development => 'http://10.0.2.2:8000/api/v1',
          };

    return AppEnvironment(
      flavor: flavor,
      apiBaseUrl: apiBaseUrl,
      appVersion: appVersion,
    );
  }
}
