import { useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, CreditCard } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface SubscripcionGuardProps {
  children: React.ReactNode;
}

const ESTADOS_BLOQUEANTES = ['SUSPENDIDA', 'CANCELADA', 'PENDIENTE'];

export function SubscripcionGuard({ children }: SubscripcionGuardProps) {
  const { user, suscripcionEstado } = useAuthStore();
  const navigate = useNavigate();

  const rol = user?.rol;
  const estadoRaw = suscripcionEstado ?? user?.suscripcion?.estado ?? '';
  const trialEndDate = user?.suscripcion?.trialEndDate as string | undefined;
  const trialVencido = estadoRaw === 'TRIAL' && !!trialEndDate && new Date(trialEndDate) < new Date();
  const estado = trialVencido ? 'PENDIENTE' : estadoRaw;
  const planId = user?.suscripcion?.planId ?? '';
  const puedeReintentar = planId === 'BASICO' || planId === 'PRO';

  // Usuarios no-ADMIN nunca son bloqueados por suscripción
  if (rol !== 'ADMIN') {
    return <>{children}</>;
  }

  // Trial activo — acceso completo + banner informativo pequeño
  if (estado === 'TRIAL') {
    const diasRestantes = (() => {
      if (!trialEndDate) return null;
      const diff = Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return Math.max(0, diff);
    })();

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              <p className="text-sm">
                <span className="font-semibold">Período de prueba</span>
                {diasRestantes !== null && ` — ${diasRestantes} día${diasRestantes === 1 ? '' : 's'} restante${diasRestantes === 1 ? '' : 's'}`}
              </p>
            </div>
            {puedeReintentar && (
              <Button size="sm" variant="outline" className="shrink-0 text-blue-800 border-blue-400 hover:bg-blue-100" onClick={() => navigate(`/checkout?plan=${planId}`)}>
                <CreditCard className="mr-1 h-3 w-3" />
                Activar ahora
              </Button>
            )}
          </div>
        </div>
        {children}
      </div>
    );
  }

  // Bloqueado (PENDIENTE, SUSPENDIDA, CANCELADA) — sin acceso al módulo
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
              <h2 className="text-xl font-semibold">Acceso restringido</h2>
              <p className="text-sm text-muted-foreground">
                {estado === 'CANCELADA'
                  ? 'Tu suscripción fue cancelada. Reactívala para seguir usando este módulo.'
                  : estado === 'PENDIENTE'
                  ? 'Tu período de prueba venció. Activa tu suscripción para continuar usando el sistema.'
                  : 'Tu suscripción está suspendida por un pago fallido. Actualiza tu método de pago para continuar.'}
              </p>
            </div>
            {puedeReintentar && (
              <Button className="w-full" onClick={() => navigate(`/checkout?plan=${planId}`)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Activar suscripción
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

  return <>{children}</>;
}
