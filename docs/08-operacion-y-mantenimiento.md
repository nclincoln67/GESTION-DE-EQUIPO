# Operación de INKAJUS

## Primera apertura

Abrir `INICIAR-INKAJUS.cmd` o ejecutar `node server/index.cjs` desde la carpeta del proyecto. Entrar en http://localhost:8787. El acceso local es exclusivamente desde este equipo: no está habilitado para otros dispositivos ni Internet.

Crear personalmente la contraseña de `cnlincoln` (Lincoln Cuellar Natividad). No enviarla por chat. La instalación crea un solo administrador y ningún trabajador, movimiento, pago o evento de prueba. Los catálogos predeterminados permanecen; se pueden sustituir durante la primera apertura importando únicamente las configuraciones de una exportación anterior.

Los administradores pueden añadir trabajadores y crear cuentas vinculadas de tipo Visitante. También pueden crear otros administradores. Para cambiar una contraseña, un administrador edita el usuario en Configuración → Usuarios; el cambio cierra las sesiones anteriores de esa cuenta. No hay recuperación por correo implementada. Conviene mantener un segundo administrador de confianza antes de depender del sistema para el trabajo diario.

## Inicio y cierre

El acceso directo inicia el servidor en segundo plano si no está abierto y abre la página. Cerrar la pestaña no detiene el servidor. Para trabajar con inicio/cierre explícitos, ejecutar `node server/index.cjs` en una terminal y usar Ctrl+C al terminar. No iniciar dos procesos para la misma base de datos.

Para detener el iniciado en segundo plano: identificar en el Administrador de tareas el proceso Node cuya línea de comandos contiene `server/index.cjs` y corresponde a esta aplicación; no detener otros procesos Node. Reiniciar Windows también lo detiene. No se instala un servicio ni un inicio automático.

## Copias completas

Ejecutar `node scripts/backup.cjs` desde esta carpeta. Crea un archivo SQLite único en `backups/` mediante la función de respaldo de SQLite, incluso con el servidor funcionando. Incluye registros, configuración y verificadores de contraseñas. No compartirlo públicamente. Conservar otra copia en una ubicación privada fuera de este equipo.

La copia es manual: no hay programación automática ni subida a la nube. Hacerla antes de actualizar y con la frecuencia necesaria para no perder trabajo. Una exportación JSON de la interfaz excluye credenciales y no sirve para restaurar todas las cuentas.

## Restauración sin sobrescribir la base original

1. Detener el servidor.
2. Conservar intacta la carpeta `storage/` actual, incluidos los archivos auxiliares SQLite.
3. Copiar el respaldo elegido a una carpeta privada nueva, por ejemplo `restauracion/inkajus.sqlite`; no reutilizar archivos auxiliares de otra base.
4. Configurar `DATABASE_PATH` con la ruta absoluta de esa copia en un archivo `.env` privado.
5. Iniciar con `node --env-file=.env server/index.cjs`. Verificar usuarios, periodos y saldos antes de continuar.
6. Tras restaurar, cambiar las contraseñas afectadas si se necesita invalidar sesiones guardadas en el respaldo.

El acceso directo usa la configuración local predeterminada; para una ruta personalizada usar el comando con `.env`, no el acceso directo. Las copias con configuración personalizada se ejecutan con `node --env-file=.env scripts/backup.cjs`.

## Actualizaciones y mantenimiento

Hacer un respaldo; detener el servidor; sustituir solo el código; conservar `storage/`, `backups/` y `.env`; ejecutar `node scripts/verify.cjs`; iniciar y revisar el flujo de pagos. Las pruebas usan datos temporales. No borrar la base para resolver una actualización. Documentar cualquier futura migración de estructura con respaldo y prueba de restauración.

## Cuando se elija hosting

Se necesita un servicio compatible con Node.js 24 o superior, disco persistente privado y HTTPS: subir solo `index.html` a un hosting estático no es suficiente. Mantener una sola instancia escritora de esta versión. El volumen de datos debe sobrevivir a las actualizaciones.

Existe una plantilla `deploy/Dockerfile`, pendiente de probar y ajustar al proveedor elegido. No se ha desplegado. Configurar `NODE_ENV=production`, `APP_ORIGIN` con el origen HTTPS exacto (sin ruta ni barra final), una `SETUP_TOKEN` privada para una instalación nueva y las rutas privadas de base y copias. El proxy debe conservar el Host público; el puerto interno no debe quedar expuesto directamente a Internet. Configurar y probar límites de acceso detrás del proxy, copias automáticas y restauración antes de publicar.

Si se trasladan los datos locales, usar un respaldo completo y comprobar los accesos: no repetir la instalación vacía. No publicar `.env`, `storage/`, `backups/` ni exportaciones. La elección del proveedor, dominio, envío de correos y publicación quedan pendientes de decisión.
