/**
 * Deterministic performance score derived from a staff UUID.
 * Range: [50, 100] — no officer will ever appear below 50%.
 * The same UUID always produces the same score, so the value is stable
 * across page refreshes without requiring a database column.
 */

export const PERFORMANCE_THRESHOLD = 80;

/**
 * Converts a UUID string into a stable integer in [50, 100].
 *
 * Algorithm:
 *  1. Strip dashes, take every other hex character → 16 chars.
 *  2. Parse as a big-endian unsigned 32-bit integer from the first 8 chars.
 *  3. Map to [0, 50] via modulo, then add 50 → [50, 100].
 *
 * This is intentionally non-cryptographic and fast.
 */
export function getPerformanceScore(staffId: string): number {
  // Remove hyphens to get a plain hex string, e.g. "550e8400e29b41d4..."
  const hex = staffId.replace(/-/g, "");

  // Parse 8 hex chars (32 bits) as an unsigned integer.
  // Using >>> 0 to ensure unsigned treatment in JavaScript.
  const seed = (parseInt(hex.slice(0, 8), 16) >>> 0);

  // Map to [0, 50] then shift to [50, 100].
  return 50 + (seed % 51);
}

/**
 * Returns a tone string based on the performance score.
 *   ≥ 80 → "success" (green)
 *   ≥ 60 → "warning" (amber)
 *   < 60  → "danger"  (red)
 */
export type PerformanceTone = "success" | "warning" | "danger";

export function getPerformanceTone(score: number): PerformanceTone {
  if (score >= PERFORMANCE_THRESHOLD) return "success";
  if (score >= 60) return "warning";
  return "danger";
}
