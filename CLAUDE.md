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
1. **Hero** — `min-height: calc(70vh - 110px)`, `padding-top: 120px`, `padding-bottom: 40px`
2. **Grid de destinos** — `padding-top: 30px`, section-header con `margin-bottom: 40px`
3. **Footer**

### Estructura de página de destino (`escocia.html` como referencia CANÓNICA)
1. **Hero** — `min-height: calc(70vh - 110px)`, `padding-top: 100px`, `padding-bottom: 20px`, parallax (`background-attachment: fixed`), `background-position: center calc(50% + 60px)` (ajustar por destino)
2. **Intro** — `padding-top: 30px`, `padding-bottom: 10px` — texto descriptivo centrado (`dest-intro-text`, max-width 780px)
3. **Itinerario** — `padding-top: 10px` — bloques alternados (`.itinerary-block` / `.itinerary-block.reverse`), gap 48px, margin-bottom 80px entre bloques
4. **Qué incluye** — `padding-top: 30px`, grid 4 columnas (`.includes-grid` / `.include-card`), fondo `var(--dark-soft)`
5. **CTA** — `padding-top: 30px`, centrado, enlaza a `index.html?destino=[Nombre]#contacto`
6. **Footer** — idéntico con enlace al destino en la lista

### Sistema de carrusel en itinerario (OBLIGATORIO en todos los destinos)
> Cada bloque del itinerario usa `.itinerary-carousel` en lugar de `.itinerary-image`.
> Copiar el sistema exacto de `escocia.html`.

- **Estructura HTML por bloque:**
  ```html
  <div class="itinerary-carousel">
      <div class="carousel-slide active"><img src="..." alt="..."></div>
      <div class="carousel-slide"><img src="..." alt="..."></div>
      <!-- más slides según necesidad -->
      <div class="carousel-controls">
          <button class="carousel-btn carousel-prev">&#8249;</button>
          <div class="carousel-dots">
              <button class="carousel-dot active"></button>
              <!-- un dot por cada slide -->
          </div>
          <button class="carousel-btn carousel-next">&#8250;</button>
      </div>
  </div>
  ```
- **Transición:** fade (opacity 0.6s)
- **Controles:** flechas prev/next + dots indicadores (dot activo en `var(--gold)`)
- **Swipe táctil** en móvil (umbral 50px)
- **Altura:** 400px desktop / 280px móvil
- **JS:** `document.querySelectorAll('.itinerary-carousel')` — se inicializa automáticamente para todos los carruseles

### Línea temporal del itinerario (OBLIGATORIA en todos los destinos)
- **SVG generado por JS** (`drawRoute()`): línea recta vertical por el centro del gap entre columnas
- **Estilo:** punteada (`stroke-dasharray: 6 4`), blanca 10% opacidad, 1.5px
- **Waypoints:** círculos SVG en el centro de cada bloque (r=5, borde gold 40% opacidad, fondo oscuro)
- **Responsive:** oculta en móvil (≤ 768px)
- **Se recalcula** en resize
- Usa `offsetTop` (no `getBoundingClientRect`) para no verse afectada por animaciones reveal

### Alternancia de bloques del itinerario (OBLIGATORIA)
- Bloque 1: `itinerary-block` → FOTO izquierda + TEXTO derecha
- Bloque 2: `itinerary-block reverse` → TEXTO izquierda + FOTO derecha
- Bloque 3: `itinerary-block` → FOTO izquierda + TEXTO derecha
- Y así sucesivamente (siempre alternando)
- En móvil (≤ 768px): todos apilan en 1 columna, `order: unset`

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
| Qué incluye | `padding-top` | `30px` |
| CTA (`.dest-cta`) | `padding-top` | `30px` |

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
