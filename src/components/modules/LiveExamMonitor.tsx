import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, AlertTriangle, CheckCircle2, Clock, Eye, Activity, RefreshCw } from 'lucide-react';
import type { OnlineExam, ExamSubmission } from '@/lib/types';
import { fetchOnlineExams, fetchExamSubmissionsForMonitor } from '@/lib/data';
import { formatTime } from '@/lib/format';

type LiveExamMonitorProps = {
  groupId: string;
};

type MonitoredSubmission = ExamSubmission & {
  student?: { name: string; id: string };
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  in_progress: { label: 'جاري الحل', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30', icon: Activity },
  submitted: { label: 'تم التسليم', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', icon: CheckCircle2 },
  cheated: { label: 'غش — تسليم تلقائي', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', icon: AlertTriangle },
  auto_submitted: { label: 'تسليم تلقائي (انتهى الوقت)', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', icon: Clock },
};

function elapsedMinutes(startedAt: string): number {
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
}

export default function LiveExamMonitor({ groupId }: LiveExamMonitorProps) {
  const [exams, setExams] = useState<OnlineExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<OnlineExam | null>(null);
  const [submissions, setSubmissions] = useState<MonitoredSubmission[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadExams = useCallback(async () => {
    const data = await fetchOnlineExams(groupId);
    setExams(data);
    if (data.length > 0 && !selectedExam) setSelectedExam(data[0]);
  }, [groupId]);

  useEffect(() => { loadExams(); }, [loadExams]);

  const loadSubmissions = useCallback(async () => {
    if (!selectedExam) return;
    const data = await fetchExamSubmissionsForMonitor(selectedExam.id);
    setSubmissions(data);
  }, [selectedExam]);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  useEffect(() => {
    if (!autoRefresh || !selectedExam) return;
    const interval = setInterval(() => { loadSubmissions(); }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedExam, loadSubmissions]);

  const inProgress = submissions.filter((s) => s.status === 'in_progress').length;
  const submitted = submissions.filter((s) => s.status === 'submitted').length;
  const cheated = submissions.filter((s) => s.status === 'cheated').length;
  const flagged = submissions.filter((s) => (s.tab_switch_count ?? 0) > 0 && s.status === 'in_progress').length;

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Radio className="text-red-400 animate-pulse" size={22} />
            <h2 className="text-lg font-bold text-white">المراقبة الحية للامتحانات</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadSubmissions()} className="p-2 rounded-lg glass-light hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition" title="تحديث"><RefreshCw size={16} /></button>
            <button onClick={() => setAutoRefresh(!autoRefresh)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${autoRefresh ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'glass-light text-slate-400'}`}>{autoRefresh ? 'تحديث تلقائي (5ث)' : 'متوقف'}</button>
          </div>
        </div>

        {exams.length === 0 ? (
          <p className="text-center text-slate-400 py-8">لا توجد امتحانات منشورة في هذه المجموعة.</p>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {exams.map((ex) => (
                <button key={ex.id} onClick={() => setSelectedExam(ex)} className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${selectedExam?.id === ex.id ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400' : 'glass-light text-slate-400 hover:bg-white/10'}`}>
                  {ex.title}{ex.is_published && <span className="block text-[10px] text-emerald-500 mt-0.5">منشور</span>}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatBox label="جاري الحل" value={inProgress} icon={<Activity size={16} />} color="text-blue-400" bg="bg-blue-500/10" />
              <StatBox label="تم التسليم" value={submitted} icon={<CheckCircle2 size={16} />} color="text-emerald-400" bg="bg-emerald-500/10" />
              <StatBox label="مشتبه (تبويب)" value={flagged} icon={<Eye size={16} />} color="text-amber-400" bg="bg-amber-500/10" />
              <StatBox label="غش مؤكد" value={cheated} icon={<AlertTriangle size={16} />} color="text-red-400" bg="bg-red-500/10" />
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {submissions.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-sm">لا يوجد طلاب بدؤوا الامتحان بعد.</p>
                ) : (
                  submissions.map((sub) => {
                    const meta = STATUS_META[sub.status] ?? STATUS_META.in_progress;
                    const Icon = meta.icon;
                    const isFlagged = (sub.tab_switch_count ?? 0) > 0 && sub.status === 'in_progress';
                    const isCheating = (sub.tab_switch_count ?? 0) >= 3 || sub.status === 'cheated';
                    const minutes = elapsedMinutes(sub.started_at);
                    return (
                      <motion.div key={sub.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`glass-light rounded-xl p-3 border flex items-center justify-between gap-3 ${isCheating ? 'border-red-500/50 ring-2 ring-red-500/20' : isFlagged ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-white/10'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isCheating ? 'bg-red-500/20 text-red-400' : isFlagged ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-300'}`}>{sub.student?.name?.charAt(0) ?? '?'}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-white text-sm truncate">{sub.student?.name ?? 'طالب'}</p>
                              {isCheating && <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full animate-pulse"><AlertTriangle size={10} /> غش — تبديل تبويب {sub.tab_switch_count} مرة</span>}
                              {isFlagged && !isCheating && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full"><Eye size={10} /> تحذير: تبديل تبويب {sub.tab_switch_count} مرة</span>}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1"><Clock size={10} /> {sub.status === 'in_progress' ? `${minutes} دقيقة` : 'انتهى'}</span>
                              {sub.submitted_at && <span>سلمّى: {formatTime(sub.submitted_at)}</span>}
                              {sub.status === 'submitted' && <span className="text-emerald-400 font-bold">الدرجة: {sub.total_score}/{sub.max_score}</span>}
                            </div>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 ${meta.bg} ${meta.color} border`}><Icon size={14} /> {meta.label}</div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, icon, color, bg }: { label: string; value: number; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div className={`glass-light rounded-xl p-3 ${bg}`}>
      <div className="flex items-center justify-between mb-1"><span className="text-[10px] text-slate-400">{label}</span><span className={color}>{icon}</span></div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
