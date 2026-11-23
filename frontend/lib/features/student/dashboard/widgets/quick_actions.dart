import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';

class QuickActions extends StatelessWidget {
  const QuickActions({super.key, required this.onTab});
  final ValueChanged<int> onTab;
  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 10,
    runSpacing: 10,
    children: [
      _Action(
        icon: Icons.fact_check_rounded,
        label: 'Attendance',
        color: AppColors.primary,
        onTap: () => onTab(1),
      ),
      _Action(
        icon: Icons.calendar_month_rounded,
        label: 'Timetable',
        color: AppColors.teal,
        onTap: () => onTab(3),
      ),
      _Action(
        icon: Icons.folder_rounded,
        label: 'Materials',
        color: AppColors.cyan,
        onTap: () => context.push('/student/materials'),
      ),
      _Action(
        icon: Icons.menu_book_rounded,
        label: 'Subjects',
        color: AppColors.deepBlue,
        onTap: () => context.push('/student/subjects'),
      ),
      _Action(
        icon: Icons.notifications_rounded,
        label: 'Alerts',
        color: AppColors.warning,
        onTap: () => context.push('/student/notifications'),
      ),
    ],
  );
}

class _Action extends StatelessWidget {
  const _Action({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 102,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 7),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
