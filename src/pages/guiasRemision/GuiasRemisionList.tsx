import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Truck, FileDown, RefreshCw, X, FileText, CheckCircle2, AlertCircle, Clock, Eye, Pencil, Trash2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { guiaRemisionService } from '../../services/guiaRemision.service';
import type { GuiaRemisionListItem, EstadoTributarioGRE, GuiaRemisionResponse } from '../../types/gre.types';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { notify } from '../../lib/notify';
import {
  EstadoTributarioBadge,
  EstadoLogisticoBadge,
  tipoTrasladoLabel,
  modalidadLabel,
  triggerPdfDownload,
} from './gre.helpers';
import { GuiaRemisionDetail } from './GuiaRemisionDetail';
import { NuevaGuiaRemision } from './NuevaGuiaRemision';

const ESTADO_OPTIONS: { value: EstadoTributarioGRE | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'EMITIENDO', label: 'Emitiendo' },
  { value: 'EMITIDA', label: 'Emitida' },
  { value: 'ERROR', label: 'Error' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

export function GuiasRemisionList() {
  const { puede, isAdmin, isGerente } = usePermissions();

  const canVer     = isAdmin || isGerente || puede('VER_GRE');
  const canEmitir  = isAdmin || isGerente || puede('EMITIR_GRE');
  const canConf    = isAdmin || isGerente || puede('CONFIRMAR_RECEPCION_GRE');
  const canCancel  = isAdmin || isGerente || puede('CANCELAR_GRE_BORRADOR');
  const canEditar  = isAdmin || isGerente || puede('EDITAR_GRE_BORRADOR');
  const canEliminar = isAdmin || isGerente || puede('ELIMINAR_GRE_BORRADOR');

  const [items, setItems] = useState<GuiaRemisionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const PAGE_SIZE = 20;

  const [filterEstado, setFilterEstado] = useState<EstadoTributarioGRE | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailGuia, setDetailGuia] = useState<GuiaRemisionResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showNueva, setShowNueva] = useState(false);
  const [editingGuia, setEditingGuia] = useState<GuiaRemisionResponse | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; numero: string } | null>(null);

  const fetchList = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await guiaRemisionService.listar(p, PAGE_SIZE);
      setItems(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch {
      toast.error('Error al cargar guías de remisión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canVer) fetchList(page);
  }, [canVer, page, fetchList]);

  const openDetail = async (id: number) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetailGuia(null);
    try {
      const g = await guiaRemisionService.obtener(id);
      setDetailGuia(g);
    } catch {
      toast.error('Error al cargar detalle');
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetailGuia(null);
  };

  const handleDetailUpdate = (updated: GuiaRemisionResponse) => {
    setDetailGuia(updated);
    setItems(prev => prev.map(i => i.id === updated.id ? { ...i, estadoTributario: updated.estadoTributario, estadoLogistico: updated.estadoLogistico } : i));
  };

  const handleNuevaCreada = () => {
    setShowNueva(false);
    fetchList(0);
    setPage(0);
  };

  const handleDeleteGuia = (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setTotalElements(prev => Math.max(0, prev - 1));
  };

  const handleEditGuia = (guia: GuiaRemisionResponse) => {
    setEditingGuia(guia);
  };

  const handleEditUpdated = (updated: GuiaRemisionResponse) => {
    setEditingGuia(null);
    handleDetailUpdate(updated);
  };

  const handleDownloadPdf = async (e: React.MouseEvent, id: number, numero: string) => {
    e.stopPropagation();
    setDownloadingId(id);
    try {
      const blob = await guiaRemisionService.downloadPdf(id);
      triggerPdfDownload(blob, `GRE-${numero}.pdf`);
    } catch {
      toast.error('Error al descargar PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleInlineEdit = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setEditLoadingId(id);
    try {
      const guia = await guiaRemisionService.obtener(id);
      setEditingGuia(guia);
    } catch (err) {
      notify.fromError(err, 'Error al cargar guía para editar');
    } finally {
      setEditLoadingId(null);
    }
  };

  const handleInlineDelete = (e: React.MouseEvent, item: GuiaRemisionListItem) => {
    e.stopPropagation();
    setConfirmDelete({ id: item.id, numero: item.numeroCompleto });
  };

  const confirmDoDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await guiaRemisionService.eliminar(confirmDelete.id);
      handleDeleteGuia(confirmDelete.id);
      toast.success('Guía eliminada');
    } catch (err) {
      notify.fromError(err, 'Error al eliminar guía');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const handleInlineRetry = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setRetryingId(id);
    try {
      const updated = await guiaRemisionService.emitir(id);
      setItems(prev => prev.map(i => i.id === updated.id ? { ...i, estadoTributario: updated.estadoTributario, estadoLogistico: updated.estadoLogistico } : i));
      toast.success('Reintento enviado');
    } catch (err) {
      notify.fromError(err, 'Error al reintentar emisión');
    } finally {
      setRetryingId(null);
    }
  };

  const filteredItems = items.filter(item => {
    if (filterEstado && item.estadoTributario !== filterEstado) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.numeroCompleto.toLowerCase().includes(q) ||
        (item.destinatarioRazonSocial ?? '').toLowerCase().includes(q) ||
        (item.sucursalOrigenNombre ?? '').toLowerCase().includes(q) ||
        (item.sucursalDestinoNombre ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── KPI stats derivados de los items cargados ────────────────────────
  const kpiEmitidas   = items.filter(i => i.estadoTributario === 'EMITIDA').length;
  const kpiPendientes = items.filter(i => i.estadoTributario === 'BORRADOR' || i.estadoTributario === 'EMITIENDO').length;
  const kpiError      = items.filter(i => i.estadoTributario === 'ERROR').length;

  if (!canVer) {
    return (
      <EmptyState
        icon={Truck}
        title="Acceso restringido"
        description="No tienes permisos para ver las Guías de Remisión."
      />
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.6rem] font-bold tracking-tight leading-none">
            Guías de Remisión
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Gestiona tus guías de remisión electrónicas
            {totalElements > 0 && <> · {totalElements} registrada{totalElements !== 1 ? 's' : ''}</>}
          </p>
        </div>
        {canEmitir && (
          <Button onClick={() => setShowNueva(true)} className="gap-2 h-9 w-full sm:w-auto">
            <Plus size={15} />
            Nueva Guía
          </Button>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="kpi-grid gap-3">
        {/* Total */}
        <div className="p-[16px_18px] bg-card border border-border rounded-[14px] shadow-sm">
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground flex items-center gap-1.5">
            <FileText size={12} className="opacity-70" />
            Total de guías
          </p>
          <p className="text-[1.72rem] font-bold tracking-tight mt-[9px] tabular-nums text-primary">
            {totalElements}
          </p>
          <p className="text-[.79rem] text-muted-foreground mt-1">Registradas en el sistema</p>
        </div>

        {/* Emitidas */}
        <div className="p-[16px_18px] bg-card border border-border rounded-[14px] shadow-sm">
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-500" />
            Emitidas
          </p>
          <p className="text-[1.72rem] font-bold tracking-tight mt-[9px] tabular-nums text-emerald-600 dark:text-emerald-400">
            {kpiEmitidas}
          </p>
          <p className="text-[.79rem] text-muted-foreground mt-1">Enviadas a SUNAT correctamente</p>
        </div>

        {/* Pendientes */}
        <div className={`p-[16px_18px] rounded-[14px] shadow-sm border ${kpiPendientes > 0 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700/40' : 'bg-card border-border'}`}>
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground flex items-center gap-1.5">
            <Clock size={12} className="opacity-70" />
            Pendientes
          </p>
          <p className={`text-[1.72rem] font-bold tracking-tight mt-[9px] tabular-nums ${kpiPendientes > 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}>
            {kpiPendientes}
          </p>
          <p className="text-[.79rem] text-muted-foreground mt-1">Borradores sin emitir</p>
        </div>

        {/* Con error */}
        <div className={`p-[16px_18px] rounded-[14px] shadow-sm border ${kpiError > 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700/40' : 'bg-card border-border'}`}>
          <p className="font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground flex items-center gap-1.5">
            <AlertCircle size={12} className="opacity-70" />
            Con error
          </p>
          <p className={`text-[1.72rem] font-bold tracking-tight mt-[9px] tabular-nums ${kpiError > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
            {kpiError}
          </p>
          <p className="text-[.79rem] text-muted-foreground mt-1">Requieren atención</p>
        </div>
      </div>

      {/* ── Tabla card ── */}
      <div className="bg-card border rounded-2xl shadow-sm">

        {/* Filter toolbar */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-2.5 p-3.5 border-b border-border/60 rounded-t-2xl">
          {/* Búsqueda */}
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por número, destinatario…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setSearch(searchInput)}
              className="w-full h-10 pl-9 pr-3 text-sm bg-muted/50 border border-transparent rounded-xl outline-none focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearch(''); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro estado */}
          <select
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value as EstadoTributarioGRE | '')}
            className="h-10 px-3 text-sm bg-muted/50 border border-transparent rounded-xl outline-none focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
          >
            {ESTADO_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Reload */}
          <button
            onClick={() => fetchList(page)}
            className="flex items-center justify-center h-10 w-10 rounded-xl text-muted-foreground bg-muted/50 border border-transparent hover:bg-muted transition-colors"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tabla / empty / loading */}
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : filteredItems.length === 0 ? (
          <div className="py-4">
            <EmptyState
              icon={Truck}
              title="Sin guías de remisión"
              description={search || filterEstado ? 'Ninguna guía coincide con los filtros aplicados.' : 'Crea tu primera guía de remisión electrónica.'}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-4 py-3 font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Número</th>
                  <th className="text-left px-4 py-3 font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Tipo / Modalidad</th>
                  <th className="text-left px-4 py-3 font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Destinatario / Destino</th>
                  <th className="text-left px-4 py-3 font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Fecha traslado</th>
                  <th className="text-left px-4 py-3 font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Estado trib.</th>
                  <th className="text-left px-4 py-3 font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Estado log.</th>
                  <th className="text-right px-4 py-3 font-mono text-[.68rem] font-semibold tracking-[.09em] uppercase text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredItems.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => openDetail(item.id)}
                    className={`cursor-pointer hover:bg-muted/40 transition-colors
                      ${selectedId === item.id ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap font-medium">
                      {item.numeroCompleto}
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      <div className="text-sm">{tipoTrasladoLabel(item.tipoTraslado)}</div>
                      <div className="text-xs text-muted-foreground">{modalidadLabel(item.modalidadTransporte)}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-[200px]">
                      <span className="truncate block text-sm">
                        {item.tipoTraslado === 'DELIVERY'
                          ? item.destinatarioRazonSocial ?? '—'
                          : `${item.sucursalOrigenNombre ?? '?'} → ${item.sucursalDestinoNombre ?? '?'}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-sm tabular-nums">
                      {item.fechaTraslado}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoTributarioBadge estado={item.estadoTributario} />
                    </td>
                    <td className="px-4 py-3">
                      <EstadoLogisticoBadge estado={item.estadoLogistico} />
                    </td>
                    <td className="py-3 px-[14px] text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="inline-flex gap-[3px] items-center">
                        {/* Ver — siempre visible */}
                        <button type="button" onClick={() => openDetail(item.id)} title="Ver detalle"
                          className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-lg cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                          <Eye size={15} />
                        </button>

                        {/* Reintentar — solo ERROR */}
                        {item.estadoTributario === 'ERROR' && canEmitir && (
                          <button type="button" onClick={e => handleInlineRetry(e, item.id)} title="Reintentar emisión"
                            disabled={retryingId === item.id}
                            className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-lg cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-400 transition-colors disabled:opacity-40">
                            <RotateCcw size={15} className={retryingId === item.id ? 'animate-spin' : ''} />
                          </button>
                        )}

                        {/* Editar borrador — BORRADOR o ERROR */}
                        {(item.estadoTributario === 'BORRADOR' || item.estadoTributario === 'ERROR') && canEditar && (
                          <button type="button" onClick={e => handleInlineEdit(e, item.id)} title="Editar borrador"
                            disabled={editLoadingId === item.id}
                            className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-lg cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40">
                            <Pencil size={15} className={editLoadingId === item.id ? 'animate-pulse' : ''} />
                          </button>
                        )}

                        {/* PDF — EMITIDA */}
                        {item.estadoTributario === 'EMITIDA' && (
                          <button type="button" onClick={e => handleDownloadPdf(e, item.id, item.numeroCompleto)} title="Descargar PDF"
                            disabled={downloadingId === item.id}
                            className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-lg cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40">
                            {downloadingId === item.id
                              ? <RefreshCw size={15} className="animate-spin" />
                              : <FileDown size={15} />}
                          </button>
                        )}

                        {/* Eliminar borrador — BORRADOR o ERROR */}
                        {(item.estadoTributario === 'BORRADOR' || item.estadoTributario === 'ERROR') && canEliminar && (
                          <button type="button" onClick={e => handleInlineDelete(e, item)} title="Eliminar borrador"
                            disabled={deletingId === item.id}
                            className="w-[30px] h-[30px] grid place-items-center text-muted-foreground bg-transparent border-0 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-40">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 text-sm text-muted-foreground rounded-b-2xl">
            <span>Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Panel detalle lateral */}
      {selectedId !== null && (
        <GuiaRemisionDetail
          guia={detailGuia}
          loading={detailLoading}
          canEmitir={canEmitir}
          canConfirmar={canConf}
          canCancelar={canCancel}
          canEditar={canEditar}
          canEliminar={canEliminar}
          onClose={closeDetail}
          onUpdate={handleDetailUpdate}
          onDelete={handleDeleteGuia}
          onEdit={handleEditGuia}
        />
      )}

      {/* Modal nueva guía */}
      {showNueva && (
        <NuevaGuiaRemision
          onClose={() => setShowNueva(false)}
          onCreate={handleNuevaCreada}
        />
      )}

      {/* Modal editar borrador */}
      {editingGuia && (
        <NuevaGuiaRemision
          onClose={() => setEditingGuia(null)}
          onCreate={handleNuevaCreada}
          editData={editingGuia}
          onUpdate={handleEditUpdated}
        />
      )}

      {/* Confirm eliminar */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        type="danger"
        title="Eliminar guía de remisión"
        description={`¿Estás seguro de que deseas eliminar la guía ${confirmDelete?.numero ?? ''}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar guía"
        onConfirm={confirmDoDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
