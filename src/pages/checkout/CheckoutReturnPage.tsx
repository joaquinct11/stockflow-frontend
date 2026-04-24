import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { suscripcionService } from '../../services/suscripcion.service';

/**
 * Página de retorno de Mercado Pago.
 * Captura las URLs /checkout/success, /checkout/failure y /checkout/pending,
 * consulta el estado real de la suscripción en el backend y redirige al dashboard.
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
          // Fallback: inferir desde el path si el backend no responde
          if (location.pathname.includes('success')) {
            billingEstado = 'ACTIVA';
          } else if (location.pathname.includes('failure')) {
            billingEstado = 'FALLIDA';
          }
        }
      } else {
        if (location.pathname.includes('success')) {
          billingEstado = 'ACTIVA';
        } else if (location.pathname.includes('failure')) {
          billingEstado = 'FALLIDA';
        }
      }

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
