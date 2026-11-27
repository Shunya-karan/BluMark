import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/teacher_providers.dart';

class AttendanceSessionDetailsScreen extends ConsumerStatefulWidget {
  const AttendanceSessionDetailsScreen({super.key});

  @override
  ConsumerState<AttendanceSessionDetailsScreen> createState() =>
      _AttendanceSessionDetailsScreenState();
}

class _AttendanceSessionDetailsScreenState
    extends ConsumerState<AttendanceSessionDetailsScreen> {
  String _searchQuery = '';
  String? _statusFilter;

  @override
  Widget build(BuildContext context) {
    final sessionId = GoRouterState.of(context).pathParameters['sessionId'] ?? '';
    final rosterAsync = ref.watch(teacherSessionRosterProvider(sessionId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Session Details',
            style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(teacherSessionRosterProvider(sessionId));
        },
        child: rosterAsync.when(
          data: (data) {
            final session = data['session'] as Map<String, dynamic>? ?? {};
            final summary = data['summary'] as Map<String, dynamic>? ?? {};
            final roster = data['roster'] as List<dynamic>? ?? [];

            final classSubject = session['classSubject'] as Map?;
            final subject = classSubject?['subject'] as Map?;
            final schoolClass = classSubject?['schoolClass'] as Map?;

            final subjectName = subject?['name'] as String? ?? 'Subject';
            final className = schoolClass?['name'] as String? ?? 'Class';
            final division = schoolClass?['division'] as String? ?? '';
            final fullClassName =
                division.isNotEmpty ? '$className ($division)' : className;

            final startsAt = _formatDateTime(session['startsAt'] as String?);
            final status = session['status'] as String? ?? 'COMPLETED';

            // Filter roster
            final filteredRoster = roster.where((item) {
              final student = item['student'] as Map?;
              final attendance = item['attendance'] as Map?;

              final name = (student?['fullName'] as String? ?? '').toLowerCase();
              final studentNo =
                  (student?['studentNumber'] as String? ?? '').toLowerCase();
              final currentStatus =
                  (attendance?['status'] as String? ?? 'UNMARKED').toUpperCase();

              final matchesSearch = _searchQuery.isEmpty ||
                  name.contains(_searchQuery.toLowerCase()) ||
                  studentNo.contains(_searchQuery.toLowerCase());

              final matchesFilter = _statusFilter == null ||
                  currentStatus == _statusFilter!.toUpperCase();

              return matchesSearch && matchesFilter;
            }).toList();

            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // Header summary card
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
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '$fullClassName • $subjectName',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 18,
                                    color: AppColors.textPrimary),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: status == 'ACTIVE'
                                    ? AppColors.lightTeal
                                    : AppColors.lightBlue,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                status,
                                style: TextStyle(
                                  color: status == 'ACTIVE'
                                      ? AppColors.teal
                                      : AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Started: $startsAt',
                          style: const TextStyle(
                              color: AppColors.textSecondary, fontSize: 13),
                        ),
                        const Divider(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _StatBadge('Total', summary['totalStudents'] ?? 0,
                                AppColors.textPrimary),
                            _StatBadge('Present', summary['present'] ?? 0,
                                AppColors.success),
                            _StatBadge(
                                'Late', summary['late'] ?? 0, AppColors.warning),
                            _StatBadge(
                                'Absent', summary['absent'] ?? 0, AppColors.error),
                            _StatBadge('Excused', summary['excused'] ?? 0,
                                AppColors.primary),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Search & Filters
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'Search student name or ID...',
                    prefixIcon: const Icon(Icons.search_rounded),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _FilterChip(
                        label: 'All',
                        selected: _statusFilter == null,
                        onSelected: () => setState(() => _statusFilter = null),
                      ),
                      _FilterChip(
                        label: 'Present',
                        selected: _statusFilter == 'PRESENT',
                        onSelected: () =>
                            setState(() => _statusFilter = 'PRESENT'),
                      ),
                      _FilterChip(
                        label: 'Late',
                        selected: _statusFilter == 'LATE',
                        onSelected: () => setState(() => _statusFilter = 'LATE'),
                      ),
                      _FilterChip(
                        label: 'Absent',
                        selected: _statusFilter == 'ABSENT',
                        onSelected: () =>
                            setState(() => _statusFilter = 'ABSENT'),
                      ),
                      _FilterChip(
                        label: 'Excused',
                        selected: _statusFilter == 'EXCUSED',
                        onSelected: () =>
                            setState(() => _statusFilter = 'EXCUSED'),
                      ),
                      _FilterChip(
                        label: 'Unmarked',
                        selected: _statusFilter == 'UNMARKED',
                        onSelected: () =>
                            setState(() => _statusFilter = 'UNMARKED'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Student List
                if (filteredRoster.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(
                      child: Text('No student records found matching filters.',
                          style: TextStyle(color: AppColors.textSecondary)),
                    ),
                  )
                else
                  ...filteredRoster.map((item) {
                    final student = item['student'] as Map?;
                    final attendance = item['attendance'] as Map?;

                    final studentId = student?['id'] as String? ?? '';
                    final fullName = student?['fullName'] as String? ?? 'Student';
                    final studentNo = student?['studentNumber'] as String? ?? 'N/A';

                    final recordId = attendance?['id'] as String?;
                    final currentStatus = (attendance?['status'] as String? ??
                            'UNMARKED')
                        .toUpperCase();

                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: AppColors.border),
                      ),
                      child: ListTile(
                        title: Text(fullName,
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 15)),
                        subtitle: Text('ID: $studentNo',
                            style: const TextStyle(
                                fontSize: 13, color: AppColors.textSecondary)),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _StatusBadge(status: currentStatus),
                            const SizedBox(width: 8),
                            const Icon(Icons.edit_outlined,
                                size: 18, color: AppColors.textSecondary),
                          ],
                        ),
                        onTap: () => _openEditRecordDialog(
                          context,
                          sessionId: sessionId,
                          studentId: studentId,
                          studentName: fullName,
                          recordId: recordId,
                          currentStatus: currentStatus,
                        ),
                      ),
                    );
                  }),
              ],
            );
          },
          loading: () =>
              const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (error, _) => Center(
              child: Text('Failed to load session details: $error',
                  style: const TextStyle(color: AppColors.error))),
        ),
      ),
    );
  }

  void _openEditRecordDialog(
    BuildContext context, {
    required String sessionId,
    required String studentId,
    required String studentName,
    required String? recordId,
    required String currentStatus,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _EditRecordBottomSheet(
        sessionId: sessionId,
        studentId: studentId,
        studentName: studentName,
        recordId: recordId,
        initialStatus: currentStatus == 'UNMARKED' ? 'PRESENT' : currentStatus,
      ),
    );
  }

  String _formatDateTime(String? iso) {
    if (iso == null || iso.isEmpty) return 'N/A';
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.day}/${dt.month}/${dt.year} at ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}

