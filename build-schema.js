// Build-time JSON-LD baker for Horizonte Exclusivo.
// Ports the logic of luxury-travel/schema-auto.js but RESOLVES the dynamic values
// from the static HTML and writes static <script type="application/ld+json"> blocks
// into each page's <head>, wrapped in markers so it can be re-run idempotently.
//
// Usage:  node build-schema.js --dry [slug1 slug2 ...]   (preview, no writes)
//         node build-schema.js                            (write all 148 pages)
const fs = require('fs');
const path = require('path');

// La raíz del proyecto es la carpeta donde vive este script (portable entre PCs).
const ROOT = __dirname.replace(/\\/g, '/');
const SKIP = new Set(['node_modules', '.git', '.claude', '.github', '.vercel', 'font', 'images', 'docs']);
const START = '<!-- schema-auto:start (generado, no editar a mano) -->';
const END = '<!-- schema-auto:end -->';

// Brand data (from schema-auto.js B), with broken asset refs fixed to existing files.
const B = {
  name: 'Horizonte Exclusivo', url: 'https://www.horizonteexclusivo.es',
  email: 'viajes@horizonteexclusivo.es', telephone: '+34633077401',
  logo: 'https://www.horizonteexclusivo.es/images/logo-trimmed.png',   // was logo.png (404)
  image: 'https://www.horizonteexclusivo.es/images/japon1.jpg',         // was og-image.jpg (404)
  description: 'Agencia de viajes de lujo a medida en Molins de Rei, Barcelona. Viajes exclusivos y 100% personalizados a mas de 55 destinos.',
  lat: 41.4118429, lng: 2.0181454, street: 'Carrer Major, 37', city: 'Molins de Rei',
  region: 'Barcelona', zip: '08750', country: 'ES', mapCid: '18012363284776329308',
  founder: 'Endeis Prieto', founderTitle: 'Fundadora y CEO', rating: '5.0', reviewCount: '2',
  instagram: 'https://www.instagram.com/viajeshorizonteexclusivo/',
};
const D = { 'albania': 'Albania', 'alaska': 'Alaska', 'alemania': 'Alemania', 'argentina': 'Argentina', 'aruba': 'Aruba', 'bahamas': 'Bahamas', 'bali': 'Bali', 'belgica': 'Bélgica', 'botsuana': 'Botsuana', 'brasil': 'Brasil', 'camboya': 'Camboya', 'canada': 'Canadá', 'chicago-nueva-orleans': 'Chicago y Nueva Orleans', 'china': 'China', 'colombia': 'Colombia', 'costa-oeste-usa': 'Costa Oeste USA', 'costa-rica': 'Costa Rica', 'croacia': 'Croacia', 'cuba': 'Cuba', 'disneyland-paris': 'Disneyland París', 'dubai-abu-dhabi-maldivas': 'Dubái, Abu Dhabi y Maldivas', 'ecuador': 'Ecuador', 'egipto': 'Egipto', 'escocia': 'Escocia', 'filipinas': 'Filipinas', 'florida': 'Florida', 'francia': 'Francia', 'grecia': 'Grecia', 'hawai': 'Hawái', 'india': 'India', 'islandia': 'Islandia', 'italia': 'Italia', 'jamaica': 'Jamaica', 'japon': 'Japón', 'kenia-zanzibar': 'Kenia y Zanzíbar', 'madagascar': 'Madagascar', 'malasia': 'Malasia', 'maldivas': 'Maldivas', 'malta': 'Malta', 'marruecos': 'Marruecos', 'mauricio': 'Mauricio', 'namibia': 'Namibia', 'noruega': 'Noruega', 'peru': 'Perú', 'polinesia-francesa': 'Polinesia Francesa', 'portugal': 'Portugal', 'praga-viena-budapest': 'Praga, Viena y Budapest', 'seychelles': 'Seychelles', 'singapur': 'Singapur', 'sri-lanka': 'Sri Lanka', 'sudafrica': 'Sudáfrica', 'suiza': 'Suiza', 'tailandia': 'Tailandia', 'tanzania': 'Tanzania', 'turquia': 'Turquía', 'uganda': 'Uganda', 'vietnam': 'Vietnam', 'chile': 'Chile', 'nueva-york': 'Nueva York' };
const CT = { 'albania': 'Europa', 'alemania': 'Europa', 'belgica': 'Europa', 'croacia': 'Europa', 'disneyland-paris': 'Europa', 'escocia': 'Europa', 'francia': 'Europa', 'grecia': 'Europa', 'islandia': 'Europa', 'italia': 'Europa', 'malta': 'Europa', 'noruega': 'Europa', 'portugal': 'Europa', 'praga-viena-budapest': 'Europa', 'suiza': 'Europa', 'turquia': 'Europa', 'bali': 'Asia', 'camboya': 'Asia', 'china': 'Asia', 'dubai-abu-dhabi-maldivas': 'Asia', 'filipinas': 'Asia', 'india': 'Asia', 'japon': 'Asia', 'malasia': 'Asia', 'maldivas': 'Asia', 'singapur': 'Asia', 'sri-lanka': 'Asia', 'tailandia': 'Asia', 'vietnam': 'Asia', 'botsuana': 'África', 'egipto': 'África', 'kenia-zanzibar': 'África', 'madagascar': 'África', 'marruecos': 'África', 'mauricio': 'África', 'namibia': 'África', 'seychelles': 'África', 'sudafrica': 'África', 'tanzania': 'África', 'uganda': 'África', 'alaska': 'América', 'argentina': 'América', 'aruba': 'América', 'bahamas': 'América', 'brasil': 'América', 'canada': 'América', 'chicago-nueva-orleans': 'América', 'colombia': 'América', 'costa-oeste-usa': 'América', 'costa-rica': 'América', 'cuba': 'América', 'ecuador': 'América', 'florida': 'América', 'hawai': 'América', 'jamaica': 'América', 'peru': 'América', 'polinesia-francesa': 'Oceania', 'chile': 'América', 'nueva-york': 'América' };

