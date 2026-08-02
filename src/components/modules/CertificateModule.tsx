import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Printer, Download, Sparkles, Trophy, Eye, ArrowRight, GraduationCap } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Student } from '@/lib/types';
import { useSettings } from '@/context/SettingsContext';
import { generateSerialId, formatArabicDate, formatTime } from '@/lib/format';
import { createCertificate } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';

type CertificateModuleProps = {
  students: Student[];
};

type LeaderboardEntry = {
  student: Student;
  totalScore: number;
  maxScore: number;
  percentage: number;
};

type GradeInfo = {
  group_name: string | null;
  grade_name: string | null;
  stage_name: string | null;
};

export default function CertificateModule({ students }: CertificateModuleProps) {
  const { settings } = useSettings();
  const [certMode, setCertMode] = useState<'custom' | 'leaderboard'>('custom');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [gradeInfo, setGradeInfo] = useState<GradeInfo | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [serial, setSerial] = useState('');
  const [issued, setIssued] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const loadLeaderboard = useCallback(async () => {
    if (students.length === 0) return;
    const { data: cg } = await supabase
      .from('center_grades')
      .select('student_id, score')
      .in('student_id', students.map((s) => s.id));
    const { data: og } = await supabase
      .from('online_grades')
      .select('student_id, score, max_score')
      .in('student_id', students.map((s) => s.id));

    const scoreMap: Record<string, { total: number; max: number }> = {};
    for (const g of cg ?? []) {
      if (!scoreMap[g.student_id]) scoreMap[g.student_id] = { total: 0, max: 0 };
      scoreMap[g.student_id].total += g.score;
      scoreMap[g.student_id].max += 100;
    }
    for (const g of og ?? []) {
      if (!scoreMap[g.student_id]) scoreMap[g.student_id] = { total: 0, max: 0 };
      scoreMap[g.student_id].total += g.score;
      scoreMap[g.student_id].max += g.max_score || 100;
    }

    const entries: LeaderboardEntry[] = students
      .map((s) => {
        const data = scoreMap[s.id] ?? { total: 0, max: 0 };
        return {
          student: s,
          totalScore: data.total,
          maxScore: data.max,
          percentage: data.max > 0 ? Math.round((data.total / data.max) * 100) : 0,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    setLeaderboard(entries);
  }, [students]);

  useEffect(() => {
    if (certMode === 'leaderboard') loadLeaderboard();
  }, [certMode, loadLeaderboard]);

  const fetchGradeInfo = useCallback(async (groupId: string | null) => {
    if (!groupId) {
      setGradeInfo(null);
      return;
    }
    const { data } = await supabase
      .from('groups')
      .select('name, grade_level:grade_levels(name, stage:academic_stages(name))')
      .eq('id', groupId)
      .maybeSingle();
    if (data) {
      const g = data as { name: string; grade_level: { name: string; stage: { name: string } } };
      setGradeInfo({
        group_name: g.name,
        grade_name: g.grade_level?.name ?? null,
        stage_name: g.grade_level?.stage?.name ?? null,
      });
    } else {
      setGradeInfo(null);
    }
  }, []);

  function selectStudent(s: Student) {
    setSelected(s);
    setExamTitle('');
    setScore('');
    setMaxScore('100');
    setSerial(generateSerialId());
    setIssued(false);
    setPreviewing(false);
    fetchGradeInfo(s.group_id);
  }

  function selectLeader(s: LeaderboardEntry, rank: number) {
    setSelected(s.student);
    const isFemale = s.student.gender === 'female';
    setExamTitle(rank === 1 ? 'لوحة الشرف — المركز الأول' : `لوحة الشرف — المركز ${rank}`);
    setScore(String(s.totalScore));
    setMaxScore(String(s.maxScore));
    setSerial(generateSerialId());
    setIssued(false);
    setPreviewing(false);
    fetchGradeInfo(s.student.group_id);
  }

  function fireConfetti() {
    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b'],
    });
  }

  async function handleIssue() {
    if (!selected) return;
    setPreviewing(false);
    setIssued(true);
    fireConfetti();
    await createCertificate({
      student_id: selected.id,
      exam_title: examTitle || null,
      score: parseFloat(score) || null,
      max_score: parseFloat(maxScore) || null,
      serial_id: serial,
    });
  }

  function handlePreview() {
    if (!selected) return;
    setSerial(generateSerialId());
    setPreviewing(true);
  }

  function handlePrint() {
    window.print();
  }

  const isFemale = selected?.gender === 'female';
  const excellenceWord = isFemale ? 'لتفوقها الباهر' : 'لتفوقه الباهر';
  const pronoun = isFemale ? 'الطالبة' : 'الطالب';
  const possessive = isFemale ? 'ابنتنا' : 'ابننا';

  const showCertificate = (selected && issued) || (selected && previewing);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Award className="text-amber-400" size={22} />
          <h3 className="text-lg font-bold text-white">شهادات التفوق</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCertMode('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              certMode === 'custom' ? 'bg-emerald-600 text-white' : 'glass-light text-slate-400'
            }`}
          >
            شهادة مخصصة
          </button>
          <button
            onClick={() => setCertMode('leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              certMode === 'leaderboard' ? 'bg-emerald-600 text-white' : 'glass-light text-slate-400'
            }`}
          >
            <Trophy size={14} /> لوحة الشرف التلقائية
          </button>
        </div>
      </div>

      {/* Leaderboard mode */}
      {certMode === 'leaderboard' && (
        <div className="glass-card rounded-2xl p-5 mb-4">
          <h4 className="font-bold text-white mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            ترتيب الطلاب حسب الدرجات الكلية
          </h4>
          {leaderboard.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">لا توجد درجات مسجلة بعد.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((entry, i) => (
                <button
                  key={entry.student.id}
                  onClick={() => selectLeader(entry, i + 1)}
                  className={`w-full text-right p-3 rounded-xl flex items-center justify-between transition ${
                    selected?.id === entry.student.id
                      ? 'bg-emerald-600/20 border border-emerald-500/40'
                      : 'glass-light hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-amber-500/20 text-amber-400' :
                      i === 1 ? 'bg-slate-400/20 text-slate-300' :
                      i === 2 ? 'bg-orange-700/20 text-orange-400' :
                      'glass-light text-slate-400'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="font-semibold text-white text-sm">{entry.student.name}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">
                    {entry.percentage}%
                    <span className="text-xs text-slate-500 font-normal mr-2">
                      ({entry.totalScore}/{entry.maxScore})
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {selected && certMode === 'leaderboard' && !showCertificate && (
            <div className="flex gap-2 mt-4 justify-center">
              <Button onClick={handlePreview} size="sm" variant="secondary">
                <Eye size={16} /> معاينة الشهادة
              </Button>
              <Button onClick={handleIssue} size="sm">
                <Sparkles size={16} /> إصدار الشهادة
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Student list + form — only show in custom mode */}
        {certMode === 'custom' && (
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card rounded-xl p-4">
            <p className="text-sm text-slate-400 mb-3">اختر الطالب:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {students.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">لا يوجد طلاب.</p>
              ) : (
                students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectStudent(s)}
                    className={`w-full text-right px-3 py-2 rounded-lg text-sm font-semibold transition ${
                      selected?.id === s.id
                        ? 'bg-emerald-600 text-white'
                        : 'glass-light text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {s.name} {s.gender === 'female' && '(أنثى)'}
                  </button>
                ))
              )}
            </div>
          </div>

          {selected && (
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">عنوان الامتحان</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="مثال: امتحان الوحدة الأولى"
                  className="w-full glass-light rounded-lg py-2 px-3 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">الدرجة</label>
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="w-full glass-light rounded-lg py-2 px-3 text-white border border-white/10 focus:border-emerald-500/50 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">العظمى</label>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    className="w-full glass-light rounded-lg py-2 px-3 text-white border border-white/10 focus:border-emerald-500/50 focus:outline-none text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePreview} variant="secondary" className="flex-1" size="sm">
                  <Eye size={16} /> معاينة الشهادة
                </Button>
                <Button onClick={handleIssue} className="flex-1" size="sm">
                  <Sparkles size={16} /> إصدار
                </Button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Certificate preview / placeholder */}
        <div className={certMode === 'leaderboard' ? 'lg:col-span-3' : 'lg:col-span-2'}>
          {showCertificate ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {/* Action buttons (no-print) */}
              <div className="flex gap-2 mb-3 no-print flex-wrap items-center">
                {previewing && !issued && (
                  <Button size="sm" variant="secondary" onClick={() => setPreviewing(false)}>
                    <ArrowRight size={16} /> رجوع للتعديل
                  </Button>
                )}
                {previewing && !issued && (
                  <Button size="sm" onClick={handleIssue}>
                    <Sparkles size={16} /> إصدار الشهادة
                  </Button>
                )}
                <Button size="sm" onClick={handlePrint}>
                  <Printer size={16} /> طباعة A4
                </Button>
                <Button size="sm" variant="secondary" onClick={handlePrint}>
                  <Download size={16} /> تحميل PDF
                </Button>
                {previewing && !issued && (
                  <span className="text-xs text-amber-400/80 flex items-center gap-1 mr-auto">
                    <Eye size={14} /> وضع المعاينة — لم يتم الحفظ بعد
                  </span>
                )}
              </div>

              {/* Certificate */}
              <div
                id="certificate-print-area"
                ref={printRef}
                className="relative rounded-2xl overflow-hidden mx-auto"
                style={{
                  aspectRatio: '210 / 297',
                  maxWidth: '100%',
                  background: 'linear-gradient(135deg, #FFFCF5 0%, #FFF9EC 40%, #FFFBF0 100%)',
                }}
              >
                {/* Ornate outer frame */}
                <div
                  className="absolute inset-[10px] rounded-xl pointer-events-none"
                  style={{
                    border: '3px solid #C8A040',
                    boxShadow: 'inset 0 0 0 1px #E8D088, inset 0 0 0 5px transparent, inset 0 0 0 6px #C8A040',
                  }}
                />
                {/* Inner thin frame */}
                <div
                  className="absolute inset-[20px] rounded-lg pointer-events-none"
                  style={{ border: '1px solid #D4B468' }}
                />
                {/* Decorative inner accent line */}
                <div
                  className="absolute inset-[26px] rounded pointer-events-none"
                  style={{ border: '0.5px solid #E8D088' }}
                />

                {/* Corner ornaments */}
                <div className="absolute top-[18px] right-[18px] pointer-events-none">
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                    <path d="M2 2 Q22 2 22 22 Q2 22 2 2 Z" fill="#C8A040" opacity="0.15" />
                    <path d="M2 2 L2 16 M2 2 L16 2" stroke="#C8A040" strokeWidth="2.5" />
                    <circle cx="6" cy="6" r="2.5" fill="#C8A040" />
                  </svg>
                </div>
                <div className="absolute top-[18px] left-[18px] pointer-events-none rotate-90">
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                    <path d="M2 2 Q22 2 22 22 Q2 22 2 2 Z" fill="#C8A040" opacity="0.15" />
                    <path d="M2 2 L2 16 M2 2 L16 2" stroke="#C8A040" strokeWidth="2.5" />
                    <circle cx="6" cy="6" r="2.5" fill="#C8A040" />
                  </svg>
                </div>
                <div className="absolute bottom-[18px] right-[18px] pointer-events-none -rotate-90">
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                    <path d="M2 2 Q22 2 22 22 Q2 22 2 2 Z" fill="#C8A040" opacity="0.15" />
                    <path d="M2 2 L2 16 M2 2 L16 2" stroke="#C8A040" strokeWidth="2.5" />
                    <circle cx="6" cy="6" r="2.5" fill="#C8A040" />
                  </svg>
                </div>
                <div className="absolute bottom-[18px] left-[18px] pointer-events-none rotate-180">
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                    <path d="M2 2 Q22 2 22 22 Q2 22 2 2 Z" fill="#C8A040" opacity="0.15" />
                    <path d="M2 2 L2 16 M2 2 L16 2" stroke="#C8A040" strokeWidth="2.5" />
                    <circle cx="6" cy="6" r="2.5" fill="#C8A040" />
                  </svg>
                </div>

                {/* Subtle watermark pattern */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.03]"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 50% 50%, #C8A040 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />

                {/* Content */}
                <div className="relative h-full flex flex-col items-center px-8 sm:px-14 py-10 sm:py-14 text-center">
                  {/* Logo + platform name */}
                  <div className="flex flex-col items-center">
                    <div className="mb-3">
                      {settings.logo_url ? (
                        <img
                          src={settings.logo_url}
                          alt="logo"
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 ring-amber-500/40 shadow-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg ring-2 ring-amber-500/40">
                          <GraduationCap className="text-white" size={40} />
                        </div>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-emerald-800 leading-tight" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>
                      {settings.platform_name}
                    </h1>
                    <p className="text-[10px] sm:text-xs text-amber-700/70 mt-1 font-semibold tracking-wide">
                      {settings.management_name}
                    </p>
                  </div>

                  {/* Divider with ornament */}
                  <div className="flex items-center gap-2 my-4 sm:my-5">
                    <div className="w-12 sm:w-20 h-px bg-gradient-to-l from-amber-500 to-transparent" />
                    <span className="text-amber-600 text-base">✦</span>
                    <div className="w-12 sm:w-20 h-px bg-gradient-to-r from-amber-500 to-transparent" />
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>
                    شهادة تقدير وتميز
                  </h2>
                  <p className="text-xs sm:text-sm text-amber-700 font-semibold tracking-widest mb-5 sm:mb-7">
                    CERTIFICATE OF EXCELLENCE
                  </p>

                  {/* Inspiring introductory text */}
                  <div className="max-w-md mb-5 sm:mb-6">
                    <p className="text-[13px] sm:text-[15px] text-slate-600 leading-relaxed" style={{ lineHeight: '1.9' }}>
                      يسعدنا أن نكرّم أبناءنا وبناتنا الذين أثبتوا أن العزيمة طريق النجاح، وأن الإصرار مفتاح التفوق.
                      تقديراً لجهودكم المبذولة وإيماننا بقدرتكم على صنع المستقبل، نمنحكم هذه الشهادة لتكون شاهدة
                      على تميزكم ومحفّزة لكم نحو آفاق أوسع من الإنجاز والعطاء.
                    </p>
                  </div>

                  {/* Student name section */}
                  <p className="text-sm sm:text-base text-slate-500 mb-2">
                    تشهد المنصة بأن
                  </p>
                  <div className="relative mb-4 sm:mb-5">
                    <div className="absolute -inset-x-8 -inset-y-2 rounded-lg bg-gradient-to-l from-amber-100 via-amber-50 to-amber-100 -z-10" />
                    <div className="px-8 py-2 border-y-2 border-amber-400/50">
                      <p className="text-2xl sm:text-3xl font-black text-emerald-800" style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>
                        {pronoun} / {selected?.name}
                      </p>
                    </div>
                  </div>

                  {/* Grade + exam + score details */}
                  <div className="space-y-2 mb-4 sm:mb-5 text-sm sm:text-base text-slate-700">
                    {gradeInfo?.grade_name && (
                      <p>
                        <span className="text-slate-500">المرحلة: </span>
                        <span className="font-bold text-slate-800">
                          {gradeInfo.stage_name} — {gradeInfo.grade_name}
                        </span>
                      </p>
                    )}
                    <p>
                      <span className="text-slate-500">{isFemale ? 'قد أتمت' : 'قد أتمّ'} </span>
                      <span className="font-bold text-emerald-700">
                        {examTitle || 'الامتحان'}
                      </span>
                      {score && (
                        <>
                          <span className="text-slate-500"> {isFemale ? 'وحصلت' : 'وحصل'} على درجة </span>
                          <span className="font-black text-amber-600 text-lg">{score}</span>
                          <span className="text-slate-500"> من </span>
                          <span className="font-bold text-slate-700">{maxScore}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Excellence badge */}
                  <div className="mb-4 sm:mb-5">
                    <div
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                        border: '2px solid #D4B468',
                        boxShadow: '0 2px 8px rgba(200, 160, 64, 0.2)',
                      }}
                    >
                      <Award size={18} className="text-amber-700" />
                      <span className="text-amber-800 font-bold text-sm sm:text-base">
                        تقدير التفوق الباهر
                      </span>
                      <Award size={18} className="text-amber-700" />
                    </div>
                  </div>

                  {/* Encouraging closing text */}
                  <p className="text-[12px] sm:text-[13px] text-slate-500 leading-relaxed max-w-sm italic mb-auto" style={{ lineHeight: '1.8' }}>
                    نبارك ل{possessive} هذا الإنجاز، ونراه نواة لمسيرة حافلة بالنجاح.
                    فالتعلّم رحلة لا تنتهي، وكل خطوة تخطوها تقربك من أحلامك.
                  </p>

                  {/* Footer: signatures + date + serial */}
                  <div className="w-full mt-auto pt-6 sm:pt-8">
                    <div className="flex items-end justify-between text-[10px] sm:text-xs text-slate-600">
                      {/* Right: management signature */}
                      <div className="text-center flex flex-col items-center">
                        <div className="w-16 sm:w-20 border-b border-slate-400 mb-1" />
                        <p className="font-bold text-emerald-700 text-[11px] sm:text-sm">{settings.management_name}</p>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">إدارة المنصة</p>
                      </div>
                      {/* Center: date + serial */}
                      <div className="text-center">
                        <p className="text-[9px] sm:text-[10px] text-slate-400">التاريخ</p>
                        <p className="font-semibold text-slate-700 text-[11px] sm:text-xs">{formatArabicDate(new Date())}</p>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1.5">رقم تسلسلي</p>
                        <p className="font-mono font-bold text-slate-600 text-[10px] sm:text-xs">{serial}</p>
                      </div>
                      {/* Left: seal */}
                      <div className="text-center flex flex-col items-center">
                        <div
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-1"
                          style={{
                            border: '2px solid #C8A040',
                            background: 'radial-gradient(circle, #FEF3C7 0%, #FDE68A 100%)',
                            boxShadow: '0 1px 4px rgba(200, 160, 64, 0.3)',
                          }}
                        >
                          <Award size={24} className="text-amber-700" />
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-slate-400">ختم المنصة</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : selected ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Award className="mx-auto text-amber-400 mb-4" size={48} />
              <p className="text-slate-400 mb-2">
                {certMode === 'leaderboard'
                  ? `تم اختيار ${selected?.name}.`
                  : `تم اختيار ${selected?.name}.`}
              </p>
              <p className="text-slate-500 text-xs mb-4">
                اضغط «معاينة الشهادة» لمشاهدة التصميم، أو «إصدار الشهادة» للحفظ والطباعة.
              </p>
              {certMode === 'leaderboard' && (
                <p className="text-xs text-amber-400/70">
                  استخدم أزرار المعاينة والإصدار من قسم لوحة الشرف أعلاه.
                </p>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Award className="mx-auto text-slate-600 mb-4" size={48} />
              <p className="text-slate-400">اختر طالبًا من القائمة لإنشاء شهادة.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
