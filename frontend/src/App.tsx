import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppLayout from './components/Layout/AppLayout';
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Login/RegisterPage';
import ClientDashboard from './pages/Client/ClientDashboard';
import ProviderDashboard from './pages/ServiceProvider/ProviderDashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AppointmentsPage from './pages/Client/AppointmentsPage';
import BookingPage from './pages/Client/BookingPage';
import ClientMessagesPage from './pages/Client/ClientMessagesPage';
import ServicesPage from './pages/ServiceProvider/ServicesPage';
import MessagesPage from './pages/ServiceProvider/MessagesPage';
import SettingsPage from './pages/ServiceProvider/SettingsPage';
import LoadingSpinner from './components/common/LoadingSpinner';

function MessagesRouter() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'CLIENT') return <ClientMessagesPage />;
  return <MessagesPage />;
}

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'ADMIN') return <AdminDashboard />;
  if (user.role === 'SERVICE_PROVIDER') return <ProviderDashboard />;
  return <ClientDashboard />;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner size="lg" />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function RequireClient({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user && user.role !== 'CLIENT') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner size="lg" />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      <Route path="/dashboard" element={<RequireAuth><DashboardRouter /></RequireAuth>} />
      <Route path="/appointments" element={<RequireAuth><AppointmentsPage /></RequireAuth>} />
      <Route path="/appointments/book" element={<RequireAuth><RequireClient><BookingPage /></RequireClient></RequireAuth>} />
      <Route path="/appointments/history" element={<RequireAuth><AppointmentsPage /></RequireAuth>} />
      <Route path="/services" element={<RequireAuth><ServicesPage /></RequireAuth>} />
      <Route path="/messages" element={<RequireAuth><MessagesRouter /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
      <Route path="/users" element={<RequireAuth><AdminDashboard /></RequireAuth>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: { borderRadius: '12px', fontSize: '14px' },
              }}
            />
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
