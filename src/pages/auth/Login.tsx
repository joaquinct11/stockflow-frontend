import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', contraseña: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authService.login(formData);
      try {
        const profile = await authService.obtenerPerfil();
        setUser({ ...response, permisos: profile.permisos || [] });
      } catch {
        setUser(response);
      }
      toast.success(`¡Bienvenido ${response.nombre}!`);
      navigate('/dashboard');
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('❌ Error en login:', error);
      toast.error(error.response?.data?.mensaje || 'Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Bienvenido de nuevo"
        description="Ingresa tus credenciales para continuar"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Correo electrónico" htmlFor="email">
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="h-11"
            />
          </Field>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <PasswordInput
              id="password"
              value={formData.contraseña}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              onChange={(v) => setFormData({ ...formData, contraseña: v })}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-semibold text-sm mt-2"
            disabled={loading}
          >
            {loading ? <Spinner label="Ingresando..." /> : 'Iniciar sesión'}
          </Button>
        </form>

        <AuthFooter>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-primary hover:text-primary/80 font-semibold transition-colors">
            Regístrate gratis
          </Link>
        </AuthFooter>
      </AuthCard>
    </AuthShell>
  );
}

/* ─── Shared auth primitives ──────────────────────────────────────── */

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen min-h-[100dvh] flex flex-col items-center bg-slate-50 dark:bg-slate-950 overflow-x-hidden overflow-y-auto">
      {/* Glow de fondo — más pequeño en mobile */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[300px] w-[600px] sm:h-[500px] sm:w-[900px] rounded-full bg-primary/10 blur-[100px] sm:blur-[120px] opacity-50 dark:opacity-30" />
      </div>

      {/* Patrón de puntos */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Contenido centrado con scroll libre */}
      <div className="relative z-10 flex flex-col items-center w-full px-4 py-8 sm:py-16 safe-bottom">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6 sm:mb-8 select-none">
          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-2.5">
            <img
              src="/fluxus.png"
              alt="Fluxus"
              className="h-5 w-5 sm:h-6 sm:w-6"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight">Fluxus</span>
          <span className="text-[10px] text-muted-foreground font-medium tracking-widest mt-0.5 uppercase">
            ERP · Gestión
          </span>
        </div>

        {/* Card */}
        <div className="w-full">{children}</div>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-muted-foreground/40">
          © 2026 Fluxus · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}

export function AuthCard({
  title,
  description,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={[
        'mx-auto w-full',
        wide ? 'max-w-md' : 'max-w-sm',
        'rounded-xl sm:rounded-2xl',
        'border border-slate-200 dark:border-slate-800',
        'bg-white dark:bg-slate-900',
        'shadow-lg shadow-slate-200/70 dark:shadow-black/50',
        'p-5 sm:p-8',
      ].join(' ')}
    >
      <div className={description ? 'mb-5 sm:mb-6' : 'mb-3 sm:mb-4'}>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  show,
  onToggle,
  onChange,
  placeholder = '••••••••',
}: {
  id: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="h-11 pr-11"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      {label}
    </span>
  );
}

export function AuthFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 sm:mt-5 text-center text-sm text-muted-foreground border-t border-border/60 pt-4 sm:pt-5">
      {children}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/60" />
      </div>
    </div>
  );
}
