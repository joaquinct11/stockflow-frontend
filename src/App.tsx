import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useInactivityLogout } from './hooks/useInactivityLogout';

// Layout
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { RoleProtectedRoute } from './components/shared/RoleProtectedRoute'; // ✅ NUEVO

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

// Main Pages
import { Dashboard } from './pages/dashboard/Dashboard';
import { ProductosList } from './pages/productos/ProductosList';
import { VentasList } from './pages/ventas/VentasList';
import { UsuariosList } from './pages/usuarios/UsuariosList';
import { SuscripcionesList } from './pages/suscripciones/SuscripcionesList';
import { InventarioList } from './pages/inventario/InventarioList';
import { ProveedoresList } from './pages/proveedores/ProveedoresList';
import { AccountSettings } from './pages/settings/AccountSettings';

function App() {
  const { initialize } = useAuthStore();
  const { isDark, setTheme } = useThemeStore();

  useInactivityLogout();

  useEffect(() => {
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
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard - Todos pueden acceder */}
            <Route index element={<Dashboard />} />
            
            {/* Proveedores - Solo ADMIN */}
            <Route
              path="proveedores"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <ProveedoresList />
                </RoleProtectedRoute>
              }
            />
            
            {/* Productos - ADMIN y VENDEDOR */}
            <Route
              path="productos"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
                  <ProductosList />
                </RoleProtectedRoute>
              }
            />
            
            {/* Ventas - ADMIN y VENDEDOR */}
            <Route
              path="ventas"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN', 'VENDEDOR']}>
                  <VentasList />
                </RoleProtectedRoute>
              }
            />
            
            {/* Inventario - Solo ADMIN */}
            <Route
              path="inventario"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <InventarioList />
                </RoleProtectedRoute>
              }
            />
            
            {/* Usuarios - Solo ADMIN */}
            <Route
              path="usuarios"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <UsuariosList />
                </RoleProtectedRoute>
              }
            />
            
            {/* Suscripciones - Solo ADMIN */}
            <Route
              path="suscripciones"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <SuscripcionesList />
                </RoleProtectedRoute>
              }
            />
            
            {/* Configuración - Todos pueden acceder */}
            <Route path="configuracion" element={<AccountSettings />} />
            
            {/* Reportes - Solo ADMIN (por ahora) */}
            <Route
              path="reportes"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold">Módulo de Reportes</h2>
                    <p className="text-muted-foreground">Próximamente...</p>
                  </div>
                </RoleProtectedRoute>
              }
            />
          </Route>

          {/* Catch all - redirect to login */}
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