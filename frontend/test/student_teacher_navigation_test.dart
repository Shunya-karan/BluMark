import 'package:blumark/features/student/presentation/widgets/student_bottom_navigation.dart';
import 'package:blumark/features/teacher/presentation/widgets/teacher_bottom_navigation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  testWidgets('Bluetooth is the central student action and opens index 2', (
    tester,
  ) async {
    var selectedIndex = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          bottomNavigationBar: StudentBottomNavigation(
            index: selectedIndex,
            onChanged: (index) => selectedIndex = index,
          ),
        ),
      ),
    );

    expect(find.text('Materials'), findsNothing);
    await tester.tap(find.text('Nearby'));
    expect(selectedIndex, 2);
  });

  testWidgets('teacher Attendance destination opens its attendance route', (
    tester,
  ) async {
    final router = GoRouter(
      initialLocation: '/teacher',
      routes: [
        GoRoute(
          path: '/teacher',
          builder: (context, state) => Scaffold(
            body: const Text('Teacher home'),
            bottomNavigationBar: const TeacherBottomNavigation(currentIndex: 0),
          ),
        ),
        GoRoute(
          path: '/teacher/attendance',
          builder: (context, state) =>
              const Scaffold(body: Text('Attendance entry')),
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.tap(find.text('Attendance'));
    await tester.pumpAndSettle();

    expect(find.text('Attendance entry'), findsOneWidget);
  });
}
