import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ScrollText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminNavbar } from '@/components/shared/Adminnavbar'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'

function useAuditLogs() {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.auditLogs.list(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

const ACTION_COLORS: Record<string, string> = {
  STATUS_UPDATE: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
  EVALUATION_SUBMIT: 'text-green-600 bg-green-50 dark:bg-green-950',
  APPOINTMENT_DELETE: 'text-red-600 bg-red-50 dark:bg-red-950',
}

export default function AuditLogsPage() {
  const { data: logs, isLoading } = useAuditLogs()

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminNavbar title="Audit Logs" subtitle="Admin action history" />

      <div className="flex-1 overflow-auto p-4 sm:p-6">

        {/* ── Mobile cards (< md) ── */}
        <div className="md:hidden space-y-3">
          {isLoading && Array.from({ length: 8 }).map((_, i) => (
            <Card key={`skel-${i}`}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
          {!isLoading && logs?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ScrollText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                No audit logs yet
              </CardContent>
            </Card>
          )}
          {!isLoading && logs?.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${ACTION_COLORS[log.action] ?? 'text-gray-600 bg-gray-50'}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {log.target_type} · {log.target_id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</p>
                  {log.metadata && (
                    <p className="text-xs text-muted-foreground truncate">
                      {JSON.stringify(log.metadata)}
                    </p>
                  )}
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
                    <th className="text-left p-3 font-medium text-muted-foreground">Timestamp</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Target</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 10 }).map((_, i) => (
                        <tr key={`skel-d-${i}`} className="border-b">
                          {['a','b','c','d'].map((k) => (
                            <td key={k} className="p-3"><Skeleton className="h-4 w-full" /></td>
                          ))}
                        </tr>
                      ))
                    : logs?.length === 0
                    ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-muted-foreground">
                          <ScrollText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          No audit logs yet
                        </td>
                      </tr>
                    )
                    : logs?.map((log) => (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b hover:bg-muted/30 transition-colors text-xs"
                        >
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${ACTION_COLORS[log.action] ?? 'text-gray-600 bg-gray-50'}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {log.target_type} · {log.target_id.slice(0, 8)}
                          </td>
                          <td className="p-3 text-muted-foreground max-w-xs truncate">
                            {log.metadata ? JSON.stringify(log.metadata) : '—'}
                          </td>
                        </motion.tr>
                      ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
