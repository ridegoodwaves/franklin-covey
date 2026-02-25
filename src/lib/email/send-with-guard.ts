import type { EmailGuardConfig, EmailRecipientInput } from "@/lib/email/guard";
import { assertEmailSendAllowed } from "@/lib/email/guard";

export interface GuardedEmailPayload {
  to: EmailRecipientInput;
  subject: string;
  text?: string;
  html?: string;
}

export type EmailSender<T = unknown> = (payload: GuardedEmailPayload) => Promise<T>;

export async function sendWithEmailGuard<T>(
  payload: GuardedEmailPayload,
  sender: EmailSender<T>,
  config?: EmailGuardConfig
): Promise<T> {
  const normalizedRecipients = assertEmailSendAllowed(payload.to, config);
  return sender({
    ...payload,
    to: normalizedRecipients,
  });
}
