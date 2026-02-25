"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ApiError,
  fetchCoaches,
  remixCoaches,
  selectCoach,
  type ParticipantCoachCard,
} from "@/lib/api-client";
import { CoachBioModal } from "@/components/CoachBioModal";

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
  credentials: string[];
  location: string;
  videoUrl?: string;
  meetingBookingUrl?: string;
  atCapacity: boolean;
  yearsExperience: number;
  sessionCount: number;
}

type ProgramTrack = "TWO_SESSION" | "FIVE_SESSION";

// ---------------------------------------------------------------------------
// Sample Data (15 coaches — representative of full 35-coach pool)
// ---------------------------------------------------------------------------

const ALL_COACHES: Coach[] = [
  {
    id: "c1",
    name: "Dr. Eleanor Whitfield",
    initials: "EW",
    bio: "A seasoned executive coach with over two decades of experience guiding senior leaders in federal agencies. Eleanor specializes in helping leaders navigate complex organizational change while maintaining authenticity and building trust across diverse teams.",
    specialties: ["Executive Presence", "Change Leadership", "Strategic Thinking"],
    credentials: ["PCC", "PhD"],
    location: "Washington, DC",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    meetingBookingUrl: "https://calendly.com/dr-whitfield/30min",
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
    credentials: ["MCC"],
    location: "Virtual",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    meetingBookingUrl: "https://calendly.com/marcus-chen/30min",
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
    credentials: ["PCC"],
    location: "New York, NY",
    meetingBookingUrl: "https://calendly.com/adrienne-mb/30min",
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
    credentials: ["PCC", "PhD"],
    location: "Chicago, IL",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    meetingBookingUrl: "https://calendly.com/james-okonkwo/30min",
    atCapacity: false,
    yearsExperience: 12,
    sessionCount: 260,
  },
  {
    id: "c5",
    name: "Sofia Ramirez",
    initials: "SR",
    bio: "Sofia brings warmth and rigor to her coaching practice, combining deep listening with practical frameworks that leaders can apply immediately. Her background in organizational development gives her a systems-level perspective on leadership challenges.",
    specialties: ["Organizational Development", "Goal Setting", "Communication"],
    credentials: ["ICF-ACC"],
    location: "Los Angeles, CA",
    meetingBookingUrl: "https://calendly.com/sofia-ramirez/30min",
    atCapacity: true,
    yearsExperience: 14,
    sessionCount: 340,
  },
  {
    id: "c6",
    name: "Dr. Robert Harrington",
    initials: "RH",
    bio: "Robert is a former government executive turned leadership coach who understands the unique pressures of public service leadership. He helps leaders develop the resilience and clarity needed to drive mission outcomes in complex bureaucratic environments.",
    specialties: ["Resilience", "Decision Making", "Strategic Thinking"],
    credentials: ["MCC", "PhD"],
    location: "Washington, DC",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    meetingBookingUrl: "https://calendly.com/dr-harrington/30min",
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
    credentials: ["PCC"],
    location: "Virtual",
    meetingBookingUrl: "https://calendly.com/priya-nair/30min",
    atCapacity: true,
    yearsExperience: 10,
    sessionCount: 180,
  },
  {
    id: "c8",
    name: "Catherine Wells",
    initials: "CW",
    bio: "Catherine is a master facilitator and coach whose warm, direct style puts leaders at ease while challenging them to grow. She has deep expertise in cross-functional collaboration and stakeholder management in federal environments.",
    specialties: ["Stakeholder Management", "Collaboration", "Executive Presence"],
    credentials: ["MCC"],
    location: "Atlanta, GA",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    meetingBookingUrl: "https://calendly.com/catherine-wells/30min",
    atCapacity: false,
    yearsExperience: 16,
    sessionCount: 350,
  },
  {
    id: "c9",
    name: "Diego Fuentes",
    initials: "DF",
    bio: "Diego is a bilingual executive coach who specializes in cross-cultural leadership and building inclusive teams. His warmth and directness create a safe space for leaders to explore challenging dynamics and develop new perspectives.",
    specialties: ["Cross-Cultural Leadership", "Team Building", "Conflict Resolution"],
    credentials: ["PCC"],
    location: "Chicago, IL",
    meetingBookingUrl: "https://calendly.com/diego-fuentes/30min",
    atCapacity: false,
    yearsExperience: 13,
    sessionCount: 280,
  },
  {
    id: "c10",
    name: "Dr. Mei-Ling Wu",
    initials: "MW",
    bio: "Dr. Wu brings a research-backed approach to leadership coaching, drawing on her background in organizational behavior and cross-cultural psychology. She excels at helping leaders build influence and navigate complex stakeholder environments.",
    specialties: ["Organizational Development", "Strategic Thinking", "Innovation"],
    credentials: ["PCC", "PhD"],
    location: "New York, NY",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    meetingBookingUrl: "https://calendly.com/dr-wu/30min",
    atCapacity: false,
    yearsExperience: 17,
    sessionCount: 360,
  },
  {
    id: "c11",
    name: "Thomas Beaumont",
    initials: "TB",
    bio: "Thomas is a veteran executive coach who specializes in helping leaders find clarity during periods of transformation. His calm, methodical approach helps leaders cut through complexity and focus on what matters most for their teams and missions.",
    specialties: ["Change Leadership", "Decision Making", "Accountability"],
    credentials: ["MCC"],
    location: "Washington, DC",
    meetingBookingUrl: "https://calendly.com/thomas-beaumont/30min",
    atCapacity: false,
    yearsExperience: 24,
    sessionCount: 520,
  },
  {
    id: "c12",
    name: "Angela Torres",
    initials: "AT",
    bio: "Angela brings energy and strategic insight to every coaching conversation. With expertise in leadership communication and executive presence, she helps leaders amplify their impact and build the confidence to lead through uncertainty.",
    specialties: ["Executive Presence", "Communication", "Career Growth"],
    credentials: ["ICF-ACC"],
    location: "Los Angeles, CA",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    meetingBookingUrl: "https://calendly.com/angela-torres/30min",
    atCapacity: false,
    yearsExperience: 9,
    sessionCount: 190,
  },
  {
    id: "c13",
    name: "Dr. Kwame Asante",
    initials: "KA",
    bio: "Dr. Asante is an organizational psychologist and executive coach whose research on resilience and adaptive leadership informs his deeply practical coaching approach. He brings both academic rigor and real-world empathy to every engagement.",
    specialties: ["Resilience", "Adaptive Leadership", "Behavioral Science"],
    credentials: ["PCC", "PhD"],
    location: "Atlanta, GA",
    meetingBookingUrl: "https://calendly.com/dr-asante/30min",
    atCapacity: false,
    yearsExperience: 15,
    sessionCount: 310,
  },
  {
    id: "c14",
    name: "Rachel Kim",
    initials: "RK",
    bio: "Rachel is a high-energy coach who specializes in helping leaders build high-performing teams through trust, psychological safety, and clear accountability structures. Her background in tech leadership gives her a modern, results-oriented perspective.",
    specialties: ["Team Performance", "Innovation", "Goal Setting"],
    credentials: ["PCC"],
    location: "Virtual",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    meetingBookingUrl: "https://calendly.com/rachel-kim/30min",
    atCapacity: false,
    yearsExperience: 11,
    sessionCount: 240,
  },
  {
    id: "c15",
    name: "Jean-Pierre Dubois",
    initials: "JD",
    bio: "Jean-Pierre brings an international perspective to executive coaching, having worked with leaders across three continents. His trilingual capability and cross-cultural expertise make him particularly effective with globally-minded leaders and diverse teams.",
    specialties: ["Cross-Cultural Leadership", "Stakeholder Management", "Mindful Leadership"],
    credentials: ["MCC"],
    location: "New York, NY",
    meetingBookingUrl: "https://calendly.com/jp-dubois/30min",
    atCapacity: false,
    yearsExperience: 19,
    sessionCount: 420,
  },
];

