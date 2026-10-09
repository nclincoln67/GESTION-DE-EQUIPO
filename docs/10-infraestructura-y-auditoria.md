# Proyecto 01 — Gestión de Equipo de INKAJUS

Auditoría inicial: 8 de octubre de 2026, America/Lima. La arquitectura elegida es GitHub → Cloudflare para frontend, y Supabase como backend independiente. No se conecta Supabase a GitHub. La versión Node/SQLite local permanece como referencia; todavía no está migrada a Supabase.

## Identidad de los recursos

| Recurso | Identidad verificada |
|---|---|
| Proyecto lógico | 01 — Gestión de Equipo de INKAJUS |
| Carpeta local | `GESTION-DE-EQUIPO/` dentro de `01.  INKAJUS/` |
| GitHub | `nclincoln67/GESTION-DE-EQUIPO` — ID `1399201211` |
| Visibilidad | Público, confirmado expresamente por el usuario el 8 de octubre |
| Rama principal prevista | `main` |
| Organización Supabase | `cnLincoln` — ID `vmdiapoteggrumahxzee` |
| Proyecto Supabase | `Proyecto_01` — ref `tvzkgolvgfwyjomqihgb`, confirmado por el usuario |
| Región Supabase | `us-west-2` |
| URL pública de API | `https://tvzkgolvgfwyjomqihgb.supabase.co` |
| Cuenta Cloudflare | `cnlincoln` — ID `6229ee9bf9f247c10e161c35762af2f5` |

Conservar estos recursos existentes. No crear otro repositorio ni otro proyecto Supabase. `LANDING/` es independiente y no se incluye en este repositorio. La numeración 01 identifica este proyecto; los nombres históricos se mantienen durante la preparación para evitar cambios de ubicación innecesarios.

## Auditoría local y GitHub

- Al comenzar, el repositorio remoto no tenía ramas ni commits, y la carpeta local no era un repositorio Git. La conexión Git de lectura se comprobó.
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

El inventario inicial no tiene Pages ni Workers. La API permite revisar estos recursos, pero la consulta de suscripciones devuelve un error de autorización; no se puede confirmar facturación desde esta conexión. No se cambia de plan.

La carpeta `deploy/preflight/` contiene solo una página de preparación y cabeceras de seguridad para comprobar la conexión GitHub → Cloudflare. No publica la interfaz antigua con un backend ausente ni expone archivos del servidor. Configuración prevista: rama `main`, sin comando de build y salida `deploy/preflight`. El acceso de la aplicación y su conexión Supabase no se dan por implementados por publicar esta página.

## Límites Free comprobados en documentación oficial

- Supabase: dos proyectos Free activos, contados entre organizaciones donde el usuario es Owner/Administrator; 500 MB de base por proyecto, 1 GB de Storage, 50.000 usuarios activos mensuales y 500.000 invocaciones Edge Functions. Los proyectos inactivos pueden pausarse y el plan no incluye respaldos automáticos disponibles como en planes de pago.
- Cloudflare Pages Free: 500 builds mensuales y 20.000 archivos por sitio. Revisar consumo real y condiciones al añadir otro proyecto.
- El consumo mensual de transferencia, Auth y funciones del panel de facturación no se ha podido consultar con las herramientas actuales; no se afirma que sea cero.

Fuentes: [Supabase Free y facturación](https://supabase.com/docs/guides/platform/billing-on-supabase), [Precios Supabase](https://supabase.com/pricing), [Respaldos Supabase](https://supabase.com/docs/guides/platform/backups), [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/).

## Estrategia para varios proyectos

Dedicar `Proyecto_01` a Gestión de Equipo. Evaluar el segundo proyecto Free cuando aparezca otra aplicación que necesite backend. No compartir por anticipado: si más aplicaciones requieren compartir una base, diseñar autorización por aplicación, esquemas/tablas y buckets propios; Auth, claves y varias configuraciones son comunes al proyecto, por lo que los nombres por sí solos no dan aislamiento.

## Pendientes antes de desarrollar nuevas funciones

- Completar y verificar commit/push/pull y la correspondencia local-remota.
- Conectar GitHub con Cloudflare y comprobar un despliegue automático real de la página de preparación.
- Cerrar registro público Auth; confirmar Site URL, redirecciones, correo y recuperación de cuenta. No crear usuarios ni cambiar contraseñas durante la auditoría.
- Confirmar plan y consumo desde los paneles cuando la API no permita leerlos.
- Preparar un respaldo/restauración Supabase independiente; no reutilizar el respaldo SQLite como respaldo Postgres.
- Después de cerrar la auditoría, migrar autenticación y almacenamiento de la aplicación conservando su contrato financiero y pruebas.
