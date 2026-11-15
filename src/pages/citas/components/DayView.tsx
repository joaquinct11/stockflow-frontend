import React, { useEffect, useRef, useState } from 'react';
import type { CitaResumenDTO, ProfesionalElegibleDTO } from '../../../services/cita.service';
import { TIPO_CFG, HORA_INICIO, HORA_FIN, PX_POR_HORA } from '../citas.constants';

const T = {
  surface:  'var(--color-surface, #ffffff)',
  surface2: 'var(--color-surface-2, #f3f4f6)',
  line:     'var(--color-border, #e5e7eb)',
  lineSoft: 'var(--color-border-soft, #f3f4f6)',
  text:     'var(--color-text, #111827)',
  text3:    'var(--color-text-3, #6b7280)',
  primary:  'var(--color-primary, #3b47ef)',
} as const;

const TOTAL_H = (HORA_FIN - HORA_INICIO) * PX_POR_HORA;

function parseMinFromISO(iso: string) {
  const t = iso.slice(11, 16);
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

interface EvtLayout {
  cita:       CitaResumenDTO;
  startMin:   number;
  endMin:     number;
  lane:       number;
  totalLanes: number;
}

function calcLayout(citas: CitaResumenDTO[]): EvtLayout[] {
  if (!citas.length) return [];
  const evts: EvtLayout[] = citas.map(c => ({
    cita: c,
    startMin: parseMinFromISO(c.fechaInicio),
    endMin:   parseMinFromISO(c.fechaFin),
    lane: 0,
    totalLanes: 1,
  })).sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const laneEnds: number[] = [];
  for (const ev of evts) {
    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] > ev.startMin) lane++;
    laneEnds[lane] = ev.endMin;
    ev.lane = lane;
  }
  for (const ev of evts) {
    ev.totalLanes = evts
      .filter(e => e.startMin < ev.endMin && ev.startMin < e.endMin)
      .reduce((mx, e) => Math.max(mx, e.lane + 1), 1);
  }
  return evts;
}

interface Props {
  citas:          CitaResumenDTO[];
  dia:            Date;
  profesionales:  ProfesionalElegibleDTO[];
  visibleProfIds: Set<number>;
  onEventClick:   (c: CitaResumenDTO) => void;
  onSlotClick:    (d: Date, hora: string, profId?: number) => void;
}

