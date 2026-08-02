import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  DollarSign,
  AlertTriangle,
  Plus,
  Trash2,
  Archive,
  Clock,
  Calendar,
  Check,
  CheckCheck,
  X,
  History,
  MessageSquare,
  Clock3,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
  FileText,
  Image,
} from 'lucide-react';
import type { Student, AttendanceStatus, AttendanceRecord, Session, MonthlyArchive } from '@/lib/types';
import { STATUS_META, ARABIC_MONTHS } from '@/lib/constants';
import {
  upsertAttendance,
  fetchAttendanceForDate,
  fetchAttendanceForStudent,
  fetchSessions,
  createSession,
  deleteSession,
  fetchArchives,
  createArchive,
  fetchGroupStats,
} from '@/lib/data';
import { todayDateString, formatTime, formatArabicDate } from '@/lib/format';
import { exportToCSV, printDocument, buildAttendancePrintHTML, exportTableAsImage, buildMonthlyAttendanceHTML } from '@/lib/export';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type AttendanceModuleProps = {
  groupId: string;
  students: Student[];
  groupName?: string;
  stageName?: string;
  gradeName?: string;
};

const STATUS_OPTIONS: { status: AttendanceStatus; label: string; activeClass: string }[] = [
  { status: 'present', label: 'حضر', activeClass: 'bg-emerald-600 text-white shadow-lg' },
  { status: 'absent', label: 'غاب', activeClass: 'bg-red-600 text-white shadow-lg' },
  { status: 'excused_absence', label: 'غائب بعذر', activeClass: 'bg-amber-600 text-white shadow-lg' },
  { status: 'late', label: 'تأخير', activeClass: 'bg-purple-600 text-white shadow-lg' },
];

