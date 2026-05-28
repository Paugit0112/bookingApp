import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Search, Calendar, Clock, User, CreditCard, BookOpen,
  CheckCircle2, XCircle, ClipboardCheck,
  Download, Moon, Sun, ArrowLeft, MapPin, LogOut, Hash, Award, Pencil,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { lookupSchema, type LookupSchema } from '@/schemas'
import { useStudentAppointment } from '@/hooks/useAppointments'
import { useExamDates } from '@/hooks/useExamDates'
import { useDailySlots } from '@/hooks/useSlots'
import { useTheme } from '@/components/shared/ThemeProvider'
import { formatDate, formatTime, getScoreGrade, cn, VENUE, getAvailableTimeSlots } from '@/lib/utils'
import { CHECKLIST_CRITERIA, RECOMMENDATION_LABELS, RECOMMENDATION_COLORS } from '@/types'
import { generateAppointmentSlipPDF } from '@/lib/pdf'
import { api } from '@/lib/api'
import type { Recommendation, AppointmentStatus } from '@/types'

export default function StudentDashboardPage() {
  const { resolvedTheme, setTheme } = useTheme()
  const [searchParams] = useSearchParams()
  const [lookupId, setLookupId] = useState<string | null>(
    searchParams.get('sid') ?? null
  )
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [isRescheduling, setIsRescheduling] = useState(false)

  const { data, isLoading, refetch } = useStudentAppointment(lookupId)
  const { data: examDates } = useExamDates()
  const { data: slotInfo } = useDailySlots(rescheduleDate)

  const TIME_SLOTS = getAvailableTimeSlots()

  const appointmentDeadline = useMemo(() => {
    if (!data?.appointment) return null
    const { appointment_date, appointment_time } = data.appointment
    const [y, mo, d] = appointment_date.slice(0, 10).split('-').map(Number)
    const [h, m] = appointment_time.slice(0, 5).split(':').map(Number)
    const scheduled = new Date(y, mo - 1, d, h, m)
    return {
      withdraw: new Date(scheduled.getTime() - 3 * 60 * 60 * 1000),
      reschedule: new Date(scheduled.getTime() - 2 * 60 * 60 * 1000),
    }
  }, [data])

  const withdrawDeadline = appointmentDeadline?.withdraw ?? null

  const canWithdraw = useMemo(() => {
    if (!data?.appointment || !appointmentDeadline) return false
    if (!['pending', 'approved'].includes(data.appointment.status)) return false
    return new Date() < appointmentDeadline.withdraw
  }, [data, appointmentDeadline])

  const canReschedule = useMemo(() => {
    if (!data?.appointment || !appointmentDeadline) return false
    if (!['pending', 'approved'].includes(data.appointment.status)) return false
    return new Date() < appointmentDeadline.reschedule
  }, [data, appointmentDeadline])

  const handleWithdraw = async () => {
    if (!data?.appointment || !lookupId) return
    setIsWithdrawing(true)
    try {
      await api.booking.withdraw(data.appointment.id, lookupId)
      toast.success('Appointment withdrawn successfully.')
      refetch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Withdrawal failed'
      if (msg.includes('WITHDRAWAL_DEADLINE')) {
        toast.error('Withdrawal deadline has passed (3 hours before your slot).')
      } else {
        toast.error(msg)
      }
    } finally {
      setIsWithdrawing(false)
    }
  }

  const handleReschedule = async () => {
    if (!data?.appointment || !lookupId || !rescheduleDate || !rescheduleTime) return
    setIsRescheduling(true)
    try {
      await api.booking.reschedule(data.appointment.id, {
        student_id: lookupId,
        appointment_date: rescheduleDate,
        appointment_time: rescheduleTime,
      })
      toast.success('Appointment rescheduled successfully.')
      setShowReschedule(false)
      setRescheduleDate('')
      setRescheduleTime('')
      refetch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reschedule failed'
      if (msg.includes('RESCHEDULE_DEADLINE')) {
        toast.error('Cannot reschedule within 2 hours of your scheduled time.')
      } else if (msg.includes('SLOT_TAKEN')) {
        toast.error('That time slot is already taken. Please choose another.')
      } else if (msg.includes('SLOT_FULL')) {
        toast.error('No remaining slots for that date. Please choose another date.')
      } else {
        toast.error(msg)
      }
    } finally {
      setIsRescheduling(false)
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupSchema>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { student_id: searchParams.get('sid') ?? '' },
  })

  const onLookup = (values: LookupSchema) => {
    setLookupId(values.student_id.toUpperCase())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <a href="/booking"><ArrowLeft className="h-4 w-4" /></a>
            </Button>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="CSU ITE14 Logo" className="h-8 w-8 rounded-full object-cover" />
              <span className="font-bold text-sm">My Appointment</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
        {/* Lookup Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Find Your Appointment
            </CardTitle>
            <CardDescription>Enter your Student ID to view your booking and evaluation.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onLookup)} className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Enter your Student ID (e.g., 2021-00123)"
                  {...register('student_id')}
                  className="uppercase"
                />
                {errors.student_id && (
                  <p className="text-xs text-destructive">{errors.student_id.message}</p>
                )}
              </div>
              <Button type="submit">Search</Button>
            </form>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DashboardSkeleton />
            </motion.div>
          )}

          {!isLoading && lookupId && !data && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-destructive/30">
                <CardContent className="flex flex-col items-center gap-3 py-10">
                  <XCircle className="h-12 w-12 text-destructive/60" />
                  <p className="font-medium">No booking found</p>
                  <p className="text-sm text-muted-foreground text-center">
                    No active appointment was found for Student ID <strong>{lookupId}</strong>.
                    Please check your ID or{' '}
                    <a href="/booking" className="text-primary underline">book an appointment</a>.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {data && !isLoading && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <Tabs defaultValue={data.evaluation ? 'evaluation' : 'appointment'}>
                <TabsList className="w-full">
                  <TabsTrigger value="appointment" className="flex-1 gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Appointment
                  </TabsTrigger>
                  <TabsTrigger value="evaluation" className="flex-1 gap-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    Evaluation
                    {data.evaluation && (
                      <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* ── Appointment Tab ── */}
                <TabsContent value="appointment" className="mt-4 space-y-4">
                  <AppointmentSlip
                    student={data.student}
                    appointment={data.appointment}
                    canWithdraw={canWithdraw}
                    isWithdrawing={isWithdrawing}
                    withdrawDeadline={withdrawDeadline}
                    canReschedule={canReschedule}
                    onWithdraw={handleWithdraw}
                    onReschedule={() => setShowReschedule(true)}
                    onDownload={() => generateAppointmentSlipPDF(data.student, data.appointment)}
                  />
                </TabsContent>

                {/* ── Evaluation Tab ── */}
                <TabsContent value="evaluation" className="mt-4">
                  {data.evaluation ? (
                    <EvaluationResults evaluation={data.evaluation} />
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center gap-3 py-10">
                        <ClipboardCheck className="h-10 w-10 text-muted-foreground/50" />
                        <p className="font-medium">No evaluation yet</p>
                        <p className="text-sm text-muted-foreground text-center">
                          Your project evaluation results will appear here once completed by the evaluator.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Reschedule Dialog ── */}
      <Dialog open={showReschedule} onOpenChange={open => { if (!open) { setShowReschedule(false); setRescheduleDate(''); setRescheduleTime('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time. You cannot reschedule within 2 hours of your current slot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Date selection */}
            <div className="space-y-1.5">
              <Label>New Date</Label>
              <Select value={rescheduleDate} onValueChange={v => { setRescheduleDate(v); setRescheduleTime('') }}>
                <SelectTrigger><SelectValue placeholder="Select a date" /></SelectTrigger>
                <SelectContent>
                  {(examDates ?? []).map(d => (
                    <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Slot availability note for selected date */}
              {rescheduleDate && slotInfo && (
                <div className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-xs border',
                  slotInfo.is_full
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                    : 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                )}>
                  {slotInfo.is_full
                    ? <><XCircle className="h-3.5 w-3.5 shrink-0" /><span>Fully booked — select another date.</span></>
                    : <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span>{slotInfo.remaining} of 26 slots remaining.</span></>
                  }
                </div>
              )}
            </div>

            {/* Time selection — only when date is chosen and not full */}
            {rescheduleDate && slotInfo && !slotInfo.is_full && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>New Time</Label>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                      <span>Available</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
                      <span>Taken</span>
                    </span>
                  </div>
                </div>
                <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                  <SelectTrigger><SelectValue placeholder="Select a time slot" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Morning (9:00 AM – 11:40 AM)</SelectLabel>
                      {TIME_SLOTS.filter(t => Number.parseInt(t.split(':')[0]) < 12).map(t => {
                        const taken = (slotInfo?.booked_times ?? []).includes(t)
                        return (
                          <SelectItem key={t} value={t} disabled={taken}>
                            <div className="flex items-center gap-2 w-full">
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${taken ? 'bg-red-400' : 'bg-green-500'}`} />
                              <span className={taken ? 'line-through text-muted-foreground' : ''}>{formatTime(t)}</span>
                              <span className={`ml-4 text-xs ${taken ? 'text-red-400' : 'text-green-500'}`}>{taken ? 'Taken' : 'Available'}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Afternoon (1:00 PM – 4:40 PM)</SelectLabel>
                      {TIME_SLOTS.filter(t => { const h = Number.parseInt(t.split(':')[0]); return h >= 13 && h < 17 }).map(t => {
                        const taken = (slotInfo?.booked_times ?? []).includes(t)
                        return (
                          <SelectItem key={t} value={t} disabled={taken}>
                            <div className="flex items-center gap-2 w-full">
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${taken ? 'bg-red-400' : 'bg-green-500'}`} />
                              <span className={taken ? 'line-through text-muted-foreground' : ''}>{formatTime(t)}</span>
                              <span className={`ml-4 text-xs ${taken ? 'text-red-400' : 'text-green-500'}`}>{taken ? 'Taken' : 'Available'}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Evening (5:00 PM – 6:20 PM)</SelectLabel>
                      {TIME_SLOTS.filter(t => Number.parseInt(t.split(':')[0]) >= 17).map(t => {
                        const taken = (slotInfo?.booked_times ?? []).includes(t)
                        return (
                          <SelectItem key={t} value={t} disabled={taken}>
                            <div className="flex items-center gap-2 w-full">
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${taken ? 'bg-red-400' : 'bg-green-500'}`} />
                              <span className={taken ? 'line-through text-muted-foreground' : ''}>{formatTime(t)}</span>
                              <span className={`ml-4 text-xs ${taken ? 'text-red-400' : 'text-green-500'}`}>{taken ? 'Taken' : 'Available'}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReschedule(false)} disabled={isRescheduling}>Cancel</Button>
            <Button
              onClick={handleReschedule}
              disabled={!rescheduleDate || !rescheduleTime || isRescheduling || !!slotInfo?.is_full}
            >
              {isRescheduling ? 'Saving…' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function makeBookingRef(id: string): string {
  return `ITE14-${id.slice(0, 3).toUpperCase()}${id.slice(9, 12).toUpperCase()}`
}

interface AppointmentSlipProps {
  student: { full_name: string; student_id: string; section: string }
  appointment: { id: string; appointment_date: string; appointment_time: string; status: AppointmentStatus }
  canWithdraw: boolean
  isWithdrawing: boolean
  withdrawDeadline: Date | null
  canReschedule: boolean
  onWithdraw: () => void
  onReschedule: () => void
  onDownload: () => void
}

function AppointmentSlip({
  student, appointment, canWithdraw, isWithdrawing, withdrawDeadline,
  canReschedule, onWithdraw, onReschedule, onDownload,
}: Readonly<AppointmentSlipProps>) {
  const bookingRef = makeBookingRef(appointment.id)
  const isActive = appointment.status === 'pending' || appointment.status === 'approved'

  return (
    <div className="space-y-4">
      {/* Ticket card */}
      <div className="rounded-xl border-2 border-dashed border-primary/30 bg-muted/20 overflow-hidden">
        {/* Ticket header */}
        <div className="bg-primary px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-7 w-7 rounded-full object-cover" />
            <div>
              <p className="text-primary-foreground text-xs font-bold leading-none">ITE14</p>
              <p className="text-primary-foreground/70 text-[10px]">Data Structures &amp; Algorithms</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs font-mono tracking-wider">
            {bookingRef}
          </Badge>
        </div>

        {/* Ticket body */}
        <div className="px-4 py-4 space-y-3">
          <SlipDetailRow icon={<User className="h-4 w-4" />} label="Name" value={student.full_name} />
          <SlipDetailRow icon={<CreditCard className="h-4 w-4" />} label="Student ID" value={student.student_id} />
          <SlipDetailRow icon={<BookOpen className="h-4 w-4" />} label="Section" value={student.section} />
          <Separator />
          <SlipDetailRow icon={<Calendar className="h-4 w-4" />} label="Date" value={formatDate(appointment.appointment_date)} />
          <SlipDetailRow icon={<Clock className="h-4 w-4" />} label="Time" value={`${formatTime(appointment.appointment_time)} (20 min)`} />
          <SlipDetailRow icon={<MapPin className="h-4 w-4" />} label="Venue" value={VENUE} />
        </div>

        {/* Tear line */}
        <div className="relative">
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-background border" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-background border" />
          <div className="border-t border-dashed border-muted-foreground/30 mx-2" />
        </div>

        {/* Ticket footer */}
        <div className="px-4 py-3 flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Hash className="h-3 w-3" />
            <span className="text-[10px]">Booking Reference</span>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold tracking-widest text-primary">{bookingRef}</p>
            <p className="text-[10px] text-muted-foreground">
              Status: <StatusBadge status={appointment.status} />
            </p>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {appointment.status === 'approved' && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Your appointment is confirmed! Please be on time.
        </div>
      )}

      {/* Download */}
      <Button variant="outline" className="w-full gap-2" onClick={onDownload}>
        <Download className="h-4 w-4" />
        Download Appointment Slip
      </Button>

      {/* Reschedule */}
      {isActive && (
        <div className="space-y-1">
          <Button
            variant="outline"
            className="w-full gap-2"
            disabled={!canReschedule}
            onClick={onReschedule}
          >
            <Pencil className="h-4 w-4" />
            {canReschedule ? 'Edit Appointment' : 'Edit unavailable (within 2 hrs)'}
          </Button>
          {!canReschedule && (
            <p className="text-xs text-center text-muted-foreground">
              Editing is locked within 2 hours of your scheduled time.
            </p>
          )}
        </div>
      )}

      {/* Withdraw */}
      {isActive && (
        <div className="space-y-2">
          {withdrawDeadline && (
            <p className="text-xs text-center text-muted-foreground">
              {canWithdraw
                ? `Withdraw deadline: ${withdrawDeadline.toLocaleString()}`
                : 'Withdrawal no longer available (within 3 hrs of schedule)'}
            </p>
          )}
          <Button
            variant="destructive"
            className="w-full gap-2"
            disabled={!canWithdraw || isWithdrawing}
            onClick={onWithdraw}
          >
            <LogOut className="h-4 w-4" />
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw Appointment'}
          </Button>
        </div>
      )}

      {/* Post-withdrawal: offer to rebook */}
      {appointment.status === 'cancelled' && (
        <a href="/booking">
          <Button className="w-full gap-2">
            <BookOpen className="h-4 w-4" />
            Book a New Appointment
          </Button>
        </a>
      )}
    </div>
  )
}

function SlipDetailRow({ icon, label, value }: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="text-sm font-medium flex-1">{value}</span>
    </div>
  )
}

function EvaluationResults({ evaluation }: Readonly<{ evaluation: NonNullable<ReturnType<typeof useStudentAppointment>['data']>['evaluation'] }>) {
  if (!evaluation) return null
  const totalScore = Number(evaluation.total_score)
  const grade = getScoreGrade(totalScore)
  const rec = evaluation.recommendation as Recommendation
  const evaluatedDate = evaluation.evaluated_at
    ? new Date(evaluation.evaluated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="space-y-4">
      {/* Meta — evaluator & date */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span>
            Evaluated by{' '}
            <span className="font-semibold text-foreground">
              {evaluation.evaluator_name ?? 'Evaluator'}
            </span>
          </span>
        </div>
        {evaluatedDate && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{evaluatedDate}</span>
          </div>
        )}
      </div>

      {/* Score summary */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              <p className="text-5xl font-bold text-primary">{totalScore.toFixed(1)}</p>
            </div>
            <p className="text-sm text-muted-foreground">out of 100</p>
            <span className={cn('font-semibold text-sm', grade.color)}>{grade.grade}</span>
          </div>
          <Progress value={totalScore} className="h-3" />

          <div className={cn('rounded-lg border px-4 py-2 text-sm font-semibold text-center', RECOMMENDATION_COLORS[rec])}>
            Recommendation: {RECOMMENDATION_LABELS[rec]}
          </div>
        </CardContent>
      </Card>

      {/* Per-criterion breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CHECKLIST_CRITERIA.map((criterion) => {
            const score = Number(evaluation[criterion.key as keyof typeof evaluation])
            const pct = (score / criterion.maxScore) * 100
            return (
              <div key={criterion.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{criterion.label}</span>
                  <span className="font-medium tabular-nums">
                    {score}/{criterion.maxScore}
                  </span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Evaluator comments */}
      {evaluation.evaluator_comments && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evaluator Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {evaluation.evaluator_comments}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  )
}
