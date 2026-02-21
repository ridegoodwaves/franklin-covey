"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestOtp, verifyOtp } from "@/lib/api-client";

const RESEND_COUNTDOWN = 60;

export default function VerifyOtpPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(RESEND_COUNTDOWN);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load email from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("participant-email");
    if (!stored) {
      router.replace("/participant/");
      return;
    }
    setEmail(stored);
    inputRef.current?.focus();
  }, [router]);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!otp || otp.length !== 6 || loading || maxAttemptsReached) return;
      setLoading(true);
      setError(null);

      try {
        const response = await verifyOtp({ email, otp });
        if (response.success) {
          sessionStorage.setItem("participant-verified", "true");
          if (response.alreadySelected) {
            router.push("/participant/confirmation?already=true");
          } else {
            router.push("/participant/select-coach");
          }
        } else {
          switch (response.error) {
            case "INVALID_OTP":
              setError("Incorrect code — try again");
              break;
            case "EXPIRED_OTP":
              setError("Your code has expired — request a new one");
              break;
            case "MAX_ATTEMPTS":
              setError(
                "Too many incorrect attempts — please request a new code"
              );
              setMaxAttemptsReached(true);
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
    },
    [email, otp, loading, maxAttemptsReached, router]
  );

  const handleResend = useCallback(async () => {
    if (resendCountdown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendSuccess(false);
    setError(null);

    try {
      await requestOtp({ email });
      setResendCountdown(RESEND_COUNTDOWN);
      setMaxAttemptsReached(false);
      setOtp("");
      setResendSuccess(true);
    } catch {
      setError("Failed to resend code — please try again");
    } finally {
      setResendLoading(false);
    }
  }, [email, resendCountdown, resendLoading]);

  const canResend = resendCountdown <= 0 && !resendLoading;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex justify-center opacity-0 animate-fade-in">
          <img src="/fc-logomark.svg" alt="FranklinCovey" className="h-12 w-12" />
        </div>

        {/* Headline */}
        <div
          className="mb-8 text-center opacity-0 animate-fade-in"
          style={{ animationDelay: "100ms" }}
        >
          <h1 className="font-display text-3xl font-light leading-tight text-fc-950 sm:text-4xl">
            Check Your Email
          </h1>
          {email && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-fc-800">{email}</span>
            </p>
          )}
        </div>

        {/* Form */}
        <form
          onSubmit={handleVerify}
          className="space-y-4 opacity-0 animate-fade-in"
          style={{ animationDelay: "200ms" }}
        >
          <Input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setOtp(val);
              if (error) setError(null);
            }}
            className="h-12 w-full text-center text-xl tracking-widest font-mono"
            autoComplete="one-time-code"
            disabled={loading || maxAttemptsReached}
          />

          {/* Inline error */}
          {error && (
            <p className="text-sm text-destructive leading-snug">{error}</p>
          )}

          {/* Resend success */}
          {resendSuccess && !error && (
            <p className="text-sm text-emerald-600 leading-snug">
              A new code has been sent
            </p>
          )}

          {!maxAttemptsReached && (
            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          )}
        </form>

        {/* Resend section */}
        <div
          className="mt-6 text-center opacity-0 animate-fade-in"
          style={{ animationDelay: "300ms" }}
        >
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-sm font-medium text-fc-600 hover:text-fc-800 hover:underline underline-offset-2 disabled:opacity-50"
            >
              {resendLoading ? "Sending..." : "Resend code"}
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Resend code in{" "}
              <span className="font-medium text-fc-700">{resendCountdown}s</span>
            </p>
          )}
        </div>

        {/* Back link */}
        <div
          className="mt-4 text-center opacity-0 animate-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          <button
            type="button"
            onClick={() => router.push("/participant/")}
            className="text-xs text-muted-foreground hover:text-fc-600 hover:underline underline-offset-2"
          >
            Use a different email
          </button>
        </div>
      </div>
    </div>
  );
}
