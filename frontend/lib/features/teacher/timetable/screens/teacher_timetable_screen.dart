import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../presentation/widgets/teacher_bottom_navigation.dart';

class TeacherTimetableScreen extends ConsumerWidget {
  const TeacherTimetableScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timetableAsync = ref.watch(teacherTimetableProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Timetable', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(teacherTimetableProvider);
        },
        child: timetableAsync.when(
          data: (data) {
            final Map<String, dynamic> days = (data['timetable'] is Map<String, dynamic>)
                ? data['timetable'] as Map<String, dynamic>
                : (data['data'] is Map<String, dynamic>
                    ? data['data'] as Map<String, dynamic>
                    : data);

            if (days.isEmpty) {
              return const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Text(
                    'No timetable slots scheduled.',
                    style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
                  ),
                ),
              );
            }

            return ListView(
              padding: const EdgeInsets.all(20),
              children: days.entries.map((entry) {
                final dayName = entry.key;
                final classes = entry.value as List<dynamic>? ?? [];

                if (classes.isEmpty) return const SizedBox.shrink();

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 4, bottom: 8),
                      child: Text(
                        dayName.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    ...classes.map((cls) {
                      final itemMap = cls as Map<String, dynamic>;
                      final classSubject = itemMap['classSubject'] as Map?;
                      final subjectObj = classSubject?['subject'] ?? itemMap['subject'];
                      final schoolClassObj = classSubject?['schoolClass'] ?? itemMap['schoolClass'] ?? itemMap['class'];

                      final subjectName = subjectObj?['name'] as String? ?? 'Subject';
                      final className = schoolClassObj?['name'] as String? ?? 'Class';
                      final division = schoolClassObj?['division'] as String? ?? schoolClassObj?['section'] as String? ?? '';
                      final fullClassName = division.isNotEmpty ? '$className ($division)' : className;

                      final startTimeStr = _formatTime(itemMap['startTime']);
                      final endTimeStr = _formatTime(itemMap['endTime']);
                      final room = itemMap['room'] as String?;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: AppColors.border),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: AppColors.lightTeal,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Column(
                                  children: [
                                    Text(
                                      startTimeStr,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 12,
                                        color: AppColors.teal,
                                      ),
                                    ),
                                    const Text(
                                      'to',
                                      style: TextStyle(fontSize: 10, color: AppColors.textSecondary),
                                    ),
                                    Text(
                                      endTimeStr,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 12,
                                        color: AppColors.teal,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      subjectName,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                        color: AppColors.textPrimary,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Class: $fullClassName',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: AppColors.textSecondary,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              if (room != null && room.isNotEmpty) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.lightBlue,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    room,
                                    style: const TextStyle(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 16),
                  ],
                );
              }).toList(),
            );
          },
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (error, _) => Center(
            child: Text('Failed to load timetable: $error', style: const TextStyle(color: AppColors.error)),
          ),
        ),
      ),
      bottomNavigationBar: const TeacherBottomNavigation(currentIndex: 3),
    );
  }

  String _formatTime(dynamic timeVal) {
    if (timeVal == null) return '';
    final str = timeVal.toString().trim();
    if (str.isEmpty) return '';

    try {
      int hour = 0;
      int minute = 0;

      if (str.contains('T')) {
        final dt = DateTime.parse(str).toLocal();
        hour = dt.hour;
        minute = dt.minute;
      } else if (str.contains(':')) {
        final parts = str.split(':');
        hour = int.parse(parts[0]);
        minute = int.parse(parts[1]);
      } else {
        return str;
      }

      final period = hour >= 12 ? 'PM' : 'AM';
      final h = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
      final m = minute.toString().padLeft(2, '0');
      return '$h:$m $period';
    } catch (_) {
      return str;
    }
  }
}
