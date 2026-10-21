# nexflor_

Un sitio que cuida y enseña a las personas en el trabajo, para Flores El Trigal.

## Carpetas

- `frontend` — la página del taller
- `backend` — los cursos, el equipo, las cuentas y NEXFLOR ID
- `api` — la misma API cuando el sitio se publica

## Cómo abrirlo

1. Instala Node.js LTS.
2. En `backend`, ejecuta `npm install` y después `node src/server.js`.
3. En `frontend`, ejecuta `npm install` y después `npm run dev`.
4. Abre https://127.0.0.1:5173/entrar
5. El sitio publicado está en https://nexflor-fawn.vercel.app/entrar

La entrada es una sola cuenta de trabajador. Desde ahí se usa el taller, Academy y NEXFLOR ID.

Administrador: usuario `admin`, contraseña `Serrania2026`.
Atajo del panel: F2, luego E, luego Ctrl.
Personal de ingreso anterior: usuario `portero`, contraseña `Ingreso2026`.

## Reconocimiento facial

NEXFLOR ID está en el menú, dentro de la misma sesión. El navegador mide el rostro y el servidor decide si el ingreso queda permitido. Los reportes, las alertas y las aprobaciones están en Administración. El servidor rechaza esas consultas si la cuenta no es de administrador.

Las plantillas se cifran con `backend/data/face.key`, que se crea solo y no se sube a git. Copia ese archivo si mueves el proyecto, o las plantillas guardadas no se podrán leer. También puedes definir la variable `FACE_DATA_KEY` con 32 bytes en hexadecimal.

En este computador el motor nativo no arranca: Node.js 24 no tiene el binario de `@tensorflow/tfjs-node` y no hay Python para compilarlo. Para medirlo en el servidor, instala Node.js 20 LTS, entra a `backend` y ejecuta `npm install @tensorflow/tfjs-node`.

En el celular la cámara pide HTTPS. El sitio de desarrollo usa un certificado local: abre `https://` y la dirección de este computador en la red, y acepta el aviso del navegador.

No se guardan fotos. Una persona nueva queda pendiente hasta que el administrador la apruebe. Si la cámara no sirve, el administrador puede crear un código alternativo.