function currentMonthLabel(): string {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default function AttendanceModule({ groupId, students, groupName, stageName, gradeName }: AttendanceModuleProps) {
  const [currentMonth, setCurrentMonth] = useState(currentMonthLabel());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState('تم الحفظ ✓');
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<Session | null>(null);
  const [archiveMonthTarget, setArchiveMonthTarget] = useState<string | null>(null);
  const [archives, setArchives] = useState<MonthlyArchive[]>([]);
  const [viewArchive, setViewArchive] = useState<MonthlyArchive | null>(null);
  const [notesStudent, setNotesStudent] = useState<Student | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [timestampStudent, setTimestampStudent] = useState<Student | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [unpaidOpen, setUnpaidOpen] = useState(false);
  const [statsStudent, setStatsStudent] = useState<Student | null>(null);
  const [groupStats, setGroupStats] = useState({ totalStudents: 0, collected: 0, remaining: 0, fullyPaid: 0, partialPaid: 0 });
  const [date] = useState(todayDateString());

  const loadSessions = useCallback(async () => {
    const data = await fetchSessions(groupId, currentMonth);
    setSessions(data);
    if (data.length > 0 && !activeSessionId) {
      setActiveSessionId(data[0].id);
    } else if (data.length === 0) {
      setActiveSessionId('');
    }
  }, [groupId, currentMonth]);

  const loadArchives = useCallback(async () => {
    const data = await fetchArchives(groupId);
    setArchives(data);
  }, [groupId]);

  const loadGroupStats = useCallback(async () => {
    const stats = await fetchGroupStats(groupId);
    setGroupStats(stats);
  }, [groupId]);

  useEffect(() => {
    loadSessions();
    loadArchives();
    loadGroupStats();
  }, [loadSessions, loadArchives, loadGroupStats]);

  const loadRecords = useCallback(async () => {
    const data = await fetchAttendanceForDate(groupId, date);
    const map: Record<string, AttendanceRecord> = {};
    for (const r of data) {
      map[r.student_id] = r;
    }
    setRecords(map);
  }, [groupId, date]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  function triggerAutoSave() {
    setAutoSaveStatus('جاري الحفظ...');
    setTimeout(() => setAutoSaveStatus('تم الحفظ ✓'), 500);
  }

  function getStatus(studentId: string): AttendanceStatus {
    return records[studentId]?.status ?? 'unrecorded';
  }

  async function setStatus(student: Student, status: AttendanceStatus) {
    triggerAutoSave();
    const existing = records[student.id];
    const newRecord: AttendanceRecord = {
      id: existing?.id ?? '',
      student_id: student.id,
      group_id: groupId,
      status,
      notes: existing?.notes ?? null,
      attendance_date: date,
      recorded_at: new Date().toISOString(),
    };
    setRecords((prev) => ({ ...prev, [student.id]: newRecord }));
    await upsertAttendance(student.id, groupId, status, existing?.notes ?? null, date);
  }

  async function handleAddSession() {
    if (!newSessionTitle.trim()) return;
    const sess = await createSession(groupId, newSessionTitle.trim(), currentMonth);
    if (sess) {
      setNewSessionTitle('');
      setAddSessionOpen(false);
      await loadSessions();
      setActiveSessionId(sess.id);
    }
  }

  async function handleDeleteSession() {
    if (!deleteSessionTarget) return;
    await deleteSession(deleteSessionTarget.id);
    setDeleteSessionTarget(null);
    await loadSessions();
  }

  async function handleArchiveMonth() {
    if (!archiveMonthTarget) return;
    const archiveData = {
      sessions: sessions.map((s) => ({ id: s.id, title: s.title, month: s.month })),
      studentsData: students.map((s) => ({
        id: s.id,
        name: s.name,
        attendance: records[s.id]?.status ?? 'unrecorded',
      })),
      archivedAt: new Date().toISOString(),
    };
    await createArchive(groupId, archiveMonthTarget, archiveData);
    setArchiveMonthTarget(null);
    await loadArchives();
  }

  function getStudentStats(student: Student) {
    const studentRecords = Object.values(records).filter((r) => r.student_id === student.id);
    // Also fetch from all attendance history — for now use current records + fetched history
    return {
      present: studentRecords.filter((r) => r.status === 'present').length,
      absent: studentRecords.filter((r) => r.status === 'absent').length,
      excused: studentRecords.filter((r) => r.status === 'excused_absence').length,
      late: studentRecords.filter((r) => r.status === 'late').length,
    };
  }

  async function openStatsModal(student: Student) {
    setStatsStudent(student);
    const hist = await fetchAttendanceForStudent(student.id);
    setHistoryRecords(hist);
  }

  const unpaidStudents = students.filter((s) => (s.paid_fees ?? 0) < (s.total_fees ?? 0) && (s.total_fees ?? 0) > 0);

  const counts = {
    present: students.filter((s) => getStatus(s.id) === 'present').length,
    absent: students.filter((s) => getStatus(s.id) === 'absent' || getStatus(s.id) === 'excused_absence').length,
    unrecorded: students.filter((s) => getStatus(s.id) === 'unrecorded').length,
  };
  const rate = students.length > 0 ? Math.round((counts.present / students.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="glass-card rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white">جدول الحضور والغياب</h2>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold">
              {autoSaveStatus}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{currentMonth} — الحفظ تلقائي</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => setAddSessionOpen(true)}>
            <Plus size={14} /> حصة جديدة
          </Button>
          <button
            onClick={() => activeSessionId && setDeleteSessionTarget(sessions.find((s) => s.id === activeSessionId) ?? null)}
            className="p-2.5 glass-light hover:bg-red-500/10 hover:text-red-400 text-slate-300 rounded-xl transition"
            title="حذف الحصة الحالية"
            disabled={!activeSessionId}
          >
            <Trash2 size={15} />
          </button>

          {/* Session selector */}
          {sessions.length > 0 && (
            <div className="relative">
              <select
                value={activeSessionId}
                onChange={(e) => setActiveSessionId(e.target.value)}
                className="glass-light border border-white/10 text-emerald-400 text-xs font-bold px-4 py-2.5 rounded-xl appearance-none pr-9 pl-8 focus:outline-none cursor-pointer"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
              <Clock size={14} className="text-emerald-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          )}

          {/* Month selector */}
          <div className="relative">
            <select
              value={currentMonth}
              onChange={(e) => { setCurrentMonth(e.target.value); setActiveSessionId(''); }}
              className="glass-light border border-white/10 text-emerald-400 text-xs font-bold px-4 py-2.5 rounded-xl appearance-none pr-9 pl-8 focus:outline-none cursor-pointer"
            >
              {generateMonthOptions().map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <Calendar size={14} className="text-emerald-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          <Button size="sm" variant="warning" onClick={() => setArchiveMonthTarget(currentMonth)}>
            <Archive size={14} /> أرشفة الشهر
          </Button>

          {/* Export / Print actions */}
          {students.length > 0 && (
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  exportToCSV(
                    `الحضور_${groupName ?? 'المجموعة'}_${date}`,
                    ['#', 'اسم الطالب', 'الحالة', 'الوقت', 'ملاحظات'],
                    students.map((s, i) => [
                      i + 1,
                      s.name,
                      STATUS_META[getStatus(s.id)]?.label ?? 'غير مسجل',
                      records[s.id]?.recorded_at ? formatTime(records[s.id].recorded_at) : '-',
                      records[s.id]?.notes?.replace(/^session:[^|]+\|/, '') ?? '-',
                    ])
                  );
                }}
                className="p-2.5 glass-light hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-300 rounded-xl transition"
                title="تصدير Excel"
              >
                <Download size={15} />
              </button>
              <button
                onClick={() => {
                  const rows = students.map((s) => ({
                    name: s.name,
                    status: STATUS_META[getStatus(s.id)]?.label ?? 'غير مسجل',
                    time: records[s.id]?.recorded_at ? formatTime(records[s.id].recorded_at) : '-',
                    notes: records[s.id]?.notes?.replace(/^session:[^|]+\|/, '') ?? '-',
                  }));
                  printDocument(
                    `سجل الحضور - ${groupName ?? ''}`,
                    buildAttendancePrintHTML(groupName ?? '', stageName ?? '', gradeName ?? '', formatArabicDate(date), students.map((s) => ({ name: s.name })), false)
                  );
                }}
                className="p-2.5 glass-light hover:bg-blue-500/10 hover:text-blue-400 text-slate-300 rounded-xl transition"
                title="طباعة / PDF"
              >
                <Printer size={15} />
              </button>
              <button
                onClick={async () => {
                  const monthLabel = `${ARABIC_MONTHS[new Date(date).getMonth()]} ${new Date(date).getFullYear()}`;
                  const recordsByStudent: Record<string, { date: string; status: string }[]> = {};
                  for (const s of students) {
                    const hist = await fetchAttendanceForStudent(s.id);
                    const monthRecords = hist
                      .filter((r) => r.attendance_date.startsWith(date.slice(0, 7)))
                      .map((r) => ({ date: r.attendance_date, status: r.status }));
                    if (monthRecords.length > 0) recordsByStudent[s.id] = monthRecords;
                  }
                  const html = buildMonthlyAttendanceHTML(
                    groupName ?? '',
                    stageName ?? '',
                    gradeName ?? '',
                    monthLabel,
                    students.map((s) => ({ id: s.id, name: s.name })),
                    recordsByStudent
                  );
                  await exportTableAsImage(`تقرير_الحضور_${groupName ?? 'group'}_${date.slice(0, 7)}`, `تقرير الحضور الشهري — ${groupName ?? ''}`, html);
                }}
                className="p-2.5 glass-light hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-300 rounded-xl transition"
                title="تصدير كصورة (PNG)"
              >
                <Image size={15} />
              </button>
              <button
                onClick={() => {
                  printDocument(
                    `كشف حضور فارغ - ${groupName ?? ''}`,
                    buildAttendancePrintHTML(groupName ?? '', stageName ?? '', gradeName ?? '', formatArabicDate(date), students.map((s) => ({ name: s.name })), true)
                  );
                }}
                className="p-2.5 glass-light hover:bg-amber-500/10 hover:text-amber-400 text-slate-300 rounded-xl transition"
                title="طباعة كشف حضور فارغ"
              >
                <FileText size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="إجمالي طلاب المجموعة" value={students.length} icon={<Users size={20} />} color="slate" />
        <StatCard label="الطلاب المسددين" value={groupStats.fullyPaid} icon={<DollarSign size={20} />} color="emerald" />
        <button
          onClick={() => setUnpaidOpen(true)}
          className="glass-card rounded-2xl p-5 flex items-center justify-between shadow-xl text-right hover:bg-red-500/5 transition group cursor-pointer border border-red-500/20"
        >
          <div>
            <p className="text-xs text-slate-400 group-hover:text-red-300">المتبقي (لم يدفعوا)</p>
            <h3 className="text-2xl font-black text-red-400 mt-1">{unpaidStudents.length} طالب</h3>
            <span className="text-[10px] text-red-400/80 underline">اضغط لعرض القائمة</span>
          </div>
          <div className="p-3.5 bg-red-500/10 text-red-400 rounded-2xl">
            <AlertTriangle size={22} />
          </div>
        </button>
      </div>

      {/* Attendance stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="إجمالي الطلاب" value={students.length} icon={<Users size={18} />} color="slate" />
        <StatCard label="الحاضرون" value={counts.present} icon={<CheckCircle2 size={18} />} color="emerald" />
        <StatCard label="الغائبون" value={counts.absent} icon={<XCircle size={18} />} color="red" />
        <StatCard label="نسبة الحضور" value={`${rate}%`} icon={<Clock3 size={18} />} color="blue" />
      </div>

      {/* Date display */}
      <div className="glass-light rounded-xl px-4 py-2 text-center text-sm text-slate-300">
        {formatArabicDate(date)}
      </div>

      {/* Student cards with smart warnings */}
      {students.length === 0 ? (
        <div className="glass-light rounded-xl p-8 text-center text-slate-400">
          لا يوجد طلاب في هذه المجموعة.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 px-1">
            <span>تسجيل الحضور ({sessions.find((s) => s.id === activeSessionId)?.title ?? 'الحصة الحالية'}) — {currentMonth}</span>
            <span className="hidden sm:inline">💡 اضغط على اسم الطالب لعرض سجله المفصل</span>
          </div>

          {/* Quick action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => students.forEach((s) => setStatus(s, 'present'))}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25 transition active:scale-95 min-h-[48px]"
            >
              <CheckCheck size={18} />
              تحديد الكل حاضر
            </button>
            <button
              type="button"
              onClick={() => students.forEach((s) => setStatus(s, 'absent'))}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-red-600/15 border border-red-500/30 text-red-400 hover:bg-red-600/25 transition active:scale-95 min-h-[48px]"
            >
              <XCircle size={18} />
              تحديد الكل غائب
            </button>
          </div>

          <AnimatePresence>
            {students.map((s) => {
              const status = getStatus(s.id);
              const meta = STATUS_META[status];
              const record = records[s.id];
              const isUnpaid = (s.paid_fees ?? 0) < (s.total_fees ?? 0) && (s.total_fees ?? 0) > 0;
              const isFullyPaid = (s.paid_fees ?? 0) >= (s.total_fees ?? 0) && (s.total_fees ?? 0) > 0;
              const stats = getStudentStats(s);
              const isFrequentAbsent = stats.absent >= 2;
              const hasWarning = isUnpaid || isFrequentAbsent;
              const cardBorder = isUnpaid
                ? 'border-red-500/40 ring-1 ring-red-500/20'
                : isFullyPaid
                  ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
                  : 'border-white/10';

              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`glass-card rounded-xl p-4 border ${cardBorder}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Student info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${meta.dot} flex-shrink-0`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => openStatsModal(s)}
                            className="font-semibold text-white hover:text-emerald-400 transition text-sm"
                          >
                            {s.name}
                          </button>
                          {/* Smart auto warnings */}
                          {hasWarning && (
                            <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <AlertTriangle size={11} />
                              {isUnpaid && isFrequentAbsent
                                ? 'إنذار: لم يدفع + غياب متكرر!'
                                : isUnpaid
                                  ? 'تنبيه: لم يدفع المصروفات!'
                                  : 'تنبيه: غياب متكرر!'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          عدد مرات الغياب: {stats.absent} | الغياب بعذر: {stats.excused}
                          {s.phone && <span className="mr-2">| {s.phone}</span>}
                        </p>
                      </div>
                    </div>

                    {/* Status toggle buttons — large & touch-friendly */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
                      {STATUS_OPTIONS.map((opt) => {
                        const isActive = status === opt.status;
                        return (
                          <button
                            key={opt.status}
                            type="button"
                            onClick={() => setStatus(s, opt.status)}
                            className={`px-3 py-3 rounded-xl text-sm font-bold transition active:scale-95 min-h-[48px] ${
                              isActive ? opt.activeClass : 'glass-light text-slate-300 hover:bg-white/10 border border-white/10'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Action icons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setNotesStudent(s); setNotesValue(records[s.id]?.notes?.replace(/^session:[^|]+\|/, '') ?? ''); }}
                        className="p-2 rounded-lg glass-light hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 transition"
                        title="ملاحظات"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        onClick={() => setTimestampStudent(s)}
                        className="p-2 rounded-lg glass-light hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 transition"
                        title="وقت التسجيل"
                      >
                        <Clock3 size={14} />
                      </button>
                      <button
                        onClick={async () => { setHistoryStudent(s); const hist = await fetchAttendanceForStudent(s.id); setHistoryRecords(hist); }}
                        className="p-2 rounded-lg glass-light hover:bg-purple-500/10 text-slate-400 hover:text-purple-400 transition"
                        title="السجل التفصيلي"
                      >
                        <History size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Monthly archive section */}
      {archives.length > 0 && (
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-white flex items-center gap-2 text-sm">
            <Archive size={18} className="text-emerald-400" /> أرشيف الشهور السابقة
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {archives.map((arc) => (
              <button
                key={arc.id}
                onClick={() => setViewArchive(arc)}
                className="glass-light rounded-xl p-3 text-right hover:border-emerald-500/40 transition border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-1.5">
                    <Calendar size={14} className="text-emerald-400" /> {arc.month}
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">مؤرشف</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">يحتوي على الحصص والامتحانات وسجلات الحضور.</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Session Modal */}
      <Modal open={addSessionOpen} onClose={() => { setAddSessionOpen(false); setNewSessionTitle(''); }} title="إضافة حصة جديدة" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">عنوان الحصة</label>
            <input
              type="text"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              placeholder="مثال: حصة 3"
              autoFocus
              className={inputCls}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSession()}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setAddSessionOpen(false); setNewSessionTitle(''); }}>إلغاء</Button>
            <Button onClick={handleAddSession} disabled={!newSessionTitle.trim()}>تأكيد الإضافة</Button>
          </div>
        </div>
      </Modal>

      {/* Delete session confirmation */}
      <ConfirmDialog
        open={!!deleteSessionTarget}
        onClose={() => setDeleteSessionTarget(null)}
        onConfirm={handleDeleteSession}
        title="⚠️ حذف الحصة"
        subtext={`سيتم إخفاء الحصة «${deleteSessionTarget?.title ?? ''}» مع الاحتفاظ بسجلاتها للمراجعة.`}
        confirmLabel="تأكيد الحذف"
      />

      {/* Archive month confirmation */}
      <ConfirmDialog
        open={!!archiveMonthTarget}
        onClose={() => setArchiveMonthTarget(null)}
        onConfirm={handleArchiveMonth}
        title="أرشفة الشهر"
        subtext={`سيتم أرشفة شهر «${archiveMonthTarget ?? ''}» بكل الحصص والامتحانات ونقله لقسم الأرشيف.`}
        confirmLabel="تأكيد الأرشفة"
        variant="primary"
      />

      {/* Unpaid students modal */}
      <Modal open={unpaidOpen} onClose={() => setUnpaidOpen(false)} title="الطلاب المتبقين (لم يدفعوا)" size="md">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {unpaidStudents.length === 0 ? (
            <p className="text-emerald-400 text-center py-6 glass-light rounded-xl">رائع! جميع الطلاب قاموا بدفع المصروفات.</p>
          ) : (
            unpaidStudents.map((s) => (
              <div key={s.id} className="glass-light rounded-xl p-3 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm">{s.name}</span>
                  <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-bold">
                    متبقي {(s.total_fees ?? 0) - (s.paid_fees ?? 0)} ج.م
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  {stageName && <span>{stageName}</span>}
                  {gradeName && <><span>/</span><span>{gradeName}</span></>}
                  {groupName && <><span>/</span><span className="text-emerald-400">{groupName}</span></>}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Per-student stats modal */}
      <Modal open={!!statsStudent} onClose={() => setStatsStudent(null)} title={`السجل التفصيلي: ${statsStudent?.name ?? ''}`}>
        {statsStudent && (
          <div className="space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="حضر" value={historyRecords.filter((r) => r.status === 'present').length} color="text-emerald-400" />
              <StatBox label="غاب" value={historyRecords.filter((r) => r.status === 'absent').length} color="text-red-400" />
              <StatBox label="غاب بعذر" value={historyRecords.filter((r) => r.status === 'excused_absence').length} color="text-amber-400" />
              <StatBox label="تأخير" value={historyRecords.filter((r) => r.status === 'late').length} color="text-purple-400" />
            </div>

            {/* History list */}
            <h4 className="font-bold text-xs text-slate-300 pt-2">سجل الحضور التاريخي:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {historyRecords.length === 0 ? (
                <p className="text-center text-slate-400 py-4 text-sm">لا يوجد سجل بعد.</p>
              ) : (
                historyRecords.map((r) => {
                  const meta = STATUS_META[r.status];
                  return (
                    <div key={r.id} className="glass-light rounded-xl p-3 flex justify-between items-center">
                      <span className="text-sm text-slate-300">{formatArabicDate(r.attendance_date)}</span>
                      <span className={`text-xs font-bold ${meta.color} flex items-center gap-1`}>
                        {meta.emoji} {meta.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Notes modal */}
      <Modal open={!!notesStudent} onClose={() => setNotesStudent(null)} title={`ملاحظات: ${notesStudent?.name ?? ''}`} size="sm">
        <textarea
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          rows={4}
          placeholder="أضف ملاحظة..."
          className="w-full glass-light rounded-xl py-3 px-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition resize-none"
        />
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="secondary" onClick={() => setNotesStudent(null)}>إلغاء</Button>
          <Button onClick={() => { if (notesStudent) { upsertAttendance(notesStudent.id, groupId, getStatus(notesStudent.id), notesValue, date); } setNotesStudent(null); }}>حفظ</Button>
        </div>
      </Modal>

      {/* Timestamp modal */}
      <Modal open={!!timestampStudent} onClose={() => setTimestampStudent(null)} title={`وقت التسجيل: ${timestampStudent?.name ?? ''}`} size="sm">
        {timestampStudent && records[timestampStudent.id]?.recorded_at ? (
          <div className="space-y-3 text-center">
            <div className="glass-light rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">التاريخ</p>
              <p className="text-white font-semibold">{formatArabicDate(records[timestampStudent.id].recorded_at)}</p>
            </div>
            <div className="glass-light rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">وقت التسجيل</p>
              <p className="text-emerald-300 font-mono text-lg font-bold">{formatTime(records[timestampStudent.id].recorded_at)}</p>
            </div>
            <div className="glass-light rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">الحالة</p>
              <p className="text-white font-semibold">{STATUS_META[records[timestampStudent.id].status].label} {STATUS_META[records[timestampStudent.id].status].emoji}</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-slate-400 py-6">لم يتم تسجيل حضور بعد.</p>
        )}
      </Modal>

      {/* History modal */}
      <Modal open={!!historyStudent} onClose={() => setHistoryStudent(null)} title={`سجل الحضور: ${historyStudent?.name ?? ''}`}>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {historyRecords.length === 0 ? (
            <p className="text-center text-slate-400 py-6">لا يوجد سجل حضور بعد.</p>
          ) : (
            historyRecords.map((r) => {
              const meta = STATUS_META[r.status];
              return (
                <div key={r.id} className="glass-light rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-emerald-400" />
                    <span className="text-sm text-slate-300">{formatArabicDate(r.attendance_date)}</span>
                    <span className="text-xs text-slate-500 font-mono">{formatTime(r.recorded_at)}</span>
                  </div>
                  <span className={`text-sm font-bold ${meta.color} flex items-center gap-1`}>{meta.emoji} {meta.label}</span>
                </div>
              );
            })
          )}
        </div>
      </Modal>

      {/* Archive view modal */}
      <Modal open={!!viewArchive} onClose={() => setViewArchive(null)} title={`أرشيف شهر: ${viewArchive?.month ?? ''}`}>
        {viewArchive && (
          <div className="space-y-3">
            <div className="glass-light rounded-xl p-4">
              <h4 className="font-bold text-slate-300 text-sm mb-2">الحصص المؤرشفة:</h4>
              <div className="space-y-1.5">
                {Array.isArray((viewArchive.archive_data as Record<string, unknown[]>).sessions) &&
                  ((viewArchive.archive_data as Record<string, unknown[]>).sessions as { title: string }[]).map((sess, i) => (
                    <div key={i} className="text-xs text-slate-300 flex items-center gap-2">
                      <Check size={12} className="text-emerald-400" /> {sess.title}
                    </div>
                  ))}
              </div>
            </div>
            <div className="glass-light rounded-xl p-4">
              <h4 className="font-bold text-slate-300 text-sm mb-2">بيانات الطلاب:</h4>
              <div className="space-y-1.5">
                {Array.isArray((viewArchive.archive_data as Record<string, unknown[]>).studentsData) &&
                  ((viewArchive.archive_data as Record<string, unknown[]>).studentsData as { name: string; attendance: string }[]).map((stu, i) => (
                    <div key={i} className="text-xs text-slate-300 flex justify-between">
                      <span>{stu.name}</span>
                      <span className="text-slate-500">{stu.attendance}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-light rounded-xl p-3 text-center">
      <span className="text-xs text-slate-400 block mb-1">{label}</span>
      <span className={`text-base font-bold ${color}`}>{value}</span>
    </div>
  );
}

function generateMonthOptions(): string[] {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const now = new Date();
  const options: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
  }
  return options;
}

const inputCls =
  'w-full glass-light rounded-xl py-2.5 px-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition text-sm';
