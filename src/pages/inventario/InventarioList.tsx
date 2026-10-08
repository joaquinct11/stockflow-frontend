import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { movimientoService } from '../../services/movimiento.service';
import { refreshOnboarding } from '../../utils/onboardingEvents';
import type { LoteVencimientoDTO, LoteVentaDetalleDTO } from '../../services/movimiento.service';
import { productoService } from '../../services/producto.service';
import { unidadMedidaService } from '../../services/unidadMedida.service';
import { proveedorService } from '../../services/proveedor.service';
import { productoVarianteService } from '../../services/productoVariante.service';
import { productoPresentacionService } from '../../services/productoPresentacion.service';
import type { MovimientoInventarioDTO, ProductoDTO, ProductoVarianteDTO, ProductoPresentacionDTO, ProveedorDTO, UnidadMedidaDTO } from '../../types';
import { useSucursalStore } from '../../store/sucursalStore';
import { Autocomplete } from '../../components/ui/Autocomplete';
import { notify } from '../../lib/notify';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { usePermissions } from '../../hooks/usePermissions';
import { exportarStockExcel, exportarStockPDF } from '../../utils/reportes-export';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { ImportarProductosModal } from '../../components/inventario/ImportarProductosModal';

const T = {
  bg: '#F6F7F9', surface: '#FFFFFF', surface2: '#F1F3F6', surface3: '#EDF0F4',
  text: '#0F1623', text2: '#4A5568', text3: '#8896A5',
  primary: '#4F6EF7', primarySoft: '#EEF1FE', primaryLine: '#C7D2FC',
  line: '#E4E8EF', lineSoft: '#F0F2F5',
  ok: '#16A34A', okSoft: '#DCFCE7', okLine: '#BBF7D0',
  bad: '#DC2626', badSoft: '#FEE2E2', badLine: '#FECACA',
  warn: '#D97706', warnSoft: '#FEF3C7', warnLine: '#FDE68A',
  shadow: '0 2px 8px -2px rgba(15,22,35,.08)',
};

const iniciales = (n: string) => n.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
const avatarStyle = (n: string): React.CSSProperties => {
  const cols = ['#4F6EF7','#7C3AED','#059669','#D97706','#DC2626','#0891B2'];
  const c = cols[(n.charCodeAt(0) || 0) % cols.length];
  return { width: 36, height: 36, borderRadius: 9, background: c + '22', color: c, display: 'grid', placeItems: 'center', fontFamily: 'Inter,sans-serif', fontSize: '.78rem', fontWeight: 700, flexShrink: 0 };
};

const FxInput = ({ style: s, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} style={{ width: '100%', height: 44, padding: '0 13px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', ...s }}
    onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; if (p.onFocus) (p.onFocus as React.FocusEventHandler<HTMLInputElement>)(e); }}
    onBlur={e => { e.currentTarget.style.borderColor = (s as React.CSSProperties)?.borderColor ?? T.line; e.currentTarget.style.boxShadow = 'none'; if (p.onBlur) (p.onBlur as React.FocusEventHandler<HTMLInputElement>)(e); }} />
);

