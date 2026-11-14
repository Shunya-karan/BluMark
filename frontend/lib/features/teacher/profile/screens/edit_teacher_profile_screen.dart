import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class EditTeacherProfileScreen extends ConsumerStatefulWidget {
  const EditTeacherProfileScreen({super.key});

  @override
  ConsumerState<EditTeacherProfileScreen> createState() =>
      _EditTeacherProfileScreenState();
}

class _EditTeacherProfileScreenState
    extends ConsumerState<EditTeacherProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _phoneController = TextEditingController();

    // Pre-fill initial data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(authProvider).user;
      final profileAsync = ref.read(teacherProfileProvider);

      profileAsync.whenData((data) {
        final profile = data['profile'] is Map<String, dynamic>
            ? data['profile'] as Map<String, dynamic>
            : data;

        _nameController.text =
            profile['fullName'] as String? ?? user?.fullName ?? '';
        _phoneController.text = profile['phone'] as String? ?? '';
        setState(() {});
      });
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate() || _isLoading) return;

    setState(() => _isLoading = true);

    try {
      final repository = ref.read(teacherRepositoryProvider);
      await repository.updateProfile(
        fullName: _nameController.text.trim(),
        phone: _phoneController.text.trim().isNotEmpty
            ? _phoneController.text.trim()
            : null,
      );

      // Refresh profile data across the app
      ref.invalidate(teacherProfileProvider);

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully')),
        );
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
    final profileAsync = ref.watch(teacherProfileProvider);
    final user = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Edit Profile',
            style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: profileAsync.when(
        data: (data) {
          final profile = data['profile'] is Map<String, dynamic>
              ? data['profile'] as Map<String, dynamic>
              : data;
          final teacherDetails = profile['teacherDetails'] as Map?;

          final String employeeId = profile['employeeId'] as String? ??
              teacherDetails?['employeeId'] as String? ??
              'N/A';

          final deptObj =
              profile['department'] ?? teacherDetails?['department'];
          final String departmentName = deptObj is Map
              ? (deptObj['name'] as String? ?? 'Department')
              : (deptObj is String ? deptObj : 'Department');

          final email = profile['email'] as String? ?? user?.email ?? 'N/A';

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Personal Information',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _nameController,
                    enabled: !_isLoading,
                    decoration: const InputDecoration(
                      labelText: 'Full Name',
                      prefixIcon: Icon(Icons.person_outline_rounded),
                    ),
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) {
                        return 'Full name cannot be empty';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _phoneController,
                    enabled: !_isLoading,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone Number',
                      prefixIcon: Icon(Icons.phone_outlined),
                      hintText: '+1234567890',
                    ),
                  ),
                  const SizedBox(height: 32),
                  const Text(
                    'Read-Only Academic Information',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 12),
                  _ReadOnlyField(
                      label: 'Email Address',
                      value: email,
                      icon: Icons.email_outlined),
                  const SizedBox(height: 12),
                  _ReadOnlyField(
                      label: 'Employee ID',
                      value: employeeId,
                      icon: Icons.badge_outlined),
                  const SizedBox(height: 12),
                  _ReadOnlyField(
                      label: 'Department',
                      value: departmentName,
                      icon: Icons.domain_outlined),
                  const SizedBox(height: 48),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _saveProfile,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 54),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2.5),
                          )
                        : const Text('Save Profile Changes',
                            style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          );
        },
        loading: () =>
            const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (error, _) =>
            Center(child: Text('Failed to load profile: $error')),
      ),
    );
  }
}

class _ReadOnlyField extends StatelessWidget {
  const _ReadOnlyField({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.secondarySurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.textMuted, size: 20),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textMuted)),
                const SizedBox(height: 2),
                Text(value,
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary)),
              ],
            ),
          ),
          const Icon(Icons.lock_outline_rounded,
              size: 16, color: AppColors.textMuted),
        ],
      ),
    );
  }
}
