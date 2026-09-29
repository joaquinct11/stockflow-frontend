import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { adminService } from '../../services/admin.service';
import type { AdminUsuario, Permiso } from '../../types';
import { notify } from '../../lib/notify';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: '#f7f8fa', surface: '#ffffff', surface2: '#f1f3f7', surface3: '#fafbfc',
  line: '#e4e7ec', lineSoft: '#eef0f4',
  text: '#0d1117', text2: '#525c6b', text3: '#6b7280',
  primary: '#3b47ef', primarySoft: '#eef0ff', primaryLine: '#cfd4fd',
  ok: '#0f9d6e', okSoft: '#e7f7f1',
  warn: '#b7791f', warnSoft: '#fdf6e7', warnLine: '#f0dfb4',
  bad: '#d63b3b', badSoft: '#fdeceb',
  shadow: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
} as const;

// ─── SVG icon paths from spec ─────────────────────────────────────────────────
const IC = {
  cart:   'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0',
  wallet: 'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5M16 14h.01',
  doc:    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M9 13h6M9 17h4',
  ret:    'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  down:   'm22 17-8.5-8.5-5 5L2 7M16 17h6v-6',
  truck:  'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-.2-.6l-3.5-4.4A1 1 0 0 0 17.5 8H14M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  clip:   'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9ZM9 14l2 2 4-4',
  users:  'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  build:  'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18ZM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4',
  box:    'M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7ZM3.3 7 12 12l8.7-5M12 22V12',
  layers: 'm12 2 10 5-10 5L2 7ZM2 17l10 5 10-5M2 12l10 5 10-5',
  shield: 'M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1ZM9 12l2 2 4-4',
  card:   'M2 5h20v14H2ZM2 10h20',
  chart:  'M3 3v18h18M7 15l4-4 3 3 6-6',
  award:  'M12 2a4 4 0 0 1 4 4c0 1.6-.9 3-2.2 3.7L16 21l-4-2-4 2 2.2-11.3A4 4 0 0 1 8 6a4 4 0 0 1 4-4Z',
  badge:  'M3.85 8.6a8 8 0 1 1 4.55-4.55M8.1 3.15a8 8 0 0 0 0 0M12 12l4 2-4 7-4-7 4-2Z',
};

// ─── Permission groups (spec-accurate colors + icons) ─────────────────────────
const PG: { label: string; color: string; icon: string; codes: string[] }[] = [
  { label: 'Historial de Ventas', color: '#10b981', icon: IC.cart,   codes: ['CREAR_VENTA','VER_VENTAS','VER_MIS_VENTAS','VER_DETALLE_VENTA','ANULAR_VENTA'] },
  { label: 'Caja',                color: '#3b82f6', icon: IC.wallet, codes: ['VER_CAJA','ABRIR_CAJA','CERRAR_CAJA','RETIRO_CAJA'] },
  { label: 'Facturación',         color: '#6366f1', icon: IC.doc,    codes: ['VER_FACTURACION','VER_MIS_FACTURACION','EMITIR_COMPROBANTE','VER_COMPROBANTE','ANULAR_COMPROBANTE','ENVIAR_SUNAT'] },
  { label: 'Devoluciones y NC',   color: '#f97316', icon: IC.ret,    codes: ['VER_DEVOLUCIONES','CREAR_DEVOLUCION','VER_NOTAS_CREDITO','EMITIR_NOTA_CREDITO'] },
  { label: 'Gastos',              color: '#f43f5e', icon: IC.down,   codes: ['VER_GASTOS','CREAR_GASTO','EDITAR_GASTO','ELIMINAR_GASTO'] },
  { label: 'Órdenes de Compra',   color: '#06b6d4', icon: IC.truck,  codes: ['VER_OC','CREAR_OC','EDITAR_OC','ENVIAR_OC','CANCELAR_OC'] },
  { label: 'Recepciones',         color: '#84cc16', icon: IC.clip,   codes: ['VER_RECEPCIONES','CREAR_RECEPCION','CONFIRMAR_RECEPCION'] },
  { label: 'Clientes',            color: '#8b5cf6', icon: IC.users,  codes: ['VER_CLIENTES','CREAR_CLIENTE','EDITAR_CLIENTE','CAMBIAR_ESTADO_CLIENTE','ELIMINAR_CLIENTE'] },
  { label: 'Proveedores',         color: '#14b8a6', icon: IC.build,  codes: ['VER_PROVEEDORES','CREAR_PROVEEDOR','EDITAR_PROVEEDOR','CAMBIAR_ESTADO_PROVEEDOR','ELIMINAR_PROVEEDOR'] },
  { label: 'Productos',           color: '#ec4899', icon: IC.box,    codes: ['VER_PRODUCTOS','CREAR_PRODUCTO','EDITAR_PRODUCTO','ELIMINAR_PRODUCTO'] },
  { label: 'Catálogo de Servicios', color: '#0ea5e9', icon: IC.doc,  codes: ['VER_SERVICIO','CREAR_SERVICIO','EDITAR_SERVICIO','ELIMINAR_SERVICIO'] },
  { label: 'Movimientos',         color: '#f59e0b', icon: IC.layers, codes: ['VER_INVENTARIO','CREAR_INVENTARIO'] },
  { label: 'Usuarios',            color: '#64748b', icon: IC.users,  codes: ['VER_USUARIOS','CREAR_USUARIO','EDITAR_USUARIO','CAMBIAR_ESTADO_USUARIO','ELIMINAR_USUARIO'] },
  { label: 'Certificados',        color: '#f97316', icon: IC.award,  codes: ['VER_CERTIFICADOS','CREAR_CERTIFICADO','EDITAR_CERTIFICADO','ELIMINAR_CERTIFICADO'] },
  { label: 'Comisiones',          color: '#10b981', icon: IC.chart,  codes: ['VER_COMISION','CREAR_COMISION','EDITAR_COMISION','ELIMINAR_COMISION'] },
  { label: 'Suscripciones',       color: '#8b5cf6', icon: IC.card,   codes: ['VER_SUSCRIPCIONES'] },
  { label: 'Reportes',            color: '#a855f7', icon: IC.chart,  codes: ['VER_REPORTES'] },
];

