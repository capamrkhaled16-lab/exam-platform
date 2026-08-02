import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Save, Wifi, Globe } from 'lucide-react';
import type { Student, OnlineExam, OnlineGrade } from '@/lib/types';
import {
  fetchOnlineExams,
  fetchOnlineGrades,
  upsertOnlineGrade,
} from '@/lib/data';
import Button from '@/components/ui/Button';

type OnlineGradesProps = {
  groupId: string;
  students: Student[];
};

export default function OnlineGrades({ groupId, students }: OnlineGradesProps) {
  const [exams, setExams] = useState<OnlineExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<OnlineExam | null>(null);
  const [grades, setGrades] = useState<Record<string, OnlineGrade>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});

  const loadExams = useCallback(async () => {
    const data = await fetchOnlineExams(groupId);
    setExams(data);
    if (data.length > 0 && !selectedExam) setSelectedExam(data[0]);
  }, [groupId]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const loadGrades = useCallback(async () => {
    if (!selectedExam) return;
    const data = await fetchOnlineGrades(selectedExam.id);
    const map: Record<string, OnlineGrade> = {};
    for (const g of data) map[g.student_id] = g;
    setGrades(map);
  }, [selectedExam]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  async function handleManualOverride(studentId: string, score: number) {
    if (!selectedExam) return;
    const maxScore = grades[studentId]?.max_score ?? 100;
    const newGrade: OnlineGrade = {
      id: grades[studentId]?.id ?? '',
      exam_id: selectedExam.id,
      student_id: studentId,
      score,
      max_score: maxScore,
      is_manual_override: true,
      updated_at: new Date().toISOString(),
    };
    setGrades((prev) => ({ ...prev, [studentId]: newGrade }));
    await upsertOnlineGrade(selectedExam.id, studentId, score, maxScore, true);
    setEditing((prev) => ({ ...prev, [studentId]: false }));
  }

  const scores = students.map((s) => grades[s.id]?.score ?? 0);
  const avg =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;
  const maxScore = selectedExam ? grades[students[0]?.id]?.max_score ?? 100 : 100;
  const submitted = students.filter((s) => grades[s.id]).length;

  return (
    <div>
      {/* Auto-sync banner */}
      <div className="glass-light rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-blue-300">
        <Wifi size={16} className="animate-pulse" />
        <span>التزامن التلقائي مفعل — درجات الامتحانات الإلكترونية تُسجّل تلقائيًا عند تسليم الطالب للامتحان.</span>
      </div>

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
            <p className="text-slate-400 text-sm py-2">لا توجد امتحانات إلكترونية بعد.</p>
          )}
        </div>
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
            <p className="text-xs text-slate-400">سُلّم</p>
            <p className="text-xl font-bold text-emerald-300">{submitted}</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400">لم يُسلّم</p>
            <p className="text-xl font-bold text-amber-300">{students.length - submitted}</p>
          </div>
        </motion.div>
      )}

      {/* Grade grid with manual override */}
      {selectedExam && students.length > 0 ? (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="text-right p-3 font-semibold">الطالب</th>
                  <th className="text-center p-3 font-semibold w-32">الدرجة</th>
                  <th className="text-center p-3 font-semibold w-28">المصدر</th>
                  <th className="text-center p-3 font-semibold w-24">تعديل</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const grade = grades[s.id];
                  const isEditing = editing[s.id];
                  return (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 text-white">{s.name}</td>
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            defaultValue={grade?.score ?? 0}
                            min={0}
                            max={grade?.max_score ?? 100}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleManualOverride(s.id, parseFloat((e.target as HTMLInputElement).value) || 0);
                              }
                            }}
                            onBlur={(e) => handleManualOverride(s.id, parseFloat(e.target.value) || 0)}
                            className="w-20 glass-light rounded-lg py-1.5 px-2 text-center text-white border border-emerald-500/50 focus:outline-none"
                          />
                        ) : (
                          <span className={`font-bold ${grade ? 'text-white' : 'text-slate-600'}`}>
                            {grade ? grade.score : '—'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {grade?.is_manual_override ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                            <Edit3 size={12} /> يدوي
                          </span>
                        ) : grade ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-400">
                            <Globe size={12} /> تلقائي
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setEditing((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                          className="p-1.5 rounded-lg glass-light hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 transition"
                          title="تعديل يدوي"
                        >
                          {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
                        </button>
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

      {selectedExam && (
        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
          <Edit3 size={12} />
          لديك صلاحية كاملة لتعديل أي درجة إلكترونية يدويًا — يتم إعادة حساب وحفظ الدرجات فورًا.
        </p>
      )}
    </div>
  );
}
