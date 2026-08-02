import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  BookOpen,
  Users,
  BarChart2,
  Award,
  Clock,
  Smartphone,
  UserCog,
  DollarSign,
  Settings,
  LogOut,
  ChevronLeft,
  GraduationCap,
  ClipboardCheck,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchStages,
  fetchGradeLevels,
  fetchGroups,
  fetchStudentsByGroup,
  fetchAllStudents,
  fetchFeesTotals,
  fetchGroupStats,
} from '@/lib/data';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { AcademicStage, GradeLevel, Group, Student, Payment } from '@/lib/types';

type EnrichedStudent = Student & { group_name?: string; grade_name?: string; stage_name?: string };
import Navbar from '@/components/ui/Navbar';
import Watermark from '@/components/ui/Watermark';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Stepper from '@/components/ui/Stepper';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import HomeDashboard from '@/components/dashboard/HomeDashboard';
import Button from '@/components/ui/Button';
import GroupManager from '@/components/dashboard/GroupManager';
import StudentManager from '@/components/dashboard/StudentManager';
import AssistantsManager from '@/components/dashboard/AssistantsManager';
import FinancesModule from '@/components/dashboard/FinancesModule';
import ParentLinksModule from '@/components/dashboard/ParentLinksModule';
import AttendanceModule from '@/components/modules/AttendanceModule';
import CenterGrades from '@/components/modules/CenterGrades';
import OnlineGrades from '@/components/modules/OnlineGrades';
import CertificateModule from '@/components/modules/CertificateModule';
import ExamBuilder from '@/components/modules/ExamBuilder';
import LiveExamMonitor from '@/components/modules/LiveExamMonitor';
import HomeworkBehavior from '@/components/modules/HomeworkBehavior';

type Tab =
  | 'home'
  | 'stepper'
  | 'attendance'
  | 'grades'
  | 'certificates'
  | 'exams'
  | 'tracking'
  | 'parent'
  | 'assistants'
  | 'finances'
  | 'settings';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'الرئيسية', icon: <Home size={16} /> },
  { id: 'stepper', label: 'المجموعات والتدرج', icon: <BookOpen size={16} /> },
  { id: 'attendance', label: 'حضور المركز', icon: <Users size={16} /> },
  { id: 'grades', label: 'سجل الدرجات', icon: <BarChart2 size={16} /> },
  { id: 'certificates', label: 'شهادات التقدير', icon: <Award size={16} /> },
  { id: 'exams', label: 'منصة الامتحانات', icon: <Clock size={16} /> },
  { id: 'tracking', label: 'الواجبات والسلوك', icon: <ClipboardCheck size={16} /> },
  { id: 'parent', label: 'أولياء الأمور', icon: <Smartphone size={16} /> },
  { id: 'assistants', label: 'إدارة المساعدين', icon: <UserCog size={16} /> },
  { id: 'finances', label: 'المالية', icon: <DollarSign size={16} /> },
  { id: 'settings', label: 'الإعدادات', icon: <Settings size={16} /> },
];

