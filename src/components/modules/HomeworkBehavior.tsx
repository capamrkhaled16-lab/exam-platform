import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Trash2, CheckCircle2, XCircle, Clock, AlertTriangle, Heart, StickyNote } from 'lucide-react';
import type { Student, Homework, HomeworkStatus, HomeworkStatusType, BehaviorRating, BehaviorEval } from '@/lib/types';
import {
  fetchHomework,
  createHomework,
  deleteHomework,
  fetchHomeworkStatuses,
  upsertHomeworkStatus,
  fetchBehaviorEvals,
  upsertBehaviorEval,
} from '@/lib/data';
import { todayDateString, formatArabicDate } from '@/lib/format';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

type HomeworkBehaviorProps = {
  groupId: string;
  students: Student[];
};

const HOMEWORK_STATUS_OPTIONS: { status: HomeworkStatusType; label: string; icon: typeof CheckCircle2; activeClass: string }[] = [
  { status: 'complete', label: 'مكتمل', icon: CheckCircle2, activeClass: 'bg-emerald-600 text-white' },
  { status: 'incomplete', label: 'غير مكتمل', icon: XCircle, activeClass: 'bg-red-600 text-white' },
  { status: 'late', label: 'متأخر', icon: Clock, activeClass: 'bg-amber-600 text-white' },
];

const BEHAVIOR_OPTIONS: { rating: BehaviorRating; label: string; color: string; bg: string }[] = [
  { rating: 'excellent', label: 'ممتاز', color: 'text-amber-400', bg: 'bg-amber-600 text-white' },
  { rating: 'participatory', label: 'مشارك', color: 'text-emerald-400', bg: 'bg-emerald-600 text-white' },
  { rating: 'quiet', label: 'هادئ', color: 'text-blue-400', bg: 'bg-blue-600 text-white' },
  { rating: 'disruptive', label: 'مشاغب', color: 'text-red-400', bg: 'bg-red-600 text-white' },
  { rating: 'needs_attention', label: 'يحتاج متابعة', color: 'text-orange-400', bg: 'bg-orange-600 text-white' },
];

