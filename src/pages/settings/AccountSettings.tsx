import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DeleteAccountModal } from '../../components/ui/DeleteAccountModal';
import { useAuthStore } from '../../store/authStore';
import { usuarioService } from '../../services/usuario.service';
import { Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { DeleteAccountValidationDTO } from '../../types';

export function AccountSettings() {
  const { user } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [validacion, setValidacion] = useState<DeleteAccountValidationDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDeleteClick = async () => {
    if (!user?.usuarioId) return;

    setLoading(true);
    try {
      const result = await usuarioService.validarEliminacion(user.usuarioId);
      setValidacion(result);
      setShowDeleteModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || 'Error al validar eliminación');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!user?.usuarioId || !validacion) return;

    if (validacion.tipo === 'TENANT_OWNER') {
      // Eliminar cuenta completa (tenant)
      await usuarioService.eliminarCuentaCompleta(user.usuarioId);
    } else {
      // Eliminar usuario normal
      await usuarioService.deactivate(user.usuarioId);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">

      {/* Zona de peligro */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zona de Peligro
          </CardTitle>
          <CardDescription>
            Acciones irreversibles en tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
            <h3 className="font-semibold mb-2">Eliminar Cuenta</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {user?.rol === 'ADMIN' 
                ? 'Como administrador, eliminar tu cuenta eliminará toda la información de tu empresa de forma permanente.'
                : 'Tu usuario será desactivado pero puede ser recuperado por un administrador.'}
            </p>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={loading}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {loading ? 'Validando...' : 'Eliminar Cuenta'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmación */}
      {validacion && (
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          validacion={validacion}
          usuarioId={user?.usuarioId || 0}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}