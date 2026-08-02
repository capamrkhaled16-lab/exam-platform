import { type ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  color?: 'emerald' | 'amber' | 'blue' | 'red' | 'slate';
  subtitle?: string;
};

const colorMap = {
  emerald: {
    glow: 'from-emerald-500/20 to-emerald-600/5',
    icon: 'text-emerald-400 bg-emerald-500/10',
    value: 'text-emerald-300',
  },
  amber: {
    glow: 'from-amber-500/20 to-amber-600/5',
    icon: 'text-amber-400 bg-amber-500/10',
    value: 'text-amber-300',
  },
  blue: {
    glow: 'from-blue-500/20 to-blue-600/5',
    icon: 'text-blue-400 bg-blue-500/10',
    value: 'text-blue-300',
  },
  red: {
    glow: 'from-red-500/20 to-red-600/5',
    icon: 'text-red-400 bg-red-500/10',
    value: 'text-red-300',
  },
  slate: {
    glow: 'from-slate-500/20 to-slate-600/5',
    icon: 'text-slate-300 bg-slate-500/10',
    value: 'text-slate-200',
  },
};

export default function StatCard({
  label,
  value,
  icon,
  color = 'emerald',
  subtitle,
}: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={`glass-card rounded-2xl p-5 bg-gradient-to-br ${c.glow} relative overflow-hidden transition hover:scale-[1.02]`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400 mb-1">{label}</p>
          <p className={`text-3xl font-extrabold ${c.value}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${c.icon}`}>{icon}</div>
      </div>
    </div>
  );
}
