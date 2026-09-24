import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type BreadcrumbEntry = {
  group?: string;
  label: string;
};

const routeMap: Record<string, BreadcrumbEntry> = {
  // Ventas (grupo)
  '/dashboard/ventas':          { group: 'Ventas',     label: 'Historial de Ventas' },
  '/dashboard/caja':            { group: 'Ventas',     label: 'Cuadre de Caja' },
  '/dashboard/facturacion':     { group: 'Ventas',     label: 'Facturación' },
  '/dashboard/notas-credito':   { group: 'Ventas',     label: 'Notas de Crédito' },
  // Gastos (grupo)
  '/dashboard/gastos':          { group: 'Gastos',     label: 'Gastos y Egresos' },
  '/dashboard/compras/ordenes': { group: 'Gastos',     label: 'Órdenes de Compra' },
  '/dashboard/recepciones':     { group: 'Gastos',     label: 'Recepciones' },
  // Contactos (grupo)
  '/dashboard/clientes':        { group: 'Contactos',  label: 'Clientes' },
  '/dashboard/proveedores':     { group: 'Contactos',  label: 'Proveedores' },
  // Inventario (grupo)
  '/dashboard/productos':       { group: 'Inventario', label: 'Productos' },
  '/dashboard/inventario':      { group: 'Inventario', label: 'Movimientos' },
  '/dashboard/kardex':          { group: 'Inventario', label: 'Kardex' },
  // Usuarios (grupo)
  '/dashboard/usuarios':        { group: 'Usuarios',   label: 'Usuarios' },
  '/dashboard/admin/permisos':  { group: 'Usuarios',   label: 'Gestión de Permisos' },
  // Items sueltos
  '/dashboard/comisiones':      { label: 'Comisiones' },
  '/dashboard/digemid':         { label: 'DIGEMID / OPPF' },
  '/dashboard/certificados':    { label: 'Certificados' },
  '/dashboard/sucursales':      { label: 'Sucursales' },
  '/dashboard/suscripciones':   { label: 'Suscripciones' },
  '/dashboard/reportes':        { label: 'Reportes' },
  '/dashboard/configuracion':   { label: 'Configuración' },
  '/dashboard/perfil':          { label: 'Mi Perfil' },
};

export function Breadcrumb() {
  const location = useLocation();
  const path = location.pathname;

  const separador = <ChevronRight size={14} className="mx-1 flex-shrink-0 opacity-50" />;

  const homeLink = (
    <Link to="/dashboard" className="flex items-center hover:text-foreground transition-colors flex-shrink-0">
      <Home size={15} />
    </Link>
  );

  // Dashboard
  if (path === '/dashboard') {
    return (
      <nav className="flex items-center text-sm text-muted-foreground mb-4 overflow-x-auto scrollbar-none min-w-0">
        {homeLink}
        {separador}
        <span className="font-medium text-foreground">Dashboard</span>
      </nav>
    );
  }

  // POS (fuera del dashboard layout, pero por si acaso)
  if (path === '/pos') {
    return (
      <nav className="flex items-center text-sm text-muted-foreground mb-4 overflow-x-auto scrollbar-none min-w-0">
        {homeLink}
        {separador}
        <span className="font-medium text-foreground">Punto de Venta</span>
      </nav>
    );
  }

  const entry = routeMap[path];

  if (entry) {
    return (
      <nav className="flex items-center text-sm text-muted-foreground mb-4 overflow-x-auto scrollbar-none min-w-0">
        {homeLink}
        {entry.group && (
          <>
            {separador}
            <span className="truncate">{entry.group}</span>
          </>
        )}
        {separador}
        <span className="font-medium text-foreground truncate">{entry.label}</span>
      </nav>
    );
  }

  // Fallback: construir desde los segmentos de la URL
  const pathnames = path.split('/').filter((x) => x);
  const fallbackNames: Record<string, string> = {
    dashboard: 'Dashboard', productos: 'Productos', ventas: 'Ventas',
    usuarios: 'Usuarios', suscripciones: 'Suscripciones', inventario: 'Inventario',
    reportes: 'Reportes', configuracion: 'Configuración', proveedores: 'Proveedores',
    clientes: 'Clientes', facturacion: 'Facturación', ordenes: 'Órdenes de Compra',
    recepciones: 'Recepciones', kardex: 'Kardex', perfil: 'Mi Perfil',
    permisos: 'Gestión de Permisos', caja: 'Caja', 'notas-credito': 'Notas de Crédito',
    gastos: 'Gastos y Egresos', digemid: 'DIGEMID / OPPF', certificados: 'Certificados',
    comisiones: 'Comisiones', sucursales: 'Sucursales',
  };
  const hiddenSegments = new Set(['compras', 'admin']);

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-4 overflow-x-auto scrollbar-none min-w-0">
      {homeLink}
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const name = fallbackNames[value] || value;
        if (value === 'dashboard' && index === 0 && pathnames.length > 1) return null;
        if (hiddenSegments.has(value)) return null;
        return (
          <div key={to} className="flex items-center min-w-0">
            {separador}
            {last ? (
              <span className="font-medium text-foreground truncate">{name}</span>
            ) : (
              <Link to={to} className="hover:text-foreground transition-colors truncate">{name}</Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