export default function DashboardPage() {
  const { role, logout, isMaster, can } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('home');
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<AcademicStage | null>(null);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<EnrichedStudent[]>([]);
  const [fees, setFees] = useState({ collected: 0, remaining: 0 });
  const [groupStats, setGroupStats] = useState({ totalStudents: 0, collected: 0, remaining: 0, fullyPaid: 0, partialPaid: 0 });
  const [groupPayments, setGroupPayments] = useState<(Payment & { student_name?: string })[]>([]);
  const [groupPaymentsOpen, setGroupPaymentsOpen] = useState(false);
  const [deletePayTarget, setDeletePayTarget] = useState<Payment | null>(null);
  const [gradesTab, setGradesTab] = useState<'center' | 'online'>('center');

  const loadStages = useCallback(async () => {
    const data = await fetchStages();
    setStages(data);
  }, []);

  const loadKPIs = useCallback(async () => {
    const [all, f] = await Promise.all([fetchAllStudents(), fetchFeesTotals()]);
    setAllStudents(all);
    setFees(f);
  }, []);

  useEffect(() => {
    loadStages();
    loadKPIs();
  }, [loadStages, loadKPIs]);

  const loadGradeLevels = useCallback(async () => {
    if (!selectedStage) return;
    const data = await fetchGradeLevels(selectedStage.id);
    setGradeLevels(data);
  }, [selectedStage]);

  useEffect(() => { loadGradeLevels(); }, [loadGradeLevels]);

  const loadGroups = useCallback(async () => {
    if (!selectedGrade) return;
    const data = await fetchGroups(selectedGrade.id);
    setGroups(data);
  }, [selectedGrade]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const loadStudents = useCallback(async () => {
    if (!selectedGroup) return;
    const data = await fetchStudentsByGroup(selectedGroup.id);
    setStudents(data);
  }, [selectedGroup]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const loadGroupStats = useCallback(async () => {
    if (!selectedGroup) return;
    const stats = await fetchGroupStats(selectedGroup.id);
    setGroupStats(stats);
  }, [selectedGroup]);

  useEffect(() => { loadGroupStats(); }, [loadGroupStats]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function refreshGroups() {
    loadGroups();
    loadKPIs();
  }

  function refreshStudents() {
    loadStudents();
    loadKPIs();
    loadGroupStats();
  }

  async function openGroupPayments() {
    if (!selectedGroup) return;
    const { data } = await supabase
      .from('payments')
      .select('*, student:students(name)')
      .in('student_id', students.map((s) => s.id))
      .order('payment_date', { ascending: false });
    if (data) {
      const mapped = (data as (Payment & { student?: { name: string } })[]).map((p) => ({
        ...p,
        student_name: p.student?.name,
      }));
      setGroupPayments(mapped);
    }
    setGroupPaymentsOpen(true);
  }

  async function handleDeleteGroupPayment() {
    if (!deletePayTarget) return;
    const { data: pay } = await supabase
      .from('payments')
      .select('student_id, amount')
      .eq('id', deletePayTarget.id)
      .maybeSingle();
    if (pay) {
      const { data: student } = await supabase
        .from('students')
        .select('paid_fees')
        .eq('id', pay.student_id)
        .maybeSingle();
      if (student) {
        await supabase
          .from('students')
          .update({ paid_fees: Math.max(0, (student.paid_fees ?? 0) - (pay.amount ?? 0)) })
          .eq('id', pay.student_id);
      }
      await supabase.from('audit_logs').insert({
        actor_name: 'المدرس',
        actor_role: 'master' as const,
        action_type: 'payment_delete',
        target_student_id: pay.student_id,
        amount: pay.amount,
        note: null,
      });
    }
    await supabase.from('payments').delete().eq('id', deletePayTarget.id);
    setDeletePayTarget(null);
    await openGroupPayments();
    refreshStudents();
  }

  const fullyPaid = allStudents.filter((s) => (s.paid_fees ?? 0) >= (s.total_fees ?? 0)).length;
  const partialPaid = allStudents.length - fullyPaid;

  const stepIndex = !selectedStage ? 0 : !selectedGrade ? 1 : !selectedGroup ? 2 : 3;

  // Tabs that require a group selection
  const groupRequired: Tab[] = ['attendance', 'grades', 'certificates', 'exams', 'tracking'];
  const needsGroup = groupRequired.includes(tab) && !selectedGroup;

  // Filter tabs by permissions
  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'assistants' && !isMaster) return false;
    if (t.id === 'finances' && !can('can_view_finance')) return false;
    if (t.id === 'settings' && !isMaster) return false;
    return true;
  });

  return (
    <div className="min-h-screen pb-12">
      <Navbar
        onLogout={handleLogout}
        onSearchNavigate={(s) => {
          if (s.group_id) {
            setTab('attendance');
          }
        }}
        rightContent={
          isMaster ? (
            <Button size="sm" variant="secondary" onClick={() => navigate('/settings')}>
              <Settings size={16} />
              <span className="hidden sm:inline">الإعدادات</span>
            </Button>
          ) : undefined
        }
      />

{/* Tab navigation bar */}
      <nav className="sticky top-[60px] z-30 glass border-b border-white/10 px-4 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1 py-2">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* HOME */}
            {tab === 'home' && (
              <HomeDashboard
                totalStudents={allStudents.length}
                totalCollected={fees.collected}
                totalRemaining={fees.remaining}
                fullyPaid={fullyPaid}
                partialPaid={partialPaid}
                isMaster={isMaster}
              />
            )}

            {/* STEPPER — mandatory progression */}
            {tab === 'stepper' && (
              <div className="space-y-6">
                <div className="glass-card rounded-2xl p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">التدرج الإلزامي وإدارة المجموعات</h2>
                    <p className="text-xs text-slate-400">اختر المرحلة → الصف → المجموعة للوصول إلى الوحدات.</p>
                  </div>

                  <Stepper
                    steps={[
                      { id: 'stage', label: 'المرحلة' },
                      { id: 'grade', label: 'الصف' },
                      { id: 'group', label: 'المجموعة' },
                      { id: 'module', label: 'الوحدة' },
                    ]}
                    current={stepIndex}
                    onStepClick={(i) => {
                      if (i === 0) { setSelectedStage(null); setSelectedGrade(null); setSelectedGroup(null); }
                      if (i === 1) { setSelectedGrade(null); setSelectedGroup(null); }
                      if (i === 2) { setSelectedGroup(null); }
                    }}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Stage selection */}
                    <div className="glass-light rounded-xl p-4">
                      <span className="text-xs font-semibold text-emerald-400 block mb-2">1. المرحلة الدراسية</span>
                      <div className="space-y-2">
                        {stages.map((stage) => (
                          <button
                            key={stage.id}
                            onClick={() => { setSelectedStage(stage); setSelectedGrade(null); setSelectedGroup(null); }}
                            className={`w-full text-right px-3 py-2 rounded-lg text-xs font-semibold transition ${selectedStage?.id === stage.id ? 'bg-emerald-600/20 border border-emerald-500 text-white' : 'glass-light text-slate-400 hover:bg-white/10'}`}
                          >
                            {stage.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Grade selection */}
                    <div className="glass-light rounded-xl p-4">
                      <span className="text-xs font-semibold text-emerald-400 block mb-2">2. الصف الدراسي</span>
                      <div className="space-y-2">
                        {selectedStage ? (
                          gradeLevels.map((gl) => (
                            <button
                              key={gl.id}
                              onClick={() => { setSelectedGrade(gl); setSelectedGroup(null); }}
                              className={`w-full text-right px-3 py-2 rounded-lg text-xs font-semibold transition ${selectedGrade?.id === gl.id ? 'bg-emerald-600/20 border border-emerald-500 text-white' : 'glass-light text-slate-400 hover:bg-white/10'}`}
                            >
                              {gl.name}
                            </button>
                          ))
                        ) : (
                          <p className="text-center py-6 text-xs text-slate-600">اختر المرحلة أولاً</p>
                        )}
                      </div>
                    </div>

                    {/* Group selection */}
                    <div className="glass-light rounded-xl p-4">
                      <GroupManager
                        gradeLevelId={selectedGrade?.id ?? ''}
                        groups={groups}
                        selectedGroupId={selectedGroup?.id ?? null}
                        onSelect={(g) => setSelectedGroup(g)}
                        onRefresh={refreshGroups}
                      />
                    </div>
                  </div>

                  {/* Instant group summary */}
                  {selectedGroup && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-light rounded-2xl p-5 border border-emerald-500/20"
                    >
                      <h4 className="text-sm font-bold text-white mb-3 text-center">ملخص المجموعة: {selectedGroup.name}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <SummaryBox label="إجمالي الطلاب" value={`${groupStats.totalStudents} طالب`} color="text-white" />
                        {isMaster ? (
                          <>
                            <SummaryBox label="دفع كامل" value={`${groupStats.fullyPaid} طالب`} color="text-emerald-400" />
                            <SummaryBox label="متبقي / جزئي" value={`${groupStats.partialPaid} طالب`} color="text-amber-400" />
                            <button onClick={openGroupPayments} className="glass-light rounded-xl p-3 hover:bg-emerald-500/10 transition cursor-pointer text-right" title="عرض تفاصيل الحركات">
                              <span className="text-[10px] text-slate-400 block mb-1">المبلغ المحصل (انقر للتفاصيل)</span>
                              <span className="text-base font-bold text-emerald-400">{formatCurrency(groupStats.collected)} ج.م</span>
                            </button>
                          </>
                        ) : (
                          <SummaryBox label="الاشتراكات" value="إدارة الأشهر" color="text-blue-400" />
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Student manager visible under stepper */}
                {selectedGroup && (
                  <StudentManager
                    groupId={selectedGroup.id}
                    students={students}
                    onRefresh={refreshStudents}
                  />
                )}
              </div>
            )}

            {/* ATTENDANCE — requires group */}
            {tab === 'attendance' && (
              needsGroup ? <GroupRequiredNotice onGoStepper={() => setTab('stepper')} /> : (
                selectedGroup && (
                  <div className="space-y-4">
                    <Breadcrumbs crumbs={[{ label: selectedStage?.name ?? '' }, { label: selectedGrade?.name ?? '' }, { label: selectedGroup.name, isLast: true }]} onHomeClick={() => setTab('home')} />
                    <GroupBreadcrumb
                      stage={selectedStage?.name}
                      grade={selectedGrade?.name}
                      group={selectedGroup.name}
                      onChangeGroup={() => setTab('stepper')}
                    />
                    <AttendanceModule groupId={selectedGroup.id} students={students} groupName={selectedGroup.name} stageName={selectedStage?.name} gradeName={selectedGrade?.name} />
                    <div className="pt-6 border-t border-white/10">
                      <StudentManager groupId={selectedGroup.id} students={students} onRefresh={refreshStudents} />
                    </div>
                  </div>
                )
              )
            )}

            {/* GRADES — requires group, dual tabs */}
            {tab === 'grades' && (
              needsGroup ? <GroupRequiredNotice onGoStepper={() => setTab('stepper')} /> : (
                selectedGroup && (
                  <div className="space-y-4">
                    <Breadcrumbs crumbs={[{ label: selectedStage?.name ?? '' }, { label: selectedGrade?.name ?? '' }, { label: selectedGroup.name, isLast: true }]} onHomeClick={() => setTab('home')} />
                    <GroupBreadcrumb
                      stage={selectedStage?.name}
                      grade={selectedGrade?.name}
                      group={selectedGroup.name}
                      onChangeGroup={() => setTab('stepper')}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setGradesTab('center')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${gradesTab === 'center' ? 'bg-emerald-600 text-white' : 'glass-light text-slate-400'}`}
                      >
                        درجات السنتر
                      </button>
                      <button
                        onClick={() => setGradesTab('online')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${gradesTab === 'online' ? 'bg-emerald-600 text-white' : 'glass-light text-slate-400'}`}
                      >
                        الامتحانات الإلكترونية
                      </button>
                    </div>
                    {gradesTab === 'center' && <CenterGrades groupId={selectedGroup.id} students={students} />}
                    {gradesTab === 'online' && <OnlineGrades groupId={selectedGroup.id} students={students} />}
                  </div>
                )
              )
            )}

            {/* CERTIFICATES — requires group */}
            {tab === 'certificates' && (
              needsGroup ? <GroupRequiredNotice onGoStepper={() => setTab('stepper')} /> : (
                selectedGroup && (
                  <div className="space-y-4">
                    <Breadcrumbs crumbs={[{ label: selectedStage?.name ?? '' }, { label: selectedGrade?.name ?? '' }, { label: selectedGroup.name, isLast: true }]} onHomeClick={() => setTab('home')} />
                    <GroupBreadcrumb
                      stage={selectedStage?.name}
                      grade={selectedGrade?.name}
                      group={selectedGroup.name}
                      onChangeGroup={() => setTab('stepper')}
                    />
                    <CertificateModule students={students} />
                  </div>
                )
              )
            )}

            {/* EXAMS — requires group */}
            {tab === 'exams' && (
              needsGroup ? <GroupRequiredNotice onGoStepper={() => setTab('stepper')} /> : (
                selectedGroup && (
                  <div className="space-y-4">
                    <Breadcrumbs crumbs={[{ label: selectedStage?.name ?? '' }, { label: selectedGrade?.name ?? '' }, { label: selectedGroup.name, isLast: true }]} onHomeClick={() => setTab('home')} />
                    <GroupBreadcrumb
                      stage={selectedStage?.name}
                      grade={selectedGrade?.name}
                      group={selectedGroup.name}
                      onChangeGroup={() => setTab('stepper')}
                    />
                    <ExamBuilder groupId={selectedGroup.id} groupName={selectedGroup.name} stageName={selectedStage?.name} gradeName={selectedGrade?.name} />
                    <div className="pt-4 border-t border-white/10">
                      <LiveExamMonitor groupId={selectedGroup.id} />
                    </div>
                  </div>
                )
              )
            )}

            {/* TRACKING — homework & behavior, requires group */}
            {tab === 'tracking' && (
              needsGroup ? <GroupRequiredNotice onGoStepper={() => setTab('stepper')} /> : (
                selectedGroup && (
                  <div className="space-y-4">
                    <Breadcrumbs crumbs={[{ label: selectedStage?.name ?? '' }, { label: selectedGrade?.name ?? '' }, { label: selectedGroup.name, isLast: true }]} onHomeClick={() => setTab('home')} />
                    <GroupBreadcrumb
                      stage={selectedStage?.name}
                      grade={selectedGrade?.name}
                      group={selectedGroup.name}
                      onChangeGroup={() => setTab('stepper')}
                    />
                    <HomeworkBehavior groupId={selectedGroup.id} students={students} />
                  </div>
                )
              )
            )}

            {/* PARENT PORTAL LINKS */}
            {tab === 'parent' && <ParentLinksModule groupId={selectedGroup?.id ?? null} />}

            {/* ASSISTANTS — master only */}
            {tab === 'assistants' && isMaster && <AssistantsManager />}

            {/* FINANCES — requires permission */}
            {tab === 'finances' && can('can_view_finance') && <FinancesModule />}

            {/* SETTINGS — master only */}
            {tab === 'settings' && isMaster && (
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-white mb-2">الإعدادات</h2>
                  <p className="text-sm text-slate-400 mb-4">لإعدادات المنصة الكاملة ورفع اللوجو وصورة المعلم، انتقل إلى صفحة الإعدادات.</p>
                  <Button onClick={() => navigate('/settings')}>
                    <Settings size={16} /> فتح صفحة الإعدادات
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <Watermark />

      <Modal open={groupPaymentsOpen} onClose={() => setGroupPaymentsOpen(false)} title={`حركات المبلغ المحصل — ${selectedGroup?.name ?? ''}`} size="md">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {groupPayments.length === 0 ? (
            <p className="text-center text-slate-400 py-6">لا توجد حركات مسجلة في هذه المجموعة.</p>
          ) : (
            <>
              <div className="glass-light rounded-xl p-3 text-center mb-2">
                <p className="text-xs text-slate-400">إجمالي المحصل للمجموعة</p>
                <p className="text-xl font-black text-emerald-400">{formatCurrency(groupPayments.reduce((s, p) => s + (p.amount ?? 0), 0))} ج.م</p>
              </div>
              {groupPayments.map((p) => (
                <div key={p.id} className="glass-light rounded-xl p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-emerald-400 text-sm">{formatCurrency(p.amount)} ج.م</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.student_name ?? 'طالب'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{p.payment_date}{p.recorded_by ? ` • سجّلها: ${p.recorded_by}` : ''}</p>
                    {p.note && <p className="text-xs text-slate-500 mt-0.5">{p.note}</p>}
                  </div>
                  <button onClick={() => setDeletePayTarget(p)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition flex-shrink-0" title="حذف هذه الحركة">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletePayTarget}
        onClose={() => setDeletePayTarget(null)}
        onConfirm={handleDeleteGroupPayment}
        title="حذف الحركة المالية"
        subtext="سيتم حذف هذه الدفعة وخصم المبلغ من المدفوعات والإجمالي فوراً، مع تسجيل العملية في السجل الخفي."
        confirmLabel="تأكيد الحذف"
      />
    </div>
  );
}

function GroupRequiredNotice({ onGoStepper }: { onGoStepper: () => void }) {
  return (
    <div className="glass-card rounded-2xl p-12 text-center">
      <GraduationCap className="mx-auto text-slate-600 mb-4" size={48} />
      <h3 className="text-lg font-bold text-white mb-2">يجب اختيار مجموعة أولاً</h3>
      <p className="text-sm text-slate-400 mb-4">
        انتقل إلى تبويب «المجموعات والتدرج» واختر المرحلة ← الصف ← المجموعة للوصول إلى هذه الوحدة.
      </p>
      <Button onClick={onGoStepper}>
        <BookOpen size={16} /> الذهاب إلى التدرج
      </Button>
    </div>
  );
}

function GroupBreadcrumb({
  stage,
  grade,
  group,
  onChangeGroup,
}: {
  stage?: string;
  grade?: string;
  group: string;
  onChangeGroup: () => void;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2 text-sm">
        {stage && <span className="text-slate-500">{stage}</span>}
        {grade && (
          <>
            <ChevronLeft size={14} className="text-slate-600" />
            <span className="text-slate-500">{grade}</span>
          </>
        )}
        <ChevronLeft size={14} className="text-slate-600" />
        <span className="text-emerald-400 font-semibold">{group}</span>
      </div>
      <Button size="sm" variant="ghost" onClick={onChangeGroup}>
        <Users size={16} /> تغيير المجموعة
      </Button>
    </div>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass-light rounded-xl p-3">
      <span className="text-[10px] text-slate-400 block mb-1">{label}</span>
      <span className={`text-base font-bold ${color}`}>{value}</span>
    </div>
  );
}
