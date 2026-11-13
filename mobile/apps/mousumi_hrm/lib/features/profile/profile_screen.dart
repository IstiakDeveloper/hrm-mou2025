import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic> _employee = const {};
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
      final employee = await ServiceLocator.api.employeeMe();
      if (!mounted) return;
      setState(() => _employee = employee);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return EmployeePage(
      title: 'প্রোফাইল',
      subtitle: 'কর্মীর তথ্য',
      loading: _loading,
      error: _error,
      onRetry: _load,
      body: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    SoftCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${_employee['name'] ?? ''}', style: Theme.of(context).textTheme.titleLarge),
                          const SizedBox(height: 4),
                          Text('${_employee['designation_name'] ?? ''}', style: Theme.of(context).textTheme.bodyMedium),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    SoftCard(
                      child: Column(
                        children: [
                          _Row(label: 'PIN', value: '${_employee['pin'] ?? '—'}'),
                          _Row(label: 'ID', value: '${_employee['employee_code'] ?? '—'}'),
                          _Row(label: 'Branch', value: '${_employee['branch_name'] ?? '—'}'),
                          _Row(label: 'Department', value: '${_employee['department_name'] ?? '—'}'),
                          _Row(label: 'Mobile', value: '${_employee['mobile'] ?? '—'}'),
                          _Row(label: 'Email', value: '${_employee['email'] ?? '—'}'),
                          _Row(label: 'Status', value: '${_employee['status'] ?? '—'}'),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          SizedBox(width: 110, child: Text(label, style: Theme.of(context).textTheme.bodyMedium)),
          Expanded(child: Text(value, style: Theme.of(context).textTheme.titleMedium)),
        ],
      ),
    );
  }
}
