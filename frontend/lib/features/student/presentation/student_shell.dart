import 'package:flutter/material.dart';
import '../attendance/screens/attendance_screen.dart';
import '../dashboard/screens/student_dashboard_screen.dart';
import '../profile/screens/student_profile_screen.dart';
import '../study_materials/screens/study_materials_screen.dart';
import '../timetable/screens/timetable_screen.dart';
import 'widgets/student_bottom_navigation.dart';

class StudentShell extends StatefulWidget {
  const StudentShell({super.key});
  @override
  State<StudentShell> createState() => _StudentShellState();
}

class _StudentShellState extends State<StudentShell> {
  var _index = 0;
  void _select(int index) => setState(() => _index = index);
  @override
  Widget build(BuildContext context) => Scaffold(
    body: IndexedStack(
      index: _index,
      children: [
        StudentDashboardScreen(onTab: _select),
        const AttendanceScreen(),
        const TimetableScreen(),
        const StudyMaterialsScreen(),
        const StudentProfileScreen(),
      ],
    ),
    bottomNavigationBar: StudentBottomNavigation(
      index: _index,
      onChanged: _select,
    ),
  );
}
