import { useEffect, useMemo, useState } from 'react';
import { productoService } from '../../services/producto.service';
import { unidadMedidaService } from '../../services/unidadMedida.service';
import { movimientoService } from '../../services/movimiento.service';
import type { ProductoDTO, UnidadMedidaDTO } from '../../types';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';

type EstadoProductoFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';

export function ProductosList() {
  const { canCreate, canEdit, canDelete, canView } = usePermissions();
  const hasViewPermission = canView('PRODUCTOS');
  const { user } = useAuthStore();

  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedidaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUnidades, setLoadingUnidades] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoProductoFilter>('TODOS');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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

  const [formData, setFormData] = useState<ProductoDTO>({
    nombre: '',
    codigoBarras: '',
    categoria: '',
    stockActual: 0,
    stockMinimo: 10,
    stockMaximo: 500,
    costoUnitario: 0,
    precioVenta: 0,
    activo: true,
    tenantId: user?.tenantId ?? '',
    unidadMedidaId: 0,
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
  }, [searchTerm, estadoFilter]);

  const fetchUnidades = async () => {
    try {
      setLoadingUnidades(true);
      const unidades = await unidadMedidaService.getAll();
      const unidadesActivas = unidades.filter((u) => u.activo !== false);
      setUnidadesMedida(unidadesActivas);
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
      const unidades = await unidadMedidaService.getAll();
      const unidadesActivas = unidades.filter((u) => u.activo !== false);
      setUnidadesMedida(unidadesActivas);

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

    if (import.meta.env.DEV) console.log('📤 Datos que se envían:', JSON.stringify(formData, null, 2));

    try {
      if (editingId) {
        await productoService.update(editingId, formData);
        toast.success('Producto actualizado');
      } else {
        const nuevoProducto = await productoService.create(formData);

        // Crear movimiento de "Saldo inicial" al crear el producto
        if (nuevoProducto.id && formData.stockActual > 0) {
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

  const handleEdit = (producto: ProductoDTO) => {
    setFormData({
      id: producto.id,
      nombre: producto.nombre,
      codigoBarras: producto.codigoBarras || '',
      categoria: producto.categoria || '',
      stockActual: producto.stockActual || 0,
      stockMinimo: producto.stockMinimo || 10,
      stockMaximo: producto.stockMaximo || 500,
      costoUnitario: producto.costoUnitario,
      precioVenta: producto.precioVenta,
      activo: producto.activo,
      tenantId: producto.tenantId,
      unidadMedidaId: producto.unidadMedidaId || 0,
    });

    setEditingId(producto.id!);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      codigoBarras: '',
      categoria: '',
      stockActual: 0,
      stockMinimo: 10,
      stockMaximo: 500,
      costoUnitario: 0,
      precioVenta: 0,
      activo: true,
      tenantId: user?.tenantId ?? '',
      unidadMedidaId: unidadesMedida.length > 0 ? unidadesMedida[0].id : 0,
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  // ✅ Filtrado: búsqueda + estado
  const filteredProductos = productos.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      p.nombre.toLowerCase().includes(q) ||
      p.codigoBarras?.toLowerCase().includes(q) ||
      p.categoria?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (estadoFilter === 'ACTIVOS') return p.activo;
    if (estadoFilter === 'INACTIVOS') return !p.activo;
    return true;
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

          {/* Search + filtro estado */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, código de barras o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>

                <div className="sm:w-[320px]">
                  <div
                    className="inline-flex w-full items-center rounded-lg border border-input bg-muted p-1"
                    role="tablist"
                    aria-label="Filtrar productos por estado"
                  >
                    <button
                      type="button"
                      onClick={() => setEstadoFilter('TODOS')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition
                        ${
                          estadoFilter === 'TODOS'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      aria-pressed={estadoFilter === 'TODOS'}
                    >
                      Todos
                    </button>

                    <button
                      type="button"
                      onClick={() => setEstadoFilter('ACTIVOS')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition flex items-center justify-center gap-2
                        ${
                          estadoFilter === 'ACTIVOS'
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      aria-pressed={estadoFilter === 'ACTIVOS'}
                      title="Mostrar solo productos activos"
                    >
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Activos
                    </button>

                    <button
                      type="button"
                      onClick={() => setEstadoFilter('INACTIVOS')}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition flex items-center justify-center gap-2
                        ${
                          estadoFilter === 'INACTIVOS'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      aria-pressed={estadoFilter === 'INACTIVOS'}
                      title="Mostrar solo productos inactivos"
                    >
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Inactivos
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Productos</CardTitle>
              <CardDescription>{filteredProductos.length} producto(s) encontrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredProductos.length === 0 ? (
                <EmptyState title="No hay productos" description="Comienza agregando tu primer producto al inventario" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                                <Badge variant="outline">{producto.categoria || '-'}</Badge>
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
                  Código de Barras <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="123456789"
                    value={formData.codigoBarras}
                    onChange={(e) => setFormData({ ...formData, codigoBarras: e.target.value })}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Seleccione una categoría</option>
                    <optgroup label="Farmacia">
                      <option value="MEDICAMENTOS">Medicamentos</option>
                      <option value="CUIDADO_PERSONAL">Cuidado Personal</option>
                      <option value="HIGIENE">Higiene</option>
                    </optgroup>
                    <optgroup label="Bodega">
                      <option value="BEBIDAS">Bebidas</option>
                      <option value="SNACKS">Snacks</option>
                      <option value="ABARROTES">Abarrotes</option>
                    </optgroup>
                    <optgroup label="Ferretería">
                      <option value="HERRAMIENTAS">Herramientas</option>
                      <option value="ELECTRICIDAD">Electricidad</option>
                    </optgroup>
                    <option value="OTROS">Otros</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  Unidad de Medida <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Scale className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <select
                    value={formData.unidadMedidaId || ''}
                    onChange={(e) => setFormData({ ...formData, unidadMedidaId: Number(e.target.value) })}
                    className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                    disabled={loadingUnidades}
                  >
                    <option value="" disabled>
                      {loadingUnidades ? 'Cargando unidades...' : 'Seleccione unidad de medida'}
                    </option>
                    {unidadesMedida.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                        {u.abreviatura ? ` (${u.abreviatura})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
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
                  value={formData.stockMinimo}
                  onChange={(e) => setFormData({ ...formData, stockMinimo: parseInt(e.target.value || '0') })}
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
                  value={formData.stockMaximo}
                  onChange={(e) => setFormData({ ...formData, stockMaximo: parseInt(e.target.value || '0') })}
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
                    value={formData.costoUnitario}
                    onChange={(e) => setFormData({ ...formData, costoUnitario: parseFloat(e.target.value || '0') })}
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
                    value={formData.precioVenta}
                    onChange={(e) => setFormData({ ...formData, precioVenta: parseFloat(e.target.value || '0') })}
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