import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { CalendarDays, BookOpen, Moon, Sun, Info, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { SlotCounter } from '@/components/shared/SlotCounter'
import { BookingConfirmationModal } from '@/components/student/BookingConfirmationModal'
import { bookingSchema, type BookingSchema } from '@/schemas'
import { useDailySlots } from '@/hooks/useSlots'
import { api } from '@/lib/api'
import { formatDate, formatTime, getAvailableTimeSlots, VENUE, EXAM_DATES } from '@/lib/utils'
import { useTheme } from '@/components/shared/ThemeProvider'
import type { BookingConfirmation } from '@/types'

const AVAILABLE_DATES = EXAM_DATES
const TIME_SLOTS = getAvailableTimeSlots()

export default function BookingPage() {
  const { resolvedTheme, setTheme } = useTheme()
  const [selectedDate, setSelectedDate] = useState<string>(AVAILABLE_DATES[0])
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: slotInfo, isLoading: slotsLoading } = useDailySlots(selectedDate)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<BookingSchema>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      appointment_date: AVAILABLE_DATES[0],
      appointment_time: '',
    },
  })

  const selectedTime = watch('appointment_time')

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setValue('appointment_date', date)
  }

  const onSubmit = async (data: BookingSchema) => {
    if (slotInfo?.is_full) {
      toast.error('No slots available for this date. Please select another date.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await api.booking.create({
        full_name: data.full_name.trim(),
        student_id: data.student_id.toUpperCase().trim(),
        section: data.section.trim(),
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
      })

      setConfirmation({
        student: result.student as BookingConfirmation['student'],
        appointment: result.appointment as BookingConfirmation['appointment'],
      })
      reset()
      toast.success('Appointment booked successfully!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Booking failed'
      if (message.includes('DUPLICATE_BOOKING')) {
        toast.error('You already have an active booking. Check your dashboard for details.')
      } else if (message.includes('SLOT_FULL')) {
        toast.error('This date is now fully booked. Please choose another date.')
      } else {
        toast.error(message || 'Booking failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Top bar */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="CSU ITE14 Logo" className="h-8 w-8 rounded-full object-cover" />
            <span className="font-bold text-sm">Project Evaluation System</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Hero */}
          <div className="text-center space-y-2">
            <div className="flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <CalendarDays className="h-3 w-3" />
                First-come, first-served · 24 slots/day
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <MapPin className="h-3 w-3" />
                {VENUE}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Clock className="h-3 w-3" />
                20 min per session
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Book Your Evaluation Appointment
            </h1>
            <p className="text-muted-foreground text-sm">
              Schedule your Final Project Evaluation session with your instructor.
            </p>
          </div>

          {/* Available exam dates */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Presentation Schedule
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_DATES.map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => handleDateChange(date)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors ${
                    selectedDate === date
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <span className="block text-[10px] text-muted-foreground">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  {formatDate(date)}
                </button>
              ))}
            </div>
          </div>

          {/* Slot counter */}
          {slotsLoading ? (
            <Skeleton className="h-20 rounded-xl" />
          ) : (
            <SlotCounter booked={slotInfo?.booked ?? 0} date={formatDate(selectedDate)} />
          )}

          {/* Booking Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                Appointment Details
              </CardTitle>
              <CardDescription>
                All fields are required. Your Student ID will be used to identify your booking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    placeholder="e.g., Juan Dela Cruz"
                    {...register('full_name')}
                    aria-invalid={!!errors.full_name}
                  />
                  {errors.full_name && (
                    <p className="text-xs text-destructive">{errors.full_name.message}</p>
                  )}
                </div>

                {/* Student ID */}
                <div className="space-y-1.5">
                  <Label htmlFor="student_id">Student ID Number</Label>
                  <Input
                    id="student_id"
                    placeholder="e.g., 2021-00123"
                    {...register('student_id')}
                    className="uppercase"
                    aria-invalid={!!errors.student_id}
                  />
                  {errors.student_id && (
                    <p className="text-xs text-destructive">{errors.student_id.message}</p>
                  )}
                </div>

                {/* Section */}
                <div className="space-y-1.5">
                  <Label>Section</Label>
                  <Select
                    value={watch('section')}
                    onValueChange={(v) => setValue('section', v, { shouldValidate: true })}
                  >
                    <SelectTrigger aria-invalid={!!errors.section}>
                      <SelectValue placeholder="Select your section" />
                    </SelectTrigger>
                    <SelectContent>
                      {['AD1', 'BLM1', 'CM1', 'EN1'].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.section && (
                    <p className="text-xs text-destructive">{errors.section.message}</p>
                  )}
                </div>

                {/* Date Selection */}
                <div className="space-y-1.5">
                  <Label>Appointment Date</Label>
                  <Select
                    value={selectedDate}
                    onValueChange={handleDateChange}
                  >
                    <SelectTrigger aria-invalid={!!errors.appointment_date}>
                      <SelectValue placeholder="Select a date" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_DATES.map((date) => (
                        <SelectItem key={date} value={date}>
                          {formatDate(date)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.appointment_date && (
                    <p className="text-xs text-destructive">{errors.appointment_date.message}</p>
                  )}
                </div>

                {/* Time Selection */}
                <div className="space-y-1.5">
                  <Label>Appointment Time</Label>
                  <Select
                    value={selectedTime}
                    onValueChange={(v) => setValue('appointment_time', v, { shouldValidate: true })}
                  >
                    <SelectTrigger aria-invalid={!!errors.appointment_time}>
                      <SelectValue placeholder="Select a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Morning (9:00 AM – 11:40 AM)</SelectLabel>
                        {TIME_SLOTS.filter((t) => parseInt(t.split(':')[0]) < 12).map((t) => (
                          <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Afternoon (12:00 PM – 4:40 PM)</SelectLabel>
                        {TIME_SLOTS.filter((t) => { const h = parseInt(t.split(':')[0]); return h >= 12 && h < 17 }).map((t) => (
                          <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Evening (5:00 PM – 6:40 PM)</SelectLabel>
                        {TIME_SLOTS.filter((t) => parseInt(t.split(':')[0]) >= 17).map((t) => (
                          <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {errors.appointment_time && (
                    <p className="text-xs text-destructive">{errors.appointment_time.message}</p>
                  )}
                </div>

                {/* Info notice */}
                <div className="flex gap-2 rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-700 dark:text-blue-300">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Each Student ID can only have one active booking. Your appointment will be
                    pending until approved by the evaluator.
                  </span>
                </div>

                {/* Withdrawal policy notice */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-4 space-y-2">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0" />
                    Cancellation & Withdrawal Policy
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    Students may only withdraw or cancel their appointment <strong>at least 3 hours before</strong> the
                    scheduled presentation time. Failure to attend the booked schedule without valid
                    cancellation may result in restrictions from rebooking.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting || slotInfo?.is_full}
                >
                  {isSubmitting
                    ? 'Booking...'
                    : slotInfo?.is_full
                    ? 'No slots available'
                    : 'Book Appointment'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Check existing booking link */}
          <p className="text-center text-sm text-muted-foreground">
            Already booked?{' '}
            <a href="/dashboard" className="text-primary underline underline-offset-2">
              Check your appointment status →
            </a>
          </p>
        </motion.div>
      </main>

      <BookingConfirmationModal
        open={!!confirmation}
        onClose={() => setConfirmation(null)}
        confirmation={confirmation}
      />
    </div>
  )
}
