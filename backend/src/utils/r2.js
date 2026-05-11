import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a buffer to R2 and return the public URL.
 * @param {string} key - e.g. "logos/org-uuid.png"
 * @param {Buffer} buffer
 * @param {string} contentType - e.g. "image/png"
 */
export async function uploadToR2(key, buffer, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  // R2_PUBLIC_URL is the public base URL for the bucket (no trailing slash)
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
