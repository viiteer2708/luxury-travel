#!/usr/bin/env python3
"""
Inyecta Open Graph + Twitter Card en todas las index.html que no los tengan.
Lee title, description, canonical y primer background-image para construir los tags.
"""
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", ".vercel", ".github", "node_modules", "images", "scripts_seo"}
DEFAULT_IMAGE = "https://www.horizonteexclusivo.es/images/japon1.jpg"


def find_pages():
    pages = []
    for p in ROOT.rglob("index.html"):
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        pages.append(p)
    return sorted(pages)


def extract(html, pattern, group=1):
    m = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
    return m.group(group).strip() if m else None


def build_og_block(title, description, canonical, image):
    bare_title = re.sub(r"\s*\|\s*Horizonte Exclusivo\s*$", "", title).strip()
    short_desc = description
    if len(short_desc) > 200:
        cut = short_desc[:197]
        last_space = cut.rfind(" ")
        short_desc = cut[:last_space] + "…" if last_space > 0 else cut + "…"
    return f"""
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="{canonical}">
    <meta property="og:title" content="{escape(bare_title)}">
    <meta property="og:description" content="{escape(short_desc)}">
    <meta property="og:image" content="{image}">
    <meta property="og:locale" content="es_ES">
    <meta property="og:site_name" content="Horizonte Exclusivo">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta property="twitter:domain" content="horizonteexclusivo.es">
    <meta property="twitter:url" content="{canonical}">
    <meta name="twitter:title" content="{escape(bare_title)}">
    <meta name="twitter:description" content="{escape(short_desc)}">
    <meta name="twitter:image" content="{image}">
"""


def escape(s):
    return s.replace('"', '&quot;').replace("\n", " ").strip()


def normalize_image(url):
    # Si es Unsplash con ?w=1920, sustituir por w=1200 (tamaño OG recomendado)
    if "images.unsplash.com" in url:
        url = re.sub(r"w=\d+", "w=1200", url)
        if "w=" not in url:
            sep = "&" if "?" in url else "?"
            url += f"{sep}w=1200&q=80"
    return url


def process(path):
    raw = path.read_bytes()
    uses_crlf = b"\r\n" in raw[:4096]
    html = raw.decode("utf-8")

    if "og:title" in html:
        return "skip_already_has"

    title = extract(html, r"<title>([^<]+)</title>")
    description = extract(html, r'<meta\s+name="description"\s+content="([^"]+)"')
    canonical = extract(html, r'<link\s+rel="canonical"\s+href="([^"]+)"')

    if not (title and description and canonical):
        return f"skip_missing_meta(title={bool(title)},desc={bool(description)},canonical={bool(canonical)})"

    # Primer background-image (hero). Si es Unsplash, lo usamos; si no, default.
    hero_match = re.search(r"background-image:\s*url\(['\"]([^'\"]+)['\"]\)", html)
    image = DEFAULT_IMAGE
    if hero_match:
        candidate = hero_match.group(1)
        if candidate.startswith("http") or candidate.startswith("/"):
            if candidate.startswith("/"):
                candidate = "https://www.horizonteexclusivo.es" + candidate
            image = normalize_image(candidate)

    og_block = build_og_block(title, description, canonical, image)

    # Insertar después del canonical
    new_html = re.sub(
        r'(<link\s+rel="canonical"\s+href="[^"]+">)',
        r"\1" + og_block,
        html,
        count=1,
    )

    if new_html == html:
        return "skip_no_insertion_point"

    out_bytes = new_html.encode("utf-8")
    if uses_crlf:
        # El bloque insertado viene con LF; convertir a CRLF solo en las líneas nuevas
        # Atajo seguro: si el original usa CRLF, garantizamos que el archivo entero
        # mantenga CRLF como terminador (normalizamos el bloque insertado).
        # Solo reemplazamos \n que no vengan ya precedidos de \r dentro del bloque nuevo.
        out_bytes = re.sub(rb"(?<!\r)\n", b"\r\n", out_bytes)
    path.write_bytes(out_bytes)
    return "ok"


def main():
    pages = find_pages()
    print(f"Páginas encontradas: {len(pages)}")

    stats = {"ok": 0, "skip_already_has": 0, "skip_missing_meta": 0, "skip_other": 0}
    by_result = {}

    for p in pages:
        rel = p.relative_to(ROOT)
        result = process(p)
        if result == "ok":
            stats["ok"] += 1
        elif result == "skip_already_has":
            stats["skip_already_has"] += 1
        elif result.startswith("skip_missing_meta"):
            stats["skip_missing_meta"] += 1
            by_result.setdefault(result, []).append(str(rel))
        else:
            stats["skip_other"] += 1
            by_result.setdefault(result, []).append(str(rel))
        print(f"  [{result[:30]:30s}] {rel}")

    print()
    print("=== RESUMEN ===")
    for k, v in stats.items():
        print(f"  {k:25s} {v}")
    if by_result:
        print()
        print("=== DETALLES DE SKIPS ===")
        for reason, files in by_result.items():
            print(f"  {reason}: {len(files)} archivos")
            for f in files[:5]:
                print(f"    - {f}")


if __name__ == "__main__":
    main()
