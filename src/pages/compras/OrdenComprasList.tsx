import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ordenCompraService } from '../../services/ordenCompra.service';
import { proveedorService } from '../../services/proveedor.service';
import { productoService } from '../../services/producto.service';
import type { OrdenCompraDTO, OrdenCompraItemDTO, ProveedorDTO, ProductoDTO } from '../../types';
import { Autocomplete } from '../../components/ui/Autocomplete';
import toast from 'react-hot-toast';
import { notify } from '../../lib/notify';
import { usePermissions } from '../../hooks/usePermissions';
import { useSucursalStore } from '../../store/sucursalStore';
import axiosInstance from '../../api/axios.config';
import { API_ENDPOINTS } from '../../api/endpoints';

const T = {
  bg:'#F6F7F9', surface:'#FFFFFF', surface2:'#F1F3F6', surface3:'#EDF0F4',
  text:'#0F1623', text2:'#4A5568', text3:'#8896A5',
  primary:'#4F6EF7', primarySoft:'#EEF1FE', primaryLine:'#C7D2FC',
  line:'#E4E8EF', lineSoft:'#F0F2F5',
  ok:'#16A34A', okSoft:'#DCFCE7', okLine:'#BBF7D0',
  bad:'#DC2626', badSoft:'#FEE2E2', badLine:'#FECACA',
  warn:'#D97706', warnSoft:'#FEF3C7', warnLine:'#FDE68A',
  shadow:'0 2px 8px -2px rgba(15,22,35,.08)',
};

const FxInput = ({ style: s, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} style={{ width: '100%', height: 44, padding: '0 13px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', ...s }}
    onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; if (p.onFocus) (p.onFocus as React.FocusEventHandler<HTMLInputElement>)(e); }}
    onBlur={e => { e.currentTarget.style.borderColor = (s as React.CSSProperties)?.borderColor ?? T.line; e.currentTarget.style.boxShadow = 'none'; if (p.onBlur) (p.onBlur as React.FocusEventHandler<HTMLInputElement>)(e); }} />
);


if (typeof document !== 'undefined' && !document.getElementById('fx-oc-kf')) {
  const s = document.createElement('style');
  s.id = 'fx-oc-kf';
  s.textContent = `@keyframes fx-in{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}`;
  document.head.appendChild(s);
}

const estadoBadgeStyle = (estado: string): React.CSSProperties => {
  if (estado === 'BORRADOR')         return { background: T.surface3, color: T.text3, border: `1px solid ${T.line}` };
  if (estado === 'ENVIADA')          return { background: T.primarySoft, color: T.primary, border: `1px solid ${T.primaryLine}` };
  if (estado === 'RECIBIDA_PARCIAL') return { background: T.warnSoft, color: T.warn, border: `1px solid ${T.warnLine}` };
  if (estado === 'RECIBIDA')         return { background: T.okSoft, color: T.ok, border: `1px solid ${T.okLine}` };
  if (estado === 'CANCELADA')        return { background: T.badSoft, color: T.bad, border: `1px solid ${T.badLine}` };
  return { background: T.surface3, color: T.text3, border: `1px solid ${T.line}` };
};

type Option = { id: number | string; label: string; subtitle?: string };
type EstadoOCFilter = 'TODOS' | 'BORRADOR' | 'ENVIADA' | 'RECIBIDA_PARCIAL' | 'RECIBIDA' | 'CANCELADA';

