# Gestión de Equipo — Arquitectura local y preparación para servidor

## 1. Objetivo de la organización

La aplicación se construirá inicialmente para funcionar de forma local, pero separando desde el principio:

- Interfaz.
- Lógica de negocio.
- Acceso a datos.
- Autenticación y permisos.
- Datos de demostración.
- Documentación.

De esta manera, al publicar el sistema, se sustituirá el almacenamiento local por una API y una base de datos sin rehacer todas las pantallas.

---

## 2. Estructura durante la etapa local

```text
GESTION-DE-EQUIPO/
│
├── index.html
├── README.md
│
├── assets/
│   ├── css/
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── pages.css
│   │   └── responsive.css
│   │
│   ├── js/
│   │   ├── app.js
│   │   ├── config.js
│   │   │
│   │   ├── core/
│   │   │   ├── router.js
│   │   │   ├── session.js
│   │   │   ├── permissions.js
│   │   │   ├── events.js
│   │   │   └── validators.js
│   │   │
│   │   ├── data/
│   │   │   ├── repository.js
│   │   │   ├── local-storage-repository.js
│   │   │   ├── api-repository.js
│   │   │   └── demo-data.js
│   │   │
│   │   ├── services/
│   │   │   ├── auth-service.js
│   │   │   ├── employee-service.js
│   │   │   ├── payment-service.js
│   │   │   ├── attendance-service.js
│   │   │   └── settings-service.js
│   │   │
│   │   ├── modules/
│   │   │   ├── login/
│   │   │   ├── home/
│   │   │   ├── team/
│   │   │   ├── payments/
│   │   │   ├── attendance/
│   │   │   └── settings/
│   │   │
│   │   ├── components/
│   │   │   ├── modal.js
│   │   │   ├── table.js
│   │   │   ├── form.js
│   │   │   ├── toast.js
│   │   │   └── confirmation.js
│   │   │
│   │   └── utils/
│   │       ├── dates.js
│   │       ├── currency.js
│   │       ├── ids.js
│   │       └── text.js
│   │
│   ├── icons/
│   └── images/
│
├── docs/
│   ├── 01-plan-funcional.md
│   ├── 02-arquitectura-local-y-futura.md
│   ├── 03-modelo-de-datos.md
│   └── 04-reglas-de-negocio.md
│
└── tests/
    ├── manual-checklist.md
    └── sample-data-checks.md
```

No se crearán todos los archivos vacíos de inmediato. Cada archivo se incorporará cuando tenga una función real para evitar una estructura innecesariamente grande.

---

## 3. Responsabilidad de cada parte

### `index.html`

Único punto de entrada de la aplicación local. Contendrá la estructura base y cargará los estilos y scripts en el orden correcto.

### `assets/css/`

Separa las reglas visuales por responsabilidad:

- `variables.css`: colores, espaciado, tipografía y tamaños.
- `base.css`: estilos generales y accesibilidad.
- `layout.css`: barra lateral, cabecera y contenido.
- `components.css`: botones, tablas, formularios, modales y alertas.
- `pages.css`: particularidades de cada módulo.
- `responsive.css`: adaptación a celular y tableta.

### `assets/js/core/`

Contiene la infraestructura común de la aplicación:

- Navegación sin recargar la página.
- Sesión actual.
- Comprobación de permisos.
- Validaciones.
- Comunicación entre componentes.

### `assets/js/data/`

Es la capa más importante para la migración futura.

Las pantallas nunca accederán directamente a `localStorage`. Utilizarán una interfaz común llamada repositorio.

```text
Pantallas → Servicios → Repositorio → localStorage
```

En el servidor se cambiará únicamente el último tramo:

```text
Pantallas → Servicios → Repositorio → API → Base de datos
```

- `local-storage-repository.js`: usado durante el prototipo local.
- `api-repository.js`: reservado para conectarse al servidor posteriormente.
- `demo-data.js`: información ficticia para pruebas y presentación.

### `assets/js/services/`

Contiene las reglas funcionales, por ejemplo:

- Calcular un pago mensual.
- Registrar un pago parcial.
- Anular un movimiento.
- Desactivar un empleado.
- Relacionar asistencia con un movimiento.

La interfaz solo solicita la acción; no contiene las reglas de negocio.

### `assets/js/modules/`

Agrupa las pantallas de los cinco módulos y el acceso:

- Login.
- Inicio.
- Equipo.
- Pagos.
- Asistencia.
- Configuración.

Cada carpeta puede contener su vista, controlador y plantilla cuando sea necesario.

### `assets/js/components/`

Elementos reutilizables para evitar duplicaciones: modales, tablas, formularios, mensajes y confirmaciones.

### `docs/`

Documentación funcional y técnica numerada en el orden en que se define el proyecto.

### `tests/`

Listas de comprobación manual para validar flujos importantes sin introducir todavía una infraestructura de pruebas compleja.

---

## 4. Usuarios y permisos

Existirán dos roles:

### Administrador

Puede:

- Ver todos los módulos y datos.
- Crear y editar empleados.
- Activar o desactivar empleados.
- Registrar y anular movimientos.
- Registrar y anular pagos.
- Registrar y editar asistencia.
- Administrar configuraciones.
- Administrar usuarios cuando exista backend.

### Visitante

Propuesta inicial: acceso de solo lectura.

Puede:

