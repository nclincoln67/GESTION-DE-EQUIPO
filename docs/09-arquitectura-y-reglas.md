# Arquitectura y contrato funcional

## Responsabilidades

- `assets/css/`: identidad, disposición, componentes, adaptación móvil y acabado visual. `finish.css` complementa el diseño existente sin alterar cálculos.
- `assets/js/modules/`: pantallas de inicio, equipo, pagos, asistencia y configuración.
- `assets/js/components/ui.js`: formularios, confirmaciones, bloqueo de doble envío y estados de guardado.
- `assets/js/data/server-adapter.js`: solicitudes al servidor, datos autorizados y revisión de concurrencia. No almacena contraseñas ni datos reales en localStorage.
- `assets/js/services/`: reglas existentes de registros y pagos. El servidor ejecuta los mismos servicios, con su propia identidad y autorización; nunca confía en los resultados calculados por el navegador.
- `server/index.cjs`: rutas, sesiones, restricciones de origen y archivos públicos permitidos.
- `server/commands.cjs`: lista cerrada de operaciones y campos admitidos.
- `server/domain.cjs`: ejecución aislada de servicios y filtrado por perfil.
- `server/security.cjs`: verificadores de contraseña y tokens de sesión.
- `server/setup.cjs`: instalación vacía e importación exclusiva de catálogos.
- `server/store.cjs`: SQLite, transacciones, revisión y respaldos.
- `tests/`: pruebas aisladas de reglas y servidor. `scripts/verify.cjs` ejecuta ambas suites.

No hay dependencias externas ni compilación. Node.js aporta SQLite y criptografía. SQLite conserva registros JSON por colección y una revisión global; es una base sencilla para un equipo pequeño, no un diseño de múltiples servidores escritores. Las operaciones se guardan de forma atómica. La sesión dura ocho horas y requiere volver a iniciar sesión al caducar.

## Reglas que una mejora visual no debe cambiar

1. Estimado = sueldo conservado para el periodo + ingresos vigentes − descuentos reales.
2. Ya pagado = pagos inmediatos (incluidos adelantos) + recibos vigentes; cada entrega cuenta una sola vez.
3. Saldo pendiente = estimado − ya pagado. Un adelanto no reduce el estimado.
4. Comisiones, bonos y otros ingresos pueden quedar pendientes o registrarse con su pago asociado.
5. Los movimientos liquidados quedan protegidos individualmente: no se anulan, modifican ni eliminan.
6. Se permiten nuevos ingresos después de liquidar el periodo; no modifican recibos anteriores ni desbloquean movimientos antiguos.
7. Un ingreso pagado y su recibo asociado se guardan juntos o no se guarda ninguno.
8. Eliminar trabajadores o catálogos conserva referencias del historial. Los visitantes vinculados a un trabajador eliminado pierden acceso.
9. Puede haber varios administradores. No se elimina o desactiva la cuenta actual ni se deja el sistema sin administrador activo.
10. Cada visitante solo recibe datos de su propio perfil y no puede realizar operaciones administrativas.

Los documentos 01–07 conservan las decisiones históricas del prototipo. Para operación actual prevalecen README y los documentos 08–09. Cualquier modificación financiera futura debe indicarse expresamente, acompañarse de una prueba de regresión y, cuando altere lo acordado, confirmarse con el usuario.
