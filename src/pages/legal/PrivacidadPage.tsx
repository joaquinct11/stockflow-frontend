import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection, LegalInfoBox, LegalPageTitle } from './LegalLayout';

const RAZON_SOCIAL   = 'Joaquin Castillo Tello';
const RUC            = '10769109566';
const DIRECCION      = 'Jr. Libertad 455, Magdalena del Mar, Lima';
const CORREO         = 'contacto@fluxus.pe';
const FECHA_VIGENCIA = '21 de mayo de 2026';

const p: React.CSSProperties     = { marginBottom: '12px' };
const ul: React.CSSProperties    = { paddingLeft: '20px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' };
const strong: React.CSSProperties = { color: '#c8c8e0', fontWeight: 600 };

export function PrivacidadPage() {
  return (
    <LegalLayout>

      <LegalPageTitle
        icon="🔒"
        title="Política de Privacidad"
        subtitle="Cómo recopilamos, usamos y protegemos tus datos personales."
        badge={`Vigente desde ${FECHA_VIGENCIA} · Ley N° 29733`}
      />

      <LegalInfoBox>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          <span><span style={strong}>Responsable:</span> {RAZON_SOCIAL} (Fluxus)</span>
          <span><span style={strong}>RUC:</span> {RUC}</span>
          <span><span style={strong}>Domicilio:</span> {DIRECCION}</span>
          <span><span style={strong}>Contacto:</span> {CORREO}</span>
        </div>
      </LegalInfoBox>

      <LegalSection num={1} title="¿Qué datos recopilamos?">
        <p style={p}>Al registrarte y usar Fluxus, recopilamos los siguientes datos personales:</p>
        <ul style={ul}>
          <li><span style={strong}>Identificación:</span> nombre, apellido, tipo y número de documento (DNI, RUC, CE, Pasaporte).</li>
          <li><span style={strong}>Contacto:</span> correo electrónico y número de celular (opcional).</li>
          <li><span style={strong}>Negocio:</span> nombre comercial o razón social de tu empresa.</li>
          <li><span style={strong}>Pago:</span> procesados directamente por Culqi. Fluxus <span style={strong}>no almacena</span> datos de tarjeta (número, CVV, vencimiento).</li>
          <li><span style={strong}>Uso:</span> logs de acceso, dirección IP, tipo de navegador, páginas visitadas dentro del sistema.</li>
          <li><span style={strong}>Datos operativos:</span> información que el Cliente ingresa en el sistema (productos, clientes, ventas, etc.), que pertenecen exclusivamente al Cliente.</li>
        </ul>
      </LegalSection>

      <LegalSection num={2} title="¿Para qué usamos tus datos?">
        <p style={p}>Usamos tus datos personales exclusivamente para:</p>
        <ul style={ul}>
          <li>Crear y gestionar tu cuenta de usuario.</li>
          <li>Prestarte el servicio contratado (acceso a la plataforma Fluxus).</li>
          <li>Procesar los pagos de tu suscripción a través de Culqi.</li>
          <li>Emitir comprobantes de pago electrónicos (boleta o factura).</li>
          <li>Enviarte notificaciones de suscripción (cobros, vencimientos, alertas del sistema).</li>
          <li>Brindarte soporte técnico.</li>
          <li>Mejorar el servicio mediante análisis de uso agregado y anónimo.</li>
          <li>Cumplir con obligaciones legales y tributarias peruanas.</li>
        </ul>
        <p style={p}>
          <span style={strong}>No usamos</span> tus datos para publicidad de terceros ni los
          vendemos o cedemos a terceros, salvo los subencargados indicados en la sección 5.
        </p>
      </LegalSection>

      <LegalSection num={3} title="Base legal del tratamiento">
        <p style={p}>El tratamiento de tus datos se basa en:</p>
        <ul style={ul}>
          <li>
            <span style={strong}>Ejecución contractual:</span> para prestarte el Servicio según los{' '}
            <Link to="/terminos" style={{ color: '#6c63ff' }}>Términos y Condiciones</Link>.
          </li>
          <li><span style={strong}>Consentimiento:</span> para el envío de comunicaciones sobre tu suscripción.</li>
          <li><span style={strong}>Interés legítimo:</span> para la seguridad de la plataforma y la prevención de fraudes.</li>
          <li><span style={strong}>Cumplimiento legal:</span> para el cumplimiento de obligaciones tributarias ante la SUNAT.</li>
        </ul>
      </LegalSection>

      <LegalSection num={4} title="¿Por cuánto tiempo conservamos tus datos?">
        <p style={p}>
          Conservamos tus datos personales mientras mantengas una cuenta activa en Fluxus.
          Al eliminar tu cuenta, los datos personales son eliminados en un plazo máximo de
          90 días, salvo aquellos que debamos conservar por obligación legal (ej.: comprobantes
          de pago electrónicos, que deben conservarse por 5 años según la normativa SUNAT).
        </p>
        <p style={p}>
          Los datos operativos de tu negocio (productos, ventas, etc.) son eliminados
          conjuntamente con tu cuenta.
        </p>
      </LegalSection>

      <LegalSection num={5} title="¿Con quiénes compartimos tus datos?">
        <p style={p}>Solo compartimos datos imprescindibles con los siguientes subencargados:</p>
        <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#c8c8e0', fontWeight: 600 }}>Proveedor</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#c8c8e0', fontWeight: 600 }}>Finalidad</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#c8c8e0', fontWeight: 600 }}>País</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Culqi',                   'Procesamiento de pagos',             'Perú'],
                ['Resend',                  'Envío de correos transaccionales',   'EE.UU.'],
                ['Proveedor de nube',       'Almacenamiento de datos',            'EE.UU.'],
              ].map(([prov, fin, pais], i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 12px', color: '#c8c8e0' }}>{prov}</td>
                  <td style={{ padding: '10px 12px' }}>{fin}</td>
                  <td style={{ padding: '10px 12px' }}>{pais}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={p}>
          Todos los subencargados han firmado acuerdos de confidencialidad y cuentan con
          medidas de seguridad adecuadas. Las transferencias internacionales se realizan
          conforme a la Ley N° 29733 y su Reglamento.
        </p>
      </LegalSection>

      <LegalSection num={6} title="Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)">
        <p style={p}>De acuerdo con la Ley N° 29733, tienes los siguientes derechos:</p>
        <ul style={ul}>
          <li><span style={strong}>Acceso:</span> conocer qué datos personales tuyos tratamos.</li>
          <li><span style={strong}>Rectificación:</span> corregir datos inexactos o incompletos.</li>
          <li><span style={strong}>Cancelación (supresión):</span> solicitar la eliminación de tus datos cuando ya no sean necesarios.</li>
          <li><span style={strong}>Oposición:</span> oponerte al tratamiento de tus datos para determinadas finalidades.</li>
        </ul>
        <p style={p}>
          Para ejercer cualquiera de estos derechos, envíanos un correo a{' '}
          <a href={`mailto:${CORREO}`} style={{ color: '#6c63ff' }}>{CORREO}</a>{' '}
          indicando: (i) tu nombre completo, (ii) correo registrado en Fluxus, (iii) el
          derecho que deseas ejercer y (iv) documentación de identidad. Responderemos en
          un plazo máximo de <span style={strong}>20 días hábiles</span>.
        </p>
      </LegalSection>

      <LegalSection num={7} title="Seguridad de los datos">
        <p style={p}>Implementamos las siguientes medidas para proteger tus datos:</p>
        <ul style={ul}>
          <li>Cifrado de contraseñas con bcrypt (no almacenamos contraseñas en texto plano).</li>
          <li>Comunicaciones cifradas mediante TLS/HTTPS.</li>
          <li>Autenticación mediante tokens JWT con expiración.</li>
          <li>Aislamiento de datos por empresa (arquitectura multi-tenant).</li>
          <li>Acceso restringido a datos personales por parte del personal de {RAZON_SOCIAL}.</li>
        </ul>
        <p style={p}>
          A pesar de estas medidas, ningún sistema es 100% seguro. En caso de brecha de
          seguridad que afecte tus datos, te notificaremos en un plazo máximo de 72 horas.
        </p>
      </LegalSection>

      <LegalSection num={8} title="Cookies y tecnologías similares">
        <p style={p}>Fluxus utiliza exclusivamente:</p>
        <ul style={ul}>
          <li><span style={strong}>Cookies de sesión:</span> necesarias para mantener tu sesión activa. Se eliminan al cerrar el navegador.</li>
          <li><span style={strong}>localStorage / sessionStorage:</span> para preferencias de interfaz (tema claro/oscuro, idioma).</li>
        </ul>
        <p style={p}>No utilizamos cookies de seguimiento, publicidad ni analítica de terceros.</p>
      </LegalSection>

      <LegalSection num={9} title="Modificaciones a esta política">
        <p style={p}>
          {RAZON_SOCIAL} puede actualizar esta Política de Privacidad. Los cambios sustanciales
          serán notificados al correo registrado con al menos 15 días de anticipación.
        </p>
      </LegalSection>

      <LegalSection num={10} title="Contacto y autoridad de control">
        <p style={p}>
          Para consultas sobre privacidad, escríbenos a:{' '}
          <a href={`mailto:${CORREO}`} style={{ color: '#6c63ff' }}>{CORREO}</a>
        </p>
        <p style={p}>
          Si consideras que hemos vulnerado tus derechos, puedes presentar una reclamación ante
          la <span style={strong}>Autoridad Nacional de Protección de Datos Personales</span>{' '}
          del Ministerio de Justicia y Derechos Humanos del Perú.
        </p>
      </LegalSection>

    </LegalLayout>
  );
}
