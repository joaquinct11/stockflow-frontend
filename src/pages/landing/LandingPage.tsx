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
            <li><a href="#pricing">Precio</a></li>
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
              Del pedido a la{' '}
              <span className="landing-hero-title-highlight">factura electrónica</span>
              {', '}todo en un solo sistema
            </h1>

            <p className="landing-hero-subtitle">
              POS con caja integrada, inventario en tiempo real, compras, devoluciones,
              notas de crédito y facturación electrónica compatible con tu OSE (Nubefact, Alegra, Efact y más).
              Sin apps separadas, sin Excel.
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
            <h2 className="landing-section-title">Del pedido a la factura electrónica, todo conectado</h2>
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
                <p>Registra lo recibido. El stock se actualiza automáticamente.</p>
              </div>
            </div>
            <div className="landing-flow-arrow">→</div>
            <div className="landing-flow-step">
              <div className="landing-flow-number">3</div>
              <div className="landing-flow-content">
                <h4>Venta en el POS</h4>
                <p>Cobra con caja integrada, busca productos al instante y acepta cualquier método de pago.</p>
              </div>
            </div>
            <div className="landing-flow-arrow">→</div>
            <div className="landing-flow-step">
              <div className="landing-flow-number">4</div>
              <div className="landing-flow-content">
                <h4>Facturación electrónica</h4>
                <p>Emite boletas y facturas desde la venta. Fluxus las envía a SUNAT a través de tu OSE (Nubefact, Alegra, Efact, etc.).</p>
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
              Nueve módulos integrados que trabajan juntos. Sin apps separadas, sin doble ingreso.
            </p>
          </div>

          <div className="landing-features-grid">

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🖥️</div>
              <h3 className="landing-feature-title">Punto de Venta (POS)</h3>
              <p className="landing-feature-desc">
                POS ágil con búsqueda instantánea de productos por nombre, atajos de teclado
                (F2 cobrar, F4 limpiar) y cálculo automático de vuelto.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">💰</div>
              <h3 className="landing-feature-title">Caja registradora</h3>
              <p className="landing-feature-desc">
                Apertura y cierre de caja con fondo de apertura, totales por método de pago
                (efectivo, tarjeta, Yape/Plin) y control de diferencias al cierre.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🔄</div>
              <h3 className="landing-feature-title">Devoluciones y notas de crédito</h3>
              <p className="landing-feature-desc">
                Registra devoluciones totales o parciales con reposición de stock automática.
                Emite notas de crédito aplicables como descuento directamente en el POS.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">📦</div>
              <h3 className="landing-feature-title">Inventario en tiempo real</h3>
              <p className="landing-feature-desc">
                Stock actualizado con cada compra y venta. Alertas de mínimo,
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
                Registra ventas en efectivo, tarjeta o Yape/Plin. Calcula subtotal,
                IGV configurable y vuelto automático. Historial completo por vendedor y período.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🧾</div>
              <h3 className="landing-feature-title">Facturación electrónica</h3>
              <p className="landing-feature-desc">
                Emite boletas y facturas desde cada venta. Fluxus se conecta a tu cuenta OSE
                (Nubefact, Alegra, Efact u otro compatible) para el envío a SUNAT, CDR oficial
                y descarga del XML y PDF.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">👥</div>
              <h3 className="landing-feature-title">Roles y permisos</h3>
              <p className="landing-feature-desc">
                Tres roles simples: Administrador, Vendedor y Almacenero.
                Cada rol tiene acceso exactamente a lo que necesita, sin configuraciones complicadas.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">📊</div>
              <h3 className="landing-feature-title">Reportes y métricas</h3>
              <p className="landing-feature-desc">
                Ingresos por período, ticket promedio, productos más vendidos, rotación
                de inventario, kardex y exportación a Excel y PDF.
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
              <p>POS rápido con caja integrada, historial diario y control de proveedores.</p>
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
            <span className="landing-section-label">Precio</span>
            <h2 className="landing-section-title">Un solo plan, todo incluido</h2>
            <p className="landing-section-subtitle">
              Sin versión recortada. Sin sorpresas. Todo lo que necesita tu negocio desde el primer día.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="landing-pricing-card featured" style={{ maxWidth: '480px', width: '100%' }}>
              <div className="landing-pricing-badge">✅ Todo incluido</div>
              <div className="landing-pricing-plan">Plan Básico</div>
              <div className="landing-pricing-price">
                <span>S/</span>129<sub>/mes</sub>
              </div>
              <p className="landing-pricing-description">
                14 días de prueba gratuita. Sin tarjeta hasta que decidas quedarte. Cancela cuando quieras.
              </p>
              <div className="landing-pricing-divider" />
              <ul className="landing-pricing-features">
                <li><span className="check">✓</span> <strong>POS</strong> con caja integrada (efectivo, tarjeta, Yape/Plin)</li>
                <li><span className="check">✓</span> Inventario en tiempo real con alertas de stock mínimo</li>
                <li><span className="check">✓</span> Control de lotes y fechas de vencimiento</li>
                <li><span className="check">✓</span> Órdenes de compra y recepciones a proveedores</li>
                <li><span className="check">✓</span> Devoluciones y notas de crédito aplicables en POS</li>
                <li><span className="check">✓</span> Facturación electrónica: boletas y facturas</li>
                <li><span className="check">✓</span> <strong>🏛 Facturación electrónica</strong> compatible con Nubefact, Alegra, Efact y más <span style={{ fontSize: '11px', opacity: 0.7 }}>(requiere cuenta OSE propia)</span></li>
                <li><span className="check">✓</span> Reportes históricos sin límite de fecha</li>
                <li><span className="check">✓</span> Exportación a Excel y PDF</li>
                <li><span className="check">✓</span> 3 roles: Administrador, Vendedor y Almacenero</li>
                <li><span className="check">✓</span> Permisos por módulo configurables por usuario</li>
                <li><span className="check">✓</span> Hasta 10 usuarios</li>
                <li><span className="check">✓</span> Soporte por WhatsApp en español</li>
              </ul>
              {/* CTA principal → página de compra (carrito) */}
              <Link to="/plan" className="landing-pricing-cta primary">
                Contratar Plan Básico — S/ 129/mes
              </Link>
              <Link to="/register?plan=BASICO" className="landing-pricing-cta" style={{ marginTop: '10px', background: 'transparent', border: '1px solid currentColor', opacity: 0.75 }}>
                Probar 14 días gratis
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
              Mini‑ERP para negocios peruanos. POS, inventario, compras, devoluciones
              y facturación electrónica compatible con tu OSE en una sola plataforma.
            </p>
            {/* Datos legales de la empresa */}
            <p style={{ fontSize: '11px', marginTop: '8px', opacity: 0.6, lineHeight: 1.6 }}>
              Joaquin Castillo Tello · RUC: 10769109566<br />
              Jr. Libertad 455, Magdalena del Mar, Lima<br />
              Nombre comercial: Fluxus
            </p>
          </div>

          <div className="landing-footer-col">
            <h4>Producto</h4>
            <ul>
              <li><a href="#features">Módulos</a></li>
              <li><a href="#para-quien">¿Para quién?</a></li>
              <li><a href="#pricing">Precio</a></li>
              <li><Link to="/plan">Contratar ahora</Link></li>
              <li><Link to="/register?plan=BASICO">Crear cuenta</Link></li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <h4>Empresa</h4>
            <ul>
              <li><a href="mailto:contacto@fluxus.pe">Contacto</a></li>
              <li><a href="mailto:contacto@fluxus.pe">Soporte técnico</a></li>
              <li><a href="https://wa.me/51999999999" target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/terminos">Términos y Condiciones</Link></li>
              <li><Link to="/privacidad">Política de Privacidad</Link></li>
              <li><Link to="/reclamaciones">Libro de Reclamaciones</Link></li>
            </ul>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <span className="landing-footer-copy">
            © {new Date().getFullYear()} Joaquin Castillo Tello (Fluxus) · RUC 10769109566 · Magdalena del Mar, Lima
          </span>
          <div className="landing-footer-links">
            <Link to="/terminos">Términos</Link>
            <Link to="/privacidad">Privacidad</Link>
            <Link to="/reclamaciones">Reclamaciones</Link>
            <a href="mailto:contacto@fluxus.pe">Contacto</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
