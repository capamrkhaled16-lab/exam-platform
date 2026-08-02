import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Award,
  CheckCircle2,
  Clock,
  FileText,
  Calendar,
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import { formatCurrency, formatArabicDate } from '@/lib/format';
import HallOfFame from '@/components/dashboard/HallOfFame';

type HomeDashboardProps = {
  totalStudents: number;
  totalCollected: number;
  totalRemaining: number;
  fullyPaid: number;
  partialPaid: number;
  isMaster: boolean;
};

export default function HomeDashboard({
  totalStudents,
  totalCollected,
  totalRemaining,
  fullyPaid,
  partialPaid,
  isMaster,
}: HomeDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-8 relative overflow-hidden text-center"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500" />
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-600/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-amber-600/10 rounded-full blur-[80px]" />

        <div className="relative">
          <h2 className="text-2xl font-extrabold text-white mb-2">
            أهلاً بك في منصة الخالد التعليمية
          </h2>
          <p className="text-sm text-emerald-400/80 mb-6">
            تحت إدارة ومتابعة مستر عمرو خالد • لوحة التحكم الشاملة
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {isMaster ? (
              <>
                <HomeStat label="إجمالي الطلاب" value={`${totalStudents} طالب`} icon={<Users size={18} />} color="text-white" />
                <HomeStat label="دفع كامل" value={`${fullyPaid} طالب`} icon={<CheckCircle2 size={18} />} color="text-emerald-400" />
                <HomeStat label="دفع جزئي / متبقي" value={`${partialPaid} طالب`} icon={<Clock size={18} />} color="text-amber-400" />
                <HomeStat label="المبلغ المحصل" value={`${formatCurrency(totalCollected)} ج.م`} icon={<TrendingUp size={18} />} color="text-emerald-400" />
              </>
            ) : (
              <>
                <HomeStat label="الحضور والغياب" value="تسجيل يومي" icon={<Calendar size={18} />} color="text-emerald-400" />
                <HomeStat label="الدرجات" value="سنتر وإلكتروني" icon={<Award size={18} />} color="text-amber-400" />
                <HomeStat label="الواجبات" value="متابعة" icon={<CheckCircle2 size={18} />} color="text-blue-400" />
                <HomeStat label="السلوك" value="تقييمات" icon={<Clock size={18} />} color="text-pink-400" />
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick access cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickCard
          icon={<Calendar size={24} />}
          title="الحضور والغياب"
          subtitle="تسجيل حضور المركز اليومي"
          color="emerald"
        />
        <QuickCard
          icon={<Award size={24} />}
          title="الدرجات والشهادات"
          subtitle="درجات السنتر والإلكترونية"
          color="amber"
        />
        <QuickCard
          icon={<FileText size={24} />}
          title="الامتحانات الإلكترونية"
          subtitle="بناء ونشر الامتحانات"
          color="blue"
        />
      </div>

      {/* Today's date */}
      <div className="glass-light rounded-xl p-4 text-center text-sm text-slate-300">
        {formatArabicDate(new Date())}
      </div>

      {/* Hall of Fame */}
      <HallOfFame />
    </div>
  );
}

function HomeStat({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="glass-light rounded-2xl p-4 text-right">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-slate-400">{label}</span>
        <span className="text-slate-500">{icon}</span>
      </div>
      <span className={`text-lg font-bold ${color} block`}>{value}</span>
    </div>
  );
}

function QuickCard({ icon, title, subtitle, color }: { icon: React.ReactNode; title: string; subtitle: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
  };
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
        {icon}
      </div>
      <h3 className="font-bold text-white text-sm">{title}</h3>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}
