# Rendimiento — 15 de octubre de 2026

## Alcance y estado previo

Se conserva GitHub → Cloudflare Pages y Supabase independiente. No se cambia la base
de región, no se crean recursos ni se activan planes de pago. Las reglas de pagos,
adelantos y movimientos liquidados permanecen en sus fuentes y pruebas originales.

En una muestra de las 24 horas previas, las funciones ejecutadas en São Paulo,
con la base en Oregón, registraron: GET `team-api` 1.250–1.618 ms (3 solicitudes),
POST `team-api` 3.164–4.436 ms (4 solicitudes, incluyen gestión de cuentas) y login
correcto 2.527–2.752 ms (2 solicitudes). Son tiempos de ejecución del backend,
no Core Web Vitals ni un cronometraje completo del navegador.

## Cambios

- Región de invocación configurable en `frontend/public-config.json`:
  `functionRegion: us-west-2`. La URL usa `forceFunctionRegion`; no hace falta
  añadir cabeceras CORS. Las funciones quedan junto a Auth/Postgres. Ante una
  incidencia regional, retirar esa propiedad restaura el enrutamiento automático.
- `team_backend_snapshot` agrupa datos y cuentas en una RPC. `team_backend_commit`
  llama al guardado existente y devuelve la instantánea en la misma transacción.
  Las funciones originales siguen disponibles para compatibilidad y reversión.
- Se conservan la verificación Auth, `auth.sessions`, los roles privados, RLS,
  restricciones de visitante y revisión optimista. Las nuevas RPC solo permiten
  ejecución a `service_role`; no son una API pública para el navegador.
- GET normal: 3 → 2 viajes internos HTTP. Cambio financiero normal: 5 → 3.
  No se omite ninguna validación financiera ni se anuncian escrituras anticipadas.
- Una lectura en curso se comparte entre clics; lecturas y escrituras respetan
  una cola. Las respuestas de una sesión cerrada no repueblan la interfaz.
- Preflight CORS reutilizable por 600 segundos, con los mismos orígenes permitidos.
  Las respuestas Auth/financieras siguen usando `Cache-Control: no-store`.
- La salida `dist/` pasa de recursos separados a un JS diferido y un CSS
  minificados, con huellas de contenido en sus nombres. Solo esos recursos
  versionados usan caché anual inmutable. HTML no se almacena y el icono usa una
  caché corta. Hay preconexión al origen Supabase y avisos de actualización.
- El build reemplaza únicamente archivos generados conocidos; rechaza archivos
  ajenos y enlaces simbólicos. No publica servidor, SQLite, respaldos, docs o demo.

## Aplicación y verificación

Migración remota separada: `20261015230638_team_performance_snapshot_commit`.
Definición revisable: `supabase/schema/team-performance.sql` (no volver a aplicarla).
Backend: `team-api` versión 3 con JWT obligatorio y `team-login` versión 2 con su
autenticación por contraseña y limitación de intentos existentes.

`node scripts/verify.cjs` ejecuta las 65 pruebas funcionales, las 12 HTTP locales,
las suites cloud y los nuevos casos `tests/performance.mjs`. Se comprobó el orden
de solicitudes, cierre durante una petición, commit y aislamiento de visitantes.
Las suites SQL `cloud-database.sql`, `cloud-accounts.sql` y `cloud-performance.sql`
pasaron con BEGIN/ROLLBACK. Los contadores y la revisión/huella del estado real
fueron iguales antes y después; no se dejaron datos de prueba.

El asesor de seguridad no señala permisos nuevos inseguros; mantiene una advertencia
de protección frente a contraseñas filtradas desactivada. No se contrata un plan
para habilitarla como parte de este trabajo.

No está disponible Chrome DevTools MCP: no se inventan métricas LCP/INP/CLS.
Se contrastan inventario HTTP, cabeceras, renderizado en navegador y registros.
Para comparar tiempos autenticados posteriores hace falta actividad real tras la
publicación; las pruebas públicas sin sesión no representan el coste de una lectura.

## Reversión

1. Restaurar en Git los archivos de frontend/build/backend de esta optimización a
   su revisión anterior y publicar mediante el mismo flujo GitHub → Pages.
2. Volver a desplegar el backend anterior si hace falta: `team-api` v2 y
   `team-login` v1 están representados por el commit anterior de Git. Generar su
   `generated/domain.mjs` desde ese mismo commit, sin editarlo a mano.
3. Las RPC nuevas son aditivas: pueden quedar sin uso. Para retirarlas, una
   migración independiente debe eliminar primero `team_backend_commit` y después
   `team_backend_snapshot`, sin CASCADE. No borrar tablas, cuentas ni pagos.

Referencias: [regiones Supabase](https://supabase.com/docs/guides/functions/regional-invocation),
[cabeceras Pages](https://developers.cloudflare.com/pages/configuration/headers/),
[protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
