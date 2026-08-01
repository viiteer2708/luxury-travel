# CLAUDE.md - Horizonte Exclusivo
**Web estática de viajes de lujo personalizados. 79+ páginas HTML, sin frameworks.**

> Deep-dive: Operaciones → `docs/OPERACIONES.md` | Destino canónico → `escocia/index.html` | Travel Hacks → `pro-tips-tailandia/index.html`

## Reglas de Oro
| Regla | Por qué |
|-------|---------|
| NUNCA mostrar precios (ni HTML, CSS, comentarios) | Política comercial — sin excepciones |
| Navbar IDÉNTICO en las 79 páginas (HTML+CSS+JS copiado de `index.html`) | Componente inmutable; si cambia, cambia en TODAS |
| Nuevo destino = página + Travel Hacks + tarjeta en región + `destinos/index.html` + `pro-tips/index.html` | Nunca crear destino incompleto |
| Tras crear/editar páginas → ejecutar `node build-schema.js` para regenerar el JSON-LD | El schema (datos estructurados) es estático y NO se actualiza solo |
| URLs limpias `/slug/` con rutas absolutas. NUNCA usar `#` en navegación | SEO y consistencia interna |
| Idioma: español de España en UI, comentarios y commits | Audiencia objetivo |
| Imágenes locales (no Unsplash) SIEMPRE en `images/` + `git add` antes de commit | Evitar referencias rotas |
| Leer `docs/OPERACIONES.md` antes de crear/modificar destinos, regiones o travel hacks | Contiene checklists obligatorias paso a paso |

