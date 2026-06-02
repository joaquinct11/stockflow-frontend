import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useRef } from 'react';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useInactivityLogout } from './hooks/useInactivityLogout';
import { setupAxiosInterceptors } from './api/axios.interceptor';

// Layout
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { RoleProtectedRoute } from './components/shared/RoleProtectedRoute';
import { SubscripcionGuard } from './components/shared/SubscripcionGuard';

// Landing Page
import { LandingPage } from './pages/landing/LandingPage';

// Legal Pages (públicas)
import { TerminosPage }      from './pages/legal/TerminosPage';
import { PrivacidadPage }    from './pages/legal/PrivacidadPage';
import { ReclamacionesPage } from './pages/legal/ReclamacionesPage';

// Plan / Compra (público — carrito)
import { PlanPage } from './pages/suscripcion/PlanPage';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { ActivatePage } from './pages/auth/ActivatePage'
import { CheckoutCulqiPage } from './pages/checkout/CheckoutCulqiPage';

// Main Pages
import { Dashboard } from './pages/dashboard/Dashboard';
import { ProductosList } from './pages/productos/ProductosList';
import { VentasList } from './pages/ventas/VentasList';
import { UsuariosList } from './pages/usuarios/UsuariosList';
import { SuscripcionesList } from './pages/suscripciones/SuscripcionesList';
import { InventarioList } from './pages/inventario/InventarioList';
import { ProveedoresList } from './pages/proveedores/ProveedoresList';
import { ClientesList } from './pages/clientes/ClientesList';
import { AccountSettings } from './pages/settings/AccountSettings';
import { UserProfile } from './pages/settings/UserProfile';
import { PermisosConfig } from './pages/admin/PermisosConfig';
import { ComprobantesPage } from './pages/facturacion/ComprobantesPage';
import { KardexPage } from './pages/kardex/KardexPage';
import { OrdenComprasList } from './pages/compras/OrdenComprasList';
import { RecepcionList } from './pages/recepciones/RecepcionList';
import { ReportesPage } from './pages/reportes/ReportesPage';
import { POSPage } from './pages/pos/POSPage';
import { CajaPage } from './pages/caja/CajaPage';
import { NotasCreditoPage } from './pages/notasCredito/NotasCreditoPage';
import { GastosList } from './pages/gastos/GastosList';

function App() {
  const { initialize, isAuthenticated, setSuscripcionEstado } = useAuthStore();
  const { isDark, setTheme } = useThemeStore();
  const suscripcionCargada = useRef(false);

  useInactivityLogout();

  useEffect(() => {
    setupAxiosInterceptors();
    initialize();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setTheme(true);
    }
  }, [initialize, setTheme]);

  // Cargar estado de suscripción al autenticarse (una sola vez por sesión)
  useEffect(() => {
    if (!isAuthenticated || suscripcionCargada.current) return;
    suscripcionCargada.current = true;
    import('./services/suscripcion.service').then(({ suscripcionService }) => {
      suscripcionService.getEstado()
        .then((s) => setSuscripcionEstado(s.estado))
        .catch(() => { /* silencioso — usamos JWT como fallback */ });
    });
  }, [isAuthenticated, setSuscripcionEstado]);

  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Landing Page - Pública */}
          <Route path="/" element={<LandingPage />} />

          {/* Páginas legales - Públicas */}
          <Route path="/terminos"      element={<TerminosPage />} />
          <Route path="/privacidad"    element={<PrivacidadPage />} />
          <Route path="/reclamaciones" element={<ReclamacionesPage />} />

          {/* Página de plan / compra (carrito) - Pública */}
          <Route path="/plan" element={<PlanPage />} />

          {/* Auth Routes - Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/activate" element={<ActivatePage />} />
          <Route
            path="/checkout/culqi"
            element={
              <ProtectedRoute>
                <CheckoutCulqiPage />
              </ProtectedRoute>
            }
          />

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

            {/* MI PERFIL */}
            <Route
              path="perfil"
              element={
                <SubscripcionGuard>
                  <UserProfile />
                </SubscripcionGuard>
              }
            />

            {/* Proveedores */}
            <Route
              path="proveedores"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="PROVEEDORES">
                    <ProveedoresList />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Clientes */}
            <Route
              path="clientes"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="CLIENTES">
                    <ClientesList />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Productos */}
            <Route
              path="productos"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="PRODUCTOS">
                    <ProductosList />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Ventas */}
            <Route
              path="ventas"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="VENTAS">
                    <VentasList />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Caja */}
            <Route
              path="caja"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="POS">
                    <CajaPage />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Inventario */}
            <Route
              path="inventario"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="INVENTARIO">
                    <InventarioList />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Kardex */}
            <Route
              path="kardex"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="INVENTARIO">
                    <KardexPage />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Usuarios */}
            <Route
              path="usuarios"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="USUARIOS">
                    <UsuariosList />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
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

            {/* Configuración */}
            <Route
              path="configuracion"
              element={
                <SubscripcionGuard>
                  <AccountSettings />
                </SubscripcionGuard>
              }
            />

            {/* Gestión de Permisos - Solo ADMIN */}
            <Route
              path="admin/permisos"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <PermisosConfig />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Reportes */}
            <Route
              path="reportes"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="REPORTES">
                    <ReportesPage />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Facturación */}
            <Route
              path="facturacion"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="FACTURACION">
                    <ComprobantesPage />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Órdenes de Compra */}
            <Route
              path="compras/ordenes"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="COMPRAS">
                    <OrdenComprasList />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Recepciones */}
            <Route
              path="recepciones"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="RECEPCIONES">
                    <RecepcionList />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Notas de Crédito */}
            <Route
              path="notas-credito"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute allowedRoles={['ADMIN']}>
                    <NotasCreditoPage />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />

            {/* Gastos / Egresos */}
            <Route
              path="gastos"
              element={
                <SubscripcionGuard>
                  <RoleProtectedRoute module="GASTOS">
                    <GastosList />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              }
            />
          </Route>

          {/* POS - Fullscreen, fuera del AppLayout */}
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <SubscripcionGuard>
                  <RoleProtectedRoute module="POS">
                    <POSPage />
                  </RoleProtectedRoute>
                </SubscripcionGuard>
              </ProtectedRoute>
            }
          />

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
