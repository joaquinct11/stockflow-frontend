import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CheckCircle2, Building2, Zap } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// PlanPage — muestra las opciones de plan Básico y Pro antes del checkout.
// Ruta: /plan
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES_BASICO = [
  'Punto de Venta (POS) con caja integrada',
  'Inventario en tiempo real con alertas de stock',
  'Control de lotes y fechas de vencimiento',
  'Órdenes de compra y recepciones a proveedores',
  'Devoluciones y notas de crédito',
  'Facturación electrónica: boletas y facturas SUNAT',
  'Reportes históricos + exportación a Excel y PDF',
  'Roles y permisos granulares (hasta 10 usuarios)',
  'Soporte por WhatsApp en español',
];

const FEATURES_PRO_EXTRA = [
  'Todo lo incluido en el plan Básico',
  'Hasta 5 sucursales (locales) por cuenta',
  'Stock independiente por sucursal',
  'Reportes consolidados multi-local',
  'Selector de sucursal en POS y módulos',
];

const PRECIO_BASICO_SIN_IGV = 75.42;
const PRECIO_BASICO_IGV     = 13.58;
const PRECIO_BASICO_TOTAL   = 89.00;

const PRECIO_PRO_SIN_IGV    = 149.15;
const PRECIO_PRO_IGV        = 26.85;
const PRECIO_PRO_TOTAL      = 176.00;

export function PlanPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Barra superior ── */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100 text-lg">
            <img src="/fluxus.png" alt="Fluxus" className="h-7 w-7" />
            Fluxus
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <ShieldCheck className="h-4 w-4" />
            Pago seguro
          </div>
        </div>
      </header>

      {/* ── Contenido principal ── */}
      <main className="max-w-5xl mx-auto px-4 py-10">

        <div className="text-center mb-8">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-1">Elige tu plan</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Suscripción mensual — Fluxus ERP</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">14 días de prueba gratuita. Sin cargo hasta que decidas continuar.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* ── Plan Básico ── */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Plan Básico</h2>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                S/ {PRECIO_BASICO_TOTAL.toFixed(2)}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> / mes</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">S/ {PRECIO_BASICO_SIN_IGV.toFixed(2)} + IGV S/ {PRECIO_BASICO_IGV.toFixed(2)}</p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Todo lo que necesitas para gestionar tu negocio en un solo local.
            </p>
            <ul className="space-y-2">
              {FEATURES_BASICO.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="space-y-2 pt-2">
              <Link
                to="/register?plan=BASICO"
                className="block w-full text-center bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors"
              >
                Empezar gratis — Plan Básico
              </Link>
              <Link
                to="/login?redirect=/checkout/culqi%3Fplan%3DBASICO"
                className="block w-full text-center border border-gray-300 dark:border-gray-700 hover:border-primary hover:text-primary text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
              >
                Ya tengo cuenta — Suscribirme
              </Link>
            </div>
          </div>

          {/* ── Plan Pro ── */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-primary shadow-md p-6 space-y-5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">Multi-local</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Plan Pro</h2>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                S/ {PRECIO_PRO_TOTAL.toFixed(2)}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> / mes</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">S/ {PRECIO_PRO_SIN_IGV.toFixed(2)} + IGV S/ {PRECIO_PRO_IGV.toFixed(2)}</p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Para negocios con varios locales. Gestiona hasta 5 sucursales desde una sola cuenta.
            </p>
            <ul className="space-y-2">
              {FEATURES_PRO_EXTRA.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="space-y-2 pt-2">
              <Link
                to="/register?plan=PRO"
                className="block w-full text-center bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors"
              >
                Empezar gratis — Plan Pro
              </Link>
              <Link
                to="/login?redirect=/checkout/culqi%3Fplan%3DPRO"
                className="block w-full text-center border border-primary text-primary hover:bg-primary/5 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
              >
                Ya tengo cuenta — Suscribirme a Pro
              </Link>
            </div>
          </div>

        </div>

        {/* ── Condiciones comunes ── */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 space-y-1.5">
          <p className="font-semibold">Condiciones de la suscripción:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>14 días de prueba gratuita. Sin cargo hasta que decidas continuar.</li>
            <li>Cobro recurrente mensual según el plan elegido (IGV incluido).</li>
            <li>Cancela en cualquier momento desde tu panel. Sin penalidad.</li>
            <li>Al cancelar mantienes acceso hasta el fin del período pagado.</li>
          </ul>
        </div>

        {/* ── Seguridad ── */}
        <p className="mt-6 text-xs text-gray-400 dark:text-gray-600 text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Pago procesado por{' '}
          <a href="https://culqi.com" target="_blank" rel="noopener noreferrer" className="underline">Culqi</a>.
          Tus datos de tarjeta nunca son almacenados en nuestros servidores.
        </p>
      </main>

      {/* ── Footer mínimo ── */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 mt-10">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-500">
          <span>© {new Date().getFullYear()} Fluxus. Todos los derechos reservados.</span>
          <div className="flex gap-4">
            <Link to="/terminos" className="hover:text-gray-700 dark:hover:text-gray-300">Términos</Link>
            <Link to="/privacidad" className="hover:text-gray-700 dark:hover:text-gray-300">Privacidad</Link>
            <a href="mailto:contacto@fluxus.pe" className="hover:text-gray-700 dark:hover:text-gray-300">Soporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
