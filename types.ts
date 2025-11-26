
export type Role = 'aluno' | 'professor' | 'admin' | null;

export type BadgeTier = 'bronze' | 'silver' | 'gold';

// Lazy Loading Summary Type
export interface ClassSummary {
  id: string;
  name: string;
  code: string;
  studentCount: number;
  isArchived?: boolean; // New field for archiving
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  series?: string;
  avatarUrl?: string;
  myClassesSummary?: ClassSummary[]; // New field for optimized loading
}

export type UserStatus = 'Ativo' | 'Pendente' | 'Inativo';

export interface AdminUser extends User {
  registrationDate: string;
  status: UserStatus;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string; // for unlocked achievements
  points: number;
  unlocked: boolean;
  tier: BadgeTier;
  // Admin fields
  criterion?: string;
  criterionType?: 'modules' | 'quizzes' | 'activities';
  criterionCount?: number;
  category?: 'social' | 'learning' | 'engagement';
  rarity?: 'common' | 'rare' | 'epic';
  status?: 'Ativa' | 'Inativa';
}

// Novos tipos para a Fase 1 da Gamificação (Stat-Driven Architecture)
export interface UserGamificationStats {
  quizzesCompleted: number;
  modulesCompleted: number;
  activitiesCompleted: number;
  loginStreak: number;
  [key: string]: number; // Extensible
}

export interface UserAchievementsDoc {
  xp: number;
  level: number;
  stats: UserGamificationStats;
  unlocked: Record<string, { date: string; seen: boolean }>; // Map<AchievementID, Data>
  updatedAt?: any;
}

export interface ModuleProgress {
  id: string;
  name: string;
  progress: number;
  status: 'Concluído' | 'Em andamento';
}

export interface ClassInfo {
  id: string;
  name: string;
  code: string;
  studentCount: number;
  notices: number;
  activities: number;
}

export interface Notification {
  id: string;
  title: string;
  summary: string;
  urgency: 'low' | 'medium' | 'high';
  deepLink: { page: Page; id?: string };
  read: boolean;
  timestamp: string;
  userId?: string;
  groupCount?: number; // Novo campo para agrupamento
}

export interface UserStats {
  xp: number;
  level: number;
  xpForNextLevel: number;
  levelName: string;
}

// FIX: Added Page type export to resolve import errors across the application.
export type Page =
  // Student
  | 'dashboard'
  | 'modules'
  | 'quizzes'
  | 'activities'
  | 'achievements'
  | 'join_class'
  | 'profile'
  | 'notifications'
  | 'module_view'
  | 'boletim'
  | 'student_activity_view' // NEW PAGE
  // Teacher
  | 'teacher_dashboard'
  | 'teacher_main_dashboard'
  | 'teacher_create_module'
  | 'teacher_create_activity'
  | 'teacher_statistics'
  | 'teacher_pending_activities'
  | 'teacher_school_records'
  | 'teacher_repository'
  | 'teacher_module_repository' // New Page for Module Drafts
  | 'teacher_grading_view' // NEW PAGE FOR GRADING
  | 'class_view'
  // Admin
  | 'admin_dashboard'
  | 'admin_users'
  | 'admin_modules'
  | 'admin_quizzes'
  | 'admin_achievements'
  | 'admin_stats'
  | 'admin_tests'
  | 'admin_create_quiz'
  | 'admin_create_achievement'
  | 'admin_create_module'; // New admin specific page

// Module and Quiz Types
export type ModulePageContentType =
  | 'title'
  | 'paragraph'
  | 'list'
  | 'quote'
  | 'image'
  | 'video'
  | 'divider'
  | 'subtitle';

export interface ModulePageContent {
  type: ModulePageContentType;
  content: string | string[];
  alt?: string; // For images
  align?: 'left' | 'center' | 'right' | 'justify';
  color?: string; // For text color
}

export interface ModulePage {
  id: number;
  title: string;
  content: ModulePageContent[];
}

export interface QuizChoice {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  choices: QuizChoice[];
  correctAnswerId: string;
  mediaUrl?: string; // Optional URL for an image or YouTube video
}

export type ModuleStatus = 'Concluído' | 'Em progresso' | 'Não iniciado';
export type ModuleDownloadState = 'not_downloaded' | 'downloading' | 'downloaded';

export interface Module {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  videoUrl?: string;
  series?: string | string[]; // Updated to support array
  materia?: string | string[]; // Updated to support array
  subjects?: string[]; // Explicit support for subjects array
  difficulty?: 'Fácil' | 'Médio' | 'Difícil';
  duration?: string;
  visibility?: 'specific_class' | 'public';
  classIds?: string[];
  creatorId?: string;
  creatorName?: string; // Denormalized
  pages: ModulePage[];
  quiz: QuizQuestion[];
  status?: 'Ativo' | 'Inativo' | 'Rascunho'; // Added Rascunho
  progress?: number; // 0-100
  downloadState?: ModuleDownloadState;
  // Admin fields
  date?: string;
  createdAt?: any;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  visibility: 'public' | 'specific_class';
  classId?: string;
  questions: QuizQuestion[];
  attempts?: number;
  series?: string | string[]; // Updated to support array
  materia?: string | string[]; // Updated to support array
  subjects?: string[]; // Explicit support for subjects array
  // Admin fields
  createdBy?: string;
  date?: string;
  status?: 'Ativo' | 'Inativo';
  moduleId?: string;
}

// Activity Types
export type ActivityType = 'Mista' | 'Tarefa (Texto)' | 'Múltipla Escolha'; // Legacy support included

