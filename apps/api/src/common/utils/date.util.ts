// ============================================================
// Path: apps/api/src/common/utils/date.util.ts
// ============================================================


const STUDY_TIMEZONE = 'Asia/Dhaka';
const DAY_MS = 24 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: STUDY_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export class DateUtil {
  static toDateOnly(value: Date | string): Date {
    if (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return date;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }

    const parts = dateFormatter.formatToParts(date);
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value);

    return new Date(
      Date.UTC(get('year'), get('month') - 1, get('day')),
    );
  }

  static startOfDay(date: Date = new Date()): Date {
    return this.toDateOnly(date);
  }

  static toISODate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  static diffDays(a: Date, b: Date): number {
    const first = this.toDateOnly(a).getTime();
    const second = this.toDateOnly(b).getTime();

    return Math.round((first - second) / DAY_MS);
  }

  static getWeekRange(
    date: Date = new Date(),
  ): { start: Date; end: Date } {
    const today = this.toDateOnly(date);

    // Bangladesh study week: Saturday to Friday
    const daysSinceSaturday = (today.getUTCDay() + 1) % 7;

    const start = new Date(today);
    start.setUTCDate(
      today.getUTCDate() - daysSinceSaturday,
    );

    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);

    return { start, end };
  }

  static getMonthRange(
    date: Date = new Date(),
  ): { start: Date; end: Date } {
    const today = this.toDateOnly(date);
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();

    return {
      start: new Date(Date.UTC(year, month, 1)),
      end: new Date(Date.UTC(year, month + 1, 0)),
    };
  }
}
