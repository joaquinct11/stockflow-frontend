import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell, AuthCard, Field, PasswordInput, Spinner, AuthFooter } from './Login';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    nuevaContraseña: '',
    confirmarContraseña: '',
  });

  useEffect(() => {
    if (!token) {
      toast.error('Token inválido o expirado');
      setTimeout(() => navigate('/login'), 2000);
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.nuevaContraseña.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (formData.nuevaContraseña !== formData.confirmarContraseña) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      if (import.meta.env.DEV) console.log('🔐 Reseteando contraseña...');
      if (!token) throw new Error('Token no disponible');

      await authService.resetearContraseña({
        token,
        nuevaContraseña: formData.nuevaContraseña,
        confirmarContraseña: formData.confirmarContraseña,
      });

      toast.success('Contraseña actualizada correctamente');
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('❌ Error:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell>
        <AuthCard title="Enlace inválido" description="Este enlace de recuperación ya no es válido o ha expirado.">
          <Link
            to="/forgot-password"
            className="block w-full text-center text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Solicitar un nuevo enlace
          </Link>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard
        title={done ? '¡Contraseña actualizada!' : 'Nueva contraseña'}
        description={
          done
            ? 'Tu contraseña fue cambiada correctamente'
            : 'Elige una contraseña segura para tu cuenta'
        }
      >
        {!done ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nueva contraseña" htmlFor="nueva" hint="Mínimo 8 caracteres">
              <PasswordInput
                id="nueva"
                value={formData.nuevaContraseña}
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
                onChange={(v) => setFormData({ ...formData, nuevaContraseña: v })}
              />
            </Field>

            <Field label="Confirmar contraseña" htmlFor="confirmar">
              <PasswordInput
                id="confirmar"
                value={formData.confirmarContraseña}
                show={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
                onChange={(v) => setFormData({ ...formData, confirmarContraseña: v })}
              />
            </Field>

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-sm mt-2"
              disabled={loading}
            >
              {loading ? <Spinner label="Actualizando..." /> : 'Actualizar contraseña'}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              Redirigiendo al inicio de sesión en 3 segundos...
            </p>
            <Link
              to="/login"
              className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Ir al inicio de sesión
            </Link>
          </div>
        )}

        {!done && (
          <AuthFooter>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver a iniciar sesión
            </Link>
          </AuthFooter>
        )}
      </AuthCard>
    </AuthShell>
  );
}
