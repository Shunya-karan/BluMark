import multer from "multer";
import AppError from "../utils/AppError.js";

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(
        new AppError(
          "Unsupported file type. Upload PDF, DOC, DOCX, PPT, PPTX, JPG or PNG.",
          400,
        ),
      );
    }

    callback(null, true);
  },
});

export default upload;