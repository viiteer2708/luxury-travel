# CLAUDE.md - Horizonte Exclusivo
Página web estática especializada en viajes de lujo personalizados.

## Stack
- HTML estático
- CSS embebido (variables CSS, sin frameworks)
- JavaScript vanilla (sin dependencias)
- Fuentes: Google Fonts (Playfair Display + Inter)
- Make (webhooks para automatización de formularios)

## Estructura de Archivos (URLs limpias `/%postname%/`)
```
/raíz
index.html              — Página principal (hero, destinos, quiénes somos, contacto)

images/                 — Todas las imágenes locales
  logo-trimmed.png      — Logo del sitio
  favicon.svg           — Favicon SVG (bola del mundo)
  TAJMAJAL.jpg          — Hero India
  *.jpeg / *.jpg        — Imágenes locales del repositorio

[region]/index.html     — Páginas de región (europa, asia, africa, america, paraisos)
[destino]/index.html    — Destinos individuales (escocia, italia, tailandia, india, etc.)
pro-tips/index.html     — Hub de Travel Hacks (grid de tarjetas por destino)
pro-tips-[destino]/index.html — Travel Hacks por destino
blog/index.html         — Hub del Blog
viaje-a-medida-que-es/index.html — Artículo de blog
```

### URLs y rutas
- Estructura de URLs limpias: cada página es `[slug]/index.html` → URL `/[slug]/`
- Todos los enlaces internos usan **rutas absolutas**: `/escocia/`, `/pro-tips/`, `/blog/`, `/#contacto`
- Imágenes: `/images/nombre.ext` (ruta absoluta desde cualquier página)
- Logo: `/images/logo-trimmed.png`
- Favicon: `/images/favicon.svg`

### Referencia canónica
- Destinos: `escocia/index.html`
- Travel Hacks: `pro-tips-tailandia/index.html`

## Reglas de Ejecución

**PERMITIDO sin preguntar:**
- Leer y escribir archivos de código
- Ejecutar builds y type checks
- git add y git commit
- git push

**OBLIGATORIO SIEMPRE:**
- Al crear un nuevo destino, SIEMPRE crear también su página de Travel Hacks (`pro-tips-[destino]/index.html`) y añadir la tarjeta en el hub `pro-tips/index.html`. Nunca crear un destino sin sus Travel Hacks.

**PROHIBIDO SIEMPRE:**
- No mostrar precios en NINGUNA parte de la web (ni en HTML, ni en CSS, ni en comentarios). Sin excepciones.

**Idioma:** Español de España en UI, comentarios y commits.

---

## Plantilla de páginas

### Arquitectura de navegación
- Cada región del dropdown (Europa, Asia, Africa, etc.) tiene su página `/[region]/` con título "Top Destinos [Región]"
- Cada destino individual tiene su página `/[destino]/` (ej: `/escocia/`)
- Las páginas de región muestran tarjetas que enlazan a los destinos individuales
- El CTA de cada destino enlaza a `/?destino=[Nombre]#contacto` (auto-fill JS)

### Navbar (IDÉNTICA en TODAS las páginas)
```html
<li>
    <a href="/#destinos">Destinos</a>
    <div class="dropdown">
        <a href="/africa/">Africa</a>
        <a href="/america/">América</a>
        <a href="/asia/">Asia</a>
        <a href="/europa/">Europa</a>
        <a href="/paraisos/">Paraísos sobre el agua</a>
    </div>
</li>
<li><a href="/#testimonios">¿Quién hay detrás?</a></li>
<li><a href="/#contacto">Contacto</a></li>
<li><a href="/pro-tips/">Travel Hacks</a></li>
<li><a href="/blog/">Blog</a></li>
```
- Todos los enlaces usan **rutas absolutas** (`/slug/`, `/#seccion`)
- En `index.html` (raíz): enlaces internos usan `#seccion` (sin `/`)
- Logo usa `/images/logo-trimmed.png`
- Mobile (≤768px): `.navbar .container { max-width: 100%; padding: 0 12px; }`
- Auto-collapse: colapsa a hamburguesa en `window.innerWidth <= 1100`

---

## Checklist para crear un nuevo DESTINO (en cadena)

> Usar `escocia/index.html` como referencia CANÓNICA. Copiar estructura completa.

### 1. Crear `[destino]/index.html`
- Copiar estructura exacta de `escocia/index.html`
- Cambiar: título, meta description, hero (imagen + label región + h1 + subtítulo + duración)
- Cambiar: texto intro
- Cambiar: bloques de itinerario (contenido + imágenes en carruseles)
- Cambiar: tarjetas "Qué incluye" (adaptar textos al destino)
- Cambiar: CTA → `Diseñemos tu [Destino]`, enlace a `/?destino=[Destino]#contacto`
- Cambiar: footer → añadir enlace al destino en la lista de destinos
- Verificar: navbar idéntica (ver sección Navbar arriba)

