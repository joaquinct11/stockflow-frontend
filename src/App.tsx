import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useRef, lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useInactivityLogout } from './hooks/useInactivityLogout';

// Layout
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { RoleProtectedRoute } from './components/shared/RoleProtectedRoute';
import { SubscripcionGuard } from './components/shared/SubscripcionGuard';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

// Auth Pages (carga inmediata — ruta de entrada)
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { ActivatePage } from './pages/auth/ActivatePage';

// Lazy — páginas que se cargan solo cuando se navega a ellas
const LandingPage       = lazy(() => import('./pages/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const TerminosPage      = lazy(() => import('./pages/legal/TerminosPage').then(m => ({ default: m.TerminosPage })));
const PrivacidadPage    = lazy(() => import('./pages/legal/PrivacidadPage').then(m => ({ default: m.PrivacidadPage })));
const ReclamacionesPage = lazy(() => import('./pages/legal/ReclamacionesPage').then(m => ({ default: m.ReclamacionesPage })));
const PlanPage          = lazy(() => import('./pages/suscripcion/PlanPage').then(m => ({ default: m.PlanPage })));
const CheckoutCulqiPage = lazy(() => import('./pages/checkout/CheckoutCulqiPage').then(m => ({ default: m.CheckoutCulqiPage })));

const Dashboard         = lazy(() => import('./pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const ProductosList     = lazy(() => import('./pages/productos/ProductosList').then(m => ({ default: m.ProductosList })));
const VentasList        = lazy(() => import('./pages/ventas/VentasList').then(m => ({ default: m.VentasList })));
const UsuariosList      = lazy(() => import('./pages/usuarios/UsuariosList').then(m => ({ default: m.UsuariosList })));
const SuscripcionesList = lazy(() => import('./pages/suscripciones/SuscripcionesList').then(m => ({ default: m.SuscripcionesList })));
const InventarioList    = lazy(() => import('./pages/inventario/InventarioList').then(m => ({ default: m.InventarioList })));
const ProveedoresList   = lazy(() => import('./pages/proveedores/ProveedoresList').then(m => ({ default: m.ProveedoresList })));
const ClientesList      = lazy(() => import('./pages/clientes/ClientesList').then(m => ({ default: m.ClientesList })));
const AccountSettings   = lazy(() => import('./pages/settings/AccountSettings').then(m => ({ default: m.AccountSettings })));
const UserProfile       = lazy(() => import('./pages/settings/UserProfile').then(m => ({ default: m.UserProfile })));
const PermisosConfig    = lazy(() => import('./pages/admin/PermisosConfig').then(m => ({ default: m.PermisosConfig })));
const ComprobantesPage  = lazy(() => import('./pages/facturacion/ComprobantesPage').then(m => ({ default: m.ComprobantesPage })));
const KardexPage        = lazy(() => import('./pages/kardex/KardexPage').then(m => ({ default: m.KardexPage })));
const OrdenComprasList  = lazy(() => import('./pages/compras/OrdenComprasList').then(m => ({ default: m.OrdenComprasList })));
const RecepcionList     = lazy(() => import('./pages/recepciones/RecepcionList').then(m => ({ default: m.RecepcionList })));
const ReportesPage      = lazy(() => import('./pages/reportes/ReportesPage').then(m => ({ default: m.ReportesPage })));
const POSPage           = lazy(() => import('./pages/pos/POSPage').then(m => ({ default: m.POSPage })));
const CajaPage          = lazy(() => import('./pages/caja/CajaPage').then(m => ({ default: m.CajaPage })));
const NotasCreditoPage  = lazy(() => import('./pages/notasCredito/NotasCreditoPage').then(m => ({ default: m.NotasCreditoPage })));
const GastosList        = lazy(() => import('./pages/gastos/GastosList').then(m => ({ default: m.GastosList })));
const SucursalesPage    = lazy(() => import('./pages/sucursales/SucursalesPage').then(m => ({ default: m.SucursalesPage })));
const ComisionesPage    = lazy(() => import('./pages/comisiones/ComisionesPage').then(m => ({ default: m.ComisionesPage })));
const DigemidOppfPage   = lazy(() => import('./pages/digemid/DigemidOppfPage').then(m => ({ default: m.DigemidOppfPage })));
const CertificadosPage  = lazy(() => import('./pages/certificados/CertificadosPage').then(m => ({ default: m.CertificadosPage })));

const SuperAdminLoginPage = lazy(() => import('./pages/superadmin/SuperAdminLoginPage').then(m => ({ default: m.SuperAdminLoginPage })));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));

const PageLoader = () => (
  <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>
    Cargando...
  </div>
);

function App() {
  const { initialize, isAuthenticated, setSuscripcionEstado } = useAuthStore();
  const { isDark, setTheme } = useThemeStore();
  const suscripcionCargada = useRef(false);

  useInactivityLogout();

  useEffect(() => {
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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Landing Page - Pública */}
            <Route path="/" element={<LandingPage />} />

            {/* Páginas legales - Públicas */}
            <Route path="/terminos"      element={<TerminosPage />} />
            <Route path="/privacidad"    element={<PrivacidadPage />} />
            <Route path="/reclamaciones" element={<ReclamacionesPage />} />

            {/* Página de plan / compra (carrito) - Pública */}
            <Route path="/plan" element={<PlanPage />} />

            {/* Super Admin — completamente independiente */}
            <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />
            <Route path="/superadmin" element={<SuperAdminDashboard />} />

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
                    <RoleProtectedRoute allowedRoles={['ADMIN', 'GERENTE']} anyPermission={['VER_NOTAS_CREDITO', 'EMITIR_NOTA_CREDITO']}>
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
              {/* Comisiones — rubro EMPRESA_SERVICIOS */}
              <Route
                path="comisiones"
                element={
                  <SubscripcionGuard>
                    <RoleProtectedRoute allowedRoles={['ADMIN']} anyPermission={['VER_COMISIONES']}>
                      <ComisionesPage />
                    </RoleProtectedRoute>
                  </SubscripcionGuard>
                }
              />

              {/* Sucursales — solo ADMIN plan PRO */}
              <Route
                path="sucursales"
                element={
                  <SubscripcionGuard>
                    <RoleProtectedRoute allowedRoles={['ADMIN']}>
                      <SucursalesPage />
                    </RoleProtectedRoute>
                  </SubscripcionGuard>
                }
              />

              {/* DIGEMID / OPPF — solo BOTICA/FARMACIA */}
              <Route
                path="digemid"
                element={
                  <SubscripcionGuard>
                    <DigemidOppfPage />
                  </SubscripcionGuard>
                }
              />

              {/* Certificados */}
              <Route
                path="certificados"
                element={
                  <SubscripcionGuard>
                    <RoleProtectedRoute module="CERTIFICADOS">
                      <ErrorBoundary>
                        <CertificadosPage />
                      </ErrorBoundary>
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
        </Suspense>
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
