import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class PenaltyLockScreen extends StatefulWidget {
  const PenaltyLockScreen({super.key});

  @override
  State<PenaltyLockScreen> createState() => _PenaltyLockScreenState();
}

class _PenaltyLockScreenState extends State<PenaltyLockScreen> {
  Map<String, dynamic>? _status;
  final _sender = TextEditingController();
  final _trx = TextEditingController();
  String _method = 'bkash';
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _sender.dispose();
    _trx.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final status = await ServiceLocator.api.penaltyStatus();
      if (!mounted) return;
      setState(() => _status = status);
      if (status['locked'] != true) {
        await ServiceLocator.session.restore();
      }
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    final penalty = _status?['penalty'] as Map?;
    if (penalty == null) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ServiceLocator.api.submitPenalty({
        'penalty_id': penalty['id'],
        'payment_method': _method,
        'sender_number': _sender.text.trim(),
        'transaction_id': _trx.text.trim(),
      });
      await _load();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final penalty = _status?['penalty'] as Map?;
    return Scaffold(
      body: SafeArea(
        child: _loading
            ? const SkeletonList(count: 3)
            : ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  Text('Movement fine pending', style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 12),
                  Text(
                    'জরিমানা পরিশোধের রেফারেন্স জমা না দিলে অন্য মডিউল লক থাকবে।',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  if (penalty != null) ...[
                    const SizedBox(height: 16),
                    Text('Amount: ${penalty['amount']}'),
                    Text('Status: ${penalty['status']}'),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _method,
                      items: const [
                        DropdownMenuItem(value: 'bkash', child: Text('bKash')),
                        DropdownMenuItem(value: 'nagad', child: Text('Nagad')),
                      ],
                      onChanged: (v) => setState(() => _method = v ?? 'bkash'),
                      decoration: const InputDecoration(labelText: 'Payment method'),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _sender,
                      keyboardType: TextInputType.phone,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: const InputDecoration(labelText: 'Sender number'),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _trx,
                      decoration: const InputDecoration(labelText: 'Transaction ID (optional)'),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Text(_error!, style: const TextStyle(color: MousumiColors.error)),
                    ],
                    const SizedBox(height: 16),
                    PrimaryButton(
                      label: 'রেফারেন্স জমা দিন',
                      loading: _submitting,
                      onPressed: _submitting ? null : _submit,
                    ),
                  ],
                  const SizedBox(height: 16),
                  PrimaryButton(
                    label: 'লগ আউট',
                    onPressed: () => ServiceLocator.session.logout(),
                  ),
                ],
              ),
      ),
    );
  }
}
