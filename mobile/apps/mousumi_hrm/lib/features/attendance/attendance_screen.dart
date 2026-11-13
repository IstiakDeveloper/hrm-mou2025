import 'package:api_client/api_client.dart';
import 'package:app_core/app_core.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  AttendanceStatus? _status;
  List<AttendanceHistoryItem> _history = const [];
  String? _error;
  String? _info;
  bool _loading = true;
  bool _punching = false;
  Position? _position;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final status = await ServiceLocator.api.attendanceStatus();
      final history = await ServiceLocator.api.attendanceHistory();
      if (!mounted) return;
      setState(() {
        _status = status;
        _history = history;
      });
      await _probeLocation();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _probeLocation() async {
    setState(() => _info = 'লোকেশন পাওয়া যাচ্ছে…');
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() {
        _position = null;
        _info = 'GPS বন্ধ আছে। Settings থেকে চালু করুন।';
      });
      return;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      setState(() {
        _position = null;
        _info = 'লোকেশন অনুমতি দেওয়া হয়নি।';
      });
      return;
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 20),
      );
      if (!mounted) return;
      setState(() {
        _position = position;
        if (position.accuracy > 100) {
          _info = 'সিগন্যাল দুর্বল (accuracy ${position.accuracy.toStringAsFixed(0)} m)। খোলা জায়গায় দাঁড়ান।';
        } else {
          _info = 'লোকেশন প্রস্তুত · accuracy ${position.accuracy.toStringAsFixed(0)} m';
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _position = null;
        _info = 'লোকেশন পাওয়া যায়নি। আবার চেষ্টা করুন।';
      });
    }
  }

  Future<String> _deviceFingerprint() async {
    final id = await ServiceLocator.sessionStore.deviceId();
    final normalized = id.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '');
    if (normalized.length >= 16) {
      return normalized.substring(0, normalized.length.clamp(16, 128));
    }
    return ('mousumi_$normalized').padRight(16, '0');
  }

  Future<void> _punch({required bool checkIn}) async {
    if (_position == null) {
      await _probeLocation();
      if (_position == null) {
        return;
      }
    }

    setState(() {
      _punching = true;
      _error = null;
    });

    try {
      final fingerprint = await _deviceFingerprint();
      final result = checkIn
          ? await ServiceLocator.api.checkIn(
              lat: _position!.latitude,
              lng: _position!.longitude,
              accuracy: _position!.accuracy,
              deviceFingerprint: fingerprint,
            )
          : await ServiceLocator.api.checkOut(
              lat: _position!.latitude,
              lng: _position!.longitude,
              accuracy: _position!.accuracy,
              deviceFingerprint: fingerprint,
            );
      if (!mounted) return;
      setState(() {
        _status = result.status;
        _info = result.message;
      });
      final history = await ServiceLocator.api.attendanceHistory();
      if (!mounted) return;
      setState(() => _history = history);
      await MousumiFeedback.receipt(
        context,
        title: checkIn ? 'চেক-ইন হয়েছে' : 'চেক-আউট হয়েছে',
        message: result.message.isEmpty ? (_status?.serverTime ?? '') : result.message,
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = mapDioError(error).message);
    } finally {
      if (mounted) {
        setState(() => _punching = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('আজকের উপস্থিতি'),
        actions: [
          IconButton(onPressed: _loading ? null : _refresh, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _loading
          ? const SkeletonList(count: 3)
          : _error != null && _status == null
              ? AppErrorPanel(message: _error!, onRetry: _refresh)
              : RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      Text(
                        _status?.serverTime ?? '',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 12),
                      if (_status?.isWeekend == true)
                        const StatusChip(label: 'Weekend — punch বন্ধ', tone: StatusTone.warning),
                      if (_status != null) ...[
                        const SizedBox(height: 12),
                        _StatusCard(status: _status!),
                      ],
                      const SizedBox(height: 12),
                      if (_info != null && _position == null && _info!.contains('পাওয়া'))
                        LocationPulse(label: _info!)
                      else if (_info != null)
                        Text(_info!, style: Theme.of(context).textTheme.bodyMedium),
                      if (_error != null) ...[
                        const SizedBox(height: 8),
                        Text(_error!, style: const TextStyle(color: MousumiColors.error)),
                      ],
                      const SizedBox(height: 16),
                      PrimaryButton(
                        label: 'লোকেশন আপডেট',
                        onPressed: _punching ? null : _probeLocation,
                      ),
                      const SizedBox(height: 10),
                      PrimaryButton(
                        label: 'চেক-ইন',
                        loading: _punching && (_status?.canCheckIn ?? false),
                        onPressed: (!_punching && (_status?.canCheckIn ?? false))
                            ? () => _punch(checkIn: true)
                            : null,
                      ),
                      const SizedBox(height: 10),
                      PrimaryButton(
                        label: 'চেক-আউট',
                        loading: _punching && (_status?.canCheckOut ?? false),
                        onPressed: (!_punching && (_status?.canCheckOut ?? false))
                            ? () => _punch(checkIn: false)
                            : null,
                      ),
                      const SizedBox(height: 24),
                      Text('ইতিহাস', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      if (_history.isEmpty)
                        const AppEmptyState(title: 'কোনো রেকর্ড নেই')
                      else
                        ..._history.map(
                          (item) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(item.date),
                            subtitle: Text(
                              [
                                if (item.checkIn != null) 'In ${item.checkIn}',
                                if (item.checkOut != null) 'Out ${item.checkOut}',
                                if (item.branchName != null) item.branchName!,
                              ].join(' · '),
                            ),
                            trailing: StatusChip(
                              label: item.status ?? '—',
                              tone: StatusTone.info,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.status});

  final AttendanceStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: MousumiColors.primarySubtle,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: MousumiColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(status.date, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text('Check-in: ${status.checkIn ?? '—'}'),
          Text('Check-out: ${status.checkOut ?? '—'}'),
          const SizedBox(height: 8),
          Text(
            status.eligibleBranches.isEmpty
                ? 'কোনো eligible geofence branch নেই'
                : 'Eligible: ${status.eligibleBranches.map((b) => b.name).join(', ')}',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}
