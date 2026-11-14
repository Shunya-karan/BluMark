import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/teacher_providers.dart';

class ClassStudentsScreen extends ConsumerWidget {
  const ClassStudentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final classId = GoRouterState.of(context).pathParameters['classId'] ?? '';
    final studentsAsync = ref.watch(teacherClassStudentsProvider(classId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Enrolled Students', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: studentsAsync.when(
        data: (data) {
          List<dynamic> students = [];
          if (data['students'] is List) {
            students = data['students'] as List;
          } else if (data['data'] is List) {
            students = data['data'] as List;
          } else if (data is List) {
            students = data as dynamic;
          }

          if (students.isEmpty) {
            return const Center(
              child: Text(
                'No students found in this class.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 16),
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(24),
            itemCount: students.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final student = students[index] as Map<String, dynamic>;
              final fullName = student['fullName'] as String? ??
                  '${student['firstName'] ?? ''} ${student['lastName'] ?? ''}'.trim();
              final displayName = fullName.isEmpty ? 'Student' : fullName;

              final studentDetails = student['studentDetails'] as Map?;
              final studentNo = studentDetails?['studentNumber'] as String? ??
                  student['studentNumber'] as String? ??
                  student['rollNumber'] as String? ??
                  'N/A';

              final email = student['email'] as String? ?? '';
              final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'S';

              return ListTile(
                contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                leading: CircleAvatar(
                  radius: 22,
                  backgroundColor: AppColors.lightBlue,
                  child: Text(
                    initial,
                    style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ),
                title: Text(
                  displayName,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: AppColors.textPrimary),
                ),
                subtitle: Text(
                  'Student ID: $studentNo${email.isNotEmpty ? ' • $email' : ''}',
                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (error, _) => Center(child: Text('Failed to load students: $error', style: const TextStyle(color: AppColors.error))),
      ),
    );
  }
}
