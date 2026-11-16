import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class LeaveReviewScreen extends StatefulWidget {
  const LeaveReviewScreen({super.key, required this.application});

  final LeaveApplicationItem application;

  @override
  State<LeaveReviewScreen> createState() => _LeaveReviewScreenState();
}

class _LeaveReviewScreenState extends State<LeaveReviewScreen> {
  late LeaveApplicationItem _application = widget.application;
  final _comment = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _run(Future<LeaveApplicationItem> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = await action();
      if (!mounted) return;
      setState(() => _application = updated);
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final actions = _application.allowedActions;

    return Scaffold(
      appBar: AppBar(title: const Text('Leave বিস্তারিত')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(_application.leaveTypeName ?? 'Leave', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          StatusChip(label: _application.status),
          const SizedBox(height: 12),
          Text('${_application.startDate} → ${_application.endDate}'),
          Text('${_application.days} day(s)'),
          if (_application.employeeName != null) Text(_application.employeeName!),
          const SizedBox(height: 12),
          Text(_application.reason ?? '', style: Theme.of(context).textTheme.bodyLarge),
          if (_application.rejectionReason != null) ...[
            const SizedBox(height: 8),
            Text('Rejected: ${_application.rejectionReason}', style: const TextStyle(color: MousumiColors.error)),
          ],
          if (actions.contains('approve') || actions.contains('reject')) ...[
            const SizedBox(height: 16),
            TextField(
              controller: _comment,
              decoration: const InputDecoration(labelText: 'মন্তব্য / কারণ'),
              maxLines: 3,
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: MousumiColors.error)),
          ],
          const SizedBox(height: 20),
          if (actions.contains('cancel'))
            PrimaryButton(
              label: 'বাতিল করুন',
              loading: _busy,
              onPressed: _busy ? null : () => _run(() => ServiceLocator.api.cancelLeave(_application.id)),
            ),
          if (actions.contains('approve')) ...[
            const SizedBox(height: 10),
            PrimaryButton(
              label: 'অনুমোদন',
              loading: _busy,
              onPressed: _busy
                  ? null
                  : () => _run(
                        () => ServiceLocator.api.approveLeave(
                          _application.id,
                          comments: _comment.text.trim().isEmpty ? null : _comment.text.trim(),
                        ),
                      ),
            ),
          ],
          if (actions.contains('reject')) ...[
            const SizedBox(height: 10),
            PrimaryButton(
              label: 'প্রত্যাখ্যান',
              loading: _busy,
              onPressed: _busy
                  ? null
                  : () {
                      if (_comment.text.trim().isEmpty) {
                        setState(() => _error = 'প্রত্যাখ্যানের কারণ দিন।');
                        return;
                      }
                      _run(
                        () => ServiceLocator.api.rejectLeave(
                          _application.id,
                          reason: _comment.text.trim(),
                        ),
                      );
                    },
            ),
          ],
        ],
      ),
    );
  }
}
