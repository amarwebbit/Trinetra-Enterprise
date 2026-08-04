import minioClient from './minio-client';

const BRANDING_BUCKET = process.env.MINIO_BRANDING_BUCKET || 'branding';

export async function checkStorageHealth(): Promise<{ status: 'online' | 'offline'; latencyMs: number }> {
  try {
    const start = Date.now();
    
    // Check if the primary bucket exists as a health check
    await minioClient.bucketExists(BRANDING_BUCKET);
    
    const latencyMs = Date.now() - start;
    
    return {
      status: 'online',
      latencyMs
    };
  } catch (error) {
    console.error('MinIO storage health check failed:', error);
    return {
      status: 'offline',
      latencyMs: 0
    };
  }
}