// ─── Roles metadata ───────────────────────────────────────────────────────────
const ROLES_META: Record<string, {
  label: string; desc: string; tone: string; icon: string;
  sin: string[];
}> = {
  ADMIN: {
    label: 'Administrador',
    desc: 'Acceso total sin restricciones a todos los módulos.',
    tone: T.primary, icon: IC.shield,
    sin: [],
  },
  VENDEDOR: {
    label: 'Vendedor',
    desc: 'Vende, cobra, emite comprobantes y atiende clientes.',
    tone: T.ok, icon: IC.cart,
    sin: ['Inventario', 'Compras', 'Reportes', 'Configuración'],
  },
  GESTOR_INVENTARIO: {
    label: 'Almacenero',
    desc: 'Gestiona stock, recibe mercadería y maneja compras.',
    tone: T.warn, icon: IC.box,
    sin: ['Ventas y POS', 'Clientes', 'Facturación', 'Configuración'],
  },
};

// ─── Permission labels ────────────────────────────────────────────────────────
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
  ELIMINAR_USUARIO:         { label: 'Eliminar usuarios',                descripcion: 'Borrar usuarios del sistema permanentemente' },
  CAMBIAR_ESTADO_USUARIO:   { label: 'Activar / desactivar usuarios',    descripcion: 'Habilitar o inhabilitar el acceso de un usuario' },
  VER_CERTIFICADOS:         { label: 'Ver certificados',                 descripcion: 'Acceder al módulo de certificados' },
  CREAR_CERTIFICADO:        { label: 'Registrar certificados',           descripcion: 'Agregar nuevos certificados' },
  EDITAR_CERTIFICADO:       { label: 'Editar certificados',              descripcion: 'Modificar datos de certificados' },
  ELIMINAR_CERTIFICADO:     { label: 'Eliminar certificados',            descripcion: 'Borrar certificados del sistema' },
  VER_COMISION:             { label: 'Ver comisiones',                   descripcion: 'Acceder al módulo de comisiones' },
  CREAR_COMISION:           { label: 'Registrar comisiones',             descripcion: 'Agregar nuevas comisiones' },
  EDITAR_COMISION:          { label: 'Editar comisiones',                descripcion: 'Modificar comisiones ya registradas' },
  ELIMINAR_COMISION:        { label: 'Eliminar comisiones',              descripcion: 'Borrar comisiones del sistema' },
  VER_SERVICIO:             { label: 'Ver catálogo de servicios',        descripcion: 'Acceder al listado de servicios' },
  CREAR_SERVICIO:           { label: 'Agregar servicios',                descripcion: 'Crear nuevos servicios en el catálogo' },
  EDITAR_SERVICIO:          { label: 'Editar servicios',                 descripcion: 'Modificar nombre, precio y datos del servicio' },
  ELIMINAR_SERVICIO:        { label: 'Eliminar servicios',               descripcion: 'Borrar servicios del catálogo' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const HUES = [262, 200, 160, 25, 330, 45, 290, 180];

function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function avatarStyle(email: string, size: number, inactive?: boolean): React.CSSProperties {
  const hue = HUES[strHash(email) % HUES.length];
  return {
    width: size, height: size, flexShrink: 0, borderRadius: '50%',
    display: 'grid', placeItems: 'center',
    fontSize: `${(size * 0.36).toFixed(1)}px`, fontWeight: 700,
    ...(inactive
      ? { color: T.text3, background: T.surface2 }
      : { color: `oklch(0.45 0.13 ${hue})`, background: `oklch(0.94 0.04 ${hue})` }),
  };
}

function tileStyle(color: string, size: number): React.CSSProperties {
  return {
    width: size, height: size, flexShrink: 0, display: 'grid', placeItems: 'center',
    borderRadius: Math.round(size * 0.28),
    color,
    background: `color-mix(in oklab, ${color} 15%, ${T.surface})`,
  };
}

function ini(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getPermCode(p: Permiso): string { return (p?.nombre ?? '').toString(); }

const DEALER_HIDDEN = ['Devoluciones y NC', 'Órdenes de Compra', 'Recepciones'];
const SERVICIOS_ONLY = ['Catálogo de Servicios', 'Comisiones'];

// ─── Sub-components ───────────────────────────────────────────────────────────
function IcoSvg({ path, size = 15 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={path} />
    </svg>
  );
}

function ToggleSwitch({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange?: () => void }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      style={{
        width: 38, height: 22, flexShrink: 0, padding: 2, borderRadius: 20,
        border: 0, cursor: disabled ? 'default' : 'pointer',
        background: on ? (disabled ? T.text3 : T.primary) : T.line,
        opacity: disabled ? 0.5 : 1,
        transition: 'background .16s',
        display: 'flex', alignItems: 'center',
      }}
    >
      <span style={{
        display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.25)',
        transition: 'transform .16s',
        transform: `translateX(${on ? 16 : 0}px)`,
      }} />
    </button>
  );
}

