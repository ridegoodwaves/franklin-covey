export type EmailRecipientInput = string | string[];

export interface EmailGuardConfig {
  appEnv?: string;
  emailMode?: string;
  emailOutboundEnabled?: string;
  emailAllowlist?: string;
}

export interface EmailGuardResult {
  allowed: boolean;
  reason?: string;
  recipients: string[];
  blockedRecipients: string[];
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === "true";
}

function normalizeRecipients(input: EmailRecipientInput): string[] {
  const rawList = Array.isArray(input) ? input : input.split(/[;,]/);
  const unique = new Set<string>();

  for (const raw of rawList) {
    const email = raw.trim().toLowerCase();
    if (email) unique.add(email);
  }

  return [...unique];
}

function parseAllowlist(value: string | undefined): Set<string> {
  if (!value) return new Set();
  const tokens = value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return new Set(tokens);
}

export function evaluateEmailGuard(
  recipientsInput: EmailRecipientInput,
  config: EmailGuardConfig = {}
): EmailGuardResult {
  const recipients = normalizeRecipients(recipientsInput);
  const appEnv = (config.appEnv ?? process.env.NEXT_PUBLIC_APP_ENV ?? "staging").toLowerCase();
  const emailMode = (config.emailMode ?? process.env.EMAIL_MODE ?? "").toLowerCase();
  const outboundEnabled = parseBoolean(
    config.emailOutboundEnabled ?? process.env.EMAIL_OUTBOUND_ENABLED,
    false
  );
  const allowlist = parseAllowlist(config.emailAllowlist ?? process.env.EMAIL_ALLOWLIST);

  if (recipients.length === 0) {
    return {
      allowed: false,
      reason: "No recipients provided.",
      recipients,
      blockedRecipients: [],
    };
  }

  if (!outboundEnabled) {
    return {
      allowed: false,
      reason: "Outbound email is disabled by EMAIL_OUTBOUND_ENABLED.",
      recipients,
      blockedRecipients: recipients,
    };
  }

  if (appEnv === "production") {
    if (emailMode !== "live") {
      return {
        allowed: false,
        reason: 'Production requires EMAIL_MODE="live".',
        recipients,
        blockedRecipients: recipients,
      };
    }
    return {
      allowed: true,
      recipients,
      blockedRecipients: [],
    };
  }

  if (emailMode !== "sandbox") {
    return {
      allowed: false,
      reason: 'Non-production requires EMAIL_MODE="sandbox".',
      recipients,
      blockedRecipients: recipients,
    };
  }

  if (allowlist.size === 0) {
    return {
      allowed: false,
      reason: "EMAIL_ALLOWLIST is empty in non-production.",
      recipients,
      blockedRecipients: recipients,
    };
  }

  const blockedRecipients = recipients.filter((recipient) => !allowlist.has(recipient));
  if (blockedRecipients.length > 0) {
    return {
      allowed: false,
      reason: "Recipient is not in EMAIL_ALLOWLIST.",
      recipients,
      blockedRecipients,
    };
  }

  return {
    allowed: true,
    recipients,
    blockedRecipients: [],
  };
}

export function assertEmailSendAllowed(
  recipientsInput: EmailRecipientInput,
  config: EmailGuardConfig = {}
): string[] {
  const result = evaluateEmailGuard(recipientsInput, config);
  if (!result.allowed) {
    const detail =
      result.blockedRecipients.length > 0
        ? ` Blocked: ${result.blockedRecipients.join(", ")}.`
        : "";
    throw new Error(`${result.reason ?? "Email guard blocked send."}${detail}`);
  }
  return result.recipients;
}
