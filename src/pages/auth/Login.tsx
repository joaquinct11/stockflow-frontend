import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import './login.css';

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [formData, setFormData] = useState({ email: '', contraseña: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const response = await authService.login(formData);
      try {
        const profile = await authService.obtenerPerfil();
        setUser({ ...response, permisos: profile.permisos || [] });
      } catch {
        setUser(response);
      }
      toast.success(`¡Bienvenido ${response.nombre}!`);
      const redirect = searchParams.get('redirect');
      navigate(redirect && redirect.startsWith('/') ? redirect : '/dashboard');
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('❌ Error en login:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lx">
      <div data-r="split" style={{height:'100vh',display:'grid',gridTemplateColumns:'1.05fr 1fr',background:'#08090d',overflow:'hidden'}}>

        {/* ── Panel izquierdo — marca ──────────────────────────────── */}
        <div data-r="brand" style={{position:'relative',overflow:'hidden',padding:'36px 56px',display:'flex',flexDirection:'column',background:'linear-gradient(160deg,#0b0d14,#08090d 55%)'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(108,99,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,.05) 1px,transparent 1px)',backgroundSize:'56px 56px',maskImage:'radial-gradient(90% 70% at 20% 10%,#000 20%,transparent 75%)',WebkitMaskImage:'radial-gradient(90% 70% at 20% 10%,#000 20%,transparent 75%)',pointerEvents:'none'}}></div>
          <div style={{position:'absolute',top:-220,left:-140,width:760,height:620,background:'radial-gradient(50% 50% at 50% 50%,rgba(108,99,255,.3),transparent 70%)',filter:'blur(30px)',pointerEvents:'none'}}></div>
          <div style={{position:'absolute',bottom:-260,right:-180,width:640,height:520,background:'radial-gradient(50% 50% at 50% 50%,rgba(0,212,170,.14),transparent 70%)',filter:'blur(30px)',pointerEvents:'none'}}></div>

          <Link to="/" style={{position:'relative',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <img src="/fluxus.png" alt="Fluxus" style={{width:34,height:34,borderRadius:9,objectFit:'cover'}} />
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:'1.15rem',fontWeight:700,background:'linear-gradient(135deg,#8b85ff,#00d4aa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Fluxus</span>
          </Link>

          <div style={{position:'relative',marginTop:'auto',paddingTop:56}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:9,background:'rgba(108,99,255,.1)',border:'1px solid rgba(108,99,255,.3)',color:'#a79fff',padding:'.35rem .9rem',borderRadius:50,fontFamily:"'Space Mono',monospace",fontSize:'.7rem',letterSpacing:'.07em',textTransform:'uppercase',whiteSpace:'nowrap'}}>
              <span className="lx-dot"></span>
              Sistema operativo
            </div>
            <h2 style={{fontSize:'clamp(1.9rem,3.2vw,2.7rem)',fontWeight:800,lineHeight:1.08,letterSpacing:'-.03em',margin:'22px 0 0',maxWidth:460}}>Tu negocio ordenado, desde que abres la caja.</h2>
            <p style={{fontSize:'1rem',lineHeight:1.65,color:'#9898b0',margin:'16px 0 0',maxWidth:420}}>Ventas, stock, compras y facturación electrónica en el mismo lugar. Todo lo que pasó hoy en tu local, a un clic.</p>
            <div style={{display:'grid',gap:13,marginTop:32,maxWidth:420}}>
              {['Comprobantes enviados a SUNAT con CDR guardado','Stock que se descuenta solo con cada venta','Cada usuario entra y ve solo lo que le toca'].map(t => (
                <div key={t} style={{display:'flex',gap:12,fontSize:'.94rem',color:'#d5d6e2'}}><span style={{color:'#00d4aa',flexShrink:0}}>✓</span>{t}</div>
              ))}
            </div>
          </div>

          <div style={{position:'relative',marginTop:'auto',paddingTop:48,display:'flex',flexWrap:'wrap',gap:'10px 24px',alignItems:'center'}}>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',letterSpacing:'.06em',textTransform:'uppercase',color:'#7d7f96'}}>Conexión segura</span>
            {['🔒 TLS 1.3','SUNAT integrado','Soporte en español'].map(t => (
              <span key={t} style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',color:'#8d90a6'}}>{t}</span>
            ))}
          </div>
        </div>

        {/* ── Panel derecho — formulario ───────────────────────────── */}
        <div data-r="pane" style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',padding:'24px 40px',background:'#0a0b10',borderLeft:'1px solid rgba(255,255,255,.06)',overflowY:'auto'}}>
          <div style={{width:'100%',maxWidth:404}}>

            {/* Logo móvil */}
            <div data-r="mobilelogo" style={{display:'none',alignItems:'center',gap:10,justifyContent:'center',marginBottom:28}}>
              <img src="/fluxus.png" alt="Fluxus" style={{width:32,height:32,borderRadius:9,objectFit:'cover'}} />
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:'1.1rem',fontWeight:700,background:'linear-gradient(135deg,#8b85ff,#00d4aa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Fluxus</span>
            </div>

            {/* Card */}
            <div data-r="formpad" style={{border:'1px solid rgba(255,255,255,.08)',borderRadius:20,background:'#0e0f15',padding:'28px 30px',boxShadow:'0 40px 90px -50px rgba(0,0,0,.9)'}}>
              <h1 style={{fontSize:'1.65rem',fontWeight:800,letterSpacing:'-.025em',margin:0}}>Bienvenido de nuevo</h1>
              <p style={{fontSize:'.94rem',color:'#7d7f96',lineHeight:1.6,margin:'8px 0 0'}}>Ingresa a tu cuenta para seguir operando.</p>

              {error && (
                <div className="lx-error">
                  <span style={{color:'#ff8079',fontSize:'.95rem',lineHeight:1.4,flexShrink:0}}>!</span>
                  <div style={{fontSize:'.88rem',color:'#ffb3ad',lineHeight:1.55}}>Email o contraseña incorrectos. Verifica tus datos e intenta de nuevo.</div>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{display:'grid',gap:14,marginTop:20}}>
                {/* Email */}
                <div style={{display:'grid',gap:8}}>
                  <label htmlFor="lx-email" style={{fontSize:'.85rem',fontWeight:600,color:'#c9cbd8'}}>Correo electrónico</label>
                  <input
                    id="lx-email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@empresa.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="lx-input"
                  />
                </div>

                {/* Contraseña */}
                <div style={{display:'grid',gap:8}}>
                  <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:12}}>
                    <label htmlFor="lx-pass" style={{fontSize:'.85rem',fontWeight:600,color:'#c9cbd8'}}>Contraseña</label>
                    <Link to="/forgot-password" className="lx-forgot">¿Olvidaste tu contraseña?</Link>
                  </div>
                  <div style={{position:'relative'}}>
                    <input
                      id="lx-pass"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={formData.contraseña}
                      onChange={e => setFormData({ ...formData, contraseña: e.target.value })}
                      required
                      className="lx-input lx-input-pass"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label="Mostrar u ocultar contraseña"
                      className="lx-pass-toggle"
                    >
                      {showPassword
                        ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c6.2 0 10 7 10 7a17.6 17.6 0 0 1-2.3 3.2"></path><path d="M6.6 6.7A17.2 17.2 0 0 0 2 12s3.8 7 10 7a9.7 9.7 0 0 0 4.2-.9"></path><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path><path d="m3 3 18 18"></path></svg>
                        : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      }
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="lx-submit">
                  {loading
                    ? <><span className="lx-spinner"></span>Ingresando...</>
                    : 'Iniciar sesión'
                  }
                </button>
              </form>

              {/* Divider */}
              <div style={{display:'flex',alignItems:'center',gap:14,margin:'18px 0 0'}}>
                <span style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}></span>
                <span style={{fontFamily:"'Outfit',sans-serif",fontSize:'.8rem',color:'#6a6c82'}}>o</span>
                <span style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}></span>
              </div>

              <Link to="/register" className="lx-ghost" style={{marginTop:14}}>Crear cuenta — 14 días gratis</Link>

              <p style={{fontSize:'.82rem',color:'#8d90a6',lineHeight:1.6,margin:'14px 0 0',textAlign:'center'}}>
                Sin tarjeta y sin permanencia. ¿Necesitas ayuda?{' '}
                <a href="https://wa.me/51994198710" target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a>.
              </p>
            </div>

            <p style={{fontFamily:"'Space Mono',monospace",fontSize:'.68rem',color:'#6a6c82',textAlign:'center',margin:'16px 0 0'}}>© 2026 Fluxus · Todos los derechos reservados</p>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Shared auth primitives ──────────────────────────────────────── */

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen min-h-[100dvh] flex flex-col items-center bg-slate-50 dark:bg-slate-950 overflow-x-hidden overflow-y-auto">
      {/* Glow de fondo — más pequeño en mobile */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[300px] w-[600px] sm:h-[500px] sm:w-[900px] rounded-full bg-primary/10 blur-[100px] sm:blur-[120px] opacity-50 dark:opacity-30" />
      </div>

      {/* Patrón de puntos */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Contenido centrado con scroll libre */}
      <div className="relative z-10 flex flex-col items-center w-full px-4 py-8 sm:py-16 safe-bottom">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6 sm:mb-8 select-none">
          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-2.5">
            <img
              src="/fluxus.png"
              alt="Fluxus"
              className="h-5 w-5 sm:h-6 sm:w-6"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight">Fluxus</span>
          <span className="text-[10px] text-muted-foreground font-medium tracking-widest mt-0.5 uppercase">
            ERP · Gestión
          </span>
        </div>

        {/* Card */}
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

export function AuthCard({
  title,
  description,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={[
        'mx-auto w-full',
        wide ? 'max-w-md' : 'max-w-sm',
        'rounded-xl sm:rounded-2xl',
        'border border-slate-200 dark:border-slate-800',
        'bg-white dark:bg-slate-900',
        'shadow-lg shadow-slate-200/70 dark:shadow-black/50',
        'p-5 sm:p-8',
      ].join(' ')}
    >
      <div className={description ? 'mb-5 sm:mb-6' : 'mb-3 sm:mb-4'}>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  show,
  onToggle,
  onChange,
  placeholder = '••••••••',
}: {
  id: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="h-11 pr-11"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      {label}
    </span>
  );
}

export function AuthFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 sm:mt-5 text-center text-sm text-muted-foreground border-t border-border/60 pt-4 sm:pt-5">
      {children}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/60" />
      </div>
    </div>
  );
}
