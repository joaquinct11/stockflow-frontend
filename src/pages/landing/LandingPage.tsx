import React, { useEffect, useRef, useState } from 'react';
import './landing.css';
import { authService } from '../../services/auth.service';
import type { PlanCatalogoDTO } from '../../services/auth.service';
import { DEMO_URL, IG_URL, FB_URL, TT_URL, WA_BASE } from '../../constants/landing';

// ── Tab / segmento maps (kept for backward compat + API calls) ───────────────
const TAB_ORDER = ['farmacia','veterinaria','ropa','bodega','ferreteria','minimarket','empresa'] as const;
type Tab = typeof TAB_ORDER[number];

const TAB_SEGMENTO: Record<Tab, string> = {
  farmacia:    'FARMACIA_BOTICA',
  veterinaria: 'VETERINARIA',
  ropa:        'TIENDA_ROPA',
  bodega:      'TIENDA_BODEGA',
  ferreteria:  'FERRETERIA',
  minimarket:  'MINIMARKET',
  empresa:     'EMPRESA_SERVICIOS',
};

export const TAB_TO_REGISTER_SEGMENTO: Record<Tab, string> = {
  farmacia:    'FARMACIA',
  veterinaria: 'VETERINARIA',
  ropa:        'TIENDA_ROPA',
  bodega:      'TIENDA_BODEGA',
  ferreteria:  'FERRETERIA',
  minimarket:  'MINIMARKET',
  empresa:     'EMPRESA_SERVICIOS',
};

export function precioMinimoDesde(
  gruposPlanes: Array<Array<{ nivel: string; precioMensual: number }>>,
): number | null {
  const basicos = gruposPlanes
    .flatMap(g => g)
    .filter(p => p.nivel === 'BASICO')
    .map(p => p.precioMensual);
  return basicos.length > 0 ? Math.min(...basicos) : null;
}

// ── V3 data constants ─────────────────────────────────────────────────────────
const BASICO_COMUNES = [
  'Punto de Venta (POS) con caja integrada',
  'Facturación electrónica SUNAT (boletas y facturas)',
  'Órdenes de compra y recepciones de mercadería',
  'Devoluciones y notas de crédito',
  'Reportes + exportación a Excel y PDF',
  'Roles y permisos por usuario',
  'Soporte por WhatsApp en español',
];

function getProFeatures(pro: PlanCatalogoDTO | undefined): string[] {
  if (!pro) return [
    'Todo lo incluido en Plan Básico',
    'Gestión de múltiples sucursales con stock independiente',
    'Reportes consolidados multi-local',
    'Selector de sucursal en POS y módulos',
    'Mayor capacidad de usuarios y productos',
  ];
  return [
    'Todo lo incluido en Plan Básico',
    `Hasta ${pro.maxSucursales} sucursales con stock independiente`,
    'Reportes consolidados multi-local',
    'Selector de sucursal en POS y módulos',
    `Hasta ${pro.maxUsuarios} usuarios activos`,
    `Hasta ${pro.maxProductos.toLocaleString('es-PE')} productos en catálogo`,
  ];
}

const SEG_CONFIGS = [
  {
    k: 'FARMACIA', label: 'Farmacia y botica',
    planDesc: 'Gestiona tu farmacia con inventario especializado, lotes, vencimientos y herramientas de apoyo DIGEMID.',
    basicoExtra: [
      'Control de lotes y fechas de vencimiento con alertas',
      'Venta por presentación: caja, blíster o tableta',
      'Búsqueda y vinculación al catálogo DIGEMID (~18 000 medicamentos)',
      'Código DIGEMID y registro sanitario por producto',
      'Exportación de reporte OPPF para DIGEMID',
    ],
  },
  {
    k: 'VETERINARIA', label: 'Veterinarias',
    planDesc: 'Organiza la atención de tus pacientes, administra citas y centraliza la información de tus mascotas.',
    basicoExtra: [
      'Ficha de mascota: especie, raza, microchip y peso',
      'Agenda de citas con vista por día y semana',
      'Asignación de profesional por cita',
      'Inventario de medicamentos e insumos veterinarios',
      'Roles: Veterinario, Recepcionista, Groomer y Auxiliar',
    ],
  },
  {
    k: 'TIENDA_ROPA', label: 'Tiendas de ropa',
    planDesc: 'Controla tus productos por tallas y colores, administra variantes y conoce tu stock en tiempo real.',
    basicoExtra: [
      'Gestión de productos por talla y color',
      'Stock independiente por variante (talla-color)',
      'Precio mayorista por cantidad mínima',
      'Descuento manual en venta',
    ],
  },
  {
    k: 'TIENDA_BODEGA', label: 'Tiendas y bodegas',
    planDesc: 'Controla tus ventas, inventario y caja con un sistema diseñado para el ritmo de tu tienda.',
    basicoExtra: [
      'Inventario en tiempo real con alertas de stock mínimo',
      'Kardex de movimientos por producto',
      'Control de caja con apertura y cierre por turno',
      'Precio mayorista por cantidad mínima',
    ],
  },
  {
    k: 'FERRETERIA', label: 'Ferreterías',
    planDesc: 'Administra tu catálogo, controla existencias y gestiona tus compras y proveedores con precisión.',
    basicoExtra: [
      'Inventario en tiempo real con alertas de stock mínimo',
      'Recepciones parciales de órdenes de compra',
      'Kardex valorizado con costos actualizados',
      'Precio mayorista por cantidad mínima',
    ],
  },
  {
    k: 'MINIMARKET', label: 'Minimarkets',
    planDesc: 'Gestiona ventas, inventario y caja con múltiples turnos y control de merma.',
    basicoExtra: [
      'Inventario en tiempo real con alertas de stock mínimo',
      'Múltiples turnos de caja con cierre independiente',
      'Ajustes de inventario para registrar merma',
      'Precio mayorista por cantidad mínima',
    ],
  },
  {
    k: 'EMPRESA_SERVICIOS', label: 'Empresa de servicios',
    planDesc: 'Organiza tus servicios, administra equipos de clientes y controla cada orden de trabajo desde su apertura hasta la entrega.',
    basicoExtra: [
      'Gestión completa de órdenes de trabajo (OT)',
      'Registro de equipos y datos del cliente',
      'Consumo de materiales y devoluciones en OT',
      'Cierre técnico y entrega con firma del cliente',
      'Facturación directa desde la orden de trabajo',
      'Rol Técnico de Servicio incluido en el plan',
    ],
  },
];
const FAQS: [string, string][] = [
  ['¿Qué es Fluxus y cómo puede ayudar a mi negocio?','Fluxus es un sistema de gestión en la nube para negocios peruanos. Reúne punto de venta con caja, inventario, compras, facturación electrónica SUNAT, reportes y usuarios en una sola plataforma, para que dejes de trabajar con cuadernos y hojas de Excel separadas.'],
  ['¿Para qué tipos de negocios está diseñado?','Para farmacias y boticas, veterinarias, tiendas de ropa, tiendas y bodegas, ferreterías, minimarkets y empresas de servicios. Cada rubro tiene funciones propias, como lotes y DIGEMID en farmacias, tallas y colores en ropa, o mascotas y citas en veterinarias.'],
  ['¿Puedo administrar varias sucursales?','Sí. El Plan Pro permite gestionar hasta 5 sucursales, cada una con su propio stock, caja y POS, y ver los reportes consolidados de todos tus locales.'],
  ['¿Puedo controlar mi inventario en tiempo real?','Sí. El stock baja con cada venta y sube con cada recepción de mercadería. Tienes alertas de stock mínimo, kardex por producto y, según tu rubro, control por lote y fecha de vencimiento.'],
  ['¿Fluxus permite emitir boletas y facturas electrónicas?','Sí, en todos los planes. Emites boletas y facturas desde la misma venta, se envían a SUNAT y guardas el CDR, el XML y el PDF. Las notas de crédito electrónicas también están incluidas.'],
  ['¿Puedo tener varios usuarios con diferentes permisos?','Sí. Cada persona entra con su propio usuario y un rol (Administrador, Gerente, Vendedor, Almacenero y más), y puedes ajustar los permisos por módulo. La cantidad de usuarios depende de tu plan.'],
  ['¿Puedo acceder desde diferentes dispositivos?','Sí. Fluxus funciona desde el navegador, así que puedes entrar desde tu computadora, laptop o tablet con tu usuario y contraseña, estés en el local o fuera de él.'],
  ['¿Cómo funcionan los planes y suscripciones?','Hay dos planes, Básico y Pro, con un precio mensual que depende de tu rubro. Empiezas con 14 días de prueba gratuita, sin tarjeta y sin permanencia, y desde el sistema puedes ver o cambiar tu plan.'],
  ['¿Necesito instalar algún programa?','No. Todo funciona en la nube: solo necesitas conexión a internet y un navegador actualizado. Las actualizaciones llegan solas, sin que tengas que hacer nada.'],
  ['¿Cómo puedo comenzar a utilizar Fluxus?','Crea tu cuenta, elige tu rubro y tu plan, y empieza tu prueba de 14 días. Si prefieres verlo antes, solicita una demo gratis y te mostramos el sistema por WhatsApp.'],
];

