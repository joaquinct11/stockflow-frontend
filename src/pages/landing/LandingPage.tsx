import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './landing.css';

type Tab = 'farmacia' | 'ropa' | 'bodega' | 'ferreteria' | 'minimarket' | 'almacen';

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '.9rem',
    fontWeight: 600,
    padding: '11px 16px',
    borderRadius: '100px',
    cursor: 'pointer',
    transition: 'all .2s',
    whiteSpace: 'nowrap',
    ...(active
      ? { color: '#fff', background: 'linear-gradient(135deg,#6c63ff,#4a43cc)', border: '1px solid rgba(108,99,255,.6)', boxShadow: '0 10px 26px -12px #6c63ff' }
      : { color: '#9898b0', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }),
  };
}

function pickStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '.85rem',
    fontWeight: 600,
    padding: '9px 14px',
    borderRadius: '100px',
    cursor: 'pointer',
    transition: 'all .2s',
    whiteSpace: 'nowrap',
    ...(active
      ? { color: '#fff', background: 'rgba(108,99,255,.9)', border: '1px solid rgba(108,99,255,.7)' }
      : { color: '#9898b0', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)' }),
  };
}

const TAG_STYLE: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: '.72rem',
  color: '#a79fff',
  background: 'rgba(108,99,255,.1)',
  border: '1px solid rgba(108,99,255,.28)',
  borderRadius: '7px',
  padding: '7px 11px',
};

