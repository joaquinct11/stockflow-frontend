import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './landing.css';

export function LandingPage() {
  useEffect(() => {
    const header = document.querySelector('.landing-header');
    const handleScroll = () => {
      if (window.scrollY > 20) {
        header?.classList.add('scrolled');
      } else {
        header?.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-page">
      {/* ===== HEADER ===== */}
      <header className="landing-header">
        <nav className="landing-nav">
          <a href="#" className="landing-logo">
            <div className="landing-logo-icon">📦</div>
            <span className="landing-logo-text">StockFlow</span>
          </a>

          <ul className="landing-nav-links">
            <li><a href="#features">Características</a></li>
            <li><a href="#pricing">Precios</a></li>
            <li><a href="#features">Demo</a></li>
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
              Gestión de inventario para farmacias y más
            </div>

            <h1 className="landing-hero-title">
              Controla tu stock{' '}
              <span className="landing-hero-title-highlight">
                en tiempo real
              </span>
              , sin esfuerzo
            </h1>

            <p className="landing-hero-subtitle">
              StockFlow te da visibilidad total de tu inventario: kardex, movimientos,
              alertas de stock mínimo, ventas y más — todo en un solo lugar.
            </p>

            <div className="landing-hero-actions">
              <Link to="/register" className="btn-hero-primary">
                🚀 Prueba Gratis 30 Días
              </Link>
              <a href="#features" className="btn-hero-secondary">
                ▶ Ver Demo
              </a>
            </div>

            <div className="landing-hero-trust">
              <span className="landing-hero-trust-text">Sin tarjeta de crédito ·</span>
              <div className="landing-hero-trust-badges">
                <span className="landing-trust-badge">SOC 2</span>
                <span className="landing-trust-badge">99.9% UP</span>
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
                    <div className="landing-stat-label">Valor Stock</div>
                  </div>
                  <div className="landing-stat-card">
                    <div className="landing-stat-value" style={{ color: '#ff5050' }}>12</div>
                    <div className="landing-stat-label">Bajo Stock</div>
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

      {/* ===== FEATURES ===== */}
      <section className="landing-section landing-features" id="features">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">Características</span>
            <h2 className="landing-section-title">
              Todo lo que necesitas para gestionar tu inventario
            </h2>
            <p className="landing-section-subtitle">
              Desde el kardex hasta las ventas, StockFlow centraliza cada movimiento
              de tu stock con precisión y velocidad.
            </p>
          </div>

          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">📋</div>
              <h3 className="landing-feature-title">Kardex en tiempo real</h3>
              <p className="landing-feature-desc">
                Historial completo por producto: saldo inicial, compras, ventas, ajustes
                y devoluciones. Calcula el stock acumulado con cada movimiento.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">📦</div>
              <h3 className="landing-feature-title">Control de Inventario</h3>
              <p className="landing-feature-desc">
                Gestiona tu catálogo con alertas automáticas de stock mínimo y máximo.
                Nunca más te quedas sin productos clave.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🛒</div>
              <h3 className="landing-feature-title">Gestión de Ventas</h3>
              <p className="landing-feature-desc">
                Registra ventas y actualiza el stock automáticamente. Genera comprobantes
                y lleva un historial detallado de cada transacción.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🏪</div>
              <h3 className="landing-feature-title">Proveedores y Compras</h3>
              <p className="landing-feature-desc">
                Administra proveedores, registra compras y controla costos unitarios.
                El inventario se actualiza con cada entrada de mercancía.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">📊</div>
              <h3 className="landing-feature-title">Reportes y Analíticas</h3>
              <p className="landing-feature-desc">
                Visualiza tendencias de ventas, rotación de productos y valor de inventario.
                Toma decisiones basadas en datos reales.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🔐</div>
              <h3 className="landing-feature-title">Roles y Permisos</h3>
              <p className="landing-feature-desc">
                Asigna roles específicos (Admin, Gestor de Inventario, Vendedor) y controla
                qué puede hacer cada usuario en el sistema.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="landing-section landing-pricing" id="pricing">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">Precios</span>
            <h2 className="landing-section-title">
              Planes simples y transparentes
            </h2>
            <p className="landing-section-subtitle">
              Empieza gratis y escala cuando lo necesites. Sin costos ocultos,
              sin contratos de permanencia.
            </p>
          </div>

          <div className="landing-pricing-grid">
            {/* Starter */}
            <div className="landing-pricing-card">
              <div className="landing-pricing-plan">Starter</div>
              <div className="landing-pricing-price">
                <span>S/</span>0<sub>/mes</sub>
              </div>
              <p className="landing-pricing-description">
                Perfecto para emprendedores y negocios pequeños que quieren comenzar a controlar su inventario.
              </p>
              <div className="landing-pricing-divider" />
              <ul className="landing-pricing-features">
                <li><span className="check">✓</span> Hasta 100 productos</li>
                <li><span className="check">✓</span> 1 usuario</li>
                <li><span className="check">✓</span> Kardex básico</li>
                <li><span className="check">✓</span> Alertas de stock</li>
                <li><span className="cross">✗</span> Reportes avanzados</li>
                <li><span className="cross">✗</span> Múltiples sucursales</li>
              </ul>
              <Link to="/register" className="landing-pricing-cta outline">
                Empezar Gratis
              </Link>
            </div>

            {/* Pro */}
            <div className="landing-pricing-card featured">
              <div className="landing-pricing-badge">⭐ Más Popular</div>
              <div className="landing-pricing-plan">Pro</div>
              <div className="landing-pricing-price">
                <span>S/</span>99<sub>/mes</sub>
              </div>
              <p className="landing-pricing-description">
                Para negocios en crecimiento que necesitan más usuarios, reportes y herramientas avanzadas.
              </p>
              <div className="landing-pricing-divider" />
              <ul className="landing-pricing-features">
                <li><span className="check">✓</span> Productos ilimitados</li>
                <li><span className="check">✓</span> Hasta 10 usuarios</li>
                <li><span className="check">✓</span> Kardex completo</li>
                <li><span className="check">✓</span> Alertas de stock</li>
                <li><span className="check">✓</span> Reportes avanzados</li>
                <li><span className="cross">✗</span> Múltiples sucursales</li>
              </ul>
              <Link to="/register" className="landing-pricing-cta primary">
                Prueba 30 Días Gratis
              </Link>
            </div>

            {/* Enterprise */}
            <div className="landing-pricing-card">
              <div className="landing-pricing-plan">Enterprise</div>
              <div className="landing-pricing-price" style={{ fontSize: '2rem' }}>
                A medida
              </div>
              <p className="landing-pricing-description">
                Para cadenas de tiendas y empresas con múltiples sucursales y necesidades específicas.
              </p>
              <div className="landing-pricing-divider" />
              <ul className="landing-pricing-features">
                <li><span className="check">✓</span> Productos ilimitados</li>
                <li><span className="check">✓</span> Usuarios ilimitados</li>
                <li><span className="check">✓</span> Kardex completo</li>
                <li><span className="check">✓</span> Alertas de stock</li>
                <li><span className="check">✓</span> Reportes avanzados</li>
                <li><span className="check">✓</span> Múltiples sucursales</li>
              </ul>
              <a href="mailto:contacto@stockflow.pe" className="landing-pricing-cta outline">
                Contactar Ventas
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="landing-cta-section">
        <div className="landing-container">
          <h2 className="landing-cta-title">
            ¿Listo para tomar el control de tu{' '}
            <span className="landing-hero-title-highlight">inventario</span>?
          </h2>
          <p className="landing-cta-subtitle">
            Únete a cientos de negocios que ya confían en StockFlow para gestionar
            su stock sin complicaciones.
          </p>
          <div className="landing-cta-actions">
            <Link to="/register" className="btn-accent">
              🚀 Prueba Gratis 30 Días
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
            <a href="#" className="landing-logo" style={{ textDecoration: 'none' }}>
              <div className="landing-logo-icon">📦</div>
              <span className="landing-logo-text">StockFlow</span>
            </a>
            <p>
              La plataforma de gestión de inventario diseñada para farmacias y negocios
              que necesitan control total de su stock.
            </p>
          </div>

          <div className="landing-footer-col">
            <h4>Producto</h4>
            <ul>
              <li><a href="#features">Características</a></li>
              <li><a href="#pricing">Precios</a></li>
              <li><a href="#features">Demo</a></li>
              <li><Link to="/register">Registro</Link></li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <h4>Empresa</h4>
            <ul>
              <li><a href="#">Sobre Nosotros</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Contacto</a></li>
              <li><a href="mailto:soporte@stockflow.pe">Soporte</a></li>
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
            © {new Date().getFullYear()} StockFlow. Todos los derechos reservados.
          </span>
          <div className="landing-footer-links">
            <a href="#">Términos</a>
            <a href="#">Privacidad</a>
            <a href="mailto:contacto@stockflow.pe">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
