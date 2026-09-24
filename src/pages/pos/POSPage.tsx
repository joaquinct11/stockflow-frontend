import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X, Plus, Minus, Trash2, ShoppingCart,
  Banknote, CreditCard, Smartphone, CheckCircle2,
  ArrowLeft, Loader2, Wallet, Lock, Tag, User, UserPlus,
  Camera, CameraOff, Printer, Download, Edit2, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productoService } from '../../services/producto.service';
import { sucursalService } from '../../services/sucursal.service';
import { ventaService } from '../../services/venta.service';
import { cajaService } from '../../services/caja.service';
import { notaCreditoService } from '../../services/notaCredito.service';
import { clienteService } from '../../services/cliente.service';
import type { ClienteDTO } from '../../services/cliente.service';
import { useAuthStore } from '../../store/authStore';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { useSucursalStore } from '../../store/sucursalStore';
import type { ProductoDTO, DetalleVentaDTO, CajaDTO, ValidarNotaCreditoResponseDTO, VentaDTO, ProductoVarianteDTO, ProductoPresentacionDTO } from '../../types';
import { printVentaTicket } from '../../utils/printTicket';
import { refreshOnboarding } from '../../utils/onboardingEvents';
import { productoVarianteService } from '../../services/productoVariante.service';
import { productoPresentacionService } from '../../services/productoPresentacion.service';
import { axiosInstance } from '../../api/axios.config';
import { movimientoService } from '../../services/movimiento.service';
import type { LoteVencimientoDTO, StockLoteDisponibleDTO } from '../../services/movimiento.service';

// ── Tipos locales ──────────────────────────────────────────────────────────────

interface CartItem {
  producto: ProductoDTO;
  cantidad: number;
  precioUnitario: number;
  varianteId?: number;
  varianteDescripcion?: string;
  stockLoteId?: number;
  stockLoteLabel?: string;
  presentacionId?: number;
  /** Cuántas unidades base descuenta del stock. 1 = unidad principal. */
  factor?: number;
}

const cartItemKey = (item: { producto: ProductoDTO; varianteId?: number; stockLoteId?: number }) =>
  item.varianteId ? `${item.producto.id}-v${item.varianteId}` :
  item.stockLoteId ? `${item.producto.id}-l${item.stockLoteId}` :
  `${item.producto.id}`;

type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';
type POSStep = 'venta' | 'cobro' | 'exito';
type TipoComprobante = 'TICKET' | 'BOLETA' | 'FACTURA';

const METODOS: { id: MetodoPago; label: string; icon: React.ElementType }[] = [
  { id: 'EFECTIVO',   label: 'Efectivo',   icon: Banknote },
  { id: 'TARJETA',    label: 'Tarjeta',    icon: CreditCard },
  { id: 'YAPE_PLIN',  label: 'Yape/Plin',  icon: Smartphone },
];

// ── Componente ─────────────────────────────────────────────────────────────────

