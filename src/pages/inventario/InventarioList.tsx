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
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { Autocomplete } from '../../components/ui/Autocomplete';
import { Pagination } from '../../components/ui/Pagination';
import {
  Plus,
  Package,
  Search,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ArrowLeftRight,
  Eye,
  Lock,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { usePermissions } from '../../hooks/usePermissions';

export function InventarioList() {
  const { userId } = useCurrentUser();
  const { canCreate, canView } = usePermissions();
  const hasViewPermission = canView('INVENTARIO');

  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedidaDTO[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducto, setSelectedProducto] = useState<any>(null);
  const [selectedProveedorMov, setSelectedProveedorMov] = useState<any>(null);

  // Kardex dialog state
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [kardexLoading, setKardexLoading] = useState(false);
  const [kardexProducto, setKardexProducto] = useState<ProductoDTO | null>(null);
  const [kardexMovimientos, setKardexMovimientos] = useState<MovimientoInventarioDTO[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      setFormData((prev) => ({ ...prev, usuarioId: userId }));
    }
  }, [userId]);

  useEffect(() => {
    if (hasViewPermission) {
      fetchData();
    } else if (canCreate('INVENTARIO')) {
      fetchFormData();
      setLoading(false);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasViewPermission]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchFormData = async () => {
    try {
      const [productosData, unidadesData, proveedoresData] = await Promise.all([
        productoService.getAll(),
        unidadMedidaService.getAll(),
        proveedorService.getAll(),
      ]);
      setProductos(productosData);
      setProveedores(proveedoresData);
      setUnidadesMedida(unidadesData.filter((u) => u.activo !== false));
    } catch (error) {
      toast.error('Error al cargar datos del formulario');
      console.error(error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productosData, unidadesData, proveedoresData] = await Promise.all([
        productoService.getAll(),
        unidadMedidaService.getAll(),
        proveedorService.getAll(),
      ]);
      setProductos(productosData);
      setProveedores(proveedoresData);
      setUnidadesMedida(unidadesData.filter((u) => u.activo !== false));
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const unidadById = useMemo(() => {
    const m = new Map<number, UnidadMedidaDTO>();
    unidadesMedida.forEach((u) => m.set(u.id, u));
    return m;
  }, [unidadesMedida]);

  const proveedorById = useMemo(() => {
    const m = new Map<number, ProveedorDTO>();
    proveedores.forEach((p) => m.set(p.id!, p));
    return m;
  }, [proveedores]);

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

  const openKardex = async (producto: ProductoDTO) => {
    setKardexProducto(producto);
    setIsKardexOpen(true);
    setKardexLoading(true);
    try {
      const data = await movimientoService.getByProducto(producto.id!);
      // Sort ascending by date so running stock is calculated correctly
      const sorted = [...data].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return da - db;
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
      await movimientoService.create(payload);
      toast.success(`Movimiento de ${formData.tipo} registrado`);
      resetForm();
      await fetchData();
    } catch (error: any) {
      console.error('Error:', error.response?.data);
      const message = error.response?.data?.mensaje || error.message || 'Error al registrar movimiento';
      toast.error(message);
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
      case 'SALDO_INICIAL':
        return <Star className="h-4 w-4 text-purple-600" />;
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
      case 'SALDO_INICIAL':
        return <Badge variant="secondary">Saldo Inicial</Badge>;
      default:
        return <Badge variant="secondary">{tipo}</Badge>;
    }
  };

  const filteredProductos = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigoBarras?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProductos = filteredProductos.slice(startIndex, startIndex + itemsPerPage);

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
            Consulta el stock de productos y registra movimientos
          </p>
        </div>
        {canCreate('INVENTARIO') && (
          <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Movimiento
          </Button>
        )}
      </div>

      {!hasViewPermission ? (
        <EmptyState
          icon={Lock}
          title="Sin acceso al listado"
          description="No tienes permisos para ver el listado de productos. Puedes registrar nuevos movimientos con el botón de arriba."
        />
      ) : (
        <>
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto por nombre, código o categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardContent>
          </Card>

          {/* Products table */}
          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
              <CardDescription>
                {filteredProductos.length} producto(s) — haz clic en{' '}
                <Eye className="inline h-3 w-3" /> para ver el detalle (Kardex)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredProductos.length === 0 ? (
                <EmptyState
                  title="Sin productos"
                  description="No se encontraron productos con ese criterio de búsqueda"
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Unidad</TableHead>
                          <TableHead className="text-center">Stock Actual</TableHead>
                          <TableHead className="text-right">Costo Unit.</TableHead>
                          <TableHead className="text-right">Precio Venta</TableHead>
                          <TableHead className="text-right">Ver detalle</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentProductos.map((producto) => (
                          <TableRow key={producto.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{producto.nombre}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Package className="h-3 w-3" />
                                  {producto.codigoBarras || 'Sin código'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {producto.categoria || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {unidadById.get(producto.unidadMedidaId)?.nombre || '-'}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              <span
                                className={
                                  producto.stockActual <= producto.stockMinimo
                                    ? 'text-red-600'
                                    : 'text-green-700'
                                }
                              >
                                {producto.stockActual}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm">
                              S/.{producto.costoUnitario.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm">
                              S/.{producto.precioVenta.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openKardex(producto)}
                                title="Ver detalle (Kardex)"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
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

      {/* Kardex dialog */}
      <Dialog
        isOpen={isKardexOpen}
        onClose={closeKardex}
        title="Detalle del producto (Kardex)"
        description={
          kardexProducto
            ? `${kardexProducto.nombre} | Código: ${kardexProducto.codigoBarras || 'N/A'} | Stock actual: ${kardexProducto.stockActual ?? 0}`
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
                  <TableHead>Tipo Movimiento</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="text-center">Entradas</TableHead>
                  <TableHead className="text-center">Salidas</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead className="text-right">Costo Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let stockAcumulado = 0;
                  return kardexMovimientos.map((m) => {
                    const esEntrada =
                      m.tipo === 'ENTRADA' ||
                      m.tipo === 'SALDO_INICIAL' ||
                      m.tipo === 'DEVOLUCION';
                    const esSalida = m.tipo === 'SALIDA';
                    const esAjuste = m.tipo === 'AJUSTE';

                    if (esEntrada) {
                      stockAcumulado += m.cantidad;
                    } else if (esSalida) {
                      stockAcumulado -= m.cantidad;
                    } else if (esAjuste) {
                      stockAcumulado += m.cantidad;
                    }

                    const costoUnitario = m.costoUnitario ?? 0;
                    const costoTotal = costoUnitario > 0 ? costoUnitario * m.cantidad : undefined;
                    const prov = m.proveedorId ? proveedorById.get(m.proveedorId) : undefined;
                    const documento = m.referencia || prov?.nombre || m.descripcion || '-';

                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleDateString('es-PE')
                            : '-'}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovimientoIcon(m.tipo)}
                            {getMovimientoBadge(m.tipo)}
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground text-sm max-w-[160px] truncate">
                          {documento}
                        </TableCell>

                        <TableCell className="text-center font-semibold text-green-700">
                          {esEntrada ? m.cantidad : '-'}
                        </TableCell>

                        <TableCell className="text-center font-semibold text-red-700">
                          {esSalida ? m.cantidad : '-'}
                        </TableCell>

                        <TableCell className="text-center font-bold">
                          {stockAcumulado}
                        </TableCell>

                        <TableCell className="text-right text-muted-foreground text-sm">
                          {costoUnitario > 0 ? `S/.${costoUnitario.toFixed(2)}` : '-'}
                        </TableCell>

                        <TableCell className="text-right text-muted-foreground text-sm">
                          {costoTotal != null && costoTotal > 0
                            ? `S/.${costoTotal.toFixed(2)}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
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
    </div>
  );
}
