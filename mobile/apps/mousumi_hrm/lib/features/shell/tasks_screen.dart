import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

import '../approvals/approval_action_screen.dart';
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

  List<Map<String, dynamic>> _list(String key) => ((_payload[key] as List?) ?? const [])
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();

  Future<void> _open(Map<String, dynamic> row, {required bool review}) async {
    final module = '${row['module']}';
    if (module == 'leave') {
      await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => LeaveListScreen(reviewMode: review)),
      );
    } else if (module == 'movement') {
      await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MovementListScreen()));
    } else if (module == 'appraisal' || module == 'logbook' || module == 'loan') {
      await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ApprovalActionScreen(row: row)),
      );
    }
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SkeletonList();
    }
    if (_error != null) {
      return AppErrorPanel(message: _error!, onRetry: _load);
    }

    final mine = _list('mine');
    final reviews = _list('reviews');

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
        children: [
          Text('Tasks', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text(
            'নিজের pending, আর যেগুলো আপনি অনুমোদন করতে পারেন।',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 18),
          const SectionLabel(title: 'Needs your approval'),
          const SizedBox(height: 8),
          if (reviews.isEmpty)
            const SizedBox(
              height: 200,
              child: AppEmptyState(
                title: 'এখন কিছু অপেক্ষায় নেই',
                icon: Icons.task_alt,
              ),
            )
          else
            for (final row in reviews) ...[
              _TaskCard(row: row, review: true, onTap: () => _open(row, review: true)),
              const SizedBox(height: 10),
            ],
          const SizedBox(height: 12),
          const SectionLabel(title: 'My requests'),
          const SizedBox(height: 8),
          if (mine.isEmpty) const Text('নিজের pending নেই।')
          else
            for (final row in mine) ...[
              _TaskCard(row: row, review: false, onTap: () => _open(row, review: false)),
              const SizedBox(height: 10),
            ],
        ],
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({required this.row, required this.review, required this.onTap});

  final Map<String, dynamic> row;
  final bool review;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SoftCard(
      onTap: onTap,
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: review ? const Color(0xFFFFF7ED) : MousumiColors.primarySubtle,
            child: Icon(
              review ? Icons.how_to_reg_outlined : Icons.pending_actions_outlined,
              color: review ? MousumiColors.warning : MousumiColors.brandPrimary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${row['title']}', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 2),
                Text('${row['subtitle']}', style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ),
          StatusChip(label: '${row['status']}', tone: review ? StatusTone.warning : StatusTone.info),
        ],
      ),
    );
  }
}
