import { useEffect, useState } from 'react';
import { ventaService } from '../../services/venta.service';
import { productoService } from '../../services/producto.service';
import type { VentaDTO, ProductoDTO, DetalleVentaDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Autocomplete } from '../../components/ui/Autocomplete';
import { Pagination } from '../../components/ui/Pagination';
import { Plus, Trash2, ShoppingCart, Search, DollarSign, Eye, User, Calendar, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { useCurrentUser } from '../../hooks/useCurrentUser';

export function VentasList() {
  const { userId } = useCurrentUser();
  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenta, setSelectedVenta] = useState<VentaDTO | null>(null);

  // ✅ NUEVO - Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ NUEVO - Estados de filtro por fecha
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [selectedProductos, setSelectedProductos] = useState<{ [key: number]: any }>({});

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'info' as 'warning' | 'danger' | 'success' | 'info',
    title: '',
    description: '',
    confirmText: '',
    action: null as (() => Promise<void>) | null,
  });

  const [formData, setFormData] = useState<VentaDTO>({
    vendedorId: 0,
    total: 0,
    metodoPago: 'EFECTIVO',
    estado: 'COMPLETADA',
    tenantId: 'farmacia-001',
    detalles: [],
  });

  useEffect(() => {
    if (userId) {
      console.log('🔄 Actualizando vendedorId:', userId);
      setFormData((prev) => ({
        ...prev,
        vendedorId: userId,
      }));
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ NUEVO - Resetear página al buscar o filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fechaDesde, fechaHasta]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ventasData, productosData] = await Promise.all([
        ventaService.getAll(),
        productoService.getAll(),
      ]);
      console.log('📦 Ventas recibidas:', ventasData);
    console.log('📅 Primera venta createdAt:', ventasData[0]?.createdAt);
      setVentas(ventasData);
      setProductos(productosData);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const productosOptions = productos.map((p) => ({
    id: p.id!,
    label: p.nombre,
    subtitle: `Código: ${p.codigoBarras} | Stock: ${p.stockActual} | S/.${p.precioVenta.toFixed(2)}`,
  }));

  const handleAddDetalle = () => {
    setFormData({
      ...formData,
      detalles: [
        ...formData.detalles,
        {
          productoId: 0,
          cantidad: 1,
          precioUnitario: 0,
        },
      ],
    });
  };

  const handleDetalleChange = (
    index: number,
    field: keyof DetalleVentaDTO,
    value: any
  ) => {
    const newDetalles = [...formData.detalles];
    newDetalles[index] = { ...newDetalles[index], [field]: value };

    if (field === 'productoId') {
      const producto = productos.find(p => p.id === parseInt(value));
      if (producto) {
        newDetalles[index].precioUnitario = producto.precioVenta;
      }
    }

    setFormData({ ...formData, detalles: newDetalles });
  };

  const handleRemoveDetalle = (index: number) => {
    const newSelectedProductos = { ...selectedProductos };
    delete newSelectedProductos[index];
    setSelectedProductos(newSelectedProductos);

    setFormData({
      ...formData,
      detalles: formData.detalles.filter((_, i) => i !== index),
    });
  };

  const calculateTotal = () => {
    return formData.detalles.reduce((total, detalle) => {
      return total + (detalle.cantidad * detalle.precioUnitario);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.detalles.length === 0) {
      toast.error('Debes agregar al menos un producto');
      return;
    }

    try {
      const ventaToSend = {
        ...formData,
        total: calculateTotal(),
      };
      await ventaService.create(ventaToSend);
      toast.success('Venta creada exitosamente');
      resetForm();
      await fetchData();
    } catch (error) {
      toast.error('Error al crear venta');
      console.error(error);
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

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Eliminar Venta',
      description: '⚠️ Estás a punto de eliminar esta venta de forma permanente. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar Permanentemente',
      action: async () => {
        try {
          await ventaService.delete(id);
          toast.success('Venta eliminada');
          await fetchData();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          toast.error('Error al eliminar venta');
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({
      vendedorId: userId || 0,
      total: 0,
      metodoPago: 'EFECTIVO',
      estado: 'COMPLETADA',
      tenantId: 'farmacia-001',
      detalles: [],
    });
    setSelectedProductos({});
    setIsDialogOpen(false);
  };

  // ✅ NUEVO - Limpiar filtros de fecha
  const clearDateFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
  };

  // ✅ ACTUALIZADO - Filtrar ventas por búsqueda y fechas
  const filteredVentas = ventas.filter(v => {
    // Filtro por búsqueda de texto
    const matchesSearch = 
      v.metodoPago?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.estado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendedorNombre?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Filtro por fecha
    if (fechaDesde || fechaHasta) {
      const fechaVenta = v.createdAt ? new Date(v.createdAt) : null;
      if (!fechaVenta) return false;

      // ✅ CORRECCIÓN: Normalizar fechas en hora local (no UTC)
      const ventaDate = new Date(
        fechaVenta.getFullYear(), 
        fechaVenta.getMonth(), 
        fechaVenta.getDate()
      );

      if (fechaDesde) {
        // ✅ CORRECCIÓN: Parsear fecha en formato local
        const [year, month, day] = fechaDesde.split('-').map(Number);
        const desdeNormalized = new Date(year, month - 1, day);
        
        if (ventaDate < desdeNormalized) return false;
      }

      if (fechaHasta) {
        // ✅ CORRECCIÓN: Parsear fecha en formato local
        const [year, month, day] = fechaHasta.split('-').map(Number);
        const hastaNormalized = new Date(year, month - 1, day);
        
        if (ventaDate > hastaNormalized) return false;
      }
    }

    return true;
  });

  // ✅ NUEVO - Calcular paginación
  const totalPages = Math.ceil(filteredVentas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVentas = filteredVentas.slice(startIndex, endIndex);

  const totalVentas = ventas.length;
  const totalIngresos = ventas.reduce((sum, v) => sum + v.total, 0);
  const ventasCompletadas = ventas.filter(v => v.estado === 'COMPLETADA').length;
  const ventasPendientes = ventas.filter(v => v.estado === 'PENDIENTE').length;
  const totalProductosVendidos = ventas.reduce((sum, v) => sum + v.detalles.reduce((sum2, d) => sum2 + d.cantidad, 0), 0);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">
            Gestiona las ventas y transacciones
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Venta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVentas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ventasCompletadas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Vendidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProductosVendidos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/.{totalIngresos.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ NUEVO - Filtros (Búsqueda y Fechas) */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Búsqueda */}
            <div className="md:col-span-5">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por vendedor, método de pago o estado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Fecha Desde */}
            <div className="md:col-span-3">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  placeholder="Desde"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Fecha Hasta */}
            <div className="md:col-span-3">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  placeholder="Hasta"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Botón Limpiar Filtros */}
            {(fechaDesde || fechaHasta) && (
              <div className="md:col-span-1 flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearDateFilters}
                  title="Limpiar filtros de fecha"
                  className="w-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Indicador de filtros activos */}
          {(fechaDesde || fechaHasta) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Filtrando ventas
                {fechaDesde && ` desde ${fechaDesde.split('-').reverse().join('/')}`}
                {fechaHasta && ` hasta ${fechaHasta.split('-').reverse().join('/')}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ventas</CardTitle>
          <CardDescription>
            {filteredVentas.length} venta(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredVentas.length === 0 ? (
            <EmptyState
              title="No hay ventas"
              description="Comienza registrando tu primera venta"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Método de Pago</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* ✅ CAMBIAR - Usar currentVentas en lugar de filteredVentas */}
                    {currentVentas.map((venta) => (
                      <TableRow key={venta.id}>
                        <TableCell className="font-medium">#{venta.id}</TableCell>
                        {/* ✅ NUEVO - Mostrar fecha */}
                        <TableCell>
                          <div className="text-sm">
                            {venta.createdAt ? new Date(venta.createdAt).toLocaleDateString('es-PE') : '-'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {venta.createdAt ? new Date(venta.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{venta.vendedorNombre || 'Sin nombre'}</p>
                              <p className="text-xs text-muted-foreground">ID: {venta.vendedorId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{venta.metodoPago}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">S/.{venta.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              venta.estado === 'COMPLETADA'
                                ? 'success'
                                : venta.estado === 'PENDIENTE'
                                ? 'warning'
                                : 'destructive'
                            }
                          >
                            {venta.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{venta.detalles.length} producto(s)</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetail(venta)}
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(venta.id!)}
                              title="Eliminar venta"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ✅ NUEVO - Paginación */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredVentas.length}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear venta */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title="Nueva Venta"
        description="Registra una nueva venta al sistema"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Método de Pago
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.metodoPago}
                onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Estado
                <span className="text-red-500">*</span>
              </label>
              <div className="h-10 rounded-md border border-input bg-muted px-3 py-2 flex items-center">
                <span className="text-sm font-medium">COMPLETADA</span>
              </div>
              <input type="hidden" value="COMPLETADA" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Productos</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDetalle}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </div>

            {formData.detalles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay productos agregados</p>
                <p className="text-sm">Click en "Agregar Producto" para comenzar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.detalles.map((detalle, index) => {
                  const productoSeleccionado = productos.find(p => p.id === parseInt(String(detalle.productoId)));
                  const subtotal = detalle.cantidad * detalle.precioUnitario;

                  return (
                    <div key={index} className="border rounded-lg p-4 bg-card space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Producto</label>
                        <Autocomplete
                          options={productosOptions}
                          value={selectedProductos[index] || null}
                          onChange={(option) => {
                            if (option) {
                              const producto = productos.find((p) => p.id === option.id);
                              if (producto) {
                                setSelectedProductos({
                                  ...selectedProductos,
                                  [index]: option,
                                });
                                handleDetalleChange(index, 'productoId', producto.id);
                              }
                            } else {
                              const newSelectedProductos = { ...selectedProductos };
                              delete newSelectedProductos[index];
                              setSelectedProductos(newSelectedProductos);
                              handleDetalleChange(index, 'productoId', 0);
                            }
                          }}
                          placeholder="Buscar producto por nombre..."
                          emptyMessage="No se encontró el producto"
                        />
                      </div>

                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-2 space-y-2">
                          <label className="text-sm font-medium">Stock Actual</label>
                          <Input
                            type="number"
                            value={productoSeleccionado?.stockActual || 0}
                            disabled
                            className={`h-10 font-bold text-center ${
                              productoSeleccionado && productoSeleccionado.stockActual! <= productoSeleccionado.stockMinimo!
                                ? 'bg-red-50 border-red-300 text-destructive'
                                : 'bg-green-50 border-green-300 text-green-600'
                            }`}
                          />
                        </div>

                        <div className="col-span-3 space-y-2">
                          <label className="text-sm font-medium">Cantidad</label>
                          <Input
                            type="number"
                            min="1"
                            max={productoSeleccionado?.stockActual || 999}
                            value={detalle.cantidad}
                            onChange={(e) => {
                              const cantidad = parseInt(e.target.value);
                              if (productoSeleccionado && cantidad > productoSeleccionado.stockActual!) {
                                toast.error(`Solo hay ${productoSeleccionado.stockActual} unidades disponibles`);
                                handleDetalleChange(index, 'cantidad', productoSeleccionado.stockActual!);
                              } else {
                                handleDetalleChange(index, 'cantidad', cantidad);
                              }
                            }}
                            className="h-10 font-bold text-center"
                            required
                          />
                        </div>

                        <div className="col-span-3 space-y-2">
                          <label className="text-sm font-medium">Precio Unit.</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={detalle.precioUnitario}
                            disabled
                            className="h-10 bg-muted font-bold text-center text-primary"
                          />
                        </div>

                        <div className="col-span-3 space-y-2">
                          <label className="text-sm font-medium">Total</label>
                          <div className="h-10 rounded-md border-2 border-primary bg-primary/10 px-3 py-2 flex items-center justify-center font-bold text-primary">
                            S/.{subtotal.toFixed(2)}
                          </div>
                        </div>

                        <div className="col-span-1 flex items-end justify-center h-10">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveDetalle(index)}
                            title="Eliminar producto"
                            className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold text-primary">S/.{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button type="submit" disabled={formData.detalles.length === 0}>
              Crear Venta
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog - Detalle de Venta */}
      <Dialog
        isOpen={isDetailDialogOpen}
        onClose={closeDetailDialog}
        title="Detalle de Venta"
        description={selectedVenta ? `Venta #${selectedVenta.id} - ${selectedVenta.estado}` : ''}
        size="lg"
      >
        {selectedVenta && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground font-medium">Método de Pago</p>
                <p className="font-semibold text-sm">{selectedVenta.metodoPago}</p>
              </div>
              <div className="space-y-1 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground font-medium">Estado</p>
                <Badge
                  variant={
                    selectedVenta.estado === 'COMPLETADA'
                      ? 'success'
                      : selectedVenta.estado === 'PENDIENTE'
                      ? 'warning'
                      : 'destructive'
                  }
                  className="w-fit"
                >
                  {selectedVenta.estado}
                </Badge>
              </div>
              <div className="space-y-1 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground font-medium">Vendedor</p>
                <p className="font-semibold text-sm">{selectedVenta.vendedorNombre || 'Sin nombre'}</p>
                <p className="text-xs text-muted-foreground">ID: {selectedVenta.vendedorId}</p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedVenta.detalles.map((detalle, index) => {
                    const productoInfo = productos.find(
                      (p) => p.id === detalle.productoId
                    );
                    const subtotal = detalle.cantidad * detalle.precioUnitario;

                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {detalle.productoNombre || productoInfo?.nombre || `Producto #${detalle.productoId}`}
                        </TableCell>
                        <TableCell className="text-center">{detalle.cantidad}</TableCell>
                        <TableCell className="text-right">S/.{detalle.precioUnitario.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          S/.{subtotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="bg-primary/10 border border-primary rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Cantidad de productos:</span>
                <span className="font-bold">{selectedVenta.detalles.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Total de unidades:</span>
                <span className="font-bold">
                  {selectedVenta.detalles.reduce((sum, d) => sum + d.cantidad, 0)}
                </span>
              </div>
              <div className="border-t border-primary/20 pt-2 flex justify-between items-center">
                <span className="font-semibold">Total Venta:</span>
                <span className="text-2xl font-bold text-primary">
                  S/.{selectedVenta.total.toFixed(2)}
                </span>
              </div>
            </div>

            <Button onClick={closeDetailDialog} className="w-full">
              Cerrar
            </Button>
          </div>
        )}
      </Dialog>

      {/* Confirm Dialog para eliminar */}
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