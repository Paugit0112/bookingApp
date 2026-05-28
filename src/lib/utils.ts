import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date & Time Helpers ──────────────────────────────────────────────────────

function toLocalDate(dateStr: string): Date {
  // Slice to "YYYY-MM-DD" so MySQL ISO timestamps don't break the constructor
  return new Date(dateStr.slice(0, 10) + 'T00:00:00')
}

export function formatDate(dateStr: string): string {
  try {
    return toLocalDate(dateStr).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${datePart} • ${timePart}`
  } catch {
    return dateStr
  }
}

export function formatTime(time: string): string {
  try {
    const [hours, minutes] = time.split(':').map(Number)
    const d = new Date()
    d.setHours(hours, minutes, 0, 0)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return time
  }
}

export function getRelativeDateLabel(dateStr: string): string {
  try {
    const date = toLocalDate(dateStr)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    if (date.getTime() === today.getTime()) return 'Today'
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function getAvailableTimeSlots(): string[] {
  // 9:00–11:40 AM, 1:00–4:40 PM (lunch 12:00–12:40 excluded), 5:00–6:20 PM → 26 slots
  const ranges = [
    { from: 9 * 60,  to: 11 * 60 + 40 },
    { from: 13 * 60, to: 16 * 60 + 40 },
    { from: 17 * 60, to: 18 * 60 + 20 },
  ]
  const slots: string[] = []
  for (const { from, to } of ranges) {
    for (let total = from; total <= to; total += 20) {
      const h = Math.floor(total / 60)
      const m = total % 60
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

export const VENUE = 'Faculty Room'

export const EXAM_DATES = [
  '2026-05-29',
  '2026-05-30',
  '2026-06-01',
  '2026-06-05',
  '2026-06-06',
]

// ─── Score Helpers ────────────────────────────────────────────────────────────

export function getScoreGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: 'Excellent', color: 'text-green-600' }
  if (score >= 80) return { grade: 'Very Good', color: 'text-blue-600' }
  if (score >= 70) return { grade: 'Good', color: 'text-yellow-600' }
  if (score >= 60) return { grade: 'Satisfactory', color: 'text-orange-600' }
  return { grade: 'Needs Improvement', color: 'text-red-600' }
}

export function computeTotalScore(scores: Record<string, number>): number {
  return Object.values(scores).reduce((sum, v) => sum + (Number(v) || 0), 0)
}

// ─── String Helpers ───────────────────────────────────────────────────────────

export function formatStudentId(id: string): string {
  return id.toUpperCase()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str
}

// ─── Status Badge Helpers ─────────────────────────────────────────────────────

export const STATUS_CONFIG = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-200' },
  evaluated: { label: 'Evaluated', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 border-gray-200' },
} as const

export const MAX_BOOKINGS_PER_DAY = Number(import.meta.env.VITE_MAX_BOOKINGS_PER_DAY) || 26
