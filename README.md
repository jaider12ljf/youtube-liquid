# youtube Liquid

YouTube para escritorio (Windows) con el estilo **Liquid Glass** de Apple: vidrio con refracción real, esquinas continuas, barras flotantes tipo cápsula y animaciones con resorte.

- Usa la **YouTube Data API v3** oficial (inicio de sesión con Google por OAuth) y el **reproductor oficial** de YouTube (IFrame). No hace scraping.
- Inicio (lo nuevo de tus suscripciones), Shorts, Suscripciones, Tú, Listas de reproducción, Videos que me gustan y búsqueda.
- Reproductor con controles de vidrio, ajustes de velocidad, subtítulos y repetición, y ventana flotante al salir del video.

Página de la app: https://jaider12ljf.github.io/youtube-liquid/ · [Política de privacidad](https://jaider12ljf.github.io/youtube-liquid/privacidad.html)

## Estructura

| Carpeta | Qué hay |
|---|---|
| `src/main.js`, `src/preload.js` | Proceso principal de Electron: ventana, servidor local de la interfaz, IPC |
| `src/auth.js` | OAuth de escritorio (loopback + PKCE); las llaves se guardan cifradas en el PC |
| `src/youtube.js` | Llamadas a la API de YouTube |
| `src/ui/` | Interfaz: `glass.js` (refracción), `spring.js` (resortes), `app.js`, estilos |
| `build/` | Ícono (logo de YouTube en Liquid Glass) |
| `maquetas/` | Las tres maquetas de diseño aprobadas |

## Compilar

```bash
npm install
npm start          # abrir en modo desarrollo
npm run dist       # crear el instalador en dist/
```

Para conectarla a una cuenta hace falta un cliente OAuth propio de tipo **App de escritorio**: ver [GUIA-GOOGLE-CLOUD.md](GUIA-GOOGLE-CLOUD.md). Las llaves nunca se suben al repositorio.

No es un producto de Google ni de YouTube.
