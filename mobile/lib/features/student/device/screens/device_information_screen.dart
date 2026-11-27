import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../presentation/widgets/student_ui.dart';
import '../../providers/student_providers.dart';

class DeviceInformationScreen extends ConsumerWidget {
  const DeviceInformationScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => StudentAsyncPage(
    value: ref.watch(deviceProvider),
    onRefresh: () async => ref.invalidate(deviceProvider),
    builder: (data) {
      final active = studentMap(data['activeDevice']);
      final pending = studentMap(data['pendingDevice']);
      final device = active.isNotEmpty ? active : pending;
      return StudentPage(
        title: 'Device information',
        showBack: true,
        child: device.isEmpty
            ? const StudentEmptyCard(
                icon: Icons.phone_android_outlined,
                title: 'No device registered',
                message:
                    'Device registration requires the secure institution enrollment workflow.',
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.phone_android_rounded,
                    color: AppColors.teal,
                    size: 42,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    studentString(device['status']),
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    child: ListTile(
                      title: const Text('Device identifier'),
                      subtitle: Text(
                        _mask(studentString(device['deviceIdentifier'])),
                      ),
                      trailing: Text(studentDate(device['registeredAt'])),
                    ),
                  ),
                ],
              ),
      );
    },
  );
}

String _mask(String value) => value.length < 6
    ? '••••'
    : '${value.substring(0, 3)}••••${value.substring(value.length - 3)}';
