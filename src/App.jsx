import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { TabProvider } from './contexts/TabProvider';
import ProtectedRoute from './components/editor/ProtectedRoute';
import EditorShell from './components/editor/EditorShell';
import HrAdminRoute from './components/HrAdminRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import LoginTestPage from './pages/LoginTestPage';
import AdminDashboardTestPage from './pages/AdminDashboardTestPage';
import StaffDirectoryTestPage from './pages/StaffDirectoryTestPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminOrgStructurePage from './pages/AdminOrgStructurePage';
import StaffDirectoryPage from './pages/StaffDirectoryPage';
import JobArchitecturePage from './pages/JobArchitecturePage';
import AdminDashboardPage from './pages/AdminDashboardPage';

/**
 * Main layout: renders Routes for all pages, plus a persistent EditorShell
 * that lives outside the route tree so it never unmounts.
 */
function AppLayout() {
  const { loading } = useAuth();

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <Routes>
          {/* ── Public routes ────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/test-login" element={<LoginTestPage />} />
          <Route path="/test-admin" element={<AdminDashboardTestPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ── Protected routes ─────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/folder/:folderId"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Public chart links may render without a session. FlowApp checks
              public/owner/share visibility after loading the chart. */}
          <Route path="/chart/:chartId" element={<div />} />

          {/* ── HR admin routes ───────────────────────────── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <HrAdminRoute>
                  <AdminDashboardPage />
                </HrAdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/org-structure"
            element={
              <ProtectedRoute>
                <HrAdminRoute>
                  <AdminOrgStructurePage />
                </HrAdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute>
                <HrAdminRoute>
                  <StaffDirectoryPage />
                </HrAdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff-preview"
            element={
              <ProtectedRoute>
                <HrAdminRoute>
                  <StaffDirectoryTestPage />
                </HrAdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/job-architecture"
            element={
              <ProtectedRoute>
                <HrAdminRoute>
                  <JobArchitecturePage />
                </HrAdminRoute>
              </ProtectedRoute>
            }
          />

          {/* ── 404 ──────────────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      {/* Persistent editor — never unmounts once a chart has been opened */}
      {!loading && <EditorShell />}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TabProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </TabProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
