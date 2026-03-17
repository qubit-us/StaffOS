import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import LoginPage from './pages/LoginPage.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import JobsPage from './pages/JobsPage.jsx';
import CandidatesPage from './pages/CandidatesPage.jsx';
import MatchesPage from './pages/MatchesPage.jsx';
import PipelinePage from './pages/PipelinePage.jsx';
import UploadResumePage from './pages/UploadResumePage.jsx';
import CandidateDetailPage from './pages/CandidateDetailPage.jsx';
import JobDetailPage from './pages/JobDetailPage.jsx';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="candidates/:id" element={<CandidateDetailPage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="upload" element={<UploadResumePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