### 2. Añadir tarjeta en la página de región (`[region]/index.html`)
```html
<div class="destination-card reveal">
    <a href="/[destino]/">
        <div class="card-image">
            <img src="[imagen]?w=600&q=80" alt="[Destino]">
            <span class="card-badge">Nuevo</span>
        </div>
        <div class="card-body">
            <span class="card-location">[País/Región]</span>
            <h3>[Título corto]</h3>
            <p>[Descripción breve]</p>
            <div class="card-features">
                <span>[Duración]</span>
                <span>Guía privado</span>
                <span>[Tipo alojamiento]</span>
            </div>
            <span class="card-link">Ver itinerario &#10230;</span>
        </div>
    </a>
</div>
```

### 3. Añadir imágenes locales al repositorio
- Guardar imágenes en `images/` y referenciarlas como `/images/[imagen].jpeg`
- `git add images/[imagen].jpeg` para cada imagen local
- Las imágenes que NO son de Unsplash SIEMPRE deben estar en el repositorio

### 4. Añadir sección Travel Hacks en `[destino]/index.html`
- Después del CTA (`.dest-cta`) y antes del footer, añadir:
```html
<!-- PRO TIPS -->
<section class="dest-protips">
    <div class="container reveal">
        <span class="section-label">Travel Hacks</span>
        <h2>Consejos de experto para <em style="color: var(--gold);">[Destino]</em></h2>
        <p>Todo lo que necesitas saber antes, durante y después de tu viaje: checklist, dinero, transporte, seguridad, cultura, comida y hacks de experto.</p>
        <a href="/pro-tips-[destino]/" class="btn btn-primary">Ver Travel Hacks &#10230;</a>
    </div>
</section>
```
- Añadir CSS `.dest-protips` (copiar de `escocia/index.html`, bloque `/* ===== PRO TIPS LINK ===== */`)

### 5. No olvidar
- Alternancia de bloques: normal → reverse → normal → reverse
- Un dot por cada slide en el carrusel
- Footer: añadir enlace al destino en la columna "Destinos"

---

## Checklist para crear una nueva REGIÓN

> Usar `asia/index.html` como referencia. Copiar estructura completa.

### 1. Crear `[region]/index.html`
- Copiar estructura exacta de `asia/index.html`
- Cambiar: título, meta description, hero (imagen + h1 + subtítulo)
- Grid de destinos vacía (se irán añadiendo tarjetas)
- Verificar: navbar idéntica

### 2. Actualizar dropdown en TODAS las páginas
- Reemplazar `<a href="#">[Región]</a>` por `<a href="/[region]/">[Región]</a>`
- En: index.html y todos los `*/index.html`

---

## Checklist para crear un nuevo PRO TIPS de destino

> Usar `pro-tips-tailandia/index.html` como referencia CANÓNICA. Copiar estructura completa.

### 1. Crear `pro-tips-[destino]/index.html`
- Copiar estructura exacta de `pro-tips-tailandia/index.html`
- Cambiar: título, meta description, hero (imagen + label región + h1)
- Cambiar: texto intro + enlace "← Todos los Travel Hacks" (ya apunta a `/pro-tips/`)
- Cambiar: los 10 bloques de contenido (tips específicos del destino)
- Cambiar: CTA → `Diseñemos tu [Destino]`, enlace a `/?destino=[Destino]#contacto`
- Verificar: navbar idéntica (ver sección Navbar arriba)

### 2. Añadir tarjeta en `pro-tips/index.html` (hub)
- Añadir tarjeta en la sección de región correspondiente (Europa / Asia / África)
- Usar imagen hero del destino con `?w=600&q=80`
- Badge con nombre de la región
- Enlace a `/pro-tips-[destino]/`

### 3. Estructura de los 10 bloques (OBLIGATORIA)
1. Antes de viajar (Checklist)
2. Dinero y pagos
3. Transporte
4. Zonas y logística
5. Seguridad y estafas
6. Salud y clima
7. Cultura y etiqueta
8. Comida y experiencias
9. Hacks PRO
10. Top 5 (resumen rápido) + CTA

### 4. Reglas de contenido
- Cada tip: beneficio + acción (máx. 1-2 líneas)
- Iconos: ✅ (recomendación), ⚠️ (advertencia), 💡 (hack/truco)
- Máximo 4-8 tips por bloque
- Alternancia: `.tips-section` / `.tips-section.alt-bg`
- Bloque 10 (Top 5): usa `.top5-grid` con `.top5-card`

---

## Estructura de página de región

1. **Hero** — `.region-hero`, `min-height: calc(70vh - 110px)`, `padding-top: 100px`, `padding-bottom: 20px`, parallax, `background-position` ajustar por imagen
2. **Grid de destinos** — `padding-top: 30px`, section-header con `margin-bottom: 40px`
3. **Footer**

## Estructura de página de destino (`escocia/index.html` CANÓNICA)

