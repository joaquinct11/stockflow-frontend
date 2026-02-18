import { useEffect, useState } from 'react';
import { suscripcionService } from '../../services/suscripcion.service';
import type { SuscripcionDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export function SuscripcionesList() {
  const [suscripciones, setSuscripciones] = useState<SuscripcionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuscripciones();
  }, []);

  const fetchSuscripciones = async () => {
    try {
      setLoading(true);
      const data = await suscripcionService.getAll();
      setSuscripciones(data);
    } catch (error) {
      toast.error('Error al cargar suscripciones');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const planColors: Record<string, string> = {
    BASICO: 'default',
    PROFESIONAL: 'default',
    EMPRESARIAL: 'default',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Suscripciones</h1>
        <p className="text-muted-foreground">
          Gestiona las suscripciones y planes
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suscripciones</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suscripciones.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suscripciones.filter(s => s.estado === 'ACTIVA').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${suscripciones
                .filter(s => s.estado === 'ACTIVA')
                .reduce((sum, s) => sum + s.precioMensual, 0)
                .toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Suscripciones</CardTitle>
          <CardDescription>
            {suscripciones.length} suscripción(es) registrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suscripciones.length === 0 ? (
            <EmptyState
              title="No hay suscripciones"
              description="No se encontraron suscripciones en el sistema"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Precio Mensual</TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suscripciones.map((suscripcion) => (
                  <TableRow key={suscripcion.id}>
                    <TableCell className="font-medium">#{suscripcion.id}</TableCell>
                    <TableCell>Usuario ID: {suscripcion.usuarioPrincipalId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{suscripcion.planId}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${suscripcion.precioMensual.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {suscripcion.metodoPago || 'N/A'}
                      {suscripcion.ultimos4Digitos && ` •••• ${suscripcion.ultimos4Digitos}`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          suscripcion.estado === 'ACTIVA'
                            ? 'success'
                            : suscripcion.estado === 'CANCELADA'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {suscripcion.estado}
                      </Badge>
                    </TableCell>
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