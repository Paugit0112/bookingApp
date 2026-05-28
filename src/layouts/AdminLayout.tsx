import { Outlet, Navigate } from 'react-router-dom'
import { AdminSidebar } from '@/components/shared/AdminSidebar'
import { SessionTimeoutModal } from '@/components/shared/SessionTimeoutModal'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { useAuthStore } from '@/stores/authStore'

export default function AdminLayout() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Outlet />
        </div>
        <SessionTimeoutModal />
      </div>
    </SidebarProvider>
  )
}
