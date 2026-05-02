import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Package, Building2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import type { PlanId, RegistrationRequestDTO, TipoDocumento } from '../../types';

const TIPO_DOCUMENTO_OPTIONS: { value: TipoDocumento; label: string }[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de Extranjería' },
  { value: 'RUC', label: 'RUC' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

interface ApiErrorShape {
  response?: {
    data?: {
      mensaje?: string;
    };
  };
  message?: string;
}

export function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const planFromUrl = searchParams.get('plan');
  const initialPlan: PlanId = planFromUrl === 'PRO' ? 'PRO' : 'BASICO';

  const [formData, setFormData] = useState<RegistrationRequestDTO>({
    email: '',
    contraseña: '',
    nombre: '',
    nombreFarmacia: '',
    planId: initialPlan,
  });
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('DNI');
  const [numeroDocumento, setNumeroDocumento] = useState('');

  const requiresDocumento = true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (formData.contraseña.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (requiresDocumento) {
      const doc = numeroDocumento.trim();
      if (!doc) {
        toast.error('El número de documento es obligatorio para planes de pago');
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
    }

    setLoading(true);

    try {
      const doc = numeroDocumento.trim();
      const response = await authService.register({
        ...formData,
        tipoDocumento,
        numeroDocumento: doc || undefined,
      });
      setUser(response);
      toast.success(`¡Bienvenido! Tu prueba de 14 días del plan ${response.suscripcion?.planId} ha comenzado.`);
      // Guardar datos de documento en sessionStorage para el checkout posterior
      sessionStorage.setItem(
        'mp_checkout_doc',
        JSON.stringify({ tipoDocumento, numeroDocumento: doc })
      );
      navigate('/dashboard');
    } catch (error: unknown) {
      const typedError = error as ApiErrorShape;
      const message = typedError.response?.data?.mensaje || typedError.message || 'Error en el registro';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Package className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Registra tu Empresa</CardTitle>
          <CardDescription>
            14 días de prueba gratis · Sin tarjeta de crédito · Cancela cuando quieras
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre de la Empresa */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2" htmlFor="nombreFarmacia">
                <Building2 className="h-4 w-4" />
                Nombre de tu Empresa
              </label>
              <Input
                id="nombreFarmacia"
                type="text"
                placeholder="Farmacia San Juan"
                value={formData.nombreFarmacia}
                onChange={(e) => setFormData({ ...formData, nombreFarmacia: e.target.value })}
                required
                minLength={3}
              />
              <p className="text-xs text-muted-foreground">
                Este será el nombre visible de tu negocio
              </p>
            </div>

            {/* Nombre del Administrador */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="nombre">
                Tu Nombre Completo
              </label>
              <Input
                id="nombre"
                type="text"
                placeholder="Juan Pérez García"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                minLength={3}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.contraseña}
                  onChange={(e) => setFormData({ ...formData, contraseña: e.target.value })}
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres
              </p>
            </div>

            {/* Plan */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="plan">
                Plan de Suscripción
              </label>
              <select
                id="plan"
                value={formData.planId}
                onChange={(e) => setFormData({ ...formData, planId: e.target.value as PlanId })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="BASICO">Básico — S/ 49.99/mes (14 días gratis)</option>
                <option value="PRO">Pro — S/ 99.99/mes (14 días gratis)</option>
              </select>
              <div className="text-xs text-muted-foreground space-y-1">
                {formData.planId === 'BASICO' && (
                  <p>✓ Hasta 5 usuarios · 500 productos · OC, Recepciones, Ventas</p>
                )}
                {formData.planId === 'PRO' && (
                  <p>✓ Hasta 10 usuarios · Productos ilimitados · Facturación electrónica · Lotes y vencimientos · RBAC completo</p>
                )}
              </div>
            </div>

            {/* Datos de identificación (solo para planes de pago) */}
            {requiresDocumento && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="tipoDocumento">
                    Tipo de Documento
                  </label>
                  <select
                    id="tipoDocumento"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {TIPO_DOCUMENTO_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="numeroDocumento">
                    Número de Documento
                  </label>
                  <Input
                    id="numeroDocumento"
                    type="text"
                    placeholder="Ej: 12345678"
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    required
                    minLength={6}
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">
                    Requerido por Mercado Pago para procesar suscripciones
                  </p>
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando tu cuenta...' : 'Crear cuenta · 14 días gratis'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
            <Link to="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            Al registrarte aceptas nuestros{' '}
            <a href="#" className="underline hover:text-primary">Términos</a>
            {' y '}
            <a href="#" className="underline hover:text-primary">Política de Privacidad</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
