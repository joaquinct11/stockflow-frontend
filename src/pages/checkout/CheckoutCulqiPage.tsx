import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import { culqiService, type CulqiConfigResponse } from '../../services/culqi.service';

// ── Culqi.js global types ──────────────────────────────────────────────────────
declare global {
  interface Window {
    Culqi: {
      publicKey: string;
      token?: { id: string; [key: string]: unknown };
      order?: { [key: string]: unknown };
      settings: (opts: {
        title: string;
        currency: string;
        description: string;
        amount: number;
        order?: string;
      }) => void;
      open: () => void;
      close: () => void;
    };
    // Culqi.js invoca esta función cuando el usuario ingresa su tarjeta
    culqi: () => void;
  }
}

const CULQI_SCRIPT_URL = 'https://checkout.culqi.com/js/v4';

export function CheckoutCulqiPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSuscripcionEstado } = useAuthStore();

  const [config, setConfig] = useState<CulqiConfigResponse | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scriptLoaded = useRef(false);
  const resolveToken = useRef<((tokenId: string) => void) | null>(null);

  // Leer planId de query param (ej: /checkout/culqi?plan=BASICO)
  const planParam = searchParams.get('plan') ?? 'BASICO';

  // 1. Cargar configuración del backend ─────────────────────────────────────
  useEffect(() => {
    culqiService
      .getConfig()
      .then(setConfig)
      .catch(() => setConfigError('No se pudo cargar la configuración de pago. Intenta nuevamente.'))
      .finally(() => setLoadingConfig(false));
  }, []);

  // 2. Inyectar Culqi.js (una sola vez) y registrar window.culqi ─────────────
  useEffect(() => {
    if (scriptLoaded.current || !config) return;
    scriptLoaded.current = true;

    // Registrar callback ANTES de cargar el script
    window.culqi = () => {
      const token = window.Culqi?.token;
      if (token?.id) {
        resolveToken.current?.(token.id as string);
        resolveToken.current = null;
        window.Culqi?.close();
      }
      // Si no hay token, el usuario cerró el modal sin pagar — no hacemos nada
    };

    const script = document.createElement('script');
    script.src = CULQI_SCRIPT_URL;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // No eliminamos el script al desmontar: Culqi necesita persistir entre renders
    };
  }, [config]);

  // 3. Lógica de pago ─────────────────────────────────────────────────────────
  const handlePagar = async () => {
    if (!config) return;
    setError(null);

    // Configurar Culqi con la public key y datos del plan
    window.Culqi.publicKey = config.publicKey;
    window.Culqi.settings({
      title: 'Fluxus',
      currency: 'PEN',
      description: config.nombrePlan,
      amount: Math.round(config.precioMensual * 100), // centavos
    });

    // Abrir el modal de Culqi y esperar el token via Promise
    setModalOpen(true);
    let tokenId: string;
    try {
      tokenId = await new Promise<string>((resolve, reject) => {
        resolveToken.current = resolve;

        // Timeout de 10 min — si el usuario cierra el modal sin pagar, rechazamos
        const timeout = setTimeout(() => {
          resolveToken.current = null;
          reject(new Error('timeout'));
        }, 10 * 60 * 1000);

        // Sobrescribimos culqi para limpiar el timeout cuando se resuelve
        const originalResolve = resolve;
        resolveToken.current = (id: string) => {
          clearTimeout(timeout);
          originalResolve(id);
        };

        window.Culqi.open();
      });
    } catch {
      // El usuario cerró el modal o expiró el timeout
      setModalOpen(false);
      return;
    }

    setModalOpen(false);
    setProcessing(true);

    try {
      const response = await culqiService.suscribir(tokenId, planParam);
      // Actualizar el estado de suscripción en el store global
      setSuscripcionEstado(response.estado as 'ACTIVA' | 'CANCELADA' | 'TRIAL' | 'EXPIRADA' | 'SIN_SUSCRIPCION');
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; merchant_message?: string } } })
          ?.response?.data?.message ??
        (err as { response?: { data?: { merchant_message?: string } } })
          ?.response?.data?.merchant_message ??
        'Error al procesar el pago. Verifica los datos de tu tarjeta e intenta nuevamente.';
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  // ── Loading config ──────────────────────────────────────────────────────────
  if (loadingConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (configError || !config) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-red-600 text-sm">{configError ?? 'Error de configuración.'}</p>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Volver al dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Pantalla de éxito ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <div className="rounded-full bg-emerald-100 p-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-xl">¡Suscripción activada!</CardTitle>
            <CardDescription>
              Tu plan {config.nombrePlan} está activo. Ahora tienes acceso completo a Fluxus.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Tu tarjeta será cobrada automáticamente cada mes por{' '}
              <strong>S/ {Number(config.precioMensual).toFixed(2)}</strong>.
            </div>
            <Button className="w-full" onClick={() => navigate('/dashboard', { replace: true })}>
              Ir al dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Pantalla principal de checkout ──────────────────────────────────────────
  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Activar suscripción
          </CardTitle>
          <CardDescription>
            Paga de forma segura con tarjeta o Yape. Sin redirecciones externas.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Resumen del plan */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Resumen del plan</h3>
              <Badge variant="secondary">{config.nombrePlan}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Todo incluido: POS, inventario, compras, facturación, roles y reportes sin límite.
            </p>
            <div className="flex items-end justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground">Cobro mensual recurrente</span>
              <p className="text-2xl font-bold">
                S/ {Number(config.precioMensual).toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground"> / mes</span>
              </p>
            </div>
          </div>

          {/* Garantías de seguridad */}
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Pago cifrado con <strong>SSL 256-bit</strong> procesado por{' '}
              <a
                href="https://culqi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                Culqi
              </a>
              . Fluxus <strong>nunca almacena</strong> los datos de tu tarjeta.
              Puedes cancelar cuando quieras.
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-col gap-3">
            <Button
              className="w-full"
              size="lg"
              onClick={handlePagar}
              disabled={processing || modalOpen}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando pago…
                </>
              ) : modalOpen ? (
                'Completa el pago en la ventana de Culqi…'
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Pagar S/ {Number(config.precioMensual).toFixed(2)}/mes de forma segura
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/dashboard')}
              disabled={processing}
            >
              Volver al dashboard
            </Button>
          </div>

          {/* Footer legal */}
          <p className="text-center text-[11px] text-muted-foreground">
            Al pagar aceptas los{' '}
            <a href="/terminos" target="_blank" className="underline underline-offset-2">
              términos de servicio
            </a>{' '}
            y la{' '}
            <a href="/privacidad" target="_blank" className="underline underline-offset-2">
              política de privacidad
            </a>{' '}
            de Fluxus.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
