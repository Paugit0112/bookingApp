// ─── Core Domain Types ────────────────────────────────────────────────────────

export interface Student {
  id: string
  full_name: string
  student_id: string
  section: string
  email?: string
  created_at: string
}

export interface Appointment {
  id: string
  student_id: string
  appointment_date: string       // ISO date string: YYYY-MM-DD
  appointment_time: string       // HH:MM format
  status: AppointmentStatus
  created_at: string
  students?: Student             // joined from students table
}

export type AppointmentStatus = 'pending' | 'approved' | 'rejected' | 'evaluated' | 'cancelled'

export interface Evaluation {
  id: string
  appointment_id: string
  evaluator_id: string

  // Scores (each category has max points defined in CHECKLIST_CRITERIA)
  functionality_score: number
  data_structure_score: number
  algorithm_score: number
  file_handling_score: number
  dataset_score: number
  ui_score: number
  code_quality_score: number
  documentation_score: number
  presentation_score: number

  total_score: number
  evaluator_comments: string
  recommendation: Recommendation
  evaluated_at: string

  appointments?: Appointment     // joined
}

export type Recommendation =
  | 'passed'
  | 'passed_with_revisions'
  | 'needs_major_revision'
  | 'failed'

export interface AuditLog {
  id: string
  admin_id: string
  action: string
  target_type: 'appointment' | 'evaluation' | 'student'
  target_id: string
  metadata?: Record<string, unknown>
  created_at: string
}

// ─── Booking Slot Types ───────────────────────────────────────────────────────

export interface DailySlotInfo {
  date: string
  booked: number
  remaining: number
  is_full: boolean
}

// ─── Evaluation Checklist ─────────────────────────────────────────────────────

export interface ChecklistCriterion {
  key: keyof EvaluationScores
  label: string
  maxScore: number
  description: string
  subcriteria?: string[]
}

export interface EvaluationScores {
  functionality_score: number
  data_structure_score: number
  algorithm_score: number
  file_handling_score: number
  dataset_score: number
  ui_score: number
  code_quality_score: number
  documentation_score: number
  presentation_score: number
}

export const CHECKLIST_CRITERIA: ChecklistCriterion[] = [
  {
    key: 'functionality_score',
    label: 'Functionality and Completeness',
    maxScore: 15,
    description: 'The system performs all required features and functions correctly.',
    subcriteria: [
      'All required features are implemented',
      'System functions without critical errors',
      'Edge cases are handled properly',
    ],
  },
  {
    key: 'data_structure_score',
    label: 'Implementation of Data Structures',
    maxScore: 15,
    description: 'Appropriate data structures are used effectively throughout the project.',
    subcriteria: [
      'Correct choice of data structures',
      'Efficient use of arrays, lists, stacks, queues, trees, etc.',
      'Proper implementation and traversal',
    ],
  },
  {
    key: 'algorithm_score',
    label: 'Implementation of Algorithms',
    maxScore: 15,
    description: 'Algorithms are correctly implemented and optimized for the task.',
    subcriteria: [
      'Sorting and searching algorithms are correct',
      'Algorithm complexity is considered',
      'Custom algorithms solve the problem effectively',
    ],
  },
  {
    key: 'file_handling_score',
    label: 'File Handling',
    maxScore: 10,
    description: 'The system reads from and writes to files correctly.',
    subcriteria: [
      'Files are opened, read, and closed properly',
      'Error handling for file operations',
      'Data persistence is maintained',
    ],
  },
  {
    key: 'dataset_score',
    label: '100+ Record Dataset',
    maxScore: 10,
    description: 'The project uses a dataset with at least 100 records.',
    subcriteria: [
      'Dataset has 100 or more records',
      'Data is relevant and realistic',
      'Data is properly loaded and used',
    ],
  },
  {
    key: 'ui_score',
    label: 'User Interface and Usability',
    maxScore: 10,
    description: 'The user interface is intuitive, well-designed, and user-friendly.',
    subcriteria: [
      'Clean and organized layout',
      'Intuitive navigation and workflow',
      'Responsive to user interactions',
    ],
  },
  {
    key: 'code_quality_score',
    label: 'Code Quality and Modularity',
    maxScore: 10,
    description: 'Code is well-organized, readable, and follows best practices.',
    subcriteria: [
      'Meaningful variable and function names',
      'Code is modular and reusable',
      'No unnecessary repetition (DRY principle)',
    ],
  },
  {
    key: 'documentation_score',
    label: 'Documentation',
    maxScore: 10,
    description: 'The project is well-documented with inline comments and a readme.',
    subcriteria: [
      'Inline code comments are present',
      'README/documentation file exists',
      'System design is explained',
    ],
  },
  {
    key: 'presentation_score',
    label: 'Presentation and Demonstration',
    maxScore: 5,
    description: 'The student can clearly explain and demonstrate the project.',
    subcriteria: [
      'Clear explanation of project',
      'Able to demonstrate features confidently',
      'Answers questions adequately',
    ],
  },
]

export const MAX_TOTAL_SCORE = CHECKLIST_CRITERIA.reduce((sum, c) => sum + c.maxScore, 0) // 100

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  passed: 'Passed',
  passed_with_revisions: 'Passed with Revisions',
  needs_major_revision: 'Needs Major Revision',
  failed: 'Failed',
}

export const RECOMMENDATION_COLORS: Record<Recommendation, string> = {
  passed: 'text-green-600 bg-green-50 border-green-200',
  passed_with_revisions: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  needs_major_revision: 'text-orange-600 bg-orange-50 border-orange-200',
  failed: 'text-red-600 bg-red-50 border-red-200',
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface AdminProfile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'evaluator' | 'super_admin'
  created_at: string
}

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface BookingFormData {
  full_name: string
  student_id: string
  section: string
  appointment_date: string
  appointment_time: string
}

export interface EvaluationFormData extends EvaluationScores {
  evaluator_comments: string
  recommendation: Recommendation
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export interface BookingConfirmation {
  student: Student
  appointment: Appointment
}

export interface TableFilters {
  search: string
  status?: AppointmentStatus | 'all'
  date?: string
}
