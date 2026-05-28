import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminProfileRow } from '@/lib/api'

interface LocalUser {
  id: string
  email: string
}

interface AuthState {
  user: LocalUser | null
  profile: AdminProfileRow | null
  isAuthenticated: boolean
  setAuth: (user: LocalUser, profile: AdminProfileRow) => void
  setProfile: (profile: AdminProfileRow) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isAuthenticated: false,

      setAuth: (user, profile) =>
        set({ user, profile, isAuthenticated: true }),

      setProfile: (profile) => set({ profile }),

      clearAuth: () =>
        set({ user: null, profile: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
