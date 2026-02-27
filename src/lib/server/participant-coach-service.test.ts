import { describe, it, expect } from "vitest";
import { pickCoachBatch, CAPACITY_COUNT_STATUSES } from "./participant-coach-service";
import { buildCoachProfileBundle } from "@/__tests__/factories";

function makeCoaches(count: number, overrides: Record<string, unknown> = {}) {
  return Array.from({ length: count }, (_, i) =>
    buildCoachProfileBundle({
      id: `coach-${i + 1}`,
      ...overrides,
    })
  );
}

describe("pickCoachBatch", () => {
  it("returns exactly 3 when pool has >= 3 available coaches", () => {
    const coaches = makeCoaches(5);
    const { selected } = pickCoachBatch({ coaches, shownCoachIds: [], count: 3 });
    expect(selected.length).toBe(3);
  });

  it("no returned coach has atCapacity: true", () => {
    const coaches = [
      ...makeCoaches(3),
      buildCoachProfileBundle({ id: "full-coach", atCapacity: true, remainingCapacity: 0 }),
    ];
    const { selected } = pickCoachBatch({ coaches, shownCoachIds: [], count: 3 });
    expect(selected.every((c) => !c.atCapacity)).toBe(true);
    expect(selected.map((c) => c.id)).not.toContain("full-coach");
  });

  it("excludes previously shown coaches when possible", () => {
    const coaches = makeCoaches(5);
    const { selected } = pickCoachBatch({
      coaches,
      shownCoachIds: ["coach-1", "coach-2"],
      count: 3,
    });
    expect(selected.map((c) => c.id)).not.toContain("coach-1");
    expect(selected.map((c) => c.id)).not.toContain("coach-2");
  });

  it("returns < count when pool has fewer available coaches", () => {
    const coaches = makeCoaches(2);
    const { selected } = pickCoachBatch({ coaches, shownCoachIds: [], count: 3 });
    expect(selected.length).toBe(2);
  });

  it("returns empty array when 0 available coaches", () => {
    const coaches = makeCoaches(3, { atCapacity: true, remainingCapacity: 0 });
    const { selected } = pickCoachBatch({ coaches, shownCoachIds: [], count: 3 });
    expect(selected).toHaveLength(0);
  });

  it("returns empty array for empty pool", () => {
    const { selected } = pickCoachBatch({ coaches: [], shownCoachIds: [], count: 3 });
    expect(selected).toHaveLength(0);
  });

  it("marks poolExhausted when all unseen are used and refill needed", () => {
    const coaches = makeCoaches(4);
    // Show 3 of 4, request 3 — only 1 unseen, need refill
    const { poolExhausted } = pickCoachBatch({
      coaches,
      shownCoachIds: ["coach-1", "coach-2", "coach-3"],
      count: 3,
    });
    expect(poolExhausted).toBe(true);
  });

  it("does not mark poolExhausted when enough unseen coaches exist", () => {
    const coaches = makeCoaches(6);
    const { poolExhausted } = pickCoachBatch({
      coaches,
      shownCoachIds: ["coach-1"],
      count: 3,
    });
    expect(poolExhausted).toBe(false);
  });
});

describe("CAPACITY_COUNT_STATUSES", () => {
  it("includes COACH_SELECTED, IN_PROGRESS, ON_HOLD", () => {
    expect(CAPACITY_COUNT_STATUSES).toContain("COACH_SELECTED");
    expect(CAPACITY_COUNT_STATUSES).toContain("IN_PROGRESS");
    expect(CAPACITY_COUNT_STATUSES).toContain("ON_HOLD");
  });

  it("excludes COMPLETED, CANCELED, INVITED", () => {
    expect(CAPACITY_COUNT_STATUSES).not.toContain("COMPLETED");
    expect(CAPACITY_COUNT_STATUSES).not.toContain("CANCELED");
    expect(CAPACITY_COUNT_STATUSES).not.toContain("INVITED");
  });
});
