import type { EstadoCita, TipoCita } from '../../services/cita.service';

export interface TipoCfg {
  label:  string;
  color:  string;
  durMin: number;
}

export const TIPO_CFG: Record<TipoCita, TipoCfg> = {
  CONSULTA:        { label: 'Consulta',        color: '#6366f1', durMin: 30 },
  VACUNACION:      { label: 'Vacunación',       color: '#059669', durMin: 15 },
  DESPARASITACION: { label: 'Desparasitación',  color: '#d97706', durMin: 15 },
  CONTROL:         { label: 'Control',          color: '#0891b2', durMin: 20 },
  PELUQUERIA:      { label: 'Peluquería',       color: '#db2777', durMin: 60 },
  OTRO:            { label: 'Otro',             color: '#64748b', durMin: 30 },
};

export interface EstadoCfg {
  label: string;
  tone:  string;
  soft:  string;
  desc:  string;
}

export const ESTADO_CFG: Record<EstadoCita, EstadoCfg> = {
  PENDIENTE:   { label: 'Pendiente',   tone: '#6b7280', soft: '#f3f4f6', desc: 'Agendada, falta confirmar' },
  CONFIRMADA:  { label: 'Confirmada',  tone: '#3b47ef', soft: '#eef0ff', desc: 'El cliente confirmó su asistencia' },
  EN_ATENCION: { label: 'En atención', tone: '#d97706', soft: '#fef3c7', desc: 'El paciente está siendo atendido' },
  ATENDIDA:    { label: 'Atendida',    tone: '#059669', soft: '#d1fae5', desc: 'La atención terminó satisfactoriamente' },
  CANCELADA:   { label: 'Cancelada',   tone: '#dc2626', soft: '#fee2e2', desc: 'La cita no se realizará' },
  NO_ASISTIO:  { label: 'No asistió',  tone: '#c2410c', soft: '#ffedd5', desc: 'El cliente no se presentó' },
};

export const TRANSICIONES: Record<EstadoCita, EstadoCita[]> = {
  PENDIENTE:   ['CONFIRMADA', 'CANCELADA', 'NO_ASISTIO'],
  CONFIRMADA:  ['EN_ATENCION', 'CANCELADA', 'NO_ASISTIO'],
  EN_ATENCION: ['ATENDIDA', 'CANCELADA'],
  ATENDIDA:    [],
  CANCELADA:   ['PENDIENTE'],
  NO_ASISTIO:  ['PENDIENTE'],
};

export const ESPECIE_COLOR: Record<string, string> = {
  Perro:   '#7c3aed',
  Gato:    '#0891b2',
  Conejo:  '#db2777',
  Ave:     '#d97706',
  Reptil:  '#059669',
  Otro:    '#64748b',
};

export const HORA_INICIO = 8;
export const HORA_FIN    = 22;
export const PX_POR_HORA = 64;

export const HORAS_15 = Array.from(
  { length: Math.floor(((HORA_FIN - 1) * 60 + 45 - HORA_INICIO * 60) / 15) + 1 },
  (_, i) => {
    const mins = HORA_INICIO * 60 + i * 15;
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
);

export const DUR_CHIPS: { min: number; label: string }[] = [
  { min: 15, label: '15 min' },
  { min: 20, label: '20 min' },
  { min: 30, label: '30 min' },
  { min: 45, label: '45 min' },
  { min: 60, label: '1 h' },
  { min: 90, label: '1.5 h' },
];
