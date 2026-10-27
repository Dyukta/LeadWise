import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { queryKeys } from '@shared/lib/queryKeys'
import { getSupabase } from '@shared/lib/supabase'

export function useLiveLeads(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = getSupabase()
    const channel = supabase
      .channel('leads', { config: { private: true } })
      .on('broadcast', { event: 'changed' }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
      })
    let open = true

    void supabase.realtime.setAuth().then(() => {
      if (open) channel.subscribe()
    })

    return () => {
      open = false
      void supabase.removeChannel(channel)
    }
  }, [queryClient])
}
