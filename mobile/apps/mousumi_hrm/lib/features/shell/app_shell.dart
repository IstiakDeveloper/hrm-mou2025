import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

import '../profile/profile_screen.dart';
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
          message: bootstrap?.maintenanceMessage ?? 'অ্যাপ আপডেট প্রয়োজন অথবা সার্ভিস সাময়িক বন্ধ।',
        ),
      );
    }

    const pages = [
      _HomeTab(),
      TasksScreen(),
      _WorkTab(),
      _MeTab(),
    ];

    return Scaffold(
      backgroundColor: MousumiColors.canvas,
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          child: KeyedSubtree(
            key: ValueKey(_index),
            child: pages[_index],
          ),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.task_alt_outlined), selectedIcon: Icon(Icons.task_alt), label: 'Tasks'),
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view), label: 'Work'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Me'),
        ],
      ),
    );
  }
}

class _HomeTab extends StatelessWidget {
  const _HomeTab();

  @override
  Widget build(BuildContext context) {
    final bootstrap = ServiceLocator.session.bootstrap;
    final name = bootstrap?.user.name ?? 'Employee';
    final role = bootstrap?.employee?.designation ??
        (bootstrap?.user.roleNames.isNotEmpty == true ? bootstrap!.user.roleNames.first : 'Employee');
    final branch = bootstrap?.employee?.branchName ?? '';

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        Row(
          children: [
            const _Avatar(),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('আজকের কাজ', style: Theme.of(context).textTheme.bodyMedium),
                  Text(name, style: Theme.of(context).textTheme.titleLarge),
                  if (role.isNotEmpty || branch.isNotEmpty)
                    Text(
                      [role, branch].where((e) => e.isNotEmpty).join(' · '),
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                ],
              ),
            ),
            IconButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const InboxScreen())),
              icon: const Icon(Icons.notifications_none),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SoftCard(
          color: MousumiColors.brandPrimary,
          padding: const EdgeInsets.all(18),
          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AttendanceScreen())),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Attendance', style: Theme.of(context).textTheme.labelLarge?.copyWith(color: Colors.white70)),
              const SizedBox(height: 6),
              Text(
                'আজকের উপস্থিতি',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
              ),
              const SizedBox(height: 4),
              Text(
                'চেক-ইন বা চেক-আউট করুন',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'Open attendance',
                  style: TextStyle(color: MousumiColors.brandPrimary, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        const _PendingCard(),
        const SizedBox(height: 22),
        const SectionLabel(title: 'আমার কাজ'),
        const SizedBox(height: 10),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.45,
          children: [
            _QuickTile(
              icon: Icons.event_available_outlined,
              label: 'Leave',
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LeaveListScreen())),
            ),
            _QuickTile(
              icon: Icons.route_outlined,
              label: 'Movement',
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MovementListScreen())),
            ),
            _QuickTile(
              icon: Icons.receipt_long_outlined,
              label: 'Payslip',
              onTap: () => openEmployeeService(context, 'payroll'),
            ),
            _QuickTile(
              icon: Icons.account_balance_wallet_outlined,
              label: 'Staff fund',
              onTap: () => openEmployeeService(context, 'staff-fund'),
            ),
          ],
        ),
      ],
    );
  }
}

