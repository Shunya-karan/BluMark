import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/teacher_providers.dart';

class TeacherMaterialsScreen extends ConsumerWidget {
  const TeacherMaterialsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final materialsAsync = ref.watch(teacherStudyMaterialsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Study Materials', style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.upload_rounded),
            onPressed: () => context.push('/teacher/materials/upload'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(teacherStudyMaterialsProvider);
        },
        child: materialsAsync.when(
          data: (data) {
            final materials = data['materials'] as List<dynamic>? ?? [];
            if (materials.isEmpty) {
              return const Center(child: Text('No study materials found.'));
            }

            return ListView.separated(
              padding: const EdgeInsets.all(24),
              itemCount: materials.length,
              separatorBuilder: (context, index) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final material = materials[index];
                final title = material['title'] ?? 'Document';
                final description = material['description'] ?? '';
                final subject = material['subject']?['name'] ?? '';

                return Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: ListTile(
                    leading: const Icon(Icons.picture_as_pdf_rounded, color: AppColors.error, size: 36),
                    title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('$subject\n$description'),
                    isThreeLine: description.isNotEmpty,
                    trailing: const Icon(Icons.download_rounded, color: AppColors.primary),
                  ),
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Text('Error loading materials: $error')),
        ),
      ),
    );
  }
}