export function LandingPage() {
  const [tab, setTab] = useState<Tab>('farmacia');
  const [locales, setLocales] = useState<1 | 5 | null>(null);
  const [faq, setFaq] = useState<number | null>(1);
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const pending = els.filter(el => el.getBoundingClientRect().top > window.innerHeight * 0.9);
    pending.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px)';
      el.style.transition = 'opacity .6s cubic-bezier(.2,.7,.3,1), transform .6s cubic-bezier(.2,.7,.3,1)';
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        el.style.opacity = '1';
        el.style.transform = 'none';
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    pending.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const toggleFaq = (n: number) => setFaq(prev => prev === n ? null : n);

  return (
    <div className="lp" ref={revealRef}>

        {/* NAV */}
        <div style={{position:'fixed',top:14,left:0,right:0,zIndex:1000,display:'flex',justifyContent:'center',padding:'0 18px',pointerEvents:'none'}}>
          <nav style={{pointerEvents:'auto',display:'flex',alignItems:'center',gap:26,width:'100%',maxWidth:1100,padding:'10px 12px 10px 16px',border:'1px solid rgba(255,255,255,.09)',borderRadius:100,background:'rgba(12,13,19,.78)',backdropFilter:'blur(18px)',boxShadow:'0 12px 40px -18px rgba(0,0,0,.9)'}}>
            <a href="#top" style={{display:'flex',alignItems:'center',gap:9,flexShrink:0}}>
              <img src="/fluxus.png" alt="Fluxus" style={{width:30,height:30,borderRadius:8,objectFit:'cover'}} />
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:'1.05rem',fontWeight:700,background:'linear-gradient(135deg,#8b85ff,#00d4aa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Fluxus</span>
            </a>
            <div data-r="navlinks" style={{display:'flex',alignItems:'center',gap:24,fontSize:'.9rem',fontWeight:500}}>
              <a href="#modulos" className="lp-navlink">Módulos</a>
              <a href="#rubros" className="lp-navlink">Tu rubro</a>
              <a href="#pricing" className="lp-navlink">Precio</a>
              <a href="#faq" className="lp-navlink">Preguntas</a>
            </div>
            <div style={{flex:1}}></div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <Link to="/login" data-r="navlogin" className="lp-navlogin">Iniciar Sesión</Link>
              <Link to="/register?plan=BASICO" className="lp-btn-primary">Probar 14 días</Link>
            </div>
          </nav>
        </div>

        {/* HERO */}
        <section id="top" data-r="hero" style={{position:'relative',padding:'150px 28px 0',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(108,99,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,.045) 1px,transparent 1px)',backgroundSize:'64px 64px',maskImage:'radial-gradient(110% 70% at 50% 0%,#000 25%,transparent 72%)',WebkitMaskImage:'radial-gradient(110% 70% at 50% 0%,#000 25%,transparent 72%)',pointerEvents:'none'}}></div>
          <div style={{position:'absolute',top:-320,left:'50%',transform:'translateX(-50%)',width:1200,height:700,background:'radial-gradient(50% 50% at 50% 50%,rgba(108,99,255,.3),transparent 70%)',filter:'blur(24px)',pointerEvents:'none'}}></div>
          <div style={{position:'relative',maxWidth:960,margin:'0 auto',textAlign:'center'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:9,background:'rgba(108,99,255,.1)',border:'1px solid rgba(108,99,255,.3)',color:'#a79fff',padding:'.4rem 1rem',borderRadius:50,fontSize:'.75rem',fontFamily:"'Space Mono',monospace",letterSpacing:'.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#00d4aa',animation:'fx-pulse 2.2s ease-in-out infinite'}}></span>
              Mini‑ERP peruano · SUNAT integrado
            </div>
            <h1 style={{fontSize:'clamp(2.4rem,6vw,4.6rem)',fontWeight:800,lineHeight:1.02,letterSpacing:'-.035em',margin:'26px 0 0',textWrap:'balance' as React.CSSProperties['textWrap']}}>
              Vende, compra y factura{' '}
              <span style={{background:'linear-gradient(135deg,#8b85ff 0%,#00d4aa 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>todo desde un solo sistema</span>
            </h1>
            <p style={{fontSize:'1.15rem',lineHeight:1.65,color:'#9898b0',margin:'24px auto 0',maxWidth:620}}>POS con caja integrada, inventario en tiempo real, compras, devoluciones y facturación electrónica directa a SUNAT. Sin apps separadas, sin Excel.</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'center',marginTop:34}}>
              <Link to="/register?plan=BASICO" className="lp-hero-cta">Probar 14 días gratis</Link>
              <a href="#modulos" className="lp-hero-outline">Ver módulos</a>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'8px 16px',marginTop:26,fontFamily:"'Space Mono',monospace",fontSize:'.72rem',color:'#5a5a72',letterSpacing:'.03em'}}>
              <span>Sin permanencia</span><span style={{color:'#33344a'}}>·</span>
              <span>Sin tarjeta</span><span style={{color:'#33344a'}}>·</span>
              <span>Soporte en español</span><span style={{color:'#33344a'}}>·</span>
              <span>Multi‑usuario</span>
            </div>
          </div>
          <div style={{position:'relative',maxWidth:1180,margin:'64px auto 0',perspective:2000}}>
            <div style={{position:'absolute',inset:'-4% -3% 10% -3%',background:'radial-gradient(55% 55% at 50% 35%,rgba(108,99,255,.28),transparent 70%),radial-gradient(45% 45% at 20% 80%,rgba(0,212,170,.14),transparent 70%)',filter:'blur(34px)',pointerEvents:'none'}}></div>
            <div style={{position:'relative',transform:'rotateX(7deg)',transformOrigin:'50% 0',border:'1px solid rgba(255,255,255,.12)',borderRadius:18,background:'#12121a',overflow:'hidden',boxShadow:'0 60px 120px -50px rgba(0,0,0,1), 0 0 0 1px rgba(255,255,255,.04)'}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'.7rem 1rem',background:'#1a1a26',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <span style={{width:10,height:10,borderRadius:'50%',background:'#ff5f57'}}></span>
                  <span style={{width:10,height:10,borderRadius:'50%',background:'#febc2e'}}></span>
                  <span style={{width:10,height:10,borderRadius:'50%',background:'#28c840'}}></span>
                </div>
                <div style={{flex:1,maxWidth:280,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center',gap:6,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:6,padding:'.28rem .75rem',fontFamily:"'Space Mono',monospace",fontSize:'.7rem',color:'#5a5a72',whiteSpace:'nowrap',overflow:'hidden'}}>🔒 fluxus.pe/dashboard</div>
              </div>
              <div style={{position:'relative',lineHeight:0,maxHeight:620,overflow:'hidden'}}>
                <img src="/dashboard-preview.png" alt="Dashboard de Fluxus" style={{width:'100%',height:'auto',display:'block',objectFit:'cover',objectPosition:'top left'}} />
                <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 55%,rgba(8,9,13,.65) 82%,#08090d 100%)',pointerEvents:'none'}}></div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section data-r="sec" style={{padding:'0 28px'}}>
          <div data-r="statsgrid" style={{maxWidth:1180,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',border:'1px solid rgba(255,255,255,.08)',borderRadius:18,background:'rgba(108,99,255,.05)',overflow:'hidden'}}>
            {[
              {val:'12+',label:'Módulos integrados'},
              {val:'SUNAT',label:'Facturación electrónica'},
              {val:'14 días',label:'Prueba gratuita'},
              {val:'S/ 89',label:'Desde por mes'},
            ].map((s, i, arr) => (
              <div key={s.val} data-r="statitem" style={{padding:'26px 24px',borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,.07)' : 'none'}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:'1.7rem',fontWeight:700,background:'linear-gradient(135deg,#8b85ff,#00d4aa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{s.val}</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',letterSpacing:'.08em',textTransform:'uppercase',color:'#5a5a72',marginTop:6}}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* EL CAMBIO */}
        <section data-r="sec" style={{padding:'110px 28px 0'}}>
          <div style={{maxWidth:1180,margin:'0 auto'}}>
            <div data-reveal="1" style={{maxWidth:640}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#8b85ff'}}>El cambio</div>
              <h2 style={{fontSize:'clamp(1.9rem,3.4vw,2.9rem)',fontWeight:800,lineHeight:1.1,letterSpacing:'-.03em',margin:'14px 0 0'}}>De tres cuadernos y un Excel, a un solo sistema</h2>
            </div>
            <div data-r="two" data-reveal="1" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:16,marginTop:40}}>
              <div style={{padding:30,border:'1px solid rgba(255,255,255,.07)',borderRadius:18,background:'#0e0f15'}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',letterSpacing:'.1em',textTransform:'uppercase',color:'#5a5a72'}}>Hoy sin Fluxus</div>
                <ul style={{listStyle:'none',margin:'20px 0 0',padding:0,display:'grid',gap:13,fontSize:'.95rem',color:'#7d7f96'}}>
                  {['El stock del Excel nunca cuadra con el físico','Facturas en otro portal, a mano, una por una','Nadie sabe qué se pidió al proveedor ni a qué precio','El cierre de caja se hace de memoria','Cada vendedor ve todo, o no ve nada'].map(t => (
                    <li key={t} style={{display:'flex',gap:12}}><span style={{color:'#4a4b60'}}>✕</span>{t}</li>
                  ))}
                </ul>
              </div>
              <div style={{position:'relative',padding:30,border:'1px solid rgba(108,99,255,.4)',borderRadius:18,background:'linear-gradient(135deg,rgba(108,99,255,.12),rgba(0,212,170,.05))',boxShadow:'0 0 50px -18px rgba(108,99,255,.5)'}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',letterSpacing:'.1em',textTransform:'uppercase',color:'#a79fff'}}>Con Fluxus</div>
                <ul style={{listStyle:'none',margin:'20px 0 0',padding:0,display:'grid',gap:13,fontSize:'.95rem',color:'#d5d6e2'}}>
                  {['El stock baja solo con cada venta y sube con cada recepción','Boleta o factura electrónica desde la misma venta, con CDR','Órdenes de compra con estado y costo actualizado','Apertura y cierre de caja con diferencias a la vista','Cada rol ve exactamente lo que le toca'].map(t => (
                    <li key={t} style={{display:'flex',gap:12}}><span style={{color:'#00d4aa'}}>✓</span>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section data-r="sec" style={{padding:'110px 28px 0'}}>
          <div style={{maxWidth:1180,margin:'0 auto'}}>
            <div data-reveal="1" style={{maxWidth:640}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#8b85ff'}}>Cómo funciona</div>
              <h2 style={{fontSize:'clamp(1.9rem,3.4vw,2.9rem)',fontWeight:800,lineHeight:1.1,letterSpacing:'-.03em',margin:'14px 0 0'}}>Del pedido a la factura, todo conectado</h2>
              <p style={{fontSize:'1.02rem',lineHeight:1.65,color:'#9898b0',margin:'14px 0 0'}}>Un flujo unificado que elimina el trabajo doble y los errores en Excel.</p>
            </div>
            <div style={{position:'relative',marginTop:44}}>
              <div data-r="rail" style={{position:'absolute',top:26,left:'6%',right:'6%',height:1,background:'linear-gradient(90deg,rgba(108,99,255,.15),rgba(108,99,255,.6),rgba(0,212,170,.6),rgba(0,212,170,.15))'}}></div>
              <div data-r="steps" data-reveal="1" style={{position:'relative',display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:20}}>
                {[
                  {n:'1',title:'Orden de compra',desc:'Genera OCs a tus proveedores con cantidades, precios y seguimiento de estado.'},
                  {n:'2',title:'Recepción',desc:'Registra lo que llega, con lotes y vencimientos. El stock sube automáticamente.'},
                  {n:'3',title:'Venta en el POS',desc:'Cobra en efectivo, tarjeta o Yape/Plin con caja integrada y vuelto automático.'},
                  {n:'4',title:'Factura a SUNAT',desc:'Emite boletas y facturas desde la venta. Fluxus las envía al instante y guarda el CDR.',grad:'linear-gradient(135deg,#00d4aa,#00b08c)'},
                ].map(s => (
                  <div key={s.n} style={{textAlign:'center',padding:'0 8px'}}>
                    <div style={{width:52,height:52,margin:'0 auto',borderRadius:'50%',background:s.grad||'linear-gradient(135deg,#6c63ff,#00d4aa)',color:'#fff',fontFamily:"'Space Mono',monospace",fontSize:'1.2rem',fontWeight:700,display:'grid',placeItems:'center',boxShadow:'0 0 0 6px #08090d'}}>{s.n}</div>
                    <h4 style={{fontSize:'1rem',fontWeight:700,margin:'18px 0 0'}}>{s.title}</h4>
                    <p style={{fontSize:'.85rem',color:'#5a5a72',lineHeight:1.55,margin:'8px 0 0'}}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* MÓDULOS */}
        <section id="modulos" data-r="sec" style={{padding:'110px 28px 0'}}>
          <div style={{maxWidth:1180,margin:'0 auto'}}>
            <div data-reveal="1" style={{display:'flex',flexWrap:'wrap',alignItems:'flex-end',justifyContent:'space-between',gap:20}}>
              <div style={{maxWidth:640}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#8b85ff'}}>Módulos</div>
                <h2 style={{fontSize:'clamp(1.9rem,3.4vw,2.9rem)',fontWeight:800,lineHeight:1.1,letterSpacing:'-.03em',margin:'14px 0 0'}}>Todo lo que necesita tu negocio, en un solo sistema</h2>
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.75rem',color:'#5a5a72'}}>12 módulos · sin plugins</div>
            </div>
            <div data-r="bento" data-reveal="1" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:14,marginTop:40}}>
              <div data-r="bentobig" style={{gridColumn:'span 2',position:'relative',padding:32,border:'1px solid rgba(0,212,170,.28)',borderRadius:18,background:'linear-gradient(135deg,rgba(0,212,170,.09),rgba(108,99,255,.06))',overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{width:44,height:44,borderRadius:12,background:'rgba(0,212,170,.14)',border:'1px solid rgba(0,212,170,.3)',display:'grid',placeItems:'center',fontSize:'1.3rem'}}>🧾</span>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.68rem',letterSpacing:'.1em',color:'#00d4aa',border:'1px solid rgba(0,212,170,.3)',borderRadius:6,padding:'3px 8px'}}>EXCLUSIVO PERÚ</span>
                </div>
                <h3 style={{fontSize:'1.5rem',fontWeight:700,letterSpacing:'-.02em',margin:'22px 0 0'}}>Facturación electrónica directa a SUNAT</h3>
                <p style={{fontSize:'.95rem',color:'#9898b0',lineHeight:1.6,margin:'10px 0 0',maxWidth:520}}>Emite boletas y facturas desde cada venta. Envío automático a SUNAT, descarga del CDR oficial, XML y PDF. Notas de crédito electrónicas incluidas.</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:22}}>
                  {['CDR oficial','XML','PDF','Nota de crédito'].map(t => (
                    <span key={t} style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',color:'#d5d6e2',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,padding:'5px 10px'}}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="lp-module-card">
                <span style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,rgba(108,99,255,.2),rgba(0,212,170,.1))',border:'1px solid rgba(108,99,255,.3)',display:'grid',placeItems:'center',fontSize:'1.3rem'}}>🖥️</span>
                <h3 style={{fontSize:'1.15rem',fontWeight:700,margin:'20px 0 0'}}>Punto de Venta (POS)</h3>
                <p style={{fontSize:'.88rem',color:'#9898b0',lineHeight:1.6,margin:'9px 0 0'}}>Búsqueda instantánea por nombre o código de barras, atajos de teclado (F2 cobrar, F4 limpiar), cobro mixto y vuelto automático.</p>
              </div>
              <div className="lp-module-card">
                <span style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,rgba(108,99,255,.2),rgba(0,212,170,.1))',border:'1px solid rgba(108,99,255,.3)',display:'grid',placeItems:'center',fontSize:'1.3rem'}}>📦</span>
                <h3 style={{fontSize:'1.15rem',fontWeight:700,margin:'20px 0 0'}}>Inventario en tiempo real</h3>
                <p style={{fontSize:'.88rem',color:'#9898b0',lineHeight:1.6,margin:'9px 0 0'}}>Alertas de stock mínimo, kardex completo, control por lote y fecha de vencimiento, más ajustes manuales.</p>
              </div>
              <div data-r="bentobig" style={{gridColumn:'span 2'}} className="lp-module-card-wide">
                <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:14}}>
                  <span style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,rgba(108,99,255,.2),rgba(0,212,170,.1))',border:'1px solid rgba(108,99,255,.3)',display:'grid',placeItems:'center',fontSize:'1.3rem'}}>💰</span>
                  <h3 style={{fontSize:'1.15rem',fontWeight:700,margin:0}}>Caja registradora con cierre cuadrado</h3>
                </div>
                <p style={{fontSize:'.88rem',color:'#9898b0',lineHeight:1.6,margin:'14px 0 0',maxWidth:620}}>Apertura y cierre con fondo inicial, totales por método de pago (efectivo, tarjeta, Yape/Plin) y control de diferencias al cierre de cada turno.</p>
              </div>
            </div>
            <div data-r="mini" data-reveal="1" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:14,marginTop:14}}>
              {[
                {e:'🛍️',t:'Compras y recepciones',d:'OCs con estados, recepciones parciales y costos actualizados.'},
                {e:'🔄',t:'Devoluciones y notas de crédito',d:'Totales o parciales, con reposición automática de stock.'},
                {e:'📋',t:'Historial de ventas',d:'Por vendedor, período y método de pago. Anula y revierte stock.'},
                {e:'👥',t:'Clientes y proveedores',d:'RUC/DNI, historial de compras y saldo de notas de crédito.'},
                {e:'🔐',t:'Roles y permisos',d:'Administrador, Gerente, Vendedor, Almacenero y más.'},
                {e:'📊',t:'Reportes y métricas',d:'Ticket promedio, top productos, rotación y kardex valorizado.'},
                {e:'📥',t:'Importación desde Excel',d:'Catálogo completo con validación fila por fila antes de confirmar.'},
                {e:'💊',t:'DIGEMID / OPPF',d:'Catálogo DIGEMID, registro sanitario y reporte OPPF mensual.'},
                {e:'🏬',t:'Multi‑sucursal',d:'Hasta 5 locales independientes con traslados entre ellos (Plan Pro).'},
              ].map(m => (
                <div key={m.t} style={{display:'flex',gap:14,padding:22,border:'1px solid rgba(255,255,255,.07)',borderRadius:16,background:'#0c0d12'}}>
                  <span style={{fontSize:'1.2rem',lineHeight:1}}>{m.e}</span>
                  <div><h4 style={{fontSize:'.98rem',fontWeight:700,margin:0}}>{m.t}</h4><p style={{fontSize:'.84rem',color:'#7d7f96',lineHeight:1.55,margin:'6px 0 0'}}>{m.d}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TU RUBRO */}
        <section id="rubros" data-r="sec" style={{padding:'110px 28px 0'}}>
          <div style={{maxWidth:1180,margin:'0 auto'}}>
            <div data-reveal="1" style={{maxWidth:640}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#8b85ff'}}>Tu rubro</div>
              <h2 style={{fontSize:'clamp(1.9rem,3.4vw,2.9rem)',fontWeight:800,lineHeight:1.1,letterSpacing:'-.03em',margin:'14px 0 0'}}>Elige tu tipo de negocio y mira qué cambia</h2>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:32}}>
              {([['farmacia','💊 Farmacias y boticas'],['ropa','👗 Tiendas de ropa'],['bodega','🏪 Tiendas y bodegas'],['ferreteria','🔧 Ferreterías'],['minimarket','🛒 Minimarkets'],['almacen','📦 Almacenes']] as [Tab, string][]).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setTab(k)} style={tabStyle(tab === k)}>{label}</button>
              ))}
            </div>
            <div style={{marginTop:18,border:'1px solid rgba(255,255,255,.08)',borderRadius:20,background:'linear-gradient(135deg,rgba(108,99,255,.07),rgba(0,212,170,.03))',padding:34}}>
              <RubroContent tab={tab} />
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" data-r="sec" style={{padding:'110px 28px 0'}}>
          <div style={{maxWidth:1180,margin:'0 auto'}}>
            <div data-reveal="1" style={{maxWidth:640}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#8b85ff'}}>Precio</div>
              <h2 style={{fontSize:'clamp(1.9rem,3.4vw,2.9rem)',fontWeight:800,lineHeight:1.1,letterSpacing:'-.03em',margin:'14px 0 0'}}>Planes simples, sin sorpresas</h2>
              <p style={{fontSize:'1.02rem',lineHeight:1.65,color:'#9898b0',margin:'14px 0 0'}}>14 días de prueba gratuita en cualquier plan. Sin tarjeta hasta que decidas quedarte.</p>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:12,marginTop:28,padding:'14px 18px',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,background:'#0c0d12'}}>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.74rem',letterSpacing:'.06em',textTransform:'uppercase',color:'#5a5a72'}}>¿Cuántos locales tienes?</span>
              <div style={{display:'flex',gap:8}}>
                <button type="button" onClick={() => setLocales(1)} style={pickStyle(locales === 1)}>1 local</button>
                <button type="button" onClick={() => setLocales(5)} style={pickStyle(locales === 5)}>2 a 5 locales</button>
              </div>
              <span style={{fontSize:'.9rem',color:'#d5d6e2'}}>
                {locales === 1 ? 'Te alcanza el Plan Básico.' : locales === 5 ? 'Necesitas el Plan Pro (multi‑sucursal).' : ''}
              </span>
            </div>
            <div data-r="two" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:16,marginTop:16,maxWidth:920}}>
              {/* Plan Básico */}
              <div style={{display:'flex',flexDirection:'column',padding:32,border:'1px solid rgba(255,255,255,.08)',borderRadius:20,background:'#0e0f15'}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'#8b85ff'}}>Plan Básico</div>
                <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:16}}>
                  <span style={{fontSize:'1.15rem',fontWeight:600,color:'#9898b0'}}>S/</span>
                  <span style={{fontSize:'3rem',fontWeight:800,lineHeight:1,letterSpacing:'-.04em'}}>89</span>
                  <span style={{fontSize:'.9rem',color:'#5a5a72'}}>/mes</span>
                </div>
                <p style={{fontSize:'.9rem',color:'#7d7f96',lineHeight:1.6,margin:'14px 0 0'}}>Todo lo que necesitas para gestionar tu negocio desde el primer día.</p>
                <Link to="/register?plan=BASICO" className="lp-plan-basic-btn">Probar 14 días gratis</Link>
                <div style={{height:1,background:'rgba(255,255,255,.08)',margin:'26px 0'}}></div>
                <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:11,fontSize:'.9rem',color:'#9898b0'}}>
                  {[
                    [true,'POS','con caja integrada (efectivo, tarjeta, Yape/Plin)'],
                    [false,'','Inventario en tiempo real con alertas de stock'],
                    [false,'','Control de lotes y fechas de vencimiento'],
                    [false,'','Órdenes de compra y recepciones a proveedores'],
                    [false,'','Devoluciones y notas de crédito aplicables en POS'],
                    [true,'Facturación electrónica','— boletas y facturas a SUNAT'],
                    [false,'','CDR oficial, XML y PDF descargables'],
                    [false,'','Gestión de clientes y proveedores'],
                    [false,'','Importación masiva desde Excel'],
                    [false,'','Reportes históricos + exportación a Excel y PDF'],
                    [false,'','Roles con permisos configurables'],
                    [true,'Hasta 5 usuarios',''],
                    [true,'Hasta 2,000 productos',''],
                    [false,'','Soporte por WhatsApp en español'],
                  ].map(([bold, b, rest], i) => (
                    <li key={i} style={{display:'flex',gap:10}}><span style={{color:'#00d4aa'}}>✓</span><span>{bold ? <><strong style={{color:'#e8e8f0',fontWeight:600}}>{b as string}</strong>{rest ? ` ${rest}` : ''}</> : (rest as string)}</span></li>
                  ))}
                </ul>
              </div>
              {/* Plan Pro */}
              <div style={{position:'relative',display:'flex',flexDirection:'column',padding:32,border:'1px solid rgba(108,99,255,.5)',borderRadius:20,background:'linear-gradient(135deg,rgba(108,99,255,.14),rgba(0,212,170,.05))',boxShadow:'0 30px 80px -40px rgba(108,99,255,.9)'}}>
                <div style={{position:'absolute',top:-12,left:32,fontFamily:"'Space Mono',monospace",fontSize:'.7rem',fontWeight:700,letterSpacing:'.08em',color:'#fff',background:'linear-gradient(135deg,#6c63ff,#00d4aa)',padding:'4px 12px',borderRadius:50,whiteSpace:'nowrap'}}>⭐ Más popular</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'#a79fff'}}>Plan Pro</div>
                <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:16}}>
                  <span style={{fontSize:'1.15rem',fontWeight:600,color:'#9898b0'}}>S/</span>
                  <span style={{fontSize:'3rem',fontWeight:800,lineHeight:1,letterSpacing:'-.04em'}}>169</span>
                  <span style={{fontSize:'.9rem',color:'#5a5a72'}}>/mes</span>
                </div>
                <p style={{fontSize:'.9rem',color:'#9898b0',lineHeight:1.6,margin:'14px 0 0'}}>Todo el Plan Básico más gestión multilocal para negocios con varias sucursales.</p>
                <Link to="/register?plan=PRO" className="lp-plan-pro-btn">Probar 14 días gratis</Link>
                <div style={{height:1,background:'rgba(255,255,255,.1)',margin:'26px 0'}}></div>
                <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:11,fontSize:'.9rem',color:'#c9cbd8'}}>
                  {[
                    <><strong style={{color:'#e8e8f0',fontWeight:600}}>Todo lo del Plan Básico</strong></>,
                    <><strong style={{color:'#e8e8f0',fontWeight:600}}>Hasta 5 sucursales</strong> — cada una completamente independiente</>,
                    'Stock, caja y POS por sucursal',
                    'Ventas y reportes filtrados por local',
                    'Movimientos de inventario entre sucursales',
                    'Usuarios y permisos configurables por sucursal',
                    <><strong style={{color:'#e8e8f0',fontWeight:600}}>Hasta 15 usuarios</strong></>,
                    <><strong style={{color:'#e8e8f0',fontWeight:600}}>Hasta 5,000 productos</strong></>,
                    'Soporte prioritario por WhatsApp',
                  ].map((item, i) => (
                    <li key={i} style={{display:'flex',gap:10}}><span style={{color:'#00d4aa'}}>✓</span><span>{item}</span></li>
                  ))}
                </ul>
              </div>
            </div>
            <p style={{fontSize:'.9rem',color:'#5a5a72',margin:'24px 0 0'}}>¿Necesitas más usuarios, productos o sucursales?{' '}
              <a href="https://wa.me/51994198710?text=Hola%2C%20necesito%20un%20plan%20a%20medida%20en%20Fluxus." target="_blank" rel="noopener noreferrer" style={{color:'#8b85ff',textDecoration:'underline'}}>Escríbenos</a>
              {' '}para un plan a medida.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" data-r="sec" style={{padding:'110px 28px 0'}}>
          <div style={{maxWidth:860,margin:'0 auto'}}>
            <div data-reveal="1">
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#8b85ff'}}>Preguntas frecuentes</div>
              <h2 style={{fontSize:'clamp(1.9rem,3.4vw,2.9rem)',fontWeight:800,lineHeight:1.1,letterSpacing:'-.03em',margin:'14px 0 0'}}>Lo que todos preguntan antes de empezar</h2>
            </div>
            <div style={{marginTop:36,display:'grid',gap:10}}>
              {[
                {q:'¿La facturación electrónica está incluida?', a:'Sí, en los dos planes. Emites boletas y facturas desde la misma venta, Fluxus las envía a SUNAT al instante y guarda el CDR oficial, más el XML y el PDF descargables. Las notas de crédito electrónicas también están incluidas.'},
                {q:'¿Tengo que pagar algo para probarlo?', a:'No. Son 14 días de prueba gratuita en cualquier plan, sin tarjeta de crédito y sin permanencia. Si no te convence, no haces nada y la cuenta simplemente no continúa.'},
                {q:'Ya tengo mi catálogo en Excel, ¿lo puedo subir?', a:'Sí. La importación masiva desde Excel valida fila por fila y te muestra un preview de los errores antes de confirmar, así no ensucias tu inventario. También sirve para actualizar precios en bloque.'},
                {q:'Tengo más de un local, ¿funciona?', a:'El Plan Pro maneja hasta 5 sucursales, cada una con su propio stock, caja y POS, con reportes filtrados por local y movimientos de inventario entre sucursales.'},
                {q:'Soy farmacia, ¿cubre DIGEMID y el OPPF?', a:'Sí. Vinculas tus productos al catálogo DIGEMID (18 000+ registros), gestionas el registro sanitario y generas el reporte OPPF mensual en formato ZIP, además del control de lotes y vencimientos.'},
                {q:'¿Cómo es el soporte?', a:<>Por WhatsApp, en español, con personas que conocen el sistema. El Plan Pro tiene atención prioritaria. Escríbenos al <a href="https://wa.me/51994198710" target="_blank" rel="noopener noreferrer" style={{color:'#8b85ff',textDecoration:'underline'}}>994 198 710</a>.</>},
              ].map((item, i) => {
                const n = i + 1;
                const open = faq === n;
                return (
                  <div key={n} style={{border:'1px solid rgba(255,255,255,.08)',borderRadius:14,background:'#0c0d12',overflow:'hidden'}}>
                    <button type="button" className="lp-faq-btn" onClick={() => toggleFaq(n)}>
                      {item.q}
                      <span style={{fontFamily:"'Space Mono',monospace",fontSize:'1.3rem',color:'#8b85ff',flexShrink:0}}>{open ? '−' : '+'}</span>
                    </button>
                    {open && <p style={{fontSize:'.95rem',color:'#9898b0',lineHeight:1.7,margin:0,padding:'0 24px 24px'}}>{item.a}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section data-r="sec" style={{padding:'120px 28px 0'}}>
          <div data-reveal="1" style={{position:'relative',maxWidth:1180,margin:'0 auto',border:'1px solid rgba(108,99,255,.28)',borderRadius:24,background:'linear-gradient(135deg,rgba(108,99,255,.16),rgba(0,212,170,.07))',overflow:'hidden',textAlign:'center',padding:'80px 32px'}}>
            <div style={{position:'absolute',bottom:-240,left:'50%',transform:'translateX(-50%)',width:820,height:460,background:'radial-gradient(50% 50% at 50% 50%,rgba(108,99,255,.4),transparent 70%)',filter:'blur(26px)',pointerEvents:'none'}}></div>
            <div style={{position:'relative'}}>
              <h2 style={{fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:800,lineHeight:1.05,letterSpacing:'-.035em',margin:'0 auto',maxWidth:720}}>
                ¿Listo para operar con{' '}
                <span style={{background:'linear-gradient(135deg,#8b85ff 0%,#00d4aa 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>más orden y control</span>?
              </h2>
              <p style={{fontSize:'1.08rem',color:'#9898b0',lineHeight:1.65,margin:'20px auto 0',maxWidth:520}}>Empieza hoy. 14 días de prueba, sin tarjeta de crédito, sin permanencia.</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'center',marginTop:34}}>
                <Link to="/register?plan=BASICO" className="lp-cta-green">Crear mi cuenta gratis</Link>
                <a href="https://wa.me/51994198710?text=Hola%2C%20me%20interesa%20Fluxus.%20%C2%BFMe%20pueden%20dar%20m%C3%A1s%20informaci%C3%B3n%3F" target="_blank" rel="noopener noreferrer" className="lp-cta-wa">Escríbenos por WhatsApp</a>
              </div>
              <p style={{fontFamily:"'Space Mono',monospace",fontSize:'.74rem',color:'#5a5a72',margin:'20px 0 0'}}>Sin permanencia · Cancela cuando quieras · Soporte en español</p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{marginTop:110,borderTop:'1px solid rgba(255,255,255,.07)',background:'#0a0b10'}}>
          <div data-r="footergrid" style={{maxWidth:1180,margin:'0 auto',padding:'60px 28px 30px',display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:40}}>
            <div>
              <a href="#top" style={{display:'flex',alignItems:'center',gap:10}}>
                <img src="/fluxus.png" alt="Fluxus" style={{width:32,height:32,borderRadius:8,objectFit:'cover'}} />
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:'1.15rem',fontWeight:700,background:'linear-gradient(135deg,#8b85ff,#00d4aa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Fluxus</span>
              </a>
              <p style={{fontSize:'.88rem',color:'#5a5a72',lineHeight:1.7,margin:'16px 0 0',maxWidth:280}}>Mini‑ERP para negocios peruanos. POS, inventario, compras, devoluciones, clientes, proveedores y facturación electrónica integrada con SUNAT.</p>
              <p style={{fontSize:11,color:'#7d7f96',lineHeight:1.7,margin:'12px 0 0'}}>Joaquin Castillo Tello · RUC: 10769109566<br />Jr. Libertad 455, Magdalena del Mar, Lima<br />Nombre comercial: Fluxus</p>
            </div>
            <div>
              <h4 style={{fontFamily:"'Space Mono',monospace",fontSize:'.8rem',fontWeight:700,letterSpacing:'.05em',margin:'0 0 16px'}}>Producto</h4>
              <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:11,fontSize:'.88rem'}}>
                {[['#modulos','Módulos'],['#rubros','Tu rubro'],['#pricing','Precio'],['#faq','Preguntas frecuentes'],['#','Crear cuenta']].map(([h,l]) => (
                  <li key={l}><a href={h} className="lp-footer-link">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{fontFamily:"'Space Mono',monospace",fontSize:'.8rem',fontWeight:700,letterSpacing:'.05em',margin:'0 0 16px'}}>Empresa</h4>
              <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:11,fontSize:'.88rem'}}>
                <li><a href="mailto:contacto@fluxus.pe" className="lp-footer-link">Contacto</a></li>
                <li><a href="mailto:contacto@fluxus.pe" className="lp-footer-link">Soporte técnico</a></li>
                <li><a href="https://wa.me/51994198710" target="_blank" rel="noopener noreferrer" className="lp-footer-link">WhatsApp</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{fontFamily:"'Space Mono',monospace",fontSize:'.8rem',fontWeight:700,letterSpacing:'.05em',margin:'0 0 16px'}}>Legal</h4>
              <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:11,fontSize:'.88rem'}}>
                <li><a href="/terminos" className="lp-footer-link">Términos y Condiciones</a></li>
                <li><a href="/privacidad" className="lp-footer-link">Política de Privacidad</a></li>
                <li><a href="#" className="lp-footer-link">Libro de Reclamaciones</a></li>
              </ul>
            </div>
          </div>
          <div style={{maxWidth:1180,margin:'0 auto',padding:'22px 28px 100px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',flexWrap:'wrap',gap:12,justifyContent:'space-between',fontFamily:"'Space Mono',monospace",fontSize:'.72rem',color:'#7d7f96'}}>
            <span>© 2026 Joaquin Castillo Tello (Fluxus) · RUC 10769109566</span>
            <span>Magdalena del Mar, Lima · Perú</span>
          </div>
        </footer>

        {/* MOBILE BOTTOM BAR */}
        <div data-r="mobilebar" style={{display:'none',position:'fixed',bottom:0,left:0,right:0,zIndex:1001,alignItems:'center',gap:10,padding:'12px 16px',background:'rgba(10,11,16,.92)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(255,255,255,.1)'}}>
          <Link to="/register?plan=BASICO" className="lp-mobbar-cta">Probar 14 días gratis</Link>
          <a href="https://wa.me/51994198710" target="_blank" rel="noopener noreferrer" className="lp-mobbar-wa">💬</a>
        </div>

    </div>
  );
}

