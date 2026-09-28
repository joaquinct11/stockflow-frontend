import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usuarioService } from '../../services/usuario.service';
import type { Usuario } from '../../types';
import { Pagination } from '../../components/ui/Pagination';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { usePlan } from '../../hooks/usePlan';
import { useSucursalStore } from '../../store/sucursalStore';
import toast from 'react-hot-toast';
import { notify } from '../../lib/notify';

const T = {
  bg: '#F6F7F9', surface: '#FFFFFF', surface2: '#F1F3F6', surface3: '#EDF0F4',
  text: '#0F1623', text2: '#4A5568', text3: '#8896A5',
  primary: '#4F6EF7', primarySoft: '#EEF1FE', primaryLine: '#C7D2FC',
  line: '#E4E8EF', lineSoft: '#F0F2F5',
  ok: '#16A34A', okSoft: '#DCFCE7', okLine: '#BBF7D0',
  bad: '#DC2626', badSoft: '#FEE2E2', badLine: '#FECACA',
  warn: '#D97706', warnSoft: '#FEF3C7', warnLine: '#FDE68A',
  shadow: '0 2px 8px -2px rgba(15,22,35,.08)',
} as const;

// Inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('fx-in-kf')) {
  const s = document.createElement('style');
  s.id = 'fx-in-kf';
  s.textContent = '@keyframes fx-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}';
  document.head.appendChild(s);
}

