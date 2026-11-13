import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

/// Local device unlock only — never replaces server authentication.
class BiometricGate extends StatefulWidget {
  const BiometricGate({super.key, required this.child});

  final Widget child;

  @override
  State<BiometricGate> createState() => _BiometricGateState();
}

class _BiometricGateState extends State<BiometricGate> {
  static const _key = 'mousumi.biometric_unlock';
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  bool _unlocked = false;
  bool _checking = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _maybeUnlock();
  }

  Future<void> _maybeUnlock() async {
    try {
      final enabled = await _storage.read(key: _key).timeout(const Duration(seconds: 3));
      if (enabled != '1') {
        if (!mounted) return;
        setState(() {
          _unlocked = true;
          _checking = false;
        });
        return;
      }

      final auth = LocalAuthentication();
      final ok = await auth.authenticate(
        localizedReason: 'Unlock Mousumi HRM',
        options: const AuthenticationOptions(biometricOnly: false, stickyAuth: true),
      );
      if (!mounted) return;
      setState(() {
        _unlocked = ok;
        _checking = false;
        _error = ok ? null : 'Biometric unlock failed.';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _unlocked = true; // fail open — server session already established
        _checking = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!_unlocked) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error ?? 'Unlock required'),
              const SizedBox(height: 12),
              FilledButton(onPressed: _maybeUnlock, child: const Text('আবার চেষ্টা')),
            ],
          ),
        ),
      );
    }
    return widget.child;
  }
}
