import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import LoginPage from './pages/LoginPage.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import ClientLayout from './components/layout/ClientLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import JobsPage from './pages/JobsPage.jsx';
import CandidatesPage from './pages/CandidatesPage.jsx';
import MatchesPage from './pages/MatchesPage.jsx';
import PipelinePage from './pages/PipelinePage.jsx';
import UploadResumePage from './pages/UploadResumePage.jsx';
import CandidateDetailPage from './pages/CandidateDetailPage.jsx';
import JobDetailPage from './pages/JobDetailPage.jsx';
import AgencyClientsPage from './pages/AgencyClientsPage.jsx';
import AgencyVendorsPage from './pages/AgencyVendorsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx';
import VendorDashboardPage from './pages/VendorDashboardPage.jsx';
import ClientDashboardPage from './pages/client/ClientDashboardPage.jsx';
import ClientRequirementsPage from './pages/client/ClientRequirementsPage.jsx';
import ClientSubmissionsPage from './pages/client/ClientSubmissionsPage.jsx';
import ClientSubmissionDetailPage from './pages/client/ClientSubmissionDetailPage.jsx';
import PublicJobsPage from './pages/public/PublicJobsPage.jsx';
import PublicJobDetailPage from './pages/public/PublicJobDetailPage.jsx';
import PublicRegisterPage from './pages/public/PublicRegisterPage.jsx';

// Redirects to the right home based on org type
const HomeRedirect = () => {
  const { user } = useAuthStore();
  if (user?.orgType === 'client')  return <Navigate to="/client" replace />;
  if (user?.orgType === 'vendor')  return <VendorDashboardPage />;
  return <DashboardPage />;
};

// Only allows non-client orgs (staffing agency, vendor)
const AgencyRoute = ({ children }) => {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.orgType === 'client') return <Navigate to="/client" replace />;
  return children;
};

// Only allows client org users
const ClientRoute = ({ children }) => {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.orgType !== 'client') return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Agency / Vendor portal */}
        <Route
          path="/"
          element={
            <AgencyRoute>
              <DashboardLayout />
            </AgencyRoute>
          }
        >
          <Route index element={<HomeRedirect />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="candidates/:id" element={<CandidateDetailPage />} />
          <Route path="clients" element={<AgencyClientsPage />} />
          <Route path="vendors" element={<AgencyVendorsPage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="upload" element={<UploadResumePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/clients" replace />} />
            <Route path="clients" element={<AgencyClientsPage showOnboard />} />
            <Route path="vendors" element={<AgencyVendorsPage showOnboard />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>

        {/* Client portal */}
        <Route
          path="/client"
          element={
            <ClientRoute>
              <ClientLayout />
            </ClientRoute>
          }
        >
          <Route index element={<ClientDashboardPage />} />
          <Route path="requirements" element={<ClientRequirementsPage />} />
          <Route path="submissions" element={<ClientSubmissionsPage />} />
          <Route path="submissions/:id" element={<ClientSubmissionDetailPage />} />
        </Route>

        {/* Public job board — no auth required */}
        <Route path="/board" element={<PublicJobsPage />} />
        <Route path="/board/register" element={<PublicRegisterPage />} />
        <Route path="/board/:id" element={<PublicJobDetailPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
