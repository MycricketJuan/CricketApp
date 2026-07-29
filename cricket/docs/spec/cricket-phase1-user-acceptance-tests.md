# Plan de pruebas de aceptación de usuario — Cricket Fase 1

**Fecha:** 21 de julio de 2026  
**Fuentes:** [`cricket-spec-phase1.md`](./cricket-spec-phase1.md) y [`cricket-spec-phase1-status.md`](./cricket-spec-phase1-status.md)  
**Objetivo:** comprobar, desde la perspectiva de un usuario, qué partes implementadas de la Fase 1 resuelven su necesidad, cuáles cumplen el SPEC y cuáles todavía presentan una brecha.

## Alcance y actores

- **Cliente Cricket / tenant:** empresa que se registra, configura Cricket y administra su operación desde la web.
- **Operador IH:** asesor de la empresa que atiende escaladas, aprueba acciones sensibles y gestiona trámites.
- **Cliente final / end user:** persona atendida por Cricket mediante WhatsApp.
- **Superadmin Cricket:** crea y administra tenants de forma manual; se prueba aparte porque no pertenece al flujo self-service.

Cada caso debe marcarse como **Aprobado**, **Fallido** o **Bloqueado**. Un caso bloqueado no se considera aprobado. Registrar URL, fecha/hora, tenant, usuario, capturas y, para WhatsApp, el identificador del mensaje.

## Preparación del ambiente

1. Usar un ambiente de pruebas con Auth0, Supabase, Anthropic/OpenAI y Twilio configurados.
2. Confirmar que las migraciones del repositorio estén aplicadas. Esto incluye Knowledge Base, NPS, handoff, trámites y `tenant_channels`.
3. Preparar dos empresas, **Tenant A** y **Tenant B**, con administradores distintos; esto permite verificar aislamiento.
4. Preparar un operador, un número de WhatsApp de prueba y un tenant Banking con templates de trámites cargados.
5. Crear al menos diez FAQ para la prueba de calidad. Una debe contener un dato único, por ejemplo: “La clave de prueba es GRILLO-742”.
6. Abrir las herramientas de desarrollo del navegador para guardar errores de consola y solicitudes fallidas.

> Limitación actual: `tenant_channels` existe como migración, pero el webhook todavía usa configuración global. La prueba de WhatsApp requiere un tenant y credenciales preparados por el equipo técnico.

## Matriz de ejecución

| ID | Flujo | Actor | Relación con el SPEC | Prioridad |
|---|---|---|---|---|
| UAT-01 | Registro empresarial | Cliente Cricket | §5 paso 1, §7.1, §11 | Crítica |
| UAT-02 | Validaciones de registro | Cliente Cricket | §7.1 | Alta |
| UAT-03 | Acceso y tenant activo | Cliente Cricket | §7.1, multitenancy | Crítica |
| UAT-04 | Pantalla de setup | Cliente Cricket | §5, §7.2 | Alta |
| UAT-05 | FAQ manual | Cliente Cricket | §5 paso 4, §7.3 | Crítica |
| UAT-06 | Importación de conocimiento | Cliente Cricket | §7.3 | Alta |
| UAT-07 | Aislamiento de datos | Cliente Cricket | §1 multitenancy | Crítica |
| UAT-08 | Consulta por WhatsApp y RAG | Cliente final | §10 Retail, §11 calidad | Crítica |
| UAT-09 | Venta y recomendación | Cliente final | US-R01/US-R02 | Alta |
| UAT-10 | Escalada y toma de control | Cliente final + operador | US-B02, §11 IA + IH | Crítica |
| UAT-11 | Checkpoint sensible | Cliente final + operador | US-R03, §11 IA + IH | Crítica |
| UAT-12 | Trámite bancario | Cliente final + operador | US-B04 | Alta |
| UAT-13 | Feedback y analítica | Cliente final + gerente | US-B03, §11 calidad | Alta |
| UAT-14 | Administración y auditoría | Administrador | §5 pasos 6–7, §11 IA + IH | Alta |
| UAT-15 | Rendimiento observable | Todos | §11 performance | Alta |

## Casos de prueba

### UAT-01 — Registro empresarial exitoso

