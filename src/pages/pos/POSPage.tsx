import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ScanLine, X, Plus, Minus, Trash2, ShoppingCart,
  Banknote, CreditCard, Smartphone, CheckCircle2,
  ArrowLeft, RotateCcw, Loader2, Search, Wallet, Lock, Tag, User, UserPlus,
  Camera, CameraOff, Printer, FileText, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productoService } from '../../services/producto.service';
import { ventaService } from '../../services/venta.service';
import { cajaService } from '../../services/caja.service';
import { notaCreditoService } from '../../services/notaCredito.service';
import { clienteService } from '../../services/cliente.service';
import type { ClienteDTO } from '../../services/cliente.service';
import { useAuthStore } from '../../store/authStore';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import type { ProductoDTO, DetalleVentaDTO, CajaDTO, ValidarNotaCreditoResponseDTO, VentaDTO, ProductoVarianteDTO } from '../../types';
import { printVentaTicket } from '../../utils/printTicket';
import { productoVarianteService } from '../../services/productoVariante.service';
import { axiosInstance } from '../../api/axios.config';
import { movimientoService } from '../../services/movimiento.service';
import type { LoteVencimientoDTO } from '../../services/movimiento.service';

// ── Tipos locales ──────────────────────────────────────────────────────────────

interface CartItem {
  producto: ProductoDTO;
  cantidad: number;
  precioUnitario: number;
  varianteId?: number;
  varianteDescripcion?: string;
}

