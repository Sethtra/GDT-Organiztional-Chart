import { describe, expect, it } from "vitest";

import { parseHrFeaturesEnabled } from "../src/config/hrFeatures";

describe("HR feature rollout flag", () => {
  it("defaults to disabled when the environment is not migration-ready", () => {
    expect(parseHrFeaturesEnabled(undefined)).toBe(false);
    expect(parseHrFeaturesEnabled("")).toBe(false);
    expect(parseHrFeaturesEnabled("false")).toBe(false);
    expect(parseHrFeaturesEnabled("1")).toBe(false);
  });

  it("enables HR UI only for an explicit true value", () => {
    expect(parseHrFeaturesEnabled("true")).toBe(true);
    expect(parseHrFeaturesEnabled(" TRUE ")).toBe(true);
  });
});
