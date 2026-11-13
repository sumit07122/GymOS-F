import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

let s3ClientInstance: S3Client | undefined;

export function getS3Client(): S3Client | null {
  const e = env();
  if (!e.STORAGE_ACCESS_KEY_ID || !e.STORAGE_SECRET_ACCESS_KEY) {
    return null;
  }

  return (s3ClientInstance ??= new S3Client({
    region: e.STORAGE_REGION,
    endpoint: e.STORAGE_ENDPOINT || undefined,
    forcePathStyle: true, // required by Neon Storage, MinIO, Ceph
    credentials: {
      accessKeyId: e.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: e.STORAGE_SECRET_ACCESS_KEY,
    },
  }));
}

export type MediaScope = "avatar" | "logo" | "banner" | "receipt" | "document" | "video";

const ALLOWED_MIME_TYPES: Record<MediaScope, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/webp"],
  logo: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
  banner: ["image/jpeg", "image/png", "image/webp"],
  receipt: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  document: ["application/pdf", "image/jpeg", "image/png"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
};

const MAX_FILE_SIZES: Record<MediaScope, number> = {
  avatar: 5 * 1024 * 1024, // 5 MB
  logo: 5 * 1024 * 1024, // 5 MB
  banner: 10 * 1024 * 1024, // 10 MB
  receipt: 10 * 1024 * 1024, // 10 MB
  document: 20 * 1024 * 1024, // 20 MB
  video: 100 * 1024 * 1024, // 100 MB
};

export interface GenerateUploadUrlOptions {
  gymId: string;
  scope: MediaScope;
  fileName: string;
  contentType: string;
  fileSizeBytes?: number;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

/**
 * Generates a presigned upload URL for a tenant-isolated media object.
 * Enforces strict tenant folder separation: `gyms/${gymId}/${scope}/${randomId}-${fileName}`
 */
export async function createPresignedUploadUrl(
  options: GenerateUploadUrlOptions
): Promise<PresignedUploadResult> {
  const allowed = ALLOWED_MIME_TYPES[options.scope];
  if (!allowed.includes(options.contentType.toLowerCase())) {
    throw new Error(`UNSUPPORTED_MEDIA_TYPE: ${options.contentType} is not allowed for ${options.scope}`);
  }

  if (options.fileSizeBytes && options.fileSizeBytes > MAX_FILE_SIZES[options.scope]) {
    throw new Error(`FILE_TOO_LARGE: maximum size for ${options.scope} is ${MAX_FILE_SIZES[options.scope]} bytes`);
  }

  const s3 = getS3Client();
  const bucket = env().STORAGE_BUCKET;

  // Sanitize file name
  const cleanFileName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const randomSuffix = require("crypto").randomBytes(8).toString("hex");
  const storageKey = `gyms/${options.gymId}/${options.scope}/${randomSuffix}-${cleanFileName}`;

  if (!s3) {
    // If S3 is not configured in this environment, return a placeholder endpoint
    return {
      uploadUrl: `https://storage.local/upload-mock?key=${encodeURIComponent(storageKey)}`,
      storageKey,
      expiresInSeconds: 900,
    };
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: options.contentType,
    Metadata: {
      "gym-id": options.gymId,
      scope: options.scope,
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 mins

  return {
    uploadUrl,
    storageKey,
    expiresInSeconds: 900,
  };
}

/**
 * Generates a presigned download/view URL for a media object.
 * Validates that the requesting gymId matches the key's tenant prefix to prevent IDOR / cross-tenant leaks.
 */
export async function getPresignedViewUrl(params: {
  gymId?: string;
  storageKey: string;
  expiresInSeconds?: number;
}): Promise<string> {
  // Tenant isolation check: if a gymId is specified, ensure the storageKey belongs to that gym!
  if (params.gymId && !params.storageKey.startsWith(`gyms/${params.gymId}/`)) {
    throw new Error("UNAUTHORIZED_STORAGE_ACCESS: Key does not belong to the authenticated gym");
  }

  const s3 = getS3Client();
  if (!s3) {
    return `https://storage.local/view-mock?key=${encodeURIComponent(params.storageKey)}`;
  }

  const command = new GetObjectCommand({
    Bucket: env().STORAGE_BUCKET,
    Key: params.storageKey,
  });

  return getSignedUrl(s3, command, { expiresIn: params.expiresInSeconds ?? 3600 });
}

/**
 * Deletes an object from storage with tenant boundary verification.
 */
export async function deleteStorageObject(params: {
  gymId: string;
  storageKey: string;
}): Promise<boolean> {
  if (!params.storageKey.startsWith(`gyms/${params.gymId}/`)) {
    throw new Error("UNAUTHORIZED_STORAGE_ACCESS: Cannot delete media from another tenant");
  }

  const s3 = getS3Client();
  if (!s3) return true;

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env().STORAGE_BUCKET,
        Key: params.storageKey,
      })
    );
    return true;
  } catch (err) {
    console.error("[storage:delete:error]", err);
    return false;
  }
}

