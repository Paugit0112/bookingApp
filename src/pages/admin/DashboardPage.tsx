import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  Users, CalendarCheck, ClipboardCheck, TrendingUp,
  Clock, CheckCircle2, XCircle, CalendarDays, BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
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
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
}

export default function AdminDashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: allAppointments, isLoading: apptLoading } = useAppointments()
  const { data: evaluations, isLoading: evalsLoading } = useAllEvaluations()
  const isLoading = apptLoading || evalsLoading

  const stats = useMemo(() => {
    const appts = allAppointments ?? []
    return {
      total:     appts.length,
      pending:   appts.filter(a => a.status === 'pending').length,
      approved:  appts.filter(a => a.status === 'approved').length,
      evaluated: appts.filter(a => a.status === 'evaluated').length,
      rejected:  appts.filter(a => a.status === 'rejected').length,
      cancelled: appts.filter(a => a.status === 'cancelled').length,
    }
  }, [allAppointments])

  const avgScore = useMemo(() => {
    const evals = evaluations ?? []
    if (!evals.length) return null
    return evals.reduce((s, e) => s + e.total_score, 0) / evals.length
  }, [evaluations])

  const recentAppointments = useMemo(() =>
    [...(allAppointments ?? [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6),
    [allAppointments]
  )

  const totalSlots = EXAM_DATES.length * 24

  const statCards = [
    {
      title: 'Total Bookings',
      value: stats.total,
      sub: `${totalSlots - stats.total} of ${totalSlots} slots remaining`,
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
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Recent Appointments
            </CardTitle>
            <CardDescription>Latest bookings across all exam dates</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {['a','b','c','d','e','f'].map(k => <Skeleton key={k} className="h-12" />)}
              </div>
            ) : recentAppointments.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-8">No appointments yet.</p>
            ) : (
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
  const booked = Number(stats?.total_booked ?? 0)
  const approved = Number(stats?.approved ?? 0)
  const evaluated = Number(stats?.evaluated ?? 0)
  const pct = (booked / 24) * 100
  const isPast = date < today
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
          : <span className="text-xs text-muted-foreground tabular-nums">{booked}/24 booked</span>
        }
      </div>
      {isLoading
        ? <Skeleton className="h-2 w-full rounded-full" />
        : <Progress value={pct} className="h-2" />
      }
      {!isLoading && booked > 0 && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="text-blue-600 dark:text-blue-400">{approved} approved</span>
          <span className="text-green-600 dark:text-green-400">{evaluated} evaluated</span>
        </div>
      )}
    </div>
  )
}
