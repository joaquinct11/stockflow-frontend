import { useEffect, useMemo, useState } from 'react';
import { movimientoService } from '../../services/movimiento.service';
import { productoService } from '../../services/producto.service';
import { proveedorService } from '../../services/proveedor.service';
import type { MovimientoInventarioDTO, ProductoDTO, ProveedorDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Dialog } from '../../components/ui/Dialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import {
  Search,
  Eye,
  Package,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ArrowLeftRight,
  Star,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

export function KardexPage() {
  const { canView } = usePermissions();
  const hasViewPermission = canView('INVENTARIO');

  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Kardex detail dialog state
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [kardexLoading, setKardexLoading] = useState(false);
  const [kardexProducto, setKardexProducto] = useState<ProductoDTO | null>(null);
  const [kardexMovimientos, setKardexMovimientos] = useState<MovimientoInventarioDTO[]>([]);

  useEffect(() => {
    if (hasViewPermission) {
      fetchData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasViewPermission]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productosData, proveedoresData] = await Promise.all([
        productoService.getAll(),
        proveedorService.getAll(),
      ]);
      setProductos(productosData);
      setProveedores(proveedoresData);
    } catch (error) {
      toast.error('Error al cargar datos');
      if (import.meta.env.DEV) { console.error(error);}
    } finally {
      setLoading(false);
    }
  };

  const proveedorById = useMemo(() => {
    const m = new Map<number, ProveedorDTO>();
    proveedores.forEach((p) => m.set(p.id!, p));
    return m;
  }, [proveedores]);

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
      if (import.meta.env.DEV) { console.error(e);}
      toast.error('Error al cargar Kardex');
    } finally {
      setKardexLoading(false);
    }
  };

  const closeKardex = () => {
    setIsKardexOpen(false);
    setKardexProducto(null);
    setKardexMovimientos([]);
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
          <h1 className="text-3xl font-bold tracking-tight">Kardex</h1>
          <p className="text-muted-foreground">
            Consulta el historial de movimientos por producto
          </p>
        </div>
      </div>

      {!hasViewPermission ? (
        <EmptyState
          icon={BookOpen}
          title="Sin acceso al Kardex"
          description="No tienes permisos para ver el Kardex de inventario."
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
                <Eye className="inline h-3 w-3" /> para ver el detalle Kardex
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
                                title="Ver Kardex"
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

      {/* Kardex detail dialog */}
      <Dialog
        isOpen={isKardexOpen}
        onClose={closeKardex}
        title="Kardex del producto"
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
                    const costoTotal =
                      costoUnitario > 0 ? costoUnitario * m.cantidad : undefined;
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
