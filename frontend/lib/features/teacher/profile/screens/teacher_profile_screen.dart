import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../presentation/widgets/teacher_bottom_navigation.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class TeacherProfileScreen extends ConsumerWidget {
  const TeacherProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(teacherProfileProvider);
    final user = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Profile', style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: AppColors.primary),
            tooltip: 'Edit Profile',
            onPressed: () => context.push('/teacher/profile/edit'),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.error),
            tooltip: 'Sign Out',
            onPressed: () {
              ref.read(authProvider.notifier).logout();
            },
          ),
        ],
      ),
      body: profileAsync.when(
        data: (data) {
          final profile = data['profile'] is Map<String, dynamic>
              ? data['profile'] as Map<String, dynamic>
              : data;

          final teacherDetails = profile['teacherDetails'] as Map?;

          final String employeeId = profile['employeeId'] as String? ??
              teacherDetails?['employeeId'] as String? ??
              'N/A';

          final deptObj = profile['department'] ?? teacherDetails?['department'];
          final String departmentName = deptObj is Map
              ? (deptObj['name'] as String? ?? 'Department')
              : (deptObj is String ? deptObj : 'Department');

          final phone = profile['phone'] as String? ?? 'N/A';
          final email = profile['email'] as String? ?? user?.email ?? 'N/A';
          final fullName = profile['fullName'] as String? ?? user?.fullName ?? 'Teacher Name';
          final initial = fullName.isNotEmpty ? fullName[0].toUpperCase() : 'T';

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Center(
                child: CircleAvatar(
                  radius: 46,
                  backgroundColor: AppColors.lightTeal,
                  child: Text(
                    initial,
                    style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: AppColors.teal),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  fullName,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.lightTeal,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.teal.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    departmentName,
                    style: const TextStyle(color: AppColors.teal, fontWeight: FontWeight.w700, fontSize: 13),
                  ),
                ),
              ),
              const SizedBox(height: 36),

              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildProfileItem(icon: Icons.email_outlined, title: 'Email', value: email),
                      const Divider(height: 24),
                      _buildProfileItem(icon: Icons.phone_outlined, title: 'Phone', value: phone),
                      const Divider(height: 24),
                      _buildProfileItem(icon: Icons.badge_outlined, title: 'Employee ID', value: employeeId),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: () => context.push('/teacher/profile/edit'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  side: const BorderSide(color: AppColors.primary),
                ),
                icon: const Icon(Icons.edit_rounded, color: AppColors.primary),
                label: const Text('Edit Profile', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (error, _) => Center(child: Text('Failed to load profile: $error', style: const TextStyle(color: AppColors.error))),
      ),
      bottomNavigationBar: const TeacherBottomNavigation(currentIndex: 4),
    );
  }

  Widget _buildProfileItem({required IconData icon, required String title, required String value}) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.lightBlue,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: AppColors.primary, size: 20),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            ],
          ),
        ),
      ],
    );
  }
}
