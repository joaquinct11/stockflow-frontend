import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, CreditCard, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/shared/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { suscripcionService } from '../../services/suscripcion.service';
import type { PlanId, TipoDocumento } from '../../types';

type PaidPlanId = Exclude<PlanId, 'FREE'>;

const PLAN_DETAILS: Record<PaidPlanId, { name: string; price: number; description: string }> = {
  BASICO: {
    name: 'Básico',
    price: 49.99,
    description: 'Hasta 5 usuarios, 500 productos y reportes avanzados.',
  },
  PRO: {
    name: 'Pro',
    price: 99.99,
    description: 'Usuarios y productos ilimitados, con todas las funcionalidades.',
  },
};

const TIPO_DOCUMENTO_OPTIONS: { value: TipoDocumento; label: string }[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de Extranjería' },
  { value: 'RUC', label: 'RUC' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

type ReturnStatus = 'success' | 'failure' | 'pending';

export function CheckoutPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>(() => {
    try {
      const stored = sessionStorage.getItem('mp_checkout_doc');
      if (stored) {
        const parsed = JSON.parse(stored) as { tipoDocumento: TipoDocumento; numeroDocumento: string };
        if (parsed.tipoDocumento) return parsed.tipoDocumento;
      }
    } catch {
      // ignore parse errors
    }
    return 'DNI';
  });
  const [numeroDocumento, setNumeroDocumento] = useState<string>(() => {
    try {
      const stored = sessionStorage.getItem('mp_checkout_doc');
      if (stored) {
        const parsed = JSON.parse(stored) as { tipoDocumento: TipoDocumento; numeroDocumento: string };
        if (parsed.numeroDocumento) return parsed.numeroDocumento;
      }
    } catch {
      // ignore parse errors
    }
    return '';
  });

  const planParam = searchParams.get('plan');
  const plan = (planParam === 'BASICO' || planParam === 'PRO' ? planParam : null) as PaidPlanId | null;

  const returnStatus = useMemo<ReturnStatus | null>(() => {
    const status = searchParams.get('status');
    if (status === 'success' || status === 'failure' || status === 'pending') {
      return status;
    }
    if (searchParams.has('success')) return 'success';
    if (searchParams.has('failure')) return 'failure';
    if (searchParams.has('pending')) return 'pending';
    return null;
  }, [searchParams]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={AlertCircle}
          title="Plan no válido"
          description="No encontramos un plan de checkout válido. Vuelve al registro o al dashboard para continuar."
          action={{
            label: 'Ir al dashboard',
            onClick: () => navigate('/dashboard'),
          }}
        />
      </div>
    );
  }

  const handleCheckout = async () => {
    if (!numeroDocumento.trim()) {
      setError('El número de documento es obligatorio para procesar la suscripción.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await suscripcionService.checkout(plan, tipoDocumento, numeroDocumento.trim());
      // Limpiar datos de documento del sessionStorage tras iniciar checkout
      sessionStorage.removeItem('mp_checkout_doc');
      // Navigate to intermediate redirect page instead of going directly to MP.
      // This page saves initPoint/preapprovalId to localStorage and gives the user
      // a manual button if the browser blocks the auto-redirect.
      navigate('/checkout/redirect', {
        state: {
          initPoint: response.initPoint,
          preapprovalId: response.preapprovalId,
          planId: plan,
        },
      });
    } catch {
      setError('No se pudo iniciar el checkout. Inténtalo nuevamente en unos segundos.');
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Checkout de suscripción
          </CardTitle>
          <CardDescription>Completa el pago seguro en Mercado Pago para activar tu plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {returnStatus === 'success' && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Pago completado
              </div>
              <p className="mt-1">Estamos confirmando tu suscripción. Puedes volver al dashboard.</p>
            </div>
          )}
          {returnStatus === 'failure' && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              <div className="flex items-center gap-2 font-medium">
                <XCircle className="h-4 w-4" />
                Pago rechazado o cancelado
              </div>
              <p className="mt-1">Puedes intentar nuevamente cuando lo desees.</p>
            </div>
          )}
          {returnStatus === 'pending' && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
              <div className="flex items-center gap-2 font-medium">
                <Clock3 className="h-4 w-4" />
                Pago pendiente
              </div>
              <p className="mt-1">Tu pago está en proceso de validación.</p>
            </div>
          )}

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Resumen del plan</h3>
              <Badge variant="secondary">{PLAN_DETAILS[plan].name}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{PLAN_DETAILS[plan].description}</p>
            <p className="mt-3 text-lg font-semibold">S/ {PLAN_DETAILS[plan].price.toFixed(2)} / mes</p>
          </div>

          {/* Datos de identificación requeridos por Mercado Pago */}
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-semibold text-sm">Datos de identificación</h3>
            <p className="text-xs text-muted-foreground">
              Mercado Pago requiere tu documento de identidad para procesar suscripciones recurrentes.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="tipoDoc">
                  Tipo de documento
                </label>
                <select
                  id="tipoDoc"
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TIPO_DOCUMENTO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="numDoc">
                  Número de documento
                </label>
                <Input
                  id="numDoc"
                  type="text"
                  placeholder="Ej: 12345678"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  maxLength={20}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="sm:flex-1" onClick={handleCheckout} disabled={loading}>
              {loading ? 'Redirigiendo...' : 'Pagar con Mercado Pago'}
            </Button>
            <Button variant="outline" className="sm:flex-1" onClick={() => navigate('/dashboard')}>
              Volver al dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
