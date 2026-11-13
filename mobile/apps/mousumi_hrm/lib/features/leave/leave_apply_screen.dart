import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class LeaveApplyScreen extends StatefulWidget {
  const LeaveApplyScreen({super.key});

  @override
  State<LeaveApplyScreen> createState() => _LeaveApplyScreenState();
}

class _LeaveApplyScreenState extends State<LeaveApplyScreen> {
  final _reason = TextEditingController();
  final _contact = TextEditingController();
  List<LeaveTypeOption> _types = const [];
  List<LeaveBalanceItem> _balances = const [];
  LeaveTypeOption? _selected;
  DateTimeRange? _range;
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _reason.dispose();
    _contact.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    try {
      final types = await ServiceLocator.api.leaveTypes();
      final balances = await ServiceLocator.api.leaveBalances();
      if (!mounted) return;
      setState(() {
        _types = types;
        _balances = balances;
        _selected = types.isNotEmpty ? types.first : null;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = mapDioError(error).message;
        _loading = false;
      });
    }
  }

  String _fmt(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _pickRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 1),
      initialDateRange: _range ?? DateTimeRange(start: now, end: now),
    );
    if (picked != null) {
      setState(() => _range = picked);
    }
  }

  Future<void> _submit() async {
    if (_selected == null || _range == null || _reason.text.trim().isEmpty) {
      setState(() => _error = 'Leave type, তারিখ এবং কারণ দিন।');
      return;
    }
    if (_selected!.requiresDocument) {
      setState(() => _error = 'Medical leave-এর জন্য এখনো document upload mobile-এ আসছে; web ব্যবহার করুন অথবা অন্য type বেছে নিন।');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ServiceLocator.api.createLeaveApplication(
        leaveTypeId: _selected!.id,
        startDate: _fmt(_range!.start),
        endDate: _fmt(_range!.end),
        reason: _reason.text.trim(),
        contact: _contact.text.trim(),
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    LeaveBalanceItem? balance;
    for (final item in _balances) {
      if (item.leaveTypeId == _selected?.id) {
        balance = item;
        break;
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Leave আবেদন')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                DropdownButtonFormField<LeaveTypeOption>(
                  value: _selected,
                  items: [
                    for (final type in _types)
                      DropdownMenuItem(value: type, child: Text(type.name)),
                  ],
                  onChanged: (value) => setState(() => _selected = value),
                  decoration: const InputDecoration(labelText: 'Leave type'),
                ),
                const SizedBox(height: 12),
                if (balance != null)
                  Text(
                    'Remaining: ${balance.remainingDays} / ${balance.allocatedDays}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                const SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    _range == null
                        ? 'তারিখ বাছুন'
                        : '${_fmt(_range!.start)} → ${_fmt(_range!.end)}',
                  ),
                  trailing: const Icon(Icons.date_range),
                  onTap: _pickRange,
                ),
                TextField(
                  controller: _reason,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'কারণ'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _contact,
                  decoration: const InputDecoration(labelText: 'যোগাযোগ (ঐচ্ছিক)'),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: MousumiColors.error)),
                ],
                const SizedBox(height: 20),
                PrimaryButton(
                  label: 'জমা দিন',
                  loading: _submitting,
                  onPressed: _submitting ? null : _submit,
                ),
              ],
            ),
    );
  }
}
