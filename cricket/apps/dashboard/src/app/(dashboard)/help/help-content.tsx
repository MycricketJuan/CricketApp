'use client'

import { useState } from 'react'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Section {
  id: string
  label: string
  role: string
  roleColor: string
  articles: Article[]
}

interface Article {
  id: string
  title: string
  content: React.ReactNode
}

// ── Estilos base ─────────────────────────────────────────────────────────────

const prose: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
  color: 'var(--color-text-primary)',
}

const h3: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  margin: '24px 0 8px',
}

const p: React.CSSProperties = {
  margin: '0 0 14px',
  color: 'var(--color-text-secondary)',
}

const ul: React.CSSProperties = {
  margin: '0 0 14px',
  paddingLeft: 20,
  color: 'var(--color-text-secondary)',
}

const li: React.CSSProperties = {
  marginBottom: 6,
}

const badge = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  background: color,
  color: '#fff',
  borderRadius: 4,
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 600,
  marginRight: 6,
  verticalAlign: 'middle',
})

const callout = (type: 'info' | 'warning' | 'danger'): React.CSSProperties => ({
  borderLeft: `3px solid ${type === 'info' ? '#7F77DD' : type === 'warning' ? '#BA7517' : '#D85A30'}`,
  background: type === 'info' ? '#F5F4FF' : type === 'warning' ? '#FFF8EC' : '#FFF1EE',
  borderRadius: '0 6px 6px 0',
  padding: '10px 14px',
  marginBottom: 14,
  fontSize: 13,
  color: type === 'info' ? '#5048BB' : type === 'warning' ? '#7A4E0D' : '#9B2F14',
})

