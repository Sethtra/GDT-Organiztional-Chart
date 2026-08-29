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
  /** Display label for an aggregated period; plain years leave this unset. */
  label?: string;
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

/**
 * Groups a year-by-year series into contiguous five-year periods.
 *
 * The final period intentionally keeps its remainder instead of backfilling
 * from the previous period: 23 years become 5 + 5 + 5 + 5 + 3, then 4 and 5
 * as new years are added. The period's headcount is its final year's value.
 */
export function aggregateTrendPeriods(
  series: WorkforceYear[],
  periodSize = 5,
): WorkforceYear[] {
  if (series.length === 0) return [];
  if (!Number.isInteger(periodSize) || periodSize < 1) {
    throw new Error("Trend period size must be a positive integer.");
  }

  const periods: WorkforceYear[] = [];
  for (let start = 0; start < series.length; start += periodSize) {
    const period = series.slice(start, start + periodSize);
    const first = period[0]!;
    const last = period.at(-1)!;
    const joined = period.reduce((total, year) => total + year.joined, 0);
    const departed = period.reduce((total, year) => total + year.departed, 0);

    periods.push({
      year: last.year,
      label:
        first.year === last.year
          ? `${first.year}`
          : `${first.year}-${last.year}`,
      joined,
      departed,
      headcount: last.headcount,
    });
  }

  return periods;
}

/** Group a series into no more than the requested number of pillars. */
export function aggregateTrendPeriodsToMaxPillars(
  series: WorkforceYear[],
  maxPillars = 5,
): WorkforceYear[] {
  if (series.length === 0) return [];
  if (!Number.isInteger(maxPillars) || maxPillars < 1) {
    throw new Error("Maximum trend pillars must be a positive integer.");
  }

  const periodSize = Math.max(1, Math.ceil(series.length / maxPillars));
  return aggregateTrendPeriods(series, periodSize);
}

/**
 * Keep only the inclusive year range selected by the dashboard controls.
 * Either boundary may be omitted to keep the corresponding edge open.
 */
export function sliceTrendYearRange(
  series: WorkforceYear[],
  startYear: number | null,
  endYear: number | null,
): WorkforceYear[] {
  if (series.length === 0) return [];
  const firstYear = startYear ?? series[0]!.year;
  const lastYear = endYear ?? series.at(-1)!.year;
  if (lastYear < firstYear) return [];
  return series.filter(({ year }) => year >= firstYear && year <= lastYear);
}

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
