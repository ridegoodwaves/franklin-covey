"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SessionStatus = "COMPLETED" | "SCHEDULED" | "CANCELED" | "NO_SHOW";

interface Session {
  id: string;
  number: number;
  date: string;
  time?: string;
  status: SessionStatus;
  isNext?: boolean;
}

interface CoachInfo {
  name: string;
  initials: string;
  photo?: string;
  specialties: string[];
  credentials: string[];
  languages: string[];
  location: string;
  email: string;
  meetingBookingUrl: string;
}

interface EngagementData {
  participantName: string;
  programName: string;
  coach: CoachInfo;
  totalSessions: number;
  sessions: Session[];
}

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const ENGAGEMENT: EngagementData = {
  participantName: "Sarah Mitchell",
  programName: "Government Leadership Excellence Program",
  coach: {
    name: "Dr. Eleanor Whitfield",
    initials: "EW",
    specialties: [
      "Executive Presence",
      "Change Leadership",
      "Strategic Thinking",
    ],
    credentials: ["PCC", "PhD"],
    languages: ["English"],
    location: "Washington, DC",
    email: "e.whitfield@franklincovey.com",
    meetingBookingUrl: "https://calendly.com/dr-whitfield/30min",
  },
  totalSessions: 5,
  sessions: [
    {
      id: "s1",
      number: 1,
      date: "2026-01-14",
      time: "10:00 AM EST",
      status: "COMPLETED",
    },
    {
      id: "s2",
      number: 2,
      date: "2026-01-28",
      time: "10:00 AM EST",
      status: "COMPLETED",
    },
    {
      id: "s3",
      number: 3,
      date: "2026-02-11",
      time: "2:00 PM EST",
      status: "COMPLETED",
    },
    {
      id: "s4",
      number: 4,
      date: "2026-02-25",
      time: "10:00 AM EST",
      status: "SCHEDULED",
      isNext: true,
    },
    {
      id: "s5",
      number: 5,
      date: "",
      status: "SCHEDULED",
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSessionDate(dateStr: string): string {
  if (!dateStr) return "Not yet scheduled";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "TBD";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return -1;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T12:00:00");
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusConfig(status: SessionStatus) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        badgeVariant: "sage" as const,
        dotColor: "bg-sage-500",
        icon: (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ),
      };
    case "SCHEDULED":
      return {
        label: "Scheduled",
        badgeVariant: "info" as const,
        dotColor: "bg-blue-500",
        icon: (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
      };
    case "CANCELED":
      return {
        label: "Canceled",
        badgeVariant: "outline" as const,
        dotColor: "bg-gray-400",
        icon: (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
        ),
      };
    case "NO_SHOW":
      return {
        label: "No Show",
        badgeVariant: "warning" as const,
        dotColor: "bg-amber-500",
        icon: (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ),
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EngagementPage() {
  const [mounted, setMounted] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const data = ENGAGEMENT;
  const completedCount = data.sessions.filter(
    (s) => s.status === "COMPLETED"
  ).length;
  const progressPercent = (completedCount / data.totalSessions) * 100;
  const nextSession = data.sessions.find((s) => s.isNext);
  const nextDays = nextSession ? daysUntil(nextSession.date) : -1;
  const nearingCompletion = completedCount >= data.totalSessions - 1;
  const isComplete = completedCount === data.totalSessions;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Animate progress bar after mount
  useEffect(() => {
    if (mounted) {
      const t = setTimeout(() => setAnimatedProgress(progressPercent), 400);
      return () => clearTimeout(t);
    }
  }, [mounted, progressPercent]);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Subtle ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 right-1/4 h-[400px] w-[400px] rounded-full bg-fc-100/30 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-navy-50/40 blur-[100px]" />
      </div>

      {/* Top header bar */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-fc-600">
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
            <div className="hidden sm:block">
              <span className="font-display text-lg font-semibold text-navy-900">
                FranklinCovey
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                Coaching Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground md:inline">
              {data.participantName}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {data.participantName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-10 lg:pt-14">
        {/* Welcome back */}
        <div
          className={cn(
            "transition-all duration-700",
            mounted
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          )}
        >
          <p className="text-sm font-medium text-fc-600">
            Welcome back, {data.participantName.split(" ")[0]}
          </p>
          <h1 className="mt-1 font-display text-3xl font-light tracking-tight text-navy-900 sm:text-4xl">
            Your Coaching{" "}
            <span className="font-medium italic">Journey</span>
          </h1>
        </div>

        {/* Two-column top section */}
        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          {/* Progress hero card - wider */}
          <div
            className={cn(
              "lg:col-span-3 transition-all duration-700",
              mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            )}
            style={{ transitionDelay: mounted ? "150ms" : "0ms" }}
          >
            <Card className="relative overflow-hidden">
              {/* Gold shimmer accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fc-500 via-fc-600 to-fc-500" />

              <CardContent className="px-7 pb-8 pt-8">
                {/* Congratulatory message when nearing completion */}
                {nearingCompletion && !isComplete && (
                  <div className="mb-6 flex items-center gap-3 rounded-lg bg-fc-50 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fc-100">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-fc-600"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gold-800">
                        Almost there!
                      </p>
                      <p className="text-xs text-gold-700">
                        You are one session away from completing your coaching
                        program. Outstanding commitment.
                      </p>
                    </div>
                  </div>
                )}

                {isComplete && (
                  <div className="mb-6 flex items-center gap-3 rounded-lg bg-sage-50 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-100">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-sage-600"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-sage-800">
                        Congratulations!
                      </p>
                      <p className="text-xs text-sage-700">
                        You have completed all {data.totalSessions} coaching
                        sessions. Your growth has been remarkable.
                      </p>
                    </div>
                  </div>
                )}

                {/* Large progress display */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Session Progress
                    </p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="font-display text-5xl font-semibold text-navy-900">
                        {completedCount}
                      </span>
                      <span className="text-lg text-muted-foreground">
                        of {data.totalSessions}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      sessions completed
                    </p>
                  </div>

                  {/* Circular percentage */}
                  <div className="relative flex h-20 w-20 items-center justify-center">
                    <svg
                      className="-rotate-90"
                      width="80"
                      height="80"
                      viewBox="0 0 80 80"
                    >
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-navy-100"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                        className="text-gold-500 transition-all duration-1000 ease-out"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${
                          2 * Math.PI * 34 * (1 - animatedProgress / 100)
                        }`}
                      />
                    </svg>
                    <span className="absolute font-display text-lg font-semibold text-navy-900">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                </div>

                {/* Linear progress bar */}
                <div className="mt-6">
                  <Progress
                    value={animatedProgress}
                    className="h-2.5"
                  />
                  <div className="mt-2 flex justify-between">
                    {Array.from({ length: data.totalSessions }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div
                          className={cn(
                            "h-1.5 w-1.5 rounded-full transition-colors duration-500",
                            i < completedCount
                              ? "bg-fc-500"
                              : "bg-navy-200"
                          )}
                        />
                        <span className="mt-1 text-[10px] text-muted-foreground">
                          {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coach info card */}
          <div
            className={cn(
              "lg:col-span-2 transition-all duration-700",
              mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            )}
            style={{ transitionDelay: mounted ? "250ms" : "0ms" }}
          >
            <Card className="h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-navy-900">
                  Your Coach
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center px-7 pb-7 text-center">
                <Avatar className="h-20 w-20 ring-4 ring-fc-100 ring-offset-4 ring-offset-white">
                  {data.coach.photo && (
                    <AvatarImage
                      src={data.coach.photo}
                      alt={data.coach.name}
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-navy-100 to-navy-50 text-lg font-display font-semibold text-navy-700">
                    {data.coach.initials}
                  </AvatarFallback>
                </Avatar>

                <h3 className="mt-4 font-display text-lg font-semibold text-navy-900">
                  {data.coach.name}
                </h3>

                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {data.coach.specialties.map((s) => (
                    <Badge key={s} variant="gold" className="text-[11px]">
                      {s}
                    </Badge>
                  ))}
                </div>

                <Separator className="my-5" />

                <Button variant="outline" size="sm" className="w-full gap-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  Contact Coach
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upcoming session highlight */}
        {nextSession && nextSession.date && (
          <div
            className={cn(
              "mt-6 transition-all duration-700",
              mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            )}
            style={{ transitionDelay: mounted ? "350ms" : "0ms" }}
          >
            <Card className="relative overflow-hidden border-gold-200/60 bg-gradient-to-r from-gold-50/50 via-white to-white">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-fc-500" />
              <CardContent className="flex flex-col items-start gap-4 px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fc-100">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gold-700"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gold-700">
                      Next Session &middot; Session {nextSession.number}
                    </p>
                    <p className="mt-0.5 font-display text-lg font-semibold text-navy-900">
                      {formatSessionDate(nextSession.date)}
                    </p>
                    {nextSession.time && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {nextSession.time}
                        {nextDays > 0 && (
                          <span className="ml-2 text-fc-600">
                            &middot; in {nextDays}{" "}
                            {nextDays === 1 ? "day" : "days"}
                          </span>
                        )}
                        {nextDays === 0 && (
                          <span className="ml-2 font-medium text-fc-600">
                            &middot; Today
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="gold" size="lg" className="gap-2 shrink-0">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 10l5 5-5 5" />
                    <path d="M4 4v7a4 4 0 0 0 4 4h12" />
                  </svg>
                  Join Session
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Session timeline */}
        <div
          className={cn(
            "mt-10 transition-all duration-700",
            mounted
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          )}
          style={{ transitionDelay: mounted ? "450ms" : "0ms" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-navy-900">
              Session Timeline
            </h2>
            <Button variant="gold-outline" className="gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                  ry="2"
                />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="12" y1="14" x2="12" y2="18" />
                <line x1="10" y1="16" x2="14" y2="16" />
              </svg>
              Book Next Session
            </Button>
          </div>

          <div className="mt-6 space-y-0">
            {data.sessions.map((session, index) => {
              const config = getStatusConfig(session.status);
              const isLast = index === data.sessions.length - 1;

              return (
                <div
                  key={session.id}
                  className={cn(
                    "relative flex gap-5 transition-all duration-500",
                    mounted
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 translate-x-4"
                  )}
                  style={{
                    transitionDelay: mounted
                      ? `${550 + index * 80}ms`
                      : "0ms",
                  }}
                >
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        session.status === "COMPLETED"
                          ? "border-sage-300 bg-sage-50 text-sage-600"
                          : session.isNext
                            ? "border-fc-400 bg-fc-50 text-fc-600 ring-4 ring-fc-100"
                            : "border-navy-200 bg-white text-navy-400"
                      )}
                    >
                      {config.icon}
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "w-[2px] flex-1 min-h-[24px]",
                          session.status === "COMPLETED"
                            ? "bg-sage-200"
                            : "bg-navy-100"
                        )}
                      />
                    )}
                  </div>

                  {/* Session content */}
                  <div
                    className={cn(
                      "flex-1 rounded-xl border px-5 py-4 transition-all duration-200",
                      isLast ? "mb-0" : "mb-3",
                      session.isNext
                        ? "border-gold-200/80 bg-fc-50/30 shadow-sm"
                        : "border-border/40 bg-white hover:border-border hover:shadow-sm"
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-display text-base font-semibold text-navy-900">
                            Session {session.number}
                          </span>
                          <Badge
                            variant={config.badgeVariant}
                            className="text-[11px]"
                          >
                            {config.label}
                          </Badge>
                          {session.isNext && (
                            <Badge
                              variant="gold"
                              className="text-[11px] animate-pulse-subtle"
                            >
                              Up Next
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {session.date
                            ? formatSessionDate(session.date)
                            : "Date to be determined"}
                          {session.time && (
                            <span className="ml-1.5 text-navy-500">
                              at {session.time}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Right side date chip */}
                      <div
                        className={cn(
                          "flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded-lg",
                          session.status === "COMPLETED"
                            ? "bg-sage-50"
                            : session.isNext
                              ? "bg-fc-100"
                              : "bg-navy-50"
                        )}
                      >
                        <span
                          className={cn(
                            "text-[11px] font-semibold leading-none",
                            session.status === "COMPLETED"
                              ? "text-sage-700"
                              : session.isNext
                                ? "text-gold-700"
                                : "text-navy-400"
                          )}
                        >
                          {formatShortDate(session.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Program info footer */}
        <div
          className={cn(
            "mt-12 transition-all duration-700",
            mounted
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: mounted ? "900ms" : "0ms" }}
        >
          <Separator className="mb-6" />
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Program
              </p>
              <p className="mt-0.5 text-sm text-navy-700">
                {data.programName}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-sage-500" />
              FranklinCovey Coaching Platform
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
