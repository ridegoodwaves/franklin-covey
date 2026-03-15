import type { ProgramCode } from "@prisma/client";
import type { DashboardKpiResponse } from "@/lib/types/dashboard";

export const USPS_PROGRAM_OPTIONS: readonly ProgramCode[] = ["MLP", "ALP", "EF", "EL"];

export function resolveDashboardProgramOptions(
  kpis: Pick<DashboardKpiResponse, "programBreakdown"> | null
): ProgramCode[] {
  const extras = new Set<ProgramCode>();

  for (const item of kpis?.programBreakdown ?? []) {
    if (!USPS_PROGRAM_OPTIONS.includes(item.programCode)) {
      extras.add(item.programCode);
    }
  }

  return [...USPS_PROGRAM_OPTIONS, ...extras];
}
