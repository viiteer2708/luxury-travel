# CLAUDE.md - Landing page o web estática
Pagina web especializada en viajes de lujo personalizados.


## Stack
- Next.js 15 (App Router)
- TypeScript estricto
- Tailwind CSS + shadcn/ui
- Supabase (auth, DB, storage, RLS)
- Stripe (pagos), Mux (video), Resend (email)

## Estructura de Carpetas
```

```

## Reglas de Oro

| Regla | Por qué |
|-------|---------|
| Componentes existentes primero | 100+ en components/, no dupliques |
| UI_DESIGN_RULES.md antes de UI | Sistema de diseño establecido |
| RLS en TODAS las tablas | Tier access en BD |
| Mobile-first | 70% usuarios móvil |
| Todo desde Supabase | Admin sin deploy |
- **Idioma:** Español de España en UI, comentarios y commits. Código en inglés


**PERMITIDO sin preguntar (YOLO mode):**
- Leer/escribir cualquier archivo de código
- Ejecutar builds, linters, type checks
- Crear migraciones SQL
- Instalar dependencias
- git add, git commit
- Operaciones de Supabase (MCP)


## Estado Actual
(Rellena esto manualmente con lo que funciona y lo que falta)

## Prohibiciones
**PROHIBIDO sin pedir permiso:**
- git push (Pablo hace push manualmente)
- rm -rf / borrar archivos
- Playwright / browser testing
- npm run dev / levantar servidores

**PROHIBIDO SIEMPRE:**
- No mostrar precios en NINGUNA parte de la web (ni en HTML, ni en CSS, ni en comentarios). Sin excepciones.


## Variables de Entorno
(Lista aquí tus env vars SIN valores)

## Reglas de Ejecución

**PERMITIDO sin preguntar:**
- Leer y escribir archivos de código
- Ejecutar builds y type checks
- Instalar dependencias
- git add y git commit

**PROHIBIDO sin permiso:**
- git push
- Borrar archivos
- Levantar servidores

## Plantilla de páginas de destino

### Arquitectura de navegación
- Cada región del dropdown (Europa, Asia, Africa, etc.) tiene su página `[region].html` con título "Top Destinos [Región]"
- Cada destino individual tiene su página `[destino].html` (ej: `escocia.html`)
- Las páginas de región muestran tarjetas que enlazan a los destinos individuales
- El CTA de cada destino enlaza a `index.html?destino=[Nombre]#contacto` (auto-fill JS)

### Estructura de página de región (`europa.html` como referencia)
1. **Hero** — `min-height: calc(50vh - 50px)`, `padding-top: 120px`, `padding-bottom: 40px`
2. **Grid de destinos** — `padding-top: 30px`, section-header con `margin-bottom: 40px`
3. **Footer**

### Estructura de página de destino (`escocia.html` como referencia CANÓNICA)
1. **Hero** — `min-height: calc(70vh - 110px)`, `padding-top: 100px`, `padding-bottom: 20px`, parallax (`background-attachment: fixed`), `background-position: center calc(50% + 60px)` (ajustar por destino)
2. **Intro** — `padding-top: 30px`, `padding-bottom: 10px` — texto descriptivo centrado (`dest-intro-text`, max-width 780px)
3. **Itinerario** — `padding-top: 10px` — bloques en zigzag (`.itinerary-block` / `.itinerary-block.reverse`), imágenes 400px con hover scale(1.05), gap 48px, margin-bottom 80px entre bloques
4. **Qué incluye** — grid 4 columnas (`.includes-grid` / `.include-card`), fondo `var(--dark-soft)`
5. **CTA** — centrado, enlaza a `index.html?destino=[Nombre]#contacto`
6. **Footer** — idéntico con enlace al destino en la lista

### Márgenes y espaciados estándar — OBLIGATORIOS para TODOS los destinos (NO cambiar)
> **IMPORTANTE:** Estos valores provienen de `escocia.html` y son la referencia canónica.
> Aplicar EXACTAMENTE estos mismos márgenes en cada nuevo destino que se cree.

| Sección / Transición | Propiedad | Valor |
|----------------------|-----------|-------|
| Hero | `min-height` | `calc(70vh - 110px)` |
| Hero | `padding-top` | `100px` |
| Hero | `padding-bottom` | `20px` |
| Hero content | `max-width` | `800px` |
| Hero content | `padding` | `0 24px` |
| Hero h1 | `margin-bottom` | `20px` |
| Hero label | `margin-bottom` | `20px` |
| Hero p | `margin-bottom` | `8px` |
| Hero → Intro | `padding-top` (intro) | `30px` |
| Intro | `padding-bottom` | `10px` |
| Intro text | `max-width` | `780px` |
| Intro → Itinerario | `padding-top` (itinerario) | `10px` |
| Itinerario grid | `gap` | `48px` |
| Itinerario bloques entre sí | `margin-bottom` | `80px` |
| Itinerario último bloque | `margin-bottom` | `0` |
| Section-header → contenido | `margin-bottom` | `64px` (destino) / `40px` (región) |

### CSS reutilizado de index.html
Variables, navbar, footer, botones, tipografía, `.reveal`, `.section-header`, `.section-title`, `.section-label`, `.divider`, responsive breakpoints.

### Navbar en subpáginas
- Logo y enlaces apuntan a `index.html` o `index.html#seccion`
- Dropdown Europa apunta a `europa.html`
- Logo usa `logo-trimmed.png`

### Imágenes
- Hero: Unsplash 1920px, `?w=1920&q=80`
- Itinerario: Unsplash 800px, `?w=800&q=80`
- Tarjetas región: Unsplash 600px, `?w=600&q=80`

## Referencias
