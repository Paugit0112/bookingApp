import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'

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
  return useDailySlots(format(new Date(), 'yyyy-MM-dd'))
}
