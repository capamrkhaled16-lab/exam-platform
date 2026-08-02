export type AcademicStage = {
  id: string;
  name: string;
  sort_order: number;
};

export type GradeLevel = {
  id: string;
  stage_id: string;
  name: string;
  sort_order: number;
};

export type Group = {
  id: string;
  grade_level_id: string;
  name: string;
  schedule: string | null;
  created_at: string;
};

export type Gender = 'male' | 'female';

export type Student = {
  id: string;
  group_id: string | null;
  name: string;
  phone: string | null;
  parent_phone: string | null;
  gender: Gender;
  parent_token: string;
  enrollment_date: string;
  total_fees: number;
  paid_fees: number;
  is_deleted: boolean;
  created_at: string;
};

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused_absence'
  | 'unrecorded';

export type AttendanceRecord = {
  id: string;
  student_id: string;
  group_id: string | null;
  status: AttendanceStatus;
  notes: string | null;
  attendance_date: string;
  recorded_at: string;
};

export type CenterExam = {
  id: string;
  group_id: string;
  title: string;
  max_score: number;
  pass_score: number;
  exam_date: string;
  created_at: string;
};

export type CenterGrade = {
  id: string;
  center_exam_id: string;
  student_id: string;
  score: number;
  updated_at: string;
};

export type OnlineExam = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  open_at: string | null;
  close_at: string | null;
  is_published: boolean;
  subject: string | null;
  seconds_per_question: number;
  total_score: number;
  is_random: boolean;
  is_draft: boolean;
  created_at: string;
};

export type QuestionType = 'mcq' | 'essay';

export type ExamQuestion = {
  id: string;
  exam_id: string;
  type: QuestionType;
  question_text: string;
  choices: string[] | null;
  correct_choice_index: number | null;
  model_answer: string | null;
  points: number;
  sort_order: number;
};

export type SubmissionStatus =
  | 'in_progress'
  | 'submitted'
  | 'cheated'
  | 'auto_submitted';

export type ExamSubmission = {
  id: string;
  exam_id: string;
  student_id: string;
  status: SubmissionStatus;
  total_score: number;
  max_score: number;
  started_at: string;
  submitted_at: string | null;
  tab_switch_count: number;
};

export type ExamAnswer = {
  id: string;
  submission_id: string;
  question_id: string;
  selected_choice_index: number | null;
  essay_answer: string | null;
  awarded_score: number;
  is_correct: boolean;
  graded_at: string | null;
};

export type OnlineGrade = {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  max_score: number;
  is_manual_override: boolean;
  updated_at: string;
};

export type AssistantPermissions = {
  can_view_finance: boolean;
  can_edit_grades: boolean;
  can_manage_attendance: boolean;
  can_manage_students: boolean;
  can_manage_exams: boolean;
  can_manage_subscriptions: boolean;
  can_view_results_only: boolean;
  can_edit_questions: boolean;
  can_live_monitor: boolean;
  can_print_reports: boolean;
  can_grade_essay: boolean;
};

export type Assistant = {
  id: string;
  username: string;
  pin: string;
  display_name: string | null;
  is_active: boolean;
  logins_count: number;
  last_login_at: string | null;
  can_view_finance: boolean;
  can_edit_grades: boolean;
  can_manage_attendance: boolean;
  can_manage_students: boolean;
  can_manage_exams: boolean;
  can_manage_subscriptions: boolean;
  can_view_results_only: boolean;
  can_edit_questions: boolean;
  can_live_monitor: boolean;
  can_print_reports: boolean;
  can_grade_essay: boolean;
  created_at: string;
};

export type Payment = {
  id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  note: string | null;
  recorded_by: string | null;
  recorded_at: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_name: string;
  actor_role: 'master' | 'assistant';
  action_type: string;
  target_student_id: string | null;
  amount: number | null;
  note: string | null;
  created_at: string;
};

export type Homework = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  due_date: string;
  created_at: string;
};

export type HomeworkStatusType = 'complete' | 'incomplete' | 'late';

export type HomeworkStatus = {
  id: string;
  homework_id: string;
  student_id: string;
  status: HomeworkStatusType;
  teacher_note: string | null;
  recorded_at: string;
};

export type BehaviorRating =
  | 'participatory'
  | 'quiet'
  | 'disruptive'
  | 'excellent'
  | 'needs_attention';

export type BehaviorEval = {
  id: string;
  student_id: string;
  group_id: string | null;
  rating: BehaviorRating;
  note: string | null;
  eval_date: string;
  created_at: string;
};

export type Settings = {
  id: string;
  platform_name: string;
  management_name: string;
  teacher_name: string;
  logo_url: string | null;
  teacher_photo_url: string | null;
  updated_at: string;
  master_pin: string;
  default_pin_active: boolean;
};

export type Certificate = {
  id: string;
  student_id: string;
  exam_title: string | null;
  score: number | null;
  max_score: number | null;
  serial_id: string;
  issued_at: string;
};

export type Session = {
  id: string;
  group_id: string;
  title: string;
  month: string;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: string;
};

export type MonthlyArchive = {
  id: string;
  group_id: string;
  month: string;
  archive_data: Record<string, unknown>;
  created_at: string;
};

export type HallOfFameEntry = {
  id: string;
  name: string;
  group_name: string | null;
  grade_name: string | null;
  stage_name: string | null;
  avg_score: number;
  exams_taken: number;
  attendance_rate: number;
};
