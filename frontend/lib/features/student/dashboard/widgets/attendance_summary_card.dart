import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../presentation/widgets/student_ui.dart';

class AttendanceSummaryCard extends StatelessWidget {
  const AttendanceSummaryCard({super.key, required this.attendance});
  final Map<String, dynamic> attendance;
  @override
  Widget build(BuildContext context) {
    final percent = (attendance['attendancePercentage'] as num? ?? 0)
        .toDouble();
    final color = percent >= 75
        ? AppColors.success
        : percent >= 60
        ? AppColors.warning
        : AppColors.error;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          SizedBox(
            height: 82,
            width: 82,
            child: Stack(
              fit: StackFit.expand,
              children: [
                CircularProgressIndicator(
                  value: percent / 100,
                  strokeWidth: 8,
                  color: color,
                  backgroundColor: color.withValues(alpha: .12),
                ),
                Center(
                  child: Text(
                    '${percent.toStringAsFixed(0)}%',
                    style: TextStyle(color: color, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Attendance overview',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${studentInt(attendance['presentSessions'])} attended · ${studentInt(attendance['absentSessions'])} missed',
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 4),
                Text(
                  '${studentInt(attendance['totalSessions'])} completed classes',
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
