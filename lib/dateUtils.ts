/**
 * Date helpers. The original app treated every calendar day as a working
 * day (`addDays`/`diffDays`); this version adds a parallel set of
 * business-day-aware functions and uses those for planning/delay math,
 * while keeping the calendar-day functions for things that are
 * genuinely calendar-based (week numbering, "raised on" timestamps).
 *
 * All ISO-date arithmetic below is done in UTC (parse with a "Z" suffix,
 * increment with the getUTC/setUTCDate family, serialize with toISOString). Mixing
 * local-time parsing (`new Date(iso + "T00:00:00")`) with UTC
 * serialization (`toISOString()`) is a classic bug: in any UTC+ timezone
 * it silently shifts every computed date back a day, and since planned
 * finish is derived by feeding planned start back through the same
 * function, the shift compounds — finish can end up *before* start.
 * Working entirely in UTC sidesteps that regardless of the viewer's
 * timezone. `todayISO` is the one exception: it deliberately reads the
 * browser's *local* calendar date, since that's the date the person
 * looking at the screen actually calls "today".
 */

export const toISO = (d: Date): string => d.toISOString().slice(0, 10);

export const parseISO = (isoDate: string): Date => new Date(isoDate + "T00:00:00Z");

export const addDays = (isoDate: string, days: number): string => {
  const d = parseISO(isoDate);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return toISO(d);
};

export const fmt = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const fmtDateTime = (isoDateTime: string): string => {
  const d = new Date(isoDateTime);
  return `${fmt(toISO(d))} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

export const diffDays = (a: string, b: string): number => Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86400000);

// Deliberately local (not UTC) — "today" means the viewer's own calendar
// date, not UTC's, which can be a day off from local in either direction.
export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ---------------------------------------------------------------------
   WORKING-DAY (business-day) CALENDAR

   Saturday and Sunday are never working days. Day offsets and task
   durations are expressed in working days: "Duration = 5 working days,
   Start = Monday" finishes Friday, not Sunday.
------------------------------------------------------------------------ */
export function isWeekend(isoDate: string): boolean {
  const day = parseISO(isoDate).getUTCDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6;
}

// Advance `isoDate` by `count` working days (count may be 0). Landing on
// a weekend is never a valid result — this always lands on a weekday.
export function addWorkingDays(isoDate: string, count: number): string {
  const d = parseISO(isoDate);
  let remaining = Math.trunc(Number(count) || 0);
  const step = remaining >= 0 ? 1 : -1;
  remaining = Math.abs(remaining);
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + step);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  // If count was 0 but the start date itself is a weekend, nudge forward
  // to the next working day — an offset of 0 should still land on a
  // real working day.
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + (step || 1));
  return toISO(d);
}

// Count working days strictly between two ISO dates (a - b), signed.
// Used for "Xd overdue" so weekends sitting inside the gap don't count.
export function businessDaysBetween(a: string, b: string): number {
  if (a === b) return 0;
  const sign = parseISO(a) > parseISO(b) ? 1 : -1;
  const [start, end] = sign === 1 ? [b, a] : [a, b];
  const d = parseISO(start);
  const endD = parseISO(end);
  let count = 0;
  while (d < endD) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count * sign;
}

export function weekNumber(dateISO: string | null | undefined, projectStartDate: string | null | undefined): number | null {
  if (!dateISO || !projectStartDate) return null;
  return Math.floor(diffDays(dateISO, projectStartDate) / 7) + 1;
}
