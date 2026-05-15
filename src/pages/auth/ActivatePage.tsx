import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, CheckCircle2, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell, AuthCard, Field, PasswordInput, Spinner, AuthFooter } from './Login';

export function ActivatePage() {
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
      toast.error('Link de activación inválido o expirado');
      setTimeout(() => navigate('/login'), 2500);
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.nuevaContraseña.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (formData.nuevaContraseña !== formData.confirmarContraseña) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      if (!token) throw new Error('Token no disponible');

      await authService.activarCuenta({
        token,
        nuevaContraseña: formData.nuevaContraseña,
        confirmarContraseña: formData.confirmarContraseña,
      });

      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      const msg = error.response?.data?.mensaje || error.response?.data?.message || 'Error al activar la cuenta';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell>
        <AuthCard title="Link inválido" description="Este link de activación ya no es válido o ha expirado.">
          <Link
            to="/login"
            className="block w-full text-center text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Ir al inicio de sesión
          </Link>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard
        title={done ? '¡Cuenta activada!' : 'Activa tu cuenta'}
        description={
          done
            ? 'Tu contraseña fue establecida correctamente'
            : 'Elige una contraseña para acceder al sistema'
        }
      >
        {!done ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ícono descriptivo */}
            <div className="flex justify-center pb-1">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
            </div>

            <Field label="Nueva contraseña" htmlFor="nueva" hint="Mínimo 6 caracteres">
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
              {loading ? <Spinner label="Activando cuenta..." /> : 'Activar cuenta'}
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
              Volver al inicio de sesión
            </Link>
          </AuthFooter>
        )}
      </AuthCard>
    </AuthShell>
  );
}
