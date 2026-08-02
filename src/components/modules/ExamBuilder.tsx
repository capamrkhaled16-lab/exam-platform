import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Pencil,
  FileText,
  Clock,
  Eye,
  EyeOff,
  Save,
  Shuffle,
  FileEdit,
  Timer,
  Calendar,
  BookOpen,
  Award,
  ListChecks,
} from 'lucide-react';
import type { OnlineExam, ExamQuestion, QuestionType } from '@/lib/types';
import {
  fetchOnlineExams,
  createOnlineExam,
  updateOnlineExam,
  deleteOnlineExam,
  fetchExamQuestions,
  createExamQuestion,
  updateExamQuestion,
  deleteExamQuestion,
} from '@/lib/data';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type ExamBuilderProps = {
  groupId: string;
  groupName?: string;
  stageName?: string;
  gradeName?: string;
};

type ExamFormState = {
  title: string;
  subject: string;
  description: string;
  duration: string;
  secondsPerQuestion: string;
  totalScore: string;
  openAt: string;
  closeAt: string;
  isRandom: boolean;
  isDraft: boolean;
};

const EMPTY_EXAM_FORM: ExamFormState = {
  title: '',
  subject: '',
  description: '',
  duration: '60',
  secondsPerQuestion: '60',
  totalScore: '100',
  openAt: '',
  closeAt: '',
  isRandom: false,
  isDraft: true,
};

