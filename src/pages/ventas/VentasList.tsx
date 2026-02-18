import { useEffect, useState } from 'react';
import { ventaService } from '../../services/venta.service';
import { productoService } from '../../services/producto.service';
import type { VentaDTO, ProductoDTO, DetalleVentaDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/Input';

export function VentasList() {
  const [ventas, setVentas] = useState<VentaDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<VentaDTO>({
    vendedorId: 1,
    total: 0,
    metodoPago: 'EFECTIVO',
    estado: 'COMPLETADA',
    tenantId: 'farmacia-001',
    detalles: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ventasData, productosData] = await Promise.all([
        ventaService.getAll(),
        productoService.getAll(),
      ]);
      setVentas(ventasData);
      setProductos(productosData);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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

    // Si cambia el producto, actualizar el precio
    if (field === 'productoId') {
      const producto = productos.find(p => p.id === parseInt(value));
      if (producto) {
        newDetalles[index].precioUnitario = producto.precioVenta;
      }
    }

    setFormData({ ...formData, detalles: newDetalles });
  };

  const handleRemoveDetalle = (index: number) => {
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

  const resetForm = () => {
    setFormData({
      vendedorId: 1,
      total: 0,
      metodoPago: 'EFECTIVO',
      estado: 'COMPLETADA',
      tenantId: 'farmacia-001',
      detalles: [],
    });
    setShowForm(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">
            Gestiona las ventas y transacciones
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Venta
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva Venta</CardTitle>
            <CardDescription>
              Registra una nueva venta al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Método de Pago</label>
                  <select
                    value={formData.metodoPago}
                    onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="COMPLETADA">Completada</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Detalles */}
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

                <div className="space-y-3">
                  {formData.detalles.map((detalle, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Producto</label>
                        <select
                          value={detalle.productoId}
                          onChange={(e) =>
                            handleDetalleChange(index, 'productoId', e.target.value)
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Seleccionar producto</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} - ${p.precioVenta}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24 space-y-2">
                        <label className="text-sm font-medium">Cantidad</label>
                        <Input
                          type="number"
                          min="1"
                          value={detalle.cantidad}
                          onChange={(e) =>
                            handleDetalleChange(index, 'cantidad', parseInt(e.target.value))
                          }
                          required
                        />
                      </div>

                      <div className="w-28 space-y-2">
                        <label className="text-sm font-medium">Precio</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={detalle.precioUnitario}
                          onChange={(e) =>
                            handleDetalleChange(index, 'precioUnitario', parseFloat(e.target.value))
                          }
                          required
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDetalle(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Crear Venta
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ventas</CardTitle>
          <CardDescription>
            {ventas.length} venta(s) registrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ventas.length === 0 ? (
            <EmptyState
              title="No hay ventas"
              description="Comienza registrando tu primera venta"
              action={{
                label: 'Nueva Venta',
                onClick: () => setShowForm(true),
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Productos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.map((venta) => (
                  <TableRow key={venta.id}>
                    <TableCell className="font-medium">#{venta.id}</TableCell>
                    <TableCell>ID: {venta.vendedorId}</TableCell>
                    <TableCell>{venta.metodoPago}</TableCell>
                    <TableCell className="font-semibold">${venta.total.toFixed(2)}</TableCell>
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
                    <TableCell>{venta.detalles.length} producto(s)</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}