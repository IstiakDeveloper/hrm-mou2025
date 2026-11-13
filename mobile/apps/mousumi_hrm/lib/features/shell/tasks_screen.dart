import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

import '../leave/leave_list_screen.dart';
import '../movement/movement_list_screen.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  Map<String, dynamic> _payload = const {};
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
      final payload = await ServiceLocator.api.tasks();
      if (!mounted) return;
      setState(() => _payload = payload);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> _list(String key) =>
      ((_payload[key] as List?) ?? const []).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();

  void _open(Map<String, dynamic> row) {
    final module = '${row['module']}';
    if (module == 'leave') {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LeaveListScreen()));
    } else if (module == 'movement') {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MovementListScreen()));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return AppErrorPanel(message: _error!, onRetry: _load);
    }

    final mine = _list('mine');
    final reviews = _list('reviews');

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Tasks', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 12),
          Text('Mine (${mine.length})', style: Theme.of(context).textTheme.titleMedium),
          ...mine.map((row) => ListTile(
                title: Text('${row['title']}'),
                subtitle: Text('${row['subtitle']}'),
                trailing: StatusChip(label: '${row['status']}'),
                onTap: () => _open(row),
              )),
          if (mine.isEmpty) const AppEmptyState(title: 'নিজের pending নেই'),
          const SizedBox(height: 16),
          Text('Reviews (${reviews.length})', style: Theme.of(context).textTheme.titleMedium),
          ...reviews.map((row) => ListTile(
                title: Text('${row['title']}'),
                subtitle: Text('${row['subtitle']}'),
                trailing: StatusChip(label: '${row['status']}'),
                onTap: () => _open(row),
              )),
          if (reviews.isEmpty) const AppEmptyState(title: 'Review pending নেই'),
        ],
      ),
    );
  }
}
