export function sanitizeProfile(profile) {
  return {
    id: profile.id,
    institutionId: profile.institutionId,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    isActive: profile.isActive,
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
