import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useDailySlots(date: string) {
  return useQuery({
    queryKey: ['daily-slots', date],
    queryFn: () => api.slots.get(date),
    staleTime: 30_000,
    enabled: !!date,
    refetchInterval: 30_000,
  })
}

export function useTodaySlots() {
  return useDailySlots(new Date().toISOString().slice(0, 10))
}
