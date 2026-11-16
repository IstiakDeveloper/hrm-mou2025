import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class ApprovalActionScreen extends StatefulWidget {
  const ApprovalActionScreen({super.key, required this.row});

  final Map<String, dynamic> row;

  @override
  State<ApprovalActionScreen> createState() => _ApprovalActionScreenState();
}

class _ApprovalActionScreenState extends State<ApprovalActionScreen> {
  final _note = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  String get _module => '${widget.row['module']}';

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (!mounted) return;
      await MousumiFeedback.flash(context, 'সিদ্ধান্ত সেভ হয়েছে');
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final row = widget.row;
    final canAct = row['can_act'] == true;

    return Scaffold(
      backgroundColor: MousumiColors.canvas,
      appBar: AppBar(title: Text(_title)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          SoftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${row['title']}', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 6),
                Text('${row['subtitle']}', style: Theme.of(context).textTheme.bodyLarge),
                const SizedBox(height: 12),
                StatusChip(label: '${row['status']}', tone: StatusTone.warning),
              ],
            ),
          ),
          if (canAct) ...[
            const SizedBox(height: 14),
            SoftCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Decision', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _note,
                    minLines: 3,
                    maxLines: 5,
                    decoration: InputDecoration(
                      labelText: _module == 'loan' ? 'Reject reason / note' : 'মন্তব্য',
                      alignLabelWithHint: true,
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: const TextStyle(color: MousumiColors.error)),
                  ],
                  const SizedBox(height: 16),
                  ..._actions(),
                ],
              ),
            ),
          ] else
            const Padding(
              padding: EdgeInsets.only(top: 16),
              child: Text('এটা আপনার আবেদন। অনুমোদনকারী সিদ্ধান্ত নিলে স্ট্যাটাস বদলাবে।'),
            ),
        ],
      ),
    );
  }

  String get _title => switch (_module) {
        'appraisal' => 'Appraisal',
        'logbook' => 'Log book',
        'loan' => 'Employee loan',
        _ => 'Approval',
      };

  List<Widget> _actions() {
    final id = (widget.row['id'] as num).toInt();
    if (_module == 'appraisal') {
      final kind = '${widget.row['kind']}';
      final decide = widget.row['needs_decision'] == true;
      if (decide) {
        return [
          PrimaryButton(
            label: 'Approve',
            loading: _busy,
            onPressed: _busy
                ? null
                : () => _run(() => ServiceLocator.api.actAppraisal(
                      kind: kind,
                      id: id,
                      comments: _note.text.trim(),
                      approved: true,
                    )),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _busy
                ? null
                : () => _run(() => ServiceLocator.api.actAppraisal(
                      kind: kind,
                      id: id,
                      comments: _note.text.trim(),
                      approved: false,
                    )),
            child: const Text('Reject'),
          ),
        ];
      }
      return [
        PrimaryButton(
          label: 'Forward / approve',
          loading: _busy,
          onPressed: _busy
              ? null
              : () => _run(() => ServiceLocator.api.actAppraisal(
                    kind: kind,
                    id: id,
                    comments: _note.text.trim(),
                  )),
        ),
      ];
    }

    if (_module == 'logbook') {
      final buttons = <Widget>[];
      if (widget.row['can_recommend'] == true) {
        buttons.add(PrimaryButton(
          label: 'Recommend',
          loading: _busy,
          onPressed: _busy
              ? null
              : () => _run(() => ServiceLocator.api.actLogBook(id: id, action: 'recommend', remarks: _note.text.trim())),
        ));
      }
      if (widget.row['can_approve'] == true) {
        if (buttons.isNotEmpty) buttons.add(const SizedBox(height: 8));
        buttons.add(PrimaryButton(
          label: 'Approve payment',
          loading: _busy,
          onPressed: _busy
              ? null
              : () => _run(() => ServiceLocator.api.actLogBook(id: id, action: 'approve', remarks: _note.text.trim())),
        ));
      }
      if (widget.row['can_reject'] == true) {
        buttons.add(const SizedBox(height: 8));
        buttons.add(OutlinedButton(
          onPressed: _busy
              ? null
              : () => _run(() => ServiceLocator.api.actLogBook(id: id, action: 'reject', remarks: _note.text.trim())),
          child: const Text('Reject'),
        ));
      }
      return buttons;
    }

    return [
      PrimaryButton(
        label: 'Approve loan',
        loading: _busy,
        onPressed: _busy
            ? null
            : () => _run(() => ServiceLocator.api.actLoan(id: id, action: 'approve')),
      ),
      const SizedBox(height: 8),
      OutlinedButton(
        onPressed: _busy
            ? null
            : () => _run(() => ServiceLocator.api.actLoan(id: id, action: 'reject', reason: _note.text.trim())),
        child: const Text('Reject'),
      ),
    ];
  }
}
