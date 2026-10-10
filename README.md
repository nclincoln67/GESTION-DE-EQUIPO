# INKAJUS · Gestión de equipo

Aplicación de INKAJUS: equipo, pagos, movimientos, asistencia y cuentas con permisos. La versión local Node/SQLite se conserva como referencia. La interfaz cloud ya está publicada y conectada a Supabase; faltan la activación inicial y las comprobaciones con cuentas reales antes de registrar pagos de uso real.

La arquitectura es **GitHub → Cloudflare Pages**, con **Supabase independiente** para datos y autenticación. [Abrir la interfaz cloud](https://gestion-de-equipo.pages.dev). El [acceso y la publicación](docs/13-acceso-y-publicacion.md) describen la conexión, las invitaciones y lo pendiente. Consulta los recursos en [Infraestructura y auditoría](docs/10-infraestructura-y-auditoria.md). Las instrucciones antiguas de hosting Node/SQLite son referencia histórica, no el nuevo plan de publicación.

## Compilar el frontend cloud

Instala las versiones fijadas en `pnpm-lock.yaml` con `pnpm install --frozen-lockfile` y ejecuta `pnpm build`. Solo se publica `dist/`; jamás la raíz del repositorio. Cloudflare compila automáticamente tras un push a `main`. La compilación no ejecuta SQL ni migra bases de datos. El cliente de Supabase y el compilador solo son necesarios para la salida cloud; el servidor local continúa sin dependencias externas.

## Abrir

1. Abre **INICIAR-INKAJUS.cmd**. Necesita Node.js 24 o superior; no necesita instalar paquetes ni conexión a Internet.
2. Se abrirá **http://localhost:8787**. Usa siempre esa dirección para los datos reales.
3. En la primera apertura crea tu contraseña de al menos 12 caracteres. La cuenta inicial es **Lincoln Cuellar Natividad**, usuario **cnlincoln**, Administrador.
4. Si personalizaste los catálogos del prototipo, antes de crear el espacio puedes importar su exportación JSON en «Conservar mi configuración anterior». Solo se recuperan las configuraciones, nunca los trabajadores, usuarios ni pagos de prueba.
5. Añade trabajadores desde Equipo y crea sus cuentas Visitante en Configuración → Usuarios. Vincula cada cuenta a su trabajador. También puedes añadir administradores.

El espacio real comienza vacío. No existe una contraseña predeterminada. Las contraseñas se guardan como verificadores protegidos, no como texto legible. El servidor comprueba los permisos en cada operación; cada visitante recibe únicamente la información de su perfil.

## Prototipo anterior (solo consulta/exportación)

El doble clic en `index.html` sigue abriendo el prototipo anterior y sus datos guardados en ese navegador. **No es el acceso de uso real**. Se conserva para que puedas recuperar tu configuración sin borrar información del navegador. Estas cuentas solo pertenecen al prototipo:

| Usuario | Contraseña | Acceso |
| --- | --- | --- |
| admin | admin123 | Administrador |
| admin2 | admin123 | Segundo administrador |
| valeria | visita123 | Perfil y registros de Valeria |

Las cuentas de prueba no existen en el servidor real.

## Datos locales

Los datos reales se guardan en `storage/inkajus.sqlite`. No se borran al cerrar el navegador ni al reiniciar el servidor. La carpeta `storage/` es privada y no se publica como archivos web. No se debe sustituir al actualizar el código.

El prototipo anterior conserva por separado `localStorage`, clave `inkajus.team.v1`. No se han borrado ni trasladado automáticamente esos datos. La exportación JSON no incluye contraseñas y **no sustituye una copia completa de seguridad**. Para copias, restauración y futura publicación, lee [Operación y mantenimiento](docs/08-operacion-y-mantenimiento.md).

## Organización real del proyecto

```text
INICIAR-INKAJUS.cmd             Acceso local de uso real
index.html                     Interfaz (servida por el servidor)
assets/css/                    Diseño, componentes y adaptación móvil
assets/icons/                  Identidad local
assets/js/core/                Utilidades e iconos
assets/js/data/                Conexión al servidor y compatibilidad del prototipo
assets/js/services/            Cuentas, cálculos y operaciones
assets/js/components/          Formularios, tablas y modales compartidos
assets/js/modules/             Los cinco módulos
assets/js/app.js               Arranque, navegación y acciones
server/                        Acceso, permisos, operaciones y almacenamiento privado
storage/                       Base de datos y registros locales (no publicar)
backups/                       Copias completas (no publicar)
scripts/                       Verificación y copia de seguridad
deploy/                        Plantilla para el futuro hosting
docs/                          Operación, arquitectura y decisiones
tests/                         Verificación de cálculos, roles y renderizado
```

La interfaz y el servidor reutilizan las mismas reglas de pagos. Los cambios se guardan en transacciones; si otra sesión actualizó los datos, se solicita revisar antes de volver a guardar para evitar sobreescrituras. Consulta [Arquitectura y reglas que conservar](docs/09-arquitectura-y-reglas.md).

## Eliminar trabajadores y configuración

Los administradores pueden eliminar trabajadores desde la lista de Equipo o desde su ficha. Configuración incluye Eliminar para usuarios, tipos de movimiento, métodos de pago, cargos, horarios y feriados. Cada acción requiere confirmar en un modal.

Se utiliza eliminación lógica: el registro desaparece de su lista, pero se conserva internamente cuando lo necesita el historial. El trabajador eliminado pierde sus opciones de edición y sus visitantes vinculados quedan desactivados. Se pueden completar saldos de periodos ya preparados desde Pagos. Los usuarios eliminados no pueden iniciar sesión; su autoría en registros anteriores se conserva.

Los catálogos eliminados no se ofrecen en nuevos formularios. Si el empleado ya usa un cargo u horario eliminado, su ficha conserva ese dato y permite sustituirlo al editar. Los tipos y métodos usados en pagos anteriores mantienen sus etiquetas y reglas de cálculo. Los feriados eliminados desaparecen del calendario.

No puedes eliminar tu cuenta actual ni dejar el sistema sin administradores activos. Los visitantes no disponen de acciones de eliminación. No hay recuperación desde la interfaz de los registros eliminados; Desactivar sigue disponible si necesitas reactivarlos posteriormente.

## Cálculo de pagos

Estimado = sueldo del periodo + ingresos vigentes − descuentos vigentes.

Ya pagado = adelantos entregados + otros pagos vigentes.

Saldo = estimado − ya pagado.

Los adelantos son pagos inmediatos, no descuentos: no reducen el estimado. Se registran una sola vez desde Movimientos, indicando el método de entrega, y aparecen también en Historial de pagos con el concepto Adelanto. No debes volver a registrarlos como un pago independiente. Comisiones, bonos y otros ingresos adicionales pueden registrarse como pendientes o junto con su pago mediante «¿Este ingreso ya se pagó?». Si eliges Sí, se registra el ingreso y un único pago asociado, indicando el método de entrega. No debes volver a registrar ese pago. Solo los pagos y adelantos son salidas de dinero. Un evento de asistencia puede asociarse a un movimiento confirmado manualmente.

En Movimientos, un adelanto no anulado muestra **Pagado** desde que se registra. Los otros movimientos muestran **Vigente** hasta liquidarse. Un ingreso registrado junto con su pago muestra **Pagado** inmediatamente; otros pendientes se liquidan al completar el saldo mensual. Un descuento Pagado indica que se aplicó a la liquidación, no que se entregó ese dinero. **Anulado** identifica un registro excluido del cálculo. Los pagos mensuales no se reparten individualmente entre conceptos, pero los ingresos registrados junto con su pago sí conservan ese vínculo.

Las cuatro tarjetas de la ficha muestran sueldo base del periodo, todos los ingresos adicionales, descuentos reales y estimado del mes. Debajo se muestran adelantos entregados, otros pagos y saldo pendiente. Incluyen tipos personalizados y excluyen anulados. El estimado no es el saldo pendiente.

Compatibilidad: el tipo original `advance`, que antes se guardaba como descuento, se interpreta automáticamente como pago. No se borran ni duplican registros ni se cambia el saldo pendiente: el estimado y el ya pagado aumentan en el mismo importe de adelantos. Los registros antiguos sin método muestran No registrado; no se inventa un método de entrega.

Al completar el pago, sus movimientos quedan protegidos individualmente: muestran «Liquidado · protegido» y no se pueden anular. Sí puedes añadir bonos, comisiones u otros ingresos al mismo mes. Los nuevos importes pueden quedar pendientes o registrarse pagados, sin desbloquear ni alterar los anteriores. No se permiten nuevos descuentos o anticipos cuando no existe saldo pendiente.

La anulación de recibos separados sigue reservada para corregir un registro erróneo, con motivo y auditoría; no desbloquea movimientos previamente liquidados. Los pagos vinculados a un ingreso ya liquidado también están protegidos. Los registros pendientes que nunca fueron liquidados se pueden anular si la corrección no deja el total por debajo de lo pagado. Ver `docs/07-pagos-adicionales-tras-liquidar.md`.

Para cada periodo nuevo, **Preparar periodo** conserva el sueldo de las personas activas. También se conserva al registrar el primer movimiento/pago del periodo. Un periodo no preparado muestra una estimación con el sueldo vigente; los meses ya preparados mantienen su sueldo histórico.

## Verificación

Con Node instalado: `node scripts/verify.cjs`. Comprueba sintaxis, recursos, reglas financieras, permisos, persistencia, copias y operaciones del servidor usando bases temporales; no modifica tus datos reales. No sustituye la revisión visual en un navegador real. Sigue `tests/manual-checklist.md` para la comprobación visual y móvil.
