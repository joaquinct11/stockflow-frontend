import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface ProtectedMenuItemProps {
  permiso: string;
  children: React.ReactNode;
}

export function ProtectedMenuItem({ 
  permiso, 
  children 
}: ProtectedMenuItemProps) {
  const { puede } = usePermissions();

  if (!puede(permiso as any)) {
    return null; // No renderiza si no tiene permiso
  }

  return <>{children}</>;
}