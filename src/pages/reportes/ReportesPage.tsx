import React, { useEffect, useRef, useState } from 'react';
import { exportarExcel, exportarPDF } from '../../utils/reportes-export';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { reportesService } from '../../services/reportes.service';
import type { AgrupacionTendencia, MetricaProductos } from '../../services/reportes.service';
import { comisionService, type ComisionDTO } from '../../services/comision.service';
import type {
  ReportesResumenDTO, VentasTendenciaPuntoDTO, VentasPorVendedorDTO,
  VentasPorCategoriaDTO, VentasPorMetodoPagoDTO, VentasProductoDTO,
  InventarioABCDTO, InventarioSlowMoverDTO, InventarioCoberturaDTO,
  ComprasPorProveedorDTO, FinancieroDTO,
  VencimientosRiesgoDTO, ClienteReporteDTO, MermaReporteDTO, HorasPicoItemDTO, ComprobanteTipoResumenDTO,
} from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { useSucursalStore } from '../../store/sucursalStore';
import { notify } from '../../lib/notify';

// ─── CSS tokens ───────────────────────────────────────────────────────────────

const LIGHT: Record<string, string> = {
  '--bg': '#f7f8fa', '--surface': '#ffffff', '--surface-2': '#f1f3f7', '--surface-3': '#fafbfc',
  '--line': '#e4e7ec', '--line-soft': '#eef0f4',
  '--text': '#0d1117', '--text-2': '#525c6b', '--text-3': '#6b7280',
  '--primary': '#3b47ef', '--primary-soft': '#eef0ff', '--primary-line': '#cfd4fd',
  '--ok': '#0f9d6e', '--ok-soft': '#e7f7f1', '--warn': '#b7791f', '--warn-soft': '#fdf6e7',
  '--warn-line': '#f0dfb4', '--bad': '#d63b3b', '--bad-soft': '#fdeceb',
  '--info': '#2563c9', '--info-soft': '#e8f0fd', '--violet': '#7147d4', '--violet-soft': '#f1ecfd',
  '--shadow': '0 1px 2px rgba(16,24,40,.05),0 1px 3px rgba(16,24,40,.06)',
};


// ─── Gasto labels ────────────────────────────────────────────────────────────

const GASTO_LABELS: Record<string, string> = {
  ALQUILER: 'Alquiler', SERVICIOS: 'Servicios básicos', SUELDOS: 'Sueldos y salarios',
  MANTENIMIENTO: 'Mantenimiento', PUBLICIDAD: 'Publicidad', TRANSPORTE: 'Transporte',
  IMPUESTOS: 'Impuestos', COMPRAS_INTERNAS: 'Compras internas',
  COMPRA_PROVEEDOR: 'Compra a proveedor', OTROS: 'Otros',
};

const COLORS = ['#3b47ef','#0f9d6e','#b7791f','#d63b3b','#7147d4','#2563c9','#ec4899','#84cc16'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function daysAgo(n: number): string { const d=new Date(); d.setDate(d.getDate()-n); return toDateString(d); }
function startOfYear(): string { const d=new Date(); d.setMonth(0,1); return toDateString(d); }
function startOfMonth(): string { const d=new Date(); d.setDate(1); return toDateString(d); }
function startOfPrevMonth(): string { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return toDateString(d); }
function endOfPrevMonth(): string { const d=new Date(); d.setDate(0); return toDateString(d); }
function todayStr(): string { return toDateString(new Date()); }
function monthRangeEndingAt(base:string, offset:number): { desde:string; hasta:string } {
  const d=new Date(`${base}T00:00:00`);
  const first=new Date(d.getFullYear(), d.getMonth()+offset, 1);
  const last=new Date(d.getFullYear(), d.getMonth()+offset+1, 0);
  return { desde:toDateString(first), hasta:toDateString(last) };
}
function formatMonthShort(date:string): string {
  const d=new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('es-PE',{month:'short'}).replace('.','').replace(/^\w/,c=>c.toUpperCase());
}

// S/ 3 302 (espacio fino como sep. miles, coma decimal)
function formatMoney(v: number|null|undefined, dec=0): string {
  if (v==null) return '—';
  const abs=Math.abs(v); const sign=v<0?'-':'';
  if (dec===0) {
    const int=Math.round(abs).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'\u202F');
    return `${sign}S/\u00A0${int}`;
  }
  const [int, decimal]=abs.toFixed(dec).split('.');
  const intFmt=int.replace(/\B(?=(\d{3})+(?!\d))/g,'\u202F');
  return `${sign}S/\u00A0${intFmt},${decimal}`;
}
// compatibilidad con otras tabs
function formatSoles(v: number|null|undefined): string { return formatMoney(v,2); }
function formatSolesRound(v: number|null|undefined): string { return formatMoney(v,0); }
function formatNum(v: number|null|undefined): string {
  if (v==null) return '—';
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'\u202F');
}
function formatPct(v: number|null|undefined, dec=1): string { if(v==null)return'—'; return `${v.toFixed(dec).replace('.',',')}%`; }
function pluralUds(n: number|null|undefined): string { const x=Math.round(n??0); return x===1?'1 ud':`${formatNum(x)} uds`; }
function pluralVentas(n: number|null|undefined): string { const x=Math.round(n??0); return x===1?'1 venta':`${formatNum(x)} ventas`; }
function formatYAxisK(v: number): string {
  if(v===0)return'0'; if(Math.abs(v)>=1e6)return`${(v/1e6).toFixed(1)}M`;
  if(Math.abs(v)>=1e3)return`${(v/1e3).toFixed(0)}k`; return String(Math.round(v));
}
function shortLabel(s: string, max=14): string { return s.length>max?s.slice(0,max)+'…':s; }

const MESES_CORTOS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function formatPeriodoEje(periodo: string, ag: AgrupacionTendencia): string {
  if (!periodo) return '';
  if (ag==='DIA'&&/^\d{4}-\d{2}-\d{2}$/.test(periodo)) { const[,m,d]=periodo.split('-'); return`${d} ${MESES_CORTOS[+m-1]}`; }
  if (ag==='MES'&&/^\d{4}-\d{2}$/.test(periodo)) { const[y,m]=periodo.split('-'); return`${MESES_CORTOS[+m-1]} '${y.slice(2)}`; }
  if (ag==='SEMANA'&&/^\d{4}-\d{2}-\d{2}$/.test(periodo)) { const[,m,d]=periodo.split('-'); return`Sem ${d}/${MESES_CORTOS[+m-1]}`; }
  return periodo.length>10?periodo.slice(5):periodo;
}
function formatYAxisSoles(v: number): string {
  if(v===0)return'S/0'; if(Math.abs(v)>=1e6)return`S/${(v/1e6).toFixed(1)}M`;
  if(Math.abs(v)>=1e3)return`S/${(v/1e3).toFixed(1)}k`; return`S/${v.toFixed(0)}`;
}

function buildSparkPath(vals: number[]): { fill: string; line: string } {
  if (!vals||vals.length<2) return { fill:'', line:'' };
  const mn=Math.min(...vals), mx=Math.max(...vals);
  const range=mx-mn||1;
  const w=100, h=24;
  const pts=vals.map((v,i)=>({ x:(i/(vals.length-1))*w, y:h-((v-mn)/range)*(h-4)-2 }));
  const d=pts.map((p,i)=>(i===0?`M${p.x.toFixed(1)} ${p.y.toFixed(1)}`:`L${p.x.toFixed(1)} ${p.y.toFixed(1)}`)).join(' ');
  const fill=`${d} L${w} ${h} L0 ${h} Z`;
  return { fill, line: d };
}

// ─── Data interfaces ──────────────────────────────────────────────────────────

interface VentasData {
  tendencia: VentasTendenciaPuntoDTO[];
  porVendedor: VentasPorVendedorDTO[];
  porCategoria: VentasPorCategoriaDTO[];
  porMetodoPago: VentasPorMetodoPagoDTO[];
  topProductos: VentasProductoDTO[];
  menosProductos: VentasProductoDTO[];
}
interface InventarioData {
  abc: InventarioABCDTO[];
  slowMovers: InventarioSlowMoverDTO[];
  cobertura: InventarioCoberturaDTO[];
  vencimientos: VencimientosRiesgoDTO | null;
  mermas: MermaReporteDTO[];
}

// ─── Design components ───────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14,
  boxShadow:'var(--shadow)', minWidth:0,
};

function KpiCard({ label, value, sub, delta, deltaTone, color='var(--text)', sparkVals, sparkColor, breakdown }:{
  label:string; value:string; sub?:string; delta?:string|null; deltaTone?:'positive'|'negative'|'neutral'; color?:string; sparkVals?:number[]; sparkColor?:string; breakdown?:React.ReactNode;
}) {
  const [popOpen, setPopOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const isPos = deltaTone ? deltaTone==='positive' : (delta?.startsWith('+') || delta?.startsWith('▲'));
  const isNeg = deltaTone ? deltaTone==='negative' : (delta?.startsWith('-') || delta?.startsWith('▼'));
  const spark = sparkVals && sparkVals.length>1 ? buildSparkPath(sparkVals) : null;
  const sc = sparkColor ?? color;

  useEffect(() => {
    if (!popOpen) return;
    const h = (e: MouseEvent) => { if (popRef.current && !popRef.current.contains(e.target as Node)) setPopOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [popOpen]);

  return (
    <div style={{ ...card, padding:'16px 18px 12px', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, position:'relative' }} ref={popRef}>
          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'.68rem', fontWeight:600, letterSpacing:'.09em', textTransform:'uppercase', color:'var(--text-3)' }}>{label}</span>
          {breakdown && (
            <>
              <button onClick={() => setPopOpen(o => !o)} style={{ width:14, height:14, borderRadius:'50%', border:'1px solid var(--text-3)', background:'none', cursor:'pointer', fontSize:'.58rem', fontWeight:700, color:'var(--text-3)', display:'inline-flex', alignItems:'center', justifyContent:'center', padding:0, lineHeight:1, flexShrink:0, opacity:.7 }}>i</button>
              {popOpen && (
                <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:100, background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:'10px 12px', minWidth:210, boxShadow:'0 4px 20px rgba(0,0,0,.12)' }}>
                  {breakdown}
                </div>
              )}
            </>
          )}
        </div>
        {delta && (
          <span style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:'.7rem', fontWeight:650, padding:'2px 7px', borderRadius:20,
            background: isPos?'var(--ok-soft)':isNeg?'var(--bad-soft)':'var(--surface-2)',
            color: isPos?'var(--ok)':isNeg?'var(--bad)':'var(--text-3)' }}>
            {delta}
          </span>
        )}
      </div>
      <div style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:'1.6rem', fontWeight:700, letterSpacing:'-.03em', fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap', color, marginTop:8, lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:'.76rem', color:'var(--text-3)', marginTop:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sub}</div>}
      {spark && (
        <svg viewBox="0 0 100 24" preserveAspectRatio="none" style={{ display:'block', width:'100%', height:28, marginTop:8 }}>
          <path d={spark.fill} style={{ fill:sc, opacity:.12 }} />
          <path d={spark.line} fill="none" style={{ stroke:sc, strokeWidth:1.5 }} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
}

function Panel({ title, sub, children, action }: { title:string; sub?:string; children:React.ReactNode; action?:React.ReactNode }) {
  return (
    <div style={card}>
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:10, padding:'16px 18px 0' }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:'.95rem', fontWeight:650, letterSpacing:'-.01em', color:'var(--text)' }}>{title}</div>
          {sub && <div style={{ fontSize:'.78rem', color:'var(--text-3)', marginTop:3 }}>{sub}</div>}
        </div>
        {action}
      </div>
      <div style={{ padding:'14px 18px 18px' }}>{children}</div>
    </div>
  );
}

function RankRow({ pos, name, value, sub, pct, color='var(--primary)' }: { pos:number; name:string; value:string; sub?:string; pct:number; color?:string }) {
  const posBg = pos===1 ? color : 'var(--surface-2)';
  const posColor = pos===1 ? '#fff' : 'var(--text-2)';
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:'.83rem' }}>
        <span style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:'.7rem', fontWeight:700, width:22, height:22, borderRadius:7, background:posBg, color:posColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{pos}</span>
        <span style={{ flex:1, minWidth:0, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</span>
        <span style={{ fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{value}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6 }}>
        <span style={{ width:22, flexShrink:0 }} />
        <div style={{ flex:1, height:5, borderRadius:5, background:'var(--surface-2)', overflow:'hidden' }}>
          <div style={{ width:`${Math.max(3,Math.min(pct,100))}%`, height:'100%', background:color, borderRadius:5 }} />
        </div>
        <span style={{ minWidth:62, textAlign:'right', fontSize:'.68rem', color:'var(--text-3)' }}>{sub}</span>
      </div>
    </div>
  );
}

function TabLoading() {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:'60px 0' }}>
      <div style={{ width:32, height:32, border:'3px solid var(--line)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  );
}

function TabError({ message, onRetry }: { message:string; onRetry:()=>void }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'60px 0', textAlign:'center' }}>
      <div style={{ fontSize:'.9rem', color:'var(--bad)' }}>{message}</div>
      <button onClick={onRetry} style={{ padding:'8px 20px', borderRadius:8, border:'1px solid var(--line)', background:'var(--surface)', color:'var(--text-2)', fontSize:'.85rem', cursor:'pointer' }}>
        Reintentar
      </button>
    </div>
  );
}

function TabEmpty() {
  return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)', fontSize:'.9rem' }}>
      Sin datos para el período seleccionado.
    </div>
  );
}

// ─── Tab types + bar ──────────────────────────────────────────────────────────

type TabId = 'resumen'|'ventas'|'productos'|'vendedores'|'clientes'|'inventario'|'financiero'|'compras';

