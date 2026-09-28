import React from 'react';
import toast from 'react-hot-toast';

export interface NotifyOpts {
  /** Texto secundario con instrucciones o contexto */
  detail?: string;
  /** Botón de acción en el toast (ej: "Ir a Proveedores") */
  action?: { label: string; fn: () => void };
  /** Duración en ms (por defecto: 5000 error/warn, 3000 success, 4000 info) */
  duration?: number;
}

/** Extrae el mensaje legible que envía el backend en el body del error */
function backendMsg(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  const resp = (err as Record<string, unknown>).response as Record<string, unknown> | undefined;
  if (!resp) return '';
  const data = resp.data as Record<string, unknown> | undefined;
  if (!data) return '';
  for (const key of ['mensaje', 'message', 'error', 'detail']) {
    const v = data[key];
    if (typeof v === 'string' && v && v !== 'Bad Request' && v !== 'Internal Server Error') return v;
  }
  return '';
}

function ToastContent({ msg, opts }: { msg: string; opts?: NotifyOpts }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontWeight: 600, lineHeight: 1.35 }}>{msg}</span>
      {opts?.detail && (
        <span style={{ fontSize: '.8rem', opacity: .78, lineHeight: 1.45, fontWeight: 400 }}>
          {opts.detail}
        </span>
      )}
      {opts?.action && (
        <span
          role="button"
          tabIndex={0}
          onClick={opts.action.fn}
          onKeyDown={e => e.key === 'Enter' && opts.action?.fn()}
          style={{ fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', marginTop: 2 }}
        >
          {opts.action.label} →
        </span>
      )}
    </span>
  );
}

function render(msg: string, opts?: NotifyOpts): React.ReactNode {
  if (!opts?.detail && !opts?.action) return msg;
  return <ToastContent msg={msg} opts={opts} />;
}

export const notify = {
  error(msg: string, opts?: NotifyOpts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toast.error(render(msg, opts) as any, { duration: opts?.duration ?? 5000 });
  },

  success(msg: string, opts?: NotifyOpts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toast.success(render(msg, opts) as any, { duration: opts?.duration ?? 3000 });
  },

  warn(msg: string, opts?: NotifyOpts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toast(render(msg, opts) as any, { icon: '⚠️', duration: opts?.duration ?? 5000 });
  },

  info(msg: string, opts?: NotifyOpts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toast(render(msg, opts) as any, { icon: 'ℹ️', duration: opts?.duration ?? 4000 });
  },

  /**
   * Muestra el mensaje real del backend si existe; si no, usa el fallback.
   * Úsalo en bloques catch para que el cliente vea el error específico.
   *
   * @example
   * } catch (err) { notify.fromError(err, 'No se pudo guardar el gasto'); }
   */
  fromError(err: unknown, fallback: string, opts?: NotifyOpts) {
    const msg = backendMsg(err) || fallback;
    notify.error(msg, opts);
  },
};
