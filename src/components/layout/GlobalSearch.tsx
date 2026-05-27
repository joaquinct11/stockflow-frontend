import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Users, Truck, X, Loader2 } from 'lucide-react';
import { productoService } from '../../services/producto.service';
import { clienteService } from '../../services/cliente.service';
import { proveedorService } from '../../services/proveedor.service';
import type { ProductoDTO } from '../../types';
import type { ClienteDTO } from '../../services/cliente.service';

interface ProveedorDTO { id?: number; nombre: string; ruc?: string; }

interface SearchResult {
  id: string;
  tipo: 'producto' | 'cliente' | 'proveedor';
  titulo: string;
  subtitulo?: string;
  ruta: string;
}

const TIPO_CONFIG = {
  producto:  { icon: Package,  label: 'Productos',   color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
  cliente:   { icon: Users,    label: 'Clientes',    color: 'text-green-500',  bg: 'bg-green-500/10'  },
  proveedor: { icon: Truck,    label: 'Proveedores', color: 'text-violet-500', bg: 'bg-violet-500/10' },
};

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ── Hook de búsqueda compartido ────────────────────────────────────────────────
function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const navigate = useNavigate();

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [productos, clientes, proveedores] = await Promise.allSettled([
        productoService.search(q),
        clienteService.search(q),
        proveedorService.search(q),
      ]);
      const mapped: SearchResult[] = [];
      if (productos.status === 'fulfilled') {
        (productos.value as ProductoDTO[]).slice(0, 5).forEach(p => mapped.push({
          id: `p-${p.id}`, tipo: 'producto', titulo: p.nombre,
          subtitulo: p.codigoBarras ? `Código: ${p.codigoBarras}` : `Stock: ${p.stockActual}`,
          ruta: '/dashboard/productos',
        }));
      }
      if (clientes.status === 'fulfilled') {
        (clientes.value as ClienteDTO[]).slice(0, 4).forEach(c => mapped.push({
          id: `c-${c.id}`, tipo: 'cliente', titulo: c.nombre,
          subtitulo: c.numeroDocumento ? `${c.tipoDocumento ?? ''} ${c.numeroDocumento}`.trim() : undefined,
          ruta: '/dashboard/clientes',
        }));
      }
      if (proveedores.status === 'fulfilled') {
        (proveedores.value as ProveedorDTO[]).slice(0, 4).forEach(v => mapped.push({
          id: `v-${v.id}`, tipo: 'proveedor', titulo: v.nombre,
          subtitulo: v.ruc ? `RUC: ${v.ruc}` : undefined,
          ruta: '/dashboard/proveedores',
        }));
      }
      setResults(mapped);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(debounce(doSearch, 280), [doSearch]);

  useEffect(() => {
    if (query.trim().length >= 2) { setLoading(true); debouncedSearch(query); }
    else { setResults([]); setLoading(false); }
  }, [query, debouncedSearch]);

  const goTo = useCallback((r: SearchResult, onClose: () => void) => {
    navigate(r.ruta);
    setQuery('');
    setResults([]);
    setActiveIndex(-1);
    onClose();
  }, [navigate]);

  const grouped = (['producto', 'cliente', 'proveedor'] as const)
    .map(tipo => ({ tipo, items: results.filter(r => r.tipo === tipo) }))
    .filter(g => g.items.length > 0);

  return { query, setQuery, results, setResults, loading, activeIndex, setActiveIndex, grouped, goTo };
}

