import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { recepcionService } from '../../services/recepcion.service';
import { ordenCompraService } from '../../services/ordenCompra.service';
import { proveedorService } from '../../services/proveedor.service';
import { productoService } from '../../services/producto.service';
import type {
  RecepcionDTO,
  RecepcionItemDTO,
  OrdenCompraDTO,
  ProveedorDTO,
  ProductoDTO,
  TipoComprobanteProveedor,
} from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { Autocomplete } from '../../components/ui/Autocomplete';
import { Pagination } from '../../components/ui/Pagination';
import {
  Plus, Inbox, Search, CheckCircle, Clock, Lock,
  PackagePlus, Save, Trash2, FileText, Building2,
  BadgeCheck, XCircle, Truck, AlertCircle, SlidersHorizontal, X,
  Camera, CameraOff, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

type Option = { id: number | string; label: string; subtitle?: string };
type EstadoRecepFilter = 'TODOS' | 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
type CreateMode = 'OC' | 'MANUAL';

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR:   'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  CONFIRMADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  ANULADA:    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

function normalizeRecepcion(raw: any): RecepcionDTO {
  const detalles: any[] = Array.isArray(raw?.detalles)
    ? raw.detalles
    : Array.isArray(raw?.items)
    ? raw.items
    : [];

  const items: RecepcionItemDTO[] = detalles.map((d) => ({
    id: d.id,
    productoId: d.productoId,
    productoNombre: d.productoNombre,
    codigoBarras: d.codigoBarras,
    cantidadEsperada: d.cantidadEsperada,
    cantidadRecibida: d.cantidadRecibida,
    precioUnitario: d.precioUnitario,
    fechaVencimiento: d.fechaVencimiento,
    lote: d.lote,
  }));

  const hasComp = !!raw?.tipoComprobante && !!raw?.serie && !!raw?.numero;
  return {
    id: raw?.id,
    tenantId: raw?.tenantId,
    ordenCompraId: raw?.ocId ?? raw?.ordenCompraId,
    proveedorId: raw?.proveedorId,
    proveedorNombre: raw?.proveedorNombre,
    estado: raw?.estado,
    comprobante: hasComp
      ? { tipoComprobante: raw.tipoComprobante, serie: raw.serie, numero: raw.numero, urlAdjunto: raw.urlAdjunto ?? undefined }
      : undefined,
    observaciones: raw?.observaciones,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
    items,
  } as any;
}

// ── Stepper visual ───────────────────────────────────────────────────────────
function Stepper({ items, comprobante }: { items: RecepcionItemDTO[]; comprobante: any }) {
  const hasItems = items.length > 0 && items.some((i) => (i.cantidadRecibida ?? 0) > 0);
  const hasComp = !!comprobante?.tipoComprobante;

  const steps = [
    { label: 'Productos', done: hasItems, icon: hasItems ? CheckCircle : AlertCircle },
    { label: 'Comprobante', done: hasComp, icon: hasComp ? CheckCircle : AlertCircle },
    { label: 'Confirmar', done: false, icon: BadgeCheck },
  ];

  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isLast = i === steps.length - 1;
        return (
          <div key={s.label} className="flex items-center gap-1 flex-1">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${
              s.done ? 'text-green-600' : i === 2 ? 'text-muted-foreground' : 'text-amber-600'
            }`}>
              <Icon size={14} className="shrink-0" />
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-px mx-1 ${s.done ? 'bg-green-400' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RecepcionList() {
  const { canCreate, canView, canEdit, puede } = usePermissions();

  const hasViewPermission = canView('RECEPCIONES') || canView('INVENTARIO');
  const canCreateRecep   = canCreate('RECEPCIONES') || puede('CREAR_RECEPCION');
  const canEditRecep     = canEdit('RECEPCIONES')   || puede('CREAR_RECEPCION');
  const canConfirmRecep  = puede('CONFIRMAR_RECEPCION') || canEditRecep;

  // Data
  const [recepciones, setRecepciones] = useState<RecepcionDTO[]>([]);
  const [ocs, setOcs]               = useState<OrdenCompraDTO[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [productos, setProductos]   = useState<ProductoDTO[]>([]);
  const [loading, setLoading]       = useState(true);

  // List
  const [searchTerm, setSearchTerm]     = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoRecepFilter>('TODOS');
  const [fechaDesde, setFechaDesde]     = useState('');
  const [fechaHasta, setFechaHasta]     = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [currentPage, setCurrentPage]   = useState(1);
  const itemsPerPage = 10;

  // Create modal
  const [isCreateOpen, setIsCreateOpen]     = useState(false);
  const [createLoading, setCreateLoading]   = useState(false);
  const [creating, setCreating]             = useState(false);
  const [createMode, setCreateMode]         = useState<CreateMode>('OC');
  const [createOcId, setCreateOcId]         = useState<number | null>(null);
  const [createProveedorId, setCreateProveedorId] = useState<number | null>(null);
  const [createObs, setCreateObs]           = useState('');

  // Detail modal
  const [isDetailOpen, setIsDetailOpen]           = useState(false);
  const [detailLoading, setDetailLoading]         = useState(false);
  const [detailActionLoading, setDetailActionLoading] = useState(false);
  const [selectedRecepId, setSelectedRecepId]     = useState<number | null>(null);
  const [selectedRecep, setSelectedRecep]         = useState<RecepcionDTO | null>(null);

  // Add item (formulario extra — solo para productos fuera de la OC)
  const [selectedProductoId, setSelectedProductoId] = useState<number | null>(null);
  const [itemQty, setItemQty]       = useState<number>(1);
  const [itemExpiry, setItemExpiry] = useState('');
  const [itemLote, setItemLote]     = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);

  // Edición inline de la tabla de productos
  const [editQty, setEditQty]           = useState<Record<number, number>>({});
  const [editVenc, setEditVenc]         = useState<Record<number, string>>({});
  const [editLote, setEditLote]         = useState<Record<number, string>>({});
  const [savingItemId, setSavingItemId] = useState<number | null>(null);

  // Comprobante
  const [compTipo, setCompTipo]   = useState<TipoComprobanteProveedor>('FACTURA');
  const [compSerie, setCompSerie] = useState('');
  const [compNumero, setCompNumero] = useState('');
  const [compUrl, setCompUrl]     = useState('');
  const [savingComp, setSavingComp] = useState(false);

  // ── Cámara ────────────────────────────────────────────────────────────────
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [cameraError, setCameraError]             = useState<string | null>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'warning' as 'warning' | 'danger' | 'success' | 'info',
    title: '', description: '', confirmText: '',
    action: null as (() => Promise<void>) | null,
  });

  useEffect(() => {
    if (hasViewPermission) fetchData();
    else if (canCreateRecep) fetchFormData();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasViewPermission]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, estadoFilter, fechaDesde, fechaHasta]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      const [ocData, provData, prodData] = await Promise.all([
        ordenCompraService.getAll().catch(() => []),
        proveedorService.getActivos().catch(() => []),
        productoService.getAll().catch(() => []),
      ]);
      setOcs(ocData); setProveedores(provData); setProductos(prodData);
    } finally { setLoading(false); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recDataRaw, ocData, provData, prodData] = await Promise.all([
        recepcionService.getAll(),
        ordenCompraService.getAll().catch(() => []),
        proveedorService.getActivos().catch(() => []),
        productoService.getAll().catch(() => []),
      ]);
      setRecepciones((recDataRaw as any[]).map(normalizeRecepcion));
      setOcs(ocData); setProveedores(provData); setProductos(prodData);
    } catch { toast.error('Error al cargar recepciones'); }
    finally { setLoading(false); }
  };

  // ── Memo ────────────────────────────────────────────────────────────────────
  const ocOptions: Option[] = useMemo(
    () => ocs
      .filter((oc) => oc.estado === 'ENVIADA' || oc.estado === 'RECIBIDA_PARCIAL')
      .map((oc) => ({
        id: oc.id!,
        label: `OC #${oc.id} — ${oc.proveedorNombre ?? `Proveedor #${oc.proveedorId}`}`,
        subtitle: `${oc.estado} · ${(oc.items ?? []).length} producto(s)`,
      })),
    [ocs]
  );

  const proveedorOptions: Option[] = useMemo(
    () => proveedores.map((p) => ({
      id: p.id!, label: p.nombre,
      subtitle: p.ruc ? `RUC: ${p.ruc}` : undefined,
    })),
    [proveedores]
  );

  const productoOptions: Option[] = useMemo(
    () => productos.map((p) => ({
      id: p.id!,
      label: `${p.nombre}${p.codigoBarras ? ` (${p.codigoBarras})` : ''}`,
    })),
    [productos]
  );

  const selectedCreateOc = useMemo(
    () => createOcId ? ocs.find((o) => o.id === createOcId) ?? null : null,
    [createOcId, ocs]
  );

  const selectedProducto = useMemo(
    () => selectedProductoId ? productos.find((p) => p.id === selectedProductoId) ?? null : null,
    [selectedProductoId, productos]
  );

  const stats = useMemo(() => ({
    total:     recepciones.length,
    borrador:  recepciones.filter((r) => r.estado === 'BORRADOR').length,
    confirmada: recepciones.filter((r) => r.estado === 'CONFIRMADA').length,
    anulada:   recepciones.filter((r) => r.estado === 'ANULADA').length,
  }), [recepciones]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (estadoFilter !== 'TODOS') n++;
    if (fechaDesde) n++;
    if (fechaHasta) n++;
    return n;
  }, [estadoFilter, fechaDesde, fechaHasta]);

  const limpiarFiltros = () => {
    setEstadoFilter('TODOS');
    setFechaDesde('');
    setFechaHasta('');
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return recepciones
      .filter((r) => {
        const match =
          r.proveedorNombre?.toLowerCase().includes(term) ||
          String(r.id).includes(term) ||
          r.estado.toLowerCase().includes(term) ||
          (r.ordenCompraId && String(r.ordenCompraId).includes(term));
        if (!match) return false;
        if (estadoFilter !== 'TODOS' && r.estado !== estadoFilter) return false;
        if (fechaDesde && r.createdAt) {
          if (new Date(r.createdAt) < new Date(fechaDesde)) return false;
        }
        if (fechaHasta && r.createdAt) {
          const to = new Date(fechaHasta);
          to.setHours(23, 59, 59, 999);
          if (new Date(r.createdAt) > to) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : (a.id ?? 0);
        const db = b.createdAt ? new Date(b.createdAt).getTime() : (b.id ?? 0);
        return db - da;
      });
  }, [recepciones, searchTerm, estadoFilter, fechaDesde, fechaHasta]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentRecepciones = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── Create ───────────────────────────────────────────────────────────────────
  const openCreate = async () => {
    setIsCreateOpen(true);
    setCreateMode('OC');
    setCreateOcId(null);
    setCreateProveedorId(null);
    setCreateObs('');
    if (ocs.length === 0 || proveedores.length === 0) {
      setCreateLoading(true);
      await fetchFormData().finally(() => setCreateLoading(false));
    }
  };

  const closeCreate = () => setIsCreateOpen(false);

  const handleCreate = async () => {
    const proveedorId = selectedCreateOc ? selectedCreateOc.proveedorId : createProveedorId;
    if (createMode === 'MANUAL' && !proveedorId) {
      toast.error('Selecciona un proveedor'); return;
    }
    if (createMode === 'OC' && !createOcId) {
      toast.error('Selecciona una OC'); return;
    }

    setCreating(true);
    try {
      const createdRaw = await recepcionService.create({
        ocId: createMode === 'OC' ? createOcId! : undefined,
        proveedorId: createMode === 'MANUAL' ? proveedorId! : undefined,
        observaciones: createObs || undefined,
      } as any);

      toast.success('Recepción creada — completa los datos a continuación');
      setIsCreateOpen(false);
      await fetchData();
      await openDetail((createdRaw as any).id!);
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje ?? 'Error al crear la recepción');
    } finally { setCreating(false); }
  };

  // ── Detail ───────────────────────────────────────────────────────────────────
  const openDetail = async (id: number) => {
    setSelectedRecepId(id);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const rec = normalizeRecepcion(await recepcionService.getById(id));
      setSelectedRecep(rec);
      const comp = rec.comprobante as any;
      if (comp) {
        setCompTipo(comp.tipoComprobante); setCompSerie(comp.serie);
        setCompNumero(comp.numero); setCompUrl(comp.urlAdjunto ?? '');
      } else {
        setCompTipo('FACTURA'); setCompSerie(''); setCompNumero(''); setCompUrl('');
      }
    } catch { toast.error('Error al cargar la recepción'); setIsDetailOpen(false); }
    finally { setDetailLoading(false); }
  };

  const refreshDetail = async () => {
    if (!selectedRecepId) return;
    const rec = normalizeRecepcion(await recepcionService.getById(selectedRecepId));
    setSelectedRecep(rec);
  };

  // Sincronizar edición inline cuando cambian los items
  useEffect(() => {
    if (!selectedRecep) return;
    const initQty: Record<number, number> = {};
    const initVenc: Record<number, string> = {};
    const initLote: Record<number, string> = {};
    for (const it of selectedRecep.items ?? []) {
      initQty[it.productoId]  = it.cantidadRecibida ?? 0;
      initVenc[it.productoId] = it.fechaVencimiento ?? '';
      initLote[it.productoId] = it.lote ?? '';
    }
    setEditQty(initQty);
    setEditVenc(initVenc);
    setEditLote(initLote);
  }, [selectedRecep]);

  const closeDetail = () => {
    setIsDetailOpen(false); setSelectedRecepId(null); setSelectedRecep(null);
    setSelectedProductoId(null); setItemQty(1); setItemExpiry(''); setItemLote('');
    setShowAddProduct(false); setEditQty({}); setEditVenc({}); setEditLote({});
  };

  // Guardar cantidad inline de una fila de la tabla
  const handleInlineSave = async (item: RecepcionItemDTO) => {
    if (!selectedRecep?.id) return;
    const qty  = editQty[item.productoId]  ?? item.cantidadRecibida ?? 0;
    const venc = editVenc[item.productoId] ?? item.fechaVencimiento ?? '';
    const lote = editLote[item.productoId] ?? item.lote ?? '';
    setSavingItemId(item.productoId);
    try {
      await recepcionService.upsertItem(selectedRecep.id, {
        productoId: item.productoId,
        cantidadRecibida: qty,
        fechaVencimiento: venc || undefined,
        lote: lote || undefined,
      });
      await refreshDetail();
      toast.success('Producto actualizado');
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje ?? 'Error al actualizar');
    } finally { setSavingItemId(null); }
  };

  // Restablecer fila a cantidad 0 sin vencimiento ni lote (requiere guardar para persistir)
  const handleInlineReset = (item: RecepcionItemDTO) => {
    setEditQty(prev  => ({ ...prev,  [item.productoId]: 0 }));
    setEditVenc(prev => ({ ...prev,  [item.productoId]: '' }));
    setEditLote(prev => ({ ...prev,  [item.productoId]: '' }));
  };

  // Marcar todos los productos como completamente recibidos (qty = esperado)
  const handleRecibirTodo = async () => {
    if (!selectedRecep?.id) return;
    const items = selectedRecep.items ?? [];
    const conEsperado = items.filter(it => (it.cantidadEsperada ?? 0) > 0);
    if (conEsperado.length === 0) return;
    setDetailActionLoading(true);
    try {
      await Promise.all(conEsperado.map(it =>
        recepcionService.upsertItem(selectedRecep.id!, {
          productoId: it.productoId,
          cantidadRecibida: it.cantidadEsperada!,
          fechaVencimiento: it.fechaVencimiento || undefined,
          lote: it.lote || undefined,
        })
      ));
      await refreshDetail();
      toast.success('✅ Todas las cantidades actualizadas al total esperado');
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje ?? 'Error');
    } finally { setDetailActionLoading(false); }
  };

  const isEditable = selectedRecep?.estado === 'BORRADOR';

  const handleAddItem = async () => {
    if (!selectedRecep?.id || !selectedProducto) { toast.error('Selecciona un producto'); return; }
    if (itemQty <= 0) { toast.error('La cantidad debe ser mayor a 0'); return; }
    setDetailActionLoading(true);
    try {
      await recepcionService.upsertItem(selectedRecep.id, {
        productoId: selectedProducto.id!,
        cantidadRecibida: itemQty,
        fechaVencimiento: itemExpiry || undefined,
        lote: itemLote || undefined,
      });
      await refreshDetail();
      setSelectedProductoId(null); setItemQty(1); setItemExpiry(''); setItemLote('');
      toast.success('Producto guardado');
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje ?? 'Error al guardar producto');
    } finally { setDetailActionLoading(false); }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!selectedRecep?.id || !isEditable) return;
    setConfirmDialog({
      isOpen: true, type: 'warning',
      title: 'Quitar producto',
      description: '¿Estás seguro de quitar este producto de la recepción?',
      confirmText: 'Quitar',
      action: async () => {
        setDetailActionLoading(true);
        try {
          await recepcionService.removeItem(selectedRecep.id!, itemId);
          await refreshDetail();
          toast.success('Producto quitado');
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
        } catch (e: any) { toast.error(e?.response?.data?.mensaje ?? 'Error'); }
        finally { setDetailActionLoading(false); }
      },
    });
  };

  const handleSaveComprobante = async () => {
    if (!selectedRecep?.id || !isEditable) return;
    if (!compSerie.trim() || !compNumero.trim()) { toast.error('Completa serie y número'); return; }
    setSavingComp(true);
    try {
      await recepcionService.setComprobante(selectedRecep.id, {
        tipoComprobante: compTipo, serie: compSerie.trim(),
        numero: compNumero.trim(), urlAdjunto: compUrl.trim() || undefined,
      } as any);
      await refreshDetail();
      toast.success('Comprobante registrado');
    } catch (e: any) { toast.error(e?.response?.data?.mensaje ?? 'Error al guardar comprobante'); }
    finally { setSavingComp(false); }
  };

  const handleConfirmar = async () => {
    if (!selectedRecep?.id || !isEditable) return;
    if (!canConfirmRecep) { toast.error('Sin permiso para confirmar'); return; }
    const comp = selectedRecep.comprobante as any;
    if (!comp?.tipoComprobante || !comp?.serie || !comp?.numero) {
      toast.error('Registra el comprobante antes de confirmar'); return;
    }
    if ((selectedRecep.items ?? []).length === 0) {
      toast.error('Agrega al menos un producto'); return;
    }
    setDetailActionLoading(true);
    try {
      const updated = normalizeRecepcion(await recepcionService.confirmar(selectedRecep.id));
      setSelectedRecep(updated);
      toast.success('✅ Recepción confirmada — stock actualizado');
      await fetchData();
    } catch (e: any) { toast.error(e?.response?.data?.mensaje ?? 'Error al confirmar'); }
    finally { setDetailActionLoading(false); }
  };

  const handleAnular = () => {
    if (!selectedRecep?.id) return;
    setConfirmDialog({
      isOpen: true, type: 'danger',
      title: 'Anular recepción',
      description: 'La recepción quedará ANULADA. El inventario no se verá afectado.',
      confirmText: 'Anular',
      action: async () => {
        setDetailActionLoading(true);
        try {
          await recepcionService.anular(selectedRecep!.id!);
          toast.success('Recepción anulada');
          closeDetail(); await fetchData();
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
        } catch (e: any) { toast.error(e?.response?.data?.mensaje ?? 'Error al anular'); }
        finally { setDetailActionLoading(false); }
      },
    });
  };

  // ── Funciones de cámara ──────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setShowCameraScanner(false);
    setCameraError(null);
  }, []);

  const buscarPorCodigoRecepcion = useCallback(async (codigo: string) => {
    // 1. Si hay recepción abierta en BORRADOR, buscar el código entre sus items
    const itemEnRecep = (selectedRecep?.items ?? []).find(
      it => it.codigoBarras?.toLowerCase() === codigo.toLowerCase()
    );
    if (itemEnRecep && selectedRecep?.id) {
      const nuevaQty = (itemEnRecep.cantidadRecibida ?? 0) + 1;
      setSavingItemId(itemEnRecep.productoId);
      try {
        await recepcionService.upsertItem(selectedRecep.id, {
          productoId: itemEnRecep.productoId,
          cantidadRecibida: nuevaQty,
          fechaVencimiento: itemEnRecep.fechaVencimiento || undefined,
          lote: itemEnRecep.lote || undefined,
        });
        const updated = normalizeRecepcion(await recepcionService.getById(selectedRecep.id));
        setSelectedRecep(updated);
        toast.success(`+1 ${itemEnRecep.productoNombre} → ${nuevaQty} recibidos`);
      } catch (e: any) {
        toast.error(e?.response?.data?.mensaje ?? 'Error al actualizar');
      } finally { setSavingItemId(null); }
      return;
    }

    // 2. Buscar en catálogo (producto nuevo para esta recepción)
    const producto = productos.find(
      p => p.codigoBarras?.toLowerCase() === codigo.toLowerCase()
    );
    if (producto) {
      setSelectedProductoId(producto.id!);
      setShowAddProduct(true);
      toast.success(`${producto.nombre} — ajusta la cantidad y guarda`);
    } else {
      toast.error(`Código no encontrado: ${codigo}`);
    }
  }, [productos, selectedRecep]);

  const openCamera = useCallback(async () => {
    setCameraError(null);
    setShowCameraScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }

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
            buscarPorCodigoRecepcion(code);
          }
        } catch { /* ignorar errores de frame */ }
      }, 250);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
        setCameraError('Permiso de cámara denegado. Habilítalo en la configuración del navegador.');
      } else if (msg.toLowerCase().includes('notfound')) {
        setCameraError('No se encontró ninguna cámara en este dispositivo.');
      } else {
        setCameraError('No se pudo acceder a la cámara. Verifica los permisos.');
      }
    }
  }, [stopCamera, buscarPorCodigoRecepcion]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (loading) return <LoadingSpinner />;
  if (!hasViewPermission)
    return <EmptyState icon={Lock} title="Sin acceso" description="No tienes permisos para ver recepciones" />;

  const itemsToShow = selectedRecep?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recepciones</h1>
          <p className="text-muted-foreground">Registra y confirma la llegada de mercadería</p>
        </div>
        {canCreateRecep && (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Nueva recepción
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
            <div className="h-9 w-9 rounded-xl bg-slate-500/10 flex items-center justify-center flex-shrink-0">
              <Inbox className="h-4 w-4 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold tracking-tight text-slate-700 dark:text-slate-300">{stats.total}</p>
          </CardContent>
        </Card>

        {/* Borrador */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Borrador</p>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold tracking-tight text-amber-600">{stats.borrador}</p>
          </CardContent>
        </Card>

        {/* Confirmadas */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirmadas</p>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold tracking-tight text-emerald-600">{stats.confirmada}</p>
          </CardContent>
        </Card>

        {/* Anuladas */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anuladas</p>
            <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Trash2 className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold tracking-tight text-red-600">{stats.anulada}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filtros */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por proveedor, ID, OC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <button
            onClick={() => setShowFilterDrawer(true)}
            className={[
              'flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-semibold transition-all shrink-0',
              activeFiltersCount > 0
                ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'border-input bg-background text-muted-foreground hover:text-foreground hover:border-primary/40',
            ].join(' ')}
          >
            <SlidersHorizontal size={15} />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="h-5 w-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {estadoFilter !== 'TODOS' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {estadoFilter.charAt(0) + estadoFilter.slice(1).toLowerCase()}
                <button onClick={() => setEstadoFilter('TODOS')} className="ml-0.5 hover:text-blue-800"><X size={11} /></button>
              </span>
            )}
            {fechaDesde && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Desde {fechaDesde}
                <button onClick={() => setFechaDesde('')} className="ml-0.5 hover:text-blue-800"><X size={11} /></button>
              </span>
            )}
            {fechaHasta && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Hasta {fechaHasta}
                <button onClick={() => setFechaHasta('')} className="ml-0.5 hover:text-blue-800"><X size={11} /></button>
              </span>
            )}
            <button onClick={limpiarFiltros} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors px-1">
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Filter drawer backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[35] transition-opacity duration-300 ${showFilterDrawer ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowFilterDrawer(false)}
      />

      {/* Filter drawer panel */}
      <div
        className={`fixed right-0 top-16 w-80 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out rounded-l-2xl overflow-hidden bg-slate-900 border-l border-t border-b border-slate-700/50 ${showFilterDrawer ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ height: 'calc(100vh - 7rem)', maxHeight: 'calc(100dvh - 7rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <h2 className="font-semibold text-sm text-white">Filtros</h2>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{activeFiltersCount}</span>
            )}
          </div>
          <button onClick={() => setShowFilterDrawer(false)} className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Rango de fechas */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rango de fechas</p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Desde</label>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm px-3 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm px-3 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          {/* Estado */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['TODOS', 'BORRADOR', 'CONFIRMADA', 'ANULADA'] as EstadoRecepFilter[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setEstadoFilter(k)}
                  className={[
                    'px-3 py-2 rounded-lg text-xs font-semibold border transition-all',
                    estadoFilter === k
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500',
                  ].join(' ')}
                >
                  {k === 'TODOS' ? 'Todos' : k.charAt(0) + k.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/40 shrink-0 flex gap-2">
          <button onClick={limpiarFiltros} className="flex-1 h-9 rounded-xl border border-slate-600 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-500 transition-all">
            Limpiar todo
          </button>
          <button onClick={() => setShowFilterDrawer(false)} className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all">
            Ver {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Lista */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Historial de recepciones</CardTitle>
          <CardDescription>{filtered.length} recepción(es) encontrada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Sin recepciones"
              description={searchTerm ? 'Sin resultados para ese criterio' : 'Crea la primera recepción'}
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>ID</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>OC vinculada</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRecepciones.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-semibold">#{rec.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{rec.proveedorNombre || `#${rec.proveedorId}`}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {rec.ordenCompraId
                            ? <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium"><Truck size={12} />OC #{rec.ordenCompraId}</span>
                            : <span className="text-xs text-muted-foreground">Manual</span>}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {(rec.items ?? []).length} item(s)
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${ESTADO_BADGE[rec.estado] || ''}`}>
                            {rec.estado}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {rec.comprobante
                            ? <span className="text-green-600 font-medium">✓ {(rec.comprobante as any).tipoComprobante} {(rec.comprobante as any).serie}-{(rec.comprobante as any).numero}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('es-PE') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openDetail(rec.id!)}>
                            Ver / Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={currentPage} totalPages={totalPages}
                onPageChange={setCurrentPage} totalItems={filtered.length}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Create modal ──────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={isCreateOpen} onClose={closeCreate}
        title="Nueva recepción" description="¿La mercadería viene de una OC o es una entrada manual?"
        size="lg"
      >
        {createLoading ? (
          <div className="py-10 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="space-y-5">
            {/* Tabs modo */}
            <div className="flex rounded-lg border border-input bg-muted p-1 gap-1">
              {([
                { key: 'OC', label: '📦 Desde Orden de Compra' },
                { key: 'MANUAL', label: '🏪 Entrada manual' },
              ] as { key: CreateMode; label: string }[]).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setCreateMode(t.key); setCreateOcId(null); setCreateProveedorId(null); }}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                    createMode === t.key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Modo OC */}
            {createMode === 'OC' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Orden de Compra <span className="text-destructive">*</span>
                  </label>
                  <Autocomplete
                    options={ocOptions}
                    value={selectedCreateOc ? { id: selectedCreateOc.id!, label: `OC #${selectedCreateOc.id} — ${selectedCreateOc.proveedorNombre}` } : null}
                    onChange={(opt) => setCreateOcId(opt ? Number(opt.id) : null)}
                    placeholder="Buscar OC por número o proveedor..."
                    emptyMessage={ocOptions.length === 0 ? 'No hay OCs en estado ENVIADA o RECIBIDA_PARCIAL' : 'Sin resultados'}
                  />
                </div>

                {/* Preview productos de la OC */}
                {selectedCreateOc && (selectedCreateOc.items ?? []).length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Productos de la OC (pre-cargados automáticamente)
                    </p>
                    <div className="divide-y">
                      {(selectedCreateOc.items ?? []).map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="font-medium">{it.productoNombre}</span>
                          <span className="text-muted-foreground text-xs">
                            {it.cantidadSolicitada} un. solicitadas
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600">
                      💡 Los productos se cargarán automáticamente. Podrás ajustar cantidades recibidas en el siguiente paso.
                    </p>
                  </div>
                )}

                {ocOptions.length === 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertCircle size={16} className="shrink-0" />
                    No hay órdenes de compra enviadas pendientes de recepción.
                  </div>
                )}
              </div>
            )}

            {/* Modo Manual */}
            {createMode === 'MANUAL' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Proveedor <span className="text-destructive">*</span>
                </label>
                <Autocomplete
                  options={proveedorOptions}
                  value={createProveedorId ? (() => { const p = proveedores.find((x) => x.id === createProveedorId); return p ? { id: p.id!, label: p.nombre } : null; })() : null}
                  onChange={(opt) => setCreateProveedorId(opt ? Number(opt.id) : null)}
                  placeholder="Buscar proveedor..."
                  emptyMessage="Sin proveedores activos"
                />
              </div>
            )}

            {/* Observaciones */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Observaciones (opcional)</label>
              <Input
                value={createObs}
                onChange={(e) => setCreateObs(e.target.value)}
                placeholder="Ej: Llegó incompleto, verificar..."
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={closeCreate}>Cancelar</Button>
              <Button
                onClick={handleCreate}
                disabled={creating || (createMode === 'OC' ? !createOcId : !createProveedorId)}
              >
                <Plus size={16} className="mr-2" />
                {creating ? 'Creando...' : 'Crear recepción'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Detail modal ──────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={isDetailOpen} onClose={closeDetail}
        title={selectedRecepId ? `Recepción #${selectedRecepId}` : 'Recepción'}
        description=""
        size="xl"
      >
        {detailLoading ? (
          <div className="py-10 flex justify-center"><LoadingSpinner /></div>
        ) : !selectedRecep ? (
          <EmptyState icon={Inbox} title="No se pudo cargar" description="Intenta nuevamente." />
        ) : (
          <div className="space-y-5">

            {/* Header info */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Proveedor</p>
                <p className="font-semibold">{selectedRecep.proveedorNombre || `#${selectedRecep.proveedorId}`}</p>
                {selectedRecep.ordenCompraId && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Truck size={12} /> Vinculada a OC #{selectedRecep.ordenCompraId}
                  </p>
                )}
                {selectedRecep.observaciones && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <FileText size={11} /> {selectedRecep.observaciones}
                  </p>
                )}
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${ESTADO_BADGE[selectedRecep.estado] || ''}`}>
                {selectedRecep.estado}
              </span>
            </div>

            {/* Stepper — solo en BORRADOR */}
            {isEditable && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Progreso de la recepción</p>
                <Stepper items={itemsToShow} comprobante={selectedRecep.comprobante} />
              </div>
            )}

            {/* ── Sección 1: Productos ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <PackagePlus size={13} /> Productos recibidos
                </p>
                {isEditable && canEditRecep && (
                  <div className="flex items-center gap-2">
                    {hasCamera && (
                      <button
                        type="button"
                        onClick={openCamera}
                        title="Escanear código de barras"
                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-input bg-background hover:border-primary hover:text-primary text-muted-foreground text-xs font-medium transition-colors"
                      >
                        <Camera size={13} /> Escanear
                      </button>
                    )}
                    {itemsToShow.some(it => (it.cantidadEsperada ?? 0) > 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRecibirTodo}
                        disabled={detailActionLoading}
                        className="h-7 text-xs gap-1"
                      >
                        <CheckCircle size={12} /> Recibir todo
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Producto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-center">Esperado</TableHead>
                      <TableHead className="text-center">Recibido</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Lote</TableHead>
                      {isEditable && canEditRecep && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsToShow.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                          Sin productos aún — agrega usando el formulario de abajo
                        </TableCell>
                      </TableRow>
                    ) : itemsToShow.map((it, idx) => {
                      const esperado   = it.cantidadEsperada ?? 0;
                      const recibido   = it.cantidadRecibida ?? 0;
                      const esDeOC     = esperado > 0;
                      // Para el badge usamos editQty (valor local en edición) para que
                      // reaccione en tiempo real al +/− y restablecer funcione correctamente
                      const qtyBadge = (isEditable && canEditRecep)
                        ? (editQty[it.productoId] ?? recibido)
                        : recibido;
                      // Badge de estado
                      let badge: { label: string; cls: string } | null = null;
                      if (esDeOC) {
                        if (qtyBadge === 0)            badge = { label: 'Sin recibir', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
                        else if (qtyBadge < esperado)  badge = { label: 'Parcial',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
                        else if (qtyBadge === esperado) badge = { label: 'Completo',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
                        else                            badge = { label: 'Extra',       cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
                      }
                      return (
                        <TableRow key={it.id ?? `${it.productoId}-${idx}`}
                          className={qtyBadge === 0 && esDeOC ? 'bg-red-50/40 dark:bg-red-950/10' : ''}>
                          <TableCell className="font-medium">
                            {it.productoNombre || `#${it.productoId}`}
                            {esDeOC && (
                              <span className="ml-1.5 text-[10px] text-blue-500 font-normal">OC</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{it.codigoBarras || '—'}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{it.cantidadEsperada ?? '—'}</TableCell>
                          <TableCell className="text-center">
                            {isEditable && canEditRecep ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditQty(prev => ({ ...prev, [it.productoId]: Math.max(0, (prev[it.productoId] ?? 0) - 1) }))}
                                  className="w-6 h-6 rounded border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-colors font-bold leading-none"
                                >−</button>
                                <input
                                  type="number"
                                  min={0}
                                  value={editQty[it.productoId] ?? 0}
                                  onChange={(e) => setEditQty(prev => ({ ...prev, [it.productoId]: Math.max(0, Number(e.target.value)) }))}
                                  className="w-14 text-center text-sm font-semibold border rounded px-1 py-0.5 bg-background focus:outline-none focus:border-primary"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditQty(prev => ({ ...prev, [it.productoId]: (prev[it.productoId] ?? 0) + 1 }))}
                                  className="w-6 h-6 rounded border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-colors font-bold leading-none"
                                >+</button>
                              </div>
                            ) : (
                              <span className={`font-semibold ${recibido > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {recibido}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {badge ? (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>
                                {badge.label}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditable && canEditRecep ? (
                              <input
                                type="date"
                                value={editVenc[it.productoId] ?? ''}
                                onChange={(e) => setEditVenc(prev => ({ ...prev, [it.productoId]: e.target.value }))}
                                className="w-32 text-xs border rounded px-1.5 py-1 bg-background focus:outline-none focus:border-primary"
                              />
                            ) : (
                              <span className="text-xs">{it.fechaVencimiento || '—'}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditable && canEditRecep ? (
                              <input
                                type="text"
                                value={editLote[it.productoId] ?? ''}
                                onChange={(e) => setEditLote(prev => ({ ...prev, [it.productoId]: e.target.value }))}
                                placeholder="Opc."
                                className="w-20 text-xs border rounded px-1.5 py-1 bg-background focus:outline-none focus:border-primary"
                              />
                            ) : (
                              <span className="text-xs">{it.lote || '—'}</span>
                            )}
                          </TableCell>
                          {isEditable && canEditRecep && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => handleInlineSave(it)}
                                  disabled={savingItemId === it.productoId}
                                  title="Guardar cambios"
                                >
                                  <Save size={14} className="text-primary" />
                                </Button>
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => handleInlineReset(it)}
                                  disabled={savingItemId === it.productoId}
                                  title="Descartar cambios"
                                >
                                  <RotateCcw size={14} className="text-amber-500" />
                                </Button>
                                {/* Eliminar solo para productos agregados manualmente (no vienen de OC) */}
                                {!esDeOC && (
                                  <Button
                                    variant="ghost" size="sm"
                                    onClick={() => it.id && handleRemoveItem(it.id)}
                                    disabled={detailActionLoading || !it.id}
                                    title="Eliminar producto"
                                  >
                                    <Trash2 size={14} className="text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Resumen de recepción */}
              {itemsToShow.length > 0 && (() => {
                const deOC = itemsToShow.filter(it => (it.cantidadEsperada ?? 0) > 0);
                // En modo edición usar editQty para que el resumen refleje los cambios locales
                const qty = (it: RecepcionItemDTO) =>
                  (isEditable && canEditRecep)
                    ? (editQty[it.productoId] ?? it.cantidadRecibida ?? 0)
                    : (it.cantidadRecibida ?? 0);
                const sinRecibir = deOC.filter(it => qty(it) === 0);
                const parciales  = deOC.filter(it => qty(it) > 0 && qty(it) < (it.cantidadEsperada ?? 0));
                const completos  = deOC.filter(it => qty(it) >= (it.cantidadEsperada ?? 0) && (it.cantidadEsperada ?? 0) > 0);
                if (deOC.length === 0) return null;
                return (
                  <div className="flex flex-wrap items-center gap-3 px-1 pt-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{deOC.length} producto(s) de OC:</span>
                    {completos.length > 0  && <span className="text-green-600 font-medium">✓ {completos.length} completo(s)</span>}
                    {parciales.length > 0  && <span className="text-amber-600 font-medium">◑ {parciales.length} parcial(es)</span>}
                    {sinRecibir.length > 0 && <span className="text-red-600 font-medium">✗ {sinRecibir.length} sin recibir</span>}
                    {sinRecibir.length > 0 && isEditable && (
                      <span className="text-muted-foreground italic">— deja en 0 si no llegaron, no los elimines</span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Agregar producto adicional — solo BORRADOR */}
            {isEditable && canEditRecep && (
              <div className="rounded-lg border border-dashed p-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(prev => !prev)}
                  className="flex items-center gap-2 w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                >
                  <PackagePlus size={13} />
                  {showAddProduct ? '▲ Ocultar formulario' : '▼ Agregar producto adicional'}
                </button>
                {showAddProduct && (
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Producto</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Autocomplete
                          options={productoOptions}
                          value={selectedProducto ? { id: selectedProducto.id!, label: selectedProducto.nombre } : null}
                          onChange={(opt) => setSelectedProductoId(opt ? Number(opt.id) : null)}
                          placeholder="Buscar producto..."
                        />
                      </div>
                      {hasCamera && (
                        <button
                          type="button"
                          onClick={openCamera}
                          title="Escanear código de barras con cámara"
                          className="flex items-center justify-center w-9 h-9 rounded-md border border-input bg-background hover:border-primary hover:text-primary text-muted-foreground transition-colors flex-shrink-0"
                        >
                          <Camera size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
                    <Input type="number" min={1} value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))} className="h-9 text-center" />
                  </div>
                  <div className="w-40">
                    <label className="text-xs text-muted-foreground mb-1 block">Vencimiento</label>
                    <Input type="date" value={itemExpiry}
                      onChange={(e) => setItemExpiry(e.target.value)} className="h-9" />
                  </div>
                  <div className="w-32">
                    <label className="text-xs text-muted-foreground mb-1 block">Lote</label>
                    <Input value={itemLote} onChange={(e) => setItemLote(e.target.value)}
                      placeholder="Opc." className="h-9" />
                  </div>
                  <Button onClick={handleAddItem} disabled={detailActionLoading || !selectedProducto} className="h-9">
                    <PackagePlus size={14} className="mr-1" /> Guardar
                  </Button>
                </div>
                )}
              </div>
            )}

            {/* ── Sección 2: Comprobante ── */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <FileText size={13} /> Comprobante del proveedor
                </p>
                {selectedRecep.comprobante ? (
                  <span className="text-xs text-green-600 font-semibold">
                    ✓ {(selectedRecep.comprobante as any).tipoComprobante}{' '}
                    {(selectedRecep.comprobante as any).serie}-{(selectedRecep.comprobante as any).numero}
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    <AlertCircle size={12} /> Pendiente
                  </span>
                )}
              </div>

              {selectedRecep.comprobante ? (
                <p className="text-sm text-muted-foreground">El comprobante ya fue registrado.</p>
              ) : isEditable ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                        value={compTipo}
                        onChange={(e) => setCompTipo(e.target.value as TipoComprobanteProveedor)}
                      >
                        <option value="FACTURA">FACTURA</option>
                        <option value="BOLETA">BOLETA</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Serie</label>
                      <Input value={compSerie} onChange={(e) => setCompSerie(e.target.value)}
                        placeholder="F001" className="h-9" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Número</label>
                      <Input value={compNumero} onChange={(e) => setCompNumero(e.target.value)}
                        placeholder="00000001" className="h-9" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">URL (opc.)</label>
                      <Input value={compUrl} onChange={(e) => setCompUrl(e.target.value)}
                        placeholder="https://..." className="h-9" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleSaveComprobante} disabled={savingComp}>
                      <Save size={14} className="mr-1" />
                      {savingComp ? 'Guardando...' : 'Guardar comprobante'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No se registró comprobante.</p>
              )}
            </div>

            {/* ── Acciones finales ── */}
            {isEditable && (
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2 border-t">
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleAnular}
                  disabled={detailActionLoading}
                >
                  <XCircle size={16} className="mr-2" /> Anular recepción
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleConfirmar}
                  disabled={detailActionLoading || !canConfirmRecep}
                >
                  <CheckCircle size={16} className="mr-2" />
                  {detailActionLoading ? 'Procesando...' : 'Confirmar recepción'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        type={confirmDialog.type}
        onConfirm={async () => { if (confirmDialog.action) await confirmDialog.action(); }}
        onCancel={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
      />

      {/* ── Escáner de cámara ─────────────────────────────────────────────── */}
      {showCameraScanner && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <style>{`
            @keyframes scanline-r { 0%,100% { top: 15%; } 50% { top: 80%; } }
            .animate-scanline-r { animation: scanline-r 2s ease-in-out infinite; }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/90 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-primary" />
              <span className="text-sm font-semibold">Escanear producto</span>
            </div>
            <button type="button" onClick={stopCamera}
              className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Visor */}
          <div className="flex-1 relative overflow-hidden">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover"
              playsInline muted autoPlay />

            {!cameraError && (
              <>
                {/* Oscurecimiento alrededor del recuadro */}
                <div className="absolute inset-0 flex flex-col pointer-events-none">
                  <div className="flex-1 bg-black/55" />
                  <div className="flex" style={{ height: 256 }}>
                    <div className="flex-1 bg-black/55" />
                    <div style={{ width: 256 }} />
                    <div className="flex-1 bg-black/55" />
                  </div>
                  <div className="flex-1 bg-black/55" />
                </div>
                {/* Recuadro con esquinas */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative" style={{ width: 256, height: 256 }}>
                    <div className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-primary rounded-tl" />
                    <div className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-primary rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-primary rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-primary rounded-br" />
                    <div className="absolute left-3 right-3 h-0.5 bg-primary/80 animate-scanline-r"
                      style={{ top: '15%' }} />
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
                  <button type="button" onClick={stopCamera}
                    className="px-6 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors">
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
              <button type="button" onClick={stopCamera}
                className="px-10 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