export default function HomeworkBehavior({ groupId, students }: HomeworkBehaviorProps) {
  const [tab, setTab] = useState<'homework' | 'behavior'>('homework');
  const [homework, setHomework] = useState<Homework[]>([]);
  const [activeHomework, setActiveHomework] = useState<Homework | null>(null);
  const [statuses, setStatuses] = useState<Record<string, HomeworkStatus>>({});
  const [addHwOpen, setAddHwOpen] = useState(false);
  const [hwForm, setHwForm] = useState({ title: '', description: '', due_date: todayDateString() });
  const [noteStudent, setNoteStudent] = useState<{ student: Student; homeworkId: string } | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [behavior, setBehavior] = useState<BehaviorEval[]>([]);
  const [behaviorStudent, setBehaviorStudent] = useState<Student | null>(null);
  const [behaviorDate, setBehaviorDate] = useState(todayDateString());
  const [behaviorNote, setBehaviorNote] = useState('');

  const loadHomework = useCallback(async () => {
    const data = await fetchHomework(groupId);
    setHomework(data);
    if (data.length > 0 && !activeHomework) setActiveHomework(data[0]);
  }, [groupId]);

  useEffect(() => { loadHomework(); }, [loadHomework]);

  const loadStatuses = useCallback(async (hwId: string) => {
    const data = await fetchHomeworkStatuses(hwId);
    const map: Record<string, HomeworkStatus> = {};
    for (const s of data) map[s.student_id] = s;
    setStatuses(map);
  }, []);

  useEffect(() => {
    if (activeHomework) loadStatuses(activeHomework.id);
  }, [activeHomework, loadStatuses]);

  useEffect(() => {
    if (behaviorStudent) {
      fetchBehaviorEvals(behaviorStudent.id).then(setBehavior);
    }
  }, [behaviorStudent]);

  async function handleAddHomework() {
    if (!hwForm.title.trim()) return;
    const hw = await createHomework(groupId, hwForm.title.trim(), hwForm.description.trim() || null, hwForm.due_date);
    setHwForm({ title: '', description: '', due_date: todayDateString() });
    setAddHwOpen(false);
    await loadHomework();
    if (hw) setActiveHomework(hw);
  }

  async function handleDeleteHomework(id: string) {
    await deleteHomework(id);
    setActiveHomework(null);
    await loadHomework();
  }

  async function handleSetStatus(student: Student, status: HomeworkStatusType) {
    if (!activeHomework) return;
    const existing = statuses[student.id];
    setStatuses((prev) => ({ ...prev, [student.id]: { ...prev[student.id], status } }));
    await upsertHomeworkStatus(activeHomework.id, student.id, status, existing?.teacher_note ?? null);
  }

  async function handleSaveNote() {
    if (!noteStudent || !activeHomework) return;
    const current = statuses[noteStudent.student.id];
    await upsertHomeworkStatus(activeHomework.id, noteStudent.student.id, current?.status ?? 'incomplete', noteValue);
    setStatuses((prev) => ({ ...prev, [noteStudent.student.id]: { ...prev[noteStudent.student.id], teacher_note: noteValue } }));
    setNoteStudent(null);
    setNoteValue('');
  }

  async function handleSetBehavior(student: Student, rating: BehaviorRating) {
    await upsertBehaviorEval(student.id, groupId, rating, behaviorNote.trim() || null, behaviorDate);
    setBehaviorNote('');
  }

  const alertStudents = students.filter((s) => {
    const sorted = [...homework].sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()).slice(0, 3);
    const recent = sorted.map((hw) => {
      const st = Object.values(statuses).find((x) => x.homework_id === hw.id && x.student_id === s.id);
      return st?.status;
    });
    return recent.length >= 3 && recent.every((st) => st === 'incomplete');
  });

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex gap-2">
            <button onClick={() => setTab('homework')} className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${tab === 'homework' ? 'bg-emerald-600 text-white' : 'glass-light text-slate-400'}`}>
              <BookOpen size={16} /> الواجبات
            </button>
            <button onClick={() => setTab('behavior')} className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${tab === 'behavior' ? 'bg-emerald-600 text-white' : 'glass-light text-slate-400'}`}>
              <Heart size={16} /> السلوك
            </button>
          </div>
          {tab === 'homework' && <Button size="sm" onClick={() => setAddHwOpen(true)}><Plus size={14} /> واجب جديد</Button>}
        </div>

        {alertStudents.length > 0 && (
          <div className="glass-light rounded-xl p-4 mb-4 border border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-red-400" />
              <p className="font-bold text-red-400 text-sm">تنبيه: 3 واجبات غير مكتملة متتالية</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {alertStudents.map((s) => <span key={s.id} className="text-xs bg-red-500/10 text-red-300 px-3 py-1 rounded-full">{s.name}</span>)}
            </div>
          </div>
        )}

        {tab === 'homework' && (
          <>
            {homework.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {homework.map((hw) => (
                  <button key={hw.id} onClick={() => setActiveHomework(hw)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition ${activeHomework?.id === hw.id ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400' : 'glass-light text-slate-400 hover:bg-white/10'}`}>
                    {hw.title}<span className="block text-[10px] text-slate-500 mt-0.5">{formatArabicDate(hw.due_date)}</span>
                  </button>
                ))}
              </div>
            )}
            {activeHomework && (
              <div className="flex items-center justify-between mb-3">
                <div><p className="text-sm text-slate-400">المتابعة الحالية:</p><p className="font-bold text-white">{activeHomework.title}</p></div>
                <button onClick={() => handleDeleteHomework(activeHomework.id)} className="p-2 rounded-lg glass-light hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"><Trash2 size={14} /></button>
              </div>
            )}
            <div className="space-y-2">
              {students.length === 0 ? (
                <p className="text-center text-slate-400 py-6">لا يوجد طلاب.</p>
              ) : (
                <AnimatePresence>
                  {students.map((s) => {
                    const status = statuses[s.id]?.status;
                    return (
                      <motion.div key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-light rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm">{s.name}</p>
                          {statuses[s.id]?.teacher_note && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><StickyNote size={10} /> {statuses[s.id].teacher_note}</p>}
                        </div>
                        <div className="flex gap-1.5">
                          {HOMEWORK_STATUS_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            return <button key={opt.status} onClick={() => handleSetStatus(s, opt.status)} className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${status === opt.status ? opt.activeClass : 'glass-light text-slate-400 hover:bg-white/10 border border-white/10'}`}><Icon size={14} /> {opt.label}</button>;
                          })}
                          <button onClick={() => { setNoteStudent({ student: s, homeworkId: activeHomework?.id ?? '' }); setNoteValue(statuses[s.id]?.teacher_note ?? ''); }} className="p-2 rounded-lg glass-light hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 transition" title="ملاحظة"><StickyNote size={14} /></button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </>
        )}

        {tab === 'behavior' && (
          <div className="space-y-3">
            {students.length === 0 ? (
              <p className="text-center text-slate-400 py-6">لا يوجد طلاب.</p>
            ) : (
              <AnimatePresence>
                {students.map((s) => {
                  const lastEval = behavior.find((b) => b.student_id === s.id);
                  return (
                    <motion.div key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-light rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm">{s.name}</p>
                        {lastEval && <p className="text-xs text-slate-400 mt-1">آخر تقييم: {BEHAVIOR_OPTIONS.find((b) => b.rating === lastEval.rating)?.label ?? '-'}{lastEval.note && ` — ${lastEval.note}`}</p>}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {BEHAVIOR_OPTIONS.map((opt) => (
                          <button key={opt.rating} onClick={() => handleSetBehavior(s, opt.rating)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${lastEval?.rating === opt.rating ? opt.bg : 'glass-light text-slate-400 hover:bg-white/10 border border-white/10'}`}>{opt.label}</button>
                        ))}
                        <button onClick={() => { setBehaviorStudent(s); setBehaviorDate(todayDateString()); }} className="px-3 py-1.5 rounded-lg text-xs font-bold glass-light text-slate-400 hover:bg-blue-500/10 hover:text-blue-400 transition flex items-center gap-1"><Clock size={12} /> سجل</button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            <Modal open={!!behaviorStudent} onClose={() => { setBehaviorStudent(null); setBehavior([]); }} title={`سجل السلوك: ${behaviorStudent?.name ?? ''}`}>
              <div className="space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="flex-1"><label className="block text-xs text-slate-400 mb-1">التاريخ</label><input type="date" value={behaviorDate} onChange={(e) => setBehaviorDate(e.target.value)} className={inputCls} /></div>
                  <div className="flex-1"><label className="block text-xs text-slate-400 mb-1">ملاحظة</label><input type="text" value={behaviorNote} onChange={(e) => setBehaviorNote(e.target.value)} placeholder="ملاحظة سريعة..." className={inputCls} /></div>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {behavior.length === 0 ? <p className="text-center text-slate-400 py-4 text-sm">لا توجد تقييمات بعد.</p> : behavior.map((b) => { const meta = BEHAVIOR_OPTIONS.find((o) => o.rating === b.rating); return <div key={b.id} className="glass-light rounded-lg p-3 flex items-center justify-between"><div><span className="text-sm text-slate-300">{formatArabicDate(b.eval_date)}</span>{b.note && <p className="text-xs text-slate-400 mt-1">{b.note}</p>}</div><span className={`text-sm font-bold ${meta?.color ?? 'text-slate-400'}`}>{meta?.label}</span></div>; })}
                </div>
              </div>
            </Modal>
          </div>
        )}
      </div>

      <Modal open={addHwOpen} onClose={() => setAddHwOpen(false)} title="إضافة واجب جديد" size="sm">
        <div className="space-y-4">
          <div><label className="block text-sm text-slate-400 mb-1.5">عنوان الواجب</label><input type="text" value={hwForm.title} onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })} placeholder="مثال: واجب الوحدة الثانية" autoFocus className={inputCls} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">الوصف (اختياري)</label><textarea value={hwForm.description} onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })} rows={3} placeholder="تفاصيل الواجب..." className={inputCls} /></div>
          <div><label className="block text-sm text-slate-400 mb-1.5">موعد التسليم</label><input type="date" value={hwForm.due_date} onChange={(e) => setHwForm({ ...hwForm, due_date: e.target.value })} className={inputCls} /></div>
          <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setAddHwOpen(false)}>إلغاء</Button><Button onClick={handleAddHomework} disabled={!hwForm.title.trim()}>إضافة</Button></div>
        </div>
      </Modal>

      <Modal open={!!noteStudent} onClose={() => setNoteStudent(null)} title={`ملاحظة: ${noteStudent?.student.name ?? ''}`} size="sm">
        <textarea value={noteValue} onChange={(e) => setNoteValue(e.target.value)} rows={4} placeholder="ملاحظة المدرس..." className={inputCls} />
        <div className="flex gap-3 justify-end mt-4"><Button variant="secondary" onClick={() => setNoteStudent(null)}>إلغاء</Button><Button onClick={handleSaveNote}>حفظ</Button></div>
      </Modal>
    </div>
  );
}

const inputCls = 'w-full glass-light rounded-xl py-2.5 px-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition text-sm';
