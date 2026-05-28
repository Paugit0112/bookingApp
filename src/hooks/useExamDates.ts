import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export function useExamDates() {
  return useQuery({
    queryKey: ['exam-dates'],
    queryFn: () => api.settings.examDates.list(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useAddExamDate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (date: string) => api.settings.examDates.add(date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-dates'] })
      toast.success('Exam date added.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRemoveExamDate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (date: string) => api.settings.examDates.remove(date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-dates'] })
      toast.success('Exam date removed.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
