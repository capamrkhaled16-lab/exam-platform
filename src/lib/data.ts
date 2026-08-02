import { supabase } from './supabase';
import type {
  AcademicStage,
  GradeLevel,
  Group,
  Student,
  AttendanceRecord,
  CenterExam,
  CenterGrade,
  OnlineExam,
  ExamQuestion,
  ExamSubmission,
  ExamAnswer,
  OnlineGrade,
  Certificate,
  AttendanceStatus,
  Assistant,
  Payment,
  Session,
  MonthlyArchive,
  HallOfFameEntry,
  AuditLog,
  Homework,
  HomeworkStatus,
  HomeworkStatusType,
  BehaviorEval,
  BehaviorRating,
} from './types';

export async function fetchStages(): Promise<AcademicStage[]> {
  const { data } = await supabase
    .from('academic_stages')
    .select('*')
    .order('sort_order');
  return data ?? [];
}

export async function fetchGradeLevels(stageId: string): Promise<GradeLevel[]> {
  const { data } = await supabase
    .from('grade_levels')
    .select('*')
    .eq('stage_id', stageId)
    .order('sort_order');
  return data ?? [];
}

export async function fetchGroups(gradeLevelId: string): Promise<Group[]> {
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('grade_level_id', gradeLevelId)
    .order('created_at');
  return data ?? [];
}

export async function createGroup(
  gradeLevelId: string,
  name: string,
  schedule: string | null = null
): Promise<Group | null> {
  const { data } = await supabase
    .from('groups')
    .insert({ grade_level_id: gradeLevelId, name, schedule })
    .select()
    .single();
  return data;
}

export async function deleteGroup(groupId: string): Promise<void> {
  await supabase.from('groups').delete().eq('id', groupId);
}

export async function fetchStudentsByGroup(groupId: string): Promise<Student[]> {
  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name');
  return data ?? [];
}

export async function fetchAllStudents(): Promise<(Student & { group_name?: string; group_schedule?: string | null; grade_name?: string; stage_name?: string })[]> {
  const { data } = await supabase
    .from('students')
    .select('*, group:groups(name, schedule, grade_level:grade_levels(name, stage:academic_stages(name)))')
    .eq('is_deleted', false)
    .order('name');
  if (!data) return [];
  return (data as (Student & { group: { name: string; schedule: string | null; grade_level: { name: string; stage: { name: string } } } | null })[]).map((s) => ({
    ...s,
    group_name: s.group?.name,
    group_schedule: s.group?.schedule,
    grade_name: s.group?.grade_level?.name,
    stage_name: s.group?.grade_level?.stage?.name,
  }));
}

export async function createStudent(
  payload: Partial<Student>
): Promise<Student | null> {
  const { data } = await supabase
    .from('students')
    .insert(payload)
    .select()
    .single();
  return data;
}

export async function updateStudent(
  id: string,
  patch: Partial<Student>
): Promise<void> {
  await supabase.from('students').update(patch).eq('id', id);
}

export async function deleteStudent(id: string): Promise<void> {
  await supabase.from('students').update({ is_deleted: true }).eq('id', id);
}

export async function fetchAttendanceForDate(
  groupId: string,
  date: string
): Promise<AttendanceRecord[]> {
  const { data } = await supabase
    .from('attendance')
    .select('*, student_id')
    .eq('group_id', groupId)
    .eq('attendance_date', date);
  return data ?? [];
}

export async function fetchAttendanceForStudent(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .order('attendance_date', { ascending: false });
  return data ?? [];
}

export async function upsertAttendance(
  studentId: string,
  groupId: string,
  status: AttendanceStatus,
  notes: string | null,
  date: string
): Promise<void> {
  const existing = await supabase
    .from('attendance')
    .select('id')
    .eq('student_id', studentId)
    .eq('attendance_date', date)
    .maybeSingle();

  if (existing.data) {
    await supabase
      .from('attendance')
      .update({ status, notes, recorded_at: new Date().toISOString() })
      .eq('id', existing.data.id);
  } else {
    await supabase.from('attendance').insert({
      student_id: studentId,
      group_id: groupId,
      status,
      notes,
      attendance_date: date,
      recorded_at: new Date().toISOString(),
    });
  }
}

