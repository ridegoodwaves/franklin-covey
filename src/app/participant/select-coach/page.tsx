"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  credentials: string[];
  location: string;
  videoUrl?: string;
  meetingBookingUrl: string;
  atCapacity: boolean;
  yearsExperience: number;
  sessionCount: number;
}

type ProgramTrack = "TWO_SESSION" | "FIVE_SESSION";

interface FilterState {
  location: string | null;
  specialty: string | null;
  credential: string | null;
}

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

// Current participant (hardcoded for demo)
const CURRENT_PARTICIPANT = {
  name: "Sarah Mitchell",
  initials: "SM",
  programTrack: "FIVE_SESSION" as ProgramTrack,
};

// ---------------------------------------------------------------------------
// Utility: extract unique filter options from coach pool
// ---------------------------------------------------------------------------

function getFilterOptions(coaches: Coach[]) {
  const locations = [...new Set(coaches.map((c) => c.location))].sort();
  const specialties = [...new Set(coaches.flatMap((c) => c.specialties))].sort();
  const credentials = [...new Set(coaches.flatMap((c) => c.credentials))].sort();
  return { locations, specialties, credentials };
}

// ---------------------------------------------------------------------------
// Utility: filter coaches by active filters
// ---------------------------------------------------------------------------

function filterCoaches(coaches: Coach[], filters: FilterState): Coach[] {
  return coaches.filter((c) => {
    if (filters.location && c.location !== filters.location) return false;
    if (filters.specialty && !c.specialties.includes(filters.specialty)) return false;
    if (filters.credential && !c.credentials.includes(filters.credential)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Utility: pick N available coaches that haven't been shown yet
// ---------------------------------------------------------------------------

function pickCoaches(
  all: Coach[],
  alreadyShown: Set<string>,
  count: number
): Coach[] {
  const available = all.filter((c) => !c.atCapacity && !alreadyShown.has(c.id));
  const unseen = all.filter((c) => !alreadyShown.has(c.id));
  const pool = available.length >= count ? available : unseen;
  // Fisher-Yates shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/* ---------- Filter Dropdown ---------- */
function FilterDropdown({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string | null;
  options: string[];
  onChange: (val: string | null) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "h-10 appearance-none rounded-lg border bg-white pl-9 pr-8 text-sm font-medium transition-all",
          "focus:outline-none focus:ring-2 focus:ring-fc-600/20 focus:border-fc-600",
          value
            ? "border-fc-600/40 bg-fc-50 text-fc-700"
            : "border-fc-200 text-fc-600 hover:border-fc-300"
        )}
      >
        <option value="">All {label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fc-400">
        {icon}
      </div>
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fc-400">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

/* ---------- Active Filter Badges ---------- */
function ActiveFilterBadges({
  filters,
  onRemove,
  onClearAll,
}: {
  filters: FilterState;
  onRemove: (key: keyof FilterState) => void;
  onClearAll: () => void;
}) {
  const activeFilters = Object.entries(filters).filter(([, v]) => v !== null) as [
    keyof FilterState,
    string
  ][];

  if (activeFilters.length === 0) return null;

  const labels: Record<keyof FilterState, string> = {
    location: "Location",
    specialty: "Focus",
    credential: "Credential",
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-fc-500">Active:</span>
      {activeFilters.map(([key, value]) => (
        <button
          key={key}
          onClick={() => onRemove(key)}
          className="group inline-flex items-center gap-1.5 rounded-full bg-fc-50 px-3 py-1 text-xs font-medium text-fc-700 transition-colors hover:bg-fc-100"
        >
          {labels[key]}: {value}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50 group-hover:opacity-100"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="text-xs font-medium text-fc-400 underline-offset-2 hover:text-fc-600 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SelectCoachPage() {
  const [displayedCoaches, setDisplayedCoaches] = useState<Coach[]>([]);
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());
  const [remixUsed, setRemixUsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confirmCoach, setConfirmCoach] = useState<Coach | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    location: null,
    specialty: null,
    credential: null,
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const filterOptions = useMemo(() => getFilterOptions(ALL_COACHES), []);

  const filteredPool = useMemo(
    () => filterCoaches(ALL_COACHES, filters),
    [filters]
  );

  const hasActiveFilters = Object.values(filters).some((v) => v !== null);

  // Initial load and filter changes
  useEffect(() => {
    setMounted(false);
    const pool = filteredPool;
    const initial = pickCoaches(pool, new Set(), COACHES_PER_PAGE);
    setDisplayedCoaches(initial);
    setShownIds(new Set(initial.map((c) => c.id)));
    setRemixUsed(false);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [filteredPool]);

  // Remix handler
  const handleRemix = useCallback(() => {
    if (remixUsed) return;
    setMounted(false);
    const pool = filteredPool;
    const nextBatch = pickCoaches(pool, shownIds, COACHES_PER_PAGE);
    const coaches =
      nextBatch.length >= COACHES_PER_PAGE
        ? nextBatch
        : pickCoaches(pool, new Set(), COACHES_PER_PAGE);

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
  }, [remixUsed, shownIds, filteredPool]);

  // Confirm selection
  const handleConfirmSelection = useCallback(() => {
    setSelecting(true);
    setTimeout(() => {
      window.location.href = "/participant/engagement";
    }, 1500);
  }, []);

  // Filter handlers
  const updateFilter = (key: keyof FilterState, value: string | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const removeFilter = (key: keyof FilterState) => {
    setFilters((prev) => ({ ...prev, [key]: null }));
  };

  const clearAllFilters = () => {
    setFilters({ location: null, specialty: null, credential: null });
  };

  const availableCount = filteredPool.filter((c) => !c.atCapacity).length;
  const allAtCapacity = filteredPool.length > 0 && filteredPool.every((c) => c.atCapacity);
  const noResults = filteredPool.length === 0 && hasActiveFilters;
  const canRemix = !remixUsed && availableCount > COACHES_PER_PAGE;

  return (
    <div className="relative min-h-screen bg-background">
      {/* Top header bar */}
      <header className="sticky top-0 z-40 border-b border-fc-100 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img src="/fc-logomark.svg" alt="FranklinCovey" className="h-8 w-8" />
            <span className="font-display text-lg font-semibold text-fc-900">
              FranklinCovey
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Welcome, {CURRENT_PARTICIPANT.name}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{CURRENT_PARTICIPANT.initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-12 lg:pt-16">
        {/* Hero heading */}
        <div
          className={cn(
            "mx-auto max-w-2xl text-center transition-all duration-700",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fc-200 bg-fc-50 px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-fc-600 animate-pulse-subtle" />
            <span className="text-xs font-medium text-fc-700">
              Step 1 of 2
            </span>
          </div>

          <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-fc-900 sm:text-5xl">
            Choose Your{" "}
            <span className="font-medium italic text-fc-600">Coach</span>
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Each coach brings a unique perspective and deep expertise. Use the
            filters below to find the right match for your leadership journey.
          </p>
        </div>

        {/* Filter Bar */}
        <div
          className={cn(
            "mt-10 transition-all duration-700",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: mounted ? "100ms" : "0ms" }}
        >
          {/* Mobile filter toggle */}
          <div className="mb-4 sm:hidden">
            <Button
              variant="outline"
              className="w-full justify-between gap-2"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filters
                {hasActiveFilters && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    {Object.values(filters).filter(Boolean).length}
                  </Badge>
                )}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn("transition-transform", filtersExpanded && "rotate-180")}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Button>
          </div>

          {/* Filter dropdowns */}
          <div className={cn(
            "rounded-xl border border-fc-100 bg-white p-4",
            "sm:block",
            filtersExpanded ? "block" : "hidden"
          )}>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <FilterDropdown
                label="Locations"
                value={filters.location}
                onChange={(v) => updateFilter("location", v)}
                options={filterOptions.locations}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                }
              />
              <FilterDropdown
                label="Focus Areas"
                value={filters.specialty}
                onChange={(v) => updateFilter("specialty", v)}
                options={filterOptions.specialties}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                }
              />
              <FilterDropdown
                label="Credentials"
                value={filters.credential}
                onChange={(v) => updateFilter("credential", v)}
                options={filterOptions.credentials}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                  </svg>
                }
              />
              {hasActiveFilters && (
                <span className="hidden text-xs text-fc-400 sm:inline">
                  {availableCount} coach{availableCount !== 1 ? "es" : ""} available
                </span>
              )}
            </div>

            {/* Active filter badges */}
            {hasActiveFilters && (
              <div className="mt-3 border-t border-fc-100 pt-3">
                <ActiveFilterBadges
                  filters={filters}
                  onRemove={removeFilter}
                  onClearAll={clearAllFilters}
                />
              </div>
            )}
          </div>
        </div>

        {/* No results from filters */}
        {noResults ? (
          <div
            className={cn(
              "mx-auto mt-16 max-w-lg text-center transition-all duration-700",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-fc-50">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-fc-400">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-semibold text-fc-900">
              No Coaches Match Your Filters
            </h2>
            <p className="mt-3 text-muted-foreground">
              Try broadening your search by removing a filter, or clear all
              filters to see the full coach roster.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={clearAllFilters}
            >
              Clear All Filters
            </Button>
          </div>
        ) : allAtCapacity ? (
          /* All at capacity fallback */
          <div
            className={cn(
              "mx-auto mt-16 max-w-lg text-center transition-all duration-700",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-fc-50">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-fc-400"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-semibold text-fc-900">
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
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
                    transitionDelay: mounted ? `${150 + index * 120}ms` : "0ms",
                  }}
                >
                  <Card
                    className={cn(
                      "group relative flex h-full flex-col overflow-hidden transition-all duration-300",
                      coach.atCapacity
                        ? "opacity-60"
                        : "hover:shadow-lg hover:shadow-fc-900/5 hover:-translate-y-1 hover:border-fc-200/80"
                    )}
                  >
                    {/* Hover glow */}
                    {!coach.atCapacity && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-fc-50/0 to-fc-100/0 transition-all duration-500 group-hover:from-fc-50/30 group-hover:to-fc-100/10" />
                    )}

                    <CardHeader className="relative items-center pb-3 pt-6 text-center">
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar
                          className={cn(
                            "h-20 w-20 ring-4 ring-offset-4 ring-offset-white transition-all duration-300",
                            coach.atCapacity
                              ? "ring-fc-100"
                              : "ring-fc-100 group-hover:ring-fc-200"
                          )}
                        >
                          {coach.photo && (
                            <AvatarImage src={coach.photo} alt={coach.name} />
                          )}
                          <AvatarFallback
                            className={cn(
                              "text-lg font-display font-semibold",
                              coach.atCapacity
                                ? "bg-fc-50 text-fc-400"
                                : "bg-gradient-to-br from-fc-100 to-fc-50 text-fc-700"
                            )}
                          >
                            {coach.initials}
                          </AvatarFallback>
                        </Avatar>
                        {coach.atCapacity && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-fc-100 px-3 py-0.5 text-[11px] font-medium text-fc-600">
                            At Capacity
                          </div>
                        )}
                      </div>

                      <CardTitle className="mt-4 text-lg text-fc-900">
                        {coach.name}
                      </CardTitle>

                      {/* Credentials */}
                      <div className="mt-1 flex items-center gap-1.5">
                        {coach.credentials.map((cred) => (
                          <span
                            key={cred}
                            className="text-[10px] font-semibold tracking-wider text-fc-600 uppercase"
                          >
                            {cred}
                          </span>
                        ))}
                        <span className="text-fc-300">&middot;</span>
                        <span className="text-xs text-muted-foreground">
                          {coach.yearsExperience} yrs
                        </span>
                      </div>

                      {/* Location */}
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

                      {/* Video link (text only — per spec) */}
                      {coach.videoUrl && !coach.atCapacity && (
                        <a
                          href={coach.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-fc-600 hover:text-fc-800 hover:underline underline-offset-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Watch introduction video
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h6v6" />
                            <path d="M10 14 21 3" />
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          </svg>
                        </a>
                      )}
                    </CardContent>

                    <CardFooter className="relative px-6 pb-6">
                      <Button
                        variant="default"
                        size="lg"
                        className="w-full"
                        disabled={coach.atCapacity}
                        onClick={() => setConfirmCoach(coach)}
                      >
                        {coach.atCapacity ? "Unavailable" : "Select This Coach"}
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
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
              style={{ transitionDelay: mounted ? "600ms" : "0ms" }}
            >
              <Button
                variant="outline"
                size="lg"
                className="gap-2.5"
                onClick={handleRemix}
                disabled={!canRemix}
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
                    !canRemix ? "opacity-40" : "group-hover:rotate-180"
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
            className="absolute inset-0 bg-fc-950/30 backdrop-blur-sm animate-fade-in"
            style={{ animationDuration: "200ms" }}
            onClick={() => !selecting && setConfirmCoach(null)}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-md animate-scale-in"
            style={{ animationDuration: "300ms" }}
          >
            <Card className="overflow-hidden border-fc-200/50 shadow-2xl shadow-fc-900/10">
              {/* FC blue accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-fc-600 via-fc-500 to-fc-600" />

              <CardHeader className="items-center pb-2 pt-8 text-center">
                <Avatar className="mb-4 h-20 w-20 ring-4 ring-fc-100 ring-offset-4 ring-offset-white">
                  {confirmCoach.photo && (
                    <AvatarImage
                      src={confirmCoach.photo}
                      alt={confirmCoach.name}
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-fc-100 to-fc-50 text-xl font-display font-semibold text-fc-700">
                    {confirmCoach.initials}
                  </AvatarFallback>
                </Avatar>

                <CardTitle className="text-xl text-fc-900">
                  Confirm Your Coach
                </CardTitle>
                <CardDescription className="mt-1">
                  You are selecting{" "}
                  <span className="font-medium text-fc-800">
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
                      className="mt-0.5 shrink-0 text-fc-600"
                    >
                      <circle cx="12" cy="8" r="6" />
                      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-fc-500">
                        Credentials
                      </p>
                      <p className="text-sm text-fc-800">
                        {confirmCoach.credentials.join(", ")} &middot;{" "}
                        {confirmCoach.yearsExperience} years experience
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
                      className="mt-0.5 shrink-0 text-fc-600"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-fc-500">
                        Specialties
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {confirmCoach.specialties.map((s) => (
                          <Badge
                            key={s}
                            variant="default"
                            className="text-[11px]"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
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
                      className="mt-0.5 shrink-0 text-fc-600"
                    >
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-fc-500">
                        Location
                      </p>
                      <p className="text-sm text-fc-800">
                        {confirmCoach.location}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Intro Call CTA (5-session track only) */}
                {CURRENT_PARTICIPANT.programTrack === "FIVE_SESSION" && (
                  <div className="mt-5 rounded-lg border border-fc-200/50 bg-fc-50/50 p-4">
                    <div className="flex items-start gap-3">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-0.5 shrink-0 text-fc-600"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-fc-800">
                          Want to meet your coach first?
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-fc-600">
                          Schedule a free 20-minute introductory call to see if
                          it&apos;s the right fit before committing to your 5-session
                          engagement.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 gap-1.5 border-fc-200 text-fc-700 hover:bg-fc-50"
                          onClick={() =>
                            window.open(confirmCoach.meetingBookingUrl, "_blank")
                          }
                          disabled={selecting}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h6v6" />
                            <path d="M10 14 21 3" />
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          </svg>
                          Schedule Intro Call
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 rounded-lg bg-fc-50/50 p-3.5">
                  <p className="text-xs leading-relaxed text-fc-600">
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
                  variant="default"
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
