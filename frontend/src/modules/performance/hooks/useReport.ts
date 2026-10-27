import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchKpiCatalogue, saveKpiCatalogue, submitReport } from '@modules/performance/api/performanceApi'
import type { CatalogueKpi, Period, ReportInput } from '@modules/performance/api/performanceTypes'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'

export function useKpiCatalogue(period: Period | null) {
  return useQuery({
    queryKey: queryKeys.performance.catalogue(period ?? ''),
    queryFn: ({ signal }) => fetchKpiCatalogue(period as Period, signal),
    enabled: Boolean(period)
  })
}

export function useSubmitReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ReportInput) => submitReport(input),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.performance.all })

      const parts: string[] = []
      if (result.added) parts.push(`${result.added} added`)
      if (result.replaced) parts.push(`${result.replaced} updated`)
      toast(parts.length ? `Report saved. ${parts.join(', ')}` : 'Report saved')
    }
  })
}

export function useSaveKpiCatalogue(month: Period) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { department: string; rows: CatalogueKpi[] }) =>
      saveKpiCatalogue(month, input.department, input.rows),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.performance.all })
      toast('Saved')
    }
  })
}
