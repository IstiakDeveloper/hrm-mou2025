import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

import 'movement_create_screen.dart';
import 'movement_detail_screen.dart';

class MovementListScreen extends StatefulWidget {
  const MovementListScreen({super.key});

  @override
  State<MovementListScreen> createState() => _MovementListScreenState();
}

class _MovementListScreenState extends State<MovementListScreen> {
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
      final rows = await ServiceLocator.api.movementsMine();
      if (!mounted) return;
      setState(() => _rows = rows);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Movement')),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const MovementCreateScreen()),
          );
          _load();
        },
        child: const Icon(Icons.add),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? AppErrorPanel(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _rows.isEmpty
                      ? ListView(children: const [SizedBox(height: 120), AppEmptyState(title: 'কোনো movement নেই')])
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _rows.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final row = _rows[index];
                            return ListTile(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: const BorderSide(color: MousumiColors.border),
                              ),
                              title: Text('${row['destination'] ?? 'Movement'}'),
                              subtitle: Text('${row['purpose'] ?? ''}\n${row['from_datetime'] ?? ''}'),
                              isThreeLine: true,
                              trailing: StatusChip(label: '${row['status']}'),
                              onTap: () async {
                                await Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => MovementDetailScreen(movement: row),
                                  ),
                                );
                                _load();
                              },
                            );
                          },
                        ),
                ),
    );
  }
}
