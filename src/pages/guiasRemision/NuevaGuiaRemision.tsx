import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Plus, Trash2, Search, Truck, Package, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { guiaRemisionService } from '../../services/guiaRemision.service';
import { sucursalService } from '../../services/sucursal.service';
import { productoService } from '../../services/producto.service';
import { productoPresentacionService } from '../../services/productoPresentacion.service';
import { ventaService } from '../../services/venta.service';
import type { SucursalDTO } from '../../services/sucursal.service';
import type { ProductoDTO, ProductoPresentacionDTO, VentaDTO } from '../../types';
import type { CrearGuiaRemisionRequest, EditarBorradorRequest, GuiaRemisionItemDTO, GuiaRemisionResponse, TipoTrasladoGRE, ModalidadTransporteGRE } from '../../types/gre.types';
import { Button } from '../../components/ui/Button';
import { UbigeoSelector } from '../../components/gre/UbigeoSelector';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { MOTIVO_TRASLADO_OPTIONS, TIPO_DOC_OPTIONS, UNIDAD_MEDIDA_OPTIONS, abreviaturaToSunat } from './gre.helpers';

interface ItemForm {
  productoId: number | null;
  productoNombre: string;
  descripcion: string;
  cantidad: string;
  unidadMedida: string;
  stockActual?: number;
  presentacionId?: number;
  presentacionNombre?: string;
  factorConversion?: number;
}

interface FormData {
  tipoTraslado: TipoTrasladoGRE;
  motivoTrasladoCodigo: string;
  modalidadTransporte: ModalidadTransporteGRE;
  fechaTraslado: string;
  observaciones: string;
  pesoBrutoTotal: string;
  numeroBultos: string;
  // DELIVERY
  destinatarioTipoDoc: string;
  destinatarioNumDoc: string;
  destinatarioRazonSocial: string;
  destinatarioDireccion: string;
  ventaId: string;
  // SUCURSALES
  sucursalOrigenId: string;
  sucursalDestinoId: string;
  // Items
  items: ItemForm[];
  // Transporte
  ubigeoPartida: string;
  ubigeoLlegada: string;
  direccionPartida: string;
  direccionLlegada: string;
  vehiculoPlaca: string;
  conductorTipoDoc: string;
  conductorNumDoc: string;
  conductorNombres: string;
  conductorApellidos: string;
  conductorLicencia: string;
  transportistaRuc: string;
  transportistaDenominacion: string;
}

const defaultItem = (): ItemForm => ({
  productoId: null,
  productoNombre: '',
  descripcion: '',
  cantidad: '1',
  unidadMedida: 'NIU',
});

const defaultForm = (): FormData => ({
  tipoTraslado: 'DELIVERY',
  motivoTrasladoCodigo: '01',
  modalidadTransporte: 'PRIVADO',
  fechaTraslado: new Date().toISOString().slice(0, 10),
  observaciones: '',
  pesoBrutoTotal: '',
  numeroBultos: '',
  destinatarioTipoDoc: '6',
  destinatarioNumDoc: '',
  destinatarioRazonSocial: '',
  destinatarioDireccion: '',
  ventaId: '',
  sucursalOrigenId: '',
  sucursalDestinoId: '',
  items: [defaultItem()],
  ubigeoPartida: '',
  ubigeoLlegada: '',
  direccionPartida: '',
  direccionLlegada: '',
  vehiculoPlaca: '',
  conductorTipoDoc: '1',
  conductorNumDoc: '',
  conductorNombres: '',
  conductorApellidos: '',
  conductorLicencia: '',
  transportistaRuc: '',
  transportistaDenominacion: '',
});

const STEPS = ['Traslado', 'Destinatario', 'Items', 'Transporte'];

interface Props {
  onClose: () => void;
  onCreate: () => void;
  editData?: GuiaRemisionResponse;
  onUpdate?: (updated: GuiaRemisionResponse) => void;
}

