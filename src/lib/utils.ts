import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date & Time Helpers ──────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy • h:mm a')
  } catch {
    return dateStr
  }
}

export function formatTime(time: string): string {
  try {
    const [hours, minutes] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes)
    return format(date, 'h:mm a')
  } catch {
    return time
  }
}

export function getRelativeDateLabel(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'MMMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function getAvailableTimeSlots(): string[] {
  // 9:00 AM – 6:40 PM, 20-minute intervals (30 slots, max 24 booked/day)
  const slots: string[] = []
  for (let total = 9 * 60; total <= 18 * 60 + 40; total += 20) {
    const h = Math.floor(total / 60)
    const m = total % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
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

export const MAX_BOOKINGS_PER_DAY = Number(import.meta.env.VITE_MAX_BOOKINGS_PER_DAY) || 24
