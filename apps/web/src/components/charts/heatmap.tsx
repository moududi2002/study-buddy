// ============================================================
// Path: apps/web/src/components/charts/heatmap.tsx
// ============================================================

'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import { toBnDigits, formatBnDate, formatMinutesShort } from '@/lib/bn';

interface Cell {
  date: string;
  minutes: number;
  entries: number;
  level: number; // 0-4
}

const LEVEL_BG: Record<number, string> = {
  0: 'bg-lavender-100',
  1: 'bg-primary-200',
  2: 'bg-primary-300',
  3: 'bg-primary-400',
  4: 'bg-primary-500',
};

export function Heatmap({ cells }: { cells: Cell[] }) {
  // Split into weeks (columns) — each column = 7 days (Sat→Fri)
  const weeks: Cell[][] = [];
  let current: Cell[] = [];

  cells.forEach((cell, idx) => {
    current.push(cell);
    if (current.length === 7 || idx === cells.length - 1) {
      weeks.push(current);
      current = [];
    }
  });

  return (
    <TooltipProvider delayDuration={100}>
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell) => (
                <Tooltip key={cell.date}>
                  <TooltipTrigger asChild>
                    <div
                      className={`h-3 w-3 rounded-sm ${LEVEL_BG[cell.level]} cursor-pointer transition-transform hover:scale-125`}
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="rounded-xl bg-white border border-lavender-200 shadow-soft px-3 py-2 text-xs text-primary-700"
                  >
                    <div className="font-semibold">{formatBnDate(cell.date)}</div>
                    <div className="text-primary-500">
                      {cell.entries > 0
                        ? `${formatMinutesShort(cell.minutes)} পড়া হয়েছে`
                        : 'পড়া হয়নি'}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}