import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { fetchClaims, fetchGoogleSignInEnabled, fetchProfile, onAuthChange, sendPasswordReset, signIn, signInWithGoogle, signOut, updateOwnPassword } from '@platform/auth/api/authApi'
import { AccessDeniedError, type Session } from '@platform/auth/domain/session'
import { queryKeys } from '@shared/lib/queryKeys'

function useClaims() {
  const queryClient = useQueryClient()

  useEffect(
    () =>
      onAuthChange(() => queryClient.invalidateQueries({ queryKey: queryKeys.auth.claims })),
    [queryClient]
  )

  return useQuery({
    queryKey: queryKeys.auth.claims,
    queryFn: fetchClaims,
    retry: 2,
    staleTime: Infinity,
    refetchOnWindowFocus: false
  })
}

type SessionState = {
  isPending: boolean
  session: Session | null
  deniedEmail: string | null
  error: Error | null
}

export function useSession(): SessionState {
  const claims = useClaims()
  const userId = claims.data?.sub

  const profile = useQuery({
    queryKey: queryKeys.auth.session(userId ?? 'anonymous'),
    queryFn: () => fetchProfile(claims.data!),
    enabled: Boolean(claims.data),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    retry: (failures, error) => !(error instanceof AccessDeniedError) && failures < 2
  })

  if (claims.isPending) {
    return { isPending: true, session: null, deniedEmail: null, error: null }
  }

  if (!claims.data) {
    return {
      isPending: false,
      session: null,
      deniedEmail: null,
      error: (claims.error as Error | null) ?? null
    }
  }

  if (profile.isPending) {
    return { isPending: true, session: null, deniedEmail: null, error: null }
  }

  if (profile.error instanceof AccessDeniedError) {
    return {
      isPending: false,
      session: null,
      deniedEmail: profile.error.email || claims.data.email || '',
      error: null
    }
  }

  return {
    isPending: false,
    session: profile.data ?? null,
    deniedEmail: null,
    error: (profile.error as Error | null) ?? null
  }
}

export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
  })
}

export function useGoogleSignInEnabled(): boolean {
  const { data } = useQuery({
    queryKey: queryKeys.auth.googleEnabled,
    queryFn: fetchGoogleSignInEnabled,
    staleTime: Infinity,
    retry: false
  })
  return data === true
}

export function useSignInWithGoogle() {
  return useMutation({ mutationFn: signInWithGoogle })
}

export function useSendPasswordReset() {
  return useMutation({ mutationFn: sendPasswordReset })
}

export function useUpdateOwnPassword() {
  return useMutation({ mutationFn: updateOwnPassword })
}

export function useSignOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: signOut,
    onSettled: () => queryClient.clear()
  })
}
