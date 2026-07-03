import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumb } from './Breadcrumb';
import { tenantConfigService } from '../../services/tenantConfig.service';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { useAuthStore } from '../../store/authStore';
import { sucursalService } from '../../services/sucursal.service';
import { useSucursalStore } from '../../store/sucursalStore';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { setConfig } = useTenantConfigStore();
  const { isAuthenticated, user } = useAuthStore();
  const { setSucursales, setSucursalActual, clearSucursales, setLoading: setSucursalLoading } = useSucursalStore();

  // Cargar config del negocio al montar
  useEffect(() => {
    if (!isAuthenticated) return;
    tenantConfigService.getConfig()
      .then(setConfig)
      .catch(() => { /* silencioso */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Cargar sucursales al montar — solo tenants PRO tendrán datos; BÁSICO recibirá []
  useEffect(() => {
    if (!isAuthenticated) { clearSucursales(); return; }
    setSucursalLoading(true);
    sucursalService.listar()
      .then((sucursales) => {
        setSucursales(sucursales);
        // Si el usuario tiene sucursal fija (VENDEDOR/GESTOR), bloquearlo a ella
        if (user?.sucursalId) {
          const fija = sucursales.find((s) => s.id === user.sucursalId);
          if (fija) setSucursalActual(fija);
        }
      })
      .catch(() => setSucursales([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* El margen cambia según si el sidebar está colapsado o no */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-muted/10">
          <div className="container mx-auto p-4 lg:p-6 animate-fade-in">
            <Breadcrumb />
            <Outlet />
          </div>
        </main>
      </div>


    </div>
  );
}
