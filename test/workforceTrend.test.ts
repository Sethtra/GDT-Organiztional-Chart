import { describe, expect, it } from "vitest";

import {
  aggregateTrendPeriods,
  aggregateTrendPeriodsToMaxPillars,
  sliceTrendYearRange,
  type WorkforceYear,
} from "../src/utils/workforceTrend";

function makeYears(count: number, startYear = 2001): WorkforceYear[] {
  return Array.from({ length: count }, (_, index) => ({
    year: startYear + index,
    joined: index + 1,
    departed: index % 2,
    headcount: 100 + index,
  }));
}

describe("aggregateTrendPeriods", () => {
  it("groups all recorded years into five-year pillars and keeps the remainder", () => {
    const periods = aggregateTrendPeriods(makeYears(23));

    expect(periods.map((period) => period.label)).toEqual([
      "2001-2005",
      "2006-2010",
      "2011-2015",
      "2016-2020",
      "2021-2023",
    ]);
    expect(periods.map((period) => period.joined)).toEqual([15, 40, 65, 90, 66]);
    expect(periods.map((period) => period.departed)).toEqual([2, 3, 2, 3, 1]);
    expect(periods.at(-1)?.headcount).toBe(122);
  });

  it("lets the final pillar grow as new years arrive", () => {
    expect(aggregateTrendPeriods(makeYears(24)).at(-1)?.label).toBe("2021-2024");
    expect(aggregateTrendPeriods(makeYears(25)).at(-1)?.label).toBe("2021-2025");
  });

  it("keeps any range to five adaptive pillars", () => {
    const pillars = aggregateTrendPeriodsToMaxPillars(makeYears(27));

    expect(pillars).toHaveLength(5);
    expect(pillars.map((period) => period.label)).toEqual([
      "2001-2006",
      "2007-2012",
      "2013-2018",
      "2019-2024",
      "2025-2027",
    ]);
  });
});

describe("trend year filters", () => {
  it("filters the series to an inclusive selected year range", () => {
    const visible = sliceTrendYearRange(makeYears(12), 2004, 2009);
    expect(visible.map((year) => year.year)).toEqual([
      2004, 2005, 2006, 2007, 2008, 2009,
    ]);
  });

  it("supports an open range boundary", () => {
    expect(sliceTrendYearRange(makeYears(5), 2003, null).map((year) => year.year)).toEqual([
      2003, 2004, 2005,
    ]);
    expect(sliceTrendYearRange(makeYears(5), null, 2002).map((year) => year.year)).toEqual([
      2001, 2002,
    ]);
  });

  it("returns no years for an invalid reversed range", () => {
    expect(sliceTrendYearRange(makeYears(5), 2004, 2002)).toEqual([]);
  });
});
