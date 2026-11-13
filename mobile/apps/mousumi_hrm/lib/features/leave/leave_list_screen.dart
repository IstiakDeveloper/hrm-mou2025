import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

import 'leave_apply_screen.dart';
import 'leave_review_screen.dart';

class LeaveListScreen extends StatefulWidget {
  const LeaveListScreen({super.key, this.reviewMode = false});

  final bool reviewMode;

  @override
  State<LeaveListScreen> createState() => _LeaveListScreenState();
}

class _LeaveListScreenState extends State<LeaveListScreen> {
  List<LeaveApplicationItem> _items = const [];
  String? _error;
  bool _loading = true;

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
      final items = widget.reviewMode
          ? await ServiceLocator.api.pendingLeaveApplications()
          : await ServiceLocator.api.myLeaveApplications();
      if (!mounted) return;
      setState(() => _items = items);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.reviewMode ? 'Leave অনুমোদন' : 'আমার Leave'),
        actions: [
          if (!widget.reviewMode)
            IconButton(
              onPressed: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const LeaveApplyScreen()),
                );
                _load();
              },
              icon: const Icon(Icons.add),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? AppErrorPanel(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 120),
                            AppEmptyState(title: 'কোনো আবেদন নেই'),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _items.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final item = _items[index];
                            return ListTile(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: const BorderSide(color: MousumiColors.border),
                              ),
                              tileColor: MousumiColors.surface,
                              title: Text(item.leaveTypeName ?? 'Leave'),
                              subtitle: Text(
                                [
                                  if (item.employeeName != null) item.employeeName!,
                                  '${item.startDate} → ${item.endDate}',
                                  '${item.days} day(s)',
                                ].join('\n'),
                              ),
                              isThreeLine: true,
                              trailing: StatusChip(label: item.status),
                              onTap: () async {
                                await Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => LeaveReviewScreen(application: item),
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
