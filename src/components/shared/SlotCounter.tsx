import { motion } from 'framer-motion'
import { Users, AlertTriangle, CheckCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn, MAX_BOOKINGS_PER_DAY } from '@/lib/utils'

interface SlotCounterProps {
  booked: number
  date?: string
  className?: string
}

export function SlotCounter({ booked, date, className }: SlotCounterProps) {
  const remaining = Math.max(MAX_BOOKINGS_PER_DAY - booked, 0)
  const percentage = (booked / MAX_BOOKINGS_PER_DAY) * 100
  const isFull = remaining === 0
  const isAlmostFull = remaining <= 5 && !isFull

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-4',
        isFull
          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
          : isAlmostFull
          ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'
          : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isFull ? (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : isAlmostFull ? (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          <span className="text-sm font-medium">
            {isFull
              ? 'All slots are full'
              : isAlmostFull
              ? 'Almost full — book now!'
              : 'Slots available'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            <strong className={isFull ? 'text-red-600' : 'text-foreground'}>{remaining}</strong>
            /{MAX_BOOKINGS_PER_DAY} remaining
          </span>
        </div>
      </div>

      <Progress
        value={percentage}
        className={cn(
          'h-2',
          isFull ? '[&>div]:bg-red-500' : isAlmostFull ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
        )}
      />

      {date && (
        <p className="mt-2 text-xs text-muted-foreground">
          {date} · Faculty Room · 9:00 AM – 7:00 PM · 20 min/slot
        </p>
      )}
    </motion.div>
  )
}
