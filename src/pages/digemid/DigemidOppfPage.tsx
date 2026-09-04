import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Link2, Link2Off, FileArchive, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { digemidService, type ProductoDigemidDTO, type CatalogoDigemidDTO } from '../../services/digemid.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { cn } from '../../lib/utils';
import { useTenantConfigStore } from '../../store/tenantConfigStore';

const COD_EST_KEY = 'digemid_cod_establecimiento';

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
}

const UNIDADES_BASICAS = new Set(['UNIDAD', 'TABLETA', 'TABLETAS', 'CÁPSULA', 'CAPSULA', 'CÁPSULAS', 'CAPSULAS',
  'AMPOLLA', 'AMPOLLAS', 'VIAL', 'VIALES', 'COMPRIMIDO', 'COMPRIMIDOS']);

function calcularPreciosOppfLocal(precioVenta: number, fraccion: number, unidadMedida: string) {
  const esPorUnidad = UNIDADES_BASICAS.has((unidadMedida ?? '').trim().toUpperCase());
  if (esPorUnidad) {
    return { precio1: Math.round(precioVenta * fraccion * 100) / 100, precio2: precioVenta };
  }
  const p2 = Math.round((precioVenta / fraccion) * 100) / 100;
  return { precio1: precioVenta, precio2: Math.max(0.01, p2) };
}

// ── Modal de búsqueda en catálogo DIGEMID ────────────────────────────────────

interface BuscarModalProps {
  productoId: number;
  productoNombre: string;
  precioVenta: number;
  unidadMedida: string;
  registroSanitario?: string;
  resultadosIniciales?: CatalogoDigemidDTO[];
  queryInicial?: string;
  onVincular: (codDigemid: string, item: CatalogoDigemidDTO) => void;
  onClose: () => void;
}

