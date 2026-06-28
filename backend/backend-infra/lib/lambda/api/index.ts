import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

// ===================== CONFIG =====================
const TABLE_NAME = process.env.TABLE_NAME!;
const USER_POOL_ID = process.env.USER_POOL_ID!;
const REGION = process.env.AWS_REGION || "eu-central-1";
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET!;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ===================== JWKS (Cognito verify) =====================
const client = jwksClient({
  jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, function (err, key: any) {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

function verifyToken(token: string): Promise<any> {
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
      }
    );
  });
}

// ===================== CAPTCHA VERIFY =====================
async function verifyCaptcha(token: string) {
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
      }),
    }
  );

  const data = await res.json();
  return data.success === true;
}

// ===================== HELPERS =====================
function response(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
    body: JSON.stringify(body),
  };
}

function parseCursor(cursor?: string) {
  if (!cursor) return undefined;
  return JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
}

function encodeCursor(lastKey?: any) {
  if (!lastKey) return null;
  return Buffer.from(JSON.stringify(lastKey)).toString("base64");
}

// ===================== ROUTER =====================
export const handler = async (event: any) => {
  try {
    const method = event.requestContext.http.method;
    const path = event.rawPath;

    const body = event.body ? JSON.parse(event.body) : {};
    const query = event.queryStringParameters || {};

    const authHeader = event.headers?.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    const isAdminRoute = path.startsWith("/admin");

    let user: any = null;

    if (isAdminRoute) {
      if (!token) {
        return response(401, { error: { code: "unauthorized", message: "Missing token" } });
      }
      user = await verifyToken(token);
    }

    // ===================== PUBLIC: GET COMMENTS =====================
    if (method === "GET" && path === "/comments") {
      const limit = Number(query.limit || 10);
      const cursor = parseCursor(query.cursor);

      const res = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": "COMMENT",
          },
          ScanIndexForward: false,
          Limit: limit,
          ExclusiveStartKey: cursor,
        })
      );

      const items = (res.Items || [])
        .filter((i: any) => i.status === "visible")
        .map((i: any) => ({
          id: i.id,
          name: i.name,
          content: i.content,
          createdAt: i.createdAt,
          reply: i.replyContent
            ? {
                content: i.replyContent,
                createdAt: i.replyCreatedAt,
              }
            : undefined,
        }));

      return response(200, {
        items,
        nextCursor: encodeCursor(res.LastEvaluatedKey),
      });
    }

    // ===================== PUBLIC: POST COMMENT =====================
    if (method === "POST" && path === "/comments") {
      const { name, email, content, captchaToken } = body;

      if (!name || !email || !content) {
        return response(400, {
          error: { code: "invalid_body", message: "Missing fields" },
        });
      }

      const captchaOk = await verifyCaptcha(captchaToken);
      if (!captchaOk) {
        return response(400, {
          error: { code: "captcha_failed", message: "Invalid captcha" },
        });
      }

      const item = {
        PK: "COMMENT",
        SK: `${new Date().toISOString()}#${randomUUID()}`,
        id: randomUUID(),
        name,
        email,
        content,
        status: "visible",
        createdAt: new Date().toISOString(),
        GSI1PK: "CMT#visible",
        GSI1SK: new Date().toISOString(),
      };

      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

      return response(201, {
        comment: {
          id: item.id,
          name,
          content,
          createdAt: item.createdAt,
        },
      });
    }

    // ===================== PUBLIC: GET IMAGES =====================
    if (method === "GET" && path === "/images") {
      const limit = Number(query.limit || 12);
      const cursor = parseCursor(query.cursor);
      const category = query.category;

      const res = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": "IMAGE",
          },
          Limit: limit,
          ExclusiveStartKey: cursor,
        })
      );

      let items = res.Items || [];

      if (category) {
        items = items.filter((i: any) => i.category === category);
      }

      return response(200, {
        items: items.map((i: any) => ({
          id: i.id,
          url: i.url,
          thumbUrl: i.thumbUrl,
          width: i.width,
          height: i.height,
          category: i.category,
          alt: i.alt,
        })),
        nextCursor: encodeCursor(res.LastEvaluatedKey),
      });
    }

    // ===================== ADMIN: REPLY COMMENT =====================
    if (method === "POST" && path.match(/^\/admin\/comments\/[^/]+\/reply$/)) {
      const id = path.split("/")[3];

      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: "COMMENT", SK: id },
          UpdateExpression: "set replyContent = :r, replyCreatedAt = :t",
          ExpressionAttributeValues: {
            ":r": body.content,
            ":t": new Date().toISOString(),
          },
        })
      );

      return response(200, { ok: true });
    }

    // ===================== ADMIN: UPDATE STATUS =====================
    if (method === "PATCH" && path.startsWith("/admin/comments/")) {
      const id = path.split("/")[3];

      const status = body.status;

      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: "COMMENT", SK: id },
          UpdateExpression:
            "set #s = :s, GSI1PK = :gpk",
          ExpressionAttributeNames: {
            "#s": "status",
          },
          ExpressionAttributeValues: {
            ":s": status,
            ":gpk": `CMT#${status}`,
          },
        })
      );

      return response(200, { ok: true });
    }

    // ===================== ADMIN: DELETE COMMENT =====================
    if (method === "DELETE" && path.startsWith("/admin/comments/")) {
      const id = path.split("/")[3];

      await ddb.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: "COMMENT", SK: id },
        })
      );

      return response(204, {});
    }

    // ===================== DEFAULT =====================
    return response(404, {
      error: { code: "not_found", message: "Route not found" },
    });
  } catch (err: any) {
    console.error(err);
    return response(500, {
      error: { code: "internal_error", message: err.message },
    });
  }
};