import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, LogIn, FileText, Clock, Award } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/lib/supabase';
import type { Student, OnlineExam } from '@/lib/types';
import ExamTaker from '@/components/modules/ExamTaker';

export default function ExamPortalPage() {
  const { settings } = useSettings();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [exams, setExams] = useState<(OnlineExam & { group_name?: string })[]>([]);
  const [activeExam, setActiveExam] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('phone', phone.trim())
      .maybeSingle();
    if (!data) {
      setError('لم يتم العثور على طالب بهذا الرقم');
      setLoading(false);
      return;
    }
    setStudent(data);
    // Fetch exams for this student's group
    if (data.group_id) {
      const { data: examData } = await supabase
        .from('exams')
        .select('*, groups(name)')
        .eq('group_id', data.group_id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      setExams((examData as (OnlineExam & { group_name?: string })[]) ?? []);
    }
    setLoading(false);
  }

  // If taking an exam
  if (activeExam && student) {
    return (
      <ExamTaker
        examId={activeExam}
        student={student}
        onExit={() => {
          setActiveExam(null);
          // Refresh exam list
          if (student.group_id) {
            supabase
              .from('exams')
              .select('*, groups(name)')
              .eq('group_id', student.group_id)
              .eq('is_published', true)
              .order('created_at', { ascending: false })
              .then(({ data }) => setExams((data as (OnlineExam & { group_name?: string })[]) ?? []));
          }
        }}
      />
    );
  }

  // If logged in as student — show exam list
  if (student) {
    return (
      <div className="min-h-screen pb-12">
        <div className="glass border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover ring-2 ring-emerald-500/40" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center ring-2 ring-emerald-500/40">
                  <GraduationCap className="text-emerald-400" size={22} />
                </div>
              )}
              <div>
                <h1 className="text-base font-bold text-white">{settings.platform_name}</h1>
                <p className="text-xs text-emerald-400/70">{settings.management_name}</p>
              </div>
            </div>
            <button
              onClick={() => { setStudent(null); setPhone(''); setPin(''); setExams([]); }}
              className="text-sm text-slate-400 hover:text-red-400 transition px-3 py-1.5 rounded-lg hover:bg-red-500/10"
            >
              خروج
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${student.gender === 'male' ? 'bg-blue-500/15 text-blue-400' : 'bg-pink-500/15 text-pink-400'}`}>
                {student.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{student.name}</h2>
                <p className="text-sm text-slate-400">بوابة الامتحانات الإلكترونية</p>
              </div>
            </div>
          </motion.div>

          <h3 className="font-bold text-white">الامتحانات المتاحة</h3>

          {exams.length === 0 ? (
            <div className="glass-light rounded-xl p-8 text-center text-slate-400">
              لا توجد امتحانات متاحة حاليًا.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {exams.map((ex) => (
                <motion.div
                  key={ex.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card rounded-xl p-5 hover:ring-2 hover:ring-emerald-500/40 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <FileText className="text-emerald-400" size={20} />
                    </div>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={12} /> {ex.duration_minutes} دقيقة
                    </span>
                  </div>
                  <h4 className="font-bold text-white mb-1">{ex.title}</h4>
                  {ex.description && <p className="text-sm text-slate-400 mb-3">{ex.description}</p>}
                  <button
                    onClick={() => setActiveExam(ex.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Award size={16} /> بدء الامتحان
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-600/40 pointer-events-none select-none whitespace-nowrap">
          {settings.management_name}
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card relative w-full max-w-md rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-6">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="logo" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-emerald-500/40 mb-3" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-emerald-600/20 flex items-center justify-center ring-4 ring-emerald-500/40 mb-3 animate-pulse-glow">
              <GraduationCap className="text-emerald-400" size={40} />
            </div>
          )}
          <h1 className="text-2xl font-extrabold gradient-text text-center">{settings.platform_name}</h1>
          <p className="text-sm text-emerald-400/70 mt-1 text-center">{settings.management_name}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-white text-center mb-1">بوابة الامتحانات</h2>
          <p className="text-sm text-slate-400 text-center">ادخل برقم هاتفك للوصول إلى الامتحانات</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">رقم الهاتف</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              className="w-full glass-light rounded-xl py-3 px-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center text-sm text-red-400"
            >
              {error}
            </motion.div>
          )}
          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn size={18} />
            {loading ? 'جارٍ الدخول...' : 'دخول'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/parent-portal" className="text-sm text-emerald-400 hover:text-emerald-300 font-semibold transition">
            بوابة ولي الأمر
          </a>
        </div>
      </motion.div>
    </div>
  );
}
