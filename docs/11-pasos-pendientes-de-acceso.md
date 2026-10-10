# Pasos pendientes para terminar la preparación

Proyecto activo: 01 — Gestión de Equipo de INKAJUS. La aplicación funcional sigue local; `https://gestion-de-equipo.pages.dev` muestra únicamente preparación. No introducir pagos reales en esa página ni asumir que la cuenta local ya existe en Supabase.

Actualización del 9 de octubre: Git autenticado y sincronizado comprobados; registro libre de Supabase desactivado comprobado; Cloudflare Free confirmado por el usuario. Los pasos 1–3 se conservan como referencia, no para repetirlos. La integración ya comenzó: ver `docs/12-integracion-supabase.md` para el estado actual y los pendientes reales.

## 1. Acceso de Git desde la computadora

El repositorio ya contiene el código y la carpeta local está conectada a `origin/main`. La conexión GitHub de esta conversación puede subir cambios; Git de Windows todavía no tiene acceso autenticado para hacer `push`.

En una terminal abierta dentro de `GESTION-DE-EQUIPO`, ejecutar `git push`. Git Credential Manager debería abrir el acceso de GitHub: completar personalmente el inicio de sesión de `nclincoln67`. No enviar contraseñas al asistente ni pegarlas en archivos del proyecto. Si no abre la ventana de acceso, revisar la instalación de Git Credential Manager antes de intentar otros métodos.

Después podremos comprobar una subida pequeña y su publicación automática. Mientras tanto, los cambios enviados mediante la conexión GitHub se descargan localmente con `git pull --ff-only`; si hay cambios locales sin guardar, revisarlos antes de sincronizar. No usar force push ni reset para resolver diferencias.

## 2. Cerrar el registro abierto de Supabase

Abrir el [proyecto confirmado](https://supabase.com/dashboard/project/tvzkgolvgfwyjomqihgb) e iniciar sesión personalmente. Dentro de Authentication, buscar la configuración de registro/Sign In. Desactivar **Allow new users to sign up** y guardar, manteniendo email y confirmación de correo habilitados. Los nombres y ubicación del panel pueden cambiar: comprobar que se está modificando `Proyecto_01`, no otro proyecto.

El objetivo es que nadie se registre libremente en una aplicación interna. La futura función administrativa de creación/invitación de cuentas se implementará por un canal privilegiado del backend, no exponiendo claves secretas en el frontend. No crear manualmente roles administrativos mediante metadatos editables ni publicar credenciales.

Podemos volver a consultar `/auth/v1/settings` para verificar `disable_signup = true`. Quedan por definir el correo del administrador, su creación segura, recuperación de acceso y permisos específicos de Gestión de Equipo. No enviar contraseñas en el chat.

## 3. Confirmar plan y consumo visibles en los paneles

- En Cloudflare, cuenta `cnlincoln`: confirmar que Pages utiliza Free y revisar uso/facturación sin activar un plan de pago. La conexión actual no puede leer suscripciones.
- En Supabase, organización `cnLincoln`: el plan Free ya está confirmado por API. Revisar Usage para transferencia y otros contadores mensuales que la conexión actual no expone. Hay un proyecto visible y una base medida de aproximadamente 10,4 MiB, sin usuarios Auth ni objetos Storage; esto no representa todos los contadores de facturación.
- No crear otro proyecto para esta aplicación: `Proyecto_01` ya está reservado para ella.

## 4. Lo que sigue después de estos pasos

Completar Site URL y lista de redirecciones de Auth para la dirección definitiva, revisar correo y recuperación, definir respaldo/restauración y preparar la migración de Node/SQLite a Supabase. Conservar las reglas y las pruebas financieras existentes. No conectar Supabase a GitHub: sus cambios se gestionan por separado.

El flujo de código ya comprobado es GitHub `main` → Cloudflare automático. Los registros y cuentas reales futuros se guardarán en Supabase, no en GitHub ni entre los archivos estáticos de Cloudflare.
