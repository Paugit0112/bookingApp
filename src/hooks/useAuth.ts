import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, clearToken } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const { isAuthenticated, profile, user } = useAuthStore()
  const navigate = useNavigate()

  const requireAuth = () => {
    if (!isAuthenticated) navigate('/admin/login', { replace: true })
  }

  return { isAuthenticated, profile, user, requireAuth }
}

export function useRequireAuth() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) navigate('/admin/login', { replace: true })
  }, [isAuthenticated, navigate])

  return { isAuthenticated }
}

export function useAdminProfile() {
  return useQuery({
    queryKey: ['admin-profile'],
    queryFn: () => api.auth.me(),
    staleTime: 5 * 60_000,
  })
}

export function useSignOut() {
  const { clearAuth } = useAuthStore()
  const navigate = useNavigate()

  return async () => {
    clearToken()
    clearAuth()
    navigate('/admin/login', { replace: true })
  }
}
