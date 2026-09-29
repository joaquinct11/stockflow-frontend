import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { notify } from '../../lib/notify';
import {
  digemidService,
  type ProductoDigemidDTO,
  type CatalogoDigemidDTO,
  type OppfExportacionDTO,
} from '../../services/digemid.service';
import { useTenantConfigStore } from '../../store/tenantConfigStore';

const COD_EST_KEY = 'digemid_cod_establecimiento';

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

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const IC = {
  link:    ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7','M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'],
  unlink:  ['m18.8 13.4 1.7-1.7a5 5 0 0 0-7-7l-1.7 1.7','m5.2 10.6-1.7 1.7a5 5 0 0 0 7 7l1.7-1.7','m8 2 0 3','M2 8h3','M16 22v-3','M22 16h-3'],
  dl:      ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','m7 10 5 5 5-5','M12 15V3'],
  bolt:    ['M13 2 3 14h9l-1 8 10-12h-9Z'],
  x:       ['M18 6 6 18','m6 6 12 12'],
  check:   ['m5 12 5 5L20 7'],
  store:   ['m2 7 1.5-4h17L22 7','M4 7v13h16V7','M2 7h20','M9 20v-6h6v6'],
  hist:    ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8','m0-5v5h5','m9 21H12V12'],
  pkg:     ['M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z','M3.3 7 12 12l8.7-5','M12 22V12'],
  tri:     ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z','M12 9v4','M12 17h.01'],
  file:    ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z','M14 2v6h6'],
  pencil:  ['M12 20h9','M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  chevD:   ['m6 9 6 6 6-6'],
};

function Svg({ d, size = 15, sw = 1.9 }: { d: string[]; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      {d.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

function SearchIco({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function money(n: number) {
  const a = Math.abs(n).toFixed(2).split('.');
  return 'S/ ' + a[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + a[1];
}

const UNIDADES_BASICAS = new Set([
  'UNIDAD','TABLETA','TABLETAS','CÁPSULA','CAPSULA','CÁPSULAS','CAPSULAS',
  'AMPOLLA','AMPOLLAS','VIAL','VIALES','COMPRIMIDO','COMPRIMIDOS',
]);

function calcPreciosOppf(precioVenta: number, fraccion: number, unidadMedida: string) {
  const esPorUnidad = UNIDADES_BASICAS.has((unidadMedida ?? '').trim().toUpperCase());
  if (esPorUnidad) {
    return { precio1: Math.round(precioVenta * fraccion * 100) / 100, precio2: precioVenta };
  }
  const p2 = Math.round((precioVenta / fraccion) * 100) / 100;
  return { precio1: precioVenta, precio2: Math.max(0.01, p2) };
}

const OVL: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 80,
  background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};

function mbox(maxW: number): React.CSSProperties {
  return {
    width: '100%', maxWidth: maxW, maxHeight: 'calc(100vh - 40px)',
    display: 'flex', flexDirection: 'column',
    background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18,
    boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden',
  };
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 14px',
  fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em',
  textTransform: 'uppercase', color: T.text3, whiteSpace: 'nowrap',
};

// ── Buscar modal ─────────────────────────────────────────────────────────────

interface BuscarModalProps {
  producto: ProductoDigemidDTO;
  onVincular: (codDigemid: string, item: CatalogoDigemidDTO) => void;
  onClose: () => void;
  resultadosIniciales?: CatalogoDigemidDTO[];
  queryInicial?: string;
}

function BuscarModal({ producto, onVincular, onClose, resultadosIniciales, queryInicial }: BuscarModalProps) {
  const [query, setQuery] = useState(queryInicial ?? '');
  const [resultados, setResultados] = useState<CatalogoDigemidDTO[]>(resultadosIniciales ?? []);
  const [buscando, setBuscando] = useState(false);
  const [vinc, setVinc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    if (query.trim().length < 2) { setResultados([]); return; }
    debRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await digemidService.buscarCatalogo(query.trim());
        setResultados(res);
      } catch (err) {
        notify.fromError(err, 'No se pudo buscar en el catálogo DIGEMID.');
      } finally { setBuscando(false); }
    }, 400);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [query]);

  const doVincular = async (item: CatalogoDigemidDTO) => {
    setVinc(item.codProd);
    try {
      await digemidService.vincular(producto.id, item.codProd);
      onVincular(item.codProd, item);
      notify.success(`Vinculado: ${item.nomProd}`);
      onClose();
    } catch (err) {
      notify.fromError(err, 'No se pudo vincular el producto.');
    } finally { setVinc(null); }
  };

  const countLabel = buscando ? 'Buscando…'
    : query.trim().length >= 2 && resultados.length === 0 ? '0 resultados'
    : resultados.length > 0 ? `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}` : '';

  return createPortal(
    <div style={OVL} onClick={onClose}>
      <div style={mbox(760)} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'20px 22px 16px', borderBottom:`1px solid ${T.lineSoft}`, flexShrink:0 }}>
          <span style={{ width:38, height:38, flexShrink:0, display:'grid', placeItems:'center', borderRadius:11, background:T.primarySoft, color:T.primary }}>
            <Svg d={IC.link} size={18} />
          </span>
          <div style={{ minWidth:0 }}>
            <h2 style={{ fontSize:'1.08rem', fontWeight:700, letterSpacing:'-.02em', margin:0, color:T.text }}>Buscar en catálogo DIGEMID</h2>
            <div style={{ fontSize:'.8rem', color:T.text3, marginTop:4 }}>
              Producto: <strong style={{ color:T.text2, fontWeight:600 }}>{producto.nombre}</strong>
              {producto.registroSanitario && <> · <span style={{ fontFamily:'IBM Plex Mono,monospace' }}>{producto.registroSanitario}</span></>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            style={{ width:30, height:30, flexShrink:0, marginLeft:'auto', display:'grid', placeItems:'center', color:T.text3, background:'transparent', border:0, borderRadius:8, cursor:'pointer' }}>
            <Svg d={IC.x} size={16} sw={2.2} />
          </button>
        </div>
        {/* Search */}
        <div style={{ padding:'14px 22px', borderBottom:`1px solid ${T.lineSoft}`, flexShrink:0 }}>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', display:'grid', pointerEvents:'none', color:T.text3 }}>
              <SearchIco size={16} color={T.text3} />
            </span>
            <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, registro sanitario o IFA…"
              style={{ width:'100%', height:44, padding:'0 13px 0 38px', fontFamily:'Inter,sans-serif', fontSize:'.9rem', color:T.text, background:T.surface, border:`1px solid ${T.line}`, borderRadius:10, outline:'none', boxSizing:'border-box' }} />
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:9, fontSize:'.74rem', color:T.text3 }}>
            <span>Tu producto:</span>
            <strong style={{ color:T.text2, fontWeight:600 }}>{producto.nombre}</strong>
            {producto.registroSanitario && <><span>·</span><span style={{ fontFamily:'IBM Plex Mono,monospace' }}>{producto.registroSanitario}</span></>}
          </div>
        </div>
        {/* Results */}
        <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:'14px 22px 20px', display:'grid', gap:8, alignContent:'start' }}>
          {countLabel && (
            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.68rem', fontWeight:600, letterSpacing:'.09em', textTransform:'uppercase', color:T.text3 }}>{countLabel}</div>
          )}
          {resultados.map((r) => {
            const isActual = r.codProd === producto.codDigemid;
            const rsMatch = !!(r.numRegSan && producto.registroSanitario && r.numRegSan === producto.registroSanitario);
            const sit = r.situacion ?? '';
            const busy = vinc === r.codProd;
            return (
              <div key={r.codProd} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'11px 13px', borderRadius:11, background:T.surface2, border:`1px solid ${T.lineSoft}` }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:'.9rem', fontWeight:650, color:T.text }}>{r.nomProd}</span>
                    {r.concent && <span style={{ fontSize:'.82rem', color:T.text2 }}>{r.concent}</span>}
                    {rsMatch && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'.66rem', fontWeight:700, letterSpacing:'.03em', color:T.ok, background:T.okSoft, padding:'1px 7px', borderRadius:5 }}>
                        <Svg d={IC.check} size={10} sw={3} />MISMO R.S.
                      </span>
                    )}
                    {isActual && (
                      <span style={{ fontSize:'.66rem', fontWeight:700, letterSpacing:'.03em', color:T.primary, background:T.primarySoft, padding:'1px 7px', borderRadius:5 }}>VINCULADO</span>
                    )}
                  </div>
                  <div style={{ fontSize:'.76rem', color:T.text3, marginTop:4 }}>
                    {[r.nomFormFarm, r.presentac, r.fraccion != null ? `Fracción ${r.fraccion}` : null].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginTop:7, fontSize:'.74rem' }}>
                    <span style={{ fontFamily:'IBM Plex Mono,monospace', color:T.text2 }}><span style={{ color:T.text3 }}>Cód</span> {r.codProd}</span>
                    {r.numRegSan && <span style={{ fontFamily:'IBM Plex Mono,monospace', color:T.text2 }}><span style={{ color:T.text3 }}>R.S.</span> {r.numRegSan}</span>}
                    {r.nomTitular && <span style={{ color:T.text3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{r.nomTitular}</span>}
                    {sit && <span style={{ color: sit === 'ACT' ? T.ok : T.warn }}>{sit}</span>}
                  </div>
                </div>
                <button type="button" onClick={() => !isActual && !busy && doVincular(r)}
                  disabled={busy || isActual}
                  style={{ height:30, padding:'0 11px', fontFamily:'Inter,sans-serif', fontSize:'.78rem', fontWeight:650,
                    color: isActual ? T.ok : T.primary,
                    background: isActual ? T.okSoft : T.primarySoft,
                    border: `1px solid ${isActual ? T.ok + '44' : T.primaryLine}`,
                    borderRadius:8, cursor: isActual ? 'default' : 'pointer', whiteSpace:'nowrap', flexShrink:0,
                    opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Vinculando…' : isActual ? 'Vinculado' : 'Vincular'}
                </button>
              </div>
            );
          })}
          {!buscando && resultados.length === 0 && (
            <div style={{ padding:'30px', textAlign:'center', fontSize:'.84rem', color:T.text3 }}>
              {query.trim().length >= 2
                ? 'Sin coincidencias en el catálogo. Prueba con el principio activo o el registro sanitario.'
                : 'Escribe para buscar en el catálogo DIGEMID'}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

const now = new Date();

export function DigemidOppfPage() {
  const [productos, setProductos] = useState<ProductoDigemidDTO[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [seg, setSeg] = useState<'TODOS' | 'VINCULADOS' | 'SIN_VINCULAR'>('TODOS');
  const [tab, setTab] = useState<'prod' | 'hist'>('prod');
  const [pagina, setPagina] = useState(1);
  const PAGE_SIZE = 20;

  const [codEst, setCodEst] = useState(() => {
    try { return localStorage.getItem(COD_EST_KEY) ?? ''; } catch { return ''; }
  });
  const [codEdit, setCodEdit] = useState(false);
  const [codVal, setCodVal] = useState(codEst);

  const [historial, setHistorial] = useState<OppfExportacionDTO[]>([]);
  const [histCargando, setHistCargando] = useState(false);

  const [autoVinculando, setAutoVinculando] = useState<number | null>(null);
  const [vinculandoTodos, setVinculandoTodos] = useState(false);
  const [autoResult, setAutoResult] = useState<{
    totalProcesados: number;
    vinculados: { productoId: number; nombre: string; codDigemid: string; nomDigemid: string; registroSanitario: string }[];
    noVinculados: { productoId: number; nombre: string; registroSanitario?: string; motivo: string }[];
  } | null>(null);

  const [exportando, setExportando] = useState(false);
  const [exMes, setExMes] = useState(now.getMonth() + 1);
  const [exAno, setExAno] = useState(now.getFullYear());

  const [desvinculando, setDesvinculando] = useState<number | null>(null);

  // Modal states
  const [modalVincular, setModalVincular] = useState<ProductoDigemidDTO | null>(null);
  const [modalVincularResult, setModalVincularResult] = useState<{ inicial?: CatalogoDigemidDTO[]; query?: string } | null>(null);
  const [modalExport, setModalExport] = useState(false);
  const [modalAuto, setModalAuto] = useState(false);
  const [modalDesv, setModalDesv] = useState<ProductoDigemidDTO | null>(null);

  const { config: negocioConfig } = useTenantConfigStore();

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    try {
      const data = await digemidService.listarProductos();
      setProductos(data);
    } catch (err) {
      notify.fromError(err, 'No se pudieron cargar los productos.');
    } finally { setCargando(false); }
  }, []);

  const cargarHistorial = useCallback(async () => {
    setHistCargando(true);
    try {
      const data = await digemidService.getHistorialOppf();
      setHistorial(data);
    } catch { /* historial no crítico */ } finally { setHistCargando(false); }
  }, []);

  useEffect(() => {
    cargarProductos();
    cargarHistorial();
  }, [cargarProductos, cargarHistorial]);

  const guardarCod = () => {
    const val = codVal.trim();
    setCodEst(val);
    try { localStorage.setItem(COD_EST_KEY, val); } catch { /* ignore */ }
    setCodEdit(false);
    notify.success('Código de establecimiento guardado');
  };

  const handleVincularExitoso = (productoId: number, codDigemid: string, item: CatalogoDigemidDTO) => {
    setProductos((prev) => prev.map((p) => {
      if (p.id !== productoId) return p;
      const fraccion = item.fraccion ?? 1;
      const { precio1, precio2 } = calcPreciosOppf(p.precioVenta, fraccion, p.unidadMedida);
      return { ...p, codDigemid, nomDigemid: item.nomProd, fraccion, registroSanitario: item.numRegSan ?? p.registroSanitario, vinculado: true, precio1Oppf: precio1, precio2Oppf: precio2 };
    }));
  };

  const handleVincularClick = async (p: ProductoDigemidDTO) => {
    if (!p.registroSanitario) {
      setModalVincular(p);
      setModalVincularResult(null);
      return;
    }
    setAutoVinculando(p.id);
    try {
      const resultados = await digemidService.buscarCatalogo(p.registroSanitario);
      if (resultados.length === 1) {
        const item = resultados[0];
        await digemidService.vincular(p.id, item.codProd);
        handleVincularExitoso(p.id, item.codProd, item);
        notify.success(`Vinculado automáticamente: ${item.nomProd}`);
      } else {
        setModalVincular(p);
        setModalVincularResult({ inicial: resultados, query: p.registroSanitario });
      }
    } catch (err) {
      notify.fromError(err, 'No se pudo buscar en el catálogo DIGEMID.');
      setModalVincular(p);
      setModalVincularResult(null);
    } finally { setAutoVinculando(null); }
  };

  const handleVincularTodos = async () => {
    setVinculandoTodos(true);
    try {
      const resultado = await digemidService.vincularTodos();
      setAutoResult(resultado);
      setModalAuto(true);
      if (resultado.vinculados.length > 0) {
        await cargarProductos();
      }
    } catch (err) {
      notify.fromError(err, 'No se pudieron vincular los productos con DIGEMID.');
    } finally { setVinculandoTodos(false); }
  };

  const handleDesvincularConfirm = async () => {
    if (!modalDesv) return;
    const productoId = modalDesv.id;
    setDesvinculando(productoId);
    setModalDesv(null);
    try {
      await digemidService.desvincular(productoId);
      setProductos((prev) => prev.map((p) =>
        p.id === productoId ? { ...p, codDigemid: '', nomDigemid: '', fraccion: 1, vinculado: false } : p
      ));
      notify.success('Producto desvinculado');
    } catch (err) {
      notify.fromError(err, 'No se pudo desvincular el producto.');
    } finally { setDesvinculando(null); }
  };

  const handleExportar = async () => {
    const ruc = negocioConfig?.ruc ?? '';
    if (!codEst) { notify.fromError(null, 'Ingresa el código de establecimiento antes de exportar.'); return; }
    if (!ruc) { notify.fromError(null, 'Configura el RUC del negocio en Configuración.'); return; }
    const mesStr = String(exMes).padStart(2, '0');
    const anoStr = String(exAno).slice(-2);
    setExportando(true);
    try {
      const blob = await digemidService.exportarOppf(codEst, ruc, mesStr, anoStr, 'CARGA ARCHIVO');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ruc}_${mesStr}_${anoStr}_CARGA ARCHIVO.zip`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success(`Archivo ZIP descargado con ${productosParaExportar.length} producto(s)`);
      setModalExport(false);
      cargarHistorial();
    } catch (err) {
      notify.fromError(err, 'No se pudo generar el archivo OPPF-DIGEMID.');
    } finally { setExportando(false); }
  };

  // ── Derivados ────────────────────────────────────────────────────────────────

  const totalVinculados = productos.filter((p) => p.vinculado).length;
  const totalSinVincular = productos.filter((p) => !p.vinculado).length;
  const productosParaExportar = productos.filter((p) => p.vinculado && p.stockActual > 0);
  const ruc = negocioConfig?.ruc ?? '';

  const productosFiltrados = productos.filter((p) => {
    const q = busqueda.toLowerCase();
    const matchQ = !busqueda ||
      p.nombre.toLowerCase().includes(q) ||
      p.codDigemid.toLowerCase().includes(q) ||
      p.registroSanitario.toLowerCase().includes(q);
    const matchSeg = seg === 'TODOS' || (seg === 'VINCULADOS' && p.vinculado) || (seg === 'SIN_VINCULAR' && !p.vinculado);
    return matchQ && matchSeg;
  });

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / PAGE_SIZE));
  const productosPagina = productosFiltrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const anoOpts = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  // Export stats
  const exN = productosParaExportar.length;
  const exConMin = productosParaExportar.filter((p) => p.precio2Oppf <= 0.01).length;
  const exExcl = totalVinculados - exN;
  const exFaltaCod = !codEst;

  // ── Styles ────────────────────────────────────────────────────────────────────

  const tabBtn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '8px 14px', marginBottom: -1,
    fontFamily: 'Inter,sans-serif', fontSize: '.875rem',
    fontWeight: active ? 650 : 500,
    color: active ? T.primary : T.text2,
    background: 'transparent', border: 0,
    borderBottom: active ? `2px solid ${T.primary}` : '2px solid transparent',
    cursor: 'pointer',
  });

  const segBtn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', borderRadius: 8, border: 0,
    fontFamily: 'Inter,sans-serif', fontSize: '.82rem',
    fontWeight: active ? 650 : 500,
    color: active ? T.text : T.text2,
    background: active ? T.surface : 'transparent',
    boxShadow: active ? T.shadow : 'none',
    cursor: 'pointer',
  });

  const dot = (color: string): React.CSSProperties => ({
    display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0,
  });

  const badge = (vinc: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: '.74rem', fontWeight: 650, padding: '2px 9px', borderRadius: 20,
    color: vinc ? T.ok : T.warn,
    background: vinc ? T.okSoft : T.warnSoft,
    border: `1px solid ${vinc ? T.ok + '44' : T.warnLine}`,
  });

  const actionBtnPrimary: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px',
    fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 650,
    color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: 'pointer',
    whiteSpace: 'nowrap', boxShadow: `0 6px 16px -8px ${T.primary}`,
  };

  const actionBtnSecondary: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px',
    fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 650,
    color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10,
    cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: T.shadow,
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', color: T.text }}>
      <style>{`@keyframes fx-in{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>
      <div>

        {/* Title + Actions */}
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', justifyContent:'space-between', gap:16 }}>
          <div style={{ minWidth:0 }}>
            <h1 style={{ fontSize:'1.6rem', fontWeight:700, letterSpacing:'-.028em', margin:0, color:T.text }}>DIGEMID / OPPF</h1>
            <p style={{ fontSize:'.865rem', color:T.text3, margin:'7px 0 0' }}>Vincula tus productos al catálogo DIGEMID y reporta precios al Observatorio (OPPF)</p>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:9 }}>
            <button type="button" onClick={handleVincularTodos}
              disabled={vinculandoTodos || totalSinVincular === 0}
              style={{ ...actionBtnSecondary, opacity: (vinculandoTodos || totalSinVincular === 0) ? 0.55 : 1, cursor: (vinculandoTodos || totalSinVincular === 0) ? 'not-allowed' : 'pointer' }}>
              <Svg d={IC.bolt} size={15} />
              {vinculandoTodos ? 'Vinculando…' : 'Vincular automáticamente'}
            </button>
            <button type="button" onClick={() => setModalExport(true)} style={actionBtnPrimary}>
              <Svg d={IC.dl} size={15} />
              Exportar OPPF
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginTop:20 }}>
          {/* Establishment code + RUC */}
          <div style={{ flex:'1 1 380px', minWidth:0, display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:T.surface, border:`1px solid ${T.line}`, borderRadius:14, boxShadow:T.shadow }}>
            <span style={{ width:40, height:40, flexShrink:0, display:'grid', placeItems:'center', borderRadius:11, background:T.primarySoft, color:T.primary }}>
              <Svg d={IC.store} size={19} />
            </span>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.68rem', fontWeight:600, letterSpacing:'.09em', textTransform:'uppercase', color:T.text3 }}>Código de establecimiento</div>
              {codEdit ? (
                <div style={{ display:'flex', gap:7, marginTop:6 }}>
                  <input type="text" inputMode="numeric" value={codVal} onChange={(e) => setCodVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') guardarCod(); if (e.key === 'Escape') { setCodEdit(false); setCodVal(codEst); }}}
                    placeholder="Ej: 00012345" autoFocus
                    style={{ width:160, height:36, padding:'0 11px', fontFamily:'IBM Plex Mono,monospace', fontSize:'.88rem', letterSpacing:'.04em', color:T.text, background:T.surface, border:`1px solid ${T.line}`, borderRadius:9, outline:'none' }} />
                  <button type="button" onClick={guardarCod}
                    style={{ height:36, padding:'0 13px', fontFamily:'Inter,sans-serif', fontSize:'.8rem', fontWeight:650, color:'#fff', background:T.primary, border:0, borderRadius:9, cursor:'pointer' }}>
                    Guardar
                  </button>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:5 }}>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'1.02rem', fontWeight:600, color: codEst ? T.primary : T.text3 }}>
                    {codEst || 'No configurado'}
                  </span>
                  <button type="button" onClick={() => { setCodVal(codEst); setCodEdit(true); }} title="Editar"
                    style={{ width:28, height:28, display:'grid', placeItems:'center', color:T.text3, background:'transparent', border:0, borderRadius:7, cursor:'pointer' }}>
                    <Svg d={IC.pencil} size={14} />
                  </button>
                </div>
              )}
            </div>
            <div style={{ width:1, alignSelf:'stretch', background:T.lineSoft }} />
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.68rem', fontWeight:600, letterSpacing:'.09em', textTransform:'uppercase', color:T.text3 }}>RUC del negocio</div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'1.02rem', fontWeight:600, marginTop:5, color:T.text }}>{ruc || '—'}</div>
            </div>
          </div>

          {/* 3 KPI cards */}
          <div style={{ flex:'2 1 520px', minWidth:0, display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:12 }}>
            <div style={{ padding:'16px 18px', background:T.surface, border:`1px solid ${T.line}`, borderRadius:14, boxShadow:T.shadow }}>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.68rem', fontWeight:600, letterSpacing:'.09em', textTransform:'uppercase', color:T.text3 }}>Vinculados</div>
              <div style={{ fontSize:'1.72rem', fontWeight:700, letterSpacing:'-.032em', marginTop:9, fontVariantNumeric:'tabular-nums', color:T.ok }}>{totalVinculados}</div>
              <div style={{ fontSize:'.79rem', color:T.text3, marginTop:5 }}>de {productos.length} productos</div>
            </div>
            <div style={{ padding:'16px 18px', background:T.surface, border:`1px solid ${T.line}`, borderRadius:14, boxShadow:T.shadow }}>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.68rem', fontWeight:600, letterSpacing:'.09em', textTransform:'uppercase', color:T.text3 }}>Sin vincular</div>
              <div style={{ fontSize:'1.72rem', fontWeight:700, letterSpacing:'-.032em', marginTop:9, fontVariantNumeric:'tabular-nums', color: totalSinVincular > 0 ? T.warn : T.text }}>{totalSinVincular}</div>
              <div style={{ fontSize:'.79rem', color:T.text3, marginTop:5 }}>No se exportan</div>
            </div>
            <div style={{ padding:'16px 18px', background:T.surface, border:`1px solid ${T.line}`, borderRadius:14, boxShadow:T.shadow }}>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.68rem', fontWeight:600, letterSpacing:'.09em', textTransform:'uppercase', color:T.text3 }}>Listos para OPPF</div>
              <div style={{ fontSize:'1.72rem', fontWeight:700, letterSpacing:'-.032em', marginTop:9, fontVariantNumeric:'tabular-nums', color:T.text }}>{exN}</div>
              <div style={{ fontSize:'.79rem', color:T.text3, marginTop:5 }}>Vinculados con stock</div>
            </div>
          </div>
        </div>

        {/* Main card with tabs */}
        <div style={{ marginTop:14, background:T.surface, border:`1px solid ${T.line}`, borderRadius:14, boxShadow:T.shadow }}>
          {/* Tabs */}
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:10, padding:'12px 18px 0', borderBottom:`1px solid ${T.lineSoft}` }}>
            <button type="button" onClick={() => setTab('prod')} style={tabBtn(tab === 'prod')}>
              <Svg d={IC.pkg} size={15} />
              Mis productos
              <span style={{ fontSize:'.72rem', fontWeight:700, color:T.text3 }}>{productos.length}</span>
            </button>
            <button type="button" onClick={() => setTab('hist')} style={tabBtn(tab === 'hist')}>
              <Svg d={IC.hist} size={15} />
              Historial de exportaciones
              <span style={{ fontSize:'.72rem', fontWeight:700, color:T.text3 }}>{historial.length}</span>
            </button>
          </div>

          {/* Products tab */}
          {tab === 'prod' && (
            <>
              {/* Filters */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:10, padding:'14px 18px', borderBottom:`1px solid ${T.lineSoft}` }}>
                <div style={{ position:'relative', flex:'1 1 280px', minWidth:0 }}>
                  <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', display:'grid', pointerEvents:'none', color:T.text3 }}>
                    <SearchIco size={16} color={T.text3} />
                  </span>
                  <input type="text" value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                    placeholder="Buscar producto, registro sanitario o código DIGEMID…"
                    style={{ width:'100%', height:40, padding:'0 13px 0 38px', fontFamily:'Inter,sans-serif', fontSize:'.875rem', color:T.text, background:T.surface2, border:'1px solid transparent', borderRadius:10, outline:'none', boxSizing:'border-box' }} />
                </div>
                <div style={{ display:'flex', gap:3, padding:3, background:T.surface2, borderRadius:10 }}>
                  {(['TODOS','VINCULADOS','SIN_VINCULAR'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => { setSeg(s); setPagina(1); }} style={segBtn(seg === s)}>
                      <span style={dot(s === 'VINCULADOS' ? T.ok : s === 'SIN_VINCULAR' ? T.warn : T.text3)} />
                      {s === 'TODOS' ? 'Todos' : s === 'VINCULADOS' ? 'Vinculados' : 'Sin vincular'}
                      <span style={{ fontSize:'.7rem', fontWeight:700, color:T.text3 }}>
                        {s === 'TODOS' ? productos.length : s === 'VINCULADOS' ? totalVinculados : totalSinVincular}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              {cargando ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'56px 24px' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', border:`3px solid ${T.primaryLine}`, borderTopColor:T.primary, animation:'spin 0.7s linear infinite' }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : productosFiltrados.length === 0 ? (
                <div style={{ padding:'56px 24px', textAlign:'center' }}>
                  <div style={{ width:52, height:52, margin:'0 auto', display:'grid', placeItems:'center', borderRadius:14, background:T.surface2, color:T.text3 }}>
                    <Svg d={IC.pkg} size={24} sw={1.7} />
                  </div>
                  <div style={{ fontSize:'1rem', fontWeight:650, marginTop:14, color:T.text }}>Sin productos</div>
                  <p style={{ fontSize:'.865rem', color:T.text3, margin:'7px 0 0' }}>Ningún producto coincide con la búsqueda.</p>
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.84rem', minWidth:1160 }}>
                    <thead>
                      <tr style={{ background:T.surface3 }}>
                        <th style={{ ...thStyle, padding:'10px 18px' }}>Producto</th>
                        <th style={{ ...thStyle, textAlign:'right' }}>Precio</th>
                        <th style={{ ...thStyle, textAlign:'right' }}>Stock</th>
                        <th style={thStyle}>Cód. DIGEMID</th>
                        <th style={thStyle}>Nombre DIGEMID</th>
                        <th style={{ ...thStyle, textAlign:'right', color:T.primary }}>P1 Empaque</th>
                        <th style={{ ...thStyle, textAlign:'right', color:T.primary }}>P2 Unitario</th>
                        <th style={thStyle}>Estado</th>
                        <th style={{ ...thStyle, textAlign:'right', padding:'10px 18px' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosPagina.map((p, i) => (
                        <tr key={p.id} style={{ borderTop:`1px solid ${T.lineSoft}`, background: i % 2 === 0 ? 'transparent' : T.surface3 }}>
                          <td style={{ padding:'11px 18px', maxWidth:280 }}>
                            <div style={{ fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:T.text }}>{p.nombre}</div>
                            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.72rem', color:T.text3, marginTop:2 }}>
                              {p.registroSanitario || '—'} · {p.unidadMedida}
                            </div>
                          </td>
                          <td style={{ padding:'11px 14px', textAlign:'right', whiteSpace:'nowrap', fontWeight:650, fontVariantNumeric:'tabular-nums', fontFamily:'IBM Plex Mono,monospace', fontSize:'.82rem', color:T.text }}>
                            {money(p.precioVenta)}
                          </td>
                          <td style={{ padding:'11px 14px', textAlign:'right', whiteSpace:'nowrap' }}>
                            <span style={{ fontWeight:650, color: p.stockActual === 0 ? T.bad : T.text, fontVariantNumeric:'tabular-nums' }}>{p.stockActual}</span>
                          </td>
                          <td style={{ padding:'11px 14px', whiteSpace:'nowrap' }}>
                            {p.vinculado
                              ? <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.78rem', fontWeight:600, color:T.text2 }}>{p.codDigemid}</span>
                              : <span style={{ color:T.text3 }}>—</span>}
                          </td>
                          <td style={{ padding:'11px 14px', maxWidth:240 }}>
                            {p.vinculado
                              ? <div style={{ fontSize:'.82rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:T.text2 }}>{p.nomDigemid}</div>
                              : <span style={{ color:T.text3 }}>—</span>}
                          </td>
                          <td style={{ padding:'11px 14px', textAlign:'right', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums', color:T.text2, fontFamily:'IBM Plex Mono,monospace', fontSize:'.82rem' }}>
                            {p.vinculado ? money(p.precio1Oppf) : '—'}
                          </td>
                          <td style={{ padding:'11px 14px', textAlign:'right', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums', fontFamily:'IBM Plex Mono,monospace', fontSize:'.82rem' }}>
                            {p.vinculado ? (
                              <span style={{ color: p.precio2Oppf <= 0.01 ? T.warn : T.text2 }}>
                                {money(p.precio2Oppf)}
                                {p.precio2Oppf <= 0.01 && (
                                  <span title="Precio mínimo OPPF" style={{ display:'inline-grid', verticalAlign:'-2px', marginLeft:5, color:T.warn }}>
                                    <Svg d={IC.tri} size={13} sw={2} />
                                  </span>
                                )}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ padding:'11px 14px', whiteSpace:'nowrap' }}>
                            <span style={badge(p.vinculado)}>
                              <Svg d={p.vinculado ? IC.link : IC.unlink} size={11} sw={2.2} />
                              {p.vinculado ? 'Vinculado' : 'Sin vincular'}
                            </span>
                            {p.vinculado && p.stockActual === 0 && (
                              <div style={{ fontSize:'.7rem', color:T.text3, marginTop:4 }}>No se exportará</div>
                            )}
                          </td>
                          <td style={{ padding:'11px 18px', textAlign:'right', whiteSpace:'nowrap' }}>
                            {p.vinculado ? (
                              <div style={{ display:'inline-flex', gap:6 }}>
                                <button type="button" onClick={() => handleVincularClick(p)} title="Cambiar vínculo"
                                  style={{ width:30, height:30, display:'grid', placeItems:'center', color:T.text3, background:'transparent', border:0, borderRadius:8, cursor:'pointer' }}>
                                  <Svg d={IC.pencil} size={15} />
                                </button>
                                <button type="button" onClick={() => setModalDesv(p)}
                                  disabled={desvinculando === p.id}
                                  style={{ display:'inline-flex', alignItems:'center', gap:6, height:30, padding:'0 11px', fontFamily:'Inter,sans-serif', fontSize:'.78rem', fontWeight:600, color:T.text2, background:T.surface, border:`1px solid ${T.line}`, borderRadius:8, cursor:'pointer' }}>
                                  <Svg d={IC.unlink} size={13} />
                                  Desvincular
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => handleVincularClick(p)}
                                disabled={autoVinculando === p.id}
                                style={{ display:'inline-flex', alignItems:'center', gap:6, height:30, padding:'0 12px', fontFamily:'Inter,sans-serif', fontSize:'.78rem', fontWeight:650, color:T.primary, background:T.primarySoft, border:`1px solid ${T.primaryLine}`, borderRadius:8, cursor:'pointer', opacity: autoVinculando === p.id ? 0.6 : 1 }}>
                                <Svg d={IC.link} size={13} />
                                {autoVinculando === p.id ? 'Buscando…' : 'Vincular'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer */}
              {!cargando && productosFiltrados.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'13px 18px', borderTop:`1px solid ${T.lineSoft}`, fontSize:'.8rem', color:T.text3 }}>
                  <span>
                    {productosFiltrados.length > PAGE_SIZE
                      ? `${(pagina - 1) * PAGE_SIZE + 1}–${Math.min(pagina * PAGE_SIZE, productosFiltrados.length)} de ${productosFiltrados.length} productos`
                      : `${productosFiltrados.length} producto${productosFiltrados.length !== 1 ? 's' : ''}`}
                  </span>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ display:'flex', alignItems:'center', gap:6, color:T.warn }}>
                      <Svg d={IC.tri} size={13} sw={2} />
                      P2 de S/ 0,01 es el precio mínimo que acepta OPPF
                    </span>
                    {productosFiltrados.length > PAGE_SIZE && (
                      <div style={{ display:'flex', gap:4, marginLeft:12 }}>
                        <button onClick={() => setPagina((p) => p - 1)} disabled={pagina === 1}
                          style={{ height:30, padding:'0 10px', fontFamily:'Inter,sans-serif', fontSize:'.78rem', fontWeight:600, color:pagina === 1 ? T.text3 : T.text2, background:T.surface, border:`1px solid ${T.line}`, borderRadius:8, cursor: pagina === 1 ? 'not-allowed' : 'pointer' }}>
                          ← Anterior
                        </button>
                        <span style={{ padding:'0 8px', display:'grid', placeItems:'center', fontWeight:600, color:T.text }}>{pagina} / {totalPaginas}</span>
                        <button onClick={() => setPagina((p) => p + 1)} disabled={pagina === totalPaginas}
                          style={{ height:30, padding:'0 10px', fontFamily:'Inter,sans-serif', fontSize:'.78rem', fontWeight:600, color:pagina === totalPaginas ? T.text3 : T.text2, background:T.surface, border:`1px solid ${T.line}`, borderRadius:8, cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer' }}>
                          Siguiente →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Historial tab */}
          {tab === 'hist' && (
            histCargando ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'56px 24px' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', border:`3px solid ${T.primaryLine}`, borderTopColor:T.primary, animation:'spin 0.7s linear infinite' }} />
              </div>
            ) : historial.length === 0 ? (
              <div style={{ padding:'56px 24px', textAlign:'center', fontSize:'.865rem', color:T.text3 }}>
                Aún no hay exportaciones registradas. El historial aparecerá aquí después de tu primera descarga.
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.84rem', minWidth:860 }}>
                  <thead>
                    <tr style={{ background:T.surface3 }}>
                      <th style={{ ...thStyle, padding:'10px 18px' }}>Fecha</th>
                      <th style={thStyle}>RUC</th>
                      <th style={thStyle}>Cód. Est.</th>
                      <th style={thStyle}>Periodo</th>
                      <th style={{ ...thStyle, textAlign:'right' }}>Productos</th>
                      <th style={thStyle}>Archivo</th>
                      <th style={{ ...thStyle, padding:'10px 18px', textAlign:'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h) => {
                      const fecha = new Date(h.fechaExportacion);
                      const fechaStr = fecha.toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' });
                      const horaStr = fecha.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' });
                      return (
                        <tr key={h.id} style={{ borderTop:`1px solid ${T.lineSoft}` }}>
                          <td style={{ padding:'11px 18px', whiteSpace:'nowrap' }}>
                            <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.82rem', fontWeight:600, color:T.text }}>{fechaStr}</div>
                            <div style={{ fontSize:'.72rem', color:T.text3, marginTop:2 }}>{horaStr}</div>
                          </td>
                          <td style={{ padding:'11px 14px', whiteSpace:'nowrap', fontFamily:'IBM Plex Mono,monospace', fontSize:'.8rem', color:T.text2 }}>{h.ruc}</td>
                          <td style={{ padding:'11px 14px', whiteSpace:'nowrap', fontFamily:'IBM Plex Mono,monospace', fontSize:'.8rem', color:T.text2 }}>{h.codEstablecimiento}</td>
                          <td style={{ padding:'11px 14px', whiteSpace:'nowrap' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', fontSize:'.78rem', fontWeight:650, padding:'3px 10px', borderRadius:20, color:T.primary, background:T.primarySoft }}>
                              {MESES[(Number(h.mes) - 1)] ?? h.mes} {h.ano}
                            </span>
                          </td>
                          <td style={{ padding:'11px 14px', textAlign:'right', whiteSpace:'nowrap', fontWeight:700, fontVariantNumeric:'tabular-nums', color:T.text }}>{h.totalProductos}</td>
                          <td style={{ padding:'11px 14px', maxWidth:300 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                              <span style={{ display:'grid', color:T.ok }}><Svg d={IC.file} size={14} /></span>
                              <span title={h.nombreArchivo} style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.76rem', color:T.text2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                {h.nombreArchivo}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding:'11px 18px', textAlign:'right' }}>
                            <button type="button" title="Descargar de nuevo"
                              style={{ width:30, height:30, display:'inline-grid', placeItems:'center', color:T.text3, background:'transparent', border:0, borderRadius:8, cursor:'pointer' }}>
                              <Svg d={IC.dl} size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Modal: Buscar en catálogo ───────────────────────────────────────────── */}
      {modalVincular && (
        <BuscarModal
          producto={modalVincular}
          resultadosIniciales={modalVincularResult?.inicial}
          queryInicial={modalVincularResult?.query}
          onVincular={(codDigemid, item) => handleVincularExitoso(modalVincular.id, codDigemid, item)}
          onClose={() => { setModalVincular(null); setModalVincularResult(null); }}
        />
      )}

      {/* ── Modal: Exportar OPPF ────────────────────────────────────────────────── */}
      {modalExport && createPortal(
        <div style={OVL} onClick={() => setModalExport(false)}>
          <div style={mbox(820)} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'20px 22px 16px', borderBottom:`1px solid ${T.lineSoft}`, flexShrink:0 }}>
              <span style={{ width:38, height:38, flexShrink:0, display:'grid', placeItems:'center', borderRadius:11, background:T.primarySoft, color:T.primary }}>
                <Svg d={IC.dl} size={18} />
              </span>
              <div style={{ minWidth:0 }}>
                <h2 style={{ fontSize:'1.08rem', fontWeight:700, letterSpacing:'-.02em', margin:0, color:T.text }}>Exportar a OPPF</h2>
                <div style={{ fontSize:'.8rem', color:T.text3, marginTop:4 }}>Archivo ZIP para cargar en el Observatorio de Productos Farmacéuticos</div>
              </div>
              <button type="button" onClick={() => setModalExport(false)} aria-label="Cerrar"
                style={{ width:30, height:30, flexShrink:0, marginLeft:'auto', display:'grid', placeItems:'center', color:T.text3, background:'transparent', border:0, borderRadius:8, cursor:'pointer' }}>
                <Svg d={IC.x} size={16} sw={2.2} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:'18px 22px 20px' }}>
              {/* Mes/Año + RUC/Cód */}
              <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:T.text2, marginBottom:6 }}>Mes</label>
                  <div style={{ position:'relative', width:150 }}>
                    <select value={exMes} onChange={(e) => setExMes(Number(e.target.value))}
                      style={{ width:'100%', height:40, padding:'0 30px 0 12px', fontFamily:'Inter,sans-serif', fontSize:'.86rem', fontWeight:600, color:T.text, background:T.surface, border:`1px solid ${T.line}`, borderRadius:10, outline:'none', appearance:'none', WebkitAppearance:'none', cursor:'pointer' }}>
                      {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', display:'grid', pointerEvents:'none', color:T.text3 }}>
                      <Svg d={IC.chevD} size={13} sw={2} />
                    </span>
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:T.text2, marginBottom:6 }}>Año</label>
                  <div style={{ position:'relative', width:100 }}>
                    <select value={exAno} onChange={(e) => setExAno(Number(e.target.value))}
                      style={{ width:'100%', height:40, padding:'0 30px 0 12px', fontFamily:'Inter,sans-serif', fontSize:'.86rem', fontWeight:600, color:T.text, background:T.surface, border:`1px solid ${T.line}`, borderRadius:10, outline:'none', appearance:'none', WebkitAppearance:'none', cursor:'pointer' }}>
                      {anoOpts.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', display:'grid', pointerEvents:'none', color:T.text3 }}>
                      <Svg d={IC.chevD} size={13} sw={2} />
                    </span>
                  </div>
                </div>
                <div style={{ flex:1, minWidth:220, display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8 }}>
                  <div style={{ padding:'11px 13px', borderRadius:11, background:T.surface3, border:`1px solid ${T.lineSoft}` }}>
                    <div style={{ fontSize:'.72rem', color:T.text3 }}>RUC</div>
                    <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.9rem', fontWeight:600, marginTop:3, color:T.text }}>{ruc || '—'}</div>
                  </div>
                  <div style={{ padding:'11px 13px', borderRadius:11, background:T.surface3, border:`1px solid ${T.lineSoft}` }}>
                    <div style={{ fontSize:'.72rem', color:T.text3 }}>Cód. establecimiento</div>
                    <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.9rem', fontWeight:600, marginTop:3, color:T.text }}>{codEst || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Warning: falta cod */}
              {exFaltaCod && (
                <div style={{ display:'flex', alignItems:'center', gap:9, marginTop:12, padding:'10px 13px', borderRadius:10, background:T.badSoft, fontSize:'.8rem', fontWeight:600, color:T.bad }}>
                  <Svg d={IC.tri} size={15} />
                  Ingresa el código de establecimiento antes de exportar.
                </div>
              )}

              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8, marginTop:16 }}>
                <div style={{ padding:'11px 13px', borderRadius:11, background:T.surface3, border:`1px solid ${T.lineSoft}` }}>
                  <div style={{ fontSize:'.72rem', color:T.text3 }}>Se exportan</div>
                  <div style={{ fontSize:'1.2rem', fontWeight:700, marginTop:3, color:T.ok, fontVariantNumeric:'tabular-nums' }}>{exN}</div>
                </div>
                <div style={{ padding:'11px 13px', borderRadius:11, background:T.surface3, border:`1px solid ${T.lineSoft}` }}>
                  <div style={{ fontSize:'.72rem', color:T.text3 }}>Con precio mínimo</div>
                  <div style={{ fontSize:'1.2rem', fontWeight:700, marginTop:3, fontVariantNumeric:'tabular-nums', color: exConMin > 0 ? T.warn : T.text3 }}>{exConMin}</div>
                </div>
                <div style={{ padding:'11px 13px', borderRadius:11, background:T.surface3, border:`1px solid ${T.lineSoft}` }}>
                  <div style={{ fontSize:'.72rem', color:T.text3 }}>Sin stock (excluidos)</div>
                  <div style={{ fontSize:'1.2rem', fontWeight:700, marginTop:3, color: exExcl > 0 ? T.warn : T.text3, fontVariantNumeric:'tabular-nums' }}>{exExcl}</div>
                </div>
              </div>

              {/* Excluded products explanation */}
              {exExcl > 0 && (() => {
                const excluidos = productos.filter((p) => p.vinculado && p.stockActual === 0);
                return (
                  <div style={{ display:'flex', alignItems:'flex-start', gap:9, marginTop:10, padding:'10px 13px', borderRadius:10, background:T.warnSoft, border:`1px solid ${T.warnLine}`, fontSize:'.8rem' }}>
                    <span style={{ color:T.warn, marginTop:1, flexShrink:0 }}><Svg d={IC.tri} size={14} /></span>
                    <div>
                      <span style={{ fontWeight:650, color:T.warn }}>
                        {exExcl === 1 ? '1 producto vinculado no se exportará' : `${exExcl} productos vinculados no se exportarán`}
                        {' '}porque tiene{exExcl !== 1 ? 'n' : ''} stock 0:
                      </span>
                      <span style={{ color:T.text2, marginLeft:6 }}>
                        {excluidos.map((p) => p.nombre).join(', ')}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Preview table */}
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.68rem', fontWeight:600, letterSpacing:'.09em', textTransform:'uppercase', color:T.text3, margin:'18px 0 10px' }}>Vista previa</div>
              <div style={{ border:`1px solid ${T.line}`, borderRadius:12, overflow:'auto', maxHeight:300 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.8rem', minWidth:640 }}>
                  <thead>
                    <tr style={{ position:'sticky', top:0, background:T.surface3 }}>
                      <th style={{ ...thStyle, padding:'9px 12px' }}>Producto</th>
                      <th style={{ ...thStyle, padding:'9px 12px' }}>CodProd</th>
                      <th style={{ ...thStyle, padding:'9px 12px', textAlign:'right', color:T.primary }}>P1</th>
                      <th style={{ ...thStyle, padding:'9px 12px', textAlign:'right', color:T.primary }}>P2</th>
                      <th style={{ ...thStyle, padding:'9px 12px', textAlign:'right' }}>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosParaExportar.map((p) => (
                      <tr key={p.id} style={{ borderTop:`1px solid ${T.lineSoft}` }}>
                        <td style={{ padding:'9px 12px', maxWidth:260, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:600, color:T.text }}>{p.nombre}</td>
                        <td style={{ padding:'9px 12px', fontFamily:'IBM Plex Mono,monospace', fontSize:'.74rem', color:T.text2 }}>{p.codDigemid}</td>
                        <td style={{ padding:'9px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:T.text2, fontFamily:'IBM Plex Mono,monospace', fontSize:'.78rem' }}>{money(p.precio1Oppf)}</td>
                        <td style={{ padding:'9px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:'IBM Plex Mono,monospace', fontSize:'.78rem' }}>
                          <span style={{ color: p.precio2Oppf <= 0.01 ? T.warn : T.text2 }}>{money(p.precio2Oppf)}</span>
                        </td>
                        <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:650, fontVariantNumeric:'tabular-nums', color:T.text }}>{p.stockActual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize:'.76rem', color:T.text3, marginTop:10 }}>Solo se exportan productos vinculados con stock mayor a 0.</div>
            </div>

            {/* Footer */}
            <div style={{ display:'flex', gap:9, padding:'14px 22px', borderTop:`1px solid ${T.lineSoft}`, flexShrink:0 }}>
              <button type="button" onClick={() => setModalExport(false)}
                style={{ minWidth:104, height:44, padding:'0 18px', fontFamily:'Inter,sans-serif', fontSize:'.9rem', fontWeight:600, color:T.text2, background:T.surface, border:`1px solid ${T.line}`, borderRadius:11, cursor:'pointer', whiteSpace:'nowrap' }}>
                Cancelar
              </button>
              <button type="button" onClick={handleExportar}
                disabled={exportando || exN === 0 || exFaltaCod}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, height:44, fontFamily:'Inter,sans-serif', fontSize:'.9rem', fontWeight:650, color:'#fff', background: (exN === 0 || exFaltaCod) ? T.text3 : T.primary, border:0, borderRadius:11, cursor: (exportando || exN === 0 || exFaltaCod) ? 'not-allowed' : 'pointer', boxShadow: exN > 0 && !exFaltaCod ? `0 8px 20px -10px ${T.primary}` : 'none', opacity: exportando ? 0.7 : 1 }}>
                <Svg d={IC.dl} size={15} />
                {exportando ? 'Generando ZIP…' : `Descargar ZIP · ${exN} producto${exN !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal: Vinculación automática ──────────────────────────────────────── */}
      {modalAuto && autoResult && createPortal(
        <div style={OVL} onClick={() => setModalAuto(false)}>
          <div style={mbox(640)} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'20px 22px 16px', borderBottom:`1px solid ${T.lineSoft}`, flexShrink:0 }}>
              <span style={{ width:38, height:38, flexShrink:0, display:'grid', placeItems:'center', borderRadius:11, background:T.okSoft, color:T.ok }}>
                <Svg d={IC.bolt} size={18} />
              </span>
              <div style={{ minWidth:0 }}>
                <h2 style={{ fontSize:'1.08rem', fontWeight:700, letterSpacing:'-.02em', margin:0, color:T.text }}>Vinculación automática</h2>
                <div style={{ fontSize:'.8rem', color:T.text3, marginTop:4 }}>Se buscó cada producto por su registro sanitario</div>
              </div>
              <button type="button" onClick={() => setModalAuto(false)} aria-label="Cerrar"
                style={{ width:30, height:30, flexShrink:0, marginLeft:'auto', display:'grid', placeItems:'center', color:T.text3, background:'transparent', border:0, borderRadius:8, cursor:'pointer' }}>
                <Svg d={IC.x} size={16} sw={2.2} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:'18px 22px 20px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8 }}>
                <div style={{ padding:'11px 13px', borderRadius:11, background:T.surface3, border:`1px solid ${T.lineSoft}` }}>
                  <div style={{ fontSize:'.72rem', color:T.text3 }}>Procesados</div>
                  <div style={{ fontSize:'1.2rem', fontWeight:700, marginTop:3, fontVariantNumeric:'tabular-nums', color:T.text }}>{autoResult.totalProcesados}</div>
                </div>
                <div style={{ padding:'11px 13px', borderRadius:11, background:T.surface3, border:`1px solid ${T.lineSoft}` }}>
                  <div style={{ fontSize:'.72rem', color:T.text3 }}>Vinculados</div>
                  <div style={{ fontSize:'1.2rem', fontWeight:700, marginTop:3, color:T.ok, fontVariantNumeric:'tabular-nums' }}>{autoResult.vinculados.length}</div>
                </div>
                <div style={{ padding:'11px 13px', borderRadius:11, background:T.surface3, border:`1px solid ${T.lineSoft}` }}>
                  <div style={{ fontSize:'.72rem', color:T.text3 }}>Sin vincular</div>
                  <div style={{ fontSize:'1.2rem', fontWeight:700, marginTop:3, color:T.warn, fontVariantNumeric:'tabular-nums' }}>{autoResult.noVinculados.length}</div>
                </div>
              </div>

              {autoResult.vinculados.length > 0 && (
                <>
                  <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.68rem', fontWeight:600, letterSpacing:'.09em', textTransform:'uppercase', color:T.text3, margin:'18px 0 8px' }}>Vinculados</div>
                  <div style={{ display:'grid', gap:6 }}>
                    {autoResult.vinculados.map((v) => (
                      <div key={v.productoId} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:T.okSoft }}>
                        <span style={{ display:'grid', color:T.ok }}><Svg d={IC.check} size={14} sw={2.6} /></span>
                        <span style={{ flex:1, minWidth:0 }}>
                          <span style={{ display:'block', fontSize:'.84rem', fontWeight:600, color:T.text }}>{v.nombre}</span>
                          <span style={{ display:'block', fontSize:'.74rem', color:T.text2, marginTop:1 }}>{v.nomDigemid}</span>
                        </span>
                        <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.74rem', color:T.text2 }}>{v.codDigemid}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {autoResult.noVinculados.length > 0 && (
                <>
                  <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.68rem', fontWeight:600, letterSpacing:'.09em', textTransform:'uppercase', color:T.text3, margin:'18px 0 8px' }}>Requieren vinculación manual</div>
                  <div style={{ display:'grid', gap:6 }}>
                    {autoResult.noVinculados.map((nv) => (
                      <div key={nv.productoId} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:T.surface2 }}>
                        <span style={{ flex:1, minWidth:0 }}>
                          <span style={{ display:'block', fontSize:'.84rem', fontWeight:600, color:T.text }}>{nv.nombre}</span>
                          <span style={{ display:'block', fontSize:'.74rem', color:T.warn, marginTop:1 }}>{nv.motivo}</span>
                        </span>
                        <button type="button" onClick={() => {
                          setModalAuto(false);
                          const prod = productos.find((p) => p.id === nv.productoId);
                          if (prod) { setModalVincular(prod); setModalVincularResult(null); }
                        }} style={{ height:30, padding:'0 11px', fontFamily:'Inter,sans-serif', fontSize:'.76rem', fontWeight:650, color:T.primary, background:T.primarySoft, border:`1px solid ${T.primaryLine}`, borderRadius:8, cursor:'pointer', whiteSpace:'nowrap' }}>
                          Vincular
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ display:'flex', gap:9, padding:'14px 22px', borderTop:`1px solid ${T.lineSoft}`, flexShrink:0 }}>
              <span style={{ flex:1 }} />
              <button type="button" onClick={() => setModalAuto(false)}
                style={{ minWidth:120, height:44, fontFamily:'Inter,sans-serif', fontSize:'.9rem', fontWeight:650, color:'#fff', background:T.primary, border:0, borderRadius:11, cursor:'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal: Desvincular confirmación ────────────────────────────────────── */}
      {modalDesv && createPortal(
        <div style={OVL} onClick={() => setModalDesv(null)}>
          <div style={mbox(480)} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'20px 22px 16px', borderBottom:`1px solid ${T.lineSoft}`, flexShrink:0 }}>
              <span style={{ width:38, height:38, flexShrink:0, display:'grid', placeItems:'center', borderRadius:11, background:T.badSoft, color:T.bad }}>
                <Svg d={IC.unlink} size={18} />
              </span>
              <div style={{ minWidth:0 }}>
                <h2 style={{ fontSize:'1.08rem', fontWeight:700, letterSpacing:'-.02em', margin:0, color:T.text }}>Desvincular producto</h2>
                <div style={{ fontSize:'.8rem', color:T.text3, marginTop:4 }}>Dejará de incluirse en el reporte OPPF</div>
              </div>
              <button type="button" onClick={() => setModalDesv(null)} aria-label="Cerrar"
                style={{ width:30, height:30, flexShrink:0, marginLeft:'auto', display:'grid', placeItems:'center', color:T.text3, background:'transparent', border:0, borderRadius:8, cursor:'pointer' }}>
                <Svg d={IC.x} size={16} sw={2.2} />
              </button>
            </div>

            <div style={{ padding:'18px 22px 20px' }}>
              <div style={{ display:'grid', gap:8, padding:'13px 15px', borderRadius:12, background:T.surface2, fontSize:'.84rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                  <span style={{ flexShrink:0, color:T.text3 }}>Tu producto</span>
                  <span style={{ fontWeight:600, textAlign:'right', color:T.text }}>{modalDesv.nombre}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                  <span style={{ flexShrink:0, color:T.text3 }}>DIGEMID</span>
                  <span style={{ textAlign:'right', color:T.text2 }}>{modalDesv.nomDigemid}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                  <span style={{ color:T.text3 }}>Código</span>
                  <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:'.8rem', fontWeight:600, color:T.text }}>{modalDesv.codDigemid}</span>
                </div>
              </div>
              <p style={{ fontSize:'.84rem', lineHeight:1.55, color:T.text2, margin:'14px 0 0' }}>Puedes volver a vincularlo en cualquier momento.</p>
            </div>

            <div style={{ display:'flex', gap:9, padding:'14px 22px', borderTop:`1px solid ${T.lineSoft}` }}>
              <button type="button" onClick={() => setModalDesv(null)}
                style={{ minWidth:104, height:44, padding:'0 18px', fontFamily:'Inter,sans-serif', fontSize:'.9rem', fontWeight:600, color:T.text2, background:T.surface, border:`1px solid ${T.line}`, borderRadius:11, cursor:'pointer', whiteSpace:'nowrap' }}>
                Cancelar
              </button>
              <button type="button" onClick={handleDesvincularConfirm}
                style={{ flex:1, height:44, fontFamily:'Inter,sans-serif', fontSize:'.9rem', fontWeight:650, color:'#fff', background:T.bad, border:0, borderRadius:11, cursor:'pointer', boxShadow:`0 8px 20px -10px ${T.bad}` }}>
                Desvincular
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
