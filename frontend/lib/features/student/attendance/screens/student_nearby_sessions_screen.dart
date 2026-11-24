import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/ble/ble_attendance_channel.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../widgets/student_ble_attendance_card.dart';

class StudentNearbySessionsScreen extends ConsumerStatefulWidget {
  const StudentNearbySessionsScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  ConsumerState<StudentNearbySessionsScreen> createState() =>
      _StudentNearbySessionsScreenState();
}

class _StudentNearbySessionsScreenState
    extends ConsumerState<StudentNearbySessionsScreen>
    with WidgetsBindingObserver {
  final Map<String, Map<String, dynamic>> _sessions = {};
  final Map<String, DateTime> _lastDuplicateSessionLog = {};
  StreamSubscription<BleAttendanceEvent>? _events;
  Timer? _availabilityTimer;
  Map<String, dynamic> _deviceStatus = const {};
  String _searchQuery = '';
  String? _message;
  String? _submittingKey;
  bool _scanning = false;
  bool _scanBusy = false;
  bool _loadingStatus = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_refreshDeviceStatus());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _events?.cancel();
    _availabilityTimer?.cancel();
    if (_scanning) unawaited(BleAttendanceChannel.instance.stopStudentScan());
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_refreshDeviceStatus());
    }
  }

  Future<void> _refreshDeviceStatus() async {
    try {
      final status = await BleAttendanceChannel.instance.getDeviceStatus();
      if (!mounted) return;
      setState(() {
        _deviceStatus = status;
        _loadingStatus = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadingStatus = false;
        _message = 'Unable to read Bluetooth and Location status: $error';
      });
    }
  }

  void _listenForSessions() {
    _events ??= BleAttendanceChannel.instance.events.listen(
      (event) {
        if (!mounted) return;
        if (event.type == 'status') {
          final state = event.data['state']?.toString();
          if (state == 'error') {
            _availabilityTimer?.cancel();
            _availabilityTimer = null;
            setState(() {
              _scanning = false;
              _message =
                  'Bluetooth scanning stopped (error ${event.data['errorCode'] ?? 'unknown'}).';
            });
          }
          return;
        }
        if (event.type != 'teacherFound') return;

        final sessionCode = event.data['sessionCode']?.toString();
        final deviceAddress = event.data['deviceAddress']?.toString();
        if (sessionCode == null ||
            sessionCode.isEmpty ||
            deviceAddress == null ||
            deviceAddress.isEmpty) {
          return;
        }
        final key = '$deviceAddress|$sessionCode';
        final isNewSession = !_sessions.containsKey(key);
        setState(() {
          _sessions[key] = {
            ...?_sessions[key],
            ...event.data,
            'lastSeen': DateTime.now(),
          };
        });
        if (isNewSession) {
          BleAttendanceChannel.log(
            'STUDENT',
            'Nearby teacher session discovered sessionCode=$sessionCode',
          );
        } else {
          final now = DateTime.now();
          final lastLogged = _lastDuplicateSessionLog[key];
          if (lastLogged == null ||
              now.difference(lastLogged) >= const Duration(seconds: 10)) {
            _lastDuplicateSessionLog[key] = now;
            BleAttendanceChannel.log(
              'STUDENT',
              'Duplicate advertisement folded into existing session card '
                  'sessionCode=$sessionCode',
            );
          }
        }
      },
      onError: (Object error) {
        BleAttendanceChannel.log(
          'STUDENT',
          'Scanner event stream failed: $error',
        );
        if (!mounted) return;
        _availabilityTimer?.cancel();
        _availabilityTimer = null;
        setState(() {
          _scanning = false;
          _message = 'Bluetooth scanning failed: $error';
        });
      },
    );
  }

  Future<void> _startScanning({bool rescan = false}) async {
    if (_scanBusy) {
      BleAttendanceChannel.log(
        'STUDENT',
        'Scan start ignored because another scan operation is in progress',
      );
      return;
    }
    BleAttendanceChannel.log(
      'STUDENT',
      'Start scanning requested rescan=$rescan currentlyScanning=$_scanning',
    );
    setState(() {
      _scanBusy = true;
      _message = null;
    });

    try {
      if (rescan && _scanning) {
        await BleAttendanceChannel.instance.stopStudentScan();
        if (!mounted) return;
        setState(() {
          _scanning = false;
          _sessions.clear();
        });
      }

      final permitted = await BleAttendanceChannel.instance
          .requestPermissions();
      if (!mounted) return;
      if (!permitted) {
        BleAttendanceChannel.log(
          'STUDENT',
          'Scan not started: permissions denied',
        );
        setState(() => _message = 'Bluetooth permission is required to scan.');
        return;
      }

      final status = await BleAttendanceChannel.instance.getDeviceStatus();
      if (!mounted) return;
      setState(() {
        _deviceStatus = status;
        _loadingStatus = false;
      });
      if (status['bluetoothOn'] != true) {
        BleAttendanceChannel.log(
          'STUDENT',
          'Scan not started: Bluetooth is off',
        );
        setState(() => _message = 'Turn on Bluetooth to find nearby sessions.');
        return;
      }
      if (status['locationRequired'] == true && status['locationOn'] != true) {
        BleAttendanceChannel.log(
          'STUDENT',
          'Scan not started: Location services are required and disabled',
        );
        setState(
          () => _message =
              'Turn on Location services to scan for Bluetooth sessions on this Android version.',
        );
        return;
      }

      _listenForSessions();
      await BleAttendanceChannel.instance.startStudentScan();
      BleAttendanceChannel.log(
        'STUDENT',
        'Scanning started from Nearby Sessions',
      );
      if (!mounted) return;
      setState(() {
        _scanning = true;
        _message = 'Scanning for nearby teacher sessions.';
      });
      _availabilityTimer ??= Timer.periodic(const Duration(seconds: 3), (_) {
        if (mounted && _scanning) setState(() {});
      });
    } catch (error) {
      BleAttendanceChannel.log('STUDENT', 'Could not start scanning: $error');
      if (mounted) {
        setState(() {
          _scanning = false;
          _message = 'Could not start Bluetooth scanning: $error';
        });
      }
    } finally {
      if (mounted) setState(() => _scanBusy = false);
    }
  }

  Future<void> _stopScanning() async {
    if (_scanBusy || !_scanning) {
      BleAttendanceChannel.log(
        'STUDENT',
        'Scan stop ignored scanBusy=$_scanBusy scanning=$_scanning',
      );
      return;
    }
    BleAttendanceChannel.log('STUDENT', 'Stop scanning requested by student');
    setState(() => _scanBusy = true);
    try {
      await BleAttendanceChannel.instance.stopStudentScan();
      if (mounted) {
        _availabilityTimer?.cancel();
        _availabilityTimer = null;
        setState(() {
          _scanning = false;
          _message = 'Scanning stopped.';
        });
      }
    } catch (error) {
      BleAttendanceChannel.log('STUDENT', 'Could not stop scanning: $error');
      if (mounted) setState(() => _message = 'Could not stop scanning: $error');
    } finally {
      if (mounted) setState(() => _scanBusy = false);
    }
  }

  Future<void> _refresh() async {
    await _refreshDeviceStatus();
    if (!mounted) return;
    await _startScanning(rescan: _scanning);
  }

  Future<void> _openBluetoothFlow() async {
    try {
      if (_deviceStatus['bluetoothPermissionGranted'] != true) {
        final granted = await BleAttendanceChannel.instance
            .requestPermissions();
        if (!granted) {
          if (mounted) {
            setState(
              () =>
                  _message = 'Bluetooth permission is required for attendance.',
            );
          }
          return;
        }
      }
      await BleAttendanceChannel.instance.openBluetoothSettings();
      await _refreshDeviceStatus();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Unable to open Bluetooth settings: $error');
      }
    }
  }

  Future<void> _openLocationFlow() async {
    try {
      if (_deviceStatus['locationRequired'] == true &&
          _deviceStatus['locationPermissionGranted'] != true) {
        final granted = await BleAttendanceChannel.instance
            .requestPermissions();
        if (!granted) {
          if (mounted) {
            setState(
              () => _message =
                  'Location permission is required on this Android version.',
            );
          }
          return;
        }
      }
      await BleAttendanceChannel.instance.openLocationSettings();
      await _refreshDeviceStatus();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Unable to open Location settings: $error');
      }
    }
  }

  Future<void> _markAttendance(String key, Map<String, dynamic> session) async {
    final user = ref.read(authProvider).user;
    final seatNumber = user?.studentNumber;
    final deviceAddress = session['deviceAddress']?.toString();
    final sessionCode = session['sessionCode']?.toString();
    final expiresAt = _readEndTime(session);
    final lastSeen = session['lastSeen'];
    final isStale =
        lastSeen is! DateTime ||
        DateTime.now().difference(lastSeen) > const Duration(seconds: 8);

    BleAttendanceChannel.log(
      'STUDENT',
      'Mark Attendance tapped sessionCode=${sessionCode ?? '<missing>'}',
    );
    if (seatNumber == null || seatNumber.isEmpty) {
      BleAttendanceChannel.log(
        'STUDENT',
        'Attendance request blocked: authenticated profile has no student number',
      );
      setState(
        () =>
            _message = 'Your authenticated student profile has no seat number.',
      );
      return;
    }
    if (deviceAddress == null ||
        sessionCode == null ||
        !_scanning ||
        isStale ||
        (expiresAt != null && !expiresAt.isAfter(DateTime.now()))) {
      if (expiresAt != null && !expiresAt.isAfter(DateTime.now())) {
        BleAttendanceChannel.log(
          'STUDENT',
          'Expired session cannot be marked sessionCode=${sessionCode ?? '<missing>'}',
        );
      } else if (isStale) {
        BleAttendanceChannel.log(
          'STUDENT',
          'Attendance request blocked: session advertisement is stale '
              'sessionCode=${sessionCode ?? '<missing>'}',
        );
      } else {
        BleAttendanceChannel.log(
          'STUDENT',
          'Attendance request blocked: scanning or session details unavailable '
              'sessionCode=${sessionCode ?? '<missing>'}',
        );
      }
      setState(
        () => _message =
            'This session is no longer available. Rescan to verify it is still active.',
      );
      return;
    }

    setState(() {
      _submittingKey = key;
      _message = null;
    });
    try {
      await BleAttendanceChannel.instance.submitStudentAttendance(
        deviceAddress: deviceAddress,
        sessionCode: sessionCode,
        seatNumber: seatNumber,
      );
      BleAttendanceChannel.log(
        'STUDENT',
        'Attendance request submitted to native BLE client '
            'sessionCode=$sessionCode',
      );
      if (mounted) {
        setState(() => _message = 'Attendance request sent to the teacher.');
      }
    } catch (error) {
      BleAttendanceChannel.log(
        'STUDENT',
        'Attendance request failed sessionCode=$sessionCode error=$error',
      );
      if (mounted) {
        setState(() => _message = 'Attendance request failed: $error');
      }
    } finally {
      if (mounted) setState(() => _submittingKey = null);
    }
  }

  DateTime? _readEndTime(Map<String, dynamic> session) {
    final raw = session['expiresAt'] ?? session['endsAt'] ?? session['endTime'];
    if (raw is DateTime) return raw;
    if (raw is String) return DateTime.tryParse(raw)?.toLocal();
    if (raw is num) {
      final milliseconds = raw > 1000000000000
          ? raw.toInt()
          : raw.toInt() * 1000;
      return DateTime.fromMillisecondsSinceEpoch(milliseconds);
    }
    return null;
  }

  String _formatEndTime(DateTime endTime) {
    final hour = endTime.hour % 12 == 0 ? 12 : endTime.hour % 12;
    final suffix = endTime.hour < 12 ? 'AM' : 'PM';
    return '${endTime.day}/${endTime.month} · $hour:${endTime.minute.toString().padLeft(2, '0')} $suffix';
  }

  @override
  Widget build(BuildContext context) {
    final entries =
        _sessions.entries.where((entry) {
          final session = entry.value;
          final query = _searchQuery.trim().toLowerCase();
          return query.isEmpty ||
              session['sessionCode'].toString().toLowerCase().contains(query) ||
              session['deviceName'].toString().toLowerCase().contains(query);
        }).toList()..sort((a, b) {
          final aRssi = a.value['rssi'] is num ? a.value['rssi'] as num : -999;
          final bRssi = b.value['rssi'] is num ? b.value['rssi'] as num : -999;
          return bRssi.compareTo(aRssi);
        });

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Nearby Sessions',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        automaticallyImplyLeading: !widget.embedded,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 20),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _StatusTile(
                        icon: Icons.bluetooth_rounded,
                        title: 'Bluetooth',
                        detail: _loadingStatus
                            ? 'Checking…'
                            : _deviceStatus['bluetoothOn'] == true
                            ? 'On'
                            : _deviceStatus['bluetoothPermissionGranted'] ==
                                  false
                            ? 'Permission needed'
                            : 'Off',
                        active: _deviceStatus['bluetoothOn'] == true,
                        onTap: _openBluetoothFlow,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _StatusTile(
                        icon: Icons.location_on_rounded,
                        title: 'Location',
                        detail: _loadingStatus
                            ? 'Checking…'
                            : _deviceStatus['locationRequired'] == true &&
                                  _deviceStatus['locationPermissionGranted'] !=
                                      true
                            ? 'Permission needed'
                            : _deviceStatus['locationOn'] == true
                            ? 'On'
                            : 'Off',
                        active: _deviceStatus['locationOn'] == true,
                        onTap: _openLocationFlow,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.lightBlue,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.info_outline_rounded,
                        color: AppColors.primary,
                      ),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'The student API exposes completed attendance only, and BLE advertisements contain no expiry. Exact end times cannot be verified here. Mark Attendance requires a recent teacher advertisement; the BluMark teacher screen stops advertising at expiry.',
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 12,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Discovered sessions',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Refresh and rescan',
                      onPressed: _scanBusy ? null : _refresh,
                      icon: const Icon(Icons.refresh_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  onChanged: (value) => setState(() => _searchQuery = value),
                  decoration: InputDecoration(
                    hintText: 'Search by session code',
                    prefixIcon: const Icon(Icons.search_rounded),
                    filled: true,
                    fillColor: AppColors.surface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
                const SizedBox(height: 12),
                if (_message != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      _message!,
                      style: TextStyle(
                        color:
                            _message!.contains('failed') ||
                                _message!.contains('Unable') ||
                                _message!.contains('Could not')
                            ? AppColors.error
                            : AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                if (entries.isEmpty)
                  _EmptySessions(scanning: _scanning)
                else
                  ...entries.map((entry) {
                    final endTime = _readEndTime(entry.value);
                    final lastSeen = entry.value['lastSeen'];
                    final recentlySeen =
                        lastSeen is DateTime &&
                        DateTime.now().difference(lastSeen) <=
                            const Duration(seconds: 8);
                    final expired =
                        endTime != null && !endTime.isAfter(DateTime.now());
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: StudentBleAttendanceCard(
                        sessionCode:
                            entry.value['sessionCode']?.toString() ?? '—',
                        deviceName:
                            entry.value['deviceName']?.toString() ??
                            'BluMark teacher',
                        rssi: entry.value['rssi'] is num
                            ? (entry.value['rssi'] as num).toInt()
                            : null,
                        endTime: endTime == null
                            ? 'Unavailable'
                            : _formatEndTime(endTime),
                        expired: expired,
                        isSubmitting: _submittingKey == entry.key,
                        canMark: _scanning && recentlySeen && !expired,
                        onMark: () => _markAttendance(entry.key, entry.value),
                      ),
                    );
                  }),
              ],
            ),
          ),
          SafeArea(
            top: false,
            minimum: const EdgeInsets.fromLTRB(18, 10, 18, 14),
            child: SizedBox(
              width: double.infinity,
              height: 54,
              child: FilledButton.icon(
                onPressed: _scanBusy
                    ? null
                    : _scanning
                    ? _stopScanning
                    : _startScanning,
                style: FilledButton.styleFrom(
                  backgroundColor: _scanning
                      ? AppColors.error
                      : AppColors.primary,
                  foregroundColor: AppColors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                icon: _scanBusy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.white,
                        ),
                      )
                    : Icon(
                        _scanning
                            ? Icons.stop_circle_outlined
                            : Icons.bluetooth_searching_rounded,
                      ),
                label: Text(
                  _scanBusy
                      ? 'Please wait…'
                      : _scanning
                      ? 'Stop Scanning'
                      : 'Start Scanning',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusTile extends StatelessWidget {
  const _StatusTile({
    required this.icon,
    required this.title,
    required this.detail,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String detail;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: AppColors.surface,
    borderRadius: BorderRadius.circular(15),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(15),
      child: Container(
        constraints: const BoxConstraints(minHeight: 82),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: active ? AppColors.success : AppColors.textMuted,
              size: 23,
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    detail,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.textMuted,
              size: 18,
            ),
          ],
        ),
      ),
    ),
  );
}

class _EmptySessions extends StatelessWidget {
  const _EmptySessions({required this.scanning});

  final bool scanning;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    margin: const EdgeInsets.only(top: 8),
    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 30),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(
      children: [
        Icon(
          scanning
              ? Icons.bluetooth_searching_rounded
              : Icons.bluetooth_disabled,
          size: 38,
          color: AppColors.primary,
        ),
        const SizedBox(height: 10),
        Text(
          scanning ? 'Searching nearby…' : 'No sessions discovered yet',
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Start scanning when your teacher opens an attendance session.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
        ),
      ],
    ),
  );
}
