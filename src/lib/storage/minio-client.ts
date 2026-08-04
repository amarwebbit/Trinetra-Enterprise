import * as Minio from 'minio';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || process.env.MINIO_USER || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || process.env.MINIO_PASSWORD || 'admin123',
});

const BRANDING_BUCKET = 'branding';

export async function ensureBrandingBucket() {
  const exists = await minioClient.bucketExists(BRANDING_BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BRANDING_BUCKET, 'us-east-1');
    
    // Set bucket policy to allow public read access
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Action: ["s3:GetObject"],
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Resource: [`arn:aws:s3:::${BRANDING_BUCKET}/*`],
        },
      ],
    };
    await minioClient.setBucketPolicy(BRANDING_BUCKET, JSON.stringify(policy));
  }
}

export async function generateUploadUrl(fileName: string, mimeType: string): Promise<string> {
  await ensureBrandingBucket();
  // Returns a presigned URL valid for 5 minutes (300 seconds)
  return await minioClient.presignedPutObject(BRANDING_BUCKET, fileName, 300);
}

// Since the bucket policy is public, we can just return the raw public URL
// But here is the presigned download function if needed for private assets:
export async function generateDownloadUrl(fileName: string): Promise<string> {
  return await minioClient.presignedGetObject(BRANDING_BUCKET, fileName, 24 * 60 * 60); // 24 hours
}

export function getPublicUrl(fileName: string): string {
  const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = process.env.MINIO_PORT || '9000';
  return `${protocol}://${endPoint}:${port}/${BRANDING_BUCKET}/${fileName}`;
}

export default minioClient;
