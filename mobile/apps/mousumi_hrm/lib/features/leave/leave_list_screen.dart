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
    return EmployeePage(
      title: widget.reviewMode ? 'অনুমোদন' : 'ছুটি',
      subtitle: widget.reviewMode ? 'আপনার সিদ্ধান্তের অপেক্ষায়' : 'নিজের আবেদন',
      loading: _loading,
      error: _error,
      onRetry: _load,
      onRefresh: _load,
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
      body: _items.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                const SizedBox(height: 80),
                AppEmptyState(
                  title: widget.reviewMode ? 'এখন কিছু অপেক্ষায় নেই' : 'কোনো আবেদন নেই',
                  message: widget.reviewMode ? null : 'নতুন ছুটির আবেদন করতে পারেন।',
                  icon: Icons.event_busy,
                  actionLabel: widget.reviewMode ? null : 'আবেদন করুন',
                  onAction: widget.reviewMode
                      ? null
                      : () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const LeaveApplyScreen()),
                          );
                          _load();
                        },
                ),
              ],
            )
          : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _items.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final item = _items[index];
                            return SoftCard(
                              onTap: () async {
                                await Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => LeaveReviewScreen(application: item),
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
                                        child: Text(
                                          item.leaveTypeName ?? 'Leave',
                                          style: Theme.of(context).textTheme.titleMedium,
                                        ),
                                      ),
                                      StatusChip(label: item.status),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    [
                                      if (item.employeeName != null) item.employeeName!,
                                      '${item.startDate} → ${item.endDate}',
                                      '${item.days} day(s)',
                                    ].join('\n'),
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
    );
  }
}
