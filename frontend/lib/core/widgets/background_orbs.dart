import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class BackgroundOrbs extends StatelessWidget {
  const BackgroundOrbs({super.key});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Stack(
        children: [
          Positioned(
            top: -90,
            right: -70,
            child: _orb(210, AppColors.lightBlue.withValues(alpha: 0.8)),
          ),
          Positioned(
            bottom: -120,
            left: -90,
            child: _orb(250, AppColors.lightTeal.withValues(alpha: 0.8)),
          ),
        ],
      ),
    );
  }

  Widget _orb(double size, Color color) {
    return Container(
      height: size,
      width: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}
