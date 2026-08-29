# Scene Backup

Archivo personal de enlaces a ports, emuladores y apps (PC, PS Vita, Nintendo Switch, 3DS y cualquier plataforma que añadas más adelante). Sitio 100% estático, sin dependencias ni build: solo HTML, CSS y JS.

## Cómo añadir un elemento nuevo (lo único que tendrás que hacer normalmente)

Todo el contenido vive en **`data/games.json`**. Para subir algo nuevo:

1. Abre `data/games.json` en GitHub (botón del lápiz ✏️ para editar directamente desde el navegador, sin necesidad de clonar nada).
2. Copia uno de los bloques existentes y pégalo, con una coma antes, dentro de los corchetes `[ ]`.
3. Rellena los campos:

```json
{
  "title": "Nombre del elemento",
  "category": "Port",
  "platform": "Switch",
  "cover": "assets/covers/mi-captura.png",
  "version": "1.0.0",
  "releaseDate": "2026-08-23",
  "description": "Una frase corta sobre esto.",
  "downloadUrl": "https://enlace-a-tu-release",
  "sourceUrl": "https://enlace-al-repo-original (opcional, se puede dejar vacío)"
}
```

4. Haz commit. GitHub Pages reconstruye el sitio solo, en uno o dos minutos verás el elemento en la web.

**Notas sobre `category` y `platform`:**
- Son dos filtros independientes y ambos son **texto libre** — no hay una lista cerrada que mantener. Escribe lo que quieras y el filtro correspondiente aparece solo.
- `category` ahora mismo se usa con tres valores: `"Port"`, `"Emulador"` y `"App"`, cada uno con su icono (🎮 🕹️ 🧩). Si escribes una categoría distinta (por ejemplo `"Herramienta"` o `"Plugin"`), aparecerá como una pestaña nueva en el filtro **Tipo** automáticamente, con un icono genérico 📦 por defecto.
- `platform` puede ser cualquier texto ("PC", "Vita", "Switch", "3DS", "Wii U", "Deck"...). El filtro **Sistema** se recalcula según la categoría activa, así nunca ves un filtro que daría cero resultados. `PC`, `VITA`, `Switch` y `3DS` ya tienen un color propio asignado; cualquier otra plataforma usará un color ámbar por defecto.
- Si omites `category` en una entrada, se trata como `"Port"` automáticamente (compatibilidad con datos antiguos).

## Cómo subir tus propias miniaturas

Las cards usan formato **captura de pantalla, 16:9**, no portada de caja. Es la opción más consistente porque no todos los ports van a tener arte de caja (muchos homebrew no lo tienen), y evita recortes raros al mezclar cajas verticales (Vita, 3DS, Switch) con horizontales (N64, Xbox, etc.).

- **Dimensión recomendada:** 1280×720px (o cualquier proporción 16:9).
- **Formato:** webp o png. Peso objetivo por debajo de 300KB para que la web cargue rápido.
- Sube el archivo a `assets/covers/` y referencia esa ruta en el campo `cover` del JSON, ej. `"cover": "assets/covers/hollow-knight-switch.webp"`.
- Si la imagen que tienes no es 16:9 exacto, no pasa nada: el recorte automático (`object-fit: cover`) la centra y recorta lo justo. Evita solo imágenes muy alargadas verticalmente (como una caja de 3DS sin recortar), porque ahí sí se perderá contenido importante en los lados.

## Desplegar en GitHub Pages

1. Crea el repositorio (por ejemplo `SceneBackup`, o el nombre que prefieras) en GitHub y sube todo el contenido de esta carpeta a la raíz. Si ya tenías el repo creado como `PortsBackup`, puedes renombrarlo desde **Settings → repository name** sin perder nada.
2. Ve a **Settings → Pages**.
3. En "Build and deployment", elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. Guarda. En un minuto tu sitio estará en `https://tu-usuario.github.io/nombre-del-repo/`.

## Ver el sitio en local antes de subirlo

Abrir `index.html` haciendo doble clic puede fallar al cargar `data/games.json` (algunos navegadores bloquean la carga de JSON local por seguridad). Para probarlo en tu máquina:

```bash
# Desde la carpeta del proyecto
python3 -m http.server 8000
# Abre http://localhost:8000
```

## Estructura del proyecto

```
SceneBackup/
├── index.html          → estructura de la página
├── css/style.css        → todo el diseño (tokens de color/tipografía arriba del archivo)
├── js/script.js         → carga games.json y genera las cards, filtros y buscador
├── data/games.json       → AQUÍ es donde añades juegos nuevos
├── assets/covers/        → portadas (las tuyas + placeholders por plataforma)
└── README.md
```
