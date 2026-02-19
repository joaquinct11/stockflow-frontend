import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const INACTIVITY_TIME = 30 * 60 * 1000; // 30 minutos en ms
const WARNING_TIME = 25 * 60 * 1000;    // 25 minutos (aviso 5 min antes)

//const INACTIVITY_TIME = 2 * 60 * 1000; // 2 minutos
//const WARNING_TIME = 1.5 * 60 * 1000;  // 1.5 minutos (aviso a los 90 seg)

export function useInactivityLogout() {
  const { logout, user } = useAuthStore();
  // ❌ QUITAR: const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);
  const warningRef = useRef<number | null>(null);
  const warningShownRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      // Limpiar timers anteriores
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
      warningShownRef.current = false;

      // Timer de advertencia (5 min antes)
      warningRef.current = window.setTimeout(() => {
        if (!warningShownRef.current) {
          warningShownRef.current = true;
          toast('⚠️ Tu sesión expirará en 5 minutos por inactividad', {
            duration: 5000,
            icon: '⏰',
          });
        }
      }, WARNING_TIME);

      // Timer de cierre de sesión
      timeoutRef.current = window.setTimeout(() => {
        console.log('⏰ Sesión cerrada por inactividad (30 min)');
        logout();
        // ✅ CAMBIAR: En vez de navigate, usar window.location
        window.location.href = '/login';
        toast.error('Tu sesión ha expirado por inactividad');
      }, INACTIVITY_TIME);
    };

    // Eventos que resetean el timer (actividad del usuario)
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Inicializar timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
    };
  }, [user, logout]); // ❌ QUITAR: navigate de las dependencias

  return null;
}