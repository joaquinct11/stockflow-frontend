import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ordenCompraService } from '../../services/ordenCompra.service';
import type { OrdenCompraDTO } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ArrowLeft, Send, XCircle, PackagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  ENVIADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  PARCIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  COMPLETADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

export function OrdenCompraDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canCreate, canEdit } = usePermissions();

  const [oc, setOc] = useState<OrdenCompraDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) fetchOC(Number(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchOC = async (ocId: number) => {
    setLoading(true);
    try {
      const data = await ordenCompraService.getById(ocId);
      setOc(data);
    } catch {
      toast.error('Error al cargar la orden de compra');
      navigate('/dashboard/compras/ordenes');
    } finally {
      setLoading(false);
    }
  };

  const handleEnviar = async () => {
    if (!oc?.id) return;
    setActionLoading(true);
    try {
      const updated = await ordenCompraService.enviar(oc.id);
      setOc(updated);
      toast.success('Orden de compra enviada al proveedor');
    } catch {
      toast.error('Error al enviar la orden de compra');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!oc?.id) return;
    setActionLoading(true);
    try {
      const updated = await ordenCompraService.cancelar(oc.id);
      setOc(updated);
      toast.success('Orden de compra cancelada');
    } catch {
      toast.error('Error al cancelar la orden de compra');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!oc) return null;

  const pendienteTotal = oc.items.reduce((acc, item) => {
    const recibido = item.cantidadRecibida ?? 0;
    return acc + Math.max(0, item.cantidadSolicitada - recibido);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/compras/ordenes')}>
          <ArrowLeft size={16} className="mr-1" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Orden de Compra #{oc.id}</h1>
          <p className="text-sm text-muted-foreground">
            Proveedor: {oc.proveedorNombre || `#${oc.proveedorId}`}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${ESTADO_BADGE[oc.estado] || ''}`}
        >
          {oc.estado}
        </span>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Proveedor</dt>
              <dd className="font-medium">{oc.proveedorNombre || `#${oc.proveedorId}`}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estado</dt>
              <dd className="font-medium">{oc.estado}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Creada</dt>
              <dd className="font-medium">
                {oc.createdAt ? new Date(oc.createdAt).toLocaleDateString('es-PE') : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pendiente total</dt>
              <dd className={`font-bold ${pendienteTotal > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {pendienteTotal} unidades
              </dd>
            </div>
          </dl>
          {oc.observaciones && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Observaciones</p>
              <p className="text-sm mt-1">{oc.observaciones}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Productos solicitados</CardTitle>
        </CardHeader>
        <CardContent>
          {oc.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay productos en esta orden
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Solicitado</TableHead>
                    <TableHead className="text-right">Recibido</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="text-right">Precio unit.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oc.items.map((item, idx) => {
                    const recibido = item.cantidadRecibida ?? 0;
                    const pendiente = Math.max(0, item.cantidadSolicitada - recibido);
                    return (
                      <TableRow key={item.id ?? idx}>
                        <TableCell className="font-medium">{item.productoNombre || `#${item.productoId}`}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{item.codigoBarras || '—'}</TableCell>
                        <TableCell className="text-right">{item.cantidadSolicitada}</TableCell>
                        <TableCell className="text-right text-green-600">{recibido}</TableCell>
                        <TableCell className="text-right">
                          <span className={pendiente > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                            {pendiente}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.precioUnitario != null
                            ? `S/. ${item.precioUnitario.toFixed(2)}`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {oc.estado === 'BORRADOR' && canEdit('COMPRAS') && (
          <Button onClick={handleEnviar} disabled={actionLoading || oc.items.length === 0}>
            <Send size={16} className="mr-2" />
            Enviar OC al proveedor
          </Button>
        )}

        {(oc.estado === 'ENVIADA' || oc.estado === 'PARCIAL') && canCreate('RECEPCIONES') && (
          <Button
            onClick={() =>
              navigate(`/dashboard/recepciones/nueva?ocId=${oc.id}`)
            }
          >
            <PackagePlus size={16} className="mr-2" />
            Recepcionar mercadería
          </Button>
        )}

        {(oc.estado === 'BORRADOR' || oc.estado === 'ENVIADA') && canEdit('COMPRAS') && (
          <Button variant="outline" onClick={handleCancelar} disabled={actionLoading}>
            <XCircle size={16} className="mr-2" />
            Cancelar OC
          </Button>
        )}
      </div>
    </div>
  );
}
