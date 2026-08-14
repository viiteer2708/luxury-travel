#!/usr/bin/env python3
"""
Fusiona páginas /pro-tips-[destino]/ dentro de su página de destino, replicando
la fusión piloto de alaska y dubai (commit b7bc4cc4).

Por qué: 25 de los 56 Travel Hacks están en "Crawled - currently not indexed".
No es por texto corto (tienen 1.000-1.300 palabras y /escocia/ con 702 sí está
indexada): es el mismo molde de 10 bloques clonado 56 veces. Google lo rastrea,
ve la plantilla otra vez y no la indexa. Fusionado en el país, ese contenido
engorda una página que sí compite en vez de competir contra ella.

Qué hace por cada destino:
  1. extrae del pro-tip los bloques .tips-section (del 01 al Top 5)
  2. los mete en la página de país dentro de <details id="consejos-viaje">
  3. le añade el CSS que necesitan esos bloques
  4. cambia el botón "Ver Travel Hacks" por el enlace al plegable
  5. 301 en vercel.json, fuera del sitemap, hub /pro-tips/ y vigía al día

NO borra las carpetas: eso se hace aparte y a conciencia (regla del CLAUDE.md).

Uso:
    python3 scripts_seo/fusionar_protips.py --dry-run   # comprueba y no toca nada
    python3 scripts_seo/fusionar_protips.py --apply
"""
import argparse
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Los 24 aprobados: 22 cuyo país YA está indexado + 2 rescates (el pro-tip está
# indexado y la página de destino no, así que la 301 le pasa la señal a la buena).
DESTINOS = [
    "albania", "alemania", "belgica", "botsuana", "brasil", "canada", "china",
    "colombia", "costa-oeste-usa", "filipinas", "francia", "grecia", "italia",
    "kenia-zanzibar", "maldivas", "peru", "polinesia-francesa", "portugal",
    "praga-viena-budapest", "sudafrica", "tanzania", "vietnam",
    # rescates
    "chicago-nueva-orleans", "costa-rica",
]

# CSS que los bloques de tips necesitan y que la página de destino no tiene.
CSS_TIPS = """
.tips-section {
    padding: 80px 0;
}

.tips-section.alt-bg {
    background: var(--dark-soft); border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);
}

.tips-section-header {
    margin-bottom: 40px;
}

.tips-section-title {
    font-size: clamp(1.5rem, 3vw, 2rem); color: var(--white); line-height: 1.2;
}

.tips-section-subtitle {
    font-size: 0.9rem; color: var(--gold-light); font-weight: 300; margin-top: 4px;
}

.tip-item {
    display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; font-size: 0.95rem; line-height: 1.7; color: var(--text);
}

.tip-item:last-child {
    margin-bottom: 0;
}

.tip-icon {
    flex-shrink: 0; font-size: 1.1rem; margin-top: 2px;
}

.tip-item strong {
    color: var(--white);
}

.tips-list {
    max-width: 780px;
}

.top5-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 32px; margin-bottom: 40px;
}

.top5-card {
    background: var(--dark-card); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius); padding: 24px; display: flex; align-items: flex-start; gap: 14px; transition: var(--transition);
}

.top5-card:hover {
    border-color: rgba(201,169,110,0.2); transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,0.3);
}

.top5-card .tip-icon {
    font-size: 1.3rem;
}

.top5-card p {
    font-size: 0.9rem; line-height: 1.7; color: var(--text);
}

.top5-card strong {
    color: var(--white);
}

#consejos-viaje > summary {
    cursor: pointer; text-align: center; color: var(--gold); font-family: 'Inter', sans-serif; font-size: 0.95rem; letter-spacing: 0.5px; padding: 8px 0 48px; font-weight: 500; list-style: none;
}

#consejos-viaje > summary::-webkit-details-marker {
    display: none;
}

#consejos-viaje > summary::before {
    content: '+ '; color: var(--gold);
}

#consejos-viaje[open] > summary::before {
    content: '\\2212 ';
}

@media (max-width: 768px) {
    .tips-section {
        padding: 48px 0;
    }

    .top5-grid {
        grid-template-columns: 1fr;
    }
}
"""


def leer(ruta):
    """Lee conservando los saltos de línea tal cual (hay ficheros en CRLF)."""
    with open(ruta, encoding="utf-8", newline="") as f:
        return f.read()


def escribir(ruta, texto):
    with open(ruta, "w", encoding="utf-8", newline="") as f:
        f.write(texto)


def bloques_tips(html):
    """
    Devuelve el HTML de todos los <div class="tips-section ...">...</div> de la
    página, en orden. Equilibra <div>/</div> en vez de usar una regex ingenua:
    cada bloque lleva divs anidados y un .*? se quedaría en el primer cierre.
    """
    fuera = []
    # El (?=[ "]) es imprescindible: sin él, "tips-section" también casa con los
    # <div class="tips-section-header"> de dentro de cada bloque y el contenido
    # sale duplicado (20 bloques en vez de 10).
    for m in re.finditer(r'<div class="tips-section(?=[ "])[^"]*"', html):
        i = m.start()
        prof = 0
        j = i
        while j < len(html):
            sig = re.search(r"<div\b|</div>", html[j:])
            if not sig:
                break
            j += sig.start()
            if html[j] == "<" and html[j + 1] != "/":
                prof += 1
                j += 4
            else:
                prof -= 1
                j += 6
                if prof == 0:
                    fuera.append(html[i:j])
                    break
    return fuera


def nombre_destino(html_pais, slug):
    """El nombre bonito, tal como ya aparece en el H2 de la sección Travel Hacks."""
    m = re.search(
        r'<section class="dest-protips">.*?<h2>Consejos de experto para\s*'
        r'<em[^>]*>(.*?)</em>',
        html_pais,
        re.S,
    )
    if m:
        return re.sub(r"<[^>]+>", "", m.group(1)).strip()
    return slug.replace("-", " ").title()


def revisar(slug):
    """Comprueba que el destino cumple todo lo que el script da por hecho."""
    problemas = []
    src = os.path.join(RAIZ, f"pro-tips-{slug}", "index.html")
    dst = os.path.join(RAIZ, slug, "index.html")
    if not os.path.exists(src):
        return [f"no existe pro-tips-{slug}/index.html"], None
    if not os.path.exists(dst):
        return [f"no existe {slug}/index.html"], None

    html_src, html_dst = leer(src), leer(dst)
    bloques = bloques_tips(html_src)
    if len(bloques) < 8:
        problemas.append(f"solo {len(bloques)} bloques de tips (esperados ~10)")
    if "#consejos-viaje" in html_dst:
        problemas.append("la página de destino YA tiene la sección fusionada")
    if f'href="/pro-tips-{slug}/" class="btn btn-primary"' not in html_dst:
        problemas.append("no encuentro el botón «Ver Travel Hacks» en el destino")
    if "</style>" not in html_dst:
        problemas.append("no encuentro el cierre del CSS embebido")
    if '<section class="dest-protips">' not in html_dst:
        problemas.append("no encuentro la sección .dest-protips")
    if ".tips-section" in html_dst:
        problemas.append("el CSS de tips ya está en el destino")

    palabras = len(re.findall(r"\w+", re.sub(r"<[^>]+>", " ", "".join(bloques))))
    return problemas, {"bloques": len(bloques), "palabras": palabras,
                       "nombre": nombre_destino(html_dst, slug)}


def fusionar(slug):
    src = os.path.join(RAIZ, f"pro-tips-{slug}", "index.html")
    dst = os.path.join(RAIZ, slug, "index.html")
    html_src, html_dst = leer(src), leer(dst)
    crlf = "\r\n" in html_dst
    nl = "\r\n" if crlf else "\n"
    nombre = nombre_destino(html_dst, slug)

    bloques = bloques_tips(html_src)
    # Los bloques vienen indentados a 4 espacios (nivel <section>); dentro del
    # <details> bajan un nivel más, como en el piloto.
    cuerpo = nl.join(
        nl.join("    " + ln if ln.strip() else ln for ln in b.split("\n"))
        for b in [x.replace("\r\n", "\n") for x in bloques]
    )

    detalle = (
        f"{nl}    <!-- CONSEJOS DE VIAJE (fusionado desde /pro-tips-{slug}/) -->{nl}"
        f'    <details id="consejos-viaje">{nl}'
        f"        <summary>Ver todos los consejos de viaje a {nombre}</summary>{nl}{nl}"
        f"{cuerpo}{nl}"
        f"    </details>{nl}"
    )

    # 1) CSS justo antes de cerrar el <style> embebido
    css = CSS_TIPS.replace("\n", nl) if crlf else CSS_TIPS
    i = html_dst.rindex("</style>")
    html_dst = html_dst[:i] + css + html_dst[i:]

    # 2) fuera el botón que llevaba al pro-tip (la sección se queda de entradilla)
    html_dst = re.sub(
        r'[ \t]*<a href="/pro-tips-' + re.escape(slug)
        + r'/" class="btn btn-primary">[^<]*</a>\r?\n',
        "",
        html_dst,
    )

    # 3) el plegable, detrás de la sección .dest-protips
    m = re.search(r'<section class="dest-protips">.*?</section>\r?\n', html_dst, re.S)
    if not m:
        raise RuntimeError(f"{slug}: no encuentro dónde cerrar .dest-protips")
    html_dst = html_dst[: m.end()] + detalle + html_dst[m.end():]

    escribir(dst, html_dst)
    return len(bloques)


def redirecciones(slugs):
    ruta = os.path.join(RAIZ, "vercel.json")
    txt = leer(ruta)
    nl = "\r\n" if "\r\n" in txt else "\n"
    nuevas = []
    for s in slugs:
        if f'"/pro-tips-{s}/"' in txt:
            continue
        nuevas.append(
            "    {" + nl
            + f'      "source": "/pro-tips-{s}/",' + nl
            + f'      "destination": "https://www.horizonteexclusivo.es/{s}/#consejos-viaje",' + nl
            + '      "permanent": true' + nl
            + "    }"
        )
    if not nuevas:
        return 0
    # se insertan al principio de "redirects", antes del comodín del dominio
    ancla = '  "redirects": [' + nl
    i = txt.index(ancla) + len(ancla)
    txt = txt[:i] + ("," + nl).join(nuevas) + "," + nl + txt[i:]
    escribir(ruta, txt)
    return len(nuevas)


def limpiar_sitemap(slugs):
    ruta = os.path.join(RAIZ, "sitemap.xml")
    txt = leer(ruta)
    n = 0
    for s in slugs:
        patron = re.compile(
            r"\s*<url>(?:(?!</url>).)*?/pro-tips-" + re.escape(s) + r"/(?:(?!</url>).)*?</url>",
            re.S,
        )
        txt, k = patron.subn("", txt)
        n += k
    escribir(ruta, txt)
    return n


def actualizar_hub(slugs):
    ruta = os.path.join(RAIZ, "pro-tips", "index.html")
    txt = leer(ruta)
    n = 0
    for s in slugs:
        txt, k = re.subn(
            r'href="/pro-tips-' + re.escape(s) + r'/"',
            f'href="/{s}/#consejos-viaje"',
            txt,
        )
        n += k
    escribir(ruta, txt)
    return n


def actualizar_vigia(slugs):
    ruta = os.path.join(RAIZ, "scripts_seo", "inspect_sitemap.py")
    txt = leer(ruta)
    n = 0
    for s in slugs:
        txt, k = re.subn(r'\s*"/pro-tips-' + re.escape(s) + r'/",', "", txt)
        n += k
    escribir(ruta, txt)
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--solo", default="", help="lista de slugs separados por comas")
    args = ap.parse_args()
    if not (args.apply or args.dry_run):
        ap.error("elige --dry-run o --apply")

    slugs = [s.strip() for s in args.solo.split(",") if s.strip()] or DESTINOS

    print(f"Destinos a fusionar: {len(slugs)}\n")
    ok, ko = [], []
    for s in slugs:
        problemas, info = revisar(s)
        if problemas:
            ko.append((s, problemas))
            print(f"  ✗ {s:24s} {'; '.join(problemas)}")
        else:
            ok.append(s)
            print(f"  ✓ {s:24s} {info['bloques']:2d} bloques · "
                  f"{info['palabras']:5d} palabras → «{info['nombre']}»")

    print(f"\n  listos: {len(ok)} · con problemas: {len(ko)}")
    if ko and args.apply:
        print("\nNo aplico nada mientras haya destinos con problemas.")
        return 1
    if args.dry_run:
        return 0

    print("\nFusionando…")
    for s in ok:
        n = fusionar(s)
        print(f"  {s}: {n} bloques dentro de /{s}/#consejos-viaje")

    print(f"\n  301 nuevas en vercel.json : {redirecciones(ok)}")
    print(f"  URLs fuera del sitemap    : {limpiar_sitemap(ok)}")
    print(f"  enlaces del hub corregidos: {actualizar_hub(ok)}")
    print(f"  URLs fuera del vigía      : {actualizar_vigia(ok)}")
    print("\nFalta: borrar las carpetas pro-tips-* y ejecutar `node build-schema.js`.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
