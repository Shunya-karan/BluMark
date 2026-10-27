import "dotenv/config";
import { SignJWT, jwtVerify } from "jose";

const ISSUER = process.env.JWT_ISSUER || "blumark-api";
const AUDIENCE = process.env.JWT_AUDIENCE || "blumark-clients";
const secret = process.env.JWT_ACCESS_SECRET;
const key = secret ? new TextEncoder().encode(secret) : null;
const accessTokenTtl = Number(process.env.JWT_ACCESS_TTL_SECONDS || 900);

export function assertJwtConfig() {
  if (!secret || secret.startsWith("CHANGE_ME") || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("JWT_ACCESS_SECRET must contain at least 32 bytes.");
  }
  if (!Number.isInteger(accessTokenTtl) || accessTokenTtl < 300 || accessTokenTtl > 900) {
    throw new Error("JWT_ACCESS_TTL_SECONDS must be between 300 and 900.");
  }
}

export async function signAccessToken({ profileId, sessionId, now = new Date() }) {
  if (!key) throw new Error("JWT signing key is not configured.");
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ sid: sessionId, typ: "access" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(profileId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + accessTokenTtl)
    .sign(key);
}

export async function verifyAccessToken(token) {
  if (!key) throw new Error("JWT signing key is not configured.");
  const { payload, protectedHeader } = await jwtVerify(token, key, {
    algorithms: ["HS256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (protectedHeader.alg !== "HS256" || payload.typ !== "access" ||
      typeof payload.sub !== "string" || typeof payload.sid !== "string") {
    throw new Error("Invalid access token claims.");
  }
  return payload;
}

export function getAccessTokenTtl() {
  return accessTokenTtl;
}

