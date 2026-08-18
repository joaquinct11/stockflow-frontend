import { useState, useEffect } from 'react';
import { AlertTriangle, MessageCircle, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const WA_NUMBER = '51994198710';
const WA_MSG    = encodeURIComponent('Hola, necesito ayuda para configurar mi facturación electrónica con SUNAT en Fluxus.');

export function OseBanner() {
  const { user } = useAuthStore();
  const dismissKey = `ose_banner_dismissed_${user?.tenantId ?? 'x'}`;

  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(dismissKey) === 'true'
  );

  // Si el usuario cambia (logout/login en el mismo tab), re-evaluar
  useEffect(() => {
    setDismissed(sessionStorage.getItem(dismissKey) === 'true');
  }, [dismissKey]);

  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Facturación electrónica no configurada
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          Sin esta configuración <strong>no podrás emitir boletas ni facturas con validez SUNAT</strong>.
          Contáctanos y lo activamos sin costo adicional.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20bc5a] px-3 py-1.5 rounded-md transition-colors"
        >
          <MessageCircle size={13} />
          Activar por WhatsApp
        </a>
        <button
          onClick={() => {
            sessionStorage.setItem(dismissKey, 'true');
            setDismissed(true);
          }}
          className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors p-1"
          title="Cerrar (hasta la próxima sesión)"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
