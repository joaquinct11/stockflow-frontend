import { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/admin.service';
import type { AdminUsuario, Permiso } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Input } from '../../components/ui/Input';
import {
  Search, Shield, Save,
  ShoppingCart, Wallet, Users, Package, Boxes,
  Truck, BarChart3, FileText, RotateCcw,
  Building2, ClipboardCheck, CheckCircle2, XCircle,
  Settings2, Crown, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Labels de permisos ────────────────────────────────────────────────────────
const PERM_LABELS: Record<string, { label: string; descripcion: string }> = {
  VER_DASHBOARD:            { label: 'Ver dashboard',                  descripcion: 'Acceso a la pantalla principal' },
  VER_PROVEEDORES:          { label: 'Ver proveedores',                descripcion: '' },
  CREAR_PROVEEDOR:          { label: 'Crear proveedores',              descripcion: '' },
  EDITAR_PROVEEDOR:         { label: 'Editar proveedores',             descripcion: '' },
  ELIMINAR_PROVEEDOR:       { label: 'Eliminar proveedores',           descripcion: '' },
  CAMBIAR_ESTADO_PROVEEDOR: { label: 'Activar/desactivar proveedores', descripcion: '' },
  VER_PRODUCTOS:            { label: 'Ver productos',                  descripcion: '' },
  CREAR_PRODUCTO:           { label: 'Crear productos',                descripcion: '' },
  EDITAR_PRODUCTO:          { label: 'Editar productos',               descripcion: '' },
  ELIMINAR_PRODUCTO:        { label: 'Eliminar productos',             descripcion: '' },
  VER_VENTAS:               { label: 'Ver todas las ventas',           descripcion: '' },
  VER_MIS_VENTAS:           { label: 'Ver mis ventas',                 descripcion: '' },
  CREAR_VENTA:              { label: 'Realizar ventas (POS)',          descripcion: '' },
  ELIMINAR_VENTA:           { label: 'Eliminar ventas',                descripcion: '' },
  VER_DETALLE_VENTA:        { label: 'Ver detalle de venta',           descripcion: '' },
  VER_CAJA:                 { label: 'Ver caja',                       descripcion: '' },
  ABRIR_CAJA:               { label: 'Abrir caja',                     descripcion: '' },
  CERRAR_CAJA:              { label: 'Cerrar caja',                    descripcion: '' },
  VER_DEVOLUCIONES:         { label: 'Ver devoluciones',               descripcion: '' },
  CREAR_DEVOLUCION:         { label: 'Registrar devoluciones',         descripcion: '' },
  VER_NOTAS_CREDITO:        { label: 'Ver notas de crédito',           descripcion: '' },
  EMITIR_NOTA_CREDITO:      { label: 'Emitir notas de crédito',        descripcion: '' },
  VER_INVENTARIO:           { label: 'Ver inventario',                 descripcion: '' },
  CREAR_INVENTARIO:         { label: 'Registrar movimientos de stock', descripcion: '' },
  ELIMINAR_INVENTARIO:      { label: 'Eliminar movimientos',           descripcion: '' },
  VER_DETALLE_INVENTARIO:   { label: 'Ver detalle de movimientos',     descripcion: '' },
  VER_USUARIOS:             { label: 'Ver usuarios',                   descripcion: '' },
  CREAR_USUARIO:            { label: 'Crear usuarios',                 descripcion: '' },
  EDITAR_USUARIO:           { label: 'Editar usuarios',                descripcion: '' },
  ELIMINAR_USUARIO:         { label: 'Eliminar usuarios',              descripcion: '' },
  CAMBIAR_ESTADO_USUARIO:   { label: 'Activar/desactivar usuarios',    descripcion: '' },
  VER_PERMISOS:             { label: 'Gestionar permisos',             descripcion: '' },
  VER_SUSCRIPCIONES:        { label: 'Ver suscripción',                descripcion: '' },
  CREAR_SUSCRIPCION:        { label: 'Contratar suscripción',          descripcion: '' },
  EDITAR_SUSCRIPCION:       { label: 'Modificar suscripción',          descripcion: '' },
  ELIMINAR_SUSCRIPCION:     { label: 'Eliminar suscripción',           descripcion: '' },
  CAMBIAR_ESTADO_SUSCRIPCION: { label: 'Cambiar estado de suscripción', descripcion: '' },
  VER_REPORTES:             { label: 'Acceder a reportes',             descripcion: '' },
  VER_FACTURACION:          { label: 'Ver facturación',                descripcion: '' },
  EMITIR_COMPROBANTE:       { label: 'Emitir boletas y facturas',      descripcion: '' },
  VER_COMPROBANTE:          { label: 'Ver comprobantes emitidos',      descripcion: '' },
  ANULAR_COMPROBANTE:       { label: 'Anular comprobantes',            descripcion: '' },
  VER_OC:                   { label: 'Ver órdenes de compra',          descripcion: '' },
  CREAR_OC:                 { label: 'Crear órdenes de compra',        descripcion: '' },
  EDITAR_OC:                { label: 'Editar órdenes de compra',       descripcion: '' },
  VER_RECEPCIONES:          { label: 'Ver recepciones',                descripcion: '' },
  CREAR_RECEPCION:          { label: 'Crear recepciones',              descripcion: '' },
  CONFIRMAR_RECEPCION:      { label: 'Confirmar recepciones',          descripcion: '' },
  VER_CLIENTES:             { label: 'Ver clientes',                   descripcion: '' },
  CREAR_CLIENTE:            { label: 'Crear clientes',                 descripcion: '' },
  EDITAR_CLIENTE:           { label: 'Editar clientes',                descripcion: '' },
  ELIMINAR_CLIENTE:         { label: 'Eliminar clientes',              descripcion: '' },
  CAMBIAR_ESTADO_CLIENTE:   { label: 'Activar/desactivar clientes',    descripcion: '' },
  VER_GASTOS:               { label: 'Ver gastos',                     descripcion: '' },
  CREAR_GASTO:              { label: 'Registrar gastos',               descripcion: '' },
  EDITAR_GASTO:             { label: 'Editar gastos',                  descripcion: '' },
  ELIMINAR_GASTO:           { label: 'Eliminar gastos',                descripcion: '' },
};

const PERMISSION_GROUPS: { label: string; codes: string[] }[] = [
  { label: 'Dashboard',         codes: ['VER_DASHBOARD'] },
  { label: 'Productos',         codes: ['VER_PRODUCTOS','CREAR_PRODUCTO','EDITAR_PRODUCTO','ELIMINAR_PRODUCTO'] },
  { label: 'Ventas',            codes: ['VER_VENTAS','VER_MIS_VENTAS','CREAR_VENTA','ELIMINAR_VENTA','VER_DETALLE_VENTA'] },
  { label: 'Caja',              codes: ['VER_CAJA','ABRIR_CAJA','CERRAR_CAJA'] },
  { label: 'Devoluciones',      codes: ['VER_DEVOLUCIONES','CREAR_DEVOLUCION'] },
  { label: 'Notas de Crédito',  codes: ['VER_NOTAS_CREDITO','EMITIR_NOTA_CREDITO'] },
  { label: 'Facturación',       codes: ['VER_FACTURACION','EMITIR_COMPROBANTE','VER_COMPROBANTE','ANULAR_COMPROBANTE'] },
  { label: 'Clientes',          codes: ['VER_CLIENTES','CREAR_CLIENTE','EDITAR_CLIENTE','ELIMINAR_CLIENTE','CAMBIAR_ESTADO_CLIENTE'] },
  { label: 'Inventario',        codes: ['VER_INVENTARIO','CREAR_INVENTARIO','ELIMINAR_INVENTARIO','VER_DETALLE_INVENTARIO'] },
  { label: 'Proveedores',       codes: ['VER_PROVEEDORES','CREAR_PROVEEDOR','EDITAR_PROVEEDOR','ELIMINAR_PROVEEDOR','CAMBIAR_ESTADO_PROVEEDOR'] },
  { label: 'Órdenes de Compra', codes: ['VER_OC','CREAR_OC','EDITAR_OC'] },
  { label: 'Recepciones',       codes: ['VER_RECEPCIONES','CREAR_RECEPCION','CONFIRMAR_RECEPCION'] },
  { label: 'Gastos',            codes: ['VER_GASTOS','CREAR_GASTO','EDITAR_GASTO','ELIMINAR_GASTO'] },
  { label: 'Reportes',          codes: ['VER_REPORTES'] },
  { label: 'Usuarios',          codes: ['VER_USUARIOS','CREAR_USUARIO','EDITAR_USUARIO','ELIMINAR_USUARIO','CAMBIAR_ESTADO_USUARIO'] },
  { label: 'Permisos',          codes: ['VER_PERMISOS'] },
  { label: 'Suscripciones',     codes: ['VER_SUSCRIPCIONES','CREAR_SUSCRIPCION','EDITAR_SUSCRIPCION','ELIMINAR_SUSCRIPCION','CAMBIAR_ESTADO_SUSCRIPCION'] },
];

// ─── Tarjetas de resumen por rol ──────────────────────────────────────────────
const ROL_CARDS = [
  {
    rol: 'ADMIN',
    label: 'Administrador',
    descripcion: 'Acceso total al sistema sin restricciones.',
    color: 'text-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-900/10',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
    icon: <Crown className="h-5 w-5 text-rose-600" />,
    accesos: [
      { icon: <ShoppingCart className="h-3.5 w-3.5" />, label: 'Ventas y POS',    ok: true },
      { icon: <Wallet       className="h-3.5 w-3.5" />, label: 'Caja',            ok: true },
      { icon: <Boxes        className="h-3.5 w-3.5" />, label: 'Inventario',      ok: true },
      { icon: <Truck        className="h-3.5 w-3.5" />, label: 'Compras y OC',    ok: true },
      { icon: <Users        className="h-3.5 w-3.5" />, label: 'Usuarios',        ok: true },
      { icon: <BarChart3    className="h-3.5 w-3.5" />, label: 'Reportes',        ok: true },
      { icon: <FileText     className="h-3.5 w-3.5" />, label: 'Facturación',     ok: true },
      { icon: <Settings2    className="h-3.5 w-3.5" />, label: 'Configuración',   ok: true },
    ],
  },
  {
    rol: 'VENDEDOR',
    label: 'Vendedor',
    descripcion: 'Vende, cobra, emite comprobantes y atiende clientes.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/10',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    icon: <ShoppingCart className="h-5 w-5 text-emerald-600" />,
    accesos: [
      { icon: <ShoppingCart className="h-3.5 w-3.5" />, label: 'Ventas y POS',    ok: true  },
      { icon: <Wallet       className="h-3.5 w-3.5" />, label: 'Caja',            ok: true  },
      { icon: <Users        className="h-3.5 w-3.5" />, label: 'Clientes',        ok: true  },
      { icon: <RotateCcw    className="h-3.5 w-3.5" />, label: 'Devoluciones',    ok: true  },
      { icon: <FileText     className="h-3.5 w-3.5" />, label: 'Facturación',     ok: true  },
      { icon: <Package      className="h-3.5 w-3.5" />, label: 'Ver productos',   ok: true  },
      { icon: <Boxes        className="h-3.5 w-3.5" />, label: 'Inventario',      ok: false },
      { icon: <Truck        className="h-3.5 w-3.5" />, label: 'Compras y OC',    ok: false },
    ],
  },
  {
    rol: 'GESTOR_INVENTARIO',
    label: 'Almacenero',
    descripcion: 'Gestiona stock, recibe mercadería y maneja órdenes de compra.',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    icon: <Boxes className="h-5 w-5 text-amber-600" />,
    accesos: [
      { icon: <Boxes           className="h-3.5 w-3.5" />, label: 'Inventario',    ok: true  },
      { icon: <Truck           className="h-3.5 w-3.5" />, label: 'Compras y OC',  ok: true  },
      { icon: <ClipboardCheck  className="h-3.5 w-3.5" />, label: 'Recepciones',   ok: true  },
      { icon: <Package         className="h-3.5 w-3.5" />, label: 'Productos',     ok: true  },
      { icon: <Building2       className="h-3.5 w-3.5" />, label: 'Proveedores',   ok: true  },
      { icon: <BarChart3       className="h-3.5 w-3.5" />, label: 'Reportes',      ok: true  },
      { icon: <ShoppingCart    className="h-3.5 w-3.5" />, label: 'Ventas y POS',  ok: false },
      { icon: <Users           className="h-3.5 w-3.5" />, label: 'Clientes',      ok: false },
    ],
  },
];

function getPermCode(p: Permiso): string {
  return (p?.nombre ?? '').toString();
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function PermisosConfig() {
  const [usuarios, setUsuarios]               = useState<AdminUsuario[]>([]);
  const [permisosCatalog, setPermisosCatalog] = useState<Permiso[]>([]);
  const [selectedUserId, setSelectedUserId]   = useState<number | null>(null);
  const [userPermisos, setUserPermisos]       = useState<string[]>([]);
  const [basePermisos, setBasePermisos]       = useState<string[]>([]);
  const [loadingInit, setLoadingInit]         = useState(true);
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [userSearch, setUserSearch]           = useState('');
  const [showExtras, setShowExtras]           = useState(false);
  const [expandedGroups, setExpandedGroups]   = useState<Record<string, boolean>>({});

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
      setLoadingInit(true);
      const [users, perms] = await Promise.all([
        adminService.getUsuarios().catch(() => { throw new Error('usuarios'); }),
        adminService.getPermisos().catch(() => { throw new Error('permisos'); }),
      ]);
      setUsuarios(users.filter((u: AdminUsuario) => u.rolNombre !== 'ADMIN'));
      setPermisosCatalog(perms);
      const expanded: Record<string, boolean> = {};
      PERMISSION_GROUPS.forEach((g) => { expanded[g.label] = false; });
      setExpandedGroups(expanded);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(`Error al cargar ${msg === 'usuarios' ? 'usuarios' : msg === 'permisos' ? 'permisos' : 'datos'}`);
    } finally {
      setLoadingInit(false);
    }
  };

  const handleSelectUser = async (user: AdminUsuario) => {
    setSelectedUserId(user.id);
    setUserPermisos([]);
    setBasePermisos([]);
    setShowExtras(false);
    try {
      setLoadingPermisos(true);
      const [defaults, extras] = await Promise.all([
        adminService.getDefaultPermisos(user.rolNombre).catch(() => [] as string[]),
        adminService.getUsuarioPermisos(user.id).catch(() => [] as string[]),
      ]);
      setBasePermisos(defaults);
      setUserPermisos(Array.from(new Set([...defaults, ...extras])));
    } catch {
      toast.error(`Error al cargar permisos de ${user.nombre}`);
    } finally {
      setLoadingPermisos(false);
    }
  };

  const togglePermiso = (code: string) => {
    if (basePermisos.includes(code)) return;
    setUserPermisos((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    if (selectedUserId === null) return;
    try {
      setSaving(true);
      const extras = userPermisos.filter((p) => !basePermisos.includes(p));
      await adminService.updateUsuarioPermisos(selectedUserId, extras);
      toast.success('Permisos guardados');
    } catch {
      toast.error('Error al guardar permisos');
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = usuarios.find((u) => u.id === selectedUserId) ?? null;

  const filteredUsuarios = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(
      (u) => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [usuarios, userSearch]);

  const extraGroups = useMemo(() => {
    const catalog = Array.isArray(permisosCatalog) ? permisosCatalog : [];
    const byCode = new Map<string, Permiso>();
    for (const p of catalog) {
      const code = getPermCode(p);
      if (code) byCode.set(code, p);
    }
    return PERMISSION_GROUPS.map((g) => {
      const perms = g.codes
        .filter((code) => !basePermisos.includes(code))
        .map((code, i) => byCode.get(code) ?? ({ id: -(i + 1), codigo: code, nombre: code } as Permiso));
      return { label: g.label, perms };
    }).filter((g) => g.perms.length > 0);
  }, [permisosCatalog, basePermisos]);

  const extrasActivos = userPermisos.filter((p) => !basePermisos.includes(p));

  const getRolCard = (rolNombre: string) =>
    ROL_CARDS.find((r) => r.rol === rolNombre) ?? ROL_CARDS[1];

  if (loadingInit) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Roles y permisos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tres roles predefinidos. Puedes dar accesos extra a cualquier empleado sin cambiar su rol.
        </p>
      </div>

      {/* ── Tarjetas de roles ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ROL_CARDS.map((card) => (
          <div key={card.rol} className={`rounded-xl border p-4 ${card.bg} ${card.border}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-8 w-8 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center`}>
                {card.icon}
              </div>
              <div>
                <p className="font-semibold text-sm">{card.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{card.descripcion}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {card.accesos.map((a) => (
                <div key={a.label} className="flex items-center gap-1.5">
                  {a.ok
                    ? <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                    : <XCircle      size={12} className="text-muted-foreground/40 flex-shrink-0" />}
                  <span className={`text-[11px] truncate ${a.ok ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                    {a.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Layout principal ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Lista de empleados */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users size={16} className="text-primary" />
              Empleados
              <span className="ml-auto text-xs font-normal text-muted-foreground">{usuarios.length} total</span>
            </CardTitle>
            <div className="relative mt-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredUsuarios.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sin resultados</p>
            ) : (
              <ul className="divide-y">
                {filteredUsuarios.map((user) => {
                  const card = getRolCard(user.rolNombre);
                  const isSelected = selectedUserId === user.id;
                  return (
                    <li key={user.id}>
                      <button
                        onClick={() => handleSelectUser(user)}
                        className={`w-full text-left px-4 py-3 transition-colors hover:bg-accent ${
                          isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{user.nombre}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${card.badge}`}>
                            {card.label}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Panel derecho */}
        <Card className="lg:col-span-2">

          {!selectedUser && (
            <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <Shield size={48} className="text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">
                Selecciona un empleado para ver y personalizar sus accesos
              </p>
            </CardContent>
          )}

          {selectedUser && loadingPermisos && (
            <CardContent className="flex items-center justify-center py-20">
              <LoadingSpinner />
            </CardContent>
          )}

          {selectedUser && !loadingPermisos && (() => {
            const card = getRolCard(selectedUser.rolNombre);
            return (
              <div className="divide-y">

                {/* Header del usuario */}
                <div className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-full border flex items-center justify-center flex-shrink-0 ${card.bg} ${card.border}`}>
                      {card.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{selectedUser.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${card.badge}`}>
                      {card.label}
                    </span>
                    <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
                      <Save size={14} />
                      {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </div>

                {/* Accesos del rol */}
                <div className="p-5 space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Accesos de su rol</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.descripcion}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {card.accesos.map((mod) => (
                      <div
                        key={mod.label}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs border ${
                          mod.ok
                            ? 'bg-background border-green-200 dark:border-green-800'
                            : 'bg-muted/30 border-transparent opacity-40'
                        }`}
                      >
                        {mod.ok
                          ? <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                          : <XCircle      size={12} className="text-muted-foreground flex-shrink-0" />}
                        <span className="truncate font-medium">{mod.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Permisos extra */}
                <div className="p-5 space-y-3">
                  <button
                    onClick={() => setShowExtras((v) => !v)}
                    className="w-full flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <Settings2 size={14} className="text-muted-foreground" />
                      <span className="text-sm font-semibold">Permisos adicionales</span>
                      {extrasActivos.length > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          +{extrasActivos.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      <span>{showExtras ? 'Ocultar' : 'Personalizar'}</span>
                      {showExtras ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </div>
                  </button>

                  {!showExtras && extrasActivos.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Solo tiene los accesos de su rol. Puedes agregar permisos extra si lo necesitas.
                    </p>
                  )}

                  {!showExtras && extrasActivos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {extrasActivos.map((code) => (
                        <span key={code} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          {PERM_LABELS[code]?.label ?? code}
                        </span>
                      ))}
                    </div>
                  )}

                  {showExtras && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 px-3 py-2">
                        <AlertTriangle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          Los permisos del rol son fijos. Solo puedes <strong>agregar extras</strong>.
                        </p>
                      </div>

                      {extraGroups.map((group) => (
                        <div key={group.label} className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedGroups((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted transition-colors text-sm font-medium"
                          >
                            <span>{group.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {group.perms.filter((p) => userPermisos.includes(getPermCode(p))).length}/{group.perms.length}
                              </span>
                              {expandedGroups[group.label] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </div>
                          </button>

                          {expandedGroups[group.label] && (
                            <div className="divide-y">
                              {group.perms.map((perm) => {
                                const code      = getPermCode(perm);
                                const isChecked = userPermisos.includes(code);
                                const info      = PERM_LABELS[code];
                                return (
                                  <label
                                    key={code}
                                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermiso(code)}
                                      className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer"
                                    />
                                    <p className="text-sm font-medium">{info?.label ?? code}</p>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })()}
        </Card>
      </div>
    </div>
  );
}
