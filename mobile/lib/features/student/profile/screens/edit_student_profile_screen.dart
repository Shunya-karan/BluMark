import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../presentation/widgets/student_ui.dart';
import '../../providers/student_providers.dart';

class EditStudentProfileScreen extends ConsumerStatefulWidget {
  const EditStudentProfileScreen({super.key});

  @override
  ConsumerState<EditStudentProfileScreen> createState() =>
      _EditStudentProfileScreenState();
}

class _EditStudentProfileScreenState
    extends ConsumerState<EditStudentProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _phoneController = TextEditingController();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(authProvider).user;
      final profileAsync = ref.read(profileProvider);

      profileAsync.whenData((data) {
        _nameController.text =
            data['fullName'] as String? ?? user?.fullName ?? '';
        _phoneController.text = data['phone'] as String? ?? '';
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
      final repository = ref.read(studentRepositoryProvider);
      await repository.updateProfile(
        fullName: _nameController.text.trim(),
        phone: _phoneController.text.trim().isNotEmpty
            ? _phoneController.text.trim()
            : null,
      );

      ref.invalidate(profileProvider);

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
    final profileAsync = ref.watch(profileProvider);
    final user = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Edit Student Profile',
            style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: profileAsync.when(
        data: (data) {
          final institution = studentMap(data['institution']);
          final enrollments = studentMaps(data['enrollments']);
          final schoolClass = enrollments.isEmpty
              ? <String, dynamic>{}
              : studentMap(enrollments.first['schoolClass']);

          final email = studentString(data['email'], user?.email ?? 'N/A');
          final studentNo = studentString(data['studentNumber'], 'Not available');
          final instName = studentString(institution['name'], 'Not available');
          final className = studentString(schoolClass['name'], 'Not enrolled');

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Editable Personal Information',
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
                    'Read-Only Academic Details',
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
                      label: 'Student Number',
                      value: studentNo,
                      icon: Icons.badge_outlined),
                  const SizedBox(height: 12),
                  _ReadOnlyField(
                      label: 'Institution',
                      value: instName,
                      icon: Icons.account_balance_outlined),
                  const SizedBox(height: 12),
                  _ReadOnlyField(
                      label: 'Class',
                      value: className,
                      icon: Icons.class_outlined),
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
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary)),
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
