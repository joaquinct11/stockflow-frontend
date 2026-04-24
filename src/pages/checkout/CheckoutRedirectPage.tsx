import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ExternalLink, ArrowLeft, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const MP_CHECKOUT_STATE_KEY = 'mp_checkout_state';

interface CheckoutRedirectState {
  initPoint: string;
  preapprovalId?: string;
  planId: string;
}

/**
 * Página intermedia de checkout.
 * Recibe initPoint/preapprovalId/planId desde navigation state,
 * los guarda en localStorage como fallback, y redirige automáticamente
 * a Mercado Pago. Si el browser bloquea la redirección, el usuario puede
 * usar el botón manual.
 */
export function CheckoutRedirectPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const redirected = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(2);

  const state = location.state as CheckoutRedirectState | null;
  const initPoint = state?.initPoint ?? '';
  const preapprovalId = state?.preapprovalId;
  const planId = state?.planId ?? '';

  // Persist to localStorage so return pages can read it as fallback
  useEffect(() => {
    if (initPoint) {
      const payload: CheckoutRedirectState = { initPoint, preapprovalId, planId };
      localStorage.setItem(MP_CHECKOUT_STATE_KEY, JSON.stringify(payload));
    }
  }, [initPoint, preapprovalId, planId]);

  // Countdown and auto-redirect
  useEffect(() => {
    if (!initPoint) return;

    const countdown = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timer = setTimeout(() => {
      if (!redirected.current) {
        redirected.current = true;
        window.location.href = initPoint;
      }
    }, 2000);

    return () => {
      clearInterval(countdown);
      clearTimeout(timer);
    };
  }, [initPoint]);

  // If no initPoint (e.g. direct navigation), redirect to dashboard
  if (!initPoint) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No hay datos de checkout. Redirigiendo al dashboard…</p>
            <Button className="mt-4" onClick={() => navigate('/dashboard', { replace: true })}>
              Ir al dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold">Redirigiendo a Mercado Pago</CardTitle>
          <CardDescription>
            {secondsLeft > 0
              ? `Serás redirigido automáticamente en ${secondsLeft} segundo${secondsLeft !== 1 ? 's' : ''}…`
              : 'Si no fuiste redirigido, usa el botón de abajo.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Si tu navegador bloquea la redirección automática, haz clic en el botón para abrir Mercado Pago.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={() => {
                redirected.current = true;
                window.location.href = initPoint;
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir Mercado Pago
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/dashboard', { replace: true })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al dashboard
            </Button>
          </div>

          {preapprovalId && (
            <p className="text-xs text-muted-foreground text-center">
              ID de referencia: <span className="font-mono">{preapprovalId}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
