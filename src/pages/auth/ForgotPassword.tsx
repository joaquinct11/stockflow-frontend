import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Package, Mail, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('📧 Solicitando recuperación de contraseña para:', email);
      await authService.solicitarRecuperacionContraseña({ email });
      
      toast.success('Email de recuperación enviado');
      setSubmitted(true);
      
      // Después de 3 segundos, redirige al login
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      console.error('❌ Error:', error);
      const message = error.response?.data?.message || 'Error al solicitar recuperación';
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
          <CardTitle className="text-2xl font-bold">¿Olvidaste tu contraseña?</CardTitle>
          <CardDescription>
            Ingresa tu email para recibir un enlace de recuperación
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2" htmlFor="email">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Te enviaremos un enlace para recuperar tu contraseña
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
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
          ) : (
            // Mensaje de éxito
            <div className="space-y-4 text-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 w-16 h-16 flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">Email enviado</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Revisa tu bandeja de entrada en <strong>{email}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Si no ves el email, revisa la carpeta de spam
                </p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3">
                  Redirigiendo a login en 3 segundos...
                </p>
                <Link
                  to="/login"
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Click aquí si no quieres esperar
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}