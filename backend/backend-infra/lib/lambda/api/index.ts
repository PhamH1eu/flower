import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const TABLE_NAME = requireEnv("TABLE_NAME");
const USER_POOL_ID = requireEnv("USER_POOL_ID");
const TURNSTILE_SECRET = requireEnv("TURNSTILE_SECRET");
const BUCKET = requireEnv("BUCKET");
const REGION = process.env.AWS_REGION || "eu-central-1";
const UPLOADS_PREFIX = process.env.UPLOADS_PREFIX ?? "uploads/";
const PUBLIC_PREFIX = process.env.PUBLIC_PREFIX ?? "public/";
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? "5242880");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const s3 = new S3Client({ region: REGION });

type CommentStatus = "visible" | "hidden";
type ImageCategory = "wedding" | "birthday" | "funeral" | "other";
type LandingImageSlot =
  | "hero"
  | "about"
  | "wedding"
  | "birthday"
  | "funeral"
  | "featured";
type JsonObject = Record<string, unknown>;
type ShopSettings = {
  storeName: string;
  phone: string;
  address: string;
  googleMapsUrl: string;
  openingHours: string;
  locale: string;
};

const validCommentStatuses = new Set<CommentStatus>(["visible", "hidden"]);
const validImageCategories = new Set<ImageCategory>([
  "wedding",
  "birthday",
  "funeral",
  "other",
]);
const validLandingImageSlots = new Set<LandingImageSlot>([
  "hero",
  "about",
  "wedding",
  "birthday",
  "funeral",
  "featured",
]);
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const defaultShopSettings: ShopSettings = {
  storeName: "Tường Vi Flower",
  phone: "+49 171 123 4567",
  address: "Hauptstraße 14, 10115 Berlin",
  googleMapsUrl: "https://www.google.com/maps/place/Berlin",
  openingHours: "Thứ 2 - Thứ 7: 8:00 - 19:00\nChủ nhật: 9:00 - 17:00",
  locale: "vi",
};

const client = jwksClient({
  jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
}

function verifyToken(token: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      },
    );
  });
}

async function verifyCaptcha(token: string): Promise<boolean> {
  if (!token) return false;

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
      }),
    },
  );

  const data: unknown = await res.json();
  return isRecord(data) && data.success === true;
}

function ok(statusCode: number, body: unknown = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function error(statusCode: number, code: string, message: string) {
  return ok(statusCode, { error: { code, message } });
}

function encodeCursor(lastKey?: Record<string, unknown>) {
  if (!lastKey) return null;
  return Buffer.from(JSON.stringify(lastKey)).toString("base64");
}

function parseCursor(cursor?: string) {
  if (!cursor) return undefined;
  return JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function bodyString(body: JsonObject, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

function shopSettings(item?: Record<string, any>): ShopSettings {
  return {
    storeName:
      typeof item?.storeName === "string" && item.storeName
        ? item.storeName
        : defaultShopSettings.storeName,
    phone:
      typeof item?.phone === "string" && item.phone
        ? item.phone
        : defaultShopSettings.phone,
    address:
      typeof item?.address === "string" && item.address
        ? item.address
        : defaultShopSettings.address,
    googleMapsUrl:
      typeof item?.googleMapsUrl === "string" && item.googleMapsUrl
        ? item.googleMapsUrl
        : defaultShopSettings.googleMapsUrl,
    openingHours:
      typeof item?.openingHours === "string" && item.openingHours
        ? item.openingHours
        : defaultShopSettings.openingHours,
    locale:
      typeof item?.locale === "string" && item.locale
        ? item.locale
        : defaultShopSettings.locale,
  };
}

async function getShopSettings() {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: "SETTINGS", SK: "SHOP" },
    }),
  );
  return shopSettings(res.Item);
}

function publicComment(item: Record<string, any>) {
  return {
    id: item.id,
    name: item.name,
    content: item.content,
    createdAt: item.createdAt,
    reply: item.replyContent
      ? {
          content: item.replyContent,
          createdAt: item.replyCreatedAt,
        }
      : undefined,
  };
}

