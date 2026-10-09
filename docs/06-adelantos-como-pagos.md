# Adelantos como pagos inmediatos

Esta decisión reemplaza la interpretación inicial del adelanto como descuento.

## Cálculo

- Estimado = sueldo base del periodo + comisiones, bonos y otros ingresos adicionales − descuentos reales.
- Ya pagado = adelantos entregados + otros pagos no anulados.
- Saldo pendiente = estimado − ya pagado.

Registrar una comisión o bono reconoce un importe pendiente, sin salida de dinero. Registrar un descuento reduce el importe a pagar, sin salida de dinero. Registrar un adelanto confirma dinero ya entregado y exige un método de entrega activo. No se puede superar el saldo pendiente. La interfaz advierte que no debe registrarse de nuevo como pago.

Ampliación en decisión 07: comisiones y bonos también pueden registrarse junto con su pago, incluso después de liquidar el mes, eligiendo «Sí, registrar ingreso y pago juntos».

Ejemplo: sueldo 1000, bono 200, descuento 100, adelanto 300 y otro pago 200. Estimado 1100, ya pagado 500, saldo 600.

## Registro único e historial

Los adelantos siguen teniendo su registro original en `movements`. `paymentEntries` combina pagos con adelantos para consultar Historial y calcular Ya pagado. Cada fila conserva su colección de origen para consultar y anular el registro correcto. No se crean recibos duplicados en `payments`.

Los tipos de movimiento permiten las naturalezas `income`, `deduction` y `advance`. El tipo original con id `advance` se clasifica como pago por compatibilidad, aunque los datos guardados antes de este cambio todavía tengan naturaleza `deduction`. No se modifican ni reinician registros guardados. Otros tipos de descuento, como Préstamo, conservan su interpretación anterior; no se reclasifican automáticamente.

Al reclasificar un adelanto antiguo, el estimado y el ya pagado aumentan en el mismo importe: el saldo pendiente no cambia. Si un adelanto antiguo no tiene método, se muestra No registrado en el historial. No se presume que pagos separados existentes correspondan al mismo adelanto: los registros son independientes, salvo su origen explícito.

## Estados y correcciones

Los adelantos no anulados muestran Pagado inmediatamente en Movimientos. Los ingresos y descuentos se mantienen Vigentes hasta completar el pago de su persona/periodo. Historial mantiene Vigente/Anulado como estado del recibo.

Anular un adelanto de un mes aún abierto disminuye Ya pagado y aumenta el saldo, sin cambiar el estimado. Se conserva motivo y auditoría. Al liquidar el mes, el adelanto queda protegido contra anulación tanto desde Movimientos como desde Historial. Las mismas validaciones se repiten en el servicio al guardar. Corregir un pago separado erróneo mantiene el mecanismo anterior con motivo.

La marca de liquidación se conserva por registro: abrir un saldo nuevo con ingresos adicionales no desbloquea los movimientos previamente liquidados. Un adelanto anterior ya liquidado sigue protegido aunque el mes vuelva a tener saldo.

## Presentación

- Pagos: las tarjetas separan estimado, dinero ya pagado y saldo pendiente; la nota de Ya pagado explica que incluye adelantos.
- Resumen: descuentos y adelantos pagados tienen columnas distintas. Ya pagado total incluye los adelantos, no se suman otra vez.
- Ficha: tarjetas de sueldo base, ingresos adicionales, descuentos reales y estimado. Debajo, adelantos entregados, otros pagos y saldo.
- Detalle: descuentos reales separados de pagos realizados, incluidos adelantos.
- Inicio: el adelanto se identifica como dinero entregado, no como ingreso adicional ni descuento.

## Verificación

Las pruebas cubren compatibilidad sin modificación de registros, saldo conservado, adelantos con método, límite de saldo, historial sin duplicados, tipos personalizados, anulaciones, permisos y protección del mes liquidado. El entorno de pruebas usa un almacén aislado; no altera los datos del navegador del usuario. La revisión visual se realiza manualmente.