1. **Hero** — `.dest-hero`, `min-height: calc(70vh - 110px)`, `padding-top: 100px`, `padding-bottom: 20px`, parallax (`background-attachment: fixed`), `background-position` ajustar por imagen
2. **Intro** — `padding-top: 30px`, `padding-bottom: 10px` — texto descriptivo centrado (`dest-intro-text`, max-width 780px)
3. **Itinerario** — `padding-top: 10px` — bloques alternados (`.itinerary-block` / `.itinerary-block.reverse`), gap 48px, margin-bottom 80px entre bloques
4. **Qué incluye** — `padding-top: 30px`, grid 4 columnas (`.includes-grid` / `.include-card`), fondo `var(--dark-soft)`
5. **CTA** — `.dest-cta`, `padding-top: 30px`, centrado, enlaza a `/?destino=[Nombre]#contacto`
6. **Footer** — idéntico con enlace al destino en la lista

## Estructura de página de Travel Hacks (`pro-tips-tailandia/index.html` CANÓNICA)

1. **Hero** — `.dest-hero`, misma estructura que destinos, imagen hero del destino, label región, h1 "Travel Hacks: [Destino]"
2. **Intro** — `padding-top: 30px`, `padding-bottom: 10px` — texto centrado + enlace "← Todos los Travel Hacks" a `/pro-tips/`
3. **10 bloques** — `.tips-section` / `.tips-section.alt-bg` alternando, `padding: 80px 0`
4. **CTA** — `.tips-cta`, `padding: 80px 0`, enlaza a `/?destino=[Nombre]#contacto`
5. **Footer** — idéntico al resto

---

## Sistema de carrusel en itinerario (OBLIGATORIO)

> Cada bloque del itinerario usa `.itinerary-carousel`. Copiar sistema exacto de `escocia/index.html`.

```html
<div class="itinerary-carousel">
    <div class="carousel-slide active"><img src="..." alt="..."></div>
    <div class="carousel-slide"><img src="..." alt="..."></div>
    <div class="carousel-controls">
        <button class="carousel-btn carousel-prev">&#8249;</button>
        <div class="carousel-dots">
            <button class="carousel-dot active"></button>
            <button class="carousel-dot"></button>
        </div>
        <button class="carousel-btn carousel-next">&#8250;</button>
    </div>
</div>
```
- **Transición:** fade (opacity 0.6s)
- **Controles:** flechas prev/next + dots (dot activo en `var(--gold)`)
- **Swipe táctil** en móvil (umbral 50px)
- **Altura:** 400px desktop / 280px móvil
- **JS:** se inicializa automáticamente para todos los `.itinerary-carousel`

## Línea temporal del itinerario (OBLIGATORIA)
- **SVG generado por JS** (`drawRoute()`): línea recta vertical por el centro
- **Estilo:** punteada (`stroke-dasharray: 6 4`), blanca 10% opacidad, 1.5px
- **Waypoints:** círculos SVG en el centro de cada bloque (r=5, borde gold 40%, fondo oscuro)
- **Responsive:** oculta en móvil (≤ 768px)
- **Se recalcula** en resize
- Usa `offsetTop` (no `getBoundingClientRect`) para evitar interferencia con animaciones reveal

## Alternancia de bloques (OBLIGATORIA)
- Bloque 1: `itinerary-block` → FOTO izquierda + TEXTO derecha
- Bloque 2: `itinerary-block reverse` → TEXTO izquierda + FOTO derecha
- Alternando sucesivamente
- En móvil (≤ 768px): 1 columna, `order: unset`

---

## Márgenes y espaciados — OBLIGATORIOS (NO cambiar)

| Sección | Propiedad | Valor |
|---------|-----------|-------|
| Hero (regiones Y destinos) | `min-height` | `calc(70vh - 110px)` |
| Hero | `padding-top` | `100px` |
| Hero | `padding-bottom` | `20px` |
| Hero content | `max-width` | `800px` |
| Hero content | `padding` | `0 24px` |
| Hero h1 | `margin-bottom` | `20px` |
| Hero label | `margin-bottom` | `20px` |
| Hero p | `margin-bottom` | `8px` |
| Intro | `padding-top` | `30px` |
| Intro | `padding-bottom` | `10px` |
| Intro text | `max-width` | `780px` |
| Itinerario | `padding-top` | `10px` |
| Itinerario grid | `gap` | `48px` |
| Itinerario bloques | `margin-bottom` | `80px` |
| Itinerario último bloque | `margin-bottom` | `0` |
| Section-header → contenido | `margin-bottom` | `64px` (destino) / `40px` (región) |
| Qué incluye | `padding-top` | `30px` |
| CTA (`.dest-cta`) | `padding-top` | `30px` |

## Imágenes
- Hero: Unsplash `?w=1920&q=80`
- Itinerario: Unsplash `?w=800&q=80`
- Tarjetas región: Unsplash `?w=600&q=80`
- **Las imágenes locales (no Unsplash) SIEMPRE van en `images/`** — referenciar como `/images/nombre.ext` (ruta absoluta), hacer `git add` antes de commit
