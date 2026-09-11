import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import { useAuthStore } from './store/useAuthStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';

// Lazy loaded views for route code-splitting
const DashboardView = React.lazy(() => import('./views/DashboardView'));
const PropertiesView = React.lazy(() => import('./views/PropertiesView'));
const TenantsView = React.lazy(() => import('./views/TenantsView'));
const LeasesView = React.lazy(() => import('./views/LeasesView'));
const MaintenanceView = React.lazy(() => import('./views/MaintenanceView'));
const PaymentsView = React.lazy(() => import('./views/PaymentsView'));
const ExpensesView = React.lazy(() => import('./views/ExpensesView'));
const VendorsView = React.lazy(() => import('./views/VendorsView'));
const ReportsView = React.lazy(() => import('./views/ReportsView'));
const SettingsView = React.lazy(() => import('./views/SettingsView'));
const LoginView = React.lazy(() => import('./views/LoginView'));
const AcceptInviteView = React.lazy(() => import('./views/AcceptInviteView'));
const TenantPortalView = React.lazy(() => import('./views/portal/TenantPortalView'));
const ChequesView = React.lazy(() => import('./views/ChequesView'));
const TawtheeqView = React.lazy(() => import('./views/TawtheeqView'));
const InspectionsView = React.lazy(() => import('./views/InspectionsView'));
const CommunicationsView = React.lazy(() => import('./views/CommunicationsView'));
const OwnerPayoutsView = React.lazy(() => import('./views/OwnerPayoutsView'));
const ResetPasswordView = React.lazy(() => import('./views/ResetPasswordView'));
const NotFoundView = React.lazy(() => import('./views/NotFoundView'));
const NotAuthorizedView = React.lazy(() => import('./views/NotAuthorizedView'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 1, // 1 minute stale time
      gcTime: 1000 * 60 * 5,    // 5 minutes garbage collection time
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode, type?: 'agency' | 'tenant' }> = ({ children, type = 'agency' }) => {
  const { token, user } = useAuthStore();
  const location = useLocation();

  // If not logged in, route to login
  if (!token && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
  const isTenant = roleName?.toUpperCase() === 'TENANT';

  if (type === 'agency' && isTenant) {
    return <Navigate to="/portal" replace />;
  }

  if (type === 'tenant' && !isTenant) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const RouteGuard: React.FC<{ children: React.ReactNode, module: string, action?: string }> = ({ children, module, action = 'read' }) => {
  const { hasPermission } = useAuthStore();
  
  if (!hasPermission(module, action)) {
    return <NotAuthorizedView />;
  }
  
  return <>{children}</>;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 4000,
          style: {
            fontSize: '12px',
            borderRadius: '6px',
            border: '1px solid #EDE8DE',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }
        }} 
      />
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
              <div className="w-8 h-8 border-4 border-[#252a31] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-sm text-gray-500 font-medium">Loading...</p>
            </div>
          }>
            <Routes>
              {/* Public Authentication & Onboarding Routes */}
              <Route path="/login" element={<LoginView />} />
              <Route path="/reset-password" element={<ResetPasswordView />} />
              <Route path="/accept-invite" element={<AcceptInviteView />} />

              {/* Tenant Self-Service Portal (Dedicated Layout) */}
              <Route 
                path="/portal/*" 
                element={
                  <ProtectedRoute type="tenant">
                    <TenantPortalView />
                  </ProtectedRoute>
                } 
              />

              {/* Protected Agency SaaS Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardView />} />
                <Route path="properties" element={<RouteGuard module="properties"><PropertiesView /></RouteGuard>} />
                <Route path="tenants" element={<RouteGuard module="tenants"><TenantsView /></RouteGuard>} />
                <Route path="leases" element={<RouteGuard module="leases"><LeasesView /></RouteGuard>} />
                <Route path="maintenance" element={<RouteGuard module="maintenance"><MaintenanceView /></RouteGuard>} />
                <Route path="payments" element={<RouteGuard module="payments"><PaymentsView /></RouteGuard>} />
                <Route path="expenses" element={<RouteGuard module="expenses"><ExpensesView /></RouteGuard>} />
                <Route path="vendors" element={<RouteGuard module="vendors"><VendorsView /></RouteGuard>} />
                <Route path="reports" element={<RouteGuard module="reports"><ReportsView /></RouteGuard>} />
                <Route path="settings/*" element={<RouteGuard module="settings"><SettingsView /></RouteGuard>} />
                {/* New Operations Modules */}
                <Route path="cheques" element={<RouteGuard module="payments"><ChequesView /></RouteGuard>} />
                <Route path="tawtheeq" element={<RouteGuard module="leases"><TawtheeqView /></RouteGuard>} />
                <Route path="inspections" element={<RouteGuard module="maintenance"><InspectionsView /></RouteGuard>} />
                <Route path="communications" element={<RouteGuard module="tenants"><CommunicationsView /></RouteGuard>} />
                <Route path="owner-payouts" element={<RouteGuard module="payments"><OwnerPayoutsView /></RouteGuard>} />
              </Route>

              <Route path="*" element={<NotFoundView />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
