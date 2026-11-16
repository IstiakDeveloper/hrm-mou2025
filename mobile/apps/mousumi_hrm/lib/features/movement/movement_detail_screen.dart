import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class MovementDetailScreen extends StatefulWidget {
  const MovementDetailScreen({super.key, required this.movement});

  final Map<String, dynamic> movement;

  @override
  State<MovementDetailScreen> createState() => _MovementDetailScreenState();
}

class _MovementDetailScreenState extends State<MovementDetailScreen> {
  late Map<String, dynamic> _movement = widget.movement;
  final _workResult = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _workResult.dispose();
    super.dispose();
  }

  List<String> get _actions =>
      (_movement['allowed_actions'] as List? ?? const []).map((e) => e.toString()).toList();

  Future<void> _complete() async {
    if (_workResult.text.trim().length < 5) {
      setState(() => _error = 'কাজের ফলাফল কমপক্ষে ৫ অক্ষর লিখুন।');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final updated = await ServiceLocator.api.completeMovement(
        (_movement['id'] as num).toInt(),
        workResult: _workResult.text.trim(),
      );
      if (!mounted) return;
      setState(() => _movement = updated);
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _cancel() async {
    setState(() => _busy = true);
    try {
      await ServiceLocator.api.cancelMovement((_movement['id'] as num).toInt());
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Movement বিস্তারিত')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('${_movement['destination']}', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          StatusChip(label: '${_movement['status']}'),
          const SizedBox(height: 12),
          Text('${_movement['purpose']}'),
          Text('${_movement['from_datetime']} → ${_movement['to_datetime']}'),
          if (_actions.contains('complete')) ...[
            const SizedBox(height: 16),
            TextField(
              controller: _workResult,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Work result'),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: MousumiColors.error)),
          ],
          const SizedBox(height: 16),
          if (_actions.contains('complete'))
            PrimaryButton(label: 'Complete', loading: _busy, onPressed: _busy ? null : _complete),
          if (_actions.contains('cancel')) ...[
            const SizedBox(height: 10),
            PrimaryButton(label: 'Cancel', loading: _busy, onPressed: _busy ? null : _cancel),
          ],
        ],
      ),
    );
  }
}
