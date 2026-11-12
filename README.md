# nexflor_

Un sitio que cuida y enseña a las personas en el trabajo.

## Carpetas

- `frontend` — la página del taller
- `backend` — los cursos, el equipo y el administrador

## Cómo abrirlo

1. Instala Node.js LTS.
2. En `backend`, ejecuta `npm install` y después `node src/server.js`.
3. En `frontend`, ejecuta `npm install` y después `npm run dev`.
4. Abre https://127.0.0.1:5173
5. El escáner publicado queda en https://nexflor.vercel.app/entrar

El administrador crea las cuentas de escaneo desde Administración → Asistencia. No guardes contraseñas en este archivo ni publiques credenciales de prueba.

## Reconocimiento facial

La sección está en el menú Acceso, dentro del mismo sitio. Quien escanea inicia sesión con la cuenta de personal. Los reportes, las alertas y las aprobaciones están en Administración → Asistencia, y el servidor rechaza esas consultas si la cuenta no es de administrador.

La comparación y la decisión de acceso están en el servidor. Las plantillas se cifran con `backend/data/face.key`, que se crea solo y no se sube a git. Copia ese archivo si mueves el proyecto, o las plantillas guardadas no se podrán leer. También puedes definir la variable `FACE_DATA_KEY` con 32 bytes en hexadecimal.

En este computador el motor nativo no arranca: Node.js 24 no tiene el binario de `@tensorflow/tfjs-node` y no hay Python para compilarlo. El navegador mide el rostro y el servidor decide si entra. Para medirlo en el servidor, instala Node.js 20 LTS, entra a `backend` y ejecuta `npm install @tensorflow/tfjs-node`. Si prefieres un servicio externo, Amazon Rekognition (`CompareFaces`) es la opción práctica; no dejes las llaves dentro del código.

En el celular la cámara pide HTTPS. El sitio de desarrollo usa un certificado local: abre `https://` y la dirección de este computador en la red, y acepta el aviso del navegador. En este mismo computador, `https://127.0.0.1:5173` también sirve.

No se guardan fotos. Una persona nueva queda pendiente hasta que el administrador la apruebe. Si la cámara no sirve, el administrador puede crear un código alternativo.

## Nexflor Posture

La sección está en el menú **Nexflor Posture** y analiza la postura en el navegador con MediaPipe. La cámara requiere HTTPS o `localhost`; la vista frontal mide alineación lateral y la vista de perfil estima cabeza adelantada y tronco inclinado. Son señales preventivas, no diagnósticos médicos.

## Preparación para producción

El desarrollo local conserva `backend/data/db.json`. En Vercel, configura una base MySQL administrada antes de desplegar; Railway es una opción sencilla. Si Vercel se conecta desde fuera de Railway, usa la URL de conexión pública/TCP, no el hostname privado de Railway.

Guarda en el entorno de producción del backend estos secretos, nunca en el repositorio:

- `MYSQL_URL`: URL MySQL pública de Railway, por ejemplo `mysql://usuario:contraseña@host:puerto/base`.
- `SESSION_SECRET`: cadena aleatoria de al menos 32 bytes. Puedes generarla con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `INITIAL_ADMIN_PASSWORD`: contraseña nueva y fuerte de al menos 16 caracteres. Se aplica a las cuentas de administrador una sola vez cuando se crea por primera vez la base Nexflor.
- `FACE_DATA_KEY`: llave aleatoria hexadecimal de 32 bytes, generada con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Guárdala de forma permanente: sin ella no se pueden leer plantillas faciales cifradas.

El primer acceso con MySQL crea la tabla `nexflor_state` e inicializa su contenido con los datos incluidos en `backend/data/db.json`. Los cambios de cursos, progreso, equipo, cuentas y asistencia se guardan en MySQL; las imágenes administrativas también se conservan allí. No borres la base MySQL: contiene los datos activos de la plataforma.

**No publiques hasta crear la base y cargar los cuatro secretos en el servicio de backend de Vercel.** Este adaptador mantiene el modelo JSON existente dentro de una transacción MySQL para evitar perder escrituras simultáneas; es apropiado para un sitio de bajo tráfico. Para crecer a muchos usuarios simultáneos, el siguiente paso sería normalizar los datos en tablas relacionales.

Para probar la cámara en desarrollo puedes usar el HTTPS local que ya activa Vite, o iniciar el frontend en HTTP sobre `localhost` con `NEXFLOR_HTTPS=0`.