export function POSPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { config: negocio } = useTenantConfigStore();
  const { sucursalActual, sucursales, loaded: sucursalLoaded, setSucursales } = useSucursalStore();
  const isMultiLocal = sucursales.length > 1;
  const sucursalId = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;
  const esRopa = negocio?.rubro === 'TIENDA_ROPA';
  const esFarmacia = negocio?.rubro === 'BOTICA' || negocio?.rubro === 'FARMACIA';

  useEffect(() => {
    if (sucursalLoaded) return;
    sucursalService.listar()
      .then(setSucursales)
      .catch(() => setSucursales([]));
  }, [sucursalLoaded, setSucursales]);

  // ── Lotes por producto (solo farmacia) ───────────────────────────────────
  const [proximoVencimientoMap, setProximoVencimientoMap] = useState<Map<number, LoteVencimientoDTO>>(new Map());
  const [loteCountMap, setLoteCountMap] = useState<Map<number, number>>(new Map());

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
  const [ultimaVenta, setUltimaVenta] = useState<VentaDTO | null>(null);
  const [todosProductos, setTodosProductos] = useState<ProductoDTO[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  // ── Selector de variantes ──────────────────────────────────────────────────
  const [variantePickerOpen, setVariantePickerOpen] = useState(false);
  const [variantePickerProducto, setVariantePickerProducto] = useState<ProductoDTO | null>(null);
  const [variantesDisponibles, setVariantesDisponibles] = useState<ProductoVarianteDTO[]>([]);
  const [loadingVariantes, setLoadingVariantes] = useState(false);
  const [variantePrecioOverrides, setVariantePrecioOverrides] = useState<Record<number, string>>({});

  // ── Selector de presentaciones (farmacia multi-unidad) ───────────────────
  const [presentacionPickerOpen, setPresentacionPickerOpen] = useState(false);
  const [presentacionPickerProducto, setPresentacionPickerProducto] = useState<ProductoDTO | null>(null);
  const [presentacionesDisponibles, setPresentacionesDisponibles] = useState<ProductoPresentacionDTO[]>([]);
  const [, setLoadingPresentaciones] = useState(false);

  // ── Selector de lotes (farmacia) ───────────────────────────────────────────
  const [lotePickerOpen, setLotePickerOpen] = useState(false);
  const [lotePickerProducto, setLotePickerProducto] = useState<ProductoDTO | null>(null);
  const [lotesDisponibles, setLotesDisponibles] = useState<StockLoteDisponibleDTO[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  // Presentación seleccionada pendiente de asignar lote
  const [pendingPresentacion, setPendingPresentacion] = useState<{ id?: number; factor: number; precio: number; label: string } | null>(null);

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [soloGenerico, setSoloGenerico] = useState(false);

  // ── Estado de nota de credito ─────────────────────────────────────────
  const [ncCodigo, setNcCodigo] = useState('');
  const [ncInfo, setNcInfo] = useState<ValidarNotaCreditoResponseDTO | null>(null);
  const [ncLoading, setNcLoading] = useState(false);

  // ── Estado de cliente ─────────────────────────────────────────────────
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResultados, setClienteResultados] = useState<ClienteDTO[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteDTO | null>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [showRegistrarCliente, setShowRegistrarCliente] = useState(false);
  const [nuevoClienteForm, setNuevoClienteForm] = useState({
    nombre: '', tipoDocumento: 'DNI', numeroDocumento: '',
  });
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  // ── Estado de caja ────────────────────────────────────────────────────
  const [cajaActiva, setCajaActiva] = useState<CajaDTO | null>(null);
  const [checkingCaja, setCheckingCaja] = useState(true);
  const [showAbrirCaja, setShowAbrirCaja] = useState(false);
  const [montoApertura, setMontoApertura] = useState('');
  const [abriendoCaja, setAbriendoCaja] = useState(false);
  const [showCerrarCaja, setShowCerrarCaja] = useState(false);
  const [montoCierre, setMontoCierre] = useState('');
  const [cerrando, setCerrando] = useState(false);

  // ── Estado de comprobante ─────────────────────────────────────────────
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>('TICKET');
  const [receptor, setReceptor] = useState({ docTipo: 'DNI', docNumero: '', nombre: '', direccion: '' });
  const [ultimoComprobanteId, setUltimoComprobanteId] = useState<number | null>(null);

  // ── Precio editable (solo TIENDA_ROPA) ───────────────────────────────
  const [editandoPrecio, setEditandoPrecio] = useState<{ key: string; valor: string } | null>(null);

  const iniciarEditarPrecio = (key: string, precioActual: number) => {
    setEditandoPrecio({ key, valor: String(precioActual) });
  };

  const confirmarPrecio = (key: string) => {
    const nuevo = parseFloat(editandoPrecio?.valor ?? '');
    if (!isNaN(nuevo) && nuevo > 0) {
      setCart(prev => prev.map(item =>
        cartItemKey(item) === key ? { ...item, precioUnitario: nuevo } : item
      ));
    }
    setEditandoPrecio(null);
  };

  // ── Estado de cámara ─────────────────────────────────────────────────
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultadosRef = useRef<HTMLDivElement>(null);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartPreloadedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  // ── Cargar todos los productos al montar ──────────────────────────────────
  useEffect(() => {
    if (!sucursalLoaded) return;
    let cancelado = false;
    const cargar = () => {
      productoService.getAll(sucursalId)
        .then(productos => {
          if (!cancelado) {
            setTodosProductos(productos);
            setCargandoProductos(false);
          }
        })
        .catch(() => {
          if (!cancelado) setTimeout(cargar, 2000);
        });
    };
    cargar();
    return () => { cancelado = true; };
  }, [sucursalLoaded, sucursalId]);

  useEffect(() => {
    if (!esFarmacia) return;
    movimientoService.getLotes().then(lotes => {
      const map = new Map<number, LoteVencimientoDTO>();
      const conFecha = lotes.filter(l => l.fechaVencimiento);
      const porProducto = new Map<number, LoteVencimientoDTO[]>();
      conFecha.forEach(l => {
        if (!porProducto.has(l.productoId)) porProducto.set(l.productoId, []);
        porProducto.get(l.productoId)!.push(l);
      });
      porProducto.forEach((lotesProducto, productoId) => {
        const vigentes = lotesProducto.filter(l => l.diasRestantes >= 0)
          .sort((a, b) => a.diasRestantes - b.diasRestantes);
        const vencidos = lotesProducto.filter(l => l.diasRestantes < 0)
          .sort((a, b) => b.diasRestantes - a.diasRestantes);
        map.set(productoId, vigentes.length > 0 ? vigentes[0] : vencidos[0]);
      });
      setProximoVencimientoMap(map);
      const countMap = new Map<number, number>();
      porProducto.forEach((lotesProducto, productoId) => {
        const vigentes = lotesProducto.filter(l => l.diasRestantes >= 0).length;
        countMap.set(productoId, vigentes > 0 ? vigentes : lotesProducto.length);
      });
      setLoteCountMap(countMap);
    }).catch(() => {});
  }, [esFarmacia]);

  const getStockDisponible = (p: ProductoDTO) => p.stockVigente ?? p.stockActual ?? 0;

  // ── Precargar carrito desde venta anulada ────────────────────────────
  useEffect(() => {
    const ventaOrigen = location.state?.cargarVenta;
    if (cartPreloadedRef.current || !ventaOrigen || todosProductos.length === 0) return;
    cartPreloadedRef.current = true;
    const items: CartItem[] = [];
    const sinStock: string[] = [];
    const noEncontrados: string[] = [];
    for (const detalle of ventaOrigen.detalles ?? []) {
      const producto = todosProductos.find((p: ProductoDTO) => p.id === detalle.productoId);
      if (!producto) { noEncontrados.push(detalle.productoNombre || `#${detalle.productoId}`); continue; }
      if (getStockDisponible(producto) <= 0) { sinStock.push(producto.nombre); continue; }
      items.push({ producto, cantidad: Math.min(detalle.cantidad, producto.stockActual ?? 1), precioUnitario: detalle.precioUnitario });
    }
    if (items.length > 0) { setCart(items); toast.success(`Carrito precargado con ${items.length} producto(s) de la Venta #${ventaOrigen.id}`); }
    if (sinStock.length > 0) toast.error(`Sin stock: ${sinStock.join(', ')}`);
    if (noEncontrados.length > 0) toast.error(`Productos no encontrados: ${noEncontrados.join(', ')}`);
    window.history.replaceState({}, '');
  }, [todosProductos, location.state]);

  // ── Verificar caja activa al montar ───────────────────────────────────────
  useEffect(() => {
    const initCaja = async () => {
      try {
        const activa = await cajaService.getActiva(sucursalId);
        if (activa) { setCajaActiva(activa); } else { setShowAbrirCaja(true); }
      } catch { setShowAbrirCaja(true); }
      finally { setCheckingCaja(false); }
    };
    initCaja();
  }, []);

  // ── Foco automático ───────────────────────────────────────────────────────
  useEffect(() => {
    if (step === 'venta') inputRef.current?.focus();
  }, [step, cart]);

  const refocus = () => setTimeout(() => inputRef.current?.focus(), 50);

  // ── Lector de código de barras ────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) return;
      if (step !== 'venta') return;
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) buscarPorCodigo(barcodeBuffer.current);
        barcodeBuffer.current = '';
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ''; }, 100);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step]);

  // ── Búsqueda con Enter / flechas ──────────────────────────────────────────
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (resultados.length === 0) return;
      setSelectedIndex(prev => { const next = prev < resultados.length - 1 ? prev + 1 : 0; scrollResultadoIntoView(next); return next; });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (resultados.length === 0) return;
      setSelectedIndex(prev => { const next = prev > 0 ? prev - 1 : resultados.length - 1; scrollResultadoIntoView(next); return next; });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;
      if (selectedIndex >= 0 && resultados[selectedIndex]) {
        agregarAlCarrito(resultados[selectedIndex]); setQuery(''); setResultados([]); setSelectedIndex(-1); return;
      }
      if (!q.includes(' ')) { buscarPorCodigo(q); }
      else if (resultados.length >= 1) { agregarAlCarrito(resultados[0]); setQuery(''); setResultados([]); setSelectedIndex(-1); }
    }
    if (e.key === 'Escape') { setQuery(''); setResultados([]); setSelectedIndex(-1); }
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
        .filter(p => !soloGenerico || p.esGenerico === true)
        .filter(p => p.nombre.toLowerCase().includes(lower) || (p.codigoBarras ?? '').toLowerCase().includes(lower) || (p.componentes ?? '').toLowerCase().includes(lower))
        .sort((a, b) => {
          const aStarts = a.nombre.toLowerCase().startsWith(lower);
          const bStarts = b.nombre.toLowerCase().startsWith(lower);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return a.nombre.localeCompare(b.nombre);
        })
        .slice(0, 20);
      setResultados(matches); setSelectedIndex(-1); setBuscando(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query, todosProductos, soloGenerico]);

  // ── Grid ordenado: próximos a vencer primero ─────────────────────────────
  const productosDisponibles = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy); limite.setDate(limite.getDate() + 90);
    return todosProductos
      .filter(p => p.activo !== false && getStockDisponible(p) > 0)
      .filter(p => !soloGenerico || p.esGenerico === true)
      .sort((a, b) => {
        const fvA = a.proximaFechaVencimiento ? new Date(a.proximaFechaVencimiento + 'T00:00:00') : null;
        const fvB = b.proximaFechaVencimiento ? new Date(b.proximaFechaVencimiento + 'T00:00:00') : null;
        const aProximo = fvA && fvA >= hoy && fvA <= limite;
        const bProximo = fvB && fvB >= hoy && fvB <= limite;
        if (aProximo && !bProximo) return -1;
        if (!aProximo && bProximo) return 1;
        if (aProximo && bProximo) return fvA!.getTime() - fvB!.getTime();
        return 0;
      });
  }, [todosProductos, soloGenerico]);

  // ── Búsqueda exacta por código de barras ────────────────────────────────
  const buscarPorCodigo = useCallback((codigo: string) => {
    const producto = todosProductos.find(p => p.codigoBarras?.toLowerCase() === codigo.toLowerCase());
    if (producto) { agregarAlCarrito(producto); setQuery(''); setResultados([]); inputRef.current?.focus(); }
    else { toast.error(`Producto no encontrado: ${codigo}`); }
  }, [todosProductos]);

  // ── Escáner de cámara ────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setShowCameraScanner(false); setCameraError(null);
  }, []);

  const openCamera = useCallback(async () => {
    setCameraError(null); setShowCameraScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      if (!('BarcodeDetector' in window)) {
        setCameraError('Tu navegador no soporta escaneo automático. Usa Chrome en Android o escribe el código manualmente.'); return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e', 'itf'] });
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) { const code: string = barcodes[0].rawValue; stopCamera(); buscarPorCodigo(code); }
        } catch { /* ignore */ }
      }, 250);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) setCameraError('Permiso de cámara denegado.');
      else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('devicenotfound')) setCameraError('No se encontró ninguna cámara.');
      else setCameraError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }, [stopCamera, buscarPorCodigo]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Carrito ───────────────────────────────────────────────────────────────
  // pp se pasa directamente para evitar leer pendingPresentacion desde closure stale (async/await)
  const abrirLotePickerParaProducto = async (
    producto: ProductoDTO,
    pp?: { id?: number; factor: number; precio: number; label: string } | null,
  ) => {
    if (producto.stockVigente != null) {
      try {
        setLoadingLotes(true);
        const lotes = await movimientoService.getLotesDisponibles(producto.id!, sucursalId);
        if (lotes.length > 0) {
          // Guardar pp en estado para que los onClick del lote picker lo lean correctamente
          setPendingPresentacion(pp ?? null);
          setLotePickerProducto(producto); setLotesDisponibles(lotes); setLotePickerOpen(true); return;
        }
      } catch { /* sin lotes */ } finally { setLoadingLotes(false); }
    }
    // Sin lotes (o producto sin stockVigente): agregar directo al carrito
    if (getStockDisponible(producto) <= 0) { toast.error(`Sin stock disponible: ${producto.nombre}`); return; }
    agregarItemAlCarrito(producto, undefined, pp?.label, true, pp?.precio ?? producto.precioVenta, undefined, undefined, pp?.id, pp?.factor ?? 1);
  };

  const agregarAlCarrito = async (producto: ProductoDTO, switchToCart = false) => {
    if (esRopa) {
      try {
        setLoadingVariantes(true);
        const vars = await productoVarianteService.getByProducto(producto.id!, sucursalId);
        const activas = vars.filter(v => v.activo !== false && (v.stockActual ?? 0) > 0);
        if (activas.length > 0) {
          setVariantePickerProducto(producto); setVariantesDisponibles(activas);
          const overrides: Record<number, string> = {};
          activas.forEach(v => { overrides[v.id!] = (producto.precioVenta ?? 0).toFixed(2); });
          setVariantePrecioOverrides(overrides); setVariantePickerOpen(true); setLoadingVariantes(false); return;
        }
      } catch { /* sin variantes */ } finally { setLoadingVariantes(false); }
    }
    if (esFarmacia) {
      try {
        setLoadingPresentaciones(true);
        const presentaciones = await productoPresentacionService.listar(producto.id!);
        if (presentaciones.length > 0) {
          setPresentacionPickerProducto(producto);
          setPresentacionesDisponibles(presentaciones);
          setPresentacionPickerOpen(true);
          setLoadingPresentaciones(false);
          return;
        }
      } catch { /* sin presentaciones */ } finally { setLoadingPresentaciones(false); }
    }
    if (esFarmacia && producto.stockVigente != null) {
      await abrirLotePickerParaProducto(producto);
      return;
    }
    if (getStockDisponible(producto) <= 0) { toast.error(`Sin stock disponible: ${producto.nombre}`); return; }
    agregarItemAlCarrito(producto, undefined, undefined, switchToCart);
  };

  const agregarItemAlCarrito = (
    producto: ProductoDTO, varianteId?: number, varianteDescripcion?: string,
    switchToCart = false, precioOverride?: number, stockLoteId?: number, stockLoteLabel?: string,
    presentacionId?: number, factor?: number,
  ) => {
    setCart(prev => {
      const key = cartItemKey({ producto, varianteId, stockLoteId });
      const idx = prev.findIndex(i => cartItemKey(i) === key);
      if (idx >= 0) {
        const newCart = [...prev];
        const item = newCart[idx];
        const itemFactor = item.factor ?? 1;
        const stockMax = varianteId
          ? (variantesDisponibles.find(v => v.id === varianteId)?.stockActual ?? getStockDisponible(producto))
          : stockLoteId
            ? (lotesDisponibles.find(l => l.id === stockLoteId)?.stockActual ?? getStockDisponible(producto))
            : Math.floor(getStockDisponible(producto) / itemFactor);
        if (item.cantidad >= stockMax) { toast.error(`Stock máximo disponible: ${stockMax}`); return prev; }
        newCart[idx] = { ...item, cantidad: item.cantidad + 1 };
        return newCart;
      }
      const precio = (precioOverride != null && precioOverride > 0) ? precioOverride : (producto.precioVenta ?? 0);
      return [...prev, { producto, cantidad: 1, precioUnitario: precio, varianteId, varianteDescripcion, stockLoteId, stockLoteLabel, presentacionId, factor: factor ?? 1 }];
    });
    if (switchToCart) setMobileCartOpen(true);
    refocus();
  };

  const cambiarCantidad = (key: string, delta: number) => {
    setCart(prev => prev.map(item => cartItemKey(item) === key ? { ...item, cantidad: item.cantidad + delta } : item).filter(item => item.cantidad > 0));
  };

  const quitarItem = (key: string) => { setCart(prev => prev.filter(i => cartItemKey(i) !== key)); refocus(); };


  const limpiarCarrito = () => { setCart([]); setQuery(''); setResultados([]); refocus(); };

  // ── Totales ───────────────────────────────────────────────────────────────
  const subtotalCarrito = cart.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const descuentoNc = ncInfo?.valida ? Math.min(ncInfo.montoTotal, subtotalCarrito) : 0;
  const total = Math.max(0, subtotalCarrito - descuentoNc);
  const moneda = negocio?.moneda ?? 'S/.';
  const fmt = (n: number) => `${moneda} ${n.toFixed(2)}`;
  const vuelto = metodoPago === 'EFECTIVO' ? Math.max(0, parseFloat(montoPagado || '0') - total) : 0;
  const IGV_RATE = 0.18;
  const baseImponible = total / (1 + IGV_RATE);
  const igvIncluido   = total * IGV_RATE / (1 + IGV_RATE);

  // ── Handlers de caja ─────────────────────────────────────────────────────
  const handleAbrirCaja = async () => {
    try {
      setAbriendoCaja(true);
      const monto = parseFloat(montoApertura) || 0;
      const caja = await cajaService.abrir({ montoApertura: monto, sucursalId });
      setCajaActiva(caja); setShowAbrirCaja(false);
      toast.success('Caja abierta. ¡Listo para vender!'); refreshOnboarding();
    } catch (err: any) { toast.error(err?.response?.data?.mensaje || 'Error al abrir caja'); }
    finally { setAbriendoCaja(false); }
  };

  const handleCerrarCaja = async () => {
    if (!cajaActiva) return;
    try {
      setCerrando(true);
      const monto = parseFloat(montoCierre) || 0;
      await cajaService.cerrar(cajaActiva.id, { montoContado: monto });
      toast.success('Caja cerrada correctamente'); navigate('/dashboard');
    } catch (err: any) { toast.error(err?.response?.data?.mensaje || 'Error al cerrar caja'); }
    finally { setCerrando(false); }
  };

  // ── Nota de crédito ───────────────────────────────────────────────────────
  const handleValidarNc = async () => {
    if (!ncCodigo) return;
    setNcLoading(true);
    try {
      const result = await notaCreditoService.validar(ncCodigo);
      setNcInfo(result);
      if (!result.valida) toast.error(result.mensaje);
      else toast.success(`Nota de crédito válida: ${moneda} ${result.montoTotal.toFixed(2)}`);
    } catch { toast.error('Error al validar la nota de crédito'); }
    finally { setNcLoading(false); }
  };

  const quitarNc = () => { setNcCodigo(''); setNcInfo(null); };

  // ── Búsqueda de clientes ──────────────────────────────────────────────────
  useEffect(() => {
    if (clienteSeleccionado) return;
    const q = clienteQuery.trim();
    if (!q) { setClienteResultados([]); setShowRegistrarCliente(false); return; }
    setBuscandoCliente(true);
    const t = setTimeout(async () => {
      try {
        const resultados = /^\d+$/.test(q) ? await clienteService.buscarPorDocumento(q) : await clienteService.search(q);
        setClienteResultados(resultados); setShowRegistrarCliente(resultados.length === 0);
        if (resultados.length === 0 && /^\d+$/.test(q)) {
          setNuevoClienteForm(prev => ({ ...prev, numeroDocumento: q }));
          setReceptor(r => ({ ...r, docNumero: q }));
        }
      } catch { setClienteResultados([]); }
      finally { setBuscandoCliente(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [clienteQuery, clienteSeleccionado]);

  const seleccionarCliente = (c: ClienteDTO) => {
    setClienteSeleccionado(c); setClienteQuery(''); setClienteResultados([]); setShowRegistrarCliente(false);
  };

  const seleccionarClienteComoReceptor = (c: ClienteDTO) => {
    seleccionarCliente(c);
    setReceptor({ docTipo: c.tipoDocumento || (tipoComprobante === 'FACTURA' ? 'RUC' : 'DNI'), docNumero: c.numeroDocumento || '', nombre: c.nombre || '', direccion: '' });
  };

  const quitarClienteYReceptor = () => {
    setClienteSeleccionado(null); setClienteQuery(''); setClienteResultados([]); setShowRegistrarCliente(false);
    setReceptor({ docTipo: tipoComprobante === 'FACTURA' ? 'RUC' : 'DNI', docNumero: '', nombre: '', direccion: '' });
  };

  const quitarCliente = () => {
    setClienteSeleccionado(null); setClienteQuery(''); setClienteResultados([]); setShowRegistrarCliente(false);
    setNuevoClienteForm({ nombre: '', tipoDocumento: 'DNI', numeroDocumento: '' });
  };

  const handleRegistrarReceptor = async () => {
    if (!receptor.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setGuardandoCliente(true);
    try {
      const creado = await clienteService.create({ nombre: receptor.nombre.trim(), tipoDocumento: tipoComprobante === 'FACTURA' ? 'RUC' : (receptor.docTipo || 'DNI'), numeroDocumento: receptor.docNumero.trim() || undefined });
      seleccionarClienteComoReceptor(creado); toast.success(`Cliente "${creado.nombre}" registrado`);
    } catch { toast.error('Error al registrar el cliente'); }
    finally { setGuardandoCliente(false); }
  };

  const handleRegistrarCliente = async () => {
    if (!nuevoClienteForm.nombre.trim()) { toast.error('El nombre del cliente es requerido'); return; }
    setGuardandoCliente(true);
    try {
      const creado = await clienteService.create({ nombre: nuevoClienteForm.nombre.trim(), tipoDocumento: nuevoClienteForm.tipoDocumento || undefined, numeroDocumento: nuevoClienteForm.numeroDocumento.trim() || undefined });
      seleccionarCliente(creado); toast.success(`Cliente "${creado.nombre}" registrado`);
    } catch { toast.error('Error al registrar el cliente'); }
    finally { setGuardandoCliente(false); }
  };

  // ── Cobrar ────────────────────────────────────────────────────────────────
  const cobrar = async () => {
    if (cart.length === 0) return;
    if (metodoPago === 'EFECTIVO') {
      const pagado = parseFloat(montoPagado);
      if (isNaN(pagado) || pagado < total) { toast.error('El monto pagado es insuficiente'); return; }
    }
    setCobrando(true);
    try {
      let clienteIdParaVenta = clienteSeleccionado?.id;
      if (!clienteSeleccionado && receptor.nombre.trim() && receptor.docNumero.trim()) {
        try {
          const creado = await clienteService.create({ nombre: receptor.nombre.trim(), tipoDocumento: tipoComprobante === 'FACTURA' ? 'RUC' : (receptor.docTipo || 'DNI'), numeroDocumento: receptor.docNumero.trim() });
          clienteIdParaVenta = creado.id;
        } catch { /* no bloquea */ }
      }
      const detalles: DetalleVentaDTO[] = cart.map(item => ({
        productoId: item.producto.id!, cantidad: item.cantidad, precioUnitario: item.precioUnitario,
        subtotal: item.cantidad * item.precioUnitario, varianteId: item.varianteId,
        varianteDescripcion: item.varianteDescripcion, stockLoteId: item.stockLoteId,
        presentacionId: item.presentacionId, factor: item.factor ?? 1,
      }));
      const venta = await ventaService.create({
        vendedorId: user!.usuarioId, total: subtotalCarrito, metodoPago, estado: 'COMPLETADA',
        cajaId: cajaActiva?.id, notaCreditoCodigo: ncInfo?.valida ? ncCodigo : undefined,
        clienteId: clienteIdParaVenta, sucursalId: sucursalActual?.id, detalles,
      });
      setUltimaVentaId(venta.id ?? null); refreshOnboarding();
      setUltimaVenta({ ...venta, vendedorNombre: user?.nombre ?? undefined, detalles: cart.map(item => ({ productoId: item.producto.id!, productoNombre: item.producto.nombre, cantidad: item.cantidad, precioUnitario: item.precioUnitario, varianteId: item.varianteId, varianteDescripcion: item.varianteDescripcion, stockLoteId: item.stockLoteId })) });
      setTodosProductos(prev => prev.map(p => {
        // Descontar en unidades base (cantidad × factor de presentación)
        const vendido = cart.filter(i => i.producto.id === p.id)
          .reduce((s, i) => s + i.cantidad * (i.factor ?? 1), 0);
        if (!vendido) return p;
        return { ...p, stockActual: Math.max(0, (p.stockActual ?? 0) - vendido), stockVigente: p.stockVigente != null ? Math.max(0, p.stockVigente - vendido) : undefined };
      }));
      if (tipoComprobante !== 'TICKET' && venta.id) {
        try {
          const body: Record<string, unknown> = { ventaId: venta.id, tipo: tipoComprobante };
          if (receptor.docNumero) {
            body.receptorDocTipo = tipoComprobante === 'FACTURA' ? 'RUC' : receptor.docTipo;
            body.receptorDocNumero = receptor.docNumero; body.receptorNombre = receptor.nombre || undefined;
            body.receptorDireccion = receptor.direccion || undefined;
          }
          const { data: comp } = await axiosInstance.post('/facturacion/comprobantes', body);
          setUltimoComprobanteId(comp.id ?? null);
        } catch (err: any) {
          const backendMsg = err?.response?.data?.mensaje || err?.response?.data?.message || err?.message || '';
          toast.error(backendMsg ? `No se pudo emitir el comprobante: ${backendMsg}. Emítelo desde Facturación.` : 'Venta registrada, pero no se pudo emitir el comprobante.');
          if (import.meta.env.DEV) console.error('[comprobante]', err?.response?.status, err?.response?.data);
        }
      }
      setNcCodigo(''); setNcInfo(null); setStep('exito');
    } catch { toast.error('Error al registrar la venta'); }
    finally { setCobrando(false); }
  };

  const nuevaVenta = () => {
    setCart([]); setQuery(''); setResultados([]); setTipoComprobante('TICKET');
    setReceptor({ docTipo: 'DNI', docNumero: '', nombre: '', direccion: '' });
    setUltimoComprobanteId(null); setMontoPagado(''); setMetodoPago('EFECTIVO');
    setUltimaVentaId(null); setUltimaVenta(null); setNcCodigo(''); setNcInfo(null);
    quitarCliente(); setStep('venta'); setMobileCartOpen(false);
  };

  // ── Atajos de teclado globales ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2' && step === 'venta' && cart.length > 0) setStep('cobro');
      if (e.key === 'Escape' && step === 'cobro') setStep('venta');
      if (e.key === 'F4' && step === 'venta') limpiarCarrito();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, cart]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (checkingCaja) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando estado de caja...</p>
        </div>
      </div>
    );
  }

  if (showAbrirCaja) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-lg space-y-6 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Wallet size={28} className="text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Abrir Caja</h2>
              <p className="text-muted-foreground text-sm mt-1">Ingresa el efectivo inicial para comenzar a vender</p>
            </div>
            <div className="space-y-3 text-left">
              <label className="text-sm font-medium">Fondo de apertura</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">S/.</span>
                <input type="number" step="0.01" min="0" value={montoApertura}
                  onChange={e => setMontoApertura(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAbrirCaja()}
                  placeholder="0.00" autoFocus
                  className="flex h-11 w-full rounded-md border border-input bg-background pl-11 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Si no tienes fondo inicial, deja en 0</p>
            </div>
            <button onClick={handleAbrirCaja} disabled={abriendoCaja}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {abriendoCaja ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />Abriendo...</> : 'Abrir Caja y Comenzar'}
            </button>
            <button onClick={() => navigate('/dashboard')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Volver al dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Panel derecho: carrito / cobro / éxito ────────────────────────────────
  const rightPanel = (
    <div className="flex flex-col h-full bg-card overflow-hidden">

      {/* ── PASO: VENTA (carrito) ── */}
      {step === 'venta' && (
        <>
          {/* Header carrito */}
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-[18px] py-[14px] border-b border-border/60">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMobileCartOpen(false)}
                className="lg:hidden w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                <ChevronDown size={17} />
              </button>
              <span className="text-[.95rem] font-semibold">Carrito</span>
              {cart.length > 0 && (
                <span className="text-[.7rem] font-bold px-2 py-0.5 rounded-full text-primary bg-primary/10">
                  {cart.reduce((s, i) => s + i.cantidad, 0)}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={limpiarCarrito}
                className="flex items-center gap-1.5 text-[.78rem] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2 py-1.5 rounded-lg transition-colors">
                <Trash2 size={13} /> Limpiar
              </button>
            )}
          </div>

          {/* Items del carrito */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3.5 px-7 text-center">
                <div className="w-[46px] h-[46px] rounded-[13px] bg-muted flex items-center justify-center text-muted-foreground">
                  <ShoppingCart size={22} />
                </div>
                <div>
                  <div className="text-sm font-semibold">El carrito está vacío</div>
                  <div className="text-xs text-muted-foreground leading-relaxed mt-1.5">Escanea un producto o tócalo en la lista.</div>
                </div>
              </div>
            ) : (
              cart.map(item => (
                <div key={cartItemKey(item)} className="flex gap-2.5 px-[18px] py-[13px] border-b border-border/50 group">
                  <div className="flex-1 min-w-0">
                    <div className="text-[.86rem] font-semibold leading-snug">{item.producto.nombre}</div>
                    {item.varianteDescripcion && <div className="text-xs text-violet-500 dark:text-violet-400 mt-0.5">{item.varianteDescripcion}</div>}
                    {item.stockLoteLabel && <div className="font-mono text-[.7rem] text-amber-600 dark:text-amber-400 mt-0.5">{item.stockLoteLabel}</div>}
                    <div className="flex items-center gap-1.5 mt-1">
                      {esRopa && editandoPrecio?.key === cartItemKey(item) ? (
                        <input type="number" min="0" step="0.01" autoFocus
                          value={editandoPrecio.valor}
                          onChange={e => setEditandoPrecio({ key: cartItemKey(item), valor: e.target.value })}
                          onBlur={() => confirmarPrecio(cartItemKey(item))}
                          onKeyDown={e => { if (e.key === 'Enter') confirmarPrecio(cartItemKey(item)); if (e.key === 'Escape') setEditandoPrecio(null); }}
                          className="w-20 text-xs bg-muted border border-primary rounded px-1.5 py-0.5 focus:outline-none font-mono" />
                      ) : (
                        <>
                          <span className="text-[.76rem] text-muted-foreground font-mono">{fmt(item.precioUnitario)} c/u</span>
                          {esRopa && (
                            <button onClick={() => iniciarEditarPrecio(cartItemKey(item), item.precioUnitario)}
                              className="text-muted-foreground hover:text-primary transition-colors"><Edit2 size={10} /></button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-0.5 bg-muted/60 rounded-[9px] p-0.5">
                        <button onClick={() => cambiarCantidad(cartItemKey(item), -1)}
                          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card rounded-[7px] transition-colors cursor-pointer border-0 bg-transparent">
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center text-[.85rem] font-bold font-mono">{item.cantidad}</span>
                        <button onClick={() => cambiarCantidad(cartItemKey(item), 1)}
                          disabled={item.cantidad >= Math.floor(getStockDisponible(item.producto) / (item.factor ?? 1))}
                          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card rounded-[7px] transition-colors disabled:opacity-30 cursor-pointer border-0 bg-transparent">
                          <Plus size={13} />
                        </button>
                      </div>
                      <span className="text-[.9rem] font-bold font-mono">{fmt(item.cantidad * item.precioUnitario)}</span>
                    </div>
                    <button onClick={() => quitarItem(cartItemKey(item))}
                      className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[7px] transition-colors cursor-pointer border-0 bg-transparent flex-shrink-0 self-center">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: comprobante + campos cliente + totales + cobrar */}
          <div className="flex-shrink-0 border-t border-border px-[18px] py-[14px] space-y-3">
            {/* Selector comprobante */}
            <div className="flex gap-1 bg-muted/60 rounded-[10px] p-0.5">
              {(['TICKET', 'BOLETA', 'FACTURA'] as TipoComprobante[]).map(tipo => (
                <button key={tipo} type="button"
                  onClick={() => { setTipoComprobante(tipo); quitarClienteYReceptor(); }}
                  className={`flex-1 h-[34px] text-[.83rem] font-semibold rounded-[8px] border-0 transition-all cursor-pointer ${
                    tipoComprobante === tipo ? 'bg-card shadow-sm text-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground'
                  }`}>
                  {tipo === 'TICKET' ? 'Ticket' : tipo === 'BOLETA' ? 'Boleta' : 'Factura'}
                </button>
              ))}
            </div>

            {/* Campos DNI/RUC para boleta/factura */}
            {(tipoComprobante === 'BOLETA' || tipoComprobante === 'FACTURA') && (
              <div className="p-3 rounded-[10px] bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <User size={12} />
                  {tipoComprobante === 'FACTURA' ? 'RUC' : 'DNI'} requerido para {tipoComprobante.toLowerCase()}
                </div>
                {clienteSeleccionado ? (
                  <div className="flex items-center gap-2 bg-card rounded-[9px] px-3 py-2 border border-border">
                    <User size={13} className="text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{receptor.nombre || clienteSeleccionado.nombre}</p>
                      {receptor.docNumero && <p className="font-mono text-xs text-muted-foreground">{receptor.docTipo} {receptor.docNumero}</p>}
                    </div>
                    <button type="button" onClick={quitarClienteYReceptor} className="text-muted-foreground hover:text-foreground flex-shrink-0 border-0 bg-transparent cursor-pointer"><X size={13} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      {tipoComprobante === 'BOLETA' && (
                        <select value={receptor.docTipo} onChange={e => setReceptor(r => ({ ...r, docTipo: e.target.value }))}
                          className="bg-card border border-input rounded-[9px] px-2 py-1.5 text-sm focus:outline-none focus:border-primary w-[70px] flex-shrink-0">
                          <option value="DNI">DNI</option><option value="CE">CE</option>
                        </select>
                      )}
                      <div className="relative flex-1">
                        <input type="text"
                          placeholder={tipoComprobante === 'FACTURA' ? 'RUC del cliente...' : 'DNI del cliente...'}
                          value={receptor.docNumero} maxLength={tipoComprobante === 'FACTURA' ? 11 : undefined}
                          onChange={e => { const v = e.target.value; setReceptor(r => ({ ...r, docNumero: v, nombre: '' })); setClienteQuery(v); }}
                          className="w-full h-[38px] bg-card border border-input rounded-[9px] px-3 font-mono text-[.86rem] focus:outline-none focus:border-primary pr-7" />
                        {buscandoCliente && <Loader2 size={13} className="animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />}
                      </div>
                    </div>
                    {clienteResultados.length > 0 && (
                      <div className="bg-card border border-border rounded-[9px] overflow-hidden divide-y divide-border/50 max-h-32 overflow-y-auto">
                        {clienteResultados.slice(0, 4).map(c => (
                          <button key={c.id} type="button" onClick={() => seleccionarClienteComoReceptor(c)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-left cursor-pointer border-0 bg-transparent">
                            <User size={13} className="text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{c.nombre}</p>
                              {c.numeroDocumento && <p className="font-mono text-xs text-muted-foreground">{c.tipoDocumento} {c.numeroDocumento}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {!buscandoCliente && !clienteResultados.length && receptor.docNumero.trim() && (
                      <div className="space-y-1.5">
                        <input type="text"
                          placeholder={tipoComprobante === 'FACTURA' ? 'Razón social *' : 'Nombre completo *'}
                          value={receptor.nombre} onChange={e => setReceptor(r => ({ ...r, nombre: e.target.value }))}
                          className="w-full h-[38px] bg-card border border-input rounded-[9px] px-3 text-sm focus:outline-none focus:border-primary" />
                        {tipoComprobante === 'FACTURA' && (
                          <input type="text" placeholder="Dirección (opcional)" value={receptor.direccion}
                            onChange={e => setReceptor(r => ({ ...r, direccion: e.target.value }))}
                            className="w-full h-[38px] bg-card border border-input rounded-[9px] px-3 text-sm focus:outline-none focus:border-primary" />
                        )}
                        <button type="button" onClick={handleRegistrarReceptor} disabled={guardandoCliente || !receptor.nombre.trim()}
                          className="w-full py-2 rounded-[9px] bg-primary text-primary-foreground disabled:opacity-40 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-0">
                          {guardandoCliente ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                          Registrar y seleccionar
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Totales */}
            <div className="space-y-1.5 text-[.84rem]">
              {!esRopa && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Base imponible</span><span className="font-mono">{fmt(baseImponible)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>IGV (18%)</span><span className="font-mono">{fmt(igvIncluido)}</span>
                  </div>
                </>
              )}
              {ncInfo?.valida && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Descuento NC</span><span className="font-mono">− {fmt(descuentoNc)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-2.5 border-t border-border/60">
                <span className="text-[.9rem] font-semibold">Total</span>
                <span className="text-[1.7rem] font-bold tracking-tight font-mono">{fmt(total)}</span>
              </div>
            </div>

            {/* Botón cobrar */}
            <button onClick={() => setStep('cobro')} disabled={cart.length === 0}
              style={cart.length > 0 ? { background: 'hsl(var(--primary))', color: '#fff', boxShadow: '0 8px 20px -10px hsl(var(--primary))' } : undefined}
              className={`w-full h-[50px] flex items-center justify-center gap-2.5 rounded-xl font-semibold text-[.98rem] border-0 transition-all ${cart.length === 0 ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'hover:brightness-105 cursor-pointer'}`}>
              Cobrar
              <span className="font-mono text-[.75rem] opacity-70">F2</span>
            </button>
          </div>
        </>
      )}

      {/* ── PASO: COBRO ── */}
      {step === 'cobro' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-[18px] py-[14px] border-b border-border/60">
            <span className="text-[.95rem] font-semibold">Cobrar</span>
            <button onClick={() => setStep('venta')}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer border-0 bg-transparent">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-[18px] py-4 space-y-4">
            {/* Resumen total */}
            <div className="rounded-xl bg-muted/50 p-4">
              {ncInfo?.valida && (
                <div className="flex justify-between text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 font-mono">
                  <span>Descuento NC aplicado</span><span>− {fmt(ncInfo.montoTotal)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="text-sm text-muted-foreground">Total a cobrar</span>
                <span className="text-[1.9rem] font-bold tracking-tight font-mono">{fmt(total)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {cart.reduce((s, i) => s + i.cantidad, 0)} unidades · {cart.length} líneas · {tipoComprobante.toLowerCase()}
              </div>
            </div>

            {/* Métodos de pago */}
            <div>
              <div className="font-mono text-[.68rem] font-semibold tracking-widest uppercase text-muted-foreground mb-2.5">Método de pago</div>
              <div className="grid grid-cols-3 gap-2">
                {METODOS.map(m => {
                  const Icon = m.icon;
                  const active = metodoPago === m.id;
                  return (
                    <button key={m.id} onClick={() => setMetodoPago(m.id)}
                      style={active ? { color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.10)', border: '1.5px solid hsl(var(--primary))' } : undefined}
                      className={`flex flex-col items-center justify-center gap-1.5 h-[72px] rounded-xl text-[.78rem] font-semibold transition-all cursor-pointer ${active ? '' : 'border border-border text-muted-foreground hover:text-foreground bg-card'}`}>
                      <Icon size={18} />{m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Efectivo */}
            {metodoPago === 'EFECTIVO' && (
              <div>
                <div className="font-mono text-[.68rem] font-semibold tracking-widest uppercase text-muted-foreground mb-2.5">Con cuánto paga</div>
                <input type="number" autoFocus value={montoPagado}
                  onChange={e => setMontoPagado(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && cobrar()}
                  placeholder="0.00"
                  className="w-full h-[54px] px-4 font-mono text-[1.5rem] font-semibold text-right bg-muted/50 border border-transparent rounded-xl outline-none focus:bg-card focus:border-primary transition-all" />
                <div className="grid grid-cols-4 gap-1.5 mt-2.5">
                  {[10, 20, 50, 100].map(bill => (
                    <button key={bill} onClick={() => setMontoPagado(String(bill))}
                      className="h-10 font-mono text-[.92rem] font-semibold bg-card border border-border rounded-[10px] hover:border-primary hover:text-primary transition-colors cursor-pointer">
                      {bill}
                    </button>
                  ))}
                </div>
                <button onClick={() => setMontoPagado(total.toFixed(2))}
                  className="w-full h-[38px] mt-1.5 text-sm font-semibold text-muted-foreground bg-muted/50 border-0 rounded-[10px] hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                  Paga justo · {fmt(total)}
                </button>
                <div className={`flex items-baseline justify-between gap-2.5 mt-3 px-3.5 py-3 rounded-xl ${vuelto > 0 ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-muted/50'}`}>
                  <span className="text-[.86rem] font-semibold text-muted-foreground">Vuelto</span>
                  <span className={`font-mono text-[1.45rem] font-bold tracking-tight ${vuelto > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{fmt(vuelto)}</span>
                </div>
              </div>
            )}

            {/* Nota de crédito */}
            <div>
              <div className="font-mono text-[.68rem] font-semibold tracking-widest uppercase text-muted-foreground mb-2.5">Nota de crédito</div>
              <div className="flex gap-2">
                <input type="text" value={ncCodigo}
                  onChange={e => { setNcCodigo(e.target.value.toUpperCase()); setNcInfo(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleValidarNc()}
                  placeholder="Código de la nota"
                  className="flex-1 h-10 px-3 font-mono text-[.85rem] bg-muted/50 border border-transparent rounded-[10px] outline-none focus:bg-card focus:border-primary" />
                <button onClick={handleValidarNc} disabled={!ncCodigo || ncLoading}
                  className="flex-shrink-0 h-10 px-4 text-sm font-semibold text-muted-foreground bg-card border border-border rounded-[10px] hover:border-primary hover:text-primary transition-colors disabled:opacity-40 cursor-pointer">
                  {ncLoading ? <Loader2 size={13} className="animate-spin" /> : 'Validar'}
                </button>
                {ncInfo?.valida && (
                  <button onClick={quitarNc} className="h-10 px-2 text-muted-foreground hover:text-foreground bg-card border border-border rounded-[10px] transition-colors cursor-pointer border-0">
                    <X size={14} />
                  </button>
                )}
              </div>
              {ncInfo?.valida && (
                <div className="flex items-center gap-2 mt-2 p-2.5 rounded-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={14} className="flex-shrink-0" />
                  Nota válida · saldo {fmt(ncInfo.montoTotal)} aplicado
                </div>
              )}
              {ncInfo && !ncInfo.valida && (
                <div className="mt-2 p-2.5 rounded-[9px] bg-destructive/10 text-sm text-destructive">{ncInfo.mensaje}</div>
              )}
            </div>

            {/* Cliente opcional para TICKET */}
            {tipoComprobante === 'TICKET' && (
              <div>
                <div className="font-mono text-[.68rem] font-semibold tracking-widest uppercase text-muted-foreground mb-2.5">Cliente (opcional)</div>
                {clienteSeleccionado ? (
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                    <User size={14} className="text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{clienteSeleccionado.nombre}</p>
                      {clienteSeleccionado.numeroDocumento && <p className="font-mono text-xs text-muted-foreground">{clienteSeleccionado.tipoDocumento} {clienteSeleccionado.numeroDocumento}</p>}
                    </div>
                    <button type="button" onClick={quitarCliente} className="text-muted-foreground hover:text-foreground flex-shrink-0 border-0 bg-transparent cursor-pointer"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <input type="text" placeholder="DNI, RUC o nombre..."
                        value={clienteQuery} onChange={e => { setClienteQuery(e.target.value); setShowRegistrarCliente(false); }}
                        className="w-full h-10 bg-muted/50 border border-transparent rounded-[10px] px-3 text-sm focus:outline-none focus:bg-card focus:border-primary pr-7" />
                      {buscandoCliente && <Loader2 size={13} className="animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />}
                    </div>
                    {clienteResultados.length > 0 && (
                      <div className="bg-card border border-border rounded-[9px] mt-1 overflow-hidden divide-y divide-border/50 max-h-28 overflow-y-auto">
                        {clienteResultados.slice(0, 4).map(c => (
                          <button key={c.id} type="button" onClick={() => seleccionarCliente(c)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-left cursor-pointer border-0 bg-transparent">
                            <User size={13} className="text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{c.nombre}</p>
                              {c.numeroDocumento && <p className="font-mono text-xs text-muted-foreground">{c.tipoDocumento} {c.numeroDocumento}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showRegistrarCliente && clienteQuery.trim() && (
                      <div className="mt-2 border border-dashed border-border rounded-[9px] p-3 space-y-2">
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5"><UserPlus size={12} /> Cliente no encontrado — registrar</p>
                        <input type="text" placeholder="Nombre completo *" value={nuevoClienteForm.nombre}
                          onChange={e => setNuevoClienteForm(f => ({ ...f, nombre: e.target.value }))}
                          className="w-full h-9 bg-card border border-input rounded-md px-3 text-sm focus:outline-none focus:border-primary" />
                        <div className="flex gap-2">
                          <select value={nuevoClienteForm.tipoDocumento} onChange={e => setNuevoClienteForm(f => ({ ...f, tipoDocumento: e.target.value }))}
                            className="bg-card border border-input rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-primary w-[70px] flex-shrink-0">
                            <option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">CE</option>
                          </select>
                          <input type="text" placeholder="Nro. documento" value={nuevoClienteForm.numeroDocumento}
                            onChange={e => setNuevoClienteForm(f => ({ ...f, numeroDocumento: e.target.value }))}
                            className="flex-1 h-9 bg-card border border-input rounded-md px-3 text-sm focus:outline-none focus:border-primary" />
                        </div>
                        <button type="button" onClick={handleRegistrarCliente} disabled={guardandoCliente || !nuevoClienteForm.nombre.trim()}
                          className="w-full py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-40 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-0">
                          {guardandoCliente ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                          Registrar y seleccionar
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Botón confirmar */}
          <div className="flex-shrink-0 border-t border-border px-[18px] py-[14px]">
            <button onClick={cobrar}
              disabled={cobrando || (metodoPago === 'EFECTIVO' && parseFloat(montoPagado || '0') < total)}
              style={!(cobrando || (metodoPago === 'EFECTIVO' && parseFloat(montoPagado || '0') < total))
                ? { background: 'hsl(var(--primary))', color: '#fff', boxShadow: '0 8px 20px -10px hsl(var(--primary))' } : undefined}
              className={`w-full h-[50px] flex items-center justify-center gap-2 rounded-xl font-semibold text-[.98rem] border-0 transition-all ${
                cobrando || (metodoPago === 'EFECTIVO' && parseFloat(montoPagado || '0') < total)
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'hover:brightness-105 cursor-pointer'
              }`}>
              {cobrando
                ? <><Loader2 size={18} className="animate-spin" /> Procesando...</>
                : metodoPago === 'EFECTIVO' && parseFloat(montoPagado || '0') < total
                  ? 'Ingresa el monto recibido'
                  : 'Confirmar venta'}
            </button>
            <p className="font-mono text-[.7rem] text-muted-foreground text-center mt-2">Esc para volver al carrito</p>
          </div>
        </div>
      )}

      {/* ── PASO: ÉXITO ── */}
      {step === 'exito' && (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center px-6 py-7">
          <div className="w-[52px] h-[52px] rounded-[15px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={26} />
          </div>
          <h2 className="text-[1.4rem] font-bold tracking-tight mt-5">Venta registrada</h2>
          {ultimaVentaId && (
            <div className="font-mono text-[.8rem] text-muted-foreground mt-1.5">
              Venta #{ultimaVentaId} · {tipoComprobante.toLowerCase()}
            </div>
          )}
          <div className="mt-5 p-4 rounded-xl bg-muted/50 space-y-2 text-[.85rem]">
            <div className="flex justify-between text-muted-foreground">
              <span>Total cobrado</span>
              <span className="font-bold text-foreground font-mono">{fmt(total)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Método</span>
              <span className="text-foreground">{METODOS.find(m => m.id === metodoPago)?.label}</span>
            </div>
            {metodoPago === 'EFECTIVO' && vuelto > 0 && (
              <div className="flex items-baseline justify-between pt-2 border-t border-border/60">
                <span className="font-semibold text-muted-foreground">Vuelto</span>
                <span className="font-mono text-[1.3rem] font-bold text-amber-600 dark:text-amber-400">{fmt(vuelto)}</span>
              </div>
            )}
          </div>
          <button onClick={nuevaVenta} autoFocus
            style={{ background: 'hsl(var(--primary))', color: '#fff', boxShadow: '0 8px 20px -10px hsl(var(--primary))' }}
            className="w-full h-[50px] flex items-center justify-center gap-2.5 mt-5 rounded-xl font-semibold text-[.98rem] border-0 hover:brightness-105 transition-all cursor-pointer">
            Nueva venta
          </button>
          <div className={`grid gap-2 mt-2 ${(ultimaVenta && ultimoComprobanteId) ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {ultimaVenta && (
              <button onClick={() => printVentaTicket(ultimaVenta, negocio, clienteSeleccionado?.numeroDocumento ?? undefined, clienteSeleccionado?.nombre ?? undefined)}
                className="h-[42px] flex items-center justify-center gap-1.5 text-[.85rem] font-semibold text-muted-foreground bg-card border border-border rounded-[10px] hover:border-primary hover:text-primary transition-colors cursor-pointer">
                <Printer size={15} /> Imprimir
              </button>
            )}
            {ultimoComprobanteId && (
              <button onClick={async () => {
                try {
                  const { data } = await axiosInstance.get(`/facturacion/comprobantes/${ultimoComprobanteId}/pdf`, { responseType: 'blob' });
                  const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
                  const a = document.createElement('a'); a.href = url;
                  a.download = `${tipoComprobante === 'FACTURA' ? 'factura' : 'boleta'}-${ultimoComprobanteId}.pdf`;
                  a.click(); URL.revokeObjectURL(url);
                } catch { toast.error('No se pudo descargar el PDF'); }
              }} className="h-[42px] flex items-center justify-center gap-1.5 text-[.85rem] font-semibold text-muted-foreground bg-card border border-border rounded-[10px] hover:border-primary hover:text-primary transition-colors cursor-pointer">
                <Download size={15} /> PDF
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // JSX PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap'); .font-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace !important; }`}</style>

      <div className="h-screen flex flex-col bg-background overflow-hidden select-none">

        {/* ── Header ── */}
        <header className="h-[54px] flex-shrink-0 flex items-center gap-3 px-4 bg-card border-b border-border">
          <button onClick={() => navigate('/dashboard')}
            className="w-[30px] h-[30px] rounded-[9px] bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border-0 cursor-pointer flex-shrink-0">
            <ArrowLeft size={16} />
          </button>
          <span className="font-semibold text-sm hidden sm:block">Punto de Venta</span>
          <div className="w-px h-[22px] bg-border flex-shrink-0" />
          {cajaActiva ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex-shrink-0 whitespace-nowrap">
              <span className="w-[7px] h-[7px] rounded-full bg-emerald-500 dark:bg-emerald-400 flex-shrink-0" />
              <span className="text-[.78rem] font-semibold text-emerald-700 dark:text-emerald-400">
                Caja #{cajaActiva.id} abierta
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex-shrink-0">
              <span className="w-[7px] h-[7px] rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-[.78rem] font-semibold text-amber-700 dark:text-amber-400">Sin caja</span>
            </div>
          )}
          <div className="flex-1 min-w-0" />
          <span className="hidden md:block font-mono text-[.7rem] text-muted-foreground flex-shrink-0">F2 cobrar · F4 limpiar · Esc cancelar</span>
          {cajaActiva && (
            <button onClick={() => { setMontoCierre(''); setShowCerrarCaja(true); }}
              className="flex items-center gap-1.5 h-[34px] flex-shrink-0 px-3 text-[.81rem] font-semibold text-destructive bg-destructive/10 border border-transparent rounded-[9px] hover:border-destructive/30 transition-colors cursor-pointer whitespace-nowrap">
              <Lock size={14} />
              <span className="hidden sm:block">Cerrar caja</span>
            </button>
          )}
        </header>

        {/* ── Contenido principal ── */}
        <div className="flex-1 min-h-0 flex overflow-hidden">

          {/* Panel izquierdo: búsqueda + productos */}
          <div className="flex flex-col flex-1 min-w-0 border-r border-border">
            {/* Barra de búsqueda + chips */}
            <div className="flex-shrink-0 px-[18px] py-[14px] bg-card border-b border-border space-y-3">
              <div className="flex gap-2.5">
                <div className="relative flex-1 min-w-0">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                  </svg>
                  <input ref={inputRef} type="text" value={query}
                    onChange={e => setQuery(e.target.value)} onKeyDown={handleInputKeyDown}
                    placeholder="Escanea el código de barras o escribe el nombre del producto"
                    autoComplete="off"
                    className="w-full h-[46px] pl-10 pr-4 text-[.95rem] font-medium bg-muted/60 border border-transparent rounded-[11px] outline-none focus:bg-card focus:border-primary transition-all placeholder:text-muted-foreground" />
                  {buscando && <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
                </div>
                {hasCamera && (
                  <button type="button" onClick={openCamera} title="Escanear con la cámara"
                    className="w-[46px] h-[46px] flex-shrink-0 flex items-center justify-center text-muted-foreground bg-card border border-border rounded-[11px] hover:border-primary hover:text-primary transition-colors cursor-pointer">
                    <Camera size={19} />
                  </button>
                )}
              </div>
              {/* Chips de filtro */}
              <div className="flex items-center flex-wrap gap-1.5">
                {esFarmacia && (
                  <button type="button" onClick={() => setSoloGenerico(v => !v)}
                    className={`flex-shrink-0 h-8 px-3.5 font-semibold text-[.81rem] rounded-full border cursor-pointer transition-all ${
                      soloGenerico
                        ? 'text-primary bg-primary/10 border-primary/40'
                        : 'text-muted-foreground bg-card border-border hover:border-primary/40 hover:text-primary'
                    }`}>
                    <Tag size={12} className="inline mr-1.5 -mt-0.5" />
                    Solo genéricos
                  </button>
                )}
                <span className="font-mono text-[.68rem] font-semibold tracking-widest uppercase text-muted-foreground ml-auto">
                  {query ? 'Resultados' : 'Próximos a vencer primero'} · {query ? resultados.length : productosDisponibles.length} productos
                </span>
              </div>
            </div>

            {/* Grid de productos / resultados de búsqueda */}
            <div className="flex-1 min-h-0 overflow-y-auto px-[18px] py-4 pb-20 lg:pb-4">

              {/* Resultados de búsqueda */}
              {query && resultados.length > 0 && (
                <div ref={resultadosRef} className="space-y-1">
                  {resultados.map((p, idx) => {
                    const isActive = idx === selectedIndex;
                    return (
                      <button key={p.id}
                        onClick={() => { agregarAlCarrito(p); setQuery(''); setResultados([]); setSelectedIndex(-1); }}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all border cursor-pointer ${isActive ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:border-border/80 hover:bg-muted/30'}`}>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold leading-snug ${isActive ? 'text-foreground' : ''}`}>{p.nombre}</div>
                          <div className="font-mono text-[.7rem] text-muted-foreground mt-0.5">{p.codigoBarras || '—'}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Stock: <span className={getStockDisponible(p) <= 0 ? 'text-destructive font-semibold' : 'text-foreground'}>{getStockDisponible(p)}</span>
                            {esFarmacia && p.esGenerico && <span className="ml-2 text-primary font-medium">Genérico</span>}
                          </div>
                        </div>
                        <span className="font-mono text-[1.05rem] font-bold flex-shrink-0">{fmt(p.precioVenta ?? 0)}</span>
                        <span style={{ background: 'hsl(var(--primary))', color: '#fff' }} className="w-[26px] h-[26px] rounded-lg flex items-center justify-center flex-shrink-0 text-lg font-bold">+</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sin resultados */}
              {query && resultados.length === 0 && !buscando && (
                <div className="py-16 text-center">
                  <div className="text-[.95rem] font-semibold">Sin resultados para "{query}"</div>
                  <div className="text-sm text-muted-foreground mt-1.5">Revisa el nombre o escanea el código de barras.</div>
                </div>
              )}

              {/* Grid rápido */}
              {!query && (
                cargandoProductos ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Cargando productos...</p>
                  </div>
                ) : productosDisponibles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-2xl">📦</div>
                    <p className="font-semibold">Sin productos con stock</p>
                    <p className="text-sm text-muted-foreground max-w-xs">Ve a <strong>Inventario → Productos</strong> para agregar productos.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {productosDisponibles.slice(0, 48).map(p => {
                      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
                      const loteFefo = esFarmacia ? proximoVencimientoMap.get(p.id!) : undefined;
                      const fvStr = loteFefo?.fechaVencimiento ?? p.proximaFechaVencimiento;
                      const fv = fvStr ? new Date(fvStr + 'T00:00:00') : null;
                      const diasRestantes = fv ? Math.ceil((fv.getTime() - hoy.getTime()) / 86400000) : null;
                      const vencido = diasRestantes !== null && diasRestantes < 0;
                      const tieneAviso = diasRestantes !== null && diasRestantes <= 90;
                      const count = loteCountMap.get(p.id!);
                      const stock = getStockDisponible(p);
                      const sinStock = stock <= 0;
                      const bajStock = stock > 0 && stock <= 10;
                      const precioMostrar = loteFefo?.precioVenta ?? p.precioVenta ?? 0;

                      return (
                        <button key={p.id} type="button" onClick={() => agregarAlCarrito(p)}
                          className={`flex flex-col min-h-[158px] p-3 text-left rounded-[13px] border cursor-pointer transition-all ${
                            sinStock ? 'opacity-50 cursor-not-allowed border-border bg-card' : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                          }`}>
                          {/* Fila superior: stock badge + venc/lotes badges */}
                          <div className="flex items-start justify-between gap-2">
                            <span className={`font-mono text-[.68rem] font-semibold px-1.5 py-0.5 rounded-[6px] ${
                              sinStock ? 'text-destructive bg-destructive/10' :
                              bajStock ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30' :
                              'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                            }`}>
                              {sinStock ? 'Sin stock' : `${stock} und`}
                            </span>
                            <div className="flex flex-col items-end gap-0.5">
                              {tieneAviso && diasRestantes !== null && (
                                <span className="font-mono text-[.66rem] font-semibold px-1.5 py-0.5 rounded-[6px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                                  {vencido ? 'vencido' : `vence ${diasRestantes}d`}
                                </span>
                              )}
                              {count != null && count > 1 && (
                                <span className="font-mono text-[.66rem] font-semibold px-1.5 py-0.5 rounded-[6px] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30">
                                  {count} lotes
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Nombre */}
                          <div className="text-[.875rem] font-semibold leading-snug mt-2.5 line-clamp-2">{p.nombre}</div>
                          {/* Código de barras */}
                          {p.codigoBarras && (
                            <div className="font-mono text-[.7rem] text-muted-foreground mt-1">{p.codigoBarras}</div>
                          )}
                          {p.componentes && !p.codigoBarras && (
                            <div className="font-mono text-[.68rem] text-muted-foreground mt-1 truncate">{p.componentes}</div>
                          )}
                          {/* Precio + botón */}
                          <div className="flex items-baseline justify-between gap-2 mt-auto pt-3">
                            <span className="text-[1.05rem] font-bold tracking-tight font-mono">
                              {moneda} {precioMostrar.toFixed(2)}
                            </span>
                            {!sinStock && (
                              <span style={{ background: 'hsl(var(--primary))', color: '#fff' }}
                                className="w-[26px] h-[26px] rounded-lg flex items-center justify-center flex-shrink-0 text-base font-bold">
                                +
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Panel derecho: carrito — DESKTOP */}
          <aside className="hidden lg:flex flex-col w-[400px] flex-shrink-0 bg-card overflow-hidden">
            {rightPanel}
          </aside>

          {/* Panel derecho: carrito — MOBILE (slide-up sheet) */}
          <aside
            className={`lg:hidden fixed left-0 right-0 bottom-0 top-[54px] z-40 bg-card overflow-hidden flex flex-col transition-transform duration-[260ms] ease-out ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ boxShadow: mobileCartOpen ? '0 -8px 40px rgba(0,0,0,.15)' : 'none' }}>
            {rightPanel}
          </aside>

        </div>

        {/* Mobile: barra flotante de carrito */}
        <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-card border-t border-border shadow-lg transition-transform duration-200 ${mobileCartOpen ? 'translate-y-full' : 'translate-y-0'}`}>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">{cart.reduce((s, i) => s + i.cantidad, 0)} unidades · {cart.length} líneas</div>
            <div className="text-[1.22rem] font-bold tracking-tight font-mono">{fmt(total)}</div>
          </div>
          <button onClick={() => setMobileCartOpen(true)}
            style={{ background: 'hsl(var(--primary))', color: '#fff' }}
            className="flex-shrink-0 flex items-center gap-2 h-[46px] px-5 font-semibold rounded-xl border-0 cursor-pointer whitespace-nowrap">
            <ShoppingCart size={17} /> Ver carrito
          </button>
        </div>

      </div>

      {/* ── Modal: Escáner de cámara ───────────────────────────────────── */}
      {showCameraScanner && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <style>{`@keyframes scanline { 0%,100% { top: 15%; } 50% { top: 80%; } } .animate-scanline { animation: scanline 2s ease-in-out infinite; }`}</style>
          <div className="flex items-center justify-between px-4 py-3 bg-black/90 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-primary" />
              <span className="text-sm font-semibold text-white">Escanear código de barras</span>
            </div>
            <button type="button" onClick={stopCamera} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border-0 cursor-pointer"><X size={18} /></button>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
            {!cameraError && (
              <>
                <div className="absolute inset-0 flex flex-col pointer-events-none">
                  <div className="flex-1 bg-black/55" />
                  <div className="flex" style={{ height: 256 }}>
                    <div className="flex-1 bg-black/55" />
                    <div style={{ width: 256 }} />
                    <div className="flex-1 bg-black/55" />
                  </div>
                  <div className="flex-1 bg-black/55" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative" style={{ width: 256, height: 256 }}>
                    <div className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-primary rounded-tl" />
                    <div className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-primary rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-primary rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-primary rounded-br" />
                    <div className="absolute left-3 right-3 h-0.5 bg-primary/80 animate-scanline" style={{ top: '15%', boxShadow: '0 0 6px hsl(var(--primary))' }} />
                  </div>
                </div>
              </>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-8">
                <div className="text-center space-y-4 max-w-xs">
                  <CameraOff size={44} className="mx-auto text-red-400" />
                  <p className="text-sm text-gray-300 leading-relaxed">{cameraError}</p>
                  <button type="button" onClick={stopCamera} className="px-6 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors text-white border-0 cursor-pointer">Cerrar</button>
                </div>
              </div>
            )}
          </div>
          {!cameraError && (
            <div className="flex-shrink-0 bg-black/90 px-4 py-4 flex flex-col items-center gap-3">
              <p className="text-xs text-gray-500">Apunta la cámara al código de barras del producto</p>
              <button type="button" onClick={stopCamera} className="px-10 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors text-white border-0 cursor-pointer">Cancelar</button>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Cerrar Caja ──────────────────────────────────────────── */}
      {showCerrarCaja && cajaActiva && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Lock size={18} className="text-destructive" /> Cerrar Caja</h2>
              <button onClick={() => setShowCerrarCaja(false)} className="text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer"><X size={20} /></button>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Fondo apertura</span>
                <span className="font-mono">{moneda} {(cajaActiva.montoApertura ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Ventas efectivo</span>
                <span className="font-mono">{moneda} {(cajaActiva.totalEfectivo ?? 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Esperado en caja</span>
                <span className="font-mono">{moneda} {((cajaActiva.montoApertura ?? 0) + (cajaActiva.totalEfectivo ?? 0)).toFixed(2)}</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Efectivo contado físicamente</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">{moneda}</span>
                <input type="number" step="0.01" min="0" value={montoCierre}
                  onChange={e => setMontoCierre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCerrarCaja()}
                  placeholder="0.00" autoFocus
                  className="w-full bg-muted/50 border border-input rounded-xl pl-12 pr-4 py-3 text-lg font-bold font-mono text-center focus:outline-none focus:border-primary" />
              </div>
              {parseFloat(montoCierre) > 0 && (() => {
                const diff = parseFloat(montoCierre) - ((cajaActiva.montoApertura ?? 0) + (cajaActiva.totalEfectivo ?? 0));
                return <p className={`text-sm font-semibold mt-2 ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>Diferencia: {diff >= 0 ? '+' : ''}{moneda} {diff.toFixed(2)} {diff > 0 ? '(sobrante)' : diff < 0 ? '(faltante)' : '(exacto)'}</p>;
              })()}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCerrarCaja(false)}
                className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors text-sm font-medium cursor-pointer bg-transparent">
                Cancelar
              </button>
              <button onClick={handleCerrarCaja} disabled={cerrando}
                className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border-0">
                {cerrando ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive-foreground" /> Cerrando...</> : <><Lock size={15} /> Cerrar Caja</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Selector de variantes (TIENDA_ROPA) ───────────────────────────────── */}
      {variantePickerOpen && variantePickerProducto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setVariantePickerOpen(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base">{variantePickerProducto.nombre}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Elige la variante a agregar al carrito</p>
              </div>
              <span className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full font-medium">
                {variantesDisponibles.length} opciones
              </span>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {loadingVariantes ? (
                <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" /></div>
              ) : variantesDisponibles.map(v => {
                const desc = [v.talla, v.color].filter(Boolean).join(' / ');
                const sinStock = (v.stockActual ?? 0) <= 0;
                const precioVal = variantePrecioOverrides[v.id!] ?? '';
                const handleAgregar = () => { const p = parseFloat(precioVal); agregarItemAlCarrito(variantePickerProducto!, v.id!, desc, true, (!isNaN(p) && p > 0) ? p : undefined); setVariantePickerOpen(false); };
                return (
                  <div key={v.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${sinStock ? 'border-border opacity-40' : 'border-border bg-muted/30'}`}>
                    <button disabled={sinStock} onClick={handleAgregar} className="flex-1 text-left min-w-0 disabled:cursor-not-allowed border-0 bg-transparent cursor-pointer">
                      <p className="font-semibold text-sm leading-tight">{desc || v.sku || `Variante #${v.id}`}</p>
                      {v.sku && <p className="text-xs text-muted-foreground mt-0.5">SKU: {v.sku}</p>}
                    </button>
                    {!sinStock && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-muted-foreground font-mono">{moneda}</span>
                        <input type="number" min="0" step="0.01" value={precioVal}
                          onChange={e => setVariantePrecioOverrides(prev => ({ ...prev, [v.id!]: e.target.value }))}
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => { if (e.key === 'Enter') handleAgregar(); }}
                          className="w-24 bg-card border border-input focus:border-primary rounded-lg px-2 py-1 text-sm text-right focus:outline-none font-mono" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${sinStock ? 'bg-muted text-muted-foreground' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'}`}>
                        {v.stockActual ?? 0} uds
                      </span>
                      {!sinStock && (
                        <button onClick={handleAgregar}
                          className="text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer">
                          + Agregar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setVariantePickerOpen(false)}
              className="w-full py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground text-sm transition-colors cursor-pointer bg-transparent">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Selector de presentaciones (farmacia multi-unidad) ─────────── */}
      {presentacionPickerOpen && presentacionPickerProducto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPresentacionPickerOpen(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-1">Seleccionar presentación</p>
                <h3 className="font-bold text-base leading-snug">{presentacionPickerProducto.nombre}</h3>
              </div>
              <button onClick={() => setPresentacionPickerOpen(false)} className="text-muted-foreground hover:text-foreground p-1"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              {/* Unidad principal del producto */}
              <button
                onClick={async () => {
                  const stockDisp = getStockDisponible(presentacionPickerProducto);
                  if (stockDisp <= 0) { toast.error('Sin stock disponible'); return; }
                  const label = presentacionPickerProducto.unidadMedidaNombre || 'Unidad';
                  const pp = { id: undefined as number | undefined, factor: 1, precio: Number(presentacionPickerProducto.precioVenta), label };
                  setPresentacionPickerOpen(false);
                  await abrirLotePickerParaProducto(presentacionPickerProducto, pp);
                }}
                className="w-full flex items-center justify-between rounded-xl border border-border bg-muted/30 hover:bg-muted px-4 py-3 text-left transition-colors">
                <div>
                  <p className="font-semibold text-sm">{presentacionPickerProducto.unidadMedidaNombre || 'Unidad principal'}</p>
                  <p className="text-xs text-muted-foreground">Unidad base · stock: {getStockDisponible(presentacionPickerProducto)}</p>
                </div>
                <p className="font-bold text-sm text-primary">S/ {Number(presentacionPickerProducto.precioVenta).toFixed(2)}</p>
              </button>
              {/* Presentaciones adicionales */}
              {presentacionesDisponibles.map(pres => {
                const factor = pres.factor ?? 1;
                const stockDisp = Math.floor(getStockDisponible(presentacionPickerProducto) / factor);
                return (
                  <button key={pres.id}
                    disabled={stockDisp <= 0}
                    onClick={async () => {
                      if (stockDisp <= 0) { toast.error('Sin stock disponible'); return; }
                      const label = pres.unidadMedidaNombre || pres.unidadMedidaAbreviatura || 'Presentación';
                      const pp = { id: pres.id, factor, precio: Number(pres.precioVenta), label };
                      setPresentacionPickerOpen(false);
                      await abrirLotePickerParaProducto(presentacionPickerProducto, pp);
                    }}
                    className="w-full flex items-center justify-between rounded-xl border border-border bg-muted/30 hover:bg-muted px-4 py-3 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <div>
                      <p className="font-semibold text-sm">{pres.unidadMedidaNombre || pres.unidadMedidaAbreviatura}</p>
                      <p className="text-xs text-muted-foreground">
                        {factor > 1 ? `× ${factor} uds base · ` : ''}stock: {stockDisp}
                      </p>
                    </div>
                    <p className="font-bold text-sm text-primary">S/ {Number(pres.precioVenta).toFixed(2)}</p>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPresentacionPickerOpen(false)}
              className="w-full py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground text-sm transition-colors cursor-pointer bg-transparent">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Selector de lotes (farmacia) ──────────────────────────────── */}
      {lotePickerOpen && lotePickerProducto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setLotePickerOpen(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div>
              <p className="text-xs text-primary font-medium uppercase tracking-widest mb-1">Seleccionar lote</p>
              <h3 className="font-bold text-base">{lotePickerProducto.nombre}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Elige el lote/proveedor a descontar del stock</p>
            </div>
            {loadingLotes ? (
              <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-primary" /></div>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {lotesDisponibles.map(lote => {
                  const label = [lote.lote ? `Lote ${lote.lote}` : null, lote.proveedorNombre ? `· ${lote.proveedorNombre}` : null].filter(Boolean).join(' ') || `Lote #${lote.id}`;
                  const proximo = lote.diasParaVencer <= 30;
                  const precio = lote.precioVenta ?? lotePickerProducto.precioVenta ?? 0;
                  return (
                    <button key={lote.id}
                      onClick={() => {
                        const pp = pendingPresentacion;
                        setPendingPresentacion(null);
                        agregarItemAlCarrito(lotePickerProducto, undefined, pp?.label, false,
                          pp?.precio ?? lote.precioVenta ?? undefined, lote.id, label, pp?.id, pp?.factor ?? 1);
                        setLotePickerOpen(false);
                      }}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-left transition-colors cursor-pointer bg-transparent">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Vence: {lote.fechaVencimiento}
                          {proximo && <span className="ml-1.5 text-amber-600 dark:text-amber-400">⚠ Próximo</span>}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold font-mono">{fmt(precio)}</p>
                        <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">{lote.stockActual} uds</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={() => {
              if (getStockDisponible(lotePickerProducto) <= 0) { toast.error(`Sin stock disponible: ${lotePickerProducto.nombre}`); return; }
              const pp = pendingPresentacion;
              setPendingPresentacion(null);
              agregarItemAlCarrito(lotePickerProducto, undefined, pp?.label, false, pp?.precio ?? undefined, undefined, undefined, pp?.id, pp?.factor ?? 1);
              setLotePickerOpen(false);
            }}
              className="w-full py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground text-sm transition-colors cursor-pointer bg-transparent">
              Agregar sin seleccionar lote (FEFO automático)
            </button>
            <button onClick={() => { setPendingPresentacion(null); setLotePickerOpen(false); }}
              className="w-full py-2 rounded-xl text-muted-foreground hover:text-foreground text-sm transition-colors cursor-pointer bg-transparent border-0">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
