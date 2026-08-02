import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Pencil,
  User,
  LogIn,
  Calendar,
  Copy,
  Power,
  XCircle,
  Check,
  Shield,
} from 'lucide-react';
import type { Assistant, AssistantPermissions } from '@/lib/types';
import {
  fetchAssistants,
  createAssistant,
  updateAssistant,
  deleteAssistant,
} from '@/lib/data';
import { formatArabicDate } from '@/lib/format';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const PERM_KEYS: { key: keyof AssistantPermissions; label: string }[] = [
  { key: 'can_manage_subscriptions', label: 'الاشتراكات' },
  { key: 'can_view_finance', label: 'النظرة المالية' },
  { key: 'can_manage_exams', label: 'الامتحانات' },
  { key: 'can_edit_grades', label: 'الدرجات' },
  { key: 'can_view_results_only', label: 'النتائج فقط' },
  { key: 'can_edit_questions', label: 'تعديل الأسئلة' },
  { key: 'can_live_monitor', label: 'المراقبة المباشرة' },
  { key: 'can_print_reports', label: 'طباعة التقارير' },
  { key: 'can_grade_essay', label: 'تصحيح المقالي' },
  { key: 'can_manage_attendance', label: 'إدارة الحضور' },
  { key: 'can_manage_students', label: 'إدارة الطلاب' },
];

type FormState = {
  display_name: string;
  username: string;
  pin: string;
  can_manage_subscriptions: boolean;
  can_view_finance: boolean;
  can_manage_exams: boolean;
  can_edit_grades: boolean;
  can_view_results_only: boolean;
  can_edit_questions: boolean;
  can_live_monitor: boolean;
  can_print_reports: boolean;
  can_grade_essay: boolean;
  can_manage_attendance: boolean;
  can_manage_students: boolean;
};

const EMPTY_FORM: FormState = {
  display_name: '',
  username: '',
  pin: '',
  can_manage_subscriptions: false,
  can_view_finance: false,
  can_manage_exams: false,
  can_edit_grades: false,
  can_view_results_only: false,
  can_edit_questions: false,
  can_live_monitor: false,
  can_print_reports: false,
  can_grade_essay: false,
  can_manage_attendance: false,
  can_manage_students: false,
};

function assistantToForm(a: Assistant): FormState {
  return {
    display_name: a.display_name ?? '',
    username: a.username,
    pin: a.pin,
    can_manage_subscriptions: a.can_manage_subscriptions,
    can_view_finance: a.can_view_finance,
    can_manage_exams: a.can_manage_exams,
    can_edit_grades: a.can_edit_grades,
    can_view_results_only: a.can_view_results_only,
    can_edit_questions: a.can_edit_questions,
    can_live_monitor: a.can_live_monitor,
    can_print_reports: a.can_print_reports,
    can_grade_essay: a.can_grade_essay,
    can_manage_attendance: a.can_manage_attendance,
    can_manage_students: a.can_manage_students,
  };
}