export function OrdenComprasList() {
  const navigate = useNavigate();
  const { canCreate, canView, canEdit, puede } = usePermissions();
  const { sucursalActual, sucursales, loaded: sucursalLoaded } = useSucursalStore();
  const isMultiLocal = sucursales.length > 1;
  const sucursalId = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;

  const hasViewPermission = canView('COMPRAS') || canView('PROVEEDORES');
  const canCreateOC = canCreate('COMPRAS');
  const canEditOC = canEdit('COMPRAS');

  const [ordenes, setOrdenes] = useState<OrdenCompraDTO[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoOCFilter>('TODOS');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailActionLoading, setDetailActionLoading] = useState(false);
  const [selectedOcId, setSelectedOcId] = useState<number | null>(null);
  const [selectedOc, setSelectedOc] = useState<OrdenCompraDTO | null>(null);

  const [editObs, setEditObs] = useState(false);
  const [editObsValue, setEditObsValue] = useState('');
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editItemQty, setEditItemQty] = useState<number>(1);
  const [editItemPrice, setEditItemPrice] = useState<number | ''>('');
  const [addProdId, setAddProdId] = useState<number | null>(null);
  const [addQty, setAddQty] = useState<number>(1);
  const [addPrice, setAddPrice] = useState<number | ''>('');
  const [savingEdit, setSavingEdit] = useState(false);

  const descargarPdfOC = async (ocId: number) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.ORDENES_COMPRA.PDF(ocId), {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `OC-${String(ocId).padStart(5, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify.fromError(err, 'No se pudo descargar el PDF de la OC.', { detail: 'Intenta de nuevo o contacta soporte.' });
    }
  };

  const enviarWhatsApp = (oc: OrdenCompraDTO) => {
    const digits = (oc.proveedorTelefono ?? '').replace(/\D/g, '');
    if (!digits) {
      notify.error('Este proveedor no tiene teléfono registrado.', {
        detail: 'Necesitas el número para enviar por WhatsApp.',
        action: { label: 'Ir a Proveedores', fn: () => navigate('/proveedores') },
      });
      return;
    }
    const phone = digits.startsWith('51') ? digits : `51${digits}`;
    const fecha = oc.createdAt ? new Date(oc.createdAt).toLocaleDateString('es-PE') : '';
    const msg = [
      `Estimado proveedor, le enviamos la Orden de Compra N° ${String(oc.id).padStart(5, '0')}${fecha ? ` del ${fecha}` : ''}.`,
      '',
      'Le adjuntamos el PDF con el detalle completo.',
      '',
      'Por favor confirmar disponibilidad y fecha de entrega.',
    ].join('\n');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    toast.success('Recuerda adjuntar el PDF de la OC antes de enviar', { duration: 5000 });
  };

  const [confirmCancel, setConfirmCancel] = useState<{ isOpen: boolean; ocId: number | null; fromDetail: boolean }>({
    isOpen: false, ocId: null, fromDetail: false,
  });

  const [selectedProveedorId, setSelectedProveedorId] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<OrdenCompraItemDTO[]>([]);
  const [selectedProductoId, setSelectedProductoId] = useState<number | null>(null);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number | ''>('');

  useEffect(() => {
    if (!sucursalLoaded) return;
    if (hasViewPermission) {
      fetchData();
    } else if (canCreateOC) {
      fetchFormData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalLoaded, hasViewPermission, sucursalId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter, fechaDesde, fechaHasta]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      const productosData = await productoService.getAll();
      setProductos(productosData);
      if (puede('VER_PROVEEDORES') || puede('CREAR_OC')) {
        const proveedoresData = await proveedorService.getActivos();
        setProveedores(proveedoresData);
      }
    } catch (e) {
      notify.fromError(e, 'No se pudieron cargar productos y proveedores.');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordenesData, productosData] = await Promise.all([
        ordenCompraService.getAll(sucursalId),
        productoService.getAll(),
      ]);
      setOrdenes(ordenesData);
      setProductos(productosData);
      if (puede('VER_PROVEEDORES') || puede('CREAR_OC')) {
        const proveedoresData = await proveedorService.getActivos();
        setProveedores(proveedoresData);
      }
    } catch (e) {
      notify.fromError(e, 'No se pudieron cargar las órdenes de compra.');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const proveedorOptions: Option[] = useMemo(
    () => proveedores.map((p) => ({ id: p.id!, label: p.nombre, subtitle: p.ruc ? `RUC: ${p.ruc}` : undefined })),
    [proveedores]
  );

  const productoOptions: Option[] = useMemo(
    () => productos.map((p) => ({
      id: p.id!,
      label: `${p.nombre}${p.codigoBarras ? ` (${p.codigoBarras})` : ''}`,
      subtitle: p.costoUnitario ? `Último costo: S/. ${p.costoUnitario.toFixed(2)}` : 'Sin costo registrado',
    })),
    [productos]
  );

  const selectedProveedor = useMemo(() => proveedores.find((p) => p.id === selectedProveedorId) ?? null, [proveedores, selectedProveedorId]);
  const selectedProducto = useMemo(() => productos.find((p) => p.id === selectedProductoId) ?? null, [productos, selectedProductoId]);

  const resetCreateForm = () => {
    setSelectedProveedorId(null);
    setObservaciones('');
    setItems([]);
    setSelectedProductoId(null);
    setItemQty(1);
    setItemPrice('');
    setIsCreateOpen(false);
  };

  function diasDesde(fecha?: string | null): number {
    if (!fecha) return 0;
    return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  }

  const stats = useMemo(() => ({
    total: ordenes.length,
    borrador: ordenes.filter((o) => o.estado === 'BORRADOR').length,
    enviada: ordenes.filter((o) => o.estado === 'ENVIADA').length,
    parcial: ordenes.filter((o) => o.estado === 'RECIBIDA_PARCIAL').length,
    recibida: ordenes.filter((o) => o.estado === 'RECIBIDA').length,
    cancelada: ordenes.filter((o) => o.estado === 'CANCELADA').length,
    retrasadas: ordenes.filter((o) => o.estado === 'ENVIADA' && diasDesde(o.createdAt) > 30).length,
  }), [ordenes]);

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

  const filteredOrdenes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return ordenes.filter((o) => {
      const matchesSearch =
        (o.proveedorNombre ?? '').toLowerCase().includes(term) ||
        String(o.id ?? '').includes(term) ||
        (o.estado ?? '').toLowerCase().includes(term);
      if (!matchesSearch) return false;
      if (estadoFilter !== 'TODOS' && o.estado !== estadoFilter) return false;
      if (fechaDesde && o.createdAt) { if (new Date(o.createdAt) < new Date(fechaDesde)) return false; }
      if (fechaHasta && o.createdAt) {
        const to = new Date(fechaHasta); to.setHours(23, 59, 59, 999);
        if (new Date(o.createdAt) > to) return false;
      }
      return true;
    }).sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : (a.id ?? 0);
      const db = b.createdAt ? new Date(b.createdAt).getTime() : (b.id ?? 0);
      return db - da;
    });
  }, [ordenes, searchTerm, estadoFilter, fechaDesde, fechaHasta]);

  const totalPages = Math.ceil(filteredOrdenes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentOrdenes = filteredOrdenes.slice(startIndex, startIndex + itemsPerPage);

  const handleAddCreateItem = () => {
    if (!selectedProducto) { toast.error('Selecciona un producto'); return; }
    if (itemQty <= 0) { toast.error('La cantidad debe ser mayor a 0'); return; }
    const exists = items.find((i) => i.productoId === selectedProducto.id);
    if (exists) { toast.error('El producto ya fue agregado'); return; }
    setItems((prev) => [...prev, {
      productoId: selectedProducto.id!,
      productoNombre: selectedProducto.nombre,
      codigoBarras: selectedProducto.codigoBarras,
      cantidadSolicitada: itemQty,
      precioUnitario: itemPrice !== '' ? Number(itemPrice) : undefined,
    }]);
    setSelectedProductoId(null);
    setItemQty(1);
    setItemPrice('');
  };

  const handleRemoveCreateItem = (productoId: number) => {
    setItems((prev) => prev.filter((i) => i.productoId !== productoId));
  };

  const handleCreateOC = async () => {
    if (!selectedProveedorId) { notify.error('Selecciona un proveedor', { detail: 'Es obligatorio para crear la orden.' }); return; }
    if (items.length === 0) { notify.error('Agrega al menos un producto', { detail: 'La OC debe tener al menos un ítem.' }); return; }
    try {
      setSavingCreate(true);
      await ordenCompraService.create({ proveedorId: selectedProveedorId, estado: 'BORRADOR', observaciones, items });
      toast.success('Orden de compra creada');
      resetCreateForm();
      await fetchData();
    } catch (e) {
      notify.fromError(e, 'No se pudo crear la orden de compra.');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setSavingCreate(false);
    }
  };

  const openDetail = async (ocId: number) => {
    setSelectedOcId(ocId);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await ordenCompraService.getById(ocId);
      setSelectedOc(data);
    } catch (e) {
      notify.fromError(e, 'No se pudo cargar el detalle de la OC.');
      if (import.meta.env.DEV) console.error(e);
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedOcId(null);
    setSelectedOc(null);
    setEditObs(false);
    setEditItemId(null);
    setAddProdId(null);
  };

  const handleSaveObs = async () => {
    if (!selectedOc?.id) return;
    try {
      setSavingEdit(true);
      const updated = await ordenCompraService.editarCabecera(selectedOc.id, editObsValue);
      setSelectedOc(updated);
      setEditObs(false);
      toast.success('Observaciones actualizadas');
    } catch (err) { notify.fromError(err, 'No se pudieron guardar las observaciones.'); }
    finally { setSavingEdit(false); }
  };

  const handleSaveItem = async (itemId: number) => {
    if (!selectedOc?.id) return;
    const item = selectedOc.items?.find((i) => i.id === itemId);
    if (!item) return;
    try {
      setSavingEdit(true);
      const updated = await ordenCompraService.addItem(selectedOc.id, {
        productoId: item.productoId,
        cantidadSolicitada: editItemQty,
        precioUnitario: editItemPrice === '' ? undefined : editItemPrice,
      });
      setSelectedOc(updated);
      setEditItemId(null);
      toast.success('Ítem actualizado');
    } catch (err) { notify.fromError(err, 'No se pudo actualizar el ítem.'); }
    finally { setSavingEdit(false); }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!selectedOc?.id) return;
    try {
      setSavingEdit(true);
      await ordenCompraService.removeItem(selectedOc.id, itemId);
      const updated = await ordenCompraService.getById(selectedOc.id);
      setSelectedOc(updated);
      toast.success('Ítem eliminado');
    } catch (err) { notify.fromError(err, 'No se pudo eliminar el ítem de la OC.'); }
    finally { setSavingEdit(false); }
  };

  const handleAddItem = async () => {
    if (!selectedOc?.id || !addProdId) return;
    try {
      setSavingEdit(true);
      const updated = await ordenCompraService.addItem(selectedOc.id, {
        productoId: addProdId,
        cantidadSolicitada: addQty,
        precioUnitario: addPrice === '' ? undefined : addPrice,
      });
      setSelectedOc(updated);
      setAddProdId(null);
      setAddQty(1);
      setAddPrice('');
      toast.success('Producto agregado');
    } catch (e) {
      notify.fromError(e, 'No se pudo agregar el producto a la OC.');
    } finally { setSavingEdit(false); }
  };

  const handleEnviar = async () => {
    if (!selectedOc?.id) return;
    try {
      setDetailActionLoading(true);
      const updated = await ordenCompraService.enviar(selectedOc.id);
      setSelectedOc(updated);
      toast.success('Orden de compra enviada');
      await fetchData();
    } catch (e) {
      notify.fromError(e, 'No se pudo enviar la OC. Verifica que esté en estado BORRADOR.');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setDetailActionLoading(false);
    }
  };

  const handleCancelar = () => {
    if (!selectedOc?.id) return;
    setConfirmCancel({ isOpen: true, ocId: selectedOc.id, fromDetail: true });
  };

  const ejecutarCancelacion = async (ocId: number, fromDetail: boolean) => {
    try {
      if (fromDetail) setDetailActionLoading(true);
      const updated = await ordenCompraService.cancelar(ocId);
      if (fromDetail) setSelectedOc(updated);
      toast.success(`OC #${ocId} cancelada`);
      await fetchData();
    } catch (e) {
      notify.fromError(e, 'No se pudo cancelar la OC.');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      if (fromDetail) setDetailActionLoading(false);
      setConfirmCancel({ isOpen: false, ocId: null, fromDetail: false });
    }
  };

  const pendienteTotal = (oc: OrdenCompraDTO) =>
    (oc.items ?? []).reduce((acc, it) => {
      const recibido = it.cantidadRecibida ?? 0;
      return acc + Math.max(0, it.cantidadSolicitada - recibido);
    }, 0);

  const subtotalOC = (oc: OrdenCompraDTO) =>
    (oc.items ?? []).reduce((acc, it) => acc + (it.precioUnitario ?? 0) * (it.cantidadSolicitada ?? 0), 0);

  // ── Shared styles ─────────────────────────────────────────────────────────
  const btn = (variant: 'primary' | 'outline' | 'ghost' | 'danger' | 'ok', small = false): React.CSSProperties => {
    const h = small ? 34 : 42;
    const px = small ? 14 : 18;
    const base: React.CSSProperties = { height: h, padding: `0 ${px}px`, borderRadius: 10, fontFamily: 'Inter,sans-serif', fontSize: small ? '.82rem' : '.9rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', transition: 'opacity .15s' };
    if (variant === 'primary') return { ...base, background: T.primary, color: '#fff' };
    if (variant === 'outline') return { ...base, background: T.surface, color: T.text2, border: `1px solid ${T.line}` };
    if (variant === 'ghost')   return { ...base, background: 'transparent', color: T.text2 };
    if (variant === 'danger')  return { ...base, background: T.badSoft, color: T.bad, border: `1px solid ${T.badLine}` };
    if (variant === 'ok')      return { ...base, background: T.ok, color: '#fff' };
    return base;
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em',
    textTransform: 'uppercase', color: T.text3, background: T.surface2,
    borderBottom: `1px solid ${T.line}`, whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '12px 14px', fontSize: '.88rem', color: T.text, borderBottom: `1px solid ${T.lineSoft}`,
  };

  const badge = (style: React.CSSProperties, text: string) => (
    <span style={{ ...style, display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600 }}>{text}</span>
  );

  // ── Loading / No access ───────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontFamily: 'Inter,sans-serif', color: T.text3 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2.2" style={{ marginRight: 10 }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
      </svg>
      Cargando…
    </div>
  );

  if (!hasViewPermission) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, gap: 10, fontFamily: 'Inter,sans-serif' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
      <p style={{ fontSize: '1rem', fontWeight: 600, color: T.text }}>Sin acceso</p>
      <p style={{ fontSize: '.88rem', color: T.text3 }}>No tienes permisos para ver el listado de órdenes de compra.</p>
    </div>
  );

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', color: T.text }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: T.text, letterSpacing: '-.02em' }}>Órdenes de Compra</h1>
          <p style={{ margin: '3px 0 0', fontSize: '.9rem', color: T.text3 }}>Crea, envía y recepciona compras a tus proveedores</p>
        </div>
        {canCreateOC && (
          <button style={btn('primary')} onClick={() => setIsCreateOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Nueva OC
          </button>
        )}
      </div>

      {/* ── Alerta retrasadas ────────────────────────────────────────────────── */}
      {stats.retrasadas > 0 && (
        <div style={{ background: T.warnSoft, border: `1px solid ${T.warnLine}`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.warn} strokeWidth="2"><path d="m10.29 3.86-8.17 14.14A2 2 0 0 0 3.88 21h16.24a2 2 0 0 0 1.76-2.95L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <p style={{ margin: 0, fontSize: '.88rem', fontWeight: 500, color: T.warn }}>
            {stats.retrasadas} orden{stats.retrasadas > 1 ? 'es' : ''} enviada{stats.retrasadas > 1 ? 's' : ''} lleva{stats.retrasadas === 1 ? '' : 'n'} más de 30 días sin recepción.
          </p>
        </div>
      )}

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Borradores', value: stats.borrador, sub: 'Aún no enviadas', color: T.text3, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
          { label: 'Enviadas', value: stats.enviada, sub: 'Esperando recepción', color: T.primary, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.8"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
          { label: 'Recibidas', value: stats.recibida, sub: 'Recibidas al 100%', color: T.ok, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ok} strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          { label: 'Canceladas', value: stats.cancelada, sub: 'Canceladas', color: T.bad, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.bad} strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: '16px 18px', boxShadow: T.shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3 }}>{s.label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: T.surface2, display: 'grid', placeItems: 'center' }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <p style={{ margin: '4px 0 0', fontSize: '.75rem', color: T.text3 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main card ────────────────────────────────────────────────────────── */}
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>

        {/* Filters row */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}`, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <FxInput
              placeholder="Buscar por proveedor, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          {/* Filter btn */}
          <button
            onClick={() => setShowFilterDrawer(true)}
            style={{ height: 44, padding: '0 16px', borderRadius: 10, border: `1px solid ${activeFiltersCount > 0 ? T.primary : T.line}`, background: activeFiltersCount > 0 ? T.primarySoft : T.surface, color: activeFiltersCount > 0 ? T.primary : T.text2, fontFamily: 'Inter,sans-serif', fontSize: '.88rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
            Filtros
            {activeFiltersCount > 0 && (
              <span style={{ width: 20, height: 20, borderRadius: 10, background: T.primary, color: '#fff', fontSize: '.7rem', fontWeight: 700, display: 'grid', placeItems: 'center' }}>{activeFiltersCount}</span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {activeFiltersCount > 0 && (
          <div style={{ padding: '8px 20px', borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {estadoFilter !== 'TODOS' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, background: T.primarySoft, color: T.primary, border: `1px solid ${T.primaryLine}` }}>
                {estadoFilter}
                <button onClick={() => setEstadoFilter('TODOS')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.primary, padding: 0, lineHeight: 1, marginLeft: 2 }}>×</button>
              </span>
            )}
            {fechaDesde && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, background: T.primarySoft, color: T.primary, border: `1px solid ${T.primaryLine}` }}>
                Desde {fechaDesde}
                <button onClick={() => setFechaDesde('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.primary, padding: 0, lineHeight: 1, marginLeft: 2 }}>×</button>
              </span>
            )}
            {fechaHasta && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, background: T.primarySoft, color: T.primary, border: `1px solid ${T.primaryLine}` }}>
                Hasta {fechaHasta}
                <button onClick={() => setFechaHasta('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.primary, padding: 0, lineHeight: 1, marginLeft: 2 }}>×</button>
              </span>
            )}
            <button onClick={limpiarFiltros} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.75rem', color: T.text3, textDecoration: 'underline', fontFamily: 'Inter,sans-serif' }}>Limpiar todo</button>
          </div>
        )}

        {/* Table */}
        {filteredOrdenes.length === 0 ? (
          <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.line} strokeWidth="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: T.text2 }}>{searchTerm ? 'Sin resultados' : 'Todavía no hay órdenes de compra'}</p>
            <p style={{ margin: 0, fontSize: '.85rem', color: T.text3, textAlign: 'center', maxWidth: 400 }}>{searchTerm ? 'No se encontraron órdenes que coincidan con la búsqueda.' : 'Crea tu primera OC para solicitar productos a un proveedor y llevar trazabilidad de cada compra.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['ID', 'Proveedor', 'Estado', 'Días', 'Pendiente', 'Subtotal', 'Fecha', ''].map((h, i) => (
                    <th key={h || i} style={{ ...thStyle, textAlign: i >= 3 ? 'center' : 'left', ...(i === 5 || i === 7 ? { textAlign: 'right' } : {}) }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentOrdenes.map((oc) => {
                  const pendiente = pendienteTotal(oc);
                  const subtotal = subtotalOC(oc);
                  const dias = diasDesde(oc.createdAt);
                  const retrasada = oc.estado === 'ENVIADA' && dias > 30;
                  return (
                    <tr key={oc.id} style={{ background: retrasada ? T.warnSoft : T.surface }}
                      onMouseEnter={e => (e.currentTarget.style.background = retrasada ? T.warnSoft : T.surface3)}
                      onMouseLeave={e => (e.currentTarget.style.background = retrasada ? T.warnSoft : T.surface)}>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
                          #{oc.id}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 500 }}>{oc.proveedorNombre || `Proveedor #${oc.proveedorId}`}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '.76rem', color: T.text3 }}>{oc.items?.length ?? 0} item(s)</p>
                        </div>
                      </td>
                      <td style={tdStyle}>{badge(estadoBadgeStyle(oc.estado), oc.estado)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {oc.createdAt ? (
                          <span style={{ fontSize: '.82rem', color: retrasada ? T.warn : T.text3, fontWeight: retrasada ? 600 : 400, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            {retrasada && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.warn} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                            {dias}d
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{ fontWeight: 600, color: pendiente > 0 ? T.warn : T.ok }}>{pendiente}</span>
                        <span style={{ fontSize: '.75rem', color: T.text3, marginLeft: 3 }}>u</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        {subtotal > 0 ? `S/. ${subtotal.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: T.text3 }}>
                        {oc.createdAt ? new Date(oc.createdAt).toLocaleDateString('es-PE') : '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          {(oc.estado === 'BORRADOR' || oc.estado === 'ENVIADA') && canEditOC && (
                            <button
                              style={{ ...btn('ghost', true), color: T.bad, padding: '0 8px' }}
                              title="Cancelar OC"
                              onClick={(e) => { e.stopPropagation(); setConfirmCancel({ isOpen: true, ocId: oc.id!, fromDetail: false }); }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            </button>
                          )}
                          <button style={btn('outline', true)} onClick={() => openDetail(oc.id!)}>Ver detalle</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: '.82rem', color: T.text3 }}>{filteredOrdenes.length} resultado{filteredOrdenes.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ ...btn('outline', true), opacity: currentPage === 1 ? .4 : 1, padding: '0 12px' }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)}
                  style={{ ...btn(p === currentPage ? 'primary' : 'outline', true), minWidth: 34, padding: '0 10px' }}>{p}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ ...btn('outline', true), opacity: currentPage === totalPages ? .4 : 1, padding: '0 12px' }}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Filter drawer backdrop ────────────────────────────────────────────── */}
      {showFilterDrawer && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,22,35,.5)', zIndex: 35 }} onClick={() => setShowFilterDrawer(false)} />,
        document.body
      )}

      {/* ── Filter drawer panel ──────────────────────────────────────────────── */}
      {createPortal(
        <div style={{
          position: 'fixed', right: 0, top: 64, width: 300, zIndex: 50,
          display: 'flex', flexDirection: 'column',
          background: '#0f1117', border: '1px solid rgba(255,255,255,.08)',
          borderRadius: '16px 0 0 16px', boxShadow: '0 8px 40px rgba(0,0,0,.4)',
          height: 'calc(100vh - 7rem)',
          transform: showFilterDrawer ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              <span style={{ fontWeight: 600, fontSize: '.9rem', color: '#fff', fontFamily: 'Inter,sans-serif' }}>Filtros</span>
              {activeFiltersCount > 0 && <span style={{ background: T.primary, color: '#fff', fontSize: '.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>{activeFiltersCount}</span>}
            </div>
            <button onClick={() => setShowFilterDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 4, lineHeight: 1, fontSize: '1.1rem' }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'Inter,sans-serif' }}>
            {/* Fechas */}
            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '14px 14px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '.7rem', fontWeight: 650, letterSpacing: '.06em', textTransform: 'uppercase', color: '#666' }}>Rango de fechas</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['Desde', fechaDesde, setFechaDesde], ['Hasta', fechaHasta, setFechaHasta]].map(([lbl, val, setter]) => (
                  <div key={lbl as string}>
                    <label style={{ fontSize: '.75rem', color: '#555', display: 'block', marginBottom: 4 }}>{lbl as string}</label>
                    <input type="date" value={val as string} onChange={(e) => (setter as any)(e.target.value)}
                      style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.06)', color: '#ddd', fontSize: '.85rem', padding: '0 10px', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter,sans-serif' }} />
                  </div>
                ))}
              </div>
            </div>
            {/* Estado */}
            <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '14px 14px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '.7rem', fontWeight: 650, letterSpacing: '.06em', textTransform: 'uppercase', color: '#666' }}>Estado</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {([
                  { key: 'TODOS', label: 'Todos' },
                  { key: 'BORRADOR', label: 'Borrador' },
                  { key: 'ENVIADA', label: 'Enviada' },
                  { key: 'RECIBIDA_PARCIAL', label: 'Parcial' },
                  { key: 'RECIBIDA', label: 'Recibida' },
                  { key: 'CANCELADA', label: 'Cancelada' },
                ] as Array<{ key: EstadoOCFilter; label: string }>).map((t) => (
                  <button key={t.key} onClick={() => setEstadoFilter(t.key)}
                    style={{ padding: '8px 10px', borderRadius: 8, fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: estadoFilter === t.key ? `1px solid ${T.primary}` : '1px solid rgba(255,255,255,.1)', background: estadoFilter === t.key ? `${T.primary}25` : 'rgba(255,255,255,.04)', color: estadoFilter === t.key ? T.primary : '#888' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={limpiarFiltros} style={{ flex: 1, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#888', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>Limpiar</button>
            <button onClick={() => setShowFilterDrawer(false)} style={{ flex: 1, height: 36, borderRadius: 10, background: T.primary, border: 'none', color: '#fff', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
              Ver {filteredOrdenes.length} resultado{filteredOrdenes.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Detail modal ──────────────────────────────────────────────────────── */}
      {isDetailOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,22,35,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
          onClick={closeDetail}>
          <div style={{ background: T.surface, borderRadius: 18, boxShadow: '0 8px 40px rgba(15,22,35,.18)', width: '100%', maxWidth: 820, animation: 'fx-in .18s ease both', fontFamily: 'Inter,sans-serif' }}
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: T.text }}>{selectedOcId ? `Orden de Compra #${selectedOcId}` : 'Orden de Compra'}</h2>
                <p style={{ margin: '2px 0 0', fontSize: '.82rem', color: T.text3 }}>Detalle de la orden y acciones</p>
              </div>
              <button onClick={closeDetail} style={{ background: T.surface2, border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', color: T.text2 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {detailLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: T.text3 }}>Cargando…</div>
              ) : !selectedOc ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: T.text3 }}>No se pudo cargar la OC</div>
              ) : (
                <>
                  {/* Header info */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '.75rem', color: T.text3 }}>Proveedor</p>
                      <p style={{ margin: '2px 0 0', fontWeight: 600, color: T.text }}>{selectedOc.proveedorNombre || `#${selectedOc.proveedorId}`}</p>
                    </div>
                    {badge(estadoBadgeStyle(selectedOc.estado), selectedOc.estado)}
                    <div>
                      <p style={{ margin: 0, fontSize: '.75rem', color: T.text3 }}>Pendiente total</p>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, color: pendienteTotal(selectedOc) > 0 ? T.warn : T.ok }}>{pendienteTotal(selectedOc)} unidades</p>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3 }}>Observaciones</span>
                      {selectedOc.estado === 'BORRADOR' && canEditOC && !editObs && (
                        <button onClick={() => { setEditObsValue(selectedOc.observaciones ?? ''); setEditObs(true); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', color: T.primary, fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Editar
                        </button>
                      )}
                    </div>
                    {editObs ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <FxInput value={editObsValue} onChange={(e) => setEditObsValue(e.target.value)} placeholder="Observaciones..." style={{ height: 36, flex: 1 }} />
                        <button onClick={handleSaveObs} disabled={savingEdit} style={btn('primary', true)}>✓</button>
                        <button onClick={() => setEditObs(false)} style={btn('outline', true)}>✕</button>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '.88rem', color: selectedOc.observaciones ? T.text2 : T.text3, fontStyle: selectedOc.observaciones ? 'normal' : 'italic' }}>
                        {selectedOc.observaciones || 'Sin observaciones'}
                      </p>
                    )}
                  </div>

                  {/* Items table */}
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3 }}>Productos</p>
                    <div style={{ border: `1px solid ${T.line}`, borderRadius: 10, overflow: 'hidden', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['Producto', 'Código', 'Solicitado', 'Recibido', 'Pendiente', 'Precio unit.', ...(selectedOc.estado === 'BORRADOR' && canEditOC ? [''] : [])].map((h, i) => (
                              <th key={h || i} style={{ ...thStyle, textAlign: i >= 2 ? 'center' : 'left', ...(i === 5 ? { textAlign: 'right' } : {}) }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedOc.items ?? []).map((it, idx) => {
                            const recibido = it.cantidadRecibida ?? 0;
                            const pendiente = Math.max(0, it.cantidadSolicitada - recibido);
                            const isEditing = editItemId === it.id;
                            return (
                              <tr key={it.id ?? idx}>
                                <td style={{ ...tdStyle, fontWeight: 500 }}>{it.productoNombre || `#${it.productoId}`}</td>
                                <td style={{ ...tdStyle, fontSize: '.78rem', color: T.text3 }}>{it.codigoBarras || '—'}</td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                  {isEditing ? (
                                    <FxInput type="number" min={1} value={editItemQty} onChange={(e) => setEditItemQty(Number(e.target.value))} style={{ width: 70, height: 32, textAlign: 'center' }} />
                                  ) : it.cantidadSolicitada}
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center', color: T.ok }}>{recibido}</td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                  <span style={{ color: pendiente > 0 ? T.warn : T.ok, fontWeight: 500 }}>{pendiente}</span>
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                  {isEditing ? (
                                    <FxInput type="number" min={0} step={0.01} value={editItemPrice} onChange={(e) => setEditItemPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Precio" style={{ width: 90, height: 32, textAlign: 'right' }} />
                                  ) : it.precioUnitario != null ? `S/. ${Number(it.precioUnitario).toFixed(2)}` : '—'}
                                </td>
                                {selectedOc.estado === 'BORRADOR' && canEditOC && (
                                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                                    {isEditing ? (
                                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                        <button onClick={() => it.id && handleSaveItem(it.id)} disabled={savingEdit} style={btn('primary', true)}>✓</button>
                                        <button onClick={() => setEditItemId(null)} style={btn('ghost', true)}>✕</button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                        <button onClick={() => { setEditItemId(it.id ?? null); setEditItemQty(it.cantidadSolicitada); setEditItemPrice(it.precioUnitario ?? ''); }} style={btn('ghost', true)} title="Editar">
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        </button>
                                        <button onClick={() => it.id && handleRemoveItem(it.id)} disabled={savingEdit} style={btn('ghost', true)} title="Quitar">
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.bad} strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add product — BORRADOR only */}
                  {selectedOc.estado === 'BORRADOR' && canEditOC && (
                    <div style={{ border: `1px dashed ${T.line}`, borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ margin: '0 0 10px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3 }}>+ Agregar producto</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <Autocomplete
                            options={productos.filter((p) => !(selectedOc.items ?? []).some((i) => i.productoId === p.id)).map((p) => ({ id: p.id!, label: p.nombre, subtitle: p.codigoBarras ?? undefined }))}
                            value={addProdId ? { id: addProdId, label: productos.find((p) => p.id === addProdId)?.nombre ?? '' } : null}
                            onChange={(opt) => setAddProdId(opt ? Number(opt.id) : null)}
                            placeholder="Buscar producto..."
                            emptyMessage="Sin resultados"
                          />
                        </div>
                        <div style={{ width: 90 }}>
                          <label style={{ fontSize: '.75rem', color: T.text3, display: 'block', marginBottom: 4 }}>Cant.</label>
                          <FxInput type="number" min={1} value={addQty} onChange={(e) => setAddQty(Number(e.target.value))} style={{ height: 38, textAlign: 'center' }} />
                        </div>
                        <div style={{ width: 110 }}>
                          <label style={{ fontSize: '.75rem', color: T.text3, display: 'block', marginBottom: 4 }}>Precio unit.</label>
                          <FxInput type="number" min={0} step={0.01} value={addPrice} onChange={(e) => setAddPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="S/. 0.00" style={{ height: 38 }} />
                        </div>
                        <button onClick={handleAddItem} disabled={!addProdId || addQty < 1 || savingEdit} style={{ ...btn('primary', true), alignSelf: 'flex-end' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                          Agregar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Banner recepciones */}
                  {(selectedOc.estado === 'ENVIADA' || selectedOc.estado === 'RECIBIDA_PARCIAL') && (
                    <div style={{ background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.88rem', color: T.primary }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                        <span>{selectedOc.estado === 'RECIBIDA_PARCIAL' ? 'Recepción parcial — quedan unidades pendientes.' : 'OC enviada — registra la llegada de la mercadería en Recepciones.'}</span>
                      </div>
                      <button style={btn('outline', true)} onClick={() => { closeDetail(); navigate('/dashboard/recepciones'); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                        Ir a Recepciones
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button style={btn('outline')} onClick={() => selectedOc?.id != null && descargarPdfOC(selectedOc.id)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.bad} strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Descargar PDF
                      </button>
                      <button style={{ ...btn('outline'), color: '#16a34a', borderColor: '#bbf7d0' }} onClick={() => enviarWhatsApp(selectedOc)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Enviar por WhatsApp
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(selectedOc.estado === 'BORRADOR' || selectedOc.estado === 'ENVIADA') && canEditOC && (
                        <button style={btn('danger')} onClick={handleCancelar} disabled={detailActionLoading}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                          Cancelar OC
                        </button>
                      )}
                      {selectedOc.estado === 'BORRADOR' && canEditOC && (
                        <button style={btn('primary')} onClick={handleEnviar} disabled={detailActionLoading || (selectedOc.items ?? []).length === 0}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                          {detailActionLoading ? 'Enviando...' : 'Enviar OC'}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Create modal ──────────────────────────────────────────────────────── */}
      {isCreateOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,22,35,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
          onClick={resetCreateForm}>
          <div style={{ background: T.surface, borderRadius: 18, boxShadow: '0 8px 40px rgba(15,22,35,.18)', width: '100%', maxWidth: 820, animation: 'fx-in .18s ease both', fontFamily: 'Inter,sans-serif' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: T.text }}>Nueva Orden de Compra</h2>
                <p style={{ margin: '2px 0 0', fontSize: '.82rem', color: T.text3 }}>Crea una orden de compra (borrador) para tu proveedor</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ ...estadoBadgeStyle('BORRADOR'), display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600 }}>BORRADOR</span>
                <button onClick={resetCreateForm} style={{ background: T.surface2, border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', color: T.text2 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Datos generales */}
              <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: '16px 18px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '.9rem', fontWeight: 600, color: T.text }}>Datos generales</p>
                <p style={{ margin: '0 0 14px', fontSize: '.82rem', color: T.text3 }}>Proveedor y nota interna.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: '.82rem', fontWeight: 600, color: T.text2, display: 'block', marginBottom: 6 }}>Proveedor <span style={{ color: T.bad }}>*</span></label>
                    <Autocomplete
                      options={proveedorOptions}
                      value={selectedProveedor ? { id: selectedProveedor.id!, label: selectedProveedor.nombre, subtitle: selectedProveedor.ruc ? `RUC: ${selectedProveedor.ruc}` : undefined } : null}
                      onChange={(opt) => setSelectedProveedorId(opt ? Number(opt.id) : null)}
                      placeholder="Buscar proveedor..."
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '.82rem', fontWeight: 600, color: T.text2, display: 'block', marginBottom: 6 }}>Observaciones</label>
                    <FxInput value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Observaciones opcionales..." />
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div style={{ background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: '.9rem', fontWeight: 600, color: T.text }}>Productos</p>
                    <p style={{ margin: 0, fontSize: '.82rem', color: T.text3 }}>Agrega items a la orden.</p>
                  </div>
                  <span style={{ fontSize: '.8rem', color: T.text3, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    {items.length} item(s)
                  </span>
                </div>

                {/* Add row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', marginBottom: 14 }}>
                  <div style={{ flex: '1 1 220px' }}>
                    <label style={{ fontSize: '.75rem', color: T.text3, display: 'block', marginBottom: 4 }}>Producto</label>
                    <Autocomplete
                      options={productoOptions}
                      value={selectedProducto ? { id: selectedProducto.id!, label: `${selectedProducto.nombre}${selectedProducto.codigoBarras ? ` (${selectedProducto.codigoBarras})` : ''}` } : null}
                      onChange={(opt) => {
                        const id = opt ? Number(opt.id) : null;
                        setSelectedProductoId(id);
                        if (id) {
                          const prod = productos.find((p) => p.id === id);
                          setItemPrice(prod?.costoUnitario ? prod.costoUnitario : '');
                        } else {
                          setItemPrice('');
                        }
                      }}
                      placeholder="Buscar producto..."
                    />
                  </div>
                  <div style={{ width: 90 }}>
                    <label style={{ fontSize: '.75rem', color: T.text3, display: 'block', marginBottom: 4 }}>Cant.</label>
                    <FxInput type="number" min={1} value={itemQty} onChange={(e) => setItemQty(Number(e.target.value))} style={{ height: 40, textAlign: 'center' }} />
                  </div>
                  <div style={{ width: 130 }}>
                    <label style={{ fontSize: '.75rem', color: T.text3, display: 'block', marginBottom: 4 }}>
                      Precio compra (S/.)
                      {selectedProducto?.costoUnitario != null && (
                        <span style={{ marginLeft: 5, color: T.primary }}>· último: {selectedProducto.costoUnitario.toFixed(2)}</span>
                      )}
                    </label>
                    <FxInput type="number" min={0} step="0.01" value={itemPrice} onChange={(e) => setItemPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00" style={{ height: 40 }} />
                  </div>
                  <button style={{ ...btn('outline'), height: 40, alignSelf: 'flex-end' }} onClick={handleAddCreateItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                    Agregar
                  </button>
                </div>

                {/* Items table */}
                {items.length > 0 ? (
                  <div style={{ border: `1px solid ${T.line}`, borderRadius: 10, overflow: 'hidden', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Producto', 'Cantidad', 'Precio unit.', 'Subtotal', ''].map((h, i) => (
                            <th key={h || i} style={{ ...thStyle, textAlign: i >= 1 ? 'right' : 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => {
                          const sub = (it.precioUnitario ?? 0) * (it.cantidadSolicitada ?? 0);
                          return (
                            <tr key={it.productoId}>
                              <td style={{ ...tdStyle, fontWeight: 500 }}>{it.productoNombre}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>{it.cantidadSolicitada}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>{it.precioUnitario != null ? `S/. ${it.precioUnitario.toFixed(2)}` : '—'}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{it.precioUnitario != null ? `S/. ${sub.toFixed(2)}` : '—'}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>
                                <button onClick={() => handleRemoveCreateItem(it.productoId)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', color: T.bad, fontFamily: 'Inter,sans-serif' }}>Quitar</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ border: `1px dashed ${T.line}`, borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '.88rem', color: T.text3 }}>Aún no agregas productos. Usa el buscador para añadir items.</p>
                  </div>
                )}

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 2px', fontSize: '.75rem', color: T.text3 }}>Total estimado</p>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: T.text }}>
                      S/. {items.reduce((acc, it) => acc + (it.precioUnitario ?? 0) * (it.cantidadSolicitada ?? 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
                <button style={btn('outline')} onClick={resetCreateForm}>Cancelar</button>
                <button style={btn('primary')} onClick={handleCreateOC} disabled={savingCreate}>
                  {savingCreate ? 'Guardando...' : 'Guardar borrador'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Confirm cancel modal ──────────────────────────────────────────────── */}
      {confirmCancel.isOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(15,22,35,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setConfirmCancel({ isOpen: false, ocId: null, fromDetail: false })}>
          <div style={{ background: T.surface, borderRadius: 16, boxShadow: '0 8px 40px rgba(15,22,35,.2)', width: '100%', maxWidth: 420, padding: '24px', animation: 'fx-in .18s ease both', fontFamily: 'Inter,sans-serif' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: T.badSoft, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.bad} strokeWidth="2"><path d="m10.29 3.86-8.17 14.14A2 2 0 0 0 3.88 21h16.24a2 2 0 0 0 1.76-2.95L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: T.text }}>Cancelar OC #{confirmCancel.ocId}</h3>
                <p style={{ margin: 0, fontSize: '.88rem', color: T.text3 }}>¿Estás seguro? Esta acción no se puede deshacer y la orden quedará cancelada.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btn('outline')} onClick={() => setConfirmCancel({ isOpen: false, ocId: null, fromDetail: false })}>No, volver</button>
              <button style={btn('danger')} onClick={() => confirmCancel.ocId && ejecutarCancelacion(confirmCancel.ocId, confirmCancel.fromDetail)}>Sí, cancelar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
