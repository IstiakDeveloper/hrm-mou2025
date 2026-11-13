import 'package:app_core/app_core.dart';
import 'package:auth_session/auth_session.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'features/auth/login_screen.dart';
import 'features/shell/app_shell.dart';
import 'features/shell/biometric_gate.dart';
import 'features/shell/penalty_lock_screen.dart';
import 'features/shell/splash_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ServiceLocator.init(AppEnvironment.fromDartDefine());
  runApp(const MousumiApp());
}

class MousumiApp extends StatelessWidget {
  const MousumiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: ServiceLocator.session,
      builder: (context, _) {
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
      },
    );
  }
}

class _RootGate extends StatefulWidget {
  const _RootGate();

  @override
  State<_RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<_RootGate> {
  @override
  void initState() {
    super.initState();
    ServiceLocator.session.restore();
  }

  @override
  Widget build(BuildContext context) {
    final session = ServiceLocator.session;

    return switch (session.status) {
      SessionStatus.unknown => const SplashScreen(),
      SessionStatus.guest || SessionStatus.authenticating => const LoginScreen(),
      SessionStatus.lockedFine => const BiometricGate(child: PenaltyLockScreen()),
      SessionStatus.authenticated => const BiometricGate(child: AppShell()),
    };
  }
}
