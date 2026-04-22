/**
 * Pure helpers to keep an array of criterion weights summing to exactly 100.
 * Locked indices are never modified.
 */

const TOTAL = 100;

function roundToTotal(weights: number[], lockedSet: Set<number>): number[] {
  const result = weights.map((w) => Math.max(0, Math.round(w)));
  const sum = result.reduce((s, w) => s + w, 0);
  let diff = TOTAL - sum;
  if (diff === 0) return result;

  // Adjust on unlocked indices, picking the largest (or smallest if we need to subtract).
  const unlocked = result
    .map((w, i) => ({ w, i }))
    .filter(({ i }) => !lockedSet.has(i));
  if (unlocked.length === 0) return result;

  // Sort: if diff>0 we add to largest first; if diff<0 we subtract from largest first.
  unlocked.sort((a, b) => b.w - a.w);

  let idx = 0;
  while (diff !== 0) {
    const target = unlocked[idx % unlocked.length];
    const candidate = result[target.i] + (diff > 0 ? 1 : -1);
    if (candidate >= 0 && candidate <= TOTAL) {
      result[target.i] = candidate;
      diff += diff > 0 ? -1 : 1;
    }
    idx++;
    if (idx > 10000) break; // safety
  }
  return result;
}

/**
 * Equal distribution across unlocked indices, keeping locked weights intact.
 */
export function equalize(weights: number[], lockedSet: Set<number> = new Set()): number[] {
  const lockedSum = weights.reduce(
    (s, w, i) => (lockedSet.has(i) ? s + w : s),
    0,
  );
  const remaining = Math.max(0, TOTAL - lockedSum);
  const unlockedIdx = weights.map((_, i) => i).filter((i) => !lockedSet.has(i));
  if (unlockedIdx.length === 0) return [...weights];
  const base = remaining / unlockedIdx.length;
  const next = [...weights];
  unlockedIdx.forEach((i) => {
    next[i] = base;
  });
  return roundToTotal(next, lockedSet);
}

/**
 * Update a single weight and redistribute the delta on the other unlocked weights,
 * proportionally to their current values. Returns a new array summing to 100.
 */
export function rebalance(
  weights: number[],
  lockedSet: Set<number>,
  changedIndex: number,
  newValue: number,
): number[] {
  if (weights.length === 0) return [];
  if (weights.length === 1) return [TOTAL];

  const lockedSum = weights.reduce(
    (s, w, i) => (lockedSet.has(i) && i !== changedIndex ? s + w : s),
    0,
  );
  const maxAllowed = Math.max(0, TOTAL - lockedSum);
  const clamped = Math.min(Math.max(0, Math.round(newValue)), maxAllowed);

  const pool = weights
    .map((_, i) => i)
    .filter((i) => i !== changedIndex && !lockedSet.has(i));

  if (pool.length === 0) {
    // Nothing to redistribute on — refuse the change.
    return [...weights];
  }

  const next = [...weights];
  next[changedIndex] = clamped;

  const poolBudget = Math.max(0, TOTAL - lockedSum - clamped);
  const poolCurrentSum = pool.reduce((s, i) => s + weights[i], 0);

  if (poolCurrentSum <= 0) {
    // Distribute equally on the pool.
    const base = poolBudget / pool.length;
    pool.forEach((i) => {
      next[i] = base;
    });
  } else {
    pool.forEach((i) => {
      next[i] = (weights[i] / poolCurrentSum) * poolBudget;
    });
  }

  // Locked positions stay as-is.
  const finalLocked = new Set(lockedSet);
  finalLocked.add(changedIndex); // protect the user's typed value during rounding
  return roundToTotal(next, finalLocked);
}

/**
 * Normalize an arbitrary weight array to sum to 100, preserving proportions.
 * Used when opening an existing project whose stored weights don't add up.
 */
export function normalizeToTotal(weights: number[]): number[] {
  if (weights.length === 0) return [];
  if (weights.length === 1) return [TOTAL];
  const sum = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (sum === 0) return equalize(weights.map(() => 0));
  const scaled = weights.map((w) => (Math.max(0, w) / sum) * TOTAL);
  return roundToTotal(scaled, new Set());
}

/**
 * Compute the weight to give to a newly added criterion: average of unlocked weights.
 * Returns the new full array (sums to 100).
 */
export function addCriterionWeight(
  weights: number[],
  lockedSet: Set<number>,
): number[] {
  if (weights.length === 0) return [TOTAL];
  const unlocked = weights
    .map((w, i) => ({ w, i }))
    .filter(({ i }) => !lockedSet.has(i));
  const avg =
    unlocked.length > 0
      ? unlocked.reduce((s, { w }) => s + w, 0) / unlocked.length
      : TOTAL / (weights.length + 1);
  const next = [...weights, Math.round(avg)];
  // Treat the newly added one as the "changed" so others rebalance around it.
  return rebalance(next, lockedSet, next.length - 1, Math.round(avg));
}

/**
 * Remove a criterion and redistribute its weight on the remaining unlocked ones.
 */
export function removeCriterionWeight(
  weights: number[],
  lockedSet: Set<number>,
  removeIndex: number,
): number[] {
  const next = weights.filter((_, i) => i !== removeIndex);
  // Rebuild locked set with shifted indices.
  const newLocked = new Set<number>();
  lockedSet.forEach((i) => {
    if (i < removeIndex) newLocked.add(i);
    else if (i > removeIndex) newLocked.add(i - 1);
  });
  if (next.length === 0) return [];
  if (next.length === 1) return [TOTAL];
  return normalizeToTotal(next).length === next.length
    ? equalizeKeepingLocked(next, newLocked)
    : next;
}

function equalizeKeepingLocked(weights: number[], lockedSet: Set<number>): number[] {
  const lockedSum = weights.reduce(
    (s, w, i) => (lockedSet.has(i) ? s + w : s),
    0,
  );
  const budget = Math.max(0, TOTAL - lockedSum);
  const pool = weights.map((_, i) => i).filter((i) => !lockedSet.has(i));
  if (pool.length === 0) return roundToTotal(weights, lockedSet);
  const currentPoolSum = pool.reduce((s, i) => s + weights[i], 0);
  const next = [...weights];
  if (currentPoolSum <= 0) {
    const base = budget / pool.length;
    pool.forEach((i) => {
      next[i] = base;
    });
  } else {
    pool.forEach((i) => {
      next[i] = (weights[i] / currentPoolSum) * budget;
    });
  }
  return roundToTotal(next, lockedSet);
}
