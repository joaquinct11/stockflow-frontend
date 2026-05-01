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
            <img src="/fluxus.png" alt="Fluxus logo" className="landing-logo-icon" />
            <span className="landing-logo-text">Fluxus</span>
          </a>

          <ul className="landing-nav-links">
            <li><a href="#features">Módulos</a></li>
            <li><a href="#para-quien">¿Para quién?</a></li>
            <li><a href="#pricing">Precios</a></li>
          </ul>

          <div className="landing-nav-actions">
            <Link to="/login" className="btn-ghost">Iniciar Sesión</Link>
            <Link to="/register?plan=BASICO" className="btn-primary"><span>Probar 14 días</span></Link>
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
              Mini‑ERP para negocios peruanos
            </div>

            <h1 className="landing-hero-title">
              Controla tus{' '}
              <span className="landing-hero-title-highlight">compras, stock y ventas</span>
              {' '}desde un solo lugar
            </h1>

            <p className="landing-hero-subtitle">
              Órdenes de compra, recepciones, inventario en tiempo real, ventas con IGV
              y facturación electrónica. Todo conectado, sin complicaciones.
            </p>

            <div className="landing-hero-actions">
              <Link to="/register?plan=BASICO" className="btn-hero-primary">
                Probar 14 días gratis
              </Link>
              <a href="#features" className="btn-hero-secondary">
                Ver módulos
              </a>
            </div>

            <div className="landing-hero-trust">
              <span className="landing-hero-trust-text">Sin permanencia ·</span>
              <div className="landing-hero-trust-badges">
                <span className="landing-trust-badge">Soporte en español</span>
                <span className="landing-trust-badge">Multi‑usuario</span>
                <span className="landing-trust-badge">Datos seguros</span>
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

      {/* ===== FLUJO ===== */}
      <section className="landing-section landing-flow">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">Cómo funciona</span>
            <h2 className="landing-section-title">Del pedido al cliente, todo conectado</h2>
            <p className="landing-section-subtitle">
              Un flujo unificado que elimina el trabajo doble y los errores en Excel.
            </p>
          </div>

          <div className="landing-flow-steps">
            <div className="landing-flow-step">
              <div className="landing-flow-number">1</div>
              <div className="landing-flow-content">
                <h4>Orden de compra</h4>
                <p>Genera OCs a tus proveedores con cantidad y precio pactado.</p>
              </div>
            </div>
            <div className="landing-flow-arrow">→</div>
            <div className="landing-flow-step">
              <div className="landing-flow-number">2</div>
              <div className="landing-flow-content">
                <h4>Recepción</h4>
                <p>Registra lo recibido, lote y vencimiento. El stock se actualiza solo.</p>
              </div>
            </div>
            <div className="landing-flow-arrow">→</div>
            <div className="landing-flow-step">
              <div className="landing-flow-number">3</div>
              <div className="landing-flow-content">
                <h4>Venta</h4>
                <p>Registra la venta, descuenta stock y calcula IGV automáticamente.</p>
              </div>
            </div>
            <div className="landing-flow-arrow">→</div>
            <div className="landing-flow-step">
              <div className="landing-flow-number">4</div>
              <div className="landing-flow-content">
                <h4>Comprobante</h4>
                <p>Emite boleta o factura electrónica directamente desde la venta.</p>
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
              Todo lo que necesita tu negocio, en un solo sistema
            </h2>
            <p className="landing-section-subtitle">
              Módulos integrados que trabajan juntos. Sin apps separadas, sin doble ingreso.
            </p>
          </div>

          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">📦</div>
              <h3 className="landing-feature-title">Inventario en tiempo real</h3>
              <p className="landing-feature-desc">
                Stock actualizado automáticamente con cada compra y venta. Alertas de mínimo,
                kardex completo y control por lote y fecha de vencimiento.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🛍️</div>
              <h3 className="landing-feature-title">Compras y recepciones</h3>
              <p className="landing-feature-desc">
                Órdenes de compra con estados (borrador → enviada → recibida), recepciones
                parciales y propagación automática del costo al inventario.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🛒</div>
              <h3 className="landing-feature-title">Ventas con IGV</h3>
              <p className="landing-feature-desc">
                Registra ventas en efectivo, tarjeta o transferencia. Calcula subtotal,
                IGV 18% y vuelto. Historial completo por vendedor y período.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🧾</div>
              <h3 className="landing-feature-title">Facturación electrónica</h3>
              <p className="landing-feature-desc">
                Emite boletas y facturas electrónicas directamente desde cada venta.
                Registro de RUC, razón social y control de comprobantes emitidos.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">👥</div>
              <h3 className="landing-feature-title">Roles y permisos</h3>
              <p className="landing-feature-desc">
                Define qué puede hacer cada usuario: admin, gerente, vendedor, gestor de
                inventario. Permisos granulares por módulo y acción.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">📊</div>
              <h3 className="landing-feature-title">Reportes y métricas</h3>
              <p className="landing-feature-desc">
                Ingresos por período, ticket promedio, productos más vendidos, rotación
                de inventario y alertas de vencimiento próximo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PARA QUIÉN ===== */}
      <section className="landing-section" id="para-quien">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">¿Para quién es?</span>
            <h2 className="landing-section-title">Diseñado para negocios que mueven producto</h2>
          </div>

          <div className="landing-audience-grid">
            <div className="landing-audience-card">
              <div className="landing-audience-icon">💊</div>
              <h4>Farmacias y boticas</h4>
              <p>Control de lotes, fechas de vencimiento y stock crítico por producto.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">🏪</div>
              <h4>Tiendas y bodegas</h4>
              <p>Ventas rápidas con vuelto, historial diario y control de proveedores.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">🔧</div>
              <h4>Ferreterías y distribuidoras</h4>
              <p>OCs a varios proveedores, recepciones parciales y costos de compra.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">📦</div>
              <h4>Almacenes y depósitos</h4>
              <p>Movimientos de inventario, kardex y reportes de valorización de stock.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="landing-section landing-pricing" id="pricing">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">Precios</span>
            <h2 className="landing-section-title">Dos planes, sin letra chica</h2>
            <p className="landing-section-subtitle">
              14 días de prueba incluidos en ambos planes. Sin tarjeta hasta que decidas quedarte.
            </p>
          </div>

          <div className="landing-pricing-grid landing-pricing-grid-2">

            {/* BÁSICO */}
            <div className="landing-pricing-card">
              <div className="landing-pricing-plan">Básico</div>
              <div className="landing-pricing-price">
                <span>S/</span>49.99<sub>/mes</sub>
              </div>
              <p className="landing-pricing-description">
                Para negocios pequeños que necesitan orden en su inventario y ventas.
              </p>
              <div className="landing-pricing-divider" />
              <ul className="landing-pricing-features">
                <li><span className="check">✓</span> Hasta 500 productos</li>
                <li><span className="check">✓</span> Hasta 3 usuarios</li>
                <li><span className="check">✓</span> Inventario + alertas de stock mínimo</li>
                <li><span className="check">✓</span> Compras y recepciones</li>
                <li><span className="check">✓</span> Ventas (efectivo / tarjeta)</li>
                <li><span className="check">✓</span> Reportes últimos 30 días</li>
                <li><span className="check">✓</span> 1 rol de administrador</li>
                <li><span className="cross">✗</span> Facturación electrónica</li>
                <li><span className="cross">✗</span> Control de lotes y vencimientos</li>
                <li><span className="cross">✗</span> Roles y permisos avanzados</li>
                <li><span className="cross">✗</span> Reportes históricos sin límite</li>
              </ul>
              <Link to="/register?plan=BASICO" className="landing-pricing-cta outline">
                Probar 14 días gratis
              </Link>
            </div>

            {/* PRO */}
            <div className="landing-pricing-card featured">
              <div className="landing-pricing-badge">⭐ Recomendado</div>
              <div className="landing-pricing-plan">Pro</div>
              <div className="landing-pricing-price">
                <span>S/</span>99.99<sub>/mes</sub>
              </div>
              <p className="landing-pricing-description">
                Para negocios en crecimiento que necesitan trazabilidad, facturación y control total.
              </p>
              <div className="landing-pricing-divider" />
              <ul className="landing-pricing-features">
                <li><span className="check">✓</span> Productos ilimitados</li>
                <li><span className="check">✓</span> Hasta 10 usuarios</li>
                <li><span className="check">✓</span> Todo lo del plan Básico</li>
                <li><span className="check">✓</span> <strong>Facturación electrónica</strong> (boletas y facturas)</li>
                <li><span className="check">✓</span> <strong>Control de lotes y fechas de vencimiento</strong></li>
                <li><span className="check">✓</span> <strong>Roles y permisos por módulo</strong> (RBAC completo)</li>
                <li><span className="check">✓</span> Reportes históricos sin límite de fecha</li>
                <li><span className="check">✓</span> Alertas de vencimiento próximo</li>
                <li><span className="check">✓</span> Recepciones parciales de OC</li>
                <li><span className="check">✓</span> Múltiples proveedores con historial</li>
                <li><span className="check">✓</span> Soporte prioritario por WhatsApp</li>
              </ul>
              <Link to="/register?plan=PRO" className="landing-pricing-cta primary">
                Probar Pro 14 días gratis
              </Link>
            </div>

          </div>

          <p className="landing-pricing-note">
            ¿Más de 10 usuarios o necesidades especiales?{' '}
            <a href="mailto:contacto@fluxus.pe">Contáctanos</a> para un plan a medida.
          </p>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="landing-cta-section">
        <div className="landing-container">
          <h2 className="landing-cta-title">
            ¿Listo para operar con{' '}
            <span className="landing-hero-title-highlight">más orden y control</span>?
          </h2>
          <p className="landing-cta-subtitle">
            Empieza hoy. 14 días de prueba, sin tarjeta de crédito, sin permanencia.
          </p>
          <div className="landing-cta-actions">
            <Link to="/register?plan=BASICO" className="btn-accent">
              Crear mi cuenta gratis
            </Link>
            <Link to="/login" className="btn-ghost">
              Ya tengo cuenta
            </Link>
          </div>
          <p className="landing-cta-note">
            Sin permanencia · Cancela cuando quieras · Soporte en español
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <Link to="/" className="landing-logo" style={{ textDecoration: 'none' }}>
              <img src="/fluxus.png" alt="Fluxus logo" className="landing-logo-icon" />
              <span className="landing-logo-text">Fluxus</span>
            </Link>
            <p>
              Sistema de gestión para negocios que mueven producto: compras, inventario,
              ventas y facturación en una sola plataforma.
            </p>
          </div>

          <div className="landing-footer-col">
            <h4>Producto</h4>
            <ul>
              <li><a href="#features">Módulos</a></li>
              <li><a href="#para-quien">¿Para quién?</a></li>
              <li><a href="#pricing">Precios</a></li>
              <li><Link to="/register?plan=BASICO">Crear cuenta</Link></li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <h4>Empresa</h4>
            <ul>
              <li><a href="mailto:contacto@fluxus.pe">Contacto</a></li>
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
