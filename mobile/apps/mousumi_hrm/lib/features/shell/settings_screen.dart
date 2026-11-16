import 'package:app_core/app_core.dart';
import 'package:api_client/api_client.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const _biometricKey = 'mousumi.biometric_unlock';
  final _storage = const FlutterSecureStorage();
  final _auth = LocalAuthentication();
  final _currentPassword = TextEditingController();
  final _password = TextEditingController();
  final _passwordConfirmation = TextEditingController();

  bool _biometricEnabled = false;
  bool _biometricAvailable = false;
  bool _savingPassword = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _currentPassword.dispose();
    _password.dispose();
    _passwordConfirmation.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final enabled = await _storage.read(key: _biometricKey);
    final canCheck = await _auth.canCheckBiometrics || await _auth.isDeviceSupported();
    if (!mounted) return;
    setState(() {
      _biometricEnabled = enabled == '1';
      _biometricAvailable = canCheck;
    });
  }

  Future<void> _toggleBiometric(bool value) async {
    if (value) {
      final ok = await _auth.authenticate(
        localizedReason: 'Enable biometric unlock for Mousumi HRM',
        options: const AuthenticationOptions(biometricOnly: true, stickyAuth: true),
      );
      if (!ok) {
        return;
      }
      await _storage.write(key: _biometricKey, value: '1');
    } else {
      await _storage.write(key: _biometricKey, value: '0');
    }
    if (!mounted) return;
    setState(() => _biometricEnabled = value);
  }

  Future<void> _changePassword() async {
    setState(() {
      _savingPassword = true;
      _message = null;
    });
    try {
      await ServiceLocator.api.changePassword(
        currentPassword: _currentPassword.text,
        password: _password.text,
        passwordConfirmation: _passwordConfirmation.text,
      );
      _currentPassword.clear();
      _password.clear();
      _passwordConfirmation.clear();
      setState(() => _message = 'পাসওয়ার্ড আপডেট হয়েছে।');
    } catch (error) {
      setState(() => _message = mapDioError(error).message);
    } finally {
      if (mounted) {
        setState(() => _savingPassword = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ServiceLocator.session;
    final bootstrap = session.bootstrap;

    return Scaffold(
      appBar: AppBar(title: const Text('নিরাপত্তা')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(bootstrap?.user.name ?? 'User', style: Theme.of(context).textTheme.titleLarge),
          Text(ServiceLocator.env.apiBaseUrl, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 16),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Biometric unlock'),
            subtitle: Text(
              _biometricAvailable
                  ? 'Device unlock only — server password বিকল্প নয়'
                  : 'এই ডিভাইসে biometric নেই',
            ),
            value: _biometricEnabled && _biometricAvailable,
            onChanged: _biometricAvailable ? _toggleBiometric : null,
          ),
          const Divider(height: 32),
          Text('পাসওয়ার্ড পরিবর্তন', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(
            controller: _currentPassword,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'বর্তমান পাসওয়ার্ড'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'নতুন পাসওয়ার্ড'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _passwordConfirmation,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'নতুন পাসওয়ার্ড (আবার)'),
          ),
          if (_message != null) ...[
            const SizedBox(height: 8),
            Text(_message!),
          ],
          const SizedBox(height: 12),
          PrimaryButton(
            label: 'পাসওয়ার্ড সেভ',
            loading: _savingPassword,
            onPressed: _savingPassword ? null : _changePassword,
          ),
          const SizedBox(height: 24),
          Text(
            'Password recovery: web-only (bootstrap auth_recovery).',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          PrimaryButton(
            label: 'লগ আউট',
            onPressed: () => ServiceLocator.session.logout(),
          ),
        ],
      ),
    );
  }
}
