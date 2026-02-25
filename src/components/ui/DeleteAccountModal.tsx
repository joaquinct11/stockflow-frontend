import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { DeleteAccountValidationDTO } from '../../types';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  validacion: DeleteAccountValidationDTO;
  usuarioId: number;
  onConfirm: () => Promise<void>;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  validacion,
  usuarioId,
  onConfirm,
}: DeleteAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (validacion.tipo === 'TENANT_OWNER' && confirmText !== 'ELIMINAR') {
      toast.error('Debes escribir ELIMINAR para confirmar');
      return;
    }

    setLoading(true);
    try {
      await onConfirm();
      toast.success('Cuenta eliminada exitosamente');
      
      // Limpiar localStorage y redirigir al login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || 'Error al eliminar cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <h2 className="text-lg font-bold">
              {validacion.tipo === 'TENANT_OWNER' 
                ? '⚠️ Eliminar Farmacia Completa' 
                : 'Eliminar Usuario'}
            </h2>
          </div>
          <button onClick={onClose} className="hover:bg-gray-100 rounded p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {validacion.tipo === 'TENANT_OWNER' ? (
            <>
              {/* Advertencia para Owner */}
              <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
                <p className="text-sm text-destructive font-semibold mb-2">
                  ⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE
                </p>
                <p className="text-sm text-muted-foreground">
                  {validacion.mensaje}
                </p>
              </div>

              {/* Datos a eliminar */}
              {validacion.datosAEliminar && (
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Se eliminarán:</p>
                  <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Farmacia:</span>
                      <span className="font-medium">
                        {validacion.datosAEliminar.nombreFarmacia}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Usuarios:</span>
                      <span className="font-medium">
                        {validacion.datosAEliminar.usuarios}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Productos:</span>
                      <span className="font-medium">
                        {validacion.datosAEliminar.productos}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ventas:</span>
                      <span className="font-medium">
                        {validacion.datosAEliminar.ventas}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Proveedores:</span>
                      <span className="font-medium">
                        {validacion.datosAEliminar.proveedores}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Suscripciones:</span>
                      <span className="font-medium">
                        {validacion.datosAEliminar.suscripciones}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Input de confirmación */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Escribe <code className="bg-gray-100 px-2 py-1 rounded">ELIMINAR</code> para confirmar:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="ELIMINAR"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          ) : (
            <>
              {/* Advertencia para usuario normal */}
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                <p className="text-sm text-blue-900">
                  ℹ️ {validacion.mensaje}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t p-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || (validacion.tipo === 'TENANT_OWNER' && confirmText !== 'ELIMINAR')}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </div>
    </div>
  );
}