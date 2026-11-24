import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../presentation/widgets/student_ui.dart';
import '../../providers/student_providers.dart';
import '../widgets/attendance_history_list.dart';
import '../widgets/attendance_overview_card.dart';
import '../widgets/attendance_filter_bar.dart';

class AttendanceScreen extends ConsumerWidget {
  const AttendanceScreen({super.key, required this.onNavigateToNearby});
  final VoidCallback onNavigateToNearby;

  @override
  Widget build(BuildContext context, WidgetRef ref) => StudentAsyncPage(
    value: ref.watch(filteredAttendanceHistoryProvider),
    onRefresh: () async {
      ref.invalidate(attendanceSummaryProvider);
      ref.invalidate(attendanceHistoryProvider);
      ref.invalidate(filteredAttendanceHistoryProvider);
    },
    builder: (history) => StudentPage(
      title: 'Attendance',
      actions: [
        IconButton(
          onPressed: onNavigateToNearby,
          icon: const Icon(Icons.bluetooth_searching),
          tooltip: 'Nearby sessions',
        ),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ref
              .watch(attendanceSummaryProvider)
              .when(
                data: (summary) => AttendanceOverviewCard(attendance: summary),
                loading: () => const Card(
                  child: SizedBox(
                    height: 120,
                    child: Center(child: CircularProgressIndicator()),
                  ),
                ),
                error: (error, stackTrace) =>
                    const Text('Attendance summary is unavailable.'),
              ),
          ref
              .watch(attendanceSummaryProvider)
              .maybeWhen(
                data: (summary) => AttendanceFilterBar(
                  subjects: studentMaps(summary['subjects']),
                ),
                orElse: () => const SizedBox.shrink(),
              ),
          const SizedBox(height: 16),
          const StudentSectionTitle(title: 'Attendance history'),
          AttendanceHistoryList(records: studentMaps(history['records'])),
          const SizedBox(height: 16),
          const Text(
            'Attendance marking is managed through the institution’s secure workflow.',
            style: TextStyle(fontSize: 12),
          ),
        ],
      ),
    ),
  );
}
