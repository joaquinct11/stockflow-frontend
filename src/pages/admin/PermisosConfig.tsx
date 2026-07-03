import { useEffect, useMemo, useState } from 'react';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { adminService } from '../../services/admin.service';
import type { AdminUsuario, Permiso } from '../../types';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Input } from '../../components/ui/Input';
import {
  Search, Shield, Save, ShoppingCart, Wallet, Users, Package, Boxes,
  Truck, BarChart3, FileText, RotateCcw, Building2, ClipboardCheck,
  CheckCircle2, Settings2, Crown, ChevronDown, ChevronUp,
  Info, CreditCard, Award,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Labels de permisos ───────────────────────────────────────────────────────
const PERM_LABELS: Record<string, { label: string; descripcion: string }> = {
  VER_VENTAS:               { label: 'Ver todas las ventas',             descripcion: 'Historial completo de ventas del negocio' },
  VER_MIS_VENTAS:           { label: 'Ver mis ventas',                   descripcion: 'Consultar el historial de las propias ventas' },
  CREAR_VENTA:              { label: 'Realizar ventas en el POS',        descripcion: 'Abrir el POS y registrar ventas' },
  VER_DETALLE_VENTA:        { label: 'Ver detalle de una venta',         descripcion: 'Consultar el detalle de cualquier venta' },
  ANULAR_VENTA:             { label: 'Anular ventas',                    descripcion: 'Anular ventas registradas (revierte el stock automáticamente)' },
  VER_CAJA:                 { label: 'Ver el módulo Caja',               descripcion: 'Acceder a la pantalla de caja' },
  ABRIR_CAJA:               { label: 'Abrir turno de caja',              descripcion: 'Iniciar un turno de caja' },
  CERRAR_CAJA:              { label: 'Cerrar turno de caja',             descripcion: 'Cerrar y cuadrar la caja' },
  RETIRO_CAJA:              { label: 'Registrar retiro parcial',          descripcion: 'Retirar efectivo de la caja sin cerrar el turno' },
  VER_CLIENTES:             { label: 'Ver clientes',                     descripcion: 'Acceder al listado de clientes' },
  CREAR_CLIENTE:            { label: 'Registrar clientes',               descripcion: 'Agregar nuevos clientes' },
  EDITAR_CLIENTE:           { label: 'Editar clientes',                  descripcion: 'Modificar información de clientes' },
  ELIMINAR_CLIENTE:         { label: 'Eliminar clientes',                descripcion: 'Borrar clientes del sistema' },
  CAMBIAR_ESTADO_CLIENTE:   { label: 'Activar / desactivar clientes',    descripcion: 'Habilitar o inhabilitar clientes' },
  VER_DEVOLUCIONES:         { label: 'Ver devoluciones',                 descripcion: 'Historial de devoluciones' },
  CREAR_DEVOLUCION:         { label: 'Registrar devoluciones',           descripcion: 'Procesar devoluciones de venta' },
  VER_NOTAS_CREDITO:        { label: 'Ver notas de crédito',             descripcion: 'Listado de notas de crédito' },
  EMITIR_NOTA_CREDITO:      { label: 'Emitir notas de crédito',          descripcion: 'Generar notas de crédito electrónicas' },
  VER_FACTURACION:          { label: 'Ver toda la facturación',          descripcion: 'Acceder a todos los comprobantes del negocio' },
  VER_MIS_FACTURACION:      { label: 'Ver mis comprobantes',             descripcion: 'Ver únicamente los comprobantes de las propias ventas' },
  EMITIR_COMPROBANTE:       { label: 'Emitir boletas y facturas',        descripcion: 'Emitir comprobantes electrónicos' },
  VER_COMPROBANTE:          { label: 'Ver comprobantes emitidos',        descripcion: 'Consultar comprobantes ya emitidos' },
  ANULAR_COMPROBANTE:       { label: 'Anular comprobantes',              descripcion: 'Anular boletas o facturas emitidas' },
  ENVIAR_SUNAT:             { label: 'Enviar comprobantes a SUNAT',      descripcion: 'Enviar comprobantes mediante PSE a SUNAT' },
  VER_PRODUCTOS:            { label: 'Ver catálogo de productos',        descripcion: 'Acceder al listado de productos' },
  CREAR_PRODUCTO:           { label: 'Agregar productos',                descripcion: 'Crear nuevos productos en el catálogo' },
  EDITAR_PRODUCTO:          { label: 'Editar productos',                 descripcion: 'Modificar nombre, precio y datos del producto' },
  ELIMINAR_PRODUCTO:        { label: 'Eliminar productos',               descripcion: 'Borrar productos del catálogo' },
  VER_INVENTARIO:           { label: 'Ver Inventario / Kardex',          descripcion: 'Acceder al módulo de control de stock' },
  CREAR_INVENTARIO:         { label: 'Registrar ajustes de stock',       descripcion: 'Ingresar entradas, salidas y ajustes manuales' },
  VER_DETALLE_INVENTARIO:   { label: 'Ver historial de movimientos',     descripcion: 'Consultar el Kardex completo de cualquier producto' },
  ELIMINAR_INVENTARIO:      { label: 'Eliminar movimientos de stock',    descripcion: 'Borrar registros del Kardex' },
  VER_PROVEEDORES:          { label: 'Ver proveedores',                  descripcion: 'Acceder al listado de proveedores' },
  CREAR_PROVEEDOR:          { label: 'Registrar proveedores',            descripcion: 'Agregar nuevos proveedores' },
  EDITAR_PROVEEDOR:         { label: 'Editar proveedores',               descripcion: 'Modificar datos de proveedores' },
  ELIMINAR_PROVEEDOR:       { label: 'Eliminar proveedores',             descripcion: 'Borrar proveedores del sistema' },
  CAMBIAR_ESTADO_PROVEEDOR: { label: 'Activar / desactivar proveedores', descripcion: 'Habilitar o inhabilitar proveedores' },
  VER_OC:                   { label: 'Ver órdenes de compra',            descripcion: 'Acceder al módulo de compras' },
  CREAR_OC:                 { label: 'Crear órdenes de compra',          descripcion: 'Generar nuevas órdenes de compra a proveedores' },
  EDITAR_OC:                { label: 'Editar órdenes de compra',         descripcion: 'Modificar ítems y observaciones de OC en borrador' },
  ENVIAR_OC:                { label: 'Enviar OC al proveedor',           descripcion: 'Marcar la OC como enviada al proveedor' },
  CANCELAR_OC:              { label: 'Cancelar órdenes de compra',       descripcion: 'Cancelar una OC pendiente o enviada' },
  VER_RECEPCIONES:          { label: 'Ver recepciones de mercadería',    descripcion: 'Acceder al módulo de recepciones' },
  CREAR_RECEPCION:          { label: 'Registrar recepciones',            descripcion: 'Crear nuevas recepciones de mercadería' },
  CONFIRMAR_RECEPCION:      { label: 'Confirmar recepciones',            descripcion: 'Confirmar y cerrar una recepción' },
  VER_GASTOS:               { label: 'Ver gastos y egresos',             descripcion: 'Acceder al módulo de gastos del negocio' },
  CREAR_GASTO:              { label: 'Registrar gastos',                 descripcion: 'Agregar nuevos gastos o egresos' },
  EDITAR_GASTO:             { label: 'Editar gastos',                    descripcion: 'Modificar gastos ya registrados' },
  ELIMINAR_GASTO:           { label: 'Eliminar gastos',                  descripcion: 'Borrar gastos del sistema' },
  VER_SUSCRIPCIONES:        { label: 'Ver suscripciones',                descripcion: 'Consultar el estado y detalle de la suscripción activa' },
  VER_REPORTES:             { label: 'Acceder a Reportes',               descripcion: 'Ver reportes de ventas, inventario y rentabilidad' },
  VER_USUARIOS:             { label: 'Ver listado de usuarios',          descripcion: 'Consultar los usuarios registrados' },
  CREAR_USUARIO:            { label: 'Crear usuarios',                   descripcion: 'Invitar y crear nuevos colaboradores' },
  EDITAR_USUARIO:           { label: 'Editar usuarios',                  descripcion: 'Modificar datos y rol de un usuario' },
  ELIMINAR_USUARIO:         { label: 'Eliminar usuarios',               descripcion: 'Borrar usuarios del sistema permanentemente' },
  CAMBIAR_ESTADO_USUARIO:   { label: 'Activar / desactivar usuarios',    descripcion: 'Habilitar o inhabilitar el acceso de un usuario' },
  VER_CERTIFICADOS:         { label: 'Ver certificados',                 descripcion: 'Acceder al módulo de certificados y vencimientos' },
  CREAR_CERTIFICADO:        { label: 'Registrar certificados',           descripcion: 'Agregar nuevos certificados o documentos' },
  EDITAR_CERTIFICADO:       { label: 'Editar certificados',              descripcion: 'Modificar datos de certificados existentes' },
  ELIMINAR_CERTIFICADO:     { label: 'Eliminar certificados',            descripcion: 'Borrar certificados del sistema' },
  VER_COMISION:             { label: 'Ver comisiones',                   descripcion: 'Acceder al módulo de comisiones' },
  CREAR_COMISION:           { label: 'Registrar comisiones',             descripcion: 'Agregar nuevas comisiones recibidas' },
  EDITAR_COMISION:          { label: 'Editar comisiones',                descripcion: 'Modificar comisiones ya registradas' },
  ELIMINAR_COMISION:        { label: 'Eliminar comisiones',              descripcion: 'Borrar comisiones del sistema' },
  VER_SERVICIO:             { label: 'Ver catálogo de servicios',        descripcion: 'Acceder al listado de servicios' },
  CREAR_SERVICIO:           { label: 'Agregar servicios',                descripcion: 'Crear nuevos servicios en el catálogo' },
  EDITAR_SERVICIO:          { label: 'Editar servicios',                 descripcion: 'Modificar nombre, precio y datos del servicio' },
  ELIMINAR_SERVICIO:        { label: 'Eliminar servicios',               descripcion: 'Borrar servicios del catálogo' },
};

// ─── Grupos (orden = sidebar) ─────────────────────────────────────────────────
// Ventas → Caja → Historial Ventas → Facturación → Notas/Devoluciones
// Gastos → OC → Recepciones
// Contactos → Clientes → Proveedores
// Inventario → Productos → Movimientos
// Usuarios
// Reportes
const PERMISSION_GROUPS: { label: string; color: string; icon: React.ReactNode; codes: string[] }[] = [
  // ── Ventas ────────────────────────────────────────────────────────
  { label: 'Historial de Ventas', color: 'emerald', icon: <ShoppingCart size={15} />, codes: ['CREAR_VENTA','VER_VENTAS','VER_MIS_VENTAS','VER_DETALLE_VENTA','ANULAR_VENTA'] },
  { label: 'Caja',             color: 'blue',    icon: <Wallet       size={15} />, codes: ['VER_CAJA','ABRIR_CAJA','CERRAR_CAJA','RETIRO_CAJA'] },
  { label: 'Facturación',      color: 'indigo',  icon: <FileText     size={15} />, codes: ['VER_FACTURACION','VER_MIS_FACTURACION','EMITIR_COMPROBANTE','VER_COMPROBANTE','ANULAR_COMPROBANTE','ENVIAR_SUNAT'] },
  { label: 'Devoluciones y NC',color: 'orange',  icon: <RotateCcw    size={15} />, codes: ['VER_DEVOLUCIONES','CREAR_DEVOLUCION','VER_NOTAS_CREDITO','EMITIR_NOTA_CREDITO'] },
  // ── Gastos ────────────────────────────────────────────────────────
  { label: 'Gastos',           color: 'rose',    icon: <Wallet       size={15} />, codes: ['VER_GASTOS','CREAR_GASTO','EDITAR_GASTO','ELIMINAR_GASTO'] },
  { label: 'Órdenes de Compra',color: 'cyan',    icon: <Truck        size={15} />, codes: ['VER_OC','CREAR_OC','EDITAR_OC','ENVIAR_OC','CANCELAR_OC'] },
  { label: 'Recepciones',      color: 'lime',    icon: <ClipboardCheck size={15} />, codes: ['VER_RECEPCIONES','CREAR_RECEPCION','CONFIRMAR_RECEPCION'] },
  // ── Contactos ─────────────────────────────────────────────────────
  { label: 'Clientes',         color: 'violet',  icon: <Users        size={15} />, codes: ['VER_CLIENTES','CREAR_CLIENTE','EDITAR_CLIENTE','CAMBIAR_ESTADO_CLIENTE','ELIMINAR_CLIENTE'] },
  { label: 'Proveedores',      color: 'teal',    icon: <Building2    size={15} />, codes: ['VER_PROVEEDORES','CREAR_PROVEEDOR','EDITAR_PROVEEDOR','CAMBIAR_ESTADO_PROVEEDOR','ELIMINAR_PROVEEDOR'] },
  // ── Inventario ────────────────────────────────────────────────────
  { label: 'Productos',        color: 'pink',    icon: <Package      size={15} />, codes: ['VER_PRODUCTOS','CREAR_PRODUCTO','EDITAR_PRODUCTO','ELIMINAR_PRODUCTO'] },
  { label: 'Catálogo de Servicios', color: 'sky', icon: <FileText size={15} />, codes: ['VER_SERVICIO','CREAR_SERVICIO','EDITAR_SERVICIO','ELIMINAR_SERVICIO'] },
  { label: 'Movimientos',      color: 'amber',   icon: <Boxes        size={15} />, codes: ['VER_INVENTARIO','CREAR_INVENTARIO'] },
  // ── Usuarios ──────────────────────────────────────────────────────
  { label: 'Usuarios',         color: 'slate',   icon: <Users        size={15} />, codes: ['VER_USUARIOS','CREAR_USUARIO','EDITAR_USUARIO','CAMBIAR_ESTADO_USUARIO','ELIMINAR_USUARIO'] },
  { label: 'Certificados',     color: 'orange',  icon: <Award        size={15} />, codes: ['VER_CERTIFICADOS','CREAR_CERTIFICADO','EDITAR_CERTIFICADO','ELIMINAR_CERTIFICADO'] },
  { label: 'Comisiones',       color: 'emerald', icon: <BarChart3    size={15} />, codes: ['VER_COMISION','CREAR_COMISION','EDITAR_COMISION','ELIMINAR_COMISION'] },
  // ── Suscripciones ─────────────────────────────────────────────────
  { label: 'Suscripciones',    color: 'violet',  icon: <CreditCard   size={15} />, codes: ['VER_SUSCRIPCIONES'] },
  // ── Reportes ──────────────────────────────────────────────────────
  { label: 'Reportes',         color: 'purple',  icon: <BarChart3    size={15} />, codes: ['VER_REPORTES'] },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-950/30',       text: 'text-blue-700 dark:text-blue-400',       border: 'border-blue-200 dark:border-blue-800',       iconBg: 'bg-blue-100 dark:bg-blue-900/50' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-950/30',   text: 'text-violet-700 dark:text-violet-400',   border: 'border-violet-200 dark:border-violet-800',   iconBg: 'bg-violet-100 dark:bg-violet-900/50' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-950/30',   text: 'text-orange-700 dark:text-orange-400',   border: 'border-orange-200 dark:border-orange-800',   iconBg: 'bg-orange-100 dark:bg-orange-900/50' },
  indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-950/30',   text: 'text-indigo-700 dark:text-indigo-400',   border: 'border-indigo-200 dark:border-indigo-800',   iconBg: 'bg-indigo-100 dark:bg-indigo-900/50' },
  pink:    { bg: 'bg-pink-50 dark:bg-pink-950/30',       text: 'text-pink-700 dark:text-pink-400',       border: 'border-pink-200 dark:border-pink-800',       iconBg: 'bg-pink-100 dark:bg-pink-900/50' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-950/30',     text: 'text-amber-700 dark:text-amber-400',     border: 'border-amber-200 dark:border-amber-800',     iconBg: 'bg-amber-100 dark:bg-amber-900/50' },
  teal:    { bg: 'bg-teal-50 dark:bg-teal-950/30',       text: 'text-teal-700 dark:text-teal-400',       border: 'border-teal-200 dark:border-teal-800',       iconBg: 'bg-teal-100 dark:bg-teal-900/50' },
  cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-950/30',       text: 'text-cyan-700 dark:text-cyan-400',       border: 'border-cyan-200 dark:border-cyan-800',       iconBg: 'bg-cyan-100 dark:bg-cyan-900/50' },
  lime:    { bg: 'bg-lime-50 dark:bg-lime-950/30',       text: 'text-lime-700 dark:text-lime-400',       border: 'border-lime-200 dark:border-lime-800',       iconBg: 'bg-lime-100 dark:bg-lime-900/50' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-950/30',       text: 'text-rose-700 dark:text-rose-400',       border: 'border-rose-200 dark:border-rose-800',       iconBg: 'bg-rose-100 dark:bg-rose-900/50' },
  purple:  { bg: 'bg-purple-50 dark:bg-purple-950/30',   text: 'text-purple-700 dark:text-purple-400',   border: 'border-purple-200 dark:border-purple-800',   iconBg: 'bg-purple-100 dark:bg-purple-900/50' },
  slate:   { bg: 'bg-slate-50 dark:bg-slate-950/30',     text: 'text-slate-700 dark:text-slate-400',     border: 'border-slate-200 dark:border-slate-800',     iconBg: 'bg-slate-100 dark:bg-slate-900/50' },
  sky:     { bg: 'bg-sky-50 dark:bg-sky-950/30',         text: 'text-sky-700 dark:text-sky-400',         border: 'border-sky-200 dark:border-sky-800',         iconBg: 'bg-sky-100 dark:bg-sky-900/50' },
};

// ─── Roles ────────────────────────────────────────────────────────────────────
const ROL_CARDS = [
  {
    rol: 'ADMIN', label: 'Administrador',
    descripcion: 'Acceso total sin restricciones.',
    colors: { ring: 'ring-rose-200 dark:ring-rose-800', bg: 'bg-rose-50 dark:bg-rose-950/30', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300', icon: 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400' },
    icon: <Crown size={18} />,
    accesos: [
      { icon: <ShoppingCart size={12} />, label: 'Ventas y POS',  ok: true },
      { icon: <Wallet       size={12} />, label: 'Caja',          ok: true },
      { icon: <Boxes        size={12} />, label: 'Inventario',    ok: true },
      { icon: <Truck        size={12} />, label: 'Compras',       ok: true },
      { icon: <Users        size={12} />, label: 'Usuarios',      ok: true },
      { icon: <BarChart3    size={12} />, label: 'Reportes',      ok: true },
      { icon: <FileText     size={12} />, label: 'Facturación',   ok: true },
      { icon: <Settings2    size={12} />, label: 'Configuración', ok: true },
    ],
  },
  {
    rol: 'VENDEDOR', label: 'Vendedor',
    descripcion: 'Vende, cobra, emite comprobantes y atiende clientes.',
    colors: { ring: 'ring-emerald-200 dark:ring-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-950/30', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', icon: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' },
    icon: <ShoppingCart size={18} />,
    accesos: [
      { icon: <ShoppingCart size={12} />, label: 'Ventas y POS',  ok: true  },
      { icon: <Wallet       size={12} />, label: 'Caja',          ok: true  },
      { icon: <Users        size={12} />, label: 'Clientes',      ok: true  },
      { icon: <RotateCcw    size={12} />, label: 'Devoluciones',  ok: true  },
      { icon: <FileText     size={12} />, label: 'Facturación',   ok: true  },
      { icon: <Package      size={12} />, label: 'Ver productos', ok: true  },
      { icon: <Boxes        size={12} />, label: 'Inventario',    ok: false },
      { icon: <Truck        size={12} />, label: 'Compras',       ok: false },
    ],
  },
  {
    rol: 'GESTOR_INVENTARIO', label: 'Almacenero',
    descripcion: 'Gestiona stock, recibe mercadería y maneja compras.',
    colors: { ring: 'ring-amber-200 dark:ring-amber-800', bg: 'bg-amber-50 dark:bg-amber-950/30', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', icon: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400' },
    icon: <Boxes size={18} />,
    accesos: [
      { icon: <Boxes          size={12} />, label: 'Inventario',   ok: true  },
      { icon: <Truck          size={12} />, label: 'Compras',      ok: true  },
      { icon: <ClipboardCheck size={12} />, label: 'Recepciones',  ok: true  },
      { icon: <Package        size={12} />, label: 'Productos',    ok: true  },
      { icon: <Building2      size={12} />, label: 'Proveedores',  ok: true  },
      { icon: <BarChart3      size={12} />, label: 'Reportes',     ok: true  },
      { icon: <ShoppingCart   size={12} />, label: 'Ventas y POS', ok: false },
      { icon: <Users          size={12} />, label: 'Clientes',     ok: false },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPermCode(p: Permiso): string { return (p?.nombre ?? '').toString(); }

function UserAvatar({ nombre, colors }: { nombre: string; colors: typeof ROL_CARDS[0]['colors'] }) {
  const initials = nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ring-2 ${colors.ring} ${colors.icon}`}>
      {initials}
    </div>
  );
}

// Toggle switch component
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
const DEALER_HIDDEN_GROUP_LABELS  = ['Devoluciones y NC', 'Órdenes de Compra', 'Recepciones'];
const SERVICIOS_ONLY_GROUP_LABELS = ['Catálogo de Servicios', 'Comisiones'];

export function PermisosConfig() {
  const { config: negocioConfig } = useTenantConfigStore();
  const esDealer = negocioConfig?.rubro === 'EMPRESA_SERVICIOS';

  const [usuarios, setUsuarios]               = useState<AdminUsuario[]>([]);
  const [permisosCatalog, setPermisosCatalog] = useState<Permiso[]>([]);
  const [selectedUserId, setSelectedUserId]   = useState<number | null>(null);
  const [userPermisos, setUserPermisos]       = useState<string[]>([]);
  const [basePermisos, setBasePermisos]       = useState<string[]>([]);
  const [savedPermisos, setSavedPermisos]     = useState<string[]>([]);
  const [loadingInit, setLoadingInit]         = useState(true);
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [userSearch, setUserSearch]           = useState('');
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
    setSavedPermisos([]);
    try {
      setLoadingPermisos(true);
      const [defaults, extras] = await Promise.all([
        adminService.getDefaultPermisos(user.rolNombre).catch(() => [] as string[]),
        adminService.getUsuarioPermisos(user.id).catch(() => [] as string[]),
      ]);
      setBasePermisos(defaults);
      const all = Array.from(new Set([...defaults, ...extras]));
      setUserPermisos(all);
      setSavedPermisos(all);
    } catch {
      toast.error(`Error al cargar permisos de ${user.nombre}`);
    } finally {
      setLoadingPermisos(false);
    }
  };

  const togglePermiso = (code: string) => {
    if (basePermisos.includes(code)) return;
    setUserPermisos(prev => prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]);
  };

  const toggleGroup = (codes: string[]) => {
    const assignable = codes.filter(c => !basePermisos.includes(c));
    const allOn = assignable.every(c => userPermisos.includes(c));
    setUserPermisos(prev =>
      allOn
        ? prev.filter(p => !assignable.includes(p))
        : Array.from(new Set([...prev, ...assignable]))
    );
  };

  const handleSave = async () => {
    if (selectedUserId === null) return;
    try {
      setSaving(true);
      const extras = userPermisos.filter(p => !basePermisos.includes(p));
      await adminService.updateUsuarioPermisos(selectedUserId, extras);
      setSavedPermisos([...userPermisos]);
      toast.success('Permisos actualizados correctamente');
    } catch {
      toast.error('Error al guardar permisos');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => setUserPermisos([...savedPermisos]);

  const selectedUser  = usuarios.find(u => u.id === selectedUserId) ?? null;
  const hasUnsaved    = JSON.stringify([...userPermisos].sort()) !== JSON.stringify([...savedPermisos].sort());
  const extrasActivos = userPermisos.filter(p => !basePermisos.includes(p));

  const filteredUsuarios = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return !q ? usuarios : usuarios.filter(u =>
      u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [usuarios, userSearch]);

  const extraGroups = useMemo(() => {
    const catalog = Array.isArray(permisosCatalog) ? permisosCatalog : [];
    const byCode = new Map<string, Permiso>();
    for (const p of catalog) { const code = getPermCode(p); if (code) byCode.set(code, p); }
    return PERMISSION_GROUPS
      .filter(g => (!esDealer || !DEALER_HIDDEN_GROUP_LABELS.includes(g.label)) &&
                   (esDealer  || !SERVICIOS_ONLY_GROUP_LABELS.includes(g.label)))
      .map(g => {
        const perms = g.codes
          .map((code, i) => byCode.get(code) ?? ({ id: -(i + 1), nombre: code } as Permiso));
        return { ...g, perms };
      }).filter(g => g.perms.length > 0);
  }, [permisosCatalog, basePermisos, esDealer]);

  const getRolCard = (rolNombre: string) => ROL_CARDS.find(r => r.rol === rolNombre) ?? ROL_CARDS[1];

  if (loadingInit) return (
    <div className="flex items-center justify-center py-24"><LoadingSpinner /></div>
  );

  return (
    <div className="space-y-6 pb-24">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield size={16} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Roles y permisos</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            3 roles predefinidos. Asigna permisos adicionales a cada empleado sin cambiar su rol.
          </p>
        </div>
      </div>

      {/* ── Tarjetas de roles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ROL_CARDS.map(card => (
          <div key={card.rol} className={`rounded-2xl border p-4 ${card.colors.bg} ring-1 ${card.colors.ring}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${card.colors.icon}`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{card.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">{card.descripcion}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
              {card.accesos.map(a => (
                <div key={a.label} className="flex items-center gap-1.5">
                  <span className={a.ok ? 'text-green-500' : 'text-muted-foreground/30'}>{a.icon}</span>
                  <span className={`text-[11px] truncate ${a.ok ? 'text-foreground/80' : 'text-muted-foreground/40'}`}>{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Layout principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Lista de empleados */}
        <div className="lg:col-span-4 rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm flex items-center gap-2">
                <Users size={15} className="text-muted-foreground" />
                Empleados
              </p>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{usuarios.length}</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input placeholder="Buscar por nombre o email..." value={userSearch}
                onChange={e => setUserSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[520px]">
            {filteredUsuarios.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Users size={28} className="mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">Sin empleados registrados</p>
              </div>
            ) : (
              <ul className="divide-y">
                {filteredUsuarios.map(user => {
                  const card = getRolCard(user.rolNombre);
                  const isSelected = selectedUserId === user.id;
                  return (
                    <li key={user.id}>
                      <button
                        onClick={() => handleSelectUser(user)}
                        className={`w-full text-left px-4 py-3 transition-all hover:bg-accent/60 ${
                          isSelected ? 'bg-primary/5 border-l-[3px] border-l-primary' : 'border-l-[3px] border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar nombre={user.nombre} colors={card.colors} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{user.nombre}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${card.colors.badge}`}>
                            {card.label}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Panel derecho */}
        <div className="lg:col-span-8 rounded-2xl border bg-card shadow-sm overflow-hidden">

          {/* Empty state */}
          {!selectedUser && (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center gap-3">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-2">
                <Shield size={32} className="text-muted-foreground/30" />
              </div>
              <p className="font-semibold text-muted-foreground">Selecciona un empleado</p>
              <p className="text-sm text-muted-foreground/70 max-w-xs">
                Haz clic en cualquier empleado de la lista para ver y personalizar sus permisos de acceso.
              </p>
            </div>
          )}

          {/* Loading permisos */}
          {selectedUser && loadingPermisos && (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner />
            </div>
          )}

          {/* Panel de permisos */}
          {selectedUser && !loadingPermisos && (() => {
            const card = getRolCard(selectedUser.rolNombre);
            return (
              <div className="flex flex-col h-full">

                {/* Header usuario */}
                <div className={`p-5 border-b ${card.colors.bg}`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar nombre={selectedUser.nombre} colors={card.colors} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold truncate">{selectedUser.nombre}</p>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${card.colors.badge}`}>
                            {card.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {extrasActivos.length > 0 && (
                        <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full">
                          +{extrasActivos.length} extra{extrasActivos.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Accesos del rol */}
                <div className="p-5 border-b space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <p className="text-sm font-semibold">Accesos incluidos en su rol</p>
                    <span className="text-xs text-muted-foreground">(no editables)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {card.accesos.map(a => (
                      <div
                        key={a.label}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          a.ok
                            ? 'bg-background border-green-200 dark:border-green-800 text-foreground'
                            : 'bg-muted/20 border-transparent text-muted-foreground/40'
                        }`}
                      >
                        <span className={a.ok ? 'text-green-500' : 'text-muted-foreground/30'}>{a.icon}</span>
                        {a.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Permisos adicionales */}
                <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings2 size={14} className="text-muted-foreground" />
                      <p className="text-sm font-semibold">Permisos adicionales</p>
                    </div>
                    {extrasActivos.length > 0 && (
                      <button
                        onClick={() => setUserPermisos(prev => prev.filter(p => basePermisos.includes(p)))}
                        className="text-xs text-destructive hover:underline"
                      >
                        Quitar todos los extras
                      </button>
                    )}
                  </div>

                  <div className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
                    <Info size={13} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Los permisos del rol son fijos. Aquí puedes <strong>ampliar</strong> el acceso de este empleado sin cambiar su rol.
                    </p>
                  </div>

                  {/* Grupos */}
                  <div className="space-y-2">
                    {extraGroups.map(group => {
                      const c = COLOR_MAP[group.color] ?? COLOR_MAP.slate;
                      // Solo los editables (no base) cuentan para el toggle del grupo
                      const editableCodes = group.perms.map(getPermCode).filter(code => !basePermisos.includes(code));
                      const activeCount = editableCodes.filter(code => userPermisos.includes(code)).length;
                      const allOn = editableCodes.length > 0 && activeCount === editableCodes.length;
                      const isOpen = expandedGroups[group.label] ?? false;

                      return (
                        <div key={group.label} className={`rounded-xl border overflow-hidden transition-all ${isOpen ? c.border : 'border-border'}`}>
                          {/* Header del grupo */}
                          <div className={`flex items-center gap-3 px-4 py-3 ${isOpen ? c.bg : 'hover:bg-muted/40'} transition-colors`}>
                            <button
                              className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                              onClick={() => setExpandedGroups(prev => ({ ...prev, [group.label]: !isOpen }))}
                            >
                              <span className={`flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center ${c.iconBg} ${c.text}`}>
                                {group.icon}
                              </span>
                              <span className="text-sm font-semibold truncate">{group.label}</span>
                              {activeCount > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${c.bg} ${c.text} border ${c.border}`}>
                                  {activeCount}/{editableCodes.length}
                                </span>
                              )}
                            </button>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {editableCodes.length > 0 && (
                                <Toggle
                                  checked={allOn}
                                  onChange={() => toggleGroup(editableCodes)}
                                />
                              )}
                              <button
                                onClick={() => setExpandedGroups(prev => ({ ...prev, [group.label]: !isOpen }))}
                                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                              >
                                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* Permisos del grupo */}
                          {isOpen && (
                            <div className="divide-y border-t">
                              {group.perms.map(perm => {
                                const code = getPermCode(perm);
                                const isBase = basePermisos.includes(code);
                                const isChecked = userPermisos.includes(code);
                                const info = PERM_LABELS[code];
                                return (
                                  <div
                                    key={code}
                                    onClick={() => !isBase && togglePermiso(code)}
                                    className={`flex items-center justify-between gap-4 px-4 py-3 transition-colors ${isBase ? 'cursor-default opacity-60' : 'cursor-pointer hover:bg-muted/30'}`}
                                  >
                                    <div className="min-w-0 flex items-start gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="text-sm font-medium">{info?.label ?? code}</p>
                                          {isBase && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border flex-shrink-0">
                                              Rol
                                            </span>
                                          )}
                                        </div>
                                        {info?.descripcion && (
                                          <p className="text-xs text-muted-foreground mt-0.5">{info.descripcion}</p>
                                        )}
                                      </div>
                                    </div>
                                    <Toggle checked={isChecked} onChange={() => !isBase && togglePermiso(code)} disabled={isBase} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Barra flotante de guardar ── */}
      {selectedUser && hasUnsaved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3 bg-background border rounded-2xl shadow-xl px-5 py-3">
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-sm font-medium">Cambios sin guardar</p>
            <div className="flex items-center gap-2 ml-2">
              <Button variant="outline" size="sm" onClick={handleDiscard} disabled={saving}>
                Descartar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 min-w-[100px]">
                {saving ? (
                  <><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
                ) : (
                  <><Save size={13} />Guardar cambios</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
