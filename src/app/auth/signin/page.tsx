"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RequestState = "idle" | "submitting" | "sent" | "blocked" | "error";

function SignInContent() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<RequestState>("idle");

  const expired = useMemo(() => params.get("error") === "expired", [params]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setState("submitting");

    try {
      const response = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        credentials: "same-origin",
      });

      if (response.ok) {
        setState("sent");
        return;
      }

      const payload = (await response.json()) as { error?: string };
      if (payload.error === "EMAIL_BLOCKED") {
        setState("blocked");
        return;
      }

      setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src="/fc-logomark.svg" alt="FranklinCovey" className="mx-auto mb-4 h-12 w-12" />
          <h1 className="font-display text-3xl font-light text-fc-950">Coach/Admin Sign In</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your work email to receive a secure sign-in link.
          </p>
        </div>

        {expired && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your sign-in link expired. Request a new one below.
          </p>
        )}

        {state === "sent" && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            If that email exists in the system, a sign-in link has been sent.
          </p>
        )}

        {state === "blocked" && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Email sending is blocked in this environment. Contact platform support.
          </p>
        )}

        {state === "error" && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            We couldn't send a sign-in link right now. Please try again.
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            autoComplete="email"
            required
            disabled={state === "submitting"}
          />
          <Button type="submit" className="w-full" disabled={state === "submitting" || !email.trim()}>
            {state === "submitting" ? "Sending..." : "Send Sign-In Link"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background" />}>
      <SignInContent />
    </Suspense>
  );
}
