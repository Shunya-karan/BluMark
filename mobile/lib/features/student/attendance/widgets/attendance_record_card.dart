import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../presentation/widgets/student_ui.dart';

class AttendanceRecordCard extends StatelessWidget {
  const AttendanceRecordCard({super.key, required this.record});
  final Map<String, dynamic> record;
  @override
  Widget build(BuildContext context) {
    final status = studentString(record['status']);
    final color = status == 'PRESENT'
        ? AppColors.success
        : status == 'LATE' || status == 'EXCUSED'
        ? AppColors.warning
        : AppColors.error;
    final subject = studentMap(record['subject']);
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: .12),
          child: Icon(
            status == 'PRESENT' ? Icons.check_rounded : Icons.close_rounded,
            color: color,
          ),
        ),
        title: Text(
          studentString(subject['name'], 'Class'),
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Text(studentDate(record['date'])),
        trailing: Text(
          status,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w800,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}
