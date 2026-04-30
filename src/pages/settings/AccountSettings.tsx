import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DeleteAccountModal } from '../../components/ui/DeleteAccountModal';
import { useAuthStore } from '../../store/authStore';
import { usuarioService } from '../../services/usuario.service';
import { Trash2, AlertTriangle, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import type { DeleteAccountValidationDTO } from '../../types';

export function AccountSettings() {
  const { user, suscripcionEstado } = useAuthStore();
  const navigate = useNavigate();
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

  const planId = user?.suscripcion?.planId ?? 'FREE';
  const planLabel = planId === 'PRO' ? 'Pro' : planId === 'BASICO' ? 'Básico' : 'Gratis';
  const planPrecio = planId === 'PRO' ? 'S/ 99.99/mes' : planId === 'BASICO' ? 'S/ 49.99/mes' : 'S/ 0.00/mes';
  const estadoSus = suscripcionEstado ?? user?.suscripcion?.estado ?? 'SIN_SUSCRIPCION';
  const isAdmin = user?.rol === 'ADMIN';

  function estadoBadge(estado: string) {
    switch (estado) {
      case 'ACTIVA':     return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Activa</Badge>;
      case 'CANCELADA':  return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>;
      case 'SUSPENDIDA': return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Suspendida</Badge>;
      case 'PENDIENTE':  return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      default:           return <Badge variant="outline">Sin suscripción</Badge>;
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Administra tu plan y opciones de cuenta</p>
      </div>

      {/* Mi Plan (solo ADMIN) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Mi Plan
            </CardTitle>
            <CardDescription>Información de tu suscripción activa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold">Plan {planLabel}</span>
                  {estadoBadge(estadoSus)}
                </div>
                <p className="text-sm text-muted-foreground">{planPrecio}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/suscripciones')}>
                  Gestionar suscripción
                </Button>
                {(estadoSus === 'CANCELADA' || estadoSus === 'SUSPENDIDA' || estadoSus === 'SIN_SUSCRIPCION') && (
                  <Button size="sm" onClick={() => navigate('/checkout?plan=BASICO')}>
                    Activar plan
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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