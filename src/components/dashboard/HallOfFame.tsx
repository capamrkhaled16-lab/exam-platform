import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Star, TrendingUp, CalendarCheck, Medal } from 'lucide-react';
import type { HallOfFameEntry } from '@/lib/types';
import { fetchHallOfFame } from '@/lib/data';

export default function HallOfFame() {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchHallOfFame(10);
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-40 bg-white/10 rounded" />
          <div className="h-20 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <Trophy className="mx-auto text-amber-500/40 mb-3" size={32} />
        <h3 className="text-base font-bold text-white mb-1">لوحة الشرف</h3>
        <p className="text-xs text-slate-400">
          ستظهر هنا أسماء الطلاب المتميزين تلقائياً بناءً على درجات الامتحانات ومعدل الحضور.
        </p>
      </div>
    );
  }

  const medalColors = [
    'from-amber-400 to-yellow-600',
    'from-slate-300 to-slate-500',
    'from-orange-400 to-orange-700',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />
      <div className="absolute -top-16 -left-16 w-40 h-40 bg-amber-500/10 rounded-full blur-[60px]" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl">
            <Trophy size={22} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">لوحة الشرف</h3>
            <p className="text-[11px] text-slate-400">أفضل الطلاب أداءً في الامتحانات والحضور</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {entries.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-xl transition ${
                i < 3
                  ? 'bg-gradient-to-l from-amber-500/10 to-transparent border border-amber-500/20'
                  : 'glass-light'
              }`}
            >
              {/* Rank badge */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                  i < 3
                    ? `bg-gradient-to-br ${medalColors[i]} text-slate-900 shadow-lg`
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                {i < 3 ? <Medal size={18} /> : i + 1}
              </div>

              {/* Student info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{e.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                  {e.group_name && (
                    <span className="bg-white/5 px-1.5 py-0.5 rounded">{e.group_name}</span>
                  )}
                  {e.grade_name && (
                    <span className="bg-white/5 px-1.5 py-0.5 rounded">{e.stage_name} - {e.grade_name}</span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <TrendingUp size={11} />
                    <span>المعدل</span>
                  </div>
                  <span className={`text-sm font-bold ${e.avg_score >= 85 ? 'text-emerald-400' : e.avg_score >= 70 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {Math.round(e.avg_score)}%
                  </span>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <CalendarCheck size={11} />
                    <span>الحضور</span>
                  </div>
                  <span className={`text-sm font-bold ${e.attendance_rate >= 90 ? 'text-emerald-400' : e.attendance_rate >= 75 ? 'text-amber-400' : 'text-red-400'}`}>
                    {e.attendance_rate}%
                  </span>
                </div>
                <div className="text-center hidden sm:block">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Star size={11} />
                    <span>امتحانات</span>
                  </div>
                  <span className="text-sm font-bold text-slate-300">{e.exams_taken}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
