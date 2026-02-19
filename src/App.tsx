import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useInactivityLogout } from './hooks/useInactivityLogout';

// Layout
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

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
            <Route index element={<Dashboard />} />
            <Route path="productos" element={<ProductosList />} />
            <Route path="ventas" element={<VentasList />} />
            <Route path="usuarios" element={<UsuariosList />} />
            <Route path="suscripciones" element={<SuscripcionesList />} />
            <Route path="inventario" element={<InventarioList />} />
            <Route path="proveedores" element={<ProveedoresList />} />
            
            {/* Placeholder routes */}
            <Route path="reportes" element={<div className="text-center py-12"><h2 className="text-2xl font-bold">Módulo de Reportes</h2><p className="text-muted-foreground">Próximamente...</p></div>} />
            <Route path="configuracion" element={<div className="text-center py-12"><h2 className="text-2xl font-bold">Configuración</h2><p className="text-muted-foreground">Próximamente...</p></div>} />
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