import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../presentation/widgets/student_ui.dart';
import '../../providers/student_providers.dart';
import '../widgets/profile_header.dart';
import '../widgets/profile_information_card.dart';

class StudentProfileScreen extends ConsumerWidget {
  const StudentProfileScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => StudentAsyncPage(
    value: ref.watch(profileProvider),
    onRefresh: () async => ref.invalidate(profileProvider),
    builder: (data) {
      final institution = studentMap(data['institution']);
      final enrollments = studentMaps(data['enrollments']);
      final schoolClass = enrollments.isEmpty
          ? <String, dynamic>{}
          : studentMap(enrollments.first['schoolClass']);
      return StudentPage(
        title: 'Profile',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ProfileHeader(name: studentString(data['fullName'])),
            const SizedBox(height: 26),
            ProfileInformationCard(
              rows: {
                'Email': studentString(data['email']),
                'Phone': studentString(data['phone'], 'Not provided'),
                'Student number': studentString(
                  data['studentNumber'],
                  'Not available',
                ),
                'Institution': studentString(
                  institution['name'],
                  'Not available',
                ),
                'Class': studentString(schoolClass['name'], 'Not enrolled'),
                'Semester': studentString(
                  schoolClass['semester'],
                  'Not available',
                ),
              },
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.phone_android_rounded),
              title: const Text('Registered device'),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => context.push('/student/device'),
            ),
            ListTile(
              leading: const Icon(Icons.menu_book_rounded),
              title: const Text('My subjects'),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => context.push('/student/subjects'),
            ),
            ListTile(
              leading: const Icon(Icons.logout_rounded),
              title: const Text('Sign out'),
              onTap: () => ref.read(authProvider.notifier).logout(),
            ),
          ],
        ),
      );
    },
  );
}
