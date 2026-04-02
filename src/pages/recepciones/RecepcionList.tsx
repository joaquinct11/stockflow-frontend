import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recepcionService } from '../../services/recepcion.service';
import type { RecepcionDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Plus, Inbox, Search, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  CONFIRMADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  ANULADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

const ITEMS_PER_PAGE = 10;

export function RecepcionList() {
  const navigate = useNavigate();
  const { canCreate, canAccess } = usePermissions();

  const [recepciones, setRecepciones] = useState<RecepcionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await recepcionService.getAll();
      setRecepciones(data);
    } catch {
      toast.error('Error al cargar recepciones');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return recepciones.filter(
      (r) =>
        r.proveedorNombre?.toLowerCase().includes(term) ||
        String(r.id).includes(term) ||
        r.estado.toLowerCase().includes(term) ||
        (r.ordenCompraId && String(r.ordenCompraId).includes(term))
    );
  }, [recepciones, searchTerm]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const stats = useMemo(() => ({
    total: recepciones.length,
    borrador: recepciones.filter((r) => r.estado === 'BORRADOR').length,
    confirmada: recepciones.filter((r) => r.estado === 'CONFIRMADA').length,
  }), [recepciones]);

  if (loading) return <LoadingSpinner />;

  if (!canAccess('RECEPCIONES')) {
    return (
      <EmptyState
        icon={Inbox}
        title="Sin acceso"
        description="No tienes permisos para ver las recepciones"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Inbox className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.borrador}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.confirmada}</p>
                <p className="text-xs text-muted-foreground">Confirmadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recepciones de mercadería</CardTitle>
              <CardDescription>Historial y gestión de recepciones</CardDescription>
            </div>
            {canCreate('RECEPCIONES') && (
              <Button onClick={() => navigate('/dashboard/recepciones/nueva')}>
                <Plus size={16} className="mr-2" />
                Nueva recepción
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por proveedor, ID, estado u OC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No hay recepciones"
              description={
                searchTerm
                  ? 'No se encontraron recepciones con ese criterio'
                  : 'Crea la primera recepción de mercadería'
              }
            />
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>OC Ref.</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium">#{rec.id}</TableCell>
                        <TableCell>{rec.proveedorNombre || `#${rec.proveedorId}`}</TableCell>
                        <TableCell>
                          {rec.ordenCompraId ? (
                            <button
                              className="text-primary hover:underline text-sm"
                              onClick={() =>
                                navigate(`/dashboard/compras/ordenes/${rec.ordenCompraId}`)
                              }
                            >
                              OC #{rec.ordenCompraId}
                            </button>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${ESTADO_BADGE[rec.estado] || ''}`}
                          >
                            {rec.estado}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {rec.comprobante
                            ? `${rec.comprobante.tipo} ${rec.comprobante.serie}-${rec.comprobante.numero}`
                            : <span className="text-muted-foreground">Sin comprobante</span>}
                        </TableCell>
                        <TableCell>
                          {rec.createdAt
                            ? new Date(rec.createdAt).toLocaleDateString('es-PE')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/recepciones/${rec.id}`)}
                          >
                            Ver / Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
