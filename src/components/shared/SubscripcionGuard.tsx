import { useNavigate } from 'react-router-dom';
import { AlertCircle, CreditCard, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface SubscripcionGuardProps {
  children: React.ReactNode;
}

const ESTADOS_BLOQUEANTES = ['SUSPENDIDA', 'CANCELADA'];
const ESTADOS_PENDIENTES = ['PENDIENTE'];

/**
 * Bloquea el acceso a módulos cuando la suscripción del tenant está inactiva.
 * Solo aplica para el rol ADMIN (los usuarios sub-tenant no controlan la suscripción).
 */
export function SubscripcionGuard({ children }: SubscripcionGuardProps) {
  const { user, suscripcionEstado } = useAuthStore();
  const navigate = useNavigate();

  const rol = user?.rol;
  const estado = suscripcionEstado ?? user?.suscripcion?.estado ?? '';
  const planId = user?.suscripcion?.planId ?? '';
  const puedeReintentar = planId === 'BASICO' || planId === 'PRO';

  if (rol !== 'ADMIN') {
    return <>{children}</>;
  }

  if (ESTADOS_BLOQUEANTES.includes(estado)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Suscripción inactiva</h2>
              <p className="text-sm text-muted-foreground">
                {estado === 'CANCELADA'
                  ? 'Tu suscripción fue cancelada. Reactívala para seguir usando este módulo.'
                  : 'Tu suscripción está suspendida por un pago fallido. Actualiza tu método de pago para continuar.'}
              </p>
            </div>
            {puedeReintentar && (
              <Button className="w-full" onClick={() => navigate(`/checkout?plan=${planId}`)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Reactivar suscripción
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
              Volver al dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (ESTADOS_PENDIENTES.includes(estado)) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <RefreshCw className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Suscripción pendiente de pago</p>
                <p className="text-sm">
                  Tu pago está siendo procesado. El acceso completo se habilitará una vez confirmado.
                </p>
              </div>
            </div>
            {puedeReintentar && (
              <Button size="sm" className="shrink-0" onClick={() => navigate(`/checkout?plan=${planId}`)}>
                Reintentar pago
              </Button>
            )}
          </div>
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
