# API Contract

Giao diện giữa frontend (Next.js) và backend (AWS Lambda). Frontend gọi qua
các hàm trong thư mục này; backend phải trả đúng shape trong [`types.ts`](./types.ts).

## Cấu hình

- **Base URL**: biến môi trường `NEXT_PUBLIC_API_URL` (API Gateway hoặc Lambda Function URL).
- **Content-Type**: `application/json` (trừ upload ảnh — PUT thẳng lên S3).
- **Auth**: endpoint `/admin/*` yêu cầu header `Authorization: Bearer <Cognito token>`.
- **Phân trang**: cursor-based. Response có `nextCursor` (base64 của `LastEvaluatedKey`),
  truyền lại qua `?cursor=`. `nextCursor: null` nghĩa là hết.
- **Lỗi**: HTTP status phù hợp + body `{ "error": { "code": string, "message": string } }`.

## Public endpoints

### `GET /comments?cursor&limit`
Chỉ trả bình luận `status = visible`. **Không bao giờ trả `email`.**
```jsonc
{ "items": [ { "id", "name", "content", "createdAt",
              "reply": { "content", "createdAt" } /* optional */ } ],
  "nextCursor": "..." | null }
```

### `POST /comments`
```jsonc
// body
{ "name", "email", "content", "captchaToken" }
```
Lambda: **verify CAPTCHA** (hCaptcha/Turnstile) → validate định dạng email
(không xác minh tồn tại) → ghi DynamoDB → đăng ngay, không duyệt.
→ `201 { "comment": PublicComment }`. CAPTCHA sai → `400 { error.code: "captcha_failed" }`.

### `GET /images?cursor&limit`
```jsonc
{ "items": [ { "id", "url", "width", "height", "alt"? } ], "nextCursor": ... }
```
`url` là link CloudFront tới bản **WebP** đã tối ưu.

## Admin endpoints (Cognito)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/admin/comments?cursor&limit&status` | — | `Paginated<AdminComment>` |
| POST | `/admin/comments/:id/reply` | `{ content }` | `AdminComment` |
| PATCH | `/admin/comments/:id` | `{ status: "visible"\|"hidden" }` | `AdminComment` |
| DELETE | `/admin/comments/:id` | — | `204` |
| GET | `/admin/images?cursor&limit` | — | `Paginated<AdminImage>` |
| POST | `/admin/images/upload-url` | `{ fileName, contentType, size }` | `{ uploadUrl, imageId, objectKey }` |
| POST | `/admin/images` | `{ imageId, objectKey, alt? }` | `AdminImage` |
| DELETE | `/admin/images/:id` | — | `204` |

`AdminComment` = `PublicComment` + `{ email, status }`.

### Flow upload ảnh (3 bước)
1. `POST /admin/images/upload-url` → nhận presigned URL.
2. Frontend `PUT` file gốc thẳng lên S3 bằng URL đó.
3. `POST /admin/images` đăng ký → Lambda sinh bản WebP, lưu metadata vào DynamoDB.

Giới hạn kích thước file enforce ở bước 1 (hiện tài liệu ghi tối đa 5MB/ảnh).

## Ghi chú bảo mật
- Auth admin frontend hiện là **demo localStorage** (`lib/adminAuth.ts`) — phải
  thay bằng Cognito thật; token Cognito truyền vào tham số `token` của các hàm admin.
- Email bình luận chỉ xuất hiện ở endpoint `/admin/*`, không bao giờ ở public.
- CAPTCHA verify **bắt buộc** ở server trước khi ghi, không tin client.
