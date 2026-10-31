CREATE TYPE "device_replacement_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "study_materials" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "class_subject_id" UUID NOT NULL,
    "uploaded_by" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT NOT NULL,
    "file_type" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "study_materials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "sender_id" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" VARCHAR(64) NOT NULL DEFAULT 'GENERAL',
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "device_replacement_requests" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "requested_device_identifier" TEXT NOT NULL,
    "public_key" TEXT,
    "reason" TEXT,
    "status" "device_replacement_status" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "device_replacement_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "study_materials_institution_id_class_subject_id_created_at_idx"
  ON "study_materials"("institution_id", "class_subject_id", "created_at");
CREATE INDEX "notifications_institution_id_recipient_id_read_at_created_at_idx"
  ON "notifications"("institution_id", "recipient_id", "read_at", "created_at");
CREATE INDEX "device_replacement_requests_institution_id_profile_id_status_created_at_idx"
  ON "device_replacement_requests"("institution_id", "profile_id", "status", "created_at");

ALTER TABLE "study_materials"
  ADD CONSTRAINT "study_materials_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "study_materials_class_subject_id_institution_id_fkey"
  FOREIGN KEY ("class_subject_id", "institution_id") REFERENCES "class_subjects"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "study_materials_uploaded_by_institution_id_fkey"
  FOREIGN KEY ("uploaded_by", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "notifications_recipient_id_institution_id_fkey"
  FOREIGN KEY ("recipient_id", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "notifications_sender_id_institution_id_fkey"
  FOREIGN KEY ("sender_id", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "device_replacement_requests"
  ADD CONSTRAINT "device_replacement_requests_institution_id_fkey"
  FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "device_replacement_requests_profile_id_institution_id_fkey"
  FOREIGN KEY ("profile_id", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "device_replacement_requests_reviewed_by_institution_id_fkey"
  FOREIGN KEY ("reviewed_by", "institution_id") REFERENCES "profiles"("id", "institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;