function adminComment(item: Record<string, any>) {
  return {
    ...publicComment(item),
    email: item.email,
    status: item.status,
  };
}

function galleryImage(item: Record<string, any>) {
  return {
    id: item.id,
    url: normalizeCdnUrl(item.url),
    thumbUrl: normalizeCdnUrl(item.thumbUrl),
    category: item.category,
    width: item.width,
    height: item.height,
    alt: item.alt,
    landingSlot:
      typeof item.landingSlot === "string" &&
      validLandingImageSlots.has(item.landingSlot as LandingImageSlot)
        ? item.landingSlot
        : undefined,
  };
}

function normalizeCdnUrl(value: unknown) {
  if (typeof value !== "string") return value;
  return value.replace(/(https?:\/\/[^/]+)\/public\//, "$1/");
}

function adminImage(item: Record<string, any>) {
  return {
    ...galleryImage(item),
    objectKey: item.objectKey,
    createdAt: item.createdAt,
    sizeBytes: item.sizeBytes,
    status: item.status,
  };
}

async function findItemById(kind: "COMMENT" | "IMAGE", id: string) {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":pk": kind,
        ":id": id,
      },
    }),
  );
  return res.Items?.[0];
}

async function queryActiveImages(params: {
  category?: ImageCategory;
  landingSlot?: LandingImageSlot;
  limit: number;
  cursor?: Record<string, unknown>;
}) {
  const items: Record<string, any>[] = [];
  let lastKey = params.cursor;
  const filterParts = ["#s = :active"];
  const names: Record<string, string> = { "#s": "status" };
  const values: Record<string, unknown> = {
    ":pk": params.category ? `IMG#${params.category}` : "IMAGE",
    ":active": "active",
  };

  if (params.landingSlot) {
    filterParts.push("#landingSlot = :landingSlot");
    names["#landingSlot"] = "landingSlot";
    values[":landingSlot"] = params.landingSlot;
  }

  do {
    const remaining = params.limit - items.length;
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: params.category ? "byCategory" : undefined,
        KeyConditionExpression: params.category ? "GSI2PK = :pk" : "PK = :pk",
        FilterExpression: filterParts.join(" AND "),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        Limit: remaining,
        ExclusiveStartKey: lastKey,
        ScanIndexForward: false,
      }),
    );

    items.push(...(res.Items || []));
    lastKey = res.LastEvaluatedKey;
  } while (items.length < params.limit && lastKey);

  return {
    items,
    nextCursor: encodeCursor(lastKey),
  };
}

function imageKeyFromObjectKey(objectKey: string, imageId: string) {
  if (!objectKey.startsWith(UPLOADS_PREFIX)) return null;
  const fileName = objectKey.slice(UPLOADS_PREFIX.length);
  const suffix = `#${imageId}`;
  if (!fileName.endsWith(suffix)) return null;
  const createdAt = fileName.slice(0, -suffix.length);
  return { PK: "IMAGE", SK: `${createdAt}#${imageId}`, createdAt };
}

