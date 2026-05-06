/**
 * Utilidades de exportación para el módulo de Reportes
 * Soporta Excel (xlsx) y PDF (jspdf + autotable)
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  ReportesResumenDTO,
  VentasPorVendedorDTO,
  VentasPorCategoriaDTO,
  VentasPorMetodoPagoDTO,
  VentasProductoDTO,
  InventarioABCDTO,
  InventarioSlowMoverDTO,
  InventarioCoberturaDTO,
  ComprasPorProveedorDTO,
  VentaDTO,
  OrdenCompraDTO,
  ProductoDTO,
} from '../types';

// ── helpers ───────────────────────────────────────────────────────────────────

function sol(v: number | null | undefined): string {
  if (v == null) return '—';
  return `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function num(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('es-PE');
}

function pct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(1)}%`;
}

function labelRango(desde: string, hasta: string): string {
  return `${desde} al ${hasta}`;
}

// ── Interfaces de datos agrupados ────────────────────────────────────────────

export interface VentasExportData {
  porVendedor: VentasPorVendedorDTO[];
  porCategoria: VentasPorCategoriaDTO[];
  porMetodoPago: VentasPorMetodoPagoDTO[];
  topProductos: VentasProductoDTO[];
  menosProductos: VentasProductoDTO[];
}

export interface InventarioExportData {
  abc: InventarioABCDTO[];
  slowMovers: InventarioSlowMoverDTO[];
  cobertura: InventarioCoberturaDTO[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL
// ═══════════════════════════════════════════════════════════════════════════════

export function exportarExcel(
  desde: string,
  hasta: string,
  resumen: ReportesResumenDTO | null,
  ventas: VentasExportData | null,
  inventario: InventarioExportData | null,
  compras: ComprasPorProveedorDTO[] | null,
): void {
  const wb = XLSX.utils.book_new();

  // ── Hoja 1: Resumen ──────────────────────────────────────────────────────
  const resumenRows: (string | number)[][] = [
    [`Reporte de Resumen — ${labelRango(desde, hasta)}`],
    [],
    ['VENTAS DEL PERÍODO'],
    ['Métrica', 'Valor'],
    ['Ingresos totales', resumen?.ventas?.ingresosTotal ?? 0],
    ['Nº de ventas', resumen?.ventas?.ventasCount ?? 0],
    ['Ticket promedio', resumen?.ventas?.ticketPromedio ?? 0],
    ['Margen estimado', resumen?.ventas?.margenEstimado ?? 0],
    [],
    ['INVENTARIO'],
    ['Métrica', 'Valor'],
    ['Total productos', resumen?.inventario?.totalProductos ?? 0],
    ['Valorización stock', resumen?.inventario?.valorizacionStock ?? 0],
    ['Entradas período', resumen?.movimientos?.entradasCantidad ?? 0],
    ['Productos bajo stock', resumen?.inventario?.productosBajoStock?.length ?? 0],
    [],
    ['RECEPCIONES DEL PERÍODO'],
    ['Métrica', 'Valor'],
    ['Recepciones confirmadas', resumen?.comprasRecepciones?.recepcionesConfirmadasCount ?? 0],
    ['Unidades recibidas', resumen?.comprasRecepciones?.unidadesRecibidas ?? 0],
    ['Monto compras estimado', resumen?.comprasRecepciones?.montoComprasEstimado ?? 0],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen['!cols'] = [{ wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // ── Hoja 2: Ventas por vendedor ──────────────────────────────────────────
  if (ventas?.porVendedor?.length) {
    const rows: (string | number)[][] = [
      [`Ventas por vendedor — ${labelRango(desde, hasta)}`],
      [],
      ['Vendedor', 'Nº Ventas', 'Ingresos (S/)', 'Ticket promedio (S/)'],
      ...ventas.porVendedor.map(v => [
        v.vendedorNombre,
        v.ventasCount ?? 0,
        v.ingresosTotal ?? 0,
        v.ticketPromedio ?? 0,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas x Vendedor');
  }

  // ── Hoja 3: Ventas por categoría ─────────────────────────────────────────
  if (ventas?.porCategoria?.length) {
    const rows: (string | number)[][] = [
      [`Ventas por categoría — ${labelRango(desde, hasta)}`],
      [],
      ['Categoría', 'Ingresos (S/)'],
      ...ventas.porCategoria.map(c => [c.categoria, c.ingresosTotal ?? 0]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 24 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas x Categoría');
  }

  // ── Hoja 4: Top productos ────────────────────────────────────────────────
  if (ventas?.topProductos?.length) {
    const rows: (string | number)[][] = [
      [`Top productos más vendidos — ${labelRango(desde, hasta)}`],
      [],
      ['Producto', 'Unidades vendidas', 'Ingresos (S/)'],
      ...ventas.topProductos.map(p => [p.nombre, p.cantidad ?? 0, p.ingresos ?? 0]),
      [],
      ['Top productos menos vendidos'],
      ['Producto', 'Unidades vendidas', 'Ingresos (S/)'],
      ...(ventas.menosProductos ?? []).map(p => [p.nombre, p.cantidad ?? 0, p.ingresos ?? 0]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Top Productos');
  }

  // ── Hoja 5: Análisis ABC ──────────────────────────────────────────────────
  if (inventario?.abc?.length) {
    const rows: (string | number)[][] = [
      [`Análisis ABC — ${labelRango(desde, hasta)}`],
      [],
      ['Producto', 'Clasificación', 'Ingresos (S/)', '% Acumulado'],
      ...inventario.abc.map(p => [
        p.nombre,
        p.clasificacion,
        p.ingresos ?? 0,
        p.porcentajeAcumulado ?? 0,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'ABC Inventario');
  }

  // ── Hoja 6: Slow movers ───────────────────────────────────────────────────
  if (inventario?.slowMovers?.length) {
    const rows: (string | number)[][] = [
      ['Productos sin movimiento'],
      [],
      ['Producto', 'Stock actual', 'Capital inmovilizado (S/)', 'Días sin salida'],
      ...inventario.slowMovers.map(p => [
        p.nombre,
        p.stockActual ?? 0,
        p.costoTotal ?? 0,
        p.diasSinSalida ?? 0,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 24 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Sin Movimiento');
  }

  // ── Hoja 7: Compras por proveedor ────────────────────────────────────────
  if (compras?.length) {
    const rows: (string | number)[][] = [
      [`Compras por proveedor — ${labelRango(desde, hasta)}`],
      [],
      ['Proveedor', 'Recepciones', 'Unidades recibidas', 'Monto estimado (S/)'],
      ...compras.map(p => [
        p.proveedorNombre,
        p.recepcionesCount ?? 0,
        p.unidadesRecibidas ?? 0,
        p.montoEstimado ?? 0,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 20 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Compras x Proveedor');
  }

  // ── Bajo stock ────────────────────────────────────────────────────────────
  const bajoStock = resumen?.inventario?.productosBajoStock ?? [];
  if (bajoStock.length) {
    const rows: (string | number)[][] = [
      ['Productos bajo stock mínimo'],
      [],
      ['Producto', 'Stock actual', 'Stock mínimo', 'Déficit'],
      ...bajoStock.map(p => [
        p.nombre,
        p.stockActual,
        p.stockMinimo,
        p.stockMinimo - p.stockActual,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Bajo Stock');
  }

  const filename = `reporte_${desde}_${hasta}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF
// ═══════════════════════════════════════════════════════════════════════════════

export function exportarPDF(
  desde: string,
  hasta: string,
  resumen: ReportesResumenDTO | null,
  ventas: VentasExportData | null,
  inventario: InventarioExportData | null,
  compras: ComprasPorProveedorDTO[] | null,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // ── utilidades locales ────────────────────────────────────────────────────
  const addTitle = (text: string) => {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(text, 14, y);
    y += 6;
  };

  const addSubtitle = (text: string) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(text, 14, y);
    y += 8;
  };

  const addSectionTitle = (text: string) => {
    y += 4;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(text, 14, y);
    y += 5;
  };

  const addTable = (head: string[][], body: (string | number)[][], opts?: object) => {
    autoTable(doc, {
      startY: y,
      head,
      body: body.map(row => row.map(String)),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 255] },
      margin: { left: 14, right: 14 },
      ...opts,
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 6;
    if (y > 270) { doc.addPage(); y = 15; }
  };

  const divider = () => {
    doc.setDrawColor(220, 220, 220);
    doc.line(14, y, pageW - 14, y);
    y += 5;
  };

  // ── Encabezado ────────────────────────────────────────────────────────────
  addTitle('Fluxus — Reporte de Gestión');
  addSubtitle(`Período: ${labelRango(desde, hasta)}   ·   Generado: ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}`);
  divider();

  // ── KPIs de ventas ────────────────────────────────────────────────────────
  if (resumen?.ventas) {
    const v = resumen.ventas;
    addSectionTitle('Ventas del período');
    addTable(
      [['Métrica', 'Valor']],
      [
        ['Ingresos totales', sol(v.ingresosTotal)],
        ['Nº de ventas', num(v.ventasCount)],
        ['Ticket promedio', sol(v.ticketPromedio)],
        ['Margen estimado', sol(v.margenEstimado)],
      ],
      { columnStyles: { 0: { fontStyle: 'bold' } } }
    );
  }

  // ── KPIs de inventario ────────────────────────────────────────────────────
  addSectionTitle('Inventario');
  addTable(
    [['Métrica', 'Valor']],
    [
      ['Total productos', num(resumen?.inventario?.totalProductos)],
      ['Valorización stock', sol(resumen?.inventario?.valorizacionStock)],
      ['Entradas del período', num(resumen?.movimientos?.entradasCantidad)],
      ['Productos bajo stock', num(resumen?.inventario?.productosBajoStock?.length)],
    ],
    { columnStyles: { 0: { fontStyle: 'bold' } } }
  );

  // ── Recepciones ───────────────────────────────────────────────────────────
  addSectionTitle('Recepciones del período');
  addTable(
    [['Métrica', 'Valor']],
    [
      ['Recepciones confirmadas', num(resumen?.comprasRecepciones?.recepcionesConfirmadasCount)],
      ['Unidades recibidas', num(resumen?.comprasRecepciones?.unidadesRecibidas)],
      ['Monto compras estimado', sol(resumen?.comprasRecepciones?.montoComprasEstimado)],
    ],
    { columnStyles: { 0: { fontStyle: 'bold' } } }
  );

  // ── Ventas por vendedor ───────────────────────────────────────────────────
  if (ventas?.porVendedor?.length) {
    addSectionTitle('Performance por vendedor');
    addTable(
      [['Vendedor', 'Ventas', 'Ingresos', 'Ticket prom.']],
      ventas.porVendedor.map(v => [
        v.vendedorNombre,
        num(v.ventasCount),
        sol(v.ingresosTotal),
        sol(v.ticketPromedio),
      ])
    );
  }

  // ── Top productos ─────────────────────────────────────────────────────────
  if (ventas?.topProductos?.length) {
    addSectionTitle('Top productos más vendidos');
    addTable(
      [['Producto', 'Unidades', 'Ingresos']],
      ventas.topProductos.slice(0, 10).map(p => [
        p.nombre,
        num(p.cantidad),
        sol(p.ingresos),
      ])
    );
  }

  // ── Ventas por método de pago ─────────────────────────────────────────────
  if (ventas?.porMetodoPago?.length) {
    addSectionTitle('Métodos de pago');
    addTable(
      [['Método', 'Ventas', 'Ingresos', '% del total']],
      ventas.porMetodoPago.map(m => [
        m.metodoPago,
        num(m.ventasCount),
        sol(m.ingresosTotal),
        pct(m.porcentaje),
      ])
    );
  }

  // ── ABC ───────────────────────────────────────────────────────────────────
  if (inventario?.abc?.length) {
    addSectionTitle('Análisis ABC de inventario');
    addTable(
      [['Producto', 'Clase', 'Ingresos', '% Acum.']],
      inventario.abc.slice(0, 20).map(p => [
        p.nombre,
        p.clasificacion,
        sol(p.ingresos),
        pct(p.porcentajeAcumulado),
      ])
    );
  }

  // ── Bajo stock ────────────────────────────────────────────────────────────
  const bajoStock = resumen?.inventario?.productosBajoStock ?? [];
  if (bajoStock.length) {
    addSectionTitle('Productos bajo stock mínimo');
    addTable(
      [['Producto', 'Stock actual', 'Mínimo', 'Déficit']],
      bajoStock.slice(0, 15).map(p => [
        p.nombre,
        num(p.stockActual),
        num(p.stockMinimo),
        num(p.stockMinimo - p.stockActual),
      ])
    );
  }

  // ── Compras por proveedor ─────────────────────────────────────────────────
  if (compras?.length) {
    addSectionTitle('Compras por proveedor');
    addTable(
      [['Proveedor', 'Recepciones', 'Unidades', 'Monto est.']],
      compras.map(p => [
        p.proveedorNombre,
        num(p.recepcionesCount),
        num(p.unidadesRecibidas),
        sol(p.montoEstimado),
      ])
    );
  }

  // ── Pie de página en todas las páginas ───────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Fluxus · Reporte ${labelRango(desde, hasta)} · Pág. ${i} de ${totalPages}`,
      pageW / 2, 290,
      { align: 'center' }
    );
  }

  doc.save(`reporte_${desde}_${hasta}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VENTAS: lista filtrada → Excel y PDF
// ═══════════════════════════════════════════════════════════════════════════════

export function exportarVentasExcel(ventas: VentaDTO[], etiqueta: string): void {
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [
    [`Listado de Ventas — ${etiqueta}`],
    [],
    ['ID', 'Fecha', 'Hora', 'Vendedor', 'Método Pago', 'Estado', 'Total (S/)'],
    ...ventas.map((v) => {
      const d = v.createdAt ? new Date(v.createdAt) : null;
      return [
        v.id ?? '',
        d ? d.toLocaleDateString('es-PE') : '',
        d ? d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '',
        v.vendedorNombre ?? '',
        v.metodoPago ?? '',
        v.estado ?? '',
        v.total ?? 0,
      ];
    }),
    [],
    ['', '', '', '', '', 'TOTAL', ventas.reduce((s, v) => s + (v.total ?? 0), 0)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
  XLSX.writeFile(wb, `ventas_${etiqueta.replace(/[\s/]/g, '_')}.xlsx`);
}

export function exportarVentasPDF(ventas: VentaDTO[], etiqueta: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Fluxus — Listado de Ventas', 14, y);
  y += 6;

  const totalIngresos = ventas.reduce((s, v) => s + (v.total ?? 0), 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Período: ${etiqueta}   ·   ${ventas.length} venta(s)   ·   Total: ${sol(totalIngresos)}`,
    14, y
  );
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [['ID', 'Fecha', 'Vendedor', 'Método Pago', 'Estado', 'Total']],
    body: ventas.map((v) => {
      const d = v.createdAt ? new Date(v.createdAt) : null;
      return [
        String(v.id ?? ''),
        d ? d.toLocaleDateString('es-PE') : '',
        v.vendedorNombre ?? '',
        v.metodoPago ?? '',
        v.estado ?? '',
        sol(v.total),
      ];
    }),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 255] },
    margin: { left: 14, right: 14 },
    columnStyles: { 5: { halign: 'right' } },
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Fluxus · Ventas ${etiqueta} · Pág. ${i} de ${totalPages}`,
      pageW / 2, 290, { align: 'center' }
    );
  }

  doc.save(`ventas_${etiqueta.replace(/[\s/]/g, '_')}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// OC: PDF de orden de compra individual
// ═══════════════════════════════════════════════════════════════════════════════

export function exportarOCPDF(oc: OrdenCompraDTO): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  const fechaEmision = oc.createdAt
    ? new Date(oc.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── Encabezado ──────────────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Fluxus — Orden de Compra', 14, y);

  doc.setFontSize(14);
  doc.setTextColor(99, 102, 241);
  doc.text(`OC #${oc.id}`, pageW - 14, y, { align: 'right' });
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha de emisión: ${fechaEmision}   ·   Estado: ${oc.estado}`, 14, y);
  y += 10;

  // ── Datos del proveedor ──────────────────────────────────────────────────────
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(14, y, pageW - 28, 20, 2, 2);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text('PROVEEDOR', 18, y);
  y += 4;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(oc.proveedorNombre || `Proveedor #${oc.proveedorId}`, 18, y);
  y += 14;

  // ── Observaciones ───────────────────────────────────────────────────────────
  if (oc.observaciones) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Observaciones: ${oc.observaciones}`, 14, y);
    y += 8;
  }

  // ── Tabla de ítems ──────────────────────────────────────────────────────────
  const items = oc.items ?? [];
  autoTable(doc, {
    startY: y,
    head: [['Código', 'Producto', 'Cant. solicitada', 'Precio unit.', 'Subtotal']],
    body: items.map((it) => [
      it.codigoBarras ?? '—',
      it.productoNombre ?? `#${it.productoId}`,
      String(it.cantidadSolicitada ?? 0),
      sol(it.precioUnitario ?? null),
      it.precioUnitario != null ? sol((it.precioUnitario ?? 0) * (it.cantidadSolicitada ?? 0)) : '—',
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 255] },
    margin: { left: 14, right: 14 },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  });

  y = ((doc as any).lastAutoTable?.finalY ?? y) + 6;

  // ── Total ───────────────────────────────────────────────────────────────────
  const subtotal = items.reduce((acc, it) => acc + (it.precioUnitario ?? 0) * (it.cantidadSolicitada ?? 0), 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(`Total estimado: ${sol(subtotal)}`, pageW - 14, y, { align: 'right' });
  y += 16;

  // ── Líneas de firma ─────────────────────────────────────────────────────────
  if (y < 255) {
    doc.setDrawColor(180, 180, 180);
    doc.line(14, y, 75, y);
    doc.line(pageW - 75, y, pageW - 14, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text('Elaborado por', 44, y, { align: 'center' });
    doc.text('Autorizado por', pageW - 44, y, { align: 'center' });
  }

  // ── Pie de página ───────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Fluxus · OC #${oc.id} · ${fechaEmision} · Pág. ${i} de ${totalPages}`,
      pageW / 2, 290, { align: 'center' }
    );
  }

  doc.save(`OC_${oc.id}_${(oc.proveedorNombre ?? 'proveedor').replace(/\s+/g, '_')}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTARIO: stock actual → Excel y PDF
// ═══════════════════════════════════════════════════════════════════════════════

export function exportarStockExcel(
  productos: ProductoDTO[],
  nombreUnidad: (id: number) => string,
): void {
  const wb = XLSX.utils.book_new();
  const fecha = new Date().toLocaleDateString('es-PE');

  const rows: (string | number)[][] = [
    [`Stock Actual — ${fecha}`],
    [],
    ['Código', 'Producto', 'Categoría', 'Unidad', 'Stock Actual', 'Stock Mín.', 'Estado', 'Costo Unit. (S/)', 'Precio Venta (S/)', 'Valorizado (S/)'],
    ...productos.map((p) => [
      p.codigoBarras ?? '',
      p.nombre,
      p.categoria ?? '',
      nombreUnidad(p.unidadMedidaId),
      p.stockActual ?? 0,
      p.stockMinimo ?? 0,
      (p.stockActual ?? 0) <= (p.stockMinimo ?? 0) ? 'BAJO STOCK' : 'OK',
      p.costoUnitario ?? 0,
      p.precioVenta ?? 0,
      (p.stockActual ?? 0) * (p.costoUnitario ?? 0),
    ]),
    [],
    ['', 'TOTAL VALORIZADO', '', '', '', '', '', '', '', productos.reduce((acc, p) => acc + (p.stockActual ?? 0) * (p.costoUnitario ?? 0), 0)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 }, { wch: 30 }, { wch: 18 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Stock Actual');
  XLSX.writeFile(wb, `stock_actual_${fecha.replace(/\//g, '-')}.xlsx`);
}

export function exportarStockPDF(
  productos: ProductoDTO[],
  nombreUnidad: (id: number) => string,
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  let y = 15;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Fluxus — Stock Actual de Inventario', 14, y);
  y += 6;

  const valorTotal = productos.reduce((acc, p) => acc + (p.stockActual ?? 0) * (p.costoUnitario ?? 0), 0);
  const bajoStockCount = productos.filter((p) => (p.stockActual ?? 0) <= (p.stockMinimo ?? 0)).length;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Fecha: ${fecha}   ·   ${productos.length} productos   ·   ${bajoStockCount} bajo stock   ·   Valorizado: ${sol(valorTotal)}`,
    14, y
  );
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [['Código', 'Producto', 'Categoría', 'UM', 'Stock', 'Mín.', 'Estado', 'Costo', 'Precio Venta', 'Valorizado']],
    body: productos.map((p) => [
      p.codigoBarras ?? '—',
      p.nombre,
      p.categoria ?? '—',
      nombreUnidad(p.unidadMedidaId),
      String(p.stockActual ?? 0),
      String(p.stockMinimo ?? 0),
      (p.stockActual ?? 0) <= (p.stockMinimo ?? 0) ? 'BAJO STOCK' : 'OK',
      sol(p.costoUnitario),
      sol(p.precioVenta),
      sol((p.stockActual ?? 0) * (p.costoUnitario ?? 0)),
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 255] },
    margin: { left: 14, right: 14 },
    columnStyles: {
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center', fontStyle: 'bold' },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 6 && data.cell.raw === 'BAJO STOCK') {
        data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Fluxus · Stock Actual · ${fecha} · Pág. ${i} de ${totalPages}`,
      pageW / 2, 200, { align: 'center' }
    );
  }

  doc.save(`stock_actual_${new Date().toISOString().split('T')[0]}.pdf`);
}
