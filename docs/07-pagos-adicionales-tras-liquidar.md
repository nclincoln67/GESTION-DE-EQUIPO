# Ingresos y pagos adicionales después de liquidar

Esta decisión permite incorporar nuevos conceptos a un mes ya pagado sin modificar los registros liquidados. Sustituye el bloqueo global de nuevos ingresos y el desbloqueo de movimientos al aparecer saldo pendiente.

## Registro

En Registrar movimiento, los tipos de ingreso (bono, comisión, día trabajado y otros) ofrecen «¿Este ingreso ya se pagó?»:

- No: crea un nuevo movimiento pendiente. Estimado aumenta y Ya pagado se conserva; el saldo nuevo corresponde al ingreso añadido.
- Sí: crea el movimiento y un único pago asociado en la misma transacción. Exige método activo y admite referencia. Estimado y Ya pagado aumentan por igual; no absorbe otros pendientes del mes. El nuevo movimiento queda liquidado y protegido.

Registrar pago de una persona sin saldo abre este flujo con un ingreso activo y la opción Sí seleccionada. El detalle mantiene Agregar ingreso / movimiento disponible, incluso cuando el saldo es cero. Un trabajador eliminado no puede generar nuevos ingresos; se conserva la regla de completar saldos preparados.

Los tipos Pago inmediato siguen siendo anticipos de un saldo existente: no aumentan el estimado y no pueden exceder el saldo. Para un bono que aumenta lo que corresponde cobrar y ya se entregó, se elige el tipo Bono y la opción Sí, no un anticipo sin saldo.

## Protección

`sealMovements` guarda `settledAt` en cada movimiento no anulado al liquidar el mes. Antes de añadir ingresos nuevos, se sella la liquidación anterior, incluida la de los datos antiguos sin marca. La protección es por registro y no desaparece aunque aparezca un saldo nuevo en ese mes. Solo se añaden metadatos; no se cambian importes ni conceptos de los registros anteriores.

Un movimiento liquidado muestra Pagado y Liquidado · protegido. Un ingreso pendiente nuevo muestra Vigente y puede anularse mientras no se liquide, sujeto a los límites de lo ya pagado. Completar su pago sella ese nuevo movimiento. Un ingreso registrado y pagado juntos queda protegido de inmediato, incluso si hay otros conceptos pendientes. Su recibo asociado tampoco se puede anular por separado.

Los recibos separados conservan el mecanismo existente de corrección con motivo y auditoría. Corregirlos puede cambiar el saldo, pero no desbloquea movimientos previamente liquidados.

## Integridad y permisos

Ingreso y pago asociado se crean atómicamente con IDs vinculados (`paymentId` y `movementId`), misma persona, periodo, fecha y monto, y auditoría de ambos. Si falla el almacenamiento no se guarda ninguno. Los pagos nuevos no cambian los recibos anteriores. Los visitantes no pueden registrar, pagar ni anular; el historial continúa filtrado por perfil.

Las fórmulas se mantienen: estimado = sueldo + ingresos − descuentos, ya pagado = adelantos + otros pagos, saldo = estimado − ya pagado. No hay un segundo sueldo ni pagos duplicados al añadir un extra.

## Ejemplo

Mes liquidado por 1200. Se agrega bono pendiente de 80: estimado 1280, ya pagado 1200, saldo 80. Los movimientos originales siguen protegidos. Se agrega otro bono ya entregado de 20: estimado 1300, ya pagado 1220, saldo 80. Pagar los 80 pendientes liquida esos nuevos conceptos, sin cambiar los recibos anteriores.
