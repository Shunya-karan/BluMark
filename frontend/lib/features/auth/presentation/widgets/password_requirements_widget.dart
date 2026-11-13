import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class PasswordRequirementItem {
  const PasswordRequirementItem({
    required this.label,
    required this.validator,
  });

  final String label;
  final bool Function(String) validator;
}

class PasswordRequirementsWidget extends StatelessWidget {
  const PasswordRequirementsWidget({
    super.key,
    required this.password,
  });

  final String password;

  static final List<PasswordRequirementItem> requirements = [
    PasswordRequirementItem(
      label: 'At least 12 characters',
      validator: (p) => p.length >= 12,
    ),
    PasswordRequirementItem(
      label: 'One uppercase letter (A-Z)',
      validator: (p) => RegExp(r'[A-Z]').hasMatch(p),
    ),
    PasswordRequirementItem(
      label: 'One lowercase letter (a-z)',
      validator: (p) => RegExp(r'[a-z]').hasMatch(p),
    ),
    PasswordRequirementItem(
      label: 'One number (0-9)',
      validator: (p) => RegExp(r'[0-9]').hasMatch(p),
    ),
    PasswordRequirementItem(
      label: 'One special character (!@#\$%^&*)',
      validator: (p) => RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(p),
    ),
  ];

  static bool isAllMet(String p) {
    return requirements.every((req) => req.validator(p));
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.secondarySurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Password Requirements:',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          ...requirements.map((req) {
            final met = req.validator(password);
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    height: 18,
                    width: 18,
                    decoration: BoxDecoration(
                      color: met
                          ? AppColors.success.withValues(alpha: 0.15)
                          : AppColors.border.withValues(alpha: 0.5),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      met ? Icons.check_rounded : Icons.close_rounded,
                      size: 12,
                      color: met ? AppColors.success : AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      req.label,
                      style: TextStyle(
                        color: met ? AppColors.textPrimary : AppColors.textMuted,
                        fontSize: 13,
                        fontWeight: met ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