**Objetivo:** demostrar que una empresa puede crear su espacio sin intervención de Cricket.  
**Precondición:** email nuevo y slug no utilizado.

1. En una ventana privada, abrir `/register`.
2. Ingresar empresa, slug y sector; continuar al registro universal de Auth0.
3. Crear la identidad, verificar el correo y regresar a Cricket.
4. Confirmar la redirección a `/setup`.
5. Cerrar sesión e iniciar nuevamente por `/login`.

**Resultado esperado:** se crea un solo tenant, el usuario queda como `tenant_admin`, aparecen los módulos iniciales y `/setup` muestra el nombre y `{slug}.mycricket.ai`. Repetir el callback no debe duplicar datos.  
**Estado conocido:** implementado, pendiente de validación E2E con Auth0 y Supabase reales.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-02 — Errores controlados durante el registro

**Objetivo:** evitar tenants incompletos o duplicados.

1. Intentar registrar un slug con formato inválido.
2. Intentar usar un slug ya existente.
3. Completar Auth0 sin verificar el correo e intentar continuar.
4. Corregir cada dato y reintentar.

**Resultado esperado:** cada error explica cómo corregirlo; un correo no verificado no aprovisiona la empresa; el reintento válido termina en `/setup` sin duplicados.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-03 — Sesión y contexto empresarial

**Objetivo:** confirmar que cada persona entra únicamente a su empresa.

1. Iniciar sesión como administrador del Tenant A y visitar `/admin`, `/queue`, `/tramites` y `/analytics`.
2. Cerrar sesión e iniciar como administrador del Tenant B.
3. Repetir las rutas y comparar empresa, usuarios, contadores y registros.
4. Usar “atrás” en el navegador después de cerrar sesión.

**Resultado esperado:** la sesión cerrada no recupera páginas privadas y ningún dato del Tenant A aparece en el Tenant B.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-04 — Inicio del setup

**Objetivo:** validar la transición posterior al registro actualmente disponible.

1. Abrir `/setup` con el nuevo administrador.
2. Verificar empresa, slug y mensaje de registro completado.
3. Abrir **Configurar conocimiento** y regresar.
4. Abrir **Ir al panel administrativo**.

**Resultado esperado actual:** ambos enlaces funcionan y conservan el tenant activo.  
**Brecha frente al SPEC:** deben marcarse como no disponibles el wizard de ocho pasos, branding, idioma, zona horaria, conexión de WhatsApp, progreso, prueba y activación. Este caso no aprueba el onboarding completo.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-05 — Crear, editar y eliminar una FAQ

**Objetivo:** permitir al cliente administrar conocimiento sin código.

1. Abrir `/admin/knowledge` y seleccionar **FAQ**.
2. Crear la pregunta con el dato único preparado y guardar.
3. Recargar la página y comprobar que permanece.
4. Editar pregunta y respuesta; guardar y volver a recargar.
5. Eliminar una FAQ prescindible y confirmar que desaparece.

**Resultado esperado:** altas, cambios y bajas se reflejan sin errores ni duplicados; el procesamiento termina en estado listo.  
**Brecha:** el SPEC también solicita categoría, tags, contador/recomendación y vista previa del agente; registrar ausencia si la interfaz no los ofrece.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-06 — Cargar archivos y URL

**Objetivo:** comprobar las fuentes de conocimiento implementadas.

1. En **Archivos**, cargar un PDF, DOCX y TXT pequeños con contenido reconocible.
2. Verificar el avance hasta estado listo y revisar el detalle.
3. Intentar un tipo no admitido y un archivo defectuoso.
4. En **URLs**, ingresar una página accesible y confirmar su extracción.
5. Generar FAQ desde una fuente importada, si la acción está visible.

**Resultado esperado:** los formatos válidos se procesan; los inválidos muestran un error útil; una URL no accesible no crea contenido engañoso.  
**Brecha:** CSV/Excel y templates por sector exigidos por §7.3 no están implementados.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-07 — Aislamiento de Knowledge Base

**Objetivo:** impedir que un tenant lea o modifique datos de otro.

