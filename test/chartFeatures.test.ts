import { describe, expect, it } from "vitest";

import { parseChartVersionWritesEnabled } from "../src/config/chartFeatures";

describe("chart-version rollout flag", () => {
  it("keeps cloud version writes disabled by default", () => {
    expect(parseChartVersionWritesEnabled(undefined)).toBe(false);
    expect(parseChartVersionWritesEnabled("")).toBe(false);
    expect(parseChartVersionWritesEnabled("false")).toBe(false);
  });

  it("requires an explicit true value", () => {
    expect(parseChartVersionWritesEnabled("true")).toBe(true);
    expect(parseChartVersionWritesEnabled(" TRUE ")).toBe(true);
  });
});
