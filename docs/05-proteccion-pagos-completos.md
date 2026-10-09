# Protección de movimientos al completar el pago

## Regla confirmada

Los movimientos liquidados no se pueden anular. Un nuevo bono o comisión en ese mes no desbloquea los anteriores. Las anulaciones siguen disponibles solo para registros que nunca se liquidaron y cumplen las validaciones de saldo. La decisión 07 amplía esta regla para permitir pagos adicionales.

Cuando hay pagos mayores que cero y saldo pendiente menor o igual a cero, se conserva una marca `settledAt` en cada movimiento no anulado. Esa marca no se elimina al añadir ingresos nuevos. Los meses antiguos sin marca se reconocen por su cálculo y se sellan antes de incorporar extras. Un periodo sin pagos no se liquida solo porque su estimado sea cero.

## Aplicación

- La tabla de movimientos sustituye Anular por «Liquidado · protegido».
- Se aplica también en adelantos/comisiones de la ficha, porque reutilizan la misma tabla.
- El servicio valida nuevamente al guardar, incluso si la confirmación estaba abierta antes de registrar el pago final.
- Se permiten ingresos adicionales después de liquidar, pendientes o junto con su pago. Los anteriores siguen protegidos. Sin saldo pendiente no se permiten descuentos ni anticipos nuevos.
- En un pago parcial se impiden correcciones de ingresos o nuevos descuentos que dejen el total por debajo de lo ya pagado.
- El bloqueo se aplica al periodo del registro, no al mes seleccionado en pantalla.
- Los datos existentes quedan protegidos sin reiniciar el almacenamiento. Solo se añade la marca de protección necesaria; los importes, conceptos y recibos anteriores se conservan.

La corrección de un recibo separado erróneo mantiene motivo y auditoría, sin desbloquear movimientos anteriormente liquidados. Los pagos vinculados a un ingreso ya liquidado no se pueden anular por separado. No se agregaron descuentos automáticos ni deudas del empleado.

## Estado mostrado en Movimientos

- Un adelanto no anulado se muestra Pagado desde que se registra, porque es dinero entregado.
- Los otros movimientos nuevos se muestran Vigente mientras no estén liquidados; si se registran junto con su pago, se muestran Pagado inmediatamente.
- Al completar el pago, todos los movimientos no anulados de esa persona y ese periodo muestran Pagado, incluidos los descuentos ya aplicados.
- Un movimiento anulado siempre muestra Anulado, aunque se complete el pago del mes.
- Los pagos parciales mensuales no se reparten entre conceptos. El nuevo flujo de ingreso y pago juntos guarda un vínculo explícito entre ambos registros.
- El filtro de Movimientos y el detalle del registro usan la misma regla. El Historial de pagos mantiene sus estados Vigente/Anulado.
- El estado Pagado se calcula usando la marca de liquidación y el cálculo de compatibilidad. Internamente permanece `state: valid` para seguir formando parte del total del mes; no se cuenta dos veces.
- Añadir extras o corregir un recibo no reactiva ni desbloquea los movimientos liquidados, y los anulados conservan Anulado.

## Tarjetas de la ficha

Se muestran en orden de cálculo: sueldo base del periodo + ingresos adicionales − descuentos reales = estimado del mes. Los adelantos forman parte de Ya pagado, no de los descuentos. Los tipos `income` suman al estimado, los `deduction` restan y los `advance` son pagos inmediatos; el tipo original con id `advance` se interpreta como pago incluso en datos antiguos guardados con naturaleza `deduction`. Los anulados no cuentan. El sueldo base respeta la instantánea histórica del periodo. Ver decisión 06 para el cálculo y la compatibilidad.
