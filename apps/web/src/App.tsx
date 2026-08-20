import { Navigate, Route, Routes } from "react-router-dom";
import { Role } from "@life-mmp/shared";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { OrgProvider } from "./context/OrgContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { PlatformAdminPage } from "./pages/PlatformAdminPage";
import { OrgAdminPage } from "./pages/OrgAdminPage";
import { SettingsPage } from "./pages/SettingsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MembersPage } from "./pages/MembersPage";
import { MemberDetailPage } from "./pages/MemberDetailPage";
import { HouseholdsPage } from "./pages/HouseholdsPage";
import { FollowUpsPage } from "./pages/FollowUpsPage";
import { EventsPage } from "./pages/EventsPage";
import { AttendancePage } from "./pages/AttendancePage";
import { AttendanceSessionPage } from "./pages/AttendanceSessionPage";
import { CheckInPage } from "./pages/CheckInPage";
import { ImportCenterPage } from "./pages/ImportCenterPage";
import { ImportBatchPage } from "./pages/ImportBatchPage";
import { FellowshipsPage } from "./pages/FellowshipsPage";
import { FellowshipReportsPage } from "./pages/FellowshipReportsPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { DiscipleshipProgramsPage } from "./pages/DiscipleshipProgramsPage";
import { DiscipleshipClassesPage } from "./pages/DiscipleshipClassesPage";
import { DiscipleshipClassDetailPage } from "./pages/DiscipleshipClassDetailPage";
import { DeletionRequestsPage } from "./pages/DeletionRequestsPage";
import { GivingPage } from "./pages/GivingPage";
import { FundsPage } from "./pages/FundsPage";
import { PledgesPage } from "./pages/PledgesPage";
import { GivingBatchesPage } from "./pages/GivingBatchesPage";
import { AccountingPage } from "./pages/AccountingPage";
import { FinancialSettingsPage } from "./pages/FinancialSettingsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { RegistrationsPage } from "./pages/RegistrationsPage";
import { AssetsPage } from "./pages/AssetsPage";
import { FixedAssetsPage } from "./pages/FixedAssetsPage";
import { PartnersPage } from "./pages/PartnersPage";
import { RequisitionsPage } from "./pages/RequisitionsPage";
import { TestimoniesPage } from "./pages/TestimoniesPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <CenteredNote text="Loading…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user } = useAuth();
  if (user && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Platform Administrators create and manage churches -- they aren't a
 * member of any one, and have no business inside a tenant's own data
 * (Section 6's "Platform Admin has no default access to tenant data" is
 * enforced at the RLS layer for writes, but the UI shouldn't let them
 * wander into a tenant screen in the first place, for privacy as much as
 * for avoiding a confusing "this form doesn't actually work for you" dead end). */
function RequireOrgMember({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === Role.PLATFORM_ADMIN) return <Navigate to="/platform" replace />;
  return <>{children}</>;
}

function CenteredNote({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: "var(--ink-muted)" }}>
      {text}
    </div>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === Role.PLATFORM_ADMIN) return <Navigate to="/platform" replace />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register/:slug" element={<RegisterPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/checkin/:token" element={<CheckInPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <HomeRedirect />
                </RequireAuth>
              }
            />
            <Route
              path="/platform"
              element={
                <RequireAuth>
                  <RequireRole role={Role.PLATFORM_ADMIN}>
                    <PlatformAdminPage />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <RequireOrgMember>
                    <RequireRole role={Role.ORG_ADMIN}>
                      <OrgAdminPage />
                    </RequireRole>
                  </RequireOrgMember>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <RequireAuth>
                  <RequireOrgMember>
                    <RequireRole role={Role.ORG_ADMIN}>
                      <SettingsPage />
                    </RequireRole>
                  </RequireOrgMember>
                </RequireAuth>
              }
            />
            <Route path="/members" element={<RequireAuth><RequireOrgMember><MembersPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/members/:id" element={<RequireAuth><RequireOrgMember><MemberDetailPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/households" element={<RequireAuth><RequireOrgMember><HouseholdsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/follow-ups" element={<RequireAuth><RequireOrgMember><FollowUpsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/events" element={<RequireAuth><RequireOrgMember><EventsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/attendance" element={<RequireAuth><RequireOrgMember><AttendancePage /></RequireOrgMember></RequireAuth>} />
            <Route path="/attendance/:id" element={<RequireAuth><RequireOrgMember><AttendanceSessionPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/imports" element={<RequireAuth><RequireOrgMember><ImportCenterPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/imports/:id" element={<RequireAuth><RequireOrgMember><ImportBatchPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/fellowships" element={<RequireAuth><RequireOrgMember><FellowshipsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/fellowships/reports" element={<RequireAuth><RequireOrgMember><FellowshipReportsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/departments" element={<RequireAuth><RequireOrgMember><DepartmentsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/discipleship/programs" element={<RequireAuth><RequireOrgMember><DiscipleshipProgramsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/discipleship/classes" element={<RequireAuth><RequireOrgMember><DiscipleshipClassesPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/discipleship/classes/:id" element={<RequireAuth><RequireOrgMember><DiscipleshipClassDetailPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/deletion-requests" element={<RequireAuth><RequireOrgMember><DeletionRequestsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/giving" element={<RequireAuth><RequireOrgMember><GivingPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/finance/funds" element={<RequireAuth><RequireOrgMember><FundsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/finance/pledges" element={<RequireAuth><RequireOrgMember><PledgesPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/finance/batches" element={<RequireAuth><RequireOrgMember><GivingBatchesPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/finance/accounting" element={<RequireAuth><RequireOrgMember><AccountingPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/finance/settings" element={<RequireAuth><RequireOrgMember><FinancialSettingsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/finance/partners" element={<RequireAuth><RequireOrgMember><PartnersPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/finance/requisitions" element={<RequireAuth><RequireOrgMember><RequisitionsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/testimonies" element={<RequireAuth><RequireOrgMember><TestimoniesPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/reports" element={<RequireAuth><RequireOrgMember><ReportsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/announcements" element={<RequireAuth><RequireOrgMember><AnnouncementsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/registrations" element={<RequireAuth><RequireOrgMember><RegistrationsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/assets" element={<RequireAuth><RequireOrgMember><AssetsPage /></RequireOrgMember></RequireAuth>} />
            <Route path="/fixed-assets" element={<RequireAuth><RequireOrgMember><FixedAssetsPage /></RequireOrgMember></RequireAuth>} />
          </Routes>
        </ThemeProvider>
      </OrgProvider>
    </AuthProvider>
  );
}