function mapResponseToForm(g: GuiaRemisionResponse): FormData {
  return {
    tipoTraslado: g.tipoTraslado,
    motivoTrasladoCodigo: g.motivoTrasladoCodigo ?? '04',
    modalidadTransporte: g.modalidadTransporte,
    fechaTraslado: g.fechaTraslado,
    observaciones: g.observaciones ?? '',
    pesoBrutoTotal: g.pesoBrutoTotal != null ? String(g.pesoBrutoTotal) : '',
    numeroBultos: g.numeroBultos != null ? String(g.numeroBultos) : '',
    destinatarioTipoDoc: g.destinatarioTipoDoc ?? '6',
    destinatarioNumDoc: g.destinatarioNumDoc ?? '',
    destinatarioRazonSocial: g.destinatarioRazonSocial ?? '',
    destinatarioDireccion: g.destinatarioDireccion ?? '',
    ventaId: g.ventaId != null ? String(g.ventaId) : '',
    sucursalOrigenId: g.sucursalOrigenId != null ? String(g.sucursalOrigenId) : '',
    sucursalDestinoId: g.sucursalDestinoId != null ? String(g.sucursalDestinoId) : '',
    items: (g.items ?? []).map(i => ({
      productoId: i.productoId ?? null,
      productoNombre: i.descripcion ?? '',
      descripcion: i.descripcion ?? '',
      cantidad: String(i.cantidad ?? 1),
      unidadMedida: i.unidadMedida ?? 'NIU',
    })),
    ubigeoPartida: g.transporte?.ubigeoPartida ?? '',
    ubigeoLlegada: g.transporte?.ubigeoLlegada ?? '',
    direccionPartida: g.transporte?.direccionPartida ?? '',
    direccionLlegada: g.transporte?.direccionLlegada ?? '',
    vehiculoPlaca: g.transporte?.vehiculoPlaca ?? '',
    conductorTipoDoc: g.transporte?.conductorTipoDoc ?? '1',
    conductorNumDoc: g.transporte?.conductorNumDoc ?? '',
    conductorNombres: g.transporte?.conductorNombres ?? '',
    conductorApellidos: g.transporte?.conductorApellidos ?? '',
    conductorLicencia: g.transporte?.conductorLicencia ?? '',
    transportistaRuc: g.transporte?.transportistaRuc ?? '',
    transportistaDenominacion: g.transporte?.transportistaDenominacion ?? '',
  };
}

