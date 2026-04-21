import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import type { UserProfile } from '../../services/auth.service';
import { usuarioService } from '../../services/usuario.service';
import { useAuthStore } from '../../store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Dialog } from '../../components/ui/Dialog';
import { User, Mail, Building2, Calendar, Lock, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function UserProfile() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Cambiar contraseña
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({
    contraseñaActual: '',
    nuevaContraseña: '',
    confirmarContraseña: '',
  });

  // Editar perfil (solo nombre)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ nombre: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await authService.obtenerPerfil();
      setProfile(data);
      setEditProfileData({ nombre: data.nombre || '' });
    } catch (error) {
      if (import.meta.env.DEV) { console.error('Error obteniendo perfil:', error);}
      toast.error('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditProfile = () => {
    if (!profile) return;
    setEditProfileData({ nombre: profile.nombre || '' });
    setIsEditProfileOpen(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const nuevoNombre = editProfileData.nombre.trim();
    if (nuevoNombre.length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      // ✅ Tu backend requiere tenantId y rolNombre (y activo)
      await usuarioService.update(profile.usuarioId, {
        nombre: nuevoNombre,
        rolNombre: profile.rol,
        tenantId: profile.tenantId,
        activo: profile.activo,
      } as any);

      toast.success('Perfil actualizado');
      setIsEditProfileOpen(false);
      await fetchProfile();
    } catch (error: any) {
      if (import.meta.env.DEV) { console.error('❌ Error:', error.response?.data);}
      const backend = error.response?.data;
      const message =
        backend?.mensaje ||
        backend?.message ||
        (backend?.mensajes ? Object.values(backend.mensajes).join(' • ') : null) ||
        'Error al actualizar perfil';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (changePasswordData.nuevaContraseña.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (changePasswordData.nuevaContraseña !== changePasswordData.confirmarContraseña) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.cambiarContraseña(changePasswordData);
      toast.success('Contraseña cambiada exitosamente');
      setIsChangePasswordOpen(false);
      setChangePasswordData({
        contraseñaActual: '',
        nuevaContraseña: '',
        confirmarContraseña: '',
      });

      setTimeout(() => {
        logout();
        navigate('/login');
        toast('Por favor, inicia sesión con tu nueva contraseña');
      }, 1500);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error al cambiar contraseña';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No se pudo cargar el perfil</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información de perfil y seguridad</p>
        </div>

        <Button variant="outline" onClick={handleOpenEditProfile}>
          <Edit2 className="mr-2 h-4 w-4" />
          Editar Perfil
        </Button>
      </div>

      {/* Perfil Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información Personal
          </CardTitle>
          <CardDescription>Datos de tu cuenta y empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar y Nombre */}
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{profile.nombre}</h3>
              <Badge variant="outline" className="mt-2">
                {profile.rol}
              </Badge>
            </div>
          </div>

          {/* Grid de información */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <div className="p-3 bg-muted rounded-md text-sm font-mono">{profile.email}</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Empresa
              </label>
              <div className="p-3 bg-muted rounded-md text-sm">{profile.nombreFarmacia}</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rol</label>
              <div className="p-3 bg-muted rounded-md text-sm">{profile.rol}</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <div className="p-3 bg-muted rounded-md">
                <Badge variant={profile.activo ? 'success' : 'destructive'}>
                  {profile.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Miembro desde
              </label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('es-PE') : 'Not found'}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Último acceso</label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {profile.ultimoLogin ? new Date(profile.ultimoLogin).toLocaleDateString('es-PE') : 'Primera sesión'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seguridad Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Seguridad
          </CardTitle>
          <CardDescription>Protege tu cuenta cambiando tu contraseña</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Contraseña</h4>
              <p className="text-sm text-muted-foreground">Última vez cambiada hace más de 6 meses</p>
            </div>
            <Button onClick={() => setIsChangePasswordOpen(true)} variant="outline">
              Cambiar Contraseña
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog editar perfil */}
      <Dialog
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Editar Perfil"
        description="Actualiza tu información personal"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Tu nombre"
              value={editProfileData.nombre}
              onChange={(e) => setEditProfileData({ nombre: e.target.value })}
              required
              minLength={3}
              maxLength={150}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsEditProfileOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || editProfileData.nombre.trim().length < 3}>
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog cambiar contraseña */}
      <Dialog
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        title="Cambiar Contraseña"
        description="Introduce tu contraseña actual y la nueva contraseña"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="current-password">
              Contraseña Actual
            </label>
            <Input
              id="current-password"
              type="password"
              placeholder="••••••••"
              value={changePasswordData.contraseñaActual}
              onChange={(e) =>
                setChangePasswordData({
                  ...changePasswordData,
                  contraseñaActual: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="new-password">
              Nueva Contraseña
            </label>
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={changePasswordData.nuevaContraseña}
              onChange={(e) =>
                setChangePasswordData({
                  ...changePasswordData,
                  nuevaContraseña: e.target.value,
                })
              }
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="confirm-password">
              Confirmar Nueva Contraseña
            </label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={changePasswordData.confirmarContraseña}
              onChange={(e) =>
                setChangePasswordData({
                  ...changePasswordData,
                  confirmarContraseña: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsChangePasswordOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}