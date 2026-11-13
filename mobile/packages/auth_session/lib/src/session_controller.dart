import 'package:api_client/api_client.dart';
import 'package:flutter/foundation.dart';

import 'session_store.dart';

enum SessionStatus { unknown, guest, authenticating, authenticated, lockedFine }

class SessionController extends ChangeNotifier {
  SessionController({
    required MousumiApiClient api,
    required SessionStore store,
  })  : _api = api,
        _store = store;

  final MousumiApiClient _api;
  final SessionStore _store;

  SessionStatus status = SessionStatus.unknown;
  BootstrapData? bootstrap;
  String? lastError;

  Future<void> restore() async {
    final token = await _store.readToken();
    if (token == null || token.isEmpty) {
      status = SessionStatus.guest;
      notifyListeners();
      return;
    }

    try {
      bootstrap = await _api.bootstrap();
      status = bootstrap!.movementFineLocked
          ? SessionStatus.lockedFine
          : SessionStatus.authenticated;
      lastError = null;
    } catch (error) {
      final mapped = mapDioError(error);
      if (mapped.statusCode == 401) {
        await _store.clearToken();
        status = SessionStatus.guest;
      } else {
        status = SessionStatus.guest;
        lastError = mapped.message;
        await _store.clearToken();
      }
    }
    notifyListeners();
  }

  Future<bool> loginStaff(String login, String password) async {
    status = SessionStatus.authenticating;
    lastError = null;
    notifyListeners();

    try {
      final result = await _api.loginStaff(login: login, password: password);
      await _store.writeToken(result.token);
      bootstrap = result.bootstrap;
      status = bootstrap!.movementFineLocked
          ? SessionStatus.lockedFine
          : SessionStatus.authenticated;
      notifyListeners();
      return true;
    } catch (error) {
      lastError = mapDioError(error).message;
      status = SessionStatus.guest;
      notifyListeners();
      return false;
    }
  }

  Future<bool> loginBranch(int branchId, String pin) async {
    status = SessionStatus.authenticating;
    lastError = null;
    notifyListeners();

    try {
      final result = await _api.loginBranch(branchId: branchId, pin: pin);
      await _store.writeToken(result.token);
      bootstrap = result.bootstrap;
      status = bootstrap!.movementFineLocked
          ? SessionStatus.lockedFine
          : SessionStatus.authenticated;
      notifyListeners();
      return true;
    } catch (error) {
      lastError = mapDioError(error).message;
      status = SessionStatus.guest;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _api.logout();
    } catch (_) {
      // Still clear local session.
    }
    await _store.clearToken();
    bootstrap = null;
    status = SessionStatus.guest;
    notifyListeners();
  }
}
