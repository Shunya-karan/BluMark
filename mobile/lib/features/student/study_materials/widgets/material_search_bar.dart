import 'package:flutter/material.dart';

class MaterialSearchBar extends StatelessWidget {
  const MaterialSearchBar({super.key, required this.onChanged});
  final ValueChanged<String> onChanged;
  @override
  Widget build(BuildContext context) => TextField(
    onChanged: onChanged,
    decoration: const InputDecoration(
      prefixIcon: Icon(Icons.search_rounded),
      hintText: 'Search materials',
    ),
  );
}