## Datos estructurados (JSON-LD / Schema)
- El JSON-LD de cada página está **incrustado de forma estática** en su `<head>`, entre los marcadores `<!-- schema-auto:start -->` y `<!-- schema-auto:end -->`. **No editar a mano** esos bloques.
- Se genera con **`node build-schema.js`** (en la raíz del proyecto). Es idempotente: re-ejecutarlo regenera los bloques sin duplicar. `schema-auto.js` NO se carga en las páginas; es la **fuente de la lógica** que reutiliza `build-schema.js`.
- **Tras crear o editar páginas (nuevo destino, pro-tip, guía…), ejecuta `node build-schema.js`** para que tengan/actualicen su schema. Si añades un destino nuevo, añádelo también a los mapas `D` y `CT` (en `build-schema.js` y `schema-auto.js`).
- Cobertura: LocalBusiness (home, con reseñas), TouristTrip (destinos), Article+FAQPage (pro-tips), Article (guías de blog), CollectionPage (hubs/regiones), BreadcrumbList (todas).
- Valida los cambios en el [Test de Resultados Enriquecidos de Google](https://search.google.com/test/rich-results).

## Stack
- HTML estático + CSS embebido (variables CSS, sin frameworks)
- JavaScript vanilla (sin dependencias)
- Google Fonts: Playfair Display + Inter
- Make (webhooks para automatización de formularios)

## Estructura
```
/raíz
├── index.html                        — Home (hero, destinos, quiénes somos, contacto)
├── images/                           — Imágenes locales (logo, favicon, fotos)
├── [region]/index.html               — Regiones: europa, asia, africa, america, paraisos
├── [destino]/index.html              — Destinos individuales (escocia, italia, etc.)
├── destinos/index.html               — Hub global de destinos
├── pro-tips/index.html               — Hub de Travel Hacks
├── pro-tips-[destino]/index.html     — Travel Hacks por destino
├── blog/index.html                   — Hub del Blog
├── contacto/index.html               — Contacto (auto-fill con ?destino=)
├── quien-hay-detras/index.html       — Sobre nosotros
└── viaje-a-medida-que-es/index.html  — Artículo de blog
```

## Archivos clave
| Archivo | Rol |
|---------|-----|
| `index.html` | Fuente canónica del navbar (HTML+CSS+JS) — copiar a toda página nueva |
| `escocia/index.html` | Plantilla canónica de destino (itinerario, carrusel, timeline) |
| `pro-tips-tailandia/index.html` | Plantilla canónica de Travel Hacks (10 bloques) |
| `asia/index.html` | Plantilla canónica de región |
| `images/logo-trimmed.png` | Logo del sitio |
| `images/favicon.svg` | Favicon SVG |

## Flujo de trabajo
1. **Nuevo destino** → copiar `escocia/index.html`, adaptar contenido, crear `pro-tips-[destino]/`, añadir tarjetas en región + `destinos/` + `pro-tips/`
2. **Nueva región** → copiar `asia/index.html`, actualizar dropdown en TODAS las páginas
3. **Imágenes** → locales en `images/`, Unsplash con parámetros de calidad (hero `?w=1920&q=80`, itinerario `?w=800&q=80`, tarjetas `?w=600&q=80`)
4. **Commit** → `git add` + `git commit` (incluir imágenes locales). Victor hace push manualmente.

## Design system
- **Paleta:** `--dark: #0a0a0a`, `--gold: #c9a96e`, `--gold-light`, `--dark-soft`, `--text-muted`
- **Tipografía:** Playfair Display (títulos) + Inter (cuerpo, nav 0.85rem)
- **Nav links:** `letter-spacing: 0.5px` — SIN `text-transform: uppercase`, SIN `letter-spacing: 1.5px`
- **Parallax hero:** `background-attachment: fixed`, `min-height: calc(70vh - 110px)`, `padding-top: 100px`
- **CTA destino:** enlaza a `/contacto/?destino=[Nombre]`

## Reglas de Ejecución

**PROHIBIDO sin pedir permiso:**
- rm -rf / borrar archivos
- Levantar servidores de desarrollo
- Modificar configuración de hosting

**PERMITIDO sin preguntar:**
- Leer/escribir cualquier archivo de código
- Ejecutar builds y type checks
- git add, git commit, git push (cuando Victor dice "commit" = commit + push)

---

## Navbar — Componente inmutable

> Copiar COMPLETO de `index.html`. HTML + CSS + JS exactos. Ver código fuente en `index.html`.

**Resumen técnico:**
- Fixed top, z-index 1000, fondo `var(--dark)`, borde gold 15%
- Scroll effect: blur + shadow a >60px scroll
- Dropdown: absolute, fade in on hover, 220px min-width
- Auto-collapse a hamburguesa en ≤1280px (`checkNavOverflow()`)
- Mobile: panel lateral 280px deslizante desde derecha
- Mobile (≤768px): `.navbar .container { max-width: 100%; padding: 0 12px; }`
- Reglas `.navbar.collapsed` obligatorias para hamburguesa

## Plantillas de página

### Destino (ref: `escocia/index.html`)
1. Hero `.dest-hero` — parallax, label región, h1, subtítulo, duración
2. Intro — `padding: 30px 0 10px`, texto centrado max-width 780px
3. Itinerario — bloques alternados (normal/reverse), carrusel fade, timeline SVG
4. Qué incluye — grid 4 cols `.includes-grid`, fondo `var(--dark-soft)`
5. CTA `.dest-cta` — `padding-top: 30px`
6. Travel Hacks link `.dest-protips` — enlace a `/pro-tips-[destino]/`
7. Footer — con enlace al destino

### Región (ref: `asia/index.html`)
1. Hero `.region-hero` — parallax, h1, subtítulo
2. Grid destinos — `padding-top: 30px`, section-header `margin-bottom: 40px`
3. Footer

### Travel Hacks (ref: `pro-tips-tailandia/index.html`)
1. Hero `.dest-hero` — label región, h1 "Travel Hacks: [Destino]"
2. Intro + enlace "← Todos los Travel Hacks" → `/pro-tips/`
3. 10 bloques obligatorios: Checklist → Dinero → Transporte → Zonas → Seguridad → Salud → Cultura → Comida → Hacks PRO → Top 5 + CTA
4. Alternancia `.tips-section` / `.tips-section.alt-bg`, padding 80px 0
5. Iconos: ✅ recomendación, ⚠️ advertencia, 💡 hack. Máx 4-8 tips/bloque.
6. Footer

### Tarjeta de destino (para región + `destinos/` + `pro-tips/`)
```html
<div class="destination-card reveal">
    <a href="/[destino]/"><div class="card-image">
        <img src="[img]?w=600&q=80" alt="[Destino]"><span class="card-badge">Nuevo</span>
    </div><div class="card-body">
        <span class="card-location">[País]</span><h3>[Título]</h3><p>[Desc]</p>
        <div class="card-features"><span>[Duración]</span><span>Guía privado</span><span>[Alojamiento]</span></div>
        <span class="card-link">Ver itinerario &#10230;</span>
    </div></a>
</div>
```

## Componentes técnicos

### Carrusel itinerario
- `.itinerary-carousel` con slides fade (opacity 0.6s), flechas + dots
- Swipe táctil (umbral 50px), altura 400px desktop / 280px móvil
- 1 dot por slide, dot activo `var(--gold)`

### Timeline SVG
- `drawRoute()`: línea vertical punteada (`stroke-dasharray: 6 4`), blanca 10%, 1.5px
- Waypoints: círculos r=5, borde gold 40%, fondo oscuro
- Usa `offsetTop` (no `getBoundingClientRect`). Oculta en móvil ≤768px. Recalcula en resize.

### Alternancia itinerario
- Normal: foto izq + texto der | Reverse: texto izq + foto der
- Móvil ≤768px: 1 col, `order: unset`

### Agente virtual (chat con IA) — añadido 1-ago-2026
- `/chat.js` = widget autocontenido (inyecta su CSS y su DOM; clases `he-chat-*`). Lo carga
  `scripts.js` al final, así llega a las 147 páginas que incluyen el JS global sin tocar ningún HTML.
  Burbuja dorada en bottom:100px right:24px (encima del WhatsApp flotante), z-index 1001.
- `api/chat.js` = función Edge de Vercel, proxy a la **API de Gemini** (free tier, modelo
  `gemini-3.5-flash-lite`, cambiable con env var `GEMINI_MODEL`). Única función serverless del repo.
- **`GEMINI_API_KEY` SOLO como env var en Vercel** (Production+Preview) — este repo es PÚBLICO,
  la clave jamás en el código. Sin clave el chat responde 503 amable que deriva a WhatsApp.
- El system prompt (en `api/chat.js`) cumple la Regla de Oro nº1: **CERO PRECIOS, sin excepciones**,
  siguiendo el guion de `/cuanto-cuesta-viaje-a-medida/` (6 variables + pedir días/fechas/viajeros/
  presupuesto orientativo). Tampoco inventa disponibilidad ni infla reseñas ni menciona datos
  internos (la cara pública es Endeis). Si cambias claims de negocio, coteja con
  `wiki/projects/horizonte-exclusivo.md` y `contexto-negocio.md`.

## Espaciados obligatorios
| Elemento | Valor |
|----------|-------|
| Hero min-height | `calc(70vh - 110px)` |
| Hero padding | `100px top, 20px bottom` |
| Hero content | `max-width: 800px, padding: 0 24px` |
| Hero h1/label margin-bottom | `20px` |
| Intro | `30px top, 10px bottom, max-width 780px` |
| Itinerario | `10px top, gap 48px, bloques 80px mb (último 0)` |
| Section-header → contenido | `64px` destino / `40px` región |
| Qué incluye / CTA | `padding-top: 30px` |

---

## Inicio de sesión
Al comenzar cada conversación, recuerda al usuario:
1. **`git pull`** — Antes de empezar, asegúrate de tener la última versión del proyecto.
2. **Al terminar** — Haz `git add . && git commit -m "Descripción" && git push` para no perder nada.

Victor trabaja desde varios PCs (casa, oficina, portátil). El código se sincroniza solo vía Git.

---

## Vault de Obsidian (contexto transversal)
Este proyecto es **Horizonte Exclusivo** — agencia de viajes de lujo, Molins de Rei.

Si el vault no está cargado: `/add-dir "C:\Users\Victor\Documents\VITER VAULT"` (WSL: `/mnt/c/Users/Victor/Documents/VITER VAULT`)

### Contexto de negocio
- SEO foundation y estrategia de posicionamiento para viajes de lujo
- Blog: 13 artículos planificados, calendario editorial
- Competencia y diferenciación en el nicho de lujo
- Relación con otros negocios (Vitergy SEO local, sinergias)

### Regla
Antes de tomar decisiones de arquitectura o negocio, consulta el vault para verificar decisiones previas o contexto relevante.

---

## Conocimiento (Segundo Cerebro)

Wiki persistente de Victor (patrón LLM Wiki de Karpathy): `C:\Users\Victor\Documents\VITER VAULT\_Wiki\`
— índice en `_Wiki\index.md`, contrato completo en `_Wiki\CLAUDE.md` (leer SIEMPRE antes de escribir en el wiki).

**Páginas del wiki de este repo** (leer antes de trabajo estratégico o de negocio):
- `wiki/projects/horizonte-exclusivo.md` — el proyecto
- `wiki/concepts/framework-lujo.md` · `wiki/concepts/seo-local.md`

Ancla todo claim de negocio en una página del wiki; si no existe página, dilo.
Cuando Victor diga "actualiza el wiki" o "qué sabemos sobre X": leer `_Wiki\CLAUDE.md` y ejecutar la operación (ingest/query/lint) siguiendo sus convenciones. Todo en español.
