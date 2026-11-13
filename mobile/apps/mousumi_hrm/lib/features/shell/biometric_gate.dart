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
  bool _unlocked = false;
  bool _checking = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _maybeUnlock();
  }

  Future<void> _maybeUnlock() async {
    const storage = FlutterSecureStorage();
    final enabled = await storage.read(key: _key);
    if (enabled != '1') {
      if (!mounted) return;
      setState(() {
        _unlocked = true;
        _checking = false;
      });
      return;
    }

    final auth = LocalAuthentication();
    try {
      final ok = await auth.authenticate(
        localizedReason: 'Unlock Mousumi HRM',
        options: const AuthenticationOptions(biometricOnly: true, stickyAuth: true),
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
        _unlocked = true; // fail open to password session already on device
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