class _StatBadge extends StatelessWidget {
  const _StatBadge(this.label, this.count, this.color);
  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$count',
            style: TextStyle(
                fontWeight: FontWeight.bold, fontSize: 16, color: color)),
        const SizedBox(height: 2),
        Text(label,
            style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      ],
    );
  }
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

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;

    switch (status) {
      case 'PRESENT':
        bg = AppColors.lightTeal;
        fg = AppColors.success;
        break;
      case 'LATE':
        bg = Colors.amber.shade50;
        fg = AppColors.warning;
        break;
      case 'ABSENT':
        bg = Colors.red.shade50;
        fg = AppColors.error;
        break;
      case 'EXCUSED':
        bg = AppColors.lightBlue;
        fg = AppColors.primary;
        break;
      default:
        bg = Colors.grey.shade100;
        fg = AppColors.textMuted;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status,
        style: TextStyle(color: fg, fontWeight: FontWeight.bold, fontSize: 12),
      ),
    );
  }
}

class _EditRecordBottomSheet extends ConsumerStatefulWidget {
  const _EditRecordBottomSheet({
    required this.sessionId,
    required this.studentId,
    required this.studentName,
    required this.recordId,
    required this.initialStatus,
  });

  final String sessionId;
  final String studentId;
  final String studentName;
  final String? recordId;
  final String initialStatus;

  @override
  ConsumerState<_EditRecordBottomSheet> createState() =>
      __EditRecordBottomSheetState();
}

class __EditRecordBottomSheetState
    extends ConsumerState<_EditRecordBottomSheet> {
  late String _status;
  final _notesController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _status = widget.initialStatus;
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _isLoading = true);

    try {
      final repository = ref.read(teacherRepositoryProvider);

      if (widget.recordId != null && widget.recordId!.isNotEmpty) {
        await repository.correctAttendanceRecord(
          sessionId: widget.sessionId,
          recordId: widget.recordId!,
          status: _status,
          notes: _notesController.text.trim().isNotEmpty
              ? _notesController.text.trim()
              : null,
        );
      } else {
        await repository.manuallyMarkAttendance(
          sessionId: widget.sessionId,
          studentId: widget.studentId,
          status: _status,
          notes: _notesController.text.trim().isNotEmpty
              ? _notesController.text.trim()
              : null,
        );
      }

      // Refresh providers
      ref.invalidate(teacherSessionRosterProvider(widget.sessionId));
      ref.invalidate(teacherAttendanceHistoryProvider);

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Attendance updated successfully')),
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
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Edit Attendance: ${widget.studentName}',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            children: ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'].map((s) {
              final selected = _status == s;
              return ChoiceChip(
                label: Text(s),
                selected: selected,
                onSelected: (_) => setState(() => _status = s),
                selectedColor: AppColors.lightTeal,
                labelStyle: TextStyle(
                  color: selected ? AppColors.teal : AppColors.textPrimary,
                  fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _notesController,
            decoration: const InputDecoration(
              labelText: 'Optional Notes',
              hintText: 'e.g. Doctor note provided',
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _isLoading ? null : _save,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 50),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: _isLoading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2))
                : const Text('Save Changes',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
