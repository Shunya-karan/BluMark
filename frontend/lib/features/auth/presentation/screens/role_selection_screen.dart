import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/auth_header.dart';
import '../../../../core/widgets/background_orbs.dart';

class RoleSelectionScreen extends StatefulWidget {
  const RoleSelectionScreen({super.key});

  @override
  State<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen> {
  String? _selectedRole;
  bool _isNavigating = false;

  @override
  Widget build(BuildContext context) {
    final canContinue = _selectedRole != null && !_isNavigating;
    final primaryColor = _selectedRole == 'TEACHER'
        ? AppColors.teal
        : AppColors.primary;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          const BackgroundOrbs(),
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 500),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 24,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const AuthHeader(showLogo: true, logoHeight: 60),
                      const SizedBox(height: 32),
                      const _SectionTitle(
                        title: 'How will you sign in?',
                        subtitle: 'Choose your account type to continue.',
                      ),
                      const SizedBox(height: 28),
                      _RoleCard(
                        roleTitle: 'Student',
                        roleKey: 'STUDENT',
                        selected: _selectedRole == 'STUDENT',
                        icon: Icons.school_rounded,
                        description:
                            'Access attendance, timetable and study materials.',
                        accent: AppColors.primary,
                        lightBg: AppColors.lightBlue,
                        onTap: () {
                          setState(() => _selectedRole = 'STUDENT');
                        },
                      ),
                      const SizedBox(height: 16),
                      _RoleCard(
                        roleTitle: 'Teacher',
                        roleKey: 'TEACHER',
                        selected: _selectedRole == 'TEACHER',
                        icon: Icons.cast_for_education_rounded,
                        description: 'Manage classes and attendance.',
                        accent: AppColors.teal,
                        lightBg: AppColors.lightTeal,
                        onTap: () {
                          setState(() => _selectedRole = 'TEACHER');
                        },
                      ),
                      const SizedBox(height: 32),
                      ElevatedButton(
                        onPressed: canContinue
                            ? () {
                                setState(() => _isNavigating = true);
                                context.go('/login/$_selectedRole');
                              }
                            : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          disabledBackgroundColor: AppColors.border,
                          disabledForegroundColor: AppColors.textMuted,
                          minimumSize: const Size(double.infinity, 54),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: _isNavigating
                            ? const SizedBox(
                                height: 22,
                                width: 22,
                                child: CircularProgressIndicator(
                                  color: AppColors.white,
                                  strokeWidth: 2.5,
                                ),
                              )
                            : const Text(
                                'Continue',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 4,
          width: 44,
          decoration: BoxDecoration(
            color: AppColors.teal,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          title,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 28,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          subtitle,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 15,
            height: 1.45,
          ),
        ),
      ],
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.roleTitle,
    required this.roleKey,
    required this.selected,
    required this.icon,
    required this.description,
    required this.accent,
    required this.lightBg,
    required this.onTap,
  });

  final String roleTitle;
  final String roleKey;
  final bool selected;
  final IconData icon;
  final String description;
  final Color accent;
  final Color lightBg;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: '$roleTitle account type',
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        decoration: BoxDecoration(
          color: selected ? lightBg : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? accent : AppColors.border,
            width: selected ? 2 : 1,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: accent.withValues(alpha: 0.12),
                    blurRadius: 18,
                    offset: const Offset(0, 6),
                  ),
                ]
              : [
                  BoxShadow(
                    color: AppColors.deepBlue.withValues(alpha: 0.03),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(19),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    height: 54,
                    width: 54,
                    decoration: BoxDecoration(
                      color: selected ? accent : lightBg,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      icon,
                      color: selected ? AppColors.white : accent,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          roleTitle,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          description,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  AnimatedScale(
                    duration: const Duration(milliseconds: 180),
                    scale: selected ? 1.0 : 0.6,
                    child: AnimatedOpacity(
                      duration: const Duration(milliseconds: 180),
                      opacity: selected ? 1.0 : 0.0,
                      child: Icon(
                        Icons.check_circle_rounded,
                        color: accent,
                        size: 26,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
