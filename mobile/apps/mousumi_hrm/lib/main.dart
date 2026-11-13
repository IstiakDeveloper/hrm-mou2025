import 'package:app_core/app_core.dart';
import 'package:auth_session/auth_session.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'features/auth/login_screen.dart';
import 'features/shell/app_shell.dart';
import 'features/shell/biometric_gate.dart';
import 'features/shell/penalty_lock_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Never block first frame on storage/network.
  await ServiceLocator.init(AppEnvironment.fromDartDefine());
  // Show login immediately; restore session in background.
  ServiceLocator.session.forceGuest();
  runApp(const MousumiApp());
  // Fire-and-forget session restore after UI is up.
  // ignore: unawaited_futures
  ServiceLocator.session.restore();
}

class MousumiApp extends StatelessWidget {
  const MousumiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mousumi HRM',
      debugShowCheckedModeBanner: false,
      theme: MousumiTheme.light(banglaPreferred: true),
      locale: const Locale('bn'),
      supportedLocales: const [Locale('bn'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const _RootGate(),
    );
  }
}

class _RootGate extends StatelessWidget {
  const _RootGate();

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: ServiceLocator.session,
      builder: (context, _) {
        final session = ServiceLocator.session;
        return switch (session.status) {
          // Treat unknown as login so we never stick on a spinner.
          SessionStatus.unknown ||
          SessionStatus.guest ||
          SessionStatus.authenticating =>
            const LoginScreen(),
          SessionStatus.lockedFine =>
            const BiometricGate(child: PenaltyLockScreen()),
          SessionStatus.authenticated =>
            const BiometricGate(child: AppShell()),
        };
      },
    );
  }
}
