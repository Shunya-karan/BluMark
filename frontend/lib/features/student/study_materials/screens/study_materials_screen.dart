import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../presentation/widgets/student_ui.dart';
import '../../providers/student_providers.dart';
import '../widgets/material_card.dart';
import '../widgets/material_search_bar.dart';

class StudyMaterialsScreen extends ConsumerWidget {
  const StudyMaterialsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = ref.watch(materialsQueryProvider);
    return StudentAsyncPage(
      value: ref.watch(materialsProvider),
      onRefresh: () async => ref.invalidate(materialsProvider),
      builder: (data) {
        final items = studentMaps(data['materials']);
        return StudentPage(
          title: 'Study materials',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MaterialSearchBar(
                onChanged: (value) =>
                    ref.read(materialsQueryProvider.notifier).state = value,
              ),
              const SizedBox(height: 20),
              if (items.isEmpty)
                StudentEmptyCard(
                  icon: Icons.folder_open_outlined,
                  title: query.isEmpty
                      ? 'No study materials available'
                      : 'No matching materials',
                  message: query.isEmpty
                      ? 'Materials shared with your class will appear here.'
                      : 'Try a different search term.',
                )
              else
                ...items.map(
                  (item) => MaterialCard(
                    material: item,
                    onOpen: () => _openMaterial(context, ref, item),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _openMaterial(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> material,
  ) async {
    try {
      final data = await ref
          .read(studentRepositoryProvider)
          .materialDownload(studentString(material['id']));
      final url = Uri.tryParse(studentString(data['downloadUrl']));
      if (url == null ||
          !await launchUrl(url, mode: LaunchMode.externalApplication)) {
        throw StateError('The material link could not be opened.');
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Unable to open this material. Please try again.'),
          ),
        );
      }
    }
  }
}
