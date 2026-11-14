import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../presentation/widgets/student_ui.dart';

class NotificationCard extends StatelessWidget {
  const NotificationCard({super.key, required this.notification});
  final Map<String, dynamic> notification;
  @override
  Widget build(BuildContext context) {
    final unread = notification['readAt'] == null;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: unread ? AppColors.lightBlue : AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: unread
              ? AppColors.primary.withValues(alpha: .25)
              : AppColors.border,
        ),
      ),
      child: ListTile(
        leading: Icon(
          unread
              ? Icons.notifications_active_rounded
              : Icons.notifications_none_rounded,
          color: unread ? AppColors.primary : AppColors.textMuted,
        ),
        title: Text(
          studentString(notification['title']),
          style: TextStyle(
            fontWeight: unread ? FontWeight.w800 : FontWeight.w600,
          ),
        ),
        subtitle: Text(
          studentString(notification['body']),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Text(
          studentDate(notification['createdAt']),
          style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
        ),
      ),
    );
  }
}
