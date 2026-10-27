import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth, RequireOwner } from '@app/guards'
import { AppShell } from '@app/layout/AppShell'
import { useLeadHandover } from '@modules/leads/hooks/useLeadHandover'
import { LoginPage } from '@platform/auth/pages/LoginPage'
import { ResetPasswordPage } from '@platform/auth/pages/ResetPasswordPage'

const OverviewPage = lazy(() =>
  import('@app/pages/OverviewPage').then((m) => ({ default: m.OverviewPage }))
)
const LeadsPage = lazy(() =>
  import('@modules/leads/pages/LeadsPage').then((m) => ({ default: m.LeadsPage }))
)
const NewLeadsPage = lazy(() =>
  import('@modules/leads/pages/NewLeadsPage').then((m) => ({ default: m.NewLeadsPage }))
)
const CallsPage = lazy(() =>
  import('@modules/leads/pages/CallsPage').then((m) => ({ default: m.CallsPage }))
)
const CampaignsPage = lazy(() =>
  import('@modules/leads/pages/CampaignsPage').then((m) => ({ default: m.CampaignsPage }))
)
const ProjectsPage = lazy(() =>
  import('@modules/leads/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage }))
)
const KpiAdminPage = lazy(() =>
  import('@modules/performance/pages/KpiAdminPage').then((m) => ({ default: m.KpiAdminPage }))
)
const MyPerformancePage = lazy(() =>
  import('@modules/performance/pages/MyPerformancePage').then((m) => ({
    default: m.MyPerformancePage
  }))
)
const ReportsPage = lazy(() =>
  import('@modules/performance/pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
)
const TeamPerformancePage = lazy(() =>
  import('@modules/performance/pages/TeamPerformancePage').then((m) => ({
    default: m.TeamPerformancePage
  }))
)
const AccountPage = lazy(() =>
  import('@platform/auth/pages/AccountPage').then((m) => ({ default: m.AccountPage }))
)
const PrivacyPage = lazy(() =>
  import('@app/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
)
const UsersPage = lazy(() =>
  import('@platform/users/pages/UsersPage').then((m) => ({ default: m.UsersPage }))
)

function UsersScreen() {
  const moveLeads = useLeadHandover()
  return <UsersPage moveLeads={moveLeads} />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/new" element={<NewLeadsPage />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route
            path="/campaigns"
            element={
              <RequireOwner>
                <CampaignsPage />
              </RequireOwner>
            }
          />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/performance" element={<MyPerformancePage />} />
          <Route
            path="/performance/team"
            element={
              <RequireOwner>
                <TeamPerformancePage />
              </RequireOwner>
            }
          />
          <Route
            path="/kpis"
            element={
              <RequireOwner>
                <KpiAdminPage />
              </RequireOwner>
            }
          />
          <Route
            path="/projects"
            element={
              <RequireOwner>
                <ProjectsPage />
              </RequireOwner>
            }
          />
          <Route
            path="/users"
            element={
              <RequireOwner>
                <UsersScreen />
              </RequireOwner>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
