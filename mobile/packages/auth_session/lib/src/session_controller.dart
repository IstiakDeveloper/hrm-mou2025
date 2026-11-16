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
    try {
      final token = await _store.readToken().timeout(const Duration(seconds: 5));
      if (token == null || token.isEmpty) {
        status = SessionStatus.guest;
        lastError = null;
        notifyListeners();
        return;
      }

      bootstrap = await _api.bootstrap().timeout(const Duration(seconds: 25));
      status = bootstrap!.movementFineLocked
          ? SessionStatus.lockedFine
          : SessionStatus.authenticated;
      lastError = null;
    } catch (error, stack) {
      debugPrint('SessionController.restore failed: $error\n$stack');
      final mapped = mapDioError(error);
      if (mapped.statusCode == 401) {
        await _store.clearToken();
        lastError = null;
      } else {
        await _store.clearToken();
        lastError = mapped.message;
      }
      bootstrap = null;
      status = SessionStatus.guest;
    }
    notifyListeners();
  }

  Future<bool> loginStaff(String login, String password) async {
    status = SessionStatus.authenticating;
    lastError = null;
    notifyListeners();

    try {
      final result = await _api
          .loginStaff(login: login, password: password)
          .timeout(const Duration(seconds: 30));
      await _store.writeToken(result.token);
      bootstrap = result.bootstrap;
      status = bootstrap!.movementFineLocked
          ? SessionStatus.lockedFine
          : SessionStatus.authenticated;
      notifyListeners();
      return true;
    } catch (error, stack) {
      debugPrint('SessionController.loginStaff failed: $error\n$stack');
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
      final result = await _api
          .loginBranch(branchId: branchId, pin: pin)
          .timeout(const Duration(seconds: 30));
      await _store.writeToken(result.token);
      bootstrap = result.bootstrap;
      status = bootstrap!.movementFineLocked
          ? SessionStatus.lockedFine
          : SessionStatus.authenticated;
      notifyListeners();
      return true;
    } catch (error, stack) {
      debugPrint('SessionController.loginBranch failed: $error\n$stack');
      lastError = mapDioError(error).message;
      status = SessionStatus.guest;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _api.logout().timeout(const Duration(seconds: 10));
    } catch (_) {
      // Still clear local session.
    }
    await _store.clearToken();
    bootstrap = null;
    status = SessionStatus.guest;
    notifyListeners();
  }

  void forceGuest({String? error}) {
    status = SessionStatus.guest;
    if (error != null) {
      lastError = error;
    }
    notifyListeners();
  }
}
