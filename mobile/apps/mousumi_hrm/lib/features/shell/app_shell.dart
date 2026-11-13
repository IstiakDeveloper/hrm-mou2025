import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

import '../attendance/attendance_screen.dart';
import '../inbox/inbox_screen.dart';
import '../leave/leave_list_screen.dart';
import '../modules/module_router.dart';
import '../movement/movement_list_screen.dart';
import 'settings_screen.dart';
import 'tasks_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final bootstrap = ServiceLocator.session.bootstrap;
    if (bootstrap?.forceUpdate == true || bootstrap?.maintenanceEnabled == true) {
      return Scaffold(
        body: AppErrorPanel(
          message: bootstrap?.maintenanceMessage ??
              'অ্যাপ আপডেট প্রয়োজন অথবা সার্ভিস সাময়িক বন্ধ।',
        ),
      );
    }

    final userName = bootstrap?.user.name ?? 'User';
    final branch = bootstrap?.employee?.branchName ?? bootstrap?.user.roleNames.join(', ') ?? '';
    final isReviewer = bootstrap?.isReviewerHome ?? false;
    final width = MediaQuery.sizeOf(context).width;
    final useRail = width >= 600;
    final sections = bootstrap?.sections
            .where((s) => s.accessible && s.implemented)
            .toList(growable: false) ??
        const [];

    final pages = [
      _HomeTab(
        userName: userName,
        contextLine: branch,
        isReviewer: isReviewer,
        pendingLeaveReviews: bootstrap?.pendingLeaveReviews ?? 0,
      ),
      const TasksScreen(),
      _ModulesTab(sections: sections),
      const InboxScreen(),
      _MeTab(userName: userName),
    ];

    if (useRail) {
      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              selectedIndex: _index,
              onDestinationSelected: (value) => setState(() => _index = value),
              labelType: NavigationRailLabelType.all,
              destinations: const [
                NavigationRailDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: Text('Home')),
                NavigationRailDestination(icon: Icon(Icons.task_alt_outlined), selectedIcon: Icon(Icons.task_alt), label: Text('Tasks')),
                NavigationRailDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view), label: Text('Modules')),
                NavigationRailDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications), label: Text('Inbox')),
                NavigationRailDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: Text('Me')),
              ],
            ),
            const VerticalDivider(width: 1),
            Expanded(child: SafeArea(child: pages[_index])),
          ],
        ),
      );
    }

    return Scaffold(
      body: SafeArea(child: pages[_index]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.task_alt_outlined), selectedIcon: Icon(Icons.task_alt), label: 'Tasks'),
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view), label: 'Modules'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications), label: 'Inbox'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Me'),
        ],
      ),
    );
  }
}

class _HomeTab extends StatelessWidget {
  const _HomeTab({
    required this.userName,
    required this.contextLine,
    required this.isReviewer,
    required this.pendingLeaveReviews,
  });

  final String userName;
  final String contextLine;
  final bool isReviewer;
  final int pendingLeaveReviews;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(userName, style: Theme.of(context).textTheme.headlineMedium),
        if (contextLine.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(contextLine, style: Theme.of(context).textTheme.bodyMedium),
        ],
        const SizedBox(height: 20),
        if (isReviewer) ...[
          _Card(
            title: 'Actionable reviews',
            body: 'Pending leave: $pendingLeaveReviews',
            actionLabel: 'Leave অনুমোদন',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const LeaveListScreen(reviewMode: true)),
              );
            },
          ),
          const SizedBox(height: 16),
        ],
        _Card(
          title: 'আজকের উপস্থিতি',
          body: 'Geofence check-in/out',
          actionLabel: 'Attendance',
          onPressed: () {
            Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AttendanceScreen()));
          },
        ),
        const SizedBox(height: 16),
        Text('দ্রুত কাজ', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ActionChip(
              label: const Text('Leave'),
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LeaveListScreen())),
            ),
            ActionChip(
              label: const Text('Movement'),
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MovementListScreen())),
            ),
            ActionChip(
              label: const Text('Payslip'),
              onPressed: () => openModule(context, 'payroll'),
            ),
          ],
        ),
      ],
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({
    required this.title,
    required this.body,
    required this.actionLabel,
    required this.onPressed,
  });

  final String title;
  final String body;
  final String actionLabel;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: MousumiColors.primarySubtle,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: MousumiColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(body, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 12),
          PrimaryButton(label: actionLabel, onPressed: onPressed),
        ],
      ),
    );
  }
}

class _ModulesTab extends StatelessWidget {
  const _ModulesTab({required this.sections});

  final List<BootstrapSection> sections;

  @override
  Widget build(BuildContext context) {
    if (sections.isEmpty) {
      return const AppEmptyState(title: 'কোনো মডিউল নেই');
    }

    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: sections.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final section = sections[index];
        return ListTile(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: MousumiColors.border),
          ),
          tileColor: MousumiColors.surface,
          title: Text(section.label),
          subtitle: section.description == null ? null : Text(section.description!),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => openModule(context, section.id),
        );
      },
    );
  }
}

class _MeTab extends StatelessWidget {
  const _MeTab({required this.userName});

  final String userName;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(userName, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 8),
        Text(ServiceLocator.env.apiBaseUrl, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 24),
        PrimaryButton(
          label: 'Settings',
          onPressed: () {
            Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsScreen()));
          },
        ),
        const SizedBox(height: 12),
        PrimaryButton(
          label: 'লগ আউট',
          onPressed: () => ServiceLocator.session.logout(),
        ),
      ],
    );
  }
}
