import { useQuery } from '@tanstack/react-query'

import { fetchCallStats } from '@logic/leads/leadsApi'
import { queryKeys } from '@shared/lib/queryKeys'

export { queueCall } from '@logic/leads/leadsApi'

export function useCallStats() {
  return useQuery({ queryKey: queryKeys.leads.calls, queryFn: fetchCallStats })
}
