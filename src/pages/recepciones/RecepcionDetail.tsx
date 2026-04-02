import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { recepcionService } from '../../services/recepcion.service';
import { ordenCompraService } from '../../services/ordenCompra.service';
import { proveedorService } from '../../services/proveedor.service';
import { productoService } from '../../services/producto.service';
import type {
  RecepcionDTO,
  RecepcionItemDTO,
  ComprobanteProveedorDTO,
  OrdenCompraDTO,
  ProveedorDTO,
  ProductoDTO,
  TipoComprobanteProveedor,
} from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Autocomplete } from '../../components/ui/Autocomplete';
import { ArrowLeft, Plus, CheckCircle, ScanLine, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../../hooks/usePermissions';

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  CONFIRMADA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  ANULADA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

/** New reception: either standalone or pre-loaded from an OC */
function NewRecepcionForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ocIdParam = searchParams.get('ocId');
  const { canCreate } = usePermissions();

  const [proveedores, setProveedores] = useState<ProveedorDTO[]>([]);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [oc, setOc] = useState<OrdenCompraDTO | null>(null);
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorDTO | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<RecepcionItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add item state
  const [selectedProducto, setSelectedProducto] = useState<ProductoDTO | null>(null);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemExpiry, setItemExpiry] = useState('');
  const [itemLote, setItemLote] = useState('');
  const [itemPrice, setItemPrice] = useState<number | ''>('');

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [provData, prodData] = await Promise.all([
        proveedorService.getActivos(),
        productoService.getAll(),
      ]);
      setProveedores(provData);
      setProductos(prodData);

      if (ocIdParam) {
        const ocData = await ordenCompraService.getById(Number(ocIdParam));
        setOc(ocData);
        const prov = provData.find((p) => p.id === ocData.proveedorId);
        if (prov) setSelectedProveedor(prov);
        // Pre-load items from OC with quantities expected
        setItems(
          ocData.items
            .filter((i) => {
              const pendiente = i.cantidadSolicitada - (i.cantidadRecibida ?? 0);
              return pendiente > 0;
            })
            .map((i) => ({
              productoId: i.productoId,
              productoNombre: i.productoNombre,
              codigoBarras: i.codigoBarras,
              cantidadEsperada: i.cantidadSolicitada - (i.cantidadRecibida ?? 0),
              cantidadRecibida: 0,
              precioUnitario: i.precioUnitario,
            }))
        );
      }
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedProducto) {
      toast.error('Selecciona un producto');
      return;
    }
    if (itemQty <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    const exists = items.find((i) => i.productoId === selectedProducto.id);
    if (exists) {
      toast.error('El producto ya está en la lista');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        productoId: selectedProducto.id!,
        productoNombre: selectedProducto.nombre,
        codigoBarras: selectedProducto.codigoBarras,
        cantidadRecibida: itemQty,
        precioUnitario: itemPrice !== '' ? Number(itemPrice) : undefined,
        fechaVencimiento: itemExpiry || undefined,
        lote: itemLote || undefined,
      },
    ]);
    setSelectedProducto(null);
    setItemQty(1);
    setItemExpiry('');
    setItemLote('');
    setItemPrice('');
  };

  const handleUpdateQty = (productoId: number, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (i.productoId === productoId ? { ...i, cantidadRecibida: qty } : i))
    );
  };

  const handleRemoveItem = (productoId: number) => {
    setItems((prev) => prev.filter((i) => i.productoId !== productoId));
  };

  const handleSave = async () => {
    if (!selectedProveedor) {
      toast.error('Selecciona un proveedor');
      return;
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }
    setSaving(true);
    try {
      const created = await recepcionService.create({
        proveedorId: selectedProveedor.id!,
        ordenCompraId: oc?.id,
        estado: 'BORRADOR',
        observaciones,
        items,
      });
      toast.success('Recepción creada exitosamente');
      navigate(`/dashboard/recepciones/${created.id}`);
    } catch {
      toast.error('Error al crear la recepción');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!canCreate('RECEPCIONES')) {
    return (
      <p className="text-center py-12 text-muted-foreground">
        No tienes permisos para crear recepciones.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/recepciones')}>
          <ArrowLeft size={16} className="mr-1" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nueva recepción</h1>
          {oc && (
            <p className="text-sm text-muted-foreground">
              Desde OC #{oc.id} — {oc.proveedorNombre}
            </p>
          )}
        </div>
      </div>

      {/* Header form */}
      <Card>
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Proveedor *</label>
            <Autocomplete
              options={proveedores.map((p) => ({ label: p.nombre, value: p }))}
              value={selectedProveedor ? { label: selectedProveedor.nombre, value: selectedProveedor } : null}
              onChange={(opt) => setSelectedProveedor(opt?.value ?? null)}
              placeholder="Buscar proveedor..."
              disabled={!!oc}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Observaciones</label>
            <Input
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Observaciones opcionales..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Add item */}
      <Card>
        <CardHeader>
          <CardTitle>Agregar producto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">
                Producto
                {/* Phase 2: Scan button placeholder */}
                <span className="ml-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                  <ScanLine size={12} />
                  (scan próximamente)
                </span>
              </label>
              <Autocomplete
                options={productos.map((p) => ({
                  label: `${p.nombre}${p.codigoBarras ? ` — ${p.codigoBarras}` : ''}`,
                  value: p,
                }))}
                value={
                  selectedProducto
                    ? {
                        label: `${selectedProducto.nombre}${selectedProducto.codigoBarras ? ` — ${selectedProducto.codigoBarras}` : ''}`,
                        value: selectedProducto,
                      }
                    : null
                }
                onChange={(opt) => setSelectedProducto(opt?.value ?? null)}
                placeholder="Buscar por nombre o código de barras..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Cant.</label>
              <Input
                type="number"
                min={1}
                className="w-24"
                value={itemQty}
                onChange={(e) => setItemQty(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Precio unit.</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="w-28"
                placeholder="Opc."
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Vencimiento</label>
              <Input
                type="date"
                className="w-36"
                value={itemExpiry}
                onChange={(e) => setItemExpiry(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Lote</label>
              <Input
                className="w-28"
                placeholder="Opc."
                value={itemLote}
                onChange={(e) => setItemLote(e.target.value)}
              />
            </div>
            <Button type="button" onClick={handleAddItem}>
              <Plus size={16} className="mr-1" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items table */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items a recepcionar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">A recibir</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.productoId}>
                      <TableCell className="font-medium">{item.productoNombre || `#${item.productoId}`}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.codigoBarras || '—'}</TableCell>
                      <TableCell className="text-right">
                        {item.cantidadEsperada != null ? item.cantidadEsperada : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          className="w-20 text-right"
                          value={item.cantidadRecibida}
                          onChange={(e) => handleUpdateQty(item.productoId, Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.fechaVencimiento || '—'}
                      </TableCell>
                      <TableCell className="text-xs">{item.lote || '—'}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleRemoveItem(item.productoId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/dashboard/recepciones')}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} className="mr-2" />
          {saving ? 'Guardando...' : 'Guardar recepción'}
        </Button>
      </div>
    </div>
  );
}

/** Existing reception detail and editing */
function ExistingRecepcionDetail({ id }: { id: number }) {
  const navigate = useNavigate();
  const { canEdit } = usePermissions();

  const [recepcion, setRecepcion] = useState<RecepcionDTO | null>(null);
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Add item state
  const [selectedProducto, setSelectedProducto] = useState<ProductoDTO | null>(null);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemExpiry, setItemExpiry] = useState('');
  const [itemLote, setItemLote] = useState('');
  const [itemPrice, setItemPrice] = useState<number | ''>('');

  // Comprobante state
  const [compTipo, setCompTipo] = useState<TipoComprobanteProveedor>('FACTURA');
  const [compSerie, setCompSerie] = useState('');
  const [compNumero, setCompNumero] = useState('');
  const [compUrl, setCompUrl] = useState('');
  const [savingComp, setSavingComp] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rec, prods] = await Promise.all([
        recepcionService.getById(id),
        productoService.getAll(),
      ]);
      setRecepcion(rec);
      setProductos(prods);
      if (rec.comprobante) {
        setCompTipo(rec.comprobante.tipo);
        setCompSerie(rec.comprobante.serie);
        setCompNumero(rec.comprobante.numero);
        setCompUrl(rec.comprobante.urlArchivo || '');
      }
    } catch {
      toast.error('Error al cargar la recepción');
      navigate('/dashboard/recepciones');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedProducto) {
      toast.error('Selecciona un producto');
      return;
    }
    if (itemQty <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    if (!recepcion) return;

    const newItem: RecepcionItemDTO = {
      productoId: selectedProducto.id!,
      productoNombre: selectedProducto.nombre,
      codigoBarras: selectedProducto.codigoBarras,
      cantidadRecibida: itemQty,
      precioUnitario: itemPrice !== '' ? Number(itemPrice) : undefined,
      fechaVencimiento: itemExpiry || undefined,
      lote: itemLote || undefined,
    };

    setSaving(true);
    try {
      const updated = await recepcionService.upsertItems(recepcion.id!, [
        ...recepcion.items,
        newItem,
      ]);
      setRecepcion(updated);
      setSelectedProducto(null);
      setItemQty(1);
      setItemExpiry('');
      setItemLote('');
      setItemPrice('');
      toast.success('Producto agregado');
    } catch {
      toast.error('Error al agregar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveComprobante = async () => {
    if (!recepcion?.id) return;
    if (!compSerie.trim() || !compNumero.trim()) {
      toast.error('Completa serie y número del comprobante');
      return;
    }
    const comp: ComprobanteProveedorDTO = {
      tipo: compTipo,
      serie: compSerie.trim(),
      numero: compNumero.trim(),
      urlArchivo: compUrl.trim() || undefined,
    };
    setSavingComp(true);
    try {
      const updated = await recepcionService.setComprobante(recepcion.id, comp);
      setRecepcion(updated);
      toast.success('Comprobante guardado');
    } catch {
      toast.error('Error al guardar el comprobante');
    } finally {
      setSavingComp(false);
    }
  };

  const handleConfirmar = async () => {
    if (!recepcion?.id) return;
    if (!recepcion.comprobante) {
      toast.error('Debes registrar el comprobante del proveedor antes de confirmar');
      return;
    }
    if (recepcion.items.length === 0) {
      toast.error('Agrega al menos un producto antes de confirmar');
      return;
    }
    setConfirming(true);
    try {
      const updated = await recepcionService.confirmar(recepcion.id);
      setRecepcion(updated);
      toast.success('Recepción confirmada — el stock ha sido actualizado');
    } catch {
      toast.error('Error al confirmar la recepción');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!recepcion) return null;

  const isEditable = recepcion.estado === 'BORRADOR';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/recepciones')}>
          <ArrowLeft size={16} className="mr-1" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Recepción #{recepcion.id}</h1>
          <p className="text-sm text-muted-foreground">
            Proveedor: {recepcion.proveedorNombre || `#${recepcion.proveedorId}`}
            {recepcion.ordenCompraId && (
              <>
                {' '}·{' '}
                <button
                  className="text-primary hover:underline"
                  onClick={() =>
                    navigate(`/dashboard/compras/ordenes/${recepcion.ordenCompraId}`)
                  }
                >
                  OC #{recepcion.ordenCompraId}
                </button>
              </>
            )}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${ESTADO_BADGE[recepcion.estado] || ''}`}
        >
          {recepcion.estado}
        </span>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Productos recepcionados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recepcion.items.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Recibido</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Lote</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recepcion.items.map((item, idx) => {
                    const pendiente =
                      item.cantidadEsperada != null
                        ? Math.max(0, item.cantidadEsperada - item.cantidadRecibida)
                        : null;
                    return (
                      <TableRow key={item.id ?? idx}>
                        <TableCell className="font-medium">
                          {item.productoNombre || `#${item.productoId}`}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.codigoBarras || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.cantidadEsperada ?? '—'}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {item.cantidadRecibida}
                        </TableCell>
                        <TableCell className="text-right">
                          {pendiente != null ? (
                            <span className={pendiente > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                              {pendiente}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.fechaVencimiento || '—'}
                        </TableCell>
                        <TableCell className="text-xs">{item.lote || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay productos en esta recepción
            </p>
          )}

          {/* Add item inline (only in BORRADOR) */}
          {isEditable && canEdit('RECEPCIONES') && (
            <div className="border rounded-md p-3 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">Agregar producto</p>
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Producto
                    <span className="ml-1 inline-flex items-center gap-0.5">
                      <ScanLine size={11} />
                      <span>(scan próxim.)</span>
                    </span>
                  </label>
                  <Autocomplete
                    options={productos.map((p) => ({
                      label: `${p.nombre}${p.codigoBarras ? ` — ${p.codigoBarras}` : ''}`,
                      value: p,
                    }))}
                    value={
                      selectedProducto
                        ? {
                            label: `${selectedProducto.nombre}${selectedProducto.codigoBarras ? ` — ${selectedProducto.codigoBarras}` : ''}`,
                            value: selectedProducto,
                          }
                        : null
                    }
                    onChange={(opt) => setSelectedProducto(opt?.value ?? null)}
                    placeholder="Buscar producto..."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Cant.</label>
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={itemQty}
                    onChange={(e) => setItemQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Vencimiento</label>
                  <Input
                    type="date"
                    className="w-34"
                    value={itemExpiry}
                    onChange={(e) => setItemExpiry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Lote</label>
                  <Input
                    className="w-24"
                    placeholder="Opc."
                    value={itemLote}
                    onChange={(e) => setItemLote(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Precio</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-24"
                    placeholder="Opc."
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <Button type="button" onClick={handleAddItem} disabled={saving}>
                  <Plus size={16} className="mr-1" />
                  Agregar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comprobante del proveedor */}
      <Card>
        <CardHeader>
          <CardTitle>Comprobante del proveedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={compTipo}
                onChange={(e) => setCompTipo(e.target.value as TipoComprobanteProveedor)}
                disabled={!isEditable}
              >
                <option value="FACTURA">FACTURA</option>
                <option value="BOLETA">BOLETA</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Serie</label>
              <Input
                placeholder="F001"
                value={compSerie}
                onChange={(e) => setCompSerie(e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Número</label>
              <Input
                placeholder="00000001"
                value={compNumero}
                onChange={(e) => setCompNumero(e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">URL / adjunto</label>
              <Input
                placeholder="https://... (opcional)"
                value={compUrl}
                onChange={(e) => setCompUrl(e.target.value)}
                disabled={!isEditable}
              />
            </div>
          </div>
          {isEditable && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleSaveComprobante} disabled={savingComp}>
                <Save size={16} className="mr-2" />
                {savingComp ? 'Guardando...' : 'Guardar comprobante'}
              </Button>
            </div>
          )}
          {recepcion.comprobante && (
            <p className="text-sm text-green-600 font-medium">
              ✓ Comprobante registrado: {recepcion.comprobante.tipo}{' '}
              {recepcion.comprobante.serie}-{recepcion.comprobante.numero}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {isEditable && (
        <div className="flex flex-wrap gap-3 justify-end">
          <Button
            onClick={handleConfirmar}
            disabled={confirming}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle size={16} className="mr-2" />
            {confirming ? 'Confirmando...' : 'Confirmar recepción'}
          </Button>
        </div>
      )}
    </div>
  );
}

export function RecepcionDetail() {
  const { id } = useParams<{ id: string }>();

  if (id === 'nueva') {
    return <NewRecepcionForm />;
  }

  return <ExistingRecepcionDetail id={Number(id)} />;
}