const TABS: [TabId, string, string][] = [
  ['resumen','Resumen','M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z'],
  ['ventas','Ventas','M3 3v18h18M7 15l4-4 3 3 6-6'],
  ['productos','Productos','M12 22V12M3.3 7l8.7 5 8.7-5M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z'],
  ['vendedores','Vendedores','M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'],
  ['clientes','Clientes','M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0m7 4 2 2 4-4'],
  ['inventario','Inventario','M12 22V12M3.3 7l8.7 5 8.7-5M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z'],
  ['financiero','Financiero','M3 3v18h18M7 16l5-5 3 3 4-4'],
  ['compras','Compras','M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
];

function TabIcon({ d }: { d:string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ─── Quick ranges ─────────────────────────────────────────────────────────────

const QUICK_RANGES = [
  { label:'Hoy',         desde:todayStr,        hasta:todayStr },
  { label:'7d',          desde:()=>daysAgo(7),  hasta:todayStr },
  { label:'30d',         desde:()=>daysAgo(30), hasta:todayStr },
  { label:'Este mes',    desde:startOfMonth,     hasta:todayStr },
  { label:'Mes ant.',    desde:startOfPrevMonth, hasta:endOfPrevMonth },
  { label:'90d',         desde:()=>daysAgo(90), hasta:todayStr },
  { label:'Este año',    desde:startOfYear,      hasta:todayStr },
];

// ─── Resumen tab ──────────────────────────────────────────────────────────────

const MP_MAP: Record<string, { label: string; color: string }> = {
  EFECTIVO:      { label:'Efectivo',      color:'var(--ok)' },
  YAPE_PLIN:     { label:'Yape / Plin',   color:'var(--primary)' },
  TARJETA:       { label:'Tarjeta',       color:'var(--warn)' },
  TRANSFERENCIA: { label:'Transferencia', color:'var(--text-3)' },
};
function mpLabel(k: string): string { return MP_MAP[k]?.label ?? k.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()); }
function mpColor(k: string): string { return MP_MAP[k]?.color ?? 'var(--text-3)'; }

function ResumenTab({ loading, error, data, onRetry, esServicios=false, ventasData=null, ventasLoading=false, desde='', hasta='', onTabChange }:{
  loading:boolean; error:string|null; data:ReportesResumenDTO|null;
  onRetry:()=>void; esServicios?:boolean; ventasData?:VentasData|null; ventasLoading?:boolean;
  desde?:string; hasta?:string; onTabChange?:(t:TabId)=>void;
}) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  const v = data.ventas;
  const inv = data.inventario;
  const margenPct = v?.ingresosTotal && v.margenEstimado != null ? (v.margenEstimado / v.ingresosTotal) * 100 : null;
  const bajoStockList = (inv?.productosBajoStock ?? []).filter(p => !esServicios || p.tipo === 'PRODUCTO' || !p.tipo);

  const tendencia = ventasData?.tendencia ?? [];
  const porMetodoPago = ventasData?.porMetodoPago ?? [];
  const porVendedor = ventasData?.porVendedor ?? [];
  const topProductosRaw = v?.topProductosVendidos ?? [];

  const totalIngresosMP = porMetodoPago.reduce((s, r) => s + (r.ingresosTotal ?? 0), 0);

  const topProductos = [...topProductosRaw].sort((a, b) => (b.ingresos ?? 0) - (a.ingresos ?? 0));
  const topVendedores = [...porVendedor].sort((a, b) => (b.ingresosTotal ?? 0) - (a.ingresosTotal ?? 0));

  // Fill chart data with 0 for every day in range
  const tendMap = new Map(tendencia.map(p => [p.periodo, p.ingresosTotal ?? 0]));
  const chartData: { dia: string; ingresos: number }[] = [];
  if (desde && hasta) {
    const start = new Date(desde + 'T00:00:00');
    const end = new Date(hasta + 'T00:00:00');
    for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
      chartData.push({ dia: String(cur.getDate()), ingresos: tendMap.get(key) ?? 0 });
    }
  } else {
    tendencia.forEach(p => chartData.push({
      dia: p.periodo ? (/^\d{4}-\d{2}-\d{2}$/.test(p.periodo) ? String(parseInt(p.periodo.slice(8))) : p.periodo.slice(5)) : '',
      ingresos: p.ingresosTotal ?? 0,
    }));
  }

  const yMaxData = Math.max(...chartData.map(d => d.ingresos), 1);
  const yMax = yMaxData * 1.12;
  const yTicks = [0, Math.round(yMax * 0.33), Math.round(yMax * 0.66), Math.round(yMax)];
  const xInterval = chartData.length <= 7 ? 0 : Math.max(0, Math.floor(chartData.length / 6));

  const sparkIngresos = chartData.map(d => d.ingresos);
  const sparkVentas = tendencia.map(p => p.ventasCount ?? 0);

  const dateShort = (s: string) => {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const [, m, d] = s.split('-');
    return `${parseInt(d)} ${MESES_CORTOS[parseInt(m)-1]}`;
  };
  const chartSub = desde && hasta
    ? `Por día · ${dateShort(desde)} → ${dateShort(hasta)} ${hasta.slice(0,4)}`
    : 'Por día · evolución en el rango seleccionado';

  const margenColor = margenPct == null ? 'var(--text-3)' : margenPct >= 30 ? 'var(--ok)' : margenPct >= 15 ? 'var(--warn)' : 'var(--bad)';

  // ── Estadísticas para insights ──
  const diasTotales = chartData.length;
  const diasConVentas = tendencia.filter(p => (p.ingresosTotal ?? 0) > 0).length;
  const diasSinVentas = diasTotales - diasConVentas;
  const pctDiasSinVentas = diasTotales > 0 ? (diasSinVentas / diasTotales) * 100 : 0;
  const sinStock = bajoStockList.filter(p => p.stockActual === 0);
  const bajoMin = bajoStockList.filter(p => (p.stockActual ?? 0) > 0);
  const totalIngresos = v?.ingresosTotal ?? 0;
  const topProd = topProductos[0];
  const concProd = topProd && totalIngresos > 0 ? (topProd.ingresos / totalIngresos) * 100 : 0;
  const topMP = [...porMetodoPago].sort((a,b)=>(b.ingresosTotal??0)-(a.ingresosTotal??0))[0];
  const concMP = topMP && totalIngresosMP > 0 ? ((topMP.ingresosTotal??0) / totalIngresosMP) * 100 : 0;
  const mejorDia = tendencia.length > 0 ? tendencia.reduce((m,p)=>(p.ingresosTotal??0)>(m.ingresosTotal??0)?p:m) : null;
  const promedioDiario = diasTotales > 0 && totalIngresos > 0 ? totalIngresos / diasConVentas : 0;

  type Insight = { bg:string; color:string; text:string; nivel: 0|1|2|3 }; // 0=crítico 1=alerta 2=positivo 3=info
  const raw: Insight[] = [];

  // ── CRÍTICOS (rojo) ──
  if (totalIngresos === 0) {
    raw.push({ nivel:0, bg:'var(--bad-soft)', color:'var(--bad)', text:'No se registraron ingresos en el período. Verifica si hay ventas cargadas.' });
  }
  if (margenPct != null && margenPct < 15 && totalIngresos > 0) {
    raw.push({ nivel:0, bg:'var(--bad-soft)', color:'var(--bad)', text:`Margen bruto de ${formatPct(margenPct)}: muy bajo. Revisa tus precios de costo o aumenta precios de venta.` });
  }
  if (sinStock.length > 0) {
    raw.push({ nivel:0, bg:'var(--bad-soft)', color:'var(--bad)',
      text: sinStock.length === 1 ? '1 producto está sin stock. Puede estar perdiendo ventas.' : `${sinStock.length} productos están sin stock. Podrías estar perdiendo ventas.` });
  }
  if (concProd > 70 && topProd) {
    raw.push({ nivel:0, bg:'var(--bad-soft)', color:'var(--bad)', text:`${topProd.nombre} representa el ${formatPct(concProd,0)} de tus ingresos. Alta dependencia de un solo producto — riesgo de concentración.` });
  }

  // ── ALERTAS (naranja) ──
  if (bajoMin.length > 0) {
    raw.push({ nivel:1, bg:'var(--warn-soft)', color:'var(--warn)',
      text: bajoMin.length === 1 ? '1 producto está bajo el stock mínimo. Planifica reposición.' : `${bajoMin.length} productos están bajo el stock mínimo. Planifica reposición.` });
  }
  if (margenPct != null && margenPct >= 15 && margenPct < 25 && totalIngresos > 0) {
    raw.push({ nivel:1, bg:'var(--warn-soft)', color:'var(--warn)', text:`Margen bruto de ${formatPct(margenPct)}: aceptable pero por debajo del 25% recomendado. Oportunidad de mejora en precios o costos.` });
  }
  if (pctDiasSinVentas > 30 && diasTotales > 7) {
    raw.push({ nivel:1, bg:'var(--warn-soft)', color:'var(--warn)', text:`${diasSinVentas} de ${diasTotales} días sin ventas (${formatPct(pctDiasSinVentas,0)}). Evalúa si hay días con baja actividad recurrente.` });
  }
  if (concMP > 80 && topMP) {
    raw.push({ nivel:1, bg:'var(--warn-soft)', color:'var(--warn)', text:`El ${formatPct(concMP,0)} de tus ingresos vienen de ${mpLabel(topMP.metodoPago)}. Considera diversificar métodos de pago.` });
  }
  if (concProd > 50 && concProd <= 70 && topProd) {
    raw.push({ nivel:1, bg:'var(--warn-soft)', color:'var(--warn)', text:`${topProd.nombre} concentra el ${formatPct(concProd,0)} de tus ingresos. Diversifica tu oferta para reducir el riesgo.` });
  }

  // ── POSITIVOS (verde) ──
  if (margenPct != null && margenPct >= 30 && totalIngresos > 0) {
    raw.push({ nivel:2, bg:'var(--ok-soft)', color:'var(--ok)', text:`Margen bruto de ${formatPct(margenPct)}: excelente rentabilidad en el período.` });
  }
  if (pctDiasSinVentas < 10 && diasTotales > 7 && totalIngresos > 0) {
    raw.push({ nivel:2, bg:'var(--ok-soft)', color:'var(--ok)', text:`Ventas en ${diasConVentas} de ${diasTotales} días (${formatPct(100-pctDiasSinVentas,0)} de cobertura) — actividad comercial consistente.` });
  }
  if (topVendedores.length >= 2) {
    raw.push({ nivel:2, bg:'var(--ok-soft)', color:'var(--ok)', text:`${topVendedores.length} vendedores activos en el período. Buena distribución del equipo de ventas.` });
  }
  if (porMetodoPago.length >= 3) {
    raw.push({ nivel:2, bg:'var(--ok-soft)', color:'var(--ok)', text:`Se usaron ${porMetodoPago.length} métodos de pago distintos. Buena diversificación.` });
  }

  // ── INFO (azul) ──
  if (topProd && totalIngresos > 0) {
    raw.push({ nivel:3, bg:'var(--info-soft)', color:'var(--info)', text:`${topProd.nombre} fue el producto con más ingresos: ${formatMoney(topProd.ingresos, 2)} (${formatPct(concProd,0)} del total).` });
  }
  if (topVendedores.length > 0) {
    const tv = topVendedores[0];
    raw.push({ nivel:3, bg:'var(--info-soft)', color:'var(--info)', text:`${tv.vendedorNombre ?? 'Vendedor'} lideró el período con ${formatMoney(tv.ingresosTotal, 2)} en ${tv.ventasCount} ${tv.ventasCount===1?'venta':'ventas'}.` });
  }
  if (mejorDia && diasConVentas > 1) {
    const dLabel = mejorDia.periodo ? dateShort(mejorDia.periodo) : '';
    raw.push({ nivel:3, bg:'var(--info-soft)', color:'var(--info)', text:`El mejor día fue ${dLabel} con ${formatMoney(mejorDia.ingresosTotal, 2)} en ingresos.` });
  }
  if (topMP && totalIngresos > 0) {
    raw.push({ nivel:3, bg:'var(--info-soft)', color:'var(--info)', text:`${mpLabel(topMP.metodoPago)} fue el método de pago más usado: ${formatPct(concMP,0)} de los ingresos.` });
  }
  if (promedioDiario > 0 && diasConVentas > 1) {
    raw.push({ nivel:3, bg:'var(--info-soft)', color:'var(--info)', text:`Promedio de ${formatMoney(promedioDiario, 2)} por día con ventas en el período.` });
  }

  // ── Armar lista final: primero críticos+alertas, si no hay → positivos+info ──
  raw.sort((a,b) => a.nivel - b.nivel);
  const malos = raw.filter(r => r.nivel <= 1);
  const buenos = raw.filter(r => r.nivel >= 2);
  const insights = malos.length > 0 ? malos : buenos.length > 0 ? buenos : [{ nivel:3 as const, bg:'var(--primary-soft)', color:'var(--primary)', text:'Todo en orden. No hay alertas que revisar en este período.' }];

  const btnVerTodo = (onClick: ()=>void) => (
    <button onClick={onClick} style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:'.72rem', fontWeight:600, padding:'3px 10px', borderRadius:20, border:'none', background:'var(--primary-soft)', color:'var(--primary)', cursor:'pointer', whiteSpace:'nowrap' }}>Ver todo</button>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
      {/* ── 4 KPI cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
        <KpiCard label="Ingresos" value={formatMoney(v?.ingresosTotal)}
          sub="Período seleccionado"
          sparkVals={sparkIngresos} sparkColor="var(--primary)" />
        <KpiCard label={esServicios ? 'Servicios' : 'Ventas'} value={formatNum(v?.ventasCount)}
          sub="Comprobantes emitidos"
          sparkVals={sparkVentas} sparkColor="var(--primary)" />
        <KpiCard label="Ticket promedio" value={formatMoney(v?.ticketPromedio, 2)}
          sub="Por venta" />
        <KpiCard label="Utilidad bruta"
          value={formatMoney(v?.margenEstimado)}
          sub={margenPct != null ? `Margen ${formatPct(margenPct)}` : 'Ingresos − costo estimado'}
          sparkVals={sparkIngresos} sparkColor={margenColor}
          breakdown={v?.ingresosTotal != null && v?.margenEstimado != null ? (
            <div style={{ marginTop:8, borderTop:'1px solid var(--line-soft)', paddingTop:7, display:'flex', flexDirection:'column', gap:2 }}>
              {([ ['Ingresos', v.ingresosTotal, false], ['− C. ventas', v.ingresosTotal - v.margenEstimado, true], ] as [string, number, boolean][]).map(([lbl, val, isDed]) => (
                <div key={lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:6 }}>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'.65rem', color: isDed ? 'var(--text-3)' : 'var(--text-2)' }}>{lbl}</span>
                  <span style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:'.73rem', fontWeight:600, fontVariantNumeric:'tabular-nums', color: isDed ? 'var(--text-3)' : 'var(--text-2)' }}>{formatMoney(val)}</span>
                </div>
              ))}
            </div>
          ) : undefined} />
      </div>

      {/* ── Grid 2:1 → gráfico ingresos + métodos de pago ── */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,2fr) minmax(0,1fr)', gap:14, alignItems:'start' }}>
        <Panel title="Ingresos del período" sub={chartSub}
          action={
            <div style={{ display:'flex', alignItems:'center', gap:16, fontSize:'.73rem', color:'var(--text-3)', flexShrink:0 }}>
              <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                <svg width={18} height={2} style={{ display:'block' }}><line x1="0" y1="1" x2="18" y2="1" stroke="var(--primary)" strokeWidth="2"/></svg>
                Período actual
              </span>
            </div>
          }>
          {ventasLoading
            ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:230, color:'var(--text-3)', fontSize:'.84rem' }}>Cargando gráfico…</div>
            : chartData.length === 0
              ? <div style={{ textAlign:'center', color:'var(--text-3)', padding:'80px 0', fontSize:'.84rem' }}>Sin datos de tendencia</div>
              : (
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={chartData} margin={{ top:5, right:8, left:0, bottom:5 }}>
                    <defs>
                      <linearGradient id="grdResumen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.14} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--line-soft)" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fill:'var(--text-3)' }} axisLine={false} tickLine={false} interval={xInterval} />
                    <YAxis tick={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, fill:'var(--text-3)' }} tickFormatter={formatYAxisK} width={44} axisLine={false} tickLine={false} ticks={yTicks} domain={[0, Math.ceil(yMax)]} />
                    <Tooltip
                      formatter={(value) => {
                        const raw = Array.isArray(value) ? value[0] : value;
                        const numeric = Number(raw ?? 0);
                        return formatMoney(Number.isFinite(numeric) ? numeric : 0);
                      }}
                      contentStyle={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:8, fontSize:'.83rem' }}
                      labelStyle={{ color:'var(--text-2)' }}
                    />
                    <Area type="linear" dataKey="ingresos" name="Ingresos" stroke="var(--primary)" strokeWidth={2.2} fill="url(#grdResumen)" dot={false} activeDot={{ r:4, fill:'var(--primary)' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )
          }
        </Panel>

        <Panel title="Métodos de pago" sub="Distribución del período">
          {porMetodoPago.length === 0
            ? <div style={{ textAlign:'center', color:'var(--text-3)', padding:'50px 0', fontSize:'.84rem' }}>{ventasLoading ? 'Cargando…' : 'Sin datos'}</div>
            : (
              <>
                <div style={{ display:'flex', gap:2, marginBottom:14 }}>
                  {porMetodoPago.map(mp => {
                    const pct = totalIngresosMP > 0 ? ((mp.ingresosTotal ?? 0) / totalIngresosMP) * 100 : 0;
                    if (pct <= 0) return null;
                    return <div key={mp.metodoPago} style={{ flex:`${pct} 0 0`, height:12, borderRadius:6, background:mpColor(mp.metodoPago), minWidth:4 }} />;
                  })}
                </div>
                <div style={{ display:'grid', gap:11 }}>
                  {porMetodoPago.map(mp => {
                    const pct = totalIngresosMP > 0 ? ((mp.ingresosTotal ?? 0) / totalIngresosMP) * 100 : 0;
                    return (
                      <div key={mp.metodoPago} style={{ display:'flex', alignItems:'center', gap:9, fontSize:'.83rem' }}>
                        <span style={{ width:9, height:9, borderRadius:'50%', background:mpColor(mp.metodoPago), flexShrink:0 }} />
                        <span style={{ flex:1, minWidth:0, fontFamily:"'Inter',system-ui,sans-serif", fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{mpLabel(mp.metodoPago)}</span>
                        <span style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:'.76rem', color:'var(--text-3)', flexShrink:0 }}>{pct.toFixed(1).replace('.',',')}%</span>
                        <span style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:'.83rem', fontWeight:700, fontVariantNumeric:'tabular-nums', color:'var(--text)', flexShrink:0, minWidth:86, textAlign:'right' }}>{formatMoney(mp.ingresosTotal, 2)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          }
        </Panel>
      </div>

      {/* ── Grid 3 cols → top productos + top vendedores + insights ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:14, alignItems:'start' }}>
        <Panel title={esServicios ? 'Top servicios' : 'Top productos'} sub="Por ingresos"
          action={btnVerTodo(()=>onTabChange?.('productos'))}>
          {topProductos.length === 0
            ? <div style={{ textAlign:'center', color:'var(--text-3)', padding:'40px 0', fontSize:'.84rem' }}>Sin datos</div>
            : (
              <div style={{ display:'grid', gap:11 }}>
                {(() => {
                  const maxV = Math.max(...topProductos.map(p => p.ingresos ?? 0), 1);
                  return topProductos.slice(0, 5).map((p, i) => (
                    <RankRow key={p.productoId} pos={i+1} name={p.nombre}
                      value={formatMoney(p.ingresos)}
                      sub={pluralUds(p.cantidadVendida)}
                      pct={((p.ingresos ?? 0) / maxV) * 100}
                      color="var(--primary)" />
                  ));
                })()}
              </div>
            )
          }
        </Panel>

        <Panel title="Top vendedores" sub="Por ingresos"
          action={btnVerTodo(()=>onTabChange?.('vendedores'))}>
          {ventasLoading
            ? <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)', fontSize:'.84rem' }}>Cargando…</div>
            : topVendedores.length === 0
              ? <div style={{ textAlign:'center', color:'var(--text-3)', padding:'40px 0', fontSize:'.84rem' }}>Sin datos</div>
              : (
                <div style={{ display:'grid', gap:11 }}>
                  {(() => {
                    const maxV = Math.max(...topVendedores.map(vv => vv.ingresosTotal ?? 0), 1);
                    return topVendedores.slice(0, 5).map((vv, i) => (
                      <RankRow key={vv.vendedorId} pos={i+1} name={vv.vendedorNombre}
                        value={formatMoney(vv.ingresosTotal)}
                        sub={pluralVentas(vv.ventasCount)}
                        pct={((vv.ingresosTotal ?? 0) / maxV) * 100}
                        color="var(--ok)" />
                    ));
                  })()}
                </div>
              )
          }
        </Panel>

        <Panel title="Lo que conviene revisar" sub="Generado a partir de tus datos">
          <div style={{ display:'grid', gap:8 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', borderRadius:10, background:ins.bg, fontSize:'.83rem', lineHeight:1.5, color:'var(--text-2)' }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={ins.color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:1 }}>
                  <path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z"/>
                </svg>
                <span>{ins.text}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ─── Ventas tab ───────────────────────────────────────────────────────────────

function VentasTab({ loading, error, data, onRetry, esServicios=false, agrupacion, setAgrupacion, utilidadBruta, ingresosAnterior, ventasAnterior, ticketAnterior, utilidadAnterior, horasPicoData=[], comprobantesData=[] }: {
  loading:boolean; error:string|null; data:VentasData|null; onRetry:()=>void;
  esServicios?:boolean; agrupacion:AgrupacionTendencia; setAgrupacion:(a:AgrupacionTendencia)=>void;
  utilidadBruta?:number|null;
  ingresosAnterior?:number|null; ventasAnterior?:number|null;
  ticketAnterior?:number|null; utilidadAnterior?:number|null;
  horasPicoData?:HorasPicoItemDTO[];
  comprobantesData?:ComprobanteTipoResumenDTO[];
}) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  const totalIngresos=data.porMetodoPago.reduce((s,r)=>s+(r.ingresosTotal??0),0);
  const totalVentas=data.tendencia.reduce((s,p)=>s+(p.ventasCount??0),0);
  const ticketProm=totalVentas>0?totalIngresos/totalVentas:0;
  const pctCambio = (actual:number, anterior:number|null|undefined) => {
    if (anterior==null || anterior===0) return null;
    return ((actual-anterior)/Math.abs(anterior))*100;
  };
  const deltaLabel = (actual:number, anterior:number|null|undefined) => {
    const pct=pctCambio(actual,anterior);
    if (pct==null || !Number.isFinite(pct)) return null;
    return `${pct>=0?'▲':'▼'} ${Math.abs(pct).toFixed(1).replace('.',',')}%`;
  };
  const sparkIngresos=data.tendencia.map(p=>p.ingresosTotal??0);
  const sparkVentas=data.tendencia.map(p=>p.ventasCount??0);

  // El HTML de Claude usa las barras como eje principal de Ventas.
  // Aquí usamos los datos reales que ya devuelve tu API.
  const barras=data.tendencia.map((p,i)=>({
    periodo:formatPeriodoEje(p.periodo,agrupacion),
    ingresos:p.ingresosTotal??0,
    ventas:p.ventasCount??0,
    original:p.periodo,
    index:i,
  }));
  const maxIngresos=Math.max(...barras.map(b=>b.ingresos),1);
  const bestIndex=barras.reduce((best,b,i)=>b.ingresos>barras[best]?.ingresos?i:best,0);
  const barGap=barras.length>20?'3px':barras.length>10?'6px':'14px';

  const btnStyle=(active:boolean):React.CSSProperties=>({
    padding:'7px 13px', borderRadius:7,
    border:active?'1px solid var(--line)':'1px solid transparent',
    background:active?'var(--surface)':'transparent',
    boxShadow:active?'0 1px 2px rgba(16,24,40,.08)':'none',
    color:active?'var(--text)':'var(--text-2)',
    fontSize:'.78rem', fontWeight:600, cursor:'pointer',
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
      {/* ── KPI cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12 }}>
        <KpiCard
          label="Ingresos"
          value={formatSolesRound(totalIngresos)}
          color="var(--primary)"
          sparkVals={sparkIngresos}
          sparkColor="var(--primary)"
          delta={deltaLabel(totalIngresos,ingresosAnterior)}
          sub={ingresosAnterior!=null?`vs ${formatMoney(ingresosAnterior,2)} anterior`:(esServicios?'Servicios netos del período':'Período seleccionado')}
        />
        <KpiCard
          label={esServicios?'Servicios':'Ventas'}
          value={formatNum(totalVentas)}
          color="var(--text)"
          sparkVals={sparkVentas}
          sparkColor="var(--primary)"
          delta={deltaLabel(totalVentas,ventasAnterior)}
          sub="Comprobantes emitidos"
        />
        <KpiCard
          label="Ticket promedio"
          value={formatSoles(ticketProm)}
          color="var(--text)"
          sparkVals={sparkIngresos.map(v => totalIngresos>0 ? v/Math.max(1,totalVentas) : 0)}
          sparkColor="var(--primary)"
          delta={deltaLabel(ticketProm,ticketAnterior)}
          sub={esServicios?'Por servicio':'Por venta'}
        />
        <KpiCard
          label="Utilidad bruta"
          value={formatSolesRound(utilidadBruta)}
          color="var(--text)"
          delta={deltaLabel(utilidadBruta??0,utilidadAnterior)}
          sub={utilidadBruta!=null && totalIngresos>0 ? `Margen ${formatPct((utilidadBruta/totalIngresos)*100)}` : 'Ingresos − costo estimado'}
          sparkColor="var(--ok)"
        />
      </div>

      {/* ── Gráfico de barras: reemplaza el AreaChart del código original ── */}
      <div style={{ ...card, marginTop:0 }}>
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:10, padding:'16px 18px 0' }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:'.95rem', fontWeight:650, letterSpacing:'-.01em', color:'var(--text)' }}>
              {esServicios?'Tendencia de servicios':'Tendencia de ventas'}
            </div>
            <div style={{ fontSize:'.78rem', color:'var(--text-3)', marginTop:3 }}>
              Ingresos por {agrupacion==='DIA'?'día':agrupacion==='SEMANA'?'semana':'mes'}
              {barras.length>0 && ` · mejor: ${barras[bestIndex]?.periodo ?? ''} con ${formatSolesRound(barras[bestIndex]?.ingresos ?? 0)}`}
            </div>
          </div>

          <div style={{ display:'flex', gap:3, padding:3, background:'var(--surface-2)', borderRadius:9 }}>
            {(['DIA','SEMANA','MES'] as AgrupacionTendencia[]).map(a=>(
              <button key={a} type="button" style={btnStyle(agrupacion===a)} onClick={()=>setAgrupacion(a)}>
                {a==='DIA'?'Día':a==='SEMANA'?'Semana':'Mes'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:'16px 18px 12px' }}>
          {barras.length===0 ? (
            <div style={{ textAlign:'center', color:'var(--text-3)', padding:'40px 0' }}>Sin datos</div>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'flex-end', gap:barGap, height:220, borderBottom:'1px solid var(--line)' }}>
                {barras.map((b,i)=>{
                  const h=Math.max(2,(b.ingresos/maxIngresos)*86);
                  const isBest=i===bestIndex;
                  return (
                    <div
                      key={`${b.original}-${i}`}
                      title={`${b.periodo} · ${formatSolesRound(b.ingresos)}`}
                      style={{ flex:1, minWidth:0, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center', gap:4 }}
                    >
                      {barras.length<=14 && (
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'.62rem', fontWeight:600, color:isBest?'var(--primary)':'var(--text-3)' }}>
                          {formatYAxisSoles(b.ingresos)}
                        </span>
                      )}
                      <div style={{
                        width:'100%', maxWidth:42, height:`${h}%`, minHeight:2,
                        borderRadius:'5px 5px 2px 2px',
                        background:isBest
                          ? 'var(--primary)'
                          : 'color-mix(in oklab, var(--primary) 45%, var(--surface))',
                      }} />
                    </div>
                  );
                })}
              </div>

              <div style={{ display:'flex', gap:barGap, marginTop:6 }}>
                {barras.map((b,i)=>(
                  <span
                    key={`axis-${b.original}-${i}`}
                    style={{ flex:1, minWidth:0, textAlign:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize:'.62rem', color:'var(--text-3)', whiteSpace:'nowrap', overflow:'hidden' }}
                  >
                    {barras.length>20 && i%2===1 ? '' : b.periodo}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── BLOQUE INFERIOR: mismo layout del rediseño HTML ── */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'minmax(0,1.35fr) minmax(0,1fr)',
        gap:14,
        alignItems:'start',
      }}>
        {/* Horas pico */}
        <div style={{ ...card, minWidth:0 }}>
          <div style={{
            display:'flex', flexWrap:'wrap', alignItems:'flex-start',
            justifyContent:'space-between', gap:10, padding:'16px 18px 0'
          }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:'.95rem', fontWeight:650, letterSpacing:'-.01em', color:'var(--text)' }}>
                Horas pico
              </div>
              <div style={{ fontSize:'.78rem', color:'var(--text-3)', marginTop:3 }}>
                Ventas promedio por día y hora · planifica turnos y reposición
              </div>
            </div>
          </div>

          <div style={{ overflowX:'auto', overflowY:'hidden', padding:'14px 18px 16px' }}>
            <div style={{ minWidth:520 }}>
              {(() => {
                // Horas mostradas en el eje X (expandibles si hay datos fuera de este rango)
                const todasHoras = horasPicoData.map(r=>r.hora);
                const minH = todasHoras.length ? Math.min(...todasHoras, 8) : 8;
                const maxH = todasHoras.length ? Math.max(...todasHoras, 20) : 20;
                const horas: number[] = [];
                for (let h=minH; h<=maxH; h++) horas.push(h);

                // DOW de PostgreSQL: 0=Dom,1=Lun,...,6=Sáb → mostrar Lun→Dom
                const diasConfig: { label:string; dow:number }[] = [
                  {label:'Lun',dow:1},{label:'Mar',dow:2},{label:'Mié',dow:3},
                  {label:'Jue',dow:4},{label:'Vie',dow:5},{label:'Sáb',dow:6},{label:'Dom',dow:0},
                ];

                // Construir mapa para lookup rápido: "dow-hora" → total
                const mapaTotal = new Map<string, number>();
                const mapaCount = new Map<string, number>();
                for (const r of horasPicoData) {
                  const k = `${r.diaSemana}-${r.hora}`;
                  mapaTotal.set(k, (mapaTotal.get(k)??0) + Number(r.total));
                  mapaCount.set(k, (mapaCount.get(k)??0) + Number(r.cantidad));
                }

                const hayDatos = horasPicoData.length > 0;
                // heat[dia][hora] = total de ingresos
                const heat = diasConfig.map(({dow}) =>
                  horas.map(h => mapaTotal.get(`${dow}-${h}`) ?? 0)
                );
                const maxHeat = Math.max(...heat.flat(), 1);

                return (
                  <>
                    <div style={{ display:'grid', gridTemplateColumns:`34px repeat(${horas.length},minmax(0,1fr))`, gap:3, marginBottom:4 }}>
                      <span />
                      {horas.map(h=>(
                        <span key={h} style={{ textAlign:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize:'.6rem', color:'var(--text-3)' }}>
                          {h}
                        </span>
                      ))}
                    </div>

                    {diasConfig.map(({label,dow},di)=>(
                      <div key={label} style={{ display:'grid', gridTemplateColumns:`34px repeat(${horas.length},minmax(0,1fr))`, gap:3, marginBottom:3 }}>
                        <span style={{ fontSize:'.72rem', fontWeight:600, color:'var(--text-3)', alignSelf:'center' }}>{label}</span>
                        {horas.map((h,hi)=>{
                          const val = heat[di][hi];
                          const count = mapaCount.get(`${dow}-${h}`) ?? 0;
                          const pct = hayDatos ? Math.round((val/maxHeat)*100) : 0;
                          const fmtTotal = val>0 ? `S/\u00A0${val.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '—';
                          return (
                            <span
                              key={`${label}-${h}`}
                              title={`${label} ${h}:00 · ${count} venta${count!==1?'s':''} · ${fmtTotal}`}
                              style={{
                                height:24, borderRadius:5,
                                background: !hayDatos || pct<8
                                  ? 'var(--surface-2)'
                                  : `color-mix(in oklab, var(--primary) ${Math.max(12,pct)}%, var(--surface))`,
                                cursor: count>0 ? 'default' : undefined,
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}

                    <div style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      gap:12, marginTop:10, fontSize:'.72rem', color:'var(--text-3)'
                    }}>
                      <span>{hayDatos ? `${horasPicoData.reduce((s,r)=>s+Number(r.cantidad),0)} transacciones en el período` : 'Sin ventas en el período'}</span>
                      <span style={{ display:'flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
                        Menos
                        <span style={{ width:12, height:12, borderRadius:3, background:'var(--surface-2)' }} />
                        <span style={{ width:12, height:12, borderRadius:3, background:'color-mix(in oklab, var(--primary) 35%, var(--surface))' }} />
                        <span style={{ width:12, height:12, borderRadius:3, background:'color-mix(in oklab, var(--primary) 70%, var(--surface))' }} />
                        <span style={{ width:12, height:12, borderRadius:3, background:'var(--primary)' }} />
                        Más
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Columna derecha: categorías + comprobantes */}
        <div style={{ display:'grid', gap:11 }}>
          <Panel title="Ventas por categoría" sub="Participación en ingresos">
            {data.porCategoria.length===0 ? (
              <div style={{ textAlign:'center', color:'var(--text-3)', padding:'30px 0' }}>Sin datos</div>
            ) : (
              <div style={{ display:'grid', gap:11 }}>
                {data.porCategoria.slice(0,7).map((c,i)=>{
                  const val=c.ingresosTotal??0;
                  const pct=totalIngresos>0?(val/totalIngresos)*100:0;
                  const maxCat=Math.max(...data.porCategoria.map(x=>x.ingresosTotal??0),1);
                  return (
                    <RankRow
                      key={c.categoria}
                      pos={i+1}
                      name={shortLabel(c.categoria,22)}
                      value={formatSoles(val)}
                      sub={`${pct.toFixed(0)}%`}
                      pct={(val/maxCat)*100}
                      color={COLORS[i%COLORS.length]}
                    />
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Comprobantes emitidos" sub="Tipo de documento · excluye anulados">
            {(() => {
              const TIPOS: { key:string; label:string }[] = [
                { key:'BOLETA',  label:'Boletas'  },
                { key:'FACTURA', label:'Facturas' },
              ];
              // También mostrar tipos inesperados que vengan del backend
              const extraTipos = comprobantesData
                .filter(c => !TIPOS.find(t => t.key === c.tipo))
                .map(c => ({ key: c.tipo, label: c.tipo.charAt(0) + c.tipo.slice(1).toLowerCase() }));
              const todos = [...TIPOS, ...extraTipos];
              const total = comprobantesData.reduce((s,c)=>s+Number(c.total),0);
              return (
                <div style={{ display:'grid', gridTemplateColumns:`repeat(${todos.length},minmax(0,1fr))`, gap:8 }}>
                  {todos.map(({key,label})=>{
                    const c = comprobantesData.find(x=>x.tipo===key);
                    const pct = total>0 && c ? Math.round((Number(c.total)/total)*100) : null;
                    return (
                      <div key={key} style={{ padding:'11px 12px', borderRadius:11, background:'var(--surface-3)', border:'1px solid var(--line-soft)' }}>
                        <div style={{ fontSize:'.72rem', color:'var(--text-3)' }}>{label}</div>
                        <div style={{ fontSize:'1.15rem', fontWeight:700, marginTop:3, fontVariantNumeric:'tabular-nums' }}>
                          {c ? formatNum(c.cantidad) : '—'}
                        </div>
                        <div style={{ fontSize:'.72rem', color:'var(--text-3)', marginTop:1 }}>
                          {c ? `${formatMoney(Number(c.total),2)}${pct!=null ? ` · ${pct}%` : ''}` : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── Productos tab ────────────────────────────────────────────────────────────

type CuadranteProducto = 'E' | 'V' | 'R' | 'X';

type ProductoAnalisis = VentasProductoDTO & {
  margen?: number | null;
  margenPct?: number | null;
  margenPorcentaje?: number | null;
  utilidad?: number | null;
  stock?: number | null;
  stockActual?: number | null;
  vpd?: number | null;
  rotacion?: string | null;
};

const CUADRANTES: {
  key: CuadranteProducto;
  label: string;
  desc: string;
  color: string;
  soft: string;
}[] = [
  { key:'E', label:'Estrellas', desc:'Venden mucho y dejan buen margen. Nunca los dejes sin stock.', color:'var(--ok)', soft:'var(--ok-soft)' },
  { key:'V', label:'Motor de volumen', desc:'Venden mucho con margen bajo. Traen clientes; negocia mejor costo.', color:'var(--primary)', soft:'var(--primary-soft)' },
  { key:'R', label:'Rentables de nicho', desc:'Buen margen pero poca salida. Dales visibilidad en mostrador.', color:'var(--warn)', soft:'var(--warn-soft)' },
  { key:'X', label:'A revisar', desc:'Poca venta y poco margen. Evalúa precio, promoción o retirarlos.', color:'var(--bad)', soft:'var(--bad-soft)' },
];

function ProductosTab({ loading, error, data, onRetry, esServicios=false, metrica, setMetrica }: {
  loading:boolean; error:string|null; data:VentasData|null; onRetry:()=>void;
  esServicios?:boolean; metrica:MetricaProductos; setMetrica:(m:MetricaProductos)=>void;
}) {
  const [cuadrante, setCuadrante] = useState<CuadranteProducto|null>(null);
  const [orden, setOrden] = useState<'MAS'|'MENOS'>('MAS');

  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  /*
   * El endpoint actual de productos devuelve ingresos y cantidad.
   * Si el backend ya expone margen/utilidad/stock, se utilizan automáticamente.
   * Si no los expone todavía, no inventamos esos valores: el ranking muestra "—"
   * y la clasificación usa ingresos por unidad como proxy de rentabilidad.
   */
  // No usamos useMemo aquí. ProductosTab puede pasar de loading=true a
  // loading=false cuando cambia el rango de fechas; mantener todos los hooks
  // fuera de los retornos condicionales evita el error de orden de hooks que
  // dejaba la pantalla en blanco.
  const productos = (() => {
    const map = new Map<number|string, ProductoAnalisis>();
    [...data.topProductos, ...data.menosProductos].forEach(p => {
      const key = p.productoId ?? p.nombre;
      if (!map.has(key)) map.set(key, p as ProductoAnalisis);
    });
    return Array.from(map.values());
  })();

  const getMarginPct = (p: ProductoAnalisis): number|null => {
    const raw = p as unknown as Record<string, unknown>;
    const utilidad = Number(raw['utilidad'] ?? raw['utilidadBruta'] ?? raw['ganancia'] ?? NaN);
    const ingresos = Number(p.ingresos ?? 0);

    const candidate = raw['margenPct'] ?? raw['margenPorcentaje'] ?? raw['marginPct'] ?? raw['margen'] ?? raw['margin'];
    if (candidate != null && Number.isFinite(Number(candidate))) {
      const n = Number(candidate);
      return Math.abs(n) <= 1 ? n * 100 : n;
    }

    if (Number.isFinite(utilidad) && ingresos > 0) {
      return (utilidad / ingresos) * 100;
    }

    return null;
  };

  const median = (values:number[]) => {
    if (!values.length) return 0;
    const sorted=[...values].sort((a,b)=>a-b);
    return sorted[Math.floor(sorted.length/2)];
  };

  const marginValues = productos
    .map(getMarginPct)
    .filter((v): v is number => v != null && Number.isFinite(v));

  const revenuePerUnit = productos.map(p => {
    const q = Number(p.cantidad ?? 0);
    return q > 0 ? Number(p.ingresos ?? 0) / q : 0;
  });

  const marginMedian = median(marginValues);
  const unitValueMedian = median(revenuePerUnit);

  const classify = (p:ProductoAnalisis):CuadranteProducto => {
    const volume = Number(p.ingresos ?? 0);
    const volumeMedian = median(productos.map(x => Number(x.ingresos ?? 0)));

    const margin = getMarginPct(p);
    // Cuando existe margen/utilidad, la clasificación sigue el cuadrante real.
    if (margin != null) {
      const highVolume = volume >= volumeMedian;
      const highMargin = margin >= marginMedian;
      return highVolume ? (highMargin ? 'E' : 'V') : (highMargin ? 'R' : 'X');
    }

    // Fallback visual mientras el endpoint no entregue margen:
    // ingresos altos = volumen alto; ingreso por unidad alto = proxy de rentabilidad.
    const highVolume = volume >= volumeMedian;
    const perUnit = revenuePerUnit[productos.indexOf(p)] ?? 0;
    const highProfitabilityProxy = perUnit >= unitValueMedian;
    return highVolume
      ? (highProfitabilityProxy ? 'E' : 'V')
      : (highProfitabilityProxy ? 'R' : 'X');
  };

  const enriched = productos.map(p => ({
    ...p,
    cuadrante: classify(p),
    margenPct: getMarginPct(p),
  }));

  const counts = CUADRANTES.reduce<Record<CuadranteProducto, number>>((acc, q) => {
    acc[q.key] = enriched.filter(p => p.cuadrante === q.key).length;
    return acc;
  }, { E:0, V:0, R:0, X:0 });

  const filtered = cuadrante
    ? enriched.filter(p => p.cuadrante === cuadrante)
    : enriched;

  const metricValue = (p:ProductoAnalisis) => {
    if (metrica === 'UNIDADES') return Number(p.cantidad ?? 0);
    return Number(p.ingresos ?? 0);
  };

  const ranking = [...filtered].sort((a,b) => {
    const diff = metricValue(b) - metricValue(a);
    return orden === 'MAS' ? diff : -diff;
  });

  const totalIngresos = productos.reduce((s,p)=>s + Number(p.ingresos ?? 0),0);

  const btnSegment = (active:boolean):React.CSSProperties => ({
    padding:'8px 14px',
    border:0,
    borderRadius:8,
    background:active?'var(--surface)':'transparent',
    color:active?'var(--text)':'var(--text-2)',
    fontSize:'.78rem',
    fontWeight:650,
    cursor:'pointer',
    boxShadow:active?'0 1px 3px rgba(16,24,40,.10)':'none',
    whiteSpace:'nowrap',
  });

  const formatMargin = (p:ProductoAnalisis) =>
    p.margenPct == null ? '—' : `${p.margenPct.toFixed(0)}%`;

  const getUtility = (p:ProductoAnalisis):number|null => {
    const raw=p as unknown as Record<string, unknown>;
    const u=raw['utilidad'] ?? raw['utilidadBruta'] ?? raw['ganancia'];
    return u != null && Number.isFinite(Number(u)) ? Number(u) : null;
  };

  const getRotation = (p:ProductoAnalisis):string => {
    const raw=p as unknown as Record<string, unknown>;
    if (raw['rotacion'] != null) return String(raw['rotacion']);

    const stock=Number(raw['stockActual'] ?? raw['stock'] ?? NaN);
    const vpd=Number(raw['vpd'] ?? NaN);
    if (Number.isFinite(stock) && Number.isFinite(vpd) && vpd>0) {
      const days=stock/vpd;
      return days < 15 ? 'Alta' : days < 45 ? 'Media' : 'Baja';
    }
    return '—';
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:11 }}>

      {/* ── 4 tarjetas de cuadrante ── */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(4,minmax(0,1fr))',
        gap:12,
      }}>
        {CUADRANTES.map(q => {
          const active=cuadrante===q.key;
          return (
            <button
              key={q.key}
              type="button"
              onClick={()=>setCuadrante(active ? null : q.key)}
              style={{
                ...card,
                padding:'15px 16px',
                textAlign:'left',
                cursor:'pointer',
                background:active?q.soft:'var(--surface)',
                border:`1.5px solid ${active?q.color:'var(--line)'}`,
                transition:'all .16s',
                minHeight:112,
              }}
            >
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <span style={{
                  display:'inline-flex',
                  padding:'4px 10px',
                  borderRadius:20,
                  background:q.soft,
                  color:q.color,
                  fontSize:'.72rem',
                  fontWeight:700,
                }}>
                  {q.label}
                </span>
                <strong style={{ fontSize:'1.36rem', lineHeight:1, color:'var(--text)' }}>
                  {counts[q.key]}
                </strong>
              </div>
              <div style={{
                marginTop:10,
                color:'var(--text-2)',
                fontSize:'.78rem',
                lineHeight:1.45,
              }}>
                {q.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Ranking ── */}
      <Panel
        title={esServicios?'Ranking de servicios':'Ranking de productos'}
        sub={`${cuadrante ? CUADRANTES.find(q=>q.key===cuadrante)?.label + ' · ' : ''}${ranking.length} ${esServicios?'servicios':'productos'} · haz clic en una tarjeta para filtrar`}
        action={
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ display:'flex', padding:4, borderRadius:10, background:'var(--surface-2)' }}>
              <button type="button" style={btnSegment(orden==='MAS')} onClick={()=>setOrden('MAS')}>Más vendidos</button>
              <button type="button" style={btnSegment(orden==='MENOS')} onClick={()=>setOrden('MENOS')}>Menos vendidos</button>
            </div>
            <div style={{ display:'flex', padding:4, borderRadius:10, background:'var(--surface-2)' }}>
              <button type="button" style={btnSegment(metrica==='UNIDADES')} onClick={()=>setMetrica('UNIDADES')}>Unidades</button>
              <button type="button" style={btnSegment(metrica==='INGRESOS')} onClick={()=>setMetrica('INGRESOS')}>Ingresos</button>
            </div>
          </div>
        }
      >
        {ranking.length===0 ? (
          <div style={{ textAlign:'center', color:'var(--text-3)', padding:'50px 0' }}>
            No hay productos para este filtro.
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.84rem', minWidth:920 }}>
              <thead>
                <tr style={{ background:'var(--surface-3)' }}>
                  {['#','Producto','Participación en ingresos','Unidades','Ingresos','Margen','Utilidad','Rotación'].map((h,i)=>(
                    <th key={h} style={{
                      padding:'10px 14px',
                      textAlign:i===0?'center':i>=3?'right':'left',
                      fontFamily:"'IBM Plex Mono',monospace",
                      fontSize:'.68rem',
                      fontWeight:650,
                      letterSpacing:'.04em',
                      textTransform:'uppercase',
                      color:'var(--text-3)',
                      whiteSpace:'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranking.map((p,i)=>{
                  const pct=totalIngresos>0?(Number(p.ingresos??0)/totalIngresos)*100:0;
                  const maxIngreso=Math.max(...productos.map(x=>Number(x.ingresos??0)),1);
                  const utilidad=getUtility(p);
                  const q=CUADRANTES.find(x=>x.key===p.cuadrante)!;

                  return (
                    <tr key={p.productoId} style={{
                      borderTop:'1px solid var(--line-soft)',
                      transition:'background .12s',
                    }}>
                      <td style={{ padding:'11px 10px', textAlign:'center' }}>
                        <span style={{
                          display:'inline-grid',
                          placeItems:'center',
                          width:28,
                          height:28,
                          borderRadius:'50%',
                          background:'var(--surface-2)',
                          color:'var(--text-2)',
                          fontWeight:700,
                          fontSize:'.78rem',
                        }}>
                          {i+1}
                        </span>
                      </td>

                      <td style={{ padding:'11px 14px', minWidth:210 }}>
                        <div style={{ fontWeight:700, color:'var(--text)' }}>{p.nombre}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3, fontSize:'.72rem', color:'var(--text-3)' }}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background:q.color }} />
                          {q.label}
                        </div>
                      </td>

                      <td style={{ padding:'11px 14px', minWidth:190 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                          <div style={{ flex:1, height:7, borderRadius:7, background:'var(--surface-2)', overflow:'hidden' }}>
                            <div style={{
                              width:`${Math.min(100,(Number(p.ingresos??0)/maxIngreso)*100)}%`,
                              height:'100%',
                              background:q.color,
                              borderRadius:7,
                            }} />
                          </div>
                          <span style={{ minWidth:38, fontSize:'.72rem', color:'var(--text-3)' }}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>

                      <td style={{ padding:'11px 14px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                        {formatNum(p.cantidad)}
                      </td>

                      <td style={{ padding:'11px 14px', textAlign:'right', fontWeight:700, fontVariantNumeric:'tabular-nums' }}>
                        {formatSoles(p.ingresos)}
                      </td>

                      <td style={{ padding:'11px 14px', textAlign:'right', fontWeight:700 }}>
                        {formatMargin(p)}
                      </td>

                      <td style={{ padding:'11px 14px', textAlign:'right', color:'var(--text-2)' }}>
                        {utilidad == null ? '—' : formatSoles(utilidad)}
                      </td>

                      <td style={{ padding:'11px 14px', textAlign:'right' }}>
                        <span style={{
                          display:'inline-flex',
                          padding:'4px 9px',
                          borderRadius:20,
                          background:getRotation(p)==='Alta'?'var(--ok-soft)':getRotation(p)==='Baja'?'var(--warn-soft)':'var(--surface-2)',
                          color:getRotation(p)==='Alta'?'var(--ok)':getRotation(p)==='Baja'?'var(--warn)':'var(--text-2)',
                          fontSize:'.72rem',
                          fontWeight:650,
                        }}>
                          {getRotation(p)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      </div>
  );
}

// ─── Vendedores tab ───────────────────────────────────────────────────────────

function VendedoresTab({ loading, error, data, onRetry, esServicios=false, horasPicoData=[] }: {
  loading:boolean; error:string|null; data:VentasData|null; onRetry:()=>void; esServicios?:boolean;
  horasPicoData?:HorasPicoItemDTO[];
}) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data||data.porVendedor.length===0) return <TabEmpty />;

  const vendedores=[...data.porVendedor].sort((a,b)=>(b.ingresosTotal??0)-(a.ingresosTotal??0));
  const totalIng=vendedores.reduce((s,v)=>s+(v.ingresosTotal??0),0);
  const avatarColors=['#3b47ef','#0f9d6e','#7147d4','#ec4899','#2563c9','#b7791f','#d63b3b'];

  // Estos campos son opcionales porque el endpoint actual puede no exponerlos.
  // Si el backend los devuelve, el rediseño los muestra automáticamente.
  const getUnidades=(v: Record<string, unknown>):number|null=>{
    const raw=v?.['unidades'] ?? v?.['unidadesCount'] ?? v?.['cantidadUnidades'] ?? v?.['totalUnidades'];
    return raw==null || !Number.isFinite(Number(raw)) ? null : Number(raw);
  };
  const getAnuladas=(v: Record<string, unknown>):number|null=>{
    const raw=v?.['anuladas'] ?? v?.['ventasAnuladas'] ?? v?.['canceladas'] ?? v?.['anuladasCount'];
    return raw==null || !Number.isFinite(Number(raw)) ? null : Number(raw);
  };

  /*
   * El API que alimenta VentasData actualmente no trae una serie horaria.
   * El bloque queda preparado para consumir data.ventasPorHora cuando exista
   * ese endpoint, pero no inventamos ventas por hora con datos diarios.
   */
  const ventasPorHora = (() => {
    const dataR = data as unknown as Record<string, unknown>;
    if (Array.isArray(dataR['ventasPorHora']) && (dataR['ventasPorHora'] as unknown[]).length > 0) {
      return (dataR['ventasPorHora'] as Record<string, unknown>[])
        .map(x=>({
          hora:Number(x['hora'] ?? x['hour'] ?? x['periodo']),
          ventas:Number(x['ventas'] ?? x['ventasCount'] ?? x['cantidad'] ?? 0),
          ingresos:Number(x['ingresos'] ?? x['ingresosTotal'] ?? 0),
        }))
        .filter(x=>Number.isFinite(x.hora) && x.hora>=0 && x.hora<=23)
        .sort((a,b)=>a.hora-b.hora);
    }
    if (horasPicoData.length > 0) {
      const byHora = new Map<number, {ventas:number; ingresos:number}>();
      horasPicoData.forEach(item => {
        const prev = byHora.get(item.hora) ?? { ventas:0, ingresos:0 };
        byHora.set(item.hora, {
          ventas: prev.ventas + Number(item.cantidad),
          ingresos: prev.ingresos + Number(item.total ?? 0),
        });
      });
      return Array.from(byHora.entries())
        .map(([hora, d]) => ({ hora, ...d }))
        .sort((a,b) => a.hora - b.hora);
    }
    return [];
  })();

  const horas=ventasPorHora.length>0
    ? ventasPorHora
    : Array.from({length:14},(_,i)=>({hora:i+8,ventas:0,ingresos:0}));
  const maxHora=Math.max(...horas.map(h=>h.ventas),1);
  const hayDatosHora=ventasPorHora.some(h=>h.ventas>0 || h.ingresos>0);

  const initials=(name:string)=>name
    .trim()
    .split(/\s+/)
    .map(w=>w[0]??'')
    .slice(0,2)
    .join('')
    .toUpperCase();

  const avatarStyle=(bg:string, small=false):React.CSSProperties=>({
    width:small?30:48,
    height:small?30:48,
    minWidth:small?30:48,
    minHeight:small?30:48,
    borderRadius:small?8:'50%',
    background:bg,
    display:'flex',
    alignItems:'center',
    justifyContent:'center',
    color:'#fff',
    fontWeight:700,
    fontSize:small?'.7rem':'.9rem',
    flexShrink:0,
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:11 }}>

      {/* ── Cards por vendedor: mismo lenguaje visual del rediseño ── */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(4,minmax(0,1fr))',
        gap:12,
        alignItems:'start',
      }}>
        {vendedores.slice(0,4).map((v,i)=>{
          const pct=totalIng>0?((v.ingresosTotal??0)/totalIng)*100:0;
          const bg=avatarColors[i%avatarColors.length];
          const anuladas=getAnuladas(v as unknown as Record<string, unknown>);
          return (
            <div key={v.vendedorId} style={{
              ...card,
              padding:'14px 16px 12px',
              height:'auto',
              minHeight:0,
              boxSizing:'border-box',
              overflow:'hidden',
              position:'relative',
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                  <div style={avatarStyle(bg)}>{initials(v.vendedorNombre)}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:'.88rem', fontWeight:700, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {v.vendedorNombre}
                    </div>
                    <div style={{ fontSize:'.72rem', color:'var(--text-3)', marginTop:1 }}>
                      {esServicios?'Asesor':'Vendedor'} · período seleccionado
                    </div>
                  </div>
                </div>

                <span style={{
                  flexShrink:0,
                  padding:'4px 7px',
                  borderRadius:8,
                  background:i===0?'var(--warn-soft)':'var(--surface-2)',
                  color:i===0?'var(--warn)':'var(--text-2)',
                  fontFamily:"'IBM Plex Mono',monospace",
                  fontSize:'.62rem',
                  fontWeight:700,
                }}>
                  #{i+1}
                </span>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12 }}>
                <div style={{
                  fontFamily:"'Inter',system-ui,sans-serif",
                  fontSize:'1.2rem',
                  lineHeight:1.05,
                  fontWeight:750,
                  letterSpacing:'-.035em',
                  color:'var(--text)',
                  fontVariantNumeric:'tabular-nums',
                  whiteSpace:'nowrap',
                }}>
                  {formatSoles(v.ingresosTotal)}
                </div>
                <span style={{
                  padding:'3px 7px',
                  borderRadius:20,
                  background:'var(--ok-soft)',
                  color:'var(--ok)',
                  fontSize:'.62rem',
                  fontWeight:700,
                  whiteSpace:'nowrap',
                }}>
                  {pct.toFixed(1).replace('.',',')}%
                </span>
              </div>

              <div style={{ height:5, borderRadius:5, background:'var(--surface-2)', overflow:'hidden', marginTop:6 }}>
                <div style={{ width:`${Math.max(0,Math.min(100,pct))}%`, height:'100%', background:bg, borderRadius:6 }} />
              </div>

              <div style={{ fontSize:'.68rem', color:'var(--text-3)', marginTop:4 }}>
                {pct.toFixed(0)}% de los ingresos
              </div>

              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(3,minmax(0,1fr))',
                marginTop:10,
                height:52,
                borderRadius:10,
                overflow:'hidden',
                background:'var(--surface-3)',
                border:'1px solid var(--line-soft)',
              }}>
                <div style={{ padding:'4px 8px' }}>
                  <div style={{ fontSize:'.62rem', color:'var(--text-3)' }}>{esServicios?'Servicios':'Ventas'}</div>
                  <div style={{ fontSize:'.78rem', fontWeight:700, marginTop:2, fontVariantNumeric:'tabular-nums' }}>{formatNum(v.ventasCount)}</div>
                </div>
                <div style={{ padding:'4px 8px', borderLeft:'1px solid var(--line-soft)' }}>
                  <div style={{ fontSize:'.62rem', color:'var(--text-3)' }}>Ticket</div>
                  <div style={{ fontSize:'.78rem', fontWeight:700, marginTop:2, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{formatSoles(v.ticketPromedio)}</div>
                </div>
                <div style={{ padding:'4px 8px', borderLeft:'1px solid var(--line-soft)' }}>
                  <div style={{ fontSize:'.62rem', color:'var(--text-3)' }}>Anuladas</div>
                  <div style={{ fontSize:'.78rem', fontWeight:700, marginTop:2, color:anuladas!=null&&anuladas>0?'var(--bad)':'var(--text)', fontVariantNumeric:'tabular-nums' }}>{anuladas==null?'—':formatNum(anuladas)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Si existen más de 4 vendedores, mantenemos el resto debajo ── */}
      {vendedores.length>4 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12 }}>
          {vendedores.slice(4).map((v,i)=>{
            const realIndex=i+4;
            const pct=totalIng>0?((v.ingresosTotal??0)/totalIng)*100:0;
            const bg=avatarColors[realIndex%avatarColors.length];
            return (
              <div key={v.vendedorId} style={{ ...card, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={avatarStyle(bg)}>{initials(v.vendedorNombre)}</div>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:'.86rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{v.vendedorNombre}</div>
                    <div style={{ fontSize:'.72rem', color:'var(--text-3)' }}>{formatNum(v.ventasCount)} {esServicios?'servicios':'ventas'}</div>
                  </div>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'.68rem', color:'var(--text-3)' }}>#{realIndex+1}</span>
                </div>
                <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8 }}>
                  <strong style={{ fontSize:'1.05rem' }}>{formatSoles(v.ingresosTotal)}</strong>
                  <span style={{ fontSize:'.7rem', color:'var(--text-3)' }}>{pct.toFixed(1)}%</span>
                </div>
                <div style={{ height:5, borderRadius:5, background:'var(--surface-2)', overflow:'hidden', marginTop:6 }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:bg, borderRadius:5 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Parte inferior: detalle + ventas por hora ── */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'minmax(0,1.55fr) minmax(360px,1fr)',
        gap:14,
        alignItems:'start',
      }}>
        <Panel title={esServicios?'Detalle por asesor':'Detalle por vendedor'} sub={`${esServicios?'Comparativo completo de asesores':'Comparativo completo de vendedores'} · período seleccionado`}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.84rem' }}>
              <thead>
                <tr style={{ background:'var(--surface-3)' }}>
                  {[
                    esServicios?'Asesor':'Vendedor',
                    esServicios?'Servicios':'Ventas',
                    'Unidades',
                    'Ingresos',
                    'Ticket prom.',
                    'Uds / venta',
                  ].map(h=>(
                    <th key={h} style={{ padding:'9px 14px', textAlign:h===(esServicios?'Asesor':'Vendedor')?'left':'right', fontFamily:"'IBM Plex Mono',monospace", fontSize:'.68rem', fontWeight:650, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--text-3)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendedores.map((v,i)=>{
                  const bg=avatarColors[i%avatarColors.length];
                  const unidades=getUnidades(v as unknown as Record<string, unknown>);
                  const udsVenta=unidades!=null && (v.ventasCount??0)>0 ? unidades/(v.ventasCount??1) : null;
                  return (
                    <tr key={v.vendedorId} style={{ borderTop:'1px solid var(--line-soft)' }}>
                      <td style={{ padding:'10px 14px 10px 4px', whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                          <div style={avatarStyle(bg,true)}>{initials(v.vendedorNombre)}</div>
                          <span style={{ fontWeight:600 }}>{v.vendedorNombre}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-2)' }}>{formatNum(v.ventasCount)}</td>
                      <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-2)' }}>{unidades==null?'—':formatNum(unidades)}</td>
                      <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:"'IBM Plex Mono',monospace", color:'var(--ok)', fontWeight:700 }}>{formatSoles(v.ingresosTotal)}</td>
                      <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-2)' }}>{formatSoles(v.ticketPromedio)}</td>
                      <td style={{ padding:'10px 18px 10px 14px', textAlign:'right', fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-2)' }}>{udsVenta==null?'—':udsVenta.toFixed(1).replace('.',',')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div style={{ ...card, minWidth:0, overflow:'hidden' }}>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:10, padding:'16px 18px 0' }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:'.95rem', fontWeight:650, letterSpacing:'-.01em', color:'var(--text)' }}>
                Ventas por hora del día
              </div>
              <div style={{ fontSize:'.78rem', color:'var(--text-3)', marginTop:3 }}>
                Todos los vendedores
              </div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:170, padding:'16px 18px 0' }}>
            {horas.map((h,i)=>{
              const pct=(h.ventas/maxHora)*100;
              const isPeak=hayDatosHora && h.ventas===Math.max(...ventasPorHora.map(x=>x.ventas));
              return (
                <div key={`${h.hora}-${i}`} title={hayDatosHora ? `${h.hora}:00 · ${formatNum(h.ventas)} ${esServicios?'servicios':'ventas'}` : 'Datos horarios no disponibles'} style={{ flex:1, height:'100%', display:'flex', alignItems:'flex-end' }}>
                  <div style={{
                    width:'100%',
                    height:hayDatosHora?`${Math.max(4,pct)}%`:'4%',
                    minHeight:hayDatosHora?3:2,
                    borderRadius:'5px 5px 2px 2px',
                    background:isPeak?'var(--primary)':'color-mix(in oklab, var(--primary) 42%, var(--surface))',
                  }} />
                </div>
              );
            })}
          </div>

          <div style={{ display:'flex', gap:5, padding:'6px 18px 16px' }}>
            {horas.map((h,i)=>(
              <span key={`eje-${h.hora}-${i}`} style={{ flex:1, textAlign:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize:'.6rem', color:'var(--text-3)' }}>
                {h.hora}
              </span>
            ))}
          </div>

          {!hayDatosHora && (
            <div style={{ padding:'0 18px 14px', fontSize:'.7rem', color:'var(--text-3)', textAlign:'center' }}>
              Sin ventas en el período seleccionado para mostrar distribución horaria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Clientes tab ─────────────────────────────────────────────────────────────

function ClientesTab({ loading, error, data, onRetry, esServicios=false }: {
  loading:boolean; error:string|null; data:ClienteReporteDTO[]|null; onRetry:()=>void; esServicios?:boolean;
}) {
  const [segmento, setSegmento] = useState<'todos'|'frecuentes'|'nuevos'|'ocasionales'|'riesgo'>('todos');
  const [nowMs] = useState(() => Date.now());

  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data||data.length===0) return <TabEmpty />;

  const totalComprado=data.reduce((s,c)=>s+(c.totalComprado??0),0);
  const totalVentas=data.reduce((s,c)=>s+(c.ventasCount??0),0);
  const ticketProm=totalVentas>0?totalComprado/totalVentas:0;

  const diasDesdeUltimaCompra = (c: ClienteReporteDTO) => {
    if (!c.ultimaCompra) return Number.POSITIVE_INFINITY;
    const fecha = new Date(c.ultimaCompra);
    if (Number.isNaN(fecha.getTime())) return Number.POSITIVE_INFINITY;
    return Math.max(0, Math.floor((nowMs - fecha.getTime()) / 86400000));
  };

  const esRiesgo = (c: ClienteReporteDTO) => diasDesdeUltimaCompra(c) > 30;
  const esFrecuente = (c: ClienteReporteDTO) => !esRiesgo(c) && (c.ventasCount??0) >= 4;
  const esNuevo = (c: ClienteReporteDTO) => !esRiesgo(c) && (c.ventasCount??0) === 1;

  const segmentos = [
    { key:'frecuentes' as const, label:'Frecuentes', desc:'4+ compras en el período', count:data.filter(esFrecuente).length, color:'var(--ok)', soft:'var(--ok-soft)' },
    { key:'nuevos' as const, label:'Nuevos', desc:'Primera compra en el período', count:data.filter(esNuevo).length, color:'var(--primary)', soft:'var(--primary-soft)' },
    { key:'ocasionales' as const, label:'Ocasionales', desc:'1 a 3 compras', count:data.filter(c=>!esRiesgo(c) && (c.ventasCount??0)>=1 && (c.ventasCount??0)<=3).length, color:'var(--text-3)', soft:'var(--surface-2)' },
    { key:'riesgo' as const, label:'En riesgo', desc:'Sin comprar hace más de 30 días', count:data.filter(esRiesgo).length, color:'var(--warn)', soft:'var(--warn-soft)' },
  ];

  const clientesFiltrados = segmento==='todos' ? data : data.filter(c =>
    segmento==='frecuentes' ? esFrecuente(c) :
    segmento==='nuevos' ? esNuevo(c) :
    segmento==='ocasionales' ? (!esRiesgo(c) && (c.ventasCount??0)>=1 && (c.ventasCount??0)<=3) :
    esRiesgo(c)
  );

  const ranking = [...clientesFiltrados].sort((a,b)=>(b.totalComprado??0)-(a.totalComprado??0));
  const recurrencia = data.length>0
    ? Math.round((data.filter(c=>(c.ventasCount??0)>1).length/data.length)*100)
    : 0;

  const initials = (name:string) => name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('') || 'CL';
  const getDocumento = (c: ClienteReporteDTO): string => {
    const raw = c as unknown as Record<string, unknown>;
    return String(raw['ruc'] ?? raw['dni'] ?? raw['documento'] ?? raw['numeroDocumento'] ?? '');
  };
  const getUltimaCompraLabel = (c: ClienteReporteDTO) => {
    if (!c.ultimaCompra) return '—';
    const dias = diasDesdeUltimaCompra(c);
    if (dias===0) return 'Hoy';
    if (dias===1) return 'Ayer';
    if (dias<=30) return `Hace ${dias} días`;
    return `Hace ${dias} días`;
  };

  // Valores de tendencia solo se dibujan como recurso visual cuando el API no
  // entrega comparación contra período anterior. No se usan para cálculos.
  const spark = (seed:number) => [seed,seed*.94,seed*.99,seed*.91,seed*.88,seed*.84,seed*.9,seed*.87,seed*.96,seed*.92,seed*1.02,seed*.98].map(Number);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12 }}>
        <KpiCard
          label="Clientes que compraron"
          value={formatNum(data.length)}
          sub="Con DNI o RUC registrado"
          sparkVals={spark(Math.max(1,data.length))}
          sparkColor="var(--primary)"
        />
        <KpiCard
          label="Clientes nuevos"
          value={formatNum(segmentos.find(s=>s.key==='nuevos')?.count ?? 0)}
          sub="Primera compra en el período"
          sparkVals={spark(Math.max(1,segmentos.find(s=>s.key==='nuevos')?.count ?? 1))}
          sparkColor="var(--primary)"
        />
        <KpiCard
          label="Recurrencia"
          value={`${recurrencia}%`}
          sub="Volvieron a comprar"
          sparkVals={spark(Math.max(1,recurrencia))}
          sparkColor="var(--ok)"
        />
        <KpiCard
          label="Ticket cliente registrado"
          value={formatSoles(ticketProm)}
          sub="vs público general"
          sparkVals={spark(Math.max(1,ticketProm))}
          sparkColor="var(--primary)"
        />
      </div>

      {/* ── Segmentos + Top clientes ── */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(390px,.78fr) minmax(0,1.72fr)', gap:14, alignItems:'start' }}>
        <Panel title="Segmentos de clientes" sub="Según frecuencia y última compra">
          <div style={{ display:'grid', gap:10 }}>
            {segmentos.map(seg=>{
              const active=segmento===seg.key;
              return (
                <button
                  key={seg.key}
                  type="button"
                  onClick={()=>setSegmento(active?'todos':seg.key)}
                  style={{
                    width:'100%',
                    minHeight:68,
                    textAlign:'left',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'space-between',
                    gap:12,
                    padding:'11px 14px',
                    border:`1px solid ${active?'var(--primary)':'var(--line)'}`,
                    borderRadius:12,
                    background:active?'var(--primary-soft)':'var(--surface)',
                    cursor:'pointer',
                    transition:'all .15s ease',
                  }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                    <span style={{ width:12, height:12, borderRadius:'50%', background:seg.color, flexShrink:0 }} />
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'.88rem', fontWeight:700, color:'var(--text)' }}>{seg.label}</div>
                      <div style={{ fontSize:'.75rem', color:'var(--text-3)', marginTop:2 }}>{seg.desc}</div>
                    </div>
                  </div>
                  <strong style={{ fontSize:'1.05rem', fontVariantNumeric:'tabular-nums', color:'var(--text)', flexShrink:0 }}>{seg.count}</strong>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop:12, padding:'12px 14px', borderRadius:11, background:'var(--surface-2)', color:'var(--text-2)', fontSize:'.75rem', lineHeight:1.5 }}>
            El reporte solo considera clientes identificados con DNI o RUC. Registrar el documento en el POS mejora la recurrencia y permite identificar quién vuelve a comprar.
          </div>
        </Panel>

        <Panel title={esServicios?'Top clientes por servicios':'Top clientes'} sub="Ordenados por monto comprado">
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', minWidth:820, borderCollapse:'collapse', fontSize:'.78rem' }}>
              <thead>
                <tr style={{ background:'var(--surface-3)' }}>
                  {['#','Cliente',esServicios?'Servicios':'Compras','Total','Ticket prom.',esServicios?'Última visita':'Última compra','Segmento'].map((h,i)=>(
                    <th key={h} style={{
                      padding:'9px 10px',
                      textAlign:i===0?'center':i>=2?'right':'left',
                      fontFamily:"'IBM Plex Mono',monospace",
                      fontSize:'.62rem',
                      fontWeight:650,
                      letterSpacing:'.04em',
                      textTransform:'uppercase',
                      color:'var(--text-3)',
                      whiteSpace:'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranking.slice(0,10).map((c,i)=>{
                  const compras=Number(c.ventasCount??0);
                  const seg = esRiesgo(c)
                    ? {label:'En riesgo',color:'var(--warn)',soft:'var(--warn-soft)'}
                    : compras>=4
                      ? {label:'Frecuente',color:'var(--ok)',soft:'var(--ok-soft)'}
                      : compras===1
                        ? {label:'Nuevo',color:'var(--primary)',soft:'var(--primary-soft)'}
                        : {label:'Ocasional',color:'var(--text-3)',soft:'var(--surface-2)'};
                  return (
                    <tr key={c.clienteId} style={{ borderTop:'1px solid var(--line-soft)' }}>
                      <td style={{ padding:'9px 8px', textAlign:'center' }}>
                        <span style={{ display:'inline-grid', placeItems:'center', width:28, height:28, borderRadius:8, background:i===0?'var(--primary)':'var(--surface-2)', color:i===0?'#fff':'var(--text-2)', fontWeight:700, fontSize:'.72rem' }}>{i+1}</span>
                      </td>
                      <td style={{ padding:'9px 10px', minWidth:210 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                          <span style={{ width:36, height:36, borderRadius:9, display:'inline-flex', alignItems:'center', justifyContent:'center', background:'var(--primary-soft)', color:'var(--primary)', fontSize:'.68rem', fontWeight:700, flexShrink:0 }}>{initials(c.clienteNombre)}</span>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.clienteNombre}</div>
                            {getDocumento(c) && <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'.68rem', color:'var(--text-3)', marginTop:2 }}>{getDocumento(c)}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'9px 10px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{formatNum(c.ventasCount)}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:700, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{formatSoles(c.totalComprado)}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right', color:'var(--text-2)', fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{formatSoles(c.ticketPromedio)}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right', color:esRiesgo(c)?'var(--warn)':'var(--text-2)', whiteSpace:'nowrap', fontWeight:esRiesgo(c)?650:400 }}>{getUltimaCompraLabel(c)}</td>
                      <td style={{ padding:'9px 10px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 8px', borderRadius:14, background:seg.soft, color:seg.color, fontSize:'.7rem', fontWeight:650, whiteSpace:'nowrap' }}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background:seg.color }} />{seg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ranking.length===0 && <div style={{ padding:'30px 0', textAlign:'center', color:'var(--text-3)' }}>No hay clientes en este segmento para el período seleccionado.</div>}
          </div>
        </Panel>
      </div>

      </div>
  );
}


// ─── Inventario tab ───────────────────────────────────────────────────────────

function InventarioTab({ loading, error, data, onRetry, esServicios=false, mermasLoading=false, valorizacionStock }: {
  loading:boolean; error:string|null; data:InventarioData|null; onRetry:()=>void;
  esServicios?:boolean; mermasLoading?:boolean; valorizacionStock?:number|null;
}) {
  const [coverageMode,setCoverageMode]=useState<'criticos'|'todos'>('criticos');
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  const totalStock=data.abc.reduce((s,p)=>s+(p.ingresos??0),0);
  const avgCoverage=data.cobertura.length
    ? data.cobertura.reduce((s,p)=>s+(p.diasCobertura??0),0)/data.cobertura.filter(p=>p.diasCobertura!=null).length
    : 0;
  const rotation=avgCoverage>0 ? 30/avgCoverage : 0;
  const venc=data.vencimientos;
  const clasesABC={
    A:data.abc.filter(p=>p.clasificacion==='A'),
    B:data.abc.filter(p=>p.clasificacion==='B'),
    C:data.abc.filter(p=>p.clasificacion==='C'),
  };
  const abcColors={A:'var(--ok)',B:'var(--primary)',C:'var(--text-2)'};

  const coberturaCritica=data.cobertura.filter(p=>(p.diasCobertura??999)<10);
  const coberturaRows=coverageMode==='criticos' ? coberturaCritica : data.cobertura;

  const coverageAction=(dias:number|null|undefined) => {
    if (dias==null) return { label:'Sin dato', color:'var(--text-3)', bg:'var(--surface-2)' };
    if (dias<4) return { label:'Reponer ya', color:'var(--bad)', bg:'var(--bad-soft)' };
    if (dias<10) return { label:'Pedir esta semana', color:'var(--warn)', bg:'var(--warn-soft)' };
    return { label:'Stock saludable', color:'var(--ok)', bg:'var(--ok-soft)' };
  };

  const coverageBarWidth=(dias:number|null|undefined) => {
    if (dias==null) return 0;
    return Math.max(4,Math.min((dias/30)*100,100));
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
      {/* KPI cards — rediseño */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12 }}>
        <KpiCard
          label="Inventario valorizado"
          value={valorizacionStock != null ? formatSolesRound(valorizacionStock) : '—'}
          sub={`Al costo · ${formatNum(data.abc.length)} productos`}
          sparkVals={data.abc.slice(0,16).map(p=>p.ingresos??0)}
          sparkColor="var(--primary)"
        />
        <KpiCard
          label="Rotación"
          value={rotation>0 ? `${rotation.toFixed(1).replace('.',',')}x` : '—'}
          sub="Veces que rota al mes"
          sparkVals={data.cobertura.slice(0,16).map(p=>p.diasCobertura??0)}
          sparkColor="var(--ok)"
        />
        <KpiCard
          label="Cobertura promedio"
          value={avgCoverage>0 ? `${Math.round(avgCoverage)} días` : '—'}
          sub="Al ritmo de venta actual"
          sparkVals={data.cobertura.slice(0,16).map(p=>p.diasCobertura??0)}
          sparkColor="var(--primary)"
        />
        <KpiCard
          label="Mermas"
          value={venc ? formatSolesRound(venc.capitalVencido) : '—'}
          sub="Vencimientos, daños y pérdidas"
          color={venc && venc.capitalVencido>0 ? 'var(--bad)' : 'var(--text)'}
          sparkVals={data.mermas.slice(0,16).map(m=>m.cantidad??0)}
          sparkColor="var(--bad)"
        />
      </div>

      {/* ABC + cobertura */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,.95fr) minmax(0,1.55fr)', gap:14, alignItems:'start' }}>
        <Panel title="Análisis ABC" sub="Qué productos generan tus ingresos">
          <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
            {(['A','B','C'] as const).map(cls=>{
              const items=clasesABC[cls];
              const value=items.reduce((s,p)=>s+(p.ingresos??0),0);
              const pct=totalStock>0 ? (value/totalStock)*100 : 0;
              const productPct=data.abc.length ? (items.length/data.abc.length)*100 : 0;
              return (
                <div key={cls} style={{ display:'grid', gridTemplateColumns:'44px 1fr', gap:12, alignItems:'center' }}>
                  <div style={{ width:44, height:44, borderRadius:12, background: cls==='A'?'var(--ok-soft)':cls==='B'?'var(--primary-soft)':'var(--surface-2)', color:abcColors[cls], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.05rem', fontWeight:750 }}>{cls}</div>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8, fontSize:'.78rem', fontWeight:650 }}>
                      <span>{items.length} productos · {Math.round(productPct)}%</span>
                      <span>{Math.round(pct)}% ingresos</span>
                    </div>
                    <div style={{ height:7, marginTop:6, borderRadius:7, background:'var(--surface-2)', overflow:'hidden' }}>
                      <div style={{ width:`${Math.max(2,Math.min(pct,100))}%`, height:'100%', borderRadius:7, background:abcColors[cls] }} />
                    </div>
                    <div style={{ fontSize:'.68rem', color:'var(--text-3)', marginTop:4 }}>
                      {cls==='A' ? 'Cuidar siempre: priorizar compra y exhibición' : cls==='B' ? 'Reponer con normalidad' : 'Comprar solo lo necesario'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Cobertura de stock"
          sub="Días que alcanza el stock al ritmo de venta actual"
          action={
            <div style={{ display:'flex', background:'var(--surface-2)', borderRadius:9, padding:2 }}>
              {(['criticos','todos'] as const).map(mode=>(
                <button key={mode} onClick={()=>setCoverageMode(mode)} style={{
                  border:'1px solid '+(coverageMode===mode?'var(--line)':'transparent'),
                  background:coverageMode===mode?'var(--surface)':'transparent',
                  color:coverageMode===mode?'var(--text)':'var(--text-2)',
                  borderRadius:8, padding:'6px 11px', fontSize:'.76rem', fontWeight:650,
                  boxShadow:coverageMode===mode?'var(--shadow)':'none', cursor:'pointer'
                }}>{mode==='criticos'?'Críticos':'Todos'}</button>
              ))}
            </div>
          }
        >
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.78rem' }}>
              <thead>
                <tr style={{ background:'var(--surface-3)' }}>
                  {['Producto','Stock','Venta / día','Cobertura','Acción'].map(h=>(
                    <th key={h} style={{ padding:'9px 10px', textAlign:h==='Producto'?'left':'right', fontFamily:"'IBM Plex Mono',monospace", fontSize:'.68rem', fontWeight:650, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--text-3)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coberturaRows.slice(0,8).map(p=>{
                  const dias=p.diasCobertura;
                  const action=coverageAction(dias);
                  return (
                    <tr key={p.productoId} style={{ borderTop:'1px solid var(--line-soft)' }}>
                      <td style={{ padding:'10px', fontWeight:650, whiteSpace:'nowrap' }}>{p.nombre}</td>
                      <td style={{ padding:'10px', textAlign:'right', fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-2)' }}>{formatNum(p.stockActual)}</td>
                      <td style={{ padding:'10px', textAlign:'right', fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-2)' }}>{p.promedioSalidasDiarias!=null?p.promedioSalidasDiarias.toFixed(1).replace('.',','):'—'}</td>
                      <td style={{ padding:'10px', minWidth:155 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, borderRadius:6, background:'var(--surface-2)', overflow:'hidden' }}>
                            <div style={{ width:`${coverageBarWidth(dias)}%`, height:'100%', borderRadius:6, background:action.color }} />
                          </div>
                          <span style={{ minWidth:42, textAlign:'right', color:action.color, fontWeight:700, whiteSpace:'nowrap' }}>{dias!=null?`${Math.round(dias)} días`:'—'}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px', textAlign:'right' }}>
                        <span style={{ display:'inline-block', padding:'4px 9px', borderRadius:20, background:action.bg, color:action.color, fontSize:'.72rem', fontWeight:700, whiteSpace:'nowrap' }}>{action.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {coberturaRows.length===0 && <div style={{ padding:'25px 10px', textAlign:'center', color:'var(--text-3)' }}>No hay productos en este filtro.</div>}
          </div>
        </Panel>
      </div>

      {/* Productos sin movimiento + vencimientos y mermas */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:14, alignItems:'start' }}>
        <Panel title="Productos sin movimiento" sub="Más de 30 días sin salida · capital inmovilizado">
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.78rem' }}>
              <tbody>
                {data.slowMovers.slice(0,7).map(p=>(
                  <tr key={p.productoId} style={{ borderTop:'1px solid var(--line-soft)' }}>
                    <td style={{ padding:'10px 0', fontWeight:650 }}>{p.nombre}</td>
                    <td style={{ padding:'10px 8px', textAlign:'right', color:'var(--text-3)', whiteSpace:'nowrap' }}>{formatNum(p.diasSinSalida)} días</td>
                    <td style={{ padding:'10px 0 10px 10px', textAlign:'right', color:'var(--warn)', fontFamily:"'IBM Plex Mono',monospace", fontWeight:700, whiteSpace:'nowrap' }}>{formatSolesRound(p.costoTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.slowMovers.length===0 && <div style={{ padding:'25px 0', color:'var(--text-3)', textAlign:'center' }}>No hay productos sin movimiento.</div>}
          </div>
        </Panel>

        <Panel title="Vencimientos y mermas" sub="Valor en riesgo y pérdidas del período">
          {!esServicios && mermasLoading ? <TabLoading /> : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, marginBottom:10 }}>
                <div style={{ background:'var(--warn-soft)', border:'1px solid var(--warn-line)', borderRadius:12, padding:'12px 14px' }}>
                  <div style={{ fontSize:'.72rem', color:'var(--text-2)' }}>Vence en 30 días</div>
                  <div style={{ fontSize:'1.35rem', fontWeight:750, color:'var(--warn)', marginTop:3 }}>{venc ? formatSolesRound(venc.capitalVencido) : '—'}</div>
                  <div style={{ fontSize:'.72rem', color:'var(--text-3)', marginTop:2 }}>{venc?.lotesVencidos??0} lotes</div>
                </div>
                <div style={{ background:'var(--bad-soft)', border:'1px solid var(--line)', borderRadius:12, padding:'12px 14px' }}>
                  <div style={{ fontSize:'.72rem', color:'var(--text-2)' }}>Mermas del período</div>
                  <div style={{ fontSize:'1.35rem', fontWeight:750, color:'var(--bad)', marginTop:3 }}>{data.mermas.length}</div>
                  <div style={{ fontSize:'.72rem', color:'var(--text-3)', marginTop:2 }}>Registros de baja</div>
                </div>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.78rem' }}>
                  <tbody>
                    {data.mermas.slice(0,5).map(m=>(
                      <tr key={m.id} style={{ borderTop:'1px solid var(--line-soft)' }}>
                        <td style={{ padding:'9px 0', fontWeight:650 }}>{m.productoNombre}</td>
                        <td style={{ padding:'9px 8px', color:'var(--text-3)', whiteSpace:'nowrap' }}>{m.lote??'—'}</td>
                        <td style={{ padding:'9px 8px' }}><span style={{ padding:'3px 7px', borderRadius:15, background:'var(--bad-soft)', color:'var(--bad)', fontWeight:700 }}>{m.motivo}</span></td>
                        <td style={{ padding:'9px 0', textAlign:'right', fontWeight:700 }}>{m.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!mermasLoading && data.mermas.length===0 && <div style={{ padding:'25px 0', color:'var(--text-3)', textAlign:'center' }}>Sin mermas en el período.</div>}
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* Detalle de mermas: se conserva debajo para no perder información existente */}
      {!esServicios && data.mermas.length>5 && (
        <Panel title="Detalle de bajas de lotes vencidos (Mermas)" sub={`${data.mermas.length} registro(s) en el período`}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.78rem' }}>
              <thead><tr style={{ background:'var(--surface-3)' }}>
                {['Fecha','Producto','Lote','Cant.','Motivo','Observaciones'].map(h=><th key={h} style={{ padding:'9px 10px', textAlign:'left', fontFamily:"'IBM Plex Mono',monospace", fontSize:'.68rem', color:'var(--text-3)', textTransform:'uppercase' }}>{h}</th>)}
              </tr></thead>
              <tbody>{data.mermas.map(m=><tr key={m.id} style={{ borderTop:'1px solid var(--line-soft)' }}>
                <td style={{ padding:'9px 10px', color:'var(--text-3)' }}>{new Date(m.fecha).toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'})}</td>
                <td style={{ padding:'9px 10px', fontWeight:650 }}>{m.productoNombre}</td>
                <td style={{ padding:'9px 10px', color:'var(--text-3)' }}>{m.lote??'—'}</td>
                <td style={{ padding:'9px 10px', color:'var(--bad)', fontWeight:700 }}>{m.cantidad}</td>
                <td style={{ padding:'9px 10px' }}>{m.motivo}</td>
                <td style={{ padding:'9px 10px', color:'var(--text-3)' }}>{m.observaciones??'—'}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

// ─── Financiero tab ───────────────────────────────────────────────────────────

function FinancieroTab({ loading, error, data, previousData, historico=[], onRetry, comisiones=[] }: {
  loading:boolean; error:string|null; data:FinancieroDTO|null; previousData?:FinancieroDTO|null;
  historico?:FinancieroDTO[]; onRetry:()=>void; comisiones?:ComisionDTO[];
}) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  const totalComisiones=comisiones.reduce((s,c)=>s+c.monto,0);
  const esDealer=comisiones.length>0||totalComisiones>0;
  const utilidadNeta=(data.utilidadNeta??0)+totalComisiones;

  const prevComisiones=0;
  const previousUtilidad=(previousData?.utilidadNeta??0)+prevComisiones;
  const pctChange=(current:number|null|undefined, previous:number|null|undefined): number|null => {
    if (current==null || previous==null || previous===0) return null;
    return ((current-previous)/Math.abs(previous))*100;
  };
  const deltaLabel=(v:number|null): string|null => v==null?null:`${v>=0?'▲':'▼'} ${Math.abs(v).toFixed(1)}%`;

  const deltaIngresos=pctChange(data.ingresosVentas, previousData?.ingresosVentas);
  const deltaCosto=pctChange(data.costoVentas, previousData?.costoVentas);
  const deltaGastos=pctChange(data.gastosTotales, previousData?.gastosTotales);
  const deltaUtilidad=pctChange(utilidadNeta, previousData?previousUtilidad:null);

  const history=historico.length>0?historico: [data];
  const historyRows=history.map((x,i)=>({
    label:formatMonthShort(x.desde || data.desde),
    ingresos:x.ingresosVentas??0,
    costos:(x.costoVentas??0)+(x.gastosTotales??0),
    utilidad:(x.utilidadNeta??0)+(i===history.length-1?totalComisiones:0),
  }));
  const maxHistory=Math.max(...historyRows.flatMap(x=>[x.ingresos,x.costos,x.utilidad]),1);


  return (
    <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
      {/* Cards del rediseño */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12 }}>
        <KpiCard
          label="Ingresos"
          value={formatSolesRound(data.ingresosVentas)}
          delta={deltaLabel(deltaIngresos)}
          deltaTone={deltaIngresos==null?'neutral':deltaIngresos>=0?'positive':'negative'}
          sub="Ventas netas de anulaciones"
          color="var(--text)"
          sparkVals={historyRows.map(x=>x.ingresos)}
          sparkColor="var(--primary)"
        />
        <KpiCard
          label="Costo de ventas"
          value={formatSolesRound(data.costoVentas)}
          delta={deltaLabel(deltaCosto)}
          deltaTone={deltaCosto==null?'neutral':deltaCosto>0?'negative':'positive'}
          sub={data.ingresosVentas>0?`${((data.costoVentas??0)/data.ingresosVentas*100).toFixed(0)}% de los ingresos`:undefined}
          color="var(--text)"
          sparkVals={historyRows.map(x=>x.costos)}
          sparkColor="var(--bad)"
        />
        <KpiCard
          label="Gastos operativos"
          value={formatSolesRound(data.gastosTotales)}
          delta={deltaLabel(deltaGastos)}
          deltaTone={deltaGastos==null?'neutral':deltaGastos>0?'negative':'positive'}
          sub="Sueldos, alquiler, servicios..."
          color="var(--text)"
          sparkVals={historico.map(x=>x.gastosTotales??0)}
          sparkColor="var(--warn)"
        />
        <KpiCard
          label="Utilidad neta"
          value={formatSolesRound(utilidadNeta)}
          delta={deltaLabel(deltaUtilidad)}
          deltaTone={deltaUtilidad==null?'neutral':deltaUtilidad>=0?'positive':'negative'}
          sub={data.margenNeto!=null?`Margen neto ${formatPct(data.margenNeto,0)}`:undefined}
          color="var(--ok)"
          sparkVals={historyRows.map(x=>x.utilidad)}
          sparkColor="var(--ok)"
        />
      </div>

      {/* Estado de resultados + gastos por categoría */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'minmax(0,1.08fr) minmax(0,.92fr)',
        gap:16,
        alignItems:'start',
      }}>
        {/* Estado de resultados — layout del rediseño */}
        <div style={{
          ...card,
          overflow:'hidden',
          borderRadius:16,
        }}>
          <div style={{ padding:'20px 22px 0' }}>
            <div style={{ fontSize:'16px', fontWeight:700, letterSpacing:'-.02em', color:'var(--text)' }}>
              Estado de resultados
            </div>
            <div style={{ fontSize:'13px', color:'var(--text-3)', marginTop:4 }}>
              Este mes · {data.desde} → {data.hasta}
            </div>
          </div>

          <div style={{ padding:'12px 22px 0' }}>
            {(() => {
              const ingreso = Math.max(data.ingresosVentas ?? 0, 0);
              const costo = Math.max(data.costoVentas ?? 0, 0);
              const margen = Math.max(data.utilidadBruta ?? (ingreso - costo), 0);
              const gastos = Math.max(data.gastosTotales ?? 0, 0);
              const mermas = 0;
              const pct = (value:number) => ingreso > 0 ? Math.max(0, Math.min(100, (value / ingreso) * 100)) : 0;

              const rows = [
                { label:esDealer?'Ingresos por servicios':'Ingresos por ventas', value:ingreso, percent:100, color:'var(--primary)', bold:true, indent:false },
                { label:'Costo de ventas', value:costo, percent:pct(costo), color:'var(--bad)', bold:false, indent:true, sub:`${pct(costo).toFixed(0)}%` },
                { label:'Margen bruto', value:margen, percent:pct(margen), color:'var(--primary)', bold:true, indent:false, separator:true, sub:`${pct(margen).toFixed(0)}%` },
                { label:`Gastos operativos${data.gastosCount!=null?` (${data.gastosCount} registros)`:''}`, value:gastos, percent:pct(gastos), color:'var(--bad)', bold:false, indent:true, sub:`${pct(gastos).toFixed(0)}%` },
                { label:'Mermas', value:mermas, percent:pct(mermas), color:'var(--bad)', bold:false, indent:true, sub:'0%' },
              ];

              return rows.map((row, i) => (
                <div key={`${row.label}-${i}`} style={{
                  display:'grid',
                  gridTemplateColumns:'180px minmax(120px,1fr) 105px 38px',
                  alignItems:'center',
                  columnGap:12,
                  minHeight:i===0?42:40,
                  padding:'0 0',
                  borderTop:row.separator?'1px solid var(--line)':undefined,
                  marginTop:row.separator?2:0,
                }}>
                  <div style={{
                    fontSize:'14px',
                    fontWeight:row.bold?700:400,
                    color:row.bold?'var(--text)':'var(--text-2)',
                    paddingLeft:row.indent?16:0,
                    whiteSpace:'nowrap',
                    overflow:'hidden',
                    textOverflow:'ellipsis',
                  }}>
                    {row.label}
                  </div>

                  <div style={{ height:16, display:'flex', alignItems:'center' }}>
                    <div style={{
                      width:`${Math.max(row.percent===0?0:1,row.percent)}%`,
                      height:'100%',
                      background:row.color,
                      borderRadius:5,
                      minWidth:row.percent>0?1:0,
                    }} />
                  </div>

                  <div style={{
                    textAlign:'right',
                    fontFamily:"'IBM Plex Mono',monospace",
                    fontSize:'15px',
                    fontWeight:700,
                    color:row.color,
                    fontVariantNumeric:'tabular-nums',
                    whiteSpace:'nowrap',
                  }}>
                    {formatSolesRound(row.value)}
                  </div>

                  <div style={{
                    textAlign:'right',
                    fontSize:'12px',
                    color:'var(--text-3)',
                    whiteSpace:'nowrap',
                  }}>
                    {row.sub ?? `${row.percent.toFixed(0)}%`}
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Utilidad neta */}
          <div style={{
            marginTop:0,
            padding:'8px 22px',
            background:'var(--ok-soft)',
            display:'grid',
            gridTemplateColumns:'180px minmax(120px,1fr) 105px 38px',
            alignItems:'center',
            columnGap:12,
            minHeight:42,
          }}>
            {(() => {
              const ingreso=Math.max(data.ingresosVentas??0,0);
              const utilidad=Math.max(utilidadNeta,0);
              const pct=ingreso>0?Math.max(0,Math.min(100,(utilidad/ingreso)*100)):0;
              return <>
                <span style={{ fontSize:'14px', fontWeight:700, color:'var(--text)' }}>Utilidad neta</span>
                <div style={{ height:16, display:'flex', alignItems:'center' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:'var(--ok)', borderRadius:5 }} />
                </div>
                <span style={{ textAlign:'right', fontFamily:"'IBM Plex Mono',monospace", fontSize:'15px', fontWeight:700, color:'var(--ok)', whiteSpace:'nowrap' }}>
                  {formatSolesRound(utilidad)}
                </span>
                <span style={{ textAlign:'right', fontSize:'12px', color:'var(--text-3)' }}>
                  {data.margenNeto!=null?formatPct(data.margenNeto,0):`${pct.toFixed(0)}%`}
                </span>
              </>;
            })()}
          </div>
        </div>

        {/* Gastos por categoría — layout y colores del rediseño */}
        <div style={{
          ...card,
          borderRadius:16,
          overflow:'hidden',
        }}>
          <div style={{ padding:'20px 22px 0' }}>
            <div style={{ fontSize:'16px', fontWeight:700, letterSpacing:'-.02em', color:'var(--text)' }}>
              Gastos por categoría
            </div>
            <div style={{ fontSize:'13px', color:'var(--text-3)', marginTop:4 }}>
              Gastos operativos del período
            </div>
          </div>

          <div style={{ padding:'12px 22px 16px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
              {data.gastosPorCategoria.slice(0,8).map((g,i)=>{
                const pct=g.porcentaje??((g.monto??0)/(data.gastosTotales||1))*100;
                const expenseColors=['#3b82f6','#8b5cf6','#eab308','#ec4899','#06b6d4','#94a3b8','#10b981','#f97316'];
                const expenseColor=expenseColors[i%expenseColors.length];
                return (
                  <div key={g.categoria}>
                    <div style={{ display:'grid', gridTemplateColumns:'30px minmax(0,1fr) auto', alignItems:'center', columnGap:10 }}>
                      <span style={{
                        width:28,
                        height:28,
                        borderRadius:8,
                        background:i===0?'#e8f0fd':'#f1f3f7',
                        color:i===0?'#2563c9':'#667085',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        fontSize:'13px',
                        fontWeight:700,
                      }}>{i+1}</span>
                      <span style={{
                        minWidth:0,
                        fontSize:'14px',
                        fontWeight:600,
                        color:'var(--text)',
                        whiteSpace:'nowrap',
                        overflow:'hidden',
                        textOverflow:'ellipsis',
                      }}>{GASTO_LABELS[g.categoria]??g.categoria}</span>
                      <span style={{
                        fontFamily:"'IBM Plex Mono',monospace",
                        fontSize:'14px',
                        fontWeight:700,
                        color:'var(--text)',
                        whiteSpace:'nowrap',
                      }}>{formatSolesRound(g.monto)}</span>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'30px minmax(0,1fr) 38px', alignItems:'center', columnGap:10, marginTop:6 }}>
                      <span />
                      <div style={{ height:6, borderRadius:6, background:'#eef1f5', overflow:'hidden' }}>
                        <div style={{ width:`${Math.max(pct>0?1:0,Math.min(pct,100))}%`, height:'100%', background:expenseColor, borderRadius:6 }} />
                      </div>
                      <span style={{ textAlign:'right', fontSize:'12px', color:'var(--text-3)' }}>{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Evolución de los últimos seis meses */}
      <Panel title="Ingresos vs. gastos" sub="Últimos 6 meses" action={
        <div style={{ display:'flex', alignItems:'center', gap:14, fontSize:'.72rem', color:'var(--text-2)' }}>
          <span><i style={{display:'inline-block',width:10,height:10,borderRadius:3,background:'var(--primary)',marginRight:5}} />Ingresos</span>
          <span><i style={{display:'inline-block',width:10,height:10,borderRadius:3,background:'var(--bad)',marginRight:5}} />Costo + gastos</span>
          <span><i style={{display:'inline-block',width:10,height:10,borderRadius:3,background:'var(--ok)',marginRight:5}} />Utilidad</span>
        </div>
      }>
        <div style={{ height:260, display:'flex', alignItems:'stretch', gap:18, padding:'8px 6px 0' }}>
          {historyRows.map((row,i)=>(
            <div key={`${row.label}-${i}`} style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center' }}>
              <div style={{ width:'100%', height:210, display:'flex', alignItems:'flex-end', justifyContent:'center', gap:6 }}>
                {[['ingresos','var(--primary)'],['costos','var(--bad)'],['utilidad','var(--ok)']].map(([key,color])=>{
                  const val=row[key as 'ingresos'|'costos'|'utilidad'];
                  return <div key={key} title={`${key}: ${formatSolesRound(val)}`} style={{ width:'22%', maxWidth:30, height:`${Math.max(4,(val/maxHistory)*100)}%`, background:color, borderRadius:'5px 5px 0 0', opacity:i===historyRows.length-1 ? .98 : .9 }} />;
                })}
              </div>
              <div style={{ marginTop:8, fontSize:'.76rem', color:'var(--text-2)' }}>{row.label}</div>
              <div style={{ marginTop:2, fontFamily:"'IBM Plex Mono',monospace", fontSize:'.72rem', fontWeight:600, color:'var(--ok)' }}>{formatSolesRound(row.ingresos)}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ─── Compras tab ──────────────────────────────────────────────────────────────

function ComprasTab({ loading, error, data, onRetry }: {
  loading:boolean; error:string|null; data:ComprasPorProveedorDTO[]|null; onRetry:()=>void;
}) {
  if (loading) return <TabLoading />;
  if (error) return <TabError message={error} onRetry={onRetry} />;
  if (!data) return <TabEmpty />;

  const totalMonto=data.reduce((s,p)=>s+(p.montoEstimado??0),0);
  const totalUnidades=data.reduce((s,p)=>s+(p.unidadesRecibidas??0),0);
  const totalRecepciones=data.reduce((s,p)=>s+(p.recepcionesCount??0),0);
  const maxMonto=Math.max(...data.map(p=>p.montoEstimado??0),1);
  const ticketProm=totalRecepciones>0?totalMonto/totalRecepciones:0;

  // Mini líneas decorativas: no representan una tendencia temporal; solo mantienen
  // la proporción visual del rediseño cuando el endpoint no devuelve histórico.
  const spark=[1,1.02,1.01,1.03,1.02,1.04,1.03,1.05];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* KPI cards — misma composición visual del rediseño */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12 }}>
        <KpiCard
          label="Total comprado"
          value={formatSolesRound(totalMonto)}
          sub="Recepciones confirmadas"
          sparkVals={spark}
          sparkColor="var(--primary)"
        />
        <KpiCard
          label="Recepciones"
          value={formatNum(totalRecepciones)}
          sub={formatSolesRound(ticketProm)+' promedio por recepción'}
          sparkVals={[1,1.02,1.04,1.03,1.05,1.04,1.06,1.08]}
          sparkColor="var(--primary)"
        />
        <KpiCard
          label="Unidades recibidas"
          value={formatNum(totalUnidades)}
          sub="Todos los productos"
          sparkVals={[1.05,1.02,1.03,1.01,1.04,1.02,1.05,1.04]}
          sparkColor="var(--primary)"
        />
        <KpiCard
          label="Compras / ventas"
          value="—"
          sub="Sin datos de ventas en este reporte"
          sparkVals={[1.02,1,1.01,1.02,1.01,1.03,1.02,1.03]}
          sparkColor="var(--primary)"
        />
      </div>

      {/* Ranking + detalle */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,.9fr) minmax(0,1.45fr)', gap:16, alignItems:'start' }}>
        <Panel title="Compras por proveedor" sub="Monto recibido en el período">
          {data.length===0 ? (
            <div style={{ textAlign:'center', color:'var(--text-3)', padding:'30px 0' }}>Sin datos</div>
          ) : (
            <div style={{ display:'grid', gap:13 }}>
              {data.slice(0,10).map((p,i)=>{
                const pct=maxMonto>0?((p.montoEstimado??0)/maxMonto)*100:0;
                const totalPct=totalMonto>0?((p.montoEstimado??0)/totalMonto)*100:0;
                return (
                  <div key={p.proveedorId}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{
                        width:26,height:26,borderRadius:8,flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        background:i===0?'var(--primary)':'var(--surface-2)',
                        color:i===0?'#fff':'var(--text-2)',
                        fontSize:'.72rem',fontWeight:700
                      }}>{i+1}</span>
                      <span style={{ flex:1,minWidth:0,fontSize:'.84rem',fontWeight:650,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                        {p.proveedorNombre}
                      </span>
                      <span style={{ fontSize:'.84rem',fontWeight:700,fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap' }}>
                        {formatSolesRound(p.montoEstimado)}
                      </span>
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'26px minmax(0,1fr) 42px',alignItems:'center',gap:10,marginTop:6 }}>
                      <span />
                      <div style={{ height:6,borderRadius:6,background:'#eef1f5',overflow:'hidden' }}>
                        <div style={{ width:`${Math.max(pct>0?1:0,Math.min(pct,100))}%`,height:'100%',background:'var(--primary)',borderRadius:6 }} />
                      </div>
                      <span style={{ textAlign:'right',fontSize:'.72rem',color:'var(--text-3)' }}>{totalPct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Detalle por proveedor" sub="Recepciones confirmadas">
          {data.length===0 ? (
            <div style={{ textAlign:'center',color:'var(--text-3)',padding:'48px 0' }}>Sin datos</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'.78rem' }}>
                <thead>
                  <tr style={{ background:'var(--surface-3)' }}>
                    {['Proveedor','Recepciones','Unidades','Monto','% del total','Última'].map((h,i)=>(
                      <th key={h} style={{
                        padding:'9px 10px',
                        textAlign:i===0?'left':'right',
                        fontFamily:"'IBM Plex Mono',monospace",
                        fontSize:'.68rem',fontWeight:650,letterSpacing:'.04em',
                        textTransform:'uppercase',color:'var(--text-3)',whiteSpace:'nowrap'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((p)=>{
                    const pct=totalMonto>0?((p.montoEstimado??0)/totalMonto)*100:0;
                    return (
                      <tr key={p.proveedorId} style={{ borderTop:'1px solid var(--line-soft)' }}>
                        <td style={{ padding:'10px 10px',fontWeight:600,whiteSpace:'nowrap' }}>{p.proveedorNombre}</td>
                        <td style={{ padding:'9px 10px',textAlign:'right',fontVariantNumeric:'tabular-nums' }}>{formatNum(p.recepcionesCount)}</td>
                        <td style={{ padding:'9px 10px',textAlign:'right',fontVariantNumeric:'tabular-nums',color:'var(--text-2)' }}>{formatNum(p.unidadesRecibidas)}</td>
                        <td style={{ padding:'9px 10px',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,whiteSpace:'nowrap' }}>{formatSolesRound(p.montoEstimado)}</td>
                        <td style={{ padding:'9px 10px',textAlign:'right',color:'var(--text-2)',whiteSpace:'nowrap' }}>{pct.toFixed(0)}%</td>
                        <td style={{ padding:'9px 10px',textAlign:'right',color:'var(--text-2)',whiteSpace:'nowrap' }}>—</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ReportesPage() {
  const { canView, puede } = usePermissions();
  const { config: negocioConfig } = useTenantConfigStore();
  const esServicios = negocioConfig?.rubro==='EMPRESA_SERVICIOS';
  const hasAccess = canView('REPORTES');
  const puedeVerComisiones = puede('VER_COMISION');

  const { sucursalActual, sucursales, loaded: sucursalLoaded } = useSucursalStore();
  const isMultiLocal = sucursales.length>1;
  const sucursalId = isMultiLocal&&sucursalActual?sucursalActual.id:undefined;

  const [desde, setDesde] = useState<string>(startOfMonth());
  const [hasta, setHasta] = useState<string>(todayStr());
  const [activeTab, setActiveTab] = useState<TabId>('resumen');

  const [resumenLoading, setResumenLoading] = useState(false);
  const [resumenError, setResumenError] = useState<string|null>(null);
  const [resumenData, setResumenData] = useState<ReportesResumenDTO|null>(null);
  const [resumenAnteriorData, setResumenAnteriorData] = useState<ReportesResumenDTO|null>(null);

  const [ventasLoading, setVentasLoading] = useState(false);
  const [ventasError, setVentasError] = useState<string|null>(null);
  const [ventasData, setVentasData] = useState<VentasData|null>(null);
  const [agrupacion, setAgrupacion] = useState<AgrupacionTendencia>('DIA');
  const [metrica, setMetrica] = useState<MetricaProductos>('UNIDADES');

  const [inventarioLoading, setInventarioLoading] = useState(false);
  const [inventarioError, setInventarioError] = useState<string|null>(null);
  const [inventarioData, setInventarioData] = useState<InventarioData|null>(null);
  const [mermasLoading, setMermasLoading] = useState(false);

  const [comprasLoading, setComprasLoading] = useState(false);
  const [comprasError, setComprasError] = useState<string|null>(null);
  const [comprasData, setComprasData] = useState<ComprasPorProveedorDTO[]|null>(null);

  const [financieroLoading, setFinancieroLoading] = useState(false);
  const [financieroError, setFinancieroError] = useState<string|null>(null);
  const [financieroData, setFinancieroData] = useState<FinancieroDTO|null>(null);
  const [financieroAnteriorData, setFinancieroAnteriorData] = useState<FinancieroDTO|null>(null);
  const [financieroHistorico, setFinancieroHistorico] = useState<FinancieroDTO[]>([]);

  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesError, setClientesError] = useState<string|null>(null);
  const [clientesData, setClientesData] = useState<ClienteReporteDTO[]|null>(null);

  const [comisionesData, setComisionesData] = useState<ComisionDTO[]>([]);
  const [horasPicoData, setHorasPicoData] = useState<HorasPicoItemDTO[]>([]);
  const [comprobantesData, setComprobantesData] = useState<ComprobanteTipoResumenDTO[]>([]);

  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Inject fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel='stylesheet';
    link.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // Inject spin animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const tokens = LIGHT;

  const getPeriodoAnterior = (d:string, h:string) => {
    const inicio = new Date(`${d}T00:00:00`);
    const fin = new Date(`${h}T00:00:00`);
    const iso = (x:Date) => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
    // Año que empieza en Jan 1 → mismo período del año anterior
    if (inicio.getMonth() === 0 && inicio.getDate() === 1) {
      const ai = new Date(inicio); ai.setFullYear(ai.getFullYear()-1);
      const af = new Date(fin);    af.setFullYear(af.getFullYear()-1);
      return { desde:iso(ai), hasta:iso(af) };
    }
    // Período que empieza el día 1 de un mes → mismos días del mes anterior
    if (inicio.getDate() === 1) {
      const ai = new Date(inicio); ai.setMonth(ai.getMonth()-1);
      const af = new Date(fin);    af.setMonth(af.getMonth()-1);
      return { desde:iso(ai), hasta:iso(af) };
    }
    // Rango arbitrario → misma cantidad de días hacia atrás
    const dias = Math.max(1, Math.round((fin.getTime()-inicio.getTime())/86400000)+1);
    const anteriorFin = new Date(inicio); anteriorFin.setDate(anteriorFin.getDate()-1);
    const anteriorInicio = new Date(anteriorFin); anteriorInicio.setDate(anteriorInicio.getDate()-(dias-1));
    return { desde:iso(anteriorInicio), hasta:iso(anteriorFin) };
  };

  const fetchResumen = async (d=desde, h=hasta) => {
    try {
      setResumenLoading(true);
      setResumenError(null);
      const anterior = getPeriodoAnterior(d,h);
      const [actual, previo] = await Promise.all([
        reportesService.getResumen(d, h, sucursalId),
        reportesService.getResumen(anterior.desde, anterior.hasta, sucursalId),
      ]);
      setResumenData(actual);
      setResumenAnteriorData(previo);
    } catch (err) {
      setResumenError('No se pudo cargar el resumen.');
      notify.fromError(err,'No se pudo cargar el resumen del período.');
    } finally {
      setResumenLoading(false);
    }
  };

  const fetchVentas = async (d=desde, h=hasta, ag=agrupacion) => {
    try { setVentasLoading(true); setVentasError(null);
      const [tendencia, porVendedor, porCategoria, porMetodoPago, topProductos, menosProductos] = await Promise.all([
        reportesService.getVentasTendencia(d, h, ag, sucursalId),
        reportesService.getVentasPorVendedor(d, h, 20, sucursalId),
        reportesService.getVentasPorCategoria(d, h, 20, sucursalId),
        reportesService.getVentasPorMetodoPago(d, h, sucursalId),
        // Los productos se obtienen una sola vez por unidades. La métrica
        // Unidades/Ingresos se cambia localmente en ProductosTab para evitar
        // depender de que el backend acepte ambos valores de métrica.
        reportesService.getVentasProductos(d, h, 50, 'MAS', 'UNIDADES', sucursalId),
        reportesService.getVentasProductos(d, h, 50, 'MENOS', 'UNIDADES', sucursalId),
      ]);
      setVentasData({ tendencia, porVendedor, porCategoria, porMetodoPago, topProductos, menosProductos });
    } catch (err) { setVentasError('No se pudieron cargar los datos de ventas.'); notify.fromError(err,'No se pudieron cargar los datos de ventas.');
    } finally { setVentasLoading(false); }
  };

  const fetchInventario = async (d=desde, h=hasta) => {
    try { setInventarioLoading(true); setMermasLoading(true); setInventarioError(null);
      const [abc, slowMovers, cobertura, vencimientos, mermas] = await Promise.all([
        reportesService.getInventarioABC(d, h, 50, sucursalId),
        reportesService.getInventarioSlowMovers(30),
        reportesService.getInventarioCobertura(d, h, 20, sucursalId),
        reportesService.getVencimientosRiesgo().catch(()=>null),
        reportesService.getMermas(d, h).catch(()=>[]),
      ]);
      setInventarioData({ abc, slowMovers, cobertura, vencimientos, mermas });
    } catch (err) { setInventarioError('No se pudieron cargar los datos de inventario.'); notify.fromError(err,'No se pudieron cargar los datos de inventario.');
    } finally { setInventarioLoading(false); setMermasLoading(false); }
  };

  const fetchCompras = async (d=desde, h=hasta) => {
    try { setComprasLoading(true); setComprasError(null);
      setComprasData(await reportesService.getComprasPorProveedor(d, h, 20, sucursalId));
    } catch (err) { setComprasError('No se pudieron cargar los datos de compras.'); notify.fromError(err,'No se pudieron cargar los datos de compras.');
    } finally { setComprasLoading(false); }
  };

  const fetchFinanciero = async (d=desde, h=hasta) => {
    try {
      setFinancieroLoading(true);
      setFinancieroError(null);
      const anterior=getPeriodoAnterior(d,h);
      const meses=Array.from({length:6},(_,i)=>monthRangeEndingAt(h,i-5));
      meses[5]={desde:meses[5].desde,hasta:h};
      const [actual, previo, ...historico] = await Promise.all([
        reportesService.getFinanciero(d,h,sucursalId),
        reportesService.getFinanciero(anterior.desde,anterior.hasta,sucursalId).catch(()=>null),
        ...meses.map(m=>reportesService.getFinanciero(m.desde, m.hasta, sucursalId).catch(()=>null)),
      ]);
      setFinancieroData(actual);
      setFinancieroAnteriorData(previo);
      setFinancieroHistorico(historico.filter((x): x is FinancieroDTO => !!x));
    } catch (err) {
      setFinancieroError('No se pudieron cargar los datos financieros.');
      notify.fromError(err,'No se pudieron cargar los datos financieros.');
    } finally { setFinancieroLoading(false); }
  };

  const fetchClientes = async (d=desde, h=hasta) => {
    try { setClientesLoading(true); setClientesError(null);
      setClientesData(await reportesService.getTopClientes(d, h, 30, sucursalId));
    } catch (err) { setClientesError('No se pudieron cargar los datos de clientes.'); notify.fromError(err,'No se pudieron cargar los datos de clientes.');
    } finally { setClientesLoading(false); }
  };

  const fetchComisiones = async () => {
    if (!puedeVerComisiones) return;
    try { setComisionesData(await comisionService.listar(sucursalId)); }
    catch { /* silencioso */ }
  };

  const fetchHorasPico = async (d=desde, h=hasta) => {
    try {
      setHorasPicoData(await reportesService.getHorasPico(d, h, sucursalId));
    } catch { /* silencioso */ }
  };

  const fetchComprobantes = async (d=desde, h=hasta) => {
    try {
      setComprobantesData(await reportesService.getComprobantesPorTipo(d, h, sucursalId));
    } catch { /* silencioso */ }
  };

  const handleActualizar = (d=desde, h=hasta) => {
    if (!d||!h) { notify.fromError(null,'Selecciona un rango de fechas'); return; }
    if (d>h) { notify.fromError(null,'La fecha "Desde" no puede ser mayor a "Hasta"'); return; }
    fetchResumen(d,h); fetchVentas(d,h,agrupacion); fetchInventario(d,h);
    fetchCompras(d,h); fetchFinanciero(d,h); fetchClientes(d,h); fetchComisiones();
    fetchHorasPico(d,h);
    fetchComprobantes(d,h);
  };

  useEffect(() => {
    if (!sucursalLoaded) return;
    handleActualizar(desde, hasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalLoaded, sucursalActual?.id]);

  const handleQuickRange = (r: typeof QUICK_RANGES[0]) => {
    const d=r.desde(); const h=r.hasta();
    setDesde(d); setHasta(h); handleActualizar(d,h);
  };

  const handleAgrupacion = (ag: AgrupacionTendencia) => {
    setAgrupacion(ag);
    if (ventasData) fetchVentas(desde,hasta,ag);
  };

  const handleMetrica = (met: MetricaProductos) => {
    // La métrica del tab Productos es solo de presentación.
    // No volvemos a consultar el backend: el ranking ya tiene cantidad e ingresos.
    // Esto evita que el endpoint falle cuando recibe METRICA=INGRESOS.
    setMetrica(met);
  };

  const handleExportExcel = async () => {
    if (!resumenData&&!ventasData&&!inventarioData&&!comprasData) { notify.fromError(null,'No hay datos para exportar.'); return; }
    setExporting(true);
    try {
      exportarExcel(desde,hasta,resumenData,ventasData?{porVendedor:ventasData.porVendedor,porCategoria:ventasData.porCategoria,porMetodoPago:ventasData.porMetodoPago,topProductos:ventasData.topProductos,menosProductos:ventasData.menosProductos}:null,inventarioData,comprasData,financieroData,clientesData,negocioConfig);
      notify.success('Excel descargado');
    } catch (err) { notify.fromError(err,'No se pudo exportar el Excel.');
    } finally { setExporting(false); }
  };

  const handleExportPDF = async () => {
    if (!resumenData&&!ventasData&&!inventarioData&&!comprasData) { notify.fromError(null,'No hay datos para exportar.'); return; }
    setExporting(true);
    try {
      exportarPDF(desde,hasta,resumenData,ventasData?{porVendedor:ventasData.porVendedor,porCategoria:ventasData.porCategoria,porMetodoPago:ventasData.porMetodoPago,topProductos:ventasData.topProductos,menosProductos:ventasData.menosProductos}:null,inventarioData,comprasData,financieroData,clientesData,negocioConfig);
      notify.success('PDF descargado');
    } catch (err) { notify.fromError(err,'No se pudo exportar el PDF.');
    } finally { setExporting(false); }
  };

  const isAnyLoading=resumenLoading||ventasLoading||inventarioLoading||comprasLoading||financieroLoading||clientesLoading;


  if (!hasAccess) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', color:'var(--text-3)' }}>
        <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ marginBottom:16 }}>
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <div style={{ fontSize:'1rem', fontWeight:600 }}>Sin acceso</div>
        <div style={{ fontSize:'.85rem', marginTop:4 }}>No tienes permisos para ver el módulo de Reportes.</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", WebkitFontSmoothing:'antialiased', ...(tokens as unknown as React.CSSProperties) }}>
      <div style={{ maxWidth:1400 }}>

          {/* Page header */}
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', justifyContent:'space-between', gap:16 }}>
            <div style={{ minWidth:0 }}>
              <h1 style={{ fontSize:'1.6rem', fontWeight:700, letterSpacing:'-.028em', margin:0, color:'var(--text)' }}>Reportes</h1>
              <p style={{ fontSize:'.865rem', color:'var(--text-3)', margin:'7px 0 0' }}>Indicadores clave para la toma de decisiones</p>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {/* Export dropdown */}
              <div style={{ position:'relative' }}>
                <button onClick={()=>setExportOpen(o=>!o)} disabled={exporting||isAnyLoading}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'0 14px', height:36, borderRadius:9, border:'1px solid var(--line)', background:'var(--surface)', color:'var(--text-2)', cursor:'pointer', fontSize:'.84rem', fontWeight:600, opacity:(exporting||isAnyLoading)?0.6:1 }}>
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
                  Exportar
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity:.7 }}><path d="m6 9 6 6 6-6"/></svg>
                </button>
                {exportOpen && (
                  <>
                    <div onClick={()=>setExportOpen(false)} style={{ position:'fixed', inset:0, zIndex:40 }} />
                    <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:41, width:220, background:'var(--surface)', border:'1px solid var(--line)', borderRadius:14, boxShadow:'0 22px 50px -22px rgba(0,0,0,.45)', padding:6 }}>
                      <div style={{ padding:'6px 10px 8px', fontSize:'.72rem', color:'var(--text-3)' }}>Exportar datos del período</div>
                      <button onClick={()=>{setExportOpen(false);handleExportExcel();}}
                        style={{ width:'100%', display:'flex', alignItems:'center', gap:10, height:38, padding:'0 10px', fontFamily:'Inter,sans-serif', fontSize:'.845rem', fontWeight:500, color:'var(--text)', background:'transparent', border:0, borderRadius:8, cursor:'pointer' }}>
                        <span style={{ width:8, height:8, borderRadius:2, background:'var(--ok)', flexShrink:0 }} />Excel (.xlsx)
                      </button>
                      <button onClick={()=>{setExportOpen(false);handleExportPDF();}}
                        style={{ width:'100%', display:'flex', alignItems:'center', gap:10, height:38, padding:'0 10px', fontFamily:'Inter,sans-serif', fontSize:'.845rem', fontWeight:500, color:'var(--text)', background:'transparent', border:0, borderRadius:8, cursor:'pointer' }}>
                        <span style={{ width:8, height:8, borderRadius:2, background:'var(--bad)', flexShrink:0 }} />PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:10, marginTop:18 }}>
            {/* Period presets */}
            <div style={{ display:'flex', gap:3, padding:3, background:'var(--surface)', border:'1px solid var(--line)', borderRadius:11, maxWidth:'100%', overflowX:'auto' }}>
              {QUICK_RANGES.map(r=>{
                const isActive=desde===r.desde()&&hasta===r.hasta();
                return (
                  <button key={r.label} onClick={()=>handleQuickRange(r)}
                    style={{ padding:'0 10px', height:34, borderRadius:8, border:'none', cursor:'pointer', fontSize:'.8rem', fontWeight:600, whiteSpace:'nowrap', flexShrink:0,
                      background:isActive?'var(--primary)':'transparent',
                      color:isActive?'#fff':'var(--text-2)' }}>
                    {r.label}
                  </button>
                );
              })}
            </div>

            {/* Date range chip */}
            <div style={{ display:'flex', alignItems:'center', gap:8, height:40, padding:'0 12px', flexShrink:0, background:'var(--surface)', border:'1px solid var(--line)', borderRadius:11, fontFamily:"'IBM Plex Mono',monospace", fontSize:'.78rem', color:'var(--text-2)', whiteSpace:'nowrap' }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
              <input type="date" value={desde} onChange={e=>setDesde(e.target.value)}
                style={{ border:'none', background:'transparent', fontFamily:"'IBM Plex Mono',monospace", fontSize:'.78rem', color:'var(--text-2)', outline:'none', width:108 }} />
              <span style={{ color:'var(--line-soft)' }}>–</span>
              <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)}
                style={{ border:'none', background:'transparent', fontFamily:"'IBM Plex Mono',monospace", fontSize:'.78rem', color:'var(--text-2)', outline:'none', width:108 }} />
            </div>

          </div>

          {/* Tab bar */}
          <div style={{ display:'flex', gap:4, marginTop:18, borderBottom:'1px solid var(--line)', overflowX:'auto', overflowY:'hidden' }}>
            {TABS.map(([id,label,iconPath])=>{
              const isActive=activeTab===id;
              return (
                <button key={id} onClick={()=>setActiveTab(id)}
                  style={{ padding:'0 14px', height:40, display:'flex', alignItems:'center', gap:7, fontSize:'.855rem', fontWeight:600, cursor:'pointer', border:'none', borderBottom:`2px solid ${isActive?'var(--primary)':'transparent'}`, background:'transparent', color:isActive?'var(--primary)':'var(--text-3)', whiteSpace:'nowrap', flexShrink:0, marginBottom:-1 }}>
                  <TabIcon d={iconPath} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div style={{ marginTop:18 }}>
        {activeTab==='resumen' && (
          <ResumenTab loading={resumenLoading} error={resumenError} data={resumenData} onRetry={()=>fetchResumen()} esServicios={esServicios} ventasData={ventasData} ventasLoading={ventasLoading} desde={desde} hasta={hasta} onTabChange={setActiveTab} />
        )}
        {activeTab==='ventas' && (
          <VentasTab loading={ventasLoading} error={ventasError} data={ventasData} onRetry={()=>fetchVentas()} esServicios={esServicios}
            agrupacion={agrupacion} setAgrupacion={handleAgrupacion}
            utilidadBruta={resumenData?.ventas?.margenEstimado}
            ingresosAnterior={resumenAnteriorData?.ventas?.ingresosTotal}
            ventasAnterior={resumenAnteriorData?.ventas?.ventasCount}
            ticketAnterior={resumenAnteriorData?.ventas?.ticketPromedio}
            utilidadAnterior={resumenAnteriorData?.ventas?.margenEstimado}
            horasPicoData={horasPicoData}
            comprobantesData={comprobantesData} />
        )}
        {activeTab==='productos' && (
          <ProductosTab loading={ventasLoading} error={ventasError} data={ventasData} onRetry={()=>fetchVentas()} esServicios={esServicios}
            metrica={metrica} setMetrica={handleMetrica} />
        )}
        {activeTab==='vendedores' && (
          <VendedoresTab loading={ventasLoading} error={ventasError} data={ventasData} onRetry={()=>fetchVentas()} esServicios={esServicios} horasPicoData={horasPicoData} />
        )}
        {activeTab==='clientes' && (
          <ClientesTab loading={clientesLoading} error={clientesError} data={clientesData} onRetry={()=>fetchClientes()} esServicios={esServicios} />
        )}
        {activeTab==='inventario' && (
          <InventarioTab loading={inventarioLoading} error={inventarioError} data={inventarioData} onRetry={()=>fetchInventario(desde,hasta)} esServicios={esServicios} mermasLoading={mermasLoading} valorizacionStock={resumenData?.inventario?.valorizacionStock} />
        )}
        {activeTab==='financiero' && (
          <FinancieroTab loading={financieroLoading} error={financieroError} data={financieroData} previousData={financieroAnteriorData} historico={financieroHistorico} onRetry={()=>fetchFinanciero()} comisiones={comisionesData} />
        )}
        {activeTab==='compras' && (
          <ComprasTab loading={comprasLoading} error={comprasError} data={comprasData} onRetry={()=>fetchCompras(desde,hasta)} />
        )}
          </div>
        </div>
    </div>
  );
}
