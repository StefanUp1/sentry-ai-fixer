import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify Sentry Integration Platform webhook signature.
 * @see https://docs.sentry.io/organization/integrations/integration-platform/webhooks/
 *
 * Uses the **raw** request body bytes (UTF-8 string) — do not re-serialize JSON.
 */
export function verifySentryWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  clientSecret: string,
): boolean {
  if (!signatureHeader || !clientSecret) {
    return false;
  }

  const trimmed = signatureHeader.trim();
  const hexDigest = trimmed.startsWith("sha256=")
    ? trimmed.slice("sha256=".length)
    : trimmed;

  if (!/^[0-9a-f]+$/i.test(hexDigest)) {
    return false;
  }

  const hmac = createHmac("sha256", clientSecret);
  hmac.update(rawBody, "utf8");
  const expected = hmac.digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hexDigest, "hex"));
  } catch {
    return false;
  }
}
