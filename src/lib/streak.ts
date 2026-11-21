import { addDays } from "./dates";

/**
 * Consecutive logged days ending today, or ending yesterday when today
 * has not been logged yet.
 */
export function loggingStreak(loggedDates: string[], today: string): number {
  const logged = new Set(loggedDates);
  let cursor = logged.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (logged.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