1. Crear contenido claramente identificable en ambos tenants.
2. Como Tenant A, observar en la pestaña Network el `tenant_id` enviado por las acciones de Knowledge Base.
3. En el ambiente autorizado de pruebas, repetir una solicitud cambiando únicamente ese identificador por el del Tenant B.
4. Verificar que la lectura o mutación sea rechazada y que los datos del Tenant B sigan intactos.

**Resultado esperado:** respuesta 401/403, sin exposición ni modificación.  
**Estado conocido:** probable fallo crítico; varias rutas confían en `tenant_id` del cliente y usan service role. No habilitar un piloto multitenant hasta aprobar este caso.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-08 — Respuesta de consulta basada en conocimiento

**Objetivo:** validar Consultation Agent y RAG desde el canal del cliente final.

1. Enviar por WhatsApp una pregunta equivalente a la FAQ con el dato único.
2. Reformularla dos veces sin copiar el título exacto.
3. Preguntar por un dato que no existe en la base.
4. Medir tiempo desde el envío hasta la respuesta.

**Resultado esperado:** las primeras respuestas usan el contenido del tenant; no mezclan información de otro tenant. Ante información insuficiente, el agente reconoce la incertidumbre o escala en vez de inventar. Con diez o más entradas, registrar si `confidence > 0.80`.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-09 — Consulta comercial y recomendación

**Objetivo:** validar que Intent Classifier, Consultation y Sales colaboran en Retail.

1. Usar un tenant Retail con productos precargados.
2. Preguntar por talla, precio o disponibilidad de un producto.
3. Expresar intención de compra y pedir una combinación o alternativa.
4. Contar los turnos hasta la recomendación.

**Resultado esperado:** la respuesta consulta el catálogo correcto y Sales Agent propone una opción relevante en menos de tres turnos.  
**Brecha:** no existe Catalog Builder visual y el webhook aún no carga el sector del tenant; registrar comportamiento genérico o incorrecto.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-10 — Escalada y toma de control humano

**Objetivo:** confirmar que una conversación incierta o sensible llega al operador con contexto.

1. Desde WhatsApp, insistir en una solicitud no resoluble o expresar molestia de forma clara.
2. Cronometrar desde el disparador hasta que aparezca en `/queue`.
3. Verificar motivo, sentimiento, resumen, sesión y urgencia.
4. Seleccionar **Tomar control** y confirmar que el operador obtiene el control.
5. Enviar o registrar la respuesta humana y finalizar la atención según el flujo disponible.

**Resultado esperado:** se crea una sola escalada; el briefing aparece en menos de 10 segundos; la IA deja de responder mientras `actor_control` sea humano; queda auditoría. El cliente final siempre recibe “Te comunico con un asesor…” o equivalente.  
**Estado conocido:** el mensaje de escalada al cliente llega vacío, el historial del briefing puede estar incompleto y Realtime puede no refrescar con Auth0/RLS. Estos hallazgos hacen fallar el criterio global aunque la cola muestre el caso al recargar.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-11 — Checkpoint para una acción sensible

**Objetivo:** asegurar que la IA nunca ejecuta una operación sensible sin aprobación IH.

1. Solicitar por WhatsApp una transacción o reembolso que requiera aprobación.
2. Confirmar los datos cuando el agente muestre el preview.
3. Revisar que el checkpoint aparezca en `/queue` y abrir **Resolver**.
4. Probar **rechazar**; repetir el caso y probar **aprobar**.
5. Revisar el estado de la sesión y el audit log en ambos recorridos.

**Resultado esperado:** nada se ejecuta antes de la decisión; aprobar y rechazar producen estados distintos, eliminan el pendiente de la cola y registran actor, evento y timestamp.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-12 — Solicitud y gestión de un trámite bancario

**Objetivo:** validar US-B04 de extremo a extremo.

1. En un tenant Banking preparado, solicitar un crédito por WhatsApp.
2. Responder campo por campo y contar los turnos hasta completar la solicitud.
3. Confirmar que el trámite aparece en `/tramites` con cliente, tipo, estado y SLA.
4. Filtrar y buscar el trámite; abrir su detalle.
5. Asignar operador, agregar nota y recorrer solamente transiciones permitidas.
6. Solicitar documentos o aprobar/rechazar incluyendo un mensaje al cliente.

