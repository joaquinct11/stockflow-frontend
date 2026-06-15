import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection, LegalInfoBox, LegalPageTitle } from './LegalLayout';

const RAZON_SOCIAL   = 'Joaquin Castillo Tello';
const RUC            = '10769109566';
const DIRECCION      = 'Jr. Libertad 455, Magdalena del Mar, Lima';
const DEPARTAMENTO   = 'Lima, Magdalena del Mar';
const CORREO         = 'contacto@fluxus.pe';
const FECHA_VIGENCIA = '21 de mayo de 2026';

const p: React.CSSProperties = { marginBottom: '12px' };
const strong: React.CSSProperties = { color: '#c8c8e0', fontWeight: 600 };

export function TerminosPage() {
  return (
    <LegalLayout>

      <LegalPageTitle
        icon="📋"
        title="Términos y Condiciones"
        subtitle="Condiciones de uso de la plataforma Fluxus. Al usar el servicio aceptas estos términos."
        badge={`Vigentes desde ${FECHA_VIGENCIA}`}
      />

      <LegalInfoBox>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          <span><span style={strong}>Titular:</span> {RAZON_SOCIAL}</span>
          <span><span style={strong}>RUC:</span> {RUC}</span>
          <span><span style={strong}>Domicilio:</span> {DIRECCION}</span>
          <span><span style={strong}>Contacto:</span> {CORREO}</span>
        </div>
      </LegalInfoBox>

      <LegalSection num={1} title="Aceptación de los términos">
        <p style={p}>
          Al acceder y utilizar la plataforma Fluxus (el «Servicio»), disponible en{' '}
          <a href="https://fluxus.pe" style={{ color: '#6c63ff' }}>fluxus.pe</a>,
          el usuario («Cliente») acepta íntegramente los presentes Términos y Condiciones.
          Si no estás de acuerdo con alguno de estos términos, debes abstenerte de usar el Servicio.
        </p>
        <p style={p}>
          El Servicio es operado por <span style={strong}>{RAZON_SOCIAL}</span>, persona natural con
          RUC {RUC}, con nombre comercial «Fluxus». El uso del Servicio implica la aceptación de
          estos términos y de la{' '}
          <Link to="/privacidad" style={{ color: '#6c63ff' }}>Política de Privacidad</Link>.
        </p>
      </LegalSection>

      <LegalSection num={2} title="Descripción del servicio">
        <p style={p}>
          Fluxus es una plataforma SaaS (Software como Servicio) de gestión empresarial (mini-ERP)
          diseñada para pequeños y medianos negocios en el Perú. Incluye módulos de Punto de Venta
          (POS), control de inventario, órdenes de compra, recepciones, devoluciones, notas de
          crédito, facturación electrónica, gestión de usuarios, reportes y más.
        </p>
        <p style={p}>
          El módulo de facturación electrónica permite emitir boletas y facturas electrónicas
          enviándolas a SUNAT a través del Operador de Servicios Electrónicos (OSE) contratado
          por el propio Cliente (por ejemplo: Nubefact, Alegra, Efact u otro OSE autorizado por
          SUNAT). Fluxus actúa como interfaz de gestión; el Cliente es responsable de mantener
          vigente su contrato con el proveedor OSE elegido.
        </p>
        <p style={p}>
          El Servicio se presta exclusivamente a personas naturales o jurídicas con actividad
          comercial en el territorio peruano o que emitan comprobantes de pago electrónicos
          ante la SUNAT.
        </p>
      </LegalSection>

      <LegalSection num={3} title="Registro y cuenta de usuario">
        <p style={p}>
          Para acceder al Servicio, el Cliente debe crear una cuenta proporcionando información
          veraz, completa y actualizada. El Cliente es responsable de mantener la confidencialidad
          de sus credenciales de acceso.
        </p>
        <p style={p}>
          Cada cuenta corresponde a un único negocio («tenant»). No está permitido compartir
          credenciales entre distintos negocios o ceder la cuenta a terceros.
        </p>
        <p style={p}>
          {RAZON_SOCIAL} se reserva el derecho de suspender o eliminar cuentas que incumplan
          estos términos o que sean utilizadas con fines fraudulentos.
        </p>
      </LegalSection>

      <LegalSection num={4} title="Prueba gratuita">
        <p style={p}>
          Al registrarse, el Cliente obtiene un período de prueba gratuita de{' '}
          <span style={strong}>14 días calendario</span> con acceso completo a todos los módulos
          del Plan Básico.
        </p>
        <p style={p}>
          No se requiere tarjeta de crédito o débito para iniciar la prueba gratuita. Al finalizar
          el período de prueba, el acceso queda restringido hasta que el Cliente contrate una
          suscripción de pago.
        </p>
      </LegalSection>

      <LegalSection num={5} title="Precios y facturación">
        <p style={p}>
          El Plan Básico tiene un precio de <span style={strong}>S/ 89.00 (IGV incluido)</span> por
          mes calendario. Los precios se expresan en Soles peruanos (PEN) e incluyen el Impuesto
          General a las Ventas (IGV 18%).
        </p>
        <p style={p}>
          El cobro es <span style={strong}>recurrente mensual</span>. Una vez activada la
          suscripción, la tarjeta registrada será cargada automáticamente cada 30 días.
        </p>
        <p style={p}>
          {RAZON_SOCIAL} emitirá el comprobante de pago correspondiente (boleta o factura
          electrónica) al correo registrado dentro de los 3 días hábiles siguientes al cobro.
        </p>
        <p style={p}>
          Los precios pueden modificarse con previo aviso de al menos 30 días al correo registrado.
        </p>
      </LegalSection>

      <LegalSection num={6} title="Cancelación y política de reembolso">
        <p style={p}>
          El Cliente puede cancelar su suscripción en cualquier momento desde el panel de
          gestión (Suscripciones › Cancelar). La cancelación surte efecto al término del
          período mensual vigente; el acceso se mantiene hasta esa fecha.
        </p>
        <p style={p}>
          <span style={strong}>Política de reembolso:</span> Dado que Fluxus es un servicio
          digital de acceso inmediato, no se realizan devoluciones de pagos ya procesados, salvo
          en casos de error técnico imputable a {RAZON_SOCIAL}, debidamente verificado. En ese
          caso, el Cliente deberá presentar su solicitud dentro de los 7 días calendario
          siguientes al cargo a{' '}
          <a href={`mailto:${CORREO}`} style={{ color: '#6c63ff' }}>{CORREO}</a>.
        </p>
        <p style={p}>
          {RAZON_SOCIAL} se reserva el derecho de cancelar la suscripción en caso de
          incumplimiento de estos Términos, sin derecho a reembolso proporcional.
        </p>
      </LegalSection>

      <LegalSection num={7} title="Propiedad intelectual">
        <p style={p}>
          El software, diseño, código fuente, marcas, logotipos y contenido de Fluxus son
          propiedad exclusiva de {RAZON_SOCIAL} y están protegidos por las leyes de propiedad
          intelectual vigentes en el Perú. El Cliente obtiene una licencia de uso limitada,
          no exclusiva e intransferible para acceder al Servicio.
        </p>
        <p style={p}>
          Los datos ingresados por el Cliente (productos, ventas, clientes, etc.) son de su
          propiedad exclusiva. {RAZON_SOCIAL} no reivindica propiedad alguna sobre dichos datos.
        </p>
      </LegalSection>

      <LegalSection num={8} title="Disponibilidad del servicio">
        <p style={p}>
          {RAZON_SOCIAL} realizará sus mejores esfuerzos para mantener el Servicio disponible
          las 24 horas del día, los 7 días de la semana. Sin embargo, no garantiza una
          disponibilidad del 100%. Pueden producirse interrupciones por mantenimiento
          programado (notificado con al menos 12 horas de anticipación), fallas de terceros
          o eventos de fuerza mayor.
        </p>
        <p style={p}>
          En caso de interrupciones mayores a 48 horas consecutivas imputables a {RAZON_SOCIAL},
          el Cliente podrá solicitar un crédito proporcional sobre el mes afectado.
        </p>
      </LegalSection>

      <LegalSection num={9} title="Limitación de responsabilidad">
        <p style={p}>
          En ningún caso {RAZON_SOCIAL} será responsable por daños indirectos, incidentales,
          especiales o consecuentes derivados del uso o la imposibilidad de uso del Servicio.
          La responsabilidad máxima de {RAZON_SOCIAL} frente al Cliente estará limitada al
          monto de la suscripción pagada durante los 3 meses previos al evento que originó
          el daño.
        </p>
        <p style={p}>
          El Cliente es el único responsable de la exactitud de los datos ingresados, la
          correcta emisión de comprobantes de pago electrónicos ante la SUNAT, la vigencia
          de su contrato con su proveedor OSE y el cumplimiento de sus obligaciones tributarias.
          {RAZON_SOCIAL} no se responsabiliza por rechazos, errores o interrupciones del
          servicio OSE contratado por el Cliente.
        </p>
      </LegalSection>

      <LegalSection num={10} title="Protección de datos personales">
        <p style={p}>
          El tratamiento de datos personales se rige por nuestra{' '}
          <Link to="/privacidad" style={{ color: '#6c63ff' }}>Política de Privacidad</Link>{' '}
          y la Ley N° 29733 — Ley de Protección de Datos Personales del Perú.
        </p>
      </LegalSection>

      <LegalSection num={11} title="Modificaciones a los términos">
        <p style={p}>
          {RAZON_SOCIAL} puede modificar estos Términos en cualquier momento. Las modificaciones
          serán notificadas al correo registrado con al menos 15 días de anticipación. El uso
          continuado del Servicio después de la entrada en vigencia implica su aceptación.
        </p>
      </LegalSection>

      <LegalSection num={12} title="Ley aplicable y resolución de conflictos">
        <p style={p}>
          Estos Términos se rigen por las leyes de la República del Perú. Cualquier controversia
          será sometida a los juzgados y tribunales competentes de {DEPARTAMENTO}, renunciando
          las partes a cualquier otro fuero.
        </p>
        <p style={p}>
          Sin perjuicio de lo anterior, el Cliente puede acudir al{' '}
          <Link to="/reclamaciones" style={{ color: '#6c63ff' }}>Libro de Reclamaciones Virtual</Link>{' '}
          de Fluxus o al INDECOPI para la resolución de conflictos de consumo.
        </p>
      </LegalSection>

      <LegalSection num={13} title="Contacto">
        <p style={p}>
          Para consultas sobre estos Términos escríbenos a:{' '}
          <a href={`mailto:${CORREO}`} style={{ color: '#6c63ff' }}>{CORREO}</a>
        </p>
      </LegalSection>

    </LegalLayout>
  );
}