// ─── Role Detail Modal ────────────────────────────────────────────────────────
function RoleModal({ rolKey, basePerms, onClose }: {
  rolKey: string;
  basePerms: string[];
  onClose: () => void;
}) {
  const meta = ROLES_META[rolKey];
  if (!meta) return null;

  const grupos = PG.map(g => {
    const inc = g.codes.filter(c => basePerms.includes(c));
    if (!inc.length) return null;
    return { label: g.label, color: g.color, icon: g.icon, count: `${inc.length}/${g.codes.length}`, items: inc.map(c => PERM_LABELS[c]?.label ?? c) };
  }).filter(Boolean) as { label: string; color: string; icon: string; count: string; items: string[] }[];

  const sinAcceso = meta.sin;

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 720, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: `${meta.tone}22`, color: meta.tone }}>
            <IcoSvg path={meta.icon} size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>Permisos del rol {meta.label}</h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>{meta.desc} · {rolKey === 'ADMIN' ? 'Todos los permisos' : `${basePerms.length} permisos`}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px 20px' }}>
          {rolKey === 'ADMIN' ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <span style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.primarySoft, color: T.primary }}>
                <IcoSvg path={IC.shield} size={24} />
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14 }}>Acceso total a todos los módulos</div>
              <p style={{ fontSize: '.86rem', lineHeight: 1.55, color: T.text3, margin: '7px auto 0', maxWidth: 400 }}>Los administradores no tienen restricciones. Tienen acceso completo a todas las funcionalidades del sistema.</p>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3, marginBottom: 10 }}>Incluye</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
                {grupos.map(g => (
                  <div key={g.label} style={{ padding: '11px 13px', borderRadius: 11, background: T.surface3, border: `1px solid ${T.lineSoft}`, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={tileStyle(g.color, 24)}><IcoSvg path={g.icon} size={13} /></span>
                      <span style={{ flex: 1, fontSize: '.84rem', fontWeight: 650 }}>{g.label}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', color: T.text3 }}>{g.count}</span>
                    </div>
                    <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                      {g.items.map(it => (
                        <div key={it} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.77rem', color: T.text2 }}>
                          <span style={{ color: T.ok, display: 'grid' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
                          </span>
                          {it}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {sinAcceso.length > 0 && (
                <>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3, margin: '20px 0 10px' }}>Sin acceso por defecto</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sinAcceso.map(s => (
                      <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px', fontSize: '.76rem', fontWeight: 600, color: T.text3, background: T.surface2, borderRadius: 8 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: '.76rem', color: T.text3, marginTop: 12 }}>Puedes habilitar cualquiera de estos a un empleado específico como permiso adicional.</div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PermisosConfig() {
  const { config: negocioConfig } = useTenantConfigStore();
  const esDealer = negocioConfig?.rubro === 'EMPRESA_SERVICIOS';

  const [usuarios, setUsuarios]             = useState<AdminUsuario[]>([]);
  const [permisosCatalog, setPermisosCatalog] = useState<Permiso[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userPermisos, setUserPermisos]     = useState<string[]>([]);
  const [basePermisos, setBasePermisos]     = useState<string[]>([]);
  const [savedPermisos, setSavedPermisos]   = useState<string[]>([]);
  const [loadingInit, setLoadingInit]       = useState(true);
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [userSearch, setUserSearch]         = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [modalRol, setModalRol]             = useState<string | null>(null);
  const [modalRolBasePerms, setModalRolBasePerms] = useState<string[]>([]);

  useEffect(() => { fetchInitialData(); }, []);

  async function fetchInitialData() {
    try {
      setLoadingInit(true);
      const [users, perms] = await Promise.all([
        adminService.getUsuarios().catch(() => { throw new Error('usuarios'); }),
        adminService.getPermisos().catch(() => { throw new Error('permisos'); }),
      ]);
      setUsuarios(users.filter((u: AdminUsuario) => u.rolNombre !== 'ADMIN'));
      setPermisosCatalog(perms);
    } catch (err) {
      notify.fromError(err, 'Error al cargar datos');
    } finally {
      setLoadingInit(false);
    }
  }

  async function handleSelectUser(user: AdminUsuario) {
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
    } catch (err) {
      notify.fromError(err, `Error al cargar permisos de ${user.nombre}`);
    } finally {
      setLoadingPermisos(false);
    }
  }

  function togglePermiso(code: string) {
    if (basePermisos.includes(code)) return;
    setUserPermisos(prev => prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]);
  }

  async function handleSave() {
    if (selectedUserId === null) return;
    try {
      setSaving(true);
      const extras = userPermisos.filter(p => !basePermisos.includes(p));
      await adminService.updateUsuarioPermisos(selectedUserId, extras);
      setSavedPermisos([...userPermisos]);
      notify.success('Permisos actualizados correctamente');
    } catch (err) {
      notify.fromError(err, 'Error al guardar permisos');
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() { setUserPermisos([...savedPermisos]); }

  async function openRoleModal(rolKey: string) {
    setModalRolBasePerms([]);
    setModalRol(rolKey);
    if (rolKey !== 'ADMIN') {
      try {
        const perms = await adminService.getDefaultPermisos(rolKey).catch(() => [] as string[]);
        setModalRolBasePerms(perms);
      } catch { /* ignore */ }
    }
  }

  const selectedUser = usuarios.find(u => u.id === selectedUserId) ?? null;
  const hasUnsaved   = JSON.stringify([...userPermisos].sort()) !== JSON.stringify([...savedPermisos].sort());

  const filteredUsuarios = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return !q ? usuarios : usuarios.filter(u =>
      u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [usuarios, userSearch]);

  const countByRol = useMemo(() => {
    const m: Record<string, number> = {};
    for (const u of usuarios) m[u.rolNombre] = (m[u.rolNombre] ?? 0) + 1;
    // count admins too
    return m;
  }, [usuarios]);

  const extraGroups = useMemo(() => {
    const catalog = Array.isArray(permisosCatalog) ? permisosCatalog : [];
    const byCode = new Map<string, Permiso>();
    for (const p of catalog) { const code = getPermCode(p); if (code) byCode.set(code, p); }
    return PG
      .filter(g =>
        (!esDealer || !DEALER_HIDDEN.includes(g.label)) &&
        (esDealer || !SERVICIOS_ONLY.includes(g.label))
      )
      .map(g => {
        const perms = g.codes.map((code, i) =>
          byCode.get(code) ?? ({ id: -(i + 1), nombre: code } as Permiso)
        );
        return { ...g, perms };
      })
      .filter(g => g.perms.length > 0);
  }, [permisosCatalog, esDealer]);

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loadingInit) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, border: `3px solid ${T.primarySoft}`, borderTopColor: T.primary, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ fontSize: '.84rem', color: T.text3 }}>Cargando permisos…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const rolKeys = Object.keys(ROLES_META);

  return (
    <div style={{ paddingBottom: 110 }}>
      <style>{`@keyframes fx-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`}</style>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0, color: T.text }}>Roles y permisos</h1>
          <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>Elige qué puede hacer cada empleado en cada módulo</p>
        </div>
        {/* Role card buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {rolKeys.map(k => {
            const meta = ROLES_META[k];
            const n = countByRol[k] ?? (k === 'ADMIN' ? 1 : 0);
            return (
              <button
                key={k}
                type="button"
                onClick={() => openRoleModal(k)}
                title="Ver permisos del rol"
                style={{ display: 'flex', alignItems: 'center', gap: 9, height: 40, padding: '0 12px 0 6px', fontFamily: 'Inter,sans-serif', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: T.shadow, transition: 'border-color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = T.primaryLine)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = T.line)}
              >
                <span style={{ width: 28, height: 28, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 8, background: `${meta.tone}22`, color: meta.tone }}>
                  <IcoSvg path={meta.icon} size={14} />
                </span>
                <span style={{ fontSize: '.84rem', fontWeight: 650, color: T.text }}>{meta.label}</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', fontWeight: 600, color: T.text3 }}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Two-panel layout ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14 }}>

        {/* Left: Employee list */}
        <div style={{ flex: '0 1 310px', minWidth: 250, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ padding: 12, borderBottom: `1px solid ${T.lineSoft}` }}>
            <div style={{ position: 'relative' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Buscar empleado…"
                style={{ width: '100%', height: 38, padding: '0 12px 0 35px', fontFamily: 'Inter,sans-serif', fontSize: '.85rem', color: T.text, background: T.surface2, border: '1px solid transparent', borderRadius: 10, outline: 'none' }}
                onFocus={e => { e.target.style.background = T.surface; e.target.style.borderColor = T.primary; e.target.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
                onBlur={e => { e.target.style.background = T.surface2; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* List */}
          <div style={{ display: 'grid', gap: 2, padding: 6, maxHeight: 640, overflowY: 'auto' }}>
            {filteredUsuarios.length === 0 ? (
              <div style={{ padding: '26px 12px', textAlign: 'center', fontSize: '.82rem', color: T.text3 }}>Ningún empleado coincide.</div>
            ) : filteredUsuarios.map(u => {
              const on = u.id === selectedUserId;
              const meta = ROLES_META[u.rolNombre];
              const extras = u.id === selectedUserId ? userPermisos.filter(p => !basePermisos.includes(p)).length : 0;
              const sub = (meta?.label ?? u.rolNombre) + (extras > 0 ? ` · +${extras} adicionales` : '') + (!u.activo ? ' · Inactivo' : '');
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUser(u)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px',
                    fontFamily: 'Inter,sans-serif', borderRadius: 10, cursor: 'pointer', transition: 'background .14s', textAlign: 'left',
                    background: on ? T.primarySoft : 'transparent',
                    border: `1px solid ${on ? T.primaryLine : 'transparent'}`,
                  }}
                >
                  <span style={avatarStyle(u.email, 34, !u.activo)}>{ini(u.nombre)}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', fontSize: '.86rem', fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.nombre}</span>
                    <span style={{ display: 'block', fontSize: '.74rem', color: T.text3, marginTop: 2 }}>{sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Permissions panel */}
        <div style={{ flex: '1 1 560px', minWidth: 0, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, overflow: 'hidden' }}>

          {/* Empty state */}
          {!selectedUser && (
            <div style={{ padding: '70px 24px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}>
                <IcoSvg path={IC.users} size={24} />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14, color: T.text }}>Selecciona un empleado</div>
              <p style={{ fontSize: '.86rem', color: T.text3, margin: '7px auto 0', maxWidth: 360, lineHeight: 1.55 }}>
                Haz clic en cualquier empleado de la lista para ver y personalizar sus permisos de acceso.
              </p>
            </div>
          )}

          {/* Loading */}
          {selectedUser && loadingPermisos && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 24px' }}>
              <div style={{ width: 24, height: 24, border: `3px solid ${T.primarySoft}`, borderTopColor: T.primary, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          )}

          {/* Panel content */}
          {selectedUser && !loadingPermisos && (() => {
            const meta = ROLES_META[selectedUser.rolNombre];
            const tone = meta?.tone ?? T.text3;
            const isAdmin = selectedUser.rolNombre === 'ADMIN';

            return (
              <>
                {/* User header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '16px 20px', borderBottom: `1px solid ${T.lineSoft}` }}>
                  <span style={avatarStyle(selectedUser.email, 44, !selectedUser.activo)}>{ini(selectedUser.nombre)}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1.02rem', fontWeight: 700, letterSpacing: '-.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: T.text }}>{selectedUser.nombre}</div>
                    <div style={{ fontSize: '.78rem', color: T.text3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedUser.email}</div>
                  </div>
                  {/* Rol pill */}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.75rem', fontWeight: 650, padding: '3px 10px 3px 8px', borderRadius: 20, whiteSpace: 'nowrap', color: tone, background: `${tone}22` }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: tone, display: 'inline-block' }} />
                    {meta?.label ?? selectedUser.rolNombre}
                  </span>
                </div>

                {/* Admin: acceso total */}
                {isAdmin && (
                  <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.primarySoft, color: T.primary }}>
                      <IcoSvg path={IC.shield} size={24} />
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14, color: T.text }}>Acceso total a todos los módulos</div>
                    <p style={{ fontSize: '.86rem', lineHeight: 1.55, color: T.text3, margin: '7px auto 0', maxWidth: 400 }}>Los administradores no tienen restricciones. No hay nada que configurar.</p>
                  </div>
                )}

                {/* Non-admin: module rows */}
                {!isAdmin && (
                  <>
                    {extraGroups.map(group => {
                      const codes = group.codes;
                      const activeCodes = codes.filter(c => userPermisos.includes(c));
                      const isOpen = !!expandedGroups[group.label];
                      const pct = codes.length ? Math.round(activeCodes.length / codes.length * 100) : 0;
                      const hasExtras = codes.some(c => !basePermisos.includes(c) && userPermisos.includes(c));
                      const barColor = hasExtras ? T.primary : T.ok;
                      const allActive = activeCodes.length === codes.length;
                      const noneActive = activeCodes.length === 0;
                      const hint = (() => {
                        if (noneActive) return 'Sin acceso';
                        const inc = codes.filter(c => userPermisos.includes(c)).map(c => PERM_LABELS[c]?.label ?? c);
                        const pre = activeCodes.length < codes.length ? 'Parcial: ' : '';
                        return pre + inc.slice(0, 3).join(', ') + (inc.length > 3 ? ` y ${inc.length - 3} más` : '');
                      })();

                      return (
                        <div key={group.label}>
                          {/* Module row header */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: 14, padding: '11px 20px', borderBottom: `1px solid ${T.lineSoft}`, background: isOpen ? T.surface3 : 'transparent' }}>
                            <button
                              type="button"
                              onClick={() => setExpandedGroups(prev => ({ ...prev, [group.label]: !isOpen }))}
                              style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, padding: 0, fontFamily: 'Inter,sans-serif', textAlign: 'left', color: T.text, background: 'transparent', border: 0, cursor: 'pointer' }}
                            >
                              <span style={{ display: 'grid', flexShrink: 0, color: T.text3, transition: 'transform .16s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
                              </span>
                              <span style={tileStyle(group.color, 32)}>
                                <IcoSvg path={group.icon} size={15} />
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <span style={{ fontSize: '.88rem', fontWeight: 600, color: T.text }}>{group.label}</span>
                                <div style={{ fontSize: '.74rem', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 420, color: noneActive ? T.text3 : T.text2 }}>{hint}</div>
                              </div>
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 64, height: 5, borderRadius: 5, background: T.surface2, overflow: 'hidden', display: 'block' }}>
                                <span style={{ display: 'block', height: '100%', borderRadius: 5, background: barColor, width: `${pct}%` }} />
                              </span>
                              <span style={{ minWidth: 34, textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.76rem', fontWeight: 600, color: allActive ? T.ok : noneActive ? T.text3 : T.text2 }}>
                                {activeCodes.length}/{codes.length}
                              </span>
                            </div>
                          </div>

                          {/* Expanded: individual permissions */}
                          {isOpen && (
                            <div style={{ padding: '4px 20px 12px 63px', background: T.surface3, borderBottom: `1px solid ${T.lineSoft}`, animation: 'fx-in .16s ease' }}>
                              {group.perms.map(perm => {
                                const code = getPermCode(perm);
                                const isBase = basePermisos.includes(code);
                                const isOn = userPermisos.includes(code);
                                const isNew = !isBase && isOn !== (savedPermisos.includes(code));
                                const info = PERM_LABELS[code];
                                return (
                                  <button
                                    key={code}
                                    type="button"
                                    onClick={() => !isBase && togglePermiso(code)}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', fontFamily: 'Inter,sans-serif', textAlign: 'left', background: 'transparent', border: 0, borderTop: `1px solid ${T.lineSoft}`, cursor: isBase ? 'default' : 'pointer' }}
                                  >
                                    <span style={{ minWidth: 0, flex: 1 }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '.85rem', fontWeight: 600, color: T.text }}>{info?.label ?? code}</span>
                                        {isBase && (
                                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.64rem', fontWeight: 700, letterSpacing: '.03em', color: T.text3, background: T.surface2, padding: '1px 6px', borderRadius: 5 }}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                            ROL
                                          </span>
                                        )}
                                        {isNew && (
                                          <span style={{ fontSize: '.64rem', fontWeight: 700, letterSpacing: '.03em', color: isOn ? T.warn : T.bad, background: isOn ? T.warnSoft : T.badSoft, padding: '1px 6px', borderRadius: 5 }}>
                                            {isOn ? 'NUEVO' : 'SE QUITA'}
                                          </span>
                                        )}
                                      </span>
                                      {info?.descripcion && (
                                        <span style={{ display: 'block', fontSize: '.74rem', lineHeight: 1.4, color: T.text3, marginTop: 2 }}>{info.descripcion}</span>
                                      )}
                                    </span>
                                    <ToggleSwitch on={isOn} disabled={isBase} onChange={() => togglePermiso(code)} />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Legend */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: '12px 20px', fontSize: '.75rem', color: T.text3 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Incluido en su rol
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: T.primary }} />
                        Acceso adicional
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.warn }} />
                        Sin guardar
                      </span>
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Floating save bar ── */}
      {selectedUser && hasUnsaved && createPortal(
        <div style={{ position: 'fixed', left: '50%', bottom: 22, zIndex: 60, transform: 'translateX(-50%)', width: 'max-content', maxWidth: 'calc(100vw - 32px)', display: 'flex', alignItems: 'center', gap: 14, padding: '10px 10px 10px 16px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: '0 22px 50px -18px rgba(0,0,0,.5)', animation: 'fx-in .2s ease' }}>
          <span style={{ width: 8, height: 8, flexShrink: 0, borderRadius: '50%', background: T.warn }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '.86rem', fontWeight: 650, color: T.text }}>Cambios sin guardar</div>
            <div style={{ fontSize: '.74rem', color: T.text3, marginTop: 1 }}>{selectedUser.nombre.split(' ')[0]}</div>
          </div>
          <button
            type="button"
            onClick={handleDiscard}
            style={{ height: 38, padding: '0 14px', fontFamily: 'Inter,sans-serif', fontSize: '.84rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.84rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', boxShadow: `0 6px 16px -8px ${T.primary}`, opacity: saving ? 0.7 : 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>,
        document.body
      )}

      {/* ── Role detail modal ── */}
      {modalRol && (
        <RoleModal
          rolKey={modalRol}
          basePerms={modalRolBasePerms}
          onClose={() => setModalRol(null)}
        />
      )}
    </div>
  );
}
