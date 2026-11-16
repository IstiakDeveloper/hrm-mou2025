import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SessionStore {
  SessionStore({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  static const _tokenKey = 'mousumi.access_token';
  static const _deviceIdKey = 'mousumi.device_id';
  static const _timeout = Duration(seconds: 4);

  final FlutterSecureStorage _storage;
  String? _memoryToken;
  String? _memoryDeviceId;

  Future<String?> readToken() async {
    if (_memoryToken != null) {
      return _memoryToken;
    }
    try {
      final value = await _storage.read(key: _tokenKey).timeout(_timeout);
      _memoryToken = value;
      return value;
    } catch (error, stack) {
      debugPrint('SessionStore.readToken secure failed: $error\n$stack');
      try {
        final prefs = await SharedPreferences.getInstance().timeout(_timeout);
        final value = prefs.getString(_tokenKey);
        _memoryToken = value;
        return value;
      } catch (_) {
        return _memoryToken;
      }
    }
  }

  Future<void> writeToken(String token) async {
    _memoryToken = token;
    try {
      await _storage.write(key: _tokenKey, value: token).timeout(_timeout);
    } catch (error, stack) {
      debugPrint('SessionStore.writeToken secure failed: $error\n$stack');
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, token);
    }
  }

  Future<void> clearToken() async {
    _memoryToken = null;
    try {
      await _storage.delete(key: _tokenKey).timeout(_timeout);
    } catch (_) {}
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_tokenKey);
    } catch (_) {}
  }

  Future<String> deviceId() async {
    if (_memoryDeviceId != null && _memoryDeviceId!.isNotEmpty) {
      return _memoryDeviceId!;
    }

    try {
      final existing = await _storage.read(key: _deviceIdKey).timeout(_timeout);
      if (existing != null && existing.isNotEmpty) {
        _memoryDeviceId = existing;
        return existing;
      }
    } catch (error, stack) {
      debugPrint('SessionStore.deviceId secure read failed: $error\n$stack');
    }

    try {
      final prefs = await SharedPreferences.getInstance().timeout(_timeout);
      final existing = prefs.getString(_deviceIdKey);
      if (existing != null && existing.isNotEmpty) {
        _memoryDeviceId = existing;
        return existing;
      }
    } catch (_) {}

    final created = 'dev_${DateTime.now().microsecondsSinceEpoch}';
    _memoryDeviceId = created;
    try {
      await _storage.write(key: _deviceIdKey, value: created).timeout(_timeout);
    } catch (_) {
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_deviceIdKey, created);
      } catch (_) {}
    }
    return created;
  }
}
