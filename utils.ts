import type { Status } from "./types";

export type ViewMode = "weekly" | "biweekly" | "monthly" | "quarterly";

export function getWeekInfo(offset = 0) {
  const now = new Date();
  const dow = now.getDay();
  const mon = new Date(now); mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const jan1 = new Date(mon.getFullYear(), 0, 1);
  const wk = Math.ceil(((mon.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return { wk, range: `${fmt(mon)} – ${fmt(fri)} ${mon.getFullYear()}` };
}

/** Count Mon-Fri weekdays between two dates inclusive. */
export function countWeekdays(start: Date, end: Date): number {
  if (end < start) return 0;
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  const e = new Date(end); e.setHours(0, 0, 0, 0);
  let count = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

/** Weekdays in quarter qIdx0 (0..3) of `year`. If activeSince is on/after the quarter start, count only from that date. */
export function weekdaysInQuarter(year: number, qIdx0: number, activeSince?: string): number {
  const qStart = new Date(year, qIdx0 * 3, 1);
  const qEnd = new Date(year, qIdx0 * 3 + 3, 0);
  let start = qStart;
  if (activeSince) {
    const a = new Date(activeSince);
    if (!isNaN(a.getTime()) && a > qStart) start = a;
  }
  if (start > qEnd) return 0;
  return countWeekdays(start, qEnd);
}

export function getQuarterInfo(offset = 0) {
  const now = new Date();
  const baseQ = Math.floor(now.getMonth() / 3);
  const qIndex = baseQ + offset;
  const year = now.getFullYear() + Math.floor(qIndex / 4);
  const q = ((qIndex % 4) + 4) % 4;
  const start = new Date(year, q * 3, 1);
  const end = new Date(year, q * 3 + 3, 0);
  return { q: q + 1, year, start, end, label: `Q${q + 1} ${year}` };
}

export function getRangeInfo(mode: ViewMode, offset = 0) {
  const now = new Date();
  const dow = now.getDay();
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  let start: Date, end: Date, label: string;
  if (mode === "weekly") {
    start = new Date(now); start.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
    end = new Date(start); end.setDate(start.getDate() + 6);
    label = `${fmt(start)} – ${fmt(end)}`;
  } else if (mode === "biweekly") {
    const mon = new Date(now); mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    start = new Date(mon); start.setDate(mon.getDate() - 7 + offset * 14);
    end = new Date(start); end.setDate(start.getDate() + 13);
    label = `${fmt(start)} – ${fmt(end)}`;
  } else if (mode === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    label = start.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  } else {
    const qi = getQuarterInfo(offset);
    start = qi.start; end = qi.end;
    label = `${qi.label} · ${fmt(start)} – ${fmt(end)}`;
  }
  start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
  return { start, end, label };
}


export function inRange(iso: string, start: Date, end: Date) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function formatDate(iso: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export const STATUS_STYLES: Record<Status, { bg: string; fg: string }> = {
  "Live":         { bg: "rgba(0,200,74,0.12)",  fg: "#007B2E" },
  "In Progress":  { bg: "rgba(0,190,239,0.12)", fg: "#006A8A" },
  "Planning":     { bg: "rgba(245,158,11,0.10)", fg: "#92580A" },
  "Review":       { bg: "rgba(124,58,237,0.10)", fg: "#5B21B6" },
  "Done":         { bg: "rgba(100,116,139,0.10)", fg: "#475569" },
  "Complete":     { bg: "rgba(16,185,129,0.12)", fg: "#065F46" },
  "Delay":        { bg: "rgba(249,115,22,0.12)", fg: "#7C2D12" },
  "Bottleneck":   { bg: "rgba(239,68,68,0.11)",  fg: "#7F1D1D" },
  "Escalation Required": { bg: "rgba(220,38,38,0.14)", fg: "#7F1D1D" },
};

export const ALL_STATUSES: Status[] = [
  "In Progress", "Live", "Planning", "Review", "Done", "Complete", "Delay", "Bottleneck", "Escalation Required",
];
