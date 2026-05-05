import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell, AuthCard, Field, Spinner, AuthFooter } from './Login';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (import.meta.env.DEV) console.log('📧 Solicitando recuperación de contraseña para:', email);
      await authService.solicitarRecuperacionContraseña({ email });
      toast.success('Email de recuperación enviado');
      setSubmitted(true);
      setTimeout(() => navigate('/login'), 5000);
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('❌ Error:', error);
      toast.error(error.response?.data?.message || 'Error al solicitar recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title={submitted ? '¡Revisa tu correo!' : 'Recuperar contraseña'}
        description={
          submitted
            ? `Enviamos un enlace a ${email}`
            : 'Te enviaremos un enlace para restablecer tu contraseña'
        }
      >
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Correo electrónico" htmlFor="email">
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
                autoFocus
              />
            </Field>

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-sm mt-2"
              disabled={loading}
            >
              {loading ? <Spinner label="Enviando..." /> : 'Enviar enlace de recuperación'}
            </Button>
          </form>
        ) : (
          /* Estado de éxito */
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Revisa tu bandeja de entrada (y la carpeta de spam si no aparece).
              </p>
            </div>
            <div className="w-full pt-4 border-t border-border/60">
              <p className="text-xs text-muted-foreground mb-3">
                Redirigiendo al inicio de sesión en 5 segundos...
              </p>
              <Link
                to="/login"
                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Ir al inicio de sesión
              </Link>
            </div>
          </div>
        )}

        <AuthFooter>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a iniciar sesión
          </Link>
        </AuthFooter>
      </AuthCard>
    </AuthShell>
  );
}
