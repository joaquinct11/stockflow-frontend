import type { ComprobanteDTO } from '../types';
import type { TenantConfigDTO } from '../types';
import toast from 'react-hot-toast';

export function printTicket(comprobante: ComprobanteDTO, config?: TenantConfigDTO | null): void {
  const html = buildTicketHtml(comprobante, config);
  const win = window.open('', '_blank', 'width=340,height=700,scrollbars=yes');
  if (!win) {
    toast.error('Permite ventanas emergentes para imprimir el ticket');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

function fmt(v: number | null | undefined): string {
  return v != null ? v.toFixed(2) : '0.00';
}

function buildTicketHtml(c: ComprobanteDTO, cfg?: TenantConfigDTO | null): string {
  const empresa  = cfg?.nombreNegocio ?? 'Mi Empresa';
  const ruc      = cfg?.ruc ? `RUC: ${cfg.ruc}` : '';
  const dir      = cfg?.direccion ?? '';
  const tel      = cfg?.telefono ? `Tel: ${cfg.telefono}` : '';
  const pie      = cfg?.piePaginaPdf ?? '';
  const moneda   = cfg?.moneda ?? 'S/.';
  const igvPct   = cfg?.igvPorcentaje ?? 18;

  const tipoLabel = c.tipo === 'BOLETA' ? 'BOLETA DE VENTA' : 'FACTURA ELECTRÓNICA';
  const numero    = c.numero ?? '—';
  const fecha     = c.createdAt
    ? new Date(c.createdAt).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
    : '—';

  const receptorDoc  = c.receptorDocNumero ?? c.receptor?.numeroDocumento ?? '';
  const receptorNom  = c.receptorNombre    ?? c.receptor?.razonSocial     ?? '';
  const receptorTipo = c.receptorDocTipo   ?? c.receptor?.tipoDocumento   ?? '';

  const items = c.items ?? [];

  const itemRows = items.length > 0
    ? items.map(it => {
        const nombre = it.productoNombre ?? `Prod #${it.productoId}`;
        const cant   = it.cantidad ?? 0;
        const pu     = Number(it.precioUnitario ?? 0).toFixed(2);
        const sub    = Number(it.subtotal ?? 0).toFixed(2);
        // wrap name at ~22 chars
        return `
          <tr>
            <td colspan="3" style="padding:1px 0;word-break:break-word">${nombre}</td>
          </tr>
          <tr>
            <td style="padding-bottom:3px">${cant} x ${moneda}${pu}</td>
            <td></td>
            <td style="text-align:right;padding-bottom:3px"><b>${moneda}${sub}</b></td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="3" style="text-align:center;padding:6px 0">Sin productos</td></tr>`;

  const sunatBadge = c.sunatEstado === 'ACEPTADO'
    ? `<p style="text-align:center;font-weight:bold;font-size:11px;border:1px solid #000;padding:3px;margin:4px 0">✓ ACEPTADO POR SUNAT</p>`
    : c.sunatEstado === 'PENDIENTE'
    ? `<p style="text-align:center;font-size:10px;border:1px dashed #555;padding:3px;margin:4px 0">⏳ PENDIENTE SUNAT</p>`
    : c.sunatEstado === 'RECHAZADO'
    ? `<p style="text-align:center;font-size:10px;border:1px solid #c00;color:#c00;padding:3px;margin:4px 0">✗ RECHAZADO SUNAT</p>`
    : '';

  const anulado = c.estado === 'ANULADO'
    ? `<p style="text-align:center;font-size:16px;font-weight:bold;border:3px solid #c00;color:#c00;padding:4px;margin:6px 0;letter-spacing:3px">A N U L A D O</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Ticket ${numero}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 80mm auto; margin: 4mm 3mm; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    width: 74mm;
    color: #000;
    line-height: 1.35;
  }
  .center { text-align: center; }
  .bold   { font-weight: bold; }
  .sep-solid  { border-top: 1px solid #000; margin: 5px 0; }
  .sep-dashed { border-top: 1px dashed #555; margin: 5px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; font-size: 11px; }
  .total-box { background: #f5f5f5; border: 1px solid #000; padding: 4px 6px; margin: 4px 0; }
  .total-row td { padding: 1px 0; }
  .total-main td { font-size: 14px; font-weight: bold; padding-top: 3px; }
  @media print {
    body { width: 74mm; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- EMPRESA -->
<div class="center">
  <p class="bold" style="font-size:14px">${empresa}</p>
  ${ruc ? `<p>${ruc}</p>` : ''}
  ${dir ? `<p>${dir}</p>` : ''}
  ${tel ? `<p>${tel}</p>` : ''}
</div>

<div class="sep-solid"></div>

<!-- TIPO Y NÚMERO -->
<div class="center">
  <p class="bold" style="font-size:12px">${tipoLabel}</p>
  <p class="bold" style="font-size:15px; letter-spacing:1px">${numero}</p>
  <p style="font-size:10px">Fecha: ${fecha}</p>
  <p style="font-size:10px">Venta #${c.ventaId}</p>
</div>

${anulado}

<div class="sep-dashed"></div>

<!-- RECEPTOR -->
${(receptorDoc || receptorNom) ? `
<div>
  ${receptorTipo && receptorDoc ? `<p>${receptorTipo}: ${receptorDoc}</p>` : ''}
  ${receptorNom ? `<p>${receptorNom}</p>` : ''}
</div>
<div class="sep-dashed"></div>
` : ''}

<!-- ITEMS HEADER -->
<table>
  <tr>
    <td colspan="3" style="font-weight:bold;border-bottom:1px solid #000;padding-bottom:2px">DESCRIPCIÓN</td>
  </tr>
  <tr style="font-weight:bold;border-bottom:1px dashed #000">
    <td>CANT x P.UNIT</td>
    <td></td>
    <td style="text-align:right">SUBTOTAL</td>
  </tr>
  ${itemRows}
</table>

<div class="sep-solid"></div>

<!-- TOTALES -->
<div class="total-box">
  <table class="total-row">
    <tr>
      <td>Op. Gravada:</td>
      <td style="text-align:right">${moneda}${fmt(c.subtotal)}</td>
    </tr>
    <tr>
      <td>IGV (${igvPct}%):</td>
      <td style="text-align:right">${moneda}${fmt(c.igv)}</td>
    </tr>
  </table>
  <div class="sep-dashed"></div>
  <table class="total-main">
    <tr>
      <td>TOTAL:</td>
      <td style="text-align:right">${moneda}${fmt(c.total)}</td>
    </tr>
  </table>
</div>

${sunatBadge}

<div class="sep-dashed"></div>

<!-- FOOTER -->
<div class="center" style="font-size:9px; margin-top:4px">
  ${pie ? `<p>${pie}</p>` : ''}
  <p>Representación impresa generada</p>
  <p>con Fluxus ERP</p>
</div>

<!-- Extra space for tear -->
<p style="margin-top:12px">&nbsp;</p>

</body>
</html>`;
}
