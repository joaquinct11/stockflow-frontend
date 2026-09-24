import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ventaService } from '../../services/venta.service';
import { productoService } from '../../services/producto.service';
import { cajaService } from '../../services/caja.service';
import { facturacionService } from '../../services/facturacion.service';
import { clienteService } from '../../services/cliente.service';
import type { ClienteDTO } from '../../services/cliente.service';
import type {
  VentaDTO,
  ProductoDTO,
  EmitirComprobanteRequest,
  EmitirComprobanteForm,
  ComprobanteDTO,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import {
  Trash2,
  ShoppingCart,
  Search,
  Eye,
  User,
  Calendar,
  FileText,
  X,
  FileSpreadsheet,
  FileDown,
  RotateCcw,
  RefreshCw,
  SlidersHorizontal,
  Printer,
  Plus,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { printVentaTicket } from '../../utils/printTicket';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { usePermissions } from '../../hooks/usePermissions';
import { exportarVentasExcel, exportarVentasPDF } from '../../utils/reportes-export';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { useSucursalStore } from '../../store/sucursalStore';
import { DevolucionModal } from '../../components/ventas/DevolucionModal';

const IGV_RATE = 0.18;
type MetodoPagoFilter = 'TODOS' | 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';
type EstadoVentaFilter = 'TODOS' | 'COMPLETADA' | 'ANULADA' | 'DEVUELTA' | 'DEVUELTA_PARCIAL';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function VentasList() {
  const { userId } = useCurrentUser();
  const navigate = useNavigate();
  const { canDelete, canViewAll, canViewOwn, canCreate, rol, puede } = usePermissions();
  const { config: negocioConfig } = useTenantConfigStore();
  const esServicios = negocioConfig?.rubro === 'EMPRESA_SERVICIOS';
  const { sucursalActual, sucursales, loaded: sucursalLoaded } = useSucursalStore();
  const isMultiLocal = sucursales.length > 1;

  // ── Estado dialog "Registrar Servicio" (solo rubro dealer) ──────────────────
  const [registrarOpen, setRegistrarOpen] = useState(false);
  const [registrarSaving, setRegistrarSaving] = useState(false);
  const [cajaActivaServicio, setCajaActivaServicio] = useState<{ id: number } | null>(null);
  const [registrarForm, setRegistrarForm] = useState({
    servicioId: 0,
    precioUnitario: 0,
    cantidad: 1,
    clienteId: 0,
    metodoPago: 'EFECTIVO',
  });
  // Buscador de servicios
  const [servicioSearch, setServicioSearch] = useState('');
  const [servicioNombre, setServicioNombre] = useState('');
  const [showServiciosList, setShowServiciosList] = useState(false);
  // Cliente manual (DNI/RUC sin estar en la BD)
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteManual, setClienteManual] = useState({ tipoDoc: 'DNI', numDoc: '', nombre: '' });
  const [usarManual, setUsarManual] = useState(false);

  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [comprobantes, setComprobantes] = useState<ComprobanteDTO[]>([]);
  const [clientes, setClientes] = useState<ClienteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenta, setSelectedVenta] = useState<VentaDTO | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ filtros
  const [metodoPagoFilter, setMetodoPagoFilter] = useState<MetodoPagoFilter>('TODOS');
  const [estadoVentaFilter, setEstadoVentaFilter] = useState<EstadoVentaFilter>('TODOS');

  const defaultFechaDesde = (() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  })();
  const defaultFechaHasta = new Date().toISOString().slice(0, 10);
  // draft: lo que el usuario está editando en el drawer (no dispara fetch)
  const [fechaDesde, setFechaDesde] = useState(defaultFechaDesde);
  const [fechaHasta, setFechaHasta] = useState(defaultFechaHasta);
  // applied: lo que se envía a la API (se actualiza solo al confirmar o limpiar)
  const [appliedFechaDesde, setAppliedFechaDesde] = useState(defaultFechaDesde);
  const [appliedFechaHasta, setAppliedFechaHasta] = useState(defaultFechaHasta);

  const [devolucionVenta, setDevolucionVenta] = useState<VentaDTO | null>(null);
  const [showDevolucion, setShowDevolucion] = useState(false);

  // ── Ticket dialog ────────────────────────────────────────────────────────────
  const [ticketVenta, setTicketVenta] = useState<VentaDTO | null>(null);
  const [ticketDni, setTicketDni]     = useState('');
  const [ticketNombre, setTicketNombre] = useState('');

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'info' as 'warning' | 'danger' | 'success' | 'info',
    title: '',
    description: '',
    confirmText: '',
    action: null as (() => Promise<void>) | null,
  });

  // ── Modal dedicado de anulación ──────────────────────────────────────────
  const [anularVenta, setAnularVenta] = useState<VentaDTO | null>(null);
  const [anularMotivo, setAnularMotivo] = useState('');
  const [anularSubmitting, setAnularSubmitting] = useState(false);

  const emptyForm = (): EmitirComprobanteForm => ({
    ventaId: 0,
    tipo: 'BOLETA',
    receptor: {
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      razonSocial: '',
      direccion: '',
    },
  });

  // Emitir comprobante desde detalle de venta
  const canEmitirComprobante = puede('EMITIR_COMPROBANTE') || puede('CREAR_VENTA');
  const [isEmitirComprobanteOpen, setIsEmitirComprobanteOpen] = useState(false);
  const [emitirForm, setEmitirForm] = useState<EmitirComprobanteForm>(emptyForm());
  const [emitirSubmitting, setEmitirSubmitting] = useState(false);
  const [emitirClienteEncontrado, setEmitirClienteEncontrado] = useState<ClienteDTO | null>(null);
  const [emitirBuscando, setEmitirBuscando] = useState(false);

  // Búsqueda debounced por documento en el modal Emitir Comprobante
  useEffect(() => {
    if (!isEmitirComprobanteOpen) return;
    const doc = emitirForm.receptor?.numeroDocumento?.trim() ?? '';
    if (doc.length < 6) {
      setEmitirClienteEncontrado(null);
      return;
    }
    const t = setTimeout(async () => {
      setEmitirBuscando(true);
      try {
        const resultados = await clienteService.buscarPorDocumento(doc);
        const encontrado = resultados[0] ?? null;
        setEmitirClienteEncontrado(encontrado);
        if (encontrado) {
          setEmitirForm(prev => ({
            ...prev,
            receptor: {
              ...prev.receptor,
              tipoDocumento: (encontrado.tipoDocumento as 'DNI' | 'RUC') ?? prev.receptor?.tipoDocumento ?? 'DNI',
              razonSocial: encontrado.nombre ?? prev.receptor?.razonSocial ?? '',
              direccion: prev.receptor?.direccion || encontrado.direccion || '',
            },
          }));
        }
      } catch {
        setEmitirClienteEncontrado(null);
      } finally {
        setEmitirBuscando(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [emitirForm.receptor?.numeroDocumento, emitirForm.tipo, isEmitirComprobanteOpen]);

  useEffect(() => {
    if (!sucursalLoaded || !userId) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalLoaded, userId, rol, sucursalActual?.id, appliedFechaDesde, appliedFechaHasta]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fechaDesde, fechaHasta, metodoPagoFilter, estadoVentaFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const hasViewPermission = canViewAll('VENTAS') || canViewOwn('VENTAS');

      const sucId = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;
      const desde = appliedFechaDesde || defaultFechaDesde;
      const hasta = appliedFechaHasta || defaultFechaHasta;
      const inicioISO = new Date(desde + 'T00:00:00').toISOString().slice(0, 19);
      const finISO    = new Date(hasta + 'T23:59:59').toISOString().slice(0, 19);
      const ventasPromise = (() => {
        if (canViewAll('VENTAS')) return ventaService.getByPeriod(inicioISO, finISO, sucId);
        if (canViewOwn('VENTAS')) return ventaService.getByVendorAndPeriod(userId!, inicioISO, finISO);
        return Promise.resolve([] as VentaDTO[]);
      })();

      const productosPromise =
        hasViewPermission ? productoService.getAll(isMultiLocal && sucursalActual ? sucursalActual.id : undefined) : Promise.resolve([] as ProductoDTO[]);

      const comprobantesPromise = facturacionService.listComprobantes().catch(() => [] as ComprobanteDTO[]);
      const clientesPromise = clienteService.getActivos().catch(() => [] as ClienteDTO[]);

      const [ventasData, productosData, comprobantesData, clientesData] = await Promise.all([
        ventasPromise,
        productosPromise,
        comprobantesPromise,
        clientesPromise,
      ]);

      setVentas(ventasData);
      setProductos(productosData);
      setComprobantes(comprobantesData);
      setClientes(clientesData);
    } catch (error) {
      toast.error('Error al cargar datos');
      if (import.meta.env.DEV) console.error(error);
      setVentas([]);
    } finally {
      setLoading(false);
    }
  };

  const resetRegistrarDialog = () => {
    setRegistrarForm({ servicioId: 0, precioUnitario: 0, cantidad: 1, clienteId: 0, metodoPago: 'EFECTIVO' });
    setServicioSearch(''); setServicioNombre(''); setShowServiciosList(false);
    setClienteSearch(''); setClienteManual({ tipoDoc: 'DNI', numDoc: '', nombre: '' }); setUsarManual(false);
    setCajaActivaServicio(null);
  };

  const handleRegistrarServicio = async () => {
    if (!registrarForm.servicioId) { toast.error('Selecciona un servicio'); return; }
    if (registrarForm.precioUnitario <= 0) { toast.error('El precio debe ser mayor a 0'); return; }
    if (registrarForm.cantidad < 1) { toast.error('La cantidad debe ser al menos 1'); return; }

    setRegistrarSaving(true);
    try {
      // Si es cliente manual y tiene datos → crearlo primero
      let clienteId = registrarForm.clienteId || undefined;
      if (usarManual && clienteManual.nombre.trim()) {
        const nuevo = await clienteService.create({
          nombre: clienteManual.nombre.trim(),
          tipoDocumento: clienteManual.tipoDoc,
          numeroDocumento: clienteManual.numDoc.trim() || undefined,
        });
        clienteId = nuevo.id;
        setClientes((prev) => [...prev, nuevo]);
      }

      const subtotal = registrarForm.cantidad * registrarForm.precioUnitario;
      await ventaService.create({
        vendedorId: userId!,
        metodoPago: registrarForm.metodoPago,
        total: subtotal,
        estado: 'COMPLETADA',
        clienteId,
        sucursalId: sucursalActual?.id,
        cajaId: cajaActivaServicio?.id,
        detalles: [{
          productoId: registrarForm.servicioId,
          cantidad: registrarForm.cantidad,
          precioUnitario: registrarForm.precioUnitario,
          subtotal,
        }],
      });
      toast.success('Servicio registrado correctamente');
      setRegistrarOpen(false);
      resetRegistrarDialog();
      fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? 'Error al registrar');
    } finally {
      setRegistrarSaving(false);
    }
  };

  const handleViewDetail = (venta: VentaDTO) => {
    setSelectedVenta(venta);
    setIsDetailDialogOpen(true);
  };

  const closeDetailDialog = () => {
    setSelectedVenta(null);
    setIsDetailDialogOpen(false);
  };

  const handleOpenEmitirComprobante = (venta: VentaDTO) => {
    const cliente = venta.clienteId ? clienteById.get(venta.clienteId) : null;
    setEmitirClienteEncontrado(cliente ?? null);
    setEmitirForm({
      ventaId: venta.id!,
      tipo: 'BOLETA',
      receptor: {
        tipoDocumento: (cliente?.tipoDocumento as 'DNI' | 'RUC' | undefined) ?? 'DNI',
        numeroDocumento: cliente?.numeroDocumento ?? '',
        razonSocial: cliente?.nombre ?? '',
        direccion: cliente?.direccion ?? '',
      },
    });
    setIsEmitirComprobanteOpen(true);
  };

  const handleEmitirComprobante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emitirForm.tipo === 'FACTURA') {
      if (!emitirForm.receptor?.numeroDocumento || !emitirForm.receptor?.razonSocial) {
        toast.error('Para FACTURA se requiere RUC y Razón Social');
        return;
      }
    }
    try {
      setEmitirSubmitting(true);

      // Resolver el clienteId para luego asociarlo a la venta
      let clienteIdParaVenta: number | undefined = emitirClienteEncontrado?.id;

      if (emitirClienteEncontrado?.id) {
        // Cliente existe — actualizar si cambió nombre o dirección
        const nombreNuevo = emitirForm.receptor?.razonSocial?.trim() || '';
        const direccionNueva = emitirForm.receptor?.direccion?.trim() || '';
        const cambiaNombre = nombreNuevo && nombreNuevo !== emitirClienteEncontrado.nombre;
        const cambiaDireccion = direccionNueva !== (emitirClienteEncontrado.direccion ?? '');
        if (cambiaNombre || cambiaDireccion) {
          try {
            await clienteService.update(emitirClienteEncontrado.id, {
              ...emitirClienteEncontrado,
              nombre: nombreNuevo || emitirClienteEncontrado.nombre,
              direccion: direccionNueva || undefined,
            });
          } catch { /* no bloquear */ }
        }
      } else if (emitirForm.receptor?.numeroDocumento?.trim() && emitirForm.receptor?.razonSocial?.trim()) {
        // Cliente nuevo — crear y capturar su id
        try {
          const creado = await clienteService.create({
            nombre: emitirForm.receptor.razonSocial.trim(),
            tipoDocumento: emitirForm.receptor.tipoDocumento ?? (emitirForm.tipo === 'FACTURA' ? 'RUC' : 'DNI'),
            numeroDocumento: emitirForm.receptor.numeroDocumento.trim(),
            direccion: emitirForm.receptor.direccion?.trim() || undefined,
          });
          clienteIdParaVenta = creado.id;
        } catch { /* ignorar si ya existe */ }
      }

      // Asociar el cliente a la venta si aún no lo tiene
      if (clienteIdParaVenta) {
        const ventaActual = ventas.find(v => v.id === emitirForm.ventaId);
        if (!ventaActual?.clienteId) {
          try {
            await ventaService.asignarCliente(emitirForm.ventaId, clienteIdParaVenta);
          } catch { /* no bloquear */ }
        }
      }

      const payload: EmitirComprobanteRequest = {
        ventaId: emitirForm.ventaId,
        tipo: emitirForm.tipo,
        receptorDocTipo: emitirForm.receptor?.tipoDocumento ?? null,
        receptorDocNumero: emitirForm.receptor?.numeroDocumento?.trim() || null,
        receptorNombre: emitirForm.receptor?.razonSocial?.trim() || null,
        receptorDireccion: emitirForm.receptor?.direccion?.trim() || null,
      };
      const result = await facturacionService.emitirComprobante(payload);
      toast.success(`Comprobante emitido: ${result.numero ?? 'OK'}`);
      setIsEmitirComprobanteOpen(false);
      setEmitirClienteEncontrado(null);
      await fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { mensaje?: string } } };
      if (err?.response?.status === 403) toast.error('No tienes permiso para emitir comprobantes');
      else if (err?.response?.status === 409) toast.error(err?.response?.data?.mensaje ?? 'Esta venta ya tiene un comprobante asociado');
      else toast.error(err?.response?.data?.mensaje ?? 'Error al emitir comprobante');
    } finally {
      setEmitirSubmitting(false);
    }
  };

  const handleAnular = (venta: VentaDTO) => {
    setAnularMotivo('');
    setAnularVenta(venta);
  };

  const handleConfirmarAnular = async () => {
    if (!anularVenta) return;
    try {
      setAnularSubmitting(true);
      await ventaService.anular(anularVenta.id!);
      toast.success(`Venta #${anularVenta.id} anulada`);
      setAnularVenta(null);
      setAnularMotivo('');
      await fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { mensaje?: string } } };
      toast.error(e?.response?.data?.mensaje || 'Error al anular la venta');
    } finally {
      setAnularSubmitting(false);
    }
  };

  // Mapa clienteId → ClienteDTO para lookup rápido — debe ir ANTES de filteredVentas
  const clienteById = useMemo<Map<number, ClienteDTO>>(() => {
    const m = new Map<number, ClienteDTO>();
    for (const c of clientes) {
      if (c.id != null) m.set(Number(c.id), c);
    }
    return m;
  }, [clientes]);

  const filteredVentas = ventas.filter((v) => {
    const cliente = v.clienteId ? clienteById.get(v.clienteId) : null;
    const matchesSearch =
      String(v.id).includes(searchTerm) ||
      v.metodoPago?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.estado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendedorNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente?.numeroDocumento?.includes(searchTerm);

    if (!matchesSearch) return false;

    if (metodoPagoFilter !== 'TODOS' && v.metodoPago !== metodoPagoFilter) return false;
    if (estadoVentaFilter !== 'TODOS' && v.estado !== estadoVentaFilter) return false;

    if (fechaDesde || fechaHasta) {
      const created = v.createdAt ? new Date(v.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) return false;

      const createdTime = created.getTime();

      if (fechaDesde) {
        const [y, m, d] = fechaDesde.split('-').map(Number);
        const from = startOfDay(new Date(y, m - 1, d)).getTime();
        if (createdTime < from) return false;
      }

      if (fechaHasta) {
        const [y, m, d] = fechaHasta.split('-').map(Number);
        const to = endOfDay(new Date(y, m - 1, d)).getTime();
        if (createdTime > to) return false;
      }
    }

    return true;
  }).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.id ?? 0);
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.id ?? 0);
    return dateB - dateA; // más reciente primero
  });

  const totalPages = Math.ceil(filteredVentas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVentas = filteredVentas.slice(startIndex, endIndex);

  // Solo ventas activas (excluye ANULADAS) para el resumen financiero
  const ventasActivas = filteredVentas.filter(v => v.estado !== 'ANULADA');
  const ingresosFiltrads = ventasActivas.reduce((s, v) => s + v.total, 0);



  const etiquetaFiltro =
    fechaDesde && fechaHasta ? `${fechaDesde} al ${fechaHasta}` :
    fechaDesde ? `Desde ${fechaDesde}` :
    fechaHasta ? `Hasta ${fechaHasta}` : 'Todas las fechas';

  const [exporting, setExporting] = useState(false);
  const [panelFiltrosOpen, setPanelFiltrosOpen] = useState(false);
  const [rangoOpen, setRangoOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<'hoy'|'ayer'|'7d'|'mes'|'custom'>('mes');

  const limpiarFiltros = () => {
    setMetodoPagoFilter('TODOS');
    setEstadoVentaFilter('TODOS');
    setDatePreset('mes');
    setFechaDesde(defaultFechaDesde);
    setFechaHasta(defaultFechaHasta);
    setAppliedFechaDesde(defaultFechaDesde);
    setAppliedFechaHasta(defaultFechaHasta);
  };

  const handleExportExcel = () => {
    try {
      exportarVentasExcel(filteredVentas, etiquetaFiltro);
    } catch { toast.error('Error al exportar Excel'); }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      exportarVentasPDF(filteredVentas, etiquetaFiltro, negocioConfig);
    } catch { toast.error('Error al exportar PDF'); }
    finally { setExporting(false); }
  };

  const completadasFiltradas = filteredVentas.filter(v => v.estado === 'COMPLETADA');
  const incidenciasFiltradas = filteredVentas.filter(v => v.estado !== 'COMPLETADA');
  const ticketPromedioCompletadas = completadasFiltradas.length > 0
    ? completadasFiltradas.reduce((s, v) => s + v.total, 0) / completadasFiltradas.length : 0;

  const aplicarPreset = (preset: 'hoy'|'ayer'|'7d'|'mes') => {
    const h = new Date();
    const fmtD = (d: Date) => d.toISOString().slice(0, 10);
    let desde: string, hasta = fmtD(h);
    if (preset === 'hoy') { desde = fmtD(h); }
    else if (preset === 'ayer') { const a = new Date(h); a.setDate(a.getDate()-1); desde = hasta = fmtD(a); }
    else if (preset === '7d') { const a = new Date(h); a.setDate(a.getDate()-6); desde = fmtD(a); }
    else { desde = fmtD(new Date(h.getFullYear(), h.getMonth(), 1)); }
    setFechaDesde(desde); setFechaHasta(hasta);
    setAppliedFechaDesde(desde); setAppliedFechaHasta(hasta);
    setDatePreset(preset); setRangoOpen(false); setCurrentPage(1);
  };

  const rangoLabel = (() => {
    if (datePreset === 'hoy') return 'Hoy';
    if (datePreset === 'ayer') return 'Ayer';
    if (datePreset === '7d') return 'Últimos 7 días';
    const fmtL = (s: string) => new Date(s+'T00:00:00').toLocaleDateString('es-PE', {day:'2-digit', month:'short'});
    const d1 = appliedFechaDesde ? fmtL(appliedFechaDesde) : '';
    const d2 = appliedFechaHasta ? fmtL(appliedFechaHasta) : '';
    if (!d1 && !d2) return 'Este mes';
    return d1 === d2 ? d1 : `${d1} → ${d2}`;
  })();

  if (loading) return <LoadingSpinner />;

  if (!canViewAll('VENTAS') && !canViewOwn('VENTAS') && !canCreate('VENTAS')) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Sin acceso a ventas"
        description="No tienes permisos para ver ventas. Contacta al administrador para solicitar acceso."
      />
    );
  }

  // Variables para el drawer de detalle
  const drawerSubtotal = selectedVenta ? selectedVenta.detalles.reduce((acc, d) => acc + d.cantidad * d.precioUnitario, 0) : 0;
  const drawerDescuentoNc = selectedVenta?.descuentoNotaCredito ?? 0;
  const drawerTotal = Math.max(0, drawerSubtotal - drawerDescuentoNc);
  const drawerIgv = drawerTotal * IGV_RATE / (1 + IGV_RATE);
  const drawerBase = drawerTotal / (1 + IGV_RATE);
  const drawerCliente = selectedVenta?.clienteId ? clienteById.get(selectedVenta.clienteId) : null;
  const drawerYaFacturada = selectedVenta ? comprobantes.some(c => c.ventaId === selectedVenta.id && c.estado === 'EMITIDO') : false;
  const drawerEstadoCls: Record<string, string> = {
    COMPLETADA: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    ANULADA: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    DEVUELTA: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    DEVUELTA_PARCIAL: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  };
  const drawerEstadoLabels: Record<string, string> = { COMPLETADA: 'Completada', ANULADA: 'Anulada', DEVUELTA: 'Devuelta', DEVUELTA_PARCIAL: 'Dev. parcial' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.6rem] font-bold tracking-tight leading-none">
            {esServicios ? 'Servicios Prestados' : 'Historial de Ventas'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {filteredVentas.length} de {ventas.length} ventas · {rangoLabel}
            {sucursalActual?.nombre ? ` · ${sucursalActual.nombre}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(canViewAll('VENTAS') || canViewOwn('VENTAS')) && filteredVentas.length > 0 && (
            <>
              <button type="button" onClick={handleExportExcel}
                className="flex items-center gap-2 h-[38px] px-[15px] text-[.855rem] font-semibold text-muted-foreground bg-card border border-border rounded-[10px] cursor-pointer hover:border-emerald-500 hover:text-emerald-600 transition-colors">
                <FileSpreadsheet size={15} />
                Excel
              </button>
              <button type="button" onClick={handleExportPDF} disabled={exporting}
                className="flex items-center gap-2 h-[38px] px-[15px] text-[.855rem] font-semibold text-muted-foreground bg-card border border-border rounded-[10px] cursor-pointer hover:border-red-500 hover:text-red-600 transition-colors disabled:opacity-50">
                <FileDown size={15} />
                {exporting ? 'Exportando...' : 'PDF'}
              </button>
            </>
          )}
          {esServicios && canCreate('VENTAS') && (
            <button type="button" onClick={async () => {
              const caja = await cajaService.getActiva(isMultiLocal && sucursalActual ? sucursalActual.id : undefined).catch(() => null);
              if (!caja) {
                toast.error((t) => (
                  <span>Sin caja abierta.{' '}
                    <button className="underline font-semibold" onClick={() => { toast.dismiss(t.id); navigate('/dashboard/caja'); }}>Abrir caja</button>
                  </span>
                ), { duration: 5000 });
                return;
              }
              setCajaActivaServicio(caja); setRegistrarOpen(true);
            }} className="flex items-center gap-2 h-[38px] px-[16px] text-[.855rem] font-[650] text-white bg-primary border-0 rounded-[10px] cursor-pointer hover:brightness-105 transition-all shadow-[0_6px_16px_-8px_hsl(var(--primary)/0.6)]">
              <Plus size={15} />
              Registrar servicio
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-[16px_18px] bg-card border border-border rounded-[14px] shadow-sm">
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Ingresos</p>
          <p className="text-[1.72rem] font-bold tracking-tight mt-[9px] tabular-nums">S/ {ingresosFiltrads.toFixed(2)}</p>
          <p className="text-[.79rem] text-muted-foreground mt-1">Solo ventas no anuladas</p>
        </div>
        <div className="p-[16px_18px] bg-card border border-border rounded-[14px] shadow-sm">
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Ventas</p>
          <p className="text-[1.72rem] font-bold tracking-tight mt-[9px] tabular-nums">{filteredVentas.length}</p>
          <p className="text-[.79rem] text-muted-foreground mt-1">{ventasActivas.length} válidas en el periodo</p>
        </div>
        <div className="p-[16px_18px] bg-card border border-border rounded-[14px] shadow-sm">
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Ticket promedio</p>
          <p className="text-[1.72rem] font-bold tracking-tight mt-[9px] tabular-nums">S/ {ticketPromedioCompletadas.toFixed(2)}</p>
          <p className="text-[.79rem] text-muted-foreground mt-1">Por venta completada</p>
        </div>
        <div className={`p-[16px_18px] rounded-[14px] shadow-sm border ${incidenciasFiltradas.length > 0 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700/40' : 'bg-card border-border'}`}>
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Anuladas y devueltas</p>
          <p className={`text-[1.72rem] font-bold tracking-tight mt-[9px] tabular-nums ${incidenciasFiltradas.length > 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{incidenciasFiltradas.length}</p>
          <p className="text-[.79rem] text-muted-foreground mt-1">{incidenciasFiltradas.length === 0 ? 'Ninguna en el periodo' : 'Revisa antes de cerrar el mes'}</p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-card border border-border rounded-[14px] shadow-sm">

        {/* Filter bar */}
        <div className="grid gap-2.5 p-[14px_18px] border-b border-border/60" style={{gridTemplateColumns: 'minmax(0,1fr) auto auto'}}>
          {/* Search */}
          <div className="relative min-w-0">
            <Search className="absolute left-[13px] top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID, vendedor, cliente, método…"
              className="w-full h-10 pl-[38px] pr-3 text-[.875rem] text-foreground bg-muted border border-transparent rounded-[10px] outline-none focus:bg-card focus:border-primary focus:ring-[3px] focus:ring-primary/15 transition-all"
            />
          </div>

          {/* Date range */}
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => setRangoOpen(o => !o)}
              className={`flex items-center justify-center gap-2 h-10 px-[13px] font-mono text-[.8rem] rounded-[10px] cursor-pointer whitespace-nowrap transition-all ${
                rangoOpen || datePreset !== 'mes'
                  ? 'text-primary bg-primary/10 border border-primary/30'
                  : 'text-muted-foreground bg-muted border border-transparent hover:bg-muted/80'
              }`}
            >
              <Calendar size={15} className="flex-shrink-0" />
              {rangoLabel}
              <ChevronDown size={14} className={`flex-shrink-0 opacity-70 transition-transform ${rangoOpen ? 'rotate-180' : ''}`} />
            </button>
            {rangoOpen && (
              <>
                <div className="fixed inset-0 z-[55]" onClick={() => setRangoOpen(false)} />
                <div className="absolute top-[calc(100%+6px)] right-0 z-[60] w-[280px] max-w-[calc(100vw-40px)] bg-card border border-border rounded-[14px] shadow-[0_22px_50px_-22px_rgba(0,0,0,.45)] p-2">
                  {([
                    { key: 'hoy' as const, label: 'Hoy' },
                    { key: 'ayer' as const, label: 'Ayer' },
                    { key: '7d' as const, label: 'Últimos 7 días' },
                    { key: 'mes' as const, label: 'Este mes' },
                  ]).map(p => (
                    <button key={p.key} type="button" onClick={() => aplicarPreset(p.key)}
                      className={`w-full flex items-center h-9 px-[10px] text-[.845rem] border-0 rounded-lg cursor-pointer transition-all text-left ${
                        datePreset === p.key ? 'font-[650] text-primary bg-primary/10' : 'font-medium text-foreground bg-transparent hover:bg-muted'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                  <div className="h-px bg-border/60 my-2 mx-1" />
                  <div className="p-[4px_6px_6px]">
                    <p className="font-mono text-[.66rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-2">Personalizado</p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid gap-1 text-[.74rem] text-muted-foreground">
                        Desde
                        <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setDatePreset('custom'); }}
                          className="w-full h-9 px-2 text-[.8rem] text-foreground bg-muted border border-border rounded-lg outline-none focus:border-primary" />
                      </label>
                      <label className="grid gap-1 text-[.74rem] text-muted-foreground">
                        Hasta
                        <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setDatePreset('custom'); }}
                          className="w-full h-9 px-2 text-[.8rem] text-foreground bg-muted border border-border rounded-lg outline-none focus:border-primary" />
                      </label>
                    </div>
                    {datePreset === 'custom' && (
                      <button type="button" onClick={() => { setAppliedFechaDesde(fechaDesde); setAppliedFechaHasta(fechaHasta); setRangoOpen(false); setCurrentPage(1); }}
                        className="w-full mt-2 h-8 text-[.8rem] font-semibold text-white bg-primary rounded-lg border-0 cursor-pointer hover:brightness-105">
                        Aplicar
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Filtros button */}
          <button
            type="button"
            onClick={() => setPanelFiltrosOpen(o => !o)}
            className={`flex items-center gap-2 h-10 px-[14px] text-[.855rem] font-semibold rounded-[10px] cursor-pointer whitespace-nowrap transition-all ${
              panelFiltrosOpen || (metodoPagoFilter !== 'TODOS' || estadoVentaFilter !== 'TODOS')
                ? 'text-primary bg-primary/10 border border-primary/30'
                : 'text-muted-foreground bg-card border border-border hover:bg-muted'
            }`}
          >
            <SlidersHorizontal size={15} className="flex-shrink-0" />
            Filtros
            {(metodoPagoFilter !== 'TODOS' || estadoVentaFilter !== 'TODOS') && (
              <span className="min-w-[18px] h-[18px] px-[5px] grid place-items-center rounded-full text-[.68rem] font-bold text-white bg-primary">
                {[metodoPagoFilter !== 'TODOS', estadoVentaFilter !== 'TODOS'].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {panelFiltrosOpen && (
          <div className="grid grid-cols-2 gap-[18px] p-[16px_18px] border-b border-border/60 bg-muted/30">
            <div>
              <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-[9px]">Método de pago</p>
              <div className="flex flex-wrap gap-[7px]">
                {([
                  { key: 'TODOS' as MetodoPagoFilter, label: 'Todos' },
                  { key: 'EFECTIVO' as MetodoPagoFilter, label: 'Efectivo' },
                  { key: 'TARJETA' as MetodoPagoFilter, label: 'Tarjeta' },
                  { key: 'YAPE_PLIN' as MetodoPagoFilter, label: 'Yape/Plin' },
                ]).map(m => (
                  <button key={m.key} type="button" onClick={() => { setMetodoPagoFilter(m.key); setCurrentPage(1); }}
                    className={`h-8 px-[13px] text-[.81rem] font-semibold rounded-[9px] cursor-pointer whitespace-nowrap transition-all border ${
                      metodoPagoFilter === m.key
                        ? 'text-white bg-primary border-primary'
                        : 'text-muted-foreground bg-card border-border hover:border-primary/40'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-[9px]">Estado de la venta</p>
              <div className="flex flex-wrap gap-[7px]">
                {([
                  { key: 'TODOS' as EstadoVentaFilter, label: 'Todos' },
                  { key: 'COMPLETADA' as EstadoVentaFilter, label: 'Completada' },
                  { key: 'ANULADA' as EstadoVentaFilter, label: 'Anulada' },
                  { key: 'DEVUELTA' as EstadoVentaFilter, label: 'Devuelta' },
                  { key: 'DEVUELTA_PARCIAL' as EstadoVentaFilter, label: 'Dev. parcial' },
                ]).map(e => (
                  <button key={e.key} type="button" onClick={() => { setEstadoVentaFilter(e.key); setCurrentPage(1); }}
                    className={`h-8 px-[13px] text-[.81rem] font-semibold rounded-[9px] cursor-pointer whitespace-nowrap transition-all border ${
                      estadoVentaFilter === e.key
                        ? 'text-white bg-primary border-primary'
                        : 'text-muted-foreground bg-card border-border hover:border-primary/40'
                    }`}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {(metodoPagoFilter !== 'TODOS' || estadoVentaFilter !== 'TODOS' || searchTerm) && (
          <div className="flex flex-wrap items-center gap-2 px-[18px] py-3 border-b border-border/60">
            <span className="text-[.79rem] text-muted-foreground">Filtros activos:</span>
            {metodoPagoFilter !== 'TODOS' && (
              <button type="button" onClick={() => setMetodoPagoFilter('TODOS')}
                className="flex items-center gap-[7px] h-7 px-[10px] text-[.78rem] font-semibold text-primary bg-primary/10 border border-primary/30 rounded-full cursor-pointer hover:brightness-95">
                Pago: {metodoPagoFilter === 'YAPE_PLIN' ? 'Yape/Plin' : metodoPagoFilter.charAt(0) + metodoPagoFilter.slice(1).toLowerCase()}
                <X size={12} className="flex-shrink-0" />
              </button>
            )}
            {estadoVentaFilter !== 'TODOS' && (
              <button type="button" onClick={() => setEstadoVentaFilter('TODOS')}
                className="flex items-center gap-[7px] h-7 px-[10px] text-[.78rem] font-semibold text-primary bg-primary/10 border border-primary/30 rounded-full cursor-pointer hover:brightness-95">
                Estado: {estadoVentaFilter === 'DEVUELTA_PARCIAL' ? 'Dev. parcial' : estadoVentaFilter.charAt(0) + estadoVentaFilter.slice(1).toLowerCase()}
                <X size={12} className="flex-shrink-0" />
              </button>
            )}
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm('')}
                className="flex items-center gap-[7px] h-7 px-[10px] text-[.78rem] font-semibold text-primary bg-primary/10 border border-primary/30 rounded-full cursor-pointer hover:brightness-95">
                "{searchTerm}"
                <X size={12} className="flex-shrink-0" />
              </button>
            )}
            <button type="button" onClick={limpiarFiltros}
              className="h-7 px-[10px] text-[.78rem] font-semibold text-muted-foreground bg-transparent border-0 rounded-full cursor-pointer hover:text-destructive transition-colors">
              Limpiar todo
            </button>
          </div>
        )}

        {/* Table / empty */}
        {filteredVentas.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <div className="w-[52px] h-[52px] mx-auto grid place-items-center rounded-[14px] bg-muted text-muted-foreground mb-[14px]">
              <ShoppingCart size={24} />
            </div>
            <p className="text-base font-[650]">Ninguna venta coincide con estos filtros</p>
            <p className="text-[.865rem] text-muted-foreground leading-[1.55] mt-[7px] mx-auto max-w-[380px]">
              Prueba con otro rango de fechas, otro método de pago, o quita los filtros para ver todo el periodo.
            </p>
            <button type="button" onClick={limpiarFiltros}
              className="h-[38px] mt-4 px-4 text-[.855rem] font-semibold text-primary bg-primary/10 border border-primary/30 rounded-[10px] cursor-pointer hover:brightness-97">
              Quitar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto" style={{scrollbarWidth:'thin'}}>
              <table className="w-full border-collapse text-[.84rem]" style={{minWidth:'1060px'}}>
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-[10px] px-[18px] text-[.72rem] font-[650] tracking-[.04em] uppercase text-muted-foreground whitespace-nowrap">Venta</th>
                    <th className="text-left py-[10px] px-[14px] text-[.72rem] font-[650] tracking-[.04em] uppercase text-muted-foreground whitespace-nowrap">Cliente</th>
                    <th className="text-left py-[10px] px-[14px] text-[.72rem] font-[650] tracking-[.04em] uppercase text-muted-foreground whitespace-nowrap">Vendedor</th>
                    <th className="text-left py-[10px] px-[14px] text-[.72rem] font-[650] tracking-[.04em] uppercase text-muted-foreground whitespace-nowrap">Pago</th>
                    <th className="text-left py-[10px] px-[14px] text-[.72rem] font-[650] tracking-[.04em] uppercase text-muted-foreground whitespace-nowrap">Comprobante</th>
                    <th className="text-left py-[10px] px-[14px] text-[.72rem] font-[650] tracking-[.04em] uppercase text-muted-foreground whitespace-nowrap">Estado</th>
                    <th className="text-right py-[10px] px-[14px] text-[.72rem] font-[650] tracking-[.04em] uppercase text-muted-foreground whitespace-nowrap">Total</th>
                    <th className="text-right py-[10px] px-[18px] text-[.72rem] font-[650] tracking-[.04em] uppercase text-muted-foreground whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentVentas.map((venta) => {
                    const cliente = venta.clienteId ? clienteById.get(venta.clienteId) : null;
                    const comp = comprobantes.find(c => c.ventaId === venta.id);
                    const anulada = venta.estado === 'ANULADA';
                    const iniciales = (venta.vendedorNombre ?? '').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() || '?';

                    const pagoCls: Record<string, string> = {
                      EFECTIVO: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
                      TARJETA: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
                      YAPE_PLIN: 'text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20',
                    };
                    const pagoLabels: Record<string, string> = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', YAPE_PLIN: 'Yape/Plin' };
                    const estadoCls: Record<string, string> = {
                      COMPLETADA: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
                      ANULADA: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
                      DEVUELTA: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
                      DEVUELTA_PARCIAL: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
                    };
                    const estadoLabels: Record<string, string> = { COMPLETADA: 'Completada', ANULADA: 'Anulada', DEVUELTA: 'Devuelta', DEVUELTA_PARCIAL: 'Dev. parcial' };
                    const sunatCls = comp?.sunatEstado === 'ACEPTADO' ? 'text-emerald-600 dark:text-emerald-400' : comp?.sunatEstado === 'RECHAZADO' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';

                    return (
                      <tr key={venta.id} onClick={() => handleViewDetail(venta)}
                        className={`border-t border-border/60 cursor-pointer hover:bg-muted/50 transition-colors ${anulada ? 'opacity-60' : ''}`}>
                        {/* Venta */}
                        <td className="py-3 px-[18px] whitespace-nowrap">
                          <p className="font-mono text-[.85rem] font-semibold">#{venta.id}</p>
                          <p className="text-[.74rem] text-muted-foreground mt-0.5">
                            {venta.createdAt ? new Date(venta.createdAt).toLocaleDateString('es-PE', {day:'2-digit', month:'short'}) : '-'}
                            {' · '}
                            {venta.createdAt ? new Date(venta.createdAt).toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'}) : ''}
                          </p>
                        </td>
                        {/* Cliente */}
                        <td className="py-3 px-[14px] max-w-[190px]">
                          <p className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{cliente?.nombre ?? 'Público general'}</p>
                          {cliente?.numeroDocumento && (
                            <p className="font-mono text-[.73rem] text-muted-foreground mt-0.5">{cliente.tipoDocumento} {cliente.numeroDocumento}</p>
                          )}
                        </td>
                        {/* Vendedor */}
                        <td className="py-3 px-[14px] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-[26px] h-[26px] flex-shrink-0 rounded-full grid place-items-center text-[.66rem] font-bold bg-muted text-muted-foreground">
                              {iniciales}
                            </span>
                            <span className="text-sm text-muted-foreground">{venta.vendedorNombre ?? '—'}</span>
                          </div>
                        </td>
                        {/* Pago */}
                        <td className="py-3 px-[14px] whitespace-nowrap">
                          <span className={`inline-flex items-center text-[.75rem] font-[650] px-[9px] py-[3px] rounded-full ${pagoCls[venta.metodoPago] ?? 'text-muted-foreground bg-muted'}`}>
                            {pagoLabels[venta.metodoPago] ?? venta.metodoPago}
                          </span>
                        </td>
                        {/* Comprobante */}
                        <td className="py-3 px-[14px] whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          {comp ? (
                            <div>
                              <p className="font-mono text-[.8rem] font-semibold">{comp.numero ?? '—'}</p>
                              {comp.sunatEstado && <p className={`text-[.72rem] font-semibold mt-0.5 ${sunatCls}`}>{comp.sunatEstado.charAt(0) + comp.sunatEstado.slice(1).toLowerCase()} SUNAT</p>}
                            </div>
                          ) : canEmitirComprobante && !anulada ? (
                            <button type="button" onClick={() => handleOpenEmitirComprobante(venta)}
                              className="flex items-center gap-[6px] h-7 px-[10px] text-[.77rem] font-semibold text-primary bg-transparent border border-dashed border-primary/40 rounded-lg cursor-pointer hover:bg-primary/10 transition-colors">
                              <Plus size={12} />
                              Emitir
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        {/* Estado */}
                        <td className="py-3 px-[14px] whitespace-nowrap">
                          <span className={`inline-flex items-center text-[.75rem] font-[650] px-[9px] py-[3px] rounded-full ${estadoCls[venta.estado] ?? 'text-muted-foreground bg-muted'}`}>
                            {estadoLabels[venta.estado] ?? venta.estado}
                          </span>
                        </td>
                        {/* Total */}
                        <td className="py-3 px-[14px] text-right whitespace-nowrap font-bold font-mono tabular-nums">
                          S/ {venta.total.toFixed(2)}
                        </td>
                        {/* Acciones */}
                        <td className="py-3 px-[18px] text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="inline-flex gap-[3px]">
                            <button type="button" onClick={() => handleViewDetail(venta)} title="Ver detalle"
                              className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-lg cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                              <Eye size={15} />
                            </button>
                            {venta.estado !== 'ANULADA' && (
                              <button type="button" title="Imprimir ticket" onClick={() => {
                                const cl = venta.clienteId ? clienteById.get(venta.clienteId) : null;
                                setTicketVenta(venta); setTicketDni(cl?.numeroDocumento ?? ''); setTicketNombre(cl?.nombre ?? '');
                              }} className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-lg cursor-pointer hover:bg-muted hover:text-foreground transition-colors">
                                <Printer size={15} />
                              </button>
                            )}
                            {(venta.estado === 'COMPLETADA' || venta.estado === 'DEVUELTA_PARCIAL') && (
                              <button type="button" title="Registrar devolución" onClick={() => { setDevolucionVenta(venta); setShowDevolucion(true); }}
                                className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-lg cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-400 transition-colors">
                                <RotateCcw size={15} />
                              </button>
                            )}
                            {(puede('ANULAR_VENTA') || canDelete('VENTAS')) && !anulada && (
                              <button type="button" title="Anular venta" onClick={() => handleAnular(venta)}
                                className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                <Trash2 size={15} />
                              </button>
                            )}
                            {anulada && canCreate('VENTAS') && (
                              <button type="button" title="Rehacer en POS" onClick={() => navigate('/pos', { state: { cargarVenta: venta } })}
                                className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-lg cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                                <RefreshCw size={15} />
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

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-3 border-t border-border/60">
              <span className="text-[.8rem] text-muted-foreground">
                Mostrando {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredVentas.length)} de {filteredVentas.length}
              </span>
              <div className="flex items-center gap-[5px]">
                <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}
                  className="min-w-8 h-8 px-[10px] text-[.81rem] font-semibold text-muted-foreground bg-card border border-border rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors">
                  Anterior
                </button>
                {Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
                  const page = totalPages <= 7 ? i + 1
                    : currentPage <= 4 ? i + 1
                    : currentPage >= totalPages - 3 ? totalPages - 6 + i
                    : currentPage - 3 + i;
                  return (
                    <button key={page} type="button" onClick={() => setCurrentPage(page)}
                      className={`min-w-8 h-8 px-[10px] text-[.81rem] font-semibold rounded-lg cursor-pointer transition-colors ${
                        page === currentPage ? 'text-white bg-primary border border-primary' : 'text-muted-foreground bg-card border border-border hover:bg-muted'
                      }`}>
                      {page}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages || totalPages === 0}
                  className="min-w-8 h-8 px-[10px] text-[.81rem] font-semibold text-muted-foreground bg-card border border-border rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors">
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail slide-in drawer — portal para salir del overflow:hidden del layout */}
      {isDetailDialogOpen && selectedVenta && createPortal(
        <div className="fixed inset-0 z-[200] flex justify-end" style={{background:'rgba(9,11,16,.5)', backdropFilter:'blur(3px)'}} onClick={closeDetailDialog}>
          <style>{`@keyframes slideFromRight { from { transform:translateX(28px); opacity:0; } to { transform:none; opacity:1; } }`}</style>
          <aside className="w-full max-w-[520px] h-full flex flex-col bg-card border-l border-border shadow-[_-20px_0_60px_-30px_rgba(0,0,0,.6)]"
            style={{animation: 'slideFromRight .24s cubic-bezier(.4,0,.2,1)'}}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-[20px_22px] border-b border-border/60 flex-shrink-0">
              <div>
                <div className="flex items-center gap-[9px] flex-wrap">
                  <h2 className="text-[1.15rem] font-bold tracking-tight">Venta #{selectedVenta.id}</h2>
                  <span className={`inline-flex items-center text-[.75rem] font-[650] px-[9px] py-[3px] rounded-full ${drawerEstadoCls[selectedVenta.estado] ?? 'text-muted-foreground bg-muted'}`}>
                    {drawerEstadoLabels[selectedVenta.estado] ?? selectedVenta.estado}
                  </span>
                </div>
                <p className="font-mono text-[.78rem] text-muted-foreground mt-[6px]">
                  {selectedVenta.createdAt ? new Date(selectedVenta.createdAt).toLocaleDateString('es-PE', {day:'2-digit', month:'short', year:'numeric'}) : '—'}
                  {' · '}
                  {selectedVenta.createdAt ? new Date(selectedVenta.createdAt).toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'}) : ''}
                  {selectedVenta.vendedorNombre ? ` · ${selectedVenta.vendedorNombre}` : ''}
                </p>
              </div>
              <button type="button" onClick={closeDetailDialog}
                className="w-[30px] h-[30px] flex-shrink-0 grid place-items-center text-muted-foreground bg-transparent border-0 rounded-lg cursor-pointer hover:bg-muted hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-[20px_22px] space-y-5">
              {/* Cliente + Pago */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-[13px_14px] rounded-xl bg-muted">
                  <p className="text-[.74rem] text-muted-foreground">Cliente</p>
                  <p className="text-[.9rem] font-[650] mt-1 break-words">{drawerCliente?.nombre ?? 'Público general'}</p>
                  {drawerCliente?.numeroDocumento && <p className="font-mono text-[.76rem] text-muted-foreground mt-0.5">{drawerCliente.tipoDocumento} {drawerCliente.numeroDocumento}</p>}
                </div>
                <div className="p-[13px_14px] rounded-xl bg-muted">
                  <p className="text-[.74rem] text-muted-foreground">Método de pago</p>
                  <p className="text-[.9rem] font-[650] mt-1">{{EFECTIVO:'Efectivo', TARJETA:'Tarjeta', YAPE_PLIN:'Yape / Plin'}[selectedVenta.metodoPago as string] ?? selectedVenta.metodoPago}</p>
                  <p className="font-mono text-[.76rem] text-muted-foreground mt-0.5">{comprobantes.find(c => c.ventaId === selectedVenta.id)?.numero ?? 'Sin comprobante'}</p>
                </div>
              </div>

              {/* Productos */}
              <div>
                <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-[10px]">Productos</p>
                <div className="border border-border rounded-xl overflow-hidden">
                  {selectedVenta.detalles.map((d, i) => (
                    <div key={i} className={`flex items-start gap-[14px] p-[12px_14px] ${i > 0 ? 'border-t border-border/60' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-[.865rem] font-semibold leading-snug">{d.productoNombre ?? `Producto #${d.productoId}`}</p>
                        {d.varianteDescripcion && <p className="font-mono text-[.74rem] text-muted-foreground mt-0.5">{d.varianteDescripcion}</p>}
                        <p className="font-mono text-[.74rem] text-muted-foreground mt-0.5">x{d.cantidad} · S/ {d.precioUnitario.toFixed(2)}</p>
                      </div>
                      <p className="flex-shrink-0 text-right font-mono text-[.86rem] font-semibold tabular-nums">S/ {(d.cantidad * d.precioUnitario).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="grid gap-2 p-[15px_16px] rounded-xl bg-muted border border-border text-[.87rem]">
                {drawerDescuentoNc > 0 && (
                  <>
                    <div className="flex justify-between gap-3 text-muted-foreground">
                      <span>Subtotal:</span>
                      <span className="tabular-nums">S/ {drawerSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                      <span>Descuento NC{selectedVenta.notaCreditoId ? ` #${selectedVenta.notaCreditoId}` : ''}:</span>
                      <span className="tabular-nums">- S/ {drawerDescuentoNc.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>Base imponible</span>
                  <span className="tabular-nums">S/ {drawerBase.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>IGV (18%)</span>
                  <span className="tabular-nums">S/ {drawerIgv.toFixed(2)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 pt-[9px] border-t border-border">
                  <span className="font-[650]">Total</span>
                  <span className="text-[1.32rem] font-bold tracking-tight tabular-nums">S/ {drawerTotal.toFixed(2)}</span>
                </div>
              </div>

              {selectedVenta.estado !== 'COMPLETADA' && (
                <div className={`p-[13px_15px] rounded-xl text-[.84rem] leading-[1.55] ${
                  selectedVenta.estado === 'ANULADA' ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/10' : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10'
                }`}>
                  {selectedVenta.estado === 'ANULADA' ? 'Venta anulada. El stock ya regresó al inventario.'
                    : selectedVenta.estado === 'DEVUELTA' ? 'Devolución total registrada.'
                    : 'Devolución parcial: un producto regresó al inventario y el total se ajustó.'}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex flex-wrap gap-[9px] p-[16px_22px] border-t border-border/60 flex-shrink-0">
              {canEmitirComprobante && selectedVenta.estado === 'COMPLETADA' && (
                drawerYaFacturada ? (
                  <div className="flex-1 min-w-[150px] h-11 flex items-center justify-center gap-2 rounded-[11px] border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                    <FileText size={15} />
                    Comprobante ya emitido
                  </div>
                ) : (
                  <button type="button" onClick={() => { closeDetailDialog(); handleOpenEmitirComprobante(selectedVenta); }}
                    className="flex-1 min-w-[150px] h-11 flex items-center justify-center gap-2 font-[650] text-[.9rem] text-white bg-primary border-0 rounded-[11px] cursor-pointer hover:brightness-105 transition-all shadow-[0_8px_20px_-10px_hsl(var(--primary)/0.6)]">
                    <FileText size={15} />
                    Emitir comprobante
                  </button>
                )
              )}
              {selectedVenta.estado !== 'ANULADA' && (
                <button type="button" onClick={() => {
                  closeDetailDialog();
                  const cl = selectedVenta.clienteId ? clienteById.get(selectedVenta.clienteId) : null;
                  setTicketVenta(selectedVenta); setTicketDni(cl?.numeroDocumento ?? ''); setTicketNombre(cl?.nombre ?? '');
                }} className="flex-1 min-w-[150px] h-11 flex items-center justify-center gap-2 font-semibold text-[.9rem] text-muted-foreground bg-card border border-border rounded-[11px] cursor-pointer hover:border-primary hover:text-primary transition-colors">
                  <Printer size={15} />
                  Imprimir ticket
                </button>
              )}
            </div>
          </aside>
        </div>,
        document.body
      )}

      {/* Devolucion Modal */}
      {showDevolucion && devolucionVenta && (
        <DevolucionModal
          venta={devolucionVenta}
          onSuccess={fetchData}
          onClose={() => {
            setShowDevolucion(false);
            setDevolucionVenta(null);
          }}
        />
      )}

      {/* Modal — Ticket de venta */}
      {!!ticketVenta && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-5"
          style={{ background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)' }}
          onClick={() => setTicketVenta(null)}
        >
          <style>{`@keyframes tkModalIn{from{transform:scale(.97);opacity:0}to{transform:none;opacity:1}}`}</style>
          <div
            className="w-full max-w-[700px] flex flex-col bg-background border border-border rounded-[18px] shadow-[0_30px_80px_-30px_rgba(0,0,0,.55)] overflow-hidden"
            style={{ animation: 'tkModalIn .2s ease', maxHeight: 'calc(100vh - 40px)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-[22px] pt-5 pb-4 border-b border-border/50 flex-shrink-0">
              <span className="w-[38px] h-[38px] flex-shrink-0 grid place-items-center rounded-[11px] bg-primary/10 text-primary">
                <Printer size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[1.08rem] font-bold tracking-[-0.02em]">Imprimir ticket</h2>
                <div className="font-mono text-[.76rem] text-muted-foreground mt-1">
                  Venta #{ticketVenta.id} · S/.{ticketVenta.total.toFixed(2)}
                </div>
              </div>
              <button type="button" onClick={() => setTicketVenta(null)} className="w-[30px] h-[30px] flex-shrink-0 ml-auto grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-[22px] py-[18px]">
              <div className="grid gap-[22px]" style={{ gridTemplateColumns: 'minmax(0,1fr) 240px', alignItems: 'start' }}>
                {/* Form */}
                <div className="space-y-[14px]">
                  <p className="text-[.86rem] text-muted-foreground leading-relaxed">
                    Los datos del cliente son opcionales. Si los dejas vacíos, el ticket sale como Público general.
                  </p>
                  <div>
                    <label className="block text-[.8rem] font-semibold text-muted-foreground mb-1.5">DNI / RUC</label>
                    <Input
                      placeholder="Opcional"
                      maxLength={11}
                      value={ticketDni}
                      onChange={e => setTicketDni(e.target.value.replace(/\D/g, ''))}
                      className="font-mono tracking-wide"
                    />
                  </div>
                  <div>
                    <label className="block text-[.8rem] font-semibold text-muted-foreground mb-1.5">Nombre</label>
                    <Input
                      placeholder="Opcional"
                      value={ticketNombre}
                      onChange={e => setTicketNombre(e.target.value)}
                    />
                  </div>
                </div>

                {/* Preview 80mm */}
                <div className="p-4 rounded-[14px] bg-muted">
                  <div className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-[10px] text-center">
                    Vista previa · 80 mm
                  </div>
                  <div className="bg-white text-[#1a1d24] font-mono text-[.66rem] leading-[1.55] px-3 py-[14px] rounded-sm shadow-[0_10px_24px_-14px_rgba(0,0,0,.4)]">
                    <div className="text-center text-[.8rem] font-bold">{negocioConfig?.nombreNegocio || 'BOTICA'}</div>
                    <div className="text-center text-[#5b6170]">{negocioConfig?.direccion || ''}</div>
                    <div className="border-t border-dashed border-[#b9bec8] my-2" />
                    <div className="flex justify-between gap-2"><span>TICKET DE VENTA</span><span>#{ticketVenta.id}</span></div>
                    <div className="text-[#5b6170]">{new Date(ticketVenta.createdAt || '').toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })}</div>
                    <div className="mt-1 break-words">Cliente: {ticketNombre.trim() || 'Público general'}</div>
                    {ticketDni && <div>Doc: {ticketDni}</div>}
                    <div className="border-t border-dashed border-[#b9bec8] my-2" />
                    {ticketVenta.detalles.map((d, i) => (
                      <div key={i} className="mb-1">
                        <div className="break-words">{d.productoNombre || `Prod. #${d.productoId}`}</div>
                        <div className="flex justify-between gap-2 text-[#5b6170]">
                          <span>{d.cantidad} x S/.{d.precioUnitario.toFixed(2)}</span>
                          <span className="text-[#1a1d24]">S/.{(d.cantidad * d.precioUnitario).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-dashed border-[#b9bec8] my-2" />
                    <div className="flex justify-between font-bold text-[.78rem]">
                      <span>TOTAL</span><span>S/.{ticketVenta.total.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-dashed border-[#b9bec8] my-2" />
                    <div className="text-center text-[#5b6170]">Gracias por su compra</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-[9px] px-[22px] py-[14px] border-t border-border/50 flex-shrink-0">
              <button type="button" onClick={() => setTicketVenta(null)}
                className="flex-none min-w-[110px] h-11 px-[18px] text-[.9rem] font-semibold text-muted-foreground bg-background border border-border rounded-[11px] hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button type="button"
                className="flex-1 h-11 flex items-center justify-center gap-2 text-[.9rem] font-semibold text-white bg-primary border-0 rounded-[11px] shadow-[0_8px_20px_-10px_hsl(var(--primary)/0.5)] hover:brightness-105 transition-all"
                onClick={() => {
                  printVentaTicket(ticketVenta, negocioConfig, ticketDni.trim() || undefined, ticketNombre.trim() || undefined);
                  setTicketVenta(null);
                  toast.success(`Ticket enviado a la impresora · Venta #${ticketVenta.id}`);
                }}>
                <Printer size={16} />
                Imprimir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal — Anular venta */}
      {!!anularVenta && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-5"
          style={{ background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)' }}
          onClick={() => { if (!anularSubmitting) setAnularVenta(null); }}
        >
          <style>{`@keyframes anModalIn{from{transform:scale(.97);opacity:0}to{transform:none;opacity:1}}`}</style>
          <div
            className="w-full max-w-[470px] flex flex-col bg-background border border-border rounded-[18px] shadow-[0_30px_80px_-30px_rgba(0,0,0,.55)] overflow-hidden"
            style={{ animation: 'anModalIn .2s ease', maxHeight: 'calc(100vh - 40px)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-[22px] pt-5 pb-4 border-b border-border/50 flex-shrink-0">
              <span className="w-[38px] h-[38px] flex-shrink-0 grid place-items-center rounded-[11px] bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-[1.08rem] font-bold tracking-[-0.02em]">Anular venta</h2>
                <div className="font-mono text-[.76rem] text-muted-foreground mt-1">
                  Venta #{anularVenta.id} · S/.{anularVenta.total.toFixed(2)}
                </div>
              </div>
              <button type="button" onClick={() => setAnularVenta(null)} disabled={anularSubmitting}
                className="w-[30px] h-[30px] flex-shrink-0 ml-auto grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-40">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-[22px] py-[18px] space-y-4">
              {/* Resumen */}
              <div className="grid gap-2 px-[15px] py-[13px] rounded-xl bg-muted text-[.84rem]">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-semibold text-right">
                    {anularVenta.clienteId ? clienteById.get(anularVenta.clienteId)?.nombre : 'Público general'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="font-mono text-[.8rem]">
                    {anularVenta.createdAt
                      ? new Date(anularVenta.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Comprobante</span>
                  <span className="font-mono text-[.8rem]">
                    {(() => {
                      const comp = comprobantes.find(c => c.ventaId === anularVenta.id && c.estado === 'EMITIDO');
                      return comp ? `${comp.tipo === 'FACTURA' ? 'F001' : 'B001'}-${String(comp.id).padStart(6, '0')}` : 'Sin comprobante';
                    })()}
                  </span>
                </div>
              </div>

              {/* Aviso si tiene comprobante SUNAT */}
              {(() => {
                const comp = comprobantes.find(c => c.ventaId === anularVenta.id && c.estado === 'EMITIDO');
                if (!comp) return null;
                return (
                  <div className="px-[15px] py-[13px] rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                    <p className="text-[.83rem] leading-relaxed text-amber-800 dark:text-amber-300">
                      Esta venta tiene un comprobante emitido. Anular no revierte el comprobante; para eso corresponde una nota de crédito.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAnularVenta(null);
                        setDevolucionVenta(anularVenta);
                        setShowDevolucion(true);
                      }}
                      className="flex items-center gap-1.5 h-[30px] mt-[9px] px-[11px] text-[.79rem] font-semibold text-amber-700 dark:text-amber-400 bg-background border border-amber-200 dark:border-amber-700 rounded-lg hover:brightness-95 transition-all"
                    >
                      <RotateCcw size={13} />
                      Registrar devolución en su lugar
                    </button>
                  </div>
                );
              })()}

              {/* Motivo */}
              <div>
                <label className="block text-[.8rem] font-semibold text-muted-foreground mb-1.5">
                  Motivo de la anulación <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={anularMotivo}
                  onChange={e => setAnularMotivo(e.target.value)}
                  rows={3}
                  placeholder="Ej. venta registrada por error, cobro duplicado…"
                  className="w-full px-[13px] py-[11px] text-[.875rem] leading-relaxed text-foreground bg-background border border-border rounded-[10px] outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
              <p className="text-[.78rem] text-muted-foreground leading-relaxed">
                La venta se conserva marcada como ANULADA, sale de los ingresos y su stock regresa al inventario.
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-[9px] px-[22px] py-[14px] border-t border-border/50 flex-shrink-0">
              <button type="button" onClick={() => setAnularVenta(null)} disabled={anularSubmitting}
                className="flex-none min-w-[110px] h-11 px-[18px] text-[.9rem] font-semibold text-muted-foreground bg-background border border-border rounded-[11px] hover:bg-muted transition-colors disabled:opacity-40">
                Cancelar
              </button>
              <button
                type="button"
                disabled={anularMotivo.trim().length < 4 || anularSubmitting}
                onClick={handleConfirmarAnular}
                className="flex-1 h-11 flex items-center justify-center gap-2 text-[.9rem] font-semibold text-white bg-red-600 border-0 rounded-[11px] shadow-[0_8px_20px_-10px_rgba(214,59,59,.5)] disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:brightness-105 transition-all"
              >
                {anularSubmitting
                  ? <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Anulando…</>
                  : 'Anular venta'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Dialog (para otras acciones) */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        type={confirmDialog.type}
        onConfirm={async () => {
          if (confirmDialog.action) await confirmDialog.action();
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

      {/* Modal — Emitir Comprobante */}
      {isEmitirComprobanteOpen && createPortal(
        (() => {
          const esFac = emitirForm.tipo === 'FACTURA';
          const docLen = esFac ? 11 : 8;
          const doc = emitirForm.receptor?.numeroDocumento ?? '';
          const razonSocial = emitirForm.receptor?.razonSocial ?? '';
          const direccion = emitirForm.receptor?.direccion ?? '';
          const emitirVenta = ventas.find(v => v.id === emitirForm.ventaId);
          const totalVenta = emitirVenta?.total ?? 0;
          const base = totalVenta / (1 + IGV_RATE);
          const igv = totalVenta - base;
          const canSubmit = esFac
            ? (doc.length === docLen && razonSocial.trim().length > 0 && direccion.trim().length > 0)
            : true;

          return (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-5"
              style={{ background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)' }}
              onClick={() => { setIsEmitirComprobanteOpen(false); setEmitirClienteEncontrado(null); }}
            >
              <style>{`@keyframes emModalIn{from{transform:scale(.97);opacity:0}to{transform:none;opacity:1}}`}</style>
              <div
                className="w-full max-w-[540px] flex flex-col bg-background border border-border rounded-[18px] shadow-[0_30px_80px_-30px_rgba(0,0,0,.55)] overflow-hidden"
                style={{ animation: 'emModalIn .2s ease', maxHeight: 'calc(100vh - 40px)' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start gap-3 px-[22px] pt-5 pb-4 border-b border-border/50 flex-shrink-0">
                  <span className="w-[38px] h-[38px] flex-shrink-0 grid place-items-center rounded-[11px] bg-primary/10 text-primary">
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[1.08rem] font-bold tracking-[-0.02em]">Emitir comprobante</h2>
                    <div className="font-mono text-[.76rem] text-muted-foreground mt-1">
                      Venta #{emitirForm.ventaId} · S/.{totalVenta.toFixed(2)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsEmitirComprobanteOpen(false); setEmitirClienteEncontrado(null); }}
                    className="w-[30px] h-[30px] flex-shrink-0 ml-auto grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Scrollbox */}
                <div className="flex-1 min-h-0 overflow-y-auto px-[22px] py-[18px] space-y-5">
                  {/* Tipo */}
                  <div>
                    <div className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground mb-[9px]">
                      Tipo de comprobante
                    </div>
                    <div className="grid grid-cols-2 gap-[10px]">
                      {([
                        { key: 'BOLETA' as const, label: 'Boleta', desc: 'Consumidor final · DNI opcional', serie: 'B001' },
                        { key: 'FACTURA' as const, label: 'Factura', desc: 'Empresas · RUC obligatorio', serie: 'F001' },
                      ]).map(op => {
                        const on = emitirForm.tipo === op.key;
                        return (
                          <button
                            key={op.key}
                            type="button"
                            onClick={() => {
                              setEmitirClienteEncontrado(null);
                              setEmitirForm(prev => ({
                                ...prev,
                                tipo: op.key,
                                receptor: op.key === 'BOLETA'
                                  ? { tipoDocumento: 'DNI' as const, numeroDocumento: '', razonSocial: '', direccion: '' }
                                  : { tipoDocumento: 'RUC' as const, numeroDocumento: '', razonSocial: '', direccion: '' },
                              }));
                            }}
                            className={`flex items-center gap-[11px] px-[14px] py-[13px] rounded-xl text-left transition-all border-[1.5px] ${
                              on ? 'bg-primary/5 border-primary' : 'bg-background border-border hover:border-primary/40'
                            }`}
                          >
                            <span className={`w-4 h-4 flex-shrink-0 rounded-full box-border ${
                              on ? 'border-[5px] border-primary bg-background' : 'border-[1.5px] border-border bg-background'
                            }`} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[.92rem] font-[650] text-foreground">{op.label}</span>
                              <span className="block text-[.75rem] text-muted-foreground mt-0.5">{op.desc}</span>
                            </span>
                            <span className="font-mono text-[.72rem] font-semibold text-muted-foreground">{op.serie}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campos */}
                  <div className="space-y-[14px]">
                    {/* Documento */}
                    <div>
                      <label className="block text-[.8rem] font-semibold text-muted-foreground mb-1.5">
                        {esFac ? 'RUC *' : 'DNI (opcional)'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={docLen}
                          placeholder={esFac ? '11 dígitos' : '8 dígitos'}
                          value={doc}
                          onChange={e => {
                            setEmitirClienteEncontrado(null);
                            setEmitirForm(prev => ({
                              ...prev,
                              receptor: {
                                ...prev.receptor,
                                tipoDocumento: esFac ? 'RUC' as const : 'DNI' as const,
                                numeroDocumento: e.target.value.replace(/\D/g, '').slice(0, docLen),
                                razonSocial: '',
                                direccion: '',
                              },
                            }));
                          }}
                          className="flex-1 min-w-0 h-[42px] px-[13px] font-mono tracking-[.04em] text-[.875rem] text-foreground bg-background border border-border rounded-[10px] outline-none focus:ring-1 focus:ring-ring"
                        />
                        <button
                          type="button"
                          disabled={doc.length < docLen || emitirBuscando}
                          className={`flex-shrink-0 flex items-center gap-[7px] h-[42px] px-[14px] text-[.82rem] font-[650] rounded-[10px] whitespace-nowrap transition-all border ${
                            doc.length >= docLen && !emitirBuscando
                              ? 'text-primary bg-primary/10 border-primary/30 cursor-pointer hover:brightness-95'
                              : 'text-muted-foreground bg-muted border-transparent cursor-not-allowed'
                          }`}
                        >
                          <Search size={14} className="flex-shrink-0" />
                          {emitirBuscando ? 'Buscando…' : esFac ? 'SUNAT' : 'RENIEC'}
                        </button>
                      </div>
                      {emitirClienteEncontrado && (
                        <div className="flex items-center gap-2 mt-1.5 text-[.76rem] font-semibold text-emerald-600 dark:text-emerald-400">
                          <User size={12} />
                          Cliente encontrado: {emitirClienteEncontrado.nombre}
                        </div>
                      )}
                    </div>

                    {/* Nombre / Razón social */}
                    <div>
                      <label className="block text-[.8rem] font-semibold text-muted-foreground mb-1.5">
                        {esFac ? 'Razón social *' : 'Nombre (opcional)'}
                      </label>
                      <input
                        type="text"
                        placeholder={esFac ? 'Se completa al buscar el RUC' : 'Nombre del cliente'}
                        value={razonSocial}
                        onChange={e => setEmitirForm(prev => ({ ...prev, receptor: { ...prev.receptor, razonSocial: e.target.value } }))}
                        className="w-full h-[42px] px-[13px] text-[.875rem] text-foreground bg-background border border-border rounded-[10px] outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>

                    {/* Dirección */}
                    <div>
                      <label className="block text-[.8rem] font-semibold text-muted-foreground mb-1.5">
                        {esFac ? 'Dirección fiscal *' : 'Dirección (opcional)'}
                      </label>
                      <input
                        type="text"
                        placeholder="Av., calle, distrito"
                        value={direccion}
                        onChange={e => setEmitirForm(prev => ({ ...prev, receptor: { ...prev.receptor, direccion: e.target.value } }))}
                        className="w-full h-[42px] px-[13px] text-[.875rem] text-foreground bg-background border border-border rounded-[10px] outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>

                  {/* Resumen totales */}
                  <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-xl overflow-hidden">
                    {[
                      { label: 'Base imponible', value: `S/.${base.toFixed(2)}` },
                      { label: 'IGV 18%', value: `S/.${igv.toFixed(2)}` },
                      { label: 'Total', value: `S/.${totalVenta.toFixed(2)}` },
                    ].map(item => (
                      <div key={item.label} className="px-[13px] py-[11px] bg-muted">
                        <div className="text-[.72rem] text-muted-foreground">{item.label}</div>
                        <div className="text-[.9rem] font-[650] mt-0.5 tabular-nums">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-[9px] px-[22px] py-[14px] border-t border-border/50 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => { setIsEmitirComprobanteOpen(false); setEmitirClienteEncontrado(null); }}
                    className="flex-none min-w-[110px] h-11 px-[18px] text-[.9rem] font-semibold text-muted-foreground bg-background border border-border rounded-[11px] hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!canSubmit || emitirSubmitting}
                    onClick={() => handleEmitirComprobante({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>)}
                    className="flex-1 h-11 flex items-center justify-center gap-2 text-[.9rem] font-semibold text-white bg-primary border-0 rounded-[11px] shadow-[0_8px_20px_-10px_hsl(var(--primary)/0.5)] disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:brightness-105 transition-all"
                  >
                    <FileText size={16} />
                    {emitirSubmitting ? 'Emitiendo…' : esFac ? 'Emitir factura' : 'Emitir boleta'}
                  </button>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {/* Dialog: Registrar Servicio (solo EMPRESA_SERVICIOS) */}
      <Dialog
        isOpen={registrarOpen}
        onClose={() => { setRegistrarOpen(false); resetRegistrarDialog(); }}
        title="Registrar Servicio"
        description="Registra un servicio prestado para poder emitir el comprobante."
      >
        <div className="space-y-4 p-1">

          {/* ── Buscador de servicios ─────────────────────────────── */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Servicio <span className="text-red-500">*</span></label>
            <div className="relative">
              <Zap className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Escribe para buscar..."
                value={servicioNombre || servicioSearch}
                className="pl-10 h-11"
                onFocus={() => { setServicioNombre(''); setShowServiciosList(true); }}
                onChange={(e) => {
                  setServicioSearch(e.target.value);
                  setServicioNombre('');
                  setRegistrarForm((f) => ({ ...f, servicioId: 0, precioUnitario: 0 }));
                  setShowServiciosList(true);
                }}
              />
              {servicioNombre && (
                <button
                  type="button"
                  onClick={() => { setServicioNombre(''); setServicioSearch(''); setRegistrarForm((f) => ({ ...f, servicioId: 0, precioUnitario: 0 })); }}
                  className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
              {showServiciosList && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {productos
                    .filter((p) => p.activo && p.tipo === 'SERVICIO' && (!servicioSearch || p.nombre.toLowerCase().includes(servicioSearch.toLowerCase())))
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setRegistrarForm((f) => ({ ...f, servicioId: p.id!, precioUnitario: p.precioVenta ?? 0 }));
                          setServicioNombre(p.nombre);
                          setServicioSearch('');
                          setShowServiciosList(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center justify-between gap-2 border-b last:border-0"
                      >
                        <span className="font-medium truncate">{p.nombre}</span>
                        <span className="text-primary font-semibold shrink-0">S/.{p.precioVenta?.toFixed(2)}</span>
                      </button>
                    ))}
                  {productos.filter((p) => p.activo && p.tipo === 'SERVICIO' && (!servicioSearch || p.nombre.toLowerCase().includes(servicioSearch.toLowerCase()))).length === 0 && (
                    <p className="px-4 py-3 text-sm text-muted-foreground">Sin resultados</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Cantidad y Precio ─────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Cantidad</label>
              <Input
                type="number" min="1"
                value={registrarForm.cantidad}
                onChange={(e) => setRegistrarForm((f) => ({ ...f, cantidad: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Precio unitario (S/.)</label>
              <Input
                type="number" step="0.01" min="0.01"
                value={registrarForm.precioUnitario || ''}
                onChange={(e) => setRegistrarForm((f) => ({ ...f, precioUnitario: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Total */}
          {registrarForm.precioUnitario > 0 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-2.5 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total a cobrar</span>
              <span className="text-lg font-bold text-primary">
                S/.{(registrarForm.cantidad * registrarForm.precioUnitario).toFixed(2)}
              </span>
            </div>
          )}

          {/* ── Cliente ───────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Cliente</label>
              <button
                type="button"
                onClick={() => { setUsarManual(!usarManual); setRegistrarForm((f) => ({ ...f, clienteId: 0 })); setClienteSearch(''); }}
                className="text-xs text-primary hover:underline"
              >
                {usarManual ? '← Buscar existente' : '+ DNI / RUC nuevo'}
              </button>
            </div>

            {usarManual ? (
              /* Cliente nuevo con DNI / RUC */
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Tipo doc.</label>
                    <select
                      value={clienteManual.tipoDoc}
                      onChange={(e) => setClienteManual((m) => ({ ...m, tipoDoc: e.target.value }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="DNI">DNI</option>
                      <option value="RUC">RUC</option>
                      <option value="CE">CE</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Número</label>
                    <Input
                      placeholder={clienteManual.tipoDoc === 'RUC' ? '20xxxxxxxxx' : '12345678'}
                      value={clienteManual.numDoc}
                      onChange={(e) => setClienteManual((m) => ({ ...m, numDoc: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {clienteManual.tipoDoc === 'RUC' ? 'Razón social' : 'Nombre completo'} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder={clienteManual.tipoDoc === 'RUC' ? 'Empresa S.A.C.' : 'Juan Pérez López'}
                    value={clienteManual.nombre}
                    onChange={(e) => setClienteManual((m) => ({ ...m, nombre: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Se guardará automáticamente en tus contactos.</p>
              </div>
            ) : (
              /* Buscar cliente existente */
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Buscar por nombre o documento..."
                  value={clienteSearch}
                  onChange={(e) => { setClienteSearch(e.target.value); setRegistrarForm((f) => ({ ...f, clienteId: 0 })); }}
                  className="pl-10 h-11"
                />
                {clienteSearch && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-background border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setClienteSearch('Consumidor final'); setRegistrarForm((f) => ({ ...f, clienteId: 0 })); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted border-b text-muted-foreground"
                    >
                      Sin cliente / Consumidor final
                    </button>
                    {clientes
                      .filter((c) => {
                        const q = clienteSearch.toLowerCase();
                        return c.nombre.toLowerCase().includes(q) || (c.numeroDocumento ?? '').includes(q);
                      })
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setRegistrarForm((f) => ({ ...f, clienteId: c.id! }));
                            setClienteSearch(`${c.nombre}${c.numeroDocumento ? ` — ${c.numeroDocumento}` : ''}`);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center justify-between border-b last:border-0"
                        >
                          <span className="font-medium">{c.nombre}</span>
                          {c.numeroDocumento && <span className="text-xs text-muted-foreground">{c.tipoDocumento} {c.numeroDocumento}</span>}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Método de pago ────────────────────────────────────── */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Método de pago</label>
            <div className="grid grid-cols-4 gap-2">
              {['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'YAPE_PLIN'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRegistrarForm((f) => ({ ...f, metodoPago: m }))}
                  className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                    registrarForm.metodoPago === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-muted'
                  }`}
                >
                  {m === 'YAPE_PLIN' ? 'Yape/Plin' : m.charAt(0) + m.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ── Botones ───────────────────────────────────────────── */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => { setRegistrarOpen(false); resetRegistrarDialog(); }}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleRegistrarServicio} disabled={registrarSaving}>
              {registrarSaving ? 'Registrando...' : 'Registrar Servicio'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}