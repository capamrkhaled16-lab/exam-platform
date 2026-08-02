import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Award, TrendingUp } from 'lucide-react';
import type { Student, CenterExam, CenterGrade } from '@/lib/types';
import {
  fetchCenterExams,
  createCenterExam,
  deleteCenterExam,
  fetchCenterGrades,
  upsertCenterGrade,
} from '@/lib/data';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type CenterGradesProps = {
  groupId: string;
  students: Student[];
};

export default function CenterGrades({ groupId, students }: CenterGradesProps) {
  const [exams, setExams] = useState<CenterExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<CenterExam | null>(null);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CenterExam | null>(null);
  const [form, setForm] = useState({ title: '', maxScore: '100', passScore: '50' });

  const loadExams = useCallback(async () => {
    const data = await fetchCenterExams(groupId);
    setExams(data);
    if (data.length > 0 && !selectedExam) setSelectedExam(data[0]);
  }, [groupId]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const loadGrades = useCallback(async () => {
    if (!selectedExam) return;
    const data = await fetchCenterGrades(selectedExam.id);
    const map: Record<string, number> = {};
    for (const g of data) map[g.student_id] = g.score;
    setGrades(map);
  }, [selectedExam]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  async function handleAddExam() {
    if (!form.title.trim()) return;
    const exam = await createCenterExam(
      groupId,
      form.title.trim(),
      parseFloat(form.maxScore) || 100,
      parseFloat(form.passScore) || 50
    );
    if (exam) {
      setForm({ title: '', maxScore: '100', passScore: '50' });
      setAddOpen(false);
      await loadExams();
      setSelectedExam(exam);
    }
  }

  async function handleScoreChange(studentId: string, score: number) {
    setGrades((prev) => ({ ...prev, [studentId]: score }));
    if (selectedExam) {
      await upsertCenterGrade(selectedExam.id, studentId, score);
    }
  }

  const scores = students.map((s) => grades[s.id] ?? 0);
  const validScores = scores.filter((_, i) => students[i]);
  const avg =
    validScores.length > 0
      ? validScores.reduce((a, b) => a + b, 0) / validScores.length
      : 0;
  const passScore = selectedExam?.pass_score ?? 50;
  const maxScore = selectedExam?.max_score ?? 100;
  const passed = scores.filter((s) => s >= passScore).length;
  const failed = scores.filter((s) => s < passScore && s > 0).length;

  return (
    <div>
      {/* Exam tabs */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {exams.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelectedExam(ex)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                selectedExam?.id === ex.id
                  ? 'bg-emerald-600 text-white'
                  : 'glass-light text-slate-400 hover:text-white'
              }`}
            >
              {ex.title}
            </button>
          ))}
          {exams.length === 0 && (
            <p className="text-slate-400 text-sm py-2">لا توجد امتحانات سنتر بعد.</p>
          )}
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> امتحان جديد
        </Button>
      </div>

      {/* Stats */}
      {selectedExam && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4"
        >
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400">الدرجة العظمى</p>
            <p className="text-xl font-bold text-white">{maxScore}</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400">متوسط الدرجات</p>
            <p className="text-xl font-bold text-blue-300">{avg.toFixed(1)}</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400">ناجح</p>
            <p className="text-xl font-bold text-emerald-300">{passed}</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400">راسب</p>
            <p className="text-xl font-bold text-red-300">{failed}</p>
          </div>
        </motion.div>
      )}

      {/* Grade entry grid */}
      {selectedExam && students.length > 0 ? (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="text-right p-3 font-semibold">الطالب</th>
                  <th className="text-center p-3 font-semibold w-32">الدرجة</th>
                  <th className="text-center p-3 font-semibold w-24">النتيجة</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const score = grades[s.id] ?? 0;
                  const isPass = score >= passScore;
                  return (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 text-white">{s.name}</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={score}
                          min={0}
                          max={maxScore}
                          onChange={(e) =>
                            handleScoreChange(s.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 glass-light rounded-lg py-1.5 px-2 text-center text-white border border-white/10 focus:border-emerald-500/50 focus:outline-none"
                        />
                      </td>
                      <td className="p-3 text-center">
                        {score === 0 ? (
                          <span className="text-slate-600">—</span>
                        ) : isPass ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                            <Award size={14} /> ناجح
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold">راسب</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : selectedExam ? (
        <div className="glass-light rounded-xl p-8 text-center text-slate-400">
          لا يوجد طلاب في هذه المجموعة.
        </div>
      ) : null}

      {/* Add Exam Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="إضافة امتحان سنتر جديد"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">عنوان الامتحان</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: امتحان الوحدة الأولى"
              className="w-full glass-light rounded-xl py-2.5 px-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">الدرجة العظمى</label>
              <input
                type="number"
                value={form.maxScore}
                onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
                className="w-full glass-light rounded-xl py-2.5 px-4 text-white border border-white/10 focus:border-emerald-500/50 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">درجة النجاح</label>
              <input
                type="number"
                value={form.passScore}
                onChange={(e) => setForm({ ...form, passScore: e.target.value })}
                className="w-full glass-light rounded-xl py-2.5 px-4 text-white border border-white/10 focus:border-emerald-500/50 focus:outline-none text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>إلغاء</Button>
            <Button onClick={handleAddExam} disabled={!form.title.trim()}>إضافة</Button>
          </div>
        </div>
      </Modal>

      {/* Delete exam */}
      {selectedExam && (
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(selectedExam)}
            className="text-red-400 hover:bg-red-500/10"
          >
            <Trash2 size={14} /> حذف الامتحان الحالي
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteCenterExam(deleteTarget.id);
            setSelectedExam(null);
            setDeleteTarget(null);
            await loadExams();
          }
        }}
        title="⚠️ حذف الامتحان"
        subtext={`سيتم حذف الامتحان «${deleteTarget?.title ?? ''}» وكل درجاته نهائيًا.`}
        confirmLabel="تأكيد الحذف"
      />
    </div>
  );
}
