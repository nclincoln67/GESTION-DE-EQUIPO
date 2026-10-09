# Eliminación de Equipo y Configuración

Esta revisión sustituye la decisión inicial de permitir solo desactivación de empleados. Se implementa la solicitud de eliminar en Equipo y en todos los catálogos de Configuración.

## Comportamiento

- Trabajadores: Eliminar en la tabla y ficha. Se retiran de Equipo y de nuevos formularios; se desactivan visitantes vinculados. El historial de pagos, movimientos y asistencia sigue consultable por administradores.
- Usuarios: Eliminar en la tabla. No pueden iniciar sesión y conservan su autoría en registros históricos.
- Tipos de movimiento, métodos, cargos y horarios: se retiran del catálogo disponible para nuevos registros, conservando referencias existentes.
- Feriados: se retiran de Configuración, Inicio y calendario.
- Pagos y movimientos mantienen anulación con motivo; no se borran como efecto de eliminar una persona o catálogo.

## Implementación

Eliminación lógica mediante `deletedAt`, `deletedBy` y `active=false`. No cambia la versión del esquema; los datos antiguos sin estos campos siguen funcionando. Cada operación usa una transacción del repositorio, guarda un registro de auditoría y comprueba permisos de administrador.

La interfaz muestra confirmación con el nombre y los efectos antes de modificar datos. El botón de confirmación es rojo y la notificación posterior indica qué se eliminó. Abrir o cancelar la confirmación no modifica datos.

Se conserva Desactivar/Activar, separado de Eliminar. Los eliminados no se pueden reactivar desde la interfaz. Eliminar una cuenta no está permitido para la sesión propia ni para el último administrador activo.

Un trabajador eliminado conserva pendientes de periodos preparados y puede recibir sus pagos de cierre. No puede generar un nuevo periodo o nuevos movimientos/eventos. No hay eliminación en cascada de registros financieros.

Los catálogos referenciados siguen existiendo internamente. Una ficha que ya usa un cargo u horario eliminado conserva el dato y lo identifica como eliminado al editar; estos valores no se ofrecen al agregar otro trabajador.

## Verificación

`node tests/smoke.cjs` verifica arranque, permisos, cálculos, confirmaciones, eliminación mediante formularios, acceso de cuentas, conservación de referencias y persistencia. Las pruebas usan almacenamiento aislado y no eliminan datos del navegador del usuario.
