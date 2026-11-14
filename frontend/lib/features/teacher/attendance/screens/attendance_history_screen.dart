import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/teacher_providers.dart';

class AttendanceHistoryScreen extends ConsumerWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(teacherAttendanceHistoryProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Attendance History', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(teacherAttendanceHistoryProvider);
        },
        child: historyAsync.when(
          data: (data) {
            List<dynamic> history = [];
            if (data['sessions'] is List) {
              history = data['sessions'] as List;
            } else if (data['history'] is List) {
              history = data['history'] as List;
            } else if (data['data'] is List) {
              history = data['data'] as List;
            } else if (data is List) {
              history = data as dynamic;
            }

            if (history.isEmpty) {
              return const Center(
                child: Text(
                  'No attendance history found.',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 16),
                ),
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(24),
              itemCount: history.length,
              separatorBuilder: (context, index) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final session = history[index] as Map<String, dynamic>;
                final sessionId = session['id'] as String? ?? session['_id'] as String? ?? '';
                final dateStr = _formatDate(session['startsAt'] as String? ?? session['createdAt'] as String? ?? '');

                final classSubject = session['classSubject'] as Map?;
                final subjectObj = classSubject?['subject'] ?? session['subject'];
                final schoolClassObj = classSubject?['schoolClass'] ?? session['schoolClass'] ?? session['class'];

                final subject = subjectObj?['name'] as String? ?? 'Subject';
                final className = schoolClassObj?['name'] as String? ?? 'Class';
                final division = schoolClassObj?['division'] as String? ?? schoolClassObj?['section'] as String? ?? '';
                final fullClassName = division.isNotEmpty ? '$className ($division)' : className;

                final countObj = session['_count'] as Map?;
                final recordsCount = countObj?['records'] as int? ?? session['presentCount'] as int? ?? 0;
                final status = session['status'] as String? ?? 'COMPLETED';

                return Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      if (sessionId.isNotEmpty) {
                        context.push('/teacher/attendance/sessions/$sessionId');
                      }
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  '$fullClassName • $subject',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: status == 'ACTIVE' ? AppColors.lightTeal : AppColors.lightBlue,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  status,
                                  style: TextStyle(color: status == 'ACTIVE' ? AppColors.teal : AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                dateStr,
                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                              ),
                              Row(
                                children: [
                                  Text(
                                    '$recordsCount record(s)',
                                    style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 13),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.textSecondary),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (error, _) => Center(child: Text('Failed to load history: $error', style: const TextStyle(color: AppColors.error))),
        ),
      ),
    );
  }

  String _formatDate(String isoStr) {
    if (isoStr.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoStr).toLocal();
      return '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return isoStr;
    }
  }
}
