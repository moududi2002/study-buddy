// ============================================================
// Path: apps/web/src/components/charts/subject-pie-chart.tsx
// ============================================================

'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { toBnDigits, formatMinutes } from '@/lib/bn';

interface Item {
  name: string;
  color: string;
  icon: string;
  minutes: number;
}

export function SubjectPieChart({ data }: { data: Item[] }) {
  const total = data.reduce((s, d) => s + d.minutes, 0);
  if (total === 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-primary-400 text-sm">
        <span className="text-4xl mb-2">📊</span>
        এখনো কোনো ডেটা নেই
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="minutes"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={3}
            cornerRadius={6}
          >
            {data.map((item) => (
              <Cell key={item.name} fill={item.color} stroke="#fff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: '1px solid #EDE9FE',
              boxShadow: '0 4px 20px rgba(167,139,250,0.15)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
            }}
            formatter={(val: any, name: any, p: any) => {
              const percent = Math.round((val / total) * 100);
              return [
                `${formatMinutes(val)} (${toBnDigits(percent)}%)`,
                `${p.payload.icon} ${name}`,
              ];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}