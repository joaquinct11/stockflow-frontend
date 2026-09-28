import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useLocation } from 'react-router-dom';
import { productoService } from '../../services/producto.service';
import { refreshOnboarding } from '../../utils/onboardingEvents';
import { unidadMedidaService } from '../../services/unidadMedida.service';
import { categoriaService } from '../../services/categoria.service';
import { productoVarianteService } from '../../services/productoVariante.service';
import { productoPresentacionService } from '../../services/productoPresentacion.service';
import type { ProductoDTO, UnidadMedidaDTO, CategoriaDTO, ProductoVarianteDTO } from '../../types';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { useSucursalStore } from '../../store/sucursalStore';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Edit2, Layers, Trash2, Plus, Loader2 } from 'lucide-react';

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

// Inputs Fluxus — definidos a nivel de módulo para que React no los desmonte en cada render
const FxInput = ({ style: s, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} style={{ width: '100%', height: 44, padding: '0 13px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', ...s }}
    onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; if (p.onFocus) (p.onFocus as React.FocusEventHandler<HTMLInputElement>)(e); }}
    onBlur={e => { e.currentTarget.style.borderColor = (s as React.CSSProperties)?.borderColor ?? T.line; e.currentTarget.style.boxShadow = 'none'; if (p.onBlur) (p.onBlur as React.FocusEventHandler<HTMLInputElement>)(e); }} />
);
const FxSelect = ({ style: s, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
    <select {...p} style={{ width: '100%', height: 44, padding: '0 34px 0 13px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box', ...s }}>
      {children}
    </select>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="m6 9 6 6 6-6"/></svg>
  </div>
);

const HUES = [210, 260, 340, 30, 160, 200, 280, 0, 130, 320];
function avatarStyle(nombre: string): { bg: string; color: string } {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) | 0;
  const h = HUES[Math.abs(hash) % HUES.length];
  return { bg: `hsl(${h},70%,93%)`, color: `hsl(${h},55%,38%)` };
}
function iniciales(nombre: string): string {
  const words = nombre.split(/\s+/).filter(w => w.length > 0);
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join('') || nombre.slice(0, 2).toUpperCase();
}

