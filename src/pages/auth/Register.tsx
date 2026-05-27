import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import type { PlanId, RegistrationRequestDTO, TipoDocumento } from '../../types';
import { AuthShell, AuthCard, Field, PasswordInput, Spinner, AuthFooter } from './Login';

const TIPO_DOCUMENTO_OPTIONS: { value: TipoDocumento; label: string }[] = [
  { value: 'DNI',       label: 'DNI' },
  { value: 'CE',        label: 'Carné de Extranjería' },
  { value: 'RUC',       label: 'RUC' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

interface ApiErrorShape {
  response?: { data?: { mensaje?: string } };
  message?: string;
}

const selectCls =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';

export function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Un solo plan — siempre BASICO
  const initialPlan: PlanId = 'BASICO';

  const [formData, setFormData] = useState<RegistrationRequestDTO>({
    email:         '',
    contraseña:    '',
    nombre:        '',
    nombreFarmacia:'',
    planId:        initialPlan,
  });
  const [tipoDocumento, setTipoDocumento]     = useState<TipoDocumento>('DNI');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [numeroCelular, setNumeroCelular]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.contraseña.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    const doc = numeroDocumento.trim();
    if (!doc) {
      toast.error('El número de documento es obligatorio');
      return;
    }
    if (tipoDocumento === 'DNI' && !/^\d{8}$/.test(doc)) {
      toast.error('El DNI debe tener exactamente 8 dígitos');
      return;
    }
    if (tipoDocumento === 'RUC' && !/^\d{11}$/.test(doc)) {
      toast.error('El RUC debe tener exactamente 11 dígitos');
      return;
    }
    if (tipoDocumento === 'CE' && !/^\d{9}$/.test(doc)) {
      toast.error('El Carné de Extranjería debe tener 9 dígitos');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register({
        ...formData,
        tipoDocumento,
        numeroDocumento: doc || undefined,
        numeroCelular:   numeroCelular.trim() || undefined,
      });
      setUser(response);
      toast.success(`¡Bienvenido! Tu prueba de 14 días del plan ${response.suscripcion?.planId} ha comenzado.`);
      sessionStorage.setItem('checkout_doc', JSON.stringify({ tipoDocumento, numeroDocumento: doc }));
      navigate('/dashboard');
    } catch (error: unknown) {
      const typedError = error as ApiErrorShape;
      toast.error(typedError.response?.data?.mensaje || typedError.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Crea tu cuenta"
        wide
      >
        {/* Badges de beneficios */}
        <div className="flex flex-wrap gap-1.5 mb-5 -mt-1">
          {['14 días gratis', 'Sin tarjeta', 'Cancela cuando quieras'].map((b) => (
            <span
              key={b}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
            >
              ✓ {b}
            </span>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">

          {/* Fila 1: empresa */}
          <Field label="Nombre de tu empresa" htmlFor="nombreFarmacia" hint="Razón social o nombre comercial">
            <Input
              id="nombreFarmacia"
              type="text"
              placeholder="Ej: Botica San Juan S.A.C."
              value={formData.nombreFarmacia}
              onChange={(e) => setFormData({ ...formData, nombreFarmacia: e.target.value })}
              required
              minLength={3}
              className="h-11"
            />
          </Field>

          {/* Fila 2: nombre + apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre(s)" htmlFor="nombre">
              <Input
                id="nombre"
                type="text"
                placeholder="Ej: Juan Carlos"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                minLength={2}
                className="h-11"
              />
            </Field>
            <Field label="Apellido(s)" htmlFor="apellido" hint="Opcional">
              <Input
                id="apellido"
                type="text"
                placeholder="Ej: Pérez García"
                value={formData.apellido ?? ''}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                className="h-11"
              />
            </Field>
          </div>

          {/* Email */}
          <Field label="Correo electrónico" htmlFor="email" hint="Recibirás notificaciones y facturas aquí">
            <Input
              id="email"
              type="email"
              placeholder="Ej: juan@miempresa.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="h-11"
            />
          </Field>

          {/* Contraseña */}
          <Field label="Contraseña" htmlFor="password" hint="Al menos 8 caracteres. Combina letras y números.">
            <PasswordInput
              id="password"
              value={formData.contraseña}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              onChange={(v) => setFormData({ ...formData, contraseña: v })}
              placeholder="Mínimo 8 caracteres"
            />
          </Field>

          {/* Separador */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Suscripción</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Plan — único */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Plan Básico</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Todo incluido · POS, inventario, compras, facturación, reportes y más
              </p>
            </div>
            <p className="text-sm font-bold text-primary shrink-0">S/ 129<span className="font-normal text-muted-foreground">/mes</span></p>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Identificación</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Documento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tipo de documento" htmlFor="tipoDocumento">
              <select
                id="tipoDocumento"
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
                className={selectCls}
              >
                {TIPO_DOCUMENTO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Número de documento" htmlFor="numeroDocumento" hint="Requerido para la facturación">
              <Input
                id="numeroDocumento"
                type="text"
                placeholder={tipoDocumento === 'DNI' ? '8 dígitos' : tipoDocumento === 'RUC' ? '11 dígitos' : tipoDocumento === 'CE' ? '9 dígitos' : 'Nº de documento'}
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                required
                minLength={6}
                maxLength={20}
                className="h-11"
              />
            </Field>
          </div>

          {/* Celular */}
          <Field label="Número de celular" htmlFor="numeroCelular" hint="Opcional — para alertas y soporte por WhatsApp">
            <Input
              id="numeroCelular"
              type="tel"
              placeholder="Ej: 999 888 777"
              value={numeroCelular}
              onChange={(e) => setNumeroCelular(e.target.value)}
              maxLength={15}
              className="h-11"
            />
          </Field>

          <Button
            type="submit"
            className="w-full h-11 font-semibold text-sm mt-1"
            disabled={loading}
          >
            {loading ? <Spinner label="Creando cuenta..." /> : 'Crear cuenta · 14 días gratis'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Al registrarte aceptas nuestros{' '}
          <Link to="/terminos" className="underline hover:text-primary">Términos y Condiciones</Link>
          {' y '}
          <Link to="/privacidad" className="underline hover:text-primary">Política de Privacidad</Link>
        </p>

        <AuthFooter>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
        </AuthFooter>
      </AuthCard>
    </AuthShell>
  );
}
