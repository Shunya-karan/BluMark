import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../presentation/widgets/student_ui.dart';
import '../../providers/student_providers.dart';
import '../widgets/subject_card.dart';

class SubjectsScreen extends ConsumerWidget {
  const SubjectsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => StudentAsyncPage(
    value: ref.watch(subjectsProvider),
    onRefresh: () async => ref.invalidate(subjectsProvider),
    builder: (data) {
      final subjects = studentMaps(data['subjects']);
      return StudentPage(
        title: 'My subjects',
        showBack: true,
        child: subjects.isEmpty
            ? const StudentEmptyCard(
                icon: Icons.menu_book_outlined,
                title: 'No subjects assigned',
                message: 'Your enrolled subjects will appear here.',
              )
            : Column(
                children: subjects
                    .map((subject) => SubjectCard(subject: subject))
                    .toList(),
              ),
      );
    },
  );
}
