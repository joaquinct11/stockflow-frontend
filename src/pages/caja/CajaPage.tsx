import { useEffect, useState } from 'react';
import { cajaService } from '../../services/caja.service';
import { refreshOnboarding } from '../../utils/onboardingEvents';
import type { CorregirCierreDTO } from '../../services/caja.service';
import type { CajaDTO, RegistrarRetiroDTO } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useSucursalStore } from '../../store/sucursalStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import {
  Wallet, Banknote, CreditCard, Smartphone,
  Lock, CheckCircle, Clock, ArrowDownLeft, Pencil, Plus,
  Printer, TrendingUp, TrendingDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DENOMINACIONES = [
  { label: 'S/ 200', valor: 200 },
  { label: 'S/ 100', valor: 100 },
  { label: 'S/ 50',  valor: 50  },
  { label: 'S/ 20',  valor: 20  },
  { label: 'S/ 10',  valor: 10  },
  { label: 'S/ 5',   valor: 5   },
  { label: 'S/ 2',   valor: 2   },
  { label: 'S/ 1',   valor: 1   },
  { label: '50 cént', valor: 0.5 },
  { label: '20 cént', valor: 0.2 },
  { label: '10 cént', valor: 0.1 },
];

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return '-';
  return `S/ ${v.toFixed(2)}`;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '-';
  return new Date(s).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function imprimirArqueo(caja: CajaDTO, totalContado: number, conteo: Record<number, number>) {
  const esperado = (caja.montoApertura ?? 0) + (caja.totalEfectivo ?? 0) - (caja.totalRetiros ?? 0);
  const diff = totalContado - esperado;
  const diffLabel = diff === 0 ? 'CUADRA EXACTO' : diff > 0 ? `SOBRANTE S/ ${Math.abs(diff).toFixed(2)}` : `FALTANTE S/ ${Math.abs(diff).toFixed(2)}`;
  const denominaciones = [
    { label: 'S/ 200', valor: 200 }, { label: 'S/ 100', valor: 100 },
    { label: 'S/ 50', valor: 50 },  { label: 'S/ 20', valor: 20 },
    { label: 'S/ 10', valor: 10 },  { label: 'S/ 5', valor: 5 },
    { label: 'S/ 2', valor: 2 },    { label: 'S/ 1', valor: 1 },
    { label: '50 cént', valor: 0.5 },
  ];
  const filasConteo = denominaciones
    .filter(d => (conteo[d.valor] ?? 0) > 0)
    .map(d => `<tr><td>${d.label}</td><td style="text-align:center">${conteo[d.valor]}</td><td style="text-align:right">S/ ${(d.valor * conteo[d.valor]).toFixed(2)}</td></tr>`)
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Arqueo de Caja</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 300px; padding: 12px; }
    .center { text-align: center; }
    .title { font-size: 15px; font-weight: bold; margin: 6px 0; }
    .sub { font-size: 11px; color: #555; margin-bottom: 2px; }
    hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; }
    .row { display: flex; justify-content: space-between; padding: 2px 0; }
    .bold { font-weight: bold; }
    .result { text-align: center; font-size: 14px; font-weight: bold; margin: 8px 0; padding: 6px; border: 1px solid #000; }
    @media print { @page { margin: 0; size: 80mm auto; } }
  </style></head><body>
  <div class="center">
    <div class="title">FLUXUS</div>
    <div class="sub">Arqueo de Caja</div>
    <div class="sub">${new Date().toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
    ${caja.usuarioNombre ? `<div class="sub">Cajero: ${caja.usuarioNombre}</div>` : ''}
  </div>
  <hr>
  <div class="bold" style="margin-bottom:4px">CONTEO DE BILLETES Y MONEDAS</div>
  <table>
    <tr><td><b>Denominación</b></td><td style="text-align:center"><b>Cant.</b></td><td style="text-align:right"><b>Total</b></td></tr>
    ${filasConteo || '<tr><td colspan="3" style="text-align:center">Sin conteo</td></tr>'}
  </table>
  <hr>
  <div class="row"><span>Total contado</span><span class="bold">S/ ${totalContado.toFixed(2)}</span></div>
  <hr>
  <div class="bold" style="margin-bottom:4px">ARQUEO</div>
  <div class="row"><span>Fondo apertura</span><span>S/ ${(caja.montoApertura ?? 0).toFixed(2)}</span></div>
  <div class="row"><span>Ventas efectivo</span><span>S/ ${(caja.totalEfectivo ?? 0).toFixed(2)}</span></div>
  ${(caja.totalRetiros ?? 0) > 0 ? `<div class="row"><span>Retiros</span><span>- S/ ${(caja.totalRetiros ?? 0).toFixed(2)}</span></div>` : ''}
  <div class="row bold"><span>Esperado</span><span>S/ ${esperado.toFixed(2)}</span></div>
  <hr>
  <div class="result">${diffLabel}</div>
  <hr>
  <div class="center sub">Fluxus · Mini ERP</div>
  </body></html>`;

  const w = window.open('', '_blank', 'width=340,height=600');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 400);
}

function formatHora(s: string | null | undefined): string {
  if (!s) return '-';
  return new Date(s).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function formatTurno(apertura: string | null | undefined, cierre: string | null | undefined): string {
  const ha = apertura ? formatHora(apertura) : '?';
  if (!cierre) return `${ha} → ahora`;
  const hc = formatHora(cierre);
  const dia = new Date(cierre).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  return `${ha} → ${hc}\n${dia}`;
}

function tiempoTranscurrido(desde: string | null | undefined): string {
  if (!desde) return '';
  const mins = Math.floor((Date.now() - new Date(desde).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} h ${m} min de turno` : `${m} min de turno`;
}

function inicialesAvatar(nombre: string | null | undefined): string {
  if (!nombre) return '?';
  return nombre.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function CajaPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.rol === 'ADMIN';
  const { sucursalActual, sucursales, loaded: sucursalLoaded } = useSucursalStore();
  const isMultiLocal = sucursales.length > 1;
  const sucursalId = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;

  const [cajas, setCajas] = useState<CajaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaja, setSelectedCaja] = useState<CajaDTO | null>(null);

  // Conteo de denominaciones
  const [conteo, setConteo] = useState<Record<number, number>>({});
  const [cerrarObs, setCerrarObs] = useState('');
  const [cerrando, setCerrando] = useState(false);

  // Modals
  const [isRetiroOpen, setIsRetiroOpen] = useState(false);
  const [retiroForm, setRetiroForm] = useState<RegistrarRetiroDTO>({ monto: 0, motivo: '' });
  const [retirando, setRetirando] = useState(false);

  const [isCorregirOpen, setIsCorregirOpen] = useState(false);
  const [corregirForm, setCorregirForm] = useState<CorregirCierreDTO>({ montoContado: 0, observaciones: '' });
  const [corrigiendo, setCorrigiendo] = useState(false);

  const [isAbrirOpen, setIsAbrirOpen] = useState(false);
  const [montoApertura, setMontoApertura] = useState('');
  const [abriendo, setAbriendo] = useState(false);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [historialFiltro, setHistorialFiltro] = useState<'todas' | 'cuadran' | 'descuadre'>('todas');

  useEffect(() => {
    if (!sucursalLoaded) return;
    fetchCajas();
  }, [sucursalLoaded, sucursalId]);

  const fetchCajas = async () => {
    try {
      setLoading(true);
      const data = await cajaService.getAll(sucursalId);
      setCajas(data);
    } catch {
      toast.error('Error al cargar el historial de caja');
    } finally {
      setLoading(false);
    }
  };

  const cajasAbiertas = cajas.filter(c => c.estado === 'ABIERTA');
  const cajaActiva = cajasAbiertas[0] ?? null;

  const totalContado = DENOMINACIONES.reduce(
    (sum, d) => sum + d.valor * (conteo[d.valor] ?? 0), 0,
  );
  const piezasContadas = Object.values(conteo).reduce((s, v) => s + (v ?? 0), 0);

  const esperado = cajaActiva
    ? (cajaActiva.montoApertura ?? 0) + (cajaActiva.totalEfectivo ?? 0) - (cajaActiva.totalRetiros ?? 0)
    : 0;
  const diff = totalContado - esperado;

  const metodosPago = cajaActiva ? (() => {
    const filas = [
      { key: 'EFECTIVO', label: 'Efectivo',  monto: cajaActiva.totalEfectivo ?? 0,  Icon: Banknote,   color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
      { key: 'TARJETA',  label: 'Tarjeta',   monto: cajaActiva.totalTarjeta ?? 0,   Icon: CreditCard, color: 'text-blue-600 dark:text-blue-400',       bar: 'bg-blue-500'    },
      { key: 'YAPE',     label: 'Yape/Plin', monto: cajaActiva.totalYapePlin ?? 0,  Icon: Smartphone, color: 'text-violet-600 dark:text-violet-400',   bar: 'bg-violet-500'  },
    ];
    const totalMonto = filas.reduce((s, f) => s + f.monto, 0);
    return { filas, totalMonto };
  })() : null;

  const handleCerrarCaja = async () => {
    if (!cajaActiva) return;
    try {
      setCerrando(true);
      await cajaService.cerrar(cajaActiva.id, { montoContado: totalContado, observaciones: cerrarObs });
      imprimirArqueo(cajaActiva, totalContado, conteo);
      toast.success('Caja cerrada correctamente');
      setConteo({});
      setCerrarObs('');
      await fetchCajas();
    } catch (err: any) {
      toast.error(err?.response?.data?.mensaje || 'Error al cerrar la caja');
    } finally {
      setCerrando(false);
    }
  };

  const handleRegistrarRetiro = async () => {
    if (!cajaActiva) return;
    if (!retiroForm.monto || retiroForm.monto <= 0) {
      toast.error('El monto del retiro debe ser mayor a 0');
      return;
    }
    const disponible = (cajaActiva.montoApertura ?? 0) + (cajaActiva.totalEfectivo ?? 0) - (cajaActiva.totalRetiros ?? 0);
    if (retiroForm.monto > disponible) {
      toast.error(`El retiro supera el efectivo disponible (${formatCurrency(disponible)})`);
      return;
    }
    try {
      setRetirando(true);
      await cajaService.registrarRetiro(cajaActiva.id, retiroForm);
      toast.success(`Retiro de ${formatCurrency(retiroForm.monto)} registrado`);
      setIsRetiroOpen(false);
      await fetchCajas();
    } catch (err: any) {
      toast.error(err?.response?.data?.mensaje || 'Error al registrar el retiro');
    } finally {
      setRetirando(false);
    }
  };

  const handleCorregirCierre = async () => {
    if (!selectedCaja) return;
    if (corregirForm.montoContado < 0) { toast.error('El monto no puede ser negativo'); return; }
    try {
      setCorrigiendo(true);
      await cajaService.corregirCierre(selectedCaja.id, corregirForm);
      toast.success('Cierre corregido correctamente');
      setIsCorregirOpen(false);
      await fetchCajas();
    } catch (err: any) {
      toast.error(err?.response?.data?.mensaje || 'Error al corregir el cierre');
    } finally {
      setCorrigiendo(false);
    }
  };

  const handleAbrirCaja = async () => {
    try {
      setAbriendo(true);
      const monto = parseFloat(montoApertura) || 0;
      await cajaService.abrir({ montoApertura: monto, sucursalId });
      toast.success('Caja abierta correctamente');
      refreshOnboarding();
      setIsAbrirOpen(false);
      setMontoApertura('');
      fetchCajas();
    } catch (err: any) {
      toast.error(err?.response?.data?.mensaje || 'Error al abrir caja');
    } finally {
      setAbriendo(false);
    }
  };

  const cajasFiltradas = cajas.filter(c => {
    if (historialFiltro === 'cuadran')   return c.estado === 'CERRADA' && (c.diferencia ?? 0) === 0;
    if (historialFiltro === 'descuadre') return c.estado === 'CERRADA' && (c.diferencia ?? 0) !== 0;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.6rem] font-bold tracking-tight leading-none">Cuadre de Caja</h1>
          {cajaActiva ? (
            <div className="flex flex-wrap items-center gap-2.5 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                Caja abierta
              </span>
              <span className="text-sm text-muted-foreground">
                {cajaActiva.usuarioNombre} · abierta {formatHora(cajaActiva.fechaApertura)} · {tiempoTranscurrido(cajaActiva.fechaApertura)}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1.5">Sin turno activo</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cajaActiva ? (
            <>
              <button
                onClick={() => { setRetiroForm({ monto: 0, motivo: '' }); setIsRetiroOpen(true); }}
                className="flex items-center gap-2 h-[38px] px-4 text-sm font-semibold text-muted-foreground bg-card border border-border rounded-[10px] cursor-pointer hover:border-primary hover:text-primary transition-colors"
              >
                <ArrowDownLeft size={15} className="flex-shrink-0" />
                Registrar retiro
              </button>
              <button
                onClick={() => imprimirArqueo(cajaActiva, totalContado, conteo)}
                className="flex items-center gap-2 h-[38px] px-4 text-sm font-semibold text-muted-foreground bg-card border border-border rounded-[10px] cursor-pointer hover:border-primary hover:text-primary transition-colors"
              >
                <Printer size={15} className="flex-shrink-0" />
                Imprimir arqueo
              </button>
              <button
                onClick={handleCerrarCaja}
                disabled={cerrando}
                className="flex items-center gap-2 h-[38px] px-4 text-sm font-semibold text-white bg-primary border-0 rounded-[10px] cursor-pointer hover:brightness-105 transition-all shadow-[0_6px_16px_-8px_var(--tw-shadow-color)] shadow-primary/60 disabled:opacity-60"
              >
                <Lock size={15} className="flex-shrink-0" />
                {cerrando ? 'Cerrando...' : 'Cerrar caja'}
              </button>
            </>
          ) : (
            <Button onClick={() => setIsAbrirOpen(true)}>
              <Plus size={15} className="mr-1.5" />
              Abrir Caja
            </Button>
          )}
        </div>
      </div>

      {/* ── Sesión activa ──────────────────────────────────────────────── */}
      {cajaActiva && (
        <>
          {/* Arqueo card */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.32fr_1fr] bg-card border border-border rounded-2xl shadow-sm overflow-hidden">

            {/* Left: denominaciones */}
            <div className="p-[22px_24px]">
              <p className="font-mono text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-muted-foreground">
                Cuenta el efectivo del cajón
              </p>
              <p className="text-[0.86rem] text-muted-foreground leading-[1.55] mt-1.5 max-w-[460px]">
                Marca cuántos billetes y monedas hay de cada valor. El total contado se calcula solo.
              </p>

              <div className="grid grid-cols-3 gap-[9px] mt-[18px]">
                {DENOMINACIONES.map(d => {
                  const cnt = conteo[d.valor] ?? 0;
                  const subtotal = d.valor * cnt;
                  return (
                    <div
                      key={d.valor}
                      className={`rounded-xl border p-2.5 transition-colors ${cnt > 0 ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold ${cnt > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {d.label}
                        </span>
                        <span className="font-mono text-[0.7rem] text-muted-foreground tabular-nums">
                          {cnt > 0 ? formatCurrency(subtotal) : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 mt-[9px] bg-muted rounded-[9px] p-0.5">
                        <button
                          aria-label="Quitar"
                          className="w-7 h-7 flex-shrink-0 grid place-items-center text-muted-foreground rounded-[7px] hover:bg-card hover:text-foreground transition-colors"
                          onClick={() => setConteo(prev => ({ ...prev, [d.valor]: Math.max(0, (prev[d.valor] ?? 0) - 1) }))}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14"/></svg>
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={cnt === 0 ? '' : cnt}
                          placeholder="0"
                          onChange={e => {
                            const v = parseInt(e.target.value) || 0;
                            setConteo(prev => ({ ...prev, [d.valor]: Math.max(0, v) }));
                          }}
                          className="flex-1 min-w-0 h-7 p-0 font-mono text-[0.92rem] font-semibold text-center text-foreground bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          aria-label="Agregar"
                          className="w-7 h-7 flex-shrink-0 grid place-items-center text-muted-foreground rounded-[7px] hover:bg-card hover:text-foreground transition-colors"
                          onClick={() => setConteo(prev => ({ ...prev, [d.valor]: (prev[d.valor] ?? 0) + 1 }))}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 mt-4">
                <button
                  onClick={() => setConteo({})}
                  className="h-[34px] px-3 text-[0.82rem] font-semibold text-muted-foreground bg-transparent border border-border rounded-[9px] cursor-pointer hover:border-red-400 hover:text-red-500 transition-colors"
                >
                  Reiniciar conteo
                </button>
                <span className="text-[0.82rem] text-muted-foreground">{piezasContadas} piezas contadas</span>
              </div>
            </div>

            {/* Right: arqueo + diff + cerrar */}
            <div className="p-[22px_24px] border-t lg:border-t-0 lg:border-l border-border bg-muted/20 flex flex-col">
              <p className="font-mono text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-muted-foreground">
                Arqueo de efectivo
              </p>

              <div className="grid gap-[9px] mt-4 text-[0.865rem]">
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>Fondo de apertura</span>
                  <span className="tabular-nums">{formatCurrency(cajaActiva.montoApertura)}</span>
                </div>
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>Ventas en efectivo</span>
                  <span className="tabular-nums">{formatCurrency(cajaActiva.totalEfectivo)}</span>
                </div>
                {(cajaActiva.totalRetiros ?? 0) > 0 && (
                  <div className="flex justify-between gap-3 text-red-600 dark:text-red-400">
                    <span>Retiros</span>
                    <span className="tabular-nums">− {formatCurrency(cajaActiva.totalRetiros)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3 pt-2.5 border-t border-border">
                  <span className="font-[650]">Esperado en caja</span>
                  <span className="font-bold tabular-nums">{formatCurrency(esperado)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-[650]">Contado</span>
                  <span className="font-bold tabular-nums">{formatCurrency(totalContado)}</span>
                </div>
              </div>

              {/* Diff box */}
              <div className={`mt-4 rounded-xl p-4 border ${
                diff === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                  : diff > 0
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    diff === 0 ? 'bg-emerald-100 dark:bg-emerald-900' : diff > 0 ? 'bg-amber-100 dark:bg-amber-900' : 'bg-red-100 dark:bg-red-900'
                  }`}>
                    {diff === 0
                      ? <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                      : diff > 0
                      ? <TrendingUp size={14} className="text-amber-600 dark:text-amber-400" />
                      : <TrendingDown size={14} className="text-red-600 dark:text-red-400" />
                    }
                  </span>
                  <span className={`text-sm font-semibold ${
                    diff === 0 ? 'text-emerald-700 dark:text-emerald-400' : diff > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'
                  }`}>
                    {diff === 0 ? 'Cuadra exacto' : diff > 0 ? 'Sobrante' : 'Faltante'}
                  </span>
                </div>
                <div className={`font-mono text-[1.5rem] font-bold mt-1 tabular-nums ${
                  diff === 0 ? 'text-emerald-700 dark:text-emerald-400' : diff > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'
                }`}>
                  {diff === 0 ? 'S/ 0.00' : `${diff > 0 ? '+ ' : '− '}${formatCurrency(Math.abs(diff))}`}
                </div>
                <p className="text-[0.82rem] leading-[1.55] text-muted-foreground mt-1.5">
                  {diff === 0
                    ? 'El conteo coincide con lo esperado.'
                    : diff > 0
                    ? 'Hay más efectivo del esperado. Revisa si falta registrar una venta o un vuelto mal entregado.'
                    : 'Hay menos efectivo del esperado. Puede haber un error en el conteo o una venta no registrada.'}
                </p>
              </div>

              {diff !== 0 && (
                <div className="mt-3.5">
                  <label className="block text-[0.82rem] font-semibold text-muted-foreground mb-1.5">
                    Motivo de la diferencia
                  </label>
                  <input
                    type="text"
                    value={cerrarObs}
                    onChange={e => setCerrarObs(e.target.value)}
                    placeholder="Motivo de diferencia, incidencias, etc."
                    className="w-full h-10 px-3 text-[0.865rem] text-foreground bg-card border border-border rounded-[10px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                </div>
              )}

              <button
                onClick={handleCerrarCaja}
                disabled={cerrando}
                className="h-[46px] w-full mt-[18px] flex items-center justify-center gap-2 text-[0.93rem] font-[650] text-white bg-primary border-0 rounded-[11px] cursor-pointer hover:brightness-105 transition-all shadow-[0_8px_20px_-10px_var(--tw-shadow-color)] shadow-primary/60 disabled:opacity-60"
              >
                <Lock size={16} />
                {cerrando ? 'Cerrando...' : 'Cerrar caja con este conteo'}
              </button>
            </div>
          </div>

          {/* Cobros + Retiros */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.32fr_1fr] gap-3.5">

            {/* Cobros de la sesión */}
            {metodosPago && (
              <div className="bg-card border border-border rounded-[14px] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-[18px] py-[15px] border-b border-border/60">
                  <span className="text-[0.92rem] font-[650]">Cobros de la sesión</span>
                  <span className="text-[0.8rem] text-muted-foreground">{formatCurrency(metodosPago.totalMonto)} en {cajaActiva.cantidadVentas ?? 0} ventas</span>
                </div>
                <div className="px-[18px] py-4 grid gap-[15px]">
                  {metodosPago.filas.map(({ key, label, monto, Icon, color, bar }) => {
                    const pct = metodosPago.totalMonto > 0 ? Math.round((monto / metodosPago.totalMonto) * 100) : 0;
                    return (
                      <div key={key}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className={`flex items-center gap-2 text-[0.865rem] font-semibold ${color}`}>
                            <Icon size={16} />
                            {label}
                          </span>
                          <span className={`font-mono text-[1.02rem] font-bold tabular-nums ${color}`}>
                            {formatCurrency(monto)}
                          </span>
                        </div>
                        <div className="h-[7px] rounded-full bg-muted mt-2 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[0.78rem] text-muted-foreground mt-1.5">{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Retiros */}
            <div className="bg-card border border-border rounded-[14px] shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-3 px-[18px] py-[15px] border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <span className="text-[0.92rem] font-[650]">Retiros</span>
                  {(cajaActiva.retiros?.length ?? 0) > 0 && (
                    <span className="text-[0.7rem] font-bold text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-full px-2 py-0.5">
                      {cajaActiva.retiros!.length}
                    </span>
                  )}
                </div>
                {(cajaActiva.totalRetiros ?? 0) > 0 && (
                  <span className="font-mono text-[0.85rem] font-bold text-red-600 dark:text-red-400 tabular-nums">
                    − {formatCurrency(cajaActiva.totalRetiros)}
                  </span>
                )}
              </div>
              <div className="flex-1">
                {(cajaActiva.retiros?.length ?? 0) === 0 ? (
                  <p className="px-[18px] py-5 text-[0.84rem] text-muted-foreground">Sin retiros en este turno.</p>
                ) : (
                  cajaActiva.retiros!.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-[18px] py-[13px] border-b border-border/60 last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="text-[0.865rem] font-semibold truncate">{r.motivo || 'Sin motivo'}</div>
                        <div className="font-mono text-[0.72rem] text-muted-foreground mt-0.5">{formatHora(r.fecha)}</div>
                      </div>
                      <span className="flex-shrink-0 font-mono text-[0.88rem] font-bold text-red-600 dark:text-red-400 tabular-nums">
                        {formatCurrency(r.monto)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-auto px-[18px] py-3.5 bg-muted/30 border-t border-border/60">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.82rem] text-muted-foreground">Efectivo disponible para retirar</span>
                  <span className="font-mono text-[0.92rem] font-bold tabular-nums">{formatCurrency(esperado)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Historial ──────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-[14px] shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-[15px] border-b border-border/60">
          <div>
            <div className="text-[0.92rem] font-[650]">Historial de cajas</div>
            <div className="text-[0.8rem] text-muted-foreground mt-0.5">{cajas.length} sesión(es) registrada(s)</div>
          </div>
          <div className="flex gap-[3px] bg-muted border border-border rounded-[10px] p-[3px]">
            {(['todas', 'cuadran', 'descuadre'] as const).map(f => (
              <button
                key={f}
                onClick={() => setHistorialFiltro(f)}
                className={`px-3 py-1 text-xs font-semibold rounded-[8px] transition-colors whitespace-nowrap ${
                  historialFiltro === f
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'todas' ? 'Todas' : f === 'cuadran' ? 'Cuadran' : 'Con descuadre'}
              </button>
            ))}
          </div>
        </div>
        {cajasFiltradas.length === 0 ? (
          <div className="p-8">
            <EmptyState icon={Wallet} title="Sin sesiones registradas" description="Cuando abras y cierres turnos de caja aparecerán aquí." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cajero</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Efectivo</TableHead>
                  <TableHead className="text-right">Tarjeta</TableHead>
                  <TableHead className="text-right">Yape/Plin</TableHead>
                  <TableHead className="text-right">Retiros</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cajasFiltradas.map(caja => {
                  const dif = caja.diferencia;
                  return (
                    <TableRow key={caja.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[0.72rem] font-bold flex-shrink-0 border border-primary/20">
                            {inicialesAvatar(caja.usuarioNombre)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold leading-none">{caja.usuarioNombre}</p>
                            {caja.estado === 'CERRADA' && caja.cerradoPorNombre && caja.cerradoPorNombre !== caja.usuarioNombre && (
                              <p className="text-xs text-muted-foreground mt-0.5">Cerró: {caja.cerradoPorNombre}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-pre-wrap leading-[1.5]">
                        {formatTurno(caja.fechaApertura, caja.fechaCierre)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={caja.estado === 'ABIERTA' ? 'warning' : 'success'}>
                          {caja.estado === 'ABIERTA' ? <Clock size={11} className="inline mr-1" /> : <CheckCircle size={11} className="inline mr-1" />}
                          {caja.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(caja.totalEfectivo)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(caja.totalTarjeta)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(caja.totalYapePlin)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-red-600 dark:text-red-400">
                        {(caja.totalRetiros ?? 0) > 0 ? `− ${formatCurrency(caja.totalRetiros)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(caja.totalIngresos)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {dif == null ? '—' : dif === 0
                          ? <span className="text-emerald-600 dark:text-emerald-400">Cuadra</span>
                          : <span className={dif > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}>
                              {dif > 0 ? '+' : '−'} {formatCurrency(Math.abs(dif))}
                            </span>
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => { setSelectedCaja(caja); setIsDetailOpen(true); }}
                            className="text-xs font-semibold text-primary hover:underline whitespace-nowrap px-1"
                          >
                            Ver detalle
                          </button>
                          {caja.estado === 'CERRADA' && isAdmin && (
                            <Button
                              variant="ghost" size="icon"
                              className="text-amber-500 hover:text-amber-700"
                              onClick={() => { setSelectedCaja(caja); setCorregirForm({ montoContado: caja.montoContado ?? 0, observaciones: caja.observaciones ?? '' }); setIsCorregirOpen(true); }}
                              title="Corregir cierre (Admin)"
                            >
                              <Pencil size={13} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Dialog: Retiro parcial ─────────────────────────────────────── */}
      <Dialog isOpen={isRetiroOpen} onClose={() => setIsRetiroOpen(false)} title="Registrar retiro" description="Registra una salida de efectivo sin cerrar el turno.">
        {cajaActiva && (() => {
          const disponible = (cajaActiva.montoApertura ?? 0) + (cajaActiva.totalEfectivo ?? 0) - (cajaActiva.totalRetiros ?? 0);
          const excede = !!retiroForm.monto && retiroForm.monto > disponible;
          return (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Efectivo ventas</span><span className="font-mono">{formatCurrency(cajaActiva.totalEfectivo)}</span></div>
                {(cajaActiva.totalRetiros ?? 0) > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400"><span>Retiros anteriores</span><span className="font-mono">− {formatCurrency(cajaActiva.totalRetiros)}</span></div>
                )}
                <div className="border-t pt-1.5 flex justify-between font-semibold"><span>Disponible para retirar</span><span className="font-mono">{formatCurrency(disponible)}</span></div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Monto <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">S/</span>
                  <Input type="number" step="0.01" min="0.01" value={retiroForm.monto || ''} onChange={e => setRetiroForm(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))} className={`pl-9 ${excede ? 'border-red-500' : ''}`} placeholder="0.00" autoFocus />
                </div>
                {excede && <p className="text-xs text-red-500">Supera el efectivo disponible ({formatCurrency(disponible)})</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Motivo (opcional)</label>
                <Input value={retiroForm.motivo || ''} onChange={e => setRetiroForm(prev => ({ ...prev, motivo: e.target.value }))} placeholder="Depósito caja fuerte, pago proveedor…" />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setIsRetiroOpen(false)}>Cancelar</Button>
                <Button onClick={handleRegistrarRetiro} disabled={retirando || !retiroForm.monto || retiroForm.monto <= 0 || excede} className="bg-orange-500 hover:bg-orange-600 text-white border-0">
                  {retirando ? 'Registrando...' : 'Confirmar retiro'}
                </Button>
              </div>
            </div>
          );
        })()}
      </Dialog>

      {/* ── Dialog: Ver detalle ────────────────────────────────────────── */}
      <Dialog isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Detalle de caja" size="lg">
        {selectedCaja && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Cajero</p><p className="font-medium">{selectedCaja.usuarioNombre}</p></div>
              <div><p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Estado</p><Badge variant={selectedCaja.estado === 'ABIERTA' ? 'warning' : 'success'}>{selectedCaja.estado}</Badge></div>
              <div><p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Apertura</p><p>{formatDate(selectedCaja.fechaApertura)}</p></div>
              <div><p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Cierre</p><p>{formatDate(selectedCaja.fechaCierre)}</p></div>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold mb-2">Ingresos</p>
              <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Banknote size={13} /> Fondo apertura</span><span className="font-mono">{formatCurrency(selectedCaja.montoApertura)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Banknote size={13} /> Efectivo ventas</span><span className="font-mono">{formatCurrency(selectedCaja.totalEfectivo)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><CreditCard size={13} /> Tarjeta</span><span className="font-mono">{formatCurrency(selectedCaja.totalTarjeta)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Smartphone size={13} /> Yape/Plin</span><span className="font-mono">{formatCurrency(selectedCaja.totalYapePlin)}</span></div>
              {(selectedCaja.totalRetiros ?? 0) > 0 && <div className="flex justify-between text-red-600 dark:text-red-400"><span className="flex items-center gap-1"><ArrowDownLeft size={13} /> Retiros</span><span className="font-mono">− {formatCurrency(selectedCaja.totalRetiros)}</span></div>}
              <div className="border-t pt-2 flex justify-between font-semibold"><span>Total ({selectedCaja.cantidadVentas} ventas)</span><span className="font-mono text-emerald-600">{formatCurrency(selectedCaja.totalIngresos)}</span></div>
            </div>
            {selectedCaja.estado === 'CERRADA' && (
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-semibold mb-2">Cierre</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Esperado</span><span className="font-mono">{formatCurrency((selectedCaja.montoApertura ?? 0) + (selectedCaja.totalEfectivo ?? 0) - (selectedCaja.totalRetiros ?? 0))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Contado</span><span className="font-mono">{formatCurrency(selectedCaja.montoContado)}</span></div>
                <div className={`border-t pt-2 flex justify-between font-bold ${(selectedCaja.diferencia ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  <span>Diferencia</span>
                  <span className="font-mono">{(selectedCaja.diferencia ?? 0) >= 0 ? '+' : ''}{formatCurrency(selectedCaja.diferencia)}</span>
                </div>
              </div>
            )}
            {selectedCaja.retiros && selectedCaja.retiros.length > 0 && (
              <div className="rounded-lg border border-orange-200 dark:border-orange-800 p-4 space-y-2 bg-orange-50/50 dark:bg-orange-950/10">
                <p className="font-semibold text-orange-700 dark:text-orange-400">Retiros parciales</p>
                {selectedCaja.retiros.map(r => (
                  <div key={r.id} className="flex justify-between">
                    <div><p>{r.motivo || 'Sin motivo'}</p><p className="text-xs text-muted-foreground">{formatDate(r.fecha)}</p></div>
                    <span className="font-mono text-red-600 dark:text-red-400 ml-4">− {formatCurrency(r.monto)}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedCaja.observaciones && <div><p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Observaciones</p><p>{selectedCaja.observaciones}</p></div>}
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
              {selectedCaja.estado === 'ABIERTA' && (
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-0" onClick={() => { setIsDetailOpen(false); setRetiroForm({ monto: 0, motivo: '' }); setIsRetiroOpen(true); }}>
                  <ArrowDownLeft size={14} className="mr-1" /> Registrar retiro
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Dialog: Corregir cierre (Admin) ───────────────────────────── */}
      <Dialog isOpen={isCorregirOpen} onClose={() => setIsCorregirOpen(false)} title="Corregir cierre de caja" description="Solo administradores. El sistema recalculará la diferencia.">
        {selectedCaja && (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 text-sm space-y-2">
              <p className="font-semibold text-amber-800 dark:text-amber-400">Valores actuales del cierre</p>
              <div className="flex justify-between text-muted-foreground"><span>Apertura + Efectivo − Retiros</span><span className="font-mono">{formatCurrency((selectedCaja.montoApertura ?? 0) + (selectedCaja.totalEfectivo ?? 0) - (selectedCaja.totalRetiros ?? 0))}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Contado registrado</span><span className="font-mono">{formatCurrency(selectedCaja.montoContado)}</span></div>
              <div className={`flex justify-between font-semibold border-t pt-2 ${(selectedCaja.diferencia ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <span>Diferencia actual</span>
                <span className="font-mono">{(selectedCaja.diferencia ?? 0) >= 0 ? '+' : ''}{formatCurrency(selectedCaja.diferencia)}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nuevo monto contado <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">S/</span>
                <Input type="number" step="0.01" min="0" value={corregirForm.montoContado || ''} onChange={e => setCorregirForm(prev => ({ ...prev, montoContado: parseFloat(e.target.value) || 0 }))} className="pl-9" placeholder="0.00" autoFocus />
              </div>
              {corregirForm.montoContado >= 0 && (() => {
                const esp = (selectedCaja.montoApertura ?? 0) + (selectedCaja.totalEfectivo ?? 0) - (selectedCaja.totalRetiros ?? 0);
                const d = corregirForm.montoContado - esp;
                return <p className={`text-sm font-semibold ${d >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Nueva diferencia: {d >= 0 ? '+' : ''}S/ {d.toFixed(2)} {d > 0 ? '(sobrante)' : d < 0 ? '(faltante)' : '(cuadra exacto)'}</p>;
              })()}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observaciones (opcional)</label>
              <textarea value={corregirForm.observaciones || ''} onChange={e => setCorregirForm(prev => ({ ...prev, observaciones: e.target.value }))} placeholder="Motivo de la corrección…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setIsCorregirOpen(false)}>Cancelar</Button>
              <Button onClick={handleCorregirCierre} disabled={corrigiendo || corregirForm.montoContado < 0} className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                {corrigiendo ? 'Guardando...' : 'Guardar corrección'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Dialog: Abrir caja ─────────────────────────────────────────── */}
      <Dialog isOpen={isAbrirOpen} onClose={() => { setIsAbrirOpen(false); setMontoApertura(''); }} title="Abrir turno de caja">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Ingresa el efectivo inicial con el que empiezas la jornada.</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Fondo de apertura</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-medium text-sm">S/</span>
              <input type="number" step="0.01" min="0" value={montoApertura} onChange={e => setMontoApertura(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAbrirCaja()} placeholder="0.00" autoFocus className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <p className="text-xs text-muted-foreground">Si no tienes fondo inicial, deja en 0.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setIsAbrirOpen(false); setMontoApertura(''); }}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAbrirCaja} disabled={abriendo}>{abriendo ? 'Abriendo...' : 'Abrir turno'}</Button>
          </div>
        </div>
      </Dialog>

    </div>
  );
}

