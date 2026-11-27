import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../../../core/theme/app_colors.dart';

final teacherNotificationsProvider = FutureProvider.autoDispose((ref) async {
  final storage = SecureStorageService();
  final token = await storage.getAccessToken();
  final apiClient = ApiClient();
  final response = await apiClient.get(
    '/api/v1/teacher/notifications',
    accessToken: token,
  );
  return response;
});

class TeacherNotificationsScreen extends ConsumerWidget {
  const TeacherNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(teacherNotificationsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(teacherNotificationsProvider);
        },
        child: notificationsAsync.when(
          data: (safeData) {
            final notifications = safeData['notifications'] as List<dynamic>? ?? [];
            if (notifications.isEmpty) {
              return _buildEmptyState();
            }
            return ListView.separated(
              padding: const EdgeInsets.all(24),
              itemCount: notifications.length,
              separatorBuilder: (context, index) => const Divider(height: 32),
              itemBuilder: (context, index) {
                final notif = notifications[index];
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.lightBlue,
                    child: Icon(Icons.notifications_active_rounded, color: AppColors.primary),
                  ),
                  title: Text(notif['title'] ?? 'Notification', style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(notif['message'] ?? ''),
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _buildEmptyState(), // Fallback if endpoint is missing
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_off_outlined, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text('No new notifications', style: TextStyle(fontSize: 18, color: Colors.grey)),
        ],
      ),
    );
  }
}