// Guías editoriales del blog (top-level pero listadas en /blog/): reciben Article + breadcrumb Blog.
const BLOG_GUIDES = ['antes-de-reservar-viaje-grande', 'como-planifico-un-gran-viaje', 'viaje-a-medida-que-es', 'checklist-pre-viaje', 'cuanto-cuesta-viaje-a-medida', 'errores-comunes-organizar-viaje', 'itinerario-ritmo-realista', 'jet-lag-cambios-horarios', 'que-reservar-primero-gran-viaje', 'viaje-a-medida-vs-por-tu-cuenta', 'viaje-premium-que-es', 'viajes-pequenos-recuerdos-grandes'];

// Mapa URL -> lastmod del sitemap.xml (señal de fecha real del propio sitio, para Article).
const LASTMOD = (() => {
  const map = {};
  try {
    const sm = fs.readFileSync(ROOT + '/sitemap.xml', 'utf8');
    for (const blk of sm.split('<url>').slice(1)) {
      const loc = (blk.match(/<loc>([^<]+)<\/loc>/) || [])[1];
      const lm = (blk.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1];
      if (loc && lm) map[loc.trim()] = lm.trim();
    }
  } catch (e) {}
  return map;
})();

const FAQ_Q = {
  'Antes de viajar': (pn) => `¿Qué necesito saber antes de viajar a ${pn}?`,
  'Dinero y pagos': (pn) => `¿Cómo funcionan el dinero y los pagos en ${pn}?`,
  'Transporte': (pn) => `¿Cómo moverse por ${pn}?`,
  'Seguridad y estafas': (pn) => `¿Es seguro viajar a ${pn}?`,
  'Salud y clima': (pn) => `¿Qué clima tiene ${pn} y qué precauciones de salud tomar?`,
  'Cultura y etiqueta': (pn) => `¿Cuáles son las costumbres y normas culturales en ${pn}?`,
  'Comida y experiencias': (pn) => `¿Qué comer y qué experiencias hacer en ${pn}?`,
};

function decode(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é').replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú').replace(/&ntilde;/g, 'ñ').replace(/&Ntilde;/g, 'Ñ')
    .replace(/\s+/g, ' ').trim();
}
function attrVal(html, re) { const m = html.match(re); return m ? decode(m[1]) : ''; }
function headline(title) { return (title.split(/[|—]/)[0] || title).trim(); }

