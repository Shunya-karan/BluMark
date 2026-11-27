import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../presentation/widgets/student_ui.dart';
import '../../providers/student_providers.dart';
import '../widgets/timetable_slot_card.dart';
import '../widgets/weekday_selector.dart';

class TimetableScreen extends ConsumerStatefulWidget {
  const TimetableScreen({super.key});
  @override
  ConsumerState<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends ConsumerState<TimetableScreen> {
  int _day = DateTime.now().weekday;
  @override
  Widget build(BuildContext context) => StudentAsyncPage(
    value: ref.watch(timetableProvider),
    onRefresh: () async => ref.invalidate(timetableProvider),
    builder: (data) {
      final slots = studentMaps(
        data['slots'],
      ).where((slot) => studentInt(slot['weekday']) == _day).toList();
      return StudentPage(
        title: 'Timetable',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            WeekdaySelector(
              selected: _day,
              onChanged: (day) => setState(() => _day = day),
            ),
            const SizedBox(height: 22),
            Text(
              _day == DateTime.now().weekday
                  ? 'Today’s classes'
                  : 'Selected day classes',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 14),
            if (slots.isEmpty)
              const StudentEmptyCard(
                icon: Icons.event_busy_outlined,
                title: 'No classes scheduled',
                message: 'Enjoy your free day or check another weekday.',
              )
            else
              ...slots.map((slot) => TimetableSlotCard(slot: slot)),
          ],
        ),
      );
    },
  );
}