export function DayView({ citas, dia, profesionales, visibleProfIds, onEventClick, onSlotClick }: Props) {
  const nowRef = useRef<HTMLDivElement>(null);
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const isToday = (() => {
    const t = new Date();
    return dia.getFullYear() === t.getFullYear() && dia.getMonth() === t.getMonth() && dia.getDate() === t.getDate();
  })();

  const showNow = isToday && nowMin >= HORA_INICIO * 60 && nowMin <= HORA_FIN * 60;
  const nowTop  = (nowMin - HORA_INICIO * 60) / 60 * PX_POR_HORA;

  const profsVisibles = profesionales.length > 0
    ? profesionales.filter(p => visibleProfIds.size === 0 || visibleProfIds.has(p.usuarioTenantId))
    : [];

  const dateStr = (() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dia.getFullYear()}-${pad(dia.getMonth() + 1)}-${pad(dia.getDate())}`;
  })();

  const dayCitas = citas.filter(c => c.fechaInicio.slice(0, 10) === dateStr);

  function handleColClick(e: React.MouseEvent<HTMLDivElement>, profId?: number) {
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (y < 0 || y > TOTAL_H) return;
    const raw = HORA_INICIO * 60 + (y / PX_POR_HORA) * 60;
    const rounded = Math.round(raw / 15) * 15;
    const clamped = Math.max(HORA_INICIO * 60, Math.min(HORA_FIN * 60 - 30, rounded));
    const hh = Math.floor(clamped / 60), mm = clamped % 60;
    onSlotClick(dia, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, profId);
  }

  const GUTTER = 52;
  const cols = profsVisibles.length > 0 ? profsVisibles.length : 1;

  return (
    <div className="dayview-root" style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Inter,sans-serif', overflow: 'hidden' }}>
      {/* Horizontal scroll wraps header + time grid so they scroll together */}
      <div className="dayview-hscroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Prof headers */}
        <div style={{ display: 'grid', gridTemplateColumns: `${GUTTER}px repeat(${cols}, minmax(130px, 1fr))`, borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
          <div />
          {profsVisibles.length > 0 ? profsVisibles.map(p => (
            <div key={p.usuarioTenantId} style={{ padding: '8px 12px', borderLeft: `1px solid ${T.lineSoft}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(() => { const hue = (p.usuarioTenantId * 137) % 360; return (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `oklch(0.94 0.04 ${hue})`, color: `oklch(0.45 0.13 ${hue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 700 }}>
                    {p.nombre.replace(/^Dr[a]?\.\s*/i, '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                ); })()}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '.82rem', fontWeight: 650, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                  <div style={{ fontSize: '.72rem', color: T.text3 }}>{p.rolNombre}</div>
                  {(() => {
                    const profCitas = dayCitas.filter(c => c.usuarioTenantId === p.usuarioTenantId);
                    const cnt = profCitas.length;
                    const minOcupados = profCitas.reduce((sum, c) => {
                      const [hh1, mm1] = c.fechaInicio.slice(11,16).split(':').map(Number);
                      const [hh2, mm2] = c.fechaFin.slice(11,16).split(':').map(Number);
                      return sum + (hh2*60+mm2) - (hh1*60+mm1);
                    }, 0);
                    const pct = Math.round(minOcupados / ((HORA_FIN - HORA_INICIO) * 60) * 100);
                    return cnt > 0 ? (
                      <div style={{ fontSize: '.68rem', color: T.text3 }}>{cnt} citas · {pct}% ocupado</div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          )) : (
            <div style={{ padding: '8px 12px', borderLeft: `1px solid ${T.lineSoft}` }}>
              <div style={{ fontSize: '.82rem', color: T.text3 }}>Sin profesionales</div>
            </div>
          )}
        </div>

        {/* Time grid */}
        <div className="dayview-scroll" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `${GUTTER}px repeat(${cols}, minmax(130px, 1fr))`, height: TOTAL_H + 32 }}>
          {/* Gutter */}
          <div style={{ position: 'relative', borderRight: `1px solid ${T.line}` }}>
            {Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => (
              <div key={i} style={{
                position: 'absolute', top: i * PX_POR_HORA - 7, right: 8,
                fontSize: '.66rem', fontFamily: "'IBM Plex Mono',monospace", color: T.text3, whiteSpace: 'nowrap',
              }}>
                {i === 0 ? '' : `${String(HORA_INICIO + i).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Columns */}
          {(profsVisibles.length > 0 ? profsVisibles : [null]).map((prof, ci) => {
            const colCitas = prof
              ? dayCitas.filter(c => c.usuarioTenantId === prof.usuarioTenantId)
              : dayCitas;
            const layouts = calcLayout(colCitas);

            return (
              <div
                key={prof ? prof.usuarioTenantId : 'all'}
                onClick={e => handleColClick(e, prof?.usuarioTenantId)}
                style={{ position: 'relative', height: TOTAL_H + 32, cursor: 'crosshair', borderLeft: `1px solid ${T.lineSoft}` }}
              >
                {Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => (
                  <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * PX_POR_HORA, height: 1, background: T.lineSoft, pointerEvents: 'none' }} />
                ))}
                {Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => (
                  <div key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: i * PX_POR_HORA + PX_POR_HORA / 2, height: 1, background: T.lineSoft, opacity: .5, pointerEvents: 'none' }} />
                ))}

                {showNow && ci === 0 && (
                  <div ref={nowRef} style={{ position: 'absolute', left: 0, right: 0, top: nowTop, zIndex: 10, height: 2, background: '#ef4444', pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                  </div>
                )}
                {showNow && ci > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: nowTop, zIndex: 10, height: 2, background: '#ef4444', opacity: .4, pointerEvents: 'none' }} />
                )}

                {layouts.map(({ cita, startMin, endMin, lane, totalLanes }) => {
                  const top = (startMin - HORA_INICIO * 60) / 60 * PX_POR_HORA + 1;
                  const height = Math.max(22, (endMin - startMin) / 60 * PX_POR_HORA - 3);
                  const width = `calc(${100 / totalLanes}% - 3px)`;
                  const left = `calc(${(100 / totalLanes) * lane}% + 1px)`;
                  const cfg = TIPO_CFG[cita.tipo];
                  const isCancelled = cita.estado === 'CANCELADA' || cita.estado === 'NO_ASISTIO';
                  const isEnAtencion = cita.estado === 'EN_ATENCION';
                  const compact = height <= 40;
                  const hideTime = totalLanes >= 3;
                  const statusIco = cita.estado === 'ATENDIDA'
                    ? <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="var(--color-ok,#059669)" strokeWidth="2.2" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg>
                    : cita.estado === 'CONFIRMADA'
                      ? <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke={cfg.color} strokeWidth="2.2" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg>
                      : isEnAtencion
                        ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--color-warn,#d97706)" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        : null;
                  return (
                    <div
                      key={cita.id}
                      data-event="1"
                      onClick={e => { e.stopPropagation(); onEventClick(cita); }}
                      style={{
                        position: 'absolute', top, left, width, height,
                        background: isCancelled ? T.surface2 : `color-mix(in oklab, ${cfg.color} 13%, var(--color-surface,#fff))`,
                        borderRadius: 8, overflow: 'hidden',
                        cursor: 'pointer', zIndex: 2, boxSizing: 'border-box',
                        opacity: isCancelled ? .62 : 1,
                        boxShadow: isEnAtencion ? '0 0 0 1.5px var(--color-warn,#d97706)' : 'none',
                        padding: compact ? '2px 6px 2px 9px' : '3px 6px 3px 9px',
                      }}
                    >
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: isCancelled ? T.text3 : cfg.color, borderRadius: '8px 0 0 8px' }} />
                      {compact ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: '100%', overflow: 'hidden' }}>
                          {!hideTime && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.63rem', fontWeight: 600, color: T.text, opacity: .85, flexShrink: 0 }}>{cita.fechaInicio.slice(11, 16)}</span>}
                          {statusIco}
                          <span style={{ fontSize: '.74rem', fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: isCancelled ? 'line-through' : 'none' }}>{cita.mascotaNombre ?? '—'}</span>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 1 }}>
                            {!hideTime && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.63rem', fontWeight: 600, color: T.text, opacity: .85 }}>{cita.fechaInicio.slice(11, 16)}</span>}
                            {statusIco}
                          </div>
                          <div style={{ fontSize: '.75rem', fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: isCancelled ? 'line-through' : 'none', lineHeight: 1.2 }}>{cita.mascotaNombre ?? '—'}</div>
                          {height >= 46 && (
                            <div style={{ fontSize: '.65rem', color: T.text, opacity: .8, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cfg.label}{cita.clienteNombre ? ` · ${cita.clienteNombre}` : ''}</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
