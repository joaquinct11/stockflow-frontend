import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DeleteAccountModal } from '../../components/ui/DeleteAccountModal';
import { useAuthStore } from '../../store/authStore';
import { usuarioService } from '../../services/usuario.service';
import { Trash2, Shield, AlertTriangle } from 'lucide-react';
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
      <div>
        <h1 className="text-3xl font-bold">Configuración de Cuenta</h1>
        <p className="text-muted-foreground">
          Administra tu cuenta y preferencias
        </p>
      </div>

      {/* Información de cuenta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Información de la Cuenta
          </CardTitle>
          <CardDescription>
            Datos de tu cuenta en StockFlow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{user?.nombre}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rol</p>
              <p className="font-medium">{user?.rol}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tenant ID</p>
              <p className="font-mono text-xs">{user?.tenantId}</p>
            </div>
          </div>

          {user?.suscripcion && (
            <div className="mt-4 p-4 bg-primary/5 rounded-lg border">
              <p className="text-sm font-semibold mb-2">Plan Actual</p>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">{user.suscripcion.planId}</p>
                  <p className="text-sm text-muted-foreground">
                    S/ {user.suscripcion.precioMensual} / mes
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  user.suscripcion.estado === 'ACTIVA' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {user.suscripcion.estado}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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