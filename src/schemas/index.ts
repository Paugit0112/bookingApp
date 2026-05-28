import { z } from 'zod'

// ─── Booking Form Schema ──────────────────────────────────────────────────────

export const bookingSchema = z.object({
  student_id: z
    .string()
    .min(5, 'Student ID must be at least 5 characters')
    .max(20, 'Student ID must be at most 20 characters')
    .regex(/^[A-Z0-9-]+$/i, 'Student ID must contain only letters, numbers, and hyphens'),
  appointment_date: z
    .string()
    .min(1, 'Please select an appointment date'),
  appointment_time: z
    .string()
    .min(1, 'Please select an appointment time'),
})

export type BookingSchema = z.infer<typeof bookingSchema>

// ─── Evaluation Form Schema ───────────────────────────────────────────────────

const scoreField = (max: number, label: string) =>
  z
    .number({ invalid_type_error: `${label} score is required` })
    .min(0, `${label} score cannot be negative`)
    .max(max, `${label} score cannot exceed ${max}`)

export const evaluationSchema = z.object({
  functionality_score: scoreField(15, 'Functionality'),
  data_structure_score: scoreField(15, 'Data Structures'),
  algorithm_score: scoreField(15, 'Algorithms'),
  file_handling_score: scoreField(10, 'File Handling'),
  dataset_score: scoreField(10, 'Dataset'),
  ui_score: scoreField(10, 'UI/UX'),
  code_quality_score: scoreField(10, 'Code Quality'),
  documentation_score: scoreField(10, 'Documentation'),
  presentation_score: scoreField(5, 'Presentation'),
  evaluator_comments: z
    .string()
    .min(10, 'Please provide at least 10 characters of feedback')
    .max(1000, 'Comments must be at most 1000 characters'),
  recommendation: z.enum(
    ['passed', 'passed_with_revisions', 'needs_major_revision', 'failed'],
    { required_error: 'Please select a recommendation' }
  ),
})

export type EvaluationSchema = z.infer<typeof evaluationSchema>

// ─── Admin Login Schema ───────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginSchema = z.infer<typeof loginSchema>

// ─── Appointment Lookup Schema ────────────────────────────────────────────────

export const lookupSchema = z.object({
  student_id: z
    .string()
    .min(5, 'Student ID must be at least 5 characters')
    .max(20, 'Student ID must be at most 20 characters'),
})

export type LookupSchema = z.infer<typeof lookupSchema>
