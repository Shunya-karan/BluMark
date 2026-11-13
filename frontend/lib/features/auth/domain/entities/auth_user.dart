class AuthUser {
  const AuthUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
    required this.institutionId,
    this.institutionName,
    required this.mustChangePassword,
  });
  final String id, fullName, email, role, institutionId;
  final String? institutionName;
  final bool mustChangePassword;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    final institution = json['institution'] as Map?;
    return AuthUser(
      id: json['id'] as String,
      fullName: json['fullName'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      institutionId: json['institutionId'] as String,
      institutionName: institution?['name'] as String?,
      mustChangePassword: json['mustChangePassword'] == true,
    );
  }
}