const COACHES_PER_PAGE = 3;

const CURRENT_PARTICIPANT = {
  name: "Sarah Mitchell",
  initials: "SM",
  programTrack: "FIVE_SESSION" as ProgramTrack,
};

function pickCoaches(
  all: Coach[],
  alreadyShown: Set<string>,
  count: number
): Coach[] {
  const available = all.filter((c) => !c.atCapacity && !alreadyShown.has(c.id));
  const unseen = all.filter((c) => !alreadyShown.has(c.id));
  const pool = available.length >= count ? available : unseen;
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function apiCoachToLocal(c: ParticipantCoachCard): Coach {
  return {
    id: c.id,
    name: c.name,
    initials: c.initials,
    photo: c.photo,
    bio: c.bio,
    specialties: c.specialties,
    credentials: c.credentials,
    location: c.location,
    videoUrl: c.videoUrl,
    meetingBookingUrl: c.meetingBookingUrl,
    atCapacity: c.atCapacity,
    yearsExperience: c.yearsExperience,
    sessionCount: 0,
  };
}

export default function SelectCoachPage() {
  const router = useRouter();
  const [displayedCoaches, setDisplayedCoaches] = useState<Coach[]>([]);
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());
  const [remixUsed, setRemixUsed] = useState(false);
  const [remixPending, setRemixPending] = useState(false);
  const remixPendingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [allAtCapacity, setAllAtCapacity] = useState(false);
  const [selectingCoachId, setSelectingCoachId] = useState<string | null>(null);
  const [selectionDisabled, setSelectionDisabled] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [bioModalCoach, setBioModalCoach] = useState<Coach | null>(null);
  const [participantDisplayName, setParticipantDisplayName] = useState<string>(CURRENT_PARTICIPANT.name);
  const [participantInitials, setParticipantInitials] = useState<string>(CURRENT_PARTICIPANT.initials);

  useEffect(() => {
    const verified = sessionStorage.getItem("participant-verified");
    if (!verified) {
      router.replace("/participant/");
      return;
    }
    if (sessionStorage.getItem("selected-coach")) {
      router.replace("/participant/confirmation");
      return;
    }
    const storedEmail = sessionStorage.getItem("participant-email");
    if (storedEmail) {
      const emailPrefix = storedEmail.split("@")[0];
      // Capitalize first letter, replace dots/underscores with spaces for display
      const displayName = emailPrefix
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setParticipantDisplayName(displayName || storedEmail);
      setParticipantInitials(emailPrefix[0]?.toUpperCase() ?? CURRENT_PARTICIPANT.initials);
    }
    loadInitialCoaches();
  }, []);

  useEffect(() => {
    return () => {
      if (remixPendingTimerRef.current) clearTimeout(remixPendingTimerRef.current);
    };
  }, []);

  async function loadInitialCoaches() {
    setMounted(false);
    setInlineError(null);
    try {
      const result = await fetchCoaches();
      if (result.allAtCapacity) {
        setAllAtCapacity(true);
        setMounted(true);
        return;
      }
      const coaches = result.coaches.map(apiCoachToLocal);
      setDisplayedCoaches(coaches);
      setShownIds(new Set(coaches.map((c) => c.id)));
      setTimeout(() => setMounted(true), 50);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "INVALID_SESSION") {
          router.replace("/participant/?expired=true");
          return;
        }
        if (error.code === "ALREADY_SELECTED") {
          router.replace("/participant/confirmation?already=true");
          return;
        }
      }
      setInlineError("We could not load coach options. Please refresh and try again.");
      setDisplayedCoaches([]);
      setShownIds(new Set());
      setMounted(true);
    }
  }

  const handleRemix = useCallback(async () => {
    if (remixUsed) return;
    setMounted(false);
    setInlineError(null);

    try {
      const result = await remixCoaches();
      const coaches = result.coaches.map(apiCoachToLocal);
      setDisplayedCoaches(coaches);
      setShownIds((prev) => {
        const next = new Set(prev);
        coaches.forEach((c) => next.add(c.id));
        return next;
      });
      setRemixUsed(true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "INVALID_SESSION") {
          router.replace("/participant/?expired=true");
          return;
        }
        if (error.code === "ALREADY_SELECTED") {
          router.replace("/participant/confirmation?already=true");
          return;
        }
        if (error.code === "REMIX_ALREADY_USED") {
          setRemixUsed(true);
          setMounted(true);
          return;
        }
      }
      setInlineError("We could not refresh coach options. Please try again.");
    }
    setTimeout(() => setMounted(true), 200);
  }, [remixUsed, router]);

  const availableCount = displayedCoaches.filter((c) => !c.atCapacity).length;
  const canRemix = !remixUsed && availableCount > 0;

  const handleRemixClick = useCallback(() => {
    if (remixUsed || !canRemix || selectionDisabled) return;
    if (!remixPending) {
      setRemixPending(true);
      // Auto-cancel after 8 seconds if not confirmed
      remixPendingTimerRef.current = setTimeout(() => {
        setRemixPending(false);
      }, 8000);
    }
  }, [remixUsed, selectionDisabled, remixPending, canRemix]);

  const handleRemixCancel = useCallback(() => {
    setRemixPending(false);
    if (remixPendingTimerRef.current) {
      clearTimeout(remixPendingTimerRef.current);
      remixPendingTimerRef.current = null;
    }
  }, []);

  const handleRemixConfirm = useCallback(() => {
    if (remixPendingTimerRef.current) {
      clearTimeout(remixPendingTimerRef.current);
      remixPendingTimerRef.current = null;
    }
    setRemixPending(false);
    handleRemix();
  }, [handleRemix]);

  const handleSelect = useCallback(
    async (coach: Coach) => {
      if (selectionDisabled || selectingCoachId) return;
      setSelectingCoachId(coach.id);
      setSelectionDisabled(true);
      setInlineError(null);

      try {
        const response = await selectCoach({ coachId: coach.id });
        if (response.success) {
          const payload = {
            ...coach,
            bookingUrl: response.bookingUrl,
            ...(response.coach ? {
              name: response.coach.name,
              initials: response.coach.initials,
              photo: response.coach.photo,
              bio: response.coach.bio,
              credentials: response.coach.credentials,
              location: response.coach.location,
            } : {}),
          };
          sessionStorage.setItem("selected-coach", JSON.stringify(payload));
          router.push("/participant/confirmation");
        } else {
          switch (response.error) {
            case "CAPACITY_FULL":
              setInlineError("This coach just filled up — please select another");
              setSelectionDisabled(false);
              setSelectingCoachId(null);
              break;
            case "ALREADY_SELECTED":
              router.push("/participant/confirmation?already=true");
              break;
            case "INVALID_SESSION":
              router.push("/participant/?expired=true");
              break;
            default:
              setInlineError("Something went wrong — please try again");
              setSelectionDisabled(false);
              setSelectingCoachId(null);
          }
        }
      } catch {
        setInlineError("Something went wrong — please try again");
        setSelectionDisabled(false);
        setSelectingCoachId(null);
      }
    },
    [selectionDisabled, selectingCoachId, router]
  );

  return (
    <div className="relative min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-fc-100 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img src="/fc-logomark.svg" alt="FranklinCovey" className="h-8 w-8" />
            <span className="font-display text-lg font-semibold text-fc-900">FranklinCovey</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Welcome, {participantDisplayName}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{participantInitials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-12 lg:pt-16">
        <div className={cn(
          "mx-auto max-w-2xl text-center transition-all duration-700",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fc-200 bg-fc-50 px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-fc-600 animate-pulse-subtle" />
            <span className="text-xs font-medium text-fc-700">Step 1 of 2</span>
          </div>

          <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-fc-900 sm:text-5xl">
            Choose Your{" "}
            <span className="font-medium italic text-fc-600">Coach</span>
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Review each coach's background and select the one you would like to work with.
          </p>
        </div>

        {allAtCapacity ? (
          <div className={cn(
            "mx-auto mt-16 max-w-lg text-center transition-all duration-700",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-fc-50">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-fc-400">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-semibold text-fc-900">All Coaches Currently Full</h2>
            <p className="mt-3 text-muted-foreground">
              All coaches are currently full — your program administrator will assign you a coach
            </p>
          </div>
        ) : (
          <>
            {inlineError && (
              <div className="mx-auto mt-8 max-w-lg rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-center text-sm text-red-700">
                {inlineError}
              </div>
            )}

            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {displayedCoaches.map((coach, index) => (
                <div
                  key={coach.id}
                  className={cn(
                    "transition-all duration-700 ease-out",
                    mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  )}
                  style={{ transitionDelay: mounted ? `${150 + index * 120}ms` : "0ms" }}
                >
                  <Card className={cn(
                    "group relative flex h-full flex-col overflow-hidden transition-all duration-300",
                    coach.atCapacity
                      ? "opacity-60"
                      : "hover:shadow-lg hover:shadow-fc-900/5 hover:-translate-y-1 hover:border-fc-200/80"
                  )}>
                    {!coach.atCapacity && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-fc-50/0 to-fc-100/0 transition-all duration-500 group-hover:from-fc-50/30 group-hover:to-fc-100/10" />
                    )}

                    <CardHeader className="relative items-center pb-3 pt-6 text-center">
                      <div className="relative">
                        <Avatar className={cn(
                          "h-20 w-20 ring-4 ring-offset-4 ring-offset-white transition-all duration-300",
                          coach.atCapacity ? "ring-fc-100" : "ring-fc-100 group-hover:ring-fc-200"
                        )}>
                          {coach.photo && <AvatarImage src={coach.photo} alt={coach.name} />}
                          <AvatarFallback className={cn(
                            "text-lg font-display font-semibold",
                            coach.atCapacity ? "bg-fc-50 text-fc-400" : "bg-gradient-to-br from-fc-100 to-fc-50 text-fc-700"
                          )}>
                            {coach.initials}
                          </AvatarFallback>
                        </Avatar>
                        {coach.atCapacity && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-fc-100 px-3 py-0.5 text-[11px] font-medium text-fc-600">
                            At Capacity
                          </div>
                        )}
                      </div>

                      <CardTitle className="mt-4 text-lg text-fc-900">{coach.name}</CardTitle>

                      <div className="mt-1 flex items-center gap-1.5">
                        {coach.credentials.map((cred) => (
                          <span key={cred} className="text-[10px] font-semibold tracking-wider text-fc-600 uppercase">{cred}</span>
                        ))}
                        <span className="text-fc-300">&middot;</span>
                        <span className="text-xs text-muted-foreground">{coach.yearsExperience} yrs</span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {coach.location}
                      </div>
                    </CardHeader>

                    <CardContent className="relative flex-1 px-6 pb-4">
                      <p className="text-sm leading-relaxed text-fc-700 line-clamp-3">
                        {coach.bio}
                      </p>

                      {!coach.atCapacity && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setBioModalCoach(coach); }}
                          className="mt-2 text-xs font-medium text-fc-600 hover:text-fc-800 hover:underline underline-offset-2"
                        >
                          Read full bio →
                        </button>
                      )}
                    </CardContent>

                    <CardFooter className="relative px-6 pb-6">
                      <Button
                        variant="default"
                        size="lg"
                        className="w-full gap-2"
                        disabled={coach.atCapacity || selectionDisabled || selectingCoachId === coach.id}
                        onClick={() => handleSelect(coach)}
                      >
                        {selectingCoachId === coach.id ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Selecting...
                          </>
                        ) : coach.atCapacity ? "Unavailable" : "Select This Coach"}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>

            {/* Remix section */}
            <div
              className={cn(
                "mt-10 flex flex-col items-center gap-3 transition-all duration-700",
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
              style={{ transitionDelay: mounted ? "600ms" : "0ms" }}
            >
              {remixUsed ? (
                <Button variant="outline" size="lg" className="gap-2.5 opacity-50 cursor-not-allowed" disabled>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                  </svg>
                  No More Refreshes Available
                </Button>
              ) : remixPending ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-muted-foreground">You can only do this once.</p>
                  <div className="flex gap-3">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleRemixConfirm}
                      disabled={selectionDisabled}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                        <path d="M21 3v5h-5" />
                      </svg>
                      Yes, show me new coaches
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleRemixCancel}>
                      Never mind
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2.5"
                  onClick={handleRemixClick}
                  disabled={!canRemix || selectionDisabled}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                  </svg>
                  See Different Coaches
                </Button>
              )}

              {remixUsed && (
                <p className="text-center text-xs text-muted-foreground">
                  You have seen all available coach options. Contact your program administrator for additional choices.
                </p>
              )}
            </div>
          </>
        )}
      </main>

      {/* Bio modal */}
      <CoachBioModal
        coach={bioModalCoach}
        onClose={() => setBioModalCoach(null)}
        onSelect={(coachId) => {
          const coach = displayedCoaches.find((c) => c.id === coachId);
          if (coach) handleSelect(coach);
        }}
        selectDisabled={selectionDisabled}
      />
    </div>
  );
}
