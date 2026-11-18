export function GREComingSoon() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem 1rem',
      textAlign: 'center',
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'var(--primary-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem',
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <path d="M16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      </div>

      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--text)',
        marginBottom: '0.75rem',
        lineHeight: 1.3,
      }}>
        ¡Estamos preparando algo nuevo!
      </h1>

      <p style={{
        fontSize: '1rem',
        color: 'var(--text-2)',
        maxWidth: 420,
        lineHeight: 1.6,
      }}>
        Muy pronto podrás gestionar tus guías de remisión electrónicas directamente desde Fluxus.
      </p>
    </div>
  );
}
