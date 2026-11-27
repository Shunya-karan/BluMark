import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../presentation/widgets/student_ui.dart';
import '../../providers/student_providers.dart';
import '../widgets/notification_card.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => StudentAsyncPage(
    value: ref.watch(notificationsProvider),
    onRefresh: () async => ref.invalidate(notificationsProvider),
    builder: (data) {
      final items = studentMaps(data['notifications']);
      return StudentPage(
        title: 'Notifications',
        showBack: true,
        actions: [
          TextButton(
            onPressed: items.isEmpty
                ? null
                : () async {
                    await ref
                        .read(studentRepositoryProvider)
                        .readAllNotifications();
                    ref.invalidate(notificationsProvider);
                  },
            child: const Text('Mark all read'),
          ),
        ],
        child: items.isEmpty
            ? const StudentEmptyCard(
                icon: Icons.notifications_none_rounded,
                title: 'You’re all caught up',
                message: 'There are no notifications to show.',
              )
            : Column(
                children: items
                    .map(
                      (item) => InkWell(
                        onTap: () async {
                          if (item['readAt'] == null) {
                            await ref
                                .read(studentRepositoryProvider)
                                .readNotification(studentString(item['id']));
                            ref.invalidate(notificationsProvider);
                          }
                        },
                        child: NotificationCard(notification: item),
                      ),
                    )
                    .toList(),
              ),
      );
    },
  );
}
