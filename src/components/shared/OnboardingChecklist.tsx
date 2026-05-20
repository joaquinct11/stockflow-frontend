import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  X,
  ChevronDown,
  ChevronUp,
  Rocket,
  Package,
  ClipboardList,
  ArrowRight,
  FileSpreadsheet,
  ShoppingCart,
} from 'lucide-react';
import { onboardingService, type OnboardingProgreso, type PasoOnboarding } from '../../services/onboarding.service';
import { useAuthStore } from '../../store/authStore';

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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
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

// ── Checklist principal ────────────────────────────────────────────────────

const DISMISSED_KEY = 'onboarding_dismissed';

export function OnboardingChecklist() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [progreso, setProgreso]       = useState<OnboardingProgreso | null>(null);
  const [collapsed, setCollapsed]     = useState(false);
  const [dismissed, setDismissed]     = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true');
  const [showStockModal, setShowStockModal] = useState(false);
  const [loading, setLoading]         = useState(true);

  // Solo el ADMIN ve el checklist
  const esAdmin = user?.rol === 'ADMIN';

  const fetchProgreso = () => {
    onboardingService.getProgreso().then(setProgreso).catch(() => {});
  };

  // Carga inicial
  useEffect(() => {
    if (!esAdmin || dismissed) { setLoading(false); return; }
    onboardingService.getProgreso()
      .then(setProgreso)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [esAdmin, dismissed]);

  // Recargar al cambiar de ruta — el usuario completó un paso y volvió
  useEffect(() => {
    if (!esAdmin || dismissed) return;
    fetchProgreso();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Recargar también al volver a la ventana (tab switching)
  useEffect(() => {
    if (!esAdmin || dismissed) return;
    window.addEventListener('focus', fetchProgreso);
    return () => window.removeEventListener('focus', fetchProgreso);
  }, [esAdmin, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  const handlePasoClick = (paso: PasoOnboarding) => {
    if (paso.completado) return;
    if (paso.id === 'stock') { setShowStockModal(true); return; }
    if (paso.url) navigate(paso.url);
  };

  if (!esAdmin || dismissed || loading || !progreso || progreso.completado) {
    return null;
  }

  const { pasos, porcentaje } = progreso;
  const pendientes = pasos.filter(p => !p.completado).length;

  return (
    <>
      {showStockModal && <StockModal onClose={() => setShowStockModal(false)} />}

      <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket size={18} />
              <span className="font-bold text-sm">Configura tu negocio</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCollapsed(c => !c)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title={collapsed ? 'Expandir' : 'Minimizar'}
              >
                {collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Cerrar"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1 opacity-90">
              <span>{porcentaje}% completado</span>
              <span>{pendientes} paso{pendientes !== 1 ? 's' : ''} restante{pendientes !== 1 ? 's' : ''}</span>
            </div>
            <div className="w-full bg-blue-700/50 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-700"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pasos */}
        {!collapsed && (
          <div className="p-3 space-y-1 max-h-72 overflow-y-auto">
            {pasos.map((paso) => (
              <div
                key={paso.id}
                onClick={() => handlePasoClick(paso)}
                className={`flex items-start gap-3 p-2.5 rounded-lg transition-all duration-150 ${
                  paso.completado
                    ? 'opacity-50 cursor-default'
                    : 'cursor-pointer hover:bg-gray-50 group'
                }`}
              >
                {/* Icono */}
                {paso.completado ? (
                  <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                ) : paso.id === 'stock' ? (
                  <Package size={18} className="text-blue-400 flex-shrink-0 mt-0.5 group-hover:text-blue-600 transition-colors" />
                ) : (
                  <Circle size={18} className="text-gray-300 flex-shrink-0 mt-0.5 group-hover:text-blue-400 transition-colors" />
                )}

                {/* Texto */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-tight ${
                    paso.completado ? 'line-through text-gray-400' : 'text-gray-700 group-hover:text-blue-700'
                  }`}>
                    {paso.titulo}
                  </p>
                  {!paso.completado && (
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">
                      {paso.descripcion}
                    </p>
                  )}
                </div>

                {/* Flecha */}
                {!paso.completado && (
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-0.5 transition-colors" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
