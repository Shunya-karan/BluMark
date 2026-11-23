import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../presentation/widgets/student_ui.dart';
import '../../providers/student_providers.dart';
import '../widgets/attendance_summary_card.dart';
import '../widgets/dashboard_header.dart';
import '../widgets/quick_actions.dart';
import '../widgets/recent_notifications_card.dart';
import '../widgets/today_timetable_card.dart';

class StudentDashboardScreen extends ConsumerWidget {
  const StudentDashboardScreen({super.key, required this.onTab});
  final ValueChanged<int> onTab;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    return StudentAsyncPage(
      value: ref.watch(studentDashboardProvider),
      onRefresh: () async => ref.invalidate(studentDashboardProvider),
      builder: (data) {
        final profile = studentMap(data['profile']);
        final notifications = studentMaps(data['latestNotifications']);
        final upcoming = studentMaps(data['upcomingTimetable']);
        return StudentPage(
          title: 'Blu-Mark',
          actions: [
            IconButton(
              onPressed: () => context.push('/student/notifications'),
              icon: Badge(
                isLabelVisible: notifications.any(
                  (item) => item['readAt'] == null,
                ),
                child: const Icon(Icons.notifications_outlined),
              ),
            ),
          ],
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DashboardHeader(
                name: studentString(
                  profile['fullName'],
                  user?.fullName ?? 'Student',
                ),
              ),
              const SizedBox(height: 20),
              AttendanceSummaryCard(attendance: studentMap(data['attendance'])),
              const SizedBox(height: 24),
              StudentSectionTitle(
                title: 'Today & upcoming',
                action: 'Full timetable',
                onTap: () => onTab(3),
              ),
              if (upcoming.isEmpty)
                const StudentEmptyCard(
                  icon: Icons.event_available_outlined,
                  title: 'No classes scheduled',
                  message:
                      'There are no upcoming timetable slots assigned to you.',
                )
              else
                ...upcoming
                    .take(3)
                    .map((item) => TodayTimetableCard(slot: item)),
              const SizedBox(height: 24),
              const StudentSectionTitle(title: 'Quick actions'),
              QuickActions(onTab: onTab),
              const SizedBox(height: 24),
              StudentSectionTitle(
                title: 'Recent notifications',
                action: 'View all',
                onTap: () => context.push('/student/notifications'),
              ),
              if (notifications.isEmpty)
                const StudentEmptyCard(
                  icon: Icons.notifications_none_rounded,
                  title: 'You’re all caught up',
                  message: 'New institution updates will appear here.',
                )
              else
                ...notifications
                    .take(3)
                    .map((item) => RecentNotificationsCard(notification: item)),
            ],
          ),
        );
      },
    );
  }
}
