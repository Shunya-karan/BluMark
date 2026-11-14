import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';

Map<String, dynamic> studentMap(Object? value) =>
    value is Map ? Map<String, dynamic>.from(value) : {};
List<Map<String, dynamic>> studentMaps(Object? value) => value is List
    ? value
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList()
    : [];
String studentString(Object? value, [String fallback = '']) =>
    value?.toString() ?? fallback;
int studentInt(Object? value) =>
    value is num ? value.toInt() : int.tryParse(studentString(value)) ?? 0;
String studentDate(Object? value) {
  final date = DateTime.tryParse(studentString(value));
  return date == null
      ? '—'
      : '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
}

String studentTime(Object? value) {
  final date = DateTime.tryParse(studentString(value));
  if (date == null) return '—';
  final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
  return '$hour:${date.minute.toString().padLeft(2, '0')} ${date.hour < 12 ? 'AM' : 'PM'}';
}

class StudentPage extends StatelessWidget {
  const StudentPage({
    super.key,
    required this.title,
    required this.child,
    this.actions = const [],
    this.showBack = false,
  });
  final String title;
  final Widget child;
  final List<Widget> actions;
  final bool showBack;
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            leading: showBack
                ? IconButton(
                    icon: const Icon(Icons.arrow_back_rounded),
                    onPressed: Navigator.of(context).pop,
                  )
                : null,
            title: Text(
              title,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w800,
              ),
            ),
            actions: actions,
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
            sliver: SliverToBoxAdapter(child: child),
          ),
        ],
      ),
    ),
  );
}

class StudentAsyncPage extends StatelessWidget {
  const StudentAsyncPage({
    super.key,
    required this.value,
    required this.onRefresh,
    required this.builder,
  });
  final AsyncValue<Map<String, dynamic>> value;
  final Future<void> Function() onRefresh;
  final Widget Function(Map<String, dynamic>) builder;
  @override
  Widget build(BuildContext context) => value.when(
    loading: () =>
        const Scaffold(body: Center(child: CircularProgressIndicator())),
    error: (error, stackTrace) =>
        Scaffold(body: StudentErrorRetry(onRetry: onRefresh)),
    data: (data) =>
        RefreshIndicator(onRefresh: onRefresh, child: builder(data)),
  );
}

class StudentEmptyCard extends StatelessWidget {
  const StudentEmptyCard({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
  });
  final IconData icon;
  final String title, message;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: Column(
          children: [
            Icon(icon, size: 35, color: AppColors.teal),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    ),
  );
}

class StudentErrorRetry extends StatelessWidget {
  const StudentErrorRetry({super.key, required this.onRetry});
  final Future<void> Function() onRetry;
  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(
          Icons.cloud_off_rounded,
          color: AppColors.textMuted,
          size: 44,
        ),
        const SizedBox(height: 12),
        const Text(
          'We couldn’t load this information.',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        TextButton(onPressed: onRetry, child: const Text('Try again')),
      ],
    ),
  );
}

class StudentSectionTitle extends StatelessWidget {
  const StudentSectionTitle({
    super.key,
    required this.title,
    this.action,
    this.onTap,
  });
  final String title;
  final String? action;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(
          title,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 19,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      if (action != null) TextButton(onPressed: onTap, child: Text(action!)),
    ],
  );
}
