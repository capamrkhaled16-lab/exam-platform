import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Plus, X, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Group } from '@/lib/types';
import { createGroup, deleteGroup } from '@/lib/data';

type GroupManagerProps = {
  gradeLevelId: string;
  groups: Group[];
  selectedGroupId: string | null;
  onSelect: (group: Group) => void;
  onRefresh: () => void;
};

export default function GroupManager({
  gradeLevelId,
  groups,
  selectedGroupId,
  onSelect,
  onRefresh,
}: GroupManagerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSchedule, setNewSchedule] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    await createGroup(gradeLevelId, newName.trim(), newSchedule.trim() || null);
    setSaving(false);
    setNewName('');
    setNewSchedule('');
    setAddOpen(false);
    onRefresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteGroup(deleteTarget.id);
    setDeleteTarget(null);
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="text-emerald-400" size={20} />
          <h3 className="text-lg font-bold text-white">المجموعات</h3>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          إضافة مجموعة جديدة
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="glass-light rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">
            لا توجد مجموعات بعد. اضغط «إضافة مجموعة جديدة» لإنشاء أول مجموعة.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {groups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <button
                onClick={() => onSelect(group)}
                className={`group relative px-5 py-3 rounded-xl font-semibold transition-all ${
                  selectedGroupId === group.id
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400'
                    : 'glass-light text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {group.name}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(group);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      setDeleteTarget(group);
                    }
                  }}
                  className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition hover:bg-red-400 cursor-pointer"
                  title="حذف المجموعة"
                >
                  <X size={12} />
                </span>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Group Modal — glassmorphic */}
      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setNewName('');
          setNewSchedule('');
        }}
        title="إضافة مجموعة جديدة"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              اسم المجموعة
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثال: المجموعة أ"
              autoFocus
              className="w-full glass-light rounded-xl py-3 px-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              الموعد / الجدول (اختياري)
            </label>
            <input
              type="text"
              value={newSchedule}
              onChange={(e) => setNewSchedule(e.target.value)}
              placeholder="مثال: السبت والأربعاء 4 عصرًا"
              className="w-full glass-light rounded-xl py-3 px-4 text-white placeholder-slate-500 border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setAddOpen(false);
                setNewName('');
                setNewSchedule('');
              }}
            >
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleAdd} disabled={saving || !newName.trim()}>
              {saving ? 'جارٍ الحفظ...' : 'تأكيد الإضافة'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation — RED WARNING */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="⚠️ تحذير: حذف المجموعة"
        subtext="هل أنت متأكد من حذف هذه المجموعة؟ سيؤدي ذلك إلى فك ربط جميع بيانات الطلاب الحالية المنسوبة لهذه المجموعة."
        confirmLabel="تأكيد الحذف النهائي"
      />
    </div>
  );
}
