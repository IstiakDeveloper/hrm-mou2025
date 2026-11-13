import 'package:api_client/api_client.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

typedef ListLoader = Future<List<Map<String, dynamic>>> Function();

class SimpleListScreen extends StatefulWidget {
  const SimpleListScreen({
    super.key,
    required this.title,
    required this.loader,
    required this.titleOf,
    this.subtitleOf,
    this.onTap,
    this.floatingAction,
  });

  final String title;
  final ListLoader loader;
  final String Function(Map<String, dynamic> row) titleOf;
  final String Function(Map<String, dynamic> row)? subtitleOf;
  final void Function(BuildContext context, Map<String, dynamic> row)? onTap;
  final Widget? floatingAction;

  @override
  State<SimpleListScreen> createState() => _SimpleListScreenState();
}

class _SimpleListScreenState extends State<SimpleListScreen> {
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
      final rows = await widget.loader();
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
      title: widget.title,
      loading: _loading,
      error: _error,
      onRetry: _load,
      onRefresh: _load,
      floatingActionButton: widget.floatingAction,
      body: _rows.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 80),
                AppEmptyState(title: 'এখন কিছু নেই', icon: Icons.folder_open),
              ],
            )
          : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _rows.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final row = _rows[index];
                            return SoftCard(
                              onTap: widget.onTap == null ? null : () => widget.onTap!(context, row),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(widget.titleOf(row), style: Theme.of(context).textTheme.titleMedium),
                                  if (widget.subtitleOf != null) ...[
                                    const SizedBox(height: 4),
                                    Text(widget.subtitleOf!(row), style: Theme.of(context).textTheme.bodyMedium),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
    );
  }
}
