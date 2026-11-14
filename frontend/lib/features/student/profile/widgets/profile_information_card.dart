import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class ProfileInformationCard extends StatelessWidget {
  const ProfileInformationCard({super.key, required this.rows});
  final Map<String, String> rows;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: rows.entries
            .map(
              (entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        entry.key,
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        entry.value,
                        textAlign: TextAlign.right,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    ),
  );
}
