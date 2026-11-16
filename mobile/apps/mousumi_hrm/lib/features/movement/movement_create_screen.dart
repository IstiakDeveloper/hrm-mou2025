import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class MovementCreateScreen extends StatefulWidget {
  const MovementCreateScreen({super.key});

  @override
  State<MovementCreateScreen> createState() => _MovementCreateScreenState();
}

class _MovementCreateScreenState extends State<MovementCreateScreen> {
  final _purpose = TextEditingController();
  final _destination = TextEditingController();
  String _type = 'official';
  DateTime _from = DateTime.now();
  DateTime _to = DateTime.now().add(const Duration(hours: 8));
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _purpose.dispose();
    _destination.dispose();
    super.dispose();
  }

  String _iso(DateTime d) => d.toIso8601String();

  Future<void> _submit() async {
    if (_purpose.text.trim().isEmpty || _destination.text.trim().isEmpty) {
      setState(() => _error = 'উদ্দেশ্য ও গন্তব্য দিন।');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ServiceLocator.api.createMovement({
        'movement_type': _type,
        'from_datetime': _iso(_from),
        'to_datetime': _iso(_to),
        'purpose': _purpose.text.trim(),
        'destination': _destination.text.trim(),
      });
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('নতুন Movement')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          DropdownButtonFormField<String>(
            value: _type,
            items: const [
              DropdownMenuItem(value: 'official', child: Text('Official')),
              DropdownMenuItem(value: 'personal', child: Text('Personal')),
            ],
            onChanged: (v) => setState(() => _type = v ?? 'official'),
            decoration: const InputDecoration(labelText: 'Type'),
          ),
          const SizedBox(height: 12),
          TextField(controller: _destination, decoration: const InputDecoration(labelText: 'Destination')),
          const SizedBox(height: 12),
          TextField(controller: _purpose, maxLines: 3, decoration: const InputDecoration(labelText: 'Purpose')),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('From: ${_from.toLocal()}'),
            trailing: const Icon(Icons.schedule),
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                firstDate: DateTime.now().subtract(const Duration(days: 1)),
                lastDate: DateTime.now().add(const Duration(days: 30)),
                initialDate: _from,
              );
              if (date == null || !context.mounted) return;
              final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_from));
              if (time == null || !mounted) return;
              setState(() {
                _from = DateTime(date.year, date.month, date.day, time.hour, time.minute);
                if (!_to.isAfter(_from)) {
                  _to = _from.add(const Duration(hours: 8));
                }
              });
            },
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('To: ${_to.toLocal()}'),
            trailing: const Icon(Icons.schedule),
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                firstDate: _from,
                lastDate: DateTime.now().add(const Duration(days: 60)),
                initialDate: _to,
              );
              if (date == null || !context.mounted) return;
              final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_to));
              if (time == null || !mounted) return;
              setState(() {
                _to = DateTime(date.year, date.month, date.day, time.hour, time.minute);
              });
            },
          ),
          if (_error != null) Text(_error!, style: const TextStyle(color: MousumiColors.error)),
          const SizedBox(height: 16),
          PrimaryButton(label: 'তৈরি করুন', loading: _submitting, onPressed: _submitting ? null : _submit),
        ],
      ),
    );
  }
}
