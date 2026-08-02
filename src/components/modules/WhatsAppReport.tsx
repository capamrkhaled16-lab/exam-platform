import { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import type { Student, AttendanceRecord, OnlineGrade, CenterGrade, CenterExam, OnlineExam } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { formatArabicDate, formatTime } from '@/lib/format';
import { STATUS_META } from '@/lib/constants';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

type WhatsAppReportProps = {
  student: Student;
  open: boolean;
  onClose: () => void;
};

export default function WhatsAppReport({ student, open, onClose }: WhatsAppReportProps) {
  const { settings } = useSettings();
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);

    // Fetch attendance
    const { data: att } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', student.id)
      .order('attendance_date', { ascending: false })
      .limit(30);
    const attendance = (att as AttendanceRecord[]) ?? [];

    // Fetch online grades with exam info
    const { data: og } = await supabase
      .from('online_grades')
      .select('*, exam:exams(*)')
      .eq('student_id', student.id);
    const onlineGrades = (og as (OnlineGrade & { exam?: OnlineExam })[]) ?? [];

    // Fetch center grades with exam info
    const { data: cg } = await supabase
      .from('center_grades')
      .select('*, exam:center_exams(*)')
      .eq('student_id', student.id);
    const centerGrades = (cg as (CenterGrade & { exam?: CenterExam })[]) ?? [];

    // Calculate stats
    const present = attendance.filter((a) => a.status === 'present').length;
    const rate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

    // Build report text
    const lines: string[] = [];
    lines.push(`*${settings.platform_name}*`);
    lines.push(`${settings.management_name}`);
    lines.push('');
    lines.push(`📊 *تقرير متابعة* — ${formatArabicDate(new Date())} ${formatTime(new Date())}`);
    lines.push('');
    lines.push(`👤 الطالب/ة: ${student.name}`);
    lines.push('');
    lines.push(`📅 *الحضور:*`);
    lines.push(`الحضور: ${present}/${attendance.length} (${rate}%)`);
    lines.push('');

    if (centerGrades.length > 0) {
      lines.push(`📝 *درجات السنتر:*`);
      for (const g of centerGrades) {
        lines.push(`• ${g.exam?.title ?? 'امتحان'}: ${g.score}/${g.exam?.max_score ?? 100}`);
      }
      lines.push('');
    }

    if (onlineGrades.length > 0) {
      lines.push(`💻 *الامتحانات الإلكترونية:*`);
      for (const g of onlineGrades) {
        lines.push(`• ${g.exam?.title ?? 'امتحان'}: ${g.score}/${g.max_score}`);
      }
      lines.push('');
    }

    // Encouraging remark
    const remarks = rate >= 80
      ? 'أداء ممتاز! واصل التفوق 🌟'
      : rate >= 60
        ? 'أداء جيد، استمر في الاجتهاد 💪'
        : 'يحتاج إلى مزيد من الالتزام بالحضور 📚';
    lines.push(`💬 ${remarks}`);
    lines.push('');
    lines.push(`${settings.management_name}`);

    setReport(lines.join('\n'));
    setLoading(false);
  }

  function sendWhatsApp() {
    const phone = student.parent_phone ?? student.phone;
    if (!phone) return;
    const cleanPhone = phone.replace(/^0/, '20').replace(/\D/g, '');
    const text = encodeURIComponent(report);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  }

  return (
    <Modal open={open} onClose={onClose} title={`تقرير واتساب: ${student.name}`}>
      <div className="space-y-4">
        {!report ? (
          <div className="text-center py-6">
            <MessageCircle className="mx-auto text-green-400 mb-4" size={48} />
            <p className="text-slate-400 mb-4">
              سيتم إنشاء تقرير شامل عن الحضور والدرجات وإرساله عبر واتساب لولي الأمر.
            </p>
            <Button onClick={generate} disabled={loading}>
              {loading ? 'جارٍ الإنشاء...' : 'إنشاء التقرير'}
            </Button>
          </div>
        ) : (
          <>
            <div className="glass-light rounded-xl p-4 max-h-60 overflow-y-auto">
              <pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans">{report}</pre>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setReport('')}>تعديل</Button>
              <Button onClick={sendWhatsApp} className="bg-green-600 hover:bg-green-500">
                <Send size={16} /> إرسال عبر واتساب
              </Button>
            </div>
            {!(student.parent_phone ?? student.phone) && (
              <p className="text-xs text-amber-400 text-center">لا يوجد رقم هاتف لهذا الطالب — لن يمكن إرسال التقرير.</p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
