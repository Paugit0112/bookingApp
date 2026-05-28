import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ClipboardCheck, Download, Search, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminNavbar } from '@/components/shared/Adminnavbar'
import { useAllEvaluations } from '@/hooks/useEvaluations'
import { cn, formatDate, formatTime, getScoreGrade } from '@/lib/utils'
import { useExamDates } from '@/hooks/useExamDates'
import { RECOMMENDATION_LABELS, RECOMMENDATION_COLORS } from '@/types'
import type { Recommendation } from '@/types'
import { generateEvaluationReportPDF } from '@/lib/pdf'

const SCORE_RANGES = [
  { value: 'all',  label: 'All Scores' },
  { value: '90',   label: '90 – 100 (Excellent)' },
  { value: '80',   label: '80 – 89 (Very Good)' },
  { value: '70',   label: '70 – 79 (Good)' },
  { value: 'low',  label: 'Below 70' },
]

const SECTIONS = ['AD1', 'BLM1', 'CM1', 'EN1']

function inScoreRange(score: number, range: string): boolean {
  if (range === '90')  return score >= 90
  if (range === '80')  return score >= 80 && score < 90
  if (range === '70')  return score >= 70 && score < 80
  if (range === 'low') return score < 70
  return true
}

export default function EvaluationsPage() {
  const { data: examDates = [] } = useExamDates()
  const [search,      setSearch]      = useState('')
  const [recFilter,   setRecFilter]   = useState('all')
  const [scoreRange,  setScoreRange]  = useState('all')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [dateFilter,  setDateFilter]  = useState('all')

  const { data: evaluations, isLoading } = useAllEvaluations()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (evaluations ?? []).filter((ev) => {
      const student     = (ev.appointments as any)?.students
      const appointment = ev.appointments as any
      const score       = Number(ev.total_score)
      return (
        (!q || student?.full_name?.toLowerCase().includes(q) || student?.student_id?.toLowerCase().includes(q)) &&
        (recFilter === 'all'      || ev.recommendation === recFilter) &&
        (sectionFilter === 'all'  || student?.section === sectionFilter) &&
        (dateFilter === 'all'     || appointment?.appointment_date?.slice(0, 10) === dateFilter) &&
        inScoreRange(score, scoreRange)
      )
    })
  }, [evaluations, search, recFilter, sectionFilter, dateFilter, scoreRange])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminNavbar title="Evaluations" subtitle={`${filtered?.length ?? 0} completed`} />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
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
                onClick={() => filtered.length > 0 && generateEvaluationReportPDF(filtered as any[])}
                disabled={filtered.length === 0}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={recFilter} onValueChange={setRecFilter}>
                <SelectTrigger className="h-8 text-xs w-44 gap-1">
                  <Filter className="h-3.5 w-3.5 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Recommendations</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="passed_with_revisions">Passed with Revisions</SelectItem>
                  <SelectItem value="needs_major_revision">Needs Major Revision</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={scoreRange} onValueChange={setScoreRange}>
                <SelectTrigger className="h-8 text-xs w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCORE_RANGES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {SECTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  {examDates.map(d => (
                    <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? ['a','b','c','d','e','f'].map(k => <Skeleton key={k} className="h-56 rounded-lg" />)
            : filtered?.map((ev) => {
                const student = (ev.appointments as any)?.students
                const appointment = ev.appointments as any
                const totalScore = Number(ev.total_score)
                const grade = getScoreGrade(totalScore)
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
                            {totalScore.toFixed(1)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Progress value={totalScore} className="h-2" />
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
