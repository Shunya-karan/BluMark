import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/ble/ble_attendance_channel.dart';
import '../../providers/teacher_providers.dart';

class ActiveAttendanceScreen extends ConsumerStatefulWidget {
  const ActiveAttendanceScreen({super.key});

  @override
  ConsumerState<ActiveAttendanceScreen> createState() =>
      _ActiveAttendanceScreenState();
}

class _ActiveAttendanceScreenState
    extends ConsumerState<ActiveAttendanceScreen> {
  final Map<String, String> _localSelections =
      {}; // studentId -> status ('PRESENT'/'ABSENT')
  final Map<String, String> _existingRecordIds = {}; // studentId -> recordId
  String _searchQuery = '';
  String? _statusFilter;
  bool _isSaving = false;
  bool _isEnding = false;
  bool _hasLoadedInitial = false;
  bool _loggedRosterError = false;
  bool _bleStarting = false;
  bool _bleStarted = false;
  bool _loggedInactiveBleSkip = false;
  DateTime? _sessionExpiresAt;
  StreamSubscription<BleAttendanceEvent>? _bleSubscription;
  Timer? _bleExpiryTimer;
  String _bleState = 'Starting BLE…';
  int _bleMarkedCount = 0;

  @override
  void dispose() {
    _bleExpiryTimer?.cancel();
    _bleSubscription?.cancel();
    if (_bleStarted) {
      unawaited(BleAttendanceChannel.instance.stopTeacherSession());
    }
    super.dispose();
  }

  Future<void> _startBle(
    Map<String, dynamic> session,
    List<dynamic> roster,
  ) async {
    print("========== SESSION DATA ==========");
    print(session);
    print("Session keys: ${session.keys}");
    print("Session code: ${session['sessionCode']}");
    final code = session['sessionCode'] as String?;
    final extra = GoRouterState.of(context).extra;
    final enableBle = !(extra is Map && extra['enableBle'] == false);
    BleAttendanceChannel.log(
      'TEACHER',
      'Active Attendance BLE initialization requested '
          'sessionCode=${code ?? '<missing>'} enabled=$enableBle',
    );
    if (!enableBle) {
      if (_bleState != 'Teacher controls only') {
        setState(() => _bleState = 'Teacher controls only');
      }
      return;
    }
    if (code == null || code.isEmpty || _bleStarting || _bleStarted) {
      BleAttendanceChannel.log(
        'TEACHER',
        'BLE initialization skipped sessionCode=${code ?? '<missing>'} '
            'alreadyStarting=$_bleStarting alreadyStarted=$_bleStarted',
      );
      return;
    }

    final expiryValue = session['expiresAt']?.toString();
    final expiry = expiryValue == null
        ? null
        : DateTime.tryParse(expiryValue)?.toLocal();
    if (expiry != null && !expiry.isAfter(DateTime.now())) {
      BleAttendanceChannel.log(
        'TEACHER',
        'BLE advertising not started: session already expired sessionCode=$code',
      );
      setState(() => _bleState = 'Session expired — Bluetooth is stopped');
      await _bleSubscription?.cancel();
      _bleSubscription = null;
      return;
    }
    _sessionExpiresAt = expiry;

    _bleStarting = true;
    try {
      BleAttendanceChannel.log(
        'TEACHER',
        'Requesting Bluetooth permissions for sessionCode=$code',
      );
      final permitted = await BleAttendanceChannel.instance.requestPermissions(
        role: 'TEACHER',
      );
      BleAttendanceChannel.log(
        'TEACHER',
        'Bluetooth permission result granted=$permitted sessionCode=$code',
      );
      if (!mounted) {
        BleAttendanceChannel.log(
          'TEACHER',
          'BLE initialization stopped: screen was disposed during permission request',
        );
        return;
      }
      if (!permitted) {
        BleAttendanceChannel.log(
          'TEACHER',
          'BLE advertising not started: permissions denied sessionCode=$code',
        );
        setState(() => _bleState = 'Bluetooth permission is required');
        return;
      }
      _bleSubscription ??= BleAttendanceChannel.instance.events.listen((event) {
        if (!mounted) return;
        if (event.type == 'status') {
          BleAttendanceChannel.log(
            'TEACHER',
            'BLE status event state=${event.data['state']} '
                'errorCode=${event.data['errorCode']}',
          );
          setState(() => _bleState = event.data['state'] as String? ?? 'Ready');
          return;
        }
        if (event.type != 'attendanceAttempt' ||
            event.data['sessionCode'] != code ||
            (_sessionExpiresAt != null &&
                !_sessionExpiresAt!.isAfter(DateTime.now()))) {
          if (event.type == 'attendanceAttempt') {
            BleAttendanceChannel.log(
              'TEACHER',
              'Attendance request ignored: session mismatch or expired '
                  'receivedSessionCode=${event.data['sessionCode']} '
                  'activeSessionCode=$code',
            );
          }
          return;
        }
        final seat = event.data['seatNumber']?.toString();
        BleAttendanceChannel.log(
          'TEACHER',
          'Matching attendance request against class roster '
              'sessionCode=$code seatNumber=${seat ?? '<missing>'}',
        );
        Map? matchedStudent;
        for (final item in roster) {
          if (item is! Map) continue;
          final student = item['student'];
          if (student is Map && student['studentNumber']?.toString() == seat) {
            matchedStudent = student;
            break;
          }
        }
        final studentId = matchedStudent?['id']?.toString();
        if (studentId == null || studentId.isEmpty) {
          BleAttendanceChannel.log(
            'TEACHER',
            'Attendance request rejected: student not found in class roster '
                'sessionCode=$code seatNumber=${seat ?? '<missing>'}',
          );
          setState(
            () => _bleState = 'Request rejected: seat is not in this class',
          );
          return;
        }
        if (_localSelections[studentId] == 'PRESENT') {
          BleAttendanceChannel.log(
            'TEACHER',
            'Duplicate attendance request ignored; student already Present '
                'sessionCode=$code seatNumber=${seat ?? '<missing>'}',
          );
          return;
        }
        setState(() {
          _localSelections[studentId] = 'PRESENT';
          _bleMarkedCount++;
          _bleState = 'Attendance received — ready to save';
        });
        BleAttendanceChannel.log(
          'TEACHER',
          'Attendance queued locally as Present; awaiting Save Attendance '
              'sessionCode=$code seatNumber=${seat ?? '<missing>'}',
        );
      });

      if (expiry != null && !expiry.isAfter(DateTime.now())) {
        BleAttendanceChannel.log(
          'TEACHER',
          'BLE initialization stopped: session expired after permission request '
              'sessionCode=$code',
        );
        setState(() => _bleState = 'Session expired — Bluetooth is stopped');
        return;
      }
      await BleAttendanceChannel.instance.startTeacherSession(code);
      BleAttendanceChannel.log(
        'TEACHER',
        'Teacher BLE start request accepted by native channel sessionCode=$code',
      );
      _bleStarted = true;
      if (!mounted) {
        unawaited(BleAttendanceChannel.instance.stopTeacherSession());
        return;
      }
      setState(() => _bleState = 'Advertising and accepting attendance');
      if (expiry != null) {
        _bleExpiryTimer = Timer(
          expiry.difference(DateTime.now()),
          _stopBleAtExpiry,
        );
      }
    } catch (error) {
      BleAttendanceChannel.log(
        'TEACHER',
        'BLE initialization failed sessionCode=$code error=$error',
      );
      if (mounted) {
        setState(() => _bleState = 'Bluetooth unavailable: $error');
      }
      await _bleSubscription?.cancel();
      _bleSubscription = null;
    } finally {
      _bleStarting = false;
    }
  }

  Future<void> _stopBleAtExpiry() async {
    BleAttendanceChannel.log(
      'TEACHER',
      'Stopping BLE because attendance session expired',
    );
    try {
      if (_bleStarted) {
        await BleAttendanceChannel.instance.stopTeacherSession();
        _bleStarted = false;
      }
      if (mounted) {
        setState(() => _bleState = 'Session expired — Bluetooth is stopped');
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _bleState = 'Session expired; Bluetooth stop failed: $error',
        );
      }
    }
  }

  String _formatSessionTime(Object? value) {
    final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
    if (date == null) return '—';
    final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
    final suffix = date.hour < 12 ? 'AM' : 'PM';
    return '${date.day}/${date.month} · $hour:${date.minute.toString().padLeft(2, '0')} $suffix';
  }

  @override
  Widget build(BuildContext context) {
    final sessionId =
        GoRouterState.of(context).pathParameters['sessionId'] ?? '';
    final rosterAsync = ref.watch(teacherSessionRosterProvider(sessionId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Active Attendance',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Roster',
            onPressed: () {
              setState(() => _hasLoadedInitial = false);
              ref.invalidate(teacherSessionRosterProvider(sessionId));
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          setState(() => _hasLoadedInitial = false);
          ref.invalidate(teacherSessionRosterProvider(sessionId));
        },
        child: rosterAsync.when(
          data: (data) {
            _loggedRosterError = false;
            final session = data['session'] as Map<String, dynamic>? ?? {};
            final roster = data['roster'] as List<dynamic>? ?? [];

            // Pre-populate selections from existing roster data on first load
            if (!_hasLoadedInitial) {
              for (final item in roster) {
                final student = item['student'] as Map?;
                final attendance = item['attendance'] as Map?;

                final studentId = student?['id'] as String?;
                if (studentId != null) {
                  final status = attendance?['status'] as String?;
                  final recordId = attendance?['id'] as String?;

                  if (status != null && status.toUpperCase() != 'UNMARKED') {
                    _localSelections[studentId] = status.toUpperCase();
                  }
                  if (recordId != null) {
                    _existingRecordIds[studentId] = recordId;
                  }
                }
              }
              _hasLoadedInitial = true;
            }

            final classSubject = session['classSubject'] as Map?;
            final subject = classSubject?['subject'] as Map?;
            final schoolClass = classSubject?['schoolClass'] as Map?;

            final subjectName = subject?['name'] as String? ?? 'Subject';
            final className = schoolClass?['name'] as String? ?? 'Class';
            final division = schoolClass?['division'] as String? ?? '';
            final fullClassName = division.isNotEmpty
                ? '$className ($division)'
                : className;
            final sessionStatus = session['status'] as String? ?? 'ACTIVE';
            if (sessionStatus == 'ACTIVE') {
              WidgetsBinding.instance.addPostFrameCallback(
                (_) => _startBle(session, roster),
              );
            } else if (!_loggedInactiveBleSkip) {
              _loggedInactiveBleSkip = true;
              BleAttendanceChannel.log(
                'TEACHER',
                'BLE initialization not requested: session is not active '
                    'sessionCode=${session['sessionCode'] ?? '<missing>'} '
                    'status=$sessionStatus',
              );
            }

            // Calculate live counters
            final totalStudents = roster.length;
            int presentCount = 0;
            int absentCount = 0;

            for (final item in roster) {
              final studentId = item['student']?['id'] as String?;
              final sel = _localSelections[studentId];
              if (sel == 'PRESENT') presentCount++;
              if (sel == 'ABSENT') absentCount++;
            }
            final unmarkedCount = totalStudents - (presentCount + absentCount);

            // Filter roster
            final filteredRoster = roster.where((item) {
              final student = item['student'] as Map?;
              final studentId = student?['id'] as String? ?? '';
              final name = (student?['fullName'] as String? ?? '')
                  .toLowerCase();
              final studentNo = (student?['studentNumber'] as String? ?? '')
                  .toLowerCase();
              final currentStatus = _localSelections[studentId] ?? 'UNMARKED';

              final matchesSearch =
                  _searchQuery.isEmpty ||
                  name.contains(_searchQuery.toLowerCase()) ||
                  studentNo.contains(_searchQuery.toLowerCase());

              final matchesFilter =
                  _statusFilter == null ||
                  currentStatus == _statusFilter!.toUpperCase();

              return matchesSearch && matchesFilter;
            }).toList();

            return Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      // Header Summary Card
                      Card(
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: AppColors.border),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      '$fullClassName • $subjectName',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 17,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: sessionStatus == 'ACTIVE'
                                          ? AppColors.lightTeal
                                          : AppColors.lightBlue,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      sessionStatus,
                                      style: TextStyle(
                                        color: sessionStatus == 'ACTIVE'
                                            ? AppColors.teal
                                            : AppColors.primary,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 24),
                              Row(
                                children: [
                                  Expanded(
                                    child: _SessionDetail(
                                      label: 'Started',
                                      value: _formatSessionTime(
                                        session['startsAt'],
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: _SessionDetail(
                                      label: 'Ends',
                                      value: _formatSessionTime(
                                        session['expiresAt'],
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: _SessionDetail(
                                      label: 'Session code',
                                      value:
                                          session['sessionCode']?.toString() ??
                                          '—',
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 24),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceAround,
                                children: [
                                  _SummaryStat(
                                    'Total',
                                    totalStudents,
                                    AppColors.textPrimary,
                                  ),
                                  _SummaryStat(
                                    'Present',
                                    presentCount,
                                    AppColors.success,
                                  ),
                                  _SummaryStat(
                                    'Absent',
                                    absentCount,
                                    AppColors.error,
                                  ),
                                  _SummaryStat(
                                    'Unmarked',
                                    unmarkedCount,
                                    AppColors.textMuted,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Card(
                        color: AppColors.lightBlue,
                        elevation: 0,
                        child: ListTile(
                          leading: const Icon(
                            Icons.bluetooth_connected,
                            color: AppColors.primary,
                          ),
                          title: const Text(
                            'BLE attendance',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            '$_bleState${_bleMarkedCount > 0 ? ' • $_bleMarkedCount received' : ''}',
                          ),
                          trailing: Text(
                            session['sessionCode']?.toString() ?? '—',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Quick Action Buttons
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _confirmMarkAllPresent(roster),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.teal),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              icon: const Icon(
                                Icons.done_all_rounded,
                                size: 18,
                                color: AppColors.teal,
                              ),
                              label: const Text(
                                'Mark All Present',
                                style: TextStyle(
                                  color: AppColors.teal,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _confirmClearAll,
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(
                                  color: AppColors.textMuted,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              icon: const Icon(
                                Icons.restart_alt_rounded,
                                size: 18,
                                color: AppColors.textMuted,
                              ),
                              label: const Text(
                                'Clear All',
                                style: TextStyle(
                                  color: AppColors.textMuted,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Search & Filters
                      TextField(
                        onChanged: (val) => setState(() => _searchQuery = val),
                        decoration: InputDecoration(
                          hintText: 'Search student name or ID...',
                          prefixIcon: const Icon(Icons.search_rounded),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _FilterChip(
                              label: 'All ($totalStudents)',
                              selected: _statusFilter == null,
                              onSelected: () =>
                                  setState(() => _statusFilter = null),
                            ),
                            _FilterChip(
                              label: 'Present ($presentCount)',
                              selected: _statusFilter == 'PRESENT',
                              onSelected: () =>
                                  setState(() => _statusFilter = 'PRESENT'),
                            ),
                            _FilterChip(
                              label: 'Absent ($absentCount)',
                              selected: _statusFilter == 'ABSENT',
                              onSelected: () =>
                                  setState(() => _statusFilter = 'ABSENT'),
                            ),
                            _FilterChip(
                              label: 'Unmarked ($unmarkedCount)',
                              selected: _statusFilter == 'UNMARKED',
                              onSelected: () =>
                                  setState(() => _statusFilter = 'UNMARKED'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Roster list
                      if (filteredRoster.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(32),
                          child: Center(
                            child: Text(
                              'No students match current filter.',
                              style: TextStyle(color: AppColors.textSecondary),
                            ),
                          ),
                        )
                      else
                        ...filteredRoster.map((item) {
                          final student = item['student'] as Map?;
                          final studentId = student?['id'] as String? ?? '';
                          final fullName =
                              student?['fullName'] as String? ?? 'Student';
                          final studentNo =
                              student?['studentNumber'] as String? ?? 'N/A';
                          final initial = fullName.isNotEmpty
                              ? fullName[0].toUpperCase()
                              : 'S';

                          final currentSel = _localSelections[studentId];

                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                              side: BorderSide(
                                color: currentSel == 'PRESENT'
                                    ? AppColors.teal
                                    : currentSel == 'ABSENT'
                                    ? AppColors.error
                                    : AppColors.border,
                                width: currentSel != null ? 1.5 : 1.0,
                              ),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: currentSel == 'PRESENT'
                                        ? AppColors.lightTeal
                                        : currentSel == 'ABSENT'
                                        ? Colors.red.shade50
                                        : AppColors.secondarySurface,
                                    child: Text(
                                      initial,
                                      style: TextStyle(
                                        color: currentSel == 'PRESENT'
                                            ? AppColors.teal
                                            : currentSel == 'ABSENT'
                                            ? AppColors.error
                                            : AppColors.textPrimary,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          fullName,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 15,
                                            color: AppColors.textPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Seat: $studentNo',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  // Present / Absent Buttons
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      _SelectionBtn(
                                        label: 'Present',
                                        isSelected: currentSel == 'PRESENT',
                                        activeColor: AppColors.teal,
                                        activeBg: AppColors.lightTeal,
                                        onTap: () {
                                          setState(() {
                                            _localSelections[studentId] =
                                                'PRESENT';
                                          });
                                        },
                                      ),
                                      const SizedBox(width: 6),
                                      _SelectionBtn(
                                        label: 'Absent',
                                        isSelected: currentSel == 'ABSENT',
                                        activeColor: AppColors.error,
                                        activeBg: Colors.red.shade50,
                                        onTap: () {
                                          setState(() {
                                            _localSelections[studentId] =
                                                'ABSENT';
                                          });
                                        },
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                    ],
                  ),
                ),

                // Save & End Action Bar
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 10,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      if (sessionStatus == 'ACTIVE') ...[
                        Expanded(
                          child: OutlinedButton(
                            onPressed: (_isSaving || _isEnding)
                                ? null
                                : () => _endSession(sessionId),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.error),
                              minimumSize: const Size(double.infinity, 50),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: _isEnding
                                ? const SizedBox(
                                    height: 18,
                                    width: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AppColors.error,
                                    ),
                                  )
                                : const Text(
                                    'End Session',
                                    style: TextStyle(
                                      color: AppColors.error,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 12),
                      ],
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: (_isSaving || _isEnding)
                              ? null
                              : () => _saveAttendance(sessionId),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 50),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: _isSaving
                              ? const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(
                                      height: 18,
                                      width: 18,
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                        strokeWidth: 2,
                                      ),
                                    ),
                                    SizedBox(width: 10),
                                    Text(
                                      'Saving...',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                )
                              : const Text(
                                  'Save Attendance',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary),
          ),
          error: (error, _) {
            if (!_loggedRosterError) {
              _loggedRosterError = true;
              BleAttendanceChannel.log(
                'TEACHER',
                'BLE startup blocked: active session roster failed to load; '
                    'error=$error',
              );
            }
            return Center(
              child: Text(
                'Error loading live session: $error',
                style: const TextStyle(color: AppColors.error),
              ),
            );
          },
        ),
      ),
    );
  }

  void _confirmMarkAllPresent(List<dynamic> roster) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Mark All Present'),
        content: const Text(
          'Are you sure you want to mark all students in this roster as Present?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              setState(() {
                for (final item in roster) {
                  final studentId = item['student']?['id'] as String?;
                  if (studentId != null) {
                    _localSelections[studentId] = 'PRESENT';
                  }
                }
              });
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.teal),
            child: const Text('Mark All Present'),
          ),
        ],
      ),
    );
  }

  void _confirmClearAll() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear Selections'),
        content: const Text(
          'Reset all student attendance selections to Unmarked?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              setState(() {
                _localSelections.clear();
              });
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Clear All'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveAttendance(String sessionId) async {
    if (_localSelections.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please mark at least one student')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final repository = ref.read(teacherRepositoryProvider);

      final newRecords = <Map<String, dynamic>>[];
      final updateRecords = <Map<String, dynamic>>[];

      _localSelections.forEach((studentId, status) {
        final existingRecordId = _existingRecordIds[studentId];
        if (existingRecordId != null) {
          updateRecords.add({'recordId': existingRecordId, 'status': status});
        } else {
          newRecords.add({'studentId': studentId, 'status': status});
        }
      });

      if (newRecords.isNotEmpty) {
        final result = await repository.bulkMarkAttendance(
          sessionId: sessionId,
          records: newRecords,
        );
        final created = result['records'];
        if (created is List) {
          for (final record in created.whereType<Map>()) {
            final student = record['student'];
            final studentId = student is Map
                ? student['id']?.toString()
                : record['studentId']?.toString();
            final recordId = record['id']?.toString();
            if (studentId != null && recordId != null) {
              _existingRecordIds[studentId] = recordId;
            }
          }
        }
      }
      if (updateRecords.isNotEmpty) {
        await repository.bulkUpdateAttendance(
          sessionId: sessionId,
          records: updateRecords,
        );
      }

      // Refresh providers
      setState(() => _hasLoadedInitial = false);
      ref.invalidate(teacherSessionRosterProvider(sessionId));
      ref.invalidate(teacherAttendanceHistoryProvider);
      ref.invalidate(teacherDashboardSummaryProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Attendance saved successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString().replaceFirst('ApiException: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _endSession(String sessionId) async {
    setState(() => _isEnding = true);
    try {
      final repository = ref.read(teacherRepositoryProvider);
      await repository.endAttendanceSession(sessionId);
      _bleExpiryTimer?.cancel();
      String? bleStopError;
      if (_bleStarted) {
        try {
          await BleAttendanceChannel.instance.stopTeacherSession();
          _bleStarted = false;
        } catch (error) {
          bleStopError = error.toString();
        }
      }
      if (mounted) {
        setState(
          () => _bleState = bleStopError == null
              ? 'Session ended — Bluetooth is stopped'
              : 'Session ended, but Bluetooth could not be stopped: $bleStopError',
        );
      }

      ref.invalidate(teacherSessionRosterProvider(sessionId));
      ref.invalidate(teacherAttendanceHistoryProvider);
      ref.invalidate(teacherDashboardSummaryProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              bleStopError == null
                  ? 'Session ended successfully'
                  : 'Session ended, but BLE stop failed: $bleStopError',
            ),
            backgroundColor: bleStopError == null ? null : AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString().replaceFirst('ApiException: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isEnding = false);
      }
    }
  }
}

class _SummaryStat extends StatelessWidget {
  const _SummaryStat(this.label, this.count, this.color);
  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          '$count',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 18,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

class _SessionDetail extends StatelessWidget {
  const _SessionDetail({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
      ),
      const SizedBox(height: 3),
      Text(
        value,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    ],
  );
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onSelected(),
        selectedColor: AppColors.lightTeal,
        checkmarkColor: AppColors.teal,
        labelStyle: TextStyle(
          color: selected ? AppColors.teal : AppColors.textSecondary,
          fontWeight: selected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
    );
  }
}

class _SelectionBtn extends StatelessWidget {
  const _SelectionBtn({
    required this.label,
    required this.isSelected,
    required this.activeColor,
    required this.activeBg,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final Color activeColor;
  final Color activeBg;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? activeBg : AppColors.secondarySurface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? activeColor : AppColors.border,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? activeColor : AppColors.textSecondary,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}
