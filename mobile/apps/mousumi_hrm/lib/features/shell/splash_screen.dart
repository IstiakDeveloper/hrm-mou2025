import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({
    super.key,
    this.message,
    this.onRetry,
  });

  final String? message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MousumiColors.canvas,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset(
                'assets/branding/logo.png',
                width: 120,
                height: 120,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Text(
                  'Mousumi',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w700,
                    color: MousumiColors.brandPrimary,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Mousumi HRM',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: MousumiColors.brandPrimary,
                ),
              ),
              const SizedBox(height: 24),
              if (onRetry == null) ...[
                const SizedBox(
                  width: 28,
                  height: 28,
                  child: CircularProgressIndicator(strokeWidth: 2.5),
                ),
              ] else ...[
                Text(
                  message ?? 'কানেক্ট করা যাচ্ছে না।',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: MousumiColors.textSecondary,
                      ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: onRetry,
                  child: const Text('আবার চেষ্টা'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
