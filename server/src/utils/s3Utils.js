// server/src/utils/s3Utils.js
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const deleteFileFromS3 = async (s3Key) => {
  try {
    const bucketName = process.env.AWS_BUCKET_NAME; // Make sure this env var is set

    if (!bucketName) {
      throw new Error("AWS_BUCKET_NAME environment variable is not set");
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName, // Use the environment variable
      Key: s3Key,
    });

    await s3Client.send(command);
    console.log(`✅ Successfully deleted S3 file: ${s3Key}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete S3 file ${s3Key}:`, error);
    throw error;
  }
};

export const deleteMultipleFilesFromS3 = async (s3Keys) => {
  try {
    const deletePromises = s3Keys.map((key) =>
      deleteFileFromS3(key).catch((error) => ({
        key,
        error: error.message,
      }))
    );

    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    console.error("Error deleting multiple S3 files:", error);
    throw error;
  }
};
