import 'package:app_core/app_core.dart';
import 'package:auth_session/auth_session.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _login = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _login.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    await ServiceLocator.session.loginStaff(_login.text.trim(), _password.text);
  }

  @override
  Widget build(BuildContext context) {
    final session = ServiceLocator.session;
    final busy = session.status == SessionStatus.authenticating;

    return Scaffold(
      backgroundColor: MousumiColors.canvas,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
          children: [
            const Center(
              child: _LogoMark(),
            ),
            const SizedBox(height: 20),
            Text(
              'Mousumi HRM',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: MousumiColors.brandPrimary,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'কর্মীর নিজের কাজ, আর শুধু যেগুলো আপনার অনুমোদনের অপেক্ষায়।',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: MousumiColors.textSecondary,
                  ),
            ),
            const SizedBox(height: 28),
            SoftCard(
              padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Employee login', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(
                    'ইউজারনেম বা ইমেইল দিয়ে প্রবেশ করুন।',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 18),
                  TextField(
                    controller: _login,
                    textInputAction: TextInputAction.next,
                    autocorrect: false,
                    decoration: const InputDecoration(
                      labelText: 'ইউজারনেম বা ইমেইল',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _password,
                    obscureText: _obscure,
                    onSubmitted: (_) => busy ? null : _submit(),
                    decoration: InputDecoration(
                      labelText: 'পাসওয়ার্ড',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscure = !_obscure),
                        icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                      ),
                    ),
                  ),
                  if (session.lastError != null) ...[
                    const SizedBox(height: 14),
                    Text(
                      session.lastError!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: MousumiColors.error),
                    ),
                  ],
                  const SizedBox(height: 18),
                  PrimaryButton(
                    label: 'লগ ইন',
                    loading: busy,
                    onPressed: busy ? null : _submit,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LogoMark extends StatelessWidget {
  const _LogoMark();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 96,
      height: 96,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: MousumiColors.border),
        boxShadow: const [
          BoxShadow(color: Color(0x14087F3E), blurRadius: 24, offset: Offset(0, 10)),
        ],
      ),
      child: Image.asset(
        'assets/branding/logo.png',
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => const Icon(Icons.spa, color: MousumiColors.brandPrimary, size: 40),
      ),
    );
  }
}