function org() { return { '@type': 'TravelAgency', '@id': B.url + '/#organization', 'name': B.name }; }
function bc(items) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': items.map((it, i) => ({ '@type': 'ListItem', 'position': i + 1, 'name': it.name, 'item': it.url })) };
}
function contSlug(ct) { return ct.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

function homeOrg() {
  return {
    '@context': 'https://schema.org', '@type': ['TravelAgency', 'LocalBusiness'], '@id': B.url + '/#organization',
    'name': B.name, 'alternateName': 'Horizonte Exclusivo - Agencia de Viajes de Lujo', 'url': B.url, 'logo': B.logo, 'image': B.image,
    'description': B.description, 'email': B.email, 'telephone': B.telephone, 'priceRange': '$$$', 'currenciesAccepted': 'EUR',
    'paymentAccepted': 'Cash, Credit Card, Bank Transfer', 'foundingDate': '2025',
    'founder': { '@type': 'Person', '@id': B.url + '/#founder', 'name': B.founder, 'jobTitle': B.founderTitle, 'url': B.url + '/quien-hay-detras/' },
    'address': { '@type': 'PostalAddress', 'streetAddress': B.street, 'addressLocality': B.city, 'addressRegion': B.region, 'postalCode': B.zip, 'addressCountry': B.country },
    'geo': { '@type': 'GeoCoordinates', 'latitude': B.lat, 'longitude': B.lng },
    'hasMap': 'https://www.google.com/maps?cid=' + B.mapCid,
    'openingHoursSpecification': [
      { '@type': 'OpeningHoursSpecification', 'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], 'opens': '09:30', 'closes': '13:30' },
      { '@type': 'OpeningHoursSpecification', 'dayOfWeek': ['Monday', 'Wednesday', 'Thursday', 'Friday'], 'opens': '16:00', 'closes': '19:00' },
    ],
    'areaServed': [{ '@type': 'City', 'name': 'Molins de Rei' }, { '@type': 'AdministrativeArea', 'name': 'Baix Llobregat' }, { '@type': 'City', 'name': 'Barcelona' }, { '@type': 'AdministrativeArea', 'name': 'Cataluna' }],
    'hasOfferCatalog': { '@type': 'OfferCatalog', 'name': 'Servicios de viajes de lujo', 'itemListElement': [
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Viajes de lujo a medida' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Lunas de miel a medida' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Viajes familiares a medida' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Viajes corporativos e incentivos' } },
      { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Diseno de itinerarios personalizados' } },
    ] },
    'sameAs': ['https://www.google.com/maps?cid=' + B.mapCid, B.instagram],
    // NOTA SEO: NO añadir aquí un aggregateRating auto-referido (puntuarte a ti mismo).
    // Google no pinta estrellas con eso en tu propio LocalBusiness y lo trata como spam/self-serving.
    // La nota real (5,0 · nº reseñas) ya la muestra Google Maps a partir de las reseñas verdaderas.
  };
}

function buildFaq(html, pn) {
  const items = [];
  const titles = [...html.matchAll(/<h2 class="tips-section-title">([\s\S]*?)<\/h2>/gi)];
  for (let i = 0; i < titles.length; i++) {
    const title = decode(titles[i][1]);
    let qfn = FAQ_Q[title];
    // las páginas varían el título de seguridad: "Seguridad y fauna/normas" o solo "Seguridad"
    if (!qfn && /^Seguridad/i.test(title)) qfn = FAQ_Q['Seguridad y estafas'];
    if (!qfn) continue;
    const start = titles[i].index + titles[i][0].length;
    const end = i + 1 < titles.length ? titles[i + 1].index : html.length;
    const seg = html.slice(start, end);
    const texts = [];
    for (const m of seg.matchAll(/<div class="tip-item">[\s\S]*?<p>([\s\S]*?)<\/p>/gi)) texts.push(decode(m[1]));
    for (const m of seg.matchAll(/class="top5-card"[\s\S]*?<p>([\s\S]*?)<\/p>/gi)) texts.push(decode(m[1]));
    const answer = texts.join(' ').trim();
    if (answer.length > 0) items.push({ '@type': 'Question', 'name': qfn(pn), 'acceptedAnswer': { '@type': 'Answer', 'text': answer } });
  }
  return items.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': items } : null;
}

// FAQPage de la home a partir de su sección .faq-item (.faq-question / .faq-answer)
function buildHomeFaq(html) {
  const items = [];
  const re = /<button class="faq-question"[^>]*>([\s\S]*?)<\/button>\s*<div class="faq-answer">([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = re.exec(html))) {
    const q = decode(m[1]).trim(); // decode() también elimina el <svg> del chevron
    const ps = [...m[2].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(x => decode(x[1]).trim()).filter(Boolean);
    const a = ps.join(' ').trim();
    if (q && a) items.push({ '@type': 'Question', 'name': q, 'acceptedAnswer': { '@type': 'Answer', 'text': a } });
  }
  return items.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': items } : null;
}

function generate(slug, html) {
  const pt = attrVal(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const pd = attrVal(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const cu = attrVal(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i) || (B.url + '/' + slug + (slug ? '/' : ''));
  const ogimg = attrVal(html, /property="og:image"\s+content="([^"]*)"/i) || B.image;
  const lm = LASTMOD[cu] || '2026-04-13';
  const out = [];
  const p = slug;

  if (p === '' || p === 'index.html') { out.push(homeOrg()); out.push({ '@context': 'https://schema.org', '@type': 'WebSite', '@id': B.url + '/#website', 'name': B.name, 'url': B.url, 'inLanguage': 'es-ES', 'publisher': { '@id': B.url + '/#organization' } }); const hf = buildHomeFaq(html); if (hf) out.push(hf); }
  else if (D[p]) {
    const dn = D[p], ct = CT[p] || '';
    out.push({ '@context': 'https://schema.org', '@type': 'TouristTrip', 'name': headline(pt), 'description': pd, 'url': cu, 'touristType': ['Luxury', 'Cultural', 'Adventure'], 'itinerary': { '@type': 'ItemList', 'name': 'Itinerario de viaje a ' + dn, 'description': 'Itinerario personalizado de lujo en ' + dn }, 'provider': org(), 'offers': { '@type': 'Offer', 'availability': 'https://schema.org/InStock', 'priceCurrency': 'EUR', 'url': B.url + '/contacto/' } });
    const bcs = [{ name: 'Inicio', url: B.url + '/' }, { name: 'Destinos', url: B.url + '/destinos/' }];
    // solo añadir el nivel de continente si existe la página de región (evita enlazar a /oceania/ inexistente)
    if (ct && ['europa', 'asia', 'africa', 'america', 'paraisos'].includes(contSlug(ct))) bcs.push({ name: ct, url: B.url + '/' + contSlug(ct) + '/' });
    bcs.push({ name: dn, url: cu });
    out.push(bc(bcs));
    // Si la página de destino tiene fusionados los Travel Hacks (sección #consejos-viaje con
    // el mismo marcado tips-section-title que usaban las antiguas pro-tips-[destino]), añade
    // también el FAQPage — no aplica a los destinos que no han fusionado nada (buildFaq devuelve null).
    const faq = buildFaq(html, dn);
    if (faq) out.push(faq);
  }
  else if (['europa', 'asia', 'africa', 'america', 'paraisos'].includes(p)) {
    const cn = { europa: 'Europa', asia: 'Asia', africa: 'África', america: 'América', paraisos: 'Paraísos sobre el agua' };
    out.push({ '@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'Destinos de Lujo en ' + (cn[p] || p), 'url': cu, 'description': pd, 'provider': org() });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Destinos', url: B.url + '/destinos/' }, { name: cn[p] || p, url: cu }]));
  }
  else if (p === 'quien-hay-detras') {
    out.push({ '@context': 'https://schema.org', '@type': 'AboutPage', 'name': 'Quien hay detras de Horizonte Exclusivo', 'url': cu, 'mainEntity': { '@type': 'Person', '@id': B.url + '/#founder', 'name': B.founder, 'jobTitle': B.founderTitle, 'worksFor': org(), 'knowsAbout': ['Viajes de lujo', 'Viajes a medida', 'Luna de miel', 'Safaris', 'Viajes corporativos', 'Turismo exclusivo'] } });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Quien hay detras', url: cu }]));
  }
  else if (p === 'contacto') {
    out.push({ '@context': 'https://schema.org', '@type': 'ContactPage', 'name': 'Contacto - Horizonte Exclusivo', 'url': cu, 'mainEntity': { '@type': 'TravelAgency', '@id': B.url + '/#organization', 'name': B.name, 'telephone': B.telephone, 'email': B.email, 'address': { '@type': 'PostalAddress', 'streetAddress': B.street, 'addressLocality': B.city, 'addressRegion': B.region, 'postalCode': B.zip, 'addressCountry': B.country } } });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Contacto', url: cu }]));
  }
  else if (p === 'blog') {
    out.push({ '@context': 'https://schema.org', '@type': 'Blog', 'name': 'Blog de Viajes de Lujo - Horizonte Exclusivo', 'url': cu, 'description': pd, 'publisher': org() });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Blog', url: cu }]));
  }
  else if (p.indexOf('blog/') === 0) {
    out.push({ '@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': headline(pt), 'description': pd, 'url': cu, 'author': { '@type': 'Person', '@id': B.url + '/#founder', 'name': B.founder }, 'publisher': { '@type': 'Organization', '@id': B.url + '/#organization', 'name': B.name, 'logo': { '@type': 'ImageObject', 'url': B.logo } }, 'mainEntityOfPage': { '@type': 'WebPage', '@id': cu } });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Blog', url: B.url + '/blog/' }, { name: headline(pt), url: cu }]));
  }
  else if (p === 'destinos') {
    out.push({ '@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'Destinos de Lujo - Horizonte Exclusivo', 'url': cu, 'description': pd, 'provider': org() });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Destinos', url: cu }]));
  }
  else if (p === 'pro-tips') {
    out.push({ '@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'Travel Hacks de Viaje - Horizonte Exclusivo', 'url': cu, 'description': pd, 'provider': org() });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Travel Hacks', url: cu }]));
  }
  else if (p === 'luna-de-miel-a-medida') {
    out.push({ '@context': 'https://schema.org', '@type': 'Service', 'name': 'Lunas de Miel a Medida', 'url': cu, 'description': pd, 'provider': org(), 'areaServed': { '@type': 'Country', 'name': 'Espana' }, 'serviceType': 'Luna de miel a medida' });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Luna de Miel a Medida', url: cu }]));
  }
  else if (p === 'safari-de-lujo-a-medida') {
    out.push({ '@context': 'https://schema.org', '@type': 'Service', 'name': 'Safaris de Lujo a Medida', 'url': cu, 'description': pd, 'provider': org(), 'areaServed': { '@type': 'Country', 'name': 'Espana' }, 'serviceType': 'Safari de lujo a medida' });
    const faqSafari = buildHomeFaq(html);
    if (faqSafari) out.push(faqSafari);
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Safari de Lujo a Medida', url: cu }]));
  }
  else if (p === 'viajes-de-empresa-a-medida') {
    out.push({ '@context': 'https://schema.org', '@type': 'Service', 'name': 'Viajes de Empresa e Incentivos a Medida', 'url': cu, 'description': pd, 'provider': org(), 'areaServed': { '@type': 'Country', 'name': 'Espana' }, 'serviceType': 'Viaje de empresa a medida' });
    const faqEmpresa = buildHomeFaq(html);
    if (faqEmpresa) out.push(faqEmpresa);
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Viajes de Empresa a Medida', url: cu }]));
  }
  else if (p === 'viajes-a-medida-barcelona') {
    out.push({ '@context': 'https://schema.org', '@type': 'Service', 'name': 'Viajes a Medida en Barcelona', 'url': cu, 'description': pd, 'provider': org(), 'areaServed': [{ '@type': 'City', 'name': 'Barcelona' }, { '@type': 'AdministrativeArea', 'name': 'Baix Llobregat' }, { '@type': 'City', 'name': 'Molins de Rei' }], 'serviceType': 'Viajes a medida' });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Viajes a Medida Barcelona', url: cu }]));
  }
  else if (p === 'agencia-viajes-lujo-barcelona') {
    out.push({ '@context': 'https://schema.org', '@type': 'TravelAgency', 'name': 'Horizonte Exclusivo - Agencia de Viajes de Lujo en Barcelona', 'url': cu, 'description': pd, 'telephone': B.telephone, 'email': B.email, 'address': { '@type': 'PostalAddress', 'streetAddress': B.street, 'addressLocality': B.city, 'addressRegion': B.region, 'postalCode': B.zip, 'addressCountry': B.country }, 'geo': { '@type': 'GeoCoordinates', 'latitude': B.lat, 'longitude': B.lng }, 'areaServed': [{ '@type': 'City', 'name': 'Barcelona' }, { '@type': 'AdministrativeArea', 'name': 'Baix Llobregat' }, { '@type': 'AdministrativeArea', 'name': 'Cataluna' }] });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Agencia Viajes Lujo Barcelona', url: cu }]));
  }
  else if (p === 'luna-de-miel-barcelona') {
    out.push({ '@context': 'https://schema.org', '@type': 'Service', 'name': 'Luna de Miel desde Barcelona', 'url': cu, 'description': pd, 'provider': org(), 'areaServed': [{ '@type': 'City', 'name': 'Barcelona' }, { '@type': 'AdministrativeArea', 'name': 'Baix Llobregat' }, { '@type': 'City', 'name': 'Molins de Rei' }], 'serviceType': 'Luna de miel a medida' });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Luna de Miel Barcelona', url: cu }]));
  }
  else if (p.indexOf('pro-tips-') === 0) {
    const ps = p.replace('pro-tips-', ''), pn = D[ps] || ps;
    out.push({ '@context': 'https://schema.org', '@type': 'Article', 'headline': headline(pt), 'description': pd, 'url': cu, 'image': { '@type': 'ImageObject', 'url': ogimg, 'width': 1200, 'height': 630 }, 'datePublished': lm, 'dateModified': lm, 'author': { '@type': 'Person', '@id': B.url + '/#founder', 'name': B.founder }, 'publisher': { '@type': 'Organization', '@id': B.url + '/#organization', 'name': B.name, 'logo': { '@type': 'ImageObject', 'url': B.logo } }, 'mainEntityOfPage': { '@type': 'WebPage', '@id': cu } });
    const faq = buildFaq(html, pn);
    if (faq) out.push(faq);
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Destinos', url: B.url + '/destinos/' }, { name: pn, url: B.url + '/' + ps + '/' }, { name: 'Travel Hacks', url: cu }]));
  }
  else if (BLOG_GUIDES.includes(p)) {
    out.push({ '@context': 'https://schema.org', '@type': 'Article', 'headline': headline(pt), 'description': pd, 'url': cu, 'image': { '@type': 'ImageObject', 'url': ogimg, 'width': 1200, 'height': 630 }, 'datePublished': lm, 'dateModified': lm, 'author': { '@type': 'Person', '@id': B.url + '/#founder', 'name': B.founder }, 'publisher': { '@type': 'Organization', '@id': B.url + '/#organization', 'name': B.name, 'logo': { '@type': 'ImageObject', 'url': B.logo } }, 'mainEntityOfPage': { '@type': 'WebPage', '@id': cu } });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Blog', url: B.url + '/blog/' }, { name: headline(pt), url: cu }]));
  }
  else if (p === 'molins-de-rei') {
    out.push({ '@context': 'https://schema.org', '@type': 'TravelAgency', 'name': 'Horizonte Exclusivo - Agencia de Viajes de Lujo en Molins de Rei', 'url': cu, 'description': pd, 'telephone': B.telephone, 'email': B.email, 'address': { '@type': 'PostalAddress', 'streetAddress': B.street, 'addressLocality': B.city, 'addressRegion': B.region, 'postalCode': B.zip, 'addressCountry': B.country }, 'geo': { '@type': 'GeoCoordinates', 'latitude': B.lat, 'longitude': B.lng }, 'hasMap': 'https://www.google.com/maps?cid=' + B.mapCid, 'areaServed': [{ '@type': 'City', 'name': 'Molins de Rei' }, { '@type': 'AdministrativeArea', 'name': 'Baix Llobregat' }, { '@type': 'City', 'name': 'Sant Feliu de Llobregat' }, { '@type': 'City', 'name': 'Sant Joan Despi' }, { '@type': 'City', 'name': 'Esplugues de Llobregat' }, { '@type': 'City', 'name': 'Cornella de Llobregat' }, { '@type': 'City', 'name': 'Sant Boi de Llobregat' }, { '@type': 'City', 'name': 'Barcelona' }] });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Molins de Rei', url: cu }]));
  }
  else if (p === 'baix-llobregat') {
    out.push({ '@context': 'https://schema.org', '@type': 'TravelAgency', 'name': 'Horizonte Exclusivo - Agencia de Viajes de Lujo en el Baix Llobregat', 'url': cu, 'description': pd, 'telephone': B.telephone, 'email': B.email, 'address': { '@type': 'PostalAddress', 'streetAddress': B.street, 'addressLocality': B.city, 'addressRegion': B.region, 'postalCode': B.zip, 'addressCountry': B.country }, 'geo': { '@type': 'GeoCoordinates', 'latitude': B.lat, 'longitude': B.lng }, 'hasMap': 'https://www.google.com/maps?cid=' + B.mapCid, 'areaServed': [{ '@type': 'AdministrativeArea', 'name': 'Baix Llobregat' }, { '@type': 'City', 'name': 'Molins de Rei' }, { '@type': 'City', 'name': 'Sant Feliu de Llobregat' }, { '@type': 'City', 'name': 'Sant Just Desvern' }, { '@type': 'City', 'name': 'Sant Joan Despi' }, { '@type': 'City', 'name': 'Esplugues de Llobregat' }, { '@type': 'City', 'name': 'Cornella de Llobregat' }, { '@type': 'City', 'name': 'Sant Boi de Llobregat' }, { '@type': 'City', 'name': 'El Prat de Llobregat' }, { '@type': 'City', 'name': 'Castelldefels' }, { '@type': 'City', 'name': 'Gava' }, { '@type': 'City', 'name': 'Viladecans' }, { '@type': 'City', 'name': 'Martorell' }, { '@type': 'City', 'name': 'Barcelona' }] });
    out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: 'Baix Llobregat', url: cu }]));
  }
  else { out.push(bc([{ name: 'Inicio', url: B.url + '/' }, { name: headline(pt), url: cu }])); }

  return out;
}

