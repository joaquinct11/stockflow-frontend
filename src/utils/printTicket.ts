import type { ComprobanteDTO, NotaCreditoDTO, VentaDTO } from '../types';
import type { TenantConfigDTO } from '../types';
import toast from 'react-hot-toast';

// ── Monto en letras (español) ─────────────────────────────────────────────────
const ONES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
              'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS',
              'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const TENS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA',
              'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const HUNDREDS = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
                  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function intToWords(n: number): string {
  if (n === 0) return 'CERO';
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10;
    if (t === 2 && o > 0) return 'VEINTI' + ONES[o];
    return TENS[t] + (o > 0 ? ' Y ' + ONES[o] : '');
  }
  if (n < 1000) {
    const h = Math.floor(n / 100), r = n % 100;
    const hw = h === 1 ? (r > 0 ? 'CIENTO' : 'CIEN') : HUNDREDS[h];
    return hw + (r > 0 ? ' ' + intToWords(r) : '');
  }
  if (n < 1_000_000) {
    const t = Math.floor(n / 1000), r = n % 1000;
    return (t === 1 ? 'MIL' : intToWords(t) + ' MIL') + (r > 0 ? ' ' + intToWords(r) : '');
  }
  return String(n);
}

function amountToWords(amount: number): string {
  const intPart = Math.floor(Math.abs(amount));
  const dec = Math.round((Math.abs(amount) - intPart) * 100);
  return `${intToWords(intPart)} CON ${String(dec).padStart(2, '0')}/100 SOLES`;
}

