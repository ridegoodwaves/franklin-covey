"use client";

import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CoachBioModalData {
  id: string;
  name: string;
  initials: string;
  photo?: string;
  bio: string;
  credentials: string[];
  location: string;
  yearsExperience?: number;
  atCapacity?: boolean;
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

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl shadow-fc-900/10 border border-fc-100 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-fc-50 hover:text-fc-800"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-8">
          {/* Coach identity */}
          <div className="flex flex-col items-center text-center gap-3 pb-6 border-b border-fc-100">
            <Avatar className={cn(
              "h-20 w-20 ring-4 ring-offset-4 ring-offset-white",
              coach.atCapacity ? "ring-fc-100" : "ring-fc-100"
            )}>
              {coach.photo && <AvatarImage src={coach.photo} alt={coach.name} />}
              <AvatarFallback className="text-lg font-display font-semibold bg-gradient-to-br from-fc-600 to-fc-800 text-white">
                {coach.initials}
              </AvatarFallback>
            </Avatar>

            <div>
              <h2 className="font-display text-xl font-medium text-fc-900">{coach.name}</h2>
              {coach.credentials.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground leading-snug">
                  {coach.credentials.join(" · ")}
                  {coach.yearsExperience ? ` · ${coach.yearsExperience} yrs experience` : ""}
                </p>
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
          </div>

          {/* Full bio */}
          <div className="pt-6">
            <p className="text-sm leading-relaxed text-fc-700">{coach.bio}</p>
          </div>

          {/* Select button — only shown when onSelect is provided and coach is not at capacity */}
          {onSelect && !coach.atCapacity && (
            <div className="pt-6">
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
    </div>
  );
}
