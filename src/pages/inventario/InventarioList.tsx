import { useEffect, useMemo, useState } from 'react';
import { movimientoService } from '../../services/movimiento.service';
import type { LoteVencimientoDTO } from '../../services/movimiento.service';
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
  PackageOpen,
  Search,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ArrowLeftRight,
  Eye,
  Lock,
  Star,
  AlertTriangle,
  DollarSign,
  FileSpreadsheet,
  FileDown,
  Upload,
  FlaskConical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { usePermissions } from '../../hooks/usePermissions';
import { exportarStockExcel, exportarStockPDF } from '../../utils/reportes-export';
import { useTenantConfigStore } from '../../store/tenantConfigStore';
import { ImportarProductosModal } from '../../components/inventario/ImportarProductosModal';

export function InventarioList() {
  const { userId, tenantId } = useCurrentUser();
  const { canCreate, canView } = usePermissions();
  const { config: negocioConfig } = useTenantConfigStore();
  const esFarmacia = negocioConfig?.rubro === 'BOTICA' || negocioConfig?.rubro === 'FARMACIA';
  const hasViewPermission = canView('INVENTARIO');

  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedidaDTO[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducto, setSelectedProducto] = useState<any>(null);
  const [, setSelectedProveedorMov] = useState<any>(null);

  // Kardex dialog state
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [kardexLoading, setKardexLoading] = useState(false);
  const [kardexProducto, setKardexProducto] = useState<ProductoDTO | null>(null);
  const [kardexMovimientos, setKardexMovimientos] = useState<MovimientoInventarioDTO[]>([]);
  const [kardexTipoFilter, setKardexTipoFilter] = useState<string>('TODOS');
  const [kardexDesde, setKardexDesde] = useState('');
  const [kardexHasta, setKardexHasta] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState<'stock' | 'lotes'>('stock');

  // Lotes
  const [lotes, setLotes] = useState<LoteVencimientoDTO[]>([]);
  const [lotesLoading, setLotesLoading] = useState(false);
  const [lotesFiltro, setLotesFiltro] = useState<'todos' | 'vencidos' | 'proximos30' | 'proximos90'>('todos');
  const [lotesSearch, setLotesSearch] = useState('');

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
    tenantId: '',
    proveedorId: undefined,
    costoUnitario: undefined,
    lote: '',
    fechaVencimiento: undefined,
    registroSanitario: '',
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...(userId ? { usuarioId: userId } : {}),
      ...(tenantId ? { tenantId } : {}),
    }));
  }, [userId, tenantId]);

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

  useEffect(() => {
    if (activeTab === 'lotes' && hasViewPermission) {
      setLotesLoading(true);
      movimientoService.getLotes()
        .then(setLotes)
        .catch(() => toast.error('Error al cargar lotes'))
        .finally(() => setLotesLoading(false));
    }
  }, [activeTab, hasViewPermission]);

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
      if (import.meta.env.DEV) console.error(error);
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
      if (import.meta.env.DEV) console.error(error);
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
    subtitle: `Código: ${p.codigoBarras || 'N/A'} | Stock: ${p.stockActual ?? 0} | Categoría: ${p.categoriaNombre || 'N/A'} | UM: ${unidadById.get(p.unidadMedidaId)?.nombre ?? '-'}`,
  }));

  const openKardex = async (producto: ProductoDTO) => {
    setKardexProducto(producto);
    setIsKardexOpen(true);
    setKardexLoading(true);
    try {
      const data = await movimientoService.getByProducto(producto.id!);
      const sorted = [...data].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return da - db;
      });
      setKardexMovimientos(sorted);
    } catch (e) {
      if (import.meta.env.DEV) console.error(e);
      toast.error('Error al cargar kardex');
    } finally {
      setKardexLoading(false);
    }
  };

  const closeKardex = () => {
    setIsKardexOpen(false);
    setKardexProducto(null);
    setKardexMovimientos([]);
    setKardexTipoFilter('TODOS');
    setKardexDesde('');
    setKardexHasta('');
  };

  const kardexFiltrados = useMemo(() => {
    return kardexMovimientos.filter((m) => {
      if (kardexTipoFilter !== 'TODOS' && m.tipo !== kardexTipoFilter) return false;
      if (kardexDesde && m.createdAt && m.createdAt < kardexDesde) return false;
      if (kardexHasta && m.createdAt && m.createdAt.split('T')[0] > kardexHasta) return false;
      return true;
    });
  }, [kardexMovimientos, kardexTipoFilter, kardexDesde, kardexHasta]);

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
      if (import.meta.env.DEV) console.error('Error:', error.response?.data);
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
      tenantId,
      proveedorId: undefined,
      costoUnitario: undefined,
      lote: '',
      fechaVencimiento: undefined,
      registroSanitario: '',
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
      p.categoriaNombre?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProductos = filteredProductos.slice(startIndex, startIndex + itemsPerPage);

  const invStats = useMemo(() => ({
    total:      productos.length,
    bajoStock:  productos.filter((p) => p.stockActual <= p.stockMinimo).length,
    valor:      productos.reduce((acc, p) => acc + (p.stockActual ?? 0) * (p.costoUnitario ?? 0), 0),
  }), [productos]);

  const lotesFiltrados = useMemo(() => {
    return lotes.filter((l) => {
      // filtro de estado
      if (lotesFiltro === 'vencidos'   && l.diasRestantes >= 0)  return false;
      if (lotesFiltro === 'proximos30' && (l.diasRestantes < 0 || l.diasRestantes > 30))  return false;
      if (lotesFiltro === 'proximos90' && (l.diasRestantes < 0 || l.diasRestantes > 90))  return false;
      // filtro de texto
      if (lotesSearch) {
        const q = lotesSearch.toLowerCase();
        return (
          l.productoNombre.toLowerCase().includes(q) ||
          (l.lote?.toLowerCase().includes(q) ?? false) ||
          (l.codigoBarras?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [lotes, lotesFiltro, lotesSearch]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground">Consulta el stock de productos y registra movimientos</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {hasViewPermission && productos.length > 0 && (
            <>
              <Button
                variant="outline" size="sm"
                onClick={() => {
                  try { exportarStockExcel(filteredProductos, (id) => unidadById.get(id)?.nombre ?? '—'); }
                  catch { toast.error('Error al exportar Excel'); }
                }}
                className="flex-1 sm:flex-none"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                Excel
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => {
                  try { exportarStockPDF(filteredProductos, (id) => unidadById.get(id)?.nombre ?? '—', negocioConfig); }
                  catch { toast.error('Error al exportar PDF'); }
                }}
                className="flex-1 sm:flex-none"
              >
                <FileDown className="mr-2 h-4 w-4 text-red-500" />
                PDF
              </Button>
            </>
          )}
          {canCreate('INVENTARIO') && (
            <Button variant="outline" onClick={() => setIsImportOpen(true)} className="flex-1 sm:flex-none">
              <Upload className="mr-2 h-4 w-4 text-primary" />
              Importar
            </Button>
          )}
          {canCreate('INVENTARIO') && (
            <Button onClick={() => setIsDialogOpen(true)} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Movimiento
            </Button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 [&>*:last-child]:col-span-2 [&>*:last-child]:mx-auto [&>*:last-child]:max-w-[calc(50%-0.5rem)] sm:[&>*:last-child]:col-auto sm:[&>*:last-child]:max-w-none sm:[&>*:last-child]:mx-0">
        {/* Total */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Productos en inventario</p>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold tracking-tight text-blue-600">{invStats.total}</p>
          </CardContent>
        </Card>

        {/* Bajo stock */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requieren reabastecimiento</p>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className={`text-3xl font-bold tracking-tight ${invStats.bajoStock > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {invStats.bajoStock}
            </p>
          </CardContent>
        </Card>

        {/* Valor */}
        <Card className="relative overflow-hidden border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valorizado al costo</p>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold tracking-tight text-emerald-600">S/.{invStats.valor.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {!hasViewPermission ? (
        <EmptyState
          icon={Lock}
          title="Sin acceso al listado"
          description="No tienes permisos para ver el listado de productos. Puedes registrar nuevos movimientos con el botón de arriba."
        />
      ) : (
        <>
          {/* ── Tabs de navegación ── */}
          <div className="flex gap-1 border-b">
            {([
              { key: 'stock',  label: 'Stock',  icon: <Package className="h-4 w-4" /> },
              { key: 'lotes',  label: 'Lotes',  icon: <FlaskConical className="h-4 w-4" /> },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {tab.icon}
                {tab.label}
                {tab.key === 'lotes' && lotes.filter(l => l.diasRestantes !== null && l.diasRestantes <= 30).length > 0 && (
                  <span className="ml-1 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                    {lotes.filter(l => l.diasRestantes <= 30).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab Stock ── */}
          {activeTab === 'stock' && (
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
                    {filteredProductos.length} producto(s) — haz clic en <Eye className="inline h-3 w-3" /> para ver el detalle
                    (Kardex)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredProductos.length === 0 ? (
                    <EmptyState
                      icon={PackageOpen}
                      title={productos.length === 0 ? 'Todavía no hay productos en el inventario' : 'Sin resultados'}
                      description={productos.length === 0
                        ? 'Agrega productos desde el módulo de Productos para empezar a controlar el stock, ver movimientos y recibir alertas de reposición.'
                        : 'No se encontraron productos que coincidan con la búsqueda.'}
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
                                <TableCell className="text-muted-foreground text-sm">{producto.categoriaNombre || '-'}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {unidadById.get(producto.unidadMedidaId)?.nombre || '-'}
                                </TableCell>
                                <TableCell className="text-center font-semibold">
                                  <span
                                    className={
                                      producto.stockActual <= producto.stockMinimo ? 'text-red-600' : 'text-green-700'
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

          {/* ── Tab Lotes ── */}
          {activeTab === 'lotes' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  Lotes y Vencimientos
                </CardTitle>
                <CardDescription>
                  Movimientos de entrada con fecha de vencimiento registrada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-wrap gap-1">
                    {([
                      { key: 'todos',      label: 'Todos' },
                      { key: 'vencidos',   label: 'Vencidos' },
                      { key: 'proximos90', label: 'Próx. 90 días' },
                    ] as const).map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setLotesFiltro(f.key)}
                        className={[
                          'px-3 py-1 rounded-md text-xs font-medium border transition',
                          lotesFiltro === f.key
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-input bg-background text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative sm:ml-auto sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar producto o lote..."
                      value={lotesSearch}
                      onChange={(e) => setLotesSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {lotesLoading ? (
                  <LoadingSpinner />
                ) : lotesFiltrados.length === 0 ? (
                  <EmptyState
                    icon={FlaskConical}
                    title="Sin lotes"
                    description={
                      lotesFiltro === 'todos'
                        ? 'No hay movimientos de entrada con fecha de vencimiento registrada'
                        : 'No hay lotes que coincidan con el filtro seleccionado'
                    }
                  />
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {lotesFiltrados.length} de {lotes.length} registros
                    </p>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Lote</TableHead>
                            <TableHead>Fecha venc.</TableHead>
                            {esFarmacia && <TableHead>Reg. Sanitario</TableHead>}
                            <TableHead className="text-center">Cant. recibida</TableHead>
                            <TableHead className="text-center">Días restantes</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lotesFiltrados.map((l) => {
                            const dias = l.diasRestantes;
                            const vencido    = dias < 0;
                            const critico    = !vencido && dias <= 7;
                            const proximo90  = !vencido && dias <= 90;

                            const estadoBadge = vencido
                              ? <Badge variant="destructive">Vencido</Badge>
                              : critico
                              ? <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">Crítico</span>
                              : proximo90
                              ? <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Próx. 90d</span>
                              : <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Vigente</span>;

                            const rowBg = vencido
                              ? 'bg-red-500/5'
                              : critico
                              ? 'bg-red-500/5'
                              : proximo90
                              ? 'bg-amber-500/5'
                              : '';

                            return (
                              <TableRow key={l.movimientoId} className={rowBg}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{l.productoNombre}</p>
                                    {l.codigoBarras && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Package className="h-3 w-3" />
                                        {l.codigoBarras}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm font-mono">
                                  {l.lote || <span className="text-muted-foreground text-xs italic">Sin lote</span>}
                                </TableCell>
                                <TableCell className="text-sm whitespace-nowrap">
                                  {new Date(l.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-PE', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                  })}
                                </TableCell>
                                {esFarmacia && (
                                  <TableCell className="text-sm font-mono">
                                    {l.registroSanitario || <span className="text-muted-foreground text-xs italic">—</span>}
                                  </TableCell>
                                )}
                                <TableCell className="text-center text-sm font-semibold">
                                  {l.cantidad}
                                </TableCell>
                                <TableCell className="text-center text-sm font-semibold">
                                  <span className={vencido ? 'text-red-600' : critico ? 'text-red-500' : proximo90 ? 'text-amber-600' : 'text-emerald-600'}>
                                    {vencido ? `Hace ${Math.abs(dias)} días` : `${dias} días`}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  {estadoBadge}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Dialog para crear movimiento (corregido: Producto / Tipo / Cantidad+Referencia / Descripción) */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={resetForm}
        title="Nuevo Movimiento de Inventario"
        description="Registra una entrada de stock, ajuste o devolución"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Datos del movimiento</h3>
              <p className="text-xs text-muted-foreground">
                Completa la información requerida para registrar el movimiento
              </p>
            </div>

            <div className="p-4 space-y-5">
              {/* 1) Producto */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Producto <span className="text-red-500">*</span>
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
                <p className="text-xs text-muted-foreground">
                  Selecciona el producto al que se le aplicará el movimiento.
                </p>
              </div>

              {/* 2) Tipo Movimiento */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Tipo de Movimiento <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      {
                        key: 'ENTRADA',
                        title: 'Entrada',
                        subtitle: 'Stock / Compra',
                        icon: <TrendingUp className="h-4 w-4 text-green-600" />,
                      },
                      {
                        key: 'AJUSTE',
                        title: 'Ajuste',
                        subtitle: 'Inventario',
                        icon: <RotateCcw className="h-4 w-4 text-blue-600" />,
                      },
                      {
                        key: 'DEVOLUCION',
                        title: 'Devolución',
                        subtitle: 'Cliente',
                        icon: <ArrowLeftRight className="h-4 w-4 text-orange-600" />,
                      },
                    ] as const
                  ).map((t) => {
                    const active = formData.tipo === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          const nuevoTipo = t.key as MovimientoInventarioDTO['tipo'];
                          setFormData({
                            ...formData,
                            tipo: nuevoTipo,
                            ...(nuevoTipo !== 'ENTRADA' && {
                              proveedorId: undefined,
                              costoUnitario: undefined,
                              lote: '',
                              fechaVencimiento: undefined,
                              registroSanitario: '',
                            }),
                          });
                          setSelectedProveedorMov(null);
                        }}
                        className={[
                          'w-full rounded-lg border p-3 text-left transition',
                          active
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border hover:border-primary/40 hover:bg-muted/40',
                        ].join(' ')}
                        aria-pressed={active}
                      >
                        <div className="flex items-center gap-2">
                          {t.icon}
                          <div className="flex-1">
                            <div className="text-sm font-semibold">{t.title}</div>
                            <div className="text-xs text-muted-foreground">{t.subtitle}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* input hidden para mantener "required" */}
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
                        registroSanitario: '',
                      }),
                    });
                    setSelectedProveedorMov(null);
                  }}
                  className="hidden"
                  required
                >
                  <option value="ENTRADA">ENTRADA</option>
                  <option value="AJUSTE">AJUSTE</option>
                  <option value="DEVOLUCION">DEVOLUCION</option>
                </select>
              </div>

              {/* Campos adicionales para ENTRADA */}
              {formData.tipo === 'ENTRADA' && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-4">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">Datos de entrada de stock</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Proveedor */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Proveedor</label>
                      <Autocomplete
                        options={proveedores.filter(p => p.activo !== false).map(p => ({
                          id: p.id!,
                          label: p.nombre,
                          subtitle: p.ruc ? `RUC: ${p.ruc}` : undefined,
                        }))}
                        value={(() => {
                          const p = proveedores.find(p => p.id === formData.proveedorId);
                          return p ? { id: p.id!, label: p.nombre } : null;
                        })()}
                        onChange={(option) => {
                          setSelectedProveedorMov(option);
                          setFormData({ ...formData, proveedorId: option?.id ? Number(option.id) : undefined });
                        }}
                        placeholder="Seleccionar proveedor (opcional)"
                        emptyMessage="No se encontró el proveedor"
                      />
                    </div>

                    {/* Costo unitario */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Costo unitario</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.costoUnitario ?? ''}
                        onChange={(e) => setFormData({ ...formData, costoUnitario: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="0.00"
                      />
                    </div>

                    {/* Lote */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lote</label>
                      <Input
                        type="text"
                        value={formData.lote ?? ''}
                        onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                        placeholder="Ej: LOT-2025-001"
                      />
                    </div>

                    {/* Fecha de vencimiento */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Fecha de vencimiento</label>
                      <Input
                        type="date"
                        value={formData.fechaVencimiento ?? ''}
                        onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value || undefined })}
                      />
                    </div>

                    {/* Registro sanitario — solo para BOTICA/FARMACIA */}
                    {esFarmacia && (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">
                          Registro Sanitario <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          value={formData.registroSanitario ?? ''}
                          onChange={(e) => setFormData({ ...formData, registroSanitario: e.target.value })}
                          placeholder="Ej: D.G.S.P. N° 23456-2024"
                        />
                        <p className="text-xs text-muted-foreground">Requerido por DIGEMID para productos farmacéuticos.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3) Cantidad y Referencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Cantidad <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="font-semibold"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Referencia</label>
                  <Input
                    type="text"
                    placeholder="Documento / nota / código interno"
                    value={formData.referencia}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                  />
                </div>
              </div>

              {/* 4) Descripción */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Motivo o detalles del movimiento"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ej: Ajuste por conteo físico / Devolución por producto dañado.
                </p>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={formData.productoId === 0 || formData.cantidad <= 0 || !formData.descripcion}
            >
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
          <EmptyState title="Sin movimientos" description="Este producto no tiene movimientos registrados" />
        ) : (
          <div className="space-y-4">
            {/* Filtros kardex */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1 flex-wrap">
                {['TODOS','ENTRADA','SALIDA','AJUSTE','DEVOLUCION','SALDO_INICIAL'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setKardexTipoFilter(t)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                      kardexTipoFilter === t
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'TODOS' ? 'Todos' : t === 'SALDO_INICIAL' ? 'Saldo Ini.' : t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Input type="date" value={kardexDesde} onChange={(e) => setKardexDesde(e.target.value)} className="h-8 w-36 text-xs" />
                <span className="text-xs text-muted-foreground">—</span>
                <Input type="date" value={kardexHasta} onChange={(e) => setKardexHasta(e.target.value)} className="h-8 w-36 text-xs" />
                {(kardexDesde || kardexHasta || kardexTipoFilter !== 'TODOS') && (
                  <button type="button" onClick={() => { setKardexDesde(''); setKardexHasta(''); setKardexTipoFilter('TODOS'); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline">
                    Limpiar
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{kardexFiltrados.length} de {kardexMovimientos.length} movimientos</p>
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
                  return kardexFiltrados.map((m) => {
                    const esEntrada = m.tipo === 'ENTRADA' || m.tipo === 'SALDO_INICIAL' || m.tipo === 'DEVOLUCION';
                    const esSalida = m.tipo === 'SALIDA';
                    const esAjuste = m.tipo === 'AJUSTE';

                    if (esEntrada) stockAcumulado += m.cantidad;
                    else if (esSalida) stockAcumulado -= m.cantidad;
                    else if (esAjuste) stockAcumulado += m.cantidad;

                    const costoUnitario = m.costoUnitario ?? 0;
                    const costoTotal = costoUnitario > 0 ? costoUnitario * m.cantidad : undefined;
                    const prov = m.proveedorId ? proveedorById.get(m.proveedorId) : undefined;
                    const documentoLabel = m.referencia
                      ? `Ref: ${m.referencia}`
                      : prov
                        ? `Prov: ${prov.nombre}`
                        : m.descripcion
                          ? m.descripcion
                          : '-';

                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {m.createdAt ? new Date(m.createdAt).toLocaleDateString('es-PE') : '-'}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovimientoIcon(m.tipo)}
                            {getMovimientoBadge(m.tipo)}
                          </div>
                        </TableCell>

                        <TableCell
                          className="text-muted-foreground text-sm max-w-[160px] truncate"
                          title={documentoLabel}
                        >
                          {documentoLabel}
                        </TableCell>

                        <TableCell className="text-center font-semibold text-green-700">{esEntrada ? m.cantidad : '-'}</TableCell>
                        <TableCell className="text-center font-semibold text-red-700">{esSalida ? m.cantidad : '-'}</TableCell>

                        <TableCell className="text-center font-bold">{stockAcumulado}</TableCell>

                        <TableCell className="text-right text-muted-foreground text-sm">
                          {costoUnitario > 0 ? `S/.${costoUnitario.toFixed(2)}` : '-'}
                        </TableCell>

                        <TableCell className="text-right text-muted-foreground text-sm">
                          {costoTotal != null && costoTotal > 0 ? `S/.${costoTotal.toFixed(2)}` : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" type="button" onClick={closeKardex}>
            Cerrar
          </Button>
        </div>
      </Dialog>

      {/* Modal de importación masiva */}
      <ImportarProductosModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchData}
        unidadesMedida={unidadesMedida}
      />
    </div>
  );
}