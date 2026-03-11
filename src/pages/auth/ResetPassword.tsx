import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Package, Lock, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(!!token);
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

    // Validaciones
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
      console.log('🔐 Reseteando contraseña...');
      if (!token) {
        throw new Error('Token no disponible');
      }

      await authService.resetearContraseña({
        token,
        nuevaContraseña: formData.nuevaContraseña,
        confirmarContraseña: formData.confirmarContraseña,
      });

      toast.success('Contraseña reseteada exitosamente');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('❌ Error:', error);
      const message = error.response?.data?.message || 'Error al resetear contraseña';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              El enlace de recuperación es inválido o ha expirado
            </p>
            <Link to="/login" className="text-primary hover:underline font-medium">
              Volver a login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Package className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Crear nueva contraseña</CardTitle>
          <CardDescription>
            Elige una contraseña segura para tu cuenta
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2" htmlFor="password">
                <Lock className="h-4 w-4" />
                Nueva Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.nuevaContraseña}
                onChange={(e) =>
                  setFormData({ ...formData, nuevaContraseña: e.target.value })
                }
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2" htmlFor="confirm-password">
                <Lock className="h-4 w-4" />
                Confirmar Contraseña
              </label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={formData.confirmarContraseña}
                onChange={(e) =>
                  setFormData({ ...formData, confirmarContraseña: e.target.value })
                }
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Reseteando...' : 'Resetear Contraseña'}
            </Button>

            {/* Link de vuelta al login */}
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} />
              Volver a login
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}