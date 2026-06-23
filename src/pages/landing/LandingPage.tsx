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
              Vende más, pierde menos{' '}
              <span className="landing-hero-title-highlight">y lleva el control</span>
              {' '}de todo en un solo lugar
            </h1>

            <p className="landing-hero-subtitle">
              POS con caja integrada, inventario en tiempo real, compras, devoluciones,
              notas de crédito y <strong>facturación electrónica integrada</strong> que envía tus
              boletas y facturas directo a SUNAT. Sin apps separadas, sin Excel.
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
                <span className="landing-trust-badge">SUNAT integrado</span>
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
                    <div className="landing-stat-value">S/12.4K</div>
                    <div className="landing-stat-label">Ventas hoy</div>
                  </div>
                  <div className="landing-stat-card">
                    <div className="landing-stat-value">348</div>
                    <div className="landing-stat-label">Productos</div>
                  </div>
                  <div className="landing-stat-card">
                    <div className="landing-stat-value" style={{ color: '#ff5050' }}>5</div>
                    <div className="landing-stat-label">Stock bajo</div>
                  </div>
                </div>

                <div className="landing-mockup-table">
                  <div className="landing-mockup-row header">
                    <span className="landing-mockup-cell header">Producto</span>
                    <span className="landing-mockup-cell header">Stock</span>
                    <span className="landing-mockup-cell header">Estado</span>
                  </div>
                  <div className="landing-mockup-row">
                    <span className="landing-mockup-cell name">Polo Básico Blanco M</span>
                    <span className="landing-mockup-cell">84</span>
                    <span className="landing-stock-badge ok">OK</span>
                  </div>
                  <div className="landing-mockup-row">
                    <span className="landing-mockup-cell name">Zapatillas Runner 42</span>
                    <span className="landing-mockup-cell">12</span>
                    <span className="landing-stock-badge low">BAJO</span>
                  </div>
                  <div className="landing-mockup-row">
                    <span className="landing-mockup-cell name">Paracetamol 500mg</span>
                    <span className="landing-mockup-cell">210</span>
                    <span className="landing-stock-badge ok">OK</span>
                  </div>
                  <div className="landing-mockup-row">
                    <span className="landing-mockup-cell name">Tornillo Hexagonal 3/8"</span>
                    <span className="landing-mockup-cell">3</span>
                    <span className="landing-stock-badge critical">CRÍTICO</span>
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
                <p>Genera OCs a tus proveedores con cantidades y precios pactados.</p>
              </div>
            </div>
            <div className="landing-flow-arrow">→</div>
            <div className="landing-flow-step">
              <div className="landing-flow-number">2</div>
              <div className="landing-flow-content">
                <h4>Recepción</h4>
                <p>Registra lo que llega. El stock sube automáticamente al guardar.</p>
              </div>
            </div>
            <div className="landing-flow-arrow">→</div>
            <div className="landing-flow-step">
              <div className="landing-flow-number">3</div>
              <div className="landing-flow-content">
                <h4>Venta en el POS</h4>
                <p>Cobra en efectivo, tarjeta o Yape/Plin con caja integrada y vuelto automático.</p>
              </div>
            </div>
            <div className="landing-flow-arrow">→</div>
            <div className="landing-flow-step">
              <div className="landing-flow-number">4</div>
              <div className="landing-flow-content">
                <h4>Factura a SUNAT</h4>
                <p>Emite boletas y facturas desde la venta. Fluxus las envía a SUNAT al instante y guarda el CDR oficial.</p>
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
                POS ágil con búsqueda instantánea por nombre o código de barras, atajos de teclado
                (F2 cobrar, F4 limpiar) y cálculo automático de vuelto.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">💰</div>
              <h3 className="landing-feature-title">Caja registradora</h3>
              <p className="landing-feature-desc">
                Apertura y cierre de caja con fondo inicial, totales por método de pago
                (efectivo, tarjeta, Yape/Plin) y control de diferencias al cierre.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🧾</div>
              <h3 className="landing-feature-title">Facturación electrónica integrada</h3>
              <p className="landing-feature-desc">
                Emite boletas y facturas directamente desde cada venta. Fluxus las envía a SUNAT
                de forma automática y descarga el CDR oficial, XML y PDF sin pasos extra.
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
                parciales y actualización automática del costo al inventario.
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
              <div className="landing-feature-icon">🛒</div>
              <h3 className="landing-feature-title">Historial de ventas</h3>
              <p className="landing-feature-desc">
                Registro completo por vendedor y período. Anula ventas con un clic y revierte
                el stock automáticamente. Filtra por fecha, método de pago o estado.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">👥</div>
              <h3 className="landing-feature-title">Roles y permisos</h3>
              <p className="landing-feature-desc">
                Administrador, Gerente, Vendedor y más. Configura exactamente a qué módulos
                y acciones tiene acceso cada usuario de tu equipo.
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
            <p className="landing-section-subtitle">
              Fluxus se adapta a tu rubro. Cada tipo de negocio ve solo lo que necesita.
            </p>
          </div>

          <div className="landing-audience-grid">
            <div className="landing-audience-card">
              <div className="landing-audience-icon">💊</div>
              <h4>Farmacias y boticas</h4>
              <p>Control de lotes, fechas de vencimiento, registro sanitario y alertas de stock crítico por producto.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">👗</div>
              <h4>Tiendas de ropa</h4>
              <p>Gestión por talla y color, control de stock por variante y POS rápido con búsqueda por categoría.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">🏪</div>
              <h4>Tiendas y bodegas</h4>
              <p>POS rápido con caja integrada, historial diario de ventas y control de proveedores.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">🔧</div>
              <h4>Ferreterías y distribuidoras</h4>
              <p>OCs a varios proveedores, recepciones parciales y costos de compra actualizados en tiempo real.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">🛒</div>
              <h4>Minimarkets</h4>
              <p>Manejo de múltiples categorías, POS por código de barras y control de merma y vencimientos.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">📦</div>
              <h4>Almacenes y depósitos</h4>
              <p>Movimientos de inventario, kardex completo y reportes de valorización de stock.</p>
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
                <span>S/</span>89<sub>/mes</sub>
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
                <li><span className="check">✓</span> <strong>Facturación electrónica integrada</strong> — boletas y facturas a SUNAT sin configuraciones adicionales</li>
                <li><span className="check">✓</span> CDR oficial, descarga de XML y PDF por comprobante</li>
                <li><span className="check">✓</span> Reportes históricos sin límite de fecha</li>
                <li><span className="check">✓</span> Exportación a Excel y PDF</li>
                <li><span className="check">✓</span> Roles con permisos configurables por usuario</li>
                <li><span className="check">✓</span> Hasta 10 usuarios</li>
                <li><span className="check">✓</span> Soporte por WhatsApp en español</li>
              </ul>
              <Link to="/plan" className="landing-pricing-cta primary">
                Contratar Plan Básico — S/ 89/mes
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
              y facturación electrónica integrada con SUNAT en una sola plataforma.
            </p>
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
              <li><a href="https://wa.me/51994198710?text=Hola%2C%20me%20interesa%20Fluxus.%20%C2%BFMe%20pueden%20dar%20m%C3%A1s%20informaci%C3%B3n%3F" target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
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
