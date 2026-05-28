import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import AdminLayout from '@/layouts/AdminLayout'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
const LoginPage           = lazy(() => import('@/pages/LoginPage'))
const BookingPage         = lazy(() => import('@/pages/student/BookingPage'))
const StudentDashboard    = lazy(() => import('@/pages/student/DashboardPage'))
const AdminDashboardPage  = lazy(() => import('@/pages/admin/DashboardPage'))
const AppointmentsPage    = lazy(() => import('@/pages/admin/AppointmentsPage'))
const EvaluationsPage     = lazy(() => import('@/pages/admin/EvaluationsPage'))
const StudentsPage        = lazy(() => import('@/pages/admin/StudentsPage'))
const AuditLogsPage       = lazy(() => import('@/pages/admin/AuditLogsPage'))
const ReportsPage         = lazy(() => import('@/pages/admin/ReportsPage'))
const SettingsPage        = lazy(() => import('@/pages/admin/SettingsPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="space-y-3 w-48">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Unified Login ── */}
              <Route path="/" element={<LoginPage />} />

              {/* ── Student Routes ── */}
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/dashboard" element={<StudentDashboard />} />

              {/* ── Admin Auth (redirect to unified login) ── */}
              <Route path="/admin/login" element={<Navigate to="/" replace />} />

              {/* ── Admin Protected Routes ── */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="evaluations" element={<EvaluationsPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* ── Catch-all ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </ThemeProvider>

      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
