export function sanitizeProfile(profile) {
  return {
    id: profile.id,
    institutionId: profile.institutionId,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    isActive: profile.isActive,
    // This flag is deliberately exposed so clients can route a provisioned
    // account to the existing forced-password-change endpoint.
    mustChangePassword: Boolean(profile.credential?.mustChangePassword),
    institution: profile.institution
      ? {
          id: profile.institution.id,
          name: profile.institution.name,
          code: profile.institution.code,
          type: profile.institution.type,
        }
      : undefined,
    studentDetails: profile.studentDetails
      ? { studentNumber: profile.studentDetails.studentNumber }
      : undefined,
    teacherDetails: profile.teacherDetails
      ? {
          employeeId: profile.teacherDetails.employeeId,
          department: profile.teacherDetails.department
            ? {
                id: profile.teacherDetails.department.id,
                name: profile.teacherDetails.department.name,
                code: profile.teacherDetails.department.code,
              }
            : null,
        }
      : undefined,
  };
}
