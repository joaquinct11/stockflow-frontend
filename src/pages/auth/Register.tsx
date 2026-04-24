import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Package, Building2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<RegistrationRequestDTO>({
    email: '',
    contraseña: '',
    nombre: '',
    nombreFarmacia: '',
    planId: 'FREE',
  });
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('DNI');
  const [numeroDocumento, setNumeroDocumento] = useState('');

  const requiresDocumento = formData.planId !== 'FREE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (formData.contraseña.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (requiresDocumento && !numeroDocumento.trim()) {
      toast.error('El número de documento es obligatorio para planes de pago');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.register(formData);
      setUser(response);
      toast.success(`¡Bienvenido a StockFlow! Plan ${response.suscripcion?.planId} activado`);
      if (formData.planId === 'FREE') {
        navigate('/dashboard');
      } else {
        // Guardar datos de documento en sessionStorage para el checkout
        sessionStorage.setItem(
          'mp_checkout_doc',
          JSON.stringify({ tipoDocumento, numeroDocumento: numeroDocumento.trim() })
        );
        navigate(`/checkout?plan=${formData.planId}`);
      }
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
            Crea tu cuenta y comienza a gestionar tu inventario
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
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.contraseña}
                onChange={(e) => setFormData({ ...formData, contraseña: e.target.value })}
                required
                minLength={8}
              />
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
                <option value="FREE">Gratis - S/ 0.00/mes</option>
                <option value="BASICO">Básico - S/ 49.99/mes</option>
                <option value="PRO">Pro - S/ 99.99/mes</option>
              </select>
              <div className="text-xs text-muted-foreground space-y-1">
                {formData.planId === 'FREE' && (
                  <p>✓ 1 usuario • 100 productos • Reportes básicos</p>
                )}
                {formData.planId === 'BASICO' && (
                  <p>✓ 5 usuarios • 500 productos • Reportes avanzados</p>
                )}
                {formData.planId === 'PRO' && (
                  <p>✓ Usuarios ilimitados • Productos ilimitados • Todas las funciones</p>
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
              {loading ? 'Creando tu cuenta...' : formData.planId === 'FREE' ? 'Comenzar gratis' : 'Crear cuenta y pagar'}
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
