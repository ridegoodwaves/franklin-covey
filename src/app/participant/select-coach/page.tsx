"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Coach {
  id: string;
  name: string;
  initials: string;
  photo?: string;
  bio: string;
  specialties: string[];
  atCapacity: boolean;
  yearsExperience: number;
  sessionCount: number;
}

// ---------------------------------------------------------------------------
// Sample Data (8 coaches)
// ---------------------------------------------------------------------------

const ALL_COACHES: Coach[] = [
  {
    id: "c1",
    name: "Dr. Eleanor Whitfield",
    initials: "EW",
    bio: "A seasoned executive coach with over two decades of experience guiding senior leaders in federal agencies. Eleanor specializes in helping leaders navigate complex organizational change while maintaining authenticity and building trust across diverse teams.",
    specialties: ["Executive Presence", "Change Leadership", "Strategic Thinking"],
    atCapacity: false,
    yearsExperience: 22,
    sessionCount: 480,
  },
  {
    id: "c2",
    name: "Marcus Chen",
    initials: "MC",
    bio: "Marcus brings a unique blend of Silicon Valley innovation thinking and public sector leadership development. His coaching approach centers on building adaptive leadership skills that help government leaders thrive in rapidly evolving environments.",
    specialties: ["Adaptive Leadership", "Innovation", "Team Building"],
    atCapacity: false,
    yearsExperience: 15,
    sessionCount: 320,
  },
  {
    id: "c3",
    name: "Adrienne Moreau-Banks",
    initials: "AM",
    bio: "With deep expertise in emotional intelligence and interpersonal dynamics, Adrienne helps leaders unlock their full potential through self-awareness and empathy. She has coached leaders at every level of government, from emerging managers to agency heads.",
    specialties: ["Emotional Intelligence", "Communication", "Conflict Resolution"],
    atCapacity: false,
    yearsExperience: 18,
    sessionCount: 410,
  },
  {
    id: "c4",
    name: "James Okonkwo",
    initials: "JO",
    bio: "James is a leadership coach and organizational psychologist who focuses on helping leaders build high-performing teams. His evidence-based approach draws on the latest research in behavioral science to create lasting leadership transformation.",
    specialties: ["Team Performance", "Behavioral Science", "Accountability"],
    atCapacity: false,
    yearsExperience: 12,
    sessionCount: 260,
  },
  {
    id: "c5",
    name: "Sofia Ramirez",
    initials: "SR",
    bio: "Sofia brings warmth and rigor to her coaching practice, combining deep listening with practical frameworks that leaders can apply immediately. Her background in organizational development gives her a systems-level perspective on leadership challenges.",
    specialties: ["Organizational Development", "Coaching Skills", "Goal Setting"],
    atCapacity: true,
    yearsExperience: 14,
    sessionCount: 340,
  },
  {
    id: "c6",
    name: "Dr. Robert Harrington",
    initials: "RH",
    bio: "Robert is a former government executive turned leadership coach who understands the unique pressures of public service leadership. He helps leaders develop the resilience and clarity needed to drive mission outcomes in complex bureaucratic environments.",
    specialties: ["Resilience", "Decision Making", "Mission Leadership"],
    atCapacity: false,
    yearsExperience: 20,
    sessionCount: 390,
  },
  {
    id: "c7",
    name: "Priya Nair",
    initials: "PN",
    bio: "Priya specializes in helping emerging leaders accelerate their growth through structured self-reflection and purposeful habit formation. Her coaching style blends mindfulness practices with practical leadership tools drawn from decades of research.",
    specialties: ["Mindful Leadership", "Habit Formation", "Career Growth"],
    atCapacity: true,
    yearsExperience: 10,
    sessionCount: 180,
  },
  {
    id: "c8",
    name: "Catherine Wells",
    initials: "CW",
    bio: "Catherine is a master facilitator and coach whose warm, direct style puts leaders at ease while challenging them to grow. She has deep expertise in cross-functional collaboration and stakeholder management in federal environments.",
    specialties: ["Stakeholder Management", "Collaboration", "Influence"],
    atCapacity: false,
    yearsExperience: 16,
    sessionCount: 350,
  },
];

const COACHES_PER_PAGE = 3;

// ---------------------------------------------------------------------------
// Utility: pick N available coaches that haven't been shown yet
// ---------------------------------------------------------------------------

