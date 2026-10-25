-- CreateEnum
CREATE TYPE "institution_type" AS ENUM ('SCHOOL', 'UNIVERSITY');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('INSTITUTION_ADMIN', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "session_status" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "attendance_status" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "attendance_method" AS ENUM ('BLE', 'MANUAL', 'ADMIN_OVERRIDE');

-- CreateEnum
CREATE TYPE "device_status" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED');

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "institution_type" NOT NULL,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "user_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_details" (
    "profile_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "student_number" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "student_details_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "teacher_details" (
    "profile_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "department_id" UUID,
    "employee_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "teacher_details_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "department_id" UUID,
    "name" TEXT NOT NULL,
    "division" TEXT,
    "academic_year" TEXT NOT NULL,
    "semester" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_subjects" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "class_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "enrolled_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "device_identifier" TEXT NOT NULL,
    "public_key" TEXT,
    "status" "device_status" NOT NULL DEFAULT 'PENDING',
    "registered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "rejection_reason" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_slots" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "class_subject_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "room" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "class_subject_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "timetable_slot_id" UUID,
    "session_code" TEXT NOT NULL,
    "ble_token_seed" TEXT NOT NULL,
    "status" "session_status" NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "device_id" UUID,
    "status" "attendance_status" NOT NULL DEFAULT 'PRESENT',
    "method" "attendance_method" NOT NULL DEFAULT 'BLE',
    "marked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rssi" SMALLINT,
    "notes" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_code_key" ON "institutions"("code");

-- CreateIndex
CREATE INDEX "profiles_institution_id_role_idx" ON "profiles"("institution_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_id_institution_id_key" ON "profiles"("id", "institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_institution_id_email_key" ON "profiles"("institution_id", "email");

-- CreateIndex
CREATE INDEX "departments_institution_id_is_active_idx" ON "departments"("institution_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "departments_id_institution_id_key" ON "departments"("id", "institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_institution_id_code_key" ON "departments"("institution_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "student_details_institution_id_student_number_key" ON "student_details"("institution_id", "student_number");

-- CreateIndex
CREATE UNIQUE INDEX "student_details_profile_id_institution_id_key" ON "student_details"("profile_id", "institution_id");

-- CreateIndex
CREATE INDEX "teacher_details_institution_id_department_id_idx" ON "teacher_details"("institution_id", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_details_institution_id_employee_id_key" ON "teacher_details"("institution_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_details_profile_id_institution_id_key" ON "teacher_details"("profile_id", "institution_id");

-- CreateIndex
CREATE INDEX "classes_institution_id_academic_year_is_active_idx" ON "classes"("institution_id", "academic_year", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "classes_id_institution_id_key" ON "classes"("id", "institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "classes_institution_id_name_division_academic_year_semester_key" ON "classes"("institution_id", "name", "division", "academic_year", "semester");

-- CreateIndex
CREATE INDEX "subjects_institution_id_is_active_idx" ON "subjects"("institution_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_id_institution_id_key" ON "subjects"("id", "institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_institution_id_code_key" ON "subjects"("institution_id", "code");

-- CreateIndex
CREATE INDEX "class_subjects_institution_id_teacher_id_idx" ON "class_subjects"("institution_id", "teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_subjects_id_institution_id_key" ON "class_subjects"("id", "institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_subjects_id_institution_id_teacher_id_key" ON "class_subjects"("id", "institution_id", "teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_subjects_class_id_subject_id_teacher_id_key" ON "class_subjects"("class_id", "subject_id", "teacher_id");

-- CreateIndex
CREATE INDEX "enrollments_institution_id_class_id_is_active_idx" ON "enrollments"("institution_id", "class_id", "is_active");

-- CreateIndex
CREATE INDEX "enrollments_student_id_idx" ON "enrollments"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_student_id_class_id_key" ON "enrollments"("student_id", "class_id");

-- CreateIndex
CREATE INDEX "devices_institution_id_profile_id_status_idx" ON "devices"("institution_id", "profile_id", "status");

-- CreateIndex
CREATE INDEX "devices_institution_id_status_registered_at_idx" ON "devices"("institution_id", "status", "registered_at");

-- CreateIndex
CREATE UNIQUE INDEX "devices_id_institution_id_key" ON "devices"("id", "institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "devices_institution_id_device_identifier_key" ON "devices"("institution_id", "device_identifier");

-- CreateIndex
CREATE INDEX "timetable_slots_institution_id_weekday_is_active_idx" ON "timetable_slots"("institution_id", "weekday", "is_active");

-- CreateIndex
CREATE INDEX "timetable_slots_class_subject_id_weekday_idx" ON "timetable_slots"("class_subject_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_slots_id_institution_id_key" ON "timetable_slots"("id", "institution_id");

-- CreateIndex
CREATE INDEX "attendance_sessions_institution_id_status_expires_at_idx" ON "attendance_sessions"("institution_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "attendance_sessions_teacher_id_starts_at_idx" ON "attendance_sessions"("teacher_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_id_institution_id_key" ON "attendance_sessions"("id", "institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_institution_id_session_code_key" ON "attendance_sessions"("institution_id", "session_code");

-- CreateIndex
CREATE INDEX "attendance_records_institution_id_student_id_marked_at_idx" ON "attendance_records"("institution_id", "student_id", "marked_at");

-- CreateIndex
CREATE INDEX "attendance_records_institution_id_session_id_status_idx" ON "attendance_records"("institution_id", "session_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_session_id_student_id_key" ON "attendance_records"("session_id", "student_id");

-- CreateIndex
CREATE INDEX "audit_logs_institution_id_created_at_idx" ON "audit_logs"("institution_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_institution_id_entity_type_entity_id_idx" ON "audit_logs"("institution_id", "entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_details" ADD CONSTRAINT "student_details_profile_id_institution_id_fkey" FOREIGN KEY ("profile_id", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_details" ADD CONSTRAINT "teacher_details_profile_id_institution_id_fkey" FOREIGN KEY ("profile_id", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_details" ADD CONSTRAINT "teacher_details_department_id_institution_id_fkey" FOREIGN KEY ("department_id", "institution_id") REFERENCES "departments"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_department_id_institution_id_fkey" FOREIGN KEY ("department_id", "institution_id") REFERENCES "departments"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_id_institution_id_fkey" FOREIGN KEY ("class_id", "institution_id") REFERENCES "classes"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_institution_id_fkey" FOREIGN KEY ("subject_id", "institution_id") REFERENCES "subjects"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_teacher_id_institution_id_fkey" FOREIGN KEY ("teacher_id", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_institution_id_fkey" FOREIGN KEY ("student_id", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_institution_id_fkey" FOREIGN KEY ("class_id", "institution_id") REFERENCES "classes"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_profile_id_institution_id_fkey" FOREIGN KEY ("profile_id", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_reviewed_by_institution_id_fkey" FOREIGN KEY ("reviewed_by", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_class_subject_id_institution_id_fkey" FOREIGN KEY ("class_subject_id", "institution_id") REFERENCES "class_subjects"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_class_subject_id_institution_id_teache_fkey" FOREIGN KEY ("class_subject_id", "institution_id", "teacher_id") REFERENCES "class_subjects"("id", "institution_id", "teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_teacher_id_institution_id_fkey" FOREIGN KEY ("teacher_id", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_timetable_slot_id_institution_id_fkey" FOREIGN KEY ("timetable_slot_id", "institution_id") REFERENCES "timetable_slots"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_institution_id_fkey" FOREIGN KEY ("session_id", "institution_id") REFERENCES "attendance_sessions"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_institution_id_fkey" FOREIGN KEY ("student_id", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_device_id_institution_id_fkey" FOREIGN KEY ("device_id", "institution_id") REFERENCES "devices"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_institution_id_fkey" FOREIGN KEY ("actor_id", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;
