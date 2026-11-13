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
    return EmployeePage(
      title: 'মুভমেন্ট',
      subtitle: 'নিজের আবেদন',
      loading: _loading,
      error: _error,
      onRetry: _load,
      onRefresh: _load,
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const MovementCreateScreen()),
          );
          _load();
        },
        child: const Icon(Icons.add),
      ),
      body: _rows.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 80),
                AppEmptyState(title: 'কোনো মুভমেন্ট নেই', icon: Icons.route),
              ],
            )
          : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _rows.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final row = _rows[index];
                            return SoftCard(
                              onTap: () async {
                                await Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => MovementDetailScreen(movement: row),
                                  ),
                                );
                                _load();
                              },
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text('${row['destination'] ?? 'Movement'}', style: Theme.of(context).textTheme.titleMedium),
                                      ),
                                      StatusChip(label: '${row['status']}'),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text('${row['purpose'] ?? ''}\n${row['from_datetime'] ?? ''}', style: Theme.of(context).textTheme.bodyMedium),
                                ],
                              ),
                            );
                          },
                        ),
    );
  }
}
