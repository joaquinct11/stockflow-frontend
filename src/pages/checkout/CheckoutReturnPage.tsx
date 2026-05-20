import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { suscripcionService } from '../../services/suscripcion.service';
import { useAuthStore } from '../../store/authStore';

const MP_CHECKOUT_STATE_KEY = 'mp_checkout_state';

/**
 * Página de retorno de Mercado Pago.
 * Captura las URLs /checkout/success, /checkout/failure y /checkout/pending,
 * llama a POST /suscripciones/sincronizar para consultar el estado real en MP,
 * actualiza el store ANTES de redirigir para evitar parpadeo de "acceso restringido".
 *
 * Flujos cubiertos:
 *  1. Pago BÁSICO aprobado → ACTIVA → dashboard
 *  2. Pago fallido → SUSPENDIDA/FALLIDA → dashboard con mensaje de error
 */
export function CheckoutReturnPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSuscripcionEstado } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    async function verificarSuscripcion() {
      let billingEstado = 'PENDIENTE';

      try {
        const resultado = await suscripcionService.sincronizar();
        billingEstado = resultado?.estado ?? 'PENDIENTE';
      } catch {
        // Fallback: inferir desde la ruta de retorno
        if (location.pathname.includes('success')) billingEstado = 'ACTIVA';
        else if (location.pathname.includes('failure')) billingEstado = 'FALLIDA';
        else billingEstado = 'PENDIENTE';
      }

      localStorage.removeItem(MP_CHECKOUT_STATE_KEY);

      if (!cancelled) {
        setSuscripcionEstado(billingEstado);
        navigate(`/dashboard?billing=${billingEstado}`, { replace: true });
      }
    }

    verificarSuscripcion();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname, setSuscripcionEstado]);

  return <LoadingSpinner />;
}
