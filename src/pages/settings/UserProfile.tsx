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
import { User, Mail, Building2, Calendar, Lock, Edit2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const AVATAR_COLORS = [
  'bg-violet-500','bg-blue-500','bg-emerald-500','bg-amber-500',
  'bg-rose-500','bg-cyan-500','bg-fuchsia-500','bg-teal-500',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function passwordStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: 'Muy débil', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Débil', color: 'bg-orange-500' };
  if (score === 3) return { score, label: 'Regular', color: 'bg-yellow-500' };
  if (score === 4) return { score, label: 'Fuerte', color: 'bg-green-500' };
  return { score, label: 'Muy fuerte', color: 'bg-emerald-600' };
}

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
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

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
            <div className={`h-20 w-20 rounded-full flex items-center justify-center flex-shrink-0 text-white text-2xl font-bold ${getAvatarColor(profile.nombre || 'U')}`}>
              {getInitials(profile.nombre || 'U')}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{profile.nombre}</h3>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
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
            <label className="text-sm font-medium" htmlFor="current-password">Contraseña Actual</label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={changePasswordData.contraseñaActual}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, contraseñaActual: e.target.value })}
                required
                className="pr-10"
              />
              <button type="button" onClick={() => setShowCurrentPwd((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
                {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="new-password">Nueva Contraseña</label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={changePasswordData.nuevaContraseña}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, nuevaContraseña: e.target.value })}
                required
                minLength={8}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowNewPwd((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
                {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {changePasswordData.nuevaContraseña && (() => {
              const { score, label, color } = passwordStrength(changePasswordData.nuevaContraseña);
              return (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= score ? color : 'bg-muted'}`} />
                    ))}
                  </div>
                  <p className={`text-xs flex items-center gap-1 ${score >= 4 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-500'}`}>
                    <ShieldCheck className="h-3 w-3" />{label}
                  </p>
                </div>
              );
            })()}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="confirm-password">Confirmar Nueva Contraseña</label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={changePasswordData.confirmarContraseña}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, confirmarContraseña: e.target.value })}
                required
                className="pr-10"
              />
              <button type="button" onClick={() => setShowConfirmPwd((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
                {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {changePasswordData.confirmarContraseña && changePasswordData.nuevaContraseña !== changePasswordData.confirmarContraseña && (
              <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
            )}
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