# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Graduation Memories** — A client-side React/Vite web app that lets users create graduation memory photos by compositing their portrait photos into Chibi character templates. All image processing happens in the browser (no backend).

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:5173 (add ?debug=1 to see slot boxes)
npm run build        # Type-check + build for production (outputs to dist/)
npm run preview      # Preview production build locally
```

## Architecture

### Tech Stack
- **Vite 5** + **React 18** + **TypeScript** (strict mode)
- **Tailwind CSS 4** (via `@tailwindcss/vite` plugin)
- No test framework configured

### Project Structure
```
src/
├── main.tsx              # Entry point
├── App.tsx               # Root component with step state machine (home→gender→edit→result)
├── index.css             # Tailwind + custom theme + animations
├── components/
│   ├── Editor.tsx        # Main canvas editor with drag/zoom/pinch handling
│   └── Petals.tsx        # Decorative falling sakura petals
├── pages/
│   ├── Home.tsx          # Landing page with steps overview
│   └── SelectGender.tsx  # Gender selection (male/female)
├── config/
│   └── templateConfig.ts # Template definitions (slots, coordinates, images)
└── utils/
    └── compose.ts        # Canvas compositing logic (preview scale=1, export scale=2)
```

### Key Data Flow
1. **Home** → User clicks "Bắt đầu tạo ảnh"
2. **SelectGender** → Choose male/female template
3. **Editor** → Upload photos for up to 3 slots (partner=required, graduate, diploma), drag/zoom to fit face in elliptical/rectangular slot
4. **Result** → Canvas rendered at 2× resolution → PNG blob → object URL for download/share

### Template System (`src/config/templateConfig.ts`)
- Two templates: `male` (1024×765) and `female` (1024×1024) in `public/templates/*.webp`
- Each template defines **slots** with normalized coordinates (0..1 relative to template size):
  - `partner` — user's face (required, ellipse)
  - `graduate` — graduate's face (ellipse)
  - `diploma` — photo inside diploma (rect)
- **Debug mode**: Add `?debug=1` to URL to render slot outlines on canvas

### Image Composition (`src/utils/compose.ts`)
- `compose(canvas, template, config, photos, scale, highlight?)` — draws template + all photos into canvas
- Preview uses `scale=1`, export uses `scale=2` (re-composes from original ImageBitmaps)
- Photos are `ImageBitmap` (off-main-thread decode) with zoom (1–4×) and pan offsets
- Elliptical slots get feathered mask via radial gradient (`destination-in` composite)
- `PAD = 1.1` extends draw area slightly beyond slot to cover template placeholder artifacts

### Editor Interaction (`src/components/Editor.tsx`)
- **Pointer events** on canvas: single-finger drag = pan, two-finger pinch = zoom, wheel = zoom
- Coordinates converted from CSS pixels to template-relative via `cssToTpl()` ratio
- Active slot switched via bottom button bar
- File input accepts JPEG/PNG ≤10MB; HEIC not supported (user must convert)
- Cleanup: `ImageBitmap.close()` on unmount/photo replace to free GPU memory

### Styling
- Custom Tailwind theme in `index.css`: `--color-cream`, `--color-pink`, `--color-sun`, `--color-ink`, `--color-accent`
- Animations: `fall` (petals), `float` (chibi chars), `pop` (page enter)
- Respects `prefers-reduced-motion: reduce`

## Deployment

**Cloudflare Pages** (recommended per README):
- Build command: `npm run build`
- Output directory: `dist`
- Also works on Netlify, Vercel, or any static host

## Notes for Development

- **No tests** — add a test framework (Vitest) if needed
- **TypeScript strict mode** — `noEmit: true`, types only checked during build
- **Template coordinates are estimates** — use `?debug=1` to visually verify/adjust
- **Client-only** — no API routes, no server code, no environment variables needed
- **Memory management** — `ImageBitmap.close()` called in cleanup effect; important for mobile