import { useEffect, useState, useMemo } from 'react';
import { comisionService, type ComisionDTO } from '../../services/comision.service';
import { useSucursalStore } from '../../store/sucursalStore';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Pagination } from '../../components/ui/Pagination';
import {
  Plus, Edit, Trash2, Search, TrendingUp, DollarSign,
  Calendar, Building2, FileText, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PER_PAGE = 10;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const emptyForm: ComisionDTO = {
  concepto: '',
  pagador: '',
  monto: 0,
  fecha: new Date().toISOString().slice(0, 10),
  metodoPago: 'TRANSFERENCIA',
  numeroComprobante: '',
  notas: '',
};

export function ComisionesPage() {
  const { sucursalActual, sucursales, loaded: sucursalLoaded } = useSucursalStore();
  const isMultiLocal = sucursales.length > 1;
  const sucursalId = isMultiLocal && sucursalActual ? sucursalActual.id : undefined;
  const [comisiones, setComisiones] = useState<ComisionDTO[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando]     = useState<ComisionDTO | null>(null);
  const [form, setForm]             = useState<ComisionDTO>(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [confirmId, setConfirmId]   = useState<number | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      setComisiones(await comisionService.listar(sucursalId));
    } catch {
      toast.error('Error al cargar comisiones');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!sucursalLoaded) return; cargar(); }, [sucursalLoaded, sucursalId]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const mesActual = new Date().toISOString().slice(0, 7); // yyyy-MM
  const totalMes  = comisiones
    .filter((c) => c.fecha?.startsWith(mesActual))
    .reduce((s, c) => s + c.monto, 0);
  const totalGeneral = comisiones.reduce((s, c) => s + c.monto, 0);
  const pagadores    = [...new Set(comisiones.map((c) => c.pagador))].length;

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const filtradas = useMemo(() => {
    const q = search.toLowerCase();
    return comisiones.filter(
      (c) => !q || c.concepto.toLowerCase().includes(q) || c.pagador.toLowerCase().includes(q),
    );
  }, [comisiones, search]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PER_PAGE));
  const pagina     = filtradas.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Modal ──────────────────────────────────────────────────────────────────
  const abrirCrear = () => { setEditando(null); setForm(emptyForm); setDialogOpen(true); };
  const abrirEditar = (c: ComisionDTO) => {
    setEditando(c);
    setForm({ ...c });
    setDialogOpen(true);
  };

  const handleGuardar = async () => {
    if (!form.concepto.trim()) { toast.error('El concepto es requerido'); return; }
    if (!form.pagador.trim())  { toast.error('El pagador es requerido');  return; }
    if (!form.monto || form.monto <= 0) { toast.error('El monto debe ser mayor a 0'); return; }

    setSaving(true);
    try {
      if (editando?.id) {
        await comisionService.actualizar(editando.id, form);
        toast.success('Comisión actualizada');
      } else {
        await comisionService.crear({ ...form, sucursalId });
        toast.success('Comisión registrada');
      }
      setDialogOpen(false);
      cargar();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (confirmId == null) return;
    try {
      await comisionService.eliminar(confirmId);
      toast.success('Comisión eliminada');
      cargar();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setConfirmId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp size={24} className="text-primary" />
            Comisiones recibidas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ingresos por comisiones de terceros (Bitel, Claro, etc.)
          </p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus size={16} /> Nueva comisión
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Este mes</p>
              <p className="text-xl font-bold">{formatCurrency(totalMes)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total acumulado</p>
              <p className="text-xl font-bold">{formatCurrency(totalGeneral)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Building2 size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pagadores</p>
              <p className="text-2xl font-bold">{pagadores}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buscador */}
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por concepto o pagador..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9 pr-8"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Tabla */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                {['Fecha','Concepto','Pagador','Método','Comprobante','Monto',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagina.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <TrendingUp size={32} className="mx-auto mb-2 opacity-20" />
                    <p>{search ? 'Sin resultados' : 'Aún no hay comisiones registradas'}</p>
                  </td>
                </tr>
              ) : pagina.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Calendar size={12} />{formatDate(c.fecha)}</span>
                  </td>
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate">{c.concepto}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium px-2 py-0.5">
                      <Building2 size={10} />{c.pagador}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{c.metodoPago ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {c.numeroComprobante
                      ? <span className="flex items-center gap-1"><FileText size={11} />{c.numeroComprobante}</span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatCurrency(c.monto)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => setConfirmId(c.id!)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="border-t px-4 py-3">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {/* Modal */}
      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} title={editando ? 'Editar comisión' : 'Nueva comisión'}>
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Concepto <span className="text-red-500">*</span></label>
              <Input placeholder="Ej: Comisiones activaciones junio 2025" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Pagador <span className="text-red-500">*</span></label>
              <Input placeholder="Ej: Bitel" value={form.pagador} onChange={(e) => setForm({ ...form, pagador: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Monto (S/.) <span className="text-red-500">*</span></label>
              <Input type="number" min="0.01" step="0.01" value={form.monto || ''} onChange={(e) => setForm({ ...form, monto: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha <span className="text-red-500">*</span></label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Método de pago</label>
              <select value={form.metodoPago ?? 'TRANSFERENCIA'} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="DEPOSITO">Depósito</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">N° comprobante / referencia</label>
              <Input placeholder="Ej: F001-00001234" value={form.numeroComprobante ?? ''} onChange={(e) => setForm({ ...form, numeroComprobante: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-medium">Notas</label>
              <textarea value={form.notas ?? ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones adicionales..." rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleGuardar} disabled={saving}>
              {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Registrar comisión'}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmId != null}
        onClose={() => setConfirmId(null)}
        onConfirm={handleEliminar}
        title="¿Eliminar comisión?"
        message="Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}