const CONFIRM_CFG = {
  activar:    { tone: T.ok,   toneSoft: T.okSoft,   titulo: 'Activar producto',    sub: 'Volverá a estar disponible para ventas.',        texto: 'Podrás seleccionarlo en el POS y al crear órdenes. Su historial se conserva.',                                btnLabel: 'Activar producto',         iconPath: 'M9 12.5 11.5 15 15.5 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
  desactivar: { tone: T.warn, toneSoft: T.warnSoft, titulo: 'Desactivar producto', sub: 'Puedes volver a activarlo cuando quieras.',       texto: 'No aparecerá en el POS ni en nuevas ventas. Su historial de movimientos se conserva.',                     btnLabel: 'Desactivar',               iconPath: 'M15 9l-6 6M9 9l6 6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
  eliminar:   { tone: T.bad,  toneSoft: T.badSoft,  titulo: 'Eliminar producto',   sub: 'Esta acción no se puede deshacer.',              texto: 'Se eliminará permanentemente. Si solo quieres ocultarlo del POS, mejor desactívalo.',                        btnLabel: 'Eliminar permanentemente', iconPath: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' },
} as const;
type CfAction = keyof typeof CONFIRM_CFG;

type EstadoFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';
type StockFilter  = '' | 'CERO' | 'BAJO' | 'NORMAL';


export function ProductosList() {
  const { canCreate, canEdit, canDelete, canView } = usePermissions();
  const hasViewPermission = canView('PRODUCTOS');
  const { user } = useAuthStore();
  const { config: negocioConfig } = useTenantConfigStore();
  const { sucursalActual, sucursales, loaded: sucursalLoaded } = useSucursalStore();
  const location = useLocation();
  const isMultiLocal = sucursales.length > 1;
  const sucursalId = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;
  const [searchParams] = useSearchParams();
  const tipoParam = searchParams.get('tipo'); // 'SERVICIO' | 'PRODUCTO' | null
  const esRopa       = negocioConfig?.rubro === 'TIENDA_ROPA';
  const esFarmacia   = negocioConfig?.rubro === 'BOTICA' || negocioConfig?.rubro === 'FARMACIA';
  // Para dealer: ?tipo=PRODUCTO fuerza modo productos; ?tipo=SERVICIO o sin param => modo servicios
  const esServicios  = tipoParam === 'SERVICIO' || (negocioConfig?.rubro === 'EMPRESA_SERVICIOS' && tipoParam !== 'PRODUCTO');

  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedidaDTO[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [loadingUnidades, setLoadingUnidades] = useState(false);

  // Mini-modal nueva unidad de medida
  const [nuevaUnidadOpen, setNuevaUnidadOpen] = useState(false);
  const [nuevaUnidadNombre, setNuevaUnidadNombre] = useState('');
  const [savingUnidad, setSavingUnidad] = useState(false);

  // Mini-panel nueva categoría
  const [nuevaCategoriaOpen, setNuevaCategoriaOpen] = useState(false);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');
  const [savingCategoria, setSavingCategoria] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Nuevos filtros Fluxus
  const [filtroEstado, setFiltroEstado] = useState<EstadoFilter>('ACTIVOS');
  const [filtroCategoria, setFiltroCategoria] = useState<number>(0);
  const [filtroStock, setFiltroStock] = useState<StockFilter>('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [cfState, setCfState] = useState<{ open: boolean; action: CfAction; producto: ProductoDTO | null; running: boolean }>({ open: false, action: 'eliminar', producto: null, running: false });

  // Auto-abrir dialog si viene desde acceso rápido del dashboard
  useEffect(() => {
    if ((location.state as { openDialog?: boolean } | null)?.openDialog) {
      setIsDialogOpen(true);
      window.history.replaceState({}, '');
    }
  }, []);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportMenuOpen]);

  // Sugerencias de nombre duplicado
  const [nombreSugerencias, setNombreSugerencias] = useState<ProductoDTO[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Imagen del producto
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('La imagen no puede superar 10 MB'); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const originalDataUrl = ev.target?.result as string;
      // Comprimir con Canvas: máx 400×400px, JPEG 80%
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        let w = img.width;
        let h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else       { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.80);
        setImgPreview(compressed);
        setFormData(p => ({ ...p, imagenUrl: compressed }));
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // confirmDialog eliminado — reemplazado por cfState (portal Fluxus)

  // Variantes (solo TIENDA_ROPA)
  const [isVariantesOpen, setIsVariantesOpen] = useState(false);
  const [productoVariantes, setProductoVariantes] = useState<ProductoVarianteDTO[]>([]);
  const [selectedProductoVariantes, setSelectedProductoVariantes] = useState<ProductoDTO | null>(null);
  const [loadingVariantes, setLoadingVariantes] = useState(false);
  const [varianteForm, setVarianteForm] = useState<ProductoVarianteDTO>({ productoId: 0, talla: '', color: '', stockActual: 0, stockMinimo: 0, sku: '', activo: true });
  const [editingVarianteId, setEditingVarianteId] = useState<number | null>(null);
  const [savingVariante, setSavingVariante] = useState(false);

  // Borrador de variantes en el formulario de producto (TIENDA_ROPA)
  interface VarianteBorrador { id?: number; talla: string; color: string; stockActual: number; stockMinimo: number; sku: string; }
  const [variantesBorrador, setVariantesBorrador] = useState<VarianteBorrador[]>([]);
  const addVarianteBorrador = () => setVariantesBorrador(p => [...p, { talla: '', color: '', stockActual: 0, stockMinimo: 0, sku: '' }]);
  const removeVarianteBorrador = (idx: number) => setVariantesBorrador(p => p.filter((_, i) => i !== idx));
  const updateVarianteBorrador = (idx: number, field: string, value: string | number) =>
    setVariantesBorrador(p => p.map((v, i) => i === idx ? { ...v, [field]: value } : v));

  // Presentaciones adicionales (multi-unidad, solo farmacia)
  interface PresentacionBorrador { id?: number; unidadMedidaId: number; precioVenta: number; factor: number; esPrincipal: boolean; }
  const [presentacionesBorrador, setPresentacionesBorrador] = useState<PresentacionBorrador[]>([]);
  const addPresentacionBorrador = () =>
    setPresentacionesBorrador(p => [...p, { unidadMedidaId: unidadesMedida[0]?.id ?? 0, precioVenta: 0, factor: 1, esPrincipal: false }]);
  const removePresentacionBorrador = (idx: number) =>
    setPresentacionesBorrador(p => p.filter((_, i) => i !== idx));
  const updatePresentacionBorrador = (idx: number, field: string, value: string | number | boolean) =>
    setPresentacionesBorrador(p => p.map((v, i) => i === idx ? { ...v, [field]: value } : v));

  const [formData, setFormData] = useState<ProductoDTO>({
    nombre: '',
    codigoBarras: '',
    categoriaId: 0,
    stockActual: 0,
    stockMinimo: 10,
    stockMaximo: 500,
    costoUnitario: 0,
    precioVenta: 0,
    activo: true,
    tenantId: user?.tenantId ?? '',
    unidadMedidaId: 0,
    esGenerico: false,
    tipo: 'PRODUCTO',
    unidadesPorCaja: undefined,
    talla: undefined,
    color: undefined,
    registroSanitario: '',
  });

  useEffect(() => {
    if (!sucursalLoaded) return;
    if (hasViewPermission) fetchData();
  }, [mostrarInactivos]);

  useEffect(() => {
    const needed = filtroEstado !== 'ACTIVOS';
    if (needed !== mostrarInactivos) setMostrarInactivos(needed);
  }, [filtroEstado]);

  useEffect(() => {
    if (!sucursalLoaded) return;
    if (hasViewPermission) {
      fetchData();
    } else if (canCreate('PRODUCTOS')) {
      fetchUnidades();
      setLoading(false);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalLoaded, hasViewPermission, sucursalId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroEstado, filtroCategoria, filtroStock]);

  // Sugerencias debounced — solo en modo crear y con 3+ caracteres
  useEffect(() => {
    if (editingId || formData.nombre.length < 3) {
      setNombreSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const resultados = await productoService.search(formData.nombre);
        setNombreSugerencias(resultados.slice(0, 6));
        setMostrarSugerencias(resultados.length > 0);
      } catch {
        // silencioso
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [formData.nombre, editingId]);

  const fetchUnidades = async () => {
    try {
      setLoadingUnidades(true);
      const [unidades, cats] = await Promise.all([
        unidadMedidaService.getAll(),
        categoriaService.getAll(),
      ]);
      const unidadesActivas = unidades.filter((u) => u.activo !== false);
      setUnidadesMedida(unidadesActivas);
      setCategorias(cats);
      if (!formData.unidadMedidaId && unidadesActivas.length > 0) {
        setFormData((prev) => ({ ...prev, unidadMedidaId: unidadesActivas[0].id }));
      }
    } catch (error) {
      toast.error('Error al cargar unidades de medida');
      if (import.meta.env.DEV) console.error(error);
    } finally {
      setLoadingUnidades(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const productosData = await productoService.getAll(sucursalId, mostrarInactivos);
      setProductos(productosData);

      setLoadingUnidades(true);
      const [unidades, cats] = await Promise.all([
        unidadMedidaService.getAll(),
        categoriaService.getAll(),
      ]);
      const unidadesActivas = unidades.filter((u) => u.activo !== false);
      setUnidadesMedida(unidadesActivas);
      setCategorias(cats);

      if (!formData.unidadMedidaId && unidadesActivas.length > 0) {
        setFormData((prev) => ({ ...prev, unidadMedidaId: unidadesActivas[0].id }));
      }
    } catch (error) {
      toast.error('Error al cargar datos');
      if (import.meta.env.DEV) console.error(error);
    } finally {
      setLoading(false);
      setLoadingUnidades(false);
    }
  };

  const unidadById = useMemo(() => {
    const m = new Map<number, UnidadMedidaDTO>();
    unidadesMedida.forEach((u) => m.set(u.id, u));
    return m;
  }, [unidadesMedida]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar presentaciones: detectar configuración invertida (factor > stock disponible)
    if (esFarmacia && presentacionesBorrador.length > 0) {
      const stockBase = formData.stockActual ?? 0;
      const invertidas = presentacionesBorrador.filter(p =>
        stockBase > 0 && p.factor > 1 && Math.floor(stockBase / p.factor) === 0
      );
      if (invertidas.length > 0) {
        const nombres = invertidas.map(p => unidadesMedida.find(u => u.id === p.unidadMedidaId)?.nombre ?? 'desconocida').join(', ');
        toast.error(`Presentación(es) con configuración incorrecta: ${nombres}. El stock quedaría en 0. Revisa que la unidad base del producto sea la más pequeña.`);
        return;
      }
    }

    if (import.meta.env.DEV) { console.log('🖼️ imagenUrl al guardar:', formData.imagenUrl ? `SÍ (${formData.imagenUrl.length} chars)` : 'NO / undefined'); }

    try {
      if (editingId) {
        await productoService.update(editingId, formData);

        // Guardar variantes borrador en EDIT: POST nuevas, PUT existentes
        if (esRopa && variantesBorrador.length > 0) {
          await Promise.all(variantesBorrador.map(v =>
            v.id
              ? productoVarianteService.update(v.id, { ...v, productoId: editingId, activo: true })
              : productoVarianteService.create({ ...v, productoId: editingId, activo: true })
          ));
        }

        // Guardar presentaciones farmacia en EDIT
        if (esFarmacia && presentacionesBorrador.length > 0) {
          await Promise.all(presentacionesBorrador.map(p =>
            p.id
              ? productoPresentacionService.actualizar(p.id, { ...p, productoId: editingId })
              : productoPresentacionService.crear(editingId, { ...p, productoId: editingId })
          ));
        }

        toast.success('Producto actualizado');
      } else {
        const nuevoProducto = await productoService.create(formData, sucursalId);

        // Guardar variantes borrador en CREATE
        if (esRopa && variantesBorrador.length > 0 && nuevoProducto.id) {
          await Promise.all(variantesBorrador.map(v =>
            productoVarianteService.create({ ...v, productoId: nuevoProducto.id!, activo: true })
          ));
        }

        // Guardar presentaciones farmacia en CREATE
        if (esFarmacia && presentacionesBorrador.length > 0 && nuevoProducto.id) {
          await Promise.all(presentacionesBorrador.map(p =>
            productoPresentacionService.crear(nuevoProducto.id!, { ...p, productoId: nuevoProducto.id! })
          ));
        }

        // Stock se gestiona exclusivamente a través de movimientos (inventario)

        toast.success('Producto creado');
        refreshOnboarding();
      }

      resetForm();
      await fetchData();
    } catch (error: any) {
      if (import.meta.env.DEV) console.log('❌ Error completo:', error);
      if (import.meta.env.DEV) console.log('❌ Response data:', error.response?.data);
      const message = error.response?.data?.mensaje || error.response?.data?.error || 'Error al guardar producto';
      toast.error(message);
    }
  };

  const handleDelete = (producto: ProductoDTO) => {
    setCfState({ open: true, action: 'eliminar', producto, running: false });
  };

  const handleToggleActivo = (producto: ProductoDTO) => {
    setCfState({ open: true, action: producto.activo ? 'desactivar' : 'activar', producto, running: false });
  };

  const executeCf = async () => {
    if (!cfState.producto?.id) return;
    setCfState(s => ({ ...s, running: true }));
    try {
      if (cfState.action === 'eliminar') {
        await productoService.delete(cfState.producto.id);
        toast.success('Producto eliminado');
      } else {
        const activo = cfState.action === 'activar';
        await productoService.toggleActivo(cfState.producto.id, activo);
        toast.success(activo ? 'Producto activado' : 'Producto desactivado');
      }
      setCfState(s => ({ ...s, open: false, running: false }));
      await fetchData();
    } catch {
      toast.error('Error al procesar la acción');
      setCfState(s => ({ ...s, running: false }));
    }
  };

  const handleEdit = async (producto: ProductoDTO) => {
    setFormData({
      id: producto.id,
      nombre: producto.nombre,
      codigoBarras: producto.codigoBarras || '',
      categoriaId: producto.categoriaId || 0,
      stockActual: producto.stockActual || 0,
      stockMinimo: producto.stockMinimo || 10,
      stockMaximo: producto.stockMaximo || 500,
      costoUnitario: producto.costoUnitario,
      precioVenta: producto.precioVenta,
      activo: producto.activo,
      tenantId: producto.tenantId,
      unidadMedidaId: producto.unidadMedidaId || 0,
      imagenUrl: producto.imagenUrl,
      componentes: producto.componentes,
      esGenerico: producto.esGenerico ?? false,
      tipo: producto.tipo ?? 'PRODUCTO',
      unidadesPorCaja: producto.unidadesPorCaja,
      talla: producto.talla,
      color: producto.color,
      registroSanitario: producto.registroSanitario ?? '',
    });
    setImgPreview(producto.imagenUrl ?? null);
    setEditingId(producto.id!);

    // Cargar variantes existentes como borrador
    if (esRopa && producto.id) {
      try {
        const vars = await productoVarianteService.getByProducto(producto.id);
        setVariantesBorrador(vars.map(v => ({ id: v.id, talla: v.talla ?? '', color: v.color ?? '', stockActual: v.stockActual ?? 0, stockMinimo: v.stockMinimo ?? 0, sku: v.sku ?? '' })));
      } catch { setVariantesBorrador([]); }
    } else {
      setVariantesBorrador([]);
    }

    // Cargar presentaciones existentes como borrador (solo farmacia)
    if (esFarmacia && producto.id) {
      try {
        const presentaciones = await productoPresentacionService.listar(producto.id);
        setPresentacionesBorrador(presentaciones.map(p => ({
          id: p.id, unidadMedidaId: p.unidadMedidaId, precioVenta: Number(p.precioVenta),
          factor: p.factor ?? 1, esPrincipal: p.esPrincipal ?? false,
        })));
      } catch { setPresentacionesBorrador([]); }
    } else {
      setPresentacionesBorrador([]);
    }

    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      codigoBarras: '',
      categoriaId: 0,
      stockActual: 0,
      stockMinimo: 10,
      stockMaximo: 500,
      costoUnitario: 0,
      precioVenta: 0,
      activo: true,
      tenantId: user?.tenantId ?? '',
      unidadMedidaId: unidadesMedida.length > 0 ? unidadesMedida[0].id : 0,
      esGenerico: false,
      tipo: tipoParam === 'PRODUCTO' ? 'PRODUCTO' : (esServicios ? 'SERVICIO' : 'PRODUCTO'),
      unidadesPorCaja: undefined,
      talla: undefined,
      color: undefined,
      registroSanitario: '',
    });
    setEditingId(null);
    setIsDialogOpen(false);
    setImgPreview(null);
    setNombreSugerencias([]);
    setMostrarSugerencias(false);
    setVariantesBorrador([]);
    setPresentacionesBorrador([]);
    if (imgInputRef.current) imgInputRef.current.value = '';
  };

  const handleAbrirVariantes = async (producto: ProductoDTO) => {
    setSelectedProductoVariantes(producto);
    setIsVariantesOpen(true);
    setEditingVarianteId(null);
    setVarianteForm({ productoId: producto.id!, talla: '', color: '', stockActual: 0, stockMinimo: 0, sku: '', activo: true });
    try {
      setLoadingVariantes(true);
      const vars = await productoVarianteService.getByProducto(producto.id!, sucursalId);
      setProductoVariantes(vars);
    } catch { toast.error('Error al cargar variantes'); }
    finally { setLoadingVariantes(false); }
  };

  const handleSaveVariante = async () => {
    if (!selectedProductoVariantes) return;
    if (!varianteForm.talla && !varianteForm.color && !varianteForm.sku) {
      toast.error('Ingresa al menos talla, color o SKU');
      return;
    }
    try {
      setSavingVariante(true);
      const dto: ProductoVarianteDTO = { ...varianteForm, productoId: selectedProductoVariantes.id! };
      if (editingVarianteId) {
        await productoVarianteService.update(editingVarianteId, dto);
        toast.success('Variante actualizada');
      } else {
        await productoVarianteService.create(dto);
        toast.success('Variante agregada');
      }
      const vars = await productoVarianteService.getByProducto(selectedProductoVariantes.id!, sucursalId);
      setProductoVariantes(vars);
      setEditingVarianteId(null);
      setVarianteForm({ productoId: selectedProductoVariantes.id!, talla: '', color: '', stockActual: 0, stockMinimo: 0, sku: '', activo: true });
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.mensaje || 'Error al guardar variante');
    } finally { setSavingVariante(false); }
  };

  const handleEditVariante = (v: ProductoVarianteDTO) => {
    setEditingVarianteId(v.id!);
    setVarianteForm({ ...v });
  };

  const handleDeleteVariante = async (id: number) => {
    if (!selectedProductoVariantes) return;
    try {
      await productoVarianteService.delete(id);
      toast.success('Variante eliminada');
      const vars = await productoVarianteService.getByProducto(selectedProductoVariantes.id!, sucursalId);
      setProductoVariantes(vars);
      await fetchData();
    } catch { toast.error('Error al eliminar variante'); }
  };

  // Crear nueva unidad de medida inline
  const handleCrearUnidad = async () => {
    if (!nuevaUnidadNombre.trim()) return;
    try {
      setSavingUnidad(true);
      const nueva = await unidadMedidaService.crear(nuevaUnidadNombre.trim());
      setUnidadesMedida(prev => [...prev, nueva]);
      setFormData(prev => ({ ...prev, unidadMedidaId: nueva.id! }));
      setNuevaUnidadNombre('');
      setNuevaUnidadOpen(false);
      toast.success(`Unidad "${nueva.nombre}" creada`);
    } catch {
      toast.error('Error al crear la unidad de medida');
    } finally {
      setSavingUnidad(false);
    }
  };

  // Crear nueva categoría inline
  const handleCrearCategoria = async () => {
    if (!nuevaCategoriaNombre.trim()) return;
    try {
      setSavingCategoria(true);
      const nueva = await categoriaService.crear(nuevaCategoriaNombre.trim());
      setCategorias(prev => [...prev, nueva]);
      setFormData(prev => ({ ...prev, categoriaId: nueva.id }));
      setNuevaCategoriaNombre('');
      setNuevaCategoriaOpen(false);
      toast.success(`Categoría "${nueva.nombre}" creada`);
    } catch {
      toast.error('Error al crear la categoría');
    } finally {
      setSavingCategoria(false);
    }
  };

  const filteredProductos = productos
    .filter((p) => {
      if (tipoParam === 'SERVICIO') return p.tipo === 'SERVICIO';
      if (tipoParam === 'PRODUCTO') return p.tipo === 'PRODUCTO' || !p.tipo;
      return true;
    })
    .filter((p) => {
      if (filtroEstado === 'ACTIVOS') return p.activo !== false;
      if (filtroEstado === 'INACTIVOS') return p.activo === false;
      return true;
    })
    .filter((p) => {
      const q = searchTerm.toLowerCase();
      return !q || p.nombre.toLowerCase().includes(q) ||
        p.codigoBarras?.toLowerCase().includes(q) ||
        p.categoriaNombre?.toLowerCase().includes(q);
    })
    .filter((p) => !filtroCategoria || p.categoriaId === filtroCategoria)
    .filter((p) => {
      if (!filtroStock) return true;
      const stock = p.stockActual ?? 0;
      const min = p.stockMinimo ?? 0;
      if (filtroStock === 'CERO')   return stock <= 0;
      if (filtroStock === 'BAJO')   return stock > 0 && stock <= min;
      if (filtroStock === 'NORMAL') return stock > min;
      return true;
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProductos = filteredProductos.slice(startIndex, endIndex);

  // Lista base para stats: filtrada por tipo si hay URL param
  const productosPorTipo = tipoParam === 'SERVICIO'
    ? productos.filter((p) => p.tipo === 'SERVICIO')
    : tipoParam === 'PRODUCTO'
    ? productos.filter((p) => p.tipo === 'PRODUCTO' || !p.tipo)
    : productos;

  const totalProductos = productosPorTipo.length;
  const productosConStockBajo = productosPorTipo.filter((p) => (p.stockActual ?? 0) <= (p.stockMinimo ?? 0)).length;

  // Stats para rubro EMPRESA_SERVICIOS
  const categoriasUnicas = new Set(productosPorTipo.map((p) => p.categoriaNombre).filter(Boolean)).size;
  const precioPromedio   = totalProductos > 0
    ? productosPorTipo.reduce((s, p) => s + (p.precioVenta ?? 0), 0) / totalProductos
    : 0;
  const precioMaximo     = totalProductos > 0
    ? Math.max(...productosPorTipo.map((p) => p.precioVenta ?? 0))
    : 0;

  // Valor inventario: usa costoUnitario (valorización real)
  const valorTotalInventario = productosPorTipo.reduce((sum, p) => {
    const stock = p.stockActual ?? 0;
    const costo = p.costoUnitario ?? 0;
    return sum + stock * costo;
  }, 0);

  // Productos con precio inválido (precio <= costo) => pérdida o margen cero
  const productosConPrecioRiesgoso = productosPorTipo.filter((p) => {
    const costo = p.costoUnitario ?? 0;
    const precio = p.precioVenta ?? 0;
    if (costo <= 0) return false;
    return precio <= costo;
  }).length;

  const handleExportarExcel = (filtro: 'todos' | 'sin-stock' | 'bajo-stock') => {
    setExportMenuOpen(false);
    let lista = productos.filter(p => p.activo !== false);
    if (filtro === 'sin-stock') lista = lista.filter(p => (p.stockActual ?? 0) <= 0);
    if (filtro === 'bajo-stock') lista = lista.filter(p => (p.stockActual ?? 0) > 0 && p.stockMinimo != null && (p.stockActual ?? 0) <= p.stockMinimo);

    if (lista.length === 0) {
      toast.error('No hay productos con ese criterio.');
      return;
    }

    const filas = [
      ['Nombre', 'Código barras', 'Categoría', 'Unidad', 'Stock actual', 'Stock mínimo', 'Precio venta', 'Costo unitario'],
      ...lista.map(p => [
        p.nombre,
        p.codigoBarras ?? '',
        p.categoriaNombre ?? '',
        p.unidadMedidaNombre ?? '',
        p.stockActual ?? 0,
        p.stockMinimo ?? '',
        p.precioVenta,
        p.costoUnitario ?? '',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    const etiquetas: Record<string, string> = { todos: 'Todos', 'sin-stock': 'Sin stock', 'bajo-stock': 'Stock bajo' };
    XLSX.utils.book_append_sheet(wb, ws, etiquetas[filtro]);
    XLSX.writeFile(wb, `productos_${filtro}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const nFiltros = (filtroCategoria ? 1 : 0) + (filtroStock ? 1 : 0);
  const hayFiltros = nFiltros > 0;

  // Counts para segmented
  const cntTodos = productos.filter(p => tipoParam === 'SERVICIO' ? p.tipo === 'SERVICIO' : tipoParam === 'PRODUCTO' ? (p.tipo === 'PRODUCTO' || !p.tipo) : true).length;
  const cntActivos = productos.filter(p => (tipoParam === 'SERVICIO' ? p.tipo === 'SERVICIO' : tipoParam === 'PRODUCTO' ? (p.tipo === 'PRODUCTO' || !p.tipo) : true) && p.activo !== false).length;
  const cntInactivos = productos.filter(p => (tipoParam === 'SERVICIO' ? p.tipo === 'SERVICIO' : tipoParam === 'PRODUCTO' ? (p.tipo === 'PRODUCTO' || !p.tipo) : true) && p.activo === false).length;

  // Categorías únicas para el panel de filtros
  const catsFiltro = categorias.filter(c => productosPorTipo.some(p => p.categoriaId === c.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-.028em', margin: 0 }}>
            {esServicios ? 'Catálogo de Servicios' : 'Productos'}
          </h1>
          <p style={{ fontSize: '.865rem', color: T.text3, margin: '7px 0 0' }}>
            {esServicios ? 'Gestiona tus servicios y planes' : 'Gestiona tu inventario de productos'}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!esServicios && (
            <div style={{ position: 'relative' }} ref={exportMenuRef}>
              {!esServicios && (
                <button type="button" onClick={() => setExportMenuOpen(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px', fontSize: '.855rem', fontWeight: 650, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 13 4 5"/><path d="m13 13-4 5"/></svg>
                  Exportar Excel
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: .7 }}><path d="m6 9 6 6 6-6"/></svg>
                </button>
              )}
              {exportMenuOpen && (
                <>
                  <div onClick={() => setExportMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 41, width: 220, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: '0 22px 50px -22px rgba(0,0,0,.45)', padding: 6 }}>
                    {([['todos','Todos los productos'],['bajo-stock','Stock bajo'],['sin-stock','Sin stock']] as const).map(([k,l]) => (
                      <button key={k} type="button" onClick={() => handleExportarExcel(k)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: '.845rem', fontWeight: 500, color: T.text, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {l}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {canCreate('PRODUCTOS') && (
            <button type="button" onClick={() => setIsDialogOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', fontSize: '.855rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: `0 6px 16px -8px ${T.primary}` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              {esServicios ? 'Nuevo Servicio' : 'Nuevo producto'}
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
        {esServicios ? (<>
          {[
            { label: 'Total Servicios', val: totalProductos, color: T.primary, sub: 'En catálogo activo' },
            { label: 'Categorías', val: categoriasUnicas, color: '#7c3aed', sub: 'Tipos de servicio' },
            { label: 'Precio Promedio', val: `S/.${precioPromedio.toFixed(2)}`, color: T.ok, sub: 'Promedio del catálogo' },
            { label: 'Precio Máximo', val: `S/.${precioMaximo.toFixed(2)}`, color: T.warn, sub: 'Servicio más caro' },
          ].map(k => (
            <div key={k.label} style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>{k.label}</div>
              <div style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 9, fontVariantNumeric: 'tabular-nums', color: k.color }}>{k.val}</div>
              <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5 }}>{k.sub}</div>
            </div>
          ))}
        </>) : (<>
          {[
            { label: 'Total Productos', val: totalProductos, color: T.primary, sub: 'En inventario activo' },
            { label: 'Stock Bajo', val: productosConStockBajo, color: T.warn, sub: 'Requieren atención' },
            { label: 'Valor Inventario', val: `S/.${valorTotalInventario.toFixed(2)}`, color: T.ok, sub: 'Valorizado al costo' },
            { label: 'Precios en riesgo', val: productosConPrecioRiesgoso, color: T.bad, sub: 'Precio ≤ costo' },
          ].map(k => (
            <div key={k.label} style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>{k.label}</div>
              <div style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 9, fontVariantNumeric: 'tabular-nums', color: k.color }}>{k.val}</div>
              <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5 }}>{k.sub}</div>
            </div>
          ))}
        </>)}
      </div>

      {/* Tabla card */}
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, boxShadow: T.shadow, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              placeholder={`Buscar ${esServicios ? 'servicio' : 'producto'}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', height: 36, paddingLeft: 34, paddingRight: 12, fontSize: '.855rem', color: T.text, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 9, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {/* Segmented estado */}
          <div style={{ display: 'flex', background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 9, padding: 3, gap: 2 }}>
            {(['TODOS','ACTIVOS','INACTIVOS'] as EstadoFilter[]).map(e => (
              <button key={e} onClick={() => setFiltroEstado(e)}
                style={{ height: 28, padding: '0 12px', fontSize: '.78rem', fontWeight: 600, borderRadius: 7, border: 0, cursor: 'pointer', background: filtroEstado === e ? T.surface : 'transparent', color: filtroEstado === e ? T.text : T.text3, boxShadow: filtroEstado === e ? T.shadow : 'none' }}>
                {e === 'TODOS' ? 'Todos' : e === 'ACTIVOS' ? 'Activos' : 'Inactivos'}
                {e === 'TODOS' && <span style={{ marginLeft: 5, fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', color: T.text3 }}>{cntTodos}</span>}
                {e === 'ACTIVOS' && <span style={{ marginLeft: 5, fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', color: T.ok }}>{cntActivos}</span>}
                {e === 'INACTIVOS' && <span style={{ marginLeft: 5, fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', color: T.text3 }}>{cntInactivos}</span>}
              </button>
            ))}
          </div>
          {/* Btn filtros */}
          {!esServicios && (
            <button onClick={() => setPanelOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 13px', fontSize: '.82rem', fontWeight: 600, color: panelOpen ? T.primary : T.text2, background: panelOpen ? T.primarySoft : T.surface2, border: `1px solid ${panelOpen ? T.primaryLine : T.line}`, borderRadius: 9, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filtros{nFiltros > 0 && <span style={{ background: T.primary, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: '.65rem', display: 'grid', placeItems: 'center', marginLeft: 2 }}>{nFiltros}</span>}
            </button>
          )}
        </div>

        {/* Panel filtros expandible */}
        {panelOpen && !esServicios && (
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '.73rem', fontWeight: 600, color: T.text3, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>Categoría</div>
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(Number(e.target.value))}
                style={{ height: 34, padding: '0 10px', fontSize: '.845rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, outline: 'none', cursor: 'pointer' }}>
                <option value={0}>Todas</option>
                {catsFiltro.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '.73rem', fontWeight: 600, color: T.text3, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>Stock</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {([['', 'Todos'], ['CERO', 'Sin stock'], ['BAJO', 'Bajo'], ['NORMAL', 'Normal']] as [StockFilter, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setFiltroStock(v)}
                    style={{ height: 30, padding: '0 10px', fontSize: '.78rem', fontWeight: 600, borderRadius: 7, border: `1px solid ${filtroStock === v ? T.primaryLine : T.line}`, cursor: 'pointer', background: filtroStock === v ? T.primarySoft : T.surface, color: filtroStock === v ? T.primary : T.text2 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {hayFiltros && (
              <button onClick={() => { setFiltroCategoria(0); setFiltroStock(''); }}
                style={{ height: 30, padding: '0 10px', fontSize: '.78rem', color: T.bad, background: T.badSoft, border: `1px solid ${T.bad}33`, borderRadius: 7, cursor: 'pointer', fontWeight: 600 }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Chips filtros activos */}
        {hayFiltros && (
          <div style={{ padding: '8px 18px', borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {filtroCategoria > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 20, fontSize: '.76rem', fontWeight: 600, color: T.primary }}>
                {catsFiltro.find(c => c.id === filtroCategoria)?.nombre ?? 'Categoría'}
                <button onClick={() => setFiltroCategoria(0)} style={{ background: 'none', border: 0, cursor: 'pointer', color: T.primary, padding: 0, lineHeight: 1 }}>×</button>
              </span>
            )}
            {filtroStock && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 20, fontSize: '.76rem', fontWeight: 600, color: T.primary }}>
                Stock: {filtroStock === 'CERO' ? 'Sin stock' : filtroStock === 'BAJO' ? 'Bajo' : 'Normal'}
                <button onClick={() => setFiltroStock('')} style={{ background: 'none', border: 0, cursor: 'pointer', color: T.primary, padding: 0, lineHeight: 1 }}>×</button>
              </span>
            )}
          </div>
        )}

        {/* Tabla */}
        {filteredProductos.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: T.text3, fontSize: '.9rem' }}>
            {searchTerm || hayFiltros ? 'Sin resultados para los filtros aplicados.' : esServicios ? 'Agrega servicios para empezar.' : 'Agrega productos para empezar.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: T.surface3 }}>
                  {[esServicios ? 'Servicio' : 'Producto', ...(!esServicios ? ['Código', 'Categoría', 'Stock', 'Costo', 'Precio'] : ['Categoría', 'Precio']), 'Estado', ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 14px', textAlign: i === (esServicios ? 4 : 8) ? 'right' : 'left', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: T.text3, borderBottom: `1px solid ${T.line}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentProductos.map(producto => {
                  const stock = producto.stockActual ?? 0;
                  const stockMin = producto.stockMinimo ?? 0;
                  const stockVig = esFarmacia && producto.stockVigente != null ? producto.stockVigente : stock;
                  const stockColor = stockVig <= 0 ? T.bad : stockVig <= stockMin ? T.warn : T.ok;
                  const stockPct = stockMin > 0 ? Math.min(100, (stockVig / (stockMin * 3)) * 100) : stockVig > 0 ? 100 : 0;
                  const margen = producto.precioVenta > 0 && producto.costoUnitario > 0
                    ? ((producto.precioVenta - producto.costoUnitario) / producto.precioVenta * 100) : null;
                  const margenColor = margen === null ? T.text3 : margen < 0 ? T.bad : margen < 15 ? T.warn : T.ok;
                  const av = avatarStyle(producto.nombre);
                  const unidadLabel = (producto as any).unidadMedidaNombre ?? unidadById.get(producto.unidadMedidaId)?.nombre ?? '';
                  const isHov = hoveredRow === producto.id;
                  return (
                    <tr key={producto.id}
                      onMouseEnter={() => setHoveredRow(producto.id!)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{ background: isHov ? T.surface3 : T.surface, opacity: producto.activo === false ? 0.55 : 1, transition: 'background .12s' }}>
                      {/* Producto */}
                      <td style={{ padding: '11px 14px', borderBottom: `1px solid ${T.lineSoft}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: av.bg, color: av.color, display: 'grid', placeItems: 'center', fontSize: '.78rem', fontWeight: 700, flexShrink: 0 }}>{iniciales(producto.nombre)}</div>
                          <div>
                            <div style={{ fontSize: '.875rem', fontWeight: 650, color: T.text }}>{producto.nombre}</div>
                            <div style={{ fontSize: '.76rem', color: T.text3, marginTop: 1 }}>{producto.codigoBarras || producto.categoriaNombre || ''}</div>
                          </div>
                        </div>
                      </td>
                      {/* Código (solo productos) */}
                      {!esServicios && <td style={{ padding: '11px 14px', borderBottom: `1px solid ${T.lineSoft}` }}>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.78rem', color: T.text2 }}>{producto.codigoBarras || '—'}</span>
                      </td>}
                      {/* Categoría */}
                      <td style={{ padding: '11px 14px', borderBottom: `1px solid ${T.lineSoft}` }}>
                        <span style={{ fontSize: '.8rem', color: T.text2 }}>{producto.categoriaNombre || '—'}</span>
                      </td>
                      {/* Stock (solo productos) */}
                      {!esServicios && <td style={{ padding: '11px 14px', borderBottom: `1px solid ${T.lineSoft}` }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.85rem', fontWeight: 700, color: stockColor }}>
                            {stockVig}
                            {unidadLabel && <span style={{ fontSize: '.72rem', fontWeight: 500, color: T.text3, marginLeft: 3 }}>{unidadLabel}</span>}
                          </span>
                          <div style={{ width: 44, height: 4, background: T.surface2, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${stockPct}%`, height: '100%', background: stockColor, borderRadius: 2 }} />
                          </div>
                        </div>
                      </td>}
                      {/* Costo (solo productos) */}
                      {!esServicios && <td style={{ padding: '11px 14px', borderBottom: `1px solid ${T.lineSoft}` }}>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.83rem', color: T.text2 }}>S/.{producto.costoUnitario.toFixed(2)}</span>
                      </td>}
                      {/* Precio */}
                      <td style={{ padding: '11px 14px', borderBottom: `1px solid ${T.lineSoft}` }}>
                        <div>
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.88rem', fontWeight: 700, color: T.text }}>S/.{producto.precioVenta.toFixed(2)}</span>
                          {!esServicios && margen !== null && (
                            <div style={{ fontSize: '.72rem', fontWeight: 600, color: margenColor, marginTop: 2 }}>{margen.toFixed(1)}% margen</div>
                          )}
                        </div>
                      </td>
                      {/* Estado */}
                      <td style={{ padding: '11px 14px', borderBottom: `1px solid ${T.lineSoft}` }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 9px', borderRadius: 11, fontSize: '.74rem', fontWeight: 650, background: producto.activo !== false ? T.okSoft : T.surface2, color: producto.activo !== false ? T.ok : T.text3 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                          {producto.activo !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {/* Acciones */}
                      <td style={{ padding: '11px 14px', borderBottom: `1px solid ${T.lineSoft}`, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                          {esRopa && (
                            <ActionBtn title="Gestionar variantes" hoverColor="#7c3aed" hoverBg="#f5f3ff" onClick={() => handleAbrirVariantes(producto)}
                              icon={<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>} />
                          )}
                          {canEdit('PRODUCTOS') && (
                            <ActionBtn title="Editar" hoverColor={T.primary} hoverBg={T.primarySoft} onClick={() => handleEdit(producto)}
                              icon={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />
                          )}
                          {canEdit('PRODUCTOS') && (
                            <ActionBtn
                              title={producto.activo !== false ? 'Desactivar' : 'Activar'}
                              hoverColor={producto.activo !== false ? T.warn : T.ok}
                              hoverBg={producto.activo !== false ? T.warnSoft : T.okSoft}
                              onClick={() => handleToggleActivo(producto)}
                              icon={producto.activo !== false
                                ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                                : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                              }
                            />
                          )}
                          {canDelete('PRODUCTOS') && (
                            <ActionBtn title="Eliminar" hoverColor={T.bad} hoverBg={T.badSoft} onClick={() => handleDelete(producto)}
                              icon={<><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.lineSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: '.8rem', color: T.text3 }}>{filteredProductos.length} {esServicios ? 'servicios' : 'productos'}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 7, cursor: currentPage === 1 ? 'default' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                return (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', background: currentPage === p ? T.primary : T.surface2, color: currentPage === p ? '#fff' : T.text2, border: `1px solid ${currentPage === p ? T.primary : T.line}`, borderRadius: 7, cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 7, cursor: currentPage === totalPages ? 'default' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog: Crear/Editar producto — portal Fluxus */}
      {isDialogOpen && (() => {
        const margenForm = formData.precioVenta > 0 && formData.costoUnitario > 0
          ? ((formData.precioVenta - formData.costoUnitario) / formData.precioVenta * 100) : null;
        const margenColor = margenForm === null ? T.text3 : margenForm < 0 ? T.bad : margenForm < 15 ? T.warn : T.ok;
        const fTitulo = editingId
          ? (esServicios ? 'Editar Servicio' : 'Editar Producto')
          : (esServicios ? 'Nuevo Servicio' : 'Nuevo Producto');
        const fSub = editingId
          ? 'Actualiza la información del registro'
          : (esServicios ? 'Agrega un nuevo servicio al catálogo' : 'Agrega un nuevo producto al inventario');
        return createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
            <div onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 760, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18, boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 22px 16px', borderBottom: `1px solid ${T.lineSoft}`, flexShrink: 0 }}>
                <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: T.primarySoft, color: T.primary }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>
                </span>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: '1.08rem', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: T.text }}>{fTitulo}</h2>
                  <div style={{ fontSize: '.8rem', color: T.text3, marginTop: 4 }}>{fSub}</div>
                </div>
                <button type="button" onClick={resetForm} aria-label="Cerrar"
                  style={{ width: 30, height: 30, flexShrink: 0, marginLeft: 'auto', display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.surface2; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              {/* Body scrollable */}
              <form onSubmit={handleSubmit} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 22px 22px' }}>

                {/* ── 1 · Identificación ── */}
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3, marginBottom: 12 }}>
                  1 · Identificación
                </div>

                {/* Foto + Nombre + Código */}
                <div style={{ display: 'grid', gridTemplateColumns: '128px minmax(0,1fr)', gap: 16 }}>
                  {/* Foto */}
                  <button type="button" onClick={() => imgInputRef.current?.click()} title="Subir foto del producto"
                    style={{ height: 128, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1.5px dashed ${imgPreview ? T.primaryLine : T.line}`, borderRadius: 12, background: imgPreview ? T.primarySoft : T.surface3, cursor: 'pointer', overflow: 'hidden', padding: 0 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.primary; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = imgPreview ? T.primaryLine : T.line; }}>
                    {imgPreview
                      ? <img src={imgPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>
                          <span style={{ fontSize: '.74rem', fontWeight: 600, marginTop: 6, color: T.text2 }}>Subir foto</span>
                          <span style={{ fontSize: '.66rem', color: T.text3, marginTop: 2 }}>JPG o PNG</span>
                        </>
                    }
                  </button>

                  {/* Nombre + Código */}
                  <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
                    {/* Nombre */}
                    <div>
                      <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>
                        Nombre <span style={{ color: T.bad }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <FxInput
                          type="text"
                          value={formData.nombre}
                          onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                          onFocus={() => { if (nombreSugerencias.length > 0) setMostrarSugerencias(true); }}
                          onBlur={() => { setTimeout(() => setMostrarSugerencias(false), 150); }}
                          placeholder={esServicios ? 'Nombre del servicio' : 'Nombre del producto'}
                          required
                          minLength={3}
                          style={{ paddingLeft: 13 }}
                        />
                        {mostrarSugerencias && nombreSugerencias.length > 0 && (
                          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: T.surface, border: `1px solid ${T.warnLine}`, borderRadius: 10, boxShadow: '0 8px 24px -8px rgba(0,0,0,.25)', overflow: 'hidden' }}>
                            <div style={{ padding: '8px 12px', fontSize: '.76rem', fontWeight: 600, color: T.warn, background: T.warnSoft, borderBottom: `1px solid ${T.warnLine}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                              Ya existen productos con nombre similar
                            </div>
                            {nombreSugerencias.map(p => (
                              <button key={p.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => setMostrarSugerencias(false)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', fontSize: '.84rem', color: T.text, background: 'transparent', border: 0, borderBottom: `1px solid ${T.lineSoft}`, cursor: 'default', textAlign: 'left' }}
                                onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <span style={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</span>
                                {p.codigoBarras && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.76rem', color: T.text3, flexShrink: 0 }}>{p.codigoBarras}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Código de barras */}
                    {!esServicios && (
                      <div>
                        <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Código de barras</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>
                            <FxInput
                              type="text"
                              inputMode="numeric"
                              value={formData.codigoBarras}
                              onChange={e => setFormData({ ...formData, codigoBarras: e.target.value })}
                              placeholder="Escanea o escribe el código"
                              style={{ paddingLeft: 38, fontFamily: "'IBM Plex Mono',monospace", fontSize: '.86rem', letterSpacing: '.03em' }}
                            />
                          </div>
                          <button type="button"
                            onClick={() => {
                              const d = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
                              const check = (10 - (d.reduce((s, x, i) => s + x * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
                              setFormData(p => ({ ...p, codigoBarras: [...d, check].join('') }));
                            }}
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 14px', fontSize: '.82rem', fontWeight: 650, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.primary; (e.currentTarget as HTMLButtonElement).style.color = T.primary; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.line; (e.currentTarget as HTMLButtonElement).style.color = T.text2; }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
                            Generar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Categoría + Unidad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14, marginTop: 14 }}>
                  {/* Categoría */}
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Categoría <span style={{ color: T.bad }}>*</span></label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <FxSelect value={formData.categoriaId || ''} onChange={e => setFormData({ ...formData, categoriaId: Number(e.target.value) })} required disabled={loadingUnidades}>
                        <option value="" disabled>{loadingUnidades ? 'Cargando...' : 'Seleccione categoría'}</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </FxSelect>
                      <button type="button" onClick={() => setNuevaCategoriaOpen(true)} title="Nueva categoría"
                        style={{ width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center', color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                      </button>
                    </div>
                    {nuevaCategoriaOpen && (
                      <div style={{ display: 'flex', gap: 7, marginTop: 8, padding: 9, borderRadius: 10, background: T.primarySoft, border: `1px solid ${T.primaryLine}` }}>
                        <FxInput type="text" autoFocus value={nuevaCategoriaNombre} onChange={e => setNuevaCategoriaNombre(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCrearCategoria())}
                          placeholder="Ej: Lácteos, Snacks…" style={{ height: 36, fontSize: '.84rem' }} />
                        <button type="button" onClick={handleCrearCategoria} disabled={!nuevaCategoriaNombre.trim() || savingCategoria}
                          style={{ height: 36, padding: '0 13px', fontSize: '.8rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap', opacity: savingCategoria ? 0.6 : 1 }}>
                          {savingCategoria ? '…' : 'Crear'}
                        </button>
                        <button type="button" onClick={() => { setNuevaCategoriaOpen(false); setNuevaCategoriaNombre(''); }} aria-label="Cancelar"
                          style={{ width: 36, height: 36, flexShrink: 0, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 9, cursor: 'pointer' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Unidad de medida */}
                  {!esServicios && (
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Unidad de medida <span style={{ color: T.bad }}>*</span></label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <FxSelect value={formData.unidadMedidaId || ''} onChange={e => setFormData({ ...formData, unidadMedidaId: Number(e.target.value) })} required disabled={loadingUnidades}>
                          <option value="" disabled>{loadingUnidades ? 'Cargando...' : 'Seleccione unidad'}</option>
                          {unidadesMedida.map(u => <option key={u.id} value={u.id}>{u.nombre}{u.abreviatura ? ` (${u.abreviatura})` : ''}</option>)}
                        </FxSelect>
                        <button type="button" onClick={() => setNuevaUnidadOpen(true)} title="Nueva unidad"
                          style={{ width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center', color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, cursor: 'pointer' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                        </button>
                      </div>
                      {nuevaUnidadOpen && (
                        <div style={{ display: 'flex', gap: 7, marginTop: 8, padding: 9, borderRadius: 10, background: T.primarySoft, border: `1px solid ${T.primaryLine}` }}>
                          <FxInput type="text" autoFocus value={nuevaUnidadNombre} onChange={e => setNuevaUnidadNombre(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCrearUnidad())}
                            placeholder="Ej: Caja, Docena, Litro…" style={{ height: 36, fontSize: '.84rem' }} />
                          <button type="button" onClick={handleCrearUnidad} disabled={!nuevaUnidadNombre.trim() || savingUnidad}
                            style={{ height: 36, padding: '0 13px', fontSize: '.8rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap', opacity: savingUnidad ? 0.6 : 1 }}>
                            {savingUnidad ? '…' : 'Crear'}
                          </button>
                          <button type="button" onClick={() => { setNuevaUnidadOpen(false); setNuevaUnidadNombre(''); }} aria-label="Cancelar"
                            style={{ width: 36, height: 36, flexShrink: 0, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 9, cursor: 'pointer' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Registro sanitario — solo farmacia */}
                {esFarmacia && !esServicios && (
                  <div style={{ marginTop: 14 }}>
                    <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Registro sanitario</label>
                    <FxInput type="text" value={formData.registroSanitario ?? ''} onChange={e => setFormData(p => ({ ...p, registroSanitario: e.target.value }))}
                      placeholder="Ej: E.F.A.12345 / RS-12345"
                      style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.86rem' }} />
                  </div>
                )}

                {/* ── 2 · Precio e inventario ── */}
                <div style={{ height: 1, background: T.lineSoft, margin: '22px -22px' }} />
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3, marginBottom: 12 }}>
                  2 · {esServicios ? 'Precio' : 'Precio e inventario'}
                </div>

                {/* Costo + Precio */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
                  {!esServicios && (
                    <div>
                      <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Costo unitario</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '.88rem', fontWeight: 650, color: T.text3, pointerEvents: 'none' }}>S/</span>
                        <FxInput type="number" step="0.01" min="0"
                          value={formData.costoUnitario === 0 ? '' : formData.costoUnitario}
                          onChange={e => setFormData({ ...formData, costoUnitario: parseFloat(e.target.value || '0') })}
                          placeholder="0,00" style={{ paddingLeft: 36, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }} />
                      </div>
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Precio de venta <span style={{ color: T.bad }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: '.88rem', fontWeight: 650, color: T.text3, pointerEvents: 'none' }}>S/</span>
                      <FxInput type="number" step="0.01" min="0.01"
                        value={formData.precioVenta === 0 ? '' : formData.precioVenta}
                        onChange={e => setFormData({ ...formData, precioVenta: parseFloat(e.target.value || '0') })}
                        placeholder="0,00" required style={{ paddingLeft: 36, fontSize: '1.02rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} />
                    </div>
                  </div>
                </div>

                {/* Margen indicator */}
                {margenForm !== null && !esServicios && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 12px', borderRadius: 9, background: margenForm < 0 ? T.badSoft : margenForm < 15 ? T.warnSoft : T.okSoft, border: `1px solid ${margenForm < 0 ? T.bad : margenForm < 15 ? T.warnLine : T.ok}33` }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: margenColor, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '.8rem', color: T.text2 }}>Margen sobre el precio de venta</span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.84rem', fontWeight: 700, color: margenColor }}>{margenForm.toFixed(1)}%</span>
                  </div>
                )}

                {/* Stocks — solo productos */}
                {!esServicios && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14, marginTop: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Stock mínimo <span style={{ color: T.bad }}>*</span></label>
                      <FxInput type="number" min="0"
                        value={formData.stockMinimo === 0 ? '' : formData.stockMinimo}
                        onChange={e => setFormData({ ...formData, stockMinimo: parseInt(e.target.value || '0') })}
                        placeholder="0" required style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Stock máximo <span style={{ color: T.bad }}>*</span></label>
                      <FxInput type="number" min="0"
                        value={formData.stockMaximo === 0 ? '' : formData.stockMaximo}
                        onChange={e => setFormData({ ...formData, stockMaximo: parseInt(e.target.value || '0') })}
                        placeholder="0" required style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }} />
                    </div>
                  </div>
                )}
                {!esServicios && formData.stockMaximo > 0 && formData.stockMinimo > 0 && formData.stockMaximo < formData.stockMinimo && (
                  <div style={{ fontSize: '.76rem', fontWeight: 600, color: T.bad, marginTop: 6 }}>El stock máximo debe ser mayor o igual al mínimo.</div>
                )}

                {/* ── 3 · Datos farmacéuticos ── */}
                {esFarmacia && (
                  <>
                    <div style={{ height: 1, background: T.lineSoft, margin: '22px -22px' }} />
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3, marginBottom: 12 }}>
                      3 · Datos farmacéuticos
                    </div>
                    {/* Toggle genérico */}
                    <button type="button" onClick={() => setFormData(p => ({ ...p, esGenerico: !p.esGenerico }))}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', fontFamily: 'Inter,sans-serif', textAlign: 'left', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, cursor: 'pointer' }}>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '.88rem', fontWeight: 600, color: T.text }}>Producto genérico</span>
                        <span style={{ display: 'block', fontSize: '.76rem', color: T.text3, marginTop: 2 }}>Permite filtrar genéricos en el POS</span>
                      </span>
                      {/* Toggle switch */}
                      <span style={{ width: 40, height: 22, borderRadius: 11, background: formData.esGenerico ? T.ok : T.line, position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
                        <span style={{ position: 'absolute', top: 3, left: formData.esGenerico ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                      </span>
                    </button>
                    {/* Principio activo */}
                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: T.text2, marginBottom: 6 }}>Principio activo</label>
                      <FxInput type="text" value={formData.componentes ?? ''} onChange={e => setFormData(p => ({ ...p, componentes: e.target.value || undefined }))}
                        placeholder="Ej: paracetamol 500mg, amoxicilina 250mg, vitamina C…" />
                    </div>

                    {/* ── 4 · Presentaciones adicionales ── */}
                    <div style={{ height: 1, background: T.lineSoft, margin: '22px -22px' }} />
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>4 · Presentaciones adicionales</span>
                      <button type="button" onClick={addPresentacionBorrador}
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px', fontSize: '.78rem', fontWeight: 650, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                        Agregar
                      </button>
                    </div>
                    <div style={{ padding: '11px 13px', borderRadius: 11, background: T.surface3, border: `1px solid ${T.line}`, fontSize: '.78rem', lineHeight: 1.55, color: T.text2 }}>
                      La unidad del producto debe ser la <strong style={{ color: T.text }}>más pequeña</strong> que vendes (tableta, unidad, ampolla). Luego agrega las mayores: base <strong style={{ color: T.text }}>Tableta</strong> → Blíster (factor 10) y Caja (factor 100).
                    </div>
                    {presentacionesBorrador.length === 0 ? (
                      <div style={{ marginTop: 10, padding: 18, border: `1.5px dashed ${T.line}`, borderRadius: 12, textAlign: 'center', fontSize: '.8rem', color: T.text3 }}>
                        Sin presentaciones. Agrégalas si el producto se vende en más de una unidad.
                      </div>
                    ) : (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) 92px 36px', gap: 8, marginBottom: 6, padding: '0 2px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.03em', textTransform: 'uppercase', color: T.text3 }}>
                          <span>Presentación</span><span>Precio</span><span>Factor</span><span></span>
                        </div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {presentacionesBorrador.map((p, idx) => {
                            const stockBase = formData.stockActual ?? 0;
                            const stockEnPres = p.factor > 0 ? Math.floor(stockBase / p.factor) : 0;
                            const configInv = stockBase > 0 && p.factor > 1 && stockEnPres === 0;
                            const precioMenor = p.precioVenta > 0 && formData.precioVenta && p.precioVenta < Number(formData.precioVenta);
                            const warn = configInv || precioMenor;
                            return (
                              <div key={idx}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) 92px 36px', gap: 8, alignItems: 'center' }}>
                                  <div style={{ position: 'relative', minWidth: 0 }}>
                                    <select value={p.unidadMedidaId} onChange={e => updatePresentacionBorrador(idx, 'unidadMedidaId', parseInt(e.target.value))}
                                      style={{ width: '100%', height: 40, padding: '0 30px 0 11px', fontFamily: 'Inter,sans-serif', fontSize: '.84rem', color: T.text, background: T.surface, border: `1px solid ${warn ? T.warn : T.line}`, borderRadius: 10, outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                                      {unidadesMedida.map(u => <option key={u.id} value={u.id}>{u.nombre}{u.abreviatura ? ` (${u.abreviatura})` : ''}</option>)}
                                    </select>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="m6 9 6 6 6-6"/></svg>
                                  </div>
                                  <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: '.8rem', fontWeight: 650, color: T.text3, pointerEvents: 'none' }}>S/</span>
                                    <FxInput type="number" step="0.01" min="0.01"
                                      value={p.precioVenta === 0 ? '' : p.precioVenta}
                                      onChange={e => updatePresentacionBorrador(idx, 'precioVenta', parseFloat(e.target.value || '0'))}
                                      placeholder="0,00" style={{ height: 40, paddingLeft: 30, border: `1px solid ${warn ? T.warn : T.line}` }} />
                                  </div>
                                  <FxInput type="number" min="1"
                                    value={p.factor} onChange={e => updatePresentacionBorrador(idx, 'factor', parseInt(e.target.value || '1'))}
                                    title="Cuántas unidades base contiene"
                                    style={{ height: 40, fontSize: '.84rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', border: `1px solid ${warn ? T.warn : T.line}` }} />
                                  <button type="button" onClick={() => removePresentacionBorrador(idx)}
                                    style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.badSoft; (e.currentTarget as HTMLButtonElement).style.color = T.bad; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = T.text3; }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                  </button>
                                </div>
                                {warn && (
                                  <div style={{ marginTop: 5, padding: '7px 10px', borderRadius: 8, background: T.warnSoft, border: `1px solid ${T.warnLine}`, fontSize: '.76rem', color: T.warn }}>
                                    {configInv
                                      ? `⚠ Factor ${p.factor} con stock ${stockBase} → 0 unidades disponibles. La unidad base parece ser mayor que esta presentación.`
                                      : '⚠ Esta presentación tiene precio menor que la unidad base. Las presentaciones deben ser más caras.'
                                    }
                                  </div>
                                )}
                                {!warn && p.factor > 1 && stockBase > 0 && (
                                  <div style={{ fontSize: '.76rem', color: T.text3, marginTop: 4, paddingLeft: 2 }}>
                                    Stock en esta presentación: <strong>{stockEnPres}</strong> {unidadesMedida.find(u => u.id === p.unidadMedidaId)?.nombre ?? ''}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── 3 · Variantes (TIENDA_ROPA) ── */}
                {esRopa && (
                  <>
                    <div style={{ height: 1, background: T.lineSoft, margin: '22px -22px' }} />
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: T.text3 }}>3 · Variantes</span>
                      <span style={{ fontSize: '.76rem', color: T.text3 }}>Talla y color</span>
                      <button type="button" onClick={addVarianteBorrador}
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px', fontSize: '.78rem', fontWeight: 650, color: T.primary, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                        Agregar
                      </button>
                    </div>
                    {variantesBorrador.length === 0 ? (
                      <div style={{ padding: 18, border: `1.5px dashed ${T.line}`, borderRadius: 12, textAlign: 'center', fontSize: '.8rem', color: T.text3 }}>
                        Sin variantes. El stock se controla a nivel de producto.
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '88px minmax(0,1fr) minmax(0,1fr) 78px 36px', gap: 8, marginBottom: 6, padding: '0 2px', fontSize: '.72rem', fontWeight: 650, letterSpacing: '.03em', textTransform: 'uppercase', color: T.text3 }}>
                          <span>Talla</span><span>Color</span><span>SKU</span><span>Stock</span><span></span>
                        </div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {variantesBorrador.map((v, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '88px minmax(0,1fr) minmax(0,1fr) 78px 36px', gap: 8, alignItems: 'center' }}>
                              <div style={{ position: 'relative', minWidth: 0 }}>
                                <select value={v.talla} onChange={e => updateVarianteBorrador(idx, 'talla', e.target.value)}
                                  style={{ width: '100%', height: 40, padding: '0 26px 0 11px', fontFamily: 'Inter,sans-serif', fontSize: '.84rem', fontWeight: 600, color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                                  <option value="">—</option>
                                  {['XS','S','M','L','XL','XXL','XXXL','28','30','32','34','36','38','40','42','44','UNICA'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="m6 9 6 6 6-6"/></svg>
                              </div>
                              <FxInput value={v.color} onChange={e => updateVarianteBorrador(idx, 'color', e.target.value)} placeholder="Negro, Azul…" style={{ height: 40, fontSize: '.84rem' }} />
                              <FxInput value={v.sku} onChange={e => updateVarianteBorrador(idx, 'sku', e.target.value)} placeholder="VEST-NEG-S" style={{ height: 40, fontFamily: "'IBM Plex Mono',monospace", fontSize: '.8rem' }} />
                              <FxInput type="number" min="0" value={v.stockActual} onChange={e => updateVarianteBorrador(idx, 'stockActual', parseInt(e.target.value || '0'))} placeholder="0" style={{ height: 40, fontSize: '.84rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }} />
                              <button type="button" onClick={() => removeVarianteBorrador(idx)}
                                style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', color: T.text3, background: 'transparent', border: 0, borderRadius: 8, cursor: 'pointer' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.badSoft; (e.currentTarget as HTMLButtonElement).style.color = T.bad; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = T.text3; }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', gap: 9, paddingTop: 22, marginTop: 6, borderTop: `1px solid ${T.lineSoft}` }}>
                  <button type="button" onClick={resetForm}
                    style={{ minWidth: 104, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 600, color: T.text2, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 11, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                    onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={formData.nombre.length < 3}
                    style={{ flex: 1, height: 44, padding: '0 18px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', fontWeight: 650, color: '#fff', background: formData.nombre.length < 3 ? T.text3 : T.primary, border: 0, borderRadius: 11, cursor: formData.nombre.length < 3 ? 'default' : 'pointer', transition: 'background .12s' }}>
                    {editingId ? 'Actualizar' : 'Crear'} {esServicios ? 'servicio' : 'producto'}
                  </button>
                </div>

                <input ref={imgInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleImageChange} />
              </form>
            </div>
          </div>,
          document.body
        );
      })()}


      {/* Dialog: Gestión de variantes (TIENDA_ROPA) */}
      <Dialog
        isOpen={isVariantesOpen}
        onClose={() => { setIsVariantesOpen(false); setEditingVarianteId(null); }}
        title={`Variantes — ${selectedProductoVariantes?.nombre ?? ''}`}
        description="Gestiona las combinaciones de talla y color con su stock individual."
        size="lg"
      >
        <div className="space-y-5">
          {/* Formulario agregar/editar variante */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-semibold">{editingVarianteId ? 'Editar variante' : 'Nueva variante'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Talla</label>
                <select
                  value={varianteForm.talla ?? ''}
                  onChange={e => setVarianteForm(p => ({ ...p, talla: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm h-9"
                >
                  <option value="">Sin talla</option>
                  {['XS','S','M','L','XL','XXL','XXXL','28','30','32','34','36','38','40','42','44','UNICA'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Color</label>
                <Input placeholder="Ej: Negro, Rojo, Azul marino..." value={varianteForm.color ?? ''} onChange={e => setVarianteForm(p => ({ ...p, color: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-medium text-muted-foreground">SKU (opcional)</label>
                <Input placeholder="Ej: VEST-NEG-S" value={varianteForm.sku ?? ''} onChange={e => setVarianteForm(p => ({ ...p, sku: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              {editingVarianteId && (
                <Button variant="outline" size="sm" onClick={() => { setEditingVarianteId(null); setVarianteForm({ productoId: selectedProductoVariantes?.id ?? 0, talla: '', color: '', stockActual: 0, stockMinimo: 0, sku: '', activo: true }); }}>
                  Cancelar
                </Button>
              )}
              <Button size="sm" onClick={handleSaveVariante} disabled={savingVariante}>
                {savingVariante ? <Loader2 size={14} className="animate-spin mr-1" /> : <Plus size={14} className="mr-1" />}
                {editingVarianteId ? 'Actualizar' : 'Agregar variante'}
              </Button>
            </div>
          </div>

          {/* Lista de variantes existentes */}
          {loadingVariantes ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
          ) : productoVariantes.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Layers size={32} className="mx-auto mb-2 opacity-30" />
              <p>Sin variantes aún. Agrega la primera combinación arriba.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Talla</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productoVariantes.map(v => (
                    <TableRow key={v.id} className={!v.activo ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{v.talla || '—'}</TableCell>
                      <TableCell>{v.color || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{v.sku || '—'}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${(v.stockActual ?? 0) <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {v.stockActual ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditVariante(v)} title="Editar">
                            <Edit2 size={13} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteVariante(v.id!)} title="Eliminar" className="text-destructive hover:text-destructive">
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Dialog>

      {/* Confirm modal portal */}
      {cfState.open && cfState.producto && (() => {
        const cfg = CONFIRM_CFG[cfState.action];
        const av = avatarStyle(cfState.producto.nombre);
        return createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(9,11,16,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) setCfState(s => ({ ...s, open: false })); }}>
            <div style={{ width: '100%', maxWidth: 480, background: T.surface, borderRadius: 18, boxShadow: '0 24px 64px -12px rgba(16,24,40,.28)', overflow: 'hidden' }}>
              <div style={{ padding: '22px 24px 0', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.toneSoft, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cfg.tone} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={cfg.iconPath}/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: T.text }}>{cfg.titulo}</div>
                  <div style={{ fontSize: '.84rem', color: T.text3, marginTop: 3 }}>{cfg.sub}</div>
                </div>
              </div>
              <div style={{ margin: '18px 24px', padding: '12px 14px', background: T.surface2, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: av.bg, color: av.color, display: 'grid', placeItems: 'center', fontSize: '.78rem', fontWeight: 700, flexShrink: 0 }}>{iniciales(cfState.producto.nombre)}</div>
                <div>
                  <div style={{ fontSize: '.875rem', fontWeight: 650, color: T.text }}>{cfState.producto.nombre}</div>
                  {cfState.producto.codigoBarras && <div style={{ fontSize: '.76rem', fontFamily: "'IBM Plex Mono',monospace", color: T.text3 }}>{cfState.producto.codigoBarras}</div>}
                </div>
              </div>
              <div style={{ padding: '0 24px 20px', fontSize: '.84rem', color: T.text3, lineHeight: 1.55 }}>{cfg.texto}</div>
              <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.lineSoft}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => setCfState(s => ({ ...s, open: false }))} disabled={cfState.running}
                  style={{ height: 36, padding: '0 16px', fontSize: '.845rem', fontWeight: 600, color: T.text2, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 9, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={executeCf} disabled={cfState.running}
                  style={{ height: 36, padding: '0 18px', fontSize: '.845rem', fontWeight: 650, color: '#fff', background: cfg.tone, border: 0, borderRadius: 9, cursor: cfState.running ? 'default' : 'pointer', opacity: cfState.running ? 0.7 : 1 }}>
                  {cfState.running ? 'Procesando…' : cfg.btnLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

function ActionBtn({ title, hoverColor, hoverBg, onClick, icon }: { title: string; hoverColor: string; hoverBg: string; onClick: () => void; icon: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', background: hov ? hoverBg : 'transparent', color: hov ? hoverColor : '#6b7280', border: 0, borderRadius: 8, cursor: 'pointer', transition: 'background .12s, color .12s', flexShrink: 0 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
    </button>
  );
}
