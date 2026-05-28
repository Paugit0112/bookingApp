import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { useAuthStore } from '@/stores/authStore'
import { clearToken } from '@/lib/api'

const INACTIVITY_TIMEOUT_MS = (Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES) || 30) * 60_000
const WARNING_BEFORE_MS = 60_000 // warn 1 minute before

export function SessionTimeoutModal() {
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const { isAuthenticated, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const resetTimer = useCallback(() => {
    setShowWarning(false)
    setCountdown(60)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    let warnTimer: ReturnType<typeof setTimeout>
    let logoutTimer: ReturnType<typeof setTimeout>

    const startTimers = () => {
      clearTimeout(warnTimer)
      clearTimeout(logoutTimer)

      warnTimer = setTimeout(() => setShowWarning(true), INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS)
      logoutTimer = setTimeout(() => {
        clearToken()
        clearAuth()
        navigate('/admin/login')
      }, INACTIVITY_TIMEOUT_MS)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    const handleActivity = () => {
      resetTimer()
      startTimers()
    }

    events.forEach((e) => window.addEventListener(e, handleActivity))
    startTimers()

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity))
      clearTimeout(warnTimer)
      clearTimeout(logoutTimer)
    }
  }, [isAuthenticated, clearAuth, navigate, resetTimer])

  // Countdown ticker when warning is shown
  useEffect(() => {
    if (!showWarning) return
    const interval = setInterval(() => setCountdown((c) => Math.max(c - 1, 0)), 1000)
    return () => clearInterval(interval)
  }, [showWarning])

  if (!isAuthenticated || !showWarning) return null

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>Your session will expire due to inactivity.</p>
            <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Clock className="h-6 w-6 text-yellow-500" />
              <span>{countdown}s remaining</span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              clearToken()
              clearAuth()
              navigate('/admin/login')
            }}
          >
            Log out now
          </AlertDialogCancel>
          <AlertDialogAction onClick={resetTimer}>
            Stay logged in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