const step = (n: number, text: string) => (
  <div key={n} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
    <span style={{
      minWidth: 24, height: 24, borderRadius: '50%',
      background: 'var(--color-text-primary)', color: 'var(--color-background-primary)',
      fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {n}
    </span>
    <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', paddingTop: 2 }}>{text}</span>
  </div>
)

// ── Contenido por sección ─────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  // ── SUPERADMIN ───────────────────────────────────────────────────────────
  {
    id: 'superadmin',
    label: 'Superadmin',
    role: 'Equipo Cricket',
    roleColor: '#5048BB',
    articles: [
      {
        id: 'sa-plataforma',
        title: 'Visión general de la plataforma',
        content: (
          <div style={prose}>
            <p style={p}>
              Cricket es una plataforma SaaS multi-tenant que implementa agentes IA para gestionar
              el customer journey completo. Cada cliente opera en su propio subdominio
              (<code>cliente.mycricket.ai</code>) y tiene su configuración aislada.
            </p>
            <h3 style={h3}>Principio IA + IH</h3>
            <p style={p}>
              Toda la plataforma está diseñada alrededor de un principio central: la IA actúa primero,
              pero un humano siempre puede supervisar e intervenir. Esto se materializa en:
            </p>
            <ul style={ul}>
              <li style={li}><strong>Cognitive checkpoints</strong>: momentos donde la IA pausa y espera aprobación humana antes de continuar.</li>
              <li style={li}><strong>Escaladas</strong>: transferencias completas del control IA → operador humano.</li>
              <li style={li}><strong>Trazabilidad total</strong>: cada acción tiene <code>actor_type</code> (AI / HUMAN / SYSTEM) registrado en <code>audit_log</code>.</li>
            </ul>
            <h3 style={h3}>Roles en la plataforma</h3>
            <ul style={ul}>
              <li style={li}><span style={badge('#5048BB')}>superadmin</span> Equipo Cricket. Acceso total a todos los tenants.</li>
              <li style={li}><span style={badge('#1D9E75')}>tenant_admin</span> Administrador del cliente. Configura módulos y usuarios de su tenant.</li>
              <li style={li}><span style={badge('#BA7517')}>supervisor</span> Ve métricas, cola de atención y puede intervenir en cualquier sesión.</li>
              <li style={li}><span style={badge('#7F77DD')}>operator</span> Atiende la cola asignada y resuelve cognitive checkpoints.</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'sa-onboarding',
        title: 'Cómo crear un nuevo tenant (wizard de onboarding)',
        content: (
          <div style={prose}>
            <p style={p}>
              El wizard de onboarding guía la creación de un tenant en 3 pasos. Accede desde
              <strong> Menú → Nuevo tenant</strong> o navegando a <code>/onboarding</code>.
            </p>
            <h3 style={h3}>Paso 1 — Organización</h3>
            {step(1, 'Ingresa el nombre completo de la organización (ej: "Banco Nacional").')}
            {step(2, 'El slug se genera automáticamente (ej: "banco-nacional"). Puedes editarlo manualmente. Solo letras minúsculas, números y guiones.')}
            {step(3, 'Selecciona el sector: banking, retail, health, telecom o government. El sector determina las políticas IH predeterminadas y los prompts de los agentes.')}
            {step(4, 'Haz clic en "Continuar". El sistema crea el tenant, los 4 módulos y el journey template estándar del sector.')}
            <h3 style={h3}>Paso 2 — Módulos</h3>
            <p style={p}>
              Aquí decides qué etapas del journey activas para este tenant y qué pasa cuando
              una etapa está inactiva (escalar a IH, redirigir a URL, u omitir).
            </p>
            <ul style={ul}>
              <li style={li}><strong>Consulta</strong> — Atención y FAQs. Activo por defecto.</li>
              <li style={li}><strong>Ventas</strong> — Upsell y captación. Activo por defecto.</li>
              <li style={li}><strong>Transacciones</strong> — Operaciones sensibles. Siempre escala a IH.</li>
              <li style={li}><strong>Feedback</strong> — NPS al cierre. Fallback: omitir.</li>
            </ul>
            <div style={callout('warning')}>
              Si desactivas Transacciones, las solicitudes de operaciones se desviarán al fallback
              configurado. El checkpoint IH sigue siendo obligatorio cuando el módulo está activo.
            </div>
            <h3 style={h3}>Paso 3 — Invitación</h3>
            {step(1, 'Ingresa el email del administrador del tenant.')}
            {step(2, 'Opcionalmente, escribe su nombre para personalizar el email de bienvenida.')}
            {step(3, 'Haz clic en "Enviar invitación". Se crea la invitación en la base de datos (expira en 7 días). Si RESEND_API_KEY está configurada, se envía el email automáticamente.')}
            {step(4, 'Si prefieres compartir el link manualmente, usa "Saltar por ahora" y copia el link desde la pantalla de éxito.')}
            <h3 style={h3}>Pantalla de éxito</h3>
            <p style={p}>
              Muestra la URL de acceso del tenant (<code>slug.mycricket.ai/login</code>) con un
              botón de copiar. Desde aquí puedes crear otro tenant o ir al panel de plataforma.
            </p>
          </div>
        ),
      },
      {
        id: 'sa-monitoreo',
        title: 'Panel de plataforma y monitoreo',
        content: (
          <div style={prose}>
            <p style={p}>
              El panel <code>/platform</code> muestra el estado global de todos los tenants en tiempo real.
            </p>
            <ul style={ul}>
              <li style={li}><strong>Tenants activos</strong>: número total de tenants con <code>is_active = true</code>.</li>
              <li style={li}><strong>Sesiones activas</strong>: conversaciones IA en curso en este momento.</li>
              <li style={li}><strong>Escaladas abiertas</strong>: sesiones transferidas a operador humano sin resolución aún.</li>
              <li style={li}><strong>Agentes disponibles</strong>: los 4 tipos de agente desplegados (consulta, ventas, transacciones, feedback).</li>
            </ul>
            <h3 style={h3}>Tabla de tenants</h3>
            <p style={p}>
              Lista todos los tenants con nombre, slug, sector, estado y fecha de creación.
              Ordena por fecha de creación descendente.
            </p>
            <div style={callout('info')}>
              Como superadmin, tienes acceso a todos los tenants porque las queries usan
              <code> service_role</code> (bypasa RLS). Nunca uses el cliente anónimo para
              administración de plataforma.
            </div>
          </div>
        ),
      },
    ],
  },

  // ── TENANT ADMIN ──────────────────────────────────────────────────────────
  {
    id: 'tenant-admin',
    label: 'Tenant Admin',
    role: 'Administrador del cliente',
    roleColor: '#1D9E75',
    articles: [
      {
        id: 'ta-intro',
        title: 'Tu rol como administrador',
        content: (
          <div style={prose}>
            <p style={p}>
              Como administrador de tu organización en Cricket, tienes control completo sobre la
              configuración del agente IA, los usuarios de tu equipo y el comportamiento del journey.
              No tienes acceso a otros tenants — tu vista está siempre limitada a tu organización.
            </p>
            <h3 style={h3}>Qué puedes hacer</h3>
            <ul style={ul}>
              <li style={li}>Ver el resumen de actividad de tu organización.</li>
              <li style={li}>Configurar los módulos activos y sus parámetros.</li>
              <li style={li}>Invitar y gestionar operadores y supervisores de tu equipo.</li>
              <li style={li}>Revisar el log de auditoría de todas las acciones.</li>
            </ul>
            <h3 style={h3}>Qué NO puedes hacer</h3>
            <ul style={ul}>
              <li style={li}>Crear o eliminar tenants (solo superadmin).</li>
              <li style={li}>Ver datos de otros tenants.</li>
              <li style={li}>Deshabilitar los cognitive checkpoints — son obligatorios por diseño.</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'ta-modulos',
        title: 'Configuración de módulos',
        content: (
          <div style={prose}>
            <p style={p}>
              Cada módulo representa una etapa del journey de tu cliente. Desde <strong>Admin → Módulos</strong>
              puedes activar/desactivar etapas y ajustar sus parámetros.
            </p>
            <h3 style={h3}>Módulo de Consulta</h3>
            <p style={p}>
              La IA responde preguntas frecuentes usando el knowledge base de tu organización.
              La confianza mínima por defecto es 0.65 — si la IA no supera ese umbral, escala
              automáticamente a un operador.
            </p>
            <h3 style={h3}>Módulo de Ventas</h3>
            <p style={p}>
              La IA identifica oportunidades de venta consultando el CRM y el catálogo de productos.
              Cuando el cliente expresa intención clara de compra, el agente registra el lead y
              puede proponer una acción de seguimiento.
            </p>
            <h3 style={h3}>Módulo de Transacciones</h3>
            <div style={callout('danger')}>
              Este módulo SIEMPRE requiere aprobación humana. La IA valida la identidad del cliente,
              estructura un preview de la operación y crea un cognitive checkpoint. Un operador
              debe aprobar antes de que se ejecute cualquier acción.
            </div>
            <p style={p}>
              Esto es un requisito de diseño de Cricket, no configurable. Aplica a transferencias,
              pagos y cambios de datos sensibles.
            </p>
            <h3 style={h3}>Módulo de Feedback</h3>
            <p style={p}>
              Al cerrar el journey, la IA recoge el NPS (0-10) y el CSAT (1-5) del cliente.
              Los datos se almacenan en <code>nps_responses</code> y se reflejan en el dashboard
              de analytics.
            </p>
          </div>
        ),
      },
      {
        id: 'ta-usuarios',
        title: 'Gestión de usuarios y roles',
        content: (
          <div style={prose}>
            <p style={p}>
              Puedes invitar a miembros de tu equipo desde <strong>Admin → Usuarios</strong>.
              Cada usuario recibe un email con un link de acceso que expira en 7 días.
            </p>
            <h3 style={h3}>Roles disponibles para tu equipo</h3>
            <ul style={ul}>
              <li style={li}>
                <span style={badge('#BA7517')}>supervisor</span>
                Ve todas las sesiones, métricas y puede intervenir manualmente en cualquier conversación.
              </li>
              <li style={li}>
                <span style={badge('#7F77DD')}>operator</span>
                Atiende la cola de escaladas y resuelve cognitive checkpoints asignados.
              </li>
            </ul>
            <div style={callout('info')}>
              No puedes asignarte el rol <code>superadmin</code> — ese rol solo puede
              asignarlo el equipo Cricket a través de la administración de plataforma.
            </div>
          </div>
        ),
      },
      {
        id: 'ta-analytics',
        title: 'Dashboard de analytics',
        content: (
          <div style={prose}>
            <p style={p}>
              Accede desde <strong>Análisis</strong> en el menú lateral. Muestra los últimos 30 días.
            </p>
            <h3 style={h3}>Métricas disponibles</h3>
            <ul style={ul}>
              <li style={li}><strong>NPS Score</strong>: Net Promoter Score calculado como (promotores − detractores) / total × 100. Verde {'>'} 50, amarillo ≥ 0, rojo {'<'} 0.</li>
              <li style={li}><strong>Tasa de escalada</strong>: porcentaje de sesiones que requirieron intervención humana. Verde {'<'} 20%, amarillo ≤ 40%, rojo {'>'} 40%.</li>
              <li style={li}><strong>Resolución IA</strong>: porcentaje de sesiones completadas sin IH.</li>
              <li style={li}><strong>Duración promedio</strong>: minutos por sesión completada.</li>
              <li style={li}><strong>Total sesiones</strong>: sesiones en el período.</li>
            </ul>
            <h3 style={h3}>Gráficos</h3>
            <ul style={ul}>
              <li style={li}><strong>Distribución NPS</strong>: gauge con promotores, pasivos y detractores.</li>
              <li style={li}><strong>Sesiones por canal</strong>: breakdown de WhatsApp, Web Chat y Email.</li>
              <li style={li}><strong>Sesiones por día</strong>: gráfico de barras de los últimos 30 días con total, completadas y escaladas.</li>
            </ul>
          </div>
        ),
      },
    ],
  },

  // ── SUPERVISOR / OPERADOR ─────────────────────────────────────────────────
  {
    id: 'operador',
    label: 'Supervisor / Operador',
    role: 'Equipo de atención',
    roleColor: '#BA7517',
    articles: [
      {
        id: 'op-cola',
        title: 'La cola de atención',
        content: (
          <div style={prose}>
            <p style={p}>
              La cola (<code>/queue</code>) es tu espacio de trabajo principal. Muestra todas las
              sesiones que requieren tu atención: escaladas y cognitive checkpoints pendientes.
            </p>
            <h3 style={h3}>Tipos de ítems en la cola</h3>
            <ul style={ul}>
              <li style={li}>
                <strong>Escalada</strong>: la sesión fue transferida completamente a un operador humano.
                La IA no volverá a actuar hasta que el operador decida devolverla al modo IA o cerrarla.
                Aparece en la cola con el contexto completo de lo que ocurrió.
              </li>
              <li style={li}>
                <strong>Cognitive checkpoint</strong>: la IA llegó a un punto que requiere tu aprobación
                antes de continuar. Es temporal — tras tu decisión, la IA reanuda automáticamente.
              </li>
            </ul>
            <h3 style={h3}>Por qué una sesión llega a la cola</h3>
            <ul style={ul}>
              <li style={li}><strong>Baja confianza</strong>: la IA no superó el umbral mínimo de confianza configurado para el tenant.</li>
              <li style={li}><strong>Sentimiento negativo</strong>: el cliente expresó frustración o enojo.</li>
              <li style={li}><strong>Política de pagos</strong>: cualquier operación financiera siempre requiere aprobación IH.</li>
              <li style={li}><strong>Solicitud explícita</strong>: el cliente pidió hablar con un humano.</li>
              <li style={li}><strong>Módulo inactivo con fallback IH</strong>: el tenant no tiene activa la etapa que el cliente necesita.</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'op-checkpoints',
        title: 'Cognitive checkpoints — cómo resolverlos',
        content: (
          <div style={prose}>
            <p style={p}>
              Un cognitive checkpoint es el mecanismo central del principio IA + IH de Cricket.
              La IA propone una acción pero no puede ejecutarla sola — tú decides si aprobarla,
              rechazarla o tomar el control de la sesión.
            </p>
            <div style={callout('warning')}>
              Los cognitive checkpoints tienen un tiempo límite. Si no los resuelves, expiran
              y la sesión puede quedar en estado pendiente. Revisa la cola con frecuencia.
            </div>
            <h3 style={h3}>Cómo resolver un checkpoint</h3>
            {step(1, 'Haz clic en el ítem de la cola. Se abre el modal de checkpoint.')}
            {step(2, 'Lee el resumen que hizo la IA: qué detectó, qué acción propone y con qué nivel de confianza.')}
            {step(3, 'Revisa el contexto de la conversación si necesitas más información.')}
            {step(4, 'Toma una decisión: Aprobar, Rechazar o Tomar control.')}
            <h3 style={h3}>Significado de cada decisión</h3>
            <ul style={ul}>
              <li style={li}><strong>Aprobar</strong>: la IA ejecuta la acción propuesta y continúa la conversación.</li>
              <li style={li}><strong>Rechazar</strong>: la IA informa al cliente que la operación no puede procesarse y sugiere alternativas.</li>
              <li style={li}><strong>Tomar control</strong>: tú asumes la conversación directamente. La IA no vuelve a actuar hasta que la devuelvas.</li>
            </ul>
            <h3 style={h3}>Caso especial: operaciones de pago</h3>
            <p style={p}>
              Cuando el checkpoint es por una transacción financiera, verás el preview completo:
              tipo de operación, monto, comisión, flags de cumplimiento (ej: SARLAFT) y nivel de riesgo.
              Lee todos los flags antes de aprobar. Para transacciones de alto riesgo, valida
              la identidad del cliente por un canal adicional si tienes dudas.
            </p>
          </div>
        ),
      },
      {
        id: 'op-intervenir',
        title: 'Cómo intervenir en una sesión activa',
        content: (
          <div style={prose}>
            <p style={p}>
              Como supervisor, puedes tomar el control de cualquier sesión activa, incluso si
              no hay un checkpoint pendiente. Esto es útil cuando ves que la IA no está manejando
              bien la conversación.
            </p>
            <h3 style={h3}>Tomar control</h3>
            {step(1, 'Abre la sesión desde la cola o desde el panel de supervisión.')}
            {step(2, 'Haz clic en "Tomar control". La sesión cambia a actor_control = HUMAN.')}
            {step(3, 'La IA deja de responder. Ahora puedes escribir directamente al cliente.')}
            {step(4, 'Cuando termines, puedes "Devolver a IA" (la IA retoma) o "Cerrar sesión" (finalizar).')}
            <div style={callout('info')}>
              Todas tus intervenciones quedan registradas en <code>interactions</code> con
              <code> actor_type = HUMAN</code> y en <code>audit_log</code>. La trazabilidad
              es completa y no puede modificarse.
            </div>
          </div>
        ),
      },
      {
        id: 'op-escaladas',
        title: 'Gestión de escaladas',
        content: (
          <div style={prose}>
            <p style={p}>
              Una escalada es diferente a un checkpoint: implica que el control pasó
              completamente al equipo humano, generalmente porque la situación supera
              lo que la IA puede manejar sola.
            </p>
            <h3 style={h3}>Cómo resolver una escalada</h3>
            {step(1, 'Abre la escalada desde la cola. Verás el motivo de escalada y un resumen del contexto generado por la IA.')}
            {step(2, 'Lee el historial de conversación para entender qué pasó antes de la escalada.')}
            {step(3, 'Contacta al cliente por el canal activo (el chat del widget o WhatsApp).')}
            {step(4, 'Cuando el problema esté resuelto, marca la escalada con su outcome: resuelta por humano, devuelta a IA, cerrada o transferida.')}
            <h3 style={h3}>Outcomes de escalada</h3>
            <ul style={ul}>
              <li style={li}><strong>Resuelto por humano</strong>: el operador resolvió el problema directamente.</li>
              <li style={li}><strong>Devuelto a IA</strong>: el operador orientó al cliente y le devolvió el control a la IA para continuar.</li>
              <li style={li}><strong>Cerrado</strong>: la conversación terminó (bien o mal).</li>
              <li style={li}><strong>Transferido</strong>: el caso se transfirió a otro equipo o canal.</li>
            </ul>
          </div>
        ),
      },
    ],
  },

  // ── USUARIO FINAL ─────────────────────────────────────────────────────────
  {
    id: 'usuario-final',
    label: 'Usuario final',
    role: 'Cliente del servicio',
    roleColor: '#7F77DD',
    articles: [
      {
        id: 'uf-intro',
        title: '¿Con quién estás hablando?',
        content: (
          <div style={prose}>
            <p style={p}>
              Cuando usas el chat de atención de esta empresa, estás hablando con un asistente de
              inteligencia artificial desarrollado sobre la plataforma Cricket. El asistente puede
              responder preguntas, ayudarte a encontrar productos o servicios, y gestionar
              solicitudes de operaciones.
            </p>
            <h3 style={h3}>La IA no actúa sola en lo que importa</h3>
            <p style={p}>
              Hay operaciones que el asistente nunca ejecuta por sí solo — siempre las revisa
              un operador humano antes. Esto incluye pagos, transferencias, cambios en tu cuenta
              y otras acciones sensibles. Cuando eso ocurre, el asistente te avisará que un
              especialista revisará tu solicitud.
            </p>
            <h3 style={h3}>¿Cuándo hablarás con un humano?</h3>
            <ul style={ul}>
              <li style={li}>Cuando el asistente no tenga suficiente información para ayudarte.</li>
              <li style={li}>Antes de ejecutar cualquier operación financiera o cambio de datos.</li>
              <li style={li}>Si lo solicitas explícitamente ("quiero hablar con un agente").</li>
              <li style={li}>Si el asistente detecta que estás teniendo una experiencia frustrante.</li>
            </ul>
          </div>
        ),
      },
      {
        id: 'uf-como-usar',
        title: 'Cómo usar el chat de atención',
        content: (
          <div style={prose}>
            <h3 style={h3}>Empieza con claridad</h3>
            <p style={p}>
              Describe tu consulta o problema de forma directa. Cuanta más información des desde
              el inicio (número de pedido, producto, fecha de compra), más rápido podrá ayudarte
              el asistente.
            </p>
            <h3 style={h3}>Ejemplos de consultas comunes</h3>
            <ul style={ul}>
              <li style={li}>"¿Cuál es el estado de mi pedido #12345?"</li>
              <li style={li}>"Quiero devolver unos zapatos que compré la semana pasada."</li>
              <li style={li}>"¿Qué talla me recomiendas si normalmente uso 38 europeo?"</li>
              <li style={li}>"¿Tienen este producto en azul?"</li>
              <li style={li}>"Necesito hacer una transferencia a otra cuenta."</li>
            </ul>
            <h3 style={h3}>Confirmaciones importantes</h3>
            <p style={p}>
              Para operaciones que afectan tu cuenta (pagos, cambios de datos), el asistente
              te pedirá confirmar explícitamente antes de proceder. Lee bien el resumen de la
              operación antes de confirmar.
            </p>
            <div style={callout('info')}>
              Si en algún momento quieres cancelar una operación en curso, escribe
              "cancelar" o "no quiero continuar". El asistente lo registrará y no
              procederá con la acción.
            </div>
            <h3 style={h3}>La encuesta de satisfacción</h3>
            <p style={p}>
              Al cerrar la conversación, el asistente puede preguntarte tu opinión sobre
              la atención recibida (una nota del 0 al 10 y una calificación de 1 a 5).
              Es completamente voluntaria — puedes responder "no quiero" o simplemente
              no responder y la conversación se cerrará igualmente.
            </p>
          </div>
        ),
      },
      {
        id: 'uf-privacidad',
        title: 'Tu privacidad y tus datos',
        content: (
          <div style={prose}>
            <p style={p}>
              Cricket almacena el historial de tus conversaciones para mejorar la atención
              y cumplir con requisitos legales. Tu información personal está protegida por las
              políticas de privacidad de la empresa que te atiende.
            </p>
            <h3 style={h3}>Qué queda registrado</h3>
            <ul style={ul}>
              <li style={li}>El contenido de la conversación (mensajes).</li>
              <li style={li}>Las acciones solicitadas y si fueron aprobadas o rechazadas.</li>
              <li style={li}>Tu calificación de satisfacción, si la proporcionas.</li>
              <li style={li}>El canal por el que contactaste (WhatsApp, web chat, email).</li>
            </ul>
            <h3 style={h3}>Qué NO hace el asistente</h3>
            <ul style={ul}>
              <li style={li}>No ejecuta operaciones financieras sin aprobación humana.</li>
              <li style={li}>No comparte tu información con otros tenants o terceros.</li>
              <li style={li}>No toma decisiones irreversibles de forma autónoma.</li>
            </ul>
            <div style={callout('info')}>
              Para ejercer tus derechos de acceso, corrección o eliminación de datos,
              contacta directamente a la empresa que te atiende.
            </div>
          </div>
        ),
      },
    ],
  },
]

// ── Componente principal ─────────────────────────────────────────────────────

export function HelpContent() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  const [activeArticle, setActiveArticle] = useState(SECTIONS[0].articles[0].id)

  const currentSection = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0]
  const currentArticle =
    currentSection.articles.find((a) => a.id === activeArticle) ??
    currentSection.articles[0]

  function selectSection(sId: string) {
    const s = SECTIONS.find((x) => x.id === sId)
    if (!s) return
    setActiveSection(sId)
    setActiveArticle(s.articles[0].id)
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 0px)' }}>
      {/* ── Sidebar izquierda ── */}
      <aside
        style={{
          width: 240,
          borderRight: '0.5px solid var(--color-border-tertiary)',
          background: 'var(--color-background-secondary)',
          flexShrink: 0,
          overflowY: 'auto',
          padding: '20px 0',
        }}
      >
        {SECTIONS.map((section) => (
          <div key={section.id} style={{ marginBottom: 4 }}>
            {/* Sección header */}
            <button
              onClick={() => selectSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 16px',
                background: activeSection === section.id
                  ? 'var(--color-background-primary)'
                  : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderLeft: activeSection === section.id
                  ? `2px solid ${section.roleColor}`
                  : '2px solid transparent',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: section.roleColor,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {section.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  {section.role}
                </div>
              </div>
            </button>

            {/* Artículos de la sección activa */}
            {activeSection === section.id && (
              <div style={{ paddingLeft: 26 }}>
                {section.articles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => setActiveArticle(article.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '6px 16px 6px 0',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 12,
                      color: activeArticle === article.id
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-tertiary)',
                      fontWeight: activeArticle === article.id ? 500 : 400,
                      borderLeft: activeArticle === article.id
                        ? `1.5px solid ${section.roleColor}`
                        : '1.5px solid transparent',
                      paddingLeft: 10,
                    }}
                  >
                    {article.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </aside>

      {/* ── Contenido principal ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px', maxWidth: 760 }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 20 }}>
          <span
            style={{ color: currentSection.roleColor, fontWeight: 500 }}
          >
            {currentSection.label}
          </span>
          {' › '}
          {currentArticle.title}
        </div>

        {/* Título del artículo */}
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: '0 0 24px',
            lineHeight: 1.3,
          }}
        >
          {currentArticle.title}
        </h1>

        {/* Contenido */}
        {currentArticle.content}

        {/* Navegación entre artículos */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 48,
            paddingTop: 20,
            borderTop: '0.5px solid var(--color-border-tertiary)',
          }}
        >
          {(() => {
            const arts = currentSection.articles
            const idx  = arts.findIndex((a) => a.id === activeArticle)
            const prev = arts[idx - 1]
            const next = arts[idx + 1]
            return (
              <>
                {prev ? (
                  <button
                    onClick={() => setActiveArticle(prev.id)}
                    style={{
                      background: 'none',
                      border: '0.5px solid var(--color-border-secondary)',
                      borderRadius: 'var(--border-radius-md, 8px)',
                      padding: '8px 14px',
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    ← {prev.title}
                  </button>
                ) : <span />}
                {next ? (
                  <button
                    onClick={() => setActiveArticle(next.id)}
                    style={{
                      background: 'none',
                      border: '0.5px solid var(--color-border-secondary)',
                      borderRadius: 'var(--border-radius-md, 8px)',
                      padding: '8px 14px',
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {next.title} →
                  </button>
                ) : <span />}
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