function block(objs) {
  // Escape < and > as unicode so a stray "</script>" in any text can't break out of the tag.
  const safe = (o) => JSON.stringify(o, null, 2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  const scripts = objs.map(o => '<script type="application/ld+json">\n' + safe(o) + '\n</script>').join('\n');
  return START + '\n' + scripts + '\n' + END;
}

function inject(html, blk) {
  // remove previous generated block
  html = html.replace(new RegExp(START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\n?', 'g'), '');
  // remove any pre-existing hand-written ld+json (only the home had one)
  html = html.replace(/[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/gi, '');
  // insert before </head>
  return html.replace(/([ \t]*)<\/head>/i, blk + '\n$1</head>');
}

// collect files
function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path.join(dir, e.name), acc); }
    else if (e.isFile() && e.name.toLowerCase() === 'index.html') acc.push(path.join(dir, e.name));
  }
  return acc;
}
function slugOf(file) { return path.relative(ROOT, file).replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\/$/, ''); }

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlySlugs = args.filter(a => a !== '--dry');

const files = [path.join(ROOT, 'index.html'), ...walk(ROOT, [])];
const uniq = [...new Set(files)].sort();
let written = 0; const typeCount = {}; let faqPages = 0, faqQuestions = 0;

for (const file of uniq) {
  const slug = slugOf(file);
  if (onlySlugs.length && !onlySlugs.includes(slug || 'home')) continue;
  const html = fs.readFileSync(file, 'utf8');
  const objs = generate(slug, html);
  for (const o of objs) { const t = Array.isArray(o['@type']) ? o['@type'].join('/') : o['@type']; typeCount[t] = (typeCount[t] || 0) + 1; if (t === 'FAQPage') { faqPages++; faqQuestions += o.mainEntity.length; } }
  const blk = block(objs);
  if (dry) {
    console.log('\n========== ' + (slug || '(home)') + ' ==========');
    console.log(blk);
  } else {
    const next = inject(html, blk);
    fs.writeFileSync(file, next, 'utf8');
    written++;
  }
}
console.log('\n--- RESUMEN ---');
console.log(dry ? 'DRY RUN (sin escribir)' : ('Escritas: ' + written + ' páginas'));
console.log('Tipos JSON-LD generados:', JSON.stringify(typeCount, null, 0));
console.log('FAQPage:', faqPages, '| preguntas FAQ totales:', faqQuestions);
