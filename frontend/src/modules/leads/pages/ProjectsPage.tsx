import { Check, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { type Project, type ProjectGoal } from '@modules/leads/domain/projects'
import { useProjects, useWriteProject } from '@modules/leads/hooks/useProjects'
import { useUsers } from '@platform/users/hooks/useUsers'
import { cn } from '@shared/lib/cn'
import { formatDate, toKey, todayKey } from '@shared/lib/date'
import { Badge } from '@shared/ui/Badge'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { DateRangePicker } from '@shared/ui/DateRangePicker'
import { Input } from '@shared/ui/Input'
import { Loading } from '@shared/ui/Loading'
import { Modal } from '@shared/ui/Modal'
import { Progress } from '@shared/ui/Progress'

const today = () => todayKey()

function monthEnd(): string {
  const now = new Date()
  return toKey(new Date(now.getFullYear(), now.getMonth() + 1, 0))
}

export function ProjectsPage() {
  const { projects, goals, isPending, isError, error } = useProjects()
  const write = useWriteProject()

  const [editing, setEditing] = useState<{ project: Project | null } | null>(null)
  const [doomed, setDoomed] = useState<{ project: Project; goal: ProjectGoal | null } | null>(null)
  const [goalFor, setGoalFor] = useState<{ project: Project; goal: ProjectGoal | null } | null>(
    null
  )

  const closeDoomed = () => {
    write.reset()
    setDoomed(null)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Projects</h1>
        <Button onClick={() => setEditing({ project: null })} disabled={isPending}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </header>

      {isError && <p className="text-sm text-red-600">{(error as Error).message}</p>}

      {isPending ? (
        <Loading />
      ) : projects.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            No projects yet. Add one, then put people on it.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const mine = goals.filter((goal) => goal.projectId === project.id)

            return (
              <Card key={project.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink">{project.name}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {project.memberNames.length > 0
                        ? project.memberNames.join(', ')
                        : 'Nobody assigned'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditing({ project })}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setGoalFor({ project, goal: null })}
                    >
                      <Target className="h-4 w-4" />
                      Add goal
                    </Button>
                    <Button
                      variant="ghostDanger"
                      size="sm"
                      onClick={() => setDoomed({ project, goal: null })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {mine.length === 0 ? (
                  <p className="text-sm text-slate-500">No goals set for this project.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {mine.map((goal) => (
                      <li key={goal.id} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setGoalFor({ project, goal })}
                              className="truncate text-sm font-medium text-ink hover:text-brand-700"
                            >
                              {goal.name}
                            </button>
                            <Badge tone={goal.running ? 'info' : 'neutral'}>
                              {goal.running ? 'Running' : 'Not running'}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatDate(goal.from)} to {formatDate(goal.to)}
                            {goal.reward && (
                              <span className="text-amber-700"> · {goal.reward}</span>
                            )}
                          </p>
                          <Progress
                            value={goal.pct}
                            color={goal.pct >= 100 ? 'var(--color-grade-a)' : 'var(--color-brand-500)'}
                            heightClassName="h-1.5"
                            trackClassName="bg-slate-100"
                            className="mt-1.5"
                          />
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-ink">
                            {goal.achieved} / {goal.target}
                          </p>
                          <p className="text-xs text-slate-400">{goal.pct}%</p>
                        </div>
                        <Button
                          variant="ghostDanger"
                          size="sm"
                          onClick={() => setDoomed({ project, goal })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {doomed && (
        <Modal
          open
          onClose={closeDoomed}
          title={doomed.goal ? 'Delete goal' : 'Delete project'}
          footer={
            <>
              <Button variant="secondary" onClick={closeDoomed} disabled={write.isPending}>
                Keep
              </Button>
              <Button
                variant="danger"
                disabled={write.isPending}
                onClick={() =>
                  write.mutate(
                    doomed.goal
                      ? { action: 'deleteGoal', goalId: doomed.goal.id }
                      : { action: 'deleteProject', projectId: doomed.project.id },
                    { onSuccess: closeDoomed }
                  )
                }
              >
                {write.isPending ? 'Deleting…' : doomed.goal ? 'Delete goal' : 'Delete project'}
              </Button>
            </>
          }
        >
          {doomed.goal ? (
            <p className="text-sm text-slate-600">
              Delete the <span className="font-semibold text-ink">{doomed.goal.name}</span> goal
              from {doomed.project.name}? Its progress goes with it.
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Delete <span className="font-semibold text-ink">{doomed.project.name}</span> and its
              goals? Its leads stay, but only the owner will see them. Archive instead to just hide
              it.
            </p>
          )}
          {write.isError && (
            <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {write.error.message}
            </p>
          )}
        </Modal>
      )}
      {editing && (
        <ProjectDialog
          key={editing.project?.id ?? 'new'}
          project={editing.project}
          onClose={() => setEditing(null)}
        />
      )}
      {goalFor && (
        <GoalDialog
          project={goalFor.project}
          goal={goalFor.goal}
          onClose={() => setGoalFor(null)}
        />
      )}
    </div>
  )
}

function ProjectDialog({
  project,
  onClose
}: {
  project: Project | null
  onClose: () => void
}) {
  const users = useUsers()
  const write = useWriteProject()

  const [name, setName] = useState(project?.name ?? '')
  const [picked, setPicked] = useState<string[]>(project?.memberIds ?? [])
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const roster = (users.data ?? []).filter((person) => person.active)
  const allPicked = roster.length > 0 && picked.length === roster.length

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )

  const sameTeam =
    project !== null &&
    picked.length === project.memberIds.length &&
    picked.every((id) => project.memberIds.includes(id))

  const trimmed = name.trim()
  const blocked = !trimmed ? 'Name the project.' : null

  const submit = async () => {
    if (blocked || busy) return
    setBusy(true)
    setFailure(null)

    try {
      let projectId = project?.id ?? ''

      if (!project) {
        const created = await write.mutateAsync({ action: 'addProject', name: trimmed })
        projectId = created.projectId ?? ''
      } else if (trimmed !== project.name) {
        await write.mutateAsync({ action: 'updateProject', projectId, name: trimmed })
      }

      if (projectId && !sameTeam) {
        await write.mutateAsync({ action: 'setMembers', projectId, userIds: picked })
      }
      onClose()
    } catch (error) {
      setFailure((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={project ? `Edit ${project.name}` : 'New project'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={blocked !== null || busy}>
            {busy ? 'Saving…' : project ? 'Save changes' : 'Add project'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Project name"
          autoFocus
          value={name}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
        />

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-700">
              Team <span className="text-xs font-normal text-slate-400">(optional)</span>
            </span>
            {roster.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPicked(allPicked ? [] : roster.map((person) => person.id))}
                className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                {allPicked ? 'Clear all' : 'Select all'}
              </button>
            )}
          </div>
          <p className="mb-2 text-xs text-slate-500">
            Only these people see this project&apos;s leads.
          </p>
          {roster.length === 0 ? (
            <p className="text-sm text-slate-500">Nobody is active.</p>
          ) : (
            <ul className="scrollbar-thin max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-300">
              {roster.map((person) => {
                const on = picked.includes(person.id)
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggle(person.id)}
                      aria-pressed={on}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                        on ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'
                        )}
                      >
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{person.fullName || person.email}</span>
                      {person.role === 'owner' && (
                        <span className="ml-auto text-2xs uppercase tracking-wide text-slate-400">
                          owner
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {failure && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {failure}
          </p>
        )}
      </div>
    </Modal>
  )
}

function GoalDialog({
  project,
  goal,
  onClose
}: {
  project: Project
  goal: ProjectGoal | null
  onClose: () => void
}) {
  const write = useWriteProject()

  const [goalName, setGoalName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal ? String(goal.target) : '')
  const [reward, setReward] = useState(goal?.reward ?? '')
  const [range, setRange] = useState<{ from: string; to: string }>({
    from: goal?.from ?? today(),
    to: goal?.to ?? monthEnd()
  })

  const targetValue = Number(target)
  const blocked = !goalName.trim()
    ? 'Name the goal.'
    : !isFinite(targetValue) || targetValue <= 0
      ? 'The target must be a number above zero.'
      : !range.from || !range.to
        ? 'Pick the dates this goal runs between.'
        : null

  return (
    <Modal
      open
      onClose={onClose}
      title={goal ? 'Edit goal' : `New goal for ${project.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={blocked !== null || write.isPending}
            onClick={() =>
              write.mutate(
                {
                  action: 'saveGoal',
                  ...(goal ? { goalId: goal.id } : {}),
                  projectId: project.id,
                  name: goalName.trim(),
                  target: targetValue,
                  from: range.from,
                  to: range.to,
                  reward: reward.trim()
                },
                { onSuccess: onClose }
              )
            }
          >
            {write.isPending ? 'Saving…' : 'Save goal'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Goal"
            autoFocus
            value={goalName}
            onChange={(event) => setGoalName(event.target.value)}
          />
          <Input
            label="Target"
            inputMode="numeric"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </div>

        <Input
          label="Reward"
          value={reward}
          onChange={(event) => setReward(event.target.value)}
        />

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Runs between</span>
          <DateRangePicker
            className="w-full"
            value={range}
            label="Pick the dates"
            onChange={setRange}
            onClear={() => setRange({ from: today(), to: monthEnd() })}
          />
        </div>

        {blocked && <p className="text-sm text-amber-700">{blocked}</p>}
        {write.isError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {write.error.message}
          </p>
        )}
      </div>
    </Modal>
  )
}
