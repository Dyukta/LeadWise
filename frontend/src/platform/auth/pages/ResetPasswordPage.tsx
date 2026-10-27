import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { AuthCard, Screen } from '@platform/auth/components/AuthScreen'
import { readRedirectError } from '@platform/auth/domain/session'
import { useSession, useUpdateOwnPassword } from '@platform/auth/hooks/useSession'
import { Button } from '@shared/ui/Button'
import { PasswordInput } from '@shared/ui/PasswordInput'

const MIN_PASSWORD = 8

export function ResetPasswordPage() {
  const { session, isPending } = useSession()
  const update = useUpdateOwnPassword()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [linkError] = useState(readRedirectError)

  useEffect(() => {
    if (!linkError) return
    window.history.replaceState(null, '', window.location.pathname)
  }, [linkError])

  if (isPending) return null

  if (linkError || !session) {
    return (
      <Screen>
        <AuthCard title="Link expired">
          <p className="text-sm text-slate-600">
            {linkError?.description ??
              'This password reset link is no longer valid. Ask for a new one from the sign in page.'}
          </p>
          <Link
            to="/login"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Back to sign in
          </Link>
        </AuthCard>
      </Screen>
    )
  }

  if (update.isSuccess) {
    return (
      <Screen>
        <AuthCard title="Password updated">
          <p className="text-sm text-slate-600">
            Your new password is saved. You are signed in as {session.email}.
          </p>
          <Link
            to="/overview"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Go to the dashboard
          </Link>
        </AuthCard>
      </Screen>
    )
  }

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD
  const mismatch = confirm.length > 0 && confirm !== password
  const ready = password.length >= MIN_PASSWORD && confirm === password

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!ready || update.isPending) return
    update.mutate(password)
  }

  return (
    <Screen>
      <AuthCard title="Choose a new password">
        <p className="-mt-4 mb-5 text-sm text-slate-500">{session.email}</p>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            autoFocus
            value={password}
            error={tooShort ? `At least ${MIN_PASSWORD} characters.` : undefined}
            disabled={update.isPending}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordInput
            label="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            error={mismatch ? 'The two passwords do not match.' : undefined}
            disabled={update.isPending}
            onChange={(event) => setConfirm(event.target.value)}
          />

          {update.isError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {(update.error as Error).message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={!ready || update.isPending}>
            {update.isPending ? 'Saving…' : 'Save new password'}
          </Button>
        </form>
      </AuthCard>
    </Screen>
  )
}
