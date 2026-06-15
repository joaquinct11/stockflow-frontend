import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// PlanPage — página pública que muestra el plan + precio (equivalente a
// "carrito de compras" para la revisión de Culqi).
// Ruta: /plan
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
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

// Precio en soles (sin IGV + IGV = total)
const PRECIO_SIN_IGV = 75.42;
const IGV             = 13.58;
const PRECIO_TOTAL    = 89.00;

export function PlanPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Barra superior ── */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── Columna izquierda: detalles del producto ── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Encabezado */}
            <div>
              <p className="text-sm font-medium text-primary uppercase tracking-widest mb-1">
                Suscripción mensual
              </p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Plan Básico — Fluxus ERP
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Mini‑ERP para negocios peruanos. Todo lo que necesitas para gestionar
                inventario, ventas, compras y facturación electrónica en una sola plataforma.
              </p>
            </div>

            {/* Lista de características */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Incluye todos los módulos:
              </p>
              <ul className="space-y-2">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Condiciones de la suscripción */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 space-y-1.5">
              <p className="font-semibold">Condiciones de la suscripción:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>14 días de prueba gratuita. Sin cargo hasta que decidas continuar.</li>
                <li>Cobro recurrente mensual de <strong>S/ {PRECIO_TOTAL.toFixed(2)}</strong> (IGV incluido).</li>
                <li>Cancela en cualquier momento desde tu panel. Sin penalidad.</li>
                <li>Al cancelar mantienes acceso hasta el fin del período pagado.</li>
              </ul>
            </div>
          </div>

          {/* ── Columna derecha: resumen + CTA (el "carrito") ── */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-5 lg:sticky lg:top-6">

              {/* Título del resumen */}
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                Resumen del pedido
              </h2>

              {/* Líneas de precio */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Plan Básico</span>
                  <span>S/ {PRECIO_SIN_IGV.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>IGV (18%)</span>
                  <span>S/ {IGV.toFixed(2)}</span>
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
                <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 text-base">
                  <span>Total / mes</span>
                  <span>S/ {PRECIO_TOTAL.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Los primeros 14 días son gratuitos. Se cobra S/ {PRECIO_TOTAL.toFixed(2)}/mes a partir del día 15.
                </p>
              </div>

              {/* Botones de acción */}
              <div className="space-y-3">
                <Link
                  to="/register?plan=BASICO"
                  className="block w-full text-center bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors"
                >
                  Crear cuenta y comenzar — Gratis
                </Link>
                <Link
                  to="/login?redirect=/checkout/culqi%3Fplan%3DBASICO"
                  className="block w-full text-center border border-gray-300 dark:border-gray-700 hover:border-primary hover:text-primary text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
                >
                  Ya tengo cuenta — Iniciar sesión
                </Link>
              </div>

              {/* Seguridad */}
              <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Pago procesado por{' '}
                  <a href="https://culqi.com" target="_blank" rel="noopener noreferrer" className="underline text-gray-600 dark:text-gray-400">
                    Culqi
                  </a>
                  . Tus datos de tarjeta nunca son almacenados en nuestros servidores.
                </span>
              </div>

              {/* Links legales */}
              <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
                Al continuar aceptas nuestros{' '}
                <Link to="/terminos" className="underline hover:text-gray-600 dark:hover:text-gray-400">
                  Términos y Condiciones
                </Link>
                {' '}y{' '}
                <Link to="/privacidad" className="underline hover:text-gray-600 dark:hover:text-gray-400">
                  Política de Privacidad
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer mínimo ── */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 mt-10">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-500">
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
