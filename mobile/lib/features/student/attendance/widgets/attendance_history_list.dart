import 'package:flutter/material.dart';
import '../../presentation/widgets/student_ui.dart';
import 'attendance_record_card.dart';

class AttendanceHistoryList extends StatelessWidget {
  const AttendanceHistoryList({super.key, required this.records});
  final List<Map<String, dynamic>> records;
  @override
  Widget build(BuildContext context) => records.isEmpty
      ? const StudentEmptyCard(
          icon: Icons.fact_check_outlined,
          title: 'No attendance records found',
          message: 'Completed attendance sessions will appear here.',
        )
      : Column(
          children: records
              .map((record) => AttendanceRecordCard(record: record))
              .toList(),
        );
}