const FxSelect = ({ style: s, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div style={{ position: 'relative', width: '100%' }}>
    <select {...p} style={{ width: '100%', height: 44, padding: '0 34px 0 13px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box', ...s }}>
      {children}
    </select>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="m6 9 6 6 6-6" /></svg>
  </div>
);

if (typeof document !== 'undefined' && !document.getElementById('fx-inv-kf')) {
  const s = document.createElement('style');
  s.id = 'fx-inv-kf';
  s.textContent = `@keyframes fx-in{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}`;
  document.head.appendChild(s);
}

export function InventarioList() {
  const { userId, tenantId } = useCurrentUser();
  const { canCreate, canView, puede } = usePermissions();
  const location = useLocation();
  const { config: negocioConfig } = useTenantConfigStore();
  const { sucursalActual, sucursales, loaded: sucursalLoaded } = useSucursalStore();
  const isMultiLocal = sucursales.length > 1;
  const sucursalId = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;
  const esFarmacia = negocioConfig?.rubro === 'BOTICA' || negocioConfig?.rubro === 'FARMACIA';
  const esServicios = negocioConfig?.rubro === 'EMPRESA_SERVICIOS';
  const hasViewPermission = canView('INVENTARIO');

  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [productosForm, setProductosForm] = useState<ProductoDTO[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedidaDTO[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [movStep, setMovStep] = useState<1 | 2 | 3>(1);

  // Auto-abrir dialog si viene desde acceso rápido del dashboard
  useEffect(() => {
    if ((location.state as { openDialog?: boolean } | null)?.openDialog) {
      setIsDialogOpen(true);
      window.history.replaceState({}, '');
    }
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedProducto, setSelectedProducto] = useState<{ id: number | string; label: string } | null>(null);
  const [, setSelectedProveedorMov] = useState<{ id: number | string; label: string } | null>(null);

  // Variantes (TIENDA_ROPA)
  const esRopa = negocioConfig?.rubro === 'TIENDA_ROPA';
  const [variantesProducto, setVariantesProducto] = useState<ProductoVarianteDTO[]>([]);
  const [selectedVarianteId, setSelectedVarianteId] = useState<number | null>(null);
  const [loadingVariantes, setLoadingVariantes] = useState(false);

  const [costoStr, setCostoStr] = useState('');
  const [precioStr, setPrecioStr] = useState('');
  const [ajusteCostoStr, setAjusteCostoStr] = useState('');
  const [ajustePrecioStr, setAjustePrecioStr] = useState('');
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [kardexLoading, setKardexLoading] = useState(false);
  const [kardexProducto, setKardexProducto] = useState<ProductoDTO | null>(null);
  const [kardexMovimientos, setKardexMovimientos] = useState<MovimientoInventarioDTO[]>([]);
  const [kardexTipoFilter, setKardexTipoFilter] = useState<string>('TODOS');
  const [kardexDesde, setKardexDesde] = useState('');
  const [kardexHasta, setKardexHasta] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState<'stock' | 'lotes'>('stock');

  // Lotes
  const [lotes, setLotes] = useState<LoteVencimientoDTO[]>([]);
  const [lotesLoading, setLotesLoading] = useState(false);

  // Lotes del producto seleccionado para ajuste (solo farmacia)
  const [lotesDelProducto, setLotesDelProducto] = useState<LoteVencimientoDTO[]>([]);
  const [loadingLotesProducto, setLoadingLotesProducto] = useState(false);
  const [ajusteLoteMovimientoId, setAjusteLoteMovimientoId] = useState<number | null>(null);
  const [lotesFiltro, setLotesFiltro] = useState<'todos' | 'vencidos' | 'proximos30' | 'proximos90'>('todos');
  const [lotesSearch, setLotesSearch] = useState('');
  const [lotesPage, setLotesPage] = useState(1);
  const LOTES_PER_PAGE = 10;

  // Kardex expandible
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [lotesVentaCache, setLotesVentaCache] = useState<Map<number, LoteVentaDetalleDTO[]>>(new Map());
  const [loadingLotesVenta, setLoadingLotesVenta] = useState<Set<number>>(new Set());

  // Editar datos del lote
  const [loteEditando, setLoteEditando] = useState<LoteVencimientoDTO | null>(null);
  const [editProveedorId, setEditProveedorId] = useState<number | ''>('');
  const [editPrecioVenta, setEditPrecioVenta] = useState<string>('');
  const [editLoteNumero, setEditLoteNumero] = useState<string>('');
  const [editFechaVencimiento, setEditFechaVencimiento] = useState<string>('');
  const [savingLoteEdit, setSavingLoteEdit] = useState(false);

  // Baja de lote vencido (merma)
  const [loteMerma, setLoteMerma] = useState<LoteVencimientoDTO | null>(null);
  const [mermaCantidad, setMermaCantidad] = useState<string>('');
  const [mermaMotivo, setMermaMotivo] = useState<string>('VENCIMIENTO');
  const [mermaObservaciones, setMermaObservaciones] = useState<string>('');
  const [savingMerma, setSavingMerma] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [tipoAjuste, setTipoAjuste] = useState<'STOCK' | 'PRECIO' | 'AMBOS'>('STOCK');
  const [presentacionesProducto, setPresentacionesProducto] = useState<ProductoPresentacionDTO[]>([]);
  const [preciosPresent, setPreciosPresent] = useState<Record<number, string>>({});

  const [formData, setFormData] = useState<MovimientoInventarioDTO>({
    productoId: 0,
    tipo: 'ENTRADA',
    cantidad: 0,
    descripcion: '',
    referencia: '',
    usuarioId: 0,
    tenantId: '',
    proveedorId: undefined,
    costoUnitario: undefined,
    precioVenta: undefined,
    lote: '',
    fechaVencimiento: undefined,
    registroSanitario: '',
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...(userId ? { usuarioId: userId } : {}),
      ...(tenantId ? { tenantId } : {}),
    }));
  }, [userId, tenantId]);

  useEffect(() => {
    if (!sucursalLoaded) return;
    if (hasViewPermission) {
      fetchData();
    } else if (canCreate('INVENTARIO')) {
      fetchFormData();
      setLoading(false);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalLoaded, hasViewPermission, sucursalId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (activeTab === 'lotes' && hasViewPermission) {
      setLotesLoading(true);
      movimientoService.getLotes()
        .then(setLotes)
        .catch((err) => notify.fromError(err, 'No se pudieron cargar los lotes del producto.'))
        .finally(() => setLotesLoading(false));
    }
  }, [activeTab, hasViewPermission]);

  const fetchFormData = async () => {
    try {
      const [productosData, unidadesData] = await Promise.all([
        productoService.getAll(),
        unidadMedidaService.getAll(),
      ]);
      setProductos(productosData);
      setProductosForm(productosData);
      setUnidadesMedida(unidadesData.filter((u) => u.activo !== false));
      if (puede('VER_PROVEEDORES')) {
        const proveedoresData = await proveedorService.getAll();
        setProveedores(proveedoresData);
      }
    } catch (err) {
      notify.fromError(err, 'No se pudieron cargar los datos del formulario.');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productosData, todosProdData, unidadesData] = await Promise.all([
        productoService.getAll(sucursalId),
        productoService.getAll(),
        unidadMedidaService.getAll(),
      ]);
      setProductos(productosData);
      setProductosForm(todosProdData);
      setUnidadesMedida(unidadesData.filter((u) => u.activo !== false));
      if (puede('VER_PROVEEDORES')) {
        const proveedoresData = await proveedorService.getAll();
        setProveedores(proveedoresData);
      }
    } catch (err) {
      notify.fromError(err, 'No se pudieron cargar los productos de inventario.');
    } finally {
      setLoading(false);
    }
  };

  const unidadById = useMemo(() => {
    const m = new Map<number, UnidadMedidaDTO>();
    unidadesMedida.forEach((u) => m.set(u.id, u));
    return m;
  }, [unidadesMedida]);


  // Para dealer: movimientos solo aplica a productos físicos (tipo PRODUCTO)
  // Para la TABLA: solo productos de la sucursal actual (Option B)
  const productosFisicos = esServicios
    ? productos.filter((p) => p.tipo === 'PRODUCTO' || !p.tipo)
    : productos;

  // Para el FORMULARIO: todos los productos del tenant (para poder asignar stock a cualquiera)
  const productosFisicosForm = esServicios
    ? productosForm.filter((p) => p.tipo === 'PRODUCTO' || !p.tipo)
    : productosForm;

  // Mapa id → stock en la sucursal actual (solo los productos que ya tienen stock/movimientos ahí)
  const stockEnSucursal = useMemo(() => {
    const m = new Map<number, number>();
    productos.forEach((p) => { if (p.id != null) m.set(p.id, p.stockActual ?? 0); });
    return m;
  }, [productos]);

  const productosOptions = productosFisicosForm.map((p) => ({
    id: p.id!,
    label: `${p.nombre}`,
    subtitle: `Código: ${p.codigoBarras || 'N/A'} | Stock en sucursal: ${stockEnSucursal.get(p.id!) ?? 0} | Categoría: ${p.categoriaNombre || 'N/A'} | UM: ${unidadById.get(p.unidadMedidaId)?.nombre ?? '-'}`,
    searchText: [p.componentes, p.codigoBarras].filter(Boolean).join(' '),
  }));

  const openKardex = async (producto: ProductoDTO) => {
    setKardexProducto(producto);
    setIsKardexOpen(true);
    setKardexLoading(true);
    try {
      const data = await movimientoService.getByProducto(producto.id!, sucursalId);
      const sorted = [...data].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return da - db;
      });
      setKardexMovimientos(sorted);
    } catch (err) {
      notify.fromError(err, 'No se pudo cargar el Kardex de este producto.');
    } finally {
      setKardexLoading(false);
    }
  };

  const closeKardex = () => {
    setIsKardexOpen(false);
    setKardexProducto(null);
    setKardexMovimientos([]);
    setKardexTipoFilter('TODOS');
    setKardexDesde('');
    setKardexHasta('');
    setExpandedRows(new Set());
    setLotesVentaCache(new Map());
  };

  const toggleKardexRow = async (movId: number) => {
    const next = new Set(expandedRows);
    if (next.has(movId)) { next.delete(movId); setExpandedRows(next); return; }
    next.add(movId);
    setExpandedRows(next);
    if (!lotesVentaCache.has(movId)) {
      setLoadingLotesVenta((prev) => new Set(prev).add(movId));
      try {
        const data = await movimientoService.getLotesDeVenta(movId);
        setLotesVentaCache((prev) => new Map(prev).set(movId, data));
      } catch { /* silencioso */ }
      finally {
        setLoadingLotesVenta((prev) => { const s = new Set(prev); s.delete(movId); return s; });
      }
    }
  };

  const kardexFiltrados = useMemo(() => {
    return kardexMovimientos.filter((m) => {
      if (kardexTipoFilter !== 'TODOS' && m.tipo !== kardexTipoFilter) return false;
      if (kardexDesde && m.createdAt && m.createdAt < kardexDesde) return false;
      if (kardexHasta && m.createdAt && m.createdAt.split('T')[0] > kardexHasta) return false;
      return true;
    });
  }, [kardexMovimientos, kardexTipoFilter, kardexDesde, kardexHasta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.productoId === 0) {
      notify.error('Debes seleccionar un producto');
      return;
    }

    if (!formData.usuarioId) {
      notify.error('Usuario requerido');
      return;
    }

    const esAjusteSoloPrecio = formData.tipo === 'AJUSTE' && tipoAjuste === 'PRECIO';
    // AJUSTE permite cantidad=0 (p.ej. poner lote a cero); otros tipos requieren > 0
    if (!esAjusteSoloPrecio && formData.tipo !== 'AJUSTE' && formData.cantidad <= 0) {
      notify.error('La cantidad debe ser mayor a 0');
      return;
    }
    const ajusteCostoFinal = parseFloat(ajusteCostoStr);
    const ajustePrecioFinal = parseFloat(ajustePrecioStr);
    if (esAjusteSoloPrecio && !ajusteCostoStr && !ajustePrecioStr) {
      notify.error('Debes ingresar al menos un precio a actualizar');
      return;
    }
    if (esAjusteSoloPrecio) {
      if (ajusteCostoStr && (isNaN(ajusteCostoFinal) || ajusteCostoFinal < 0)) {
        notify.error('El costo unitario ingresado no es válido');
        return;
      }
      if (ajustePrecioStr && (isNaN(ajustePrecioFinal) || ajustePrecioFinal < 0)) {
        notify.error('El precio de venta ingresado no es válido');
        return;
      }
    }

    const costoFinal = parseFloat(costoStr);
    if (formData.tipo === 'ENTRADA' && costoStr !== '' && !isNaN(costoFinal) && costoFinal <= 0) {
      notify.error('El costo unitario debe ser mayor a 0', { detail: 'Ingresa el costo de compra por unidad, por ejemplo: 0.50, 1.20, 15.00' });
      return;
    }

    // Para farmacia: fecha de vencimiento obligatoria en ENTRADA y DEVOLUCIÓN
    if (esFarmacia && (formData.tipo === 'ENTRADA' || formData.tipo === 'DEVOLUCION') && !formData.fechaVencimiento) {
      notify.error('Los medicamentos requieren fecha de vencimiento');
      return;
    }
    if (esFarmacia && (formData.tipo === 'ENTRADA' || formData.tipo === 'DEVOLUCION') && formData.fechaVencimiento) {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      if (new Date(formData.fechaVencimiento) < hoy) {
        notify.error('No se puede ingresar un medicamento ya vencido');
        return;
      }
    }
    if (esFarmacia && formData.tipo === 'ENTRADA' && !(formData.registroSanitario ?? '').trim()) {
      notify.error('El registro sanitario es obligatorio para medicamentos');
      return;
    }

    // Para TIENDA_ROPA: si el producto tiene variantes, requerir selección
    if (esRopa && variantesProducto.length > 0 && !selectedVarianteId) {
      notify.error('Selecciona una variante (talla/color) para este producto');
      return;
    }


    // Resolver tipo real para AJUSTE según sub-tipo seleccionado
    const tipoReal = (formData.tipo === 'AJUSTE' && tipoAjuste === 'PRECIO')
      ? 'AJUSTE_PRECIO'
      : formData.tipo;

    // Parsear valores finales desde los strings para evitar estado intermedio (ej: "0.")
    const costoEntradaFinal = costoStr ? (isNaN(parseFloat(costoStr)) ? undefined : parseFloat(costoStr)) : undefined;
    const precioEntradaFinal = precioStr ? (isNaN(parseFloat(precioStr)) ? undefined : parseFloat(precioStr)) : undefined;
    const costoAjusteFinal = ajusteCostoStr ? (isNaN(parseFloat(ajusteCostoStr)) ? undefined : parseFloat(ajusteCostoStr)) : undefined;
    const precioAjusteFinal = ajustePrecioStr ? (isNaN(parseFloat(ajustePrecioStr)) ? undefined : parseFloat(ajustePrecioStr)) : undefined;

    const payload: MovimientoInventarioDTO =
      formData.tipo === 'ENTRADA'
        ? { ...formData, costoUnitario: costoEntradaFinal, precioVenta: precioEntradaFinal, varianteId: selectedVarianteId ?? undefined, sucursalId }
        : {
            productoId: formData.productoId,
            tipo: tipoReal,
            cantidad: formData.cantidad,
            descripcion: formData.descripcion,
            referencia: formData.referencia,
            usuarioId: formData.usuarioId,
            tenantId: formData.tenantId,
            varianteId: selectedVarianteId ?? undefined,
            costoUnitario: (formData.tipo === 'AJUSTE') ? costoAjusteFinal : undefined,
            precioVenta:   (formData.tipo === 'AJUSTE') ? precioAjusteFinal : undefined,
            sucursalId,
            ajusteLoteMovimientoId: (formData.tipo === 'AJUSTE' && tipoAjuste !== 'PRECIO' && ajusteLoteMovimientoId)
              ? ajusteLoteMovimientoId : undefined,
          };

    try {
      await movimientoService.create(payload);

      // Si es ajuste de precio y hay presentaciones con nuevo precio, actualizarlas también
      if ((tipoAjuste === 'PRECIO' || tipoAjuste === 'AMBOS') && presentacionesProducto.length > 0) {
        const updates = presentacionesProducto
          .filter(p => p.id && preciosPresent[p.id] && parseFloat(preciosPresent[p.id]) > 0)
          .map(p => productoPresentacionService.actualizar(p.id!, {
            productoId: p.productoId,
            unidadMedidaId: p.unidadMedidaId,
            precioVenta: parseFloat(preciosPresent[p.id!]),
            factor: p.factor,
            esPrincipal: p.esPrincipal,
          }));
        if (updates.length > 0) await Promise.all(updates);
      }

      notify.success(`Movimiento de ${formData.tipo} registrado`);
      refreshOnboarding();
      resetForm();
      await fetchData();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error:', (error as { response?: { data?: unknown } })?.response?.data);
      notify.fromError(error, 'No se pudo registrar el movimiento. Revisa los datos e intenta de nuevo.');
    }
  };

  const resetForm = () => {
    setFormData({
      productoId: 0,
      tipo: 'ENTRADA',
      cantidad: 0,
      descripcion: '',
      referencia: '',
      usuarioId: userId || 0,
      tenantId,
      proveedorId: undefined,
      costoUnitario: undefined,
      precioVenta: undefined,
      lote: '',
      fechaVencimiento: undefined,
      registroSanitario: '',
    });
    setSelectedProducto(null);
    setSelectedProveedorMov(null);
    setVariantesProducto([]);
    setPresentacionesProducto([]);
    setPreciosPresent({});
    setSelectedVarianteId(null);
    setLotesDelProducto([]);
    setAjusteLoteMovimientoId(null);
    setCostoStr('');
    setPrecioStr('');
    setAjusteCostoStr('');
    setAjustePrecioStr('');
    setMovStep(1);
    setIsDialogOpen(false);
  };

  const getTipoStyle = (tipo: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string }> = {
      ENTRADA:       { bg: T.okSoft,      color: T.ok },
      SALIDA:        { bg: T.badSoft,     color: T.bad },
      AJUSTE:        { bg: T.primarySoft, color: T.primary },
      AJUSTE_PRECIO: { bg: T.primarySoft, color: T.primary },
      DEVOLUCION:    { bg: T.warnSoft,    color: T.warn },
      SALDO_INICIAL: { bg: '#F3E8FF',     color: '#7C3AED' },
      MERMA:         { bg: '#FEF3C7',     color: '#B45309' },
    };
    const c = map[tipo] ?? { bg: T.surface2, color: T.text3 };
    return { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 20, background: c.bg, fontSize: '.76rem', fontWeight: 600, color: c.color, whiteSpace: 'nowrap' as const };
  };
  const getTipoDot = (tipo: string): React.CSSProperties => {
    const map: Record<string, string> = { ENTRADA: T.ok, SALIDA: T.bad, AJUSTE: T.primary, AJUSTE_PRECIO: T.primary, DEVOLUCION: T.warn, SALDO_INICIAL: '#7C3AED', MERMA: '#B45309' };
    return { width: 6, height: 6, borderRadius: '50%', background: map[tipo] ?? T.text3, flexShrink: 0 };
  };

  const filteredProductos = productosFisicos
    .filter(
      (p) =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigoBarras?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoriaNombre?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) =>
      sortOrder === 'asc'
        ? a.nombre.localeCompare(b.nombre, 'es')
        : b.nombre.localeCompare(a.nombre, 'es')
    );

  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProductos = filteredProductos.slice(startIndex, startIndex + itemsPerPage);

  const invStats = useMemo(() => ({
    total:      productosFisicos.length,
    bajoStock:  productosFisicos.filter((p) => p.stockActual <= p.stockMinimo).length,
    valor:      productosFisicos.reduce((acc, p) => acc + (p.stockActual ?? 0) * (p.costoUnitario ?? 0), 0),
  }), [productosFisicos]);

  const lotesFiltrados = useMemo(() => {
    return lotes.filter((l) => {
      // filtro de estado
      if (lotesFiltro === 'vencidos'   && l.diasRestantes >= 0)  return false;
      if (lotesFiltro === 'proximos30' && (l.diasRestantes < 0 || l.diasRestantes > 30))  return false;
      if (lotesFiltro === 'proximos90' && (l.diasRestantes < 0 || l.diasRestantes > 90))  return false;
      // filtro de texto
      if (lotesSearch) {
        const q = lotesSearch.toLowerCase();
        return (
          l.productoNombre.toLowerCase().includes(q) ||
          (l.lote?.toLowerCase().includes(q) ?? false) ||
          (l.codigoBarras?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [lotes, lotesFiltro, lotesSearch]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${T.primarySoft}`, borderTopColor: T.primary, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  // ── helpers para la tabla
  const stockEfectivo = (p: ProductoDTO) => (esFarmacia && p.stockVigente != null) ? p.stockVigente : (p.stockActual ?? 0);
  const stockColor = (p: ProductoDTO) => stockEfectivo(p) <= (p.stockMinimo ?? 0) ? T.bad : T.ok;
  const stockBarPct = (p: ProductoDTO) => {
    const eff = stockEfectivo(p);
    const max = Math.max(eff, p.stockMinimo ?? 0, 1);
    return Math.min(100, Math.round((eff / max) * 100));
  };

  const OVERLAY: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };
  const CARD: React.CSSProperties = { background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', animation: 'fx-in .2s ease', overflow: 'hidden', display: 'flex', flexDirection: 'column' };
  const MODAL_HDR: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 };
  const MODAL_FTR: React.CSSProperties = { display: 'flex', gap: 9, padding: '14px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 };
  const BTN_SEC: React.CSSProperties = { minWidth: 104, height: 44, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' };
  const BTN_PRI: React.CSSProperties = { flex: 1, height: 44, fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: 'pointer', boxShadow: `0 8px 20px -10px ${T.primary}` };
  const BTN_DANGER: React.CSSProperties = { ...BTN_PRI, background: T.bad, boxShadow: `0 8px 20px -10px ${T.bad}` };
  const LABEL: React.CSSProperties = { display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 };
  const MONO_LABEL: React.CSSProperties = { fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3, marginBottom: 12 };

  // lotes próximos a vencer (badge)
  const lotesBadge = lotes.filter(l => l.diasRestantes !== null && l.diasRestantes <= 30).length;

  return (
    <div style={{ fontFamily: 'Inter,sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-.025em', color: T.text }}>Movimientos de inventario</h1>
          <div style={{ fontSize: '.85rem', color: T.text3, marginTop: 4 }}>Entradas, salidas, ajustes y kardex por producto</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {hasViewPermission && productos.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button type="button"
                onClick={() => setShowExportMenu(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, cursor: 'pointer' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>
                Exportar
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: .7 }}><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {showExportMenu && (
                <>
                  <div onClick={() => setShowExportMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 41, width: 220, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: '0 22px 50px -22px rgba(0,0,0,.45)', padding: 6, animation: 'fx-in .16s ease' }}>
                    <button type="button"
                      onClick={() => { setShowExportMenu(false); try { exportarStockExcel(filteredProductos, (id) => unidadById.get(id)?.nombre ?? '—'); } catch (err) { notify.fromError(err, 'Error al exportar'); } }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.845rem', fontWeight: 500, color: T.text, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: T.ok, flexShrink: 0 }} />
                      Stock en Excel
                    </button>
                    <button type="button"
                      onClick={() => { setShowExportMenu(false); try { exportarStockPDF(filteredProductos, (id) => unidadById.get(id)?.nombre ?? '—', negocioConfig); } catch (err) { notify.fromError(err, 'Error al exportar'); } }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.845rem', fontWeight: 500, color: T.text, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: T.bad, flexShrink: 0 }} />
                      Stock en PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {canCreate('INVENTARIO') && (
            <button type="button" onClick={() => setIsImportOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, cursor: 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>
              Importar
            </button>
          )}
          {canCreate('INVENTARIO') && (
            <button type="button" onClick={() => setIsDialogOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: 'pointer', boxShadow: `0 6px 16px -8px ${T.primary}` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              Nuevo movimiento
            </button>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Productos en inventario', value: String(invStats.total), sub: `${productosFisicos.reduce((a,p) => a + (p.stockActual ?? 0), 0)} unidades totales`, valColor: T.text },
          { label: 'Requieren reabastecimiento', value: String(invStats.bajoStock), sub: invStats.bajoStock > 0 ? 'Stock igual o menor al mínimo' : 'Todo en orden', valColor: invStats.bajoStock > 0 ? T.bad : T.ok },
          { label: 'Valorizado al costo', value: `S/ ${invStats.valor.toFixed(2)}`, sub: 'Stock actual × costo unitario', valColor: T.text },
        ].map((k) => (
          <div key={k.label} style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
            <div style={{ ...MONO_LABEL, marginBottom: 0 }}>{k.label}</div>
            <div style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 9, fontVariantNumeric: 'tabular-nums', color: k.valColor }}>{k.value}</div>
            <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main card ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>

        {/* Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '12px 18px 0', borderBottom: `1px solid ${T.lineSoft}` }}>
          {([
            { key: 'stock' as const, label: 'Stock', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>, badge: 0, visible: true },
            { key: 'lotes' as const, label: 'Lotes y vencimientos', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 1-2-2V9m6 5h10a2 2 0 0 0 2-2V9m0 0H3"/></svg>, badge: lotesBadge, visible: !esRopa && !esServicios },
          ] as const).filter(t => t.visible).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: active ? 650 : 500, color: active ? T.primary : T.text3, background: 'transparent', border: 0, borderBottom: `2px solid ${active ? T.primary : 'transparent'}`, borderRadius: 0, cursor: 'pointer', marginBottom: -1, transition: 'color .14s' }}>
                {tab.icon}
                {tab.label}
                {tab.badge > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 5px', display: 'grid', placeItems: 'center', borderRadius: 20, fontSize: '.68rem', fontWeight: 700, color: '#fff', background: T.bad }}>{tab.badge}</span>}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}` }}>
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input
              type="text" value={activeTab === 'stock' ? searchTerm : lotesSearch}
              onChange={e => activeTab === 'stock' ? setSearchTerm(e.target.value) : (setLotesSearch(e.target.value), setLotesPage(1))}
              placeholder={activeTab === 'stock' ? 'Buscar producto por nombre, código o categoría...' : 'Buscar producto o lote...'}
              style={{ width: '100%', height: 40, padding: '0 13px 0 38px', fontFamily: 'Inter,sans-serif', fontSize: '.875rem', color: T.text, background: T.surface2, border: '1px solid transparent', borderRadius: 10, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
              onBlur={e => { e.currentTarget.style.background = T.surface2; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          {activeTab === 'lotes' && (
            <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, flexShrink: 0 }}>
              {([
                { key: 'todos' as const, label: 'Todos', dot: T.text3 },
                { key: 'vencidos' as const, label: 'Vencidos', dot: T.bad },
                { key: 'proximos30' as const, label: 'Próx. 30d', dot: T.warn },
                { key: 'proximos90' as const, label: 'Próx. 90d', dot: '#D97706' },
              ]).map(f => {
                const active = lotesFiltro === f.key;
                return (
                  <button key={f.key} type="button" onClick={() => { setLotesFiltro(f.key); setLotesPage(1); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.8rem', fontWeight: active ? 600 : 500, color: active ? T.text : T.text3, background: active ? T.surface : 'transparent', border: 0, borderRadius: 8, cursor: 'pointer', boxShadow: active ? T.shadow : 'none', transition: 'all .12s' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.dot }} />
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}
          {activeTab === 'stock' && (
            <button type="button" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.8rem', fontWeight: 500, color: T.text2, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 10, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
              {sortOrder === 'asc' ? 'A→Z' : 'Z→A'}
            </button>
          )}
        </div>

        {/* ── Tab Stock ── */}
        {activeTab === 'stock' && (
          hasViewPermission ? (
            filteredProductos.length === 0 ? (
              <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14, color: T.text }}>Sin resultados</div>
                <p style={{ fontSize: '.865rem', color: T.text3, lineHeight: 1.55, margin: '7px auto 0', maxWidth: 380 }}>Revisa el nombre, código o categoría, o quita los filtros.</p>
                <button type="button" onClick={() => setSearchTerm('')}
                  style={{ height: 38, marginTop: 16, padding: '0 16px', fontFamily: 'Inter,sans-serif', fontSize: '.855rem', fontWeight: 600, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer' }}>
                  Quitar filtros
                </button>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem', minWidth: 820 }}>
                    <thead>
                      <tr style={{ background: T.surface3 }}>
                        {['Producto','Categoría','Unidad','Stock actual','Costo unit.','Precio venta','Kardex'].map((h, i) => (
                          <th key={h} style={{ textAlign: i >= 3 ? 'right' : 'left', padding: i === 0 ? '10px 18px' : i === 6 ? '10px 18px 10px 14px' : '10px 14px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentProductos.map(p => (
                        <tr key={p.id} onClick={() => openKardex(p)} style={{ borderTop: `1px solid ${T.lineSoft}`, cursor: 'pointer', transition: 'background .14s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = T.surface3)}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}>
                          <td style={{ padding: '11px 18px', maxWidth: 300 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <span style={avatarStyle(p.nombre)}>{iniciales(p.nombre)}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: T.text }}>{p.nombre}</div>
                                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', color: T.text3, marginTop: 2 }}>{p.codigoBarras || 'Sin código'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '.78rem', fontWeight: 600, color: T.text2, background: T.surface2, padding: '3px 10px 3px 8px', borderRadius: 20 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.primary, flexShrink: 0 }} />
                              {p.categoriaNombre || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', color: T.text2 }}>{unidadById.get(p.unidadMedidaId)?.nombre || '—'}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 700, color: stockColor(p), fontVariantNumeric: 'tabular-nums' }}>{stockEfectivo(p)}</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7, marginTop: 5 }}>
                              <span style={{ fontSize: '.72rem', color: T.text3 }}>mín {p.stockMinimo ?? 0}</span>
                              <span style={{ width: 44, height: 4, borderRadius: 4, background: T.surface2, overflow: 'hidden', display: 'block' }}>
                                <span style={{ display: 'block', height: '100%', width: `${stockBarPct(p)}%`, background: stockColor(p), borderRadius: 4 }} />
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap', color: T.text2, fontVariantNumeric: 'tabular-nums' }}>S/ {p.costoUnitario.toFixed(2)}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: T.text }}>S/ {p.precioVenta.toFixed(2)}</td>
                          <td style={{ padding: '11px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button type="button" onClick={e => { e.stopPropagation(); openKardex(p); }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px', fontFamily: 'Inter,sans-serif', fontSize: '.78rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, cursor: 'pointer' }}
                              onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = T.primary; b.style.color = T.primary; b.style.background = T.primarySoft; }}
                              onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = T.line; b.style.color = T.text2; b.style.background = T.surface; }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/></svg>
                              Ver kardex
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 18px', borderTop: `1px solid ${T.lineSoft}` }}>
                    <span style={{ fontSize: '.8rem', color: T.text3 }}>{filteredProductos.length} productos · página {currentPage} de {totalPages}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                        style={{ height: 32, padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.8rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}>Anterior</button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pg = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                        if (pg < 1 || pg > totalPages) return null;
                        const active = pg === currentPage;
                        return (
                          <button key={pg} type="button" onClick={() => setCurrentPage(pg)}
                            style={{ width: 32, height: 32, fontFamily: 'Inter,sans-serif', fontSize: '.8rem', fontWeight: active ? 700 : 500, color: active ? '#fff' : T.text2, background: active ? T.primary : T.surface, border: `1px solid ${active ? T.primary : T.line}`, borderRadius: 8, cursor: 'pointer' }}>{pg}</button>
                        );
                      })}
                      <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                        style={{ height: 32, padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.8rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}>Siguiente</button>
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 650, color: T.text }}>Sin acceso al listado</div>
              <p style={{ fontSize: '.865rem', color: T.text3, marginTop: 6 }}>No tienes permisos para ver el listado. Puedes registrar movimientos con el botón de arriba.</p>
            </div>
          )
        )}

        {/* ── Tab Lotes ── */}
        {activeTab === 'lotes' && (
          lotesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div style={{ width: 24, height: 24, border: `3px solid ${T.primarySoft}`, borderTopColor: T.primary, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : lotesFiltrados.length === 0 ? (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: 14, background: T.surface2, color: T.text3 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 1-2-2V9m6 5h10a2 2 0 0 0 2-2V9m0 0H3"/></svg>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 650, marginTop: 14, color: T.text }}>Sin lotes</div>
              <p style={{ fontSize: '.865rem', color: T.text3, marginTop: 6, maxWidth: 380, margin: '6px auto 0' }}>{lotesFiltro === 'todos' ? 'No hay movimientos de entrada con fecha de vencimiento registrada.' : 'No hay lotes que coincidan con el filtro.'}</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem', minWidth: 1050 }}>
                  <thead>
                    <tr style={{ background: T.surface3 }}>
                      {['Producto','Lote','Vencimiento',esFarmacia ? 'Reg. sanitario' : null,'Proveedor','Recibido','Stock lote','Estado','Acciones'].filter(Boolean).map((h, i) => (
                        <th key={h!} style={{ textAlign: i >= 5 ? 'right' : 'left', padding: i === 0 ? '10px 18px' : i === 8 ? '10px 18px 10px 14px' : '10px 14px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lotesFiltrados.slice((lotesPage - 1) * LOTES_PER_PAGE, lotesPage * LOTES_PER_PAGE).map(l => {
                      const vencido = l.diasRestantes < 0;
                      const critico = !vencido && l.diasRestantes <= 7;
                      const proximo = !vencido && l.diasRestantes <= 90;
                      const estadoColor = vencido ? T.bad : critico ? T.bad : proximo ? T.warn : T.ok;
                      const estadoBg = vencido ? T.badSoft : critico ? T.badSoft : proximo ? T.warnSoft : T.okSoft;
                      const estadoLabel = vencido ? 'Vencido' : critico ? 'Crítico' : proximo ? `${l.diasRestantes}d` : 'Vigente';
                      const rowBg = vencido ? `${T.bad}08` : critico ? `${T.warn}08` : '';
                      return (
                        <tr key={l.movimientoId} style={{ borderTop: `1px solid ${T.lineSoft}`, background: rowBg }}
                          onMouseEnter={e => (e.currentTarget.style.background = T.surface3)}
                          onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>
                          <td style={{ padding: '11px 18px', maxWidth: 240 }}>
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: T.text }}>{l.productoNombre}</div>
                            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', color: T.text3, marginTop: 2 }}>{l.codigoBarras || ''}</div>
                          </td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-block', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.8rem', fontWeight: 600, padding: '2px 8px', background: T.surface2, borderRadius: 6, color: T.text2 }}>{l.lote || '—'}</span>
                          </td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.82rem', fontWeight: 600, color: T.text }}>{l.fechaVencimiento ? new Date(l.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                            <div style={{ fontSize: '.72rem', color: estadoColor, marginTop: 2 }}>{vencido ? `Venció hace ${Math.abs(l.diasRestantes)}d` : `${l.diasRestantes}d restantes`}</div>
                          </td>
                          {esFarmacia && <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.78rem', color: T.text2 }}>{l.registroSanitario || '—'}</td>}
                          <td style={{ padding: '11px 14px', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: T.text2 }}>{l.proveedorNombre || '—'}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap', color: T.text3, fontVariantNumeric: 'tabular-nums' }}>{l.cantidad ?? '—'}</td>
                          <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: T.text }}>{l.stockActual ?? 0}</td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: estadoBg, fontSize: '.76rem', fontWeight: 600, color: estadoColor }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: estadoColor }} />
                              {estadoLabel}
                            </span>
                          </td>
                          <td style={{ padding: '11px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: 3 }}>
                              <button type="button" title="Editar datos del lote"
                                onClick={() => { setLoteEditando(l); setEditProveedorId(l.proveedorId ?? ''); setEditPrecioVenta(l.precioVenta != null ? String(l.precioVenta) : ''); setEditLoteNumero(l.lote || ''); setEditFechaVencimiento(l.fechaVencimiento ? String(l.fechaVencimiento) : ''); }}
                                style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                onMouseEnter={e => { e.currentTarget.style.background = T.primarySoft; e.currentTarget.style.color = T.primary; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                              </button>
                              {vencido && (l.stockActual ?? 0) > 0 && (
                                <button type="button" title="Dar de baja lote"
                                  onClick={() => { setLoteMerma(l); setMermaCantidad(String(l.stockActual ?? 1)); setMermaMotivo('VENCIMIENTO'); setMermaObservaciones(''); }}
                                  style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = T.badSoft; e.currentTarget.style.color = T.bad; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text3; }}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderTop: `1px solid ${T.lineSoft}`, fontSize: '.78rem', color: T.text3 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/></svg>
                Los lotes se ordenan del más próximo a vencer al más lejano.
                {lotesFiltrados.length > LOTES_PER_PAGE && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                    <button type="button" disabled={lotesPage === 1} onClick={() => setLotesPage(p => p - 1)}
                      style={{ height: 28, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.78rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 7, cursor: lotesPage === 1 ? 'not-allowed' : 'pointer', opacity: lotesPage === 1 ? 0.4 : 1 }}>←</button>
                    <button type="button" disabled={lotesPage >= Math.ceil(lotesFiltrados.length / LOTES_PER_PAGE)} onClick={() => setLotesPage(p => p + 1)}
                      style={{ height: 28, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.78rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 7, cursor: lotesPage >= Math.ceil(lotesFiltrados.length / LOTES_PER_PAGE) ? 'not-allowed' : 'pointer', opacity: lotesPage >= Math.ceil(lotesFiltrados.length / LOTES_PER_PAGE) ? 0.4 : 1 }}>→</button>
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>

      {/* ══ MODAL: Nuevo Movimiento ══ */}
      {isDialogOpen && createPortal(
        <div style={OVERLAY} onClick={resetForm}>
          <div style={{ ...CARD, width: '100%', maxWidth: 640, maxHeight: 'calc(100vh - 40px)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={MODAL_HDR}>
              <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: T.primarySoft, color: T.primary }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', color: T.text }}>Nuevo movimiento</h2>
                <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>{formData.tipo === 'ENTRADA' ? 'Registrar compra / entrada de stock' : formData.tipo === 'SALIDA' ? 'Registrar salida de stock' : formData.tipo === 'AJUSTE' ? 'Ajustar inventario' : formData.tipo === 'DEVOLUCION' ? 'Registrar devolución de cliente' : formData.tipo === 'MERMA' ? 'Registrar baja por merma, pérdida o daño' : 'Selecciona el tipo'}</div>
              </div>
              <button type="button" onClick={resetForm} aria-label="Cerrar"
                style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', gap: 6, padding: '14px 22px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              {(['Tipo', 'Producto', 'Detalles'] as const).map((label, i) => {
                const n = i + 1;
                const done = movStep > n;
                const active = movStep === n;
                return (
                  <div key={label} style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ height: 3, borderRadius: 4, background: done || active ? T.primary : T.lineSoft, transition: 'background .2s' }} />
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.65rem', fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: done || active ? T.primary : T.text3, marginTop: 5 }}>{n} · {label}</div>
                  </div>
                );
              })}
            </div>

            {/* Body */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 22px 22px' }}>

              {/* ── Paso 1: Tipo ── */}
              {movStep === 1 && (
                <>
                  <div style={MONO_LABEL}>¿Qué tipo de movimiento?</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                    {([
                      { key: 'ENTRADA',   label: 'Entrada',    desc: 'Compra o ingreso de mercadería',              iconPath: 'M12 5v14M19 12l-7 7-7-7',                                                                   color: T.ok,      colorSoft: T.okSoft },
                      { key: 'SALIDA',    label: 'Salida',     desc: 'Consumo interno o traslado',                   iconPath: 'M12 19V5M5 12l7-7 7 7',                                                                     color: T.bad,     colorSoft: T.badSoft },
                      { key: 'AJUSTE',    label: 'Ajuste',     desc: 'Corregir stock tras conteo o cambiar precios', iconPath: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4',                   color: T.primary, colorSoft: T.primarySoft },
                      { key: 'DEVOLUCION',label: 'Devolución', desc: 'Producto devuelto por un cliente',             iconPath: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',                                             color: T.warn,    colorSoft: T.warnSoft },
                      ...(!esFarmacia ? [{
                        key: 'MERMA' as const, label: 'Merma', desc: 'Baja por daño, pérdida o vencimiento',
                        iconPath: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
                        color: '#B45309', colorSoft: '#FEF3C7',
                      }] : []),
                    ] as const).map((t) => {
                      const active = formData.tipo === t.key;
                      return (
                        <button key={t.key} type="button"
                          onClick={() => {
                            setTipoAjuste('STOCK');
                            setFormData(prev => ({
                              ...prev,
                              tipo: t.key as MovimientoInventarioDTO['tipo'],
                              ...(t.key !== 'ENTRADA' && { proveedorId: undefined, costoUnitario: undefined, lote: '', fechaVencimiento: undefined, registroSanitario: '' }),
                            }));
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', fontFamily: 'Inter,sans-serif', textAlign: 'left', background: active ? t.colorSoft : T.surface, border: `1.5px solid ${active ? t.color : T.line}`, borderRadius: 12, cursor: 'pointer', transition: 'all .14s' }}>
                          <span style={{ width: 36, height: 36, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 10, background: t.colorSoft, color: t.color }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.iconPath} /></svg>
                          </span>
                          <span style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ display: 'block', fontSize: '.92rem', fontWeight: 650, color: T.text }}>{t.label}</span>
                            <span style={{ display: 'block', fontSize: '.76rem', lineHeight: 1.4, color: T.text3, marginTop: 3 }}>{t.desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Paso 2: Producto + Cantidad ── */}
              {movStep === 2 && (
                <>
                  <div style={{ ...MONO_LABEL, marginBottom: 12 }}>Producto *</div>
                  <Autocomplete
                    options={productosOptions}
                    value={selectedProducto}
                    onChange={async (option) => {
                      setVariantesProducto([]); setSelectedVarianteId(null); setLotesDelProducto([]); setAjusteLoteMovimientoId(null);
                      if (option) {
                        const producto = productosForm.find(p => p.id === option.id);
                        if (producto) {
                          setSelectedProducto(option);
                          const costo = producto.costoUnitario != null ? Number(producto.costoUnitario) : undefined;
                          const precio = producto.precioVenta != null ? Number(producto.precioVenta) : undefined;
                          setCostoStr(costo != null ? String(costo) : '');
                          setPrecioStr(precio != null ? String(precio) : '');
                          setAjusteCostoStr(costo != null ? String(costo) : '');
                          setAjustePrecioStr(precio != null ? String(precio) : '');
                          const regSan = producto.registroSanitario ?? '';
                          setFormData(prev => ({ ...prev, productoId: producto.id!, costoUnitario: costo, precioVenta: precio, ...(esFarmacia && prev.tipo === 'ENTRADA' && regSan ? { registroSanitario: regSan } : {}) }));
                          if (esRopa) { setLoadingVariantes(true); try { const vs = await productoVarianteService.getByProducto(producto.id!, sucursalId); setVariantesProducto(vs.filter(v => v.activo !== false)); } catch { /* silent */ } finally { setLoadingVariantes(false); } }
                          if (esFarmacia) { productoPresentacionService.listar(producto.id!).then(pres => { setPresentacionesProducto(pres); const init: Record<number, string> = {}; pres.forEach(p => { if (p.id) init[p.id] = String(p.precioVenta ?? ''); }); setPreciosPresent(init); }).catch(() => setPresentacionesProducto([])); }
                          if (esFarmacia && producto.stockVigente != null) { setLoadingLotesProducto(true); try { const ld = await movimientoService.getLotesPorProducto(producto.id!); setLotesDelProducto(ld.filter(l => l.diasRestantes != null)); } catch { /* silent */ } finally { setLoadingLotesProducto(false); } }
                        }
                      } else {
                        setSelectedProducto(null);
                        setCostoStr(''); setPrecioStr('');
                        setAjusteCostoStr(''); setAjustePrecioStr('');
                        setFormData(prev => ({ ...prev, productoId: 0, costoUnitario: undefined, precioVenta: undefined }));
                      }
                    }}
                    placeholder="Buscar producto por nombre o código..."
                    emptyMessage="No se encontró el producto"
                  />

                  {/* Variantes (ropa) */}
                  {esRopa && (loadingVariantes || variantesProducto.length > 0) && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ ...MONO_LABEL }}>Variante (talla / color) *</div>
                      {loadingVariantes ? <div style={{ fontSize: '.8rem', color: T.text3 }}>Cargando variantes...</div> : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                          {variantesProducto.map(v => {
                            const desc = [v.talla, v.color].filter(Boolean).join(' / ') || v.sku || `#${v.id}`;
                            const active = selectedVarianteId === v.id;
                            return (
                              <button key={v.id} type="button" onClick={() => setSelectedVarianteId(active ? null : v.id!)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', fontFamily: 'Inter,sans-serif', background: active ? T.primarySoft : T.surface, border: `1px solid ${active ? T.primary : T.line}`, borderRadius: 10, cursor: 'pointer' }}>
                                <span style={{ fontSize: '.86rem', fontWeight: 600, color: T.text }}>{desc}</span>
                                <span style={{ fontSize: '.78rem', fontWeight: 700, color: (v.stockActual ?? 0) <= (v.stockMinimo ?? 0) ? T.bad : T.ok }}>Stock: {v.stockActual}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tipo ajuste */}
                  {formData.tipo === 'AJUSTE' && (
                    <div style={{ marginTop: 20 }}>
                      <div style={MONO_LABEL}>Tipo de ajuste</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 4, padding: 4, background: T.surface2, borderRadius: 11 }}>
                        {([
                          { key: 'STOCK' as const, label: 'Stock', desc: 'Ajusta la cantidad' },
                          { key: 'PRECIO' as const, label: 'Precios', desc: 'Actualiza costos y precios' },
                          { key: 'AMBOS' as const, label: 'Ambos', desc: 'Stock y precios' },
                        ]).map(opt => {
                          const active = tipoAjuste === opt.key;
                          return (
                            <button key={opt.key} type="button"
                              onClick={() => {
                                setTipoAjuste(opt.key);
                                const prod = productosForm.find(p => p.id === formData.productoId);
                                setFormData(prev => {
                                  const keepPrices = opt.key !== 'STOCK';
                                  return {
                                    ...prev,
                                    ...(opt.key === 'PRECIO' && { cantidad: 0 }),
                                    costoUnitario: keepPrices ? (prev.costoUnitario ?? (prod?.costoUnitario != null ? Number(prod.costoUnitario) : undefined)) : undefined,
                                    precioVenta: keepPrices ? (prev.precioVenta ?? (prod?.precioVenta != null ? Number(prod.precioVenta) : undefined)) : undefined,
                                  };
                                });
                              }}
                              style={{ padding: '8px 6px', fontFamily: 'Inter,sans-serif', textAlign: 'center', background: active ? T.surface : 'transparent', border: 0, borderRadius: 8, cursor: 'pointer', boxShadow: active ? T.shadow : 'none', transition: 'all .12s' }}>
                              <span style={{ display: 'block', fontSize: '.86rem', fontWeight: 650, color: T.text }}>{opt.label}</span>
                              <span style={{ display: 'block', fontSize: '.72rem', color: T.text3, marginTop: 2 }}>{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                      {/* Selector de lote para ajuste farmacia */}
                      {esFarmacia && tipoAjuste !== 'PRECIO' && (loadingLotesProducto || lotesDelProducto.length > 0) && (
                        <div style={{ marginTop: 14 }}>
                          <label style={LABEL}>Lote a ajustar <span style={{ color: T.text3, fontWeight: 400 }}>(opcional)</span></label>
                          {loadingLotesProducto ? <div style={{ fontSize: '.8rem', color: T.text3 }}>Cargando lotes...</div> : (
                            <FxSelect value={ajusteLoteMovimientoId ?? ''} onChange={e => {
                              const id = e.target.value ? Number(e.target.value) : null;
                              setAjusteLoteMovimientoId(id);
                              if (id) { const lote = lotesDelProducto.find(l => l.movimientoId === id); if (lote) setFormData(prev => ({ ...prev, cantidad: lote.stockActual ?? 0 })); }
                            }}>
                              <option value="">— Sin lote (ajuste de total) —</option>
                              {lotesDelProducto.map(l => (
                                <option key={l.movimientoId} value={l.movimientoId}>{l.lote ?? 'Sin código'} | Vence: {l.fechaVencimiento}{l.diasRestantes < 0 ? ' ⚠️ VENCIDO' : ` (${l.diasRestantes}d)`} | Stock: {l.stockActual ?? 0}</option>
                              ))}
                            </FxSelect>
                          )}
                          {!ajusteLoteMovimientoId && (
                            <div style={{ fontSize: '.75rem', color: T.text3, marginTop: 5 }}>
                              Sin lote: actualiza solo el stock total (útil para sincronizar tras conteo físico). Con lote: corrige la cantidad de un lote específico.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cantidad */}
                  {(formData.tipo !== 'AJUSTE' || tipoAjuste === 'STOCK' || tipoAjuste === 'AMBOS') && (
                    <div style={{ marginTop: 20 }}>
                      <div style={MONO_LABEL}>{formData.tipo === 'AJUSTE' && ajusteLoteMovimientoId ? 'Nueva cantidad del lote' : 'Cantidad *'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${T.line}`, borderRadius: 12, overflow: 'hidden' }}>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, cantidad: Math.max(0, (prev.cantidad || 0) - 1) }))}
                            style={{ width: 48, height: 52, display: 'grid', placeItems: 'center', color: T.text2, background: T.surface2, border: 0, cursor: 'pointer', fontSize: '1.2rem', fontWeight: 500 }}>−</button>
                          <input type="text" inputMode="numeric" value={formData.cantidad === 0 ? '' : formData.cantidad} placeholder="0"
                            onChange={e => setFormData(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 0 }))}
                            style={{ width: 92, height: 52, textAlign: 'center', fontFamily: 'Inter,sans-serif', fontSize: '1.4rem', fontWeight: 700, color: T.text, background: T.surface, border: 0, outline: 'none', fontVariantNumeric: 'tabular-nums' }} />
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, cantidad: (prev.cantidad || 0) + 1 }))}
                            style={{ width: 48, height: 52, display: 'grid', placeItems: 'center', color: T.text2, background: T.surface2, border: 0, cursor: 'pointer', fontSize: '1.2rem', fontWeight: 500 }}>+</button>
                        </div>
                        {selectedProducto && formData.tipo === 'ENTRADA' && formData.cantidad > 0 && (() => {
                          const prod = productosForm.find(p => p.id === selectedProducto.id);
                          const cur = prod ? (stockEnSucursal.get(prod.id!) ?? prod.stockActual ?? 0) : 0;
                          return <span style={{ fontSize: '.9rem', fontWeight: 600, color: T.ok }}>→ {cur + formData.cantidad} en stock</span>;
                        })()}
                        {selectedProducto && (formData.tipo === 'SALIDA' || formData.tipo === 'MERMA') && (() => {
                          const prod = productos.find(p => p.id === selectedProducto.id) ?? productosForm.find(p => p.id === selectedProducto.id);
                          const disp = esFarmacia && (prod?.stockVigente != null)
                            ? prod.stockVigente
                            : (stockEnSucursal.get(selectedProducto.id as number) ?? prod?.stockActual ?? 0);
                          const after = disp - formData.cantidad;
                          const insuf = formData.cantidad > 0 && after < 0;
                          return <span style={{ fontSize: '.86rem', fontWeight: 600, color: insuf ? T.bad : T.text2 }}>
                            Disponible: {disp}{formData.cantidad > 0 ? ` → ${insuf ? '⚠ insuficiente' : after}` : ''}
                          </span>;
                        })()}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Paso 3: Detalles ── */}
              {movStep === 3 && (
                <>
                  {/* Resumen del producto seleccionado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', marginBottom: 20, borderRadius: 12, background: T.surface2, fontSize: '.82rem' }}>
                    <span style={{ width: 28, height: 28, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 8, background: T.primarySoft, color: T.primary }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: T.text }}>{selectedProducto?.label ?? '—'}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, color: T.text2, whiteSpace: 'nowrap' }}>{formData.cantidad > 0 ? `×${formData.cantidad}` : ''}</span>
                  </div>

                  {/* ENTRADA: costo, precio, lote/venc */}
                  {formData.tipo === 'ENTRADA' && (
                    <>
                      <div style={MONO_LABEL}>Costos</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14, marginBottom: 16 }}>
                        <div>
                          <label style={LABEL}>Costo unitario (compra)</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '.88rem', fontWeight: 650, color: T.text3, pointerEvents: 'none' }}>S/</span>
                            <FxInput type="text" inputMode="decimal" value={costoStr} placeholder="0.00" style={{ paddingLeft: 36 }}
                              onChange={e => {
                                const v = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                                setCostoStr(v);
                                const n = parseFloat(v);
                                setFormData(prev => ({ ...prev, costoUnitario: isNaN(n) ? undefined : n }));
                              }} />
                          </div>
                        </div>
                        <div>
                          <label style={LABEL}>Precio de venta</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '.88rem', fontWeight: 650, color: T.text3, pointerEvents: 'none' }}>S/</span>
                            <FxInput type="text" inputMode="decimal" value={precioStr} placeholder="0.00" style={{ paddingLeft: 36 }}
                              onChange={e => {
                                const v = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                                setPrecioStr(v);
                                const n = parseFloat(v);
                                setFormData(prev => ({ ...prev, precioVenta: isNaN(n) ? undefined : n }));
                              }} />
                          </div>
                        </div>
                      </div>
                      {/* Trazabilidad farmacia */}
                      {esFarmacia && (
                        <div style={{ padding: '15px 16px', borderRadius: 12, background: T.warnSoft, border: `1px solid ${T.warnLine}`, marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: T.warn }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/></svg>
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.warn }}>Trazabilidad DIGEMID</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14, marginBottom: 12 }}>
                            <div>
                              <label style={LABEL}>Lote *</label>
                              <FxInput type="text" value={formData.lote ?? ''} placeholder="LOT-2026-001" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.86rem' }}
                                onChange={e => setFormData(prev => ({ ...prev, lote: e.target.value }))} />
                            </div>
                            <div>
                              <label style={LABEL}>Fecha de vencimiento *</label>
                              <FxInput type="date" value={formData.fechaVencimiento ?? ''}
                                onChange={e => setFormData(prev => ({ ...prev, fechaVencimiento: e.target.value || undefined }))} />
                            </div>
                          </div>
                          <div>
                            <label style={LABEL}>Registro sanitario *</label>
                            <FxInput type="text" value={formData.registroSanitario ?? ''} placeholder="D.G.S.P. N° 23456-2024" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.86rem' }}
                              onChange={e => setFormData(prev => ({ ...prev, registroSanitario: e.target.value }))} />
                          </div>
                        </div>
                      )}
                      {/* Lote opcional (no farmacia, no ropa) */}
                      {!esFarmacia && !esRopa && !esServicios && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14, marginBottom: 14 }}>
                          <div>
                            <label style={LABEL}>Lote <span style={{ fontWeight: 400, color: T.text3 }}>(opcional)</span></label>
                            <FxInput type="text" value={formData.lote ?? ''} placeholder="LOT-2026-001" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.86rem' }}
                              onChange={e => setFormData(prev => ({ ...prev, lote: e.target.value }))} />
                          </div>
                          <div>
                            <label style={LABEL}>Fecha de vencimiento <span style={{ fontWeight: 400, color: T.text3 }}>(opcional)</span></label>
                            <FxInput type="date" value={formData.fechaVencimiento ?? ''}
                              onChange={e => setFormData(prev => ({ ...prev, fechaVencimiento: e.target.value || undefined }))} />
                          </div>
                        </div>
                      )}
                      <div style={MONO_LABEL}>Origen</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
                        <div>
                          <label style={LABEL}>Proveedor <span style={{ fontWeight: 400, color: T.text3 }}>(opcional)</span></label>
                          <Autocomplete
                            options={proveedores.filter(p => p.activo !== false).map(p => ({ id: p.id!, label: p.nombre, subtitle: p.ruc ? `RUC: ${p.ruc}` : undefined }))}
                            value={(() => { const p = proveedores.find(p => p.id === formData.proveedorId); return p ? { id: p.id!, label: p.nombre } : null; })()}
                            onChange={option => setFormData(prev => ({ ...prev, proveedorId: option?.id ? Number(option.id) : undefined }))}
                            placeholder="Seleccionar proveedor"
                            emptyMessage="No se encontró"
                          />
                        </div>
                        <div>
                          <label style={LABEL}>N° pedido / referencia <span style={{ fontWeight: 400, color: T.text3 }}>(opcional)</span></label>
                          <FxInput type="text" value={formData.referencia} placeholder="PED-2026-001" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.86rem' }}
                            onChange={e => setFormData(prev => ({ ...prev, referencia: e.target.value }))} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* AJUSTE: precios */}
                  {formData.tipo === 'AJUSTE' && (tipoAjuste === 'PRECIO' || tipoAjuste === 'AMBOS') && (
                    <>
                      <div style={MONO_LABEL}>Nuevos precios</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14, marginBottom: 14 }}>
                        <div>
                          <label style={LABEL}>Nuevo costo unitario</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '.88rem', fontWeight: 650, color: T.text3, pointerEvents: 'none' }}>S/</span>
                            <FxInput type="text" inputMode="decimal" value={ajusteCostoStr} placeholder="0.00" style={{ paddingLeft: 36 }}
                              onChange={e => {
                                const v = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                                setAjusteCostoStr(v);
                                const n = parseFloat(v);
                                setFormData(prev => ({ ...prev, costoUnitario: isNaN(n) ? undefined : n }));
                              }} />
                          </div>
                        </div>
                        <div>
                          <label style={LABEL}>Nuevo precio de venta</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '.88rem', fontWeight: 650, color: T.text3, pointerEvents: 'none' }}>S/</span>
                            <FxInput type="text" inputMode="decimal" value={ajustePrecioStr} placeholder="0.00" style={{ paddingLeft: 36 }}
                              onChange={e => {
                                const v = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                                setAjustePrecioStr(v);
                                const n = parseFloat(v);
                                setFormData(prev => ({ ...prev, precioVenta: isNaN(n) ? undefined : n }));
                              }} />
                          </div>
                        </div>
                      </div>
                      {presentacionesProducto.length > 0 && (
                        <div style={{ padding: 14, borderRadius: 12, background: T.surface3, border: `1px solid ${T.line}`, marginBottom: 14 }}>
                          <div style={{ fontSize: '.78rem', fontWeight: 650, color: T.text2, marginBottom: 10 }}>Precio por presentación adicional</div>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {presentacionesProducto.map(pres => (
                              <div key={pres.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 150px', gap: 10, alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontSize: '.84rem', fontWeight: 600, color: T.text }}>{pres.unidadMedidaNombre || pres.unidadMedidaAbreviatura}</div>
                                  <div style={{ fontSize: '.72rem', color: T.text3, marginTop: 1 }}>Actual S/ {pres.precioVenta?.toFixed(2)} · factor {pres.factor}</div>
                                </div>
                                <div style={{ position: 'relative' }}>
                                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: '.8rem', fontWeight: 650, color: T.text3, pointerEvents: 'none' }}>S/</span>
                                  <FxInput type="text" inputMode="decimal" value={preciosPresent[pres.id!] ?? ''} placeholder={String(pres.precioVenta ?? '0.00')} style={{ paddingLeft: 32, height: 38, fontSize: '.84rem', fontWeight: 600 }}
                                    onChange={e => setPreciosPresent(prev => ({ ...prev, [pres.id!]: e.target.value }))} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Referencia / Descripción (todos los tipos) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
                    <div>
                      <label style={LABEL}>Referencia <span style={{ fontWeight: 400, color: T.text3 }}>(opcional)</span></label>
                      <FxInput type="text" value={formData.referencia} placeholder="Documento / nota" onChange={e => setFormData(prev => ({ ...prev, referencia: e.target.value }))} />
                    </div>
                    <div>
                      <label style={LABEL}>Descripción <span style={{ fontWeight: 400, color: T.text3 }}>(opcional)</span></label>
                      <FxInput type="text" value={formData.descripcion} placeholder="Motivo o detalles" onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))} />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={MODAL_FTR}>
              {movStep === 1 ? (
                <button type="button" onClick={resetForm} style={BTN_SEC}>Cancelar</button>
              ) : (
                <button type="button" onClick={() => setMovStep(s => (s - 1) as 1 | 2 | 3)} style={{ ...BTN_SEC, gap: 6 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg>
                  Atrás
                </button>
              )}
              {movStep < 3 ? (
                <button type="button" style={BTN_PRI}
                  onClick={() => {
                    if (movStep === 1) { setMovStep(2); return; }
                    if (formData.productoId === 0) { notify.error('Selecciona un producto'); return; }
                    if (esRopa && variantesProducto.length > 0 && !selectedVarianteId) { notify.error('Selecciona una variante'); return; }
                    if (formData.tipo !== 'AJUSTE' && formData.cantidad <= 0) { notify.error('La cantidad debe ser mayor a 0'); return; }

                    setMovStep(3);
                  }}>
                  Siguiente →
                </button>
              ) : (
                <button type="button" style={BTN_PRI} onClick={(e) => void handleSubmit(e as unknown as React.FormEvent)}>
                  Registrar movimiento
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ MODAL: Kardex ══ */}
      {isKardexOpen && createPortal(
        <div style={OVERLAY} onClick={closeKardex}>
          <div style={{ ...CARD, width: '100%', maxWidth: 1040, maxHeight: 'calc(100vh - 40px)' }} onClick={e => e.stopPropagation()}>
            <div style={MODAL_HDR}>
              {kardexProducto && <span style={avatarStyle(kardexProducto.nombre)}>{iniciales(kardexProducto.nombre)}</span>}
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', color: T.text }}>{kardexProducto?.nombre ?? 'Kardex'}</h2>
                <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>Kardex · {kardexProducto?.codigoBarras || 'Sin código'} · Stock: {(esFarmacia && kardexProducto?.stockVigente != null) ? kardexProducto.stockVigente : (kardexProducto?.stockActual ?? 0)}</div>
              </div>
              <button type="button" onClick={closeKardex} aria-label="Cerrar"
                style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {/* KPI resumen kardex */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 1, background: T.lineSoft, borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              {[
                { label: 'Movimientos', value: String(kardexMovimientos.length) },
                { label: 'Entradas', value: String(kardexMovimientos.filter(m => m.tipo === 'ENTRADA' || m.tipo === 'SALDO_INICIAL' || m.tipo === 'DEVOLUCION').reduce((a, m) => a + (m.cantidad ?? 0), 0)) },
                { label: 'Salidas', value: String(kardexMovimientos.filter(m => m.tipo === 'SALIDA' || m.tipo === 'MERMA').reduce((a, m) => a + (m.cantidad ?? 0), 0)) },
                { label: 'Stock actual', value: String((esFarmacia && kardexProducto?.stockVigente != null) ? kardexProducto.stockVigente : (kardexProducto?.stockActual ?? 0)) },
              ].map(r => (
                <div key={r.label} style={{ padding: '13px 22px', background: T.surface }}>
                  <div style={{ fontSize: '.72rem', color: T.text3 }}>{r.label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 4, fontVariantNumeric: 'tabular-nums', color: T.text }}>{r.value}</div>
                </div>
              ))}
            </div>

            {/* Filtros kardex */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '12px 22px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 3, padding: 3, background: T.surface2, borderRadius: 10, maxWidth: '100%', overflowX: 'auto' }}>
                {['TODOS','ENTRADA','SALIDA','AJUSTE','DEVOLUCION','SALDO_INICIAL','MERMA'].map(t => {
                  const active = kardexTipoFilter === t;
                  return (
                    <button key={t} type="button" onClick={() => setKardexTipoFilter(t)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 9px', fontFamily: 'Inter,sans-serif', fontSize: '.78rem', fontWeight: active ? 600 : 500, color: active ? T.text : T.text3, background: active ? T.surface : 'transparent', border: 0, borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: active ? T.shadow : 'none' }}>
                      {t !== 'TODOS' && <span style={getTipoDot(t)} />}
                      {t === 'TODOS' ? 'Todos' : t === 'SALDO_INICIAL' ? 'Saldo ini.' : t.charAt(0) + t.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <input type="date" value={kardexDesde} onChange={e => setKardexDesde(e.target.value)}
                  style={{ height: 34, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.8rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, outline: 'none' }} />
                <span style={{ fontSize: '.78rem', color: T.text3 }}>a</span>
                <input type="date" value={kardexHasta} onChange={e => setKardexHasta(e.target.value)}
                  style={{ height: 34, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.8rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, outline: 'none' }} />
                {(kardexDesde || kardexHasta || kardexTipoFilter !== 'TODOS') && (
                  <button type="button" onClick={() => { setKardexDesde(''); setKardexHasta(''); setKardexTipoFilter('TODOS'); }}
                    style={{ fontSize: '.78rem', color: T.primary, background: 'transparent', border: 0, cursor: 'pointer', textDecoration: 'underline' }}>Limpiar</button>
                )}
              </div>
            </div>

            {/* Tabla kardex */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {kardexLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <div style={{ width: 24, height: 24, border: `3px solid ${T.primarySoft}`, borderTopColor: T.primary, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
              ) : kardexFiltrados.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', fontSize: '.86rem', color: T.text3 }}>Sin movimientos para estos filtros.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.83rem', minWidth: 900 }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 1, background: T.surface3 }}>
                      <th style={{ width: 28, padding: '10px 6px 10px 22px' }}></th>
                      {['Fecha','Movimiento','Documento','Entrada','Salida','Saldo','Costo unit.','Costo total'].map((h, i) => (
                        <th key={h} style={{ textAlign: i >= 3 ? 'right' : 'left', padding: '10px 14px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let stockAcumulado = 0;
                      const rows: React.ReactNode[] = [];
                      const sorted = [...kardexFiltrados].sort((a, b) => { const da = a.createdAt ? new Date(a.createdAt).getTime() : 0; const db = b.createdAt ? new Date(b.createdAt).getTime() : 0; return da - db; });
                      sorted.forEach(m => {
                        const esSalida = m.tipo === 'SALIDA';
                        const esMerma = m.tipo === 'MERMA';
                        const esDescuento = m.tipo === 'SALIDA' || m.tipo === 'MERMA';
                        const esEntrada = ['ENTRADA','SALDO_INICIAL','DEVOLUCION'].includes(m.tipo ?? '');
                        if (esEntrada) stockAcumulado += m.cantidad ?? 0;
                        else if (m.tipo === 'AJUSTE') stockAcumulado = m.cantidad ?? stockAcumulado;
                        else if (esDescuento) stockAcumulado -= m.cantidad ?? 0;
                        const isExpanded = m.id != null && expandedRows.has(m.id);
                        const isLoading = m.id != null && loadingLotesVenta.has(m.id);
                        const lotesVenta = m.id != null ? (lotesVentaCache.get(m.id) ?? []) : [];
                        const costoTotal = m.costoUnitario != null && m.cantidad ? m.costoUnitario * m.cantidad : null;
                        rows.push(
                          <tr key={m.id} onClick={() => m.id && toggleKardexRow(m.id)} style={{ borderTop: `1px solid ${T.lineSoft}`, cursor: esSalida ? 'pointer' : 'default', transition: 'background .14s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = T.surface3)}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}>
                            <td style={{ padding: '10px 6px 10px 22px', width: 28 }}>
                              {esSalida && <span style={{ display: 'grid', placeItems: 'center', color: T.text3, transition: 'transform .2s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
                              </span>}
                            </td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.8rem', fontWeight: 600, color: T.text }}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                              <div style={{ fontSize: '.72rem', color: T.text3, marginTop: 1 }}>{m.createdAt ? new Date(m.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                            </td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}><span style={getTipoStyle(m.tipo ?? '')}><span style={getTipoDot(m.tipo ?? '')} />{m.tipo === 'SALDO_INICIAL' ? 'Saldo ini.' : m.tipo === 'AJUSTE_PRECIO' ? 'Ajuste precio' : (m.tipo?.charAt(0) ?? '') + (m.tipo?.slice(1).toLowerCase() ?? '')}</span></td>
                            <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.78rem', color: T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.referencia || '—'}</div>
                              <div style={{ fontSize: '.72rem', color: T.text3, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.descripcion || ''}</div>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 650, color: T.ok, fontVariantNumeric: 'tabular-nums' }}>{esEntrada ? `+${m.cantidad}` : ''}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 650, color: T.bad, fontVariantNumeric: 'tabular-nums' }}>{(esSalida || esMerma) ? `-${m.cantidad}` : ''}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: T.text }}>{stockAcumulado}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap', color: T.text2, fontVariantNumeric: 'tabular-nums' }}>{m.costoUnitario != null ? `S/ ${m.costoUnitario.toFixed(2)}` : '—'}</td>
                            <td style={{ padding: '10px 22px 10px 14px', textAlign: 'right', whiteSpace: 'nowrap', color: T.text2, fontVariantNumeric: 'tabular-nums' }}>{costoTotal != null && costoTotal > 0 ? `S/ ${costoTotal.toFixed(2)}` : '—'}</td>
                          </tr>
                        );
                        if (esSalida && isExpanded) {
                          if (isLoading) {
                            rows.push(<tr key={`${m.id}-loading`} style={{ background: T.surface3 }}><td /><td colSpan={8} style={{ padding: '4px 22px 10px 14px', fontSize: '.78rem', color: T.text3 }}>Cargando lotes...</td></tr>);
                          } else {
                            rows.push(
                              <tr key={`${m.id}-lotes`} style={{ background: T.surface3 }}>
                                <td />
                                <td colSpan={8} style={{ padding: '4px 22px 12px 14px' }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    <span style={{ fontSize: '.74rem', color: T.text3, alignSelf: 'center' }}>Lotes consumidos</span>
                                    {lotesVenta.length === 0 ? <span style={{ fontSize: '.74rem', color: T.text3, fontStyle: 'italic' }}>Sin detalle disponible</span> : lotesVenta.map((lv, i) => (
                                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 28, padding: '0 10px', fontSize: '.76rem', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8 }}>
                                        <strong style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, color: T.text }}>{lv.lote || '—'}</strong>
                                        <span style={{ color: T.text3 }}>{lv.proveedorNombre || ''}</span>
                                        <span style={{ fontWeight: 700, color: T.bad }}>−{lv.cantidadDescontada}</span>
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                        }
                      });
                      return rows;
                    })()}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 9, padding: '13px 22px', borderTop: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
              <span style={{ flex: 1, minWidth: 200, fontSize: '.78rem', color: T.text3 }}>{kardexFiltrados.length} de {kardexMovimientos.length} movimientos</span>
              <button type="button" onClick={() => { closeKardex(); setIsDialogOpen(true); }}
                style={{ height: 40, display: 'flex', alignItems: 'center', gap: 7, padding: '0 15px', fontFamily: 'Inter,sans-serif', fontSize: '.86rem', fontWeight: 650, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                Registrar movimiento
              </button>
              <button type="button" onClick={closeKardex} style={{ height: 40, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.86rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ MODAL: Editar lote ══ */}
      {loteEditando && createPortal(
        <div style={OVERLAY} onClick={() => setLoteEditando(null)}>
          <div style={{ ...CARD, width: '100%', maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div style={MODAL_HDR}>
              <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: T.primarySoft, color: T.primary }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', color: T.text }}>Editar datos del lote</h2>
                <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>{loteEditando.productoNombre}</div>
              </div>
              <button type="button" onClick={() => setLoteEditando(null)} aria-label="Cerrar"
                style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div style={{ padding: '20px 22px 22px', display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
                <div>
                  <label style={LABEL}>Número de lote</label>
                  <FxInput type="text" value={editLoteNumero} placeholder="Ej. LOT-2026-001" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.86rem' }}
                    onChange={e => setEditLoteNumero(e.target.value)} />
                </div>
                <div>
                  <label style={LABEL}>Fecha de vencimiento</label>
                  <FxInput type="date" value={editFechaVencimiento} onChange={e => setEditFechaVencimiento(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={LABEL}>Proveedor</label>
                <FxSelect value={editProveedorId} onChange={e => setEditProveedorId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">— Sin proveedor —</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </FxSelect>
              </div>
              <div>
                <label style={LABEL}>Precio de venta del lote</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '.88rem', fontWeight: 650, color: T.text3, pointerEvents: 'none' }}>S/</span>
                  <FxInput type="text" inputMode="decimal" value={editPrecioVenta} placeholder="0.00" style={{ paddingLeft: 36, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                    onChange={e => setEditPrecioVenta(e.target.value)} />
                </div>
                <div style={{ fontSize: '.76rem', lineHeight: 1.5, color: T.text3, marginTop: 6 }}>El precio del lote se usa en el POS cuando se vende de este lote. Déjalo vacío para usar el precio general del producto.</div>
              </div>
            </div>
            <div style={MODAL_FTR}>
              <button type="button" onClick={() => setLoteEditando(null)} style={BTN_SEC}>Cancelar</button>
              <button type="button" disabled={savingLoteEdit}
                style={{ ...BTN_PRI, opacity: savingLoteEdit ? 0.7 : 1 }}
                onClick={async () => {
                  setSavingLoteEdit(true);
                  try {
                    const pid = editProveedorId !== '' ? Number(editProveedorId) : null;
                    const precio = editPrecioVenta !== '' ? Number(editPrecioVenta) : null;
                    await movimientoService.actualizarProveedorLote(loteEditando.movimientoId, pid, precio, editLoteNumero.trim() || null, editFechaVencimiento || null);
                    notify.success('Lote actualizado');
                    setLoteEditando(null);
                  } catch (err) { notify.fromError(err, 'No se pudo actualizar el lote.'); }
                  finally { setSavingLoteEdit(false); }
                  try { const data = await movimientoService.getLotes(); setLotes(data); } catch { /* silent refresh */ }
                  try { const data = await productoService.getAll(); setProductos(data); setProductosForm(data); } catch { /* silent refresh */ }
                }}>
                {savingLoteEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ MODAL: Baja de lote ══ */}
      {loteMerma && createPortal(
        <div style={OVERLAY} onClick={() => setLoteMerma(null)}>
          <div style={{ ...CARD, width: '100%', maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div style={MODAL_HDR}>
              <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: T.badSoft, color: T.bad }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', color: T.text }}>Dar de baja lote</h2>
                <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>Registra una merma. El stock se descuenta de este lote.</div>
              </div>
              <button type="button" onClick={() => setLoteMerma(null)} aria-label="Cerrar"
                style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 22px 20px' }}>
              <div style={{ display: 'grid', gap: 8, padding: '13px 15px', borderRadius: 12, background: T.surface2, fontSize: '.84rem', marginBottom: 18 }}>
                {[
                  { k: 'Producto', v: loteMerma.productoNombre },
                  { k: 'Lote', v: loteMerma.lote || 'Sin código' },
                  { k: 'Vencimiento', v: loteMerma.fechaVencimiento ? new Date(loteMerma.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                  { k: 'Stock del lote', v: `${loteMerma.stockActual ?? 0} und` },
                ].map(r => (
                  <div key={r.k} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ flexShrink: 0, color: T.text3 }}>{r.k}</span>
                    <span style={{ fontWeight: 600, textAlign: 'right', color: T.text }}>{r.v}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL}>Cantidad a dar de baja *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FxInput type="text" inputMode="numeric" value={mermaCantidad} placeholder="0"
                    style={{ width: 120, textAlign: 'center', fontSize: '1.05rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                    onChange={e => setMermaCantidad(e.target.value)} />
                  <button type="button" onClick={() => setMermaCantidad(String(loteMerma.stockActual ?? 1))}
                    style={{ height: 44, padding: '0 13px', fontFamily: 'Inter,sans-serif', fontSize: '.8rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.bad; e.currentTarget.style.color = T.bad; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.color = T.text2; }}>
                    Todo el lote
                  </button>
                  <span style={{ fontSize: '.78rem', color: T.text3 }}>de {loteMerma.stockActual}</span>
                </div>
                {Number(mermaCantidad) > (loteMerma.stockActual ?? 0) && (
                  <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>La cantidad no puede superar el stock del lote.</div>
                )}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL}>Motivo *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {['VENCIMIENTO','DANO','ROBO','ERROR','OTRO'].map(m => {
                    const active = mermaMotivo === m;
                    const labels: Record<string, string> = { VENCIMIENTO: 'Vencimiento', DANO: 'Daño', ROBO: 'Robo / Pérdida', ERROR: 'Error de ingreso', OTRO: 'Otro' };
                    return (
                      <button key={m} type="button" onClick={() => setMermaMotivo(m)}
                        style={{ height: 34, padding: '0 12px', fontFamily: 'Inter,sans-serif', fontSize: '.82rem', fontWeight: active ? 650 : 500, color: active ? '#fff' : T.text2, background: active ? T.bad : T.surface, border: `1px solid ${active ? T.bad : T.line}`, borderRadius: 20, cursor: 'pointer', transition: 'all .12s' }}>
                        {labels[m]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={LABEL}>Observaciones <span style={{ fontWeight: 400, color: T.text3 }}>(opcional)</span></label>
                <textarea rows={2} value={mermaObservaciones} placeholder="Descripción adicional…"
                  onChange={e => setMermaObservaciones(e.target.value)}
                  style={{ width: '100%', padding: '11px 13px', fontFamily: 'Inter,sans-serif', fontSize: '.875rem', lineHeight: 1.5, color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; }}
                  onBlur={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = 'none'; }} />
              </div>
            </div>
            <div style={MODAL_FTR}>
              <button type="button" onClick={() => setLoteMerma(null)} style={BTN_SEC}>Cancelar</button>
              <button type="button" disabled={savingMerma || !mermaCantidad || Number(mermaCantidad) <= 0}
                style={{ ...BTN_DANGER, opacity: (savingMerma || !mermaCantidad || Number(mermaCantidad) <= 0) ? 0.6 : 1 }}
                onClick={async () => {
                  const cant = Number(mermaCantidad);
                  if (!cant || cant <= 0) { notify.error('Ingresa una cantidad válida', { detail: 'El número de unidades a dar de baja debe ser mayor a 0.' }); return; }
                  if (cant > (loteMerma.stockActual ?? 0)) { notify.error('Cantidad mayor al stock del lote', { detail: `Este lote tiene ${loteMerma.stockActual} unidades disponibles.` }); return; }
                  setSavingMerma(true);
                  try {
                    await movimientoService.darDeBajaLote({ movimientoOrigenId: loteMerma.movimientoId, cantidad: cant, motivo: mermaMotivo, observaciones: mermaObservaciones || undefined });
                    notify.success('Baja registrada correctamente');
                    setLoteMerma(null);
                    const data = await movimientoService.getLotes();
                    setLotes(data);
                  } catch (err) { notify.fromError(err, 'No se pudo registrar la baja del lote.'); }
                  finally { setSavingMerma(false); }
                }}>
                {savingMerma ? 'Registrando...' : 'Confirmar baja'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal importación masiva */}
      <ImportarProductosModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchData}
        unidadesMedida={unidadesMedida}
        sucursalId={sucursalId}
        rubro={negocioConfig?.rubro}
      />
    </div>
  );
}
