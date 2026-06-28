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

### `GET /images?cursor&limit&category`
```jsonc
{ "items": [ { "id", "url", "thumbUrl", "width", "height",
              "category": "wedding"|"birthday"|"funeral"|"other", "alt"? } ],
  "nextCursor": ... }
```
`url` = WebP full (lightbox), `thumbUrl` = WebP thumbnail (grid) — đều là link CloudFront.
`?category=` (tùy chọn) lọc theo nhóm; bỏ trống = tất cả (tab "All" của gallery).

## Admin endpoints (Cognito)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/admin/comments?cursor&limit&status` | — | `Paginated<AdminComment>` |
| POST | `/admin/comments/:id/reply` | `{ content }` | `AdminComment` |
| PATCH | `/admin/comments/:id` | `{ status: "visible"\|"hidden" }` | `AdminComment` |
| DELETE | `/admin/comments/:id` | — | `204` |
| GET | `/admin/images?cursor&limit` | — | `Paginated<AdminImage>` |
| POST | `/admin/images/upload-url` | `{ fileName, contentType, size }` | `{ uploadUrl, imageId, objectKey }` |
| POST | `/admin/images` | `{ imageId, objectKey, category, alt? }` | `AdminImage` |
| DELETE | `/admin/images/:id` | — | `204` |

`AdminComment` = `PublicComment` + `{ email, status }`.

### Flow upload ảnh (3 bước)
1. `POST /admin/images/upload-url` → nhận presigned URL.
2. Frontend `PUT` file gốc thẳng lên S3 bằng URL đó.
3. `POST /admin/images` đăng ký (kèm `category`) → Lambda sinh WebP, lưu metadata.

Giới hạn kích thước file enforce ở bước 1 (hiện tài liệu ghi tối đa 5MB/ảnh).

### 📌 NOTE cho teammate — tính năng "Gallery theo category" (FE đã làm tab lọc)
Gallery công khai giờ có tab lọc: **All / Cưới / Sinh nhật & tiệc / Tang lễ**. Để
chạy với dữ liệu thật, **backend + admin cần**:
1. **DynamoDB**: ảnh có thêm thuộc tính `category` ∈ `wedding|birthday|funeral|other`.
   Nên có **GSI lọc theo category** (vd `GSI2PK = "IMG#<category>"`, SK = `<createdAt>`)
   để `GET /images?category=` query thẳng, không scan.
2. **Admin upload**: form `/admin/images` cho chủ shop **chọn category** khi đăng,
   rồi gửi trong `POST /admin/images` (field `category` — xem `RegisterImageRequest`).
3. **`GET /images?category=`**: lọc theo category; bỏ trống = trả tất cả.
4. `image-processor` **không** set category (API Lambda set lúc register); processor
   chỉ cần giữ nguyên `category` đã có trên row.

## Ghi chú bảo mật
- Auth admin frontend dùng AWS Cognito qua Amplify (`lib/adminAuth.ts`); access token Cognito truyền vào tham số `token` của các hàm admin.
- Email bình luận chỉ xuất hiện ở endpoint `/admin/*`, không bao giờ ở public.
- CAPTCHA verify **bắt buộc** ở server trước khi ghi, không tin client.