export default function AssistantsManager() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Assistant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assistant | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Assistant | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    const data = await fetchAssistants();
    setAssistants(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(a: Assistant) {
    setEditTarget(a);
    setForm(assistantToForm(a));
  }

  async function handleSave() {
    if (!form.username.trim() || !form.pin.trim()) return;
    if (editTarget) {
      await updateAssistant(editTarget.id, { ...form, display_name: form.display_name.trim() || null, username: form.username.trim(), pin: form.pin.trim() });
    } else {
      await createAssistant({ ...form, display_name: form.display_name.trim() || null, username: form.username.trim(), pin: form.pin.trim() });
    }
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setAddOpen(false);
    await load();
  }

  async function toggleActive(a: Assistant) {
    await updateAssistant(a.id, { is_active: !a.is_active });
    await load();
  }

  function copyLoginLink(a: Assistant) {
    const link = `${window.location.origin}/assistant/login`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="text-emerald-400" size={20} /> إدارة المساعدين والصلاحيات
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              أضف مساعدين، حدد صلاحياتهم، وتتبع دخولهم — جلسات دائمة بلا انتهاء.
            </p>
          </div>
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setAddOpen(true); }}>
            <Plus size={16} /> إضافة مساعد
          </Button>
        </div>

        {assistants.length === 0 ? (
          <div className="glass-light rounded-xl p-8 text-center text-slate-400">
            لا يوجد مساعدون بعد. أضف مساعدًا جديدًا لمنح صلاحيات محددة.
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {assistants.map((ast) => {
                const activePerms = PERM_KEYS.filter((p) => ast[p.key]);
                return (
                  <motion.div
                    key={ast.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass-light rounded-2xl p-5 space-y-4"
                  >
                    {/* Header row */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${ast.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                          {(ast.display_name ?? ast.username).charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{ast.display_name ?? ast.username}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${ast.is_active ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                              {ast.is_active ? 'نشط' : 'معطّل'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span>{ast.username}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <LogIn size={11} /> {ast.pin}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                            <span>مرات الدخول: <strong className="text-white">{ast.logins_count ?? 0}</strong></span>
                            {ast.last_login_at && (
                              <span className="flex items-center gap-1">
                                <Calendar size={11} /> {formatArabicDate(ast.last_login_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => copyLoginLink(ast)}
                          className="p-2.5 glass-light hover:bg-white/10 rounded-xl text-slate-300 transition"
                          title="نسخ رابط الدخول"
                        >
                          {copiedId === ast.id ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                        </button>
                        <button
                          onClick={() => openEdit(ast)}
                          className="px-3 py-2 glass-light hover:bg-white/10 rounded-xl text-slate-300 text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Pencil size={13} /> تعديل
                        </button>
                        <button
                          onClick={() => setToggleTarget(ast)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                            ast.is_active
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          <Power size={13} /> {ast.is_active ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(ast)}
                          className="px-3 py-2 bg-red-600/10 border border-red-500/20 rounded-xl hover:bg-red-600/20 text-red-400 text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Trash2 size={13} /> حذف
                        </button>
                      </div>
                    </div>

                    {/* Login link bar */}
                    <div className="glass-light rounded-xl px-4 py-2.5 flex justify-between items-center text-[11px]">
                      <span className="text-emerald-400 truncate font-mono">
                        {window.location.origin}/assistant/login
                      </span>
                      <span className="text-slate-500 shrink-0">رابط دخول المساعد</span>
                    </div>

                    {/* Permission badges */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                      {activePerms.length === 0 ? (
                        <span className="text-[11px] text-slate-500">لا توجد صلاحيات مفعّلة</span>
                      ) : (
                        activePerms.map((p) => (
                          <span
                            key={p.key}
                            className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[11px] font-bold"
                          >
                            ✓ {p.label}
                          </span>
                        ))
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={addOpen || !!editTarget}
        onClose={() => { setAddOpen(false); setEditTarget(null); setForm(EMPTY_FORM); }}
        title={editTarget ? 'تعديل المساعد' : 'إضافة مساعد جديد'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">الاسم المعروض</label>
            <input type="text" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="مثال: محمد إبراهيم" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">اسم المستخدم</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">الرقم السري (PIN)</label>
              <input type="text" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} placeholder="••••" inputMode="numeric" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">الصلاحيات</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PERM_KEYS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setForm({ ...form, [p.key]: !form[p.key] })}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                    form[p.key]
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : 'glass-light border border-white/10 text-slate-400'
                  }`}
                >
                  {p.label}
                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${form[p.key] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600'}`}>
                    {form[p.key] ? '✓' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setAddOpen(false); setEditTarget(null); setForm(EMPTY_FORM); }}>إلغاء</Button>
            <Button onClick={handleSave} disabled={!form.username.trim() || !form.pin.trim()}>
              {editTarget ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) { await deleteAssistant(deleteTarget.id); setDeleteTarget(null); await load(); } }}
        title="⚠️ حذف المساعد"
        subtext={`سيتم حذف المساعد «${deleteTarget?.display_name ?? deleteTarget?.username ?? ''}» نهائيًا.`}
        confirmLabel="تأكيد الحذف"
      />

      {/* Toggle active confirmation */}
      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => { if (toggleTarget) toggleActive(toggleTarget); }}
        title={toggleTarget?.is_active ? 'تعطيل المساعد' : 'تفعيل المساعد'}
        subtext={toggleTarget?.is_active
          ? `سيتم تعطيل وصول المساعد «${toggleTarget?.display_name ?? toggleTarget?.username}» — لن يتمكن من تسجيل الدخول.`
          : `سيتم إعادة تفعيل المساعد «${toggleTarget?.display_name ?? toggleTarget?.username}».`
        }
        confirmLabel={toggleTarget?.is_active ? 'تأكيد التعطيل' : 'تأكيد التفعيل'}
        variant={toggleTarget?.is_active ? 'danger' : 'primary'}
      />
    </div>
  );
}

const inputCls =
  'w-full glass-light rounded-xl py-2.5 px-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition text-sm';