- Iniciar sesión.
- Ver Inicio.
- Consultar la lista de Equipo.
- Consultar perfiles autorizados.
- Consultar resúmenes de Pagos autorizados.
- Consultar Asistencia autorizada.

No puede:

- Crear o editar información.
- Registrar pagos o movimientos.
- Anular registros.
- Ver Configuración.
- Administrar usuarios.

### Decisión confirmada sobre privacidad

El usuario confirmó la modalidad personal:

**Visitante personal:** cada usuario solo puede ver su propio perfil, pagos y asistencia. Puede haber uno o más administradores.

Esta decisión se aplica a las pantallas y a los servicios del prototipo local. Se verificará nuevamente en el backend cuando se publique.

---

## 5. Autenticación durante la etapa local

En el prototipo local se podrá simular el inicio de sesión con usuarios ficticios guardados en el navegador.

Esto permite probar:

- Pantalla de acceso.
- Inicio y cierre de sesión.
- Navegación según el rol.
- Ocultamiento de acciones administrativas.

### Limitación importante

Una contraseña incluida en archivos JavaScript o guardada en `localStorage` puede ser vista o modificada por cualquier persona con acceso al dispositivo. Por lo tanto:

- No se utilizarán contraseñas reales.
- No se considerará seguridad auténtica.
- No se almacenarán datos sensibles reales mientras la aplicación sea exclusivamente local.
- Ocultar botones según el rol será una demostración funcional, no una protección real.

---

## 6. Estructura futura al publicar en un servidor

Cuando se decida publicar, el proyecto podrá evolucionar así:

```text
GESTION-DE-EQUIPO/
│
├── frontend/
│   ├── index.html
│   └── assets/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   └── security/
│   ├── package.json
│   └── .env.example
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema/
│
├── docs/
├── tests/
└── README.md
```

### Frontend

Seguirá mostrando las mismas pantallas. `api-repository.js` reemplazará al repositorio de almacenamiento local.

### Backend

Se encargará de:

- Validar usuarios y contraseñas.
- Crear sesiones seguras.
- Aplicar permisos en el servidor.
- Validar toda modificación.
- Ejecutar reglas de negocio críticas.
- Registrar auditoría.
- Entregar y guardar datos mediante una API.

### Base de datos

Guardará de forma centralizada:

- Usuarios.
- Empleados.
- Periodos de pago.
- Movimientos.
- Pagos.
- Eventos de asistencia.
- Configuraciones.
- Historial de cambios y anulaciones.

### Contraseñas en el servidor

- Nunca se guardarán como texto visible.
- Se almacenarán mediante hash seguro.
- La autorización se comprobará en cada solicitud.
- El rol no dependerá de información modificable desde el navegador.

---

## 7. Qué se conserva al migrar

Se conservarán casi sin cambios:

- Diseño visual.
- Pantallas.
- Formularios.
- Navegación.
- Componentes reutilizables.
- Validaciones de experiencia de usuario.
- Nombres y estructura de los módulos.
- Servicios que no dependan del almacenamiento.

Se reemplazarán o reforzarán:

- `localStorage` por API y base de datos.
- Login simulado por autenticación real.
- Permisos visuales por permisos verificados en el servidor.
- Datos ficticios por datos centralizados.
- Identificadores locales por identificadores de base de datos.

---

## 8. Flujo de datos por etapas

### Prototipo local

```text
Usuario
  ↓
Interfaz HTML/CSS/JavaScript
  ↓
Servicios y reglas
  ↓
Repositorio local
  ↓
localStorage del navegador
```

Los datos existirán únicamente en el navegador y dispositivo donde se registren.

### Aplicación publicada

```text
Usuarios desde computadora o celular
  ↓ HTTPS
Frontend publicado
  ↓ API segura
Backend
  ↓
Base de datos centralizada
```

Todos los usuarios autorizados verán los mismos datos actualizados.

---

## 9. Estrategia de trabajo propuesta

### Etapa 1 — Definición funcional

- Revisar y aprobar módulos, pantallas, campos y flujos.
- Resolver el alcance exacto del Visitante.

### Etapa 2 — Modelo de datos y reglas

- Definir entidades y relaciones.
- Definir estados y cálculos.
- Definir permisos por acción.

### Etapa 3 — Prototipo visual local

- Crear navegación.
- Construir las pantallas con datos ficticios.
- Validar diseño en computadora y celular.

### Etapa 4 — Funcionalidad local

- Añadir formularios y cálculos.
- Añadir almacenamiento local.
- Simular autenticación y roles.
- Probar flujos completos.

### Etapa 5 — Preparación para publicación

- Elegir tecnología de backend y base de datos.
- Crear API y autenticación real.
- Migrar los datos locales necesarios.
- Aplicar seguridad, copias de respaldo y auditoría.

### Etapa 6 — Publicación

- Configurar dominio y HTTPS.
- Publicar frontend y backend.
- Crear base de datos.
- Crear usuarios reales.
- Validar acceso desde computadora y celular.

---

## 10. Decisiones que deben tomarse antes de programar

1. Confirmar si Visitante verá todo en modo lectura o únicamente sus propios datos.
2. Confirmar si el prototipo local necesita login desde la primera pantalla o puede incorporarse después del diseño principal.
3. Confirmar si los datos locales serán únicamente ficticios durante el prototipo.

La recomendación es:

- Visitante personal si representa a un empleado.
- Login simulado desde la primera versión para validar la navegación por roles.
- Datos exclusivamente ficticios hasta contar con backend y autenticación real.