class _WorkTab extends StatelessWidget {
  const _WorkTab();

  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.fingerprint, 'Attendance', 'চেক-ইন, চেক-আউট, ইতিহাস', 'attendance'),
      (Icons.event_note_outlined, 'Leave', 'আবেদন ও নিজের স্ট্যাটাস', 'leave'),
      (Icons.alt_route, 'Movement', 'মুভমেন্ট আবেদন', 'movement'),
      (Icons.menu_book_outlined, 'Log book', 'নিজের ট্রিপ ও কিমি', 'logbook'),
      (Icons.payments_outlined, 'Payslip', 'নিজের বেতন স্লিপ', 'payroll'),
      (Icons.account_balance_outlined, 'Loans', 'নিজের লোন', 'loan'),
      (Icons.savings_outlined, 'Staff fund', 'PF ও গ্র্যাচুইটি', 'staff-fund'),
      (Icons.folder_outlined, 'Documents', 'নিজের ডকুমেন্ট', 'documents'),
      (Icons.devices_outlined, 'My assets', 'আমার কাছে থাকা অ্যাসেট', 'assets'),
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
      children: [
        Text('Work', style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 4),
        Text('শুধু কর্মীর নিজের তথ্য।', style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 16),
        for (final item in items) ...[
          SoftCard(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            onTap: () => openEmployeeService(context, item.$4),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: MousumiColors.primarySubtle,
                  child: Icon(item.$1, color: MousumiColors.brandPrimary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.$2, style: Theme.of(context).textTheme.titleMedium),
                      Text(item.$3, style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: MousumiColors.textSecondary),
              ],
            ),
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _MeTab extends StatelessWidget {
  const _MeTab();

  @override
  Widget build(BuildContext context) {
    final bootstrap = ServiceLocator.session.bootstrap;
    final name = bootstrap?.user.name ?? 'Employee';
    final email = bootstrap?.user.email ?? bootstrap?.user.username ?? '';
    final branch = bootstrap?.employee?.branchName ?? '';
    final designation = bootstrap?.employee?.designation ?? '';

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
      children: [
        Text('Me', style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 14),
        SoftCard(
          child: Row(
            children: [
              const _Avatar(size: 56),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: Theme.of(context).textTheme.titleLarge),
                    if (designation.isNotEmpty) Text(designation, style: Theme.of(context).textTheme.bodyMedium),
                    if (branch.isNotEmpty) Text(branch, style: Theme.of(context).textTheme.bodyMedium),
                    if (email.isNotEmpty) Text(email, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        SoftCard(
          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen())),
          child: const Row(
            children: [
              Icon(Icons.badge_outlined, color: MousumiColors.brandPrimary),
              SizedBox(width: 12),
              Expanded(child: Text('My profile')),
              Icon(Icons.chevron_right),
            ],
          ),
        ),
        const SizedBox(height: 10),
        SoftCard(
          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsScreen())),
          child: const Row(
            children: [
              Icon(Icons.settings_outlined, color: MousumiColors.brandPrimary),
              SizedBox(width: 12),
              Expanded(child: Text('Security & password')),
              Icon(Icons.chevron_right),
            ],
          ),
        ),
        const SizedBox(height: 10),
        SoftCard(
          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const InboxScreen())),
          child: const Row(
            children: [
              Icon(Icons.campaign_outlined, color: MousumiColors.brandPrimary),
              SizedBox(width: 12),
              Expanded(child: Text('Notices & inbox')),
              Icon(Icons.chevron_right),
            ],
          ),
        ),
        const SizedBox(height: 18),
        OutlinedButton(
          onPressed: () => ServiceLocator.session.logout(),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            foregroundColor: MousumiColors.error,
            side: const BorderSide(color: MousumiColors.error),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: const Text('লগ আউট'),
        ),
      ],
    );
  }
}

class _QuickTile extends StatelessWidget {
  const _QuickTile({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SoftCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: MousumiColors.brandPrimary),
          const SizedBox(height: 10),
          Text(label, style: Theme.of(context).textTheme.titleMedium),
        ],
      ),
    );
  }
}

class _PendingCard extends StatefulWidget {
  const _PendingCard();

  @override
  State<_PendingCard> createState() => _PendingCardState();
}

class _PendingCardState extends State<_PendingCard> {
  int _count = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final payload = await ServiceLocator.api.tasks();
      final reviews = (payload['reviews'] as List?)?.length ?? 0;
      if (!mounted) return;
      setState(() => _count = reviews);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_count == 0) return const SizedBox.shrink();
    return SoftCard(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const TasksScreen())),
      child: Row(
        children: [
          const CircleAvatar(
            backgroundColor: Color(0xFFFFF7ED),
            child: Icon(Icons.fact_check_outlined, color: MousumiColors.warning),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Approval waiting', style: Theme.of(context).textTheme.titleMedium),
                Text('$_count pending · leave, appraisal, log book, loan', style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({this.size = 48});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: MousumiColors.border),
      ),
      child: Image.asset('assets/branding/logo.png', fit: BoxFit.contain),
    );
  }
}
