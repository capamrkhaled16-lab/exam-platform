import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Copy, Send, Phone, Link as LinkIcon, Check } from 'lucide-react';
import type { Student } from '@/lib/types';
import { fetchAllStudents, fetchStudentsByGroup } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import WhatsAppReport from '@/components/modules/WhatsAppReport';

type ParentLinksModuleProps = {
  groupId?: string | null;
};

export default function ParentLinksModule({ groupId }: ParentLinksModuleProps) {
  const [students, setStudents] = useState<(Student & { group_name?: string; grade_name?: string; stage_name?: string })[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [whatsappTarget, setWhatsappTarget] = useState<Student | null>(null);

  const load = useCallback(async () => {
    if (groupId) {
      const { data: enriched } = await supabase
        .from('students')
        .select('*, group:groups(name, grade_level:grade_levels(name, stage:academic_stages(name)))')
        .eq('group_id', groupId)
        .eq('is_deleted', false)
        .order('name');
      if (enriched) {
        const mapped = (enriched as (Student & { group: { name: string; grade_level: { name: string; stage: { name: string } } } | null })[]).map((s) => ({
          ...s,
          group_name: s.group?.name,
          grade_name: s.group?.grade_level?.name,
          stage_name: s.group?.grade_level?.stage?.name,
        }));
        setStudents(mapped);
      } else {
        const data = await fetchStudentsByGroup(groupId);
        setStudents(data);
      }
    } else {
      const data = await fetchAllStudents();
      setStudents(data);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  function getPortalLink(student: Student): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/parent-portal?token=${student.parent_token}`;
  }

  async function copyLink(student: Student) {
    try {
      await navigator.clipboard.writeText(getPortalLink(student));
      setCopiedId(student.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = getPortalLink(student);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(student.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function sendWhatsApp(student: Student) {
    const phone = student.parent_phone ?? student.phone;
    if (!phone) {
      alert('لا يوجد رقم هاتف لهذا الطالب');
      return;
    }
    const cleanPhone = phone.replace(/^0/, '20').replace(/\D/g, '');
    const link = getPortalLink(student);
    const remaining = (student.total_fees ?? 0) - (student.paid_fees ?? 0);
    const isFull = remaining <= 0;

    const message = `مرحباً ولي أمر الطالب/ـة ${student.name}\n\n` +
      `📊 تقرير المتابعة من منصة الخالد التعليمية\n` +
      `تحت إدارة ومتابعة مستر عمرو خالد\n\n` +
      `💰 الحالة المالية: ${isFull ? 'دفع كامل ✅' : `متبقي ${formatCurrency(remaining)} ج.م ⚠️`}\n\n` +
      `🔗 بوابة ولي الأمر لمتابعة الحضور والدرجات:\n${link}\n\n` +
      `شكراً لثقتكم في منصة الخالد التعليمية 🌟`;

    const text = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white">بوابة ولي الأمر وروابط التقارير</h2>
          <p className="text-xs text-slate-400 mt-1">
            لكل طالب رابط خاص يعرض ولي الأمر الحضور والدرجات والحالة المالية. انسخ الرابط أو أرسله عبر واتساب مباشرة.
          </p>
        </div>

        {students.length === 0 ? (
          <div className="glass-light rounded-xl p-8 text-center text-slate-400">
            لا يوجد طلاب مسجلون.
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((s) => {
              const remaining = (s.total_fees ?? 0) - (s.paid_fees ?? 0);
              const isFull = remaining <= 0;
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-light rounded-xl p-4"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm">{s.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ولي الأمر: {s.parent_phone ?? s.phone ?? '—'} • الحالة المالية:{' '}
                        <span className={isFull ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {isFull ? 'دفع كامل ✅' : `متبقي ${formatCurrency(remaining)} ج.م ⚠️`}
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500">
                        <LinkIcon size={11} />
                        <span className="font-mono truncate max-w-xs">
                          {getPortalLink(s)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyLink(s)}
                        className="px-3 py-2 glass-light hover:bg-white/10 text-slate-200 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5"
                      >
                        {copiedId === s.id ? (
                          <><Check size={14} className="text-emerald-400" /> تم النسخ</>
                        ) : (
                          <><Copy size={14} /> نسخ الرابط</>
                        )}
                      </button>
                      <button
                        onClick={() => sendWhatsApp(s)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Send size={14} />
                        <span className="hidden sm:inline">إرسال واتساب</span>
                      </button>
                      <button
                        onClick={() => setWhatsappTarget(s)}
                        className="px-3 py-2 glass-light hover:bg-green-500/10 text-slate-300 hover:text-green-400 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5"
                      >
                        <Phone size={14} />
                        <span className="hidden sm:inline">تقرير</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <WhatsAppReport
        student={whatsappTarget ?? ({} as Student)}
        open={!!whatsappTarget}
        onClose={() => setWhatsappTarget(null)}
      />
    </div>
  );
}
