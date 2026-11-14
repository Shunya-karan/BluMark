import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class TeacherSummaryCard extends StatelessWidget {
  const TeacherSummaryCard({super.key, required this.data});
  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final summary = (data['summary'] is Map<String, dynamic>)
        ? data['summary'] as Map<String, dynamic>
        : data;

    final classesCount = summary['totalClasses'] ?? summary['classesCount'] ?? 0;
    final subjectsCount = summary['totalSubjects'] ?? summary['subjectsCount'] ?? 0;
    final studentsCount = summary['totalStudents'] ?? summary['studentsCount'] ?? 0;

    return Card(
      elevation: 0,
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _StatItem(
              label: 'Classes',
              value: classesCount.toString(),
              icon: Icons.class_rounded,
              color: AppColors.primary,
            ),
            Container(width: 1, height: 40, color: AppColors.border),
            _StatItem(
              label: 'Subjects',
              value: subjectsCount.toString(),
              icon: Icons.book_rounded,
              color: AppColors.teal,
            ),
            Container(width: 1, height: 40, color: AppColors.border),
            _StatItem(
              label: 'Students',
              value: studentsCount.toString(),
              icon: Icons.people_rounded,
              color: AppColors.deepBlue,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}
