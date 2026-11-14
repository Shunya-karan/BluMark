import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/teacher_providers.dart';

class CreateAttendanceSessionScreen extends ConsumerStatefulWidget {
  const CreateAttendanceSessionScreen({super.key});

  @override
  ConsumerState<CreateAttendanceSessionScreen> createState() => _CreateAttendanceSessionScreenState();
}

class _CreateAttendanceSessionScreenState extends ConsumerState<CreateAttendanceSessionScreen> {
  String? _selectedClassSubjectId;
  int _durationMinutes = 30;
  bool _isLoading = false;

  Future<void> _createSession() async {
    if (_selectedClassSubjectId == null || _isLoading) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a class and subject')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final repository = ref.read(teacherRepositoryProvider);
      final response = await repository.createAttendanceSession({
        'classSubjectId': _selectedClassSubjectId,
        'durationMinutes': _durationMinutes,
      });

      if (mounted) {
        final sessionId = response['id'] ?? response['session']?['id'] ?? response['_id'];
        if (sessionId != null) {
          context.pushReplacement('/teacher/attendance/active/$sessionId');
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Session created, but ID was not returned')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString().replaceFirst('ApiException: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final subjectsAsync = ref.watch(teacherSubjectsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Start Attendance Session', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: subjectsAsync.when(
        data: (data) {
          List<dynamic> subjectsList = [];
          if (data['data'] is List) {
            subjectsList = data['data'] as List;
          } else if (data['subjects'] is List) {
            subjectsList = data['subjects'] as List;
          } else if (data is List) {
            subjectsList = data as dynamic;
          }

          if (subjectsList.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.school_outlined, size: 64, color: AppColors.textMuted),
                    const SizedBox(height: 16),
                    const Text(
                      'No assigned subjects or classes found.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 16, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton(
                      onPressed: () => ref.invalidate(teacherSubjectsProvider),
                      child: const Text('Refresh'),
                    ),
                  ],
                ),
              ),
            );
          }

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text(
                'Select Class & Subject',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(12),
                  color: AppColors.surface,
                ),
                child: DropdownButton<String>(
                  isExpanded: true,
                  underline: const SizedBox(),
                  hint: const Text('Choose a class / subject'),
                  value: _selectedClassSubjectId,
                  items: subjectsList.map<DropdownMenuItem<String>>((item) {
                    final itemMap = item as Map<String, dynamic>;
                    final schoolClass = itemMap['schoolClass'] as Map?;
                    final subject = itemMap['subject'] as Map?;

                    final className = schoolClass?['name'] as String? ?? 'Class';
                    final division = schoolClass?['division'] as String? ?? schoolClass?['section'] as String? ?? '';
                    final subjectName = subject?['name'] as String? ?? 'Subject';
                    final subjectCode = subject?['code'] as String? ?? '';

                    final classTitle = division.isNotEmpty ? '$className ($division)' : className;
                    final subjectTitle = subjectCode.isNotEmpty ? '$subjectName ($subjectCode)' : subjectName;
                    final fullLabel = '$classTitle • $subjectTitle';

                    final id = itemMap['id'] as String? ?? itemMap['_id'] as String? ?? '';

                    return DropdownMenuItem<String>(
                      value: id,
                      child: Text(
                        fullLabel,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  }).toList(),
                  onChanged: _isLoading
                      ? null
                      : (val) {
                          setState(() => _selectedClassSubjectId = val);
                        },
                ),
              ),
              const SizedBox(height: 28),
              const Text(
                'Session Duration',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              Slider(
                value: _durationMinutes.toDouble(),
                min: 5,
                max: 120,
                divisions: 23,
                activeColor: AppColors.primary,
                label: '$_durationMinutes mins',
                onChanged: _isLoading
                    ? null
                    : (val) {
                        setState(() => _durationMinutes = val.toInt());
                      },
              ),
              Text(
                '$_durationMinutes Minutes',
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary, fontSize: 16),
              ),
              const SizedBox(height: 48),
              ElevatedButton(
                onPressed: (_selectedClassSubjectId == null || _isLoading) ? null : _createSession,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 54),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _isLoading
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          ),
                          SizedBox(width: 12),
                          Text('Starting Session...', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ],
                      )
                    : const Text('Start Attendance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Failed to load subjects: $error', style: const TextStyle(color: AppColors.error)),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => ref.invalidate(teacherSubjectsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
