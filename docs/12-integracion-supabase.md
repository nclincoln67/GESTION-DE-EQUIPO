# Integración Supabase — primera etapa

Fecha de trabajo: 9 de octubre de 2026, America/Lima. Proyecto 01, `Proyecto_01` (`tvzkgolvgfwyjomqihgb`). El usuario confirmó Cloudflare Free y proporcionó privadamente el correo del administrador. Ese correo se guarda solo en Supabase, no en este repositorio.

## Implementado

- `private.team_workspace`: estado de negocio JSONB, revisión y fecha de actualización. Está vacío de trabajadores y operaciones; se conservaron exclusivamente los catálogos y configuraciones de la versión local mediante lectura SQLite de solo lectura.
- `private.team_members`: cuentas autorizadas, roles y vínculo con trabajador. Las autorizaciones no proceden de metadatos editables de Auth ni del JSON de negocio.
- `private.team_invites`: destinatarios preautorizados. Hay una preautorización privada para el administrador inicial; no equivale a haber creado la cuenta Auth ni enviado un correo.
- Las tres tablas tienen RLS y políticas explícitas que deniegan acceso directo a anon/authenticated. No son tablas públicas del frontend.
- RPC `team_backend_load`/`team_backend_save`: solo ejecutables por service_role desde el backend. Comprueban sesión existente y miembro activo. SQL filtra los datos de visitantes antes de devolverlos. Un save exige administrador y revisión actual, y revoca visitantes de perfiles eliminados en la misma transacción.
- Edge Function `team-api`, ID `f2e72896-c637-4266-964e-8ffe9bc521f6`, versión 1, activa, con `verify_jwt = true`. Además consulta Auth y vuelve a comprobar permisos en la base. No se han copiado claves privadas fuera de su entorno de ejecución.
- El runtime financiero se genera desde las mismas fuentes que Node. Cada solicitud tiene su propio contexto; no comparte datos en variables globales. Los comandos admitidos mantienen su lista cerrada y validación de campos.

## Decisión de almacenamiento

Para este equipo pequeño, la primera migración conserva el contrato de estado existente dentro de Postgres JSONB. Así no se reescriben cálculos ya probados mientras cambian autenticación y persistencia. Las cuentas y permisos sí tienen tablas propias. El guardado usa revisión global y una transacción breve: no pierde cambios de otra sesión ni separa ingresos de sus recibos.

No es una carpeta de archivos con pagos, ni almacenamiento en el navegador. La base está en Supabase. Para necesidades de muchos equipos, reportes SQL masivos o más concurrencia, evaluar normalización por registros mediante una migración posterior, sin cambiar el contrato financiero.

## Historial y reproducción

- Migración remota `20261010015151_team_private_backend_v1`.
- Migración posterior `team_explicit_browser_deny` agrega políticas restrictivas explícitas.
- `supabase/schema/team-backend.sql` es un snapshot de la definición completa, no un archivo de migración generado por CLI. No aplicarlo de nuevo sobre las tablas ya existentes. Los datos iniciales privados se cargaron por separado con inserción que no sustituye el estado existente.
- Para empaquetar Edge: ejecutar `node scripts/build-cloud-domain.cjs`; produce `supabase/functions/team-api/generated/domain.mjs`, ignorado por Git. Desplegar el entrypoint y sus dependencias como una unidad, separadamente de Cloudflare. No activar despliegues de Supabase por push.

## Verificado

- Las 65 comprobaciones anteriores y las 12 pruebas de integración local siguen pasando.
- `tests/cloud.mjs`: runtime de nube, protección de liquidaciones, extras posteriores, visitante de solo lectura, tokens inválidos, origen ajeno, revisión obsoleta, lista cerrada, ocultación de errores e aislamiento por petición.
- `tests/cloud-database.sql`: cuentas desechables dentro de BEGIN/ROLLBACK; aislamiento SQL entre perfiles, consumo de preautorización, rechazo de terceros y escrituras de visitantes, revisión, sesión inexistente y revocación por eliminación de trabajador. No quedaron cuentas, sesiones ni registros de prueba.
- Pruebas HTTPS reales: sin sesión → 401; token inválido → 401; RPC directo con clave pública → 401; CORS del origen de producción → 204 con el origen correcto.
- Asesor de seguridad: sin avisos tras las políticas explícitas.
- Estado posterior: cero usuarios Auth, cero miembros activos, cero trabajadores/pagos, una preautorización privada y revisión 0. La base local y su contraseña no fueron borradas ni copiadas a Auth.

## Pendiente al cerrar esta primera etapa — historial

La continuación en [13-acceso-y-publicacion.md](13-acceso-y-publicacion.md) sustituye este inventario: ya se implementaron el frontend, el login y la gestión de cuentas. Se conserva aquí la lista histórica, no como estado actual.

1. Conectar el frontend a Supabase Auth: activación, login, renovación, cierre y recuperación; conservar `cnlincoln` como identificador sin publicar su correo como una tabla de consulta libre.
2. Implementar gestión administrativa de cuentas Auth, roles y vínculos. Por seguridad `team-api` todavía rechaza saveUser/toggleUser/deleteUser con 501; no utiliza las contraseñas del prototipo.
3. Crear/activar la cuenta real inicial por un canal seguro. No se ha enviado una invitación por correo. Los tokens y contraseñas nunca se introducen en GitHub ni se piden en el chat.
4. Probar end-to-end con cuentas reales consentidas, incluyendo dos visitantes distintos y concurrencia, antes de uso real.
5. Preparar respaldo/restauración Supabase y la salida exclusiva del frontend. Cloudflare sigue publicando `deploy/preflight`; no hay todavía aplicación funcional online.

La integración continúa por etapas; esta primera etapa no cambia el diseño ni las reglas de pagos.