const FxInput = ({ style: s, ...p }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...p}
    style={{ width: '100%', height: 44, padding: '0 13px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', ...s }}
    onFocus={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primarySoft}`; if (p.onFocus) (p.onFocus as React.FocusEventHandler<HTMLInputElement>)(e); }}
    onBlur={e => { e.currentTarget.style.borderColor = (s as React.CSSProperties)?.borderColor ?? T.line; e.currentTarget.style.boxShadow = 'none'; if (p.onBlur) (p.onBlur as React.FocusEventHandler<HTMLInputElement>)(e); }}
  />
);

const FxSelect = ({ style: s, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
    <select
      {...p}
      style={{ width: '100%', height: 44, padding: '0 34px 0 13px', fontFamily: 'Inter,sans-serif', fontSize: '.9rem', color: T.text, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box', ...s }}
    >
      {children}
    </select>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  </div>
);

const HUES = [210, 260, 340, 30, 160, 200, 280, 0, 130, 320];
function avatarStyle(nombre: string): { bg: string; color: string } {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) | 0;
  const h = HUES[Math.abs(hash) % HUES.length];
  return { bg: `hsl(${h},70%,93%)`, color: `hsl(${h},55%,38%)` };
}
function iniciales(nombre: string): string {
  const words = nombre.split(/\s+/).filter(w => w.length > 0);
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join('') || nombre.slice(0, 2).toUpperCase();
}

type Role = 'ADMIN' | 'VENDEDOR' | 'GESTOR_INVENTARIO';

const ROL_LABELS: Record<string, string> = {
  ADMIN:             'Administrador',
  VENDEDOR:          'Vendedor',
  GESTOR_INVENTARIO: 'Almacenero',
};

const ROL_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  ADMIN:             { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
  VENDEDOR:          { bg: '#DCFCE7', color: '#166534', border: '#BBF7D0' },
  GESTOR_INVENTARIO: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
};

type EstadoFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';

export function UsuariosList() {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const currentUserRole = (useAuthStore((s) => s.user?.rol) || 'VENDEDOR') as Role;

  const { canCreate, canEdit, canDelete, canToggleState, canView } = usePermissions();
  const { isBasico, limites } = usePlan();
  const { sucursales } = useSucursalStore();
  const isMultiLocal = sucursales.length > 1;
  const hasViewPermission = canView('USUARIOS');

  const allowedRoleOptions = useMemo(() => {
    const map: Record<Role, Array<{ value: Role; label: string }>> = {
      ADMIN: [
        { value: 'VENDEDOR',          label: 'Vendedor'   },
        { value: 'GESTOR_INVENTARIO', label: 'Almacenero' },
      ],
      VENDEDOR: [],
      GESTOR_INVENTARIO: [],
    };
    return map[currentUserRole] ?? [];
  }, [currentUserRole]);

  const defaultRolNombre = useMemo(() => {
    return (allowedRoleOptions[0]?.value ?? 'VENDEDOR') as Role;
  }, [allowedRoleOptions]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('TODOS');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'info' as 'warning' | 'danger' | 'success' | 'info',
    title: '',
    description: '',
    confirmText: '',
    running: false,
    action: null as (() => Promise<void>) | null,
  });

  const [formData, setFormData] = useState<Omit<Usuario, 'id' | 'tenantId'>>({
    nombre: '',
    email: '',
    contraseña: '',
    rolNombre: 'VENDEDOR',
    activo: true,
    tipoDocumento: '',
    numeroDocumento: '',
    numeroCelular: '',
    sucursalId: null,
  });
  const [nombres,   setNombres]   = useState('');
  const [apellidos, setApellidos] = useState('');

  useEffect(() => {
    if (hasViewPermission) fetchUsuarios();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasViewPermission]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter]);

  useEffect(() => {
    if (!editingId) {
      setFormData((prev) => ({
        ...prev,
        rolNombre: (prev.rolNombre as Role) ?? defaultRolNombre,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultRolNombre]);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const data = await usuarioService.getAll();
      setUsuarios(data);
    } catch (error) {
      notify.fromError(error, 'No se pudieron cargar los usuarios.');
      if (import.meta.env.DEV) console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      contraseña: '',
      rolNombre: defaultRolNombre,
      activo: true,
      tipoDocumento: '',
      numeroDocumento: '',
      numeroCelular: '',
      sucursalId: null,
    });
    setNombres('');
    setApellidos('');
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombres.trim().length < 2) { notify.error('Ingresa el nombre del usuario.', { detail: 'Debe tener al menos 2 caracteres.' }); return; }
    if (apellidos.trim().length < 2) { notify.error('Ingresa los apellidos del usuario.', { detail: 'Debe tener al menos 2 caracteres.' }); return; }
    try {
      if (editingId) {
        const usuarioToUpdate = {
          nombre: nombres.trim(),
          apellido: apellidos.trim(),
          rolNombre: formData.rolNombre,
          activo: formData.activo,
          tenantId: tenantId!,
          tipoDocumento: formData.tipoDocumento || undefined,
          numeroDocumento: formData.numeroDocumento || undefined,
          numeroCelular: formData.numeroCelular || undefined,
          sucursalId: formData.rolNombre === 'ADMIN' ? null : (formData.sucursalId ?? null),
        };
        await usuarioService.update(editingId, usuarioToUpdate as Usuario);
        toast.success('Usuario actualizado exitosamente');
      } else {
        if (!canCreate('USUARIOS')) {
          toast.error('No tienes permisos para crear usuarios');
          return;
        }
        await usuarioService.create({ ...formData, nombre: nombres.trim(), apellido: apellidos.trim() } as Usuario);
        toast.success('Usuario creado exitosamente');
      }
      resetForm();
      await fetchUsuarios();
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('❌ Error:', error.response?.data);
      notify.fromError(error, editingId ? 'No se pudo actualizar el usuario.' : 'No se pudo crear el usuario.');
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setNombres(usuario.nombre ?? '');
    setApellidos(usuario.apellido ?? '');
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      contraseña: '',
      rolNombre: usuario.rolNombre as Role,
      activo: usuario.activo ?? true,
      tipoDocumento: usuario.tipoDocumento ?? '',
      numeroDocumento: usuario.numeroDocumento ?? '',
      numeroCelular: usuario.numeroCelular ?? '',
      sucursalId: usuario.sucursalId ?? null,
    });
    setEditingId(usuario.id!);
    setIsDialogOpen(true);
  };

  const handleDeactivate = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Desactivar Usuario',
      description: '¿Estás seguro de que deseas desactivar este usuario? Podrá ser reactivado más tarde.',
      confirmText: 'Desactivar',
      running: false,
      action: async () => {
        try {
          await usuarioService.deactivate(id);
          toast.success('Usuario desactivado');
          await fetchUsuarios();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          notify.fromError(err, 'No se pudo desactivar el usuario.');
        }
      },
    });
  };

  const handleActivate = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'success',
      title: 'Activar Usuario',
      description: '¿Estás seguro de que deseas activar este usuario?',
      confirmText: 'Activar',
      running: false,
      action: async () => {
        try {
          await usuarioService.activate(id);
          toast.success('Usuario activado');
          await fetchUsuarios();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          notify.fromError(err, 'No se pudo activar el usuario.');
        }
      },
    });
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Eliminar Usuario',
      description:
        'El usuario será eliminado permanentemente de la base de datos. Su historial de ventas, movimientos y cajas se conservará con el campo de usuario en blanco. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      running: false,
      action: async () => {
        try {
          await usuarioService.delete(id);
          toast.success('Usuario eliminado');
          await fetchUsuarios();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          notify.fromError(err, 'No se pudo eliminar el usuario.');
        }
      },
    });
  };

  const handleReenviarActivacion = async (id: number) => {
    try {
      await usuarioService.reenviarActivacion(id);
      toast.success('📧 Email de activación reenviado exitosamente');
    } catch (err) {
      notify.fromError(err, 'No se pudo reenviar el email de activación.');
    }
  };

  const executeConfirm = async () => {
    if (!confirmDialog.action) return;
    setConfirmDialog(p => ({ ...p, running: true }));
    await confirmDialog.action();
    setConfirmDialog(p => ({ ...p, running: false }));
  };

  const filteredUsuarios = usuarios.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = u.nombre.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
    if (!matchesSearch) return false;
    if (estadoFilter === 'ACTIVOS' && !u.activo) return false;
    if (estadoFilter === 'INACTIVOS' && u.activo) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsuarios = filteredUsuarios.slice(startIndex, endIndex);

  const totalUsuarios = usuarios.length;
  const totalActivos = usuarios.filter((u) => u.activo).length;
  const totalInactivos = usuarios.filter((u) => !u.activo).length;
  const totalAdmins = usuarios.filter((u) => u.rolNombre === 'ADMIN').length;

  const usuariosActuales = usuarios.length;
  const limiteAlcanzado = isBasico && usuariosActuales >= limites.usuarios;

  const cntTodos    = usuarios.length;
  const cntActivos  = usuarios.filter(u => u.activo).length;
  const cntInact    = usuarios.filter(u => !u.activo).length;

  // Confirm tone map
  const cfTone = {
    warning: { color: T.warn,    soft: T.warnSoft,  border: T.warnLine },
    danger:  { color: T.bad,     soft: T.badSoft,   border: T.badLine  },
    success: { color: T.ok,      soft: T.okSoft,    border: T.okLine   },
    info:    { color: T.primary, soft: T.primarySoft, border: T.primaryLine },
  }[confirmDialog.type];

  // ─── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320, fontFamily: 'Inter,sans-serif' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.line}`, borderTopColor: T.primary, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ─── Modal: Crear / Editar ───────────────────────────────────
  const formModal = isDialogOpen ? createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,22,35,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div style={{ background: T.surface, borderRadius: 18, boxShadow: '0 32px 80px -20px rgba(15,22,35,.3)', width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'fx-in .18s ease' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 18px', borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: T.text, letterSpacing: '-.02em' }}>
              {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
            </div>
            <div style={{ fontSize: '.82rem', color: T.text3, marginTop: 3 }}>
              {editingId ? 'Actualiza la información del usuario' : 'Completa los datos para crear un nuevo usuario'}
            </div>
          </div>
          <button
            type="button"
            onClick={resetForm}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface2, cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0, color: T.text3 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <form id="usuario-form" onSubmit={handleSubmit}>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Section header */}
              <div style={{ background: T.surface2, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.lineSoft}` }}>
                  <div style={{ fontSize: '.83rem', fontWeight: 650, color: T.text }}>Datos del usuario</div>
                  <div style={{ fontSize: '.76rem', color: T.text3, marginTop: 2 }}>Campos obligatorios marcados con *</div>
                </div>
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Nombres */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>Nombres <span style={{ color: T.bad }}>*</span></label>
                    <FxInput placeholder="Ej: Juan Carlos" value={nombres} onChange={e => setNombres(e.target.value)} required maxLength={80} />
                  </div>
                  {/* Apellidos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>Apellidos <span style={{ color: T.bad }}>*</span></label>
                    <FxInput placeholder="Ej: García López" value={apellidos} onChange={e => setApellidos(e.target.value)} required maxLength={80} />
                  </div>
                  {/* Email */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>Email <span style={{ color: T.bad }}>*</span></label>
                    <FxInput type="email" placeholder="usuario@email.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={!!editingId} required />
                    {editingId && <span style={{ fontSize: '.72rem', color: T.text3 }}>No se puede cambiar al editar</span>}
                  </div>
                  {/* Celular */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>Celular</label>
                    <FxInput type="tel" placeholder="Ej: 999888777" value={formData.numeroCelular ?? ''} onChange={e => setFormData({ ...formData, numeroCelular: e.target.value })} maxLength={20} />
                  </div>

                  {/* Email notice */}
                  {!editingId && (
                    <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'flex-start', gap: 10, background: T.primarySoft, border: `1px solid ${T.primaryLine}`, borderRadius: 10, padding: '12px 14px' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>📧</span>
                      <p style={{ fontSize: '.8rem', color: '#1e3a8a', margin: 0 }}>
                        El usuario recibirá un <strong>email de bienvenida</strong> con un link para establecer su propia contraseña.
                        El link expira en <strong>48 horas</strong>.
                      </p>
                    </div>
                  )}

                  {/* Tipo documento */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>Tipo de Documento</label>
                    <FxSelect value={formData.tipoDocumento ?? ''} onChange={e => setFormData({ ...formData, tipoDocumento: e.target.value })}>
                      <option value="">Sin especificar</option>
                      <option value="DNI">DNI</option>
                      <option value="CE">Carné de Extranjería</option>
                      <option value="RUC">RUC</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </FxSelect>
                  </div>

                  {/* Número documento */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>Número de Documento</label>
                    <FxInput placeholder="Ej: 12345678" value={formData.numeroDocumento ?? ''} onChange={e => setFormData({ ...formData, numeroDocumento: e.target.value })} maxLength={20} />
                  </div>

                  {/* Rol */}
                  <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2 }}>Rol <span style={{ color: T.bad }}>*</span></label>
                    <FxSelect
                      value={formData.rolNombre}
                      onChange={e => setFormData({ ...formData, rolNombre: e.target.value as any })}
                      disabled={!canCreate('USUARIOS') || allowedRoleOptions.length === 0}
                    >
                      {allowedRoleOptions.length === 0 ? (
                        <option value="">No tienes permisos para crear usuarios</option>
                      ) : (
                        allowedRoleOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))
                      )}
                    </FxSelect>
                    {!canCreate('USUARIOS') && (
                      <span style={{ fontSize: '.72rem', color: T.text3 }}>
                        Tu rol (<strong>{ROL_LABELS[currentUserRole] ?? currentUserRole}</strong>) no puede crear usuarios.
                      </span>
                    )}
                  </div>

                  {/* Sede — solo ≥2 locales y rol no ADMIN */}
                  {isMultiLocal && formData.rolNombre !== 'ADMIN' && (
                    <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: '.8rem', fontWeight: 600, color: T.text2, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        Sede asignada <span style={{ color: T.bad }}>*</span>
                      </label>
                      <FxSelect
                        value={formData.sucursalId ?? ''}
                        onChange={e => setFormData({ ...formData, sucursalId: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">Selecciona una sede</option>
                        {sucursales.map(s => (
                          <option key={s.id} value={s.id}>{s.nombre}{s.esPrincipal ? ' (Principal)' : ''}</option>
                        ))}
                      </FxSelect>
                      <span style={{ fontSize: '.72rem', color: T.text3 }}>El vendedor solo verá datos de esta sede al iniciar sesión.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.lineSoft}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={resetForm}
            style={{ height: 40, padding: '0 18px', fontSize: '.875rem', fontWeight: 600, color: T.text2, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="usuario-form"
            disabled={nombres.trim().length < 2 || apellidos.trim().length < 2 || formData.email.length < 5 || (!editingId && !canCreate('USUARIOS'))}
            style={{ height: 40, padding: '0 20px', fontSize: '.875rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter,sans-serif', opacity: (nombres.trim().length < 2 || apellidos.trim().length < 2 || formData.email.length < 5 || (!editingId && !canCreate('USUARIOS'))) ? 0.5 : 1 }}
          >
            {editingId ? 'Actualizar' : 'Crear'} Usuario
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // ─── Modal: Confirm ─────────────────────────────────────────
  const confirmModal = confirmDialog.isOpen ? createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget && !confirmDialog.running) setConfirmDialog(p => ({ ...p, isOpen: false })); }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,22,35,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: T.surface, borderRadius: 16, boxShadow: '0 32px 80px -20px rgba(15,22,35,.3)', width: '100%', maxWidth: 420, padding: 24, animation: 'fx-in .16s ease' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: cfTone.soft, display: 'grid', placeItems: 'center', marginBottom: 16 }}>
          {confirmDialog.type === 'danger' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cfTone.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          )}
          {confirmDialog.type === 'warning' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cfTone.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 9l-6 6M9 9l6 6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
          )}
          {confirmDialog.type === 'success' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cfTone.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12.5 11.5 15 15.5 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
          )}
          {confirmDialog.type === 'info' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cfTone.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          )}
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: T.text, marginBottom: 8 }}>{confirmDialog.title}</div>
        <div style={{ fontSize: '.855rem', color: T.text2, lineHeight: 1.55, marginBottom: 20 }}>{confirmDialog.description}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
            disabled={confirmDialog.running}
            style={{ height: 38, padding: '0 16px', fontSize: '.855rem', fontWeight: 600, color: T.text2, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 9, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={executeConfirm}
            disabled={confirmDialog.running}
            style={{ height: 38, padding: '0 18px', fontSize: '.855rem', fontWeight: 650, color: '#fff', background: cfTone.color, border: 0, borderRadius: 9, cursor: 'pointer', fontFamily: 'Inter,sans-serif', opacity: confirmDialog.running ? 0.65 : 1 }}
          >
            {confirmDialog.running ? '…' : confirmDialog.confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter,sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-.025em', margin: 0, color: T.text }}>Usuarios</h1>
          <p style={{ fontSize: '.865rem', color: T.text3, margin: '6px 0 0' }}>Gestiona los usuarios del sistema</p>
        </div>
        {canCreate('USUARIOS') && (
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            disabled={limiteAlcanzado}
            title={limiteAlcanzado ? `Límite de ${limites.usuarios} usuarios alcanzado. Actualiza al plan Pro.` : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 18px', fontSize: '.875rem', fontWeight: 650, color: '#fff', background: T.primary, border: 0, borderRadius: 11, cursor: limiteAlcanzado ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', boxShadow: `0 6px 16px -8px ${T.primary}`, opacity: limiteAlcanzado ? 0.5 : 1, fontFamily: 'Inter,sans-serif' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* ── Sin permiso de vista ── */}
      {!hasViewPermission ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '64px 0', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, boxShadow: T.shadow }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: T.surface2, display: 'grid', placeItems: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div style={{ fontSize: '.95rem', fontWeight: 650, color: T.text }}>Sin acceso al listado</div>
          <div style={{ fontSize: '.83rem', color: T.text3, textAlign: 'center', maxWidth: 340 }}>No tienes permisos para ver el listado de usuarios. Contacta al administrador para solicitar acceso.</div>
        </div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
            {[
              { label: 'Total Usuarios',    val: totalUsuarios,  color: T.primary, sub: 'Registrados en el sistema', iconPath: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6' },
              { label: 'Activos',           val: totalActivos,   color: T.ok,      sub: 'Pueden iniciar sesión',      iconPath: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M22 11l-6.5 6.5-3-3' },
              { label: 'Inactivos',         val: totalInactivos, color: T.warn,    sub: 'Sin acceso temporal',        iconPath: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM18 8l-4 4' },
              { label: 'Administradores',   val: totalAdmins,    color: '#7c3aed', sub: 'Control total',              iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z' },
            ].map(k => (
              <div key={k.label} style={{ padding: '16px 18px', background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, boxShadow: T.shadow }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.68rem', fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: T.text3 }}>{k.label}</div>
                <div style={{ fontSize: '1.72rem', fontWeight: 700, letterSpacing: '-.032em', marginTop: 9, fontVariantNumeric: 'tabular-nums', color: k.color }}>{k.val}</div>
                <div style={{ fontSize: '.79rem', color: T.text3, marginTop: 5 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Table card ── */}
          <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 16, boxShadow: T.shadow, overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.lineSoft}`, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%', height: 36, paddingLeft: 34, paddingRight: 12, fontSize: '.855rem', color: T.text, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 9, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter,sans-serif' }}
                />
              </div>
              {/* Segmented control */}
              <div style={{ display: 'flex', background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 9, padding: 3, gap: 2 }}>
                {([
                  { key: 'TODOS'    as EstadoFilter, label: 'Todos',    cnt: cntTodos   },
                  { key: 'ACTIVOS'  as EstadoFilter, label: 'Activos',  cnt: cntActivos },
                  { key: 'INACTIVOS'as EstadoFilter, label: 'Inactivos',cnt: cntInact   },
                ]).map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setEstadoFilter(t.key)}
                    style={{ height: 28, padding: '0 12px', fontSize: '.78rem', fontWeight: 600, borderRadius: 7, border: 0, cursor: 'pointer', background: estadoFilter === t.key ? T.surface : 'transparent', color: estadoFilter === t.key ? T.text : T.text3, boxShadow: estadoFilter === t.key ? T.shadow : 'none', fontFamily: 'Inter,sans-serif' }}
                  >
                    {t.label}
                    <span style={{ marginLeft: 5, fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', color: t.key === 'ACTIVOS' ? T.ok : T.text3 }}>{t.cnt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {filteredUsuarios.length === 0 ? (
              <div style={{ padding: '56px 0', textAlign: 'center', color: T.text3, fontSize: '.9rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={T.line} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <div>
                  <div style={{ fontWeight: 650, color: T.text2, marginBottom: 4 }}>
                    {usuarios.length === 0 ? 'Todavía no hay usuarios' : 'Sin resultados'}
                  </div>
                  <div style={{ fontSize: '.82rem' }}>
                    {usuarios.length === 0
                      ? 'Agrega colaboradores y asígnales un rol para que puedan acceder al sistema.'
                      : 'No se encontraron usuarios que coincidan con la búsqueda.'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: T.surface3, position: 'sticky', top: 0 }}>
                      {['Usuario', 'Email', 'Rol', ...(isMultiLocal ? ['Sede'] : []), 'Estado', ''].map((h, i, arr) => (
                        <th key={i} style={{ padding: '10px 14px', textAlign: i === arr.length - 1 ? 'right' : 'left', fontFamily: "'IBM Plex Mono',monospace", fontSize: '.72rem', fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase' as const, color: T.text3, borderBottom: `1px solid ${T.line}`, whiteSpace: 'nowrap' as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsuarios.map(usuario => {
                      const av = avatarStyle(usuario.nombre || 'U');
                      const isHov = hoveredRow === usuario.id;
                      const rolColors = ROL_COLORS[usuario.rolNombre] ?? ROL_COLORS['VENDEDOR'];
                      return (
                        <tr
                          key={usuario.id}
                          onMouseEnter={() => setHoveredRow(usuario.id!)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{ background: isHov ? T.surface3 : T.surface, transition: 'background .12s' }}
                        >
                          {/* Usuario */}
                          <td style={{ padding: '11px 14px', borderTop: `1px solid ${T.lineSoft}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 9, background: av.bg, color: av.color, display: 'grid', placeItems: 'center', fontSize: '.76rem', fontWeight: 700, flexShrink: 0 }}>
                                {iniciales(usuario.nombre || 'U')}
                              </div>
                              <div>
                                <div style={{ fontSize: '.875rem', fontWeight: 650, color: T.text }}>{usuario.nombre || 'Sin nombre'}</div>
                              </div>
                            </div>
                          </td>
                          {/* Email */}
                          <td style={{ padding: '11px 14px', borderTop: `1px solid ${T.lineSoft}` }}>
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '.78rem', color: T.text2 }}>{usuario.email}</span>
                          </td>
                          {/* Rol */}
                          <td style={{ padding: '11px 14px', borderTop: `1px solid ${T.lineSoft}` }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px', borderRadius: 11, fontSize: '.74rem', fontWeight: 650, background: rolColors.bg, color: rolColors.color, border: `1px solid ${rolColors.border}` }}>
                              {ROL_LABELS[usuario.rolNombre] ?? usuario.rolNombre}
                            </span>
                          </td>
                          {/* Sede */}
                          {isMultiLocal && (
                            <td style={{ padding: '11px 14px', borderTop: `1px solid ${T.lineSoft}` }}>
                              {usuario.sucursalId ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.78rem', color: T.text2 }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                  {sucursales.find(s => s.id === usuario.sucursalId)?.nombre ?? `Sede #${usuario.sucursalId}`}
                                </span>
                              ) : (
                                <span style={{ fontSize: '.78rem', color: T.text3 }}>Todas</span>
                              )}
                            </td>
                          )}
                          {/* Estado */}
                          <td style={{ padding: '11px 14px', borderTop: `1px solid ${T.lineSoft}` }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 9px', borderRadius: 11, fontSize: '.74rem', fontWeight: 650, background: usuario.activo ? T.okSoft : T.surface2, color: usuario.activo ? T.ok : T.text3 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                              {usuario.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          {/* Acciones */}
                          <td style={{ padding: '11px 14px', borderTop: `1px solid ${T.lineSoft}`, textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                              {canToggleState('USUARIOS') && (
                                usuario.activo ? (
                                  <button type="button" onClick={() => handleDeactivate(usuario.id!)} title="Desactivar"
                                    style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface, cursor: 'pointer', display: 'grid', placeItems: 'center', color: T.warn }}
                                    onMouseEnter={e => (e.currentTarget.style.background = T.warnSoft)}
                                    onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM18 8l-4 4"/></svg>
                                  </button>
                                ) : (
                                  <button type="button" onClick={() => handleActivate(usuario.id!)} title="Activar"
                                    style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface, cursor: 'pointer', display: 'grid', placeItems: 'center', color: T.ok }}
                                    onMouseEnter={e => (e.currentTarget.style.background = T.okSoft)}
                                    onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M22 11l-6.5 6.5-3-3"/></svg>
                                  </button>
                                )
                              )}

                              {currentUserRole === 'ADMIN' && !usuario.activo && (
                                <button type="button" onClick={() => handleReenviarActivacion(usuario.id!)} title="Reenviar email de activación"
                                  style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface, cursor: 'pointer', display: 'grid', placeItems: 'center', color: T.primary }}
                                  onMouseEnter={e => (e.currentTarget.style.background = T.primarySoft)}
                                  onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z"/><polyline points="15,9 18,12 15,15"/><path d="M11.5 12H18"/></svg>
                                </button>
                              )}

                              {canEdit('USUARIOS') && (
                                <button type="button" onClick={() => handleEdit(usuario)} title="Editar"
                                  style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface, cursor: 'pointer', display: 'grid', placeItems: 'center', color: T.text2 }}
                                  onMouseEnter={e => (e.currentTarget.style.background = T.surface2)}
                                  onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>
                                </button>
                              )}

                              {canDelete('USUARIOS') && (
                                <button type="button" onClick={() => handleDelete(usuario.id!)} title="Eliminar"
                                  style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.line}`, background: T.surface, cursor: 'pointer', display: 'grid', placeItems: 'center', color: T.bad }}
                                  onMouseEnter={e => (e.currentTarget.style.background = T.badSoft)}
                                  onMouseLeave={e => (e.currentTarget.style.background = T.surface)}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredUsuarios.length > 0 && (
              <div style={{ borderTop: `1px solid ${T.lineSoft}`, padding: '10px 18px' }}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredUsuarios.length}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            )}
          </div>
        </>
      )}

      {formModal}
      {confirmModal}
    </div>
  );
}
