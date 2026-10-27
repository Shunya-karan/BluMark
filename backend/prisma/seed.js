import * as seedRepository from "../src/repositories/seed.repository.js";
import { disconnectDatabase } from "../src/repositories/database.repository.js";

async function main() {
  console.log("Starting Blu-Mark database seeding...\n");

  // 1. Find the existing demo institution
  const institution =
    await seedRepository.findInstitutionByCode("BLUMARK-DEMO");

  // 2. Find the existing Computer Science department
  const department = await seedRepository.findDepartmentByInstitutionAndCode(
    institution.id,
    "CSE",
  );

  // 3. Fetch existing teachers and students
  const teachers = await seedRepository.listActiveProfilesByRole(
    institution.id,
    "TEACHER",
  );

  const students = await seedRepository.listActiveProfilesByRole(
    institution.id,
    "STUDENT",
  );

  if (teachers.length < 2) {
    throw new Error(
      `Expected at least 2 active teachers, found ${teachers.length}.`,
    );
  }

  if (students.length < 5) {
    throw new Error(
      `Expected at least 5 active students, found ${students.length}.`,
    );
  }

  // 4. Create two classes
  const classDefinitions = [
    {
      name: "BSc Computer Science",
      division: "A",
      academicYear: "2026-2027",
      semester: 1,
    },
    {
      name: "BSc Computer Science",
      division: "B",
      academicYear: "2026-2027",
      semester: 1,
    },
  ];

  const classes = [];

  for (const definition of classDefinitions) {
    const schoolClass = await seedRepository.upsertSchoolClass(
      institution.id,
      department.id,
      definition,
    );

    classes.push(schoolClass);
  }

  const [classA, classB] = classes;

  // 5. Create subjects
  const subjectDefinitions = [
    { name: "Programming Fundamentals", code: "CSE101" },
    { name: "Database Management Systems", code: "CSE102" },
    { name: "Computer Networks", code: "CSE103" },
  ];

  const subjects = {};

  for (const definition of subjectDefinitions) {
    subjects[definition.code] = await seedRepository.upsertSubject(
      institution.id,
      definition,
    );
  }

  // 6. Enroll students into classes.
  // First 3 students -> Division A
  // Remaining 2 students -> Division B
  const studentAssignments = [
    { student: students[0], schoolClass: classA },
    { student: students[1], schoolClass: classA },
    { student: students[2], schoolClass: classA },
    { student: students[3], schoolClass: classB },
    { student: students[4], schoolClass: classB },
  ];

  for (const { student, schoolClass } of studentAssignments) {
    await seedRepository.upsertEnrollment(
      institution.id,
      student.id,
      schoolClass.id,
    );
  }

  // 7. Assign subjects and teachers to each class
  const teachingAssignments = [
    {
      schoolClass: classA,
      subject: subjects.CSE101,
      teacher: teachers[0],
    },
    {
      schoolClass: classA,
      subject: subjects.CSE102,
      teacher: teachers[1],
    },
    {
      schoolClass: classA,
      subject: subjects.CSE103,
      teacher: teachers[0],
    },
    {
      schoolClass: classB,
      subject: subjects.CSE101,
      teacher: teachers[0],
    },
    {
      schoolClass: classB,
      subject: subjects.CSE102,
      teacher: teachers[1],
    },
    {
      schoolClass: classB,
      subject: subjects.CSE103,
      teacher: teachers[1],
    },
  ];

  for (const assignment of teachingAssignments) {
    await seedRepository.upsertClassSubject(
      institution.id,
      assignment.schoolClass.id,
      assignment.subject.id,
      assignment.teacher.id,
    );
  }

  // 8. Display the results
  console.log("Blu-Mark seeding completed successfully!\n");
  console.log("Institution:", institution.name);
  console.log("Department:", department.name);
  console.log("Classes:", classes.length);
  console.log("Subjects:", Object.keys(subjects).length);
  console.log("Teachers available:", teachers.length);
  console.log("Students available:", students.length);
  console.log("Enrollments created/verified:", studentAssignments.length);
  console.log("Class-subject-teacher assignments:", teachingAssignments.length);

  console.log("\nStudent enrollment summary:");

  for (const { student, schoolClass } of studentAssignments) {
    console.log(
      `${student.fullName} (${student.email}) -> ` +
        `${schoolClass.name}, Division ${schoolClass.division}`,
    );
  }
}

main()
  .catch((error) => {
    console.error("\nBlu-Mark seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
