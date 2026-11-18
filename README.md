# nexflor_

Un sitio que cuida y enseña a las personas en el trabajo.

## Carpetas

- `frontend` — la página del taller
- `backend` — los cursos, el equipo y el administrador

El panel lateral agrupa sus accesos en **Taller**, **Seguimiento** y **Herramientas**. Las cuentas creadas desde el acceso al taller aparecen en Administración → Equipo con su ID y avance detallado por curso.

## Cómo abrirlo

1. Instala Node.js LTS.
2. En `backend`, ejecuta `npm install` y después `node src/server.js`.
3. En `frontend`, ejecuta `npm install` y después `npm run dev`.
4. Abre https://127.0.0.1:5173
5. El escáner publicado queda en https://nexflor.vercel.app/entrar

El administrador crea las cuentas de escaneo desde Administración → Asistencia. No guardes contraseñas en este archivo ni publiques credenciales de prueba.

## Reconocimiento facial

La sección **Nexflor ID** requiere iniciar sesión con una cuenta de escaneo. Los reportes, las alertas, las aprobaciones y la creación de esas cuentas están en Administración → Asistencia, solo para administradores. Los registros nuevos se guardan en la base compartida y aparecen pendientes de aprobación.

La comparación y la decisión de acceso están en el servidor. Las plantillas se cifran con `backend/data/face.key`, que se crea solo y no se sube a git. Copia ese archivo si mueves el proyecto, o las plantillas guardadas no se podrán leer. En producción, define `FACE_DATA_KEY` con 32 bytes en hexadecimal.

Los modelos necesarios están en `frontend/public/models` y Vite los incluye en el build. Si el motor del servidor no arranca, la interfaz mide el rostro en el navegador y el servidor compara la plantilla, verifica la aprobación y registra el ingreso. La disponibilidad depende de que los modelos permanezcan en el despliegue.

En el celular la cámara pide HTTPS. El sitio de desarrollo usa un certificado local: abre `https://` y la dirección de este computador en la red, y acepta el aviso del navegador. En este mismo computador, `https://127.0.0.1:5173` también sirve.

No se guardan fotos. Una persona nueva queda pendiente hasta que el administrador la apruebe. Si la cámara no sirve, el administrador puede crear un código alternativo.

## Nexflor Posture

La sección está en el menú **Nexflor Posture** y, por ahora, ofrece una simulación educativa de alerta sonora. No abre la cámara ni detecta postura real; no debe usarse como monitoreo o diagnóstico médico.

## Preparación para producción

El desarrollo local conserva `backend/data/db.json`. En Vercel, configura una base MySQL administrada antes de desplegar; Railway es una opción sencilla. Si Vercel se conecta desde fuera de Railway, usa la URL de conexión pública/TCP, no el hostname privado de Railway.

### Despliegue del proyecto completo en Vercel

Importa el repositorio y deja **Root Directory** en la raíz del repositorio (no en `frontend/`), para que Vercel incluya la función `api/[...path].js` junto con la aplicación. La configuración raíz `vercel.json` selecciona Vite, instala las dependencias de `frontend/` y `backend/`, construye Vite y publica `frontend/dist`; la reescritura SPA excluye `/api/` para que las solicitudes de backend lleguen a la función y no reciban `index.html` con un falso 200. No agregues otro servicio a `vercel.json`.

Configura en el proyecto de Vercel las variables de backend descritas abajo. Como la función y el frontend comparten dominio, `VITE_API_URL` puede quedar sin configurar. Si alojas el backend en otro dominio, establece `VITE_API_URL` al origen HTTPS del backend (sin `/api` al final) y habilita ese origen en CORS.

Para comprobar el mismo build localmente, ejecuta `npm ci --prefix frontend` y `npm run build --prefix frontend`. El directorio que debe existir al terminar es `frontend/dist`.

Guarda en el entorno de producción del backend estos secretos, nunca en el repositorio:

- `MYSQL_URL`: URL MySQL pública del proveedor, por ejemplo `mysql://usuario:contraseña@host:puerto/base`. Codifica caracteres reservados de usuario/contraseña como `%40` para `@`.
- `MYSQL_SSL_CA` (opcional): certificado CA PEM entregado por el proveedor de MySQL, si su certificado no encadena con las CA de confianza de Node.js. El backend siempre valida el certificado del servidor cuando TLS está activo; no configures una CA obtenida de una fuente no confiable ni desactives la verificación para producción.
- `MYSQL_SSL_ALLOW_SELF_SIGNED` (temporal y no recomendado): configúralo en `true` solo si aceptas que MySQL use TLS sin validar la identidad del servidor. El tráfico sigue cifrado, pero una conexión interceptada podría hacerse pasar por la base. Retíralo al configurar `MYSQL_SSL_CA` oficial.
- `SESSION_SECRET`: cadena aleatoria de al menos 32 bytes. Puedes generarla con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `INITIAL_ADMIN_PASSWORD`: contraseña nueva y fuerte de al menos 16 caracteres. Se aplica a las cuentas de administrador una sola vez cuando se crea por primera vez la base Nexflor.
- `ADMIN_PASSWORD_RESET_ID`: solo para restablecer la cuenta existente de Camilo. Define un identificador nuevo (8–100 caracteres) junto con `INITIAL_ADMIN_PASSWORD`; la primera solicitud válida guarda el nuevo hash una sola vez. Después elimina esta variable de Vercel. El identificador aplicado queda registrado en MySQL para impedir que el mismo restablecimiento se repita.
- `FACE_DATA_KEY`: llave aleatoria hexadecimal de 32 bytes, generada con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Guárdala de forma permanente: sin ella no se pueden leer plantillas faciales cifradas.

El primer acceso con MySQL crea la tabla `nexflor_state` e inicializa su contenido con los datos incluidos en `backend/data/db.json`. Los cambios de cursos, progreso, equipo, cuentas y asistencia se guardan en MySQL; las imágenes administrativas también se conservan allí. No borres la base MySQL: contiene los datos activos de la plataforma.

**No publiques hasta crear la base y cargar los cuatro secretos en el servicio de backend de Vercel.** Este adaptador mantiene el modelo JSON existente dentro de una transacción MySQL para evitar perder escrituras simultáneas; es apropiado para un sitio de bajo tráfico. Para crecer a muchos usuarios simultáneos, el siguiente paso sería normalizar los datos en tablas relacionales.

Para probar la cámara en desarrollo puedes usar el HTTPS local que ya activa Vite, o iniciar el frontend en HTTP sobre `localhost` con `NEXFLOR_HTTPS=0`.
