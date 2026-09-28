// ============================================================
// Path: apps/web/src/components/charts/study-line-chart.tsx
// ============================================================

'use client';

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { toBnDigits, formatMinutesShort } from '@/lib/bn';

interface Point {
  date: string;
  minutes: number;
}

export function StudyLineChart({ data }: { data: Point[] }) {
  // Convert date → ছোট label (e.g. 15, 16, 17)
  const chartData = data.map((d) => {
    const day = d.date.slice(-2);
    return { ...d, dayLabel: day.replace(/^0/, '') };
  });

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#F9A8D4" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE9FE" vertical={false} />
          <XAxis
            dataKey="dayLabel"
            tick={{ fontSize: 11, fill: '#7C3AED' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={(v) => toBnDigits(v)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#7C3AED' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => toBnDigits(v)}
            width={40}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: '1px solid #EDE9FE',
              boxShadow: '0 4px 20px rgba(167,139,250,0.15)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
            }}
            labelFormatter={(label) => `দিন ${toBnDigits(label)}`}
            formatter={(val: any) => [formatMinutesShort(val), 'সময়']}
          />
          <Line
            type="monotone"
            dataKey="minutes"
            stroke="url(#lineGrad)"
            strokeWidth={3}
            dot={{ r: 3, fill: '#A78BFA' }}
            activeDot={{ r: 6, fill: '#8B5CF6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}