import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class AuthHeader extends StatelessWidget implements PreferredSizeWidget {
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
  Size get preferredSize => Size.fromHeight(showLogo ? 80.0 : kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      toolbarHeight: showLogo ? 80.0 : kToolbarHeight,
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: true,
      automaticallyImplyLeading: false,
      title: showLogo
          ? Image.asset(
              'assets/images/logo2.png',
              height: logoHeight,
              fit: BoxFit.contain,
              filterQuality: FilterQuality.high,
            )
          : null,
      leadingWidth: 110,
      leading: onBack != null
          ? Padding(
              padding: const EdgeInsets.only(left: 8.0),
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
                  alignment: Alignment.centerLeft,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
              ),
            )
          : null,
    );
  }
}
