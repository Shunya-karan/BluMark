import 'package:flutter/material.dart';

class NotificationBadge extends StatelessWidget {
  const NotificationBadge({
    super.key,
    required this.count,
    required this.onTap,
  });
  final int count;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => IconButton(
    onPressed: onTap,
    icon: Badge(
      isLabelVisible: count > 0,
      label: Text('$count'),
      child: const Icon(Icons.notifications_outlined),
    ),
  );
}
