import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../presentation/widgets/teacher_bottom_navigation.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../widgets/teacher_summary_card.dart';
import '../widgets/today_classes_card.dart';
import '../widgets/teacher_quick_actions.dart';

class TeacherDashboardScreen extends ConsumerWidget {
  const TeacherDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final summaryAsync = ref.watch(teacherDashboardSummaryProvider);
    final scheduleAsync = ref.watch(teacherTodayScheduleProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Teacher Dashboard',
            style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded),
            onPressed: () => context.push('/teacher/notifications'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(teacherDashboardSummaryProvider);
          ref.invalidate(teacherTodayScheduleProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome, ${user?.fullName ?? 'Teacher'}',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 24),
              const TeacherQuickActions(),
              const SizedBox(height: 24),
              summaryAsync.when(
                data: (data) => TeacherSummaryCard(data: data),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(child: Text('Failed to load summary')),
              ),
              const SizedBox(height: 24),
              const Text(
                'Today\'s Schedule',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              scheduleAsync.when(
                data: (data) => TodayClassesCard(data: data),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(child: Text('Failed to load schedule')),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const TeacherBottomNavigation(currentIndex: 0),
    );
  }
}
