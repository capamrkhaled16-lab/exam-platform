import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, AlertTriangle, MessageCircle, Download, Printer, History, UserCog, Shield, Clock3 } from 'lucide-react';
import type { Student, Payment, AuditLog } from '@/lib/types';
import { fetchAllStudents, fetchPayments, createPayment, deletePaymentWithAudit, fetchAuditLogs } from '@/lib/data';
import { formatCurrency, formatArabicDate, formatTime } from '@/lib/format';
import { exportToCSV, printDocument, buildUnpaidPrintHTML } from '@/lib/export';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type EnrichedStudent = Student & {
  group_name?: string;
  group_schedule?: string | null;
  grade_name?: string;
  stage_name?: string;
};

const ACTION_LABELS: Record<string, string> = {
  payment_create: 'تسجيل دفعة',
  payment_delete: 'حذف دفعة',
  student_delete: 'حذف طالب',
  attendance_delete: 'حذف سجل حضور',
};

export default function FinancesModule() {
  const { isMaster, assistant } = useAuth();
  const [students, setStudents] = useState<EnrichedStudent[]>([]);
  const [payStudent, setPayStudent] = useState<Student | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<Payment | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [unpaidOpen, setUnpaidOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<(AuditLog & { student?: { name: string } })[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);

  const actorName = isMaster ? 'المدرس' : assistant?.display_name ?? assistant?.username ?? 'مساعد';

  const load = useCallback(async () => {
    const all = await fetchAllStudents();
    setStudents(all);
  }, []);

  useEffect(() => { load(); }, [load]);

  const fullyPaid = students.filter((s) => (s.paid_fees ?? 0) >= (s.total_fees ?? 0)).length;
  const unpaidStudents = students.filter((s) => (s.paid_fees ?? 0) < (s.total_fees ?? 0) && (s.total_fees ?? 0) > 0);

  async function loadPayments(student: Student) {
    const data = await fetchPayments(student.id);
    setPayments(data);
  }

  async function handleAddPayment() {
    if (!payStudent || !payAmount) return;
    const amount = parseFloat(payAmount);
    if (amount <= 0) return;
    await createPayment(payStudent.id, amount, payNote.trim() || null, actorName);
    setPayAmount(''); setPayNote(''); setPayStudent(null);
    await load();
    if (historyStudent) await loadPayments(historyStudent);
  }

  async function handleQuickFullPay(student: Student) {
    const remaining = (student.total_fees ?? 0) - (student.paid_fees ?? 0);
    if (remaining <= 0) return;
    await createPayment(student.id, remaining, 'دفع كامل', actorName);
    await load();
    if (historyStudent) await loadPayments(historyStudent);
  }

  async function handleDeletePayment() {
    if (!deletePaymentTarget) return;
    await deletePaymentWithAudit(deletePaymentTarget.id, actorName, isMaster ? 'master' : 'assistant');
    setDeletePaymentTarget(null);
    await load();
    if (historyStudent) await loadPayments(historyStudent);
  }

  async function openAuditLogs() {
    const logs = await fetchAuditLogs(100);
    setAuditLogs(logs);
    setAuditOpen(true);
  }

  function sendWhatsAppReminder(s: EnrichedStudent) {
    const remaining = (s.total_fees ?? 0) - (s.paid_fees ?? 0);
    const phone = (s.parent_phone || s.phone || '').replace(/[^\d]/g, '');
    const message =
      `السلام عليكم ورحمة الله،\n` +
      `تذكير ودّي بخصوص مصروفات الطالب: ${s.name}\n` +
      (s.grade_name ? `المرحلة: ${s.stage_name ?? ''} - ${s.grade_name}\n` : '') +
      (s.group_name ? `المجموعة: ${s.group_name}\n` : '') +
      (s.group_schedule ? `الموعد: ${s.group_schedule}\n` : '') +
      `المبلغ المتبقي: ${formatCurrency(remaining)} ج.م\n` +
      `برجاء السداد في أقرب وقت. جزاكم الله خيراً.`;
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-red-500/20">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-red-500/10 text-red-400 rounded-2xl"><AlertTriangle size={24} /></div>
          <div>
            <h2 className="text-lg font-bold text-white">المبالغ الإجمالية الغير مدفوعة</h2>
            <p className="text-xs text-slate-400 mt-0.5">عدد الطلاب غير المسددين: <span className="font-bold text-red-400">{unpaidStudents.length} طالب</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          {isMaster && <Button variant="secondary" size="sm" onClick={openAuditLogs}><Shield size={16} /> سجل العمليات</Button>}
          <Button variant="warning" onClick={() => setUnpaidOpen(true)} disabled={unpaidStudents.length === 0}>عرض القائمة الكاملة</Button>
        </div>
      </motion.div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">سجل الاشتراكات والمدفوعات</h2>
            <p className="text-xs text-slate-400">تتبع دقيق للمدفوعات والمبالغ المتبقية لكل طالب.</p>
          </div>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5"><CheckCircle2 size={14} /> مسدد كامل: {fullyPaid} طالب</span>
        </div>

        {students.length === 0 ? (
          <div className="glass-light rounded-xl p-8 text-center text-slate-400">لا يوجد طلاب مسجلون.</div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {students.map((s) => {
                const remaining = (s.total_fees ?? 0) - (s.paid_fees ?? 0);
                const isFull = remaining <= 0;
                const pct = s.total_fees > 0 ? Math.min(100, Math.round(((s.paid_fees ?? 0) / s.total_fees) * 100)) : 0;
                return (
                  <motion.div key={s.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`glass-light rounded-xl p-4 border ${isFull ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-red-500/40 ring-1 ring-red-500/20'}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{s.name}</h4>
                          {isFull ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} /> مسدد</span> : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full"><AlertTriangle size={10} /> متبقي</span>}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          المصاريف: {formatCurrency(s.total_fees ?? 0)} ج.م • المدفوع:{' '}
                          <button onClick={() => { setHistoryStudent(s); loadPayments(s); }} className="text-emerald-400 font-bold hover:underline cursor-pointer" title="عرض تفاصيل الحركات">{formatCurrency(s.paid_fees ?? 0)} ج.م</button>
                          {' • '}<span className={isFull ? 'text-emerald-400' : 'text-amber-400'}>{isFull ? 'دفع كامل' : `متبقي ${formatCurrency(remaining)} ج.م`}</span>
                        </p>
                        <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isFull ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="secondary" onClick={() => { setHistoryStudent(s); loadPayments(s); }}><History size={14} /> السجل</Button>
                        {!isFull && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => handleQuickFullPay(s)} title="تسجيل دفع كامل للمبلغ المتبقي"><CheckCircle2 size={14} /> دفع كامل</Button>
                            <Button size="sm" onClick={() => setPayStudent(s)}><Plus size={14} /> دفعة جزئية</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Modal open={unpaidOpen} onClose={() => setUnpaidOpen(false)} title="المبالغ الإجمالية الغير مدفوعة" size="md">
        <div className="space-y-4">
          <div className="glass-light rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">إجمالي الطلاب غير المسددين</p>
            <p className="text-3xl font-black text-red-400 mt-1">{unpaidStudents.length} طالب</p>
          </div>
          {unpaidStudents.length > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => exportToCSV('الطلاب_غير_المسددين', ['#', 'اسم الطالب', 'المجموعة', 'الموعد', 'المرحلة', 'المتبقي (ج.م)'], unpaidStudents.map((s, i) => [i + 1, s.name, s.group_name ?? '-', s.group_schedule ?? '-', `${s.stage_name ?? ''} ${s.grade_name ?? ''}`.trim(), (s.total_fees ?? 0) - (s.paid_fees ?? 0)]))}><Download size={14} /> تصدير Excel</Button>
              <Button size="sm" variant="secondary" onClick={() => printDocument('كشف الطلاب غير المسددين', buildUnpaidPrintHTML(unpaidStudents))}><Printer size={14} /> طباعة / PDF</Button>
            </div>
          )}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {unpaidStudents.length === 0 ? (
              <p className="text-emerald-400 text-center py-6 glass-light rounded-xl">رائع! جميع الطلاب قاموا بدفع المصروفات.</p>
            ) : (
              unpaidStudents.map((s) => {
                const remaining = (s.total_fees ?? 0) - (s.paid_fees ?? 0);
                return (
                  <div key={s.id} className="glass-light rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-white text-sm block">{s.name}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 flex-wrap">
                          {s.group_name && <span className="bg-white/5 px-2 py-0.5 rounded">المجموعة: {s.group_name}</span>}
                          {s.group_schedule && <span className="bg-white/5 px-2 py-0.5 rounded">الموعد: {s.group_schedule}</span>}
                          {s.grade_name && <span className="bg-white/5 px-2 py-0.5 rounded">{s.stage_name ? `${s.stage_name} - ` : ''}{s.grade_name}</span>}
                        </div>
                      </div>
                      <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap">متبقي {formatCurrency(remaining)} ج.م</span>
                    </div>
                    <button type="button" onClick={() => sendWhatsAppReminder(s)} className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-bold bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25 transition active:scale-95 min-h-[44px]"><MessageCircle size={16} /> إرسال تذكير واتساب</button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      <Modal open={!!payStudent} onClose={() => { setPayStudent(null); setPayAmount(''); setPayNote(''); }} title={`تسجيل دفعة جزئية: ${payStudent?.name ?? ''}`} size="sm">
        <div className="space-y-4">
          <div className="glass-light rounded-xl p-3 text-center text-sm text-slate-300">المتبقي:{' '}<span className="font-bold text-amber-400">{payStudent ? formatCurrency((payStudent.total_fees ?? 0) - (payStudent.paid_fees ?? 0)) : 0} ج.م</span></div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">المبلغ المدفوع (ج.م)</label>
            <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" autoFocus className={inputCls} />
            {payStudent && payAmount && parseFloat(payAmount) > 0 && (
              <p className="text-xs mt-2 text-amber-400">سيتم تصنيف الطالب كـ: {parseFloat(payAmount) >= ((payStudent.total_fees ?? 0) - (payStudent.paid_fees ?? 0)) ? 'دفع كامل' : 'دفع جزئي / متبقي'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">ملاحظة (اختياري)</label>
            <input type="text" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="مثال: دفعة شهر أكتوبر" className={inputCls} />
          </div>
          <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => { setPayStudent(null); setPayAmount(''); setPayNote(''); }}>إلغاء</Button><Button onClick={handleAddPayment} disabled={!payAmount || parseFloat(payAmount) <= 0}>تسجيل الدفعة</Button></div>
        </div>
      </Modal>

      <Modal open={!!historyStudent} onClose={() => setHistoryStudent(null)} title={`سجل المدفوعات التفصيلي: ${historyStudent?.name ?? ''}`}>
        {payments.length === 0 ? (
          <p className="text-center text-slate-400 py-6">لا توجد دفعات مسجلة.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {payments.map((p) => (
                <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-light rounded-xl p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-emerald-400">{formatCurrency(p.amount)} ج.م</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatArabicDate(p.payment_date)}</p>
                    {p.recorded_at && <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1"><Clock3 size={10} /> {formatTime(p.recorded_at)}</p>}
                    {p.recorded_by && <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1"><UserCog size={10} /> سجّلها: {p.recorded_by}</p>}
                    {p.note && <p className="text-xs text-slate-500 mt-1">{p.note}</p>}
                  </div>
                  <button onClick={() => setDeletePaymentTarget(p)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition flex-shrink-0" title="حذف هذه الحركة"><Trash2 size={14} /></button>
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="glass-light rounded-xl p-3 text-center border-t border-white/10 mt-2">
              <p className="text-xs text-slate-400">الإجمالي المحصل لهذا الطالب</p>
              <p className="text-lg font-black text-emerald-400">{formatCurrency(payments.reduce((sum, p) => sum + (p.amount ?? 0), 0))} ج.م</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={auditOpen} onClose={() => setAuditOpen(false)} title="سجل العمليات الخفي (للمسؤول فقط)" size="md">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <p className="text-center text-slate-400 py-6">لا توجد عمليات مسجلة.</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="glass-light rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{ACTION_LABELS[log.action_type] ?? log.action_type}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.actor_role === 'master' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{log.actor_role === 'master' ? 'المدرس' : 'مساعد'}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                  <p>المستخدم: {log.actor_name}</p>
                  {log.student?.name && <p>الطالب: {log.student.name}</p>}
                  {log.amount != null && <p>المبلغ: {formatCurrency(log.amount)} ج.م</p>}
                  <p className="text-slate-500">{formatArabicDate(log.created_at)} — {formatTime(log.created_at)}</p>
                  {log.note && <p className="text-slate-500">{log.note}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <ConfirmDialog open={!!deletePaymentTarget} onClose={() => setDeletePaymentTarget(null)} onConfirm={handleDeletePayment} title="⚠️ حذف الدفعة" subtext="سيتم حذف هذه الدفعة وخصم المبلغ من المدفوعات تلقائياً، وسيتم تسجيل العملية في السجل الخفي." confirmLabel="تأكيد الحذف" />
    </div>
  );
}

const inputCls = 'w-full glass-light rounded-xl py-2.5 px-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition text-sm';
