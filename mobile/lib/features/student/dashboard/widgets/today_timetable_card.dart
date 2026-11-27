import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../presentation/widgets/student_ui.dart';

class TodayTimetableCard extends StatelessWidget {
  const TodayTimetableCard({super.key, required this.slot});
  final Map<String, dynamic> slot;
  @override
  Widget build(BuildContext context) {
    final subject = studentMap(slot['subject']);
    final teacher = studentMap(slot['teacher']);
    return Card(
      child: ListTile(
        leading: const Icon(Icons.schedule_rounded, color: AppColors.teal),
        title: Text(
          studentString(subject['name'], 'Class'),
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Text(
          '${studentTime(slot['startTime'])} – ${studentTime(slot['endTime'])}${teacher.isEmpty ? '' : ' · ${studentString(teacher['fullName'])}'}',
        ),
        trailing: slot['room'] == null
            ? null
            : Text(
                studentString(slot['room']),
                style: const TextStyle(color: AppColors.textMuted),
              ),
      ),
    );
  }
}
