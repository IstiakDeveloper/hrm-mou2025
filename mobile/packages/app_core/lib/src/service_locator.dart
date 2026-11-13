import 'dart:io';

import 'package:api_client/api_client.dart';
import 'package:auth_session/auth_session.dart';
import 'package:flutter/foundation.dart';

import 'app_environment.dart';

class ServiceLocator {
  ServiceLocator._();

  static late final AppEnvironment env;
  static late final SessionStore sessionStore;
  static late final MousumiApiClient api;
  static late final SessionController session;

  static Future<void> init(AppEnvironment environment) async {
    env = environment;
    sessionStore = SessionStore();

    api = MousumiApiClient(
      config: ApiConfig(baseUrl: environment.apiBaseUrl),
      tokenReader: sessionStore.readToken,
      deviceHeaders: () async {
        final deviceId = await sessionStore.deviceId();
        return {
          'X-Device-Id': deviceId,
          'X-App-Version': environment.appVersion,
          'X-Platform': _platform(),
          'Accept-Language': 'bn',
        };
      },
    );

    session = SessionController(api: api, store: sessionStore);
  }

  static String _platform() {
    if (kIsWeb) {
      return 'web';
    }
    if (Platform.isIOS) {
      return 'ios';
    }
    if (Platform.isAndroid) {
      return 'android';
    }
    return 'unknown';
  }
}
