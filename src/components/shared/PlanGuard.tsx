interface PlanGuardProps {
  /** Plan requerido — ignorado, hay un solo plan con todo incluido. */
  requiredPlan: 'PRO';
  children: React.ReactNode;
  /** Descripción de la función — ignorado. */
  feature?: string;
}

/**
 * Plan único BASICO con todas las funciones incluidas.
 * Siempre renderiza children sin bloquear.
 */
export function PlanGuard({ children }: PlanGuardProps) {
  return <>{children}</>;
}
