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

Administrador: usuario `admin`, contraseña `Serrania2026`.
Atajo del panel: F2, luego E, luego Ctrl.
Personal de escaneo: usuario `portero`, contraseña `Ingreso2026`. Esa cuenta entra en Acceso y no ve reportes.

## Reconocimiento facial

La sección está en el menú Acceso, dentro del mismo sitio. Quien escanea inicia sesión con la cuenta de personal. Los reportes, las alertas y las aprobaciones están en Administración → Asistencia, y el servidor rechaza esas consultas si la cuenta no es de administrador.

La comparación y la decisión de acceso están en el servidor. Las plantillas se cifran con `backend/data/face.key`, que se crea solo y no se sube a git. Copia ese archivo si mueves el proyecto, o las plantillas guardadas no se podrán leer. También puedes definir la variable `FACE_DATA_KEY` con 32 bytes en hexadecimal.

En este computador el motor nativo no arranca: Node.js 24 no tiene el binario de `@tensorflow/tfjs-node` y no hay Python para compilarlo. El navegador mide el rostro y el servidor decide si entra. Para medirlo en el servidor, instala Node.js 20 LTS, entra a `backend` y ejecuta `npm install @tensorflow/tfjs-node`. Si prefieres un servicio externo, Amazon Rekognition (`CompareFaces`) es la opción práctica; no dejes las llaves dentro del código.

En el celular la cámara pide HTTPS. El sitio de desarrollo usa un certificado local: abre `https://` y la dirección de este computador en la red, y acepta el aviso del navegador. En este mismo computador, `https://127.0.0.1:5173` también sirve.

No se guardan fotos. Una persona nueva queda pendiente hasta que el administrador la apruebe. Si la cámara no sirve, el administrador puede crear un código alternativo.