// ── SVG icons (memoized) ─────────────────────────────────────────────────────
const IcoArrow = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>;
const IcoCheck = ({w=11}:{w?:number}) => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="m5 12 5 5L20 7"/></svg>;
const IcoWa = ({size=16}:{size?:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M3.5 20.5 5 16.3A8.5 8.5 0 1 1 8 19.2Z"/><path d="M9.2 8.6c-.2 2.9 3 6.4 6.2 6.2l.9-1.2-1.6-.9-.8.6c-.9-.4-1.9-1.4-2.3-2.3l.6-.8-.9-1.6Z" fill="currentColor" stroke="none"/></svg>;
const IcoIg = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none"/></svg>;
const IcoFb = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M14 8h2.5V4.5H14c-2.5 0-4 1.6-4 4.1V11H7.5v3.5H10V21h3.6v-6.5h2.6l.5-3.5h-3.1V8.9c0-.6.3-.9.9-.9Z" fill="currentColor" stroke="none"/></svg>;
const IcoTt = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M16.5 3c.4 2.3 1.9 3.8 4 4v3.3c-1.5 0-2.9-.4-4-1.2v6.4A5.6 5.6 0 1 1 10.9 10v3.4a2.3 2.3 0 1 0 2.3 2.2V3h3.3Z" fill="currentColor" stroke="none"/></svg>;

const SOCIAL_BTN = {width:'34px',height:'34px',display:'grid',placeItems:'center',borderRadius:'10px',color:'#a4a6bb',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',transition:'all .2s'} as React.CSSProperties;
const SOCIAL_BTN_LG = {...SOCIAL_BTN,width:'38px',height:'38px'} as React.CSSProperties;

// ── Badge / label shared styles ───────────────────────────────────────────────
const PILL_PURPLE = {fontFamily:"'Space Mono',monospace",fontSize:'.66rem',color:'#a79fff',background:'rgba(108,99,255,.1)',border:'1px solid rgba(108,99,255,.22)',borderRadius:'6px',padding:'4px 8px',whiteSpace:'nowrap'} as React.CSSProperties;

export default function LandingPage() {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [seg, setSeg]             = useState(0);
  const [faqOpen, setFaqOpen]     = useState(-1);
  const [planes, setPlanes]       = useState<PlanCatalogoDTO[] | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const revealRef                 = useRef<IntersectionObserver | null>(null);
  const timerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef                  = useRef<HTMLVideoElement | null>(null);

  // ── Scroll-reveal ──────────────────────────────────────────────────────────
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    timerRef.current = setTimeout(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
      const vh  = window.innerHeight;
      const pend = els.filter(el => el.getBoundingClientRect().top > vh * 0.92);
      pend.forEach(el => {
        el.style.opacity   = '0';
        el.style.transform = 'translateY(26px)';
        el.style.transition = 'opacity .7s cubic-bezier(.2,.7,.3,1), transform .7s cubic-bezier(.2,.7,.3,1), border-color .25s, box-shadow .25s';
      });
      revealRef.current = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          el.style.opacity = '1'; el.style.transform = '';
          setTimeout(() => { el.style.transition = ''; }, 800);
          revealRef.current?.unobserve(el);
        });
      }, { rootMargin: '0px 0px -10% 0px' });
      pend.forEach(el => revealRef.current?.observe(el));
    }, 60);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      revealRef.current?.disconnect();
    };
  }, []);

  // ── Cerrar modal de video con Esc ────────────────────────────────────────
  useEffect(() => {
    if (!videoOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVideoOpen(false);
        if (videoRef.current) videoRef.current.pause();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [videoOpen]);

  // ── Load plan prices when seg changes ─────────────────────────────────────
  useEffect(() => {
    setPlanes(null);
    const tab = TAB_ORDER[seg];
    const segmento = TAB_SEGMENTO[tab];
    let cancelled = false;
    authService.getPlanesSegmento(segmento).then(data => {
      if (!cancelled) setPlanes(data);
    }).catch(() => { if (!cancelled) setPlanes([]); });
    return () => { cancelled = true; };
  }, [seg]);

  const segConfig = SEG_CONFIGS[seg];
  const basico  = planes?.find(p => p.nivel === 'BASICO');
  const pro     = planes?.find(p => p.nivel === 'PRO');
  const registerSegmento = segConfig.k;
  const waPlanesUrl = `${WA_BASE}${encodeURIComponent('Hola, quiero consultar los planes de Fluxus para mi negocio (' + segConfig.label + ').')}`;

  const closeMenu = () => setMenuOpen(false);

  // ── Shared button styles ──────────────────────────────────────────────────
  const BTN_PRIMARY = {display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'9px',height:'40px',padding:'0 16px',borderRadius:'12px',fontWeight:600,fontSize:'.88rem',whiteSpace:'nowrap',color:'#fff',background:'linear-gradient(135deg,#7d74ff,#5b52f0 55%,#4d6bff)',boxShadow:'0 14px 34px -14px rgba(108,99,255,.95),inset 0 1px 0 rgba(255,255,255,.22)',transition:'transform .2s,box-shadow .2s'} as React.CSSProperties;
  const BTN_GHOST   = {display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'9px',height:'40px',padding:'0 16px',borderRadius:'12px',fontWeight:600,fontSize:'.88rem',whiteSpace:'nowrap',color:'#ececf3',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.13)',transition:'all .2s'} as React.CSSProperties;
  const ICON_BOX    = {width:'48px',height:'48px',flexShrink:0,display:'grid',placeItems:'center',borderRadius:'14px',color:'#c9c5ff',background:'linear-gradient(145deg,rgba(108,99,255,.28),rgba(77,141,255,.10))',border:'1px solid rgba(139,133,255,.32)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.08)'} as React.CSSProperties;
  const ICON_BOX_SM = {...ICON_BOX,width:'42px',height:'42px',borderRadius:'13px'} as React.CSSProperties;

  return (
    <div className="lp">

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <div style={{position:'fixed',top:'14px',left:0,right:0,zIndex:1000,display:'flex',justifyContent:'center',padding:'0 16px',pointerEvents:'none'}}>
        <nav style={{pointerEvents:'auto',display:'flex',alignItems:'center',gap:'22px',width:'100%',maxWidth:'1240px',padding:'9px 10px 9px 16px',border:'1px solid rgba(255,255,255,.08)',borderRadius:'18px',background:'rgba(10,11,17,.74)',backdropFilter:'blur(18px) saturate(1.3)',boxShadow:'0 16px 44px -22px rgba(0,0,0,.95)'}}>
          <a href="#inicio" style={{display:'flex',alignItems:'center',gap:'9px',flexShrink:0,color:'#ececf3'}}>
            <img src="/fluxus.png" alt="Fluxus" style={{width:'32px',height:'32px',borderRadius:'9px',objectFit:'cover'}} />
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:'1.05rem',fontWeight:700,background:'linear-gradient(120deg,#c3bfff 0%,#8b85ff 42%,#5b9dff 100%)',WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent',color:'transparent'}}>Fluxus</span>
          </a>
          <div data-r="nav-links" style={{display:'flex',alignItems:'center',gap:'4px'}}>
            {[['Inicio','#inicio'],['Soluciones','#soluciones'],['Funcionalidades','#funcionalidades'],['Planes','#planes'],['Preguntas frecuentes','#faq']].map(([label,href]) => (
              <a key={href} href={href} className="lp-nav-link">{label}</a>
            ))}
          </div>
          <div style={{flex:1}} />
          <div data-r="nav-social" style={{display:'flex',gap:'6px'}}>
            <a href={IG_URL||'#'} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={SOCIAL_BTN}><IcoIg/></a>
            <a href={FB_URL||'#'} target="_blank" rel="noopener noreferrer" aria-label="Facebook"  style={SOCIAL_BTN}><IcoFb/></a>
            <a href={TT_URL||'#'} target="_blank" rel="noopener noreferrer" aria-label="TikTok"    style={SOCIAL_BTN}><IcoTt/></a>
          </div>
          <span data-r="nav-div" style={{width:'1px',height:'24px',background:'rgba(255,255,255,.13)'}} />
          <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
            <a href="/login" data-r="nav-login" style={BTN_GHOST}>Iniciar sesión</a>
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" data-r="nav-demo" style={BTN_PRIMARY}>Solicitar demo gratis</a>
            <button type="button" data-r="nav-burger" onClick={() => setMenuOpen(o => !o)} aria-label="Abrir menú"
              style={{display:'none',width:'40px',height:'40px',placeItems:'center',color:'#ececf3',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.13)',borderRadius:'11px',cursor:'pointer'}}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
          </div>
        </nav>
      </div>

      {/* ── MOBILE MENU ──────────────────────────────────────────────────── */}
      {menuOpen && (
        <div onClick={closeMenu} style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(5,6,10,.7)',backdropFilter:'blur(6px)',animation:'fx-fade .2s ease'}}>
          <div onClick={e => e.stopPropagation()} style={{position:'absolute',top:'10px',left:'10px',right:'10px',padding:'16px',border:'1px solid rgba(255,255,255,.13)',borderRadius:'20px',background:'#0d0e15',boxShadow:'0 30px 70px -30px rgba(0,0,0,1)',animation:'fx-drop .25s cubic-bezier(.2,.8,.3,1)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{display:'flex',alignItems:'center',gap:'9px'}}>
                <img src="/fluxus.png" alt="Fluxus" style={{width:'30px',height:'30px',borderRadius:'8px'}} />
                <span style={{fontFamily:"'Space Mono',monospace",fontWeight:700,background:'linear-gradient(120deg,#c3bfff 0%,#8b85ff 42%,#5b9dff 100%)',WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent',color:'transparent'}}>Fluxus</span>
              </span>
              <button type="button" onClick={closeMenu} aria-label="Cerrar menú" style={{width:'40px',height:'40px',display:'grid',placeItems:'center',color:'#ececf3',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.13)',borderRadius:'11px',cursor:'pointer'}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{display:'grid',gap:'2px',marginTop:'14px'}}>
              {[['Inicio','#inicio'],['Soluciones','#soluciones'],['Funcionalidades','#funcionalidades'],['Planes','#planes'],['Preguntas frecuentes','#faq']].map(([label,href]) => (
                <a key={href} href={href} onClick={closeMenu} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 12px',borderRadius:'12px',fontSize:'1.05rem',fontWeight:600,color:'#ececf3'}}>
                  {label}<span style={{color:'#6b6d84'}}><IcoArrow/></span>
                </a>
              ))}
            </div>
            <div style={{display:'grid',gap:'8px',marginTop:'14px'}}>
              <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" style={{...BTN_PRIMARY,height:'50px',width:'100%',fontSize:'.98rem'}}>Solicitar demo gratis</a>
              <a href="/login" style={{...BTN_GHOST,height:'50px',width:'100%',fontSize:'.98rem'}}>Iniciar sesión</a>
            </div>
            <div style={{display:'flex',justifyContent:'center',gap:'8px',marginTop:'16px'}}>
              <a href={IG_URL||'#'} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={SOCIAL_BTN}><IcoIg/></a>
              <a href={FB_URL||'#'} target="_blank" rel="noopener noreferrer" aria-label="Facebook"  style={SOCIAL_BTN}><IcoFb/></a>
              <a href={TT_URL||'#'} target="_blank" rel="noopener noreferrer" aria-label="TikTok"    style={SOCIAL_BTN}><IcoTt/></a>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section id="inicio" data-r="sec" style={{position:'relative',padding:'150px 28px 90px',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(139,133,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(139,133,255,.05) 1px,transparent 1px)',backgroundSize:'56px 56px',maskImage:'radial-gradient(90% 70% at 60% 30%,#000 20%,transparent 70%)',WebkitMaskImage:'radial-gradient(90% 70% at 60% 30%,#000 20%,transparent 70%)',pointerEvents:'none'}} />
        <div style={{position:'absolute',top:'-260px',right:'-180px',width:'900px',height:'760px',background:'radial-gradient(45% 45% at 50% 50%,rgba(108,99,255,.38),transparent 70%)',filter:'blur(30px)',pointerEvents:'none'}} />
        <div style={{position:'absolute',bottom:'-200px',left:'-220px',width:'720px',height:'560px',background:'radial-gradient(45% 45% at 50% 50%,rgba(77,141,255,.2),transparent 70%)',filter:'blur(30px)',pointerEvents:'none'}} />
        <div data-r="hero-grid" style={{position:'relative',maxWidth:'1240px',margin:'0 auto',display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1.12fr)',gap:'56px',alignItems:'center'}}>
          <div data-r="hero-left" style={{display:'flex',flexDirection:'column',alignItems:'flex-start',animation:'fx-in .8s cubic-bezier(.2,.7,.3,1) both'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:'9px',whiteSpace:'nowrap',maxWidth:'100%',padding:'6px 14px 6px 8px',border:'1px solid rgba(139,133,255,.3)',borderRadius:'40px',background:'rgba(108,99,255,.1)',fontSize:'.8rem',fontWeight:500,color:'#a79fff'}}>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.62rem',fontWeight:700,letterSpacing:'.08em',color:'#fff',background:'linear-gradient(135deg,#6c63ff,#4d8dff)',padding:'3px 8px',borderRadius:'20px'}}>NUEVO</span>
              ERP en la nube con facturación SUNAT
            </div>
            <h1 style={{fontSize:'clamp(2.5rem,5.2vw,4.4rem)',fontWeight:700,lineHeight:1.02,letterSpacing:'-.04em',margin:'24px 0 0',textWrap:'balance' as React.CSSProperties['textWrap']}}>
              Gestiona tu negocio de forma{' '}
              <span style={{background:'linear-gradient(120deg,#c3bfff 0%,#8b85ff 42%,#5b9dff 100%)',WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent',color:'transparent'}}>simple, ordenada y eficiente</span>
            </h1>
            <p style={{fontSize:'1.15rem',lineHeight:1.65,color:'#a4a6bb',margin:'22px 0 0',maxWidth:'540px',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Controla tus ventas, inventario, compras, facturación y mucho más desde una sola plataforma en la nube.</p>
            <div data-r="herocta" style={{display:'flex',flexWrap:'wrap',gap:'12px',marginTop:'34px'}}>
              <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" style={{...BTN_PRIMARY,height:'54px',fontSize:'1.02rem',padding:'0 26px'}}>
                Solicitar demo gratis
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
              </a>
              <button type="button" onClick={() => setVideoOpen(true)} style={{...BTN_GHOST,height:'54px',fontSize:'1.02rem',padding:'0 24px',cursor:'pointer'}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5Z" fill="currentColor"/></svg>
                Ver cómo funciona
              </button>
            </div>
            <div data-r="benefits" style={{display:'flex',flexWrap:'wrap',gap:'10px 22px',marginTop:'34px'}}>
              {[
                {icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>,label:'Fácil de usar'},
                {icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 0 0 4.6 12.6 3.5 3.5 0 0 0 6.5 19Z"/></svg>,label:'En la nube'},
                {icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,label:'Gestión centralizada'},
              ].map(({icon,label}) => (
                <span key={label} style={{display:'flex',alignItems:'center',gap:'9px',fontSize:'.92rem',fontWeight:500,color:'#ececf3'}}>
                  <span style={{width:'30px',height:'30px',borderRadius:'9px',display:'grid',placeItems:'center',color:'#a79fff',background:'rgba(108,99,255,.12)',border:'1px solid rgba(139,133,255,.22)'}}>{icon}</span>
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div style={{position:'relative',perspective:'2200px',animation:'fx-in .9s .12s cubic-bezier(.2,.7,.3,1) both'}}>
            <div style={{position:'absolute',inset:'6% -4% -2% 2%',background:'radial-gradient(55% 55% at 50% 45%,rgba(108,99,255,.42),transparent 70%)',filter:'blur(40px)',pointerEvents:'none'}} />
            <div data-r="screen" style={{position:'relative',transformStyle:'preserve-3d',transition:'transform .6s cubic-bezier(.2,.7,.3,1)'}}>
              <div style={{borderRadius:'16px',overflow:'hidden',background:'#0f1117',border:'1px solid rgba(255,255,255,.13)',boxShadow:'0 60px 120px -50px rgba(0,0,0,1),0 0 0 1px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06)'}}>
                <div data-r="winbar" style={{position:'relative',display:'flex',alignItems:'center',height:'48px',padding:'0 18px',background:'linear-gradient(180deg,#20212b,#1a1b24)',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
                  <div data-r="lights" style={{display:'flex',gap:'8px'}}>
                    <span style={{width:'12px',height:'12px',borderRadius:'50%',background:'#ff5f57',boxShadow:'inset 0 0 0 .5px rgba(0,0,0,.3)'}} />
                    <span style={{width:'12px',height:'12px',borderRadius:'50%',background:'#febc2e',boxShadow:'inset 0 0 0 .5px rgba(0,0,0,.3)'}} />
                    <span style={{width:'12px',height:'12px',borderRadius:'50%',background:'#28c840',boxShadow:'inset 0 0 0 .5px rgba(0,0,0,.3)'}} />
                  </div>
                  <div data-r="urlpill" style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',width:'46%',maxWidth:'360px',height:'30px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',borderRadius:'8px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',fontFamily:"'Space Mono',monospace",fontSize:'.72rem',color:'#7d7f96',whiteSpace:'nowrap',overflow:'hidden'}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e5a443" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    fluxus.pe/dashboard
                  </div>
                </div>
                <img src="/dashboard-preview.png" alt="Dashboard de Fluxus" style={{display:'block',width:'100%',height:'auto'}} />
              </div>
            </div>
            <div data-r="chips" style={{display:'contents'}}>
              <div data-r="chip" style={{position:'absolute',top:'8%',left:'-6%',display:'flex',alignItems:'center',gap:'10px',padding:'11px 14px',border:'1px solid rgba(255,255,255,.13)',borderRadius:'14px',background:'rgba(14,15,22,.9)',backdropFilter:'blur(10px)',boxShadow:'0 20px 40px -20px rgba(0,0,0,.9)',animation:'fx-float 6s ease-in-out infinite'}}>
                <span style={{width:'30px',height:'30px',borderRadius:'9px',display:'grid',placeItems:'center',color:'#04110d',background:'#00d4aa'}}><IcoCheck w={15}/></span>
                <span>
                  <span style={{display:'block',fontSize:'.78rem',fontWeight:650,whiteSpace:'nowrap'}}>Boleta aceptada por SUNAT</span>
                  <span style={{display:'block',fontFamily:"'Space Mono',monospace",fontSize:'.64rem',color:'#6b6d84',marginTop:'2px',whiteSpace:'nowrap'}}>B001-002914 · CDR guardado</span>
                </span>
              </div>
              <div data-r="chip" style={{position:'absolute',bottom:'10%',right:'-4%',display:'flex',alignItems:'center',gap:'10px',padding:'11px 14px',border:'1px solid rgba(255,255,255,.13)',borderRadius:'14px',background:'rgba(14,15,22,.9)',backdropFilter:'blur(10px)',boxShadow:'0 20px 40px -20px rgba(0,0,0,.9)',animation:'fx-float 7s 1.2s ease-in-out infinite'}}>
                <span style={{width:'30px',height:'30px',borderRadius:'9px',display:'grid',placeItems:'center',color:'#2a1a00',background:'#f5a524'}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>
                </span>
                <span>
                  <span style={{display:'block',fontSize:'.78rem',fontWeight:650,whiteSpace:'nowrap'}}>Stock bajo</span>
                  <span style={{display:'block',fontFamily:"'Space Mono',monospace",fontSize:'.64rem',color:'#6b6d84',marginTop:'2px',whiteSpace:'nowrap'}}>3 productos por reponer</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOLUCIONES ───────────────────────────────────────────────────── */}
      <section id="soluciones" data-r="sec" style={{position:'relative',padding:'90px 28px 0'}}>
        <div style={{maxWidth:'1240px',margin:'0 auto'}}>
          <div data-reveal="1" style={{display:'flex',flexWrap:'wrap',alignItems:'flex-end',justifyContent:'space-between',gap:'24px'}}>
            <div style={{maxWidth:'660px'}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:'10px',fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#a79fff'}}><span style={{width:'22px',height:'1px',background:'linear-gradient(90deg,transparent,#8b85ff)'}} />Soluciones</div>
              <h2 style={{fontSize:'clamp(2rem,3.6vw,3.05rem)',fontWeight:700,lineHeight:1.07,letterSpacing:'-.032em',margin:'16px 0 0',textWrap:'balance' as React.CSSProperties['textWrap']}}>Un mismo sistema, adaptado a <span style={{background:'linear-gradient(120deg,#c3bfff 0%,#8b85ff 42%,#5b9dff 100%)',WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent',color:'transparent'}}>tu tipo de negocio</span></h2>
            </div>
            <p style={{fontSize:'1.05rem',lineHeight:1.65,color:'#a4a6bb',margin:0,maxWidth:'380px',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Cada rubro trae las herramientas que necesita. Elige el tuyo y mira sus planes.</p>
          </div>
          <div data-r="segs" style={{display:'grid',gridTemplateColumns:'repeat(12,minmax(0,1fr))',gap:'14px',marginTop:'44px'}}>
            {SEG_CONFIGS.map((s,i) => (
              <a key={s.k} href="#planes" onClick={() => { setSeg(i); }} data-reveal="1"
                className="lp-seg-card"
                style={{position:'relative',border:'1px solid rgba(255,255,255,.08)',borderRadius:'20px',background:'linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01))',overflow:'hidden',gridColumn:`span ${i < 4 ? 3 : 4}`,display:'flex',flexDirection:'column',padding:'24px 24px 22px',color:'#ececf3'}}>
                <div style={{position:'absolute',top:'-60px',right:'-60px',width:'180px',height:'180px',borderRadius:'50%',background:'radial-gradient(circle,rgba(108,99,255,.18),transparent 70%)',pointerEvents:'none'}} />
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
                  <span style={ICON_BOX}>{SEG_ICONS[i]}</span>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.68rem',color:'#6b6d84'}}>{String(i+1).padStart(2,'0')}</span>
                </div>
                <h3 style={{fontSize:'1.18rem',fontWeight:650,letterSpacing:'-.015em',margin:'20px 0 0'}}>{s.label}</h3>
                <p style={{flex:1,fontSize:'.88rem',lineHeight:1.6,color:'#a4a6bb',margin:'8px 0 0',textWrap:'pretty' as React.CSSProperties['textWrap']}}>{SEG_DESC[i]}</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'16px'}}>
                  {SEG_TAGS[i].map(t => <span key={t} style={PILL_PURPLE}>{t}</span>)}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'7px',marginTop:'18px',fontSize:'.84rem',fontWeight:600,color:'#8b85ff'}}>Ver planes para este rubro<IcoArrow/></div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ──────────────────────────────────────────────── */}
      <section id="funcionalidades" data-r="sec" style={{position:'relative',padding:'120px 28px 0'}}>
        <div style={{maxWidth:'1240px',margin:'0 auto'}}>
          <div data-reveal="1" style={{maxWidth:'700px'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:'10px',fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#a79fff'}}><span style={{width:'22px',height:'1px',background:'linear-gradient(90deg,transparent,#8b85ff)'}} />Funcionalidades</div>
            <h2 style={{fontSize:'clamp(2rem,3.6vw,3.05rem)',fontWeight:700,lineHeight:1.07,letterSpacing:'-.032em',margin:'16px 0 0',textWrap:'balance' as React.CSSProperties['textWrap']}}>Todo lo que tu negocio necesita, <span style={{background:'linear-gradient(120deg,#c3bfff 0%,#8b85ff 42%,#5b9dff 100%)',WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent',color:'transparent'}}>conectado</span></h2>
            <p style={{fontSize:'1.05rem',lineHeight:1.65,color:'#a4a6bb',margin:'16px 0 0',maxWidth:'600px',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Cada venta descuenta stock, cada compra lo repone y cada comprobante llega a SUNAT. Sin apps separadas ni Excel.</p>
          </div>
          <div data-r="feat" style={{display:'grid',gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:'14px',marginTop:'44px'}}>

            {/* POS – span 4 */}
            <div data-wide="1" data-reveal="1" data-r="featpos" className="lp-feat-card"
              style={{position:'relative',border:'1px solid rgba(255,255,255,.08)',borderRadius:'20px',overflow:'hidden',gridColumn:'span 4',padding:'28px',display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:'26px',alignItems:'center',background:'linear-gradient(135deg,rgba(108,99,255,.13),rgba(77,141,255,.04) 60%,rgba(255,255,255,.01))'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={ICON_BOX_SM}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg></span>
                  <h3 style={{fontSize:'1.12rem',fontWeight:650,letterSpacing:'-.015em',margin:0}}>Ventas y punto de venta (POS)</h3>
                </div>
                <p style={{fontSize:'.9rem',lineHeight:1.6,color:'#a4a6bb',margin:'12px 0 0',maxWidth:'520px',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Búsqueda por nombre o código de barras, cobro mixto en efectivo, tarjeta o Yape/Plin, vuelto automático y caja con apertura y cierre por turno.</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'18px'}}>
                  {['F2 Cobrar','F4 Limpiar','Caja integrada'].map(t => <span key={t} style={{...PILL_PURPLE,color:'#a4a6bb',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)'}}>{t}</span>)}
                </div>
              </div>
              <div style={{border:'1px solid rgba(255,255,255,.08)',borderRadius:'14px',background:'rgba(8,9,13,.65)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04)',overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px'}}>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.66rem',letterSpacing:'.1em',color:'#6b6d84'}}>VENTA EN CURSO</span>
                  <span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#00d4aa',animation:'fx-pulse 2s infinite'}} />
                </div>
                {[['Producto A','x2','S/ 7,00'],['Producto B','x1','S/ 9,90'],['Producto C','x3','S/ 13,50']].map(([prod,qty,price]) => (
                  <div key={prod} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderTop:'1px solid rgba(255,255,255,.08)'}}>
                    <span style={{width:'26px',height:'26px',borderRadius:'7px',background:'rgba(108,99,255,.16)',flexShrink:0}} />
                    <span style={{flex:1,minWidth:0,fontSize:'.8rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{prod}</span>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',color:'#6b6d84'}}>{qty}</span>
                    <span style={{minWidth:'62px',textAlign:'right',fontSize:'.8rem',fontWeight:600}}>{price}</span>
                  </div>
                ))}
                <div style={{padding:'12px',borderTop:'1px solid rgba(255,255,255,.08)',background:'rgba(108,99,255,.08)'}}>
                  <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
                    <span style={{fontSize:'.78rem',color:'#a4a6bb'}}>Total</span>
                    <span style={{fontSize:'1.3rem',fontWeight:700,letterSpacing:'-.02em'}}>S/ 30,40</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:'5px',marginTop:'10px'}}>
                    {[['Efectivo',false],['Yape',true],['Plin',false],['Tarjeta',false]].map(([m,active]) => (
                      <span key={m as string} style={{textAlign:'center',fontSize:'.66rem',fontWeight:600,padding:'6px 0',borderRadius:'7px',color:(active?'#fff':'#a4a6bb'),background:(active?'#6c63ff':'rgba(255,255,255,.05)')}}>{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Facturación – span 2 */}
            <div data-reveal="1" className="lp-feat-card"
              style={{position:'relative',border:'1px solid rgba(0,212,170,.25)',borderRadius:'20px',overflow:'hidden',gridColumn:'span 2',padding:'28px',display:'flex',flexDirection:'column',background:'linear-gradient(160deg,rgba(0,212,170,.08),rgba(255,255,255,.01) 60%)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={ICON_BOX_SM}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg></span>
                <h3 style={{fontSize:'1.12rem',fontWeight:650,letterSpacing:'-.015em',margin:0}}>Facturación electrónica</h3>
              </div>
              <p style={{fontSize:'.9rem',lineHeight:1.6,color:'#a4a6bb',margin:'12px 0 0',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Boletas y facturas desde la misma venta, enviadas a SUNAT con CDR, XML y PDF. Notas de crédito incluidas.</p>
              <div style={{flex:1}} />
              <div style={{border:'1px solid rgba(255,255,255,.08)',borderRadius:'14px',background:'rgba(8,9,13,.65)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04)',padding:'14px',marginTop:'20px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',fontWeight:700}}>B001-002914</span>
                  <span style={{fontSize:'.66rem',fontWeight:700,color:'#00d4aa',background:'rgba(0,212,170,.12)',padding:'3px 8px',borderRadius:'20px'}}>Aceptada</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'14px'}}>
                  {['Emitida','Enviada','CDR'].map((step,i) => (
                    <React.Fragment key={step}>
                      <span style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'.68rem',color:'#a4a6bb'}}>
                        <span style={{width:'16px',height:'16px',borderRadius:'50%',display:'grid',placeItems:'center',background:'#00d4aa',color:'#04110d'}}><IcoCheck w={10}/></span>
                        {step}
                      </span>
                      {i < 2 && <span style={{flex:1,height:'1px',background:'rgba(0,212,170,.4)'}} />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Inventario – span 2 */}
            <div data-reveal="1" className="lp-feat-card"
              style={{position:'relative',border:'1px solid rgba(255,255,255,.08)',borderRadius:'20px',overflow:'hidden',gridColumn:'span 2',padding:'26px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={ICON_BOX_SM}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg></span>
                <h3 style={{fontSize:'1.12rem',fontWeight:650,letterSpacing:'-.015em',margin:0}}>Gestión de inventario</h3>
              </div>
              <p style={{fontSize:'.9rem',lineHeight:1.6,color:'#a4a6bb',margin:'12px 0 0',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Stock en tiempo real con cada venta y recepción, alertas de stock mínimo, kardex y control por lote y vencimiento.</p>
              <div style={{display:'grid',gap:'9px',marginTop:'20px'}}>
                {[['Stock alto','82%','#00d4aa'],['Stock medio','48%','#8b85ff'],['Por reponer','14%','#f5a524']].map(([label,w,color]) => (
                  <div key={label as string} style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'.72rem',color:'#a4a6bb'}}>
                    <span style={{width:'78px'}}>{label}</span>
                    <span style={{flex:1,height:'6px',borderRadius:'6px',background:'rgba(255,255,255,.06)',overflow:'hidden'}}>
                      <span style={{display:'block',height:'100%',width:w as string,borderRadius:'6px',background:color as string}} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compras – span 2 */}
            <div data-reveal="1" className="lp-feat-card"
              style={{position:'relative',border:'1px solid rgba(255,255,255,.08)',borderRadius:'20px',overflow:'hidden',gridColumn:'span 2',padding:'26px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={ICON_BOX_SM}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg></span>
                <h3 style={{fontSize:'1.12rem',fontWeight:650,letterSpacing:'-.015em',margin:0}}>Compras y proveedores</h3>
              </div>
              <p style={{fontSize:'.9rem',lineHeight:1.6,color:'#a4a6bb',margin:'12px 0 0',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Órdenes de compra con estados, recepciones parciales y costos actualizados por proveedor.</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'20px'}}>
                {[['#6b6d84','Borrador'],['#8b85ff','Enviada'],['#f5a524','Recibida parcial'],['#00d4aa','Completada']].map(([color,label]) => (
                  <span key={label as string} style={{display:'inline-flex',alignItems:'center',gap:'6px',fontSize:'.7rem',fontWeight:600,color:'#ececf3',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',padding:'5px 9px',borderRadius:'20px'}}>
                    <span style={{width:'6px',height:'6px',borderRadius:'50%',background:color as string}} />{label}
                  </span>
                ))}
              </div>
            </div>

            {/* Reportes – span 2 */}
            <div data-reveal="1" className="lp-feat-card"
              style={{position:'relative',border:'1px solid rgba(255,255,255,.08)',borderRadius:'20px',overflow:'hidden',gridColumn:'span 2',padding:'26px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={ICON_BOX_SM}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/></svg></span>
                <h3 style={{fontSize:'1.12rem',fontWeight:650,letterSpacing:'-.015em',margin:0}}>Reportes y análisis</h3>
              </div>
              <p style={{fontSize:'.9rem',lineHeight:1.6,color:'#a4a6bb',margin:'12px 0 0',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Ventas, productos, vendedores e inventario, con exportación a Excel y PDF.</p>
              <div style={{display:'flex',alignItems:'flex-end',gap:'6px',height:'56px',marginTop:'20px'}}>
                {[34,48,40,62,55,78,70,92].map((h,i) => (
                  <span key={i} style={{flex:1,height:`${h}%`,borderRadius:'4px 4px 2px 2px',background:i===7?'linear-gradient(180deg,#8b85ff,#6c63ff)':'rgba(139,133,255,.28)'}} />
                ))}
              </div>
            </div>

            {/* Usuarios – span 3 */}
            <div data-wide="1" data-reveal="1" className="lp-feat-card"
              style={{position:'relative',border:'1px solid rgba(255,255,255,.08)',borderRadius:'20px',overflow:'hidden',gridColumn:'span 3',padding:'26px',display:'flex',flexDirection:'column'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={ICON_BOX_SM}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg></span>
                <h3 style={{fontSize:'1.12rem',fontWeight:650,letterSpacing:'-.015em',margin:0}}>Usuarios y permisos</h3>
              </div>
              <p style={{fontSize:'.9rem',lineHeight:1.6,color:'#a4a6bb',margin:'12px 0 0',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Cada persona entra con su usuario y ve solo lo que su rol permite. Ajusta permisos por módulo.</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginTop:'20px'}}>
                {[['A','oklch(0.55 0.16 275)','Administrador'],['G','oklch(0.55 0.16 250)','Gerente'],['V','oklch(0.55 0.16 200)','Vendedor'],['A','oklch(0.55 0.16 160)','Almacenero']].map(([initial,bg,role]) => (
                  <span key={role as string} style={{display:'inline-flex',alignItems:'center',gap:'8px',fontSize:'.78rem',fontWeight:600,padding:'7px 12px 7px 7px',borderRadius:'30px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)'}}>
                    <span style={{width:'22px',height:'22px',borderRadius:'50%',display:'grid',placeItems:'center',fontSize:'.62rem',fontWeight:700,color:'#fff',background:bg as string}}>{initial}</span>
                    {role}
                  </span>
                ))}
              </div>
            </div>

            {/* Sucursales – span 3 */}
            <a href="#sucursales" data-wide="1" data-reveal="1" className="lp-feat-card"
              style={{position:'relative',border:'1px solid rgba(255,255,255,.08)',borderRadius:'20px',overflow:'hidden',gridColumn:'span 3',padding:'26px',display:'flex',flexDirection:'column',color:'#ececf3'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={ICON_BOX_SM}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg></span>
                <h3 style={{fontSize:'1.12rem',fontWeight:650,letterSpacing:'-.015em',margin:0}}>Gestión de sucursales</h3>
              </div>
              <p style={{fontSize:'.9rem',lineHeight:1.6,color:'#a4a6bb',margin:'12px 0 0',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Stock, caja y POS independientes por local, con reportes consolidados de todo el negocio.</p>
              <div style={{flex:1}} />
              <div style={{display:'flex',alignItems:'center',gap:'7px',marginTop:'20px',fontSize:'.84rem',fontWeight:600,color:'#8b85ff'}}>Ver cómo funciona<IcoArrow/></div>
            </a>
          </div>
        </div>
      </section>

      {/* ── SUCURSALES ───────────────────────────────────────────────────── */}
      <section id="sucursales" data-r="sec" style={{position:'relative',padding:'120px 28px 0'}}>
        <div data-reveal="1" data-r="multibox" style={{position:'relative',maxWidth:'1240px',margin:'0 auto',padding:'56px',border:'1px solid rgba(139,133,255,.22)',borderRadius:'28px',background:'radial-gradient(70% 90% at 85% 50%,rgba(108,99,255,.2),transparent 70%),linear-gradient(135deg,rgba(255,255,255,.03),rgba(255,255,255,.008))',overflow:'hidden'}}>
          <div data-r="multi" style={{position:'relative',display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1.05fr)',gap:'48px',alignItems:'center'}}>
            <div>
              <div style={{display:'inline-flex',alignItems:'center',gap:'10px',fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#a79fff'}}><span style={{width:'22px',height:'1px',background:'linear-gradient(90deg,transparent,#8b85ff)'}} />Multisucursal</div>
              <h2 style={{fontSize:'clamp(2rem,3.6vw,3.05rem)',fontWeight:700,lineHeight:1.07,letterSpacing:'-.032em',margin:'16px 0 0',textWrap:'balance' as React.CSSProperties['textWrap']}}>Tu negocio puede crecer. <span style={{background:'linear-gradient(120deg,#c3bfff 0%,#8b85ff 42%,#5b9dff 100%)',WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent',color:'transparent'}}>Fluxus crece contigo.</span></h2>
              <p style={{fontSize:'1.05rem',lineHeight:1.65,color:'#a4a6bb',margin:'16px 0 0',maxWidth:'520px',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Abre un nuevo local y sigue trabajando en el mismo sistema. Cada sucursal tiene su stock, su caja y su POS, y tú ves todo consolidado en un solo panel.</p>
              <ul style={{listStyle:'none',margin:'26px 0 0',padding:0,display:'grid',gap:'12px'}}>
                {['Stock independiente por sucursal','Reportes consolidados de todos tus locales','Selector de sucursal en el POS y en cada módulo','Usuarios y permisos por sucursal y rol'].map(item => (
                  <li key={item} style={{display:'flex',alignItems:'center',gap:'11px',fontSize:'.95rem',color:'#ececf3'}}>
                    <span style={{width:'22px',height:'22px',flexShrink:0,borderRadius:'50%',display:'grid',placeItems:'center',color:'#a79fff',background:'rgba(108,99,255,.16)'}}><IcoCheck w={12}/></span>
                    {item}
                  </li>
                ))}
              </ul>
              <p style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',color:'#6b6d84',margin:'24px 0 0'}}>Cantidad de sucursales y usuarios según tu plan.</p>
            </div>
            <div data-r="multivis" style={{position:'relative',height:'440px'}}>
              <svg data-r="multilines" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'visible'}}>
                <path d="M16,16 L50,50" stroke="rgba(139,133,255,.45)" strokeWidth="1.4" fill="none" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" style={{animation:'fx-dash 1.6s linear infinite'}} />
                <path d="M84,16 L50,50" stroke="rgba(139,133,255,.45)" strokeWidth="1.4" fill="none" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" style={{animation:'fx-dash 1.6s linear infinite'}} />
                <path d="M50,90 L50,50" stroke="rgba(139,133,255,.45)" strokeWidth="1.4" fill="none" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" style={{animation:'fx-dash 1.6s linear infinite'}} />
              </svg>
              {[{pos:{top:0,left:0},name:'Sucursal Centro',venta:'S/ 4 180'},{pos:{top:0,right:0},name:'Sucursal Norte',venta:'S/ 2 960'},{pos:{bottom:0,left:'50%',transform:'translateX(-50%)'},name:'Sucursal Sur',venta:'S/ 1 870'}].map(({pos,name,venta}) => (
                <div key={name} data-r="node" style={{position:'absolute',...pos,width:'200px',padding:'14px 15px',border:'1px solid rgba(255,255,255,.13)',borderRadius:'14px',background:'rgba(14,15,21,.92)',backdropFilter:'blur(8px)',boxShadow:'0 20px 40px -24px rgba(0,0,0,.9)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'9px'}}>
                    <span style={{width:'28px',height:'28px',borderRadius:'8px',display:'grid',placeItems:'center',color:'#a79fff',background:'rgba(108,99,255,.15)'}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg></span>
                    <div style={{minWidth:0}}><div style={{fontSize:'.82rem',fontWeight:650}}>{name}</div><div style={{fontSize:'.68rem',color:'#6b6d84'}}>Stock y caja propios</div></div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'12px',fontSize:'.7rem',color:'#a4a6bb'}}><span>Ventas hoy</span><span style={{fontWeight:700,color:'#ececf3'}}>{venta}</span></div>
                </div>
              ))}
              <div data-r="hub" style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'250px',padding:'18px',border:'1px solid rgba(139,133,255,.5)',borderRadius:'18px',background:'linear-gradient(160deg,#1a1830,#101119)',boxShadow:'0 0 0 8px rgba(108,99,255,.08),0 30px 70px -30px rgba(108,99,255,.9)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.64rem',letterSpacing:'.12em',color:'#a79fff'}}>PANEL CONSOLIDADO</span>
                  <img src="/fluxus.png" alt="" style={{width:'22px',height:'22px',borderRadius:'6px'}} />
                </div>
                <div style={{fontSize:'.74rem',color:'#a4a6bb',marginTop:'14px'}}>Ventas de hoy · 3 sucursales</div>
                <div style={{fontSize:'1.9rem',fontWeight:700,letterSpacing:'-.03em',marginTop:'2px'}}>S/ 9 010</div>
                <div style={{display:'flex',height:'7px',gap:'2px',borderRadius:'6px',overflow:'hidden',marginTop:'14px'}}>
                  <span style={{flex:46,background:'#8b85ff'}} />
                  <span style={{flex:33,background:'#4d8dff'}} />
                  <span style={{flex:21,background:'#00d4aa'}} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANES ───────────────────────────────────────────────────────── */}
      <section id="planes" data-r="sec" style={{position:'relative',padding:'120px 28px 0'}}>
        <div style={{maxWidth:'1240px',margin:'0 auto'}}>
          <div data-reveal="1" style={{textAlign:'center',maxWidth:'720px',margin:'0 auto'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:'10px',fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#a79fff'}}><span style={{width:'22px',height:'1px',background:'linear-gradient(90deg,transparent,#8b85ff)'}} />Planes</div>
            <h2 style={{fontSize:'clamp(2rem,3.6vw,3.05rem)',fontWeight:700,lineHeight:1.07,letterSpacing:'-.032em',margin:'16px 0 0',textWrap:'balance' as React.CSSProperties['textWrap']}}>Planes claros, <span style={{background:'linear-gradient(120deg,#c3bfff 0%,#8b85ff 42%,#5b9dff 100%)',WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent',color:'transparent'}}>según tu rubro</span></h2>
            <p style={{fontSize:'1.05rem',lineHeight:1.65,color:'#a4a6bb',margin:'16px auto 0',maxWidth:'560px',textWrap:'pretty' as React.CSSProperties['textWrap']}}>El precio depende de tu tipo de negocio. Todos los planes incluyen 14 días de prueba gratuita, sin tarjeta y sin permanencia.</p>
          </div>

          {/* Seg picker */}
          <div data-reveal="1" style={{display:'flex',justifyContent:'center',marginTop:'34px'}}>
            <div data-r="segpick" style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'4px',padding:'5px',border:'1px solid rgba(255,255,255,.08)',borderRadius:'16px',background:'rgba(255,255,255,.025)'}}>
              {SEG_CONFIGS.map((s,i) => (
                <button key={s.k} type="button" onClick={() => setSeg(i)}
                  style={{height:'38px',padding:'0 15px',fontFamily:'Outfit,sans-serif',fontSize:'.86rem',fontWeight:600,borderRadius:'11px',cursor:'pointer',whiteSpace:'nowrap',transition:'all .2s',flexShrink:0,...(i===seg?{color:'#fff',background:'linear-gradient(135deg,#7d74ff,#5b52f0)',border:'1px solid rgba(139,133,255,.7)',boxShadow:'0 10px 24px -12px #6c63ff'}:{color:'#a4a6bb',background:'transparent',border:'1px solid transparent'})}}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div data-r="plans" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'18px',maxWidth:'980px',margin:'22px auto 0'}}>
            {/* Básico */}
            <div style={{position:'relative',display:'flex',flexDirection:'column',padding:'32px',border:'1px solid rgba(255,255,255,.09)',borderRadius:'22px',background:'linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01))'}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'#a79fff'}}>Plan Básico</div>
              <div style={{fontSize:'.86rem',color:'#a4a6bb',marginTop:'6px'}}>{segConfig.label}</div>
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'20px'}}>
                <span style={{fontSize:'1.15rem',fontWeight:600,color:'#a4a6bb'}}>S/</span>
                {basico
                  ? <span style={{fontSize:'2.4rem',fontWeight:700,letterSpacing:'-.03em',color:'#fff'}}>{basico.precioMensual}</span>
                  : <span style={{display:'inline-block',width:'92px',height:'46px',borderRadius:'10px',background:'linear-gradient(90deg,rgba(255,255,255,.05),rgba(139,133,255,.18),rgba(255,255,255,.05))',backgroundSize:'200% 100%',animation:'fx-shimmer 1.8s linear infinite'}} />}
                <span style={{fontSize:'.92rem',color:'#6b6d84'}}>/mes</span>
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.66rem',color:'#6b6d84',marginTop:'8px'}}>Precio desde el catálogo · {segConfig.label}</div>
              <p style={{fontSize:'.92rem',lineHeight:1.6,color:'#a4a6bb',margin:'16px 0 0'}}>{segConfig.planDesc}</p>
              <a href={`/register?plan=BASICO&segmento=${registerSegmento}`} style={{display:'flex',alignItems:'center',justifyContent:'center',height:'48px',marginTop:'22px',borderRadius:'12px',fontWeight:600,fontSize:'.96rem',color:'#ececf3',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.14)',transition:'all .2s'}}>Probar 14 días gratis</a>
              <div style={{height:'1px',background:'rgba(255,255,255,.08)',margin:'24px 0'}} />
              <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:'11px'}}>
                {BASICO_COMUNES.concat(segConfig.basicoExtra).map(ft => (
                  <li key={ft} style={{display:'flex',alignItems:'flex-start',gap:'10px',fontSize:'.9rem',lineHeight:1.45,color:'#ececf3'}}>
                    <span style={{width:'18px',height:'18px',marginTop:'1px',flexShrink:0,borderRadius:'50%',display:'grid',placeItems:'center',color:'#00d4aa',background:'rgba(0,212,170,.12)'}}><IcoCheck w={11}/></span>
                    {ft}
                  </li>
                ))}
              </ul>
            </div>
            {/* Pro */}
            <div style={{position:'relative',display:'flex',flexDirection:'column',padding:'32px',border:'1px solid rgba(139,133,255,.55)',borderRadius:'22px',background:'radial-gradient(90% 60% at 80% 0%,rgba(108,99,255,.28),transparent 70%),linear-gradient(180deg,rgba(108,99,255,.12),rgba(77,141,255,.04))',boxShadow:'0 40px 90px -45px rgba(108,99,255,1)'}}>
              <div style={{position:'absolute',top:'18px',right:'18px',fontFamily:"'Space Mono',monospace",fontSize:'.66rem',fontWeight:700,letterSpacing:'.08em',color:'#fff',background:'linear-gradient(135deg,#6c63ff,#4d8dff)',padding:'5px 11px',borderRadius:'20px'}}>MÁS POPULAR</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.15em',textTransform:'uppercase',color:'#a79fff'}}>Plan Pro</div>
              <div style={{fontSize:'.86rem',color:'#a4a6bb',marginTop:'6px'}}>{segConfig.label}</div>
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'20px'}}>
                <span style={{fontSize:'1.15rem',fontWeight:600,color:'#a4a6bb'}}>S/</span>
                {pro
                  ? <span style={{fontSize:'2.4rem',fontWeight:700,letterSpacing:'-.03em',color:'#fff'}}>{pro.precioMensual}</span>
                  : <span style={{display:'inline-block',width:'92px',height:'46px',borderRadius:'10px',background:'linear-gradient(90deg,rgba(255,255,255,.05),rgba(139,133,255,.18),rgba(255,255,255,.05))',backgroundSize:'200% 100%',animation:'fx-shimmer 1.8s linear infinite'}} />}
                <span style={{fontSize:'.92rem',color:'#6b6d84'}}>/mes</span>
              </div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.66rem',color:'#6b6d84',marginTop:'8px'}}>Precio desde el catálogo · {segConfig.label}</div>
              <p style={{fontSize:'.92rem',lineHeight:1.6,color:'#a4a6bb',margin:'16px 0 0'}}>Todo el Plan Básico más gestión multilocal para negocios con varias sucursales.</p>
              <a href={`/register?plan=PRO&segmento=${registerSegmento}`} style={{display:'flex',alignItems:'center',justifyContent:'center',height:'48px',marginTop:'22px',borderRadius:'12px',fontWeight:600,fontSize:'.96rem',color:'#fff',background:'linear-gradient(135deg,#7d74ff,#5b52f0 55%,#4d6bff)',boxShadow:'0 14px 34px -14px rgba(108,99,255,.95)',transition:'all .2s'}}>Probar 14 días gratis</a>
              <div style={{height:'1px',background:'rgba(255,255,255,.08)',margin:'24px 0'}} />
              <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:'11px'}}>
                {getProFeatures(pro).map(ft => (
                  <li key={ft} style={{display:'flex',alignItems:'flex-start',gap:'10px',fontSize:'.9rem',lineHeight:1.45,color:'#ececf3'}}>
                    <span style={{width:'18px',height:'18px',marginTop:'1px',flexShrink:0,borderRadius:'50%',display:'grid',placeItems:'center',color:'#00d4aa',background:'rgba(0,212,170,.12)'}}><IcoCheck w={11}/></span>
                    {ft}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Custom plan banner */}
          <div data-reveal="1" style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:'14px',maxWidth:'980px',margin:'18px auto 0',padding:'18px 22px',border:'1px dashed rgba(255,255,255,.13)',borderRadius:'16px'}}>
            <span style={{fontSize:'.94rem',color:'#a4a6bb'}}>¿Necesitas más usuarios, productos o sucursales?</span>
            <a href={waPlanesUrl} target="_blank" rel="noopener noreferrer" style={{...BTN_GHOST,gap:'9px',height:'42px'}}>
              <IcoWa/>Consultar planes
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" data-r="sec" style={{position:'relative',padding:'120px 28px 0'}}>
        <div data-r="faqgrid" style={{maxWidth:'1240px',margin:'0 auto',display:'grid',gridTemplateColumns:'minmax(0,.8fr) minmax(0,1.2fr)',gap:'56px',alignItems:'start'}}>
          <div data-reveal="1" style={{position:'sticky',top:'110px'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:'10px',fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#a79fff'}}><span style={{width:'22px',height:'1px',background:'linear-gradient(90deg,transparent,#8b85ff)'}} />Preguntas frecuentes</div>
            <h2 style={{fontSize:'clamp(2rem,3.6vw,3.05rem)',fontWeight:700,lineHeight:1.07,letterSpacing:'-.032em',margin:'16px 0 0',textWrap:'balance' as React.CSSProperties['textWrap']}}>Resolvemos tus dudas antes de empezar</h2>
            <p style={{fontSize:'1.05rem',lineHeight:1.65,color:'#a4a6bb',margin:'16px 0 0',maxWidth:'420px',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Si no encuentras tu respuesta, escríbenos y te ayudamos a elegir el plan para tu negocio.</p>
            <div style={{display:'flex',alignItems:'center',gap:'14px',marginTop:'28px',padding:'16px',border:'1px solid rgba(255,255,255,.08)',borderRadius:'16px',background:'rgba(255,255,255,.025)'}}>
              <span style={{width:'44px',height:'44px',flexShrink:0,borderRadius:'12px',display:'grid',placeItems:'center',color:'#04110d',background:'#25d366'}}><IcoWa size={22}/></span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'.95rem',fontWeight:650}}>Atención por WhatsApp</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.74rem',color:'#a4a6bb',marginTop:'3px'}}>994 198 710 · en español</div>
              </div>
              <a href="https://wa.me/51994198710" target="_blank" rel="noopener noreferrer" style={{...BTN_GHOST,height:'38px'}}>Escribir</a>
            </div>
          </div>
          <div style={{display:'grid',gap:'10px'}}>
            {FAQS.map(([q,a],i) => {
              const open = faqOpen === i;
              return (
                <div key={i} style={{border:`1px solid ${open?'rgba(139,133,255,.4)':'rgba(255,255,255,.08)'}`,borderRadius:'16px',background:open?'linear-gradient(180deg,rgba(108,99,255,.1),rgba(255,255,255,.015))':'rgba(255,255,255,.02)',transition:'all .3s'}}>
                  <button type="button" data-r="faqq" onClick={() => setFaqOpen(open ? -1 : i)}
                    style={{width:'100%',display:'flex',alignItems:'center',gap:'16px',padding:'20px 22px',fontFamily:'Outfit,sans-serif',fontSize:'1.02rem',fontWeight:600,textAlign:'left',color:'#ececf3',background:'transparent',border:0,cursor:'pointer'}}>
                    <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',color:'#6b6d84',flexShrink:0}}>{String(i+1).padStart(2,'0')}</span>
                    <span style={{flex:1,minWidth:0}}>{q}</span>
                    <span style={{width:'30px',height:'30px',flexShrink:0,display:'grid',placeItems:'center',borderRadius:'9px',transition:'all .3s',...(open?{color:'#fff',background:'#6c63ff',transform:'rotate(45deg)'}:{color:'#a79fff',background:'rgba(108,99,255,.12)'})}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    </span>
                  </button>
                  <div style={{display:'grid',gridTemplateRows:open?'1fr':'0fr',transition:'grid-template-rows .35s cubic-bezier(.2,.7,.3,1)'}}>
                    <div style={{minHeight:0,overflow:'hidden'}}>
                      <p data-r="faqa" style={{margin:0,padding:'0 22px 22px 56px',fontSize:'.95rem',lineHeight:1.7,color:'#a4a6bb',textWrap:'pretty' as React.CSSProperties['textWrap']}}>{a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section data-r="sec" style={{position:'relative',padding:'130px 28px 0'}}>
        <div data-reveal="1" data-r="ctabox" style={{position:'relative',maxWidth:'1240px',margin:'0 auto',padding:'84px 40px',border:'1px solid rgba(139,133,255,.35)',borderRadius:'30px',textAlign:'center',overflow:'hidden',background:'linear-gradient(135deg,#1b1640 0%,#121330 45%,#0d1530 100%)'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)',backgroundSize:'48px 48px',maskImage:'radial-gradient(60% 70% at 50% 50%,#000,transparent 75%)',WebkitMaskImage:'radial-gradient(60% 70% at 50% 50%,#000,transparent 75%)',pointerEvents:'none'}} />
          <div style={{position:'absolute',top:'-220px',left:'50%',transform:'translateX(-50%)',width:'860px',height:'480px',background:'radial-gradient(50% 50% at 50% 50%,rgba(108,99,255,.55),transparent 70%)',filter:'blur(30px)',pointerEvents:'none'}} />
          <div style={{position:'relative'}}>
            <h2 style={{fontSize:'clamp(2.1rem,4.4vw,3.6rem)',fontWeight:700,lineHeight:1.04,letterSpacing:'-.036em',margin:'0 auto',maxWidth:'820px',textWrap:'balance' as React.CSSProperties['textWrap']}}>Es momento de llevar tu negocio <span style={{background:'linear-gradient(120deg,#c3bfff 0%,#8b85ff 42%,#5b9dff 100%)',WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent',color:'transparent'}}>al siguiente nivel</span></h2>
            <p style={{fontSize:'1.12rem',lineHeight:1.65,color:'#c6c7da',margin:'20px auto 0',maxWidth:'560px',textWrap:'pretty' as React.CSSProperties['textWrap']}}>Únete a los negocios que quieren gestionar mejor, ahorrar tiempo y crecer con Fluxus.</p>
            <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'12px',marginTop:'36px'}}>
              <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" style={{...BTN_PRIMARY,height:'56px',fontSize:'1.05rem',padding:'0 30px'}}>
                Solicitar demo gratis
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
              </a>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'8px 18px',marginTop:'22px',fontFamily:"'Space Mono',monospace",fontSize:'.72rem',color:'#8e90ab'}}>
              {['14 días de prueba','Sin tarjeta','Sin permanencia','Soporte en español'].map(item => (
                <span key={item} style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{color:'#00d4aa'}}><IcoCheck w={12}/></span>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{position:'relative',marginTop:'120px',borderTop:'1px solid rgba(255,255,255,.08)',background:'#0a0b10'}}>
        <div data-r="footgrid" style={{maxWidth:'1240px',margin:'0 auto',padding:'64px 28px 36px',display:'grid',gridTemplateColumns:'1.6fr 1fr 1fr 1fr 1.1fr',gap:'36px'}}>
          <div>
            <a href="#inicio" style={{display:'flex',alignItems:'center',gap:'10px',color:'#ececf3'}}>
              <img src="/fluxus.png" alt="Fluxus" style={{width:'36px',height:'36px',borderRadius:'10px'}} />
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:'1.2rem',fontWeight:700,background:'linear-gradient(120deg,#c3bfff 0%,#8b85ff 42%,#5b9dff 100%)',WebkitBackgroundClip:'text',backgroundClip:'text',WebkitTextFillColor:'transparent',color:'transparent'}}>Fluxus</span>
            </a>
            <div style={{fontSize:'1.05rem',fontWeight:600,marginTop:'18px'}}>Gestiona. Controla. Crece.</div>
            <p style={{fontSize:'.88rem',lineHeight:1.65,color:'#6b6d84',margin:'10px 0 0',maxWidth:'290px'}}>Sistema de gestión en la nube para negocios peruanos, con facturación electrónica SUNAT.</p>
            <div style={{display:'flex',gap:'8px',marginTop:'20px'}}>
              <a href={IG_URL||'#'} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={SOCIAL_BTN_LG}><IcoIg/></a>
              <a href={FB_URL||'#'} target="_blank" rel="noopener noreferrer" aria-label="Facebook"  style={SOCIAL_BTN_LG}><IcoFb/></a>
              <a href={TT_URL||'#'} target="_blank" rel="noopener noreferrer" aria-label="TikTok"    style={SOCIAL_BTN_LG}><IcoTt/></a>
            </div>
          </div>
          <div>
            <h4 style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#a4a6bb',margin:'0 0 16px'}}>Navegación</h4>
            <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:'10px'}}>
              {[['Inicio','#inicio'],['Planes','#planes'],['Preguntas frecuentes','#faq'],['Iniciar sesión','/login']].map(([label,href]) => (
                <li key={label}><a href={href} className="lp-footer-link">{label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#a4a6bb',margin:'0 0 16px'}}>Soluciones</h4>
            <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:'10px'}}>
              {SEG_CONFIGS.map(s => <li key={s.k}><a href="#soluciones" className="lp-footer-link">{s.label}</a></li>)}
            </ul>
          </div>
          <div>
            <h4 style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#a4a6bb',margin:'0 0 16px'}}>Funcionalidades</h4>
            <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:'10px'}}>
              {[['Ventas y POS','#funcionalidades'],['Inventario','#funcionalidades'],['Compras y proveedores','#funcionalidades'],['Facturación electrónica','#funcionalidades'],['Reportes','#funcionalidades'],['Usuarios y permisos','#funcionalidades'],['Sucursales','#sucursales']].map(([label,href]) => (
                <li key={label}><a href={href} className="lp-footer-link">{label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#a4a6bb',margin:'0 0 16px'}}>Contacto</h4>
            <div style={{display:'grid',gap:'12px'}}>
              <a href="https://wa.me/51994198710" target="_blank" rel="noopener noreferrer" className="lp-footer-link" style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{color:'#25d366'}}><IcoWa/></span>994 198 710
              </a>
              <a href="mailto:contacto@fluxus.pe" className="lp-footer-link" style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{color:'#8b85ff'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg></span>
                contacto@fluxus.pe
              </a>
              <span className="lp-footer-link" style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{color:'#8b85ff'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>
                Lima, Perú
              </span>
              <a href="/login" style={{...BTN_GHOST,marginTop:'6px',width:'fit-content' as React.CSSProperties['width']}}>Iniciar sesión</a>
            </div>
          </div>
        </div>
        <div style={{maxWidth:'1240px',margin:'0 auto',padding:'22px 28px 30px',borderTop:'1px solid rgba(255,255,255,.08)',display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:'14px'}}>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.72rem',color:'#6b6d84'}}>© 2026 Fluxus · RUC 10769109566</span>
          <div style={{display:'flex',flexWrap:'wrap',gap:'18px'}}>
            {[['Términos y condiciones','/terminos'],['Política de privacidad','/privacidad'],['Libro de reclamaciones','/reclamaciones']].map(([label,href]) => (
              <a key={href} href={href} className="lp-footer-link" style={{fontSize:'.8rem'}}>{label}</a>
            ))}
          </div>
        </div>
        <div data-r="mobspace" />
      </footer>

      {/* ── MOBILE BAR ───────────────────────────────────────────────────── */}
      <div data-r="mobilebar" style={{position:'fixed',bottom:0,left:0,right:0,zIndex:999,gap:'10px',padding:'12px 14px calc(12px + env(safe-area-inset-bottom))',background:'rgba(9,10,15,.92)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(255,255,255,.13)'}}>
        <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" style={{...BTN_PRIMARY,height:'50px',flex:1,fontSize:'.98rem'}}>Solicitar demo gratis</a>
        <a href="/login" aria-label="Iniciar sesión" style={{...BTN_GHOST,height:'50px',padding:'0 16px',fontSize:'.98rem'}}>Ingresar</a>
      </div>

      {/* ── VIDEO MODAL ─────────────────────────────────────────────────── */}
      {videoOpen && (
        <div
          onClick={() => { setVideoOpen(false); if (videoRef.current) videoRef.current.pause(); }}
          onKeyDown={e => { if (e.key === 'Escape') { setVideoOpen(false); if (videoRef.current) videoRef.current.pause(); } }}
          role="dialog" aria-modal="true" aria-label="Demo de Fluxus" tabIndex={-1}
          style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',background:'rgba(0,0,0,.82)',backdropFilter:'blur(6px)',animation:'fx-fade .22s ease'}}>
          <div
            onClick={e => e.stopPropagation()}
            style={{position:'relative',width:'100%',maxWidth:'900px',borderRadius:'18px',overflow:'hidden',boxShadow:'0 40px 100px -20px rgba(0,0,0,.9)',border:'1px solid rgba(255,255,255,.1)'}}>
            <button
              type="button"
              onClick={() => { setVideoOpen(false); if (videoRef.current) videoRef.current.pause(); }}
              aria-label="Cerrar video"
              style={{position:'absolute',top:'12px',right:'12px',zIndex:10,width:'36px',height:'36px',display:'grid',placeItems:'center',borderRadius:'10px',background:'rgba(0,0,0,.55)',border:'1px solid rgba(255,255,255,.15)',color:'#fff',cursor:'pointer',backdropFilter:'blur(4px)'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
            <video
              ref={videoRef}
              src="/demo.mp4"
              controls
              autoPlay
              playsInline
              style={{display:'block',width:'100%',maxHeight:'80vh',background:'#000'}}
            />
          </div>
        </div>
      )}

    </div>
  );
}

// ── Segment icons & metadata (defined after component for readability) ─────────
const SEG_ICONS: React.ReactNode[] = [
  <svg key="f" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7Z"/><path d="m8.5 8.5 7 7"/></svg>,
  <svg key="v" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>,
  <svg key="r" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23Z"/></svg>,
  <svg key="b" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="m2 7 4.4-4.4A2 2 0 0 1 7.8 2h8.4a2 2 0 0 1 1.4.6L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-2-.8 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0 2 2 0 0 1-2-2Z"/></svg>,
  <svg key="fe" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z"/></svg>,
  <svg key="m" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
  <svg key="e" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>,
];
const SEG_DESC = [
  'Control de lotes, fechas de vencimiento, registro sanitario, DIGEMID y reporte OPPF mensual automático.',
  'Registro de mascotas, agenda de citas con profesionales y gestión de medicamentos e insumos.',
  'Gestión por talla y color, control de stock por variante y POS rápido con búsqueda por categoría.',
  'POS rápido con caja integrada, historial diario de ventas, control de proveedores y alertas de stock.',
  'OCs a varios proveedores, recepciones parciales, costos de compra actualizados y kardex por producto.',
  'Manejo de múltiples categorías, POS por código de barras, control de merma y vencimientos.',
  'Facturación electrónica, control de gastos, inventario de insumos y gestión de clientes.',
];
const SEG_TAGS = [
  ['Lotes y vencimientos','DIGEMID','OPPF'],
  ['Mascotas','Citas','Medicamentos'],
  ['Tallas y colores','Variantes','Devoluciones'],
  ['POS','Caja','Alertas de stock'],
  ['Órdenes de compra','Kardex','Costos'],
  ['Turnos de caja','Merma','Roles'],
  ['Facturación','Gastos','Clientes'],
];

export { LandingPage };
