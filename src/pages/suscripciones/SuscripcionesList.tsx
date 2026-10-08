import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { suscripcionService } from '../../services/suscripcion.service';
import { useAuthStore } from '../../store/authStore';
import type { SuscripcionDTO } from '../../types';
import { notify } from '../../lib/notify';
import { usePermissions } from '../../hooks/usePermissions';

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

// ─── SVG Icons ────────────────────────────────────────────────────────────────
type IcoProps = { size?: number };

function IcZap({ size = 16 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M13 2 3 14h9l-1 8 10-12h-9Z" /></svg>;
}
function IcBuilding({ size = 16 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" /></svg>;
}
function IcOkCircle({ size = 16 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg>;
}
function IcClock({ size = 16 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}
function IcXCircle({ size = 16 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></svg>;
}
function IcTriangle({ size = 16 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>;
}
function IcCalendar({ size = 16 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>;
}
function IcCard({ size = 16 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>;
}
function IcReceipt({ size = 16 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 2 2V2l-2 2-3-2-3 2-3-2-3 2-3-2Z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
}
function IcCheck({ size = 11 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m5 12 5 5L20 7" /></svg>;
}
function IcShield({ size = 14 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z" /></svg>;
}
function IcX({ size = 16 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M18 6 6 18M6 6l12 12" /></svg>;
}
function IcArrowDown({ size = 18 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" /><path d="M8 12l4 4 4-4M12 8v8" /></svg>;
}
function IcLock({ size = 16 }: IcoProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}

// ─── Overlay (portal) ─────────────────────────────────────────────────────────
function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ maxHeight: 'calc(100vh - 40px)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ─── Estado config ─────────────────────────────────────────────────────────────
const ESTADO_CFG: Record<string, { label: string; color: string | null; icon: React.ReactNode }> = {
  ACTIVA:               { label: 'Activa',             color: T.ok,      icon: <IcOkCircle size={13} /> },
  TRIAL:                { label: 'Prueba gratuita',    color: T.primary, icon: <IcCalendar size={13} /> },
  CANCELACION_PENDIENTE:{ label: 'Cancela al período', color: T.warn,    icon: <IcClock size={13} /> },
  CANCELADA:            { label: 'Cancelada',          color: null,      icon: <IcXCircle size={13} /> },
  SUSPENDIDA:           { label: 'Suspendida',         color: T.bad,     icon: <IcTriangle size={13} /> },
  PENDIENTE:            { label: 'Trial vencido',      color: T.warn,    icon: <IcTriangle size={13} /> },
  PAGO_PROCESO:         { label: 'Pago en proceso',    color: T.warn,    icon: <IcClock size={13} /> },
};

// ─── Feature lists ────────────────────────────────────────────────────────────
const F_BASICO = [
  'Punto de Venta (POS) con caja integrada',
  'Inventario en tiempo real con alertas de stock',
  'Control de lotes y fechas de vencimiento',
  'Órdenes de compra y recepciones',
  'Devoluciones y notas de crédito',
  'Facturación electrónica SUNAT',
  'Reportes + exportación a Excel y PDF',
  'Roles y permisos (hasta 5 usuarios)',
  'Soporte por WhatsApp en español',
];
const F_PRO = [
  'Todo lo incluido en el plan Básico',
  'Hasta 5 sucursales por cuenta',
  'Stock independiente por sucursal',
  'Reportes consolidados multi-local',
  'Selector de sucursal en POS y módulos',
  'Hasta 15 usuarios y 5 000 productos',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESC = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function fmtCorto(fecha?: string | null): string {
  if (!fecha) return '—';
  try {
    const d = new Date(fecha);
    return `${d.getDate()} ${MESC[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return fecha; }
}
function fmtLarga(fecha?: string | null): string {
  if (!fecha) return '—';
  try {
    const d = new Date(fecha);
    return `${d.getDate()} de ${MES[d.getMonth()]} de ${d.getFullYear()}`;
  } catch { return fecha!; }
}

// ─── Badge inline styles ──────────────────────────────────────────────────────
function estadoBadgeStyle(color: string | null): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 12px',
    fontSize: '.78rem', fontWeight: 650, borderRadius: 20, whiteSpace: 'nowrap',
    color: color ?? T.text2,
    background: color ? `${color}22` : T.surface2,
  };
}

// ─── Plan card component ──────────────────────────────────────────────────────
interface PlanCardProps {
  esPro: boolean;
  esActual: boolean;
  puedeUpgrade: boolean;
  puedeDowngrade: boolean;
  onUpgrade: () => void;
  onDowngrade: () => void;
}
function PlanCard({ esPro, esActual, puedeUpgrade, puedeDowngrade, onUpgrade, onDowngrade }: PlanCardProps) {
  const c = esPro ? T.primary : T.ok;
  const cSoft = esPro ? T.primarySoft : T.okSoft;
  const features = esPro ? F_PRO : F_BASICO;
  const hayCta = !esActual && (esPro ? puedeUpgrade : puedeDowngrade);
  const box: React.CSSProperties = {
    position: 'relative', display: 'flex', flexDirection: 'column',
    padding: '22px 22px 20px', borderRadius: 14,
    boxShadow: T.shadow, background: T.surface,
    border: esActual ? `1.5px solid ${T.primary}` : `1px solid ${T.line}`,
  };
  return (
    <div style={box}>
      {esActual && (
        <span style={{ position: 'absolute', top: -11, left: 20, display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 10px', fontSize: '.7rem', fontWeight: 700, color: '#fff', background: T.primary, borderRadius: 20 }}>
          <IcCheck size={11} />Tu plan
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: cSoft, color: c }}>
          {esPro ? <IcBuilding size={17} /> : <IcZap size={17} />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{esPro ? 'Plan Pro' : 'Plan Básico'}</div>
          <div style={{ fontSize: '.76rem', color: T.text3, marginTop: 2 }}>{esPro ? 'Para negocios con varios locales' : 'Todo para gestionar un solo local'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 16 }}>
        <span style={{ fontSize: '.95rem', fontWeight: 600, color: T.text3 }}>S/</span>
        <span style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-.035em', fontVariantNumeric: 'tabular-nums' }}>{esPro ? '169,00' : '89,00'}</span>
        <span style={{ fontSize: '.84rem', color: T.text3 }}>/ mes</span>
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.72rem', color: T.text3, marginTop: 3 }}>
        {esPro ? 'S/ 143,22 + IGV S/ 25,78' : 'S/ 75,42 + IGV S/ 13,58'}
      </div>
      <div style={{ height: 1, background: T.lineSoft, margin: '16px 0' }} />
      <div style={{ display: 'grid', gap: 9 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: '.82rem', lineHeight: 1.4, color: T.text2 }}>
            <span style={{ width: 18, height: 18, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', background: cSoft, color: c }}>
              <IcCheck size={11} />
            </span>
            <span style={esPro && i === 0 ? { fontWeight: 650, color: T.text } : undefined}>{f}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 18 }}>
        {hayCta ? (
          <button
            type="button"
            onClick={esPro ? onUpgrade : onDowngrade}
            style={{
              width: '100%', height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'Inter, sans-serif', fontSize: '.88rem', fontWeight: 650, borderRadius: 10, cursor: 'pointer',
              ...(esPro
                ? { color: '#fff', background: T.primary, border: 0, boxShadow: `0 8px 20px -10px ${T.primary}` }
                : { color: T.warn, background: T.surface, border: `1px solid ${T.warnLine}` }),
            }}
          >
            {esPro ? 'Mejorar a Plan Pro' : 'Cambiar a Básico'}
          </button>
        ) : esActual ? (
          <div style={{ height: 42, display: 'grid', placeItems: 'center', fontSize: '.82rem', fontWeight: 600, color: T.text3, background: T.surface2, borderRadius: 10 }}>
            Plan actual
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Usage bar ────────────────────────────────────────────────────────────────
function UsageBar({ label, usado, limite, esPro }: { label: string; usado: number | null; limite: number; esPro: boolean }) {
  if (usado === null) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: '.85rem', fontWeight: 600 }}>{label}</span>
          <span style={{ fontSize: '.82rem', color: T.text3, fontVariantNumeric: 'tabular-nums' }}>
            hasta {limite.toLocaleString('es-PE')}
          </span>
        </div>
        <div style={{ height: 6, marginTop: 7, borderRadius: 6, background: T.surface2 }} />
        <div style={{ fontSize: '.72rem', marginTop: 5, color: T.text3 }}>Límite del plan</div>
      </div>
    );
  }
  const p = usado / limite;
  const tc = p >= 1 ? T.bad : p >= 0.8 ? T.warn : T.primary;
  const pct = Math.max(3, Math.min(100, Math.round(p * 100)));
  const pie = p >= 1
    ? 'Límite alcanzado' + (!esPro ? ' · el Plan Pro amplía este límite' : '')
    : p >= 0.8
    ? 'Cerca del límite'
    : `Quedan ${(limite - usado).toLocaleString('es-PE')}`;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: '.85rem', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '.82rem', fontVariantNumeric: 'tabular-nums' }}>
          <strong style={{ color: p >= 0.8 ? tc : T.text }}>{usado.toLocaleString('es-PE')}</strong>
          <span style={{ color: T.text3 }}> / {limite.toLocaleString('es-PE')}</span>
        </span>
      </div>
      <div style={{ height: 6, marginTop: 7, borderRadius: 6, background: T.surface2, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 6, background: tc, width: `${pct}%` }} />
      </div>
      <div style={{ fontSize: '.72rem', marginTop: 5, color: p >= 0.8 ? tc : T.text3 }}>{pie}</div>
    </div>
  );
}

// ─── Upgrade modal ────────────────────────────────────────────────────────────
function UpgradeModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const upItems = ['Dashboard y métricas', 'Ventas e historial', 'Gastos registrados', 'Inventario y stock', 'Comprobantes emitidos', 'Certificados'];
  return (
    <Overlay onClose={onClose}>
      <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', animation: 'sus-in .2s ease', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: T.primarySoft, color: T.primary }}>
            <IcZap size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>Antes de continuar al Plan Pro</h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>S/ 169,00 / mes · hasta 5 sucursales</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
            <IcX size={16} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', padding: '18px 22px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 12, background: T.primarySoft, fontSize: '.84rem', lineHeight: 1.5, color: T.text2 }}>
            <span style={{ display: 'grid', color: T.primary, marginTop: 1 }}>
              <IcBuilding size={16} />
            </span>
            <span>Al activar el Plan Pro se creará automáticamente tu <strong style={{ color: T.text }}>Sucursal Principal</strong>. Todo lo que registraste hasta ahora quedará asociado a ella:</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6, marginTop: 12 }}>
            {upItems.map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 9, background: T.surface3, border: `1px solid ${T.lineSoft}`, fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>
                <span style={{ display: 'grid', color: T.ok }}><IcCheck size={13} /></span>{it}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '.78rem', lineHeight: 1.55, color: T.text3, margin: '14px 0 0' }}>
            Podrás cambiar el nombre de la Sucursal Principal cuando quieras desde <strong style={{ color: T.text2 }}>Sucursales</strong>, y agregar hasta 4 locales adicionales.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}` }}>
            <IcZap size={15} />Continuar al checkout
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Downgrade modal ──────────────────────────────────────────────────────────
function DowngradeModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', animation: 'sus-in .2s ease', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: T.warnSoft, color: T.warn }}>
            <IcArrowDown size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>Cambiar a Plan Básico</h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>S/ 89,00 / mes · 1 sucursal</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
            <IcX size={16} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', padding: '18px 22px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 12, background: T.warnSoft, border: `1px solid ${T.warnLine}`, fontSize: '.84rem', lineHeight: 1.5, color: T.text2 }}>
            <span style={{ display: 'grid', color: T.warn, marginTop: 1 }}><IcTriangle size={16} /></span>
            <span>Se realizará un <strong style={{ color: T.text }}>cobro inmediato de S/ 89,00</strong>. Las sucursales adicionales quedarán <strong style={{ color: T.text }}>bloqueadas temporalmente</strong>: sus datos se conservan.</span>
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {[
              { color: T.ok,      icon: <IcCheck size={15} />,    text: <span>La sucursal principal <strong style={{ color: T.text }}>permanece activa</strong></span> },
              { color: T.warn,    icon: <IcLock size={15} />,     text: <span><strong style={{ color: T.text }}>Sucursales adicionales</strong> quedarán bloqueadas con sus datos intactos</span> },
              { color: T.primary, icon: <IcCard size={15} />,     text: <span>Cobro inmediato: <strong style={{ color: T.text }}>S/ 89,00</strong></span> },
              { color: T.text3,   icon: <IcReceipt size={15} />,  text: <span>Límites: 1 sucursal, 5 usuarios, 2 000 productos</span> },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '.84rem', lineHeight: 1.45, color: T.text2 }}>
                <span style={{ display: 'grid', color: row.color, marginTop: 1 }}>{row.icon}</span>
                {row.text}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '.78rem', lineHeight: 1.55, color: T.text3, margin: '14px 0 0' }}>
            Cuando vuelvas al Plan Pro, tus sucursales bloqueadas se reactivarán automáticamente con todos sus datos.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.warn, border: 0, borderRadius: 11, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${T.warn}` }}>
            <IcArrowDown size={15} />Continuar al pago
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Cancelar modal ───────────────────────────────────────────────────────────
function CancelarModal({ onClose, onConfirm, planNombre, precio, fechaCorte }: {
  onClose: () => void; onConfirm: () => void;
  planNombre: string; precio: string; fechaCorte: string;
}) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', animation: 'sus-in .2s ease', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
          <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: T.badSoft, color: T.bad }}>
            <IcXCircle size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>Cancelar suscripción</h2>
            <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>{planNombre} · S/ {precio} / mes</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
            <IcX size={16} />
          </button>
        </div>
        <div style={{ padding: '18px 22px 20px' }}>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { color: T.ok,    icon: <IcCheck size={15} />,    text: <span>Mantienes <strong style={{ color: T.text }}>acceso completo hasta el {fechaCorte}</strong>, el final del período ya pagado</span> },
              { color: T.text3, icon: <IcCard size={15} />,     text: <span>No se realizarán más cobros a tu tarjeta</span> },
              { color: T.text3, icon: <IcShield size={15} />,   text: <span>Tus datos se conservan. Puedes renovar cuando quieras</span> },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '.84rem', lineHeight: 1.45, color: T.text2 }}>
                <span style={{ display: 'grid', color: row.color, marginTop: 1 }}>{row.icon}</span>
                {row.text}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}` }}>
          <button type="button" onClick={onClose} style={{ flex: 1, height: 44, fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}>
            Mantener mi plan
          </button>
          <button type="button" onClick={onConfirm} style={{ flex: 1, height: 44, fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.bad, border: 0, borderRadius: 11, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${T.bad}` }}>
            Sí, cancelar
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SuscripcionesList() {
  const { canView, canToggleState } = usePermissions();
  const { user, setSuscripcionEstado } = useAuthStore();
  const navigate = useNavigate();

  const [suscripcion, setSuscripcion] = useState<(SuscripcionDTO & { currentPeriodEnd?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'upgrade' | 'downgrade' | 'cancelar' | null>(null);
  const [uso, setUso] = useState<{ sucursales: number; usuarios: number; productos: number } | null>(null);

  useEffect(() => { fetchSuscripcion(); }, []);

  const fetchSuscripcion = async () => {
    try {
      setLoading(true);
      const [estado, detalle, usoResult] = await Promise.allSettled([
        suscripcionService.getEstado(),
        user?.usuarioId ? suscripcionService.getMiSuscripcion(user.usuarioId) : Promise.reject(),
        suscripcionService.getUso(),
      ]);
      if (estado.status === 'rejected') { notify.fromError(null, 'Error al cargar la suscripción'); return; }
      const e = estado.value;
      if (e.estado === 'SIN_SUSCRIPCION') { setSuscripcion(null); return; }
      setSuscripcionEstado(e.estado);
      const pid = (e.planId ?? '').toUpperCase();
      const precioReal = pid.includes('PRO') ? 169 : pid.includes('BASICO') ? 89 : (e.precioMensual ?? 89);
      const d = detalle.status === 'fulfilled' ? detalle.value : null;
      setSuscripcion({
        planId: e.planId,
        precioMensual: precioReal,
        estado: e.estado,
        preapprovalId: e.preapprovalId,
        fechaProximoCobro: e.fechaProximoCobro,
        currentPeriodEnd: e.currentPeriodEnd,
        usuarioPrincipalId: user?.usuarioId ?? 0,
        tenantId: user?.tenantId ?? undefined,
        metodoPago: d?.metodoPago,
        ultimos4Digitos: d?.ultimos4Digitos,
      });
      if (usoResult.status === 'fulfilled') setUso(usoResult.value);
    } catch (err) {
      notify.fromError(err, 'Error al cargar la suscripción');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarConfirm = async () => {
    try {
      await suscripcionService.cancelarMiSuscripcion();
      notify.success('Suscripción cancelada — mantienes el acceso hasta el fin del período');
      setModal(null);
      await fetchSuscripcion();
    } catch (err) {
      notify.fromError(err, 'Error al cancelar la suscripción');
    }
  };

  // ── Acceso restringido ──
  if (!canView('SUSCRIPCIONES')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 12, color: T.text3 }}>
        <span style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 12, background: T.surface2, color: T.text3 }}><IcLock size={22} /></span>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: T.text, marginBottom: 4 }}>Acceso restringido</div>
          <div style={{ fontSize: '.85rem' }}>No tienes permisos para ver el módulo de Suscripciones.</div>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${T.lineSoft}`, borderTopColor: T.primary, borderRadius: '50%', animation: 'sus-spin 0.7s linear infinite' }} />
      </div>
    );
  }

  // ── Sin suscripción ──
  if (!suscripcion) {
    return (
      <div style={{ maxWidth: 1200 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0 }}>Mi suscripción</h1>
          <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>Gestiona tu plan y facturación</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260, gap: 12, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
          <span style={{ width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2 }}><IcCard size={22} /></span>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: T.text, marginBottom: 4 }}>Sin suscripción activa</div>
            <div style={{ fontSize: '.85rem', color: T.text3, maxWidth: 360 }}>No tienes ninguna suscripción registrada. Usa el botón «Activar suscripción» del banner superior para elegir un plan.</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Derived state ──
  const estado = suscripcion.estado ?? 'SIN_SUSCRIPCION';
  const esActiva             = estado === 'ACTIVA';
  const esTrial              = estado === 'TRIAL';
  const esPendiente          = estado === 'PENDIENTE' || estado === 'PAGO_PROCESO';
  const esCancP              = estado === 'CANCELACION_PENDIENTE';
  const esSusp               = estado === 'SUSPENDIDA';
  const esPro                = (suscripcion.planId ?? '').toUpperCase() === 'PRO';
  const puedeUpgrade         = !esPro && (esActiva || esTrial);
  const puedeDowngrade       = esPro && !['CANCELADA', 'CANCELACION_PENDIENTE'].includes(estado);
  const hayPrimario          = esTrial || esPendiente || esCancP || esSusp || estado === 'CANCELADA';
  const primarioLabel        = esTrial ? 'Suscribirme ahora' : esPendiente ? 'Completar pago' : esCancP ? 'Renovar suscripción' : 'Reactivar suscripción';

  const currentPeriodEndRaw  = (suscripcion as SuscripcionDTO & { currentPeriodEnd?: string }).currentPeriodEnd;
  const fechaCorte           = fmtLarga(currentPeriodEndRaw ?? suscripcion.fechaProximoCobro);

  const diasTrial = (() => {
    if (!esTrial || !suscripcion.fechaProximoCobro) return null;
    const diff = new Date(suscripcion.fechaProximoCobro).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  })();

  const fechaLabel = esTrial ? 'Fin de la prueba' : esCancP ? 'Acceso hasta' : estado === 'CANCELADA' ? 'Cancelada el' : 'Próximo cobro';
  const fechaValor = fmtCorto(estado === 'CANCELADA' ? currentPeriodEndRaw : suscripcion.fechaProximoCobro);
  const referencia = suscripcion.preapprovalId ?? '—';
  const planNombre = esPro ? 'Plan Pro' : 'Plan Básico';
  const precio     = esPro ? '169,00' : '89,00';
  // Tarjeta
  const metodo   = suscripcion.metodoPago ?? '';
  const ultimos4 = suscripcion.ultimos4Digitos ?? null;

  // Normaliza el nombre del brand para mostrar en el badge (máx 4 chars legibles)
  const brandLabel = (() => {
    const m = metodo.toLowerCase();
    if (m.includes('visa'))       return 'VISA';
    if (m.includes('master'))     return 'MC';
    if (m.includes('amex') || m.includes('american')) return 'AMEX';
    if (m.includes('diners'))     return 'DINE';
    if (m.includes('jcb'))        return 'JCB';
    if (metodo.length > 0)        return metodo.toUpperCase().slice(0, 4);
    return 'CARD';
  })();

  const E = ESTADO_CFG[estado] ?? ESTADO_CFG['ACTIVA'];

  // Alert box config
  const alertas: Record<string, { titulo: string; texto: string; color: string | null }> = {
    TRIAL:                { titulo: `Período de prueba · ${diasTrial ?? '—'} días restantes`, texto: 'Al vencer deberás suscribirte para mantener el acceso al sistema. No se cobra nada hasta entonces.', color: T.primary },
    SUSPENDIDA:           { titulo: 'Suscripción suspendida', texto: 'El último cobro falló. Actualiza tu tarjeta o reactiva para recuperar el acceso completo.', color: T.bad },
    PENDIENTE:            { titulo: 'Tu período de prueba venció', texto: 'Activa tu suscripción para seguir usando el sistema.', color: T.warn },
    PAGO_PROCESO:         { titulo: 'Tu pago está siendo procesado', texto: 'Espera la confirmación para que tu suscripción se active.', color: T.warn },
    CANCELACION_PENDIENTE:{ titulo: 'Cancelación programada', texto: `Mantienes acceso completo hasta el ${fechaCorte}. Después deberás renovar tu suscripción para seguir usando el sistema.`, color: T.warn },
    CANCELADA:            { titulo: 'Tu suscripción está cancelada', texto: 'Puedes volver a suscribirte cuando quieras. Tus datos se conservan.', color: null },
  };
  const alerta = alertas[estado];

  const alertaBoxStyle: React.CSSProperties = alerta
    ? {
      display: 'flex', alignItems: 'flex-start', gap: 11, margin: '16px 22px 0', padding: '13px 15px', borderRadius: 12,
      color: alerta.color ?? T.text3,
      background: alerta.color ? `${alerta.color}18` : T.surface2,
      border: `1px solid ${alerta.color === T.warn ? T.warnLine : T.line}`,
    }
    : {};

  // Uso del plan — datos reales del endpoint /suscripciones/uso
  const usage: { label: string; usado: number | null; limite: number }[] = [
    { label: 'Sucursales', usado: uso?.sucursales ?? null, limite: esPro ? 5 : 1 },
    { label: 'Usuarios',   usado: uso?.usuarios   ?? null, limite: esPro ? 15 : 5 },
    { label: 'Productos',  usado: uso?.productos  ?? null, limite: esPro ? 5000 : 2000 },
  ];

  return (
    <>
      <style>{`
        @keyframes sus-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes sus-spin { to { transform: rotate(360deg); } }
        @media (max-width: 1100px) { .sus-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 620px) { .sus-planes { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={{ maxWidth: 1200 }}>
        {/* Header */}
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0 }}>Mi suscripción</h1>
          <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>Gestiona tu plan y facturación</p>
        </div>

        {/* 2-col grid: plan card + uso */}
        <div className="sus-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)', gap: 14, marginTop: 20, alignItems: 'start' }}>

          {/* ── Plan card ── */}
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, padding: '20px 22px' }}>
              <span style={{ width: 50, height: 50, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 14, background: T.primarySoft, color: T.primary }}>
                {esPro ? <IcBuilding size={22} /> : <IcZap size={22} />}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>Plan actual</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-.025em' }}>{planNombre}</span>
                  <span style={{ fontSize: '.92rem', color: T.text2, fontVariantNumeric: 'tabular-nums' }}>S/ {precio} / mes</span>
                </div>
              </div>
              <span style={estadoBadgeStyle(E.color)}>
                {E.icon}{E.label}
              </span>
            </div>

            {/* Trial bar */}
            {esTrial && diasTrial !== null && (
              <div style={{ padding: '0 22px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, fontSize: '.8rem' }}>
                  <span style={{ fontWeight: 600, color: T.text2 }}>Prueba gratuita</span>
                  <span style={{ fontWeight: 700, color: T.primary }}>{diasTrial} de 14 días restantes</span>
                </div>
                <div style={{ height: 6, marginTop: 7, borderRadius: 6, background: T.surface2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 6, background: T.primary, width: `${Math.round((14 - diasTrial) / 14 * 100)}%` }} />
                </div>
              </div>
            )}

            {/* 3-cell meta row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 1, background: T.lineSoft, borderTop: `1px solid ${T.lineSoft}`, borderBottom: `1px solid ${T.lineSoft}` }}>
              <div style={{ padding: '14px 22px', background: T.surface }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.74rem', color: T.text3, whiteSpace: 'nowrap' }}>
                  <IcCalendar size={13} />{fechaLabel}
                </div>
                <div style={{ fontSize: '.95rem', fontWeight: 650, marginTop: 5 }}>{fechaValor}</div>
              </div>
              <div style={{ padding: '14px 22px', background: T.surface }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.74rem', color: T.text3, whiteSpace: 'nowrap' }}>
                  <IcCard size={13} />Método de pago
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                  {ultimos4 ? (
                    <>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.66rem', fontWeight: 700, padding: '2px 6px', borderRadius: 5, color: '#fff', background: '#1a1f71' }}>{brandLabel}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.88rem', fontWeight: 600 }}>•••• {ultimos4}</span>
                    </>
                  ) : (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.88rem', fontWeight: 600, color: T.text3 }}>—</span>
                  )}
                </div>
              </div>
              <div style={{ padding: '14px 22px', background: T.surface }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.74rem', color: T.text3, whiteSpace: 'nowrap' }}>
                  <IcReceipt size={13} />Referencia
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.78rem', fontWeight: 600, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {referencia}
                </div>
              </div>
            </div>

            {/* Alert box */}
            {alerta && (
              <div style={alertaBoxStyle}>
                <span style={{ display: 'grid', marginTop: 1 }}>
                  {alerta.color === T.bad ? <IcTriangle size={17} />
                    : alerta.color === T.warn ? <IcTriangle size={17} />
                    : alerta.color === T.primary ? <IcCalendar size={17} />
                    : <IcXCircle size={17} />}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '.88rem', fontWeight: 650, color: T.text }}>{alerta.titulo}</div>
                  <div style={{ fontSize: '.8rem', lineHeight: 1.5, color: T.text2, marginTop: 3 }}>{alerta.texto}</div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, padding: '16px 22px 20px' }}>
              {hayPrimario && (
                <button type="button" onClick={() => navigate(`/checkout/culqi?plan=${esPro ? 'PRO' : 'BASICO'}`)}
                  style={{ flex: '1 1 200px', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}` }}>
                  <IcCard size={16} />{primarioLabel}
                </button>
              )}
              {(esActiva || esSusp) && (
                <button type="button" onClick={() => navigate('/checkout/culqi?mode=cambiar-tarjeta')}
                  style={{ flex: '1 1 160px', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter, sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}>
                  <IcCard size={16} />Cambiar tarjeta
                </button>
              )}
              {esActiva && canToggleState('SUSCRIPCIONES') && (
                <button type="button" onClick={() => setModal('cancelar')}
                  style={{ flex: '0 1 auto', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 16px', fontFamily: 'Inter, sans-serif', fontSize: '.88rem', fontWeight: 600, color: T.bad, background: 'transparent', border: '1px solid transparent', borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <IcXCircle size={16} />Cancelar suscripción
                </button>
              )}
            </div>
          </div>

          {/* ── Uso del plan ── */}
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow, padding: '18px 20px' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>Uso del plan</div>
            <div style={{ display: 'grid', gap: 16, marginTop: 14 }}>
              {usage.map(u => (
                <UsageBar key={u.label} label={u.label} usado={u.usado} limite={u.limite} esPro={esPro} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${T.lineSoft}`, fontSize: '.76rem', lineHeight: 1.45, color: T.text3 }}>
              <span style={{ display: 'grid', color: T.ok }}><IcShield size={14} /></span>
              Pago procesado por Culqi. Tus datos de tarjeta nunca se guardan en nuestros servidores.
            </div>
          </div>
        </div>

        {/* ── Planes disponibles ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, margin: '30px 0 14px' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>Planes disponibles</span>
          <span style={{ fontSize: '.78rem', color: T.text3 }}>Cobro mensual con IGV incluido · cancela cuando quieras, sin penalidad</span>
        </div>
        <div className="sus-planes" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14, alignItems: 'stretch' }}>
          <PlanCard esPro={false} esActual={!esPro} puedeUpgrade={puedeUpgrade} puedeDowngrade={puedeDowngrade} onUpgrade={() => setModal('upgrade')} onDowngrade={() => setModal('downgrade')} />
          <PlanCard esPro={true}  esActual={esPro}  puedeUpgrade={puedeUpgrade} puedeDowngrade={puedeDowngrade} onUpgrade={() => setModal('upgrade')} onDowngrade={() => setModal('downgrade')} />
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === 'upgrade' && (
        <UpgradeModal
          onClose={() => setModal(null)}
          onConfirm={() => { setModal(null); navigate('/checkout/culqi?plan=PRO&mode=upgrade'); }}
        />
      )}
      {modal === 'downgrade' && (
        <DowngradeModal
          onClose={() => setModal(null)}
          onConfirm={() => { setModal(null); navigate('/checkout/culqi?plan=BASICO&mode=downgrade-basico'); }}
        />
      )}
      {modal === 'cancelar' && (
        <CancelarModal
          onClose={() => setModal(null)}
          onConfirm={handleCancelarConfirm}
          planNombre={planNombre}
          precio={precio}
          fechaCorte={fechaCorte}
        />
      )}
    </>
  );
}
