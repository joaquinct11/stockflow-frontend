import { useAuthStore } from '../store/authStore';

export function useCurrentUser() {
  // Obtener el user del estado (reactivo)
  const user = useAuthStore((state) => state.user);

  return {
    userId: user?.usuarioId || null,
    userName: user?.nombre || 'Usuario',
    userEmail: user?.email || '',
    tenantId: user?.tenantId || '',
  };
}