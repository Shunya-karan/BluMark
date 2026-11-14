class AuthUser {
  const AuthUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
    required this.institutionId,
    this.institutionName,
    required this.mustChangePassword,
    this.studentNumber,
    this.employeeId,
  });

  final String id;
  final String fullName;
  final String email;
  final String role;
  final String institutionId;
  final String? institutionName;
  final bool mustChangePassword;
  final String? studentNumber;
  final String? employeeId;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    final institution = json['institution'] as Map?;
    final studentDetails = json['studentDetails'] as Map?;
    final teacherDetails = json['teacherDetails'] as Map?;

    return AuthUser(
      id: json['id'] as String? ?? '',
      fullName: json['fullName'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: (json['role'] as String?)?.toUpperCase() ?? '',
      institutionId: json['institutionId'] as String? ?? '',
      institutionName: institution?['name'] as String?,
      mustChangePassword: json['mustChangePassword'] == true,
      studentNumber: studentDetails?['studentNumber'] as String?,
      employeeId: teacherDetails?['employeeId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'fullName': fullName,
        'email': email,
        'role': role,
        'institutionId': institutionId,
        'institutionName': institutionName,
        'mustChangePassword': mustChangePassword,
        'studentNumber': studentNumber,
        'employeeId': employeeId,
      };
}
