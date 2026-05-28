import { useQuery } from '@tanstack/react-query'
import { BarChart3, Users, ClipboardCheck, CalendarDays, TrendingUp, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminNavbar } from '@/components/shared/Adminnavbar'
import { api } from '@/lib/api'
import { EXAM_DATES, formatDate, getScoreGrade, cn } from '@/lib/utils'
import { generateEvaluationReportPDF } from '@/lib/pdf'
import { useAllEvaluations } from '@/hooks/useEvaluations'

function useDayStats(date: string) {
  return useQuery({
    queryKey: ['dashboard-stats', date],
    queryFn: () => api.dashboard.stats(date),
    staleTime: 30_000,
  })
}

function DayCard({ date }: { readonly date: string }) {
  const { data: stats, isLoading } = useDayStats(date)

  const total   = Number(stats?.total_booked ?? 0)
  const pending  = Number(stats?.pending ?? 0)
  const approved = Number(stats?.approved ?? 0)
  const evaluated = Number(stats?.evaluated ?? 0)
  const rejected = Number(stats?.rejected ?? 0)
  const cancelled = Number(stats?.cancelled ?? 0)
  const avgScore = stats?.avg_score ? Number(stats.avg_score) : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {formatDate(date)}
          </span>
          {isLoading ? (
            <Skeleton className="h-4 w-12" />
          ) : (
            <span className="text-xs font-normal text-muted-foreground">{total}/24 booked</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ) : (
          <>
            <Progress value={(total / 24) * 100} className="h-2" />
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-950 py-1.5">
                <p className="font-bold text-yellow-700 dark:text-yellow-300">{pending}</p>
                <p className="text-yellow-600 dark:text-yellow-400">Pending</p>
              </div>
              <div className="rounded-md bg-blue-50 dark:bg-blue-950 py-1.5">
                <p className="font-bold text-blue-700 dark:text-blue-300">{approved}</p>
                <p className="text-blue-600 dark:text-blue-400">Approved</p>
              </div>
              <div className="rounded-md bg-green-50 dark:bg-green-950 py-1.5">
                <p className="font-bold text-green-700 dark:text-green-300">{evaluated}</p>
                <p className="text-green-600 dark:text-green-400">Evaluated</p>
              </div>
            </div>
            {(rejected > 0 || cancelled > 0) && (
              <p className="text-xs text-muted-foreground text-center">
                {rejected > 0 && `${rejected} rejected`}
                {rejected > 0 && cancelled > 0 && ' · '}
                {cancelled > 0 && `${cancelled} cancelled`}
              </p>
            )}
            {avgScore != null && (
              <div className="flex items-center justify-between text-xs border-t pt-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Avg. Score
                </span>
                <span className={cn('font-bold', getScoreGrade(avgScore).color)}>
                  {avgScore.toFixed(1)} — {getScoreGrade(avgScore).grade}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function ReportsPage() {
  const { data: evaluations, isLoading: evalsLoading } = useAllEvaluations()

  const totalEvaluated = evaluations?.length ?? 0
  const avgOverall = totalEvaluated > 0
    ? evaluations!.reduce((s, e) => s + e.total_score, 0) / totalEvaluated
    : null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminNavbar title="Reports" subtitle="Presentation schedule summary" />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">

        {/* Overall summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 text-center space-y-1">
              <Users className="h-6 w-6 mx-auto text-primary" />
              <p className="text-2xl font-bold">{EXAM_DATES.length}</p>
              <p className="text-xs text-muted-foreground">Exam Days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 text-center space-y-1">
              <CalendarDays className="h-6 w-6 mx-auto text-blue-500" />
              <p className="text-2xl font-bold">{EXAM_DATES.length * 24}</p>
              <p className="text-xs text-muted-foreground">Total Slots</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="pt-5 text-center space-y-1">
              <ClipboardCheck className="h-6 w-6 mx-auto text-green-500" />
              {evalsLoading ? (
                <Skeleton className="h-8 w-12 mx-auto" />
              ) : (
                <p className="text-2xl font-bold">
                  {avgOverall != null ? avgOverall.toFixed(1) : '—'}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Overall Avg. Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Per-day breakdown */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Per-Day Breakdown
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {EXAM_DATES.map((date) => (
              <DayCard key={date} date={date} />
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="gap-2"
            disabled={!evaluations?.length}
            onClick={() => evaluations?.length && generateEvaluationReportPDF(evaluations as any[])}
          >
            <Download className="h-4 w-4" />
            Export All Evaluations PDF
          </Button>
        </div>

      </div>
    </div>
  )
}