const cartItemKey = (item: { producto: ProductoDTO; varianteId?: number }) =>
  item.varianteId ? `${item.producto.id}-v${item.varianteId}` : `${item.producto.id}`;

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
  const esRopa = negocio?.rubro === 'TIENDA_ROPA';
  const esFarmacia = negocio?.rubro === 'BOTICA' || negocio?.rubro === 'FARMACIA';

  // ── Lotes por producto (solo farmacia) ───────────────────────────────────
  const [proximoVencimientoMap, setProximoVencimientoMap] = useState<Map<number, LoteVencimientoDTO>>(new Map());

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

  // ── Selector de variantes ──────────────────────────────────────────────────
  const [variantePickerOpen, setVariantePickerOpen] = useState(false);
  const [variantePickerProducto, setVariantePickerProducto] = useState<ProductoDTO | null>(null);
  const [variantesDisponibles, setVariantesDisponibles] = useState<ProductoVarianteDTO[]>([]);
  const [loadingVariantes, setLoadingVariantes] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [mobileTab, setMobileTab] = useState<'productos' | 'carrito'>('productos');
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
    productoService.getAll().then(setTodosProductos).catch(() => {});
  }, []);

  useEffect(() => {
    if (!esFarmacia) return;
    movimientoService.getLotes().then(lotes => {
      const map = new Map<number, LoteVencimientoDTO>();
      const conFecha = lotes.filter(l => l.fechaVencimiento);

      // Agrupar por producto
      const porProducto = new Map<number, LoteVencimientoDTO[]>();
      conFecha.forEach(l => {
        if (!porProducto.has(l.productoId)) porProducto.set(l.productoId, []);
        porProducto.get(l.productoId)!.push(l);
      });

      // Por cada producto: priorizar el lote vigente más próximo a vencer.
      // Solo mostrar vencido si TODOS los lotes están vencidos.
      porProducto.forEach((lotesProducto, productoId) => {
        const vigentes = lotesProducto.filter(l => l.diasRestantes >= 0)
          .sort((a, b) => a.diasRestantes - b.diasRestantes);
        const vencidos = lotesProducto.filter(l => l.diasRestantes < 0)
          .sort((a, b) => b.diasRestantes - a.diasRestantes); // el menos vencido primero

        map.set(productoId, vigentes.length > 0 ? vigentes[0] : vencidos[0]);
      });

      setProximoVencimientoMap(map);
    }).catch(() => {});
  }, [esFarmacia]);

  // ── Precargar carrito desde venta anulada (via navigate state) ────────────
  useEffect(() => {
    const ventaOrigen = location.state?.cargarVenta;
    if (cartPreloadedRef.current || !ventaOrigen || todosProductos.length === 0) return;
    cartPreloadedRef.current = true;

    const items: CartItem[] = [];
    const sinStock: string[] = [];
    const noEncontrados: string[] = [];

    for (const detalle of ventaOrigen.detalles ?? []) {
      const producto = todosProductos.find((p: ProductoDTO) => p.id === detalle.productoId);
      if (!producto) {
        noEncontrados.push(detalle.productoNombre || `#${detalle.productoId}`);
        continue;
      }
      if ((producto.stockActual ?? 0) <= 0) {
        sinStock.push(producto.nombre);
        continue;
      }
      items.push({
        producto,
        cantidad: Math.min(detalle.cantidad, producto.stockActual ?? 1),
        precioUnitario: detalle.precioUnitario,
      });
    }

    if (items.length > 0) {
      setCart(items);
      toast.success(`Carrito precargado con ${items.length} producto(s) de la Venta #${ventaOrigen.id}`);
    }
    if (sinStock.length > 0) {
      toast.error(`Sin stock: ${sinStock.join(', ')}`);
    }
    if (noEncontrados.length > 0) {
      toast.error(`Productos no encontrados: ${noEncontrados.join(', ')}`);
    }

    // Limpiar el state para no recargar si el usuario vuelve
    window.history.replaceState({}, '');
  }, [todosProductos, location.state]);

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
        .filter(p => !soloGenerico || p.esGenerico === true)
        .filter(p =>
          p.nombre.toLowerCase().includes(lower) ||
          (p.codigoBarras ?? '').toLowerCase().includes(lower) ||
          (p.componentes ?? '').toLowerCase().includes(lower)
        )
        .slice(0, 8);
      setResultados(matches);
      setSelectedIndex(-1);
      setBuscando(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query, todosProductos, soloGenerico]);

  // ── Grid ordenado: próximos a vencer primero ─────────────────────────────
  const productosDisponibles = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy); limite.setDate(limite.getDate() + 90);

    return todosProductos
      .filter(p => p.activo !== false && (p.stockActual ?? 0) > 0)
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

  // ── Escáner de cámara ────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCameraScanner(false);
    setCameraError(null);
  }, []);

  const openCamera = useCallback(async () => {
    setCameraError(null);
    setShowCameraScanner(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (!('BarcodeDetector' in window)) {
        setCameraError('Tu navegador no soporta escaneo automático. Usa Chrome en Android o escribe el código manualmente.');
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e', 'itf'],
      });

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code: string = barcodes[0].rawValue;
            stopCamera();
            buscarPorCodigo(code);
          }
        } catch {
          // ignore individual frame errors
        }
      }, 250);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
        setCameraError('Permiso de cámara denegado. Habilítalo en la configuración del navegador.');
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('devicenotfound')) {
        setCameraError('No se encontró ninguna cámara en este dispositivo.');
      } else {
        setCameraError('No se pudo acceder a la cámara. Verifica los permisos.');
      }
    }
  }, [stopCamera, buscarPorCodigo]);

  // Limpiar cámara al desmontar
  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Carrito ───────────────────────────────────────────────────────────────
  const agregarAlCarrito = async (producto: ProductoDTO, switchToCart = false) => {
    // Para TIENDA_ROPA: mostrar picker de variantes
    if (esRopa) {
      try {
        setLoadingVariantes(true);
        const vars = await productoVarianteService.getByProducto(producto.id!);
        const activas = vars.filter(v => v.activo !== false && (v.stockActual ?? 0) > 0);
        if (activas.length > 0) {
          setVariantePickerProducto(producto);
          setVariantesDisponibles(activas);
          setVariantePickerOpen(true);
          setLoadingVariantes(false);
          return;
        }
      } catch { /* sin variantes, continúa flujo normal */ }
      finally { setLoadingVariantes(false); }
    }

    if ((producto.stockActual ?? 0) <= 0) {
      toast.error(`Sin stock: ${producto.nombre}`);
      return;
    }
    agregarItemAlCarrito(producto, undefined, undefined, switchToCart);
  };

  const agregarItemAlCarrito = (
    producto: ProductoDTO,
    varianteId?: number,
    varianteDescripcion?: string,
    switchToCart = false,
  ) => {
    setCart(prev => {
      const key = cartItemKey({ producto, varianteId });
      const idx = prev.findIndex(i => cartItemKey(i) === key);
      if (idx >= 0) {
        const newCart = [...prev];
        const item = newCart[idx];
        const stockMax = varianteId
          ? (variantesDisponibles.find(v => v.id === varianteId)?.stockActual ?? producto.stockActual ?? 0)
          : (producto.stockActual ?? 0);
        if (item.cantidad >= stockMax) {
          toast.error(`Stock máximo disponible: ${stockMax}`);
          return prev;
        }
        newCart[idx] = { ...item, cantidad: item.cantidad + 1 };
        return newCart;
      }
      return [...prev, { producto, cantidad: 1, precioUnitario: producto.precioVenta ?? 0, varianteId, varianteDescripcion }];
    });
    if (switchToCart) setMobileTab('carrito');
    refocus();
  };

  const cambiarCantidad = (key: string, delta: number) => {
    setCart(prev => prev
      .map(item => cartItemKey(item) === key
        ? { ...item, cantidad: item.cantidad + delta }
        : item
      )
      .filter(item => item.cantidad > 0)
    );
  };

  const quitarItem = (key: string) => {
    setCart(prev => prev.filter(i => cartItemKey(i) !== key));
    refocus();
  };

  const limpiarCarrito = () => {
    setCart([]);
    setQuery('');
    setResultados([]);
    refocus();
  };

  // ── Totales ───────────────────────────────────────────────────────────────
  const subtotalCarrito = cart.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const descuentoNc = ncInfo?.valida ? Math.min(ncInfo.montoTotal, subtotalCarrito) : 0;
  const total = Math.max(0, subtotalCarrito - descuentoNc);
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

  // ── Nota de crédito ───────────────────────────────────────────────────────
  const handleValidarNc = async () => {
    if (!ncCodigo) return;
    setNcLoading(true);
    try {
      const result = await notaCreditoService.validar(ncCodigo);
      setNcInfo(result);
      if (!result.valida) {
        toast.error(result.mensaje);
      } else {
        toast.success(`Nota de crédito válida: ${moneda} ${result.montoTotal.toFixed(2)}`);
      }
    } catch {
      toast.error('Error al validar la nota de crédito');
    } finally {
      setNcLoading(false);
    }
  };

  const quitarNc = () => {
    setNcCodigo('');
    setNcInfo(null);
  };

  // ── Búsqueda de clientes (debounce 300 ms) ────────────────────────────────
  useEffect(() => {
    if (clienteSeleccionado) return; // ya hay uno seleccionado, no buscar
    const q = clienteQuery.trim();
    if (!q) { setClienteResultados([]); setShowRegistrarCliente(false); return; }
    setBuscandoCliente(true);
    const t = setTimeout(async () => {
      try {
        // Si parece DNI/RUC (sólo dígitos) usamos buscarPorDocumento, si no search por nombre
        const resultados = /^\d+$/.test(q)
          ? await clienteService.buscarPorDocumento(q)
          : await clienteService.search(q);
        setClienteResultados(resultados);
        setShowRegistrarCliente(resultados.length === 0);
        // Pre-llenar el formulario de registro con el query si parece documento
        if (resultados.length === 0 && /^\d+$/.test(q)) {
          setNuevoClienteForm(prev => ({ ...prev, numeroDocumento: q }));
        }
      } catch {
        setClienteResultados([]);
      } finally {
        setBuscandoCliente(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [clienteQuery, clienteSeleccionado]);

  const seleccionarCliente = (c: ClienteDTO) => {
    setClienteSeleccionado(c);
    setClienteQuery('');
    setClienteResultados([]);
    setShowRegistrarCliente(false);
  };

  const seleccionarClienteComoReceptor = (c: ClienteDTO) => {
    seleccionarCliente(c);
    setReceptor({
      docTipo: c.tipoDocumento || (tipoComprobante === 'FACTURA' ? 'RUC' : 'DNI'),
      docNumero: c.numeroDocumento || '',
      nombre: c.nombre || '',
      direccion: '',
    });
  };

  const quitarClienteYReceptor = () => {
    setClienteSeleccionado(null);
    setClienteQuery('');
    setClienteResultados([]);
    setShowRegistrarCliente(false);
    setReceptor({ docTipo: tipoComprobante === 'FACTURA' ? 'RUC' : 'DNI', docNumero: '', nombre: '', direccion: '' });
  };

  const quitarCliente = () => {
    setClienteSeleccionado(null);
    setClienteQuery('');
    setClienteResultados([]);
    setShowRegistrarCliente(false);
    setNuevoClienteForm({ nombre: '', tipoDocumento: 'DNI', numeroDocumento: '' });
  };

  const handleRegistrarCliente = async () => {
    if (!nuevoClienteForm.nombre.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }
    setGuardandoCliente(true);
    try {
      const creado = await clienteService.create({
        nombre: nuevoClienteForm.nombre.trim(),
        tipoDocumento: nuevoClienteForm.tipoDocumento || undefined,
        numeroDocumento: nuevoClienteForm.numeroDocumento.trim() || undefined,
      });
      seleccionarCliente(creado);
      toast.success(`Cliente "${creado.nombre}" registrado`);
    } catch {
      toast.error('Error al registrar el cliente');
    } finally {
      setGuardandoCliente(false);
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
        varianteId: item.varianteId,
        varianteDescripcion: item.varianteDescripcion,
      }));

      const venta = await ventaService.create({
        vendedorId: user!.usuarioId,
        total: subtotalCarrito, // backend recalcula con NC
        metodoPago,
        estado: 'COMPLETADA',
        cajaId: cajaActiva?.id,
        notaCreditoCodigo: ncInfo?.valida ? ncCodigo : undefined,
        clienteId: clienteSeleccionado?.id,
        detalles,
      });

      setUltimaVentaId(venta.id ?? null);
      setUltimaVenta({
        ...venta,
        vendedorNombre: user?.nombre ?? undefined,
        detalles: cart.map(item => ({
          productoId: item.producto.id!,
          productoNombre: item.producto.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          varianteId: item.varianteId,
          varianteDescripcion: item.varianteDescripcion,
        })),
      });

      // Actualizar stock local inmediatamente (sin recargar del servidor)
      setTodosProductos(prev => prev.map(p => {
        const item = cart.find(i => i.producto.id === p.id);
        if (!item) return p;
        return { ...p, stockActual: Math.max(0, (p.stockActual ?? 0) - item.cantidad) };
      }));

      // Emitir comprobante si se eligió boleta o factura
      if (tipoComprobante !== 'TICKET' && venta.id) {
        try {
          const body: Record<string, unknown> = { ventaId: venta.id, tipo: tipoComprobante };
          if (receptor.docNumero) {
            body.receptorDocTipo   = tipoComprobante === 'FACTURA' ? 'RUC' : receptor.docTipo;
            body.receptorDocNumero = receptor.docNumero;
            body.receptorNombre    = receptor.nombre || undefined;
            body.receptorDireccion = receptor.direccion || undefined;
          }
          const { data: comp } = await axiosInstance.post('/facturacion/comprobantes', body);
          setUltimoComprobanteId(comp.id ?? null);
        } catch {
          toast.error('Venta registrada, pero no se pudo emitir el comprobante. Emítelo desde Facturación.');
        }
      }

      // Reset NC state
      setNcCodigo('');
      setNcInfo(null);
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
    setTipoComprobante('TICKET');
    setReceptor({ docTipo: 'DNI', docNumero: '', nombre: '', direccion: '' });
    setUltimoComprobanteId(null);
    setMontoPagado('');
    setMetodoPago('EFECTIVO');
    setUltimaVentaId(null);
    setUltimaVenta(null);
    setNcCodigo('');
    setNcInfo(null);
    quitarCliente();
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
    <>
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden select-none">

      {/* ── Barra superior ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 h-12 bg-gray-900 border-b border-primary/20 flex-shrink-0" style={{boxShadow:'0 1px 0 0 rgb(var(--primary)/0.15)'}}>
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
            {ultimoComprobanteId && (
              <button
                onClick={async () => {
                  try {
                    const { data } = await axiosInstance.get(
                      `/facturacion/comprobantes/${ultimoComprobanteId}/pdf`,
                      { responseType: 'blob' }
                    );
                    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${tipoComprobante === 'FACTURA' ? 'factura' : 'boleta'}-${ultimoComprobanteId}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    toast.error('No se pudo descargar el PDF');
                  }
                }}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Descargar {tipoComprobante === 'FACTURA' ? 'Factura' : 'Boleta'} PDF
              </button>
            )}
            {ultimaVenta && (
              <button
                onClick={() => printVentaTicket(ultimaVenta, negocio, clienteSeleccionado?.numeroDocumento ?? undefined, clienteSeleccionado?.nombre ?? undefined)}
                className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                Imprimir ticket
              </button>
            )}
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
        <div className="flex-1 overflow-y-auto p-4 flex justify-center">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md space-y-5 h-fit my-auto">
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

            {/* ── Comprobante + Cliente/Receptor unificado ──────────────── */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={11} /> Comprobante
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['TICKET', 'BOLETA', 'FACTURA'] as TipoComprobante[]).map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => {
                      setTipoComprobante(tipo);
                      quitarClienteYReceptor();
                    }}
                    className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                      tipoComprobante === tipo
                        ? 'bg-primary border-primary text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {tipo === 'TICKET' ? '🧾 Ticket' : tipo === 'BOLETA' ? '📄 Boleta' : '🏢 Factura'}
                  </button>
                ))}
              </div>

              {/* TICKET: cliente opcional para historial CRM */}
              {tipoComprobante === 'TICKET' && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <User size={10} /> Cliente (opcional — para historial)
                  </p>
                  {clienteSeleccionado ? (
                    <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-700/50 rounded-lg px-3 py-2">
                      <User size={14} className="text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{clienteSeleccionado.nombre}</p>
                        {clienteSeleccionado.numeroDocumento && (
                          <p className="text-xs text-blue-300">{clienteSeleccionado.tipoDocumento} {clienteSeleccionado.numeroDocumento}</p>
                        )}
                      </div>
                      <button type="button" onClick={quitarCliente} className="text-gray-500 hover:text-white flex-shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="DNI, RUC o nombre del cliente..."
                          value={clienteQuery}
                          onChange={e => { setClienteQuery(e.target.value); setShowRegistrarCliente(false); }}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600 pr-8"
                        />
                        {buscandoCliente && <Loader2 size={13} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />}
                      </div>
                      {clienteResultados.length > 0 && (
                        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-700/50">
                          {clienteResultados.slice(0, 5).map(c => (
                            <button key={c.id} type="button" onClick={() => seleccionarCliente(c)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700 transition-colors text-left">
                              <User size={14} className="text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{c.nombre}</p>
                                {c.numeroDocumento && <p className="text-xs text-gray-500">{c.tipoDocumento} {c.numeroDocumento}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {showRegistrarCliente && clienteQuery.trim() && (
                        <div className="bg-gray-800 border border-dashed border-gray-600 rounded-lg p-3 space-y-2">
                          <p className="text-xs text-amber-400 flex items-center gap-1.5"><UserPlus size={12} /> Cliente no encontrado — registrar</p>
                          <input type="text" placeholder="Nombre completo *" value={nuevoClienteForm.nombre}
                            onChange={e => setNuevoClienteForm(f => ({ ...f, nombre: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-500" />
                          <div className="flex gap-2">
                            <select value={nuevoClienteForm.tipoDocumento} onChange={e => setNuevoClienteForm(f => ({ ...f, tipoDocumento: e.target.value }))}
                              className="bg-gray-700 border border-gray-600 rounded-md px-2 py-2 text-sm focus:outline-none focus:border-primary text-white w-24 flex-shrink-0">
                              <option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">CE</option>
                            </select>
                            <input type="text" placeholder="Nro. documento" value={nuevoClienteForm.numeroDocumento}
                              onChange={e => setNuevoClienteForm(f => ({ ...f, numeroDocumento: e.target.value }))}
                              className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-500" />
                          </div>
                          <button type="button" onClick={handleRegistrarCliente} disabled={guardandoCliente || !nuevoClienteForm.nombre.trim()}
                            className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                            {guardandoCliente ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                            Registrar y seleccionar
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* BOLETA / FACTURA: búsqueda de cliente que rellena el receptor */}
              {(tipoComprobante === 'BOLETA' || tipoComprobante === 'FACTURA') && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <User size={10} />
                    {tipoComprobante === 'FACTURA' ? 'Datos del receptor (RUC)' : 'Datos del receptor (DNI)'}
                  </p>

                  {/* Cliente seleccionado → chip con datos del receptor */}
                  {clienteSeleccionado ? (
                    <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-700/50 rounded-lg px-3 py-2">
                      <User size={14} className="text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{receptor.nombre || clienteSeleccionado.nombre}</p>
                        {receptor.docNumero && <p className="text-xs text-blue-300">{receptor.docTipo} {receptor.docNumero}</p>}
                      </div>
                      <button type="button" onClick={quitarClienteYReceptor} className="text-gray-500 hover:text-white flex-shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Buscar cliente existente */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={tipoComprobante === 'FACTURA' ? 'Buscar por RUC o razón social...' : 'Buscar cliente por DNI o nombre...'}
                          value={clienteQuery}
                          onChange={e => { setClienteQuery(e.target.value); setShowRegistrarCliente(false); }}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600 pr-8"
                        />
                        {buscandoCliente && <Loader2 size={13} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />}
                      </div>

                      {/* Resultados: al elegir uno rellena receptor automáticamente */}
                      {clienteResultados.length > 0 && (
                        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-700/50">
                          {clienteResultados.slice(0, 5).map(c => (
                            <button key={c.id} type="button" onClick={() => seleccionarClienteComoReceptor(c)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700 transition-colors text-left">
                              <User size={14} className="text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{c.nombre}</p>
                                {c.numeroDocumento && <p className="text-xs text-gray-500">{c.tipoDocumento} {c.numeroDocumento}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Sin resultados o sin búsqueda: entrada manual */}
                      {!clienteResultados.length && (
                        <div className="space-y-2">
                          {tipoComprobante === 'BOLETA' ? (
                            <div className="flex gap-2">
                              <select value={receptor.docTipo} onChange={e => setReceptor(r => ({ ...r, docTipo: e.target.value }))}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-primary w-20 flex-shrink-0">
                                <option value="DNI">DNI</option><option value="CE">CE</option>
                              </select>
                              <input type="text" placeholder="Nro. documento (opcional)" value={receptor.docNumero}
                                onChange={e => setReceptor(r => ({ ...r, docNumero: e.target.value }))}
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600" />
                            </div>
                          ) : (
                            <input type="text" placeholder="RUC *" value={receptor.docNumero} maxLength={11}
                              onChange={e => setReceptor(r => ({ ...r, docNumero: e.target.value }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600 font-mono" />
                          )}
                          <input type="text"
                            placeholder={tipoComprobante === 'FACTURA' ? 'Razón social *' : 'Nombre (opcional)'}
                            value={receptor.nombre}
                            onChange={e => setReceptor(r => ({ ...r, nombre: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600" />
                          {tipoComprobante === 'FACTURA' && (
                            <input type="text" placeholder="Dirección (opcional)" value={receptor.direccion}
                              onChange={e => setReceptor(r => ({ ...r, direccion: e.target.value }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600" />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={11} /> Nota de Crédito (opcional)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="NC-2026-00001"
                  value={ncCodigo}
                  onChange={e => { setNcCodigo(e.target.value.toUpperCase()); setNcInfo(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleValidarNc()}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary placeholder-gray-600 font-mono"
                />
                <button
                  type="button"
                  onClick={handleValidarNc}
                  disabled={!ncCodigo || ncLoading}
                  className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  {ncLoading ? <Loader2 size={13} className="animate-spin" /> : 'Aplicar'}
                </button>
                {ncInfo && (
                  <button
                    type="button"
                    onClick={quitarNc}
                    className="px-2 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {ncInfo && ncInfo.valida && (
                <div className="rounded-lg bg-green-900/30 border border-green-700/50 px-3 py-2 text-sm text-green-400">
                  Nota válida — Descuento: {fmt(ncInfo.montoTotal)}
                </div>
              )}
              {ncInfo && !ncInfo.valida && (
                <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-400">
                  {ncInfo.mensaje}
                </div>
              )}
            </div>

            {/* Resumen con descuento NC */}
            {ncInfo?.valida && (
              <div className="bg-gray-800 rounded-xl px-4 py-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span>{fmt(subtotalCarrito)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-400">
                  <span>Descuento NC</span>
                  <span>- {fmt(descuentoNc)}</span>
                </div>
                <div className="border-t border-gray-700 pt-1.5 flex justify-between items-baseline">
                  <span className="text-gray-300 font-medium text-sm">Total a pagar</span>
                  <span className="text-2xl font-bold text-white">{fmt(total)}</span>
                </div>
              </div>
            )}

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
              <div className="flex gap-2">
                <div className="relative flex-1">
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
                {!esRopa && (
                <button
                  type="button"
                  onClick={() => setSoloGenerico(v => !v)}
                  title={soloGenerico ? 'Mostrando solo genéricos — clic para ver todos' : 'Filtrar solo genéricos'}
                  className={`flex items-center gap-1.5 px-3 h-10 rounded-xl border text-xs font-medium transition-colors flex-shrink-0 ${soloGenerico ? 'bg-primary border-primary text-primary-foreground' : 'bg-gray-800 border-gray-700 hover:border-primary hover:text-primary text-gray-400'}`}
                >
                  <Tag size={14} />
                  <span className="hidden sm:inline">Genérico</span>
                </button>
                )}
                {hasCamera && (
                  <button
                    type="button"
                    onClick={openCamera}
                    title="Escanear con cámara"
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 hover:border-primary hover:text-primary text-gray-400 transition-colors flex-shrink-0"
                  >
                    <Camera size={16} />
                  </button>
                )}
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
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${isActive ? 'bg-primary/15 border border-primary/50 shadow-sm shadow-primary/10' : 'hover:bg-gray-800/80 border border-gray-800 hover:border-gray-700'}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${isActive ? 'bg-primary/30' : 'bg-gray-800 group-hover:bg-gray-700'}`}>
                        {p.imagenUrl
                          ? <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" onError={e => { const t = e.target as HTMLImageElement; t.style.display='none'; (t.nextElementSibling as HTMLElement|null)?.style && ((t.nextElementSibling as HTMLElement).style.display=''); }} />
                          : null}
                        <span className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-gray-500'} ${p.imagenUrl ? 'hidden' : ''}`}>{p.nombre.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : ''}`}>{p.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {esFarmacia ? (() => {
                            const lote = proximoVencimientoMap.get(p.id!);
                            const vencido = lote && lote.diasRestantes < 0;
                            const proximo = lote && lote.diasRestantes >= 0 && lote.diasRestantes <= 30;
                            const colorFecha = vencido ? 'text-red-400' : proximo ? 'text-amber-400' : 'text-gray-500';
                            return (
                              <>
                                {lote?.lote && <span className="mr-2">Lote: {lote.lote}</span>}
                                Stock: <span className={p.stockActual! <= 0 ? 'text-red-400' : 'text-gray-400'}>{p.stockActual}</span>
                                {lote && (
                                  <span className={`ml-2 ${colorFecha}`}>
                                    · {vencido ? '⚠ Vencido' : `Vence ${lote.fechaVencimiento}`}
                                  </span>
                                )}
                              </>
                            );
                          })() : (
                            <>
                              {p.codigoBarras && <span className="mr-2">{p.codigoBarras}</span>}
                              Stock: <span className={p.stockActual! <= 0 ? 'text-red-400' : 'text-gray-400'}>{p.stockActual}</span>
                              {p.unidadesPorCaja && <span className="ml-2 text-gray-600">· {p.unidadesPorCaja} u/caja</span>}
                            </>
                          )}
                          {p.esGenerico && <span className="ml-2 text-blue-400 font-medium">Genérico</span>}
                        </p>
                        {p.componentes && (
                          <p className="text-[10px] text-gray-600 truncate" title={p.componentes}>
                            {p.componentes}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-bold text-primary flex-shrink-0">{fmt(p.precioVenta ?? 0)}</p>
                    </button>
                  );
                })}
              </div>
            )}
            {/* Grid rápido */}
            {resultados.length === 0 && query === '' && productosDisponibles.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="h-16 w-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-1">
                  <span className="text-3xl">📦</span>
                </div>
                <p className="text-gray-300 font-medium">Sin productos con stock</p>
                <p className="text-gray-500 text-sm max-w-xs">Ve a <strong>Inventario → Productos</strong> para agregar productos y asignarles stock antes de usar el POS.</p>
              </div>
            )}
            {resultados.length === 0 && query === '' && productosDisponibles.length > 0 && (
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-xs text-gray-600 uppercase tracking-wider mb-2 px-1">Productos disponibles</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {productosDisponibles.slice(0, 20).map(p => {
                    const hoy = new Date(); hoy.setHours(0,0,0,0);
                    const limite90 = new Date(hoy); limite90.setDate(limite90.getDate() + 90);
                    const fv = p.proximaFechaVencimiento ? new Date(p.proximaFechaVencimiento + 'T00:00:00') : null;
                    const diasRestantes = fv ? Math.ceil((fv.getTime() - hoy.getTime()) / 86400000) : null;
                    const porVencer = fv && fv >= hoy && fv <= limite90;
                    const critico   = diasRestantes !== null && diasRestantes <= 7;
                    return (
                      <button key={p.id} onClick={() => agregarAlCarrito(p)}
                        className={`flex flex-col rounded-xl border text-left transition-all overflow-hidden group relative
                          ${porVencer
                            ? 'bg-amber-950/40 hover:bg-amber-900/40 border-amber-700/50 hover:border-amber-500'
                            : 'bg-gray-900 hover:bg-gray-800/90 border-gray-800 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5'}`}
                      >
                        {/* Badge vencimiento */}
                        {porVencer && (
                          <span className={`absolute top-1.5 right-1.5 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded-full
                            ${critico ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>
                            {critico ? `¡${diasRestantes}d!` : `${diasRestantes}d`}
                          </span>
                        )}
                        {/* Imagen */}
                        <div className="w-full h-28 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden group-hover:brightness-110 transition-all flex-shrink-0">
                          {p.imagenUrl
                            ? <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" onError={e => { const t = e.target as HTMLImageElement; t.style.display='none'; (t.nextElementSibling as HTMLElement|null)?.style && ((t.nextElementSibling as HTMLElement).style.display='flex'); }} />
                            : null}
                          <span className={`text-4xl font-bold text-gray-700 ${p.imagenUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>{p.nombre.charAt(0).toUpperCase()}</span>
                        </div>
                        {/* Info */}
                        <div className="p-2.5">
                          <p className="text-xs font-medium leading-snug line-clamp-2 mb-1">{p.nombre}</p>
                          <p className="text-sm font-bold text-primary">{fmt(p.precioVenta ?? 0)}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">Stock: {p.stockActual}</p>
                          {porVencer && (
                            <p className={`text-[9px] font-semibold mt-0.5 ${critico ? 'text-red-400' : 'text-amber-400'}`}>
                              Vence {fv!.toLocaleDateString('es-PE', { day:'2-digit', month:'short' })}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
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
          <div className="hidden lg:flex w-72 xl:w-80 flex-col bg-gray-950 flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
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
                  <div key={cartItemKey(item)} className="flex items-center gap-2 px-2 py-2 rounded-lg border border-gray-800/60 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-900 group transition-colors">
                    {/* Thumbnail */}
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
                      {item.producto.imagenUrl
                        ? <img src={item.producto.imagenUrl} alt={item.producto.nombre} className="w-full h-full object-cover" onError={e => { const t = e.target as HTMLImageElement; t.style.display='none'; (t.nextElementSibling as HTMLElement|null)?.style && ((t.nextElementSibling as HTMLElement).style.display=''); }} />
                        : null}
                      <span className={`text-xs font-bold text-gray-500 ${item.producto.imagenUrl ? 'hidden' : ''}`}>{item.producto.nombre.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight truncate">{item.producto.nombre}</p>
                      {item.varianteDescripcion && <p className="text-xs text-violet-400 leading-tight">{item.varianteDescripcion}</p>}
                      <p className="text-xs text-gray-500 mt-0.5">{fmt(item.precioUnitario)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => cambiarCantidad(cartItemKey(item), -1)} className="w-6 h-6 rounded-md bg-gray-800 hover:bg-red-500/20 hover:text-red-400 border border-gray-700 hover:border-red-500/40 flex items-center justify-center transition-colors"><Minus size={11} /></button>
                      <span className="w-6 text-center text-sm font-bold text-white">{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(cartItemKey(item), 1)} disabled={item.cantidad >= (item.producto.stockActual ?? 0)} className="w-6 h-6 rounded-md bg-gray-800 hover:bg-primary/20 hover:text-primary border border-gray-700 hover:border-primary/40 disabled:opacity-30 flex items-center justify-center transition-colors"><Plus size={11} /></button>
                    </div>
                    <div className="text-right min-w-[52px] flex-shrink-0">
                      <p className="text-xs font-bold">{fmt(item.cantidad * item.precioUnitario)}</p>
                    </div>
                    <button onClick={() => quitarItem(cartItemKey(item))} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0"><X size={13} /></button>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-800 p-4 space-y-3 bg-gray-900/50">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-500">{cart.reduce((s, i) => s + i.cantidad, 0)} producto(s)</span>
                <span className="text-2xl font-bold text-white">{fmt(total)}</span>
              </div>
              <button onClick={() => setStep('cobro')} disabled={cart.length === 0}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
              >
                <CheckCircle2 size={18} />Cobrar
                <span className="text-green-200/70 text-xs font-normal ml-1">F2</span>
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
                  <div className="flex gap-2">
                    <div className="relative flex-1">
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
                    {hasCamera && (
                      <button
                        type="button"
                        onClick={openCamera}
                        title="Escanear con cámara"
                        className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 hover:border-primary hover:text-primary text-gray-400 active:bg-gray-700 transition-colors flex-shrink-0"
                      >
                        <Camera size={20} />
                      </button>
                    )}
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
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${isActive ? 'bg-primary/30' : 'bg-gray-800'}`}>
                            {p.imagenUrl
                              ? <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" onError={e => { const t = e.target as HTMLImageElement; t.style.display='none'; (t.nextElementSibling as HTMLElement|null)?.style && ((t.nextElementSibling as HTMLElement).style.display=''); }} />
                              : null}
                            <span className={`text-base font-bold ${isActive ? 'text-primary' : 'text-gray-500'} ${p.imagenUrl ? 'hidden' : ''}`}>{p.nombre.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.nombre}</p>
                            <p className="text-xs text-gray-500">
                              Stock: <span className={p.stockActual! <= 0 ? 'text-red-400' : 'text-gray-400'}>{p.stockActual}</span>
                            </p>
                            {p.componentes && (
                              <p className="text-[10px] text-gray-600 truncate" title={p.componentes}>
                                {p.componentes}
                              </p>
                            )}
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
                          className="flex flex-col rounded-xl bg-gray-900 active:bg-gray-700 border border-gray-800 text-left transition-all overflow-hidden"
                        >
                          {/* Imagen grande */}
                          <div className="w-full h-28 bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {p.imagenUrl
                              ? <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" onError={e => { const t = e.target as HTMLImageElement; t.style.display='none'; (t.nextElementSibling as HTMLElement|null)?.style && ((t.nextElementSibling as HTMLElement).style.display='flex'); }} />
                              : null}
                            <span className={`text-4xl font-bold text-gray-700 ${p.imagenUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>{p.nombre.charAt(0).toUpperCase()}</span>
                          </div>
                          {/* Info */}
                          <div className="p-2.5">
                            <p className="text-xs font-medium leading-snug line-clamp-2 mb-1">{p.nombre}</p>
                            <p className="text-base font-bold text-primary">{fmt(p.precioVenta ?? 0)}</p>
                            <p className="text-[10px] text-gray-600 mt-0.5">Stock: {p.stockActual}</p>
                          </div>
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
                        {/* Thumbnail móvil */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-700 flex items-center justify-center flex-shrink-0">
                          {item.producto.imagenUrl
                            ? <img src={item.producto.imagenUrl} alt={item.producto.nombre} className="w-full h-full object-cover" onError={e => { const t = e.target as HTMLImageElement; t.style.display='none'; (t.nextElementSibling as HTMLElement|null)?.style && ((t.nextElementSibling as HTMLElement).style.display=''); }} />
                            : null}
                          <span className={`text-sm font-bold text-gray-500 ${item.producto.imagenUrl ? 'hidden' : ''}`}>{item.producto.nombre.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{item.producto.nombre}</p>
                          {item.varianteDescripcion && <p className="text-xs text-violet-400 leading-tight">{item.varianteDescripcion}</p>}
                          <p className="text-xs text-gray-500 mt-0.5">{fmt(item.precioUnitario)} c/u</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => cambiarCantidad(cartItemKey(item), -1)}
                            className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center">
                            <Minus size={13} />
                          </button>
                          <span className="w-7 text-center text-sm font-bold">{item.cantidad}</span>
                          <button onClick={() => cambiarCantidad(cartItemKey(item), 1)}
                            disabled={item.cantidad >= (item.producto.stockActual ?? 0)}
                            className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 flex items-center justify-center">
                            <Plus size={13} />
                          </button>
                        </div>
                        <div className="text-right min-w-[60px] flex-shrink-0">
                          <p className="text-sm font-bold text-primary">{fmt(item.cantidad * item.precioUnitario)}</p>
                          <button onClick={() => quitarItem(cartItemKey(item))} className="text-gray-600 hover:text-red-400 transition-colors mt-0.5">
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

      {/* ── Modal: Escáner de cámara ───────────────────────────────────── */}
      {showCameraScanner && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <style>{`
            @keyframes scanline { 0%,100% { top: 15%; } 50% { top: 80%; } }
            .animate-scanline { animation: scanline 2s ease-in-out infinite; }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/90 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-primary" />
              <span className="text-sm font-semibold">Escanear código de barras</span>
            </div>
            <button
              type="button"
              onClick={stopCamera}
              className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Visor de cámara */}
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {!cameraError && (
              <>
                {/* Oscurecimiento lateral (4 franjas alrededor del recuadro) */}
                <div className="absolute inset-0 flex flex-col pointer-events-none">
                  <div className="flex-1 bg-black/55" />
                  <div className="flex" style={{ height: 256 }}>
                    <div className="flex-1 bg-black/55" />
                    <div style={{ width: 256 }} />
                    <div className="flex-1 bg-black/55" />
                  </div>
                  <div className="flex-1 bg-black/55" />
                </div>

                {/* Recuadro de escaneo */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative" style={{ width: 256, height: 256 }}>
                    {/* Esquinas */}
                    <div className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-primary rounded-tl" />
                    <div className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-primary rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-primary rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-primary rounded-br" />
                    {/* Línea de escaneo */}
                    <div
                      className="absolute left-3 right-3 h-0.5 bg-primary/80 animate-scanline"
                      style={{ top: '15%', boxShadow: '0 0 6px hsl(var(--primary))' }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Error */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-8">
                <div className="text-center space-y-4 max-w-xs">
                  <CameraOff size={44} className="mx-auto text-red-400" />
                  <p className="text-sm text-gray-300 leading-relaxed">{cameraError}</p>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!cameraError && (
            <div className="flex-shrink-0 bg-black/90 px-4 py-4 flex flex-col items-center gap-3">
              <p className="text-xs text-gray-500">Apunta la cámara al código de barras del producto</p>
              <button
                type="button"
                onClick={stopCamera}
                className="px-10 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
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

    {/* ── Selector de variantes (TIENDA_ROPA) ───────────────────────────────── */}
    {variantePickerOpen && variantePickerProducto && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={() => setVariantePickerOpen(false)}>
        <div className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-base text-white">{variantePickerProducto.nombre}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Elige la variante a agregar al carrito</p>
            </div>
            <span className="text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full font-medium">
              {variantesDisponibles.length} opciones
            </span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
            {loadingVariantes ? (
              <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" /></div>
            ) : variantesDisponibles.map(v => {
              const desc = [v.talla, v.color].filter(Boolean).join(' / ');
              const sinStock = (v.stockActual ?? 0) <= 0;
              return (
                <button
                  key={v.id}
                  disabled={sinStock}
                  onClick={() => {
                    agregarItemAlCarrito(variantePickerProducto, v.id!, desc, true);
                    setVariantePickerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-all text-left
                    ${sinStock
                      ? 'border-gray-800 opacity-40 cursor-not-allowed bg-gray-900/40'
                      : 'border-gray-700 hover:border-violet-500 hover:bg-violet-500/10 bg-gray-800/50 hover:shadow-sm hover:shadow-violet-500/10 active:scale-[0.98]'}`}
                >
                  <div>
                    <p className="font-semibold text-sm text-white">{desc || v.sku || `Variante #${v.id}`}</p>
                    {v.sku && <p className="text-xs text-gray-400 mt-0.5">SKU: {v.sku}</p>}
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${sinStock ? 'bg-gray-800 text-gray-600' : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'}`}>
                    {v.stockActual ?? 0} uds
                  </span>
                </button>
              );
            })}
          </div>
          <button onClick={() => setVariantePickerOpen(false)}
            className="w-full py-2.5 rounded-xl border border-gray-700 text-gray-500 hover:text-white hover:border-gray-500 text-sm transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    )}
    </>
  );
}
