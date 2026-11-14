import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/teacher_providers.dart';

class ClassDetailsScreen extends ConsumerWidget {
  const ClassDetailsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final classId = GoRouterState.of(context).pathParameters['classId'] ?? '';
    final detailsAsync = ref.watch(teacherClassDetailsProvider(classId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Class Details', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: detailsAsync.when(
        data: (data) {
          final cls = (data['class'] is Map<String, dynamic>)
              ? data['class'] as Map<String, dynamic>
              : (data['data'] is Map<String, dynamic> ? data['data'] as Map<String, dynamic> : data);

          final className = cls['name'] as String? ?? 'Class';
          final division = cls['division'] as String? ?? cls['section'] as String? ?? '';
          final academicYear = cls['academicYear'] as String? ?? '';
          final semester = cls['semester']?.toString() ?? '';
          final departmentObj = cls['department'] as Map?;
          final departmentName = departmentObj?['name'] as String? ?? '';

          final fullTitle = division.isNotEmpty ? '$className ($division)' : className;

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fullTitle,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (academicYear.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          'Academic Year: $academicYear${semester.isNotEmpty ? ' • Semester $semester' : ''}',
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                      if (departmentName.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          'Department: $departmentName',
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.teal,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: AppColors.border),
                ),
                tileColor: AppColors.surface,
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.lightBlue,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.people_rounded, color: AppColors.primary),
                ),
                title: const Text('View Enrolled Students', style: TextStyle(fontWeight: FontWeight.w600)),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () {
                  context.push('/teacher/classes/$classId/students');
                },
              ),
              const SizedBox(height: 12),
              ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: AppColors.border),
                ),
                tileColor: AppColors.surface,
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.lightTeal,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.history_rounded, color: AppColors.teal),
                ),
                title: const Text('Attendance History', style: TextStyle(fontWeight: FontWeight.w600)),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () {
                  context.push('/teacher/attendance/history');
                },
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (error, _) => Center(child: Text('Failed to load details: $error', style: const TextStyle(color: AppColors.error))),
      ),
    );
  }
}
