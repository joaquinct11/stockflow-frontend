import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  X,
  ChevronRight,
  ChevronLeft,
  Rocket,
  ClipboardList,
  ArrowRight,
  FileSpreadsheet,
  ShoppingCart,
  Sparkles,
  Building2,
  Package,
  ShoppingBag,
  CreditCard,
  MessageCircle,
  FileCheck2,
  KeyRound,
  PartyPopper,
} from 'lucide-react';
import { onboardingService, type OnboardingProgreso, type PasoOnboarding } from '../../services/onboarding.service';
import { useAuthStore } from '../../store/authStore';
import { ONBOARDING_REFRESH } from '../../utils/onboardingEvents';

// ── Modal de felicitaciones (onboarding 100%) ─────────────────────────────

const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6'];

function CompletadoModal({ pasos, onClose }: { pasos: PasoOnboarding[]; onClose: () => void }) {
  const pendientesOpcionales = pasos.filter(p => p.opcional && !p.completado);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Confetti animado */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-sm opacity-0"
            style={{
              left:            `${Math.random() * 100}%`,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animation:       `confettiFall ${1.5 + Math.random() * 2}s ${Math.random() * 0.8}s ease-in forwards`,
              transform:       `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm my-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pt-7 pb-7 text-white text-center rounded-t-2xl">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 mb-3">
            <PartyPopper size={28} />
          </div>
          <h2 className="text-xl font-bold">¡Felicitaciones!</h2>
          <p className="text-sm text-emerald-100 mt-1">
            Tu negocio está listo para operar.
          </p>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Completaste todos los pasos requeridos. Ya puedes gestionar tu inventario, ventas y reportes desde Fluxus.
          </p>

          {/* Pasos opcionales pendientes */}
          {pendientesOpcionales.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 text-base">⚠️</span>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Paso opcional pendiente
                </p>
              </div>
              {pendientesOpcionales.map(paso => (
                <div key={paso.id}>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{paso.titulo}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Sin esta configuración <strong>no podrás emitir boletas ni facturas válidas ante SUNAT</strong>. Contáctanos y te ayudamos.
                  </p>
                  <a
                    href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#25D366] hover:underline"
                  >
                    <MessageCircle size={13} />
                    Solicitar configuración por WhatsApp
                  </a>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            ¡Genial, vamos a vender! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de bienvenida (primer ingreso) ───────────────────────────────────

const WELCOME_STEPS = [
  { icon: Building2,   label: 'Configura los datos de tu empresa' },
  { icon: Package,     label: 'Crea tus productos o servicios' },
  { icon: ShoppingBag, label: 'Registra tu inventario inicial' },
  { icon: CreditCard,  label: 'Abre tu caja y realiza tu primera venta' },
] as const;

function WelcomeModal({ nombre, onClose }: { nombre: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm my-auto">

        {/* Header con gradiente */}
        <div className="bg-gradient-to-br from-blue-600 to-violet-600 px-6 pt-6 pb-6 text-white text-center rounded-t-2xl">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 mb-3">
            <Sparkles size={22} />
          </div>
          <h2 className="text-lg font-bold">¡Bienvenido a Fluxus!</h2>
          <p className="text-sm text-blue-100 mt-0.5">
            Hola <span className="font-semibold text-white">{nombre}</span>, tu cuenta está lista.
          </p>
        </div>

        {/* Contenido */}
        <div className="px-5 py-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Para empezar a vender en minutos:
          </p>
          <ul className="space-y-2 mb-5">
            {WELCOME_STEPS.map(({ icon: Icon, label }, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0 text-xs font-bold">
                  {i + 1}
                </span>
                <Icon size={14} className="text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground">{label}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-center text-muted-foreground mb-4">
            Tienes <span className="font-semibold text-foreground">14 días de prueba gratis</span> · Sin tarjeta requerida
          </p>

          <button
            onClick={onClose}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            ¡Empecemos! →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de facturación electrónica ──────────────────────────────────────

const WA_NUMBER = '51994198710';
const WA_MSG    = encodeURIComponent('Hola, acabo de registrarme en Fluxus y necesito ayuda para activar mi facturación electrónica con SUNAT.');

function FacturacionModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shrink-0">
              <FileCheck2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                Facturación electrónica
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Requiere configuración con SUNAT</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <KeyRound size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Para emitir boletas y facturas con validez SUNAT necesitas tu <strong>Clave SOL</strong> y contratar un proveedor OSE (ej: Nubefact, Efact).
            </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Escríbenos por WhatsApp y te guiamos paso a paso en la configuración de tu cuenta OSE sin costo adicional.
          </p>
        </div>

        <a
          href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full h-11 rounded-lg bg-[#25D366] hover:bg-[#20bc5a] text-white font-semibold text-sm transition-colors"
        >
          <MessageCircle size={16} />
          Escribir al soporte por WhatsApp
        </a>
        <button onClick={onClose} className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Lo haré después
        </button>
      </div>
    </div>
  );
}

// ── Modal de inventario inicial ────────────────────────────────────────────

function StockModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  const opciones = [
    {
      icon: <ClipboardList size={22} className="text-blue-600" />,
      titulo: 'Ajuste rápido de stock',
      descripcion: 'Ingresa las cantidades actuales directamente desde el módulo de inventario. Ideal si tienes pocos productos.',
      accion: () => { navigate('/dashboard/inventario'); onClose(); },
      boton: 'Ir a Inventario',
      color: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
    },
    {
      icon: <FileSpreadsheet size={22} className="text-green-600" />,
      titulo: 'Importar desde Excel',
      descripcion: 'Si tienes tu lista de productos en Excel o CSV, impórtalos con stock inicial en un solo paso.',
      accion: () => { navigate('/dashboard/inventario'); onClose(); },
      boton: 'Ir a Importar',
      color: 'border-green-200 hover:border-green-400 hover:bg-green-50',
    },
    {
      icon: <ShoppingCart size={22} className="text-purple-600" />,
      titulo: 'Flujo completo (OC → Recepción)',
      descripcion: 'Crea una orden de compra, recibe los productos y el stock se actualiza automáticamente con trazabilidad completa.',
      accion: () => { navigate('/dashboard/compras/ordenes'); onClose(); },
      boton: 'Crear Orden de Compra',
      color: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50',
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              📦 ¿Cómo ingresas tu inventario inicial?
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Elige la opción que mejor se adapte a tu situación
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          {opciones.map((op) => (
            <div
              key={op.titulo}
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${op.color}`}
              onClick={op.accion}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{op.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{op.titulo}</p>
                  <p className="text-xs text-gray-500 mt-1">{op.descripcion}</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 mt-1 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Lo haré después
        </button>
      </div>
    </div>
  );
}

// ── Panel lateral de onboarding ────────────────────────────────────────────

export function OnboardingChecklist() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();

  const dismissedKey   = `onboarding_dismissed_${user?.tenantId ?? 'default'}`;
  const welcomedKey    = `onboarding_welcomed_${user?.tenantId ?? 'default'}`;
  const celebratedKey  = `onboarding_celebrated_${user?.tenantId ?? 'default'}`;

  const [progreso, setProgreso]             = useState<OnboardingProgreso | null>(null);
  const [open, setOpen]                     = useState(true);
  const [dismissed, setDismissed]           = useState(() => localStorage.getItem(dismissedKey) === 'true');
  const [showStockModal,       setShowStockModal]       = useState(false);
  const [showFacturacionModal, setShowFacturacionModal] = useState(false);
  const [showWelcome,    setShowWelcome]    = useState(false);
  const [showCompletado, setShowCompletado] = useState(false);
  const [loading,        setLoading]        = useState(true);
  const prevCompletadoRef                   = useRef<boolean | null>(null);
  const lastFetchRef                        = useRef<number>(0);

  const esAdmin = user?.rol === 'ADMIN';

  const fetchProgreso = () => {
    lastFetchRef.current = Date.now();
    onboardingService.getProgreso().then(setProgreso).catch(() => {});
  };

  useEffect(() => {
    if (!esAdmin || dismissed) { setLoading(false); return; }
    lastFetchRef.current = Date.now();
    onboardingService.getProgreso()
      .then((data) => {
        setProgreso(data);
        // Mostrar bienvenida solo si nunca se mostró y el onboarding no está completo
        if (!data.completado && localStorage.getItem(welcomedKey) !== 'true') {
          setShowWelcome(true);
          localStorage.setItem(welcomedKey, 'true');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAdmin, dismissed]);

  useEffect(() => {
    if (!esAdmin || dismissed) return;
    const handleFocus = () => {
      // Solo refetch si pasaron más de 60s desde el último fetch
      if (Date.now() - lastFetchRef.current > 60_000) {
        fetchProgreso();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAdmin, dismissed]);

  // Actualizar inmediatamente cuando cualquier módulo dispara el evento
  useEffect(() => {
    if (!esAdmin || dismissed) return;
    window.addEventListener(ONBOARDING_REFRESH, fetchProgreso);
    return () => window.removeEventListener(ONBOARDING_REFRESH, fetchProgreso);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAdmin, dismissed]);

  // Detectar cuando se alcanza el 100% por primera vez → mostrar celebración
  useEffect(() => {
    if (!progreso) return;
    if (progreso.completado && prevCompletadoRef.current === false) {
      if (localStorage.getItem(celebratedKey) !== 'true') {
        setShowCompletado(true);
      }
    }
    prevCompletadoRef.current = progreso.completado;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progreso?.completado]);

  // Polling cada 20 s mientras el panel esté abierto
  useEffect(() => {
    if (!esAdmin || dismissed || !open) return;
    const id = setInterval(fetchProgreso, 20000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAdmin, dismissed, open]);

  const handleDismiss = () => {
    localStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
  };

  const handleReopen = () => {
    localStorage.removeItem(dismissedKey);
    setDismissed(false);
    setOpen(true);
  };

  const handlePasoClick = (paso: PasoOnboarding) => {
    if (paso.completado) return;
    if (paso.id === 'stock')       { setShowStockModal(true);       return; }
    if (paso.id === 'facturacion') { setShowFacturacionModal(true); return; }
    if (paso.url) navigate(paso.url);
  };

  if (!esAdmin || loading || !progreso) return null;

  // Onboarding completado: mostrar modal de celebración (solo una vez)
  if (progreso.completado) {
    if (!showCompletado) return null;
    return (
      <CompletadoModal
        pasos={progreso.pasos}
        onClose={() => {
          localStorage.setItem(celebratedKey, 'true');
          setShowCompletado(false);
        }}
      />
    );
  }

  // Panel descartado: solo mostrar pestaña mínima para reabrir
  if (dismissed) {
    return (
      <div className="fixed top-16 right-0 z-40 h-[calc(100vh-64px)] pointer-events-none">
        <button
          onClick={handleReopen}
          className="pointer-events-auto absolute top-24 flex flex-col items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-1.5 py-3 rounded-l-lg shadow-md transition-colors"
          title="Ver progreso de configuración"
        >
          <ChevronLeft size={14} />
          <span
            className="text-[10px] font-bold tracking-wide"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Setup
          </span>
        </button>
      </div>
    );
  }

  const { pasos, porcentaje } = progreso;
  const pendientes = pasos.filter(p => !p.completado).length;

  return (
    <>
      {showCompletado && (
        <CompletadoModal
          pasos={pasos}
          onClose={() => {
            localStorage.setItem(celebratedKey, 'true');
            setShowCompletado(false);
          }}
        />
      )}
      {showWelcome && (
        <WelcomeModal
          nombre={user?.nombre ?? 'Administrador'}
          onClose={() => setShowWelcome(false)}
        />
      )}
      {showFacturacionModal && <FacturacionModal onClose={() => setShowFacturacionModal(false)} />}
      {showStockModal && <StockModal onClose={() => setShowStockModal(false)} />}

      {/* Pestaña — solo visible cuando el panel está cerrado */}
      {!open && <button
        onClick={() => setOpen(true)}
        className="fixed top-40 right-0 z-40 flex flex-col items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-1.5 py-3 rounded-l-lg shadow-md transition-colors"
        title="Ver progreso de configuración"
      >
        <ChevronLeft size={14} />
        <span
          className="text-[10px] font-bold tracking-wide"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
            Setup {porcentaje}%
          </span>
        </button>}

        {/* Panel principal */}
        <div
          className={[
            'fixed top-16 right-0 w-72 h-[calc(100vh-64px)]',
            'bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl flex flex-col overflow-hidden z-40',
            'transition-transform duration-300 ease-in-out',
            open ? 'translate-x-0' : 'translate-x-full',
          ].join(' ')}
        >

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket size={16} />
                <span className="font-bold text-sm">Configura tu negocio</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Colapsar"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Barra de progreso */}
            <div className="mt-2.5">
              <div className="flex justify-between text-xs mb-1 opacity-90">
                <span>{porcentaje}% completado</span>
                <span>{pendientes} paso{pendientes !== 1 ? 's' : ''} restante{pendientes !== 1 ? 's' : ''}</span>
              </div>
              <div className="w-full bg-blue-700/50 rounded-full h-1.5">
                <div
                  className="bg-white h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>
          </div>

          {/* Pasos */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 pb-0">
            {pasos.map((paso) => (
              <div
                key={paso.id}
                onClick={() => handlePasoClick(paso)}
                className={`flex items-start gap-3 p-2.5 rounded-lg transition-all duration-150 ${
                  paso.completado
                    ? 'opacity-50 cursor-default'
                    : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 group'
                }`}
              >
                {paso.completado ? (
                  <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle size={18} className="text-gray-300 flex-shrink-0 mt-0.5 group-hover:text-blue-400 transition-colors" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={`text-sm font-medium leading-tight ${
                      paso.completado ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-400'
                    }`}>
                      {paso.titulo}
                    </p>
                    {paso.opcional && !paso.completado && (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none shrink-0">
                        Opcional
                      </span>
                    )}
                  </div>
                  {!paso.completado && (
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">
                      {paso.descripcion}
                    </p>
                  )}
                </div>
                {!paso.completado && (
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-0.5 transition-colors" />
                )}
              </div>
            ))}
          </div>

          {/* Ocultar permanentemente */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleDismiss}
              className="w-full text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1"
            >
              No mostrar más
            </button>
          </div>
        </div>
    </>
  );
}
