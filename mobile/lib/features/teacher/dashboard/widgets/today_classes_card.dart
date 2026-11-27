import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class TodayClassesCard extends StatelessWidget {
  const TodayClassesCard({super.key, required this.data});
  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    List<dynamic> classes = [];
    if (data['todaySchedule'] is List) {
      classes = data['todaySchedule'] as List;
    } else if (data['schedule'] is List) {
      classes = data['schedule'] as List;
    } else if (data['data'] is List) {
      classes = data['data'] as List;
    }

    if (classes.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: const Column(
          children: [
            Icon(Icons.event_busy_rounded, size: 48, color: AppColors.textMuted),
            SizedBox(height: 16),
            Text(
              'No classes scheduled for today',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: classes.map((c) => _ClassScheduleItem(item: c as Map)).toList(),
    );
  }
}

class _ClassScheduleItem extends StatelessWidget {
  const _ClassScheduleItem({required this.item});
  final Map item;

  @override
  Widget build(BuildContext context) {
    final classSubject = item['classSubject'] as Map?;
    final subjectObj = classSubject?['subject'] ?? item['subject'];
    final schoolClassObj = classSubject?['schoolClass'] ?? item['schoolClass'];

    final subjectName = subjectObj?['name'] as String? ?? 'Subject';
    final className = schoolClassObj?['name'] as String? ?? '';
    final division = schoolClassObj?['division'] as String? ?? schoolClassObj?['section'] as String? ?? '';
    final fullClassName = division.isNotEmpty ? '$className $division' : className;

    final startTime = _formatTime(item['startTime'] as String?);
    final endTime = _formatTime(item['endTime'] as String?);
    final room = item['room'] as String?;

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.lightTeal,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.schedule_rounded, color: AppColors.teal),
        ),
        title: Text(
          subjectName,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (fullClassName.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(fullClassName),
            ],
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.access_time_rounded, size: 14, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text(
                  '$startTime - $endTime',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ],
        ),
        trailing: room != null && room.isNotEmpty
            ? Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.lightBlue,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  room,
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              )
            : null,
      ),
    );
  }

  String _formatTime(String? timeStr) {
    if (timeStr == null || timeStr.isEmpty) return '';
    try {
      if (timeStr.contains('T')) {
        final dt = DateTime.parse(timeStr);
        final hour = dt.hour;
        final min = dt.minute.toString().padLeft(2, '0');
        final period = hour >= 12 ? 'PM' : 'AM';
        final h = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
        return '$h:$min $period';
      }
      final parts = timeStr.split(':');
      final hour = int.parse(parts[0]);
      final min = parts[1];
      final period = hour >= 12 ? 'PM' : 'AM';
      final h = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
      return '$h:$min $period';
    } catch (_) {
      return timeStr;
    }
  }
}
