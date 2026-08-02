import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  AlertTriangle,
  Eye,
  Maximize2,
  Send,
  CheckCircle2,
} from 'lucide-react';
import type { OnlineExam, ExamQuestion, ExamSubmission, Student } from '@/lib/types';
import {
  fetchOnlineExamById,
  fetchExamQuestions,
  fetchSubmission,
  createSubmission,
  updateSubmission,
  upsertAnswer,
  upsertOnlineGrade,
} from '@/lib/data';
import { useSettings } from '@/context/SettingsContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { formatTime } from '@/lib/format';

type ExamTakerProps = {
  examId: string;
  student: Student;
  onExit: () => void;
};

export default function ExamTaker({ examId, student, onExit }: ExamTakerProps) {
  const { settings } = useSettings();
  const [exam, setExam] = useState<OnlineExam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [answers, setAnswers] = useState<Record<string, { choice: number | null; essay: string }>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [result, setResult] = useState<{ score: number; max: number; cheated: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enterFullscreen, setEnterFullscreen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const ex = await fetchOnlineExamById(examId);
    if (!ex) { setLoading(false); return; }
    setExam(ex);
    const qs = await fetchExamQuestions(examId);
    setQuestions(qs);
    let sub = await fetchSubmission(examId, student.id);
    if (!sub) {
      const maxScore = qs.reduce((s, q) => s + q.points, 0);
      sub = await createSubmission(examId, student.id, maxScore);
    }
    if (sub) {
      setSubmission(sub);
      setTabSwitches(sub.tab_switch_count);
      setTimeLeft(ex.duration_minutes * 60);
    }
    const initial: Record<string, { choice: number | null; essay: string }> = {};
    for (const q of qs) initial[q.id] = { choice: null, essay: '' };
    setAnswers(initial);
    setLoading(false);
    setEnterFullscreen(true);
  }, [examId, student.id]);

  useEffect(() => { load(); }, [load]);

  // Timer
  useEffect(() => {
    if (!submission || result || loading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmit('auto_submitted');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [submission, result, loading]);

  // Anti-cheat: disable copy/paste/cut/right-click
  useEffect(() => {
    if (!submission || result) return;
    function preventDefault(e: Event) {
      e.preventDefault();
      return false;
    }
    function onContextmenu(e: MouseEvent) {
      e.preventDefault();
      return false;
    }
    function onKeyCombination(e: KeyboardEvent) {
      // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+S, F12, Ctrl+Shift+I
      if (
        (e.ctrlKey && ['c', 'v', 'x', 'a', 's'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i')
      ) {
        e.preventDefault();
        return false;
      }
    }
    document.addEventListener('copy', preventDefault);
    document.addEventListener('paste', preventDefault);
    document.addEventListener('cut', preventDefault);
    document.addEventListener('contextmenu', onContextmenu);
    document.addEventListener('keydown', onKeyCombination);
    return () => {
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('paste', preventDefault);
      document.removeEventListener('cut', preventDefault);
      document.removeEventListener('contextmenu', onContextmenu);
      document.removeEventListener('keydown', onKeyCombination);
    };
  }, [submission, result]);

  // Anti-cheat: tab visibility + focus
  useEffect(() => {
    if (!submission || result) return;
    function onVisibility() {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const next = prev + 1;
          if (submission) updateSubmission(submission.id, { tab_switch_count: next });
          if (next >= 3) {
            handleSubmit('cheated');
          } else {
            setWarningCount(next);
            setWarningOpen(true);
          }
          return next;
        });
      }
    }
    function onBlur() {
      setTabSwitches((prev) => {
        const next = prev + 1;
        if (submission) updateSubmission(submission.id, { tab_switch_count: next });
        if (next >= 3) {
          handleSubmit('cheated');
        } else {
          setWarningCount(next);
          setWarningOpen(true);
        }
        return next;
      });
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [submission, result]);

  // Fullscreen request
  useEffect(() => {
    if (enterFullscreen && !result) {
      const el = document.documentElement;
      el.requestFullscreen?.().catch(() => {});
    }
  }, [enterFullscreen, result]);

  // Floating watermark positions
  const watermarks = Array.from({ length: 8 }, (_, i) => ({
    top: `${(i * 23) % 90 + 5}%`,
    left: `${(i * 37) % 80 + 10}%`,
  }));

  async function handleSubmit(status: 'submitted' | 'auto_submitted' | 'cheated') {
    if (!submission || !exam || result) return;
    if (timerRef.current) clearInterval(timerRef.current);

    let totalScore = 0;
    const maxScore = questions.reduce((s, q) => s + q.points, 0);

    for (const q of questions) {
      const ans = answers[q.id];
      let awarded = 0;
      let isCorrect = false;
      if (q.type === 'mcq' && ans?.choice !== null && ans?.choice === q.correct_choice_index) {
        awarded = q.points;
        isCorrect = true;
      }
      totalScore += awarded;
      await upsertAnswer(submission.id, q.id, {
        selected_choice_index: ans?.choice ?? null,
        essay_answer: ans?.essay ?? null,
        awarded_score: awarded,
        is_correct: isCorrect,
      });
    }

    await updateSubmission(submission.id, {
      status,
      total_score: totalScore,
      max_score: maxScore,
      submitted_at: new Date().toISOString(),
    });

    await upsertOnlineGrade(exam.id, student.id, totalScore, maxScore, false);

    setResult({ score: totalScore, max: maxScore, cheated: status === 'cheated' });

    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  function setChoice(qId: string, choice: number) {
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], choice } }));
  }
  function setEssay(qId: string, text: string) {
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], essay: text } }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">جارٍ تحميل الامتحان...</p>
      </div>
    );
  }

  if (result) {
    const percent = result.max > 0 ? Math.round((result.score / result.max) * 100) : 0;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card rounded-3xl p-8 max-w-md text-center"
        >
          {result.cheated ? (
            <>
              <AlertTriangle className="mx-auto text-red-400 mb-4" size={56} />
              <h2 className="text-2xl font-bold text-red-400 mb-2">تم تسليم الامتحان تلقائيًا</h2>
              <p className="text-slate-400 mb-4">تم رصد محاولة غش (تبديل التبويب 3 مرات). تم تسليم الامتحان بحالة «غش».</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto text-emerald-400 mb-4" size={56} />
              <h2 className="text-2xl font-bold text-white mb-2">تم تسليم الامتحان</h2>
              <p className="text-slate-400 mb-4">نتيجتك:</p>
            </>
          )}
          <div className="glass-light rounded-xl p-6 mb-4">
            <p className="text-4xl font-extrabold text-emerald-300">{result.score}</p>
            <p className="text-slate-400">من {result.max} درجة ({percent}%)</p>
          </div>
          <Button onClick={onExit} className="w-full">الخروج</Button>
        </motion.div>
      </div>
    );
  }

  if (!exam) return null;
  const watermarkText = `${student.name} • ${student.phone ?? ''}`;

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Anti-cheat watermarks */}
      {watermarks.map((w, i) => (
        <div
          key={i}
          className="exam-watermark"
          style={{ top: w.top, left: w.left }}
        >
          {watermarkText}
        </div>
      ))}

      {/* Header */}
      <div className="glass border-b border-white/10 sticky top-0 z-30 no-print">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-bold text-white">{exam.title}</h1>
              <p className="text-xs text-emerald-400/70">{settings.management_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab switch indicator */}
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${i < tabSwitches ? 'bg-red-500' : 'bg-slate-600'}`}
                />
              ))}
              <span className="text-xs text-slate-500 mr-1">تحذيرات</span>
            </div>
            {/* Timer */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold ${timeLeft < 60 ? 'bg-red-500/20 text-red-400' : 'glass-light text-white'}`}>
              <Clock size={16} />
              {formatTime(new Date(timeLeft * 1000))}
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 relative z-10">
        {questions.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-slate-400">
            لا توجد أسئلة في هذا الامتحان.
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {questions.map((q, i) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-xl p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">
                      سؤال {i + 1} من {questions.length}
                    </span>
                    <span className="text-xs text-slate-500">{q.points} درجة</span>
                  </div>
                  <p className="text-white font-semibold mb-4 leading-relaxed">{q.question_text}</p>
                  {q.type === 'mcq' && q.choices && (
                    <div className="space-y-2">
                      {q.choices.map((c, ci) => {
                        const isSelected = answers[q.id]?.choice === ci;
                        return (
                          <button
                            key={ci}
                            onClick={() => setChoice(q.id, ci)}
                            className={`w-full text-right px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/10 text-white'
                                : 'border-white/10 glass-light text-slate-300 hover:border-white/20'
                            }`}
                          >
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isSelected ? 'bg-emerald-500 text-white' : 'glass-light text-slate-400'}`}>
                              {String.fromCharCode(1571 + ci)}
                            </span>
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {q.type === 'essay' && (
                    <textarea
                      value={answers[q.id]?.essay ?? ''}
                      onChange={(e) => setEssay(q.id, e.target.value)}
                      rows={6}
                      placeholder="اكتب إجابتك هنا..."
                      className="w-full glass-light rounded-xl py-3 px-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition resize-none"
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Submit button */}
        <div className="mt-6 flex justify-center no-print">
          <Button size="lg" onClick={() => handleSubmit('submitted')}>
            <Send size={18} /> تسليم الامتحان
          </Button>
        </div>
      </div>

      {/* Tab switch warning modal */}
      <Modal open={warningOpen} onClose={() => setWarningOpen(false)} size="sm">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
            <AlertTriangle className="text-red-400" size={32} />
          </div>
          <h3 className="text-xl font-bold text-red-300 mb-2">تحذير: تبديل التبويب</h3>
          <p className="text-slate-400 text-sm mb-2">
            تم رصد خروجك من نافذة الامتحان.
          </p>
          <p className="text-slate-300 text-sm mb-4">
            هذا التحذير رقم <span className="font-bold text-amber-400">{warningCount}</span> من 3.
            عند الوصول إلى 3 تحذيرات سيتم تسليم الامتحان تلقائيًا كحالة «غش».
          </p>
          <Button onClick={() => setWarningOpen(false)}>
            <Eye size={16} /> العودة للامتحان
          </Button>
        </div>
      </Modal>
    </div>
  );
}