**Resultado esperado:** los datos recogidos coinciden con la conversación, el formulario termina en menos de diez turnos, las transiciones inválidas no se permiten y los cambios quedan auditados.  
**Brecha:** nuevos tenants Banking no reciben automáticamente el módulo `tramites`; el mensaje escrito para el cliente se guarda, pero no se envía por WhatsApp.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-13 — Feedback y analítica de 30 días

**Objetivo:** comprobar que el gerente puede observar satisfacción y resolución.

1. Finalizar una conversación hasta que Feedback Agent solicite NPS/CSAT.
2. Responder NPS con un valor de 0 a 10 y CSAT con un valor de 1 a 5.
3. Confirmar que no se vuelva a registrar feedback para la misma sesión.
4. Abrir `/analytics` y buscar la sesión dentro del período de 30 días.
5. Comparar manualmente conversaciones, escaladas, canales y NPS con los datos generados.

**Resultado esperado:** Feedback Agent termina en máximo tres turnos; la sesión queda completada y las métricas corresponden al tenant.  
**Estado conocido:** la página puede mostrar ceros por la incompatibilidad entre Auth0 y las RLS del cliente Supabase; esto se registra como fallo, no como ausencia de actividad.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-14 — Administración, roles y auditoría

**Objetivo:** validar la operación básica del administrador del tenant.

1. En `/admin`, revisar usuarios, módulos, configuración y auditoría.
2. Comprobar que un administrador puede ver su equipo y que un operador no obtiene privilegios de administrador.
3. Activar o desactivar un módulo permitido y confirmar el cambio tras recargar.
4. Ejecutar una acción de cada flujo anterior y localizar su evento en `/admin/audit`.
5. Repetir como usuario de otro tenant.

**Resultado esperado:** los permisos corresponden al rol; los datos siempre pertenecen al tenant activo; cada acción sensible registra `actor_type`, `actor_id`, `event_type` y fecha.  
**Brecha:** el mensaje entrante de WhatsApp no se registra primero como interacción y algunas acciones Auth0 no pueden asociar `actor_id` UUID de forma completa.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

### UAT-15 — Tiempos de respuesta

**Objetivo:** medir los SLA definidos en §11 con datos reales.

1. Ejecutar al menos diez consultas simples por WhatsApp y registrar latencia total.
2. Ejecutar cinco escaladas y medir la generación del briefing.
3. Abrir `/queue` cinco veces con datos, sin caché, y medir hasta que sea utilizable.
4. Reportar mediana, percentil 95, mínimo, máximo y errores.

**Resultado esperado del SPEC:** WhatsApp `< 8 s`, briefing `< 10 s` y `/queue < 2 s`. No aprobar con una sola medición ni descontar intentos fallidos.  
**Estado conocido:** no existe telemetría o benchmark automatizado; la evidencia debe obtenerse manualmente.  
**Resultado:** [ ] Aprobado [ ] Fallido [ ] Bloqueado

## Funciones fuera del alcance ejecutable actual

No deben presentarse al usuario como terminadas: wizard completo de ocho pasos, conexión/verificación/activación de WhatsApp por tenant, modo de prueba previo a activación, Catalog Builder, Salud y Citas Agent, billing, contador mensual de conversaciones, Quality Reviewer y notificación saliente de cambios de trámite. Para cada una solo se debe verificar que no bloquee ni se anuncie como disponible en el recorrido actual.

## Registro de hallazgos

| Hallazgo | Caso | Severidad | Resultado esperado | Resultado observado | Evidencia | Responsable |
|---|---|---|---|---|---|---|
| | | Crítica/Alta/Media/Baja | | | | |

## Criterios de salida para un piloto

- UAT-01, UAT-03, UAT-07, UAT-08, UAT-10 y UAT-11 aprobados sin defectos críticos.
- Ninguna acción sensible puede ejecutarse sin checkpoint aprobado.
- No existe lectura o escritura cruzada entre tenants.
- Las brechas visibles se comunican al usuario y cuentan con responsable y fecha objetivo.
- Los resultados reales de calidad y rendimiento quedan anexos; “implementado en código” no sustituye una prueba aprobada.

