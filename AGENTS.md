# Gestión de Equipo de INKAJUS — reglas de mantenimiento

- Este repositorio es el proyecto lógico 01. GitHub: `nclincoln67/GESTION-DE-EQUIPO` (público por elección del dueño). Supabase: `Proyecto_01`, ref `tvzkgolvgfwyjomqihgb`. Cloudflare: cuenta `cnlincoln`. Revisar `docs/10-infraestructura-y-auditoria.md` antes de actuar sobre infraestructura.
- GitHub almacena código y Cloudflare publica el frontend desde `main`. Supabase es independiente; no conectarlo directamente a GitHub ni ejecutar migraciones automáticamente por un push.
- No desarrollar nuevas funciones importantes hasta completar la auditoría y verificar la publicación automática. La versión Node/SQLite local sigue siendo referencia, no una integración Supabase terminada.
- No publicar bases, respaldos, exportaciones, sesiones, contraseñas reales, tokens ni claves secretas/service_role. El frontend solo puede contener la URL pública y Publishable Key de Supabase. Revisar archivos y exclusiones antes de cada publicación.
- Servir exclusivamente la carpeta de salida preparada. Nunca publicar la raíz del repositorio, `server/`, `storage/`, `backups/` ni los documentos de operación. Inicialmente la salida de comprobación es `deploy/preflight/`.
- Conservar las reglas financieras de `docs/09-arquitectura-y-reglas.md` y ejecutar `node scripts/verify.cjs` al cambiarlas. No desbloquear movimientos liquidados al registrar nuevos ingresos ni contabilizar adelantos dos veces.
- RLS debe comprobar identidad y autorización para esta aplicación. No asignar administradores desde metadatos editables por el usuario. Revisar permisos de funciones privilegiadas y registrar/verificar las migraciones por separado.
- Inventariar recursos, planes Free y consumo antes de crear otro proyecto. No duplicar recursos ni activar planes de pago. Compartir Supabase requiere autorización por aplicación: nombres o esquemas solos no aíslan usuarios.
- Leer el estado local/remoto antes de editar, conservar cambios ajenos y no borrar datos sin autorización. Documentar configurado, pendiente y comprobado; no afirmar éxito de despliegue solo porque esté habilitado.
