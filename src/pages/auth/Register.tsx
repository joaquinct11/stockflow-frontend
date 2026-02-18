import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Package } from 'lucide-react';
import toast from 'react-hot-toast';

export function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    contraseña: '',
    nombre: '',
    rolNombre: 'VENDEDOR',
    tenantId: 'farmacia-001',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.register(formData);
      setUser(response);
      toast.success('¡Registro exitoso!');
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.mensaje || 'Error en el registro';
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
          <CardTitle className="text-2xl font-bold">Crear Cuenta</CardTitle>
          <CardDescription>
            Regístrate en StockFlow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="nombre">
                Nombre Completo
              </label>
              <Input
                id="nombre"
                type="text"
                placeholder="Juan Pérez"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

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
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="rol">
                Rol
              </label>
              <select
                id="rol"
                value={formData.rolNombre}
                onChange={(e) => setFormData({ ...formData, rolNombre: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="VENDEDOR">Vendedor</option>
                <option value="ADMIN">Administrador</option>
                <option value="ALMACEN">Almacén</option>
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registrando...' : 'Crear Cuenta'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
            <Link to="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}