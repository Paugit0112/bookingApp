import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Search, Filter, Check, X, ClipboardCheck, Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminNavbar } from '@/components/shared/Adminnavbar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAppointments, useUpdateAppointmentStatus } from '@/hooks/useAppointments'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatTime } from '@/lib/utils'
import type { AppointmentStatus, TableFilters } from '@/types'
import { EvaluationDrawer } from '@/components/admin/EvaluationDrawer'
import { generateAppointmentSlipPDF } from '@/lib/pdf'

export default function AppointmentsPage() {
  const { profile } = useAuthStore()
  const [filters, setFilters] = useState<TableFilters>({ search: '', status: 'all' })
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null)

  const { data: appointments, isLoading, refetch } = useAppointments(filters)
  const { mutate: updateStatus } = useUpdateAppointmentStatus()

  const handleStatusUpdate = (appointmentId: string, status: AppointmentStatus) => {
    if (!profile) return
    updateStatus({ appointmentId, status, adminId: profile.id })
  }

  const filteredCount = appointments?.length ?? 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminNavbar title="Appointments" subtitle={`${filteredCount} record(s)`} />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or student ID..."
                  className="pl-9 w-full"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={filters.status ?? 'all'}
                  onValueChange={(v) => setFilters((f) => ({ ...f, status: v as AppointmentStatus | 'all' }))}
                >
                  <SelectTrigger className="flex-1 sm:w-36">
                    <Filter className="h-4 w-4 mr-2 shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="evaluated">Evaluated</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  className="flex-1 sm:w-36"
                  value={filters.date ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value || undefined }))}
                />
                <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Mobile cards (< md) ── */}
        <div className="md:hidden space-y-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))
            : appointments?.length === 0
            ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No appointments found
                </CardContent>
              </Card>
            )
            : appointments?.map((appt) => (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{appt.students?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {appt.students?.student_id} · {appt.students?.section}
                          </p>
                        </div>
                        <StatusBadge status={appt.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(appt.appointment_date)} at {formatTime(appt.appointment_time)}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {appt.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1 text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleStatusUpdate(appt.id, 'approved')}
                            >
                              <Check className="h-3 w-3" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleStatusUpdate(appt.id, 'rejected')}
                            >
                              <X className="h-3 w-3" /> Reject
                            </Button>
                          </>
                        )}
                        {(appt.status === 'approved' || appt.status === 'evaluated') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1"
                            onClick={() => setEvaluatingId(appt.id)}
                          >
                            <ClipboardCheck className="h-3 w-3" />
                            {appt.status === 'evaluated' ? 'View Eval' : 'Evaluate'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          onClick={() => appt.students && generateAppointmentSlipPDF(appt.students, appt)}
                          aria-label="Download slip"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
        </div>

        {/* ── Desktop table (≥ md) ── */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Section</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date & Time</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <td key={j} className="p-3"><Skeleton className="h-4 w-full" /></td>
                          ))}
                        </tr>
                      ))
                    : appointments?.length === 0
                    ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          No appointments found
                        </td>
                      </tr>
                    )
                    : appointments?.map((appt) => (
                        <motion.tr
                          key={appt.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3">
                            <p className="font-medium">{appt.students?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{appt.students?.student_id}</p>
                          </td>
                          <td className="p-3 text-muted-foreground">{appt.students?.section}</td>
                          <td className="p-3">
                            <p>{formatDate(appt.appointment_date)}</p>
                            <p className="text-xs text-muted-foreground">{formatTime(appt.appointment_time)}</p>
                          </td>
                          <td className="p-3"><StatusBadge status={appt.status} /></td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              {appt.status === 'pending' && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleStatusUpdate(appt.id, 'approved')}>
                                    <Check className="h-3 w-3" /> Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleStatusUpdate(appt.id, 'rejected')}>
                                    <X className="h-3 w-3" /> Reject
                                  </Button>
                                </>
                              )}
                              {(appt.status === 'approved' || appt.status === 'evaluated') && (
                                <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setEvaluatingId(appt.id)}>
                                  <ClipboardCheck className="h-3 w-3" />
                                  {appt.status === 'evaluated' ? 'View Eval' : 'Evaluate'}
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7" onClick={() => appt.students && generateAppointmentSlipPDF(appt.students, appt)} aria-label="Download slip">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {evaluatingId && (
        <EvaluationDrawer
          appointmentId={evaluatingId}
          open={!!evaluatingId}
          onClose={() => setEvaluatingId(null)}
        />
      )}
    </div>
  )
}
