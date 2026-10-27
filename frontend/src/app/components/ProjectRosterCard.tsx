import { Link } from 'react-router-dom'

import type { Lead } from '@modules/leads/api/leadTypes'
import { sameProject, type Project } from '@modules/leads/domain/projects'
import { pluralize } from '@shared/lib/format'
import { Skeleton } from '@shared/ui/Skeleton'

export function ProjectRosterCard({
  projects,
  leads,
  loading,
  owner
}: {
  projects: Project[]
  leads: Lead[]
  loading: boolean
  owner: boolean
}) {
  if (loading) return <Skeleton className="h-40 w-full" />

  if (projects.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        {owner
          ? 'No active projects yet.'
          : 'You are not on any project yet. Ask the owner to add you.'}
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {projects.map((project) => {
        const mine = leads.filter((lead) => sameProject(lead.project, project.name))
        const members = [...project.memberNames].sort((a, b) => a.localeCompare(b))

        return (
          <li key={project.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link
                to={`/leads?view=all&project=${encodeURIComponent(project.name)}`}
                className="text-sm font-semibold text-ink hover:text-brand-700"
              >
                {project.name}
              </Link>
              <span className="text-sm font-bold text-brand-700">
                {pluralize(mine.length, 'lead')}
              </span>
            </div>

            {members.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">Nobody is on this project yet.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {members.map((name) => (
                  <li key={name} className="text-xs text-slate-500">
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
