import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './landing.css';

export function LandingPage() {
  useEffect(() => {
    const header = document.querySelector('.landing-header');
    const handleScroll = () => {
      if (window.scrollY > 20) header?.classList.add('scrolled');
      else header?.classList.remove('scrolled');
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-page">
      {/* ===== HEADER ===== */}
      <header className="landing-header">
        <nav className="landing-nav">
          <a href="/" className="landing-logo" aria-label="Fluxus - Inicio">
            <img
              src="/fluxus.png"
              alt="Fluxus logo"
              className="landing-logo-icon"
            />
            <span className="landing-logo-text">Fluxus</span>
          </a>

          <ul className="landing-nav-links">
            <li><a href="#features">Módulos</a></li>
            <li><a href="#pricing">Precios</a></li>
            <li><a href="#demo">Demo</a></li>
          </ul>

          <div className="landing-nav-actions">
            <Link to="/login" className="btn-ghost">Iniciar Sesión</Link>
            <Link to="/register" className="btn-primary"><span>Empezar Gratis</span></Link>
          </div>
        </nav>
      </header>

      {/* ===== HERO ===== */}
      <section className="landing-hero">
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="landing-hero-content">
          {/* Left: Copy */}
          <div className="landing-hero-text">
            <div className="landing-hero-badge">
              <span className="landing-hero-badge-dot" />
              Mini‑ERP en la nube para tu negocio
            </div>

            <h1 className="landing-hero-title">
              Gestiona{' '}
              <span className="landing-hero-title-highlight">compras, ventas e inventario</span>
              {' '}en un solo sistema
            </h1>

            <p className="landing-hero-subtitle">
              Fluxus centraliza tu operación: órdenes de compra, recepciones, stock en tiempo real,
              ventas y reportes. Menos Excel, más control.
            </p>

            <div className="landing-hero-actions">
              <Link to="/register" className="btn-hero-primary">
                Empezar gratis
              </Link>
              <a href="#demo" className="btn-hero-secondary">
                ▶ Ver demo
              </a>
            </div>

            <div className="landing-hero-trust">
              <span className="landing-hero-trust-text">Sin tarjeta de crédito ·</span>
              <div className="landing-hero-trust-badges">
                <span className="landing-trust-badge">Soporte en español</span>
                <span className="landing-trust-badge">Multi‑usuario</span>
              </div>
            </div>
          </div>

          {/* Right: Dashboard Mockup */}
          <div className="landing-hero-visual">
            <div className="landing-dashboard-mockup">
              <div className="landing-mockup-bar">
                <span className="landing-mockup-dot red" />
                <span className="landing-mockup-dot yellow" />
                <span className="landing-mockup-dot green" />
              </div>
              <div className="landing-mockup-body">
                <div className="landing-mockup-stats">
                  <div className="landing-stat-card">
                    <div className="landing-stat-value">1,284</div>
                    <div className="landing-stat-label">Productos</div>
                  </div>
                  <div className="landing-stat-card">
                    <div className="landing-stat-value">S/98.4K</div>
                    <div className="landing-stat-label">Valor de stock</div>
                  </div>
                  <div className="landing-stat-card">
                    <div className="landing-stat-value" style={{ color: '#ff5050' }}>12</div>
                    <div className="landing-stat-label">Alertas</div>
                  </div>
                </div>

                <div className="landing-mockup-table">
                  <div className="landing-mockup-row header">
                    <span className="landing-mockup-cell header">Producto</span>
                    <span className="landing-mockup-cell header">Stock</span>
                    <span className="landing-mockup-cell header">Estado</span>
                  </div>
                  <div className="landing-mockup-row">
                    <span className="landing-mockup-cell name">Paracetamol 500mg</span>
                    <span className="landing-mockup-cell">248</span>
                    <span className="landing-stock-badge ok">OK</span>
                  </div>
                  <div className="landing-mockup-row">
                    <span className="landing-mockup-cell name">Ibuprofeno 400mg</span>
                    <span className="landing-mockup-cell">18</span>
                    <span className="landing-stock-badge low">BAJO</span>
                  </div>
                  <div className="landing-mockup-row">
                    <span className="landing-mockup-cell name">Amoxicilina 500mg</span>
                    <span className="landing-mockup-cell">3</span>
                    <span className="landing-stock-badge critical">CRÍTICO</span>
                  </div>
                  <div className="landing-mockup-row">
                    <span className="landing-mockup-cell name">Omeprazol 20mg</span>
                    <span className="landing-mockup-cell">152</span>
                    <span className="landing-stock-badge ok">OK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES / MODULES ===== */}
      <section className="landing-section landing-features" id="features">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">Módulos</span>
            <h2 className="landing-section-title">
              Un sistema modular que crece contigo
            </h2>
            <p className="landing-section-subtitle">
              Empieza con lo esencial y agrega módulos cuando tu operación lo necesite.
            </p>
          </div>

          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">📦</div>
              <h3 className="landing-feature-title">Inventario + Kardex</h3>
              <p className="landing-feature-desc">
                Movimientos en tiempo real, stock mínimo/máximo, trazabilidad y control por producto.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🧾</div>
              <h3 className="landing-feature-title">Compras y recepciones</h3>
              <p className="landing-feature-desc">
                Órdenes de compra, recepción de mercadería, validación de pendientes y control de costos.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🛒</div>
              <h3 className="landing-feature-title">Ventas</h3>
              <p className="landing-feature-desc">
                Registra ventas y actualiza el stock automáticamente. Historial y métricas por periodo.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">👥</div>
              <h3 className="landing-feature-title">Usuarios, roles y permisos</h3>
              <p className="landing-feature-desc">
                Controla qué puede hacer cada usuario por módulo: admin, compras, ventas, inventario, etc.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">📊</div>
              <h3 className="landing-feature-title">Reportes</h3>
              <p className="landing-feature-desc">
                Indicadores clave para decidir mejor: rotación, valorización, márgenes y tendencias.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🔁</div>
              <h3 className="landing-feature-title">Suscripciones (SaaS)</h3>
              <p className="landing-feature-desc">
                Planes, límites por cuenta y crecimiento por etapas (ideal para multi‑tenant).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DEMO ===== */}
      <section className="landing-section" id="demo">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">Demo</span>
            <h2 className="landing-section-title">Mira Fluxus en acción</h2>
            <p className="landing-section-subtitle">
              Crea una cuenta y prueba el flujo completo: OC → Recepción → Stock → Venta.
            </p>
          </div>

          <div className="landing-hero-actions" style={{ justifyContent: 'center' }}>
            <Link to="/register" className="btn-hero-primary">
              Crear cuenta
            </Link>
            <Link to="/login" className="btn-hero-secondary">
              Entrar a mi panel
            </Link>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="landing-section landing-pricing" id="pricing">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">Precios</span>
            <h2 className="landing-section-title">Planes simples y transparentes</h2>
            <p className="landing-section-subtitle">
              Empieza gratis y escala cuando lo necesites. Sin costos ocultos.
            </p>
          </div>

          <div className="landing-pricing-grid">
            <div className="landing-pricing-card">
              <div className="landing-pricing-plan">Starter</div>
              <div className="landing-pricing-price">
                <span>S/</span>0<sub>/mes</sub>
              </div>
              <p className="landing-pricing-description">
                Para comenzar a operar con lo esencial.
              </p>
              <div className="landing-pricing-divider" />
              <ul className="landing-pricing-features">
                <li><span className="check">✓</span> Hasta 100 productos</li>
                <li><span className="check">✓</span> 1 usuario</li>
                <li><span className="check">✓</span> Inventario básico</li>
                <li><span className="check">✓</span> Alertas de stock</li>
                <li><span className="cross">✗</span> Reportes avanzados</li>
                <li><span className="cross">✗</span> Múltiples sucursales</li>
              </ul>
              <Link to="/register" className="landing-pricing-cta outline">
                Empezar Gratis
              </Link>
            </div>

            <div className="landing-pricing-card featured">
              <div className="landing-pricing-badge">⭐ Más Popular</div>
              <div className="landing-pricing-plan">Pro</div>
              <div className="landing-pricing-price">
                <span>S/</span>99<sub>/mes</sub>
              </div>
              <p className="landing-pricing-description">
                Para negocios en crecimiento que necesitan más usuarios y reportes.
              </p>
              <div className="landing-pricing-divider" />
              <ul className="landing-pricing-features">
                <li><span className="check">✓</span> Productos ilimitados</li>
                <li><span className="check">✓</span> Hasta 10 usuarios</li>
                <li><span className="check">✓</span> Compras + Ventas + Inventario</li>
                <li><span className="check">✓</span> Reportes avanzados</li>
                <li><span className="check">✓</span> Roles y permisos</li>
                <li><span className="cross">✗</span> Múltiples sucursales</li>
              </ul>
              <Link to="/register" className="landing-pricing-cta primary">
                Probar Pro (30 días)
              </Link>
            </div>

            <div className="landing-pricing-card">
              <div className="landing-pricing-plan">Enterprise</div>
              <div className="landing-pricing-price" style={{ fontSize: '2rem' }}>
                A medida
              </div>
              <p className="landing-pricing-description">
                Para empresas con múltiples sedes y necesidades específicas.
              </p>
              <div className="landing-pricing-divider" />
              <ul className="landing-pricing-features">
                <li><span className="check">✓</span> Usuarios ilimitados</li>
                <li><span className="check">✓</span> Multi‑sucursal</li>
                <li><span className="check">✓</span> Integraciones</li>
                <li><span className="check">✓</span> Soporte prioritario</li>
              </ul>
              <a href="mailto:contacto@fluxus.pe" className="landing-pricing-cta outline">
                Contactar Ventas
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="landing-cta-section">
        <div className="landing-container">
          <h2 className="landing-cta-title">
            ¿Listo para operar tu negocio con{' '}
            <span className="landing-hero-title-highlight">más control</span>?
          </h2>
          <p className="landing-cta-subtitle">
            Fluxus es tu suite de compras, ventas e inventario en la nube.
          </p>
          <div className="landing-cta-actions">
            <Link to="/register" className="btn-accent">
              Empezar gratis
            </Link>
            <Link to="/login" className="btn-ghost">
              Ya tengo cuenta
            </Link>
          </div>
          <p className="landing-cta-note">
            Sin tarjeta de crédito · Cancela cuando quieras · Soporte en español
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <Link to="/" className="landing-logo" style={{ textDecoration: 'none' }}>
              <img
                src="/fluxus.png"
                alt="Fluxus logo"
                className="landing-logo-icon"
              />
              <span className="landing-logo-text">Fluxus</span>
            </Link>
            <p>
              Fluxus es una plataforma modular para gestionar compras, ventas e inventario.
              Hecha para negocios que quieren operar con orden y visibilidad.
            </p>
          </div>

          <div className="landing-footer-col">
            <h4>Producto</h4>
            <ul>
              <li><a href="#features">Módulos</a></li>
              <li><a href="#pricing">Precios</a></li>
              <li><a href="#demo">Demo</a></li>
              <li><Link to="/register">Registro</Link></li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <h4>Empresa</h4>
            <ul>
              <li><a href="#demo">Contacto</a></li>
              <li><a href="mailto:soporte@fluxus.pe">Soporte</a></li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Términos de Uso</a></li>
              <li><a href="#">Política de Privacidad</a></li>
              <li><a href="#">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <span className="landing-footer-copy">
            © {new Date().getFullYear()} Fluxus. Todos los derechos reservados.
          </span>
          <div className="landing-footer-links">
            <a href="#">Términos</a>
            <a href="#">Privacidad</a>
            <a href="mailto:contacto@fluxus.pe">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}