import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:blumark/app/app.dart';
import 'package:blumark/features/auth/domain/entities/auth_user.dart';
import 'package:blumark/features/auth/presentation/widgets/password_requirements_widget.dart';

void main() {
  group('AuthUser Serialization', () {
    test('parses json correctly for Student profile', () {
      final json = {
        'id': 'user-123',
        'fullName': 'Jane Student',
        'email': 'jane@school.edu',
        'role': 'STUDENT',
        'institutionId': 'inst-1',
        'mustChangePassword': true,
        'institution': {'name': 'Springfield Academy'},
        'studentDetails': {'studentNumber': 'STU001'},
      };

      final user = AuthUser.fromJson(json);

      expect(user.id, 'user-123');
      expect(user.fullName, 'Jane Student');
      expect(user.email, 'jane@school.edu');
      expect(user.role, 'STUDENT');
      expect(user.institutionId, 'inst-1');
      expect(user.mustChangePassword, true);
      expect(user.institutionName, 'Springfield Academy');
      expect(user.studentNumber, 'STU001');
    });

    test('parses json correctly for Teacher profile', () {
      final json = {
        'id': 'user-456',
        'fullName': 'John Teacher',
        'email': 'john@school.edu',
        'role': 'TEACHER',
        'institutionId': 'inst-1',
        'mustChangePassword': false,
        'institution': {'name': 'Springfield Academy'},
        'teacherDetails': {'employeeId': 'EMP001'},
      };

      final user = AuthUser.fromJson(json);

      expect(user.id, 'user-456');
      expect(user.fullName, 'John Teacher');
      expect(user.role, 'TEACHER');
      expect(user.mustChangePassword, false);
      expect(user.employeeId, 'EMP001');
    });
  });

  group('Password Requirements Validation', () {
    test('validates minimum 12 characters', () {
      expect(PasswordRequirementsWidget.isAllMet('Short1!'), false);
      expect(PasswordRequirementsWidget.isAllMet('ValidPass123!@#'), true);
    });

    test('validates uppercase requirement', () {
      expect(PasswordRequirementsWidget.isAllMet('lowercase123!@#'), false);
    });

    test('validates lowercase requirement', () {
      expect(PasswordRequirementsWidget.isAllMet('UPPERCASE123!@#'), false);
    });

    test('validates number requirement', () {
      expect(PasswordRequirementsWidget.isAllMet('NoNumbersHere!@#'), false);
    });

    test('validates special character requirement', () {
      expect(PasswordRequirementsWidget.isAllMet('NoSpecialChar123'), false);
    });
  });

  group('UI & Widget Tests', () {
    testWidgets('App renders splash screen initially', (WidgetTester tester) async {
      await tester.pumpWidget(const ProviderScope(child: BluMarkApp()));
      await tester.pump();

      expect(find.text('Smart Attendance System'), findsOneWidget);
    });
  });
}
