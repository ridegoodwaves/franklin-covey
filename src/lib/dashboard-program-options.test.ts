import { describe, expect, it } from "vitest";
import type { DashboardKpiResponse } from "@/lib/types/dashboard";
import { resolveDashboardProgramOptions, USPS_PROGRAM_OPTIONS } from "@/lib/dashboard-program-options";

function withProgramBreakdown(
  breakdown: DashboardKpiResponse["programBreakdown"]
): Pick<DashboardKpiResponse, "programBreakdown"> {
  return { programBreakdown: breakdown };
}

describe("resolveDashboardProgramOptions", () => {
  it("returns canonical USPS options when KPI data is not available", () => {
    expect(resolveDashboardProgramOptions(null)).toEqual(USPS_PROGRAM_OPTIONS);
  });

  it("does not collapse options when KPI response is filtered to a single program", () => {
    const filteredKpis = withProgramBreakdown([
      {
        programCode: "ALP",
        total: 10,
        completed: 3,
        completionRate: 30,
      },
    ]);

    expect(resolveDashboardProgramOptions(filteredKpis)).toEqual(USPS_PROGRAM_OPTIONS);
  });

  it("keeps canonical option order even if breakdown arrives in a different order", () => {
    const mixedOrderKpis = withProgramBreakdown([
      {
        programCode: "EL",
        total: 8,
        completed: 4,
        completionRate: 50,
      },
      {
        programCode: "MLP",
        total: 12,
        completed: 6,
        completionRate: 50,
      },
    ]);

    expect(resolveDashboardProgramOptions(mixedOrderKpis)).toEqual(USPS_PROGRAM_OPTIONS);
  });
});
