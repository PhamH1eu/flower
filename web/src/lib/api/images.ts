import { apiFetch } from "./client";
import type {
  AdminImage,
  GalleryImage,
  ImageCategory,
  LandingImageSlot,
  Paginated,
  RegisterImageRequest,
  UpdateImageRequest,
  UploadUrlRequest,
  UploadUrlResponse,
} from "./types";

/* -------------------------------- Public -------------------------------- */

export function listImages(
  params: {
    cursor?: string;
    limit?: number;
    category?: ImageCategory;
    landingSlot?: LandingImageSlot;
  } = {},
  signal?: AbortSignal,
) {
  return apiFetch<Paginated<GalleryImage>>("/images", { query: params, signal });
}

/* -------------------------- Admin (Cognito auth) ------------------------- */

export function listAdminImages(
  token: string,
  params: { cursor?: string; limit?: number } = {},
) {
  return apiFetch<Paginated<AdminImage>>("/admin/images", { token, query: params });
}

/** Step 1: ask the backend for a presigned S3 URL to upload the original to. */
export function requestUploadUrl(token: string, input: UploadUrlRequest) {
  return apiFetch<UploadUrlResponse>("/admin/images/upload-url", {
    method: "POST",
    body: input,
    token,
  });
}

/** Step 2: PUT the file straight to S3 using the presigned URL. */
export async function uploadToS3(
  uploadUrl: string,
  file: File,
  signal?: AbortSignal,
) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
    signal,
  });
  if (!res.ok) {
    throw new Error(`S3 upload failed: ${res.status} ${res.statusText}`);
  }
}

/** Step 3: register the uploaded object so the backend generates the WebP. */
export function registerImage(token: string, input: RegisterImageRequest) {
  return apiFetch<AdminImage>("/admin/images", {
    method: "POST",
    body: input,
    token,
  });
}

export function updateImage(token: string, id: string, input: UpdateImageRequest) {
  return apiFetch<AdminImage>(`/admin/images/${id}`, {
    method: "PATCH",
    body: input,
    token,
  });
}

export function reprocessImage(token: string, id: string) {
  return apiFetch<AdminImage>(`/admin/images/${id}/reprocess`, {
    method: "POST",
    token,
  });
}

export function deleteImage(token: string, id: string) {
  return apiFetch<void>(`/admin/images/${id}`, { method: "DELETE", token });
}
