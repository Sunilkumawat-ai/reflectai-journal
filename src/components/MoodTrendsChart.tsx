import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { JournalEntry } from '../types';

interface MoodTrendsChartProps {
  entries: JournalEntry[];
  selectedMoodFilter: string;
  onSelectMood: (mood: string) => void;
}

interface MoodItem {
  key: 'reflective' | 'calm' | 'grateful' | 'optimistic' | 'energized';
  label: string;
  emoji: string;
  count: number;
  percentage: number;
  barColor: string;
}

const TRACKED_MOODS: Array<{
  key: 'reflective' | 'calm' | 'grateful' | 'optimistic' | 'energized';
  label: string;
  emoji: string;
  barColor: string;
}> = [
  {
    key: 'reflective',
    label: 'Reflective',
    emoji: '🪞',
    barColor: 'bg-[#838CE5]',
  },
  {
    key: 'calm',
    label: 'Calm',
    emoji: '🍃',
    barColor: 'bg-[#50207A]',
  },
  {
    key: 'grateful',
    label: 'Grateful',
    emoji: '✨',
    barColor: 'bg-[#D6B9FC]',
  },
  {
    key: 'optimistic',
    label: 'Optimistic',
    emoji: '🌅',
    barColor: 'bg-[#9ea7f0]',
  },
  {
    key: 'energized',
    label: 'Energized',
    emoji: '⚡',
    barColor: 'bg-[#c39df8]',
  },
];

export const MoodTrendsChart: React.FC<MoodTrendsChartProps> = ({
  entries,
  selectedMoodFilter,
  onSelectMood,
}) => {
  // Always compute stats across entries without blocking conditions
  const { moodStats, totalCount, maxCount } = useMemo(() => {
    const counts: Record<string, number> = {
      reflective: 0,
      calm: 0,
      grateful: 0,
      optimistic: 0,
      energized: 0,
    };

    let total = 0;
    (entries || []).forEach((entry) => {
      if (entry && entry.mood) {
        const moodKey = String(entry.mood).toLowerCase().trim();
        if (counts[moodKey] !== undefined) {
          counts[moodKey]++;
          total++;
        }
      }
    });

    const max = Math.max(1, ...Object.values(counts));

    const stats: MoodItem[] = TRACKED_MOODS.map((m) => {
      const count = counts[m.key] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        key: m.key,
        label: m.label,
        emoji: m.emoji,
        count,
        percentage,
        barColor: m.barColor,
      };
    });

    return { moodStats: stats, totalCount: total, maxCount: max };
  }, [entries]);

  return (
    <div
      id="mood-trends-chart"
      className="px-4 py-3.5 bg-stone-950/60 border-b border-stone-800/80 shrink-0"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-3.5 h-3.5 text-[#838CE5]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300 font-sans">
            Mood Trends
          </h3>
        </div>
        <span
          id="mood-trends-total"
          className="text-[10px] font-mono text-[#D6B9FC] px-2 py-0.5 rounded-full bg-[#50207A]/40 border border-[#D6B9FC]/30"
        >
          {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div className="space-y-1.5">
        {moodStats.map((item) => {
          const isSelected = selectedMoodFilter === item.key;
          const barWidthPercent =
            totalCount > 0 && maxCount > 0
              ? Math.max(item.count > 0 ? 8 : 0, Math.round((item.count / maxCount) * 100))
              : 0;

          return (
            <button
              key={item.key}
              id={`mood-trend-bar-${item.key}`}
              type="button"
              onClick={() => onSelectMood(isSelected ? 'all' : item.key)}
              className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer group border ${
                isSelected
                  ? 'bg-stone-900 border-[#838CE5]/60 shadow-xs ring-1 ring-[#838CE5]/30'
                  : 'bg-stone-900/30 hover:bg-stone-900/70 border-stone-800/40 hover:border-[#D6B9FC]/30'
              }`}
              title={`Filter by ${item.label} (${item.count} entries, ${item.percentage}%)`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center space-x-2">
                  <span>{item.emoji}</span>
                  <span
                    className={`font-medium ${
                      isSelected
                        ? 'text-[#D6B9FC] font-bold'
                        : 'text-stone-300 group-hover:text-stone-100'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                  <span className="font-semibold text-stone-100">
                    {item.count}
                  </span>
                  <span className="text-stone-400 text-[10px]">
                    ({item.percentage}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar with Rich Track and Glow */}
              <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800/70">
                <div
                  className={`h-full rounded-full transition-all duration-300 ease-out ${item.barColor} ${
                    item.count === 0 ? 'w-0' : 'opacity-95'
                  }`}
                  style={{
                    width: `${barWidthPercent}%`,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
