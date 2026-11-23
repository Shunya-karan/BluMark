import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/ble/ble_attendance_channel.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/teacher_providers.dart';

class CreateAttendanceSessionScreen extends ConsumerStatefulWidget {
  const CreateAttendanceSessionScreen({super.key});

  @override
  ConsumerState<CreateAttendanceSessionScreen> createState() =>
      _CreateAttendanceSessionScreenState();
}

class _CreateAttendanceSessionScreenState
    extends ConsumerState<CreateAttendanceSessionScreen> {
  static const _durations = [15, 30, 45, 60, 90, 120, 180, 240];
  String? _selectedClassId;
  String? _selectedClassSubjectId;
  int _durationMinutes = 30;
  String _sessionType = 'Bluetooth + teacher controls';
  bool _isLoading = false;
  DateTime _deviceTime = DateTime.now();
  Map<String, dynamic> _deviceStatus = const {};
  Timer? _clock;

  @override
  void initState() {
    super.initState();
    _clock = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted) setState(() => _deviceTime = DateTime.now());
    });
    unawaited(_refreshDeviceStatus());
  }

  @override
  void dispose() {
    _clock?.cancel();
    super.dispose();
  }

  Future<void> _refreshDeviceStatus() async {
    try {
      final status = await BleAttendanceChannel.instance.getDeviceStatus();
      if (mounted) setState(() => _deviceStatus = status);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not read Bluetooth status: $error'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _openBluetoothSettings() async {
    try {
      if (_deviceStatus['bluetoothPermissionGranted'] != true) {
        final granted = await BleAttendanceChannel.instance
            .requestPermissions();
        if (!granted) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Bluetooth permission is required.'),
              ),
            );
          }
          return;
        }
      }
      await BleAttendanceChannel.instance.openBluetoothSettings();
      await _refreshDeviceStatus();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Unable to open Bluetooth settings: $error'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _createSession(String classSubjectId) async {
    if (_isLoading) return;
    setState(() {
      _isLoading = true;
      _deviceTime = DateTime.now();
    });

    try {
      final response = await ref
          .read(teacherRepositoryProvider)
          .createAttendanceSession({
            'classSubjectId': classSubjectId,
            'durationMinutes': _durationMinutes,
          });
      if (!mounted) return;
      final session = response['session'];
      final sessionId =
          response['id'] ??
          (session is Map ? session['id'] : null) ??
          response['_id'];
      if (sessionId == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Session created, but the backend returned no ID.'),
          ),
        );
        return;
      }
      context.pushReplacement(
        '/teacher/attendance/active/$sessionId',
        extra: {'enableBle': _sessionType == 'Bluetooth + teacher controls'},
      );
    } catch (error) {
      if (mounted) {
        final message = error.toString().replaceFirst('ApiException: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<Map<String, dynamic>> _assignments(Object? value) {
    final list = value is List
        ? value
        : value is Map && value['data'] is List
        ? value['data'] as List
        : value is Map && value['subjects'] is List
        ? value['subjects'] as List
        : const [];
    return list
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .where((item) => _assignmentId(item).isNotEmpty)
        .toList();
  }

  String _assignmentId(Map<String, dynamic> assignment) =>
      assignment['id']?.toString() ??
      assignment['_id']?.toString() ??
      assignment['classSubjectId']?.toString() ??
      '';

  String _classId(Map<String, dynamic> assignment) {
    final schoolClass = assignment['schoolClass'];
    return (schoolClass is Map ? schoolClass['id']?.toString() : null) ??
        assignment['classId']?.toString() ??
        '';
  }

  String _classLabel(Map<String, dynamic> assignment) {
    final schoolClass = assignment['schoolClass'];
    if (schoolClass is! Map) return 'Class';
    final name = schoolClass['name']?.toString() ?? 'Class';
    final division =
        schoolClass['division']?.toString() ??
        schoolClass['section']?.toString() ??
        '';
    return division.isEmpty ? name : '$name ($division)';
  }

  String _subjectLabel(Map<String, dynamic> assignment) {
    final subject = assignment['subject'];
    if (subject is! Map) return 'Subject';
    final name = subject['name']?.toString() ?? 'Subject';
    final code = subject['code']?.toString() ?? '';
    return code.isEmpty ? name : '$name ($code)';
  }

  String _deviceDateTime() {
    final hour = _deviceTime.hour % 12 == 0 ? 12 : _deviceTime.hour % 12;
    final suffix = _deviceTime.hour < 12 ? 'AM' : 'PM';
    return '${_deviceTime.day}/${_deviceTime.month}/${_deviceTime.year} · '
        '$hour:${_deviceTime.minute.toString().padLeft(2, '0')} $suffix';
  }

  @override
  Widget build(BuildContext context) {
    final subjectsAsync = ref.watch(teacherSubjectsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Create Attendance Session',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: subjectsAsync.when(
        data: (data) {
          final assignments = _assignments(data);
          if (assignments.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.school_outlined,
                      size: 52,
                      color: AppColors.textMuted,
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'No assigned classes or subjects are available.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 14),
                    OutlinedButton(
                      onPressed: () => ref.invalidate(teacherSubjectsProvider),
                      child: const Text('Refresh assignments'),
                    ),
                  ],
                ),
              ),
            );
          }

          final classes = <String, Map<String, dynamic>>{};
          for (final assignment in assignments) {
            final id = _classId(assignment);
            if (id.isNotEmpty) classes.putIfAbsent(id, () => assignment);
          }
          final selectedClassId = classes.containsKey(_selectedClassId)
              ? _selectedClassId!
              : classes.keys.first;
          final classAssignments = assignments
              .where((assignment) => _classId(assignment) == selectedClassId)
              .toList();
          final selectedAssignment =
              classAssignments.any(
                (assignment) =>
                    _assignmentId(assignment) == _selectedClassSubjectId,
              )
              ? _selectedClassSubjectId!
              : _assignmentId(classAssignments.first);

          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            children: [
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.deepBlue, AppColors.primary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.fact_check_rounded,
                      color: AppColors.white,
                      size: 30,
                    ),
                    SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        'Set up a session for your class. Attendance stays editable until you save it.',
                        style: TextStyle(
                          color: AppColors.white,
                          fontWeight: FontWeight.w600,
                          height: 1.35,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              _FieldLabel('Class'),
              const SizedBox(height: 8),
              _Selector<String>(
                value: selectedClassId,
                items: classes.entries
                    .map(
                      (entry) => DropdownMenuItem(
                        value: entry.key,
                        child: Text(
                          _classLabel(entry.value),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: _isLoading
                    ? null
                    : (value) {
                        if (value == null) return;
                        final firstSubject = assignments.firstWhere(
                          (assignment) => _classId(assignment) == value,
                        );
                        setState(() {
                          _selectedClassId = value;
                          _selectedClassSubjectId = _assignmentId(firstSubject);
                        });
                      },
              ),
              const SizedBox(height: 16),
              _FieldLabel('Subject'),
              const SizedBox(height: 8),
              _Selector<String>(
                value: selectedAssignment,
                items: classAssignments
                    .map(
                      (assignment) => DropdownMenuItem(
                        value: _assignmentId(assignment),
                        child: Text(
                          _subjectLabel(assignment),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: _isLoading
                    ? null
                    : (value) =>
                          setState(() => _selectedClassSubjectId = value),
              ),
              const SizedBox(height: 20),
              _FieldLabel('Session duration'),
              const SizedBox(height: 8),
              _Selector<int>(
                value: _durationMinutes,
                items: _durations
                    .map(
                      (duration) => DropdownMenuItem(
                        value: duration,
                        child: Text('$duration minutes'),
                      ),
                    )
                    .toList(),
                onChanged: _isLoading
                    ? null
                    : (value) => setState(
                        () => _durationMinutes = value ?? _durationMinutes,
                      ),
              ),
              const SizedBox(height: 20),
              _FieldLabel('Session type'),
              const SizedBox(height: 8),
              _Selector<String>(
                value: _sessionType,
                items: const [
                  DropdownMenuItem(
                    value: 'Bluetooth + teacher controls',
                    child: Text('Bluetooth + teacher controls'),
                  ),
                  DropdownMenuItem(
                    value: 'Teacher controls only',
                    child: Text('Teacher controls only'),
                  ),
                ],
                onChanged: _isLoading
                    ? null
                    : (value) =>
                          setState(() => _sessionType = value ?? _sessionType),
              ),
              const SizedBox(height: 20),
              _FieldLabel('Device date and time'),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 15,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.schedule_rounded,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _deviceDateTime(),
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const Text(
                      'Automatic',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Material(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                child: InkWell(
                  onTap: _openBluetoothSettings,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.bluetooth_rounded,
                          color: _deviceStatus['bluetoothOn'] == true
                              ? AppColors.success
                              : AppColors.textMuted,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _deviceStatus['bluetoothOn'] == true
                                ? 'Bluetooth is on'
                                : 'Bluetooth is off or permission is needed',
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const Icon(
                          Icons.settings_rounded,
                          size: 18,
                          color: AppColors.textSecondary,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                height: 54,
                child: FilledButton.icon(
                  onPressed: _isLoading
                      ? null
                      : () => _createSession(selectedAssignment),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(15),
                    ),
                  ),
                  icon: _isLoading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            color: AppColors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Icon(Icons.play_arrow_rounded),
                  label: Text(
                    _isLoading ? 'Starting session…' : 'Start Session',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Session timing is set by the attendance service when the session is created.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 11),
              ),
            ],
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Failed to load assigned classes: $error',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.error),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () => ref.invalidate(teacherSubjectsProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => Text(
    label,
    style: const TextStyle(
      color: AppColors.textPrimary,
      fontSize: 14,
      fontWeight: FontWeight.w800,
    ),
  );
}

class _Selector<T> extends StatelessWidget {
  const _Selector({
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final T value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?>? onChanged;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.border),
    ),
    child: DropdownButton<T>(
      value: value,
      isExpanded: true,
      underline: const SizedBox.shrink(),
      items: items,
      onChanged: onChanged,
    ),
  );
}
