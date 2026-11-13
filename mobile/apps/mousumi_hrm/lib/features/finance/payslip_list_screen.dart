import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class PayslipListScreen extends StatefulWidget {
  const PayslipListScreen({super.key});

  @override
  State<PayslipListScreen> createState() => _PayslipListScreenState();
}

class _PayslipListScreenState extends State<PayslipListScreen> {
  List<Map<String, dynamic>> _rows = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await ServiceLocator.api.payslips();
      if (!mounted) return;
      setState(() => _rows = rows);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(int id) async {
    try {
      final detail = await ServiceLocator.api.payslipShow(id);
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (context) {
          final earnings = (detail['earnings'] as List? ?? const []).whereType<Map>();
          final deductions = (detail['deductions'] as List? ?? const []).whereType<Map>();
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text('Net ${detail['net']}', style: Theme.of(context).textTheme.headlineMedium),
              Text('Gross ${detail['gross']} · Deduction ${detail['deduction']}'),
              const SizedBox(height: 12),
              Text('Earnings', style: Theme.of(context).textTheme.titleMedium),
              ...earnings.map((e) => ListTile(title: Text('${e['label']}'), trailing: Text('${e['amount']}'))),
              Text('Deductions', style: Theme.of(context).textTheme.titleMedium),
              ...deductions.map((e) => ListTile(title: Text('${e['label']}'), trailing: Text('${e['amount']}'))),
            ],
          );
        },
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mapDioError(error).message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payslips')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? AppErrorPanel(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _rows.isEmpty
                      ? ListView(children: const [SizedBox(height: 120), AppEmptyState(title: 'কোনো payslip নেই')])
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _rows.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final row = _rows[index];
                            return SoftCard(
                              onTap: () => _open((row['id'] as num).toInt()),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('${row['month']}/${row['year']} · ${row['salary_type']}', style: Theme.of(context).textTheme.titleMedium),
                                        const SizedBox(height: 4),
                                        Text('Net ${row['net']}', style: Theme.of(context).textTheme.bodyMedium),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right),
                                ],
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}