// ── Estilos base ──────────────────────────────────────────────────────────────
const BASE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 80mm auto; margin: 4mm 3mm; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    width: 74mm;
    color: #000;
    line-height: 1.5;
    margin: 0 auto;
  }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: bold; }
  .sep-solid  { border-top: 1px solid #000; margin: 6px 0; }
  .sep-dashed { border-top: 1px dashed #aaa; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td, th { vertical-align: top; font-size: 11px; padding: 1px 2px; }
  th { font-weight: bold; border-bottom: 1px dashed #aaa; padding-bottom: 3px; }
  .col-cant  { width: 24px; text-align: center; }
  .col-um    { width: 28px; text-align: center; }
  .col-precio { text-align: right; }
  .col-total { text-align: right; }
  .item-nombre td { padding-top: 4px; font-weight: 500; }
  .totales td { padding: 2px 0; }
  .total-final { font-size: 13px; font-weight: bold; border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; display: flex; justify-content: space-between; }
  .lbl { font-weight: bold; }
  @media print {
    body { width: 74mm; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function openTicket(html: string) {
  const win = window.open('', '_blank', 'width=290,height=700,scrollbars=yes');
  if (!win) { toast.error('Permite ventanas emergentes para imprimir el ticket'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

// ── Ticket de VENTA (sin comprobante) ────────────────────────────────────────
export function printVentaTicket(
  venta: VentaDTO,
  config?: TenantConfigDTO | null,
  clienteDni?: string,
  clienteNombre?: string,
): void {
  const empresa = config?.nombreNegocio ?? 'Mi Empresa';
  const ruc     = config?.ruc ?? '';
  const dir     = config?.direccion ?? '';
  const tel     = config?.telefono ?? '';
  const pie     = config?.piePaginaPdf ?? '';
  const igvPct  = config?.igvPorcentaje ?? 18;

  const fecha = venta.createdAt
    ? new Date(venta.createdAt).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const esRopa = config?.rubro === 'TIENDA_ROPA';
  const total  = venta.detalles.reduce((s, d) => s + d.cantidad * Number(d.precioUnitario), 0);
  const igvAmt = total * igvPct / 100 / (1 + igvPct / 100);
  const base   = total - igvAmt;

  const itemRows = venta.detalles.map(d => {
    const cant = d.cantidad ?? 0;
    const pu   = Number(d.precioUnitario ?? 0).toFixed(2);
    const sub  = (cant * Number(d.precioUnitario ?? 0)).toFixed(2);
    return `
      <tr class="item-nombre"><td colspan="4">${d.productoNombre ?? `Prod #${d.productoId}`}${d.varianteDescripcion ? ` <span style="font-weight:normal;font-size:9px">(${d.varianteDescripcion})</span>` : ''}</td></tr>
      <tr>
        <td class="col-cant">${cant}</td>
        <td class="col-um">UND</td>
        <td class="col-precio">${pu}</td>
        <td class="col-total">${sub}</td>
      </tr>`;
  }).join('');

  const clienteBlock = (clienteDni || clienteNombre) ? `
    ${clienteNombre ? `<p><span class="lbl">Cliente:</span> ${clienteNombre}</p>` : ''}
    ${clienteDni    ? `<p><span class="lbl">DNI:</span> ${clienteDni}</p>`         : ''}` : '';

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Ticket Venta #${venta.id}</title>
<style>${BASE_STYLES}</style></head><body>

<div class="center">
  <p class="bold" style="font-size:14px">${empresa}</p>
  ${ruc ? `<p>RUC: ${ruc}</p>` : ''}
  ${dir ? `<p>${dir}</p>`       : ''}
  ${tel ? `<p>Tel: ${tel}</p>`  : ''}
</div>
<div class="sep-solid"></div>

<div class="center">
  <p class="bold" style="font-size:13px">TICKET DE VENTA</p>
  <p class="bold" style="font-size:17px">#${venta.id}</p>
</div>
<div class="sep-dashed"></div>

${clienteBlock}
<p><span class="lbl">Cajero:</span> ${venta.vendedorNombre ?? '—'}</p>
<p><span class="lbl">Fecha:</span> ${fecha}</p>
<div class="sep-dashed"></div>

<p class="bold" style="margin-bottom:3px">Detalle</p>
<table>
  <thead>
    <tr>
      <th class="col-cant">Cant</th>
      <th class="col-um">U.M</th>
      <th class="col-precio">Precio</th>
      <th class="col-total">Total</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>
<div class="sep-solid"></div>

${!esRopa ? `<table class="totales">
  <tr><td>Total Gravado (S/):</td><td class="right">${base.toFixed(2)}</td></tr>
  <tr><td>IGV ${igvPct}.00% (S/):</td><td class="right">${igvAmt.toFixed(2)}</td></tr>
</table>` : ''}
<div class="total-final">
  <span>Total (S/):</span><span>${total.toFixed(2)}</span>
</div>

<p style="margin-top:8px"><span class="lbl">SON:</span> ${amountToWords(total)}</p>
<p><span class="lbl">Cond. Venta:</span> ${venta.metodoPago ?? '—'}</p>

<div class="sep-dashed"></div>
<div class="center" style="font-size:9px;margin-top:4px">
  ${pie ? `<p>${pie}</p>` : ''}
  <p>Documento no válido para crédito fiscal</p>
  <p>Generado con Fluxus ERP</p>
</div>
<p style="margin-top:12px">&nbsp;</p>
</body></html>`;

  openTicket(html);
}

// ── Ticket de NOTA DE CRÉDITO ────────────────────────────────────────────────
export function printNotaCreditoTicket(nc: NotaCreditoDTO, config?: TenantConfigDTO | null): void {
  const empresa = config?.nombreNegocio ?? 'Mi Empresa';
  const ruc     = config?.ruc ?? '';
  const dir     = config?.direccion ?? '';
  const tel     = config?.telefono ?? '';
  const pie     = config?.piePaginaPdf ?? '';

  const fmtFecha = (iso?: string | null) => iso
    ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  const monto = (nc.montoTotal ?? 0).toFixed(2);

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Nota de Crédito ${nc.codigo}</title>
<style>${BASE_STYLES}</style></head><body>

<div class="center">
  <p class="bold" style="font-size:14px">${empresa}</p>
  ${ruc ? `<p>RUC: ${ruc}</p>` : ''}
  ${dir ? `<p>${dir}</p>`       : ''}
  ${tel ? `<p>Tel: ${tel}</p>`  : ''}
</div>
<div class="sep-solid"></div>

<div class="center">
  <p class="bold" style="font-size:13px">NOTA DE CRÉDITO</p>
  <p class="bold" style="font-size:17px">${nc.codigo}</p>
</div>
<div class="sep-dashed"></div>

<p><span class="lbl">Emisión:</span> ${fmtFecha(nc.fechaEmision)}</p>
<p><span class="lbl">Vence:</span> ${fmtFecha(nc.fechaVencimiento)}</p>
${nc.ventaOrigenId ? `<p><span class="lbl">Venta origen:</span> #${nc.ventaOrigenId}</p>` : ''}
<div class="sep-solid"></div>

<div class="center" style="margin:6px 0">
  <p style="font-size:11px;font-weight:bold">TOTAL A FAVOR</p>
  <p class="bold" style="font-size:20px">S/ ${monto}</p>
  <p style="font-size:10px">${amountToWords(nc.montoTotal ?? 0)}</p>
</div>

<div class="sep-dashed"></div>
<div class="center" style="font-size:9px;margin-top:4px">
  <p>Presenta este ticket en tu próxima compra</p>
  <p>y se descontará el monto indicado.</p>
  <p style="margin-top:4px"><b>Válido hasta: ${fmtFecha(nc.fechaVencimiento)}</b></p>
  ${pie ? `<p style="margin-top:4px">${pie}</p>` : ''}
  <p>Documento no válido para crédito fiscal</p>
  <p>Generado con Fluxus ERP</p>
</div>
<p style="margin-top:12px">&nbsp;</p>
</body></html>`;

  openTicket(html);
}

// ── Ticket de COMPROBANTE (boleta/factura) ────────────────────────────────────
export function printTicket(comprobante: ComprobanteDTO, config?: TenantConfigDTO | null): void {
  openTicket(buildTicketHtml(comprobante, config));
}

function fmt(v: number | null | undefined): string {
  return v != null ? Number(v).toFixed(2) : '0.00';
}

function buildTicketHtml(c: ComprobanteDTO, cfg?: TenantConfigDTO | null): string {
  const empresa  = cfg?.nombreNegocio ?? 'Mi Empresa';
  const ruc      = cfg?.ruc ?? '';
  const dir      = cfg?.direccion ?? '';
  const tel      = cfg?.telefono ?? '';
  const pie      = cfg?.piePaginaPdf ?? '';
  const igvPct   = cfg?.igvPorcentaje ?? 18;
  const esRopa   = cfg?.rubro === 'TIENDA_ROPA';

  const tipoLabel = c.tipo === 'BOLETA' ? 'BOLETA DE VENTA' : 'FACTURA ELECTRÓNICA';
  const numero    = (c.numero ?? '—').replace('-', ' - ');
  const fecha     = c.fechaEmision
    ? new Date(c.fechaEmision).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : c.createdAt
    ? new Date(c.createdAt).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const receptorDoc  = c.receptorDocNumero ?? c.receptor?.numeroDocumento ?? '';
  const receptorNom  = c.receptorNombre    ?? c.receptor?.razonSocial     ?? '';
  const receptorTipo = c.receptorDocTipo   ?? c.receptor?.tipoDocumento   ?? 'DOC';

  const items = c.items ?? [];

  const itemRows = items.length > 0
    ? items.map(it => {
        const cant = it.cantidad ?? 0;
        const pu   = Number(it.precioUnitario ?? 0).toFixed(2);
        const sub  = Number(it.subtotal ?? 0).toFixed(2);
        return `
          <tr class="item-nombre"><td colspan="4">${it.productoNombre ?? `Prod #${it.productoId}`}${it.varianteDescripcion ? ` <span style="font-weight:normal;font-size:9px">(${it.varianteDescripcion})</span>` : ''}</td></tr>
          <tr>
            <td class="col-cant">${cant}</td>
            <td class="col-um">NIU</td>
            <td class="col-precio">${pu}</td>
            <td class="col-total">${sub}</td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="4" style="text-align:center;padding:6px 0">Sin productos</td></tr>`;

  const sunatBadge = c.sunatEstado === 'ACEPTADO'
    ? `<p style="text-align:center;font-weight:bold;font-size:11px;border:1px solid #000;padding:3px;margin:6px 0">✓ ACEPTADO POR SUNAT</p>`
    : c.sunatEstado === 'PENDIENTE'
    ? `<p style="text-align:center;font-size:10px;border:1px dashed #aaa;padding:3px;margin:6px 0">⏳ PENDIENTE SUNAT</p>`
    : c.sunatEstado === 'RECHAZADO'
    ? `<p style="text-align:center;font-size:10px;border:1px solid #c00;color:#c00;padding:3px;margin:6px 0">✗ RECHAZADO SUNAT</p>`
    : '';

  const anulado = c.estado === 'ANULADO'
    ? `<p style="text-align:center;font-size:16px;font-weight:bold;border:3px solid #c00;color:#c00;padding:4px;margin:6px 0;letter-spacing:3px">A N U L A D O</p>`
    : '';

  const qrBlock = c.qr
    ? `<div style="text-align:center;margin-top:8px"><img src="${c.qr}" style="width:90px;height:90px" /></div>`
    : '';

  const hashBlock = c.hash
    ? `<p style="text-align:center;font-size:9px;margin-top:4px;word-break:break-all"><b>Hash:</b> ${c.hash}</p>`
    : '';

  const total = Number(c.total ?? 0);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Ticket ${c.numero ?? ''}</title>
<style>${BASE_STYLES}</style>
</head>
<body>

<div class="center">
  <p class="bold" style="font-size:14px">${empresa}</p>
  ${ruc ? `<p>RUC: ${ruc}</p>` : ''}
  ${dir ? `<p>${dir}</p>`       : ''}
  ${tel ? `<p>Tel: ${tel}</p>`  : ''}
</div>
<div class="sep-solid"></div>

<div class="center">
  <p class="bold" style="font-size:13px">${tipoLabel}</p>
  <p class="bold" style="font-size:17px">${numero}</p>
</div>

${anulado}
<div class="sep-dashed"></div>

${receptorNom ? `<p><span class="lbl">Cliente:</span> ${receptorNom}</p>` : ''}
${receptorDoc ? `<p><span class="lbl">${receptorTipo}:</span> ${receptorDoc}</p>` : ''}
<p><span class="lbl">Fecha:</span> ${fecha}</p>
<div class="sep-dashed"></div>

<p class="bold" style="margin-bottom:3px">Detalle</p>
<table>
  <thead>
    <tr>
      <th class="col-cant">Cant</th>
      <th class="col-um">U.M</th>
      <th class="col-precio">Precio</th>
      <th class="col-total">Total</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>
<div class="sep-solid"></div>

${!esRopa ? `<table class="totales">
  <tr><td>Total Gravado (S/):</td><td class="right">${fmt(c.subtotal)}</td></tr>
  <tr><td>IGV ${igvPct}.00% (S/):</td><td class="right">${fmt(c.igv)}</td></tr>
</table>` : ''}
<div class="total-final">
  <span>Total (S/):</span><span>${fmt(c.total)}</span>
</div>

<p style="margin-top:8px"><span class="lbl">SON:</span> ${amountToWords(total)}</p>

${sunatBadge}

${qrBlock}
${hashBlock}

<div class="sep-dashed"></div>
<div class="center" style="font-size:9px;margin-top:4px">
  ${pie ? `<p>${pie}</p>` : ''}
  <p>Representación Impresa de la</p>
  <p class="bold">${tipoLabel} ELECTRÓNICA</p>
</div>
<p style="margin-top:12px">&nbsp;</p>

</body>
</html>`;
}
