import prisma from './src/config/prisma.js';

async function main() {
  const counts = {
    institutions: await prisma.institution.count(),
    departments: await prisma.department.count(),
    profiles: await prisma.profile.count(),
    credentials: await prisma.userCredential.count(),
    admins: await prisma.profile.count({ where: { role: 'INSTITUTION_ADMIN' } }),
    teachers: await prisma.profile.count({ where: { role: 'TEACHER' } }),
    teacherDetails: await prisma.teacherDetail.count(),
    students: await prisma.profile.count({ where: { role: 'STUDENT' } }),
    studentDetails: await prisma.studentDetail.count(),
    classes: await prisma.schoolClass.count(),
    enrollments: await prisma.enrollment.count(),
    subjects: await prisma.subject.count(),
    classSubjects: await prisma.classSubject.count(),
    timetables: await prisma.timetableSlot.count()
  };

  console.log(JSON.stringify(counts, null, 2));
}
main().finally(() => prisma.$disconnect());