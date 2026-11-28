import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { TOTP } from "otpauth";

// Operators enroll each administrator out of band using the immutable user ID.
export function adminAuthenticator(config: ConfigService, id: string) {
  const raw = config.get<string>("ADMIN_TOTP_SECRETS");
  if (!raw) return null;
  const keys: unknown = JSON.parse(raw);
  if (!keys || typeof keys !== "object" || !Object.hasOwn(keys, id)) return null;
  const secret: unknown = (keys as Record<string, unknown>)[id];
  if (typeof secret !== "string" || !/^[A-Z2-7]{32}$/.test(secret)) return null;
  const totp = new TOTP({ secret, digits: 6, period: 30, algorithm: "SHA1" });
  const binding = createHash("sha256").update(id).update(":").update(secret).digest("base64url");
  return { totp, binding };
}
