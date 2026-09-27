# streaming-Sntx Desktop

App de escritorio de streaming-Sntx para Windows, construida con Tauri 2 + React + Vite.

## Requisitos

- **Node.js** 18+
- **Rust** (https://rustup.rs/)
- **WebView2** (Windows 10/11)

## Configuración

1. Copia `.env.example` a `.env` y configura las variables:
   - `VITE_API_URL`: URL de tu API (ej. https://streaming-sntx.vercel.app)
   - Variables de Firebase (copia desde el `.env.local` de la web cambiando `NEXT_PUBLIC_` por `VITE_`)

2. Instala dependencias:
   ```bash
   npm install
   ```

   Si el CLI de Tauri falla con "Cannot find native binding", ejecuta:
   ```bash
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```

## Desarrollo

```bash
npm run tauri dev
```

Abre la app con hot-reload en http://localhost:1420.

## Build

```bash
npm run build        # Solo frontend (Vite)
npm run tauri build  # App completa para Windows
```

Los binarios se generan en `src-tauri/target/release/`:
- `streaming-sntx-desktop.exe` - Ejecutable
- `streaming-Sntx_0.1.0_x64_en-US.msi` - Instalador

## Estructura

```
src/
├── api/          # Cliente API
├── components/   # UI (Navbar, Banner, MovieRow, etc.)
├── config/       # API base URL
├── lib/          # Firebase, utils
├── pages/        # Páginas (Home, Series, Detalle, etc.)
├── store/        # Zustand (auth, favorites, movies)
└── ...
```

## Funcionalidades

- ✅ Home con Banner y filas de contenido
- ✅ Series y Películas
- ✅ Listado con filtros (género, año, país)
- ✅ Búsqueda (página + búsqueda rápida en Navbar)
- ✅ Mi Lista (favoritos con sync Firestore)
- ✅ Detalle con reproductor (iframe)
- ✅ Login y Registro (Firebase Auth)
- ✅ Modo cine en el reproductor