export async function fetchCenterExams(groupId: string): Promise<CenterExam[]> {
  const { data } = await supabase
    .from('center_exams')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function createCenterExam(
  groupId: string,
  title: string,
  maxScore: number,
  passScore: number
): Promise<CenterExam | null> {
  const { data } = await supabase
    .from('center_exams')
    .insert({
      group_id: groupId,
      title,
      max_score: maxScore,
      pass_score: passScore,
    })
    .select()
    .single();
  return data;
}

export async function deleteCenterExam(id: string): Promise<void> {
  await supabase.from('center_exams').delete().eq('id', id);
}

export async function fetchCenterGrades(examId: string): Promise<CenterGrade[]> {
  const { data } = await supabase
    .from('center_grades')
    .select('*')
    .eq('center_exam_id', examId);
  return data ?? [];
}

export async function upsertCenterGrade(
  examId: string,
  studentId: string,
  score: number
): Promise<void> {
  const existing = await supabase
    .from('center_grades')
    .select('id')
    .eq('center_exam_id', examId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing.data) {
    await supabase
      .from('center_grades')
      .update({ score, updated_at: new Date().toISOString() })
      .eq('id', existing.data.id);
  } else {
    await supabase.from('center_grades').insert({
      center_exam_id: examId,
      student_id: studentId,
      score,
    });
  }
}

export async function fetchOnlineExams(groupId: string): Promise<OnlineExam[]> {
  const { data } = await supabase
    .from('exams')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function fetchOnlineExamById(
  id: string
): Promise<OnlineExam | null> {
  const { data } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function createOnlineExam(
  payload: Partial<OnlineExam>
): Promise<OnlineExam | null> {
  const { data } = await supabase
    .from('exams')
    .insert(payload)
    .select()
    .single();
  return data as OnlineExam | null;
}

export async function updateOnlineExam(
  id: string,
  patch: Partial<OnlineExam>
): Promise<void> {
  await supabase.from('exams').update(patch).eq('id', id);
}

export async function deleteOnlineExam(id: string): Promise<void> {
  await supabase.from('exams').delete().eq('id', id);
}

export async function fetchExamQuestions(examId: string): Promise<ExamQuestion[]> {
  const { data } = await supabase
    .from('exam_questions')
    .select('*')
    .eq('exam_id', examId)
    .order('sort_order');
  return data ?? [];
}

export async function createExamQuestion(
  payload: Partial<ExamQuestion>
): Promise<ExamQuestion | null> {
  const { data } = await supabase
    .from('exam_questions')
    .insert(payload)
    .select()
    .single();
  return data;
}

export async function updateExamQuestion(
  id: string,
  patch: Partial<ExamQuestion>
): Promise<void> {
  await supabase.from('exam_questions').update(patch).eq('id', id);
}

export async function deleteExamQuestion(id: string): Promise<void> {
  await supabase.from('exam_questions').delete().eq('id', id);
}

export async function fetchSubmission(
  examId: string,
  studentId: string
): Promise<ExamSubmission | null> {
  const { data } = await supabase
    .from('exam_submissions')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .maybeSingle();
  return data;
}

export async function createSubmission(
  examId: string,
  studentId: string,
  maxScore: number
): Promise<ExamSubmission | null> {
  const { data } = await supabase
    .from('exam_submissions')
    .insert({
      exam_id: examId,
      student_id: studentId,
      max_score: maxScore,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  return data;
}

export async function updateSubmission(
  id: string,
  patch: Partial<ExamSubmission>
): Promise<void> {
  await supabase.from('exam_submissions').update(patch).eq('id', id);
}

export async function fetchAnswers(submissionId: string): Promise<ExamAnswer[]> {
  const { data } = await supabase
    .from('exam_answers')
    .select('*')
    .eq('submission_id', submissionId);
  return data ?? [];
}

export async function upsertAnswer(
  submissionId: string,
  questionId: string,
  patch: Partial<ExamAnswer>
): Promise<void> {
  const existing = await supabase
    .from('exam_answers')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('question_id', questionId)
    .maybeSingle();

  if (existing.data) {
    await supabase
      .from('exam_answers')
      .update({ ...patch, graded_at: new Date().toISOString() })
      .eq('id', existing.data.id);
  } else {
    await supabase.from('exam_answers').insert({
      submission_id: submissionId,
      question_id: questionId,
      ...patch,
      graded_at: new Date().toISOString(),
    });
  }
}

export async function fetchOnlineGrades(examId: string): Promise<OnlineGrade[]> {
  const { data } = await supabase
    .from('online_grades')
    .select('*')
    .eq('exam_id', examId);
  return data ?? [];
}

export async function upsertOnlineGrade(
  examId: string,
  studentId: string,
  score: number,
  maxScore: number,
  isManual: boolean
): Promise<void> {
  const existing = await supabase
    .from('online_grades')
    .select('id')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing.data) {
    await supabase
      .from('online_grades')
      .update({
        score,
        max_score: maxScore,
        is_manual_override: isManual,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.data.id);
  } else {
    await supabase.from('online_grades').insert({
      exam_id: examId,
      student_id: studentId,
      score,
      max_score: maxScore,
      is_manual_override: isManual,
    });
  }
}

export async function fetchCertificates(
  studentId: string
): Promise<Certificate[]> {
  const { data } = await supabase
    .from('certificates')
    .select('*')
    .eq('student_id', studentId)
    .order('issued_at', { ascending: false });
  return data ?? [];
}

export async function createCertificate(
  payload: Partial<Certificate>
): Promise<Certificate | null> {
  const { data } = await supabase
    .from('certificates')
    .insert(payload)
    .select()
    .single();
  return data;
}

export async function fetchStudentByParentToken(
  token: string
): Promise<Student | null> {
  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('parent_token', token)
    .maybeSingle();
  return data;
}

export async function fetchOnlineGradesByStudent(
  studentId: string
): Promise<OnlineGrade[]> {
  const { data } = await supabase
    .from('online_grades')
    .select('*')
    .eq('student_id', studentId);
  return data ?? [];
}

export async function fetchCenterGradesByStudent(
  studentId: string
): Promise<CenterGrade[]> {
  const { data } = await supabase
    .from('center_grades')
    .select('*')
    .eq('student_id', studentId);
  return data ?? [];
}

export async function fetchCenterExamsByStudent(
  studentId: string
): Promise<CenterExam[]> {
  const { data } = await supabase
    .from('center_exams')
    .select('*')
    .in(
      'group_id',
      ((await supabase.from('students').select('group_id').eq('id', studentId).maybeSingle()).data?.group_id) ?? []
    );
  return data ?? [];
}

export async function fetchOnlineExamsByStudent(
  studentId: string
): Promise<OnlineExam[]> {
  const { data } = await supabase
    .from('exams')
    .select('*')
    .in(
      'group_id',
      ((await supabase.from('students').select('group_id').eq('id', studentId).maybeSingle()).data?.group_id) ?? []
    );
  return data ?? [];
}

export async function fetchAllStudentsCount(): Promise<number> {
  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false);
  return count ?? 0;
}

export async function fetchFeesTotals(): Promise<{ collected: number; remaining: number }> {
  const { data } = await supabase.from('students').select('total_fees, paid_fees').eq('is_deleted', false);
  if (!data || data.length === 0) return { collected: 0, remaining: 0 };
  const collected = data.reduce((s, r) => s + (r.paid_fees ?? 0), 0);
  const remaining = data.reduce((s, r) => s + ((r.total_fees ?? 0) - (r.paid_fees ?? 0)), 0);
  return { collected, remaining };
}

// ============ ASSISTANTS ============

export async function fetchAssistants(): Promise<Assistant[]> {
  const { data } = await supabase
    .from('assistants')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as Assistant[]) ?? [];
}

export async function createAssistant(
  payload: Partial<Assistant>
): Promise<Assistant | null> {
  const { data } = await supabase
    .from('assistants')
    .insert(payload)
    .select()
    .single();
  return data as Assistant | null;
}

export async function updateAssistant(
  id: string,
  patch: Partial<Assistant>
): Promise<void> {
  await supabase.from('assistants').update(patch).eq('id', id);
}

export async function deleteAssistant(id: string): Promise<void> {
  await supabase.from('assistants').delete().eq('id', id);
}

export async function incrementAssistantLogin(id: string): Promise<void> {
  const { data } = await supabase
    .from('assistants')
    .select('logins_count')
    .eq('id', id)
    .maybeSingle();
  await supabase
    .from('assistants')
    .update({
      logins_count: (data?.logins_count ?? 0) + 1,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', id);
}

// ============ PAYMENTS ============

export async function fetchPayments(studentId: string): Promise<Payment[]> {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('student_id', studentId)
    .order('payment_date', { ascending: false });
  return (data as Payment[]) ?? [];
}

export async function createPayment(
  studentId: string,
  amount: number,
  note: string | null,
  recordedBy: string = 'المدرس'
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('payments').insert({
    student_id: studentId,
    amount,
    note,
    payment_date: now.split('T')[0],
    recorded_by: recordedBy,
    recorded_at: now,
  });
  const { data: student } = await supabase
    .from('students')
    .select('paid_fees')
    .eq('id', studentId)
    .maybeSingle();
  if (student) {
    await supabase
      .from('students')
      .update({ paid_fees: (student.paid_fees ?? 0) + amount })
      .eq('id', studentId);
  }
  await createAuditLog(recordedBy, 'assistant', 'payment_create', studentId, amount, note);
}

export async function deletePayment(id: string): Promise<void> {
  await supabase.from('payments').delete().eq('id', id);
}

export async function deletePaymentWithAudit(
  id: string,
  actorName: string = 'المدرس',
  actorRole: 'master' | 'assistant' = 'master'
): Promise<void> {
  const { data: pay } = await supabase
    .from('payments')
    .select('student_id, amount')
    .eq('id', id)
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
    await createAuditLog(actorName, actorRole, 'payment_delete', pay.student_id, pay.amount, null);
  }
  await supabase.from('payments').delete().eq('id', id);
}

// ============ AUDIT LOGS ============

export async function createAuditLog(
  actorName: string,
  actorRole: 'master' | 'assistant',
  actionType: string,
  targetStudentId: string | null,
  amount: number | null,
  note: string | null
): Promise<void> {
  await supabase.from('audit_logs').insert({
    actor_name: actorName,
    actor_role: actorRole,
    action_type: actionType,
    target_student_id: targetStudentId,
    amount,
    note,
  });
}

export async function fetchAuditLogs(limit = 100): Promise<(AuditLog & { student?: { name: string } })[]> {
  const { data } = await supabase
    .from('audit_logs')
    .select('*, student:students(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as (AuditLog & { student?: { name: string } })[]) ?? [];
}

// ============ GROUP STATS ============

export async function fetchGroupStats(
  groupId: string
): Promise<{
  totalStudents: number;
  collected: number;
  remaining: number;
  fullyPaid: number;
  partialPaid: number;
}> {
  const { data: students } = await supabase
    .from('students')
    .select('total_fees, paid_fees')
    .eq('group_id', groupId)
    .eq('is_deleted', false);
  if (!students || students.length === 0) {
    return { totalStudents: 0, collected: 0, remaining: 0, fullyPaid: 0, partialPaid: 0 };
  }
  const collected = students.reduce((s, r) => s + (r.paid_fees ?? 0), 0);
  const remaining = students.reduce(
    (s, r) => s + ((r.total_fees ?? 0) - (r.paid_fees ?? 0)),
    0
  );
  const fullyPaid = students.filter(
    (r) => (r.paid_fees ?? 0) >= (r.total_fees ?? 0)
  ).length;
  return {
    totalStudents: students.length,
    collected,
    remaining,
    fullyPaid,
    partialPaid: students.length - fullyPaid,
  };
}

// ============ SESSIONS ============

export async function fetchSessions(
  groupId: string,
  month: string
): Promise<Session[]> {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('group_id', groupId)
    .eq('month', month)
    .eq('is_archived', false)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });
  return (data as Session[]) ?? [];
}

export async function createSession(
  groupId: string,
  title: string,
  month: string
): Promise<Session | null> {
  const { data } = await supabase
    .from('sessions')
    .insert({ group_id: groupId, title, month })
    .select()
    .single();
  return data as Session | null;
}

export async function deleteSession(id: string): Promise<void> {
  await supabase.from('sessions').update({ is_deleted: true }).eq('id', id);
}

// ============ MONTHLY ARCHIVE ============

export async function fetchArchives(
  groupId: string
): Promise<MonthlyArchive[]> {
  const { data } = await supabase
    .from('monthly_archive')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  return (data as MonthlyArchive[]) ?? [];
}

export async function createArchive(
  groupId: string,
  month: string,
  archiveData: Record<string, unknown>
): Promise<MonthlyArchive | null> {
  const { data } = await supabase
    .from('monthly_archive')
    .insert({ group_id: groupId, month, archive_data: archiveData })
    .select()
    .single();
  return data as MonthlyArchive | null;
}

export async function deleteArchive(id: string): Promise<void> {
  await supabase.from('monthly_archive').delete().eq('id', id);
}

// ============ SESSION-BASED ATTENDANCE ============

export async function fetchAttendanceBySession(
  groupId: string,
  sessionId: string
): Promise<AttendanceRecord[]> {
  // We reuse the attendance table, storing the session title in notes
  // and the session date in attendance_date
  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('group_id', groupId)
    .like('notes', `%session:${sessionId}%`);
  return (data as AttendanceRecord[]) ?? [];
}

export async function upsertSessionAttendance(
  studentId: string,
  groupId: string,
  status: AttendanceStatus,
  sessionId: string,
  sessionTitle: string,
  date: string
): Promise<void> {
  const sessionNote = `session:${sessionId}|${sessionTitle}`;
  const existing = await supabase
    .from('attendance')
    .select('id')
    .eq('student_id', studentId)
    .eq('attendance_date', date)
    .like('notes', `%session:${sessionId}%`)
    .maybeSingle();

  if (existing.data) {
    await supabase
      .from('attendance')
      .update({ status, notes: sessionNote, recorded_at: new Date().toISOString() })
      .eq('id', existing.data.id);
  } else {
    await supabase.from('attendance').insert({
      student_id: studentId,
      group_id: groupId,
      status,
      notes: sessionNote,
      attendance_date: date,
      recorded_at: new Date().toISOString(),
    });
  }
}

// ============ HALL OF FAME ============

export async function fetchHallOfFame(limit = 10): Promise<HallOfFameEntry[]> {
  const { data } = await supabase
    .from('hall_of_fame')
    .select('*')
    .limit(limit);
  return (data as HallOfFameEntry[]) ?? [];
}

// ============ SEARCH ============

export async function searchStudents(query: string): Promise<(Student & { group_name?: string; grade_name?: string; stage_name?: string })[]> {
  const { data } = await supabase
    .from('students')
    .select('*, group:groups(name, grade_level:grade_levels(name, stage:academic_stages(name)))')
    .eq('is_deleted', false)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,parent_phone.ilike.%${query}%`)
    .order('name')
    .limit(10);
  if (!data) return [];
  return (data as (Student & { group: { name: string; grade_level: { name: string; stage: { name: string } } } | null })[]).map((s) => ({
    ...s,
    group_name: s.group?.name,
    grade_name: s.group?.grade_level?.name,
    stage_name: s.group?.grade_level?.stage?.name,
  }));
}

// ============ HOMEWORK ============

export async function fetchHomework(groupId: string): Promise<Homework[]> {
  const { data } = await supabase
    .from('homework')
    .select('*')
    .eq('group_id', groupId)
    .order('due_date', { ascending: false });
  return (data as Homework[]) ?? [];
}

export async function createHomework(
  groupId: string,
  title: string,
  description: string | null,
  dueDate: string
): Promise<Homework | null> {
  const { data } = await supabase
    .from('homework')
    .insert({ group_id: groupId, title, description, due_date: dueDate })
    .select()
    .single();
  return data;
}

export async function deleteHomework(id: string): Promise<void> {
  await supabase.from('homework').delete().eq('id', id);
}

export async function fetchHomeworkStatuses(
  homeworkId: string
): Promise<HomeworkStatus[]> {
  const { data } = await supabase
    .from('homework_status')
    .select('*')
    .eq('homework_id', homeworkId);
  return (data as HomeworkStatus[]) ?? [];
}

export async function upsertHomeworkStatus(
  homeworkId: string,
  studentId: string,
  status: HomeworkStatusType,
  teacherNote: string | null
): Promise<void> {
  const existing = await supabase
    .from('homework_status')
    .select('id')
    .eq('homework_id', homeworkId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (existing.data) {
    await supabase
      .from('homework_status')
      .update({ status, teacher_note: teacherNote, recorded_at: new Date().toISOString() })
      .eq('id', existing.data.id);
  } else {
    await supabase.from('homework_status').insert({
      homework_id: homeworkId,
      student_id: studentId,
      status,
      teacher_note: teacherNote,
    });
  }
}

// ============ BEHAVIOR ============

export async function fetchBehaviorEvals(
  studentId: string
): Promise<BehaviorEval[]> {
  const { data } = await supabase
    .from('behavior_eval')
    .select('*')
    .eq('student_id', studentId)
    .order('eval_date', { ascending: false });
  return (data as BehaviorEval[]) ?? [];
}

export async function upsertBehaviorEval(
  studentId: string,
  groupId: string | null,
  rating: BehaviorRating,
  note: string | null,
  evalDate: string
): Promise<void> {
  const existing = await supabase
    .from('behavior_eval')
    .select('id')
    .eq('student_id', studentId)
    .eq('eval_date', evalDate)
    .maybeSingle();
  if (existing.data) {
    await supabase
      .from('behavior_eval')
      .update({ rating, note, group_id: groupId })
      .eq('id', existing.data.id);
  } else {
    await supabase.from('behavior_eval').insert({
      student_id: studentId,
      group_id: groupId,
      rating,
      note,
      eval_date: evalDate,
    });
  }
}

// ============ PARENT PORTAL: MULTI-CHILD BY PHONE ============

export async function fetchStudentsByParentPhone(
  phone: string
): Promise<(Student & { group_name?: string; grade_name?: string; stage_name?: string })[]> {
  const { data } = await supabase
    .from('students')
    .select('*, group:groups(name, grade_level:grade_levels(name, stage:academic_stages(name)))')
    .eq('is_deleted', false)
    .eq('parent_phone', phone)
    .order('name');
  if (!data) return [];
  return (data as (Student & { group: { name: string; grade_level: { name: string; stage: { name: string } } } | null })[]).map((s) => ({
    ...s,
    group_name: s.group?.name,
    grade_name: s.group?.grade_level?.name,
    stage_name: s.group?.grade_level?.stage?.name,
  }));
}

// ============ LIVE EXAM MONITORING ============

export async function fetchExamSubmissionsForMonitor(
  examId: string
): Promise<(ExamSubmission & { student?: { name: string; id: string } })[]> {
  const { data } = await supabase
    .from('exam_submissions')
    .select('*, student:students(name, id)')
    .eq('exam_id', examId)
    .order('started_at', { ascending: false });
  return (data as (ExamSubmission & { student?: { name: string; id: string } })[]) ?? [];
}
