import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Plus, Pencil, Trash2, Phone, UserCircle, MessageCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Student, Gender } from '@/lib/types';
import { createStudent, updateStudent, deleteStudent } from '@/lib/data';
import WhatsAppReport from '@/components/modules/WhatsAppReport';

type StudentManagerProps = {
  groupId: string;
  students: Student[];
  onRefresh: () => void;
};

export default function StudentManager({
  groupId,
  students,
  onRefresh,
}: StudentManagerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [whatsappTarget, setWhatsappTarget] = useState<Student | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    parent_phone: '',
    gender: 'male' as Gender,
    total_fees: '0',
  });

  function resetForm() {
    setForm({
      name: '',
      phone: '',
      parent_phone: '',
      gender: 'male',
      total_fees: '0',
    });
  }

  function openEdit(s: Student) {
    setEditTarget(s);
    setForm({
      name: s.name,
      phone: s.phone ?? '',
      parent_phone: s.parent_phone ?? '',
      gender: s.gender,
      total_fees: String(s.total_fees ?? 0),
    });
  }

  async function handleAdd() {
    if (!form.name.trim()) return;
    await createStudent({
      group_id: groupId,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      parent_phone: form.parent_phone.trim() || null,
      gender: form.gender,
      total_fees: parseFloat(form.total_fees) || 0,
      paid_fees: 0,
    });
    resetForm();
    setAddOpen(false);
    onRefresh();
  }

  async function handleEdit() {
    if (!editTarget) return;
    await updateStudent(editTarget.id, {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      parent_phone: form.parent_phone.trim() || null,
      gender: form.gender,
      total_fees: parseFloat(form.total_fees) || 0,
    });
    setEditTarget(null);
    resetForm();
    onRefresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteStudent(deleteTarget.id);
    setDeleteTarget(null);
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">قائمة الطلاب</h3>
        <Button size="sm" onClick={() => { resetForm(); setAddOpen(true); }}>
          <Plus size={16} />
          إضافة طالب
        </Button>
      </div>

      {students.length === 0 ? (
        <div className="glass-light rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">لا يوجد طلاب في هذه المجموعة بعد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {students.map((s) => {
              const isFullyPaid = (s.paid_fees ?? 0) >= (s.total_fees ?? 0) && (s.total_fees ?? 0) > 0;
              const hasDue = (s.paid_fees ?? 0) < (s.total_fees ?? 0) && (s.total_fees ?? 0) > 0;
              const statusColor = isFullyPaid
                ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
                : hasDue
                  ? 'border-red-500/40 ring-1 ring-red-500/20'
                  : 'border-white/10';
              return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`glass-card rounded-xl p-4 hover:ring-1 hover:ring-emerald-500/30 transition border ${statusColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${s.gender === 'male' ? 'bg-blue-500/15 text-blue-400' : 'bg-pink-500/15 text-pink-400'}`}>
                      {s.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        {s.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </p>
                      {hasDue && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> متبقي {(s.total_fees ?? 0) - (s.paid_fees ?? 0)} ج.م
                        </span>
                      )}
                      {isFullyPaid && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> مسدد كامل
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setWhatsappTarget(s)} className="p-1.5 rounded-lg hover:bg-green-500/10 text-slate-400 hover:text-green-400 transition" title="تقرير واتساب">
                      <MessageCircle size={14} />
                    </button>
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {(s.phone || s.parent_phone) && (
                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    {s.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} /> {s.phone}
                      </div>
                    )}
                    {s.parent_phone && (
                      <div className="flex items-center gap-1.5">
                        <UserCircle size={12} /> ولي الأمر: {s.parent_phone}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={addOpen || !!editTarget}
        onClose={() => { setAddOpen(false); setEditTarget(null); resetForm(); }}
        title={editTarget ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
      >
        <div className="space-y-4">
          <Field label="اسم الطالب">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="الاسم الكامل" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="النوع">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gender: 'male' })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                    form.gender === 'male'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'glass-light text-slate-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  ذكر
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, gender: 'female' })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                    form.gender === 'female'
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/30'
                      : 'glass-light text-slate-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  أنثى
                </button>
              </div>
            </Field>
            <Field label="المصاريف الكلية (ج.م)">
              <input type="number" value={form.total_fees} onChange={(e) => setForm({ ...form, total_fees: e.target.value })} className={inputClass} />
            </Field>
          </div>
          <Field label="هاتف الطالب">
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="01xxxxxxxxx" />
          </Field>
          <Field label="هاتف ولي الأمر">
            <input type="tel" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} className={inputClass} placeholder="01xxxxxxxxx" />
          </Field>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setAddOpen(false); setEditTarget(null); resetForm(); }}>إلغاء</Button>
            <Button onClick={editTarget ? handleEdit : handleAdd} disabled={!form.name.trim()}>
              {editTarget ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="⚠️ حذف الطالب"
        subtext={`هل أنت متأكد من حذف الطالب «${deleteTarget?.name ?? ''}؟ سيتم إخفاء الطالب من القوائم مع الاحتفاظ بسجلاته للمراجعة.`}
        confirmLabel="تأكيد الحذف"
      />

      <WhatsAppReport
        student={whatsappTarget ?? ({} as Student)}
        open={!!whatsappTarget}
        onClose={() => setWhatsappTarget(null)}
      />
    </div>
  );
}

const inputClass =
  'w-full glass-light rounded-xl py-2.5 px-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
