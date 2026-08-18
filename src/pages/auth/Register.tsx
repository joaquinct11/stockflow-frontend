import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, Building2, User, Zap, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import type { PlanId, RegistrationRequestDTO, TipoDocumento } from '../../types';
import { AuthShell, AuthCard, PasswordInput, Spinner, AuthFooter } from './Login';

interface ApiErrorShape {
  response?: { data?: { mensaje?: string } };
  message?: string;
}

const selectCls =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';

const Req = () => <span className="text-destructive ml-0.5">*</span>;

function SectionHeader({
  icon: Icon,
  label,
  color = 'default',
}: {
  icon: React.ElementType;
  label: string;
  color?: 'default' | 'blue' | 'amber' | 'primary';
}) {
  const styles = {
    default: 'bg-muted/50 text-muted-foreground border-border',
    blue:    'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900',
    amber:   'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900',
    primary: 'bg-primary/5 text-primary border-primary/15',
  }[color];

  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${styles}`}>
      <Icon size={13} />
      <span className="text-xs font-semibold tracking-wide">{label}</span>
    </div>
  );
}

const TIPO_DOCUMENTO_OPTIONS: { value: TipoDocumento; label: string }[] = [
  { value: 'DNI',       label: 'DNI' },
  { value: 'RUC',       label: 'RUC' },
  { value: 'CE',        label: 'Carné de Extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

const PLANES = [
  {
    id:    'BASICO' as PlanId,
    label: 'Plan Básico',
    price: '89',
    tag:   null,
    items: ['POS con caja integrada', 'Inventario en tiempo real', 'Facturación electrónica', 'Hasta 5 usuarios'],
  },
  {
    id:    'PRO' as PlanId,
    label: 'Plan Pro',
    price: '169',
    tag:   'Más popular',
    items: ['Todo lo del Básico', 'Hasta 5 sucursales', 'Hasta 15 usuarios', 'Soporte prioritario'],
  },
] as const;

export function Register() {
  const navigate       = useNavigate();
  const { setUser }    = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const rawPlan    = searchParams.get('plan')?.toUpperCase();
  const initialPlan: PlanId = rawPlan === 'PRO' ? 'PRO' : 'BASICO';

  const [formData, setFormData] = useState<RegistrationRequestDTO>({
    email:          '',
    contraseña:     '',
    nombre:         '',
    nombreFarmacia: '',
    planId:         initialPlan,
    rubro:          'OTRO',
  });
  const [tipoDocumento,  setTipoDocumento]  = useState<TipoDocumento>('DNI');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [numeroCelular,  setNumeroCelular]  = useState('');

  const set = (key: keyof RegistrationRequestDTO, value: string) =>
    setFormData((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email.trim())) {
      toast.error('Ingresa un correo electrónico válido (ej: juan@empresa.com)');
      return;
    }

    if (!formData.apellido?.trim()) {
      toast.error('Los apellidos son obligatorios');
      return;
    }

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

    const cel = numeroCelular.trim();
    if (!cel) {
      toast.error('El número de celular es obligatorio');
      return;
    }
    if (!/^9\d{8}$/.test(cel)) {
      toast.error('El celular debe tener 9 dígitos y comenzar con 9 (ej: 987654321)');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register({
        ...formData,
        tipoDocumento,
        numeroDocumento: doc,
        numeroCelular:   cel,
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
      <AuthCard title="Crea tu cuenta" wide>

        {/* Badges de beneficios */}
        <div className="flex flex-wrap gap-1.5 mb-5 -mt-1">
          {(['14 días gratis', 'Sin tarjeta', 'Cancela cuando quieras'] as const).map((b) => (
            <span
              key={b}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
            >
              ✓ {b}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* ── Empresa ─────────────────────────────── */}
          <div className="rounded-xl border overflow-hidden">
            <SectionHeader icon={Building2} label="Tu empresa" color="blue" />
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="nombreFarmacia" className="text-sm font-medium">
                  Nombre de la empresa <Req />
                </label>
                <Input
                  id="nombreFarmacia"
                  type="text"
                  placeholder="Ej: Distribuidora Norte S.A.C."
                  value={formData.nombreFarmacia}
                  onChange={(e) => set('nombreFarmacia', e.target.value)}
                  required
                  minLength={3}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Razón social o nombre comercial</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="rubro" className="text-sm font-medium">
                  Tipo de negocio (rubro) <Req />
                </label>
                <select
                  id="rubro"
                  value={formData.rubro ?? 'OTRO'}
                  onChange={(e) => set('rubro', e.target.value)}
                  required
                  className={selectCls}
                >
                  <option value="BOTICA">Botica</option>
                  <option value="FARMACIA">Farmacia</option>
                  <option value="MINIMARKET">Minimarket</option>
                  <option value="FERRETERIA">Ferretería</option>
                  <option value="RESTAURANTE">Restaurante</option>
                  <option value="TIENDA_ROPA">Tienda de Ropa</option>
                  <option value="TIENDA">Tienda / Bodega</option>
                  <option value="EMPRESA_SERVICIOS">Empresa de Servicios / Dealer</option>
                  <option value="OTRO">Otro</option>
                </select>
                <p className="text-xs text-muted-foreground">Define los módulos que verás al ingresar</p>
              </div>
            </div>
          </div>

          {/* ── Responsable ──────────────────────────── */}
          <div className="rounded-xl border overflow-hidden">
            <SectionHeader icon={User} label="Datos del responsable" color="default" />
            <div className="p-4 space-y-3">

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="nombre" className="text-sm font-medium">
                    Nombre(s) <Req />
                  </label>
                  <Input
                    id="nombre"
                    type="text"
                    placeholder="Ej: Juan Carlos"
                    value={formData.nombre}
                    onChange={(e) => set('nombre', e.target.value)}
                    required
                    minLength={2}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="apellido" className="text-sm font-medium">
                    Apellido(s) <Req />
                  </label>
                  <Input
                    id="apellido"
                    type="text"
                    placeholder="Ej: Pérez García"
                    value={formData.apellido ?? ''}
                    onChange={(e) => set('apellido', e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Correo electrónico <Req />
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ej: juan@miempresa.com"
                  value={formData.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Recibirás notificaciones y facturas aquí</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  Contraseña <Req />
                </label>
                <PasswordInput
                  id="password"
                  value={formData.contraseña}
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  onChange={(v) => set('contraseña', v)}
                  placeholder="Mínimo 8 caracteres"
                />
                <p className="text-xs text-muted-foreground">Al menos 8 caracteres. Combina letras y números.</p>
              </div>
            </div>
          </div>

          {/* ── Plan ─────────────────────────────────── */}
          <div className="rounded-xl border overflow-hidden">
            <SectionHeader icon={Zap} label="Elige tu plan" color="primary" />
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                {PLANES.map((plan) => {
                  const selected = formData.planId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        setFormData((f) => ({ ...f, planId: plan.id }));
                        setSearchParams({ plan: plan.id }, { replace: true });
                      }}
                      className={[
                        'relative rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? 'border-primary bg-primary/8 ring-1 ring-primary shadow-sm'
                          : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30',
                      ].join(' ')}
                    >
                      {plan.tag && (
                        <span className="absolute -top-2 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                          {plan.tag}
                        </span>
                      )}
                      <div className="flex items-baseline justify-between gap-1 mb-2">
                        <p className="text-sm font-semibold">{plan.label}</p>
                        <p className="text-sm font-bold text-primary shrink-0">
                          S/{plan.price}<span className="text-[10px] font-normal text-muted-foreground">/mes</span>
                        </p>
                      </div>
                      <ul className="space-y-0.5">
                        {plan.items.map((item) => (
                          <li key={item} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="text-emerald-500 shrink-0">✓</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                14 días de prueba gratis · Sin tarjeta hasta que decidas quedarte
              </p>
            </div>
          </div>

          {/* ── Identificación ───────────────────────── */}
          <div className="rounded-xl border overflow-hidden">
            <SectionHeader icon={ShieldCheck} label="Identificación" color="amber" />
            <div className="p-4 space-y-3">

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="tipoDocumento" className="text-sm font-medium">
                    Tipo de documento <Req />
                  </label>
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
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="numeroDocumento" className="text-sm font-medium">
                    Número <Req />
                  </label>
                  <Input
                    id="numeroDocumento"
                    type="text"
                    inputMode="numeric"
                    placeholder={
                      tipoDocumento === 'DNI'  ? '8 dígitos' :
                      tipoDocumento === 'RUC'  ? '11 dígitos' :
                      tipoDocumento === 'CE'   ? '9 dígitos' : 'Nº documento'
                    }
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value.replace(/\D/g, ''))}
                    required
                    maxLength={tipoDocumento === 'RUC' ? 11 : tipoDocumento === 'DNI' ? 8 : 20}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="numeroCelular" className="text-sm font-medium">
                  Número de celular <Req />
                </label>
                <Input
                  id="numeroCelular"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Ej: 987654321"
                  value={numeroCelular}
                  onChange={(e) => setNumeroCelular(e.target.value.replace(/\D/g, ''))}
                  required
                  maxLength={9}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">9 dígitos, comienza con 9</p>
              </div>
            </div>
          </div>

          {/* ── Submit ───────────────────────────────── */}
          <Button
            type="submit"
            className="w-full h-12 font-semibold text-sm"
            disabled={loading}
          >
            {loading ? <Spinner label="Creando cuenta..." /> : 'Crear cuenta gratis · 14 días de prueba'}
          </Button>

          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            Al registrarte aceptas nuestros{' '}
            <Link to="/terminos" className="underline hover:text-primary">Términos y Condiciones</Link>
            {' y '}
            <Link to="/privacidad" className="underline hover:text-primary">Política de Privacidad</Link>
          </p>
        </form>

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
