import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../presentation/widgets/student_ui.dart';

class SubjectCard extends StatelessWidget {
  const SubjectCard({super.key, required this.subject});
  final Map<String, dynamic> subject;
  @override
  Widget build(BuildContext context) {
    final data = studentMap(subject['subject']);
    final teacher = studentMap(subject['teacher']);
    final schoolClass = studentMap(subject['schoolClass']);
    return Card(
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: AppColors.lightBlue,
          child: Icon(Icons.menu_book_rounded, color: AppColors.primary),
        ),
        title: Text(
          studentString(data['name']),
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Text(
          '${studentString(data['code'])} · ${studentString(teacher['fullName'], 'Teacher unavailable')}',
        ),
        trailing: Text(
          studentString(schoolClass['name']),
          style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
        ),
      ),
    );
  }
}
