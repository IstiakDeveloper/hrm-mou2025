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
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      floatingActionButton: widget.floatingAction,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? AppErrorPanel(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _rows.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 120),
                            AppEmptyState(title: 'কোনো ডাটা নেই'),
                          ],
                        )
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
                              tileColor: MousumiColors.surface,
                              title: Text(widget.titleOf(row)),
                              subtitle: widget.subtitleOf == null ? null : Text(widget.subtitleOf!(row)),
                              onTap: widget.onTap == null ? null : () => widget.onTap!(context, row),
                            );
                          },
                        ),
                ),
    );
  }
}