export function NuevaGuiaRemision({ onClose, onCreate, editData, onUpdate }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(editData ? mapResponseToForm(editData) : defaultForm());
  const [submitting, setSubmitting] = useState(false);
  const [sucursales, setSucursales] = useState<SucursalDTO[]>([]);

  const { config: negocio } = useTenantConfigStore();
  const esFarmacia = negocio?.rubro === 'BOTICA' || negocio?.rubro === 'FARMACIA';

  // F-10: detección de capacidades del tenant
  const tieneSucursales = sucursales.length > 0;
  const tieneDespacho = !!negocio?.ubigeoDespacho && !!negocio?.direccionDespacho;

  // Selector de ventas
  const [ventasAll, setVentasAll] = useState<VentaDTO[]>([]);
  const [ventasLoading, setVentasLoading] = useState(false);
  const [ventasCargadas, setVentasCargadas] = useState(false);
  const [ventaSearch, setVentaSearch] = useState('');
  const [ventaSelectorOpen, setVentaSelectorOpen] = useState(false);

  const cargarVentas = async () => {
    if (ventasCargadas || ventasLoading) return;
    setVentasLoading(true);
    try {
      const data = await ventaService.getAll();
      setVentasAll(data);
      setVentasCargadas(true);
    } catch {
      // silent
    } finally {
      setVentasLoading(false);
    }
  };

  const ventasFiltradas = ventasAll.filter(v => {
    if (!ventaSearch) return true;
    const q = ventaSearch.toLowerCase();
    return (
      String(v.id).includes(q) ||
      (v.clienteNombre?.toLowerCase().includes(q) ?? false)
    );
  }).slice(0, 20);

  const ventaSeleccionada = ventasAll.find(v => String(v.id) === form.ventaId) ?? null;

  // Refs para evitar que los efectos de precarga sobreescriban los ubigeos guardados en modo edición.
  // Se inicializan con el ID de sucursal del editData: si no cambia, el efecto hace skip.
  const prevOrigenIdRef = useRef<string>(
    editData?.sucursalOrigenId != null ? String(editData.sucursalOrigenId) : ''
  );
  const prevDestinoIdRef = useRef<string>(
    editData?.sucursalDestinoId != null ? String(editData.sucursalDestinoId) : ''
  );

  // Búsqueda de productos
  const [productoSearch, setProductoSearch] = useState('');
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [searchingProd, setSearchingProd] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);

  // Presentaciones por item (solo farmacia)
  const [presentacionesPorItem, setPresentacionesPorItem] = useState<Record<number, ProductoPresentacionDTO[]>>({});
  const [cargandoPres, setCargandoPres] = useState<Record<number, boolean>>({});

  useEffect(() => {
    sucursalService.listar()
      .then(setSucursales)
      .catch(() => {/* silent */});
  }, []);

  // Precarga ubigeo/dirección de partida cuando el usuario cambia la sucursal de origen.
  // En modo edición, si el ID de sucursal no cambió respecto al valor inicial (editData), skip.
  // Esto evita que la carga asíncrona de sucursales sobreescriba los ubigeos ya guardados en la GRE.
  useEffect(() => {
    if (!form.sucursalOrigenId) return;
    if (editData && form.sucursalOrigenId === prevOrigenIdRef.current) return;
    prevOrigenIdRef.current = form.sucursalOrigenId;
    const sucursalOrigen = sucursales.find(s => s.id === Number(form.sucursalOrigenId));
    const ubigeoAuto = sucursalOrigen?.ubigeo || negocio?.ubigeoDespacho || '';
    const dirAuto = sucursalOrigen?.direccionCompleta || sucursalOrigen?.direccion
      || negocio?.direccionDespacho || '';
    setForm(prev => ({ ...prev, ubigeoPartida: ubigeoAuto, direccionPartida: dirAuto }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sucursalOrigenId, sucursales]);

  // F-10 Caso B: tenant legacy sin sucursales, con punto de despacho — precargar ubigeo de partida
  useEffect(() => {
    if (tieneSucursales || !tieneDespacho || editData) return;
    setForm(prev => ({
      ...prev,
      ubigeoPartida: prev.ubigeoPartida || negocio!.ubigeoDespacho!,
      direccionPartida: prev.direccionPartida || negocio!.direccionDespacho!,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tieneSucursales, tieneDespacho]);

  // Precarga ubigeo/dirección de llegada cuando el usuario cambia la sucursal de destino.
  // NUNCA usa tenant.ubigeoDespacho como fallback para el destino.
  // En modo edición, skip si la sucursal no cambió respecto al valor inicial.
  useEffect(() => {
    if (!form.sucursalDestinoId) return;
    if (editData && form.sucursalDestinoId === prevDestinoIdRef.current) return;
    prevDestinoIdRef.current = form.sucursalDestinoId;
    const sucursalDestino = sucursales.find(s => s.id === Number(form.sucursalDestinoId));
    const ubigeoAuto = sucursalDestino?.ubigeo || '';
    const dirAuto = sucursalDestino?.direccionCompleta || sucursalDestino?.direccion || '';
    setForm(prev => ({ ...prev, ubigeoLlegada: ubigeoAuto, direccionLlegada: dirAuto }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sucursalDestinoId, sucursales]);

  const set = (key: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const setItem = (idx: number, key: keyof ItemForm, value: string) =>
    setForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [key]: value };
      return { ...prev, items };
    });

  const addItem = () =>
    setForm(prev => ({ ...prev, items: [...prev.items, defaultItem()] }));

  const removeItem = (idx: number) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
    setPresentacionesPorItem(prev => {
      const next: Record<number, ProductoPresentacionDTO[]> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki !== idx) next[ki > idx ? ki - 1 : ki] = v;
      });
      return next;
    });
  };

  const searchProductos = async (q: string) => {
    if (q.length < 2) { setProductos([]); return; }
    setSearchingProd(true);
    try {
      const data = await productoService.search(q);
      setProductos(data.filter(p => p.activo !== false).slice(0, 10));
    } catch {
      setProductos([]);
    } finally {
      setSearchingProd(false);
    }
  };

  const selectProducto = async (idx: number, p: ProductoDTO) => {
    setForm(prev => {
      const items = [...prev.items];
      items[idx] = {
        ...items[idx],
        productoId: p.id!,
        productoNombre: p.nombre,
        descripcion: p.nombre,
        stockActual: p.stockActual,
        unidadMedida: 'NIU',
        presentacionId: undefined,
        presentacionNombre: undefined,
        factorConversion: 1,
      };
      return { ...prev, items };
    });
    setActiveItemIdx(null);
    setProductoSearch('');
    setProductos([]);

    if (esFarmacia) {
      setCargandoPres(prev => ({ ...prev, [idx]: true }));
      try {
        const pres = await productoPresentacionService.listar(p.id!);
        setPresentacionesPorItem(prev => ({ ...prev, [idx]: pres }));
      } catch {
        // sin presentaciones — normal para productos sin config multi-unidad
      } finally {
        setCargandoPres(prev => ({ ...prev, [idx]: false }));
      }
    }
  };

  const selectPresentacion = (idx: number, pres: ProductoPresentacionDTO | null) => {
    setForm(prev => {
      const items = [...prev.items];
      if (!pres) {
        items[idx] = { ...items[idx], presentacionId: undefined, presentacionNombre: undefined, factorConversion: 1, unidadMedida: 'NIU' };
      } else {
        items[idx] = {
          ...items[idx],
          presentacionId: pres.id,
          presentacionNombre: `${pres.unidadMedidaNombre ?? pres.unidadMedidaAbreviatura ?? 'Presentación'} ×${pres.factor}`,
          factorConversion: pres.factor,
          unidadMedida: abreviaturaToSunat(pres.unidadMedidaAbreviatura),
        };
      }
      return { ...prev, items };
    });
  };

  const validate = (): string | null => {
    if (step === 0) {
      if (!form.fechaTraslado) return 'Ingresa la fecha de traslado';
    }
    if (step === 1) {
      if (form.tipoTraslado === 'DELIVERY') {
        if (!form.destinatarioRazonSocial.trim()) return 'Ingresa la razón social del destinatario';
        if (!form.ventaId) {
          if (tieneSucursales && !form.sucursalOrigenId)
            return 'Selecciona la sucursal de origen para el despacho independiente';
          if (!tieneSucursales && !tieneDespacho)
            return 'Configura el punto de despacho en Configuración → Negocio antes de emitir guías DELIVERY independientes';
          // Caso B: sin sucursales pero con ubigeo/dirección → permitir
        }
      } else {
        if (!form.sucursalOrigenId) return 'Selecciona la sucursal de origen';
        if (!form.sucursalDestinoId) return 'Selecciona la sucursal de destino';
        if (form.sucursalOrigenId === form.sucursalDestinoId) return 'El origen y el destino deben ser distintos';
      }
    }
    if (step === 2) {
      if (form.items.length === 0) return 'Agrega al menos un item';
      for (const item of form.items) {
        if (!item.productoId) return 'Selecciona un producto para cada item';
        if (!item.cantidad || Number(item.cantidad) <= 0) return 'La cantidad debe ser mayor a cero';
      }
    }
    if (step === 3) {
      if (!form.direccionPartida.trim()) return 'Ingresa la dirección de partida';
      if (!form.direccionLlegada.trim()) return 'Ingresa la dirección de llegada';
      if (form.modalidadTransporte === 'PRIVADO') {
        if (!form.vehiculoPlaca.trim()) return 'Ingresa la placa del vehículo (transporte privado)';
      } else {
        if (!form.transportistaRuc.trim()) return 'Ingresa el RUC del transportista';
      }
    }
    return null;
  };

  const nextStep = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setStep(prev => Math.min(STEPS.length - 1, prev + 1));
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }

    const items: GuiaRemisionItemDTO[] = form.items.map(i => ({
      productoId: i.productoId!,
      descripcion: i.descripcion || undefined,
      cantidad: Number(i.cantidad),
      unidadMedida: i.unidadMedida,
      presentacionId: i.presentacionId ?? undefined,
    }));

    const req: CrearGuiaRemisionRequest = {
      tipoTraslado: form.tipoTraslado,
      motivoTrasladoCodigo: form.motivoTrasladoCodigo || undefined,
      modalidadTransporte: form.modalidadTransporte,
      fechaTraslado: form.fechaTraslado,
      observaciones: form.observaciones || undefined,
      pesoBrutoTotal: form.pesoBrutoTotal ? Number(form.pesoBrutoTotal) : undefined,
      numeroBultos: form.numeroBultos ? Number(form.numeroBultos) : undefined,
      ...(form.tipoTraslado === 'DELIVERY' ? {
        destinatarioTipoDoc: form.destinatarioTipoDoc || undefined,
        destinatarioNumDoc: form.destinatarioNumDoc || undefined,
        destinatarioRazonSocial: form.destinatarioRazonSocial || undefined,
        destinatarioDireccion: form.destinatarioDireccion || undefined,
        ventaId: form.ventaId ? Number(form.ventaId) : undefined,
        // Caso A: despacho independiente con sucursales → incluir origen
        // Caso B: tenant legacy sin sucursales → no enviar sucursalOrigenId (backend usa ubigeoDespacho)
        sucursalOrigenId: !form.ventaId && tieneSucursales && form.sucursalOrigenId ? Number(form.sucursalOrigenId) : undefined,
      } : {
        sucursalOrigenId: Number(form.sucursalOrigenId),
        sucursalDestinoId: Number(form.sucursalDestinoId),
      }),
      items,
      transporte: {
        ubigeoPartida: form.ubigeoPartida || undefined,
        ubigeoLlegada: form.ubigeoLlegada || undefined,
        direccionPartida: form.direccionPartida,
        direccionLlegada: form.direccionLlegada,
        ...(form.modalidadTransporte === 'PRIVADO' ? {
          vehiculoPlaca: form.vehiculoPlaca || undefined,
          conductorTipoDoc: form.conductorTipoDoc || undefined,
          conductorNumDoc: form.conductorNumDoc || undefined,
          conductorNombres: form.conductorNombres || undefined,
          conductorApellidos: form.conductorApellidos || undefined,
          conductorLicencia: form.conductorLicencia || undefined,
        } : {
          transportistaRuc: form.transportistaRuc || undefined,
          transportistaDenominacion: form.transportistaDenominacion || undefined,
        }),
      },
    };

    setSubmitting(true);
    try {
      if (editData) {
        const editReq: EditarBorradorRequest = {
          motivoTrasladoCodigo: req.motivoTrasladoCodigo,
          motivoTrasladoDescripcion: req.motivoTrasladoDescripcion,
          modalidadTransporte: req.modalidadTransporte,
          fechaTraslado: req.fechaTraslado,
          observaciones: req.observaciones,
          pesoBrutoTotal: req.pesoBrutoTotal,
          numeroBultos: req.numeroBultos,
          sucursalOrigenId: form.tipoTraslado === 'DELIVERY' && !form.ventaId && tieneSucursales && form.sucursalOrigenId
            ? Number(form.sucursalOrigenId)
            : undefined,
          destinatarioTipoDoc: req.destinatarioTipoDoc,
          destinatarioNumDoc: req.destinatarioNumDoc,
          destinatarioRazonSocial: req.destinatarioRazonSocial,
          destinatarioDireccion: req.destinatarioDireccion,
          items: req.items,
          transporte: req.transporte,
        };
        const updated = await guiaRemisionService.actualizar(editData.id, editReq);
        toast.success('Guía de remisión actualizada correctamente');
        onUpdate?.(updated);
        onClose();
      } else {
        await guiaRemisionService.crear(req);
        toast.success('Guía de remisión creada correctamente');
        onCreate();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (editData ? 'Error al actualizar guía' : 'Error al crear guía');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };


  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-5"
      style={{ background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
      aria-modal="true">
      <style>{`@keyframes gre-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`}</style>

      <div className="w-full bg-card rounded-[18px] shadow-[0_30px_80px_-30px_rgba(0,0,0,.55)] flex flex-col max-h-[calc(100vh-40px)] overflow-hidden border border-border"
        style={{ maxWidth: '760px', animation: 'gre-in .2s ease' }}
        onClick={e => e.stopPropagation()}>
        {/* Header — patrón Fluxus */}
        <div className="flex items-start gap-3 px-[22px] pt-5 pb-4 border-b border-border/60 shrink-0">
          <span className="w-[38px] h-[38px] flex-shrink-0 grid place-items-center rounded-[11px] bg-primary/10 text-primary">
            <Truck className="w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.08rem] font-bold tracking-tight leading-none text-foreground">
              {editData ? `Editar Guía ${editData.numeroCompleto}` : 'Nueva Guía de Remisión'}
            </h2>
            <p className="text-[.8rem] text-muted-foreground mt-1">
              {editData ? 'Modifica los campos del borrador' : 'Registra y emite una guía de remisión electrónica'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-[30px] h-[30px] flex-shrink-0 grid place-items-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center px-[22px] py-3.5 border-b border-border/60 gap-0 shrink-0 overflow-x-auto bg-muted/20">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center min-w-0">
              <div className="flex items-center gap-2">
                {i < step ? (
                  <span className="w-6 h-6 flex-shrink-0 grid place-items-center rounded-full bg-primary/15">
                    <CheckCircle2 className="w-[14px] h-[14px] text-primary" />
                  </span>
                ) : (
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold flex-shrink-0 transition-colors
                    ${i === step
                      ? 'bg-primary text-white shadow-sm shadow-primary/30 ring-2 ring-primary/20'
                      : 'bg-muted text-muted-foreground border border-border'}`}>
                    {i + 1}
                  </div>
                )}
                <span className={`text-[.78rem] whitespace-nowrap transition-colors font-medium
                  ${i === step ? 'text-foreground' : i < step ? 'text-primary/70' : 'text-muted-foreground'}`}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-8 mx-2.5 flex-shrink-0 transition-colors rounded-full ${i < step ? 'bg-primary/40' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-[22px] py-5 space-y-4">
          {/* PASO 0: Traslado */}
          {step === 0 && (
            <>
              <Field label="Tipo de traslado">
                <div className="flex gap-3">
                  {(['DELIVERY', 'SUCURSALES'] as TipoTrasladoGRE[]).map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value={t} checked={form.tipoTraslado === t}
                        onChange={() => set('tipoTraslado', t)}
                        className="accent-blue-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {t === 'DELIVERY' ? 'Delivery (a cliente)' : 'Entre sucursales'}
                      </span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Motivo de traslado (cód. SUNAT)">
                <select value={form.motivoTrasladoCodigo} onChange={e => set('motivoTrasladoCodigo', e.target.value)}
                  className={inputCls}>
                  {MOTIVO_TRASLADO_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Fecha de traslado">
                  <input type="date" value={form.fechaTraslado} onChange={e => set('fechaTraslado', e.target.value)}
                    className={inputCls} />
                </Field>

                <Field label="Modalidad de transporte">
                  <select value={form.modalidadTransporte} onChange={e => set('modalidadTransporte', e.target.value as ModalidadTransporteGRE)}
                    className={inputCls}>
                    <option value="PRIVADO">Privado (vehículo propio)</option>
                    <option value="PUBLICO">Público (transportista)</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Peso bruto total (kg)" optional>
                  <input type="number" min="0" step="0.01" value={form.pesoBrutoTotal}
                    onChange={e => set('pesoBrutoTotal', e.target.value)}
                    placeholder="0.00" className={inputCls} />
                </Field>
                <Field label="N° bultos" optional>
                  <input type="number" min="1" value={form.numeroBultos}
                    onChange={e => set('numeroBultos', e.target.value)}
                    placeholder="1" className={inputCls} />
                </Field>
              </div>

              <Field label="Observaciones" optional>
                <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
                  rows={2} placeholder="Instrucciones adicionales..."
                  className={inputCls + ' resize-none'} />
              </Field>
            </>
          )}

          {/* PASO 1: Destinatario o Sucursales */}
          {step === 1 && (
            <>
              {form.tipoTraslado === 'DELIVERY' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Tipo documento">
                      <select value={form.destinatarioTipoDoc} onChange={e => set('destinatarioTipoDoc', e.target.value)}
                        className={inputCls}>
                        {TIPO_DOC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </Field>
                    <Field label="N° documento" optional>
                      <input type="text" value={form.destinatarioNumDoc}
                        onChange={e => set('destinatarioNumDoc', e.target.value)}
                        placeholder="20100000000" className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Razón social / Nombre">
                    <input type="text" value={form.destinatarioRazonSocial}
                      onChange={e => set('destinatarioRazonSocial', e.target.value)}
                      placeholder="Nombre del destinatario" className={inputCls} />
                  </Field>
                  <Field label="Dirección" optional>
                    <input type="text" value={form.destinatarioDireccion}
                      onChange={e => set('destinatarioDireccion', e.target.value)}
                      placeholder="Dirección de entrega" className={inputCls} />
                  </Field>
                  {/* Selector de ventas */}
                  <div className="space-y-[6px]">
                    <label className="block text-[.8rem] font-semibold text-foreground/70">
                      Venta asociada
                      <span className="ml-1 text-[.75rem] font-normal text-muted-foreground/60">(opcional)</span>
                    </label>
                    <div className="relative">
                      {(form.ventaId) ? (
                        <div className="flex items-center gap-2 px-3 py-[10px] border border-border rounded-[10px] bg-background text-sm">
                          <span className="flex-1 text-foreground">
                            <span className="text-muted-foreground mr-1">#{ventaSeleccionada?.id ?? form.ventaId}</span>
                            {ventaSeleccionada?.clienteNombre ?? (ventasCargadas ? 'Sin nombre' : '—')}
                          </span>
                          <button
                            type="button"
                            onClick={() => { set('ventaId', ''); setVentaSearch(''); }}
                            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                            aria-label="Quitar venta">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Buscar por n° venta o cliente…"
                            value={ventaSearch}
                            onFocus={() => { setVentaSelectorOpen(true); cargarVentas(); }}
                            onBlur={() => setTimeout(() => setVentaSelectorOpen(false), 150)}
                            onChange={e => { setVentaSearch(e.target.value); setVentaSelectorOpen(true); }}
                            className={inputCls + ' pl-9'}
                          />
                        </div>
                      )}
                      {ventaSelectorOpen && !form.ventaId && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto">
                          {ventasLoading && (
                            <div className="px-4 py-3 text-sm text-muted-foreground">Cargando ventas...</div>
                          )}
                          {!ventasLoading && ventasFiltradas.length === 0 && (
                            <div className="px-4 py-3 text-sm text-muted-foreground">
                              {ventasCargadas ? 'Sin resultados' : 'Sin ventas disponibles'}
                            </div>
                          )}
                          {!ventasLoading && ventasFiltradas.map(v => (
                            <button
                              key={v.id}
                              type="button"
                              onMouseDown={() => {
                                setForm(prev => ({
                                  ...prev,
                                  ventaId: String(v.id),
                                  ...(v.clienteNombre && !prev.destinatarioRazonSocial
                                    ? { destinatarioRazonSocial: v.clienteNombre }
                                    : {}),
                                }));
                                setVentaSearch('');
                                setVentaSelectorOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center justify-between gap-3">
                              <span className="text-sm text-foreground">
                                <span className="text-muted-foreground mr-1.5">#{v.id}</span>
                                {v.clienteNombre ?? 'Sin nombre'}
                              </span>
                              <span className="text-[.72rem] text-muted-foreground flex-shrink-0">
                                {v.total != null ? `S/ ${Number(v.total).toFixed(2)}` : ''}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Despacho independiente (sin venta): Casos A, B, C */}
                  {!form.ventaId && (
                    <>
                      {/* Caso A: tenant con sucursales → selector obligatorio */}
                      {tieneSucursales && (
                        <>
                          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>
                              <strong>Despacho independiente</strong> — sin venta asociada, debes indicar
                              desde qué sucursal sale la mercadería para registrar la salida de inventario.
                            </span>
                          </div>
                          <Field label="Sucursal de origen (obligatorio)">
                            <select value={form.sucursalOrigenId}
                              onChange={e => set('sucursalOrigenId', e.target.value)}
                              className={inputCls}>
                              <option value="">Seleccionar sucursal de despacho…</option>
                              {sucursales.map(s => (
                                <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                              ))}
                            </select>
                          </Field>
                        </>
                      )}

                      {/* Caso B: tenant legacy con punto de despacho → aviso informativo */}
                      {!tieneSucursales && tieneDespacho && (
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700/40 px-4 py-3 text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2">
                          <Package className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="space-y-0.5">
                            <p><strong>Punto de despacho configurado</strong></p>
                            <p className="text-blue-600 dark:text-blue-300">
                              {negocio!.direccionDespacho}
                              {negocio!.ubigeoDespacho ? ` (${negocio!.ubigeoDespacho})` : ''}
                            </p>
                            <p className="text-[.75rem] text-blue-500 dark:text-blue-400">
                              La salida de inventario se registrará desde este punto.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Caso C: tenant legacy sin punto de despacho → bloqueo */}
                      {!tieneSucursales && !tieneDespacho && (
                        <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700/40 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Punto de despacho no configurado.</strong>{' '}
                            Para emitir una guía DELIVERY sin venta, primero configura la dirección
                            y ubigeo de despacho en{' '}
                            <strong>Configuración → Negocio</strong>.
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  {sucursales.length === 0 ? (
                    <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/40 px-4 py-3 rounded-xl">
                      No se encontraron sucursales. Verifica que tengas sucursales registradas en Configuración.
                    </p>
                  ) : (
                    <>
                      <Field label="Sucursal de origen">
                        <select value={form.sucursalOrigenId} onChange={e => set('sucursalOrigenId', e.target.value)}
                          className={inputCls}>
                          <option value="">Seleccionar origen</option>
                          {sucursales.map(s => (
                            <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Sucursal de destino">
                        <select value={form.sucursalDestinoId} onChange={e => set('sucursalDestinoId', e.target.value)}
                          className={inputCls}>
                          <option value="">Seleccionar destino</option>
                          {sucursales.filter(s => String(s.id) !== form.sucursalOrigenId).map(s => (
                            <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                          ))}
                        </select>
                      </Field>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* PASO 2: Items */}
          {step === 2 && (
            <div className="space-y-3">
              {form.items.map((item, idx) => {
                const stockDisp = item.stockActual ?? null;
                const factor = item.factorConversion ?? 1;
                const stockEnPresentacion = stockDisp !== null ? Math.floor(stockDisp / factor) : null;
                const cantidadNum = Number(item.cantidad) || 0;
                const sinStock = stockDisp !== null && cantidadNum * factor > stockDisp;
                const presentaciones = presentacionesPorItem[idx] ?? [];

                return (
                  <div key={idx} className="p-4 bg-muted/40 rounded-xl space-y-3 border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        Item {idx + 1}
                        {item.productoId && stockDisp !== null && (
                          <span className={`ml-1 text-[.72rem] font-normal px-1.5 py-0.5 rounded-full ${sinStock ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                            Stock: {stockEnPresentacion ?? stockDisp}
                            {item.presentacionNombre ? ` (en ${item.presentacionNombre.split(' ×')[0]})` : ' uds.'}
                          </span>
                        )}
                      </span>
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(idx)}
                          className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Buscador de producto */}
                    <div className="relative">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar producto..."
                          value={activeItemIdx === idx ? productoSearch : (item.productoNombre || '')}
                          onFocus={() => { setActiveItemIdx(idx); setProductoSearch(item.productoNombre || ''); }}
                          onChange={e => {
                            setProductoSearch(e.target.value);
                            searchProductos(e.target.value);
                          }}
                          className={inputCls + ' pl-9'}
                        />
                      </div>
                      {activeItemIdx === idx && productoSearch.length >= 2 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto">
                          {searchingProd && <div className="px-4 py-3 text-sm text-muted-foreground">Buscando...</div>}
                          {!searchingProd && productos.length === 0 && (
                            <div className="px-4 py-3 text-sm text-muted-foreground">Sin resultados</div>
                          )}
                          {!searchingProd && productos.map(p => {
                            const s = p.stockActual ?? 0;
                            return (
                              <button key={p.id} onClick={() => selectProducto(idx, p)}
                                className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center justify-between gap-3">
                                <span className="text-sm text-foreground truncate">{p.nombre}</span>
                                <span className={`text-[.72rem] font-medium flex-shrink-0 ${s > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                  {s > 0 ? `${s} uds.` : 'Sin stock'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Selector de presentación (solo farmacia) */}
                    {esFarmacia && item.productoId && (
                      cargandoPres[idx] ? (
                        <p className="text-[.75rem] text-muted-foreground">Cargando presentaciones...</p>
                      ) : presentaciones.length > 0 ? (
                        <Field label="Presentación">
                          <select
                            value={item.presentacionId ?? ''}
                            onChange={e => {
                              const pid = e.target.value;
                              if (!pid) { selectPresentacion(idx, null); return; }
                              const pres = presentaciones.find(p => String(p.id) === pid);
                              if (pres) selectPresentacion(idx, pres);
                            }}
                            className={inputCls}>
                            <option value="">Por unidad (NIU)</option>
                            {presentaciones.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.unidadMedidaNombre ?? p.unidadMedidaAbreviatura} ×{p.factor}
                              </option>
                            ))}
                          </select>
                        </Field>
                      ) : null
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Field label="Cantidad">
                          <input type="number" min="0.001" step="0.001" value={item.cantidad}
                            onChange={e => setItem(idx, 'cantidad', e.target.value)}
                            className={inputCls + (sinStock ? ' border-orange-400 focus:border-orange-400' : '')} />
                        </Field>
                        {sinStock && (
                          <p className="mt-1 flex items-center gap-1 text-[.72rem] text-orange-600 dark:text-orange-400">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            Supera el stock disponible ({stockEnPresentacion ?? stockDisp})
                          </p>
                        )}
                      </div>
                      <Field label="Unidad (SUNAT)">
                        <select value={item.unidadMedida}
                          onChange={e => setItem(idx, 'unidadMedida', e.target.value)}
                          className={inputCls}>
                          {UNIDAD_MEDIDA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </Field>
                    </div>

                    <Field label="Descripción" optional>
                      <input type="text" value={item.descripcion}
                        onChange={e => setItem(idx, 'descripcion', e.target.value)}
                        placeholder="Descripción del bien (opcional)"
                        className={inputCls} />
                    </Field>
                  </div>
                );
              })}

              <button onClick={addItem}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Plus className="w-4 h-4" />
                Agregar item
              </button>
            </div>
          )}

          {/* PASO 3: Transporte */}
          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <UbigeoSelector
                  label="Ubigeo de partida (opcional)"
                  value={form.ubigeoPartida}
                  onChange={codigo => set('ubigeoPartida', codigo)}
                />
                <UbigeoSelector
                  label="Ubigeo de llegada (opcional)"
                  value={form.ubigeoLlegada}
                  onChange={codigo => set('ubigeoLlegada', codigo)}
                />
              </div>
              <Field label="Dirección de partida">
                <input type="text" value={form.direccionPartida}
                  onChange={e => set('direccionPartida', e.target.value)}
                  placeholder="Almacén / tienda de origen" className={inputCls} />
              </Field>
              <Field label="Dirección de llegada">
                <input type="text" value={form.direccionLlegada}
                  onChange={e => set('direccionLlegada', e.target.value)}
                  placeholder="Dirección de destino" className={inputCls} />
              </Field>

              {form.modalidadTransporte === 'PRIVADO' ? (
                <>
                  <Field label="Placa del vehículo">
                    <input type="text" value={form.vehiculoPlaca}
                      onChange={e => set('vehiculoPlaca', e.target.value.toUpperCase())}
                      placeholder="ABC-123" className={inputCls + ' uppercase'} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Tipo doc. conductor">
                      <select value={form.conductorTipoDoc}
                        onChange={e => set('conductorTipoDoc', e.target.value)}
                        className={inputCls}>
                        {TIPO_DOC_OPTIONS.filter(o => o.value !== '-').map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="N° doc. conductor" optional>
                      <input type="text" value={form.conductorNumDoc}
                        onChange={e => set('conductorNumDoc', e.target.value)}
                        placeholder="12345678" className={inputCls} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Nombres conductor" optional>
                      <input type="text" value={form.conductorNombres}
                        onChange={e => set('conductorNombres', e.target.value)}
                        placeholder="Juan" className={inputCls} />
                    </Field>
                    <Field label="Apellidos conductor" optional>
                      <input type="text" value={form.conductorApellidos}
                        onChange={e => set('conductorApellidos', e.target.value)}
                        placeholder="Pérez Gómez" className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Licencia de conducir" optional>
                    <input type="text" value={form.conductorLicencia}
                      onChange={e => set('conductorLicencia', e.target.value)}
                      placeholder="Q12345678" className={inputCls} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="RUC transportista">
                    <input type="text" value={form.transportistaRuc}
                      onChange={e => set('transportistaRuc', e.target.value)}
                      placeholder="20100000000" maxLength={11} className={inputCls} />
                  </Field>
                  <Field label="Nombre / denominación" optional>
                    <input type="text" value={form.transportistaDenominacion}
                      onChange={e => set('transportistaDenominacion', e.target.value)}
                      placeholder="Empresa transportista S.A.C." className={inputCls} />
                  </Field>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-[22px] py-4 border-t border-border/60 flex items-center justify-between bg-card">
          <Button
            variant="secondary"
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? 'Cancelar' : 'Atrás'}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={nextStep} className="flex items-center gap-1.5">
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5"
            >
              {submitting ? 'Guardando...' : (editData ? 'Guardar cambios' : 'Crear Borrador')}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const inputCls = `w-full px-3 py-[10px] text-sm border border-border rounded-[10px]
  bg-background text-foreground leading-tight
  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors`;

function Field({ label, optional = false, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-[6px]">
      <label className="block text-[.8rem] font-semibold text-foreground/70">
        {label}
        {!optional && <span className="ml-0.5 text-red-500">*</span>}
        {optional && <span className="ml-1 text-[.75rem] font-normal text-muted-foreground/60">(opcional)</span>}
      </label>
      {children}
    </div>
  );
}
