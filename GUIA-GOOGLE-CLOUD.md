# Conectar la app con tu cuenta de YouTube (una sola vez, ~10 min)

Esto lo haces tú, con tu cuenta de Google (la misma de YouTube). Al final te queda un archivo `.json`: es la "llave" de TU app y se queda solo en tu PC.

## 1. Crear el proyecto
1. Abre **https://console.cloud.google.com** e inicia sesión.
2. Arriba a la izquierda, en el selector de proyecto, haz clic en **Proyecto nuevo**.
3. Nombre: `Reproductor Jaider` y luego **Crear**. Espera unos segundos y verifica que quede seleccionado arriba.

## 2. Activar la API de YouTube
1. Abre **https://console.cloud.google.com/apis/library/youtube.googleapis.com**.
2. Haz clic en **Habilitar**.

## 3. Pantalla de consentimiento (Google Auth Platform)
1. Abre **https://console.cloud.google.com/auth/overview** y haz clic en **Comenzar**.
2. Llénala así:
   - **Nombre de la app:** `Reproductor Jaider` (Google no deja usar "YouTube" en este nombre; solo se ve en la pantalla de permisos)
   - **Correo de asistencia:** tu correo
   - **Público:** **Externo**
   - **Información de contacto:** tu correo
3. Acepta la política y haz clic en **Crear**.
4. En el menú de la izquierda entra a **Público** y busca **Usuarios de prueba**. Haz clic en **+ Add users**, escribe tu correo y guarda.
5. **Recomendado:** en esa misma página, haz clic en **Publicar app** y confirma con **En producción**. Si la dejas en "Prueba", Google te cierra la sesión cada 7 días. No tienes que mandar nada a verificar: es una app solo para ti.

## 4. Crear la llave de la app de escritorio
1. Abre **https://console.cloud.google.com/auth/clients** y haz clic en **+ Crear cliente**.
2. **Tipo de aplicación:** **App de escritorio**. **Nombre:** `PC de Jaider`. Luego **Crear**.
3. En la ventana que sale, haz clic en **Descargar JSON**. Queda en Descargas como `client_secret_....json`.

Listo. Cuando abras la app, te pide ese archivo una sola vez: lo eliges y la app lo guarda cifrado en tu PC. Después borra el JSON de Descargas.

## Al iniciar sesión
- Google muestra **"Google no verificó esta app"**. Es normal, porque la app es tuya y no está publicada para otras personas. Haz clic en **Configuración avanzada** y luego en **Ir a Reproductor Jaider**.
- Marca los permisos que pide (ver tu cuenta de YouTube y administrar tus "me gusta" y suscripciones) y acepta.

## Ojo
- Nunca compartas ese `.json` ni le mandes foto. Tampoco escribas tu contraseña en otro lado que no sea la página de Google.
- La API tiene un cupo gratis diario: cada búsqueda gasta bastante y lo demás casi nada. Para uso normal alcanza de sobra.
