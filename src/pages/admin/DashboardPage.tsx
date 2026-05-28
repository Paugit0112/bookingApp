import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users, CalendarCheck, ClipboardCheck, TrendingUp,
  Clock, CheckCircle2, XCircle, CalendarDays, BarChart3,
  Search, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminNavbar } from '@/components/shared/Adminnavbar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { api } from '@/lib/api'
import { useAppointments } from '@/hooks/useAppointments'
import { useAllEvaluations } from '@/hooks/useEvaluations'
import { EXAM_DATES, formatDate, formatTime, getScoreGrade, cn } from '@/lib/utils'

function useDayStats(date: string) {
  return useQuery({
    queryKey: ['dashboard-stats', date],
    queryFn: () => api.dashboard.stats(date),
    staleTime: 0,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  })
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
}

export default function AdminDashboardPage() {
  const today = new Date().toISOString().slice(0, 10)
  const { data: allAppointments, isLoading: apptLoading } = useAppointments()
  const { data: evaluations, isLoading: evalsLoading } = useAllEvaluations()
  const isLoading = apptLoading || evalsLoading

  const stats = useMemo(() => {
    const appts = allAppointments ?? []
    const pending   = appts.filter(a => a.status === 'pending').length
    const approved  = appts.filter(a => a.status === 'approved').length
    const evaluated = appts.filter(a => a.status === 'evaluated').length
    const rejected  = appts.filter(a => a.status === 'rejected').length
    const cancelled = appts.filter(a => a.status === 'cancelled').length
    return {
      total:     appts.length,
      pending, approved, evaluated, rejected, cancelled,
      active:    pending + approved + evaluated,
    }
  }, [allAppointments])

  const avgScore = useMemo(() => {
    const evals = evaluations ?? []
    if (!evals.length) return null
    return evals.reduce((s, e) => s + e.total_score, 0) / evals.length
  }, [evaluations])

  const [recentSearch, setRecentSearch] = useState('')
  const [recentStatus, setRecentStatus] = useState('all')
  const [recentDate, setRecentDate] = useState('all')
  const [recentPage, setRecentPage] = useState(1)

  const PAGE_SIZE = 10

  const filteredAll = useMemo(() => {
    const q = recentSearch.trim().toLowerCase()
    return [...(allAppointments ?? [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter(a => recentStatus === 'all' || a.status === recentStatus)
      .filter(a => recentDate === 'all' || a.appointment_date.slice(0, 10) === recentDate)
      .filter(a => !q || (a.students?.full_name ?? '').toLowerCase().includes(q) || (a.students?.student_id ?? '').toLowerCase().includes(q))
  }, [allAppointments, recentSearch, recentStatus, recentDate])

  const totalPages = Math.max(1, Math.ceil(filteredAll.length / PAGE_SIZE))

  const recentAppointments = useMemo(() => {
    const start = (recentPage - 1) * PAGE_SIZE
    return filteredAll.slice(start, start + PAGE_SIZE)
  }, [filteredAll, recentPage])

  const handleRecentSearch = (v: string) => { setRecentSearch(v); setRecentPage(1) }
  const handleRecentStatus = (v: string) => { setRecentStatus(v); setRecentPage(1) }
  const handleRecentDate   = (v: string) => { setRecentDate(v);   setRecentPage(1) }

  const totalSlots = EXAM_DATES.length * 24

  const statCards = [
    {
      title: 'Total Bookings',
      value: stats.active,
      sub: `${totalSlots - stats.active} of ${totalSlots} slots remaining`,
      icon: CalendarCheck,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Pending Approval',
      value: stats.pending,
      sub: 'Awaiting approval',
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-50 dark:bg-yellow-950',
    },
    {
      title: 'Evaluated',
      value: stats.evaluated,
      sub: `${evaluations?.length ?? 0} evaluations submitted`,
      icon: ClipboardCheck,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: 'Avg. Score',
      value: avgScore == null ? '—' : avgScore.toFixed(1),
      sub: avgScore == null ? 'No evaluations yet' : getScoreGrade(avgScore).grade,
      icon: TrendingUp,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-950',
    },
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminNavbar title="Dashboard" subtitle={`Overview · ${formatDate(today)}`} />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {statCards.map((card, i) => (
            <motion.div key={card.title} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
              <Card className="h-full">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{card.title}</p>
                      {isLoading
                        ? <Skeleton className="mt-1 h-8 w-16" />
                        : <p className="text-3xl font-bold mt-1">{card.value}</p>
                      }
                      <p className="text-xs text-muted-foreground mt-1 leading-tight">{card.sub}</p>
                    </div>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.bg}`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── Status Distribution ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Status Distribution
              </CardTitle>
              <CardDescription>All appointments across every exam date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading
                ? ['a','b','c','d','e'].map(k => <Skeleton key={k} className="h-8" />)
                : <>
                    <DistRow icon={<Clock />}         label="Pending"   count={stats.pending}   total={stats.total} colorClass="bg-yellow-400" />
                    <DistRow icon={<CheckCircle2 />}  label="Approved"  count={stats.approved}  total={stats.total} colorClass="bg-blue-400" />
                    <DistRow icon={<ClipboardCheck />} label="Evaluated" count={stats.evaluated} total={stats.total} colorClass="bg-green-400" />
                    <DistRow icon={<XCircle />}        label="Rejected"  count={stats.rejected}  total={stats.total} colorClass="bg-red-400" />
                    <DistRow icon={<XCircle />}        label="Cancelled" count={stats.cancelled} total={stats.total} colorClass="bg-gray-400" />
                  </>
              }
            </CardContent>
          </Card>

          {/* ── Exam Schedule ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Exam Schedule
              </CardTitle>
              <CardDescription>Slot fill rate per exam day (24 slots each)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {EXAM_DATES.map(date => (
                <ExamDayRow key={date} date={date} today={today} />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Recent Appointments ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Recent Appointments
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {isLoading
                    ? 'Loading…'
                    : filteredAll.length === 0
                    ? '0 records'
                    : `Showing ${(recentPage - 1) * PAGE_SIZE + 1}–${Math.min(recentPage * PAGE_SIZE, filteredAll.length)} of ${filteredAll.length}`}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name or ID…"
                    value={recentSearch}
                    onChange={e => handleRecentSearch(e.target.value)}
                    className="pl-8 h-8 text-xs w-full sm:w-44"
                  />
                </div>
                <Select value={recentStatus} onValueChange={handleRecentStatus}>
                  <SelectTrigger className="h-8 text-xs w-full sm:w-32 gap-1">
                    <Filter className="h-3.5 w-3.5 shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="evaluated">Evaluated</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={recentDate} onValueChange={handleRecentDate}>
                  <SelectTrigger className="h-8 text-xs w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    {EXAM_DATES.map(d => (
                      <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-3">
                {['a','b','c','d','e','f'].map(k => <Skeleton key={k} className="h-12" />)}
              </div>
            )}
            {!isLoading && recentAppointments.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-8">No appointments match the current filters.</p>
            )}
            {!isLoading && recentAppointments.length > 0 && (
              <>
                <div className="divide-y">
                  {recentAppointments.map(appt => {
                    const name = appt.students?.full_name ?? '—'
                    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <div key={appt.id} className="flex items-center justify-between py-3 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {appt.students?.student_id ?? '—'} &middot; {formatDate(appt.appointment_date)} &middot; {formatTime(appt.appointment_time)}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={appt.status} />
                      </div>
                    )
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-1">
                    <p className="text-xs text-muted-foreground">
                      Page {recentPage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={recentPage === 1}
                        onClick={() => setRecentPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      {getPageNumbers(recentPage, totalPages).map((p, i) =>
                        p === '...'
                          ? <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                          : <Button
                              key={p}
                              variant={p === recentPage ? 'default' : 'outline'}
                              size="icon"
                              className="h-7 w-7 text-xs"
                              onClick={() => setRecentPage(p)}
                            >
                              {p}
                            </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={recentPage === totalPages}
                        onClick={() => setRecentPage(p => p + 1)}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Quick Actions ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Appointments', href: '/admin/appointments', icon: CalendarCheck },
                { label: 'Evaluations',  href: '/admin/evaluations',  icon: ClipboardCheck },
                { label: 'Students',     href: '/admin/students',     icon: Users },
                { label: 'Reports',      href: '/admin/reports',      icon: BarChart3 },
              ].map(({ label, href, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="h-6 w-6 text-primary" />
                  {label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DistRow({
  icon, label, count, total, colorClass,
}: Readonly<{
  icon: React.ReactNode
  label: string
  count: number
  total: number
  colorClass: string
}>) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="[&>svg]:h-4 [&>svg]:w-4 text-muted-foreground shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{count} ({pct}%)</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', colorClass)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}

function ExamDayRow({ date, today }: Readonly<{ date: string; today: string }>) {
  const { data: stats, isLoading } = useDayStats(date)
  const approved  = Number(stats?.approved  ?? 0)
  const evaluated = Number(stats?.evaluated ?? 0)
  const confirmed = approved + evaluated
  const pct = (confirmed / 24) * 100
  const isPast  = date < today
  const isToday = date === today

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{formatDate(date)}</span>
          {isToday && <Badge className="text-[10px] px-1.5 py-0 h-4">Today</Badge>}
          {isPast && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Past</Badge>}
        </div>
        {isLoading
          ? <Skeleton className="h-4 w-16" />
          : <span className="text-xs text-muted-foreground tabular-nums">{confirmed}/24 booked</span>
        }
      </div>
      {isLoading
        ? <Skeleton className="h-2 w-full rounded-full" />
        : <Progress value={pct} className="h-2" />
      }
      {!isLoading && confirmed > 0 && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="text-blue-600 dark:text-blue-400">{approved} approved</span>
          <span className="text-green-600 dark:text-green-400">{evaluated} evaluated</span>
        </div>
      )}
    </div>
  )
}
