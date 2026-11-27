import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class WeekdaySelector extends StatelessWidget {
  const WeekdaySelector({
    super.key,
    required this.selected,
    required this.onChanged,
  });
  final int selected;
  final ValueChanged<int> onChanged;
  @override
  Widget build(BuildContext context) => SizedBox(
    height: 46,
    child: ListView.separated(
      scrollDirection: Axis.horizontal,
      itemCount: 7,
      separatorBuilder: (context, index) => const SizedBox(width: 8),
      itemBuilder: (_, index) {
        final day = index + 1;
        final selectedDay = day == selected;
        return ChoiceChip(
          label: Text(
            const ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
          ),
          selected: selectedDay,
          onSelected: (_) => onChanged(day),
          selectedColor: AppColors.lightBlue,
          labelStyle: TextStyle(
            color: selectedDay ? AppColors.primary : AppColors.textSecondary,
            fontWeight: FontWeight.w700,
          ),
        );
      },
    ),
  );
}
