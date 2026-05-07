import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine, X, Plus, Minus, Trash2, ShoppingCart,
  Banknote, CreditCard, Smartphone, CheckCircle2,
  ArrowLeft, Package, RotateCcw, Loader2, Search, Wallet, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productoService } from '../../services/producto.service';
import { ventaService } from '../../services/venta.service';
import { cajaService } from '../../services/caja.service';
import { useAuthStore } from '../../store/authStore';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import type { ProductoDTO, DetalleVentaDTO, CajaDTO } from '../../types';

// ── Tipos locales ──────────────────────────────────────────────────────────────

interface CartItem {
  producto: ProductoDTO;
  cantidad: number;
  precioUnitario: number;
}

type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';
type POSStep = 'venta' | 'cobro' | 'exito';

const METODOS: { id: MetodoPago; label: string; icon: React.ElementType }[] = [
  { id: 'EFECTIVO',   label: 'Efectivo',   icon: Banknote },
  { id: 'TARJETA',    label: 'Tarjeta',    icon: CreditCard },
  { id: 'YAPE_PLIN',  label: 'Yape/Plin',  icon: Smartphone },
];

// ── Componente ─────────────────────────────────────────────────────────────────

export function POSPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { config: negocio } = useTenantConfigStore();

  // ── Estado principal ──────────────────────────────────────────────────────
  const [step, setStep] = useState<POSStep>('venta');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<ProductoDTO[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO');
  const [montoPagado, setMontoPagado] = useState('');
  const [cobrando, setCobrando] = useState(false);
  const [ultimaVentaId, setUltimaVentaId] = useState<number | null>(null);
  const [todosProductos, setTodosProductos] = useState<ProductoDTO[]>([]);

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [mobileTab, setMobileTab] = useState<'productos' | 'carrito'>('productos');

  // ── Estado de caja ────────────────────────────────────────────────────
  const [cajaActiva, setCajaActiva] = useState<CajaDTO | null>(null);
  const [checkingCaja, setCheckingCaja] = useState(true);
  const [showAbrirCaja, setShowAbrirCaja] = useState(false);
  const [montoApertura, setMontoApertura] = useState('');
  const [abriendoCaja, setAbriendoCaja] = useState(false);
  const [showCerrarCaja, setShowCerrarCaja] = useState(false);
  const [montoCierre, setMontoCierre] = useState('');
  const [cerrando, setCerrando] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultadosRef = useRef<HTMLDivElement>(null);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cargar todos los productos al montar ──────────────────────────────────
  useEffect(() => {
    productoService.getAll().then(setTodosProductos).catch(() => {});
  }, []);

  // ── Verificar caja activa al montar ───────────────────────────────────────
  useEffect(() => {
    const initCaja = async () => {
      try {
        const activa = await cajaService.getActiva();
        if (activa) {
          setCajaActiva(activa);
        } else {
          setShowAbrirCaja(true);
        }
      } catch {
        setShowAbrirCaja(true);
      } finally {
        setCheckingCaja(false);
      }
    };
    initCaja();
  }, []);

  // ── Foco automático en el input ───────────────────────────────────────────
  useEffect(() => {
    if (step === 'venta') inputRef.current?.focus();
  }, [step, cart]);

  const refocus = () => setTimeout(() => inputRef.current?.focus(), 50);

  // ── Lector de código de barras ────────────────────────────────────────────
  // El lector USB escribe muy rápido (< 50ms entre chars) y termina con Enter.
  // Lo diferenciamos del tipeo humano (> 80ms entre chars) con un timer.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Solo cuando el input NO está enfocado (el lector puede disparar en cualquier foco)
      if (document.activeElement === inputRef.current) return;
      if (step !== 'venta') return;

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          buscarPorCodigo(barcodeBuffer.current);
        }
        barcodeBuffer.current = '';
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => {
          // Si pasaron 100ms sin más chars → no fue el lector, resetear
          barcodeBuffer.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step]);

  // ── Búsqueda con Enter / flechas en el input ──────────────────────────────
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (resultados.length === 0) return;
      setSelectedIndex(prev => {
        const next = prev < resultados.length - 1 ? prev + 1 : 0;
        scrollResultadoIntoView(next);
        return next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (resultados.length === 0) return;
      setSelectedIndex(prev => {
        const next = prev > 0 ? prev - 1 : resultados.length - 1;
        scrollResultadoIntoView(next);
        return next;
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;

      // Si hay un ítem seleccionado con las flechas → agregarlo
      if (selectedIndex >= 0 && resultados[selectedIndex]) {
        agregarAlCarrito(resultados[selectedIndex]);
        setQuery('');
        setResultados([]);
        setSelectedIndex(-1);
        return;
      }

      // Sin selección: si parece código de barras (sin espacios) → buscar por barras
      if (!q.includes(' ')) {
        buscarPorCodigo(q);
      } else if (resultados.length >= 1) {
        // Seleccionar el primero de la lista
        agregarAlCarrito(resultados[0]);
        setQuery('');
        setResultados([]);
        setSelectedIndex(-1);
      }
    }

    // Esc limpia la búsqueda
    if (e.key === 'Escape') {
      setQuery('');
      setResultados([]);
      setSelectedIndex(-1);
    }
  };

  const scrollResultadoIntoView = (index: number) => {
    const container = resultadosRef.current;
    if (!container) return;
    const item = container.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  };

  // ── Búsqueda por nombre (debounce) ────────────────────────────────────────
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResultados([]); return; }
    setBuscando(true);
    const t = setTimeout(() => {
      const lower = q.toLowerCase();
      const matches = todosProductos
        .filter(p => p.activo !== false)
        .filter(p =>
          p.nombre.toLowerCase().includes(lower) ||
          (p.codigoBarras ?? '').toLowerCase().includes(lower)
        )
        .slice(0, 8);
      setResultados(matches);
      setSelectedIndex(-1);
      setBuscando(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query, todosProductos]);

  // ── Búsqueda exacta por código de barras (lector) ────────────────────────
  const buscarPorCodigo = useCallback((codigo: string) => {
    const producto = todosProductos.find(
      p => p.codigoBarras?.toLowerCase() === codigo.toLowerCase()
    );
    if (producto) {
      agregarAlCarrito(producto);
      setQuery('');
      setResultados([]);
      inputRef.current?.focus();
    } else {
      toast.error(`Producto no encontrado: ${codigo}`);
    }
  }, [todosProductos]);

  // ── Carrito ───────────────────────────────────────────────────────────────
  const agregarAlCarrito = (producto: ProductoDTO, switchToCart = false) => {
    if ((producto.stockActual ?? 0) <= 0) {
      toast.error(`Sin stock: ${producto.nombre}`);
      return;
    }
    setCart(prev => {
      const idx = prev.findIndex(i => i.producto.id === producto.id);
      if (idx >= 0) {
        const newCart = [...prev];
        const item = newCart[idx];
        if (item.cantidad >= (producto.stockActual ?? 0)) {
          toast.error(`Stock máximo disponible: ${producto.stockActual}`);
          return prev;
        }
        newCart[idx] = { ...item, cantidad: item.cantidad + 1 };
        return newCart;
      }
      return [...prev, {
        producto,
        cantidad: 1,
        precioUnitario: producto.precioVenta ?? 0,
      }];
    });
    if (switchToCart) setMobileTab('carrito');
    refocus();
  };

  const cambiarCantidad = (productoId: number, delta: number) => {
    setCart(prev => prev
      .map(item => item.producto.id === productoId
        ? { ...item, cantidad: item.cantidad + delta }
        : item
      )
      .filter(item => item.cantidad > 0)
    );
  };

  const quitarItem = (productoId: number) => {
    setCart(prev => prev.filter(i => i.producto.id !== productoId));
    refocus();
  };

  const limpiarCarrito = () => {
    setCart([]);
    setQuery('');
    setResultados([]);
    refocus();
  };

  // ── Totales ───────────────────────────────────────────────────────────────
  const total = cart.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const moneda = negocio?.moneda ?? 'S/.';
  const fmt = (n: number) => `${moneda} ${n.toFixed(2)}`;

  const vuelto = metodoPago === 'EFECTIVO'
    ? Math.max(0, parseFloat(montoPagado || '0') - total)
    : 0;

  const IGV_RATE = 0.18;
  const baseImponible = total / (1 + IGV_RATE);
  const igvIncluido   = total * IGV_RATE / (1 + IGV_RATE);

  // ── Handlers de caja ─────────────────────────────────────────────────────
  const handleAbrirCaja = async () => {
    try {
      setAbriendoCaja(true);
      const monto = parseFloat(montoApertura) || 0;
      const caja = await cajaService.abrir({ montoApertura: monto });
      setCajaActiva(caja);
      setShowAbrirCaja(false);
      toast.success('Caja abierta. ¡Listo para vender!');
    } catch (err: any) {
      toast.error(err?.response?.data?.mensaje || 'Error al abrir caja');
    } finally {
      setAbriendoCaja(false);
    }
  };

  const handleCerrarCaja = async () => {
    if (!cajaActiva) return;
    try {
      setCerrando(true);
      const monto = parseFloat(montoCierre) || 0;
      await cajaService.cerrar(cajaActiva.id, { montoContado: monto });
      toast.success('Caja cerrada correctamente');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.mensaje || 'Error al cerrar caja');
    } finally {
      setCerrando(false);
    }
  };

  // ── Cobrar ────────────────────────────────────────────────────────────────
  const cobrar = async () => {
    if (cart.length === 0) return;
    if (metodoPago === 'EFECTIVO') {
      const pagado = parseFloat(montoPagado);
      if (isNaN(pagado) || pagado < total) {
        toast.error('El monto pagado es insuficiente');
        return;
      }
    }
    setCobrando(true);
    try {
      const detalles: DetalleVentaDTO[] = cart.map(item => ({
        productoId: item.producto.id!,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.cantidad * item.precioUnitario,
      }));

      const venta = await ventaService.create({
        vendedorId: user!.usuarioId,
        total,
        metodoPago,
        estado: 'COMPLETADA',
        tenantId: user!.tenantId,
        cajaId: cajaActiva?.id,
        detalles,
      });

      setUltimaVentaId(venta.id ?? null);
      setStep('exito');
    } catch {
      toast.error('Error al registrar la venta');
    } finally {
      setCobrando(false);
    }
  };

  const nuevaVenta = () => {
    setCart([]);
    setQuery('');
    setResultados([]);
    setMontoPagado('');
    setMetodoPago('EFECTIVO');
    setUltimaVentaId(null);
    setStep('venta');
  };

  // ── Atajos de teclado globales ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2' && step === 'venta' && cart.length > 0) {
        setStep('cobro');
      }
      if (e.key === 'Escape' && step === 'cobro') {
        setStep('venta');
      }
      if (e.key === 'F4' && step === 'venta') {
        limpiarCarrito();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, cart]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // Verificando estado de caja
  if (checkingCaja) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-gray-400">Verificando estado de caja...</p>
        </div>
      </div>
    );
  }

  // Pantalla de apertura de caja
  if (showAbrirCaja) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-lg space-y-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Wallet size={32} className="text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Abrir Caja</h2>
              <p className="text-gray-400 text-sm mt-1">
                Ingresa el efectivo inicial para comenzar a vender
              </p>
            </div>
            <div className="space-y-3 text-left">
              <label className="text-sm font-medium text-gray-300">Fondo de apertura</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 font-medium">S/.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoApertura}
                  onChange={e => setMontoApertura(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAbrirCaja()}
                  placeholder="0.00"
                  autoFocus
                  className="flex h-11 w-full rounded-md border border-gray-700 bg-gray-800 pl-10 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <p className="text-xs text-gray-600">Si no tienes fondo inicial, deja en 0 y haz clic en Abrir</p>
            </div>
            <button
              onClick={handleAbrirCaja}
              disabled={abriendoCaja}
              className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {abriendoCaja ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Abriendo...</>
              ) : (
                'Abrir Caja y Comenzar'
              )}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Volver al dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden select-none">

      {/* ── Barra superior ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 h-12 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <ScanLine size={18} className="text-primary" />
          <span className="font-semibold text-sm">
            {negocio?.nombreNegocio ?? 'Punto de Venta'}
          </span>
          <span className="text-gray-500 text-xs hidden sm:block">·</span>
          <span className="text-gray-400 text-xs hidden sm:block">{user?.nombre}</span>
          {cajaActiva && (
            <>
              <span className="text-gray-700 text-xs hidden sm:block">·</span>
              <span className="text-xs text-emerald-400 hidden sm:flex items-center gap-1">
                <Wallet size={12} /> Caja #{cajaActiva.id}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="hidden md:block">F2 Cobrar · F4 Limpiar · Esc Cancelar</span>
          {cajaActiva && (
            <button
              onClick={() => { setMontoCierre(''); setShowCerrarCaja(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-900/40 hover:bg-red-900/70 text-red-400 hover:text-red-300 transition-colors border border-red-900/50"
            >
              <Lock size={13} />
              <span className="hidden sm:block">Cerrar caja</span>
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:block">Salir del POS</span>
          </button>
        </div>
      </header>

      {/* ── Pantalla de éxito ───────────────────────────────────────────── */}
      {step === 'exito' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm px-6">
            <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-400">¡Venta registrada!</h2>
              {ultimaVentaId && (
                <p className="text-gray-400 text-sm mt-1">Venta #{ultimaVentaId}</p>
              )}
            </div>
            <div className="bg-gray-900 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Base imponible</span>
                <span>{fmt(baseImponible)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>IGV (18%)</span>
                <span>{fmt(igvIncluido)}</span>
              </div>
              <div className="border-t border-gray-800 pt-2 flex justify-between">
                <span className="text-gray-400">Total cobrado</span>
                <span className="font-bold text-white">{fmt(total)}</span>
              </div>
              {metodoPago === 'EFECTIVO' && parseFloat(montoPagado) > total && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Vuelto</span>
                  <span className="font-bold text-yellow-400">{fmt(vuelto)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Método</span>
                <span>{METODOS.find(m => m.id === metodoPago)?.label}</span>
              </div>
            </div>
            <button
              onClick={nuevaVenta}
              autoFocus
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 font-semibold transition-colors"
            >
              <RotateCcw size={16} className="inline mr-2" />
              Nueva venta
            </button>
          </div>
        </div>
      )}

      {/* ── Pantalla de cobro ───────────────────────────────────────────── */}
      {step === 'cobro' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Cobrar</h2>
              <button onClick={() => setStep('venta')} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Resumen con desglose IGV */}
            <div className="bg-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{cart.reduce((s, i) => s + i.cantidad, 0)} producto(s)</span>
                <span>{cart.length} línea(s)</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Base imponible</span>
                <span>{fmt(baseImponible)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>IGV (18%)</span>
                <span>{fmt(igvIncluido)}</span>
              </div>
              <div className="border-t border-gray-700 pt-2 flex justify-between items-baseline">
                <span className="text-gray-300 font-medium">Total</span>
                <span className="text-3xl font-bold text-white">{fmt(total)}</span>
              </div>
            </div>

            {/* Método de pago */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Método de pago</p>
              <div className="grid grid-cols-3 gap-2">
                {METODOS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMetodoPago(m.id)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-all ${
                        metodoPago === m.id
                          ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
                      }`}
                    >
                      <Icon size={18} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monto pagado (solo efectivo) */}
            {metodoPago === 'EFECTIVO' && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Monto recibido</p>
                <input
                  type="number"
                  autoFocus
                  value={montoPagado}
                  onChange={e => setMontoPagado(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && cobrar()}
                  placeholder={`Mínimo ${fmt(total)}`}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:border-primary"
                />
                {parseFloat(montoPagado) >= total && (
                  <div className="flex justify-between text-sm mt-2 px-1">
                    <span className="text-gray-400">Vuelto</span>
                    <span className="font-bold text-yellow-400 text-lg">{fmt(vuelto)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Botón cobrar */}
            <button
              onClick={cobrar}
              disabled={cobrando || (metodoPago === 'EFECTIVO' && parseFloat(montoPagado || '0') < total)}
              className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-lg transition-all"
            >
              {cobrando ? (
                <Loader2 size={20} className="animate-spin inline mr-2" />
              ) : (
                <CheckCircle2 size={20} className="inline mr-2" />
              )}
              {cobrando ? 'Procesando...' : 'Confirmar cobro'}
            </button>
          </div>
        </div>
      )}

      {/* ── Pantalla principal de venta ─────────────────────────────────── */}
      {step === 'venta' && (
        <div className="flex-1 flex overflow-hidden">

          {/* ════════════════════════════════════════════════════════════
              DESKTOP: split layout (lg+)
          ════════════════════════════════════════════════════════════ */}

          {/* Panel izquierdo: búsqueda + resultados */}
          <div className="hidden lg:flex flex-1 flex-col border-r border-gray-800 min-w-0">
            {/* Input búsqueda */}
            <div className="p-3 border-b border-gray-800">
              <div className="relative">
                <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Escanea código de barras o escribe el nombre del producto..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary placeholder-gray-600"
                  autoComplete="off"
                />
                {buscando && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />}
              </div>
            </div>
            {/* Resultados */}
            {resultados.length > 0 && (
              <div ref={resultadosRef} className="flex-1 overflow-y-auto p-2 space-y-1">
                {resultados.map((p, idx) => {
                  const isActive = idx === selectedIndex;
                  return (
                    <button key={p.id}
                      onClick={() => { agregarAlCarrito(p); setQuery(''); setResultados([]); setSelectedIndex(-1); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group ${isActive ? 'bg-primary/20 border border-primary/40' : 'hover:bg-gray-800 border border-transparent'}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-primary/30' : 'bg-gray-800 group-hover:bg-gray-700'}`}>
                        <Package size={16} className={isActive ? 'text-primary' : 'text-gray-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : ''}`}>{p.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {p.codigoBarras && <span className="mr-2">{p.codigoBarras}</span>}
                          Stock: <span className={p.stockActual! <= 0 ? 'text-red-400' : 'text-gray-400'}>{p.stockActual}</span>
                        </p>
                      </div>
                      <p className="text-sm font-bold text-primary flex-shrink-0">{fmt(p.precioVenta ?? 0)}</p>
                    </button>
                  );
                })}
              </div>
            )}
            {/* Grid rápido */}
            {resultados.length === 0 && query === '' && (
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-xs text-gray-600 uppercase tracking-wider mb-2 px-1">Productos disponibles</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {todosProductos.filter(p => p.activo !== false && (p.stockActual ?? 0) > 0).slice(0, 12).map(p => (
                    <button key={p.id} onClick={() => agregarAlCarrito(p)}
                      className="flex flex-col items-start p-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-left transition-all"
                    >
                      <p className="text-xs font-medium leading-snug line-clamp-2 mb-2">{p.nombre}</p>
                      <p className="text-sm font-bold text-primary mt-auto">{fmt(p.precioVenta ?? 0)}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">Stock: {p.stockActual}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {resultados.length === 0 && query !== '' && !buscando && (
              <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                No se encontraron productos para "{query}"
              </div>
            )}
          </div>

          {/* Panel derecho carrito — desktop */}
          <div className="hidden lg:flex w-72 xl:w-80 flex-col bg-gray-900 flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-gray-400" />
                <span className="text-sm font-semibold">Carrito</span>
                {cart.length > 0 && (
                  <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {cart.reduce((s, i) => s + i.cantidad, 0)}
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button onClick={limpiarCarrito} className="text-xs text-gray-500 hover:text-red-400 transition-colors" title="Limpiar carrito (F4)">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-700 gap-2">
                  <ShoppingCart size={32} />
                  <p className="text-sm">Carrito vacío</p>
                  <p className="text-xs text-center px-4">Escanea un producto o búscalo por nombre</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.producto.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-800 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight truncate">{item.producto.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{fmt(item.precioUnitario)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => cambiarCantidad(item.producto.id!, -1)} className="w-6 h-6 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center"><Minus size={11} /></button>
                      <span className="w-6 text-center text-sm font-bold">{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(item.producto.id!, 1)} disabled={item.cantidad >= (item.producto.stockActual ?? 0)} className="w-6 h-6 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-30 flex items-center justify-center"><Plus size={11} /></button>
                    </div>
                    <div className="text-right min-w-[52px] flex-shrink-0">
                      <p className="text-xs font-bold">{fmt(item.cantidad * item.precioUnitario)}</p>
                    </div>
                    <button onClick={() => quitarItem(item.producto.id!)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0"><X size={13} /></button>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-800 p-4 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-400">{cart.reduce((s, i) => s + i.cantidad, 0)} producto(s)</span>
                <span className="text-2xl font-bold">{fmt(total)}</span>
              </div>
              <button onClick={() => setStep('cobro')} disabled={cart.length === 0}
                className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-base transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />Cobrar
                <span className="text-green-200 text-xs font-normal ml-1">F2</span>
              </button>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════
              MOBILE: layout con pestañas (< lg)
          ════════════════════════════════════════════════════════════ */}
          <div className="flex lg:hidden flex-col flex-1 overflow-hidden">

            {/* Tabs */}
            <div className="flex border-b border-gray-800 flex-shrink-0">
              <button
                onClick={() => setMobileTab('productos')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                  mobileTab === 'productos'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Search size={15} />
                Productos
              </button>
              <button
                onClick={() => setMobileTab('carrito')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                  mobileTab === 'carrito'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <ShoppingCart size={15} />
                Carrito
                {cart.length > 0 && (
                  <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {cart.reduce((s, i) => s + i.cantidad, 0)}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Productos */}
            {mobileTab === 'productos' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Input búsqueda */}
                <div className="p-3 border-b border-gray-800">
                  <div className="relative">
                    <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Nombre o código de barras..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-primary placeholder-gray-600"
                      autoComplete="off"
                    />
                    {buscando && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />}
                  </div>
                </div>
                {/* Resultados búsqueda */}
                {resultados.length > 0 && (
                  <div ref={resultadosRef} className="flex-1 overflow-y-auto p-2 space-y-1">
                    {resultados.map((p, idx) => {
                      const isActive = idx === selectedIndex;
                      return (
                        <button key={p.id}
                          onClick={() => { agregarAlCarrito(p); setQuery(''); setResultados([]); setSelectedIndex(-1); }}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${isActive ? 'bg-primary/20 border border-primary/40' : 'hover:bg-gray-800 border border-transparent'}`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-primary/30' : 'bg-gray-800'}`}>
                            <Package size={18} className={isActive ? 'text-primary' : 'text-gray-500'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.nombre}</p>
                            <p className="text-xs text-gray-500">
                              Stock: <span className={p.stockActual! <= 0 ? 'text-red-400' : 'text-gray-400'}>{p.stockActual}</span>
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-bold text-primary">{fmt(p.precioVenta ?? 0)}</p>
                            <p className="text-[10px] text-gray-600">toca para agregar</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Grid rápido móvil */}
                {resultados.length === 0 && query === '' && (
                  <div className="flex-1 overflow-y-auto p-3">
                    <p className="text-xs text-gray-600 uppercase tracking-wider mb-2 px-1">Toca para agregar</p>
                    <div className="grid grid-cols-2 gap-2">
                      {todosProductos.filter(p => p.activo !== false && (p.stockActual ?? 0) > 0).slice(0, 16).map(p => (
                        <button key={p.id}
                          onClick={() => agregarAlCarrito(p)}
                          className="flex flex-col items-start p-3 rounded-xl bg-gray-900 active:bg-gray-700 border border-gray-800 text-left transition-all"
                        >
                          <p className="text-xs font-medium leading-snug line-clamp-2 mb-2">{p.nombre}</p>
                          <p className="text-base font-bold text-primary mt-auto">{fmt(p.precioVenta ?? 0)}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">Stock: {p.stockActual}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {resultados.length === 0 && query !== '' && !buscando && (
                  <div className="flex-1 flex items-center justify-center text-gray-600 text-sm px-4 text-center">
                    No se encontraron productos para "{query}"
                  </div>
                )}
                {/* Botón flotante ir al carrito (si hay items) */}
                {cart.length > 0 && (
                  <div className="p-3 border-t border-gray-800 flex-shrink-0">
                    <button
                      onClick={() => setMobileTab('carrito')}
                      className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <ShoppingCart size={16} />
                      Ver carrito · {fmt(total)}
                      <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {cart.reduce((s, i) => s + i.cantidad, 0)}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab Carrito móvil */}
            {mobileTab === 'carrito' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header carrito */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
                  <span className="text-sm font-semibold">
                    {cart.length === 0 ? 'Carrito vacío' : `${cart.reduce((s, i) => s + i.cantidad, 0)} producto(s)`}
                  </span>
                  {cart.length > 0 && (
                    <button onClick={limpiarCarrito} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors">
                      <Trash2 size={13} /> Limpiar
                    </button>
                  )}
                </div>
                {/* Items */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-700 gap-3 py-12">
                      <ShoppingCart size={40} />
                      <p className="text-sm">Agrega productos desde la pestaña Productos</p>
                      <button onClick={() => setMobileTab('productos')} className="text-primary text-sm underline">
                        Ir a productos
                      </button>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.producto.id} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-900 border border-gray-800">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{item.producto.nombre}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{fmt(item.precioUnitario)} c/u</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => cambiarCantidad(item.producto.id!, -1)}
                            className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center">
                            <Minus size={13} />
                          </button>
                          <span className="w-7 text-center text-sm font-bold">{item.cantidad}</span>
                          <button onClick={() => cambiarCantidad(item.producto.id!, 1)}
                            disabled={item.cantidad >= (item.producto.stockActual ?? 0)}
                            className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 flex items-center justify-center">
                            <Plus size={13} />
                          </button>
                        </div>
                        <div className="text-right min-w-[60px] flex-shrink-0">
                          <p className="text-sm font-bold text-primary">{fmt(item.cantidad * item.precioUnitario)}</p>
                          <button onClick={() => quitarItem(item.producto.id!)} className="text-gray-600 hover:text-red-400 transition-colors mt-0.5">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {/* Total + cobrar */}
                {cart.length > 0 && (
                  <div className="border-t border-gray-800 p-4 space-y-3 flex-shrink-0">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-gray-400">Total</span>
                      <span className="text-2xl font-bold">{fmt(total)}</span>
                    </div>
                    <button onClick={() => setStep('cobro')}
                      className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 font-bold text-lg transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={20} />Cobrar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Modal: Cerrar Caja ──────────────────────────────────────────── */}
      {showCerrarCaja && cajaActiva && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Lock size={18} className="text-red-400" /> Cerrar Caja
              </h2>
              <button onClick={() => setShowCerrarCaja(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Fondo apertura</span>
                <span className="font-mono">S/. {(cajaActiva.montoApertura ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Ventas efectivo</span>
                <span className="font-mono">S/. {(cajaActiva.totalEfectivo ?? 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-700 pt-2 flex justify-between font-semibold">
                <span>Esperado en caja</span>
                <span className="font-mono text-white">S/. {((cajaActiva.montoApertura ?? 0) + (cajaActiva.totalEfectivo ?? 0)).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">Efectivo contado físicamente</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 text-sm font-medium">S/.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoCierre}
                  onChange={e => setMontoCierre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCerrarCaja()}
                  placeholder="0.00"
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-lg font-bold text-center focus:outline-none focus:border-primary text-white"
                />
              </div>
              {parseFloat(montoCierre) > 0 && (() => {
                const diff = parseFloat(montoCierre) - ((cajaActiva.montoApertura ?? 0) + (cajaActiva.totalEfectivo ?? 0));
                return (
                  <p className={`text-sm font-semibold mt-2 ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    Diferencia: {diff >= 0 ? '+' : ''}S/. {diff.toFixed(2)} {diff > 0 ? '(sobrante)' : diff < 0 ? '(faltante)' : '(exacto)'}
                  </p>
                );
              })()}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCerrarCaja(false)}
                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarCaja}
                disabled={cerrando}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {cerrando ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Cerrando...</> : <><Lock size={15} /> Cerrar Caja</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
