// Shared API contract types for the public site and admin panel.
// Backend (Lambda) must return these exact shapes. See ./README.md.

/** Opaque pagination cursor (DynamoDB LastEvaluatedKey, base64-encoded). */
export type Cursor = string | null;

export interface Paginated<T> {
  items: T[];
  nextCursor: Cursor;
}

/* ------------------------------- Comments ------------------------------- */

export interface CommentReply {
  content: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** Comment as shown publicly — never includes the author's email. */
export interface PublicComment {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  reply?: CommentReply;
}

export type CommentStatus = "visible" | "hidden";

/** Comment as seen by the shop owner — adds email + moderation status. */
export interface AdminComment extends PublicComment {
  email: string;
  status: CommentStatus;
}

/** Payload for submitting a new public comment. */
export interface NewComment {
  name: string;
  email: string;
  content: string;
  /** Token from hCaptcha/Turnstile; verified server-side before writing. */
  captchaToken: string;
}

/* -------------------------------- Images -------------------------------- */

/** Image as shown in the public gallery (CloudFront-served WebP). */
export interface GalleryImage {
  id: string;
  url: string;
  width: number;
  height: number;
  alt?: string;
}

/** Image as managed in admin — adds storage key + metadata. */
export interface AdminImage extends GalleryImage {
  objectKey: string;
  createdAt: string;
  sizeBytes: number;
}

export interface UploadUrlRequest {
  fileName: string;
  contentType: string;
  /** Original file size in bytes (server enforces the max). */
  size: number;
}

export interface UploadUrlResponse {
  /** Presigned S3 URL to PUT the original file to. */
  uploadUrl: string;
  imageId: string;
  objectKey: string;
}

/** Registers an uploaded object so the backend can generate the WebP variant. */
export interface RegisterImageRequest {
  imageId: string;
  objectKey: string;
  alt?: string;
}

/* -------------------------------- Errors -------------------------------- */

export interface ApiErrorBody {
  error: { code: string; message: string };
}
