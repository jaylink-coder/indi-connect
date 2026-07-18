const WINDOW_DAYS = 30;

export interface VelocityContribution {
  amount: number;
  date: Date;
}

export interface VelocityEstimate {
  /** KES raised per day, averaged over the last WINDOW_DAYS - "current pace", not a lifetime average. */
  dailyRate: number;
  daysRemaining: number | null;
  etaDate: string | null;
  status: "complete" | "stalled" | "on_track";
}

/**
 * Speed = distance / time, applied to fundraising: how fast is this project
 * actually moving right now (last 30 days of real contributions), and at
 * that pace, when does it hit its target. Deliberately windowed rather than
 * an all-time average, so the estimate reflects "current members' giving
 * pace" and moves as giving speeds up or dries up - never a fixed one-time
 * guess. "stalled" (no giving in the window) gets no ETA rather than an
 * infinite/misleading one.
 */
export function estimateCompletion(
  contributions: VelocityContribution[],
  targetAmount: number,
  raisedAmount: number
): VelocityEstimate {
  const remaining = Math.max(targetAmount - raisedAmount, 0);
  if (remaining <= 0) {
    return { dailyRate: 0, daysRemaining: 0, etaDate: null, status: "complete" };
  }

  const cutoff = new Date(Date.now() - WINDOW_DAYS * 86400000);
  const recentTotal = contributions.filter((c) => c.date >= cutoff).reduce((sum, c) => sum + c.amount, 0);
  const dailyRate = recentTotal / WINDOW_DAYS;

  if (dailyRate <= 0) {
    return { dailyRate: 0, daysRemaining: null, etaDate: null, status: "stalled" };
  }

  const daysRemaining = Math.ceil(remaining / dailyRate);
  const etaDate = new Date(Date.now() + daysRemaining * 86400000).toISOString();
  return { dailyRate, daysRemaining, etaDate, status: "on_track" };
}
