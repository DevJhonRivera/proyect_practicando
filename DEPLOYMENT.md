# Despliegue de Polarizados Ya

Arquitectura recomendada:

- Frontend: Vercel
- Backend: Render Web Service
- Base de datos: MongoDB Atlas

## 1. Seguridad antes de publicar

El archivo `Back/.env` aparecio en commits antiguos. Antes del despliegue:

1. Cambiar la contrasena del usuario de MongoDB Atlas.
2. Generar un `JWT_SECRET` nuevo de al menos 32 caracteres.
3. No reutilizar valores que hayan estado en Git.
4. Mantener `PUBLIC_REGISTRATION_ENABLED=false`.
5. Crear el primer superusuario directamente de forma controlada y cambiar su contrasena inicial.

## 2. Backend en Render

Crear un **Web Service** conectado al repositorio.

- Root Directory: `Back`
- Runtime: `Node`
- Build Command: `npm ci`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Variables de entorno:

```text
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=una-clave-nueva-larga-y-privada
CORS_ORIGIN=https://URL-DEL-FRONTEND.vercel.app
PUBLIC_REGISTRATION_ENABLED=false
```

No es necesario definir `PORT`; Render lo proporciona. Si la conexion de Atlas no soporta escrituras reintentables, conservar `retryWrites=false` en la URI.

Despues de desplegar, verificar:

```text
https://URL-DEL-BACKEND.onrender.com/api/health
```

Debe responder con `success: true` y `database: connected`.

## 3. Frontend en Vercel

Importar el mismo repositorio y configurar:

- Root Directory: `Front`
- Framework Preset: `Vite`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`

Variable de entorno:

```text
VITE_API_URL=https://URL-DEL-BACKEND.onrender.com/api
```

El archivo `Front/vercel.json` ya redirige las rutas de React hacia `index.html`.

## 4. MongoDB Atlas

1. Crear un usuario exclusivo para la aplicacion con acceso solo a su base de datos.
2. Autorizar la red desde la que se conecta Render.
3. Confirmar que la URI usa el nombre correcto de la base de datos.
4. Activar copias de seguridad segun el plan disponible.
5. Revisar periodicamente almacenamiento e indices.

## 5. Orden correcto del despliegue

1. Rotar credenciales de Atlas y JWT.
2. Subir los cambios pendientes a GitHub.
3. Desplegar el backend en Render.
4. Comprobar `/api/health`.
5. Configurar la URL de Render en `VITE_API_URL` de Vercel.
6. Desplegar el frontend.
7. Agregar la URL final de Vercel a `CORS_ORIGIN` en Render.
8. Reiniciar el backend si se cambio una variable.

## 6. Prueba minima posterior

- Iniciar sesion con cada rol.
- Crear una orden de prueba y completar el flujo hasta el pago.
- Registrar y descontar un corte.
- Verificar alertas por perfil.
- Abrir una factura e imprimirla.
- Subir y visualizar un comprobante.
- Confirmar expiracion y cierre de sesion.
- Probar escritorio y telefono.

## 7. Comandos de control

Antes de cada despliegue:

```text
cd Front
npm ci
npm run lint
npm run build

cd ../Back
npm ci
npm test
```

No publicar si la compilacion o las pruebas fallan. El lint actual tiene pendientes heredados que deben resolverse antes de convertirlo en una verificacion obligatoria del despliegue.
