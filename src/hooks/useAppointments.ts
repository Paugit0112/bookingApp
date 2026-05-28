import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TableFilters } from '@/types'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

export function useAppointments(filters?: TableFilters) {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => api.appointments.list(filters),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useStudentAppointment(studentId: string | null) {
  return useQuery({
    queryKey: ['student-appointment', studentId],
    queryFn: () => api.booking.getByStudentId(studentId!),
    enabled: !!studentId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  })
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      appointmentId,
      status,
    }: {
      appointmentId: string
      status: string
      adminId?: string
    }) => {
      await api.appointments.updateStatus(appointmentId, status)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Appointment status updated')
    },
    onError: (err: Error) => {
      toast.error(`Failed to update: ${err.message}`)
    },
  })
}
