import { useState, useRef } from 'react';
import { CheckCircle2, BookOpen, AlertCircle, Paperclip, X } from 'lucide-react';
import { axiosInstance } from '../../api/axios.config';
import { LegalLayout, LegalInfoBox, LegalPageTitle } from './LegalLayout';

const RAZON_SOCIAL    = 'Joaquin Castillo Tello (Fluxus)';
const RUC             = '10769109566';
const DIRECCION       = 'Jr. Libertad 455, Magdalena del Mar, Lima';
const CORREO_CONTACTO = 'contacto@fluxus.pe';

type TipoReclamo = 'RECLAMO' | 'QUEJA' | '';

interface FormState {
  nombre: string; apellido: string; dni: string;
  correo: string; telefono: string;
  tipo: TipoReclamo; descripcion: string;
  pedido: string; monto: string;
}

const INITIAL: FormState = {
  nombre: '', apellido: '', dni: '', correo: '', telefono: '',
  tipo: '', descripcion: '', pedido: '', monto: '',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '14px',
  color: '#e8e8f0',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: '#9898b0',
  marginBottom: '6px',
};

const strong: React.CSSProperties = { color: '#c8c8e0', fontWeight: 600 };

export function ReclamacionesPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleArchivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevos = Array.from(e.target.files ?? []);
    setArchivos((prev) => {
      const combined = [...prev, ...nuevos];
      // max 3 archivos, max 5MB cada uno
      return combined
        .filter((f) => f.size <= 5 * 1024 * 1024)
        .slice(0, 3);
    });
    e.target.value = '';
  };

  const removeArchivo = (idx: number) =>
    setArchivos((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('tipo',        form.tipo);
      body.append('nombre',      form.nombre);
      body.append('apellido',    form.apellido);
      body.append('dni',         form.dni);
      body.append('correo',      form.correo);
      if (form.telefono)    body.append('telefono',    form.telefono);
      if (form.pedido)      body.append('pedido',      form.pedido);
      if (form.monto)       body.append('monto',       form.monto);
      body.append('descripcion', form.descripcion);
      archivos.forEach((f) => body.append('archivos', f));

      await axiosInstance.post('/auth/reclamaciones', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(true);
    } catch {
      setError(`No se pudo enviar la reclamación. Por favor escríbenos directamente a ${CORREO_CONTACTO}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LegalLayout>

      <LegalPageTitle
        icon="📖"
        title="Libro de Reclamaciones Virtual"
        subtitle="Ley N° 29571 — Código de Protección y Defensa del Consumidor"
      />

      <LegalInfoBox>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          <span><span style={strong}>Proveedor:</span> {RAZON_SOCIAL}</span>
          <span><span style={strong}>RUC:</span> {RUC}</span>
          <span><span style={strong}>Domicilio:</span> {DIRECCION}</span>
          <span><span style={strong}>Correo:</span> {CORREO_CONTACTO}</span>
        </div>
      </LegalInfoBox>

      {/* Diferencia reclamo / queja */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
        <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <BookOpen size={14} style={{ color: '#fb923c' }} />
            <span style={{ fontWeight: 600, fontSize: '13px', color: '#fb923c' }}>Reclamo</span>
          </div>
          <p style={{ fontSize: '12px', color: '#9898b0', lineHeight: '1.5' }}>
            Disconformidad con el servicio recibido o un cobro incorrecto.
          </p>
        </div>
        <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <BookOpen size={14} style={{ color: '#facc15' }} />
            <span style={{ fontWeight: 600, fontSize: '13px', color: '#facc15' }}>Queja</span>
          </div>
          <p style={{ fontSize: '12px', color: '#9898b0', lineHeight: '1.5' }}>
            Malestar con la atención recibida, sin implicar una transacción.
          </p>
        </div>
      </div>

      {submitted ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ padding: '20px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle2 size={40} style={{ color: '#10b981' }} />
            </div>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e8e8f0', marginBottom: '8px' }}>
            Reclamación enviada
          </h2>
          <p style={{ fontSize: '14px', color: '#9898b0', maxWidth: '380px', margin: '0 auto 24px', lineHeight: '1.6' }}>
            Hemos recibido tu {form.tipo.toLowerCase()}. Te responderemos en un plazo máximo
            de <span style={strong}>15 días hábiles</span> al correo:{' '}
            <span style={strong}>{form.correo}</span>.
          </p>
          <button
            onClick={() => { setForm(INITIAL); setSubmitted(false); }}
            style={{ fontSize: '13px', color: '#6c63ff', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Enviar otra reclamación
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '13px', color: '#fca5a5', lineHeight: '1.5' }}>{error}</p>
            </div>
          )}

          {/* Tipo */}
          <div>
            <label style={labelStyle}>Tipo de reclamación <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['RECLAMO', 'QUEJA'] as TipoReclamo[]).map((t) => (
                <label key={t} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '12px', borderRadius: '8px', cursor: 'pointer',
                  border: form.tipo === t ? '1px solid #6c63ff' : '1px solid rgba(255,255,255,0.1)',
                  background: form.tipo === t ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.03)',
                  color: form.tipo === t ? '#8b85ff' : '#9898b0',
                  fontSize: '13px', fontWeight: 500, transition: 'all 0.2s',
                }}>
                  <input type="radio" name="tipo" value={t} required className="sr-only" onChange={() => set('tipo', t)} />
                  {t === 'RECLAMO' ? '⚠️' : '💬'} {t}
                </label>
              ))}
            </div>
          </div>

          {/* Nombre + Apellido */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Nombre <span style={{ color: '#ef4444' }}>*</span></label>
              <input required value={form.nombre} onChange={(e) => set('nombre', e.target.value)}
                style={inputStyle} placeholder="Juan"
                onFocus={e => (e.currentTarget.style.borderColor = '#6c63ff')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
            </div>
            <div>
              <label style={labelStyle}>Apellido <span style={{ color: '#ef4444' }}>*</span></label>
              <input required value={form.apellido} onChange={(e) => set('apellido', e.target.value)}
                style={inputStyle} placeholder="Pérez"
                onFocus={e => (e.currentTarget.style.borderColor = '#6c63ff')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
            </div>
          </div>

          {/* DNI + Teléfono */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>DNI <span style={{ color: '#ef4444' }}>*</span></label>
              <input required value={form.dni} onChange={(e) => set('dni', e.target.value)}
                maxLength={8} pattern="\d{8}" style={inputStyle} placeholder="12345678"
                onFocus={e => (e.currentTarget.style.borderColor = '#6c63ff')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
            </div>
            <div>
              <label style={labelStyle}>Teléfono <span style={{ fontSize: '11px', opacity: 0.6 }}>(opcional)</span></label>
              <input value={form.telefono} onChange={(e) => set('telefono', e.target.value)}
                style={inputStyle} placeholder="999 888 777"
                onFocus={e => (e.currentTarget.style.borderColor = '#6c63ff')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
            </div>
          </div>

          {/* Correo */}
          <div>
            <label style={labelStyle}>Correo electrónico <span style={{ color: '#ef4444' }}>*</span></label>
            <input required type="email" value={form.correo} onChange={(e) => set('correo', e.target.value)}
              style={inputStyle} placeholder="tu@correo.com"
              onFocus={e => (e.currentTarget.style.borderColor = '#6c63ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
          </div>

          {/* Pedido + Monto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>N° de suscripción <span style={{ fontSize: '11px', opacity: 0.6 }}>(opcional)</span></label>
              <input value={form.pedido} onChange={(e) => set('pedido', e.target.value)}
                style={inputStyle} placeholder="SUB-00123"
                onFocus={e => (e.currentTarget.style.borderColor = '#6c63ff')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
            </div>
            <div>
              <label style={labelStyle}>Monto involucrado S/ <span style={{ fontSize: '11px', opacity: 0.6 }}>(opcional)</span></label>
              <input type="number" min="0" step="0.01" value={form.monto} onChange={(e) => set('monto', e.target.value)}
                style={inputStyle} placeholder="150.00"
                onFocus={e => (e.currentTarget.style.borderColor = '#6c63ff')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label style={labelStyle}>Descripción detallada <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea required value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)}
              rows={5} minLength={30}
              style={{ ...inputStyle, resize: 'none' }}
              placeholder="Describe con detalle lo sucedido, cuándo ocurrió y qué solución esperas..."
              onFocus={e => (e.currentTarget.style.borderColor = '#6c63ff')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
          </div>

          {/* Adjuntar archivos */}
          <div>
            <label style={labelStyle}>
              Adjuntar archivos{' '}
              <span style={{ fontSize: '11px', opacity: 0.6 }}>(opcional · máx. 3 archivos · 5 MB c/u)</span>
            </label>

            {/* Zona de drop / botón */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '1px dashed rgba(108,99,255,0.35)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: archivos.length >= 3 ? 'not-allowed' : 'pointer',
                opacity: archivos.length >= 3 ? 0.5 : 1,
                background: 'rgba(108,99,255,0.04)',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => { if (archivos.length < 3) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(108,99,255,0.7)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(108,99,255,0.35)'; }}
            >
              <Paperclip size={16} style={{ color: '#6c63ff', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#9898b0' }}>
                {archivos.length >= 3
                  ? 'Máximo 3 archivos alcanzado'
                  : 'Haz clic para adjuntar imagen o PDF'}
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              style={{ display: 'none' }}
              onChange={handleArchivos}
              disabled={archivos.length >= 3}
            />

            {/* Lista de archivos adjuntos */}
            {archivos.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {archivos.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: '6px',
                    background: 'rgba(108,99,255,0.08)',
                    border: '1px solid rgba(108,99,255,0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <Paperclip size={12} style={{ color: '#8b85ff', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: '#c8c8e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#5a5a72', flexShrink: 0 }}>
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeArchivo(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#5a5a72', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#5a5a72')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '10px',
              background: loading ? 'rgba(108,99,255,0.4)' : 'linear-gradient(135deg, #6c63ff, #4a43cc)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Enviando...' : 'Enviar reclamación'}
          </button>

          <p style={{ fontSize: '12px', color: '#5a5a72', textAlign: 'center' }}>
            Tu reclamación será atendida en un plazo máximo de{' '}
            <span style={{ color: '#9898b0', fontWeight: 600 }}>15 días hábiles</span>{' '}
            según la Ley N° 29571.
          </p>
        </form>
      )}

    </LegalLayout>
  );
}
