# Comprobantes privados de pagos

Implementación del 17 de octubre de 2026. Extensión de la versión publicada en Supabase/Cloudflare; la referencia Node/SQLite conserva sus funciones anteriores y no muestra un cargador sin backend.

## Uso

- Registrar pago, adelanto o ingreso marcado como ya pagado: selector opcional de archivos. Los ingresos pendientes y los descuentos no admiten comprobantes de entrega de dinero.
- Para pagos existentes: Pagos → Historial de pagos → Ver → Comprobantes → Adjuntar comprobantes. También funciona desde el detalle del trabajador y desde movimientos con pago inmediato o pago asociado.
- PDF, PNG, JPG y JPEG; hasta 5 MiB por archivo y diez archivos por registro, incluidas las cargas reservadas pendientes. Los documentos se descargan; no se ejecutan ni se incrustan como HTML/PDF dentro de la aplicación.
- Adjuntar documentos no cambia importes, estados, revisiones financieras ni protección de movimientos liquidados. No hay sustitución ni eliminación de comprobantes desde la interfaz.
- Si se guarda el pago pero falla una carga, el diálogo informa que el pago existe y permite reintentar los archivos pendientes usando los mismos identificadores. No volver a registrar el pago. Si se cierra el diálogo, sus documentos pueden adjuntarse desde el detalle.

## Arquitectura, acceso y límites

- Recursos verificados: repositorio público `nclincoln67/GESTION-DE-EQUIPO`; Pages `gestion-de-equipo`, ID `299247c5-e92a-41fb-ad87-f03f2bd18e87`; Supabase `Proyecto_01`, ref `tvzkgolvgfwyjomqihgb`, organización `cnLincoln` en Free. Antes del cambio no había buckets ni objetos Storage. La publicación anterior correspondía al commit `6c20a2f`, con despliegue automático exitoso.
- Bucket **privado** `team-receipts`; límite de 5 MiB y tres MIME exactos en Storage. El frontend no puede leer, listar, subir, sobrescribir ni eliminar objetos directamente: política restrictiva para `anon` y `authenticated`, sin políticas permisivas para este bucket.
- Metadatos en `private.team_receipts`, con RLS y sin permisos de navegador. No se introducen archivos/base64/rutas en `private.team_workspace.state` ni en exportaciones JSON financieras. Los respaldos deben incluir por separado la tabla de metadatos y los objetos Storage; respaldar solo Postgres/JSON no respalda los binarios.
- Edge Function `team-receipts`: verifica JWT con Auth y sesión vigente con `team_backend_load`, que también verifica pertenencia y rol de esta aplicación. Administradores adjuntan y consultan; visitantes solo listan y descargan documentos de sus propios pagos. Revocar la sesión o desactivar el perfil bloquea la siguiente solicitud.
- Validación de tamaño real durante lectura del cuerpo, extensión, MIME y firma inicial PDF/PNG/JPEG. Es validación de formato, no un antivirus ni una verificación de autenticidad del comprobante. No interpreta/importa importes de imágenes.
- Reserva por UUID y SHA-256, subida sin `upsert` y confirmación contra metadatos del objeto. Reintentar en el mismo diálogo no reemplaza ni duplica. Si falla una confirmación, la reserva conserva su ruta para el mismo reintento. Los documentos solo aparecen cuando la confirmación termina.
- Descarga por backend autenticado, `Content-Disposition: attachment`, `nosniff`, `private, no-store`. Sin enlaces públicos ni enlaces firmados persistidos. El nombre original viaja en cabecera, no en la URL. Los nombres físicos son UUID; no contienen nombres de trabajadores ni importes.
- Lectura de documentos bajo demanda al abrir el detalle; no descarga archivos al navegar ni al actualizar el resumen. No agrega bibliotecas de interfaz. El frontend continúa saliendo exclusivamente desde `dist`.
- El plan Free confirmado incluye 1 GB de Storage según la documentación consultada. Se limita la suma reservada por esta aplicación a 900 MiB para dejar margen. Esto no reemplaza revisar los contadores de transferencia/funciones del panel ni garantiza que otras aplicaciones futuras no consuman almacenamiento. No se activa ningún plan de pago.

Fuentes: [límites y precios](https://supabase.com/pricing), [buckets y restricciones](https://supabase.com/docs/guides/storage/buckets/creating-buckets), [control de acceso](https://supabase.com/docs/guides/storage/security/access-control), [subidas estándar](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

## Pruebas y publicación

- Historial SQL separado de Git: `20261017180712_team_private_payment_receipts`, definición en `supabase/schema/team-receipts.sql`. Primero se ejecutó con fixtures y ROLLBACK, después se aplicó y se repitió `tests/cloud-receipts.sql` con ROLLBACK.
- SQL comprueba autorización, aislamiento de visitante, sesión revocada, metadatos pendientes invisibles, confirmación sin objeto rechazada, reintento sin duplicado, rechazo de reemplazo y de movimientos pendientes, adjunto a adelanto protegido e inmutabilidad del estado financiero.
- `tests/receipts.mjs` comprueba formatos/tamaño, origen, respuesta privada, destino exacto creado por comando, reintentos de carga sin repetir pagos, descarga tardía tras cierre de sesión y archivos opcionales. Forma parte de `node scripts/verify.cjs`, junto con las regresiones financieras, locales y de nube.
- `tests/receipts-browser.cjs` ejecuta un navegador aislado con datos ficticios y backend de archivos en memoria. Comprueba selección, envío de bytes, error/reintento, pago único, detalle y descarga. Permite `RECEIPT_SAMPLE` para un archivo privado local, sin copiarlo al repositorio; capturas temporales fuera de la salida pública. Se probó un JPG aportado por el usuario sin asociarlo a pagos reales. Este entorno no sustituye una prueba autenticada completa contra Storage de producción.
- Revisión visual de escritorio y móvil con la identidad existente. Se corrigió el contraste de la etiqueta opcional a `--muted`. El motor automático de Impeccable no estaba instalado; revisión manual independiente sobre capturas/código, sin descargar otro motor ni rediseñar la aplicación.
- Asesor de seguridad posterior a la migración: sin nuevos avisos; persiste el aviso previo de protección de contraseñas filtradas deshabilitada. No se modificó Auth ni se contrató un plan.
- Backend publicado antes del frontend: `team-receipts` v1 y `team-api` v4, ambos con `verify_jwt=true`; `team-login` permanece v2. `team-api` añade únicamente la referencia exacta del registro recién creado, para asociar archivos sin inferencias por fecha o importe.

## Mantenimiento y reversión

No borrar reservas ni objetos por SQL a ciegas. Si una carga abandonada ocupa un cupo, revisar `ready_at`, fecha, objeto y vínculo financiero. Los binarios deben gestionarse mediante Storage API (borrar filas de `storage.objects` no borra el archivo físico). Antes de cualquier limpieza revisar y respaldar; no hay limpieza automática ni cambios de datos existentes en esta entrega.

Revertir el frontend y `team-api` al commit anterior `6c20a2f` oculta la función sin borrar comprobantes. Conservar bucket, tabla, RLS y función de autorización para no perder documentos. Si fuera necesario apagar la descarga, retirar la Edge Function después de confirmar el impacto; no cambiar el bucket a público. Nunca revertir borrando información financiera, cuentas, archivos ni la tabla de metadatos.
