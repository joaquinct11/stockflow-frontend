import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useInactivityLogout } from './hooks/useInactivityLogout';
import { setupAxiosInterceptors } from './api/axios.interceptor';

// Layout
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { RoleProtectedRoute } from './components/shared/RoleProtectedRoute';

// Landing Page
import { LandingPage } from './pages/landing/LandingPage';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword'

// Main Pages
import { Dashboard } from './pages/dashboard/Dashboard';
import { ProductosList } from './pages/productos/ProductosList';
import { VentasList } from './pages/ventas/VentasList';
import { UsuariosList } from './pages/usuarios/UsuariosList';
import { SuscripcionesList } from './pages/suscripciones/SuscripcionesList';
import { InventarioList } from './pages/inventario/InventarioList';
import { ProveedoresList } from './pages/proveedores/ProveedoresList';
import { AccountSettings } from './pages/settings/AccountSettings';
import { UserProfile } from './pages/settings/UserProfile';
import { PermisosConfig } from './pages/admin/PermisosConfig';
import { ComprobantesPage } from './pages/facturacion/ComprobantesPage';
import { KardexPage } from './pages/kardex/KardexPage';
import { OrdenComprasList } from './pages/compras/OrdenComprasList';
import { OrdenCompraDetail } from './pages/compras/OrdenCompraDetail';
import { RecepcionList } from './pages/recepciones/RecepcionList';
import { RecepcionDetail } from './pages/recepciones/RecepcionDetail';

function App() {
  const { initialize } = useAuthStore();
  const { isDark, setTheme } = useThemeStore();

  useInactivityLogout();

  useEffect(() => {
    setupAxiosInterceptors();
    initialize();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setTheme(true);
    }
  }, [initialize, setTheme]);

  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Landing Page - Pública */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth Routes - Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes - App bajo /dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard - Todos pueden acceder */}
            <Route index element={<Dashboard />} />

            {/* ✅ MI PERFIL - TODOS ACCEDEN */}
            <Route path="perfil" element={<UserProfile />} />

            {/* Proveedores */}
            <Route
              path="proveedores"
              element={
                <RoleProtectedRoute module="PROVEEDORES">
                  <ProveedoresList />
                </RoleProtectedRoute>
              }
            />

            {/* Productos */}
            <Route
              path="productos"
              element={
                <RoleProtectedRoute module="PRODUCTOS">
                  <ProductosList />
                </RoleProtectedRoute>
              }
            />

            {/* Ventas */}
            <Route
              path="ventas"
              element={
                <RoleProtectedRoute module="VENTAS">
                  <VentasList />
                </RoleProtectedRoute>
              }
            />

            {/* Inventario */}
            <Route
              path="inventario"
              element={
                <RoleProtectedRoute module="INVENTARIO">
                  <InventarioList />
                </RoleProtectedRoute>
              }
            />

            {/* Kardex */}
            <Route
              path="kardex"
              element={
                <RoleProtectedRoute module="INVENTARIO">
                  <KardexPage />
                </RoleProtectedRoute>
              }
            />

            {/* Usuarios */}
            <Route
              path="usuarios"
              element={
                <RoleProtectedRoute module="USUARIOS">
                  <UsuariosList />
                </RoleProtectedRoute>
              }
            />

            {/* Suscripciones */}
            <Route
              path="suscripciones"
              element={
                <RoleProtectedRoute module="SUSCRIPCIONES">
                  <SuscripcionesList />
                </RoleProtectedRoute>
              }
            />

            {/* Configuración - Todos pueden acceder */}
            <Route path="configuracion" element={<AccountSettings />} />

            {/* Gestión de Permisos - Solo ADMIN */}
            <Route
              path="admin/permisos"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <PermisosConfig />
                </RoleProtectedRoute>
              }
            />

            {/* Reportes */}
            <Route
              path="reportes"
              element={
                <RoleProtectedRoute module="REPORTES">
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold">Módulo de Reportes</h2>
                    <p className="text-muted-foreground">Próximamente...</p>
                  </div>
                </RoleProtectedRoute>
              }
            />

            {/* Facturación */}
            <Route
              path="facturacion"
              element={
                <RoleProtectedRoute module="FACTURACION">
                  <ComprobantesPage />
                </RoleProtectedRoute>
              }
            />

            {/* Órdenes de Compra */}
            <Route
              path="compras/ordenes"
              element={
                <RoleProtectedRoute module="COMPRAS">
                  <OrdenComprasList />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="compras/ordenes/:id"
              element={
                <RoleProtectedRoute module="COMPRAS">
                  <OrdenCompraDetail />
                </RoleProtectedRoute>
              }
            />

            {/* Recepciones */}
            <Route
              path="recepciones"
              element={
                <RoleProtectedRoute module="RECEPCIONES">
                  <RecepcionList />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="recepciones/:id"
              element={
                <RoleProtectedRoute module="RECEPCIONES">
                  <RecepcionDetail />
                </RoleProtectedRoute>
              }
            />
          </Route>

          {/* Catch all - redirect to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: isDark ? '#1f2937' : '#ffffff',
            color: isDark ? '#f9fafb' : '#111827',
            border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </>
  );
}

export default App;