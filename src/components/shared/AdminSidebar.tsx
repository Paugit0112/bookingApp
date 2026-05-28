import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, ClipboardCheck, Users,
  BarChart3, LogOut, ChevronLeft, ChevronRight,
  ScrollText, X, Settings,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useAuthStore } from '@/stores/authStore'
import { clearToken } from '@/lib/api'
import { useSidebar } from '@/contexts/SidebarContext'
import { toast } from 'sonner'

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/appointments', icon: CalendarDays, label: 'Appointments' },
  { to: '/admin/evaluations', icon: ClipboardCheck, label: 'Evaluations' },
  { to: '/admin/students', icon: Users, label: 'Students' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { to: '/admin/audit-logs', icon: ScrollText, label: 'Audit Logs' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

function SidebarContent({
  collapsed,
  onNavClick,
}: Readonly<{
  collapsed: boolean
  onNavClick?: () => void
}>) {
  const { profile, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearToken()
    clearAuth()
    navigate('/admin/login')
    toast.success('Logged out successfully')
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="p-2 pt-3 pb-2">
        <div className={cn('flex items-center gap-3 rounded-md px-3 py-2.5', collapsed && 'justify-center px-0')}>
          <img
            src="/logo.png"
            alt="CSU ITE14 Logo"
            className="h-6 w-6 shrink-0 rounded-full object-cover"
          />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <p className="whitespace-nowrap text-sm font-bold leading-tight">EvalBook</p>
                <p className="whitespace-nowrap text-xs text-muted-foreground leading-tight">Admin Panel</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 p-2 pt-3">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <Tooltip key={to}>
            <TooltipTrigger asChild>
              <NavLink
                to={to}
                end={end}
                onClick={onNavClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground',
                    collapsed && 'justify-center px-0'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
          </Tooltip>
        ))}
      </nav>

      <Separator />

      <div className={cn('p-3 space-y-2', collapsed && 'flex flex-col items-center')}>
        {!collapsed && profile && (
          <div className="px-2 py-1">
            <p className="text-xs font-medium truncate">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'sm'}
              className={cn(
                'text-destructive hover:bg-destructive/10 hover:text-destructive w-full',
                collapsed && 'w-10'
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="ml-2">Log out</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Log out</TooltipContent>}
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { mobileOpen, closeMobile } = useSidebar()

  return (
    <>
      {/* ── Mobile overlay backdrop ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r bg-sidebar text-sidebar-foreground shadow-xl lg:hidden"
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="CSU ITE14 Logo" className="h-6 w-6 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-bold leading-tight">EvalBook</p>
                  <p className="text-xs text-muted-foreground leading-tight">Admin Panel</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={closeMobile} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col flex-1 overflow-y-auto">
              <SidebarContent collapsed={false} onNavClick={closeMobile} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 280 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="relative hidden lg:flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground shadow-sm"
      >
        <SidebarContent collapsed={collapsed} />

        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border shadow-sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </motion.aside>
    </>
  )
}
