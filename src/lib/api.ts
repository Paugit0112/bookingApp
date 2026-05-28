// Local MySQL API client — replaces Supabase

const BASE = 'http://localhost:3002/api'

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

export function setToken(token: string) {
  localStorage.setItem('auth_token', token)
}

export function clearToken() {
  localStorage.removeItem('auth_token')
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = false
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? `Request failed: ${res.status}`)
  return json as T
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    async login(email: string, password: string) {
      return request<{ token: string; user: { id: string; email: string }; profile: AdminProfileRow }>(
        'POST', '/auth/login', { email, password }
      )
    },
    async me() {
      return request<AdminProfileRow>('GET', '/auth/me', undefined, true)
    },
    async updateProfile(full_name: string) {
      return request<AdminProfileRow>('PATCH', '/auth/profile', { full_name }, true)
    },
    async updatePassword(current_password: string, new_password: string) {
      return request<{ success: boolean }>('PATCH', '/auth/password', { current_password, new_password }, true)
    },
  },

  // ─── Slots ──────────────────────────────────────────────────────────────────
  slots: {
    async get(date: string) {
      return request<{ date: string; booked: number; remaining: number; is_full: boolean; booked_times: string[] }>(
        'GET', `/slots/${date}`
      )
    },
  },

  // ─── Booking ────────────────────────────────────────────────────────────────
  booking: {
    async create(payload: {
      student_id: string
      appointment_date: string
      appointment_time: string
    }) {
      return request<{ student: object; appointment: object }>('POST', '/book', payload)
    },
    async getByStudentId(studentId: string) {
      return request<StudentAppointmentResult | null>('GET', `/student/${studentId}/appointment`)
    },
    async withdraw(appointmentId: string, studentId: string) {
      return request<{ success: boolean }>('PATCH', `/appointments/${appointmentId}/withdraw`, { student_id: studentId })
    },
    async reschedule(appointmentId: string, payload: { student_id: string; appointment_date: string; appointment_time: string }) {
      return request<{ success: boolean }>('PATCH', `/appointments/${appointmentId}/reschedule`, payload)
    },
  },

  // ─── Appointments ────────────────────────────────────────────────────────────
  appointments: {
    async list(filters?: { status?: string; date?: string; search?: string }) {
      const params = new URLSearchParams()
      if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters?.date)   params.set('date', filters.date)
      if (filters?.search) params.set('search', filters.search)
      const qs = params.toString()
      return request<AppointmentRow[]>('GET', '/appointments' + (qs ? '?' + qs : ''), undefined, true)
    },
    async get(id: string) {
      return request<AppointmentRow>('GET', `/appointments/${id}`, undefined, true)
    },
    async updateStatus(id: string, status: string) {
      return request<{ success: boolean }>('PATCH', `/appointments/${id}/status`, { status }, true)
    },
    async delete(id: string) {
      return request<{ success: boolean }>('DELETE', `/appointments/${id}`, undefined, true)
    },
  },

  // ─── Students ────────────────────────────────────────────────────────────────
  students: {
    async list(search?: string) {
      const qs = search ? `?search=${encodeURIComponent(search)}` : ''
      return request<StudentRow[]>('GET', `/students${qs}`, undefined, true)
    },
    async update(id: string, payload: { full_name: string; student_id: string; section: string }) {
      return request<StudentRow>('PATCH', `/students/${id}`, payload, true)
    },
  },

  // ─── Evaluations ─────────────────────────────────────────────────────────────
  evaluations: {
    async get(appointmentId: string) {
      return request<EvaluationRow | null>('GET', `/evaluations/${appointmentId}`, undefined, true)
    },
    async list() {
      return request<EvaluationRow[]>('GET', '/evaluations', undefined, true)
    },
    async submit(payload: {
      appointment_id: string
      evaluator_id: string
      [key: string]: unknown
    }) {
      return request<EvaluationRow>('POST', '/evaluations', payload, true)
    },
  },

  // ─── Audit Logs ──────────────────────────────────────────────────────────────
  auditLogs: {
    async list() {
      return request<AuditLogRow[]>('GET', '/audit-logs', undefined, true)
    },
  },

  // ─── Settings ────────────────────────────────────────────────────────────────
  settings: {
    examDates: {
      async list() { return request<string[]>('GET', '/settings/exam-dates') },
      async add(date: string) { return request<{ success: boolean; exam_date: string }>('POST', '/settings/exam-dates', { exam_date: date }, true) },
      async remove(date: string) { return request<{ success: boolean }>('DELETE', `/settings/exam-dates/${date}`, undefined, true) },
    },
  },

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  dashboard: {
    async stats(date: string) {
      return request<DashboardStats>('GET', `/dashboard/stats/${date}`, undefined, true)
    },
  },
}

// ─── Row types ────────────────────────────────────────────────────────────────
import type { AppointmentStatus } from '@/types'

export interface AdminProfileRow {
  id: string
  full_name: string
  email: string
  role: 'evaluator' | 'admin' | 'super_admin'
  created_at: string
}

export interface StudentRow {
  id: string
  full_name: string
  student_id: string
  section: string
  email?: string
  created_at: string
}

export interface AppointmentRow {
  id: string
  student_id: string
  appointment_date: string
  appointment_time: string
  status: AppointmentStatus
  created_at: string
  students?: StudentRow
}

export interface EvaluationRow {
  id: string
  appointment_id: string
  evaluator_id: string
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
  recommendation: string
  evaluated_at: string
  evaluator_name?: string
  appointments?: {
    id: string
    appointment_date: string
    appointment_time: string
    status: string
    students?: { full_name: string; student_id: string; section: string }
  }
}

export interface AuditLogRow {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string
  metadata?: unknown
  created_at: string
}

export interface DashboardStats {
  total_booked: number
  pending: number
  approved: number
  evaluated: number
  rejected: number
  cancelled: number
  avg_score: number | null
}

export interface StudentAppointmentResult {
  student: StudentRow
  appointment: AppointmentRow
  evaluation: EvaluationRow | null
}