export const handler = async (event: any) => {
  try {
    const method = event.requestContext.http.method;
    const path = event.rawPath;

    if (method === "OPTIONS") return ok(204);

    const body = event.body ? JSON.parse(event.body) : {};
    const query = event.queryStringParameters || {};

    if (!isRecord(body)) {
      return error(400, "invalid_body", "JSON body must be an object");
    }

    if (path.startsWith("/admin")) {
      const authHeader = event.headers?.authorization || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (!token) return error(401, "missing_token", "Missing bearer token");
      try {
        await verifyToken(token);
      } catch {
        return error(401, "invalid_token", "Invalid or expired bearer token");
      }
    }

    if (method === "GET" && path === "/comments") {
      const limit = Number(query.limit || 10);
      const cursor = parseCursor(query.cursor);

      const res = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "byStatus",
          KeyConditionExpression: "GSI1PK = :pk",
          ExpressionAttributeValues: {
            ":pk": "CMT#visible",
          },
          Limit: limit,
          ExclusiveStartKey: cursor,
          ScanIndexForward: false,
        }),
      );

      return ok(200, {
        items: (res.Items || []).map(publicComment),
        nextCursor: encodeCursor(res.LastEvaluatedKey),
      });
    }

    if (method === "POST" && path === "/comments") {
      const name = bodyString(body, "name");
      const email = bodyString(body, "email");
      const content = bodyString(body, "content");
      const captchaToken = bodyString(body, "captchaToken");

      if (!name || !email || !content) {
        return error(400, "missing_fields", "Missing required fields");
      }

      const captchaOk = await verifyCaptcha(captchaToken);
      if (!captchaOk) {
        return error(400, "captcha_failed", "Captcha verification failed");
      }

      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const item = {
        PK: "COMMENT",
        SK: `${createdAt}#${id}`,
        id,
        name,
        email,
        content,
        status: "visible",
        createdAt,
        GSI1PK: "CMT#visible",
        GSI1SK: createdAt,
      };

      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
      return ok(201, { comment: publicComment(item) });
    }

    if (method === "GET" && path === "/images") {
      const limit = Number(query.limit || 12);
      const cursor = parseCursor(query.cursor);
      const category = query.category;
      const landingSlot = query.landingSlot;

      if (category && !validImageCategories.has(category)) {
        return error(400, "invalid_category", "Invalid image category");
      }
      if (landingSlot && !validLandingImageSlots.has(landingSlot)) {
        return error(400, "invalid_landing_slot", "Invalid landing image slot");
      }

      const res = await queryActiveImages({
        category: category as ImageCategory | undefined,
        landingSlot: landingSlot as LandingImageSlot | undefined,
        limit,
        cursor,
      });

      return ok(200, {
        items: res.items.map(galleryImage),
        nextCursor: res.nextCursor,
      });
    }

    if (method === "GET" && path === "/settings") {
      return ok(200, await getShopSettings());
    }

    if (method === "GET" && path === "/admin/comments") {
      const limit = Number(query.limit || 20);
      const cursor = parseCursor(query.cursor);
      const status = query.status;

      if (status && !validCommentStatuses.has(status)) {
        return error(400, "invalid_status", "Invalid comment status");
      }

      const res = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: status ? "byStatus" : undefined,
          KeyConditionExpression: status ? "GSI1PK = :pk" : "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": status ? `CMT#${status}` : "COMMENT",
          },
          Limit: limit,
          ExclusiveStartKey: cursor,
          ScanIndexForward: false,
        }),
      );

      return ok(200, {
        items: (res.Items || []).map(adminComment),
        nextCursor: encodeCursor(res.LastEvaluatedKey),
      });
    }

    if (method === "GET" && path === "/admin/settings") {
      return ok(200, await getShopSettings());
    }

    if (method === "PATCH" && path === "/admin/settings") {
      const nextSettings: ShopSettings = {
        storeName: bodyString(body, "storeName") || defaultShopSettings.storeName,
        phone: bodyString(body, "phone") || defaultShopSettings.phone,
        address: bodyString(body, "address") || defaultShopSettings.address,
        googleMapsUrl:
          bodyString(body, "googleMapsUrl") || defaultShopSettings.googleMapsUrl,
        openingHours:
          bodyString(body, "openingHours") || defaultShopSettings.openingHours,
        locale: bodyString(body, "locale") || defaultShopSettings.locale,
      };

      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: "SETTINGS",
            SK: "SHOP",
            ...nextSettings,
            updatedAt: new Date().toISOString(),
          },
        }),
      );

      return ok(200, nextSettings);
    }

    if (method === "POST" && /^\/admin\/comments\/[^/]+\/reply$/.test(path)) {
      const id = path.split("/")[3];
      const content = bodyString(body, "content");
      if (!content) return error(400, "missing_content", "Missing reply content");

      const item = await findItemById("COMMENT", id);
      if (!item) return error(404, "not_found", "Comment not found");

      const res = await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: item.PK, SK: item.SK },
          UpdateExpression: "SET replyContent = :r, replyCreatedAt = :t",
          ExpressionAttributeValues: {
            ":r": content,
            ":t": new Date().toISOString(),
          },
          ReturnValues: "ALL_NEW",
        }),
      );

      return ok(200, adminComment(res.Attributes || {}));
    }

    if (method === "PATCH" && /^\/admin\/comments\/[^/]+$/.test(path)) {
      const id = path.split("/")[3];
      const status = bodyString(body, "status") as CommentStatus;
      if (!validCommentStatuses.has(status)) {
        return error(400, "invalid_status", "Invalid comment status");
      }

      const item = await findItemById("COMMENT", id);
      if (!item) return error(404, "not_found", "Comment not found");

      const res = await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: item.PK, SK: item.SK },
          UpdateExpression: "SET #s = :s, GSI1PK = :g, GSI1SK = :t",
          ExpressionAttributeNames: {
            "#s": "status",
          },
          ExpressionAttributeValues: {
            ":s": status,
            ":g": `CMT#${status}`,
            ":t": item.createdAt,
          },
          ReturnValues: "ALL_NEW",
        }),
      );

      return ok(200, adminComment(res.Attributes || {}));
    }

    if (method === "DELETE" && /^\/admin\/comments\/[^/]+$/.test(path)) {
      const id = path.split("/")[3];
      const item = await findItemById("COMMENT", id);
      if (!item) return error(404, "not_found", "Comment not found");

      await ddb.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: item.PK, SK: item.SK },
        }),
      );

      return ok(204);
    }

    if (method === "GET" && path === "/admin/images") {
      const limit = Number(query.limit || 20);
      const cursor = parseCursor(query.cursor);

      const res = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": "IMAGE",
          },
          Limit: limit,
          ExclusiveStartKey: cursor,
          ScanIndexForward: false,
        }),
      );

      return ok(200, {
        items: (res.Items || []).map(adminImage),
        nextCursor: encodeCursor(res.LastEvaluatedKey),
      });
    }

    if (method === "POST" && path === "/admin/images/upload-url") {
      const fileName = bodyString(body, "fileName");
      const contentType = bodyString(body, "contentType");
      const size = Number(body.size);

      if (!fileName || !allowedImageTypes.has(contentType) || !size) {
        return error(400, "invalid_upload", "Invalid upload request");
      }
      if (size > MAX_UPLOAD_BYTES) {
        return error(400, "file_too_large", "Image exceeds the upload limit");
      }

      const imageId = randomUUID();
      const createdAt = new Date().toISOString();
      const objectKey = `${UPLOADS_PREFIX}${createdAt}#${imageId}`;

      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: "IMAGE",
            SK: `${createdAt}#${imageId}`,
            id: imageId,
            objectKey,
            sourceFileName: fileName,
            contentType,
            createdAt,
            status: "processing",
            width: 0,
            height: 0,
            sizeBytes: size,
          },
          ConditionExpression: "attribute_not_exists(PK)",
        }),
      );

      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: objectKey,
        ContentType: contentType,
      });
      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

      return ok(200, { uploadUrl, imageId, objectKey });
    }

    if (method === "POST" && path === "/admin/images") {
      const imageId = bodyString(body, "imageId");
      const objectKey = bodyString(body, "objectKey");
      const category = bodyString(body, "category") as ImageCategory;
      const landingSlot = bodyString(body, "landingSlot") as LandingImageSlot;
      const alt = bodyString(body, "alt");

      if (!imageId || !objectKey || !validImageCategories.has(category)) {
        return error(400, "invalid_image", "Invalid image registration");
      }
      if (landingSlot && !validLandingImageSlots.has(landingSlot)) {
        return error(400, "invalid_landing_slot", "Invalid landing image slot");
      }

      const key = imageKeyFromObjectKey(objectKey, imageId);
      if (!key) return error(400, "invalid_object_key", "Invalid object key");

      const current = await ddb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: key.PK, SK: key.SK },
        }),
      );
      if (!current.Item) return error(404, "not_found", "Image not found");

      const values: Record<string, unknown> = {
        ":c": category,
        ":g": `IMG#${category}`,
        ":t": key.createdAt,
      };
      const setParts = ["category = :c", "GSI2PK = :g", "GSI2SK = :t"];
      const removeParts: string[] = [];

      if (alt) values[":a"] = alt;
      if (landingSlot) values[":ls"] = landingSlot;

      if (alt) setParts.push("alt = :a");
      else removeParts.push("alt");

      if (landingSlot) setParts.push("landingSlot = :ls");
      else removeParts.push("landingSlot");

      const res = await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: key.PK, SK: key.SK },
          UpdateExpression: [
            `SET ${setParts.join(", ")}`,
            removeParts.length ? `REMOVE ${removeParts.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join(" "),
          ExpressionAttributeValues: values,
          ReturnValues: "ALL_NEW",
        }),
      );

      return ok(200, adminImage(res.Attributes || {}));
    }

    if (method === "PATCH" && /^\/admin\/images\/[^/]+$/.test(path)) {
      const id = path.split("/")[3];
      const category = bodyString(body, "category") as ImageCategory;
      const landingSlot = bodyString(body, "landingSlot") as LandingImageSlot;
      const alt = bodyString(body, "alt");

      if (!validImageCategories.has(category)) {
        return error(400, "invalid_category", "Invalid image category");
      }
      if (landingSlot && !validLandingImageSlots.has(landingSlot)) {
        return error(400, "invalid_landing_slot", "Invalid landing image slot");
      }

      const item = await findItemById("IMAGE", id);
      if (!item) return error(404, "not_found", "Image not found");

      const values: Record<string, unknown> = {
        ":c": category,
        ":g": `IMG#${category}`,
        ":t": item.createdAt ?? String(item.SK).split("#")[0],
      };
      const setParts = ["category = :c", "GSI2PK = :g", "GSI2SK = :t"];
      const removeParts: string[] = [];

      if (alt) {
        values[":a"] = alt;
        setParts.push("alt = :a");
      } else {
        removeParts.push("alt");
      }

      if (landingSlot) {
        values[":ls"] = landingSlot;
        setParts.push("landingSlot = :ls");
      } else {
        removeParts.push("landingSlot");
      }

      const res = await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: item.PK, SK: item.SK },
          UpdateExpression: [
            `SET ${setParts.join(", ")}`,
            removeParts.length ? `REMOVE ${removeParts.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join(" "),
          ExpressionAttributeValues: values,
          ReturnValues: "ALL_NEW",
        }),
      );

      return ok(200, adminImage(res.Attributes || {}));
    }

    if (method === "POST" && /^\/admin\/images\/[^/]+\/reprocess$/.test(path)) {
      const id = path.split("/")[3];
      const item = await findItemById("IMAGE", id);
      if (!item) return error(404, "not_found", "Image not found");
      if (typeof item.objectKey !== "string" || !item.objectKey.startsWith(UPLOADS_PREFIX)) {
        return error(400, "invalid_object_key", "Invalid original image key");
      }

      const head = await s3.send(
        new HeadObjectCommand({ Bucket: BUCKET, Key: item.objectKey }),
      );
      const original = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: item.objectKey }),
      );
      const bytes = Buffer.from(await original.Body!.transformToByteArray());

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: item.objectKey,
          Body: bytes,
          ContentType:
            head.ContentType ??
            (typeof item.contentType === "string" ? item.contentType : "application/octet-stream"),
        }),
      );

      return ok(200, adminImage(item));
    }

    if (method === "DELETE" && /^\/admin\/images\/[^/]+$/.test(path)) {
      const id = path.split("/")[3];
      const item = await findItemById("IMAGE", id);
      if (!item) return error(404, "not_found", "Image not found");

      const keysToDelete = [
        item.objectKey,
        `${PUBLIC_PREFIX}${id}.webp`,
        `${PUBLIC_PREFIX}${id}_thumb.webp`,
      ].filter((value): value is string => typeof value === "string" && value.length > 0);

      await Promise.all(
        keysToDelete.map((Key) =>
          s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key })),
        ),
      );
      await ddb.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: item.PK, SK: item.SK },
        }),
      );

      return ok(204);
    }

    return error(404, "not_found", "Route not found");
  } catch (err: any) {
    console.error(err);
    return error(500, "internal_error", err.message || "Internal error");
  }
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