// ── ResultList compartido ──────────────────────────────────────────────────────
function ResultList({
  loading, results, grouped, activeIndex, setActiveIndex, query, onGoTo,
}: {
  loading: boolean;
  results: SearchResult[];
  grouped: { tipo: 'producto' | 'cliente' | 'proveedor'; items: SearchResult[] }[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  query: string;
  onGoTo: (r: SearchResult) => void;
}) {
  return (
    <>
      {loading && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Buscando…
        </div>
      )}
      {!loading && results.length === 0 && query.length >= 2 && (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Sin resultados para <span className="font-medium text-foreground">"{query}"</span>
        </div>
      )}
      {!loading && grouped.map(({ tipo, items }) => {
        const cfg = TIPO_CONFIG[tipo];
        const Icon = cfg.icon;
        return (
          <div key={tipo}>
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
              <div className={`h-5 w-5 rounded-md ${cfg.bg} flex items-center justify-center`}>
                <Icon size={11} className={cfg.color} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cfg.label}</span>
            </div>
            {items.map((r) => {
              const globalIdx = results.indexOf(r);
              const isActive = globalIdx === activeIndex;
              return (
                <button
                  key={r.id}
                  onMouseEnter={() => setActiveIndex(globalIdx)}
                  onClick={() => onGoTo(r)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-accent' : 'hover:bg-accent/50'}`}
                >
                  <div className={`h-7 w-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={13} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.titulo}</p>
                    {r.subtitulo && <p className="text-xs text-muted-foreground truncate">{r.subtitulo}</p>}
                  </div>
                  {isActive && <span className="text-[10px] text-muted-foreground shrink-0">↵</span>}
                </button>
              );
            })}
          </div>
        );
      })}
      {!loading && results.length > 0 && (
        <div className="border-t px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">↑↓ navegar · ↵ ir · Esc cerrar</span>
          <span className="text-[10px] text-muted-foreground">{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </>
  );
}

// ── Overlay móvil ──────────────────────────────────────────────────────────────
function MobileSearchOverlay({ onClose }: { onClose: () => void }) {
  const { query, setQuery, results, loading, activeIndex, setActiveIndex, grouped, goTo } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Pequeño delay para que la animación termine antes de hacer focus
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(Math.min(activeIndex + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(Math.max(activeIndex - 1, 0)); }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); goTo(results[activeIndex], onClose); }
    else if (e.key === 'Escape') onClose();
  };

  const showResults = loading || results.length > 0 || query.length >= 2;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-150">
      {/* Barra superior */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <Search size={18} className="text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar productos, clientes, proveedores…"
          className="flex-1 bg-transparent text-base placeholder:text-muted-foreground/60 focus:outline-none"
          autoComplete="off"
        />
        {query ? (
          <button
            onClick={() => setQuery('')}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm px-2 py-1"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Resultados */}
      <div className="flex-1 overflow-y-auto">
        {!showResults && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Search size={36} className="opacity-20" />
            <p className="text-sm">Escribe al menos 2 caracteres</p>
          </div>
        )}
        {showResults && (
          <ResultList
            loading={loading}
            results={results}
            grouped={grouped}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            query={query}
            onGoTo={r => goTo(r, onClose)}
          />
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export function GlobalSearch() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { query, setQuery, results, setResults, loading, activeIndex, setActiveIndex, grouped, goTo } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Cerrar desktop dropdown al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // En mobile abrimos el overlay; en desktop enfocamos el input
        if (window.innerWidth < 768) setMobileOpen(true);
        else { inputRef.current?.focus(); setOpen(true); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(Math.min(activeIndex + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(Math.max(activeIndex - 1, 0)); }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); goTo(results[activeIndex], () => { setOpen(false); inputRef.current?.blur(); }); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  const showDropdown = open && (loading || results.length > 0 || query.length >= 2);

  return (
    <>
      {/* ── Barra inline — todos los tamaños ────────────────────────────── */}
      <div ref={containerRef} className="relative flex-1">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar productos, clientes… (Ctrl+K)"
            className="w-full h-9 rounded-lg border bg-muted/40 pl-8 pr-8 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all"
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={13} />
            </button>
          )}
          {loading && !query.length && (
            <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Dropdown desktop */}
        {showDropdown && (
          <div className="absolute top-full mt-1.5 left-0 right-0 bg-background border rounded-xl shadow-xl shadow-black/10 z-50 overflow-hidden max-h-[420px] overflow-y-auto">
            <ResultList
              loading={loading}
              results={results}
              grouped={grouped}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              query={query}
              onGoTo={r => goTo(r, () => { setOpen(false); inputRef.current?.blur(); })}
            />
          </div>
        )}
      </div>

      {/* ── Overlay móvil ────────────────────────────────────────────────── */}
      {mobileOpen && <MobileSearchOverlay onClose={() => setMobileOpen(false)} />}
    </>
  );
}