export type ActivityItemType = 'text' | 'multiple_choice';

export interface ActivityItem {
  id: string;
  type: ActivityItemType;
  question: string;
  points: number;
  // Fields for multiple choice
  options?: { id: string; text: string }[];
  correctOptionId?: string;
}

export interface ActivitySubmission {
  studentId: string;
  studentName: string;
  studentAvatarUrl?: string; // Denormalized
  studentSeries?: string; // Denormalized
  submissionDate: string;
  content: string; // Legacy text content or JSON string of answers
  answers?: Record<string, string>; // Map<ItemId, Answer (Text or OptionID)>
  status: 'Aguardando correção' | 'Corrigido' | 'Pendente Envio'; // Adicionado 'Pendente Envio' para offline
  grade?: number;
  feedback?: string;
  gradedAt?: string;
  scores?: Record<string, number>; // Map<ItemId, Score>
}

export type Unidade = '1ª Unidade' | '2ª Unidade' | '3ª Unidade' | '4ª Unidade';
export type Turno = 'matutino' | 'vespertino' | 'noturno';

export interface Activity {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  items?: ActivityItem[]; // New hybrid structure
  gradingConfig?: {
    objectiveQuestions: 'automatic' | 'manual';
  };
  
  classId?: string | null; // Optional for Drafts/Repository
  className?: string; // Denormalized
  creatorId?: string;
  creatorName?: string; // Denormalized
  unidade?: Unidade;
  materia?: string;
  dueDate?: string;
  points: number;
  attachments?: File[];
  attachmentFiles?: { name: string; url: string }[];
  imageUrl?: string;
  
  // Legacy fields (to maintain backward compatibility if needed, though items[] is preferred)
  questions?: QuizQuestion[]; 
  
  isVisible: boolean;
  allowLateSubmissions: boolean;
  submissions?: ActivitySubmission[];
  submissionCount?: number; // Denormalized
  pendingSubmissionCount?: number; // Denormalized
  date?: string;
  createdAt?: string | any; // Novo campo para Badge "Nova"
  moduleId?: string;
  status?: string; // 'Pendente' | 'Rascunho' | 'Ativo'
}

export interface PendingActivity {
    id: string;
    title: string;
    className: string;
    classId: string;
    pendingCount: number;
}

// Teacher-specific types
export interface Student {
  id: string;
  name: string;
  avatarUrl: string;
  xp: number;
  level: number;
  overallProgress: number; // percentage
  status?: 'active' | 'inactive'; // Added status
}

export interface ClassNotice {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface TeacherClass {
  id: string;
  name: string;
  code: string;
  students: Student[];
  studentCount?: number; // Denormalized Counter
  activityCount?: number; // Denormalized Counter
  moduleCount?: number; // Denormalized Counter
  noticeCount?: number; // Denormalized Counter
  modules: Module[];
  activities: Activity[];
  notices: ClassNotice[];
  teacherId: string;
  teachers?: string[]; // Array of teacher IDs for Multi-Teacher support (N:N)
  subjects?: Record<string, string>; // Map of teacherId -> Subject
  teacherNames?: Record<string, string>; // Denormalized Map of teacherId -> Name for UI
  isFullyLoaded?: boolean; // Lazy loading flag: true if detailed activities/sessions are loaded
  isSummaryOnly?: boolean; // New Flag: true if only ID/Name/Code loaded
  inactiveTeachers?: string[]; // List of teachers who have "left" (soft delete)
  isArchived?: boolean; // New Flag: Class is concluded/archived
}

// Class Invitation Type (Fase 4 - Confirmação)
export interface ClassInvitation {
  id: string;
  classId: string;
  className: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  inviteeEmail: string;
  subject: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
}

// Grade Report types for "Big Document" architecture
export interface GradeReportActivityDetail {
  id: string;
  title: string;
  grade: number;
  maxPoints: number;
  materia: string; // Ensure materia is tracked per activity
}

export interface GradeReportSubject {
  activities: GradeReportActivityDetail[];
  totalPoints: number;
}

export interface GradeReportUnidade {
  subjects: {
    [subjectName: string]: GradeReportSubject;
  };
}

export interface ClassGradeReport {
  className: string;
  unidades: {
    [key in Unidade]?: GradeReportUnidade;
  };
}

export interface GradeReport {
  [classId: string]: ClassGradeReport;
}

// Optimized Grade Document for Collection 'student_grades'
export interface StudentGradeSummaryDoc extends ClassGradeReport {
    studentId: string;
    classId: string;
    updatedAt: any; // Timestamp
}

// Attendance types
export interface AttendanceSession {
  id: string;
  classId: string;
  date: string; // ISO string date YYYY-MM-DD
  turno: Turno;
  horario: number; // 1-6
  createdBy: string; // teacherId
  createdAt: string; // ISO string timestamp
}

export type AttendanceStatus = 'presente' | 'ausente' | 'pendente';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string; // Denormalized for convenience
  status: AttendanceStatus;
  updatedAt: string; // ISO string timestamp
}

// --- Big Doc Types for new architecture ---

// Document stored at: teacher_history/{teacherId}
export interface TeacherHistoryDoc {
  classes: TeacherClass[];
  notifications: Notification[];
  attendanceSessions: AttendanceSession[];
}

// --- Offline & Sync Types ---
export type OfflineActionType = 'SUBMIT_ACTIVITY' | 'GRADE_ACTIVITY' | 'POST_NOTICE';

export interface OfflineAction {
    id: string;
    type: OfflineActionType;
    payload: any; // Generic payload depending on action type
    timestamp: number;
}
