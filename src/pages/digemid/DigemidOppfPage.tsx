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

// ── Modal de búsqueda en catálogo DIGEMID ────────────────────────────────────

interface BuscarModalProps {
  productoId: number;
  productoNombre: string;
  onVincular: (codDigemid: string, item: CatalogoDigemidDTO) => void;
  onClose: () => void;
}

function BuscarModal({ productoId, productoNombre, onVincular, onClose }: BuscarModalProps) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<CatalogoDigemidDTO[]>([]);
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
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">Producto: {productoNombre}</p>
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
              {resultados.map((item) => (
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
              ))}
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
            ? { ...p, codDigemid: '', nomDigemid: '', fraccion: 1, vinculado: false, registroSanitario: '' }
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
      prev.map((p) =>
        p.id === productoId
          ? {
              ...p,
              codDigemid,
              nomDigemid: item.nomProd,
              fraccion: item.fraccion ?? 1,
              registroSanitario: item.numRegSan ?? '',
              vinculado: true,
            }
          : p
      )
    );
  };

  const handleExportar = async () => {
    if (!codEstablecimiento) {
      toast.error('Ingresa el código de establecimiento antes de exportar');
      setEditandoCod(true);
      return;
    }
    const ruc = negocioConfig?.rucEmpresa ?? negocioConfig?.ruc ?? '';
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
      toast.success(`Archivo ZIP descargado con ${vinculados.length} producto(s)`);
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

  const totalVinculados = productos.filter((p) => p.vinculado).length;
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
              disabled={exportando || totalVinculados === 0}
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
                  onClick={() => setFiltroVinculado(f)}
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
                onChange={(e) => setBusqueda(e.target.value)}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Precio Venta</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Reg. Sanitario</TableHead>
                    <TableHead>Código DIGEMID</TableHead>
                    <TableHead>Nombre DIGEMID</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosFiltrados.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium max-w-[180px] truncate" title={p.nombre}>
                        {p.nombre}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatPrice(p.precioVenta)}
                      </TableCell>
                      <TableCell className="text-right text-sm">{p.stockActual}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.registroSanitario || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.codDigemid || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={p.nomDigemid}>
                        {p.nomDigemid || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                          p.vinculado
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        )}>
                          {p.vinculado ? (
                            <><Link2 size={10} /> Vinculado</>
                          ) : (
                            <><Link2Off size={10} /> Sin vincular</>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.vinculado ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDesvincular(p.id)}
                              disabled={desvinculando === p.id}
                              className="text-xs h-7 px-2 text-rose-600 border-rose-300 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-700 dark:hover:bg-rose-900/20"
                            >
                              {desvinculando === p.id ? (
                                <LoadingSpinner />
                              ) : (
                                <><Link2Off size={12} className="mr-1" />Desvincular</>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setModalProducto(p)}
                              className="text-xs h-7 px-2"
                            >
                              <Link2 size={12} className="mr-1" />
                              Vincular
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de búsqueda */}
      {modalProducto && (
        <BuscarModal
          productoId={modalProducto.id}
          productoNombre={modalProducto.nombre}
          onVincular={(codDigemid, item) => handleVincularExitoso(modalProducto.id, codDigemid, item)}
          onClose={() => setModalProducto(null)}
        />
      )}
    </div>
  );
}
