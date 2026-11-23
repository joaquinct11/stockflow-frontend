/**
 * F-13 — Wizard de devoluciones (5 pasos)
 * Reemplaza el campo manual "Nº Venta de origen" del flujo de movimientos.
 *
 * Pasos:
 *  1. Buscar y seleccionar la venta de origen
 *  2. Ver los ítems de esa venta con su estado de devolución
 *  3. Elegir cantidades a devolver
 *  4. Revisar trazabilidad (lote/vencimiento) — sólo informativo
 *  5. Confirmar y crear los movimientos DEVOLUCION
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { devolucionService } from '../../services/devolucion.service';
import { ventaService } from '../../services/venta.service';
import type { VentaResumenDTO, ItemDevolucionEstadoDTO } from '../../services/venta.service';
import type { CrearDevolucionDTO } from '../../types';
import { notify } from '../../lib/notify';

const T = {
  bg: '#F6F7F9', surface: '#FFFFFF', surface2: '#F1F3F6',
  text: '#0F1623', text2: '#4A5568', text3: '#8896A5',
  primary: '#4F6EF7', primarySoft: '#EEF1FE', primaryLine: '#C7D2FC',
  line: '#E4E8EF',
  ok: '#16A34A', okSoft: '#DCFCE7', okLine: '#BBF7D0',
  warn: '#D97706', warnSoft: '#FEF3C7', warnLine: '#FDE68A',
  bad: '#DC2626', badSoft: '#FEE2E2',
  shadow: '0 2px 8px -2px rgba(15,22,35,.08)',
};

const LABEL: React.CSSProperties = {
  display: 'block', marginBottom: 6, fontSize: '.8rem',
  fontWeight: 600, color: T.text2, fontFamily: 'Inter,sans-serif',
};

function FxInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style: s, ...rest } = props;
  return (
    <input
      {...rest}
      style={{
        width: '100%', height: 44, padding: '0 13px',
        fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text,
        background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10,
        outline: 'none', boxSizing: 'border-box', ...s,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
      onBlur={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

function Btn({ children, variant = 'primary', disabled, onClick, style }: {
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const bg = variant === 'primary' ? T.primary : variant === 'danger' ? T.bad : 'transparent';
  const color = variant === 'ghost' ? T.text2 : '#fff';
  const border = variant === 'ghost' ? `1px solid ${T.line}` : 'none';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 40, padding: '0 20px', borderRadius: 10, border, cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? T.surface2 : bg, color: disabled ? T.text3 : color,
        fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: '.87rem', transition: 'opacity .14s',
        opacity: disabled ? .6 : 1, ...style,
      }}
    >
      {children}
    </button>
  );
}

export interface DevolucionWizardProps {
  sucursalId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

type SeleccionItems = Record<number, number>; // detalleVentaId → cantidad a devolver

export function DevolucionWizard({ onCancel, onSuccess }: DevolucionWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<VentaResumenDTO[]>([]);
  const [venta, setVenta] = useState<VentaResumenDTO | null>(null);
  const [items, setItems] = useState<ItemDevolucionEstadoDTO[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [seleccion, setSeleccion] = useState<SeleccionItems>({});
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // — Paso 1: búsqueda con debounce —
  const buscar = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    ventaService.buscar(q.trim()).then(r => { setResults(r); setSearching(false); }).catch(() => setSearching(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, buscar]);

  // — Paso 2: cargar ítems de la venta seleccionada —
  const seleccionarVenta = async (v: VentaResumenDTO) => {
    setVenta(v);
    setLoadingItems(true);
    try {
      const data = await ventaService.getEstadoDevolucion(v.id);
      const pendientes = data.filter(i => i.cantidadPendiente > 0);
      if (pendientes.length === 0) {
        notify.warn('Esta venta ya tiene todos sus productos devueltos');
        setLoadingItems(false);
        return;
      }
      setItems(pendientes);
      // inicializar cantidades en 0
      const init: SeleccionItems = {};
      pendientes.forEach(i => { init[i.detalleVentaId] = 0; });
      setSeleccion(init);
      setStep(2);
    } catch (e) {
      notify.fromError(e, 'No se pudo cargar el estado de devolución de la venta');
    } finally {
      setLoadingItems(false);
    }
  };

  // — Paso 3: validar que al menos un item tiene cantidad > 0 —
  const itemsConCantidad = items.filter(i => (seleccion[i.detalleVentaId] ?? 0) > 0);

  // — Paso 5: confirmar devolución via POST /api/devoluciones —
  // El endpoint obtiene el usuarioId desde el contexto de seguridad del servidor
  // y aplica todas las reglas de negocio en una sola transacción.
  const confirmar = async () => {
    if (!venta || itemsConCantidad.length === 0) return;
    setSubmitting(true);
    try {
      const dto: CrearDevolucionDTO = {
        ventaId: venta.id,
        motivo: motivo || 'Devolución de venta',
        reponerStock: true,
        detalles: itemsConCantidad.map(item => ({
          productoId: item.productoId,
          // Unidades de presentación — el servicio multiplica por factor internamente
          cantidadDevuelta: seleccion[item.detalleVentaId],
        })),
      };
      await devolucionService.crear(dto);
      notify.success(`Devolución registrada — ${itemsConCantidad.length} ${itemsConCantidad.length === 1 ? 'producto' : 'productos'}`);
      onSuccess();
    } catch (e) {
      notify.fromError(e, 'Error al registrar la devolución');
    } finally {
      setSubmitting(false);
    }
  };

  // — Pasos del encabezado —
  const STEPS = ['Venta', 'Ítems', 'Cantidades', 'Trazabilidad', 'Confirmar'];

  const fmtFecha = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Indicador de pasos */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {STEPS.map((label, idx) => {
          const n = idx + 1;
          const done = step > n;
          const active = step === n;
          return (
            <React.Fragment key={n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: done ? T.ok : active ? T.primary : T.surface2,
                  color: done || active ? '#fff' : T.text3,
                  display: 'grid', placeItems: 'center', fontSize: '.72rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {done ? '✓' : n}
                </div>
                <span style={{ fontSize: '.75rem', color: active ? T.primary : done ? T.ok : T.text3, fontWeight: active ? 700 : 400 }}>
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: T.line, minWidth: 8 }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Paso 1: buscar venta ── */}
      {step === 1 && (
        <div>
          <label style={LABEL}>Buscar venta por número, nombre o documento del cliente</label>
          <FxInput
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ej: 1023, Ana López, 20100130492"
          />
          {searching && <p style={{ marginTop: 10, color: T.text3, fontSize: '.85rem' }}>Buscando…</p>}
          {!searching && results.length === 0 && query.trim() && (
            <p style={{ marginTop: 10, color: T.text3, fontSize: '.85rem' }}>Sin resultados para «{query}»</p>
          )}
          {results.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.map(v => (
                <button
                  key={v.id}
                  onClick={() => seleccionarVenta(v)}
                  disabled={loadingItems}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${T.line}`,
                    background: T.surface, cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color .14s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = T.primary)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = T.line)}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: T.text, fontSize: '.92rem' }}>Venta #{v.id}</span>
                    <span style={{ marginLeft: 8, color: T.text2, fontSize: '.82rem' }}>{fmtFecha(v.createdAt)}</span>
                    <div style={{ color: T.text2, fontSize: '.82rem', marginTop: 2 }}>
                      {v.clienteNombre}{v.clienteDocumento ? ` — ${v.clienteDocumento}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: T.text, fontSize: '.92rem' }}>S/ {Number(v.total).toFixed(2)}</div>
                    <div style={{
                      marginTop: 2, fontSize: '.72rem', fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                      background: v.estado === 'COMPLETADA' ? T.okSoft : T.warnSoft,
                      color: v.estado === 'COMPLETADA' ? T.ok : T.warn,
                    }}>
                      {v.estado}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Paso 2: ítems pendientes de devolución ── */}
      {step === 2 && venta && (
        <div>
          <div style={{ marginBottom: 12, padding: '10px 14px', background: T.primarySoft, borderRadius: 10, border: `1px solid ${T.primaryLine}` }}>
            <span style={{ fontWeight: 700, color: T.primary }}>Venta #{venta.id}</span>
            <span style={{ color: T.text2, marginLeft: 8, fontSize: '.86rem' }}>
              {fmtFecha(venta.createdAt)} · {venta.clienteNombre} · S/ {Number(venta.total).toFixed(2)}
            </span>
          </div>
          <p style={{ color: T.text2, fontSize: '.85rem', marginBottom: 12 }}>
            Estos productos tienen unidades pendientes de devolución:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => (
              <div key={item.detalleVentaId} style={{
                padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.line}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: T.text, fontSize: '.9rem' }}>{item.productoNombre}</div>
                  {item.varianteDescripcion && (
                    <div style={{ color: T.text3, fontSize: '.78rem' }}>{item.varianteDescripcion}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '.82rem', color: T.text2 }}>
                  <div>Vendido: <strong>{item.cantidadVendida}</strong></div>
                  <div>Devuelto: <strong>{item.cantidadDevuelta}</strong></div>
                  <div style={{ color: T.ok, fontWeight: 600 }}>Pendiente: {item.cantidadPendiente}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Paso 3: cantidades a devolver ── */}
      {step === 3 && venta && (
        <div>
          <div style={{ marginBottom: 12, padding: '10px 14px', background: T.primarySoft, borderRadius: 10, border: `1px solid ${T.primaryLine}` }}>
            <span style={{ fontWeight: 700, color: T.primary }}>Venta #{venta.id}</span>
            <span style={{ color: T.text2, marginLeft: 8, fontSize: '.86rem' }}>{venta.clienteNombre}</span>
          </div>
          <p style={{ color: T.text2, fontSize: '.85rem', marginBottom: 12 }}>
            Ingresa la cantidad a devolver de cada producto (máx = pendiente):
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => (
              <div key={item.detalleVentaId} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: T.text, fontSize: '.88rem' }}>{item.productoNombre}</div>
                  <div style={{ color: T.text3, fontSize: '.78rem' }}>Pendiente: {item.cantidadPendiente}</div>
                </div>
                <div style={{ width: 100 }}>
                  <FxInput
                    type="number"
                    min={0}
                    max={item.cantidadPendiente}
                    value={seleccion[item.detalleVentaId] ?? 0}
                    onChange={e => {
                      const v = Math.min(item.cantidadPendiente, Math.max(0, parseInt(e.target.value, 10) || 0));
                      setSeleccion(prev => ({ ...prev, [item.detalleVentaId]: v }));
                    }}
                    style={{ textAlign: 'center' }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={LABEL}>Motivo de devolución <span style={{ fontWeight: 400, color: T.text3 }}>(opcional)</span></label>
            <FxInput
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: producto defectuoso, cambio de talla…"
            />
          </div>
        </div>
      )}

      {/* ── Paso 4: trazabilidad ── */}
      {step === 4 && venta && (
        <div>
          <div style={{ marginBottom: 12, padding: '10px 14px', background: T.primarySoft, borderRadius: 10, border: `1px solid ${T.primaryLine}` }}>
            <span style={{ fontWeight: 700, color: T.primary }}>Venta #{venta.id}</span>
            <span style={{ color: T.text2, marginLeft: 8, fontSize: '.86rem' }}>{venta.clienteNombre}</span>
          </div>
          <p style={{ color: T.text2, fontSize: '.85rem', marginBottom: 12 }}>
            Trazabilidad de lote. El stock se repondrá al lote de origen cuando esté disponible.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itemsConCantidad.map(item => (
              <div key={item.detalleVentaId} style={{
                padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.line}`,
              }}>
                <div style={{ fontWeight: 600, color: T.text, fontSize: '.9rem', marginBottom: 4 }}>{item.productoNombre}</div>
                <div style={{ fontSize: '.82rem', color: T.text2, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>Cantidad a devolver: <strong>{seleccion[item.detalleVentaId]}</strong></span>
                  {item.stockLoteId
                    ? <span style={{ color: T.ok }}>✓ Lote #{ item.stockLoteId } recuperado automáticamente</span>
                    : <span style={{ color: T.text3 }}>Sin lote vinculado</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Paso 5: resumen y confirmación ── */}
      {step === 5 && venta && (
        <div>
          <div style={{ padding: '12px 16px', background: T.okSoft, borderRadius: 10, border: `1px solid ${T.okLine}`, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: T.ok, marginBottom: 4 }}>Resumen de devolución</div>
            <div style={{ color: T.text2, fontSize: '.86rem' }}>
              Venta #{venta.id} · {venta.clienteNombre} · {fmtFecha(venta.createdAt)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itemsConCantidad.map(item => (
              <div key={item.detalleVentaId} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.line}`,
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: T.text, fontSize: '.9rem' }}>{item.productoNombre}</div>
                  {item.varianteDescripcion && (
                    <div style={{ color: T.text3, fontSize: '.78rem' }}>{item.varianteDescripcion}</div>
                  )}
                </div>
                <div style={{ fontWeight: 700, color: T.text }}>× {seleccion[item.detalleVentaId]}</div>
              </div>
            ))}
          </div>
          {motivo && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: T.surface2, borderRadius: 8, fontSize: '.84rem', color: T.text2 }}>
              Motivo: {motivo}
            </div>
          )}
        </div>
      )}

      {/* Botonera de navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${T.line}` }}>
        <Btn variant="ghost" onClick={step === 1 ? onCancel : () => setStep((Math.max(1, step - 1)) as 1 | 2 | 3 | 4 | 5)}>
          {step === 1 ? 'Cancelar' : '← Atrás'}
        </Btn>

        {step < 5 && (
          <Btn
            disabled={
              (step === 1 && !venta) ||
              (step === 2 && items.length === 0) ||
              (step === 3 && itemsConCantidad.length === 0) ||
              loadingItems
            }
            onClick={() => setStep((Math.min(5, step + 1)) as 1 | 2 | 3 | 4 | 5)}
          >
            {step === 4 ? 'Revisar →' : 'Siguiente →'}
          </Btn>
        )}

        {step === 5 && (
          <Btn disabled={submitting || itemsConCantidad.length === 0} onClick={confirmar}>
            {submitting ? 'Registrando…' : 'Confirmar devolución'}
          </Btn>
        )}
      </div>
    </div>
  );
}
