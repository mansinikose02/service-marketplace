import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ClientDashboard from './pages/ClientDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import ProviderProfilePage from './pages/ProviderProfilePage';
import PostRequirementPage from './pages/PostRequirementPage';
import MyRequirementsPage from './pages/MyRequirementsPage';
import RequirementDetailPage from './pages/RequirementDetailPage';
import BrowseRequirementsPage from './pages/BrowseRequirementsPage';
import RequirementBidPage from './pages/RequirementBidPage';
import MyBidsPage from './pages/MyBidsPage';
import MyDealsPage from './pages/MyDealsPage';
import DealDetailPage from './pages/DealDetailPage';
import PublicProviderProfilePage from './pages/PublicProviderProfilePage';
import ProviderDirectoryPage from './pages/ProviderDirectoryPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Mode B: redirect authenticated users away from public routes */}
        <Route element={<AuthGuard />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Mode A: require client role */}
        <Route element={<AuthGuard requiredRole="client" />}>
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/client/requirements/new" element={<PostRequirementPage />} />
          <Route path="/client/requirements" element={<MyRequirementsPage />} />
          <Route path="/client/requirements/:id" element={<RequirementDetailPage />} />
          <Route path="/client/deals" element={<MyDealsPage />} />
          <Route path="/client/deals/:id" element={<DealDetailPage />} />
          <Route path="/client/providers" element={<ProviderDirectoryPage />} />
          <Route path="/providers/:providerId" element={<PublicProviderProfilePage />} />
        </Route>

        {/* Mode A: require provider role */}
        <Route element={<AuthGuard requiredRole="provider" />}>
          <Route path="/provider/dashboard" element={<ProviderDashboard />} />
          <Route path="/provider/profile" element={<ProviderProfilePage />} />
          <Route path="/provider/requirements" element={<BrowseRequirementsPage />} />
          <Route path="/provider/requirements/:id" element={<RequirementBidPage />} />
          <Route path="/provider/bids" element={<MyBidsPage />} />
          <Route path="/provider/deals" element={<MyDealsPage />} />
          <Route path="/provider/deals/:id" element={<DealDetailPage />} />
          <Route path="/providers/:providerId" element={<PublicProviderProfilePage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
