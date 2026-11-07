-- AlterTable
ALTER TABLE "study_materials" ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "original_file_name" TEXT,
ADD COLUMN     "storage_key" TEXT;

-- RenameIndex
ALTER INDEX "device_replacement_requests_institution_id_profile_id_status_cr" RENAME TO "device_replacement_requests_institution_id_profile_id_statu_idx";

-- RenameIndex
ALTER INDEX "notifications_institution_id_recipient_id_read_at_created_at_id" RENAME TO "notifications_institution_id_recipient_id_read_at_created_a_idx";
