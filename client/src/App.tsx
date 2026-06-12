import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmployerDashboard from './pages/employer/EmployerDashboard';
import EmployeeDetail from './pages/employer/EmployeeDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBons from './pages/admin/AdminBons';
import AdminStats from './pages/admin/AdminStats';
import AdminRachats from './pages/admin/AdminRachats';
import AdminTauxRachat from './pages/admin/AdminTauxRachat';
import AdminStatRachats from './pages/admin/AdminStatRachats';
import AdminStatMotifs from './pages/admin/AdminStatMotifs';
import AdminCompanyDetail from './pages/admin/AdminCompanyDetail';
import AdminVoucherDetail from './pages/admin/AdminVoucherDetail';
import Catalogue from './pages/employee/Catalogue';
import CategorieDetail from './pages/employee/CategorieDetail';
import VoucherDetail from './pages/employee/VoucherDetail';
import Profil from './pages/employee/Profil';
import Parameters from './pages/employee/Parameters';
import Historique from './pages/Historique';
import Panier from './pages/Panier';
import Service from './pages/Service';
import Abonnement from './pages/Abonnement';
import MotDePasse from './pages/MotDePasse';
import CGU from './pages/CGU';
import Avis from './pages/Avis';
import MesInformations from './pages/MesInformations';
import FAQ from './pages/FAQ';
import PourToi from './pages/PourToi';

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <HomePage />;
  if (user.role === 'employer') return <Navigate to="/employer/dashboard" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/catalogue" replace />;
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Employer-only */}
          <Route path="/employer/dashboard" element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Layout><EmployerDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/employer/employees/:id" element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Layout><EmployeeDetail /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin-only */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout><AdminDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/companies/:id" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout><AdminCompanyDetail /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/bons" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout><AdminBons /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/bons/:id" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout><AdminVoucherDetail /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/stats" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout><AdminStats /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/rachats" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout><AdminRachats /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/taux-rachat" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout><AdminTauxRachat /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/stat-rachats" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout><AdminStatRachats /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/stat-motifs" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout><AdminStatMotifs /></Layout>
            </ProtectedRoute>
          } />

          {/* All authenticated users */}
          <Route path="/catalogue" element={
            <ProtectedRoute>
              <Layout><Catalogue /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/catalogue/categorie/:category" element={
            <ProtectedRoute>
              <Layout><CategorieDetail /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/catalogue/offre/:id" element={
            <ProtectedRoute>
              <Layout><VoucherDetail /></Layout>
            </ProtectedRoute>
          } />

          {/* All authenticated users */}
          <Route path="/profil"      element={<Wrap><Profil /></Wrap>} />
          <Route path="/parametres"  element={<Wrap><Parameters /></Wrap>} />
          <Route path="/historique"  element={<Wrap><Historique /></Wrap>} />
          <Route path="/panier"      element={<Wrap><Panier /></Wrap>} />
          <Route path="/service"      element={<Wrap><Service /></Wrap>} />
          <Route path="/mes-informations" element={<Wrap><MesInformations /></Wrap>} />
          <Route path="/faq"              element={<Wrap><FAQ /></Wrap>} />
          <Route path="/pour-toi"        element={<Wrap><PourToi /></Wrap>} />
          <Route path="/mot-de-passe" element={<Wrap><MotDePasse /></Wrap>} />
          <Route path="/cgu"          element={<Wrap><CGU /></Wrap>} />
          <Route path="/avis"         element={<Wrap><Avis /></Wrap>} />
          <Route path="/abonnement" element={
            <ProtectedRoute allowedRoles={['employer']}>
              <Layout><Abonnement /></Layout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
