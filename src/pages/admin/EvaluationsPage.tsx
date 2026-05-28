import { useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardCheck, Download, Search, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminNavbar } from '@/components/shared/Adminnavbar'
import { useAllEvaluations } from '@/hooks/useEvaluations'
import { cn, formatDate, formatTime, getScoreGrade } from '@/lib/utils'
import { RECOMMENDATION_LABELS, RECOMMENDATION_COLORS } from '@/types'
import type { Recommendation } from '@/types'
import { generateEvaluationReportPDF } from '@/lib/pdf'

export default function EvaluationsPage() {
  const [search, setSearch] = useState('')
  const { data: evaluations, isLoading } = useAllEvaluations()

  const filtered = evaluations?.filter((ev) => {
    const student = (ev.appointments as any)?.students
    if (!search) return true
    const q = search.toLowerCase()
    return (
      student?.full_name?.toLowerCase().includes(q) ||
      student?.student_id?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminNavbar title="Evaluations" subtitle={`${filtered?.length ?? 0} completed`} />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
        {/* Search */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or student ID..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                className="gap-2 shrink-0"
                onClick={() => evaluations && generateEvaluationReportPDF(evaluations as any[])}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)
            : filtered?.map((ev) => {
                const student = (ev.appointments as any)?.students
                const appointment = ev.appointments as any
                const grade = getScoreGrade(ev.total_score)
                const rec = ev.recommendation as Recommendation

                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{student?.full_name}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {student?.student_id} · {student?.section}
                            </p>
                          </div>
                          <span className="text-2xl font-bold text-primary tabular-nums">
                            {ev.total_score.toFixed(1)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Progress value={ev.total_score} className="h-2" />
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn('font-medium', grade.color)}>{grade.grade}</span>
                          <span className="text-muted-foreground">
                            {formatDate(appointment?.appointment_date)} · {formatTime(appointment?.appointment_time)}
                          </span>
                        </div>
                        <div
                          className={cn(
                            'rounded-md border px-3 py-1.5 text-xs font-semibold text-center',
                            RECOMMENDATION_COLORS[rec]
                          )}
                        >
                          {RECOMMENDATION_LABELS[rec]}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5"
                          onClick={() => generateEvaluationReportPDF([ev as any])}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download Report
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
        </div>

        {!isLoading && filtered?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/40" />
              <p className="font-medium">No evaluations found</p>
              <p className="text-sm text-muted-foreground">
                Evaluations will appear here once projects are graded.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
