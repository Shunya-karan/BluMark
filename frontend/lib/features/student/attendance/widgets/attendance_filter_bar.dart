import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../presentation/widgets/student_ui.dart';
import '../../providers/student_providers.dart';

class AttendanceFilterBar extends ConsumerWidget {
  const AttendanceFilterBar({super.key, required this.subjects});
  final List<Map<String, dynamic>> subjects;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(attendanceStatusFilterProvider);
    final subjectId = ref.watch(attendanceSubjectFilterProvider);
    final from = ref.watch(attendanceFromFilterProvider);
    final to = ref.watch(attendanceToFilterProvider);
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        DropdownButton<String?>(
          value: status,
          hint: const Text('Status'),
          items: const [
            DropdownMenuItem(value: null, child: Text('All statuses')),
            DropdownMenuItem(value: 'PRESENT', child: Text('Present')),
            DropdownMenuItem(value: 'ABSENT', child: Text('Absent')),
            DropdownMenuItem(value: 'LATE', child: Text('Late')),
            DropdownMenuItem(value: 'EXCUSED', child: Text('Excused')),
          ],
          onChanged: (value) =>
              ref.read(attendanceStatusFilterProvider.notifier).state = value,
        ),
        DropdownButton<String?>(
          value: subjectId,
          hint: const Text('Subject'),
          items: [
            const DropdownMenuItem(value: null, child: Text('All subjects')),
            ...subjects.map(
              (item) => DropdownMenuItem(
                value: studentString(item['subjectId']),
                child: Text(studentString(item['subjectName'])),
              ),
            ),
          ],
          onChanged: (value) =>
              ref.read(attendanceSubjectFilterProvider.notifier).state = value,
        ),
        OutlinedButton.icon(
          onPressed: () async {
            final today = DateTime.now();
            final range = await showDateRangePicker(
              context: context,
              firstDate: DateTime(today.year - 5),
              lastDate: DateTime(
                today.year,
                today.month,
                today.day,
                23,
                59,
                59,
                999,
              ),
              initialDateRange: from == null || to == null
                  ? null
                  : DateTimeRange(start: from, end: to),
            );
            if (range == null) return;
            ref.read(attendanceFromFilterProvider.notifier).state = range.start;
            ref.read(attendanceToFilterProvider.notifier).state = DateTime(
              range.end.year,
              range.end.month,
              range.end.day,
              23,
              59,
              59,
              999,
            );
          },
          icon: const Icon(Icons.date_range_outlined, size: 18),
          label: Text(
            from == null || to == null
                ? 'Date range'
                : '\${from.day}/\${from.month}/\${from.year} – \${to.day}/\${to.month}/\${to.year}',
          ),
        ),
        if (status != null || subjectId != null || from != null || to != null)
          TextButton(
            onPressed: () {
              ref.read(attendanceStatusFilterProvider.notifier).state = null;
              ref.read(attendanceSubjectFilterProvider.notifier).state = null;
              ref.read(attendanceFromFilterProvider.notifier).state = null;
              ref.read(attendanceToFilterProvider.notifier).state = null;
            },
            child: const Text('Clear filters'),
          ),
      ],
    );
  }
}
