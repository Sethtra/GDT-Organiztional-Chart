import type { HrStaffDirectoryRecord } from "../contracts/hr";

/**
 * Only the fields required to place an officer on the headcount timeline.
 * `retiredDate` covers every kind of exit — statutory retirement and early
 * departures (resignation, transfer out, dismissal) alike — because it is the
 * single date the staff record stores for "no longer serving".
 */
export type WorkforceTrendRecord = Pick<
  HrStaffDirectoryRecord,
  "joinedDate" | "retiredDate" | "status"
>;

export interface WorkforceYear {
  year: number;
  /** Officers whose joined date falls in this year. */
  joined: number;
  /** Officers whose departure date falls in this year. */
  departed: number;
  /**
   * Officers still serving at the end of this year. Someone who joined in the
   * year is counted; someone who departed in the year is not. The current year
   * is measured as of today rather than 31 December.
   */
  headcount: number;
}

/** How many trailing years of the timeline to display. */
export type TrendRange = "5y" | "10y" | "all";

export const TREND_RANGES: TrendRange[] = ["5y", "10y", "all"];

export const TREND_RANGE_YEARS: Record<TrendRange, number | null> = {
  "5y": 5,
  "10y": 10,
  all: null,
};

export const TREND_RANGE_LABELS: Record<TrendRange, string> = {
  "5y": "Last 5 years",
  "10y": "Last 10 years",
  all: "All recorded years",
};

export function toIsoDate(date: Date): string {
  const year = `${date.getFullYear()}`.padStart(4, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function yearOf(isoDate: string): number | null {
  const year = Number.parseInt(isoDate.slice(0, 4), 10);
  return Number.isInteger(year) ? year : null;
}

function increment(counts: Map<number, number>, year: number): void {
  counts.set(year, (counts.get(year) ?? 0) + 1);
}

/**
 * Turns officer records into a year-by-year joined / departed / headcount
 * series. Dates in the future are treated as not yet happened, so the last
 * point of the series is the live headcount as of `today`.
 */
export function buildWorkforceYears(
  staff: WorkforceTrendRecord[],
  today: Date = new Date(),
): WorkforceYear[] {
  const todayIso = toIsoDate(today);
  const currentYear = today.getFullYear();
  const joinedByYear = new Map<number, number>();
  const departedByYear = new Map<number, number>();
  // Serving officers whose joined date was never recorded. They cannot start a
  // year bucket, so they are carried into every year of the series instead.
  let carriedIn = 0;

  for (const person of staff) {
    const archived = person.status !== "active";
    // A scheduled future retirement has not happened yet, so it neither ends a
    // career nor counts as a departure — unless the record is already archived.
    const departedIso =
      person.retiredDate && (archived || person.retiredDate <= todayIso)
        ? person.retiredDate
        : null;

    // An archived record with no departure date cannot be placed on the
    // timeline. Counting its arrival with no matching exit would inflate every
    // later year, so the record is left out of the series entirely.
    if (archived && !departedIso) continue;

    // Not yet on strength.
    if (person.joinedDate && person.joinedDate > todayIso) continue;

    const joinedYear = person.joinedDate ? yearOf(person.joinedDate) : null;
    const departedYear = departedIso ? yearOf(departedIso) : null;

    // Ignore records whose exit predates their arrival — the data is unusable
    // for a timeline and would otherwise produce negative headcounts.
    if (
      joinedYear !== null &&
      departedYear !== null &&
      departedYear < joinedYear
    ) {
      continue;
    }

    if (joinedYear === null) {
      carriedIn += 1;
    } else {
      increment(joinedByYear, Math.min(joinedYear, currentYear));
    }

    if (departedYear !== null) {
      increment(departedByYear, Math.min(departedYear, currentYear));
    }
  }

  const eventYears = [...joinedByYear.keys(), ...departedByYear.keys()];
  if (eventYears.length === 0) {
    return [{ year: currentYear, joined: 0, departed: 0, headcount: carriedIn }];
  }

  const firstYear = Math.min(...eventYears);
  const series: WorkforceYear[] = [];
  let headcount = carriedIn;

  for (let year = firstYear; year <= currentYear; year += 1) {
    const joined = joinedByYear.get(year) ?? 0;
    const departed = departedByYear.get(year) ?? 0;
    headcount += joined - departed;
    series.push({ year, joined, departed, headcount });
  }

  return series;
}

/** Trailing slice of the full series. Always keeps at least one year. */
export function sliceTrendRange(
  series: WorkforceYear[],
  range: TrendRange,
): WorkforceYear[] {
  const years = TREND_RANGE_YEARS[range];
  if (years === null || series.length <= years) return series;
  return series.slice(series.length - years);
}

export interface WorkforceTrendSummary {
  /** Officers serving as of today. */
  headcount: number;
  /** Arrivals within the visible range. */
  joined: number;
  /** Departures within the visible range. */
  departed: number;
  /** Net change across the visible range. */
  net: number;
}

export function summarizeTrendRange(
  visible: WorkforceYear[],
): WorkforceTrendSummary {
  const joined = visible.reduce((total, year) => total + year.joined, 0);
  const departed = visible.reduce((total, year) => total + year.departed, 0);
  return {
    headcount: visible.at(-1)?.headcount ?? 0,
    joined,
    departed,
    net: joined - departed,
  };
}
