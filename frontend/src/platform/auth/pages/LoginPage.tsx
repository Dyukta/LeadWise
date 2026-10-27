import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { AuthCard, Screen } from '@platform/auth/components/AuthScreen'
import { hasErrors, validateCredentials, validateEmail, type FieldErrors } from '@platform/auth/domain/credentials'
import { isCancelledSignIn, readRedirectError, type RedirectError } from '@platform/auth/domain/session'
import { useGoogleSignInEnabled, useSendPasswordReset, useSession, useSignIn, useSignInWithGoogle, useSignOut } from '@platform/auth/hooks/useSession'
import { env, type DemoAccount } from '@shared/lib/env'
import { Button } from '@shared/ui/Button'
import { Input } from '@shared/ui/Input'
import { PasswordInput } from '@shared/ui/PasswordInput'

export function LoginPage() {
  const location = useLocation()
  const { session, isPending, deniedEmail, error } = useSession()
  const signIn = useSignIn()
  const signInWithGoogle = useSignInWithGoogle()
  const googleEnabled = useGoogleSignInEnabled()
  const signOut = useSignOut()
  const reset = useSendPasswordReset()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [redirectError, setRedirectError] = useState<RedirectError | null>(readRedirectError)
  const [demoResetBlocked, setDemoResetBlocked] = useState(false)
  const [googleBlocked, setGoogleBlocked] = useState(false)

  useEffect(() => {
    if (!redirectError) return
    window.history.replaceState(null, '', window.location.pathname)
  }, [redirectError])

  const fieldErrors: FieldErrors = submitted ? validateCredentials(email, password) : {}

  if (isPending) return null

  if (session) {
    const from = (location.state as { from?: string } | null)?.from ?? '/overview'
    return <Navigate to={from} replace />
  }

  const blockedSignIn = redirectError && !isCancelledSignIn(redirectError) ? redirectError : null

  if (blockedSignIn) {
    return (
      <Screen>
        <AuthCard title="No access" centered>
          <p className="text-sm text-slate-600">
            <WithBoldEmail text={blockedSignIn.description} />
          </p>
          <p className="mt-3 text-sm text-slate-600">
            You can also sign in with your email and password.
          </p>
          <Button className="mt-5 w-full" onClick={() => setRedirectError(null)}>
            Back to sign in
          </Button>
        </AuthCard>
      </Screen>
    )
  }

  if (deniedEmail !== null) {
    return (
      <Screen>
        <AuthCard title="No access">
          <p className="text-sm text-slate-600">
            {deniedEmail || 'This account'} is not on the {env.appName} access list. Ask
            the owner to add you under Users, then sign in again.
          </p>
          <Button
            variant="secondary"
            className="mt-5 w-full"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
          >
            Use a different account
          </Button>
        </AuthCard>
      </Screen>
    )
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setRedirectError(null)

    if (hasErrors(validateCredentials(email, password))) return

    signIn.mutate({ email, password })
  }

  const formError =
    (signIn.isError ? (signIn.error as Error).message : null) ??
    (signInWithGoogle.isError ? (signInWithGoogle.error as Error).message : null) ??
    (reset.isError ? (reset.error as Error).message : null) ??
    error?.message ??
    null

  const busy = signIn.isPending || signInWithGoogle.isPending

  return (
    <Screen>
      <div className="flex w-full max-w-3xl flex-col items-center gap-4 md:flex-row md:items-stretch md:justify-center">
        <AuthCard title={env.appName}>
          <form className="space-y-4" onSubmit={submit} noValidate>
            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              error={fieldErrors.email}
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
            />
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              value={password}
              error={fieldErrors.password}
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
            />

            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy || reset.isPending}
                onClick={() => {
                  setSubmitted(true)
                  const demo = isDemoEmail(email)
                  setDemoResetBlocked(demo)
                  if (demo) reset.reset()
                  else if (!validateEmail(email)) reset.mutate(email)
                }}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                {reset.isPending ? 'Sending…' : 'Forgot password?'}
              </button>
            </div>

            {demoResetBlocked && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Password reset does not work for demo accounts: their addresses have no inbox, so the
                reset email can never arrive. Use the demo password shown on this page.
              </p>
            )}

            {reset.isSuccess && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                If that address has an account, a reset link is on its way. If nothing arrives in a
                few minutes, ask the owner to set a new password for you from the Users page.
              </p>
            )}

            {formError && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {signIn.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          {/* Shown even when the Google provider is off, so the demo still shows the option. */}
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={() => (googleEnabled ? signInWithGoogle.mutate() : setGoogleBlocked(true))}
          >
            <GoogleIcon />
            {signInWithGoogle.isPending ? 'Redirecting…' : 'Continue with Google'}
          </Button>
          {googleBlocked && (
            <p role="status" className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Google sign in is turned off in this demo, which runs in a controlled environment.
              Sign in with an email and password instead.
            </p>
          )}
          <p className="mt-5 text-center text-xs text-slate-500">
            Accounts are created by the owner. Ask for access if you do not have one.
          </p>
        </AuthCard>
        {env.demo.accounts.length > 0 && (
          <DemoAccounts
            disabled={busy}
            onPick={(account) => {
              setEmail(account.email)
              if (env.demo.password) setPassword(env.demo.password)
              setDemoResetBlocked(false)
            }}
          />
        )}
      </div>
    </Screen>
  )
}

function isDemoEmail(email: string): boolean {
  const typed = email.trim().toLowerCase()
  return env.demo.accounts.some((account) => account.email.toLowerCase() === typed)
}

function DemoAccounts({
  disabled,
  onPick
}: {
  disabled: boolean
  onPick: (account: DemoAccount) => void
}) {
  return (
    <section
      aria-labelledby="demo-accounts"
      className="flex w-full max-w-sm flex-col rounded-2xl border border-brand-200 bg-brand-50 p-5 shadow-sm sm:p-7"
    >
      <h2 id="demo-accounts" className="text-xl font-bold text-ink">
        Demo access
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Use one of these accounts to explore the dashboard.
        {env.demo.password && (
          <>
            {' '}
            Password:{' '}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-2xs font-semibold text-ink">
              {env.demo.password}
            </code>
          </>
        )}
      </p>

      <ul className="mt-5 space-y-3">
        {env.demo.accounts.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(account)}
              className="flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-white">
                  {account.role}
                </span>
                <span className="text-xs font-semibold text-brand-600">Use this account</span>
              </span>
              <span className="text-sm font-medium text-ink">{account.email}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 md:mt-auto">
        Password reset will not work for these accounts: their addresses have no inbox, so no
        reset email can be delivered.
      </p>
    </section>
  )
}

function WithBoldEmail({ text }: { text: string }) {
  const match = /[^\s@]+@[^\s@]+\.[^\s@]+/.exec(text)
  if (!match) return <>{text}</>

  return (
    <>
      {text.slice(0, match.index)}
      <strong className="font-semibold wrap-break-words text-ink">{match[0]}</strong>
      {text.slice(match.index + match[0].length)}
    </>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}
