"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyAccessCode } from "@/lib/api-client";

export default function ParticipantEntryPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiredBanner, setExpiredBanner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "true") {
      setExpiredBanner(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !accessCode.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await verifyAccessCode({ email: email.trim(), accessCode: accessCode.trim() });
      if (response.success) {
        sessionStorage.setItem("participant-email", email.trim());
        sessionStorage.setItem("participant-verified", "true");
        if (response.alreadySelected) {
          router.push("/participant/confirmation?already=true");
        } else {
          router.push("/participant/select-coach");
        }
      } else {
        switch (response.error) {
          case "INVALID_CREDENTIALS":
            setError("Email or access code not recognized — check your invitation letter");
            break;
          case "WINDOW_CLOSED":
            setError(
              "The selection window for your cohort has closed. Contact your program administrator."
            );
            break;
          case "RATE_LIMITED":
            setError("Too many requests — please try again in a few minutes");
            break;
          default:
            setError("Something went wrong — please try again");
        }
      }
    } catch {
      setError("Something went wrong — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex justify-center opacity-0 animate-fade-in">
          <img src="/fc-logomark.svg" alt="FranklinCovey" className="h-12 w-12" />
        </div>

        {/* Expired session banner */}
        {expiredBanner && (
          <div
            className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 opacity-0 animate-fade-in"
            style={{ animationDelay: "50ms" }}
          >
            Your session expired. Please enter your email and access code to start again.
          </div>
        )}

        {/* Headline */}
        <div
          className="mb-8 text-center opacity-0 animate-fade-in"
          style={{ animationDelay: "100ms" }}
        >
          <h1 className="font-display text-3xl font-light leading-tight text-fc-950 sm:text-4xl">
            Welcome to Your Coaching Journey
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Enter your email address and access code from your invitation letter
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 opacity-0 animate-fade-in"
          style={{ animationDelay: "200ms" }}
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="your.email@agency.gov"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              className="h-12 w-full text-base"
              autoComplete="email"
              autoFocus
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Access Code
            </label>
            <Input
              type="text"
              inputMode="text"
              placeholder="ABC123"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value);
                if (error) setError(null);
              }}
              className="h-12 w-full text-base"
              autoComplete="off"
              maxLength={6}
              disabled={loading}
              required
            />
          </div>

          {/* Inline error */}
          {error && (
            <p className="text-sm text-destructive leading-snug">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full gap-2"
            disabled={loading || !email.trim() || !accessCode.trim()}
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>

        {/* Footer note */}
        <p
          className="mt-8 text-center text-xs text-muted-foreground opacity-0 animate-fade-in"
          style={{ animationDelay: "350ms" }}
        >
          Need help? Contact your program administrator.
        </p>
      </div>
    </div>
  );
}
