import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../presentation/widgets/student_ui.dart';

class MaterialCard extends StatelessWidget {
  const MaterialCard({super.key, required this.material, this.onOpen});
  final Map<String, dynamic> material;
  final VoidCallback? onOpen;
  @override
  Widget build(BuildContext context) {
    final subject = studentMap(studentMap(material['classSubject'])['subject']);
    return Card(
      child: ListTile(
        onTap: onOpen,
        leading: const CircleAvatar(
          backgroundColor: AppColors.lightTeal,
          child: Icon(Icons.description_outlined, color: AppColors.teal),
        ),
        title: Text(
          studentString(material['title']),
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Text(
          '${studentString(subject['name'], 'Study material')} · ${studentString(material['fileType'], 'File')}',
        ),
        trailing: onOpen == null
            ? Text(
                studentDate(material['createdAt']),
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 11,
                ),
              )
            : const Icon(Icons.open_in_new_rounded, color: AppColors.teal),
      ),
    );
  }
}
