import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:auth_session/auth_session.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  final _staffLogin = TextEditingController();
  final _staffPassword = TextEditingController();
  final _branchPin = TextEditingController();

  List<BranchOption> _branches = const [];
  BranchOption? _selectedBranch;
  bool _loadingBranches = false;
  bool _obscure = true;

  @override
  void initState() {
    super.initState();
    _loadBranches();
  }

  Future<void> _loadBranches() async {
    setState(() => _loadingBranches = true);
    try {
      final branches = await ServiceLocator.api.listLoginBranches();
      if (!mounted) return;
      setState(() {
        _branches = branches;
        _selectedBranch = branches.isNotEmpty ? branches.first : null;
      });
    } catch (_) {
      // Branch list is optional until API is reachable.
    } finally {
      if (mounted) {
        setState(() => _loadingBranches = false);
      }
    }
  }

  @override
  void dispose() {
    _tabs.dispose();
    _staffLogin.dispose();
    _staffPassword.dispose();
    _branchPin.dispose();
    super.dispose();
  }

  Future<void> _submitStaff() async {
    await ServiceLocator.session.loginStaff(
      _staffLogin.text.trim(),
      _staffPassword.text,
    );
  }

  Future<void> _submitBranch() async {
    final branch = _selectedBranch;
    if (branch == null) {
      return;
    }
    await ServiceLocator.session.loginBranch(branch.id, _branchPin.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    final session = ServiceLocator.session;
    final busy = session.status == SessionStatus.authenticating;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
          children: [
            const Text(
              'Mousumi',
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.w700,
                color: MousumiColors.brandPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'কর্মীর উপস্থিতি, আবেদন ও অনুমোদন — এক অ্যাপে।',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: MousumiColors.textSecondary,
                  ),
            ),
            const SizedBox(height: 28),
            Container(
              decoration: BoxDecoration(
                color: MousumiColors.primarySubtle,
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                controller: _tabs,
                labelColor: MousumiColors.brandPrimary,
                unselectedLabelColor: MousumiColors.textSecondary,
                indicator: BoxDecoration(
                  color: MousumiColors.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: MousumiColors.border),
                ),
                tabs: const [
                  Tab(text: 'স্টাফ'),
                  Tab(text: 'শাখা PIN'),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 280,
              child: TabBarView(
                controller: _tabs,
                children: [
                  _StaffForm(
                    login: _staffLogin,
                    password: _staffPassword,
                    obscure: _obscure,
                    onToggleObscure: () => setState(() => _obscure = !_obscure),
                  ),
                  _BranchForm(
                    branches: _branches,
                    selected: _selectedBranch,
                    loading: _loadingBranches,
                    pin: _branchPin,
                    onSelect: (value) => setState(() => _selectedBranch = value),
                    onRetryBranches: _loadBranches,
                  ),
                ],
              ),
            ),
            if (session.lastError != null) ...[
              Text(
                session.lastError!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: MousumiColors.error),
              ),
              const SizedBox(height: 12),
            ],
            PrimaryButton(
              label: _tabs.index == 0 ? 'লগ ইন' : 'শাখায় প্রবেশ',
              loading: busy,
              onPressed: busy
                  ? null
                  : () {
                      if (_tabs.index == 0) {
                        _submitStaff();
                      } else {
                        _submitBranch();
                      }
                    },
            ),
            const SizedBox(height: 16),
            Text(
              'API: ${ServiceLocator.env.apiBaseUrl}',
              style: Theme.of(context).textTheme.labelSmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _StaffForm extends StatelessWidget {
  const _StaffForm({
    required this.login,
    required this.password,
    required this.obscure,
    required this.onToggleObscure,
  });

  final TextEditingController login;
  final TextEditingController password;
  final bool obscure;
  final VoidCallback onToggleObscure;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          controller: login,
          textInputAction: TextInputAction.next,
          autocorrect: false,
          decoration: const InputDecoration(
            labelText: 'ইউজারনেম বা ইমেইল',
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: password,
          obscureText: obscure,
          onSubmitted: (_) {},
          decoration: InputDecoration(
            labelText: 'পাসওয়ার্ড',
            suffixIcon: IconButton(
              onPressed: onToggleObscure,
              icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
            ),
          ),
        ),
      ],
    );
  }
}

class _BranchForm extends StatelessWidget {
  const _BranchForm({
    required this.branches,
    required this.selected,
    required this.loading,
    required this.pin,
    required this.onSelect,
    required this.onRetryBranches,
  });

  final List<BranchOption> branches;
  final BranchOption? selected;
  final bool loading;
  final TextEditingController pin;
  final ValueChanged<BranchOption?> onSelect;
  final VoidCallback onRetryBranches;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (loading)
          const LinearProgressIndicator(minHeight: 2)
        else if (branches.isEmpty)
          TextButton(
            onPressed: onRetryBranches,
            child: const Text('শাখার তালিকা লোড করুন'),
          )
        else
          DropdownButtonFormField<BranchOption>(
            value: selected,
            items: [
              for (final branch in branches)
                DropdownMenuItem(value: branch, child: Text(branch.label)),
            ],
            onChanged: onSelect,
            decoration: const InputDecoration(labelText: 'শাখা'),
          ),
        const SizedBox(height: 12),
        TextField(
          controller: pin,
          obscureText: true,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(labelText: 'PIN'),
        ),
      ],
    );
  }
}
