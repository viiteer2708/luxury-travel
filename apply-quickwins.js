// Inyector idempotente de los 3 quick wins de la auditoría.
// Replica el patrón de build-schema.js: recorre todos los index.html y aplica,
// de forma segura y re-ejecutable (idempotente), tres cambios:
//   1) Texto del banner de cookies acorde a RGPD (analítica/marketing) -> TODAS las páginas
//   2) Bloque de redes sociales (Instagram) en el footer            -> TODAS las páginas
//   3) Sección de captación de email (lead magnet)                  -> home + guías del blog
//
// Uso:  node apply-quickwins.js --dry   (previsualiza, no escribe)
//       node apply-quickwins.js         (aplica)
const fs = require('fs');
const path = require('path');

const ROOT = __dirname.replace(/\\/g, '/');
const SKIP = new Set(['node_modules', '.git', '.claude', '.github', '.vercel', 'font', 'images', 'docs', 'recursos']);

// Páginas donde insertar la captación de email (alta intención / audiencia que "sueña").
const CAPTURE_SLUGS = new Set([
  '', // home
  'como-planifico-un-gran-viaje', 'viaje-a-medida-que-es',
  'checklist-pre-viaje', 'cuanto-cuesta-viaje-a-medida', 'errores-comunes-organizar-viaje',
  'itinerario-ritmo-realista', 'jet-lag-cambios-horarios',
  'viaje-a-medida-vs-por-tu-cuenta', 'viaje-premium-que-es', 'viajes-pequenos-recuerdos-grandes',
]);

// ---- 1) Banner de cookies ----
const BANNER_OLD = 'Utilizamos cookies técnicas para garantizar el correcto funcionamiento del sitio web. <a href="/politica-de-cookies/" style="color:#c9a96e;text-decoration:underline;">Más información</a>';
const BANNER_NEW = 'Usamos cookies propias y de terceros para analizar el tráfico y mejorar tu experiencia. Puedes aceptarlas o rechazarlas. <a href="/politica-de-cookies/" style="color:#c9a96e;text-decoration:underline;">Más información</a>';

// ---- 2) Footer social (Instagram) ----
const SOCIAL_MARK = 'he-social';
const SOCIAL_BLOCK = '\n                    <div class="footer-social"><!-- ' + SOCIAL_MARK + ' -->\n' +
  '                        <a href="https://www.instagram.com/viajeshorizonteexclusivo/" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zm0 1.44c-3.14 0-3.51.01-4.75.07-.9.04-1.39.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.32-.28.81-.32 1.71-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.04.9.19 1.39.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.13.81.28 1.71.32 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c.9-.04 1.39-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.32.28-.81.32-1.71.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.04-.9-.19-1.39-.32-1.71-.17-.43-.37-.74-.69-1.06-.32-.32-.63-.52-1.06-.69-.32-.13-.81-.28-1.71-.32-1.24-.06-1.61-.07-4.75-.07zm0 2.45a5.95 5.95 0 110 11.9 5.95 5.95 0 010-11.9zm0 1.44a4.51 4.51 0 100 9.02 4.51 4.51 0 000-9.02zm6.16-.66a1.39 1.39 0 11-2.78 0 1.39 1.39 0 012.78 0z"/></svg></a>\n' +
  '                    </div>';
// Anclamos justo tras el enlace de reseña de Google (presente en el footer de las 148 páginas).
const REVIEW_LINK = '<a href="https://g.page/r/CYdKzB_9NWUOEAE/review" target="_blank" rel="noopener" class="footer-review-link">⭐ Déjanos una reseña en Google</a>';

// ---- 3) Sección de captación de email ----
const CAPTURE_MARK = 'he-lead-capture';
const CAPTURE_BLOCK =
`    <!-- LEAD CAPTURE -->
    <section class="lead-capture" id="leadCapture"><!-- ${CAPTURE_MARK} -->
        <div class="container">
            <span class="section-label">Recurso gratuito</span>
            <h2>La guía esencial para planificar un gran viaje</h2>
            <p>La guía con la que diseño cada viaje a medida: qué reservar primero, cómo marcar un ritmo realista, los errores que cuestan caro y el checklist definitivo. Gratis, directa a tu email.</p>
            <form class="lead-form" onsubmit="return enviarLeadMagnet(this)">
                <input type="email" name="email" placeholder="Tu email" required autocomplete="email">
                <button type="submit" class="btn btn-primary">Quiero la guía &#10230;</button>
                <label class="lead-consent"><input type="checkbox" required> Acepto recibir la guía y comunicaciones de Horizonte Exclusivo. Puedo darme de baja cuando quiera. <a href="/politica-de-privacidad/">Privacidad</a></label>
            </form>
            <div class="lead-success" style="display:none;">
                <div class="lead-success-icon">✓</div>
                <p><strong>¡Hecho! Revisa tu email.</strong></p>
                <p>Mientras llega, puedes empezar a leer la guía aquí 👉 <a href="/recursos/guia-gran-viaje/">Abrir la guía</a></p>
            </div>
        </div>
    </section>

`;

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path.join(dir, e.name), acc); }
    else if (e.isFile() && e.name.toLowerCase() === 'index.html') acc.push(path.join(dir, e.name));
  }
  return acc;
}
function slugOf(file) { return path.relative(ROOT, file).replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\/$/, ''); }

const dry = process.argv.includes('--dry');
const files = [path.join(ROOT, 'index.html'), ...walk(ROOT, [])];
const uniq = [...new Set(files)].sort();

let nBanner = 0, nSocial = 0, nCapture = 0, nWritten = 0;
const warn = [];

for (const file of uniq) {
  const slug = slugOf(file);
  let html = fs.readFileSync(file, 'utf8');
  const before = html;

  // 1) Banner de cookies
  if (html.includes(BANNER_OLD)) { html = html.replace(BANNER_OLD, BANNER_NEW); nBanner++; }
  else if (!html.includes(BANNER_NEW)) { warn.push('banner no encontrado: ' + (slug || '(home)')); }

  // 2) Footer social (idempotente)
  if (!html.includes(SOCIAL_MARK)) {
    if (html.includes(REVIEW_LINK)) { html = html.replace(REVIEW_LINK, REVIEW_LINK + SOCIAL_BLOCK); nSocial++; }
    else warn.push('review-link no encontrado: ' + (slug || '(home)'));
  }

  // 3) Captación de email (solo páginas objetivo, idempotente)
  if (CAPTURE_SLUGS.has(slug) && !html.includes(CAPTURE_MARK)) {
    const m = html.match(/([ \t]*)<footer[ >]/);
    if (m) { html = html.replace(/([ \t]*)<footer([ >])/, CAPTURE_BLOCK + '$1<footer$2'); nCapture++; }
    else warn.push('footer no encontrado para capture: ' + (slug || '(home)'));
  }

  if (html !== before) {
    if (!dry) fs.writeFileSync(file, html, 'utf8');
    nWritten++;
  }
}

console.log('\n--- RESUMEN apply-quickwins ' + (dry ? '(DRY RUN)' : '') + ' ---');
console.log('Banner cookies actualizado:', nBanner);
console.log('Footer social insertado:', nSocial);
console.log('Captación email insertada:', nCapture, '(objetivo:', CAPTURE_SLUGS.size + ')');
console.log('Páginas modificadas:', nWritten, '/', uniq.length);
if (warn.length) { console.log('\nAVISOS:'); warn.forEach(w => console.log('  - ' + w)); }
