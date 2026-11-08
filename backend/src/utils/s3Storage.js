import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  s3Client,
  AWS_S3_BUCKET_NAME,
  SIGNED_URL_EXPIRY,
} from "../config/aws.js";

import { randomUUID } from "crypto";
import path from "path";

export const uploadStudyMaterial = async ({
  file,
  institutionId,
  classSubjectId,
}) => {
  const extension = path.extname(file.originalname).toLowerCase();

  const storageKey = `study-materials/${institutionId}/${classSubjectId}/${randomUUID()}${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
      ServerSideEncryption: "AES256",
      Metadata: {
        originalName: encodeURIComponent(file.originalname),
      },
    })
  );

  return {
    storageKey,
    fileUrl: `https://${AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${storageKey}`,
    originalFileName: file.originalname,
    fileSize: file.size,
  };
};

export const deleteStudyMaterialObject = async (storageKey) => {
  if (!storageKey) return;

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: storageKey,
    })
  );
};

export const getStudyMaterialSignedUrl = async (storageKey) => {
  if (!storageKey) {
    throw new Error("Study material storage key is missing");
  }

  const command = new GetObjectCommand({
    Bucket: AWS_S3_BUCKET_NAME,
    Key: storageKey,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: SIGNED_URL_EXPIRY,
  });
};

export const createStudyMaterialDownloadUrl = getStudyMaterialSignedUrl;