/* ── Rubro tab content ─────────────────────────────────────────────────────── */
const RUBROS: Record<Tab, { title: string; desc: string; checks: string[]; tags: string[] }> = {
  farmacia: {
    title: 'Farmacias y boticas',
    desc: 'Control de lotes, fechas de vencimiento, registro sanitario, DIGEMID y reporte OPPF mensual automático.',
    checks: ['Catálogo DIGEMID con 18 000+ registros vinculables','Alertas de vencimiento por lote antes de perder mercadería','Reporte OPPF mensual en ZIP, listo para presentar'],
    tags: ['Lotes y vencimientos','Registro sanitario','DIGEMID','OPPF','POS','Facturación SUNAT'],
  },
  ropa: {
    title: 'Tiendas de ropa',
    desc: 'Gestión por talla y color, control de stock por variante y POS rápido con búsqueda por categoría.',
    checks: ['Una ficha por producto, stock separado por variante','Búsqueda por categoría para cobrar sin código de barras','Cambios y devoluciones con nota de crédito aplicable en caja'],
    tags: ['Tallas y colores','Variantes','Devoluciones','POS'],
  },
  bodega: {
    title: 'Tiendas y bodegas',
    desc: 'POS rápido con caja integrada, historial diario de ventas, control de proveedores y alertas de stock.',
    checks: ['Cobro en segundos con código de barras y vuelto automático','Cierre de caja diario con totales por método de pago','Alertas de stock mínimo para reponer antes de quedarte sin nada'],
    tags: ['POS','Caja','Alertas de stock','Proveedores'],
  },
  ferreteria: {
    title: 'Ferreterías y distribuidoras',
    desc: 'OCs a varios proveedores, recepciones parciales, costos de compra actualizados y kardex por producto.',
    checks: ['Miles de SKUs con búsqueda instantánea','Recepción parcial cuando el proveedor manda a medias','Kardex valorizado para saber tu margen real'],
    tags: ['Órdenes de compra','Recepciones parciales','Kardex','Costos'],
  },
  minimarket: {
    title: 'Minimarkets',
    desc: 'Manejo de múltiples categorías, POS por código de barras, control de merma y vencimientos.',
    checks: ['Varias cajas y turnos, cada uno con su cierre','Ajustes de inventario para registrar merma sin descuadrar','Permisos por usuario: el cajero solo cobra'],
    tags: ['Turnos de caja','Merma','Categorías','Roles'],
  },
  almacen: {
    title: 'Almacenes y depósitos',
    desc: 'Movimientos de inventario, kardex completo, ajustes manuales y reportes de valorización de stock.',
    checks: ['Ingresos, salidas y traslados con trazabilidad','Traslados entre sucursales en el Plan Pro','Valorización de stock para cierres contables'],
    tags: ['Movimientos','Traslados','Kardex','Valorización'],
  },
};

function RubroContent({ tab }: { tab: Tab }) {
  const r = RUBROS[tab];
  return (
    <div data-r="tabgrid" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:32,alignItems:'center'}}>
      <div>
        <h3 style={{fontSize:'1.5rem',fontWeight:700,letterSpacing:'-.02em',margin:0}}>{r.title}</h3>
        <p style={{fontSize:'.98rem',color:'#9898b0',lineHeight:1.65,margin:'12px 0 0'}}>{r.desc}</p>
        <ul style={{listStyle:'none',margin:'22px 0 0',padding:0,display:'grid',gap:11,fontSize:'.92rem',color:'#d5d6e2'}}>
          {r.checks.map(c => (
            <li key={c} style={{display:'flex',gap:11}}><span style={{color:'#00d4aa'}}>✓</span>{c}</li>
          ))}
        </ul>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,alignContent:'flex-start'}}>
        {r.tags.map(t => <span key={t} style={TAG_STYLE}>{t}</span>)}
      </div>
    </div>
  );
}
