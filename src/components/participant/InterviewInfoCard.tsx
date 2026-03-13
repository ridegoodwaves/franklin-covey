import { PROGRAM_ADMIN } from "@/lib/config";
import { cn } from "@/lib/utils";

export function InterviewInfoCard({ className }: { className?: string }) {
  return (
    <div
      role="note"
      aria-label="Coach interview option"
      className={cn(
        "mx-auto mt-8 max-w-3xl rounded-xl border border-fc-200 bg-fc-50 px-5 py-4 text-center text-sm text-fc-800",
        className
      )}
    >
      If you would like to conduct 30-minute chemistry interviews with any of the coaches prior to
      selection, please reach out to{" "}
      <a
        href={`mailto:${PROGRAM_ADMIN.email}`}
        className="font-semibold text-fc-700 underline underline-offset-2 transition-colors hover:text-fc-900"
      >
        {PROGRAM_ADMIN.email}
      </a>
      .
    </div>
  );
}
