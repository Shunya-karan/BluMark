import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';

class TeacherBottomNavigation extends StatelessWidget {
  const TeacherBottomNavigation({super.key, required this.currentIndex});

  final int currentIndex;

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: currentIndex,
      onDestinationSelected: (index) {
        if (index == currentIndex) return;
        switch (index) {
          case 0:
            context.go('/teacher');
            break;
          case 1:
            context.go('/teacher/classes');
            break;
          case 2:
            context.go('/teacher/attendance');
            break;
          case 3:
            context.go('/teacher/timetable');
            break;
          case 4:
            context.go('/teacher/profile');
            break;
        }
      },
      backgroundColor: AppColors.surface,
      indicatorColor: AppColors.lightTeal,
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.dashboard_outlined),
          selectedIcon: Icon(Icons.dashboard_rounded, color: AppColors.teal),
          label: 'Home',
        ),
        NavigationDestination(
          icon: Icon(Icons.class_outlined),
          selectedIcon: Icon(Icons.class_rounded, color: AppColors.teal),
          label: 'Classes',
        ),
        NavigationDestination(
          icon: Icon(Icons.how_to_reg_outlined),
          selectedIcon: Icon(Icons.how_to_reg_rounded, color: AppColors.teal),
          label: 'Attendance',
        ),
        NavigationDestination(
          icon: Icon(Icons.calendar_month_outlined),
          selectedIcon: Icon(Icons.calendar_month_rounded, color: AppColors.teal),
          label: 'Timetable',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline_rounded),
          selectedIcon: Icon(Icons.person_rounded, color: AppColors.teal),
          label: 'Profile',
        ),
      ],
    );
  }
}
