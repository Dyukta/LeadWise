import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth, RequireOwner } from '@app/guards'
import { AppShell } from '@app/layout/AppShell'
import { LoginPage } from '@pages/login/LoginPage'
import { SetPasswordPage } from '@pages/set-password/SetPasswordPage'

const OverviewPage = lazy(() =>
  import('@pages/overview/OverviewPage').then((m) => ({ default: m.OverviewPage }))
)
const LeadsPage = lazy(() =>
  import('@pages/leads/LeadsPage').then((m) => ({ default: m.LeadsPage }))
)
const FollowUpsPage = lazy(() =>
  import('@pages/follow-ups/FollowUpsPage').then((m) => ({ default: m.FollowUpsPage }))
)
const PerformancePage = lazy(() =>
  import('@pages/performance/PerformancePage').then((m) => ({ default: m.PerformancePage }))
)
const BookedPage = lazy(() =>
  import('@pages/booked/BookedPage').then((m) => ({ default: m.BookedPage }))
)
const AddLeadPage = lazy(() =>
  import('@pages/add-lead/AddLeadPage').then((m) => ({ default: m.AddLeadPage }))
)
const CampaignsPage = lazy(() =>
  import('@pages/campaigns/CampaignsPage').then((m) => ({ default: m.CampaignsPage }))
)
const TeamPerformancePage = lazy(() =>
  import('@pages/performance/TeamPerformancePage').then((m) => ({ default: m.TeamPerformancePage }))
)
const AccountPage = lazy(() =>
  import('@pages/account/AccountPage').then((m) => ({ default: m.AccountPage }))
)
const UsersPage = lazy(() =>
  import('@pages/users/UsersPage').then((m) => ({ default: m.UsersPage }))
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
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
          <Route path="/add-lead" element={<AddLeadPage />} />
          <Route path="/follow-ups"element={<FollowUpsPage />} />
          <Route path="/booked" element={<BookedPage />} />
          <Route path="/download" element={<Navigate to="/add-lead?tab=download" replace />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route
            path="/campaigns"
            element={
              <RequireOwner>
                <CampaignsPage />
              </RequireOwner>
            }
          />
          <Route path="/calls" element={<Navigate to="/performance" replace />} />
          <Route path="/team-calls" element={<Navigate to="/team-performance" replace />} />
          <Route
            path="/team-performance"
            element={
              <RequireOwner>
                <TeamPerformancePage />
              </RequireOwner>
            }
          />
          <Route
            path="/users"
            element={
              <RequireOwner>
                <UsersPage />
              </RequireOwner>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
