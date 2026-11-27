import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../presentation/widgets/teacher_bottom_navigation.dart';

class TeacherClassesScreen extends ConsumerWidget {
  const TeacherClassesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final classesAsync = ref.watch(teacherAssignedClassesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Classes', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(teacherAssignedClassesProvider);
        },
        child: classesAsync.when(
          data: (data) {
            List<dynamic> classes = [];
            if (data['classes'] is List) {
              classes = data['classes'] as List;
            } else if (data['data'] is List) {
              classes = data['data'] as List;
            } else if (data is List) {
              classes = data as dynamic;
            }

            if (classes.isEmpty) {
              return _buildEmptyState();
            }

            return ListView.separated(
              padding: const EdgeInsets.all(24),
              itemCount: classes.length,
              separatorBuilder: (context, index) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final clsMap = classes[index] as Map<String, dynamic>;
                final schoolClassObj = clsMap['class'] ?? clsMap['schoolClass'] ?? clsMap;

                final className = schoolClassObj['name'] as String? ?? 'Class';
                final division = schoolClassObj['division'] as String? ?? schoolClassObj['section'] as String? ?? '';
                final academicYear = schoolClassObj['academicYear'] as String? ?? '';
                final classId = schoolClassObj['id'] as String? ?? clsMap['id'] as String? ?? clsMap['classId'] as String? ?? '';

                final title = division.isNotEmpty ? '$className ($division)' : className;
                final subtitle = academicYear.isNotEmpty ? 'Academic Year: $academicYear' : 'Tap to view details & students';

                return Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      if (classId.isNotEmpty) {
                        context.push('/teacher/classes/$classId');
                      }
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.lightTeal,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.class_rounded, color: AppColors.teal),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  title,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  subtitle,
                                  style: const TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary),
                        ],
                      ),
                    ),
                  ),
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (error, _) => Center(child: Text('Failed to load classes: $error', style: const TextStyle(color: AppColors.error))),
        ),
      ),
      bottomNavigationBar: const TeacherBottomNavigation(currentIndex: 1),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.class_outlined, size: 64, color: AppColors.textSecondary.withValues(alpha: 0.5)),
          const SizedBox(height: 16),
          const Text(
            'No classes assigned',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
