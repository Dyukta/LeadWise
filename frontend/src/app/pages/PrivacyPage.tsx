import type { ReactNode } from 'react'

import { env } from '@shared/lib/env'
import { Card } from '@shared/ui/Card'

const UPDATED = '21 September 2026'
const CONTACT = env.contactEmail

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2 text-sm leading-relaxed text-slate-600">
      <h2 className="text-base font-semibold text-ink">{heading}</h2>
      {children}
    </section>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-slate-300">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function Mail() {
  return (
    <a href={`mailto:${CONTACT}`} className="font-medium text-brand-600 hover:text-brand-700">
      {CONTACT}
    </a>
  )
}

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Privacy Policy</h1>
        <p className="mt-1 text-xs text-slate-400">Last updated {UPDATED}</p>
      </header>

      <Card padding="lg">
        <div className="space-y-7">
          <Section heading="Who this covers">
            <p>
              This policy explains how {env.appName} handles information in its internal
              dashboard. The dashboard is used only by staff we give an account to, for managing
              leads, projects, daily reports and team performance.
            </p>
          </Section>

          <Section heading="What we hold">
            <Bullets
              items={[
                'Staff accounts: name, email address, role and whether the account is active.',
                'Work records: daily reports, attendance, KPI targets, project goals and progress entered by staff.',
                'Customer leads: name, phone number, source, project of interest, budget, configuration, possession timeline, status, follow up dates and notes.',
                'An edit trail on each lead, so we can see who changed what and when.'
              ]}
            />
          </Section>

          <Section heading="How we use it">
            <p>
              Only to run the business: following up on enquiries, assigning leads to staff,
              handing work over when someone leaves a role, and measuring team performance. We do
              not sell or rent this information, and we do not share it with advertisers.
            </p>
          </Section>

          <Section heading="Google account access">
            <p>
              The dashboard offers Google sign in for staff. We use it only to confirm who you are,
              never to read your mail, files or contacts. Our use of information received from
              Google APIs follows the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </Section>

          <Section heading="Where it is stored">
            <p>
              Records live in our Supabase Postgres database and are read and written only through
              our own API. Supabase handles sign in. Access is limited to active staff accounts
              that are signed in, and each person sees only what their role allows.
            </p>
          </Section>

          <Section heading="How long we keep it">
            <p>
              We keep lead and work records for as long as they are needed for business and legal
              purposes, then delete them. Turning off a staff account removes that person's access
              immediately.
            </p>
          </Section>

          <Section heading="Your choices">
            <p>
              If you are a customer or a staff member and want to see, correct or delete what we
              hold about you, email <Mail /> and we will respond within 30 days.
            </p>
          </Section>

          <Section heading="Contact">
            <p>
              {env.appName}: <Mail />
            </p>
          </Section>
        </div>
      </Card>
    </div>
  )
}