export default function ExamBuilder({ groupId, groupName, stageName, gradeName }: ExamBuilderProps) {
  const [exams, setExams] = useState<OnlineExam[]>([]);
  const [selected, setSelected] = useState<OnlineExam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editExam, setEditExam] = useState<OnlineExam | null>(null);
  const [deleteExam, setDeleteExam] = useState<OnlineExam | null>(null);
  const [addQOpen, setAddQOpen] = useState(false);
  const [editQ, setEditQ] = useState<ExamQuestion | null>(null);
  const [deleteQ, setDeleteQ] = useState<ExamQuestion | null>(null);
  const [examForm, setExamForm] = useState<ExamFormState>(EMPTY_EXAM_FORM);
  const [qForm, setQForm] = useState<{
    type: QuestionType;
    text: string;
    choices: string[];
    correct: number;
    modelAnswer: string;
    points: string;
  }>({ type: 'mcq', text: '', choices: ['', '', '', ''], correct: 0, modelAnswer: '', points: '1' });

  const loadExams = useCallback(async () => {
    const data = await fetchOnlineExams(groupId);
    setExams(data);
    if (data.length > 0 && !selected) setSelected(data[0]);
  }, [groupId]);

  useEffect(() => { loadExams(); }, [loadExams]);

  const loadQuestions = useCallback(async () => {
    if (!selected) return;
    const data = await fetchExamQuestions(selected.id);
    setQuestions(data);
  }, [selected]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  function openEditExam(ex: OnlineExam) {
    setEditExam(ex);
    setExamForm({
      title: ex.title,
      subject: ex.subject ?? '',
      description: ex.description ?? '',
      duration: String(ex.duration_minutes),
      secondsPerQuestion: String(ex.seconds_per_question ?? 60),
      totalScore: String(ex.total_score ?? 100),
      openAt: ex.open_at ? ex.open_at.slice(0, 16) : '',
      closeAt: ex.close_at ? ex.close_at.slice(0, 16) : '',
      isRandom: ex.is_random ?? false,
      isDraft: ex.is_draft ?? true,
    });
  }

  function openEditQ(q: ExamQuestion) {
    setEditQ(q);
    setQForm({
      type: q.type,
      text: q.question_text,
      choices: q.choices ?? ['', '', '', ''],
      correct: q.correct_choice_index ?? 0,
      modelAnswer: q.model_answer ?? '',
      points: String(q.points),
    });
  }

  async function handleSaveExam(saveAsDraft: boolean) {
    if (!examForm.title.trim()) return;
    const payload: Partial<OnlineExam> = {
      group_id: groupId,
      title: examForm.title.trim(),
      subject: examForm.subject.trim() || null,
      description: examForm.description.trim() || null,
      duration_minutes: parseInt(examForm.duration) || 60,
      seconds_per_question: parseInt(examForm.secondsPerQuestion) || 60,
      total_score: parseFloat(examForm.totalScore) || 100,
      open_at: examForm.openAt ? new Date(examForm.openAt).toISOString() : null,
      close_at: examForm.closeAt ? new Date(examForm.closeAt).toISOString() : null,
      is_random: examForm.isRandom,
      is_draft: saveAsDraft,
      is_published: !saveAsDraft ? false : (editExam?.is_published ?? false),
    };
    if (editExam) {
      await updateOnlineExam(editExam.id, payload);
    } else {
      const ex = await createOnlineExam(payload);
      if (ex) setSelected(ex);
    }
    setExamForm(EMPTY_EXAM_FORM);
    setEditExam(null);
    setExamModalOpen(false);
    await loadExams();
  }

  async function handleSaveQ() {
    if (!qForm.text.trim() || !selected) return;
    const payload: Partial<ExamQuestion> = {
      exam_id: selected.id,
      type: qForm.type,
      question_text: qForm.text.trim(),
      choices: qForm.type === 'mcq' ? qForm.choices.filter((c) => c.trim()) : null,
      correct_choice_index: qForm.type === 'mcq' ? qForm.correct : null,
      model_answer: qForm.type === 'essay' ? qForm.modelAnswer.trim() || null : null,
      points: parseFloat(qForm.points) || 1,
      sort_order: questions.length,
    };
    if (editQ) {
      await updateExamQuestion(editQ.id, payload);
    } else {
      await createExamQuestion(payload);
    }
    setQForm({ type: 'mcq', text: '', choices: ['', '', '', ''], correct: 0, modelAnswer: '', points: '1' });
    setEditQ(null);
    setAddQOpen(false);
    await loadQuestions();
  }

  async function togglePublish() {
    if (!selected) return;
    await updateOnlineExam(selected.id, { is_published: !selected.is_published, is_draft: false });
    await loadExams();
  }

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div>
      {/* Exam selector + create */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {exams.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelected(ex)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                selected?.id === ex.id ? 'bg-emerald-600 text-white' : 'glass-light text-slate-400 hover:text-white'
              }`}
            >
              <FileText size={14} />
              {ex.title}
              {ex.is_published && <span className="w-2 h-2 rounded-full bg-green-400" />}
              {ex.is_draft && !ex.is_published && <span className="w-2 h-2 rounded-full bg-amber-400" />}
            </button>
          ))}
          {exams.length === 0 && <p className="text-slate-400 text-sm py-2">لا توجد امتحانات إلكترونية بعد.</p>}
        </div>
        <Button size="sm" onClick={() => { setExamForm(EMPTY_EXAM_FORM); setEditExam(null); setExamModalOpen(true); }}>
          <Plus size={16} /> إنشاء امتحان جديد
        </Button>
      </div>

      {selected && (
        <>
          {/* Exam info bar */}
          <div className="glass-card rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 text-sm text-slate-300 flex-wrap">
                <span className="flex items-center gap-1.5"><Clock size={14} className="text-emerald-400" /> {selected.duration_minutes} دقيقة</span>
                <span className="flex items-center gap-1.5"><Timer size={14} className="text-amber-400" /> {selected.seconds_per_question ?? 60} ثانية/سؤال</span>
                <span className="flex items-center gap-1.5"><ListChecks size={14} className="text-blue-400" /> {questions.length} سؤال</span>
                <span className="flex items-center gap-1.5"><Award size={14} className="text-teal-400" /> {selected.total_score ?? 100} درجة</span>
                {selected.subject && <span className="flex items-center gap-1.5"><BookOpen size={14} className="text-purple-400" /> {selected.subject}</span>}
                <span className={selected.is_published ? 'text-emerald-400' : selected.is_draft ? 'text-amber-400' : 'text-slate-500'}>
                  {selected.is_published ? 'منشور' : selected.is_draft ? 'مسودة' : 'محفوظ'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEditExam(selected)}>
                  <Pencil size={14} /> تعديل
                </Button>
                <Button size="sm" variant={selected.is_published ? 'warning' : 'primary'} onClick={togglePublish}>
                  {selected.is_published ? <><EyeOff size={14} /> إلغاء النشر</> : <><Eye size={14} /> نشر</>}
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10" onClick={() => setDeleteExam(selected)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
            {selected.description && (
              <p className="text-sm text-slate-400 mt-2">{selected.description}</p>
            )}
          </div>

          {/* Questions */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-white">إدارة الأسئلة ({questions.length})</h4>
            <Button size="sm" onClick={() => { setQForm({ type: 'mcq', text: '', choices: ['', '', '', ''], correct: 0, modelAnswer: '', points: '1' }); setEditQ(null); setAddQOpen(true); }}>
              <Plus size={16} /> إضافة سؤال
            </Button>
          </div>

          {questions.length === 0 ? (
            <div className="glass-light rounded-xl p-8 text-center text-slate-400">لا توجد أسئلة بعد. أضف سؤالاً جديداً للبدء.</div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {questions.map((q, i) => (
                  <motion.div
                    key={q.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass-card rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            سؤال {i + 1}
                          </span>
                          <span className="text-xs text-slate-500">
                            {q.type === 'mcq' ? 'اختيارات' : 'مقالي'} • {q.points} درجة
                          </span>
                        </div>
                        <p className="text-white font-semibold mb-2">{q.question_text}</p>
                        {q.type === 'mcq' && q.choices && (
                          <ul className="space-y-1 text-sm">
                            {q.choices.map((c, ci) => (
                              <li key={ci} className={`flex items-center gap-2 ${ci === q.correct_choice_index ? 'text-emerald-400' : 'text-slate-400'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${ci === q.correct_choice_index ? 'border-emerald-500' : 'border-slate-600'}`}>
                                  {String.fromCharCode(1571 + ci)}
                                </span>
                                {c}
                                {ci === q.correct_choice_index && <span className="text-xs">✓ الصحيحة</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                        {q.type === 'essay' && q.model_answer && (
                          <div className="mt-2 text-sm">
                            <p className="text-xs text-amber-400 mb-1">الإجابة النموذجية:</p>
                            <p className="text-slate-300 glass-light rounded-lg p-2">{q.model_answer}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEditQ(q)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteQ(q)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* ============ Create/Edit Exam Modal — Full Design ============ */}
      <Modal
        open={examModalOpen || !!editExam}
        onClose={() => { setExamModalOpen(false); setEditExam(null); setExamForm(EMPTY_EXAM_FORM); }}
        title={editExam ? 'تعديل الامتحان' : 'إنشاء امتحان إلكتروني جديد'}
        size="xl"
      >
        <div className="space-y-4">
          {/* Title + Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="عنوان الامتحان" icon={<FileEdit size={14} />}>
              <input type="text" value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} className={inputCls} placeholder="مثال: امتحان الفيزياء الشامل" />
            </Field>
            <Field label="المادة" icon={<BookOpen size={14} />}>
              <input type="text" value={examForm.subject} onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })} className={inputCls} placeholder="مثال: فيزياء" />
            </Field>
          </div>

          {/* Stage + Grade (read-only from context) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="المرحلة">
              <input type="text" value={stageName ?? '—'} disabled className={`${inputCls} opacity-60`} />
            </Field>
            <Field label="الصف">
              <input type="text" value={gradeName ?? '—'} disabled className={`${inputCls} opacity-60`} />
            </Field>
            <Field label="المجموعة">
              <input type="text" value={groupName ?? '—'} disabled className={`${inputCls} opacity-60`} />
            </Field>
          </div>

          {/* Description */}
          <Field label="تعليمات ووصف الامتحان">
            <textarea value={examForm.description} onChange={(e) => setExamForm({ ...examForm, description: e.target.value })} rows={2} className={`${inputCls} resize-none`} placeholder="اكتب تعليمات الامتحان للطلاب..." />
          </Field>

          {/* Duration + Seconds/Question + Total Score */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="المدة (دقائق)" icon={<Clock size={14} />}>
              <input type="number" value={examForm.duration} onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })} className={inputCls} min={1} />
            </Field>
            <Field label="ثانية لكل سؤال" icon={<Timer size={14} />}>
              <input type="number" value={examForm.secondsPerQuestion} onChange={(e) => setExamForm({ ...examForm, secondsPerQuestion: e.target.value })} className={inputCls} min={5} />
            </Field>
            <Field label="الدرجة الكلية" icon={<Award size={14} />}>
              <input type="number" value={examForm.totalScore} onChange={(e) => setExamForm({ ...examForm, totalScore: e.target.value })} className={inputCls} min={1} />
            </Field>
          </div>

          {/* Start/End times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="توقيت بدء الامتحان" icon={<Calendar size={14} />}>
              <input type="datetime-local" value={examForm.openAt} onChange={(e) => setExamForm({ ...examForm, openAt: e.target.value })} className={inputCls} />
            </Field>
            <Field label="توقيت انتهاء الامتحان" icon={<Calendar size={14} />}>
              <input type="datetime-local" value={examForm.closeAt} onChange={(e) => setExamForm({ ...examForm, closeAt: e.target.value })} className={inputCls} />
            </Field>
          </div>

          {/* Toggles: Random + Draft */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setExamForm({ ...examForm, isRandom: !examForm.isRandom })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                examForm.isRandom
                  ? 'bg-purple-500/15 border border-purple-500/30 text-purple-400'
                  : 'glass-light border border-white/10 text-slate-400'
              }`}
            >
              <Shuffle size={15} />
              ترتيب عشوائي للأسئلة
            </button>
          </div>

          {/* Save buttons */}
          <div className="flex gap-3 justify-end pt-2 border-t border-white/10">
            <Button variant="secondary" onClick={() => { setExamModalOpen(false); setEditExam(null); setExamForm(EMPTY_EXAM_FORM); }}>
              إلغاء
            </Button>
            <Button variant="warning" onClick={() => handleSaveExam(true)} disabled={!examForm.title.trim()}>
              <Save size={16} /> حفظ كمسودة
            </Button>
            <Button onClick={() => handleSaveExam(false)} disabled={!examForm.title.trim()}>
              <Save size={16} /> حفظ الامتحان
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Question Modal */}
      <Modal open={addQOpen || !!editQ} onClose={() => { setAddQOpen(false); setEditQ(null); }} title={editQ ? 'تعديل السؤال' : 'إضافة سؤال'} size="lg">
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['mcq', 'essay'] as QuestionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setQForm({ ...qForm, type: t })}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${qForm.type === t ? 'bg-emerald-600 text-white' : 'glass-light text-slate-400'}`}
              >
                {t === 'mcq' ? 'اختيارات (MCQ)' : 'مقالي (Essay)'}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">نص السؤال</label>
            <textarea value={qForm.text} onChange={(e) => setQForm({ ...qForm, text: e.target.value })} rows={3} className={`${inputCls} resize-none`} placeholder="اكتب السؤال هنا..." />
          </div>
          {qForm.type === 'mcq' && (
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">الاختيارات (حدد الصحيحة)</label>
              <div className="space-y-2">
                {qForm.choices.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQForm({ ...qForm, correct: i })}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition flex-shrink-0 ${qForm.correct === i ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-600 text-slate-500'}`}
                    >
                      {String.fromCharCode(1571 + i)}
                    </button>
                    <input
                      type="text"
                      value={c}
                      onChange={(e) => {
                        const choices = [...qForm.choices];
                        choices[i] = e.target.value;
                        setQForm({ ...qForm, choices });
                      }}
                      className={inputCls}
                      placeholder={`الاختيار ${String.fromCharCode(1571 + i)}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {qForm.type === 'essay' && (
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">الإجابة النموذجية</label>
              <textarea value={qForm.modelAnswer} onChange={(e) => setQForm({ ...qForm, modelAnswer: e.target.value })} rows={4} className={`${inputCls} resize-none`} placeholder="اكتب الإجابة النموذجية..." />
            </div>
          )}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">درجة السؤال</label>
            <input type="number" value={qForm.points} onChange={(e) => setQForm({ ...qForm, points: e.target.value })} className={`${inputCls} w-28`} min={0.5} step={0.5} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setAddQOpen(false); setEditQ(null); }}>إلغاء</Button>
            <Button onClick={handleSaveQ} disabled={!qForm.text.trim()}><Save size={16} /> حفظ السؤال</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteExam}
        onClose={() => setDeleteExam(null)}
        onConfirm={async () => { if (deleteExam) { await deleteOnlineExam(deleteExam.id); setSelected(null); setDeleteExam(null); await loadExams(); } }}
        title="⚠️ حذف الامتحان"
        subtext={`سيتم حذف «${deleteExam?.title ?? ''}» وكل أسئلته نهائيًا.`}
        confirmLabel="تأكيد الحذف"
      />
      <ConfirmDialog
        open={!!deleteQ}
        onClose={() => setDeleteQ(null)}
        onConfirm={async () => { if (deleteQ) { await deleteExamQuestion(deleteQ.id); setDeleteQ(null); await loadQuestions(); } }}
        title="⚠️ حذف السؤال"
        subtext="سيتم حذف هذا السؤال نهائيًا."
        confirmLabel="تأكيد الحذف"
      />
    </div>
  );
}

const inputCls =
  'w-full glass-light rounded-xl py-2.5 px-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition text-sm';

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm text-slate-400 mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
