import { useEffect, useMemo, useState } from 'react';
import { movimientoService } from '../../services/movimiento.service';
import { productoService } from '../../services/producto.service';
import { unidadMedidaService } from '../../services/unidadMedida.service';
import { proveedorService } from '../../services/proveedor.service';
import type { MovimientoInventarioDTO, ProductoDTO, ProveedorDTO, UnidadMedidaDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { Autocomplete } from '../../components/ui/Autocomplete';
import { Pagination } from '../../components/ui/Pagination'; // ✅ NUEVO
import { Plus, Trash2, Package, Search, TrendingUp, TrendingDown, RotateCcw, ArrowLeftRight, Eye, Subtitles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { usePermissions } from '../../hooks/usePermissions';

export function InventarioList() {
  const { userId } = useCurrentUser();
  const { canCreate, canDelete } = usePermissions();
  const [movimientos, setMovimientos] = useState<MovimientoInventarioDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedidaDTO[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducto, setSelectedProducto] = useState<any>(null);
  const [selectedProveedorMov, setSelectedProveedorMov] = useState<any>(null);
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [kardexLoading, setKardexLoading] = useState(false);
  const [kardexProducto, setKardexProducto] = useState<ProductoDTO | null>(null);
  const [kardexMovimientos, setKardexMovimientos] = useState<MovimientoInventarioDTO[]>([]);

  // ✅ NUEVO - Estados de paginación
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

  const openKardex = async (productoId: number) => {
    try {
      const prod = productos.find((p) => p.id === productoId) || null;
      setKardexProducto(prod);
      setIsKardexOpen(true);

      setKardexLoading(true);
      const data = await movimientoService.getByProducto(productoId);

      // opcional: ordenar por fecha desc si tienes createdAt
      const sorted = [...data].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });

      setKardexMovimientos(sorted);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar kardex');
    } finally {
      setKardexLoading(false);
    }
  };

  const closeKardex = () => {
    setIsKardexOpen(false);
    setKardexProducto(null);
    setKardexMovimientos([]);
  };

  const [formData, setFormData] = useState<MovimientoInventarioDTO>({
    productoId: 0,
    tipo: 'ENTRADA',
    cantidad: 0,
    descripcion: '',
    referencia: '',
    usuarioId: 0,
    tenantId: 'farmacia-001',
    proveedorId: undefined,
    costoUnitario: undefined,
    lote: '',
    fechaVencimiento: undefined,
  });

  useEffect(() => {
    if (userId) {
      console.log('🔄 Actualizando userId en formData:', userId);
      setFormData((prev) => ({
        ...prev,
        usuarioId: userId,
      }));
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ NUEVO - Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [movimientosData, productosData, unidadesData, proveedoresData] = await Promise.all([
        movimientoService.getAll(),
        productoService.getAll(),
        unidadMedidaService.getAll(),
        proveedorService.getAll(),
      ]);

      setMovimientos(movimientosData);
      setProductos(productosData);
      setProveedores(proveedoresData);

      // si tu backend maneja "activo"
      setUnidadesMedida(unidadesData.filter((u) => u.activo !== false));
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const proveedorById = useMemo(() => {
    const m = new Map<number, ProveedorDTO>();
    proveedores.forEach((p) => m.set(p.id!, p));
    return m;
  }, [proveedores]);

  const unidadById = useMemo(() => {
    const m = new Map<number, UnidadMedidaDTO>();
    unidadesMedida.forEach((u) => m.set(u.id, u));
    return m;
  }, [unidadesMedida]);

  const productosOptions = productos.map((p) => ({
    id: p.id!,
    label: `${p.nombre}`,
    subtitle: `Código: ${p.codigoBarras || 'N/A'} | Stock: ${p.stockActual ?? 0} | Categoría: ${p.categoria || 'N/A'} | UM: ${unidadById.get(p.unidadMedidaId)?.nombre ?? '-'}`,
  }));

  const proveedoresOptions = proveedores.map((p) => ({
    id: p.id!,
    label: p.nombre,
    subtitle: `RUC: ${p.ruc || 'N/A'} | Contacto: ${p.contacto || 'N/A'}`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.productoId === 0) {
      toast.error('Debes seleccionar un producto');
      return;
    }

    if (!formData.usuarioId) {
      toast.error('Usuario requerido');
      return;
    }

    if (formData.cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    if (!formData.descripcion) {
      toast.error('La descripción es requerida');
      return;
    }

    if (formData.tipo === 'ENTRADA' && formData.costoUnitario !== undefined && formData.costoUnitario <= 0) {
      toast.error('El costo unitario debe ser mayor a 0');
      return;
    }

    // Construir payload: solo incluir campos ENTRADA cuando tipo === 'ENTRADA'
    const payload: MovimientoInventarioDTO =
      formData.tipo === 'ENTRADA'
        ? { ...formData }
        : {
            productoId: formData.productoId,
            tipo: formData.tipo,
            cantidad: formData.cantidad,
            descripcion: formData.descripcion,
            referencia: formData.referencia,
            usuarioId: formData.usuarioId,
            tenantId: formData.tenantId,
          };

    try {
      console.log('📤 Enviando movimiento:', payload);
      await movimientoService.create(payload);
      toast.success(`Movimiento de ${formData.tipo} registrado`);
      resetForm();
      await fetchData();
    } catch (error: any) {
      console.error('❌ Error:', error.response?.data);
      const message = error.response?.data?.mensaje || error.message || 'Error al registrar movimiento';
      toast.error(message);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Eliminar Movimiento',
      description: '⚠️ Estás a punto de eliminar este movimiento. Esta acción afectará el stock del producto.',
      confirmText: 'Eliminar Permanentemente',
      action: async () => {
        try {
          await movimientoService.delete(id);
          toast.success('Movimiento eliminado');
          await fetchData();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          toast.error('Error al eliminar movimiento');
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({
      productoId: 0,
      tipo: 'ENTRADA',
      cantidad: 0,
      descripcion: '',
      referencia: '',
      usuarioId: userId || 0,
      tenantId: 'farmacia-001',
      proveedorId: undefined,
      costoUnitario: undefined,
      lote: '',
      fechaVencimiento: undefined,
    });
    setSelectedProducto(null);
    setSelectedProveedorMov(null);
    setIsDialogOpen(false);
  };

  const [tipoFiltro, setTipoFiltro] = useState<'TODOS' | MovimientoInventarioDTO['tipo']>('TODOS');

  const filteredMovimientos = movimientos.filter((m) => {
    const producto = productos.find(p => p.id === m.productoId);
    const matchSearch =
      producto?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.descripcion.toLowerCase().includes(searchTerm.toLowerCase());

    const matchTipo = tipoFiltro === 'TODOS' ? true : m.tipo === tipoFiltro;

    return matchSearch && matchTipo;
  });

  // ✅ NUEVO - Calcular paginación
  const totalPages = Math.ceil(filteredMovimientos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMovimientos = filteredMovimientos.slice(startIndex, endIndex);
  // console.log('movimiento sample', currentMovimientos[0]);

  const getMovimientoIcon = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'SALIDA':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'AJUSTE':
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      case 'DEVOLUCION':
        return <ArrowLeftRight className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getMovimientoBadge = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA':
        return <Badge variant="success">Entrada</Badge>;
      case 'SALIDA':
        return <Badge variant="destructive">Salida</Badge>;
      case 'AJUSTE':
        return <Badge variant="outline">Ajuste</Badge>;
      case 'DEVOLUCION':
        return <Badge variant="warning">Devolución</Badge>;
      default:
        return <Badge variant="secondary">{tipo}</Badge>;
    }
  };

  const totalEntradas = movimientos
    .filter(m => m.tipo === 'ENTRADA')
    .reduce((sum, m) => sum + m.cantidad, 0);
  const totalSalidas = movimientos
    .filter(m => m.tipo === 'SALIDA')
    .reduce((sum, m) => sum + m.cantidad, 0);
  const totalAjustes = movimientos
    .filter(m => m.tipo === 'AJUSTE')
    .reduce((sum, m) => sum + m.cantidad, 0);
  const totalDevoluciones = movimientos
    .filter(m => m.tipo === 'DEVOLUCION')
    .reduce((sum, m) => sum + m.cantidad, 0);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground">
            Gestiona los movimientos de inventario
          </p>
        </div>
        {canCreate('INVENTARIO') && (
          <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Movimiento
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movimientos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalEntradas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salidas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalSalidas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ajustes</CardTitle>
            <RotateCcw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalAjustes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devoluciones</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalDevoluciones}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filtro */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por producto, tipo o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Tipo filtro */}
            <div className="sm:w-[220px]">
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="TODOS">Todos</option>
                <option value="ENTRADA">Entradas</option>
                <option value="SALIDA">Salidas</option>
                <option value="AJUSTE">Ajustes</option>
                <option value="DEVOLUCION">Devoluciones</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Inventario</CardTitle>
          <CardDescription>
            {filteredMovimientos.length} movimiento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMovimientos.length === 0 ? (
            <EmptyState
              title="No hay movimientos"
              description="Comienza registrando tu primer movimiento de inventario"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Unidad Medida</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentMovimientos.map((movimiento) => {
                      const producto = productos.find(p => p.id === movimiento.productoId);
                      return (
                        <TableRow key={movimiento.id}>
                          <TableCell>
                            {/* {producto?.nombre || `Producto #${movimiento.productoId}`} */}
                            <div>
                              <p className="font-medium">{producto?.nombre}</p>
                              <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                                <Package className="h-3 w-3" />
                                {producto?.codigoBarras}
                              </p>
                              <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                                {producto?.stockActual != null ? `Stock Actual: ${producto.stockActual}` : 'Stock: N/A'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{unidadById.get(producto?.unidadMedidaId || 0)?.nombre || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getMovimientoIcon(movimiento.tipo)}
                              {getMovimientoBadge(movimiento.tipo)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{movimiento.cantidad}</TableCell>
                          <TableCell className="text-muted-foreground">{movimiento.descripcion}</TableCell>
                          <TableCell>
                            {movimiento.createdAt ? new Date(movimiento.createdAt).toLocaleDateString('es-PE') : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{movimiento.referencia || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openKardex(movimiento.productoId)}
                              title="Ver kardex"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            {canDelete('INVENTARIO') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(movimiento.id!)}
                                title="Eliminar movimiento"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
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
                totalItems={filteredMovimientos.length}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear movimiento */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title="Nuevo Movimiento de Inventario"
        description="Registra un movimiento de entrada, salida, ajuste o devolución"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Producto
                <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                options={productosOptions}
                value={selectedProducto}
                onChange={(option) => {
                  if (option) {
                    const producto = productos.find((p) => p.id === option.id);
                    if (producto) {
                      setSelectedProducto(option);
                      setFormData({ ...formData, productoId: producto.id! });
                    }
                  } else {
                    setSelectedProducto(null);
                    setFormData({ ...formData, productoId: 0 });
                  }
                }}
                placeholder="Buscar producto por nombre..."
                emptyMessage="No se encontró el producto"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tipo de Movimiento
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => {
                  const nuevoTipo = e.target.value as MovimientoInventarioDTO['tipo'];
                  setFormData({
                    ...formData,
                    tipo: nuevoTipo,
                    // Limpiar campos exclusivos de ENTRADA si cambia a otro tipo
                    ...(nuevoTipo !== 'ENTRADA' && {
                      proveedorId: undefined,
                      costoUnitario: undefined,
                      lote: '',
                      fechaVencimiento: undefined,
                    }),
                  });
                  if (nuevoTipo !== 'ENTRADA') setSelectedProveedorMov(null);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="ENTRADA">Entrada (Compra)</option>
                <option value="SALIDA">Salida (Venta)</option>
                <option value="AJUSTE">Ajuste (Inventario)</option>
                <option value="DEVOLUCION">Devolución (Cliente)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Cantidad
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) })}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Referencia</label>
              <Input
                type="text"
                placeholder="Número de compra, venta, etc."
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">
                Descripción
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Motivo o detalles del movimiento"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                required
              />
            </div>

            {/* Campos exclusivos para ENTRADA (Compra) */}
            {formData.tipo === 'ENTRADA' && (
              <>
                <div className="md:col-span-2 border-t pt-3">
                  <p className="text-sm font-medium text-green-700 mb-3">Datos de la compra (Entrada)</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Proveedor</label>
                  <Autocomplete
                    options={proveedoresOptions}
                    value={selectedProveedorMov}
                    onChange={(option) => {
                      if (option) {
                        setSelectedProveedorMov(option);
                        setFormData({ ...formData, proveedorId: option.id as number });
                      } else {
                        setSelectedProveedorMov(null);
                        setFormData({ ...formData, proveedorId: undefined });
                      }
                    }}
                    placeholder="Buscar proveedor..."
                    emptyMessage="No se encontró el proveedor"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Costo Unitario</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.costoUnitario ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        costoUnitario: e.target.value !== '' ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Lote</label>
                  <Input
                    placeholder="Ej: L123456"
                    value={formData.lote ?? ''}
                    onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de Vencimiento</label>
                  <Input
                    type="date"
                    value={formData.fechaVencimiento ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, fechaVencimiento: e.target.value || undefined })
                    }
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button type="submit" disabled={formData.cantidad <= 0 || formData.productoId === 0}>
              Registrar Movimiento
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
          isOpen={isKardexOpen}
          onClose={closeKardex}
          title="Kardex del producto"
          description={
            kardexProducto
              ? `${kardexProducto.nombre} | Código: ${kardexProducto.codigoBarras || 'N/A'} | Stock: ${kardexProducto.stockActual ?? 0}`
              : 'Historial de movimientos'
          }
          size="xl"
        >
          {kardexLoading ? (
            <LoadingSpinner />
          ) : kardexMovimientos.length === 0 ? (
            <EmptyState
              title="Sin movimientos"
              description="Este producto no tiene movimientos registrados"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Costo U.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kardexMovimientos.map((m) => {
                    const prov = m.proveedorId ? proveedorById.get(m.proveedorId) : undefined;

                    const isEntrada = m.tipo === 'ENTRADA';

                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.createdAt ? new Date(m.createdAt).toLocaleString('es-PE') : '-'}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovimientoIcon(m.tipo)}
                            {getMovimientoBadge(m.tipo)}
                          </div>
                        </TableCell>

                        <TableCell className="text-center font-semibold">{m.cantidad}</TableCell>
                        <TableCell className="text-muted-foreground">{m.descripcion}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.referencia || '-'}</TableCell>

                        {/* ✅ Solo ENTRADA muestra datos, si no '-' */}
                        <TableCell className="text-muted-foreground text-sm">
                          {isEntrada ? (prov?.nombre ?? (m.proveedorId ? `Proveedor #${m.proveedorId}` : '-')) : '-'}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-sm">
                          {isEntrada ? (m.lote || '-') : '-'}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-sm">
                          {isEntrada ? (m.fechaVencimiento ? new Date(m.fechaVencimiento).toLocaleDateString('es-PE') : '-') : '-'}
                        </TableCell>

                        <TableCell className="text-right text-muted-foreground text-sm">
                          {isEntrada && m.costoUnitario != null ? m.costoUnitario.toFixed(2) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" type="button" onClick={closeKardex}>
              Cerrar
            </Button>
          </div>
        </Dialog>

      {/* Confirm Dialog */}
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