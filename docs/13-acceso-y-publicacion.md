# Acceso cloud — continuación del 9 de octubre de 2026

## Conexiones distintas

1. GitHub `nclincoln67/GESTION-DE-EQUIPO`, rama `main` → integración Git de Cloudflare Pages `gestion-de-equipo`. Un push dispara la compilación. No utiliza una clave de Supabase ni aplica migraciones SQL.
2. Cloudflare publica únicamente `dist/`, generado con `node scripts/build-frontend.cjs`. La salida tiene interfaz y SDK empaquetado; no servidor Node, SQLite, respaldo, documentación ni archivo de datos ficticios.
3. Navegador → Supabase `Proyecto_01`, ref `tvzkgolvgfwyjomqihgb`: URL y Publishable Key en `frontend/public-config.json`. Esta clave es pública, no es una contraseña ni concede acceso a los datos privados.
4. Login por correo o usuario → `team-login` → Supabase Auth verifica la contraseña. El correo asociado al usuario se resuelve solo dentro del backend. No existe una búsqueda pública de correos. El endpoint de login no exige una sesión previa porque debe crearla, pero sí verifica la contraseña mediante Auth, limita intentos en Postgres y devuelve únicamente la sesión de quien se autenticó.
5. Sesión Auth → `team-api` valida identidad/JWT → RPC con credencial privada de servidor → Postgres. Las RPC no son ejecutables con la clave pública. Se comprueba además `auth.sessions` y el rol almacenado en tablas privadas. Los visitantes reciben solo su perfil.

`team-api` conserva `verify_jwt=true`. `team-login` tiene `verify_jwt=false` exclusivamente por su autenticación propia mediante contraseña comprobada por Supabase Auth. No devuelve datos financieros. Ninguna clave privilegiada se copia al repositorio o a Cloudflare.

## Cuentas y contraseñas

- Correo obligatorio, usuario único, administradores múltiples y visitante ligado a un trabajador disponible.
- Registro público desactivado. El administrador prepara la cuenta y envía una invitación. La persona crea su contraseña en un enlace privado.
- Activación y recuperación usan Supabase Auth. No se guardan contraseñas en el estado financiero, GitHub ni exportaciones.
- La sesión del SDK se conserva en sessionStorage de la pestaña, no junto a datos financieros en localStorage. El SDK renueva tokens; cerrar sesión solicita revocación del acceso de esa sesión y borra los datos de interfaz. Ante un fallo de revocación se informa al usuario.
- Roles y cuentas se modifican con revisión y bloqueo transaccional del mismo espacio. No se desactiva/elimina la cuenta propia ni se degrada al administrador actual. Se conserva la autoría al eliminar acceso; no se borra destructivamente el usuario Auth ni su historial.
- Una invitación que no pudo enviarse queda pendiente y se puede reintentar. No anunciar envío si SMTP falló. «Pendiente» significa que la persona aún no ha entrado en la aplicación.
- No editar el correo de cuentas existentes desde el formulario: requiere un flujo independiente de confirmación de identidad.

## Correo y enlaces

El correo integrado de Supabase solo entrega a miembros de su organización y no es un servicio de producción. Para visitantes hay que configurar SMTP propio en Supabase. No agregar trabajadores a la organización de Supabase para sortear esta restricción: eso les concedería acceso al panel, que no es su rol en la aplicación.

URL de sitio: `https://gestion-de-equipo.pages.dev`. Retorno exacto autorizado: `https://gestion-de-equipo.pages.dev/`. Sin comodines a dominios ajenos. Contraseñas mínimas de interfaz: 12 caracteres; verificar también el mínimo del proveedor Auth antes del uso real.

## Cambios y pruebas

Publicación verificada: el push `d15a665e798808193eb3a469476365e657a337d6` generó el despliegue automático `e67fbc52-783c-4139-9555-f543aed88242`, con compilación y publicación correctas. La web mostró «Correo o usuario» y rechazó credenciales ficticias por HTTPS en un navegador real. Se añade `404.html` explícito para que las rutas inexistentes no respondan con el fallback de la aplicación.

- Migración remota separada: `20261010021437_team_login_and_accounts`. Sus definiciones están en `supabase/schema/team-login.sql` y `team-accounts.sql`, sin datos privados. No ejecutarlas de nuevo sobre recursos ya existentes.
- `team-api` versión 2, `team-login` versión 1. Antes de invitar al primer usuario, comprobar el despliegue del frontend, no solo su configuración.
- `node scripts/verify.cjs`: 65 regresiones del dominio local, 12 integraciones Node/SQLite, suites de reglas/Edge y de login/adaptador/cuentas.
- `tests/cloud-database.sql` y `tests/cloud-accounts.sql`: pruebas SQL desechables con BEGIN/ROLLBACK. Comprueban aislamiento, permisos, consumo de invitación, revisiones, edición, cancelación, sesión, cuenta propia y límite de intentos. No envían correos.
- HTTPS real antes de publicación: `team-api` sin sesión 401; `team-login` con contraseña inválida 401; RPC de login y cuentas no visibles con clave pública (404). Asesor de seguridad sin avisos.
- Contadores de acceso contienen huellas, no IPs en claro ni contraseñas; límites por identificador, IP y global. Caducan por ventanas. Supabase Auth mantiene sus propios controles; conocer el correo y llamar directamente a Auth no concede autorización a esta aplicación.

## Pendientes de puesta en marcha

1. Primer administrador: invitación consentida, recepción del correo y contraseña elegida por el propietario. Nadie solicita su contraseña en el chat.
2. Probar sesión real, guardar y recargar datos consentidos, recuperación y cierre. Probar perfiles distintos antes de invitar trabajadores para uso real.
3. SMTP propio para invitaciones/recuperación de visitantes: escoger proveedor gratuito o uno que ya tenga el dueño, sin contratar planes de pago.
4. Respaldo y restauración cloud: la exportación descarga los datos de negocio sin claves; no reemplaza un respaldo Postgres/Auth. Implementar/verificar procedimiento de restauración y conservación antes de registrar pagos reales. El respaldo SQLite existente sigue siendo solo local.

## Reversión

Si la puesta en marcha falla, volver la salida de Pages a `deploy/preflight` (comando vacío) o recuperar el commit previo. No eliminar tablas, cuentas o migraciones con datos como parte de una reversión de frontend. Para bloquear temporalmente uso, retirar publicación funcional o desactivar acceso de miembros con un administrador alternativo autorizado. La versión local Node/SQLite no se ha sustituido ni se han trasladado contraseñas.

Referencias: [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Auth implicit flow](https://supabase.com/docs/guides/auth/sessions/implicit-flow).