function BuscarModal({ productoId, productoNombre, precioVenta, unidadMedida, registroSanitario, resultadosIniciales, queryInicial, onVincular, onClose }: BuscarModalProps) {
  const [query, setQuery] = useState(queryInicial ?? '');
  const [resultados, setResultados] = useState<CatalogoDigemidDTO[]>(resultadosIniciales ?? []);
  const [buscando, setBuscando] = useState(false);
  const [vinculando, setVinculando] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResultados([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await digemidService.buscarCatalogo(query.trim());
        setResultados(res);
      } catch {
        toast.error('Error al buscar en catálogo DIGEMID');
      } finally {
        setBuscando(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleVincular = async (item: CatalogoDigemidDTO) => {
    setVinculando(item.codProd);
    try {
      await digemidService.vincular(productoId, item.codProd);
      onVincular(item.codProd, item);
      toast.success(`Vinculado: ${item.nomProd}`);
      onClose();
    } catch {
      toast.error('No se pudo vincular el producto');
    } finally {
      setVinculando(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Buscar en catálogo DIGEMID</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Producto: {productoNombre}
              {' | '}
              <span>Reg. Sanitario: </span>
              <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                {registroSanitario || '—'}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Buscador */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, registro sanitario o IFA..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          {query.trim().length > 0 && query.trim().length < 2 && (
            <p className="text-xs text-muted-foreground mt-1">Ingresa al menos 2 caracteres</p>
          )}
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto">
          {buscando ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
              <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
            </div>
          ) : resultados.length === 0 && query.trim().length >= 2 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Sin resultados para &quot;{query}&quot;
            </div>
          ) : resultados.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Escribe para buscar en el catálogo DIGEMID
            </div>
          ) : (
            <div className="divide-y divide-border">
              {resultados.map((item) => {
                const fraccion = item.fraccion && item.fraccion > 0 ? item.fraccion : 1;
                const { precio1, precio2 } = calcularPreciosOppfLocal(precioVenta, fraccion, unidadMedida);
                return (
                <div key={item.codProd} className="px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">{item.nomProd}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Cód: <span className="font-mono text-foreground/80">{item.codProd}</span>
                        </span>
                        {item.numRegSan && (
                          <span className="text-xs text-muted-foreground">
                            Reg.San: <span className="font-mono text-foreground/80">{item.numRegSan}</span>
                          </span>
                        )}
                        {item.concent && (
                          <span className="text-xs text-muted-foreground">{item.concent}</span>
                        )}
                        {item.nomFormFarm && (
                          <span className="text-xs text-muted-foreground">{item.nomFormFarm}</span>
                        )}
                        {item.fraccion && item.fraccion > 1 && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            Fracción: {item.fraccion}
                          </span>
                        )}
                      </div>
                      {/* Preview de precios OPPF */}
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 font-mono">
                          P1 Empaque: {formatPrice(precio1)}
                        </span>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded border font-mono',
                          precio2 <= 0.01 && fraccion > 1
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                        )}>
                          P2 Unitario: {formatPrice(precio2)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleVincular(item)}
                      disabled={vinculando === item.codProd}
                      className="flex-shrink-0"
                    >
                      {vinculando === item.codProd ? (
                        <LoadingSpinner />
                      ) : (
                        <>
                          <Link2 size={14} className="mr-1" />
                          Vincular
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export function DigemidOppfPage() {
  const [productos, setProductos] = useState<ProductoDigemidDTO[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalProducto, setModalProducto] = useState<ProductoDigemidDTO | null>(null);
  const { config: negocioConfig } = useTenantConfigStore();
  const [desvinculando, setDesvinculando] = useState<number | null>(null);
  const [exportando, setExportando] = useState(false);
  const [codEstablecimiento, setCodEstablecimiento] = useState(
    () => localStorage.getItem(COD_EST_KEY) ?? ''
  );
  const [editandoCod, setEditandoCod] = useState(false);
  const [codInput, setCodInput] = useState(codEstablecimiento);
  const [filtroVinculado, setFiltroVinculado] = useState<'todos' | 'vinculados' | 'sinvincular'>('todos');
  const [pagina, setPagina] = useState(1);
  const PAGE_SIZE = 20;
  const [autoVinculando, setAutoVinculando] = useState<number | null>(null);

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    try {
      const data = await digemidService.listarProductos();
      setProductos(data);
    } catch {
      toast.error('Error al cargar productos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const guardarCodEst = () => {
    const val = codInput.trim();
    setCodEstablecimiento(val);
    localStorage.setItem(COD_EST_KEY, val);
    setEditandoCod(false);
    toast.success('Código de establecimiento guardado');
  };

  const handleDesvincular = async (productoId: number) => {
    setDesvinculando(productoId);
    try {
      await digemidService.desvincular(productoId);
      setProductos((prev) =>
        prev.map((p) =>
          p.id === productoId
            ? { ...p, codDigemid: '', nomDigemid: '', fraccion: 1, vinculado: false }
            : p
        )
      );
      toast.success('Producto desvinculado');
    } catch {
      toast.error('No se pudo desvincular');
    } finally {
      setDesvinculando(null);
    }
  };

  const handleVincularExitoso = (productoId: number, codDigemid: string, item: CatalogoDigemidDTO) => {
    setProductos((prev) =>
      prev.map((p) => {
        if (p.id !== productoId) return p;
        const fraccion = item.fraccion ?? 1;
        const { precio1, precio2 } = calcularPreciosOppfLocal(p.precioVenta, fraccion, p.unidadMedida);
        return {
          ...p,
          codDigemid,
          nomDigemid: item.nomProd,
          fraccion,
          registroSanitario: item.numRegSan ?? p.registroSanitario,
          vinculado: true,
          precio1Oppf: precio1,
          precio2Oppf: precio2,
        };
      })
    );
  };

  const handleExportar = async () => {
    if (!codEstablecimiento) {
      toast.error('Ingresa el código de establecimiento antes de exportar');
      setEditandoCod(true);
      return;
    }
    const ruc = negocioConfig?.ruc ?? '';
    if (!ruc) {
      toast.error('Configura el RUC del negocio en Configuración antes de exportar');
      return;
    }
    const vinculados = productos.filter((p) => p.vinculado);
    if (vinculados.length === 0) {
      toast.error('No hay productos vinculados a códigos DIGEMID');
      return;
    }
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const ano = String(hoy.getFullYear()).slice(-2);
    setExportando(true);
    try {
      const blob = await digemidService.exportarOppf(codEstablecimiento, ruc, mes, ano, 'CARGA ARCHIVO');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // El backend ya nombra el ZIP con el formato OPPF correcto
      a.download = `${ruc}_${mes}_${ano}_CARGA ARCHIVO.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Archivo ZIP descargado con ${totalParaExportar} producto(s)`);
    } catch {
      toast.error('Error al generar el archivo ZIP');
    } finally {
      setExportando(false);
    }
  };

  const productosFiltrados = productos.filter((p) => {
    const matchBusqueda =
      !busqueda ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codDigemid.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.registroSanitario.toLowerCase().includes(busqueda.toLowerCase());

    const matchFiltro =
      filtroVinculado === 'todos' ||
      (filtroVinculado === 'vinculados' && p.vinculado) ||
      (filtroVinculado === 'sinvincular' && !p.vinculado);

    return matchBusqueda && matchFiltro;
  });

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / PAGE_SIZE));
  const productosPagina = productosFiltrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const totalVinculados = productos.filter((p) => p.vinculado).length;
  const totalParaExportar = productos.filter((p) => p.vinculado && p.stockActual > 0).length;

  const handleVincularClick = async (p: ProductoDigemidDTO) => {
    if (!p.registroSanitario) {
      setModalProducto(p);
      return;
    }
    setAutoVinculando(p.id);
    try {
      const resultados = await digemidService.buscarCatalogo(p.registroSanitario);
      if (resultados.length === 1) {
        // Único resultado → vincular automáticamente
        const item = resultados[0];
        await digemidService.vincular(p.id, item.codProd);
        handleVincularExitoso(p.id, item.codProd, item);
        toast.success(`Vinculado automáticamente: ${item.nomProd}`);
      } else {
        // Varios o ninguno → abrir modal con resultados pre-cargados
        setModalProducto({ ...p, _resultadosIniciales: resultados, _queryInicial: p.registroSanitario } as any);
      }
    } catch {
      toast.error('Error al buscar en catálogo DIGEMID');
      setModalProducto(p);
    } finally {
      setAutoVinculando(null);
    }
  };
  const totalSinVincular = productos.filter((p) => !p.vinculado).length;

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">DIGEMID / OPPF</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vincula tus productos al catálogo DIGEMID y genera el archivo ZIP para reportar precios al OPPF.
        </p>
      </div>

      {/* Código de establecimiento + exportar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Código establecimiento */}
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Código de Establecimiento (OPPF)
              </label>
              {editandoCod ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codInput}
                    onChange={(e) => setCodInput(e.target.value)}
                    placeholder="Ej: 00012345"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onKeyDown={(e) => { if (e.key === 'Enter') guardarCodEst(); if (e.key === 'Escape') setEditandoCod(false); }}
                    autoFocus
                  />
                  <Button size="sm" onClick={guardarCodEst}>Guardar</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditandoCod(false); setCodInput(codEstablecimiento); }}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'font-mono text-sm px-2.5 py-1 rounded-md border',
                    codEstablecimiento
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted border-border text-muted-foreground'
                  )}>
                    {codEstablecimiento || 'No configurado'}
                  </span>
                  <button
                    onClick={() => { setCodInput(codEstablecimiento); setEditandoCod(true); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>

            {/* Estadísticas rápidas */}
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{totalVinculados}</p>
                <p className="text-xs text-muted-foreground">Vinculados</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{totalSinVincular}</p>
                <p className="text-xs text-muted-foreground">Sin vincular</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{productos.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>

            {/* Botón exportar */}
            <Button
              onClick={handleExportar}
              disabled={exportando || totalParaExportar === 0}
              className="flex-shrink-0 gap-2"
            >
              {exportando ? (
                <LoadingSpinner />
              ) : (
                <FileArchive size={16} />
              )}
              Descargar ZIP para OPPF
            </Button>
          </div>

          {totalVinculados === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20">
              Debes vincular al menos un producto a un código DIGEMID antes de exportar.
            </p>
          )}
          {totalVinculados > 0 && totalParaExportar === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20">
              Tienes {totalVinculados} producto(s) vinculado(s) pero todos tienen stock 0. Ingresa stock antes de exportar.
            </p>
          )}
          {totalVinculados > 0 && totalParaExportar > 0 && totalVinculados !== totalParaExportar && (
            <p className="text-xs text-muted-foreground mt-3 bg-muted/50 rounded-lg px-3 py-2 border border-border">
              Se exportarán <span className="font-semibold text-foreground">{totalParaExportar}</span> de {totalVinculados} productos vinculados (los demás tienen stock 0).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabla de productos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="flex-1">Mis Productos</CardTitle>

            {/* Filtros */}
            <div className="flex gap-2 flex-wrap">
              {(['todos', 'vinculados', 'sinvincular'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFiltroVinculado(f); setPagina(1); }}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    filtroVinculado === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {f === 'todos' ? 'Todos' : f === 'vinculados' ? 'Vinculados' : 'Sin vincular'}
                </button>
              ))}
            </div>

            {/* Búsqueda */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                placeholder="Buscar producto..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-48"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : productosFiltrados.length === 0 ? (
            <EmptyState
              title="Sin productos"
              description={busqueda ? 'No se encontraron productos con ese filtro' : 'No tienes productos activos'}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-fixed w-full">
                <colgroup>
                  <col style={{width:'18%'}} />
                  <col style={{width:'8%'}} />
                  <col style={{width:'6%'}} />
                  <col style={{width:'9%'}} />
                  <col style={{width:'17%'}} />
                  <col style={{width:'9%'}} />
                  <col style={{width:'9%'}} />
                  <col style={{width:'13%'}} />
                  <col style={{width:'11%'}} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Cód. DIGEMID</TableHead>
                    <TableHead>Nombre DIGEMID</TableHead>
                    <TableHead className="text-right text-blue-600 dark:text-blue-400">P1 Empaque</TableHead>
                    <TableHead className="text-right text-blue-600 dark:text-blue-400">P2 Unitario</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosPagina.map((p) => (
                    <TableRow key={p.id}>
                      {/* Producto */}
                      <TableCell>
                        <span className="block text-sm font-medium leading-snug">{p.nombre}</span>
                        <div className="flex flex-wrap gap-x-2 mt-0.5">
                          {p.unidadMedida && (
                            <span className="text-xs text-muted-foreground">({p.unidadMedida})</span>
                          )}
                          {p.registroSanitario && (
                            <span className="text-xs font-mono text-muted-foreground/70">{p.registroSanitario}</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Precio */}
                      <TableCell className="text-right font-mono text-sm">
                        {formatPrice(p.precioVenta)}
                      </TableCell>

                      {/* Stock */}
                      <TableCell className="text-right">
                        <span className={cn('text-sm font-medium', p.stockActual === 0 ? 'text-rose-500' : 'text-foreground')}>
                          {p.stockActual}
                        </span>
                      </TableCell>

                      {/* Cód. DIGEMID */}
                      <TableCell className="font-mono text-xs text-foreground/80">
                        {p.vinculado ? p.codDigemid : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>

                      {/* Nombre DIGEMID */}
                      <TableCell className="text-xs text-muted-foreground">
                        {p.vinculado
                          ? <span className="line-clamp-2 leading-snug">{p.nomDigemid}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>

                      {/* P1 Empaque */}
                      <TableCell className="text-right font-mono text-xs">
                        {p.vinculado && p.stockActual > 0
                          ? <span className="text-blue-600 dark:text-blue-400">{formatPrice(p.precio1Oppf)}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>

                      {/* P2 Unitario */}
                      <TableCell className="text-right font-mono text-xs">
                        {p.vinculado && p.stockActual > 0 ? (
                          <span className={p.precio2Oppf <= 0.01 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}>
                            {formatPrice(p.precio2Oppf)}
                          </span>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>

                      {/* Estado */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                            p.vinculado
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          )}>
                            {p.vinculado ? <><Link2 size={10} />Vinculado</> : <><Link2Off size={10} />Sin vincular</>}
                          </span>
                          {p.vinculado && p.stockActual === 0 && (
                            <span className="text-xs text-muted-foreground/60 italic">no se exportará</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="text-right">
                        {p.vinculado ? (
                          <Button size="sm" variant="outline" onClick={() => handleDesvincular(p.id)} disabled={desvinculando === p.id}
                            className="text-xs h-7 px-2 text-rose-600 border-rose-300 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-700 dark:hover:bg-rose-900/20">
                            {desvinculando === p.id ? <LoadingSpinner /> : <><Link2Off size={12} className="mr-1" />Desvincular</>}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleVincularClick(p)} disabled={autoVinculando === p.id}
                            className="text-xs h-7 px-2">
                            {autoVinculando === p.id ? <LoadingSpinner /> : <><Link2 size={12} className="mr-1" />Vincular</>}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!cargando && productosFiltrados.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
              <span>
                {(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, productosFiltrados.length)} de {productosFiltrados.length} productos
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={pagina === 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  ← Anterior
                </Button>
                <span className="px-2 font-medium text-foreground">{pagina} / {totalPaginas}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={pagina === totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de búsqueda */}
      {modalProducto && (
        <BuscarModal
          productoId={modalProducto.id}
          productoNombre={modalProducto.nombre}
          precioVenta={modalProducto.precioVenta}
          unidadMedida={modalProducto.unidadMedida}
          registroSanitario={modalProducto.registroSanitario || undefined}
          resultadosIniciales={(modalProducto as any)._resultadosIniciales}
          queryInicial={(modalProducto as any)._queryInicial}
          onVincular={(codDigemid, item) => handleVincularExitoso(modalProducto.id, codDigemid, item)}
          onClose={() => setModalProducto(null)}
        />
      )}
    </div>
  );
}
