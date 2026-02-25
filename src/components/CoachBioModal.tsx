"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// FC brand accent colors used for Highlights separators (cycles through)
const HIGHLIGHT_RULE_COLORS = [
  "#67DFFF", // Light Sky
  "#FFB93C", // Golden
  "#FF585D", // Coral
  "#A191F2", // Violet
  "#45D8B4", // Green
];

export interface CoachBioModalData {
  id: string;
  name: string;
  initials: string;
  photo?: string;
  bio: string;
  specialties: string[];
  credentials: string[];
  location: string;
  yearsExperience?: number;
  atCapacity?: boolean;
  quotes?: Array<{ quote: string; attribution?: string }>;
  videoUrl?: string;
}

interface CoachBioModalProps {
  coach: CoachBioModalData | null;
  onClose: () => void;
  /** If provided, shows a "Select This Coach" button inside the modal. */
  onSelect?: (coachId: string) => void;
  /** Disables the Select button (e.g. while another selection is in progress). */
  selectDisabled?: boolean;
}

export function CoachBioModal({
  coach,
  onClose,
  onSelect,
  selectDisabled,
}: CoachBioModalProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (coach) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [coach]);

  if (!coach) return null;

  const firstName = coach.name.split(" ")[0] ?? coach.name;
  const hasHighlights = coach.specialties.length > 0;
  const hasCredentials = coach.credentials.length > 0;
  const hasQuotes = (coach.quotes?.length ?? 0) > 0;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl shadow-fc-900/15 border border-fc-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* FC brand gradient accent bar */}
        <div className="h-1.5 rounded-t-2xl bg-gradient-to-r from-fc-600 via-fc-500 to-[#67DFFF] flex-shrink-0" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-5 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-fc-50 hover:text-fc-800"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>

        {/* Two-column scrollable body */}
        <div className="flex flex-col sm:flex-row overflow-y-auto flex-1 min-h-0">

          {/* ── LEFT COLUMN: photo + highlights ── */}
          <div className="sm:w-56 md:w-64 flex-shrink-0 bg-fc-50/60 border-b sm:border-b-0 sm:border-r border-fc-100 flex flex-col gap-6 p-6">

            {/* Photo */}
            <div className="overflow-hidden rounded-xl bg-gradient-to-br from-fc-600 to-fc-800 aspect-square w-full">
              {coach.photo ? (
                <img
                  src={coach.photo}
                  alt={coach.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-display text-5xl font-semibold text-white select-none">
                    {coach.initials}
                  </span>
                </div>
              )}
            </div>

            {/* Highlights (from CoachHighlight / specialties) */}
            {hasHighlights && (
              <div>
                <h3 className="font-display text-sm font-bold text-fc-900 mb-3 tracking-wide uppercase" style={{ fontSize: "11px", letterSpacing: "0.06em" }}>
                  Highlights
                </h3>
                <div>
                  {coach.specialties.map((item, i) => (
                    <div key={i}>
                      <div
                        className="h-0.5 w-full rounded-full"
                        style={{ backgroundColor: HIGHLIGHT_RULE_COLORS[i % HIGHLIGHT_RULE_COLORS.length] }}
                      />
                      <p className="py-3 text-xs leading-snug text-fc-700">{item}</p>
                    </div>
                  ))}
                  {/* Closing rule */}
                  <div
                    className="h-0.5 w-full rounded-full"
                    style={{ backgroundColor: HIGHLIGHT_RULE_COLORS[coach.specialties.length % HIGHLIGHT_RULE_COLORS.length] }}
                  />
                </div>
              </div>
            )}

            {/* Years experience (if no highlights to fill space) */}
            {!hasHighlights && coach.yearsExperience && (
              <div className="rounded-lg bg-white border border-fc-100 p-3 text-center">
                <p className="text-2xl font-display font-semibold text-fc-700">{coach.yearsExperience}</p>
                <p className="text-xs text-muted-foreground mt-0.5">years experience</p>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: bio content ── */}
          <div className="flex-1 min-w-0 p-7 sm:p-8 overflow-y-auto">

            {/* Name + meta */}
            <div className="mb-6">
              <h2 className="font-display text-3xl sm:text-4xl font-light tracking-tight text-fc-900 leading-tight">
                {coach.name}
              </h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {coach.location && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {coach.location}
                  </span>
                )}
                {coach.yearsExperience ? (
                  <span className="inline-flex items-center rounded-full bg-fc-50 border border-fc-100 px-2.5 py-0.5 text-[11px] font-semibold text-fc-700">
                    {coach.yearsExperience} yrs experience
                  </span>
                ) : null}
              </div>
            </div>

            {/* Bio */}
            <div className="mb-7">
              <p className="text-sm leading-relaxed text-fc-700">{coach.bio}</p>
            </div>

            {/* Education & Certifications */}
            {hasCredentials && (
              <div className="mb-7">
                <h3 className="font-display text-base font-bold text-fc-900 mb-3">
                  Education &amp; Certifications
                </h3>
                <ul className="space-y-2">
                  {coach.credentials.map((cred, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fc-500" />
                      <span className="text-sm text-fc-700 leading-snug">{cred}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* What learners say */}
            {hasQuotes && (
              <div className="mb-4">
                <h3 className="font-display text-base font-bold text-fc-900 mb-4">
                  What learners say about {firstName}…
                </h3>
                <div className="space-y-3">
                  {coach.quotes!.map((q, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-fc-50 border border-fc-100 p-4"
                    >
                      <p className="text-sm italic text-fc-700 leading-relaxed">
                        &ldquo;{q.quote}&rdquo;
                      </p>
                      {q.attribution && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          — {q.attribution}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video link */}
            {coach.videoUrl && (
              <div className="mt-6">
                <a
                  href={coach.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-fc-600 hover:text-fc-800 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" />
                  </svg>
                  Watch intro video
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Sticky footer with Select button */}
        {onSelect && !coach.atCapacity && (
          <div className="flex-shrink-0 border-t border-fc-100 px-8 py-5 bg-white">
            <Button
              size="lg"
              className="w-full"
              disabled={selectDisabled}
              onClick={() => {
                onSelect(coach.id);
                onClose();
              }}
            >
              Select This Coach
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
