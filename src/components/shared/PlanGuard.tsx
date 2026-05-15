import { useNavigate } from 'react-router-dom';
import { Crown, ArrowRight } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface PlanGuardProps {
  /** Por ahora solo 'PRO'. Se puede extender a más planes. */
  requiredPlan: 'PRO';
  children: React.ReactNode;
  /** Descripción de la función bloqueada, para mostrar en el mensaje */
  feature?: string;
}

/**
 * Bloquea el acceso a secciones que requieren un plan superior al actual.
 * Los usuarios BÁSICO ven un prompt de upgrade en lugar del contenido.
 */
export function PlanGuard({ requiredPlan, children, feature }: PlanGuardProps) {
  const { isPro } = usePlan();
  const navigate = useNavigate();

  const tieneAcceso = requiredPlan === 'PRO' ? isPro : true;

  if (!tieneAcceso) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="w-full max-w-md text-center border-amber-200 dark:border-amber-800">
          <CardContent className="pt-8 pb-8 space-y-5">
            <div className="flex justify-center">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-4">
                <Crown className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Función exclusiva del plan Pro</h2>
              <p className="text-sm text-muted-foreground">
                {feature
                  ? `${feature} está disponible únicamente en el plan Pro.`
                  : 'Esta función está disponible únicamente en el plan Pro.'}
                {' '}Actualiza para desbloquear acceso completo.
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Plan Pro incluye
              </p>
              <ul className="text-sm text-amber-900 dark:text-amber-200 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="text-amber-600">✓</span> Usuarios ilimitados (hasta 10)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-600">✓</span> Productos ilimitados
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-600">✓</span> Roles avanzados y permisos granulares
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-600">✓</span> Envío a SUNAT con CDR oficial
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-600">✓</span> Reportes históricos sin límite
                </li>
              </ul>
            </div>

            <Button
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => navigate('/checkout?plan=PRO')}
            >
              <Crown className="mr-2 h-4 w-4" />
              Actualizar a Pro
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/dashboard')}
            >
              Volver al dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
