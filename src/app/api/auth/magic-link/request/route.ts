import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWithEmailGuard } from "@/lib/email/send-with-guard";
import { createMagicLinkToken } from "@/lib/server/session";

interface ResendResponse {
  id?: string;
  message?: string;
}

function resolveSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

async function sendViaResend(payload: {
  to: string[];
  subject: string;
  text: string;
  html: string;
}): Promise<ResendResponse> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and EMAIL_FROM are required to send magic links");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend send failed (${response.status}): ${body}`);
  }

  return (await response.json()) as ResendResponse;
}

export async function POST(request: NextRequest) {
  let email = "";

  try {
    const body = (await request.json()) as { email?: string };
    email = String(body.email || "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ success: false, error: "INVALID_EMAIL" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ success: false, error: "INVALID_EMAIL" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      active: true,
      role: {
        in: [UserRole.ADMIN, UserRole.COACH],
      },
      archivedAt: null,
    },
  });

  // Keep response non-enumerating for unknown emails.
  if (!user) {
    return NextResponse.json({ success: true });
  }

  const token = createMagicLinkToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const consumeUrl = new URL("/api/auth/magic-link/consume", resolveSiteUrl());
  consumeUrl.searchParams.set("token", token);

  const subject = "Your FranklinCovey sign-in link";
  const text = [
    "Use this secure sign-in link for your FranklinCovey coaching portal:",
    consumeUrl.toString(),
    "",
    "If you did not request this email, you can ignore it.",
  ].join("\n");

  const html = [
    "<p>Use this secure sign-in link for your FranklinCovey coaching portal:</p>",
    `<p><a href=\"${consumeUrl.toString()}\">Sign in</a></p>`,
    "<p>If you did not request this email, you can ignore it.</p>",
  ].join("");

  try {
    await sendWithEmailGuard(
      {
        to: email,
        subject,
        text,
        html,
      },
      (payload) => sendViaResend({
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        text: payload.text || "",
        html: payload.html || "",
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Magic link send blocked";
    const status = message.toLowerCase().includes("guard") || message.toLowerCase().includes("allow")
      ? 403
      : 502;

    return NextResponse.json(
      {
        success: false,
        error: status === 403 ? "EMAIL_BLOCKED" : "EMAIL_SEND_FAILED",
      },
      { status }
    );
  }

  return NextResponse.json({ success: true });
}
