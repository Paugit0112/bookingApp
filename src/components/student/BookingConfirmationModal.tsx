import { useRef } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2, Download, LayoutDashboard, Calendar, Clock,
  User, CreditCard, BookOpen, MapPin, Hash,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime, VENUE } from '@/lib/utils'
import { generateAppointmentSlipPDF } from '@/lib/pdf'
import type { BookingConfirmation } from '@/types'

interface BookingConfirmationModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly confirmation: BookingConfirmation | null
}

/** Derives a human-readable booking reference from the appointment UUID. */
function makeBookingRef(id: string): string {
  return `ITE14-${id.slice(0, 3).toUpperCase()}${id.slice(9, 12).toUpperCase()}`
}

export function BookingConfirmationModal({
  open,
  onClose,
  confirmation,
}: BookingConfirmationModalProps) {
  const navigate = useNavigate()
  const slipRef = useRef<HTMLDivElement>(null)

  if (!confirmation) return null

  const { student, appointment } = confirmation
  const bookingRef = makeBookingRef(appointment.id)

  const handleDownload = () => {
    generateAppointmentSlipPDF(student, appointment)
  }

  const handleViewDashboard = () => {
    onClose()
    navigate(`/dashboard?sid=${student.student_id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="flex justify-center mb-2"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
            </div>
          </motion.div>
          <DialogTitle className="text-center text-xl">Booking Confirmed!</DialogTitle>
          <DialogDescription className="text-center">
            Present this booking ticket to your instructor as proof of appointment.
          </DialogDescription>
        </DialogHeader>

        {/* ── Booking Ticket ── */}
        <div ref={slipRef} className="rounded-xl border-2 border-dashed border-primary/30 bg-muted/20 overflow-hidden">

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
            <DetailRow icon={<User className="h-4 w-4" />} label="Name" value={student.full_name} />
            <DetailRow icon={<CreditCard className="h-4 w-4" />} label="Student ID" value={student.student_id} />
            <DetailRow icon={<BookOpen className="h-4 w-4" />} label="Section" value={student.section} />
            <Separator />
            <DetailRow
              icon={<Calendar className="h-4 w-4" />}
              label="Date"
              value={formatDate(appointment.appointment_date)}
            />
            <DetailRow
              icon={<Clock className="h-4 w-4" />}
              label="Time"
              value={`${formatTime(appointment.appointment_time)} (20 min)`}
            />
            <DetailRow icon={<MapPin className="h-4 w-4" />} label="Venue" value={VENUE} />
          </div>

          {/* Ticket tear line */}
          <div className="relative">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-background border" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-background border" />
            <div className="border-t border-dashed border-muted-foreground/30 mx-2" />
          </div>

          {/* Ticket footer with prominent reference code */}
          <div className="px-4 py-3 flex items-center justify-between bg-muted/40">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span className="text-[10px]">Booking Reference</span>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-bold tracking-widest text-primary">{bookingRef}</p>
              <p className="text-[10px] text-muted-foreground">Status: <span className="text-green-600 font-semibold">Approved</span></p>
            </div>
          </div>
        </div>

        {/* ── Policy reminder ── */}
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-2">
          Your appointment is <strong>confirmed</strong>. You may withdraw up to <strong>3 hours before</strong> your scheduled time.
          Keep this reference code for verification.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Download Slip
          </Button>
          <Button className="flex-1 gap-2" onClick={handleViewDashboard}>
            <LayoutDashboard className="h-4 w-4" />
            View Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: Readonly<{
  icon: React.ReactNode
  label: string
  value: string
}>) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="text-sm font-medium flex-1">{value}</span>
    </div>
  )
}
