import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, Calendar, TrendingUp, Award, CheckCircle2, XCircle, Clock, ShieldCheck, Users, BookOpen, Heart, LogOut } from 'lucide-react';
import type { Student, AttendanceRecord, OnlineGrade, CenterGrade, CenterExam, OnlineExam, HomeworkStatus, BehaviorEval } from '@/lib/types';
import { fetchStudentByParentToken, fetchAttendanceForStudent, fetchStudentsByParentPhone } from '@/lib/data';
import { STATUS_META } from '@/lib/constants';
import { formatArabicDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import Watermark from '@/components/ui/Watermark';

type ChildInfo = Student & { group_name?: string; grade_name?: string; stage_name?: string };

const BEHAVIOR_LABELS: Record<string, { label: string; color: string }> = {
  participatory: { label: 'مشارك', color: 'text-emerald-400' },
  quiet: { label: 'هادئ', color: 'text-blue-400' },
  disruptive: { label: 'مشاغب', color: 'text-red-400' },
  excellent: { label: 'ممتاز', color: 'text-amber-400' },
  needs_attention: { label: 'يحتاج متابعة', color: 'text-orange-400' },
};

const HOMEWORK_LABELS: Record<string, { label: string; color: string }> = {
  complete: { label: 'مكتمل', color: 'text-emerald-400' },
  incomplete: { label: 'غير مكتمل', color: 'text-red-400' },
  late: { label: 'متأخر', color: 'text-amber-400' },
};

export default function ParentPortal() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [activeChild, setActiveChild] = useState<ChildInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [onlineGrades, setOnlineGrades] = useState<(OnlineGrade & { exam?: OnlineExam })[]>([]);
  const [centerGrades, setCenterGrades] = useState<(CenterGrade & { exam?: CenterExam })[]>([]);
  const [homework, setHomework] = useState<(HomeworkStatus & { homework?: { title: string; due_date: string } })[]>([]);
  const [behavior, setBehavior] = useState<BehaviorEval[]>([]);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'phone' | 'dashboard'>('phone');

  useEffect(() => {
    async function load() {
      if (token) {
        const s = await fetchStudentByParentToken(token);
        if (s) {
          const enriched = await enrichChild(s);
          setChildren([enriched]); setActiveChild(enriched); setAuthMode('dashboard');
          await loadChildData(s.id); setLoading(false); return;
        }
      }
      const savedPhone = localStorage.getItem('alkhaled_parent_phone');
      if (savedPhone) {
        const kids = await fetchStudentsByParentPhone(savedPhone);
        if (kids.length > 0) {
          setChildren(kids); setActiveChild(kids[0]); setAuthMode('dashboard');
          await loadChildData(kids[0].id); setLoading(false); return;
        }
      }
      setLoading(false);
    }
    load();
  }, [token]);

  async function enrichChild(s: Student): Promise<ChildInfo> {
    if (!s.group_id) return s;
    const { data } = await supabase.from('groups').select('name, grade_level:grade_levels(name, stage:academic_stages(name))').eq('id', s.group_id).maybeSingle();
    if (data) { const g = data as { name: string; grade_level: { name: string; stage: { name: string } } }; return { ...s, group_name: g.name, grade_name: g.grade_level?.name, stage_name: g.grade_level?.stage?.name }; }
    return s;
  }

  async function loadChildData(studentId: string) {
    const att = await fetchAttendanceForStudent(studentId);
    setAttendance(att);
    const { data: og } = await supabase.from('online_grades').select('*, exam:exams(*)').eq('student_id', studentId);
    setOnlineGrades((og as (OnlineGrade & { exam?: OnlineExam })[]) ?? []);
    const { data: cg } = await supabase.from('center_grades').select('*, exam:center_exams(*)').eq('student_id', studentId);
    setCenterGrades((cg as (CenterGrade & { exam?: CenterExam })[]) ?? []);
    const { data: hw } = await supabase.from('homework_status').select('*, homework:homework(title, due_date)').eq('student_id', studentId).order('recorded_at', { ascending: false });
    setHomework((hw as (HomeworkStatus & { homework?: { title: string; due_date: string } })[]) ?? []);
    const { data: bev } = await supabase.from('behavior_eval').select('*').eq('student_id', studentId).order('eval_date', { ascending: false });
    setBehavior((bev as BehaviorEval[]) ?? []);
  }

  async function handlePhoneLogin() {
    if (!phoneInput.trim()) { setPhoneError('برجاء إدخال رقم الهاتف'); return; }
    const normalized = phoneInput.trim().replace(/\s/g, '');
    const kids = await fetchStudentsByParentPhone(normalized);
    if (kids.length === 0) { setPhoneError('لا يوجد طلاب مرتبطون بهذا الرقم. تأكد من الرقم أو تواصل مع الإدارة.'); return; }
    localStorage.setItem('alkhaled_parent_phone', normalized);
    setChildren(kids); setActiveChild(kids[0]); setAuthMode('dashboard');
    await loadChildData(kids[0].id);
  }

  function handleLogout() {
    localStorage.removeItem('alkhaled_parent_phone');
    setAuthMode('phone'); setChildren([]); setActiveChild(null); setPhoneInput('');
  }

  async function switchChild(child: ChildInfo) { setActiveChild(child); await loadChildData(child.id); }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">جارٍ تحميل البيانات...</p></div>;

  if (authMode === 'phone') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg mb-4"><Users className="text-white" size={36} /></div>
              <h1 className="text-2xl font-bold text-white">بوابة أولياء الأمور</h1>
              <p className="text-sm text-slate-400 mt-2 text-center">سجّل دخولك برقم هاتفك لرؤية جميع أبنائك وتفاصيلهم</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">رقم الهاتف</label>
                <div className="relative">
                  <Phone size={18} className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" />
                  <input type="tel" value={phoneInput} onChange={(e) => { setPhoneInput(e.target.value); setPhoneError(''); }} onKeyDown={(e) => e.key === 'Enter' && handlePhoneLogin()} placeholder="01xxxxxxxxx" autoFocus className="w-full glass-light rounded-xl py-3 pr-11 pl-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition text-lg" />
                </div>
                {phoneError && <p className="text-red-400 text-sm mt-2 flex items-center gap-1"><XCircle size={14} /> {phoneError}</p>}
              </div>
              <button onClick={handlePhoneLogin} className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 transition active:scale-95">دخول</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeChild) return <div className="min-h-screen flex items-center justify-center p-4"><div className="glass-card rounded-2xl p-8 text-center max-w-md"><p className="text-red-400 text-lg font-bold mb-2">خطأ</p><p className="text-slate-400">تعذر تحميل البيانات</p></div></div>;

  const present = attendance.filter((a) => a.status === 'present').length;
  const absent = attendance.filter((a) => a.status === 'absent' || a.status === 'excused_absence').length;
  const rate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {children.length > 1 && (
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5"><Users size={14} /> أبناؤك المسجلون ({children.length})</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {children.map((c) => (
                <button key={c.id} onClick={() => switchChild(c)} className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${activeChild?.id === c.id ? 'bg-emerald-600 text-white' : 'glass-light text-slate-300 hover:bg-white/10'}`}><User size={14} /> {c.name}</button>
              ))}
            </div>
          </div>
        )}

        <motion.div key={activeChild.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${activeChild.gender === 'male' ? 'bg-blue-500/15 text-blue-400' : 'bg-pink-500/15 text-pink-400'}`}>{activeChild.name.charAt(0)}</div>
              <div>
                <h1 className="text-2xl font-bold text-white">{activeChild.name}</h1>
                <div className="flex items-center gap-3 text-sm text-slate-400 mt-1 flex-wrap">
                  {activeChild.stage_name && <span>{activeChild.stage_name}</span>}
                  {activeChild.grade_name && <><span className="text-slate-600">|</span><span>{activeChild.grade_name}</span></>}
                  {activeChild.group_name && <><span className="text-slate-600">|</span><span className="text-emerald-400">{activeChild.group_name}</span></>}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-xl glass-light text-slate-400 hover:text-red-400 transition text-sm"><LogOut size={16} /> خروج</button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="إجمالي الحصص" value={attendance.length} icon={<Calendar size={18} />} color="text-slate-200" />
          <SummaryCard label="حضور" value={present} icon={<CheckCircle2 size={18} />} color="text-emerald-300" />
          <SummaryCard label="غياب" value={absent} icon={<XCircle size={18} />} color="text-red-300" />
          <SummaryCard label="نسبة الحضور" value={`${rate}%`} icon={<TrendingUp size={18} />} color="text-blue-300" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Award size={18} className="text-amber-400" /> درجات السنتر</h3>
            {centerGrades.length === 0 ? <p className="text-slate-500 text-sm">لا توجد درجات سنتر بعد.</p> : <div className="space-y-2">{centerGrades.map((g) => <div key={g.id} className="glass-light rounded-lg p-3 flex items-center justify-between"><span className="text-sm text-slate-300">{g.exam?.title ?? 'امتحان'}</span><span className="font-bold text-amber-300">{g.score} / {g.exam?.max_score ?? 100}</span></div>)}</div>}
          </div>
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-blue-400" /> الامتحانات الإلكترونية</h3>
            {onlineGrades.length === 0 ? <p className="text-slate-500 text-sm">لا توجد درجات إلكترونية بعد.</p> : <div className="space-y-2">{onlineGrades.map((g) => <div key={g.id} className="glass-light rounded-lg p-3 flex items-center justify-between"><span className="text-sm text-slate-300">{g.exam?.title ?? 'امتحان'}</span><span className="font-bold text-blue-300">{g.score} / {g.max_score}</span></div>)}</div>}
          </div>
        </div>

        {homework.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><BookOpen size={18} className="text-emerald-400" /> متابعة الواجبات</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {homework.map((h) => { const meta = HOMEWORK_LABELS[h.status] ?? HOMEWORK_LABELS.incomplete; return (
                <div key={h.id} className="glass-light rounded-lg p-3 flex items-center justify-between">
                  <div><span className="text-sm text-slate-300">{h.homework?.title ?? 'واجب'}</span>{h.homework?.due_date && <p className="text-[10px] text-slate-500 mt-0.5">موعد التسليم: {formatArabicDate(h.homework.due_date)}</p>}{h.teacher_note && <p className="text-xs text-slate-400 mt-1">ملاحظة المدرس: {h.teacher_note}</p>}</div>
                  <span className={`text-sm font-bold ${meta.color}`}>{meta.label}</span>
                </div>
              ); })}
            </div>
          </div>
        )}

        {behavior.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Heart size={18} className="text-pink-400" /> متابعة السلوك</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {behavior.map((b) => { const meta = BEHAVIOR_LABELS[b.rating] ?? BEHAVIOR_LABELS.quiet; return (
                <div key={b.id} className="glass-light rounded-lg p-3 flex items-center justify-between">
                  <div><span className="text-sm text-slate-300">{formatArabicDate(b.eval_date)}</span>{b.note && <p className="text-xs text-slate-400 mt-1">{b.note}</p>}</div>
                  <span className={`text-sm font-bold ${meta.color}`}>{meta.label}</span>
                </div>
              ); })}
            </div>
          </div>
        )}

        {attendance.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">سجل الحضور التفصيلي</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {attendance.map((a) => { const meta = STATUS_META[a.status]; return (
                <div key={a.id} className="glass-light rounded-lg p-3 flex items-center justify-between"><span className="text-sm text-slate-300">{formatArabicDate(a.attendance_date)}</span><span className={`text-sm font-semibold ${meta.color}`}>{meta.emoji} {meta.label}</span></div>
              ); })}
            </div>
          </div>
        )}
      </div>
      <Watermark />
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: React.ReactNode; icon: React.ReactNode; color: string }) {
  return <div className="glass-card rounded-xl p-4"><div className="flex items-center justify-between mb-2"><span className="text-xs text-slate-400">{label}</span><span className="text-slate-500">{icon}</span></div><p className={`text-2xl font-bold ${color}`}>{value}</p></div>;
}
