import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import {
  uploadDescriptorSchema,
  type UploadAssetType,
  type UploadDescriptor,
  type UserRole,
} from "@repo/contracts";

type StorageConfig = {
  accessKeyId: string;
  endpoint?: string;
  forcePathStyle: boolean;
  privateBucket: string;
  publicBaseUrl?: string;
  publicBucket: string;
  region: string;
  secretAccessKey: string;
  uploadUrlTtlSeconds: number;
};

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function guessExtension(fileName: string, contentType: string) {
  const fileExtension = extname(fileName).toLowerCase();

  if (fileExtension.length > 0) {
    return fileExtension;
  }

  if (contentType === "image/png") {
    return ".png";
  }

  if (contentType === "image/jpeg") {
    return ".jpg";
  }

  if (contentType === "image/webp") {
    return ".webp";
  }

  if (contentType === "application/pdf") {
    return ".pdf";
  }

  return "";
}

function buildPublicAssetUrl(
  config: StorageConfig,
  bucket: string,
  key: string,
) {
  if (config.publicBaseUrl) {
    return `${trimTrailingSlash(config.publicBaseUrl)}/${bucket}/${key}`;
  }

  if (config.endpoint) {
    return `${trimTrailingSlash(config.endpoint)}/${bucket}/${key}`;
  }

  return `https://${bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

export function buildStoredAssetUrl(bucket: string, key: string) {
  return buildPublicAssetUrl(getStorageConfig(), bucket, key);
}

export function getStorageConfig(): StorageConfig {
  return {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "minioadmin",
    endpoint: process.env.STORAGE_ENDPOINT ?? "http://127.0.0.1:9000",
    forcePathStyle: readBoolean(process.env.STORAGE_FORCE_PATH_STYLE, true),
    privateBucket:
      process.env.STORAGE_PRIVATE_BUCKET ?? "syndeocare-private-documents",
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
    publicBucket:
      process.env.STORAGE_PUBLIC_BUCKET ?? "syndeocare-public-assets",
    region: process.env.STORAGE_REGION ?? "us-east-1",
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "minioadmin",
    uploadUrlTtlSeconds: Number(
      process.env.STORAGE_UPLOAD_URL_TTL_SECONDS ?? "900",
    ),
  };
}

export function createStorageClient(config = getStorageConfig()) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function resolveBucket(config: StorageConfig, assetType: UploadAssetType) {
  return assetType === "profile-image"
    ? config.publicBucket
    : config.privateBucket;
}

function resolveKey(params: {
  actorRole: UserRole;
  actorSubject: string;
  assetType: UploadAssetType;
  contentType: string;
  fileName: string;
}) {
  const extension = guessExtension(params.fileName, params.contentType);

  return `${params.actorRole}/${params.actorSubject}/${params.assetType}/${Date.now()}-${randomUUID()}${extension}`;
}

export async function createUploadDescriptor(params: {
  actorRole: UserRole;
  actorSubject: string;
  assetType: UploadAssetType;
  contentType: string;
  fileName: string;
}): Promise<UploadDescriptor> {
  const config = getStorageConfig();
  const client = createStorageClient(config);
  const bucket = resolveBucket(config, params.assetType);
  const key = resolveKey(params);
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: params.contentType,
    }),
    {
      expiresIn: config.uploadUrlTtlSeconds,
    },
  );

  return uploadDescriptorSchema.parse({
    assetType: params.assetType,
    bucket,
    key,
    uploadMethod: "PUT",
    uploadUrl,
    uploadHeaders: {
      "content-type": params.contentType,
    },
    expiresIn: config.uploadUrlTtlSeconds,
    assetUrl:
      params.assetType === "profile-image"
        ? buildPublicAssetUrl(config, bucket, key)
        : undefined,
  });
}

export function isActorOwnedObjectKey(input: {
  actorRole: UserRole;
  actorSubject: string;
  key: string;
}) {
  return input.key.startsWith(`${input.actorRole}/${input.actorSubject}/`);
}

export async function assertStoredObjectExists(input: {
  bucket: string;
  key: string;
}) {
  const client = createStorageClient();
  await client.send(
    new HeadObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
    }),
  );
}

async function ensureBucket(client: S3Client, bucket: string) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return;
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

function bootstrapMinioWithCli(config: StorageConfig) {
  if (!config.endpoint) {
    throw new Error(
      "MinIO CLI bootstrap requires a configured storage endpoint.",
    );
  }

  const endpointUrl = new URL(config.endpoint);
  const host =
    endpointUrl.hostname === "127.0.0.1" || endpointUrl.hostname === "localhost"
      ? "host.docker.internal"
      : endpointUrl.hostname;
  const origin = `${endpointUrl.protocol}//${host}${
    endpointUrl.port ? `:${endpointUrl.port}` : ""
  }`;
  const command = `
set -e
mc alias set local ${origin} ${config.accessKeyId} ${config.secretAccessKey}
mc mb --ignore-existing local/${config.publicBucket}
mc mb --ignore-existing local/${config.privateBucket}
mc anonymous set download local/${config.publicBucket}
`;
  const result = spawnSync(
    "docker",
    ["run", "--rm", "--entrypoint", "/bin/sh", "minio/mc", "-c", command],
    {
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `MinIO CLI bootstrap failed: ${result.stderr || result.stdout || "unknown error"}`,
    );
  }
}

export async function bootstrapLocalStorage() {
  const config = getStorageConfig();
  const client = createStorageClient(config);
  let usedMinioCliFallback = false;

  try {
    await ensureBucket(client, config.publicBucket);
    await ensureBucket(client, config.privateBucket);
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "$metadata" in error &&
      typeof error.$metadata === "object" &&
      error.$metadata !== null &&
      "httpStatusCode" in error.$metadata
        ? error.$metadata.httpStatusCode
        : undefined;

    if (statusCode !== 501) {
      throw error;
    }

    bootstrapMinioWithCli(config);
    usedMinioCliFallback = true;
  }

  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: config.publicBucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["PUT", "GET", "HEAD"],
              AllowedOrigins: ["*"],
            },
          ],
        },
      }),
    );
    await client.send(
      new PutBucketCorsCommand({
        Bucket: config.privateBucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["PUT", "GET", "HEAD"],
              AllowedOrigins: ["*"],
            },
          ],
        },
      }),
    );
    await client.send(
      new PutBucketPolicyCommand({
        Bucket: config.publicBucket,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "PublicReadProfileAssets",
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${config.publicBucket}/*`],
            },
          ],
        }),
      }),
    );
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "$metadata" in error &&
      typeof error.$metadata === "object" &&
      error.$metadata !== null &&
      "httpStatusCode" in error.$metadata
        ? error.$metadata.httpStatusCode
        : undefined;

    if (statusCode !== 501) {
      throw error;
    }

    if (!usedMinioCliFallback) {
      bootstrapMinioWithCli(config);
    }
  }

  return {
    privateBucket: config.privateBucket,
    publicBucket: config.publicBucket,
    publicBaseUrl:
      config.publicBaseUrl ??
      config.endpoint ??
      `https://s3.${config.region}.amazonaws.com`,
  };
}
