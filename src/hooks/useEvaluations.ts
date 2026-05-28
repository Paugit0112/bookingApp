import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EvaluationFormData } from '@/types'
import { toast } from 'sonner'

export function useEvaluation(appointmentId: string | null) {
  return useQuery({
    queryKey: ['evaluation', appointmentId],
    queryFn: () => api.evaluations.get(appointmentId!),
    enabled: !!appointmentId,
    staleTime: 30_000,
  })
}

export function useAllEvaluations() {
  return useQuery({
    queryKey: ['evaluations-all'],
    queryFn: () => api.evaluations.list(),
    staleTime: 30_000,
  })
}

export function useSubmitEvaluation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      appointmentId,
      evaluatorId,
      formData,
    }: {
      appointmentId: string
      evaluatorId: string
      formData: EvaluationFormData
    }) => {
      return api.evaluations.submit({
        appointment_id: appointmentId,
        evaluator_id: evaluatorId,
        ...formData,
      })
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation', vars.appointmentId] })
      queryClient.invalidateQueries({ queryKey: ['evaluations-all'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Evaluation submitted successfully')
    },
    onError: (err: Error) => {
      toast.error(`Evaluation failed: ${err.message}`)
    },
  })
}
