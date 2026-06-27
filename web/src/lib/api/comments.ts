import { apiFetch } from "./client";
import type {
  AdminComment,
  CommentStatus,
  NewComment,
  Paginated,
  PublicComment,
} from "./types";

/* -------------------------------- Public -------------------------------- */

export function listComments(
  params: { cursor?: string; limit?: number } = {},
  signal?: AbortSignal,
) {
  return apiFetch<Paginated<PublicComment>>("/comments", {
    query: params,
    signal,
  });
}

export function createComment(input: NewComment) {
  return apiFetch<{ comment: PublicComment }>("/comments", {
    method: "POST",
    body: input,
  });
}

/* -------------------------- Admin (Cognito auth) ------------------------- */

export function listAdminComments(
  token: string,
  params: { cursor?: string; limit?: number; status?: CommentStatus } = {},
) {
  return apiFetch<Paginated<AdminComment>>("/admin/comments", {
    token,
    query: params,
  });
}

export function replyToComment(token: string, id: string, content: string) {
  return apiFetch<AdminComment>(`/admin/comments/${id}/reply`, {
    method: "POST",
    body: { content },
    token,
  });
}

export function setCommentStatus(
  token: string,
  id: string,
  status: CommentStatus,
) {
  return apiFetch<AdminComment>(`/admin/comments/${id}`, {
    method: "PATCH",
    body: { status },
    token,
  });
}

export function deleteComment(token: string, id: string) {
  return apiFetch<void>(`/admin/comments/${id}`, { method: "DELETE", token });
}
