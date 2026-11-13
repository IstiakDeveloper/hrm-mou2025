import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});

  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  List<Map<String, dynamic>> _notifications = const [];
  List<Map<String, dynamic>> _notices = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final notifications = await ServiceLocator.api.notifications();
      final notices = await ServiceLocator.api.notices();
      if (!mounted) return;
      setState(() {
        _notifications = notifications;
        _notices = notices;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tabs,
          tabs: const [
            Tab(text: 'Notifications'),
            Tab(text: 'Notices'),
          ],
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? AppErrorPanel(message: _error!, onRetry: _load)
                  : TabBarView(
                      controller: _tabs,
                      children: [
                        _List(rows: _notifications, onRefresh: _load),
                        _List(rows: _notices, onRefresh: _load),
                      ],
                    ),
        ),
      ],
    );
  }
}

class _List extends StatelessWidget {
  const _List({required this.rows, required this.onRefresh});

  final List<Map<String, dynamic>> rows;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: rows.isEmpty
          ? ListView(children: const [SizedBox(height: 120), AppEmptyState(title: 'খালি')])
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: rows.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final row = rows[index];
                return ListTile(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: MousumiColors.border),
                  ),
                  title: Text('${row['title']}'),
                  subtitle: Text('${row['message']}'),
                  trailing: row['read'] == true ? null : const StatusChip(label: 'Unread'),
                );
              },
            ),
    );
  }
}