function pickCoaches(
  all: Coach[],
  alreadyShown: Set<string>,
  count: number
): Coach[] {
  const available = all.filter((c) => !c.atCapacity && !alreadyShown.has(c.id));
  // If not enough unseen available coaches, include at-capacity ones we haven't shown
  const unseen = all.filter((c) => !alreadyShown.has(c.id));
  const pool = available.length >= count ? available : unseen;
  // Shuffle and take
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SelectCoachPage() {
  const [displayedCoaches, setDisplayedCoaches] = useState<Coach[]>([]);
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());
  const [remixUsed, setRemixUsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmCoach, setConfirmCoach] = useState<Coach | null>(null);
  const [selecting, setSelecting] = useState(false);

  // Initial load
  useEffect(() => {
    const initial = pickCoaches(ALL_COACHES, new Set(), COACHES_PER_PAGE);
    setDisplayedCoaches(initial);
    setShownIds(new Set(initial.map((c) => c.id)));
    // Trigger mount animation
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Remix handler
  const handleRemix = useCallback(() => {
    if (remixUsed) return;
    setMounted(false);
    const nextBatch = pickCoaches(ALL_COACHES, shownIds, COACHES_PER_PAGE);
    // If we got fewer than needed, allow showing from full pool
    const coaches =
      nextBatch.length >= COACHES_PER_PAGE
        ? nextBatch
        : pickCoaches(ALL_COACHES, new Set(), COACHES_PER_PAGE);

    setTimeout(() => {
      setDisplayedCoaches(coaches);
      setShownIds((prev) => {
        const next = new Set(prev);
        coaches.forEach((c) => next.add(c.id));
        return next;
      });
      setRemixUsed(true);
      setMounted(true);
    }, 200);
  }, [remixUsed, shownIds]);

  // Confirm selection
  const handleConfirmSelection = useCallback(() => {
    setSelecting(true);
    // Simulate API call
    setTimeout(() => {
      window.location.href = "/participant/engagement";
    }, 1500);
  }, []);

  const allAtCapacity = ALL_COACHES.every((c) => c.atCapacity);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Subtle ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/3 h-[500px] w-[500px] rounded-full bg-gold-100/40 blur-[120px]" />
        <div className="absolute -bottom-20 right-1/4 h-[400px] w-[400px] rounded-full bg-navy-100/30 blur-[100px]" />
      </div>

      {/* Top header bar */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <span className="font-display text-lg font-semibold text-navy-900">
              FranklinCovey
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Welcome, Sarah
            </span>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">SM</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-12 lg:pt-16">
        {/* Hero heading */}
        <div
          className={cn(
            "mx-auto max-w-2xl text-center transition-all duration-700",
            mounted
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          )}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-200 bg-gold-50 px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-pulse-subtle" />
            <span className="text-xs font-medium text-gold-700">
              Step 1 of 2
            </span>
          </div>

          <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-navy-900 sm:text-5xl">
            Choose Your{" "}
            <span className="font-medium italic text-gold-600">Coach</span>
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Each coach brings a unique perspective and deep expertise. Take a
            moment to find the right match for your leadership journey.
          </p>
        </div>

        {/* All at capacity fallback */}
        {allAtCapacity ? (
          <div
            className={cn(
              "mx-auto mt-16 max-w-lg text-center transition-all duration-700",
              mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            )}
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-navy-50">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-navy-400"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-semibold text-navy-900">
              All Coaches at Capacity
            </h2>
            <p className="mt-3 text-muted-foreground">
              Our coaching roster is currently full. We are working to add
              availability soon. You will receive an email once a coach becomes
              available.
            </p>
            <Button variant="outline" className="mt-8" asChild>
              <a href="/">Return Home</a>
            </Button>
          </div>
        ) : (
          <>
            {/* Coach cards grid */}
            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {displayedCoaches.map((coach, index) => (
                <div
                  key={coach.id}
                  className={cn(
                    "transition-all duration-700 ease-out",
                    mounted
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  )}
                  style={{
                    transitionDelay: mounted
                      ? `${150 + index * 120}ms`
                      : "0ms",
                  }}
                >
                  <Card
                    className={cn(
                      "group relative flex h-full flex-col overflow-hidden transition-all duration-300",
                      coach.atCapacity
                        ? "opacity-60"
                        : "hover:shadow-lg hover:shadow-navy-900/5 hover:-translate-y-1 hover:border-gold-200/80"
                    )}
                  >
                    {/* Hover glow */}
                    {!coach.atCapacity && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-gold-50/0 to-gold-100/0 transition-all duration-500 group-hover:from-gold-50/40 group-hover:to-gold-100/20" />
                    )}

                    <CardHeader className="relative items-center pb-4 pt-8 text-center">
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar
                          className={cn(
                            "h-[120px] w-[120px] ring-4 ring-offset-4 ring-offset-white transition-all duration-300",
                            coach.atCapacity
                              ? "ring-navy-100"
                              : "ring-gold-100 group-hover:ring-gold-200"
                          )}
                        >
                          {coach.photo && (
                            <AvatarImage src={coach.photo} alt={coach.name} />
                          )}
                          <AvatarFallback
                            className={cn(
                              "text-2xl font-display font-semibold",
                              coach.atCapacity
                                ? "bg-navy-50 text-navy-400"
                                : "bg-gradient-to-br from-navy-100 to-navy-50 text-navy-700"
                            )}
                          >
                            {coach.initials}
                          </AvatarFallback>
                        </Avatar>
                        {coach.atCapacity && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy-100 px-3 py-0.5 text-[11px] font-medium text-navy-600">
                            At Capacity
                          </div>
                        )}
                      </div>

                      <CardTitle className="mt-5 text-xl text-navy-900">
                        {coach.name}
                      </CardTitle>
                      <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                        {coach.yearsExperience} years experience &middot;{" "}
                        {coach.sessionCount}+ sessions
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="relative flex-1 px-7 pb-5">
                      {/* Bio */}
                      <p className="text-sm leading-relaxed text-navy-700 line-clamp-3">
                        {coach.bio}
                      </p>

                      {/* Specialties */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {coach.specialties.map((s) => (
                          <Badge
                            key={s}
                            variant={coach.atCapacity ? "outline" : "gold"}
                            className="text-[11px]"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter className="relative px-7 pb-7">
                      <Button
                        variant="gold"
                        size="lg"
                        className="w-full"
                        disabled={coach.atCapacity}
                        onClick={() => setConfirmCoach(coach)}
                      >
                        {coach.atCapacity
                          ? "Unavailable"
                          : "Select This Coach"}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>

            {/* Remix button */}
            <div
              className={cn(
                "mt-10 flex justify-center transition-all duration-700",
                mounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              )}
              style={{ transitionDelay: mounted ? "600ms" : "0ms" }}
            >
              <Button
                variant="outline"
                size="lg"
                className="gap-2.5"
                onClick={handleRemix}
                disabled={remixUsed}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "transition-transform duration-300",
                    remixUsed ? "opacity-40" : "group-hover:rotate-180"
                  )}
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                {remixUsed
                  ? "No More Refreshes Available"
                  : "See Different Coaches"}
              </Button>
            </div>

            {remixUsed && (
              <p
                className={cn(
                  "mt-3 text-center text-xs text-muted-foreground transition-all duration-500",
                  mounted ? "opacity-100" : "opacity-0"
                )}
              >
                You have seen all available coach options. Contact your program
                administrator for additional choices.
              </p>
            )}
          </>
        )}
      </main>

      {/* Confirmation Modal Overlay */}
      {confirmCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-navy-950/30 backdrop-blur-sm animate-fade-in"
            style={{ animationDuration: "200ms" }}
            onClick={() => !selecting && setConfirmCoach(null)}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-md animate-scale-in"
            style={{ animationDuration: "300ms" }}
          >
            <Card className="overflow-hidden border-gold-200/50 shadow-2xl shadow-navy-900/10">
              {/* Gold accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-gold-400 via-gold-600 to-gold-400" />

              <CardHeader className="items-center pb-2 pt-8 text-center">
                <Avatar className="mb-4 h-20 w-20 ring-4 ring-gold-100 ring-offset-4 ring-offset-white">
                  {confirmCoach.photo && (
                    <AvatarImage
                      src={confirmCoach.photo}
                      alt={confirmCoach.name}
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-navy-100 to-navy-50 text-xl font-display font-semibold text-navy-700">
                    {confirmCoach.initials}
                  </AvatarFallback>
                </Avatar>

                <CardTitle className="text-xl text-navy-900">
                  Confirm Your Coach
                </CardTitle>
                <CardDescription className="mt-1">
                  You are selecting{" "}
                  <span className="font-medium text-navy-800">
                    {confirmCoach.name}
                  </span>{" "}
                  as your coaching partner.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-8 pb-2">
                <Separator className="mb-5" />

                {/* Coach details */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 shrink-0 text-gold-600"
                    >
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-navy-500">
                        Experience
                      </p>
                      <p className="text-sm text-navy-800">
                        {confirmCoach.yearsExperience} years &middot;{" "}
                        {confirmCoach.sessionCount}+ coaching sessions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 shrink-0 text-gold-600"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-navy-500">
                        Specialties
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {confirmCoach.specialties.map((s) => (
                          <Badge
                            key={s}
                            variant="gold"
                            className="text-[11px]"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-lg bg-navy-50/50 p-3.5">
                  <p className="text-xs leading-relaxed text-navy-600">
                    Once confirmed, your coach will receive a notification and
                    reach out to schedule your first session. You can expect to
                    hear from them within 2 business days.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex gap-3 px-8 pb-8 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmCoach(null)}
                  disabled={selecting}
                >
                  Go Back
                </Button>
                <Button
                  variant="gold"
                  className="flex-1 gap-2"
                  onClick={handleConfirmSelection}
                  disabled={selecting}
                >
                  {selecting ? (
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
                      Confirming...
                    </>
                  ) : (
                    "Confirm Selection"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
