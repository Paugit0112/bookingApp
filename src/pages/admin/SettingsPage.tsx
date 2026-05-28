import { useState } from 'react'
import { Trash2, Plus, CalendarDays, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AdminNavbar } from '@/components/shared/Adminnavbar'
import { useExamDates, useAddExamDate, useRemoveExamDate } from '@/hooks/useExamDates'
import { formatDate } from '@/lib/utils'

export default function SettingsPage() {
  const [newDate, setNewDate] = useState('')
  const [removingDate, setRemovingDate] = useState<string | null>(null)

  const { data: examDates, isLoading } = useExamDates()
  const { mutate: addDate, isPending: isAdding } = useAddExamDate()
  const { mutate: removeDate, isPending: isRemoving } = useRemoveExamDate()

  const handleAdd = () => {
    if (!newDate) return
    addDate(newDate, { onSuccess: () => setNewDate('') })
  }

  const handleRemove = () => {
    if (!removingDate) return
    removeDate(removingDate, { onSettled: () => setRemovingDate(null) })
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminNavbar title="Settings" subtitle="Manage exam schedule and availability" />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Exam Dates
            </CardTitle>
            <CardDescription>
              Add or remove available exam dates. Dates with existing bookings cannot be removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new date */}
            <div className="flex gap-2 items-end">
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="new-date">Add Exam Date</Label>
                <Input
                  id="new-date"
                  type="date"
                  value={newDate}
                  min={today}
                  onChange={e => setNewDate(e.target.value)}
                />
              </div>
              <Button onClick={handleAdd} disabled={!newDate || isAdding} className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" />
                {isAdding ? 'Adding…' : 'Add Date'}
              </Button>
            </div>

            {/* Existing dates */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Current Exam Dates ({examDates?.length ?? 0})
              </p>
              {isLoading && (
                <div className="space-y-2">
                  {['a','b','c','d','e'].map(k => <Skeleton key={k} className="h-10 w-full rounded-md" />)}
                </div>
              )}
              {!isLoading && examDates?.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  No exam dates configured. Add one above.
                </div>
              )}
              {!isLoading && examDates?.map(date => (
                <div key={date} className="flex items-center justify-between rounded-lg border px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{formatDate(date)}</p>
                    <p className="text-xs text-muted-foreground">{date}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setRemovingDate(date)}
                    aria-label={`Remove ${date}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!removingDate} onOpenChange={open => { if (!open) setRemovingDate(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Exam Date</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{removingDate ? formatDate(removingDate) : ''}</strong> from the schedule?
              This cannot be done if any bookings exist for this date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
