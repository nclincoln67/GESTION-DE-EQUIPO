# Proyecto 01 — Gestión de Equipo de INKAJUS

Auditoría inicial: 8 de octubre de 2026, America/Lima. La arquitectura elegida es GitHub → Cloudflare para frontend, y Supabase como backend independiente. No se conecta Supabase a GitHub. La versión Node/SQLite local permanece como referencia; todavía no está migrada a Supabase.

## Identidad de los recursos

| Recurso | Identidad verificada |
|---|---|
| Proyecto lógico | 01 — Gestión de Equipo de INKAJUS |
| Carpeta local | `GESTION-DE-EQUIPO/` dentro de `01.  INKAJUS/` |
| GitHub | `nclincoln67/GESTION-DE-EQUIPO` — ID `1399201211` |
| Visibilidad | Público, confirmado expresamente por el usuario el 8 de octubre |
| Rama principal | `main`, con seguimiento de `origin/main` |
| Organización Supabase | `cnLincoln` — ID `vmdiapoteggrumahxzee` |
| Proyecto Supabase | `Proyecto_01` — ref `tvzkgolvgfwyjomqihgb`, confirmado por el usuario |
| Región Supabase | `us-west-2` |
| URL pública de API | `https://tvzkgolvgfwyjomqihgb.supabase.co` |
| Cuenta Cloudflare | `cnlincoln` — ID `6229ee9bf9f247c10e161c35762af2f5` |
| Cloudflare Pages | `gestion-de-equipo` — ID `299247c5-e92a-41fb-ad87-f03f2bd18e87` |
| Dirección de preparación | `https://gestion-de-equipo.pages.dev`, HTTPS y respuesta 200 comprobados |

Conservar estos recursos existentes. No crear otro repositorio ni otro proyecto Supabase. `LANDING/` es independiente y no se incluye en este repositorio. La numeración 01 identifica este proyecto; los nombres históricos se mantienen durante la preparación para evitar cambios de ubicación innecesarios.

## Auditoría local y GitHub

- Al comenzar, el repositorio remoto no tenía ramas ni commits, y la carpeta local no era un repositorio Git. La conexión Git de lectura se comprobó.
- Se inicializó Git solo en la carpeta de esta aplicación, con `origin` apuntando al repositorio confirmado. El código verificado se guardó mediante la conexión GitHub de esta conversación; después `fetch` y `pull --ff-only` dejaron local y remoto en el mismo commit `8f8c1fb0a1eeee1c4cf8c3f6ce26ee28e37fe8c0`, con árbol idéntico. El commit local inicial redundante se integró sin cambiar archivos.
- La subida autenticada funciona mediante la conexión GitHub, pero `git push` desde esta computadora no funciona todavía: falta iniciar sesión en Git Credential Manager. No se copian tokens al repositorio para resolverlo. Configurar ese acceso antes de depender de subidas manuales desde la PC.
- Pasaron 65 pruebas de lógica/interfaz y 12 de integración HTTP con bases temporales. No se modificó la base real.
- `.gitignore` ya excluía SQLite, almacenamiento, respaldos y `.env`; se añadieron secretos locales de Cloudflare, archivos privados de claves, exportaciones y archivos temporales de Supabase.
- La búsqueda inicial de patrones de tokens privados y claves no encontró coincidencias en el código. Esto no sustituye revisar cada archivo que se vaya a publicar.
- La base SQLite local tiene una cuenta y una entrada de auditoría; no contiene trabajadores, movimientos ni pagos. No se copia a GitHub ni se migra durante esta auditoría.
- Las cuentas y contraseñas del prototipo y de las pruebas son ejemplos públicos, no credenciales de Supabase ni del acceso local real. La cuenta local real solo existe en SQLite y no debe publicarse.

## Supabase: configurado y consumo observado

- Una organización visible, plan Free, y un proyecto visible activo y saludable. No crear nuevos proyectos para esta aplicación.
- Base medida mediante `pg_database_size`: 10.909.363 bytes, aproximadamente 10,4 MiB; esta es una medición técnica puntual, no el contador de facturación del panel.
- Auth no tiene usuarios. No hay buckets ni objetos Storage y no hay Edge Functions desplegadas.
- `public.profiles` está vacía, con RLS y políticas SELECT/INSERT/UPDATE restringidas a `auth.uid() = id`.
- El alta Auth invoca `private.handle_new_user()` para crear el perfil. La función tiene búsqueda de nombres restringida y no otorga permisos administrativos a partir de datos editables del usuario.
- Existe una Publishable Key habilitada y una clave anon heredada. Usar Publishable en la futura integración; no se han leído ni publicado claves secretas.
- No existen tablas de empleados, pagos, movimientos, periodos ni reglas financieras de esta aplicación en Supabase todavía.
- La consulta pública de Auth confirma email habilitado, registro abierto (`disable_signup = false`) y confirmación de correo requerida. El acceso anónimo y los proveedores sociales están deshabilitados. Para el uso interno debe cerrarse el registro libre; no se ha cambiado porque la conexión actual no ofrece administración de esa configuración. Tener un perfil propio no concede acceso administrativo al equipo.

