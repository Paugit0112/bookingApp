import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminNavbar } from '@/components/shared/Adminnavbar'
import { api } from '@/lib/api'
import { formatDate, getInitials } from '@/lib/utils'

function useStudents(search: string) {
  return useQuery({
    queryKey: ['students', search],
    queryFn: () => api.students.list(search || undefined),
    staleTime: 30_000,
  })
}

export default function StudentsPage() {
  const [search, setSearch] = useState('')
  const { data: students, isLoading } = useStudents(search)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminNavbar title="Students" subtitle={`${students?.length ?? 0} registered`} />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or section..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Mobile cards (< md) ── */}
        <div className="md:hidden space-y-3">
          {isLoading && Array.from({ length: 6 }).map((_, i) => (
            <Card key={`skel-m-${i}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && students?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No students found</p>
              </CardContent>
            </Card>
          )}
          {!isLoading && students?.map((student) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                          {getInitials(student.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.student_id} · {student.section}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">
                          {formatDate(student.created_at)}
                        </p>
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
                    <th className="text-left p-3 font-medium text-muted-foreground">Student ID</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Section</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <tr key={`skel-d-${i}`} className="border-b">
                          {['a','b','c','d'].map((k) => (
                            <td key={k} className="p-3"><Skeleton className="h-4 w-full" /></td>
                          ))}
                        </tr>
                      ))
                    : students?.length === 0
                    ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-10 w-10 opacity-30" />
                            <p>No students found</p>
                          </div>
                        </td>
                      </tr>
                    )
                    : students?.map((student) => (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                                {getInitials(student.full_name)}
                              </div>
                              <span className="font-medium">{student.full_name}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-muted-foreground">{student.student_id}</td>
                          <td className="p-3">{student.section}</td>
                          <td className="p-3 text-muted-foreground">{formatDate(student.created_at)}</td>
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
