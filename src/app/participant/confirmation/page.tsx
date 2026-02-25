"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CoachBioModal, type CoachBioModalData } from "@/components/CoachBioModal";

interface StoredCoach {
  id: string;
  name: string;
  initials: string;
  photo?: string;
  bio: string;
  credentials: string[];
  specialties: string[];
  quotes?: Array<{ quote: string; attribution?: string }>;
  location: string;
  bookingUrl?: string;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const [coach, setCoach] = useState<StoredCoach | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [bioModalOpen, setBioModalOpen] = useState(false);
  const alreadySelected = searchParams.get("already") === "true";

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("selected-coach");
      if (raw) {
        const parsed = JSON.parse(raw) as StoredCoach;
        setCoach(parsed);
      } else if (!alreadySelected) {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    }
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [alreadySelected]);

  if (loadError && !alreadySelected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center">
          <img src="/fc-logomark.svg" alt="FranklinCovey" className="mx-auto mb-8 h-12 w-12" />
          <h1 className="font-display text-2xl font-light text-fc-950">Something went wrong</h1>
          <p className="mt-3 text-sm text-muted-foreground">We could not load your confirmation. Please start over.</p>
          <Button className="mt-6" onClick={() => (window.location.href = "/participant/")}>Start over</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-center border-b border-fc-100 px-6 py-5">
        <img src="/fc-logo.svg" alt="FranklinCovey" className="h-7" />
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <div className={`mb-8 flex justify-center transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-fc-200 bg-fc-50 px-4 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-fc-700">Step 2 of 2</span>
            </div>
          </div>

          {/* Checkmark */}
          <div className={`mb-8 flex justify-center transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>

          {/* Headline */}
          <div className={`mb-8 text-center transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "100ms" }}>
            <h1 className="font-display text-3xl font-light leading-tight text-fc-950 sm:text-4xl">
              {alreadySelected && !coach ? "Coach Already Selected" : "Your Coach Has Been Selected"}
            </h1>
            {alreadySelected && !coach && (
              <p className="mt-3 text-sm text-muted-foreground">
                Your selection is confirmed. Contact your program administrator if you have any questions.
              </p>
            )}
          </div>

          {/* Coach card */}
          {coach && (
            <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "200ms" }}>
              <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl border border-fc-100 bg-white p-6 text-center">
                <Avatar className="h-20 w-20 ring-4 ring-fc-100 ring-offset-4 ring-offset-white">
                  {coach.photo && <AvatarImage src={coach.photo} alt={coach.name} />}
                  <AvatarFallback className="bg-gradient-to-br from-fc-600 to-fc-800 text-xl font-display font-semibold text-white">
                    {coach.initials}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p className="font-display text-xl font-medium text-fc-900">{coach.name}</p>
                  {coach.credentials.length > 0 && (
                    <div className="mt-1 flex flex-col items-center gap-0.5">
                      {coach.credentials.slice(0, 2).map((cred, i) => (
                        <p key={i} className="text-xs text-muted-foreground leading-snug line-clamp-1 text-center max-w-[240px]">
                          {cred}
                        </p>
                      ))}
                    </div>
                  )}
                  {coach.location && (
                    <div className="mt-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {coach.location}
                    </div>
                  )}
                </div>

                {coach.bio && (
                  <>
                    <div className="w-full border-t border-fc-100" />
                    <p className="text-sm leading-relaxed text-fc-700 line-clamp-3 text-left">
                      {coach.bio}
                    </p>
                    <button
                      type="button"
                      onClick={() => setBioModalOpen(true)}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-fc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-fc-700 shadow-sm transition-all hover:border-fc-400 hover:bg-fc-50 hover:text-fc-900 hover:shadow"
                    >
                      Read full bio
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>

              <div className="mb-6 border-t border-fc-100" />

              {coach.bookingUrl ? (
                <div className="space-y-3 text-center">
                  <Button size="lg" className="w-full" onClick={() => window.open(coach.bookingUrl, "_blank")}>
                    Book your first session
                  </Button>
                  <p className="text-sm text-muted-foreground">Opens your coach's scheduling page in a new tab</p>
                </div>
              ) : (
                <div className="rounded-xl border border-fc-200 bg-fc-50 p-5 text-center">
                  <p className="font-medium text-fc-800">What happens next</p>
                  <p className="mt-2 text-sm text-muted-foreground">Your coach will reach out within 2 business days to schedule your first session</p>
                </div>
              )}
            </div>
          )}

          <p className={`mt-10 text-center text-xs text-muted-foreground transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "400ms" }}>
            Need help? Contact your program administrator.
          </p>
        </div>
      </main>

      {/* Bio modal — no select action on confirmation (coach already chosen) */}
      <CoachBioModal
        coach={bioModalOpen && coach ? (coach as CoachBioModalData) : null}
        onClose={() => setBioModalOpen(false)}
      />
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><img src="/fc-logomark.svg" alt="FranklinCovey" className="h-10 w-10 animate-pulse" /></div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
