import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { suscripcionService } from '../../services/suscripcion.service';
import { useAuthStore } from '../../store/authStore';
import type { SuscripcionDTO } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import {
  CreditCard,
  XCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Lock,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

function estadoBadge(estado: string) {
  switch (estado) {
    case 'ACTIVA':
      return (
        <Badge variant="success">
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          Activa
        </Badge>
      );
    case 'CANCELADA':
      return (
        <Badge variant="secondary">
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Cancelada
        </Badge>
      );
    case 'SUSPENDIDA':
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
          Suspendida
        </Badge>
      );
    case 'PENDIENTE':
      return (
        <Badge variant="outline">
          <Clock className="h-3.5 w-3.5 mr-1" />
          Pendiente
        </Badge>
      );
    case 'TRIAL':
      return (
        <Badge variant="outline" className="border-blue-400 text-blue-700">
          <Calendar className="h-3.5 w-3.5 mr-1" />
          Prueba gratuita
        </Badge>
      );
    default:
      return <Badge variant="outline">{estado || '—'}</Badge>;
  }
}

function formatFecha(fecha?: string | null) {
  if (!fecha) return '—';
  try {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return fecha;
  }
}

export function SuscripcionesList() {
  const { canView, canToggleState } = usePermissions();
  const { user, setSuscripcionEstado } = useAuthStore();
  const navigate = useNavigate();

  const [suscripcion, setSuscripcion] = useState<SuscripcionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    action: null as (() => Promise<void>) | null,
  });

  useEffect(() => {
    fetchSuscripcion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSuscripcion = async () => {
    try {
      setLoading(true);
      const estado = await suscripcionService.getEstado();
      if (estado.estado === 'SIN_SUSCRIPCION') {
        setSuscripcion(null);
        return;
      }
      // Construir un SuscripcionDTO parcial con los datos disponibles
      setSuscripcion({
        planId: estado.planId,
        precioMensual: estado.planId === 'PRO' ? 99.99 : 49.99,
        estado: estado.estado,
        preapprovalId: estado.preapprovalId,
        fechaProximoCobro: estado.fechaProximoCobro,
        usuarioPrincipalId: user?.usuarioId ?? 0,
        tenantId: user?.tenantId,
      });
    } catch {
      toast.error('Error al cargar la suscripción');
    } finally {
      setLoading(false);
    }
  };

  const handleSincronizar = async () => {
    setSyncing(true);
    try {
      const resultado = await suscripcionService.sincronizar();
      setSuscripcion((prev) => prev ? { ...prev, estado: resultado.estado, fechaProximoCobro: resultado.fechaProximoCobro } : prev);
      setSuscripcionEstado(resultado.estado);
      toast.success('Estado sincronizado con Mercado Pago');
    } catch {
      toast.error('Error al sincronizar con Mercado Pago');
    } finally {
      setSyncing(false);
    }
  };

  const handleCancelar = () => {
    setConfirmDialog({
      isOpen: true,
      action: async () => {
        try {
          await suscripcionService.cancelarMiSuscripcion();
          setSuscripcionEstado('CANCELADA');
          toast.success('Suscripción cancelada');
          await fetchSuscripcion();
        } catch {
          toast.error('Error al cancelar la suscripción');
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  if (loading) return <LoadingSpinner />;

  if (!canView('SUSCRIPCIONES')) {
    return (
      <EmptyState
        icon={Lock}
        title="Acceso restringido"
        description="No tienes permisos para ver el módulo de Suscripciones."
      />
    );
  }

  if (!suscripcion) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mi Suscripción</h1>
          <p className="text-muted-foreground">Gestiona tu plan y facturación</p>
        </div>
        <EmptyState
          icon={CreditCard}
          title="Sin suscripción activa"
          description="No tienes ninguna suscripción registrada. Elige un plan para empezar."
          action={{
            label: 'Ver planes',
            onClick: () => navigate('/checkout?plan=BASICO'),
          }}
        />
      </div>
    );
  }

  const esActiva  = suscripcion.estado === 'ACTIVA';
  const esTrial   = suscripcion.estado === 'TRIAL';
  const tieneMP   = !!suscripcion.preapprovalId;   // solo si ya pagó por MP
  const esCancelableOReactivable = ['CANCELADA', 'SUSPENDIDA', 'PENDIENTE'].includes(suscripcion.estado ?? '');
  const planLabel = suscripcion.planId === 'PRO' ? 'Pro' : suscripcion.planId === 'BASICO' ? 'Básico' : suscripcion.planId;

  // Días restantes de trial
  const diasRestantesTrial = (() => {
    if (!esTrial || !suscripcion.fechaProximoCobro) return null;
    const diff = new Date(suscripcion.fechaProximoCobro).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mi Suscripción</h1>
          <p className="text-muted-foreground">Gestiona tu plan y facturación</p>
        </div>
        {/* Sincronizar con MP solo cuando ya existe preapproval (usuario pagó) */}
        {canToggleState('SUSCRIPCIONES') && tieneMP && (
          <Button variant="outline" size="sm" onClick={handleSincronizar} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar con MP'}
          </Button>
        )}
      </div>

      {/* Tarjeta principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Plan {planLabel}</CardTitle>
                <CardDescription>S/. {(suscripcion.precioMensual ?? 0).toFixed(2)} / mes</CardDescription>
              </div>
            </div>
            {estadoBadge(suscripcion.estado ?? '')}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Detalles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Próximo cobro:</span>
              <span className="font-medium">{formatFecha(suscripcion.fechaProximoCobro)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Método:</span>
              <span className="font-medium">
                {suscripcion.metodoPago || 'Mercado Pago'}
                {suscripcion.ultimos4Digitos && ` •••• ${suscripcion.ultimos4Digitos}`}
              </span>
            </div>
            {suscripcion.preapprovalId && (
              <div className="flex items-center gap-2 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Referencia MP:</span>
                <span className="font-mono text-xs truncate">{suscripcion.preapprovalId}</span>
              </div>
            )}
          </div>

          {/* ── Alertas por estado ── */}

          {/* TRIAL — banner prominente con días restantes y CTA */}
          {esTrial && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
                      Período de prueba gratuito
                      {diasRestantesTrial !== null && (
                        <span className="ml-2 font-bold">
                          — {diasRestantesTrial === 0 ? 'vence hoy' : `${diasRestantesTrial} día${diasRestantesTrial !== 1 ? 's' : ''} restante${diasRestantesTrial !== 1 ? 's' : ''}`}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Al vencer el período de prueba deberás suscribirte para mantener el acceso al sistema.
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate(`/checkout?plan=${suscripcion.planId ?? 'BASICO'}`)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Suscribirme ahora
                </Button>
              </div>
            </div>
          )}

          {suscripcion.estado === 'SUSPENDIDA' && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Tu suscripción fue suspendida por un pago fallido. Reactívala para recuperar el acceso completo.</p>
              </div>
            </div>
          )}
          {suscripcion.estado === 'PENDIENTE' && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Tu pago está siendo procesado. Una vez confirmado, el acceso se habilitará automáticamente.</p>
              </div>
            </div>
          )}
          {suscripcion.estado === 'CANCELADA' && (
            <div className="rounded-lg border border-muted p-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Tu suscripción está cancelada. Puedes volver a suscribirte cuando lo desees.</p>
              </div>
            </div>
          )}

          {/* ── Acciones ── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {esCancelableOReactivable && canToggleState('SUSCRIPCIONES') && (
              <Button className="sm:flex-1" onClick={() => navigate(`/checkout?plan=${suscripcion.planId}`)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Reactivar suscripción
              </Button>
            )}
            {/* Cancelar solo cuando ACTIVA y tiene preapproval MP — no durante TRIAL */}
            {esActiva && tieneMP && canToggleState('SUSCRIPCIONES') && (
              <Button variant="destructive" className="sm:flex-1" onClick={handleCancelar}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar suscripción
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirm cancelar */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Cancelar suscripción"
        description="¿Estás seguro? Tu suscripción se cancelará en Mercado Pago y perderás acceso a los módulos del sistema al finalizar el período."
        confirmText="Sí, cancelar"
        type="danger"
        onConfirm={async () => {
          if (confirmDialog.action) await confirmDialog.action();
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
