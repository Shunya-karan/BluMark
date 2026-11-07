import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { randomUUID } from "node:crypto";
import path from "node:path";

import s3, {
  S3_BUCKET,
  SIGNED_URL_EXPIRY,
} from "../config/aws.js";

export async function uploadStudyMaterial({
  file,
  institutionId,
  classSubjectId,
}) {
  const extension = path.extname(file.originalname).toLowerCase();
  const key = [
    "study-materials",
    institutionId,
    classSubjectId,
    `${randomUUID()}${extension}`,
  ].join("/");

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
      ServerSideEncryption: "AES256",
      Metadata: {
        originalfilename: encodeURIComponent(
          path.basename(file.originalname),
        ),
      },
    }),
  );

  return {
    storageKey: key,
    fileUrl: `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    fileType: file.mimetype,
    originalFileName: path.basename(file.originalname),
    fileSize: file.size,
  };
}

export async function deleteStudyMaterialObject(storageKey) {
  if (!storageKey) return;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: storageKey,
    }),
  );
}

export async function createStudyMaterialDownloadUrl(storageKey) {
  if (!storageKey) return null;

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: storageKey,
  });

  const { getSignedUrl } = await import(
    "@aws-sdk/s3-request-presigner"
  );

  return getSignedUrl(s3, command, {
    expiresIn: SIGNED_URL_EXPIRY,
  });
}