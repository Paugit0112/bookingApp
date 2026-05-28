import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Mail, Eye, EyeOff, CreditCard, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { loginSchema, type LoginSchema } from '@/schemas'
import { z } from 'zod'
import { api, setToken } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/components/shared/ThemeProvider'

const studentSchema = z.object({
  student_id: z.string().min(1, 'Student ID is required'),
})
type StudentSchema = z.infer<typeof studentSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { resolvedTheme, setTheme } = useTheme()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false)
  const [isLoadingStudent, setIsLoadingStudent] = useState(false)

  // Admin form
  const adminForm = useForm<LoginSchema>({ resolver: zodResolver(loginSchema) })

  // Student form
  const studentForm = useForm<StudentSchema>({ resolver: zodResolver(studentSchema) })

  const onAdminSubmit = async (data: LoginSchema) => {
    setIsLoadingAdmin(true)
    try {
      const result = await api.auth.login(data.email, data.password)
      setToken(result.token)
      setAuth(result.user, result.profile)
      toast.success(`Welcome back, ${result.profile.full_name}!`)
      navigate('/admin', { replace: true })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoadingAdmin(false)
    }
  }

  const onStudentSubmit = async (data: StudentSchema) => {
    setIsLoadingStudent(true)
    try {
      const sid = data.student_id.toUpperCase().trim()
      const result = await api.booking.getByStudentId(sid)
      if (result) {
        navigate(`/dashboard?sid=${sid}`)
      } else {
        navigate(`/booking?sid=${sid}`)
      }
    } catch {
      navigate(`/booking?sid=${data.student_id.toUpperCase().trim()}`)
    } finally {
      setIsLoadingStudent(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img src="/logo.png" alt="CSU ITE14 Logo" className="h-20 w-20 rounded-full object-cover shadow-lg" />
          </div>
          <h1 className="text-2xl font-bold">Project Evaluation System</h1>
          <p className="text-sm text-muted-foreground">Select your role to continue</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="student">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="student" className="flex-1 gap-2">
                  <CreditCard className="h-4 w-4" />
                  Student
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex-1 gap-2">
                  <Lock className="h-4 w-4" />
                  Admin
                </TabsTrigger>
              </TabsList>

              {/* ── Student Tab ── */}
              <TabsContent value="student" className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Check your appointment status or book a new one.</p>
                  <p className="text-xs text-muted-foreground">Enter your Student ID to continue.</p>
                </div>
                <form onSubmit={studentForm.handleSubmit(onStudentSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="student_id">Student ID</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="student_id"
                        placeholder="e.g., 2021-00123"
                        className="pl-9 uppercase"
                        {...studentForm.register('student_id')}
                        aria-invalid={!!studentForm.formState.errors.student_id}
                      />
                    </div>
                    {studentForm.formState.errors.student_id && (
                      <p className="text-xs text-destructive">
                        {studentForm.formState.errors.student_id.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isLoadingStudent}>
                    {isLoadingStudent ? 'Looking up...' : 'Continue'}
                  </Button>
                </form>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate('/booking')}>
                  Book an Appointment
                </Button>
              </TabsContent>

              {/* ── Admin Tab ── */}
              <TabsContent value="admin" className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Admin access only.</p>
                  <p className="text-xs text-muted-foreground">Use your admin email and password.</p>
                </div>
                <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        className="pl-9"
                        {...adminForm.register('email')}
                        aria-invalid={!!adminForm.formState.errors.email}
                      />
                    </div>
                    {adminForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{adminForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-9 pr-9"
                        {...adminForm.register('password')}
                        aria-invalid={!!adminForm.formState.errors.password}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {adminForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{adminForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isLoadingAdmin}>
                    {isLoadingAdmin ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