## Corrección aplicada y verificada

Se encontró una función privilegiada de evento DDL, `public.rls_auto_enable()`, con EXECUTE implícito para roles públicos. Aunque retorna `event_trigger` y no es una operación de negocio, se restringió el permiso innecesario. También se retiraron privilegios TRUNCATE, REFERENCES y TRIGGER de `public.profiles` para roles de frontend; RLS no protege operaciones TRUNCATE.

La migración remota `20261009014637_restrict_bootstrap_privileges` ejecutó:

```sql
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
```

Verificación: anon y authenticated no ejecutan la función; authenticated no tiene TRUNCATE; SELECT/INSERT/UPDATE siguen concedidos; RLS y los dos mecanismos automáticos siguen habilitados. El asesor de seguridad, consultado de nuevo, devuelve cero advertencias. No se borraron registros ni se cambió el contenido de las tablas.

## Cloudflare y publicación de comprobación

El inventario inicial no tenía Pages ni Workers. Se creó un único proyecto Pages `gestion-de-equipo` conectado al repositorio confirmado. La API permite revisar estos recursos, pero la consulta de suscripciones devuelve un error de autorización; no se puede confirmar facturación desde esta conexión. No se cambia de plan.

La carpeta `deploy/preflight/` contiene solo una página de preparación y cabeceras de seguridad para comprobar la conexión GitHub → Cloudflare. No publica la interfaz antigua con un backend ausente ni expone archivos del servidor. Configuración confirmada: fuente GitHub `nclincoln67/GESTION-DE-EQUIPO`, rama `main`, despliegues de producción habilitados, previews deshabilitados, sin comando de build y salida `deploy/preflight`. No tiene variables de entorno ni funciones añadidas. El acceso de la aplicación y su conexión Supabase no se dan por implementados por publicar esta página.

Comprobación real: el commit `a26617d2d48658c2aaadbad23a745276d50b5341` produjo el despliegue `1965b136-7d1f-4276-9d3a-fa3866ad30f4` con disparador `github:push`, rama `main`, y etapa final `deploy: success`. No se hizo una subida manual de archivos a Cloudflare. La URL principal responde 200 con la página esperada y cabeceras CSP restrictiva, X-Frame-Options DENY y X-Robots-Tag noindex/nofollow. Estas cabeceras no sustituyen autorización para los futuros datos privados.

## Límites Free comprobados en documentación oficial

- Supabase: dos proyectos Free activos, contados entre organizaciones donde el usuario es Owner/Administrator; 500 MB de base por proyecto, 1 GB de Storage, 50.000 usuarios activos mensuales y 500.000 invocaciones Edge Functions. Los proyectos inactivos pueden pausarse y el plan no incluye respaldos automáticos disponibles como en planes de pago.
- Cloudflare Pages Free: 500 builds mensuales y 20.000 archivos por sitio. Revisar consumo real y condiciones al añadir otro proyecto.
- El consumo mensual de transferencia, Auth y funciones del panel de facturación no se ha podido consultar con las herramientas actuales; no se afirma que sea cero.

Fuentes: [Supabase Free y facturación](https://supabase.com/docs/guides/platform/billing-on-supabase), [Precios Supabase](https://supabase.com/pricing), [Respaldos Supabase](https://supabase.com/docs/guides/platform/backups), [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/).

## Estrategia para varios proyectos

Dedicar `Proyecto_01` a Gestión de Equipo. Evaluar el segundo proyecto Free cuando aparezca otra aplicación que necesite backend. No compartir por anticipado: si más aplicaciones requieren compartir una base, diseñar autorización por aplicación, esquemas/tablas y buckets propios; Auth, claves y varias configuraciones son comunes al proyecto, por lo que los nombres por sí solos no dan aislamiento.

## Pendientes antes de desarrollar nuevas funciones

- Iniciar sesión de Git en la PC para verificar `git push` nativo. Commit, subida por conexión GitHub, fetch/pull y correspondencia de archivos ya están comprobados.
- Cerrar registro público Auth; confirmar Site URL, redirecciones, correo y recuperación de cuenta. No crear usuarios ni cambiar contraseñas durante la auditoría.
- Confirmar plan y consumo desde los paneles cuando la API no permita leerlos.
- Preparar un respaldo/restauración Supabase independiente; no reutilizar el respaldo SQLite como respaldo Postgres.
- Después de cerrar la auditoría, migrar autenticación y almacenamiento de la aplicación conservando su contrato financiero y pruebas.

La publicación automática ya está verificada. El panel web de Supabase redirige a inicio de sesión; no se intentó introducir credenciales ni alterar seguridad desde el navegador. El cierre completo de la preparación depende de los pasos de acceso descritos en `docs/11-pasos-pendientes-de-acceso.md`. Los cambios finales de documentación se guardan en GitHub y se sincronizan localmente por pull; consultar el historial para el último commit, no tomar el commit inicial como el estado actual.
