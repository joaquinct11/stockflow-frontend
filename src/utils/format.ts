const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const pad = (n: number) => String(n).padStart(2, '0');

export function formatMoney(n: number): string {
  const [ent, dec] = Math.abs(n).toFixed(2).split('.');
  return (n < 0 ? '-' : '') + ent.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + dec;
}

export const soles = (n: number) => 'S/ ' + formatMoney(n);

export const formatFecha = (d: Date | string): string => {
  const x = new Date(d);
  return `${x.getDate()} ${MESES[x.getMonth()]}`;
};

export const formatHora = (d: Date | string): string => {
  const x = new Date(d);
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`;
};

export const formatFechaHora = (d: Date | string): string =>
  `${formatFecha(d)} · ${formatHora(d)}`;

export function formatRango(a: Date | string, b: Date | string): string {
  const xa = new Date(a);
  const xb = new Date(b);
  const fa = `${xa.getDate()} ${MESES[xa.getMonth()]}`;
  const fb = `${xb.getDate()} ${MESES[xb.getMonth()]}`;
  if (fa === fb) return `${fa}, ${formatHora(xa)} – ${formatHora(xb)}`;
  return `${fa} – ${fb}`;
}

export const iniciales = (nombre: string): string => {
  const parts = nombre.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
};
