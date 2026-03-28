export type NormalizedSentryIssue = {
  sentryIssueId: string;
  title: string | null;
  culprit: string | null;
  fingerprint: string | null;
};

/**
 * Map Sentry webhook JSON to fields we persist. Supports common automation triggers.
 * Returns null when the payload has no issue id (or unsupported resource).
 */
export function normalizeSentryWebhookPayload(
  resource: string | undefined,
  body: Record<string, unknown>,
): NormalizedSentryIssue | null {
  if (resource === "issue") {
    const data = body.data as Record<string, unknown> | undefined;
    const issue = data?.issue as Record<string, unknown> | undefined;
    const id = issue?.id;
    if (typeof id !== "string" || !id) {
      return null;
    }
    return {
      sentryIssueId: id,
      title: typeof issue.title === "string" ? issue.title : null,
      culprit: typeof issue.culprit === "string" ? issue.culprit : null,
      fingerprint: null,
    };
  }

  if (resource === "event_alert") {
    const data = body.data as Record<string, unknown> | undefined;
    const event = data?.event as Record<string, unknown> | undefined;
    const id = event?.issue_id;
    if (typeof id !== "string" || !id) {
      return null;
    }
    let fingerprint: string | null = null;
    const hashes = event.hashes;
    if (Array.isArray(hashes) && typeof hashes[0] === "string") {
      fingerprint = hashes[0];
    }
    return {
      sentryIssueId: id,
      title: typeof event.title === "string" ? event.title : null,
      culprit: typeof event.culprit === "string" ? event.culprit : null,
      fingerprint,
    };
  }

  return null;
}

/** Resources we acknowledge without creating automation rows (lifecycle / noise). */
export function isIgnorableSentryResource(resource: string | undefined): boolean {
  if (!resource) {
    return true;
  }
  return (
    resource === "installation" ||
    resource === "comment" ||
    resource === "metric_alert"
  );
}
