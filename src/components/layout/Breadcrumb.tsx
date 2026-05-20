import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const breadcrumbNameMap: Record<string, string> = {
    dashboard:       'Dashboard',
    productos:       'Productos',
    ventas:          'Ventas',
    usuarios:        'Usuarios',
    suscripciones:   'Suscripciones',
    inventario:      'Inventario',
    reportes:        'Reportes',
    configuracion:   'Configuración',
    proveedores:     'Proveedores',
    clientes:        'Clientes',
    facturacion:     'Facturación',
    ordenes:         'Órdenes de Compra',
    recepciones:     'Recepciones',
    kardex:          'Kardex',
    perfil:          'Mi Perfil',
    permisos:        'Gestión de Permisos',
    caja:            'Caja',
    'notas-credito': 'Notas de Crédito',
    gastos:          'Gastos y Egresos',
  };

  // Segmentos que son solo agrupadores de ruta y no deben aparecer en el breadcrumb
  const hiddenSegments = new Set(['compras', 'admin']);

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4 overflow-x-auto scrollbar-none min-w-0">
      <Link
        to="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home size={16} />
      </Link>
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const name = breadcrumbNameMap[value] || value;

        // Ocultar dashboard cuando hay más segmentos, y ocultar segmentos agrupadores
        if (value === 'dashboard' && index === 0 && pathnames.length > 1) return null;
        if (hiddenSegments.has(value)) return null;

        return (
          <div key={to} className="flex items-center">
            <ChevronRight size={16} className="mx-1" />
            {last ? (
              <span className="font-medium text-foreground">{name}</span>
            ) : (
              <Link to={to} className="hover:text-foreground transition-colors">
                {name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}