import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { suscripcionService } from '../../services/suscripcion.service';

const MP_CHECKOUT_STATE_KEY = 'mp_checkout_state';

/**
 * Página de retorno de Mercado Pago.
 * Captura las URLs /checkout/success, /checkout/failure y /checkout/pending,
 * consulta el estado real de la suscripción en el backend y redirige al dashboard.
 * Si el backend no responde, usa localStorage como fallback (preapprovalId guardado
 * en /checkout/redirect) y marca el estado como PENDIENTE.
 */
export function CheckoutReturnPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    async function verificarSuscripcion() {
      let billingEstado = 'PENDIENTE';

      if (user?.usuarioId) {
        try {
          const suscripcion = await suscripcionService.getMiSuscripcion(user.usuarioId);
          billingEstado = suscripcion?.estado ?? 'PENDIENTE';
        } catch {
          // Fallback: check localStorage for saved preapprovalId; if present, mark PENDIENTE
          // so the dashboard shows the appropriate alert with retry button.
          const stored = localStorage.getItem(MP_CHECKOUT_STATE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as { preapprovalId?: string };
              if (parsed.preapprovalId) {
                billingEstado = 'PENDIENTE';
              } else {
                // No preapprovalId saved – infer from path
                if (location.pathname.includes('success')) billingEstado = 'ACTIVA';
                else if (location.pathname.includes('failure')) billingEstado = 'FALLIDA';
              }
            } catch {
              if (location.pathname.includes('success')) billingEstado = 'ACTIVA';
              else if (location.pathname.includes('failure')) billingEstado = 'FALLIDA';
            }
          } else {
            if (location.pathname.includes('success')) billingEstado = 'ACTIVA';
            else if (location.pathname.includes('failure')) billingEstado = 'FALLIDA';
          }
        }
      } else {
        if (location.pathname.includes('success')) billingEstado = 'ACTIVA';
        else if (location.pathname.includes('failure')) billingEstado = 'FALLIDA';
      }

      // Clean up the saved checkout state once we've processed the return
      localStorage.removeItem(MP_CHECKOUT_STATE_KEY);

      if (!cancelled) {
        navigate(`/dashboard?billing=${billingEstado}`, { replace: true });
      }
    }

    verificarSuscripcion();

    // Guard against state updates after component unmounts (e.g. double-render in StrictMode)
    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname, user]);

  return <LoadingSpinner />;
}
