import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface LegalLayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

const NAV_LINKS = [
  { to: '/terminos',       label: 'Términos y Condiciones' },
  { to: '/privacidad',     label: 'Política de Privacidad' },
  { to: '/reclamaciones',  label: 'Reclamaciones' },
];

export function LegalLayout({ children, maxWidth = 'md' }: LegalLayoutProps) {
  const { pathname } = useLocation();
  const widthClass = maxWidth === 'sm' ? 'max-w-2xl' : maxWidth === 'lg' ? 'max-w-4xl' : 'max-w-3xl';

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: '#0a0a0f', color: '#e8e8f0', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className={`${widthClass} mx-auto px-4 py-3 flex items-center justify-between`}>
          <Link to="/" className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: '#9898b0' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e8e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9898b0')}>
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <Link to="/" className="flex items-center gap-2 no-underline">
            <img src="/fluxus.png" alt="Fluxus" style={{ height: '24px', width: '24px', objectFit: 'contain' }} />
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#e8e8f0' }}>Fluxus</span>
          </Link>
        </div>

        {/* Sub-nav */}
        <div className={`${widthClass} mx-auto px-4 pb-0`}>
          <nav className="flex gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {NAV_LINKS.map(({ to, label }) => {
              const active = pathname === to;
              return (
                <Link key={to} to={to}
                  className="shrink-0 px-4 py-2.5 text-sm font-medium transition-colors relative no-underline"
                  style={{ color: active ? '#6c63ff' : '#9898b0', borderBottom: active ? '2px solid #6c63ff' : '2px solid transparent' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#e8e8f0'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#9898b0'; }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── Content ── */}
      <main className={`${widthClass} mx-auto px-4 py-12`}>
        {children}
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '48px' }}>
        <div className={`${widthClass} mx-auto px-4 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
          <p style={{ fontSize: '12px', color: '#5a5a72' }}>
            © {new Date().getFullYear()} Joaquin Castillo Tello · RUC 10769109566 · Fluxus
          </p>
          <div className="flex gap-4">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} style={{ fontSize: '12px', color: '#5a5a72', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#9898b0')}
                onMouseLeave={e => (e.currentTarget.style.color = '#5a5a72')}>
                {label.split(' ')[0]}
              </Link>
            ))}
            <a href="mailto:contacto@fluxus.pe" style={{ fontSize: '12px', color: '#5a5a72', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#9898b0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#5a5a72')}>
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Sección numerada ──────────────────────────────────────────────────────────
interface SectionProps {
  num: number;
  title: string;
  children: ReactNode;
}

export function LegalSection({ num, title, children }: SectionProps) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <div className="flex items-start gap-3 mb-4">
        <span style={{
          flexShrink: 0,
          width: '28px', height: '28px',
          borderRadius: '8px',
          background: 'rgba(108,99,255,0.15)',
          border: '1px solid rgba(108,99,255,0.3)',
          color: '#6c63ff',
          fontSize: '12px',
          fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: '2px',
        }}>
          {num}
        </span>
        <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#e8e8f0', lineHeight: '1.4' }}>
          {title}
        </h2>
      </div>
      <div style={{ paddingLeft: '40px', color: '#9898b0', fontSize: '14px', lineHeight: '1.75' }}>
        {children}
      </div>
    </section>
  );
}

// ── Info box ──────────────────────────────────────────────────────────────────
export function LegalInfoBox({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: '16px 20px',
      borderRadius: '12px',
      background: 'rgba(108,99,255,0.06)',
      border: '1px solid rgba(108,99,255,0.2)',
      marginBottom: '40px',
      fontSize: '13px',
      color: '#9898b0',
      lineHeight: '1.8',
    }}>
      {children}
    </div>
  );
}

// ── Page title block ──────────────────────────────────────────────────────────
interface LegalPageTitleProps {
  icon: string;
  title: string;
  subtitle?: string;
  badge?: string;
}

export function LegalPageTitle({ icon, title, subtitle, badge }: LegalPageTitleProps) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>{icon}</div>
      <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#e8e8f0', letterSpacing: '-0.5px', marginBottom: '8px' }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: '14px', color: '#5a5a72', marginBottom: badge ? '12px' : 0 }}>
          {subtitle}
        </p>
      )}
      {badge && (
        <span style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: '20px',
          background: 'rgba(108,99,255,0.1)',
          border: '1px solid rgba(108,99,255,0.25)',
          color: '#8b85ff',
          fontSize: '11px',
          fontWeight: 600,
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}
