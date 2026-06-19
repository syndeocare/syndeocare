import { BACKEND_CONFIG } from "@/config/backend";
import {
  getGatewayAuthorizationHeaders,
  getStoredAccessToken,
} from "@/lib/auth-backend";
import { optimizeImage } from "@/lib/imageOptimization";

type StorageBucket = "documents" | "avatars" | "chat-media";

interface StorageUploadResponse {
  bucket: StorageBucket;
  fileUrl: string;
  objectKey: string;
  publicUrl: string | null;
}

export type UploadPersistenceBackend = "gateway" | "legacy";

export interface DocumentUploadResult {
  fileUrl: string;
  objectKey: string;
  backend: UploadPersistenceBackend;
}

export interface AvatarUploadResult {
  url: string;
  backend: UploadPersistenceBackend;
}

interface DocumentAccessResponse {
  signedUrl: string;
}

interface GatewayUploadDescriptor {
  bucket: string;
  key: string;
  uploadMethod: "PUT";
  uploadUrl: string;
  uploadHeaders: {
    "content-type": string;
  };
}

interface CompleteProfileImageUploadResponse {
  assetUrl: string;
}

const S3_URI_PREFIX = "s3://";
const S3_PUBLIC_URL_PATTERN =
  /^https:\/\/[^/]+\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com\/.+$/i;
const API_GATEWAY_BASE_URL = BACKEND_CONFIG.apiGatewayBaseUrl;

const getGatewayAccessToken = () => {
  const gatewayAccessToken = getStoredAccessToken();

  if (gatewayAccessToken) {
    return gatewayAccessToken;
  }

  return null;
};

const getStorageFunctionHeaders = async () => {
  const gatewayHeaders = getGatewayAuthorizationHeaders();

  if (gatewayHeaders) {
    return gatewayHeaders;
  }

  throw new Error("Please sign in again to continue.");
};

const invokeStorageFunction = async <T>(
  _path: string,
  _init: Omit<RequestInit, "headers"> & { headers?: HeadersInit },
): Promise<T> => {
  throw new Error("Legacy storage functions have been removed.");
};

const invokeGatewayJson = async <T>(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: HeadersInit },
): Promise<T> => {
  if (!API_GATEWAY_BASE_URL) {
    throw new Error("API gateway is not configured.");
  }

  const gatewayHeaders = getGatewayAuthorizationHeaders();

  if (!gatewayHeaders) {
    throw new Error("API gateway session is not available.");
  }

  const response = await fetch(`${API_GATEWAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...gatewayHeaders,
      ...init.headers,
    },
  });
  const rawText = await response.text();
  const payload = rawText
    ? (JSON.parse(rawText) as Record<string, unknown>)
    : null;

  if (!response.ok) {
    throw new Error(
      (payload && typeof payload.message === "string" && payload.message) ||
        "Storage request failed",
    );
  }

  return payload as T;
};

const canUseGatewayStorage = () =>
  Boolean(API_GATEWAY_BASE_URL && getGatewayAccessToken());

const shouldFallbackToLegacyStorage = (error: unknown) =>
  error instanceof Error &&
  (error.message === "API gateway session is not available." ||
    error.message === "Failed to fetch" ||
    error.message === "File upload failed.");

const uploadWithGatewayDescriptor = async (
  descriptor: GatewayUploadDescriptor,
  file: File,
) => {
  let response: Response;

  try {
    response = await fetch(descriptor.uploadUrl, {
      method: descriptor.uploadMethod,
      headers: descriptor.uploadHeaders,
      body: file,
    });
  } catch {
    throw new Error("Failed to fetch");
  }

  if (!response.ok) {
    throw new Error("File upload failed.");
  }
};

const uploadViaStorageFunction = async ({
  bucket,
  context,
  file,
}: {
  bucket: StorageBucket;
  context: string;
  file: File;
}) => {
  const formData = new FormData();
  formData.append("bucket", bucket);
  formData.append("context", context);
  formData.append("file", file);

  return invokeStorageFunction<StorageUploadResponse>("storage-upload", {
    method: "POST",
    body: formData,
  });
};

export const uploadDocumentToStorage = async (file: File, context: string) => {
  if (canUseGatewayStorage()) {
    try {
      const descriptor = await invokeGatewayJson<GatewayUploadDescriptor>(
        "/uploads/verification-document",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
          }),
        },
      );

      await uploadWithGatewayDescriptor(descriptor, file);

      await invokeGatewayJson("/uploads/verification-document/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bucket: descriptor.bucket,
          key: descriptor.key,
          documentType: context,
        }),
      });

      return {
        fileUrl: `s3://${descriptor.bucket}/${descriptor.key}`,
        objectKey: descriptor.key,
        backend: "gateway" as const,
      };
    } catch (error) {
      if (!shouldFallbackToLegacyStorage(error)) {
        throw error;
      }

      throw error;
    }
  }

  throw new Error("Document upload requires an active API gateway session.");
};

export const uploadAvatarToStorage = async (
  file: File,
  variant: "avatar" | "logo" = "avatar",
) => {
  const normalizedFile =
    file.type.startsWith("image/") &&
    file.type !== "image/gif" &&
    file.type !== "image/svg+xml"
      ? await optimizeImage(file, {
          maxWidthOrHeight: 512,
          maxSizeMB: 0.4,
          quality: 0.88,
          mimeType: "image/jpeg",
        })
      : file;

  if (API_GATEWAY_BASE_URL) {
    try {
      const descriptor = await invokeGatewayJson<GatewayUploadDescriptor>(
        "/uploads/profile-image",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fileName: normalizedFile.name,
            contentType: normalizedFile.type || "application/octet-stream",
          }),
        },
      );

      await uploadWithGatewayDescriptor(descriptor, normalizedFile);

      const completed =
        await invokeGatewayJson<CompleteProfileImageUploadResponse>(
          "/uploads/profile-image/complete",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              bucket: descriptor.bucket,
              key: descriptor.key,
            }),
          },
        );

      return {
        url: completed.assetUrl,
        backend: "gateway" as const,
      };
    } catch (error) {
      if (!shouldFallbackToLegacyStorage(error)) {
        throw error;
      }

      throw error;
    }
  }

  throw new Error(
    "Profile image upload requires an active API gateway session.",
  );
};

export const uploadChatMediaToStorage = async (
  file: File,
  conversationId: string,
) => {
  void file;
  void conversationId;
  throw new Error("Chat media upload is not available in the gateway yet.");
};

export const isS3StorageUri = (
  value: string | null | undefined,
): value is string =>
  typeof value === "string" && value.startsWith(S3_URI_PREFIX);

export const isPublicS3Url = (
  value: string | null | undefined,
): value is string =>
  typeof value === "string" && S3_PUBLIC_URL_PATTERN.test(value);

export const resolveMediaUrl = (fileUrl: string | null | undefined) => {
  if (!fileUrl) {
    return null;
  }

  if (!isPublicS3Url(fileUrl)) {
    return fileUrl;
  }

  return fileUrl;
};

export const getDocumentAccessUrl = async (fileUrl: string) => {
  if (isS3StorageUri(fileUrl)) {
    if (canUseGatewayStorage()) {
      try {
        const { signedUrl } = await invokeGatewayJson<DocumentAccessResponse>(
          "/uploads/verification-document/access",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fileUrl }),
          },
        );

        return signedUrl;
      } catch (error) {
        if (!shouldFallbackToLegacyStorage(error)) {
          throw error;
        }

        throw error;
      }
    }

    throw new Error("Document access requires an active API gateway session.");
  }

  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  return fileUrl;
};
