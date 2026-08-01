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

          <div className="landing-hero-text">
            <div className="landing-hero-badge">
              <span className="landing-hero-badge-dot" />
              Mini‑ERP para negocios peruanos
            </div>

            <h1 className="landing-hero-title">
              Vende, compra y factura{' '}
              <span className="landing-hero-title-highlight">todo desde un solo sistema</span>
            </h1>

            <p className="landing-hero-subtitle">
              POS con caja integrada, inventario en tiempo real, compras, devoluciones, notas de crédito,
              gestión de clientes y proveedores, <strong>facturación electrónica directa a SUNAT</strong> y
              mucho más. Sin apps separadas, sin Excel.
            </p>

            <div className="landing-hero-actions">
              <Link to="/register?plan=BASICO" className="btn-hero-primary">
                Probar 14 días gratis
              </Link>
              <a href="#features" className="btn-hero-secondary">
                Ver todos los módulos
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

          {/* Right: Dashboard Screenshot */}
          <div className="landing-hero-visual">
            <div className="landing-browser-frame">
              <div className="landing-browser-bar">
                <div className="landing-browser-dots">
                  <span className="landing-mockup-dot red" />
                  <span className="landing-mockup-dot yellow" />
                  <span className="landing-mockup-dot green" />
                </div>
                <div className="landing-browser-url">
                  <span className="landing-browser-lock">🔒</span>
                  <span>fluxus.pe/dashboard</span>
                </div>
              </div>
              <div className="landing-browser-content">
                <img
                  src="/dashboard-preview.png"
                  alt="Dashboard de Fluxus"
                  className="landing-browser-screenshot"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="landing-stats-bar">
        <div className="landing-container">
          <div className="landing-stats-grid">
            <div className="landing-stats-item">
              <span className="landing-stats-number">12+</span>
              <span className="landing-stats-label">Módulos integrados</span>
            </div>
            <div className="landing-stats-divider" />
            <div className="landing-stats-item">
              <span className="landing-stats-number">SUNAT</span>
              <span className="landing-stats-label">Facturación electrónica</span>
            </div>
            <div className="landing-stats-divider" />
            <div className="landing-stats-item">
              <span className="landing-stats-number">14 días</span>
              <span className="landing-stats-label">Prueba gratuita</span>
            </div>
            <div className="landing-stats-divider" />
            <div className="landing-stats-item">
              <span className="landing-stats-number">S/ 89</span>
              <span className="landing-stats-label">Desde por mes</span>
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
                <p>Genera OCs a tus proveedores con cantidades, precios y seguimiento de estado.</p>
              </div>
            </div>
            <div className="landing-flow-arrow">→</div>
            <div className="landing-flow-step">
              <div className="landing-flow-number">2</div>
              <div className="landing-flow-content">
                <h4>Recepción</h4>
                <p>Registra lo que llega, incluyendo lotes y fechas de vencimiento. El stock sube automáticamente.</p>
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
              Doce módulos integrados que trabajan juntos. Sin apps separadas, sin doble ingreso de datos.
            </p>
          </div>

          <div className="landing-features-grid">

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🖥️</div>
              <h3 className="landing-feature-title">Punto de Venta (POS)</h3>
              <p className="landing-feature-desc">
                POS ágil con búsqueda instantánea por nombre o código de barras, atajos de teclado
                (F2 cobrar, F4 limpiar), cobro mixto y cálculo automático de vuelto.
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
              <h3 className="landing-feature-title">Facturación electrónica</h3>
              <p className="landing-feature-desc">
                Emite boletas y facturas directamente desde cada venta. Envío automático a SUNAT,
                descarga del CDR oficial, XML y PDF. Notas de crédito electrónicas incluidas.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">📦</div>
              <h3 className="landing-feature-title">Inventario en tiempo real</h3>
              <p className="landing-feature-desc">
                Stock actualizado con cada compra y venta. Alertas de stock mínimo, kardex completo,
                control por lote, fecha de vencimiento y ajustes de inventario manuales.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🛍️</div>
              <h3 className="landing-feature-title">Compras y recepciones</h3>
              <p className="landing-feature-desc">
                Órdenes de compra con estados (borrador → enviada → recibida), recepciones
                parciales, importación masiva desde Excel y actualización automática de costos.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🔄</div>
              <h3 className="landing-feature-title">Devoluciones y notas de crédito</h3>
              <p className="landing-feature-desc">
                Devoluciones totales o parciales con reposición automática de stock.
                Emite notas de crédito electrónicas aplicables como descuento en el POS.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">📋</div>
              <h3 className="landing-feature-title">Historial de ventas</h3>
              <p className="landing-feature-desc">
                Registro completo por vendedor, período y método de pago. Anula ventas con un clic
                y revierte el stock automáticamente. Exporta a Excel o imprime ticket.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">👥</div>
              <h3 className="landing-feature-title">Clientes y proveedores</h3>
              <p className="landing-feature-desc">
                Registro de clientes con RUC/DNI, historial de compras y saldo de notas de crédito.
                Gestión de proveedores con contacto y condiciones de pago.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">🔐</div>
              <h3 className="landing-feature-title">Roles y permisos</h3>
              <p className="landing-feature-desc">
                Administrador, Gerente, Vendedor, Almacenero y más. Configura exactamente a qué
                módulos y acciones tiene acceso cada usuario. Cada uno ve solo lo suyo.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">📊</div>
              <h3 className="landing-feature-title">Reportes y métricas</h3>
              <p className="landing-feature-desc">
                Ingresos por período, ticket promedio, productos más vendidos, rotación de inventario,
                kardex valorizado y exportación a Excel y PDF.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">📥</div>
              <h3 className="landing-feature-title">Importación desde Excel</h3>
              <p className="landing-feature-desc">
                Carga tu catálogo completo desde un archivo Excel. Validación fila por fila,
                preview de errores antes de confirmar y actualización de precios masiva.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">💊</div>
              <h3 className="landing-feature-title">DIGEMID / OPPF</h3>
              <p className="landing-feature-desc">
                Para farmacias y boticas: vincula tus productos al catálogo DIGEMID (18 000+ registros),
                gestiona registro sanitario y genera el reporte OPPF mensual en formato ZIP para DIGEMID.
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
              Fluxus se adapta a tu rubro. Cada tipo de negocio ve solo los módulos que necesita.
            </p>
          </div>

          <div className="landing-audience-grid">
            <div className="landing-audience-card">
              <div className="landing-audience-icon">💊</div>
              <h4>Farmacias y boticas</h4>
              <p>Control de lotes, fechas de vencimiento, registro sanitario, DIGEMID y reporte OPPF mensual automático.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">👗</div>
              <h4>Tiendas de ropa</h4>
              <p>Gestión por talla y color, control de stock por variante y POS rápido con búsqueda por categoría.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">🏪</div>
              <h4>Tiendas y bodegas</h4>
              <p>POS rápido con caja integrada, historial diario de ventas, control de proveedores y alertas de stock.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">🔧</div>
              <h4>Ferreterías y distribuidoras</h4>
              <p>OCs a varios proveedores, recepciones parciales, costos de compra actualizados y kardex por producto.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">🛒</div>
              <h4>Minimarkets</h4>
              <p>Manejo de múltiples categorías, POS por código de barras, control de merma y vencimientos.</p>
            </div>
            <div className="landing-audience-card">
              <div className="landing-audience-icon">📦</div>
              <h4>Almacenes y depósitos</h4>
              <p>Movimientos de inventario, kardex completo, ajustes manuales y reportes de valorización de stock.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="landing-section landing-pricing" id="pricing">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-label">Precio</span>
            <h2 className="landing-section-title">Planes simples, sin sorpresas</h2>
            <p className="landing-section-subtitle">
              14 días de prueba gratuita en cualquier plan. Sin tarjeta hasta que decidas quedarte.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'stretch' }}>

            {/* Plan Básico */}
            <div className="landing-pricing-card" style={{ maxWidth: '440px', width: '100%' }}>
              <div className="landing-pricing-plan">Plan Básico</div>
              <div className="landing-pricing-price">
                <span>S/</span>89<sub>/mes</sub>
              </div>
              <p className="landing-pricing-description">
                Todo lo que necesitas para gestionar tu negocio desde el primer día.
              </p>
              <div className="landing-pricing-divider" />
              <ul className="landing-pricing-features">
                <li><span className="check">✓</span> <strong>POS</strong> con caja integrada (efectivo, tarjeta, Yape/Plin)</li>
                <li><span className="check">✓</span> Inventario en tiempo real con alertas de stock</li>
                <li><span className="check">✓</span> Control de lotes y fechas de vencimiento</li>
                <li><span className="check">✓</span> Órdenes de compra y recepciones a proveedores</li>
                <li><span className="check">✓</span> Devoluciones y notas de crédito aplicables en POS</li>
                <li><span className="check">✓</span> <strong>Facturación electrónica</strong> — boletas y facturas a SUNAT</li>
                <li><span className="check">✓</span> CDR oficial, XML y PDF descargables</li>
                <li><span className="check">✓</span> Gestión de clientes y proveedores</li>
                <li><span className="check">✓</span> Importación masiva desde Excel</li>
                <li><span className="check">✓</span> Reportes históricos + exportación a Excel y PDF</li>
                <li><span className="check">✓</span> Roles con permisos configurables</li>
                <li><span className="check">✓</span> <strong>Hasta 5 usuarios</strong></li>
                <li><span className="check">✓</span> <strong>Hasta 2,000 productos</strong></li>
                <li><span className="check">✓</span> Soporte por WhatsApp en español</li>
              </ul>
              <Link to="/register?plan=BASICO" className="landing-pricing-cta primary">
                Probar 14 días gratis
              </Link>
            </div>

            {/* Plan Pro */}
            <div className="landing-pricing-card featured" style={{ maxWidth: '440px', width: '100%' }}>
              <div className="landing-pricing-badge">⭐ Más popular</div>
              <div className="landing-pricing-plan">Plan Pro</div>
              <div className="landing-pricing-price">
                <span>S/</span>169<sub>/mes</sub>
              </div>
              <p className="landing-pricing-description">
                Todo el Plan Básico más gestión multilocal para negocios con varias sucursales.
              </p>
              <div className="landing-pricing-divider" />
              <ul className="landing-pricing-features">
                <li><span className="check">✓</span> <strong>Todo lo del Plan Básico</strong></li>
                <li><span className="check">✓</span> <strong>Hasta 5 sucursales</strong> — cada una completamente independiente</li>
                <li><span className="check">✓</span> Stock, caja y POS por sucursal</li>
                <li><span className="check">✓</span> Ventas y reportes filtrados por local</li>
                <li><span className="check">✓</span> Movimientos de inventario entre sucursales</li>
                <li><span className="check">✓</span> Usuarios y permisos configurables por sucursal</li>
                <li><span className="check">✓</span> <strong>Hasta 15 usuarios</strong></li>
                <li><span className="check">✓</span> <strong>Hasta 5,000 productos</strong></li>
                <li><span className="check">✓</span> Soporte prioritario por WhatsApp</li>
              </ul>
              <Link to="/register?plan=PRO" className="landing-pricing-cta primary">
                Probar 14 días gratis
              </Link>
            </div>

          </div>

          <p className="landing-pricing-note">
            ¿Necesitas más usuarios, productos o sucursales?{' '}
            <a href="https://wa.me/51994198710?text=Hola%2C%20necesito%20un%20plan%20a%20medida%20en%20Fluxus." target="_blank" rel="noopener noreferrer">Escríbenos</a> para un plan a medida.
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
              Mini‑ERP para negocios peruanos. POS, inventario, compras, devoluciones,
              clientes, proveedores y facturación electrónica integrada con SUNAT.
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
