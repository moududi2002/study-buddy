// ============================================================
// Path: apps/api/src/common/utils/date.util.ts
// ============================================================

export class DateUtil {
  // Get start of day (00:00:00) in local time
  static startOfDay(d: Date = new Date()): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  // Normalize to date-only (for @db.Date fields)
  static toDateOnly(d: Date | string): Date {
    const x = typeof d === 'string' ? new Date(d) : new Date(d);
    return new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
  }

  // YYYY-MM-DD
  static toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Difference in days between two dates (date-only)
  static diffDays(a: Date, b: Date): number {
    const ms = this.startOfDay(a).getTime() - this.startOfDay(b).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  // Get start (Saturday) and end (Friday) of the week containing given date
  static getWeekRange(d: Date = new Date()): { start: Date; end: Date } {
    const date = this.startOfDay(d);
    const day = date.getDay(); // 0=Sun, 6=Sat
    // Bangladesh week starts Saturday
    const diffToSat = (day + 1) % 7; // Sat=0, Sun=1, ... Fri=6
    const start = new Date(date);
    start.setDate(date.getDate() - diffToSat);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  static getMonthRange(d: Date = new Date()): { start: Date; end: Date } {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: this.startOfDay(start), end: this.startOfDay(end) };
  }
}