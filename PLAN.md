# Plan: Paisaje de Marte con Vite + Three.js

## Contexto
Carpeta vacía (solo CLAUDE.md). Node 22, Chrome en `C:\Program Files\Google\Chrome\Application\chrome.exe`. Meta: paisaje marciano cinematográfico visible en vivo en el navegador de Cursor, con verificación automática (`npm run check`).

## Paso 1 — Arranque rápido (<2 min)
1. Crear manualmente `package.json`, `index.html`, `vite.config.js` (sin scaffolder interactivo). Deps: `three`, `vite`; dev: `playwright-core` (no descarga navegadores).
2. `npm install`, luego `npm run dev` en segundo plano (puerto fijo 5173, `host: true`).
3. `src/main.js` versión inicial: terreno de dunas (PlaneGeometry con ruido), cielo degradado caramelo, sol con luz direccional cálida, niebla de polvo, cámara baja con órbita suave. Ya visible.

## Paso 2 — Mejoras (en `src/`)
- **Dunas**: ruido simplex/fbm propio, crestas en forma de media luna, color por altura/pendiente (óxido, ocre, sombras malva).
- **Rocas**: `InstancedMesh` de icosaedros deformados, escala/rotación aleatorias, sembradas por pendiente.
- **Cielo**: shader en esfera grande (horizonte caramelo → durazno → ocre alto), halo solar, banda de polvo.
- **Sol de tarde**: DirectionalLight cálida baja, sombras PCFSoft de alta resolución, `HemisphereLight` tenue, tone mapping ACES, fog exponencial color caramelo.
- **Dos lunas**: Fobos (pequeña, irregular, gris) y Deimos (menor, clara) como esferas con ruido, texturas procedurales de cráteres, visibles en el cielo.
- Partículas de polvo flotante (Points) y cámara con movimiento lento tipo película; resize responsive.

## Paso 3 — `npm run check` (`scripts/check.mjs`)
- `playwright-core` con `chromium.launch({ executablePath: <Chrome del usuario>, headless: true })`, args WebGL (`--use-angle=swiftshader`/`--enable-unsafe-swiftshader` si hace falta).
- Abre `http://localhost:5173`, espera ~3 s, escucha `console` (error/warning), `pageerror` y `requestfailed`.
- Guarda `check/captura.png`, imprime la lista de errores, sale con código 1 si hay errores.

## Paso 4 — Rondas de revisión (máx. 3)
Tras cada mejora grande: correr check → leer la captura → corregir. Listo cuando: 0 errores y la captura muestre dunas, rocas, cielo caramelo con polvo, sol cálido con sombras suaves y las dos lunas.

## Verificación
`npm run check` sin errores + captura inspeccionada; servidor activo en http://localhost:5173 para verlo en Cursor.
