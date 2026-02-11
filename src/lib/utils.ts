import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(date);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    INVITED: "status-invited",
    COACH_SELECTED: "status-coach-selected",
    IN_PROGRESS: "status-in-progress",
    COMPLETED: "status-completed",
    CANCELED: "status-canceled",
    ON_HOLD: "status-on-hold",
    SCHEDULED: "bg-blue-50 text-blue-700",
    NO_SHOW: "bg-orange-50 text-orange-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    INVITED: "Invited",
    COACH_SELECTED: "Coach Selected",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELED: "Canceled",
    ON_HOLD: "On Hold",
    SCHEDULED: "Scheduled",
    NO_SHOW: "No Show",
    TWO_SESSION: "2-Session",
    FIVE_SESSION: "5-Session",
  };
  return labels[status] || status;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
