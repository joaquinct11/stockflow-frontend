import { useEffect, useMemo, useRef, useState } from 'react';
import { productoService } from '../../services/producto.service';
import { unidadMedidaService } from '../../services/unidadMedida.service';
import { categoriaService } from '../../services/categoria.service';
import { movimientoService } from '../../services/movimiento.service';
import { productoVarianteService } from '../../services/productoVariante.service';
import type { ProductoDTO, UnidadMedidaDTO, CategoriaDTO, ProductoVarianteDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
  DollarSign,
  Lock,
  Barcode,
  Tag,
  Scale,
  Boxes,
  Wallet,
  Timer,
  X,
  Loader2,
  Upload,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';
import { useTenantConfigStore } from '../../store/tenantConfigStore';


export function ProductosList() {
  const { canCreate, canEdit, canDelete, canView } = usePermissions();
  const hasViewPermission = canView('PRODUCTOS');
  const { user } = useAuthStore();
  const { config: negocioConfig } = useTenantConfigStore();
  const esRopa = negocioConfig?.rubro === 'TIENDA_ROPA';

  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedidaDTO[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDTO[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'info' as 'warning' | 'danger' | 'success' | 'info',
    title: '',
    description: '',
    confirmText: '',
    action: null as (() => Promise<void>) | null,
  });

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
    unidadesPorCaja: undefined,
    talla: undefined,
    color: undefined,
  });

  useEffect(() => {
    if (hasViewPermission) {
      fetchData();
    } else if (canCreate('PRODUCTOS')) {
      fetchUnidades();
      setLoading(false);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasViewPermission]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

      const productosData = await productoService.getAll();
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

        toast.success('Producto actualizado');
      } else {
        const nuevoProducto = await productoService.create(formData);

        // Guardar variantes borrador en CREATE
        if (esRopa && variantesBorrador.length > 0 && nuevoProducto.id) {
          await Promise.all(variantesBorrador.map(v =>
            productoVarianteService.create({ ...v, productoId: nuevoProducto.id!, activo: true })
          ));
        }

        // Crear movimiento de "Saldo inicial" solo si NO hay variantes (el stock en variantes se gestiona aparte)
        if (nuevoProducto.id && formData.stockActual > 0 && (!esRopa || variantesBorrador.length === 0)) {
          try {
            await movimientoService.create({
              productoId: nuevoProducto.id,
              tipo: 'SALDO_INICIAL',
              cantidad: formData.stockActual,
              descripcion: 'Saldo inicial',
              usuarioId: user?.usuarioId ?? undefined,
              costoUnitario: formData.costoUnitario > 0 ? formData.costoUnitario : undefined,
            });
          } catch (movErr) {
            if (import.meta.env.DEV) console.warn('⚠️ No se pudo crear el movimiento de saldo inicial:', movErr);
          }
        }

        toast.success('Producto creado');
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

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Eliminar Producto',
      description: '⚠️ Estás a punto de eliminar este producto de forma permanente. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar Permanentemente',
      action: async () => {
        try {
          await productoService.delete(id);
          toast.success('Producto eliminado');
          await fetchData();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          toast.error('Error al eliminar producto');
        }
      },
    });
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
      unidadesPorCaja: producto.unidadesPorCaja,
      talla: producto.talla,
      color: producto.color,
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
      unidadesPorCaja: undefined,
      talla: undefined,
      color: undefined,
    });
    setEditingId(null);
    setIsDialogOpen(false);
    setImgPreview(null);
    setVariantesBorrador([]);
    if (imgInputRef.current) imgInputRef.current.value = '';
  };

  const handleAbrirVariantes = async (producto: ProductoDTO) => {
    setSelectedProductoVariantes(producto);
    setIsVariantesOpen(true);
    setEditingVarianteId(null);
    setVarianteForm({ productoId: producto.id!, talla: '', color: '', stockActual: 0, stockMinimo: 0, sku: '', activo: true });
    try {
      setLoadingVariantes(true);
      const vars = await productoVarianteService.getByProducto(producto.id!);
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
      const vars = await productoVarianteService.getByProducto(selectedProductoVariantes.id!);
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
      const vars = await productoVarianteService.getByProducto(selectedProductoVariantes.id!);
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

  // Filtrado por búsqueda
  const filteredProductos = productos.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.codigoBarras?.toLowerCase().includes(q) ||
      p.categoriaNombre?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProductos = filteredProductos.slice(startIndex, endIndex);

  const totalProductos = productos.length;
  const productosConStockBajo = productos.filter((p) => (p.stockActual ?? 0) <= (p.stockMinimo ?? 0)).length;

  // ✅ Valor inventario: usa costoUnitario (valorización real)
  const valorTotalInventario = productos.reduce((sum, p) => {
    const stock = p.stockActual ?? 0;
    const costo = p.costoUnitario ?? 0;
    return sum + stock * costo;
  }, 0);

  // ✅ NUEVO card (en vez de “Productos sin stock”):
  // Productos con precio inválido (precio <= costo) => pérdida o margen cero
  const productosConPrecioRiesgoso = productos.filter((p) => {
    const costo = p.costoUnitario ?? 0;
    const precio = p.precioVenta ?? 0;
    if (costo <= 0) return false; // sin costo no podemos evaluar riesgo
    return precio <= costo;
  }).length;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">Gestiona tu inventario de productos</p>
        </div>
        {canCreate('PRODUCTOS') && (
          <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        )}
      </div>

      {!hasViewPermission ? (
        <EmptyState
          icon={Lock}
          title="Sin acceso al listado"
          description="No tienes permisos para ver el listado de productos. Puedes registrar nuevos productos con el botón de arriba."
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Productos</p>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Package className="text-blue-600 dark:text-blue-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">{totalProductos}</div>
                <p className="text-xs text-muted-foreground mt-1">En inventario activo</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock Bajo</p>
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="text-amber-600 dark:text-amber-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">{productosConStockBajo}</div>
                <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor Inventario</p>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="text-emerald-600 dark:text-emerald-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight">S/.{valorTotalInventario.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Valorizado al costo</p>
              </CardContent>
            </Card>

            {/* ✅ Card nuevo: Riesgo de precios */}
            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Precios en riesgo</p>
                <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Timer className="text-red-600 dark:text-red-400" size={18} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">{productosConPrecioRiesgoso}</div>
                <p className="text-xs text-muted-foreground mt-1">Precio ≤ costo</p>
              </CardContent>
            </Card>
          </div>

          {/* Búsqueda */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar por nombre, código de barras o categoría..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Lista de Productos</CardTitle>
              <CardDescription>{filteredProductos.length} producto(s) encontrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredProductos.length === 0 ? (
                <EmptyState icon={Package} title="Todavía no hay productos" description="Agrega productos con precio, stock y categoría para empezar a vender y controlar tu inventario en tiempo real." />
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead>Producto</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Unidad</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Costo Unitario</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentProductos.map((producto) => {
                          const unidadLabel =
                            (producto as any).unidadMedidaNombre ??
                            unidadById.get(producto.unidadMedidaId)?.nombre ??
                            '-';

                          return (
                            <TableRow key={producto.id}>
                              <TableCell>
                                <p className="font-medium">{producto.nombre}</p>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{producto.codigoBarras}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {producto.categoriaNombre || '-'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">{unidadLabel}</span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    (producto.stockActual ?? 0) <= (producto.stockMinimo ?? 0)
                                      ? 'destructive'
                                      : (producto.stockActual ?? 0) <= (producto.stockMinimo ?? 0) * 1.5
                                        ? 'warning'
                                        : 'success'
                                  }
                                >
                                  {producto.stockActual ?? 0}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-semibold">S/.{producto.costoUnitario.toFixed(2)}</TableCell>
                              <TableCell className="font-semibold">S/.{producto.precioVenta.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={producto.activo ? 'success' : 'secondary'}>
                                  {producto.activo ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {esRopa && (
                                    <Button
                                      variant="ghost" size="icon"
                                      onClick={() => handleAbrirVariantes(producto)}
                                      title="Gestionar variantes (talla/color)"
                                      className="text-violet-500 hover:text-violet-700"
                                    >
                                      <Layers className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canEdit('PRODUCTOS') && (
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(producto)} title="Editar">
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  )}

                                  {canDelete('PRODUCTOS') && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDelete(producto.id!)}
                                      title="Eliminar"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}

                                  {!canEdit('PRODUCTOS') && !canDelete('PRODUCTOS') && (
                                    <span className="text-xs text-muted-foreground italic">Solo lectura</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredProductos.length}
                    itemsPerPage={itemsPerPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title={editingId ? 'Editar Producto' : 'Nuevo Producto'}
        description={editingId ? 'Actualiza la información del producto' : 'Agrega un nuevo producto al inventario'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{editingId ? 'Editar producto' : 'Registrar producto'}</p>
              <p className="text-xs text-muted-foreground">Completa la información. Los campos con * son obligatorios.</p>
            </div>
            <Badge variant={editingId ? 'secondary' : 'success'} className="w-fit">
              {editingId ? 'Edición' : 'Nuevo'}
            </Badge>
          </div>

          {/* Sección: Identidad */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold">Identificación</p>
              <p className="text-xs text-muted-foreground">Nombre, código y clasificación.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre del producto"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="pl-10 h-11"
                    required
                    minLength={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Código de Barras <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="123456789"
                    value={formData.codigoBarras}
                    onChange={(e) => setFormData({ ...formData, codigoBarras: e.target.value })}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* ── Categoría: select + botón crear ── */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <select
                      value={formData.categoriaId || ''}
                      onChange={(e) => setFormData({ ...formData, categoriaId: Number(e.target.value) })}
                      className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                      disabled={loadingUnidades}
                    >
                      <option value="" disabled>
                        {loadingUnidades ? 'Cargando...' : 'Seleccione categoría'}
                      </option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}{c.esGlobal ? '' : ' ✓'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNuevaCategoriaOpen(true)}
                    title="Agregar nueva categoría"
                    className="h-11 w-11 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors flex-shrink-0"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Mini-panel nueva categoría */}
                {nuevaCategoriaOpen && (
                  <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-primary">Nueva categoría</p>
                      <button type="button" onClick={() => { setNuevaCategoriaOpen(false); setNuevaCategoriaNombre(''); }}
                        className="text-muted-foreground hover:text-foreground">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={nuevaCategoriaNombre}
                        onChange={e => setNuevaCategoriaNombre(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCrearCategoria())}
                        placeholder="Ej: Lácteos, Snacks, Ferretería..."
                        className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={handleCrearCategoria}
                        disabled={!nuevaCategoriaNombre.trim() || savingCategoria}
                        className="h-9 px-3 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors flex items-center gap-1"
                      >
                        {savingCategoria ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        Crear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Unidad de medida: select + botón crear ── */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  Unidad de Medida <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Scale className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <select
                      value={formData.unidadMedidaId || ''}
                      onChange={(e) => setFormData({ ...formData, unidadMedidaId: Number(e.target.value) })}
                      className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                      disabled={loadingUnidades}
                    >
                      <option value="" disabled>
                        {loadingUnidades ? 'Cargando...' : 'Seleccione unidad de medida'}
                      </option>
                      {unidadesMedida.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre}{u.abreviatura ? ` (${u.abreviatura})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNuevaUnidadOpen(true)}
                    title="Agregar nueva unidad de medida"
                    className="h-11 w-11 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors flex-shrink-0"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Mini-panel nueva unidad */}
                {nuevaUnidadOpen && (
                  <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-primary">Nueva unidad de medida</p>
                      <button type="button" onClick={() => { setNuevaUnidadOpen(false); setNuevaUnidadNombre(''); }}
                        className="text-muted-foreground hover:text-foreground">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={nuevaUnidadNombre}
                        onChange={e => setNuevaUnidadNombre(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCrearUnidad())}
                        placeholder="Ej: Caja, Docena, Litro..."
                        className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={handleCrearUnidad}
                        disabled={!nuevaUnidadNombre.trim() || savingUnidad}
                        className="h-9 px-3 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors flex items-center gap-1"
                      >
                        {savingUnidad ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        Crear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sección: Inventario */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold">Parámetros de inventario</p>
              <p className="text-xs text-muted-foreground">Mínimos/máximos para control de stock.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock actual</label>
                <div className="relative">
                  <Boxes className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    disabled
                    value={formData.stockActual}
                    onChange={(e) => setFormData({ ...formData, stockActual: parseInt(e.target.value || '0') })}
                    className="pl-10 h-11"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Se registrará como “Saldo inicial” al crear.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Stock mínimo <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stockMinimo === 0 ? '' : formData.stockMinimo}
                  onChange={(e) => setFormData({ ...formData, stockMinimo: parseInt(e.target.value || '0') })}
                  placeholder="0"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Stock máximo <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stockMaximo === 0 ? '' : formData.stockMaximo}
                  onChange={(e) => setFormData({ ...formData, stockMaximo: parseInt(e.target.value || '0') })}
                  placeholder="0"
                  className="h-11"
                  required
                />
              </div>
            </div>
          </div>

          {/* Sección: Precios */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold">Precios</p>
              <p className="text-xs text-muted-foreground">Costo y precio de venta.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Último costo unitario</label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costoUnitario === 0 ? '' : formData.costoUnitario}
                    onChange={(e) => setFormData({ ...formData, costoUnitario: parseFloat(e.target.value || '0') })}
                    placeholder="0.00"
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Precio de venta <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.precioVenta === 0 ? '' : formData.precioVenta}
                    onChange={(e) => setFormData({ ...formData, precioVenta: parseFloat(e.target.value || '0') })}
                    placeholder="0.00"
                    className="pl-10 h-11"
                    required
                  />
                </div>

                {formData.precioVenta > 0 && formData.costoUnitario > 0 && (
                  <p className="text-xs text-green-600">
                    Margen estimado:{' '}
                    {(((formData.precioVenta - formData.costoUnitario) / formData.costoUnitario) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sección: Variantes de ropa — solo TIENDA_ROPA */}
          {esRopa && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">Variantes de ropa</p>
                  <p className="text-xs text-muted-foreground">Agrega cada combinación de talla y color con su stock.</p>
                </div>
                <button
                  type="button"
                  onClick={addVarianteBorrador}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
                >
                  <Plus size={13} /> Agregar variante
                </button>
              </div>

              {variantesBorrador.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground border border-dashed border-violet-300 dark:border-violet-700 rounded-lg">
                  Aún no hay variantes. Haz clic en "+ Agregar variante" para comenzar.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1">
                    {['Talla', 'Color', 'SKU (opcional)', ''].map(h => (
                      <span key={h} className="text-xs font-medium text-muted-foreground">{h}</span>
                    ))}
                  </div>
                  {variantesBorrador.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                      <select
                        value={v.talla}
                        onChange={e => updateVarianteBorrador(idx, 'talla', e.target.value)}
                        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm h-9"
                      >
                        <option value="">Sin talla</option>
                        {['XS','S','M','L','XL','XXL','XXXL','28','30','32','34','36','38','40','42','44','UNICA'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <Input
                        value={v.color}
                        onChange={e => updateVarianteBorrador(idx, 'color', e.target.value)}
                        placeholder="Ej: Negro, Azul..."
                        className="h-9 text-sm"
                      />
                      <Input
                        value={v.sku}
                        onChange={e => updateVarianteBorrador(idx, 'sku', e.target.value)}
                        placeholder="Ej: VEST-NEG-S"
                        className="h-9 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeVarianteBorrador(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sección: Clasificación — solo farmacia/general (oculto para ropa) */}
          {!esRopa && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold">Clasificación</p>
                <p className="text-xs text-muted-foreground">Datos para búsqueda y presentación del producto.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-background cursor-pointer"
                  onClick={() => setFormData(p => ({ ...p, esGenerico: !p.esGenerico }))}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${formData.esGenerico ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                    {formData.esGenerico && <svg viewBox="0 0 12 10" className="w-3 h-3 text-primary-foreground fill-current"><path d="M1 5l3.5 3.5L11 1"/></svg>}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Producto genérico</p>
                    <p className="text-xs text-muted-foreground">Permite filtrar genéricos en el POS</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unidades por caja</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.unidadesPorCaja === undefined || formData.unidadesPorCaja === 0 ? '' : formData.unidadesPorCaja}
                    onChange={(e) => setFormData(p => ({ ...p, unidadesPorCaja: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="Ej: 100 (tabletas/caja)"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">Cuántas unidades trae la caja o presentación.</p>
                </div>
              </div>
            </div>
          )}

          {/* Sección: Composición — solo farmacia/general */}
          {!esRopa && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold">Composición / Contenido</p>
                <p className="text-xs text-muted-foreground">Opcional. Lista los componentes o principios activos (ej: paracetamol 500mg, amoxicilina 250mg). Permite encontrar este producto al buscar por ingrediente en el POS.</p>
              </div>
              <textarea
                placeholder="Ej: paracetamol 500mg, amoxicilina 250mg, vitamina C..."
                value={formData.componentes ?? ''}
                onChange={e => setFormData(p => ({ ...p, componentes: e.target.value || undefined }))}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Sección: Imagen */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold">Imagen del producto</p>
              <p className="text-xs text-muted-foreground">Opcional. Se mostrará en el POS para facilitar la identificación.</p>
            </div>
            <div className="flex gap-4 items-center">
              {/* Vista previa */}
              <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border">
                {imgPreview
                  ? <img src={imgPreview} alt="Preview" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-bold text-muted-foreground">{formData.nombre?.charAt(0)?.toUpperCase() || '?'}</span>
                }
              </div>
              {/* Controles */}
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => imgInputRef.current?.click()}>
                  <Upload size={13} className="mr-2" />
                  {imgPreview ? 'Cambiar foto' : 'Subir foto'}
                </Button>
                {imgPreview && (
                  <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive"
                    onClick={() => { setImgPreview(null); setFormData(p => ({ ...p, imagenUrl: undefined })); if (imgInputRef.current) imgInputRef.current.value = ''; }}>
                    <X size={13} className="mr-2" /> Quitar imagen
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG o WebP · máx. 2.5 MB</p>
              </div>
            </div>
            <input ref={imgInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageChange} />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={resetForm} className="h-11">
              Cancelar
            </Button>
            <Button type="submit" disabled={formData.nombre.length < 3} className="h-11">
              {editingId ? 'Actualizar' : 'Crear'} Producto
            </Button>
          </div>
        </form>
      </Dialog>

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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        type={confirmDialog.type}
        onConfirm={async () => {
          if (confirmDialog.action) {
            await confirmDialog.action();
          }
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}