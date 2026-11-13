import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: MousumiColors.canvas,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Mousumi',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w700,
                color: MousumiColors.brandPrimary,
              ),
            ),
            SizedBox(height: 8),
            Text('HRM', style: TextStyle(color: MousumiColors.textSecondary)),
            SizedBox(height: 24),
            SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
          ],
        ),
      ),
    );
  }
}
