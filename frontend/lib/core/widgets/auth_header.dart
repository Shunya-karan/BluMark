import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class AuthHeader extends StatelessWidget {
  const AuthHeader({
    super.key,
    this.onBack,
    this.backLabel = 'Back',
    this.isLoading = false,
    this.logoHeight = 40.0,
    this.showLogo = true,
  });

  final VoidCallback? onBack;
  final String backLabel;
  final bool isLoading;
  final double logoHeight;
  final bool showLogo;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      width: double.infinity,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (showLogo)
            Center(
              child: Image.asset(
                'assets/images/logo2.png',
                height: logoHeight,
                fit: BoxFit.contain,
                filterQuality: FilterQuality.high,
              ),
            ),
          if (onBack != null)
            Positioned(
              left: 0,
              child: TextButton.icon(
                onPressed: isLoading ? null : onBack,
                icon: isLoading
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      )
                    : const Icon(
                        Icons.arrow_back_rounded,
                        size: 20,
                        color: AppColors.textPrimary,
                      ),
                label: Text(
                  backLabel,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 4,
                    vertical: 8,
                  ),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
