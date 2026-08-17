#!/usr/bin/env python3
"""
Compara un resultado nuevo de inspección contra el último commiteado.
Escribe un resumen en markdown (stdout + --summary-out), una versión corta
para Telegram (--telegram-out) y exit code != 0 si hay cambios que merecen
alerta.

Usado por la GitHub Action para decidir si avisar y commitear el snapshot.

Qué mira, por orden de importancia:
  1. Totales, URLs que entran en el índice y URLs que salen.
  2. «Google ha vuelto a pasar»: URLs cuya fecha de rastreo ha cambiado desde
     el snapshot anterior. Es EL dato que se espera tras tocar una página: si
     Google la vuelve a rastrear y sigue fuera, el veredicto está dado; si aún
     no ha vuelto, no hay veredicto. Antes el informe solo contaba estados y
     esta diferencia no se veía.
  3. URLs clave (money pages y rescates) con su estado, su último rastreo y
     si ese rastreo es posterior al último cambio (lastmod del sitemap).
  4. Desglose de no indexadas. «Discovered» y «URL is unknown» se agrupan
     como «sin rastrear»: la API alterna entre los dos para la misma URL de
     un día para otro (/india/ lo hizo 6 veces en 3 semanas) y no significa nada.
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BASE_URL = "https://www.horizonteexclusivo.es"

# URLs que importan de verdad: las que venden y las que se rescataron el 14-ago.
# Si una deja de estar en el sitemap (p.ej. por una 301) se marca y no rompe nada.
URLS_CLAVE = [
    "/",
    "/molins-de-rei/",
    "/baix-llobregat/",
    "/agencia-viajes-lujo-barcelona/",
    "/viajes-a-medida-barcelona/",
    "/viajes-exclusivos-a-medida/",
    "/luna-de-miel-a-medida/",
    "/viajes-de-empresa-a-medida/",
    "/safari-de-lujo-a-medida/",
    "/cuanto-cuesta-viaje-a-medida/",
    "/destinos/",
    # rescates del 14-ago (fusión de Travel Hacks + enlaces contextuales)
    "/chicago-nueva-orleans/",
    "/costa-rica/",
    "/ecuador/",
    "/hawai/",
    "/mauricio/",
    "/suiza/",
]

SIN_RASTREAR = {"Discovered - currently not indexed", "URL is unknown to Google"}


def load(path):
    if not Path(path).exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def cargar_lastmod():
    """{ruta: 'AAAA-MM-DD'} a partir del sitemap.xml del repo."""
    ruta = RAIZ / "sitemap.xml"
    try:
        txt = ruta.read_text(encoding="utf-8")
    except OSError:
        return {}
    out = {}
    for loc, lm in re.findall(r"<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>", txt):
        out[loc.replace(BASE_URL, "") or "/"] = lm.strip()[:10]
    return out


def fecha(s):
    """'2026-08-17T00:19:36Z' -> '2026-08-17'; 'N/A' -> None."""
    if not s or s == "N/A":
        return None
    return s[:10]


def estado_corto(r):
    if not r:
        return None
    if r.get("verdict") == "PASS":
        return "✅ indexada"
    cov = r.get("coverage", "?")
    if cov in SIN_RASTREAR:
        return "⚪ sin rastrear"
    if cov == "Crawled - currently not indexed":
        return "🔴 rastreada, fuera"
    return cov


def visto_el_cambio(r, lastmod):
    """
    ¿El último rastreo de Google es posterior al último cambio de la página?
    Devuelve (texto, ha_visto: bool|None).
    """
    c = fecha((r or {}).get("crawled"))
    if not c:
        return "⏳ nunca rastreada", None
    if lastmod and c < lastmod:
        return f"⏳ vio la versión anterior ({c}); el cambio del {lastmod} sigue sin rastrear", False
    return f"👁 vista el {c}", True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--new", required=True)
    ap.add_argument("--old", required=True)
    ap.add_argument("--summary-out", default="scripts_seo/last_summary.md")
    ap.add_argument("--telegram-out", default="scripts_seo/last_telegram.md")
    args = ap.parse_args()

    new = load(args.new)
    old = load(args.old)
    if not new:
        print("ERROR: no new results", file=sys.stderr)
        return 2

    lastmod = cargar_lastmod()
    res_new = new["resultados_completos"]
    res_old = (old or {}).get("resultados_completos", {})

    lines = []      # informe completo
    tg = []         # versión corta para Telegram (≤ ~3000 caracteres)
    alert = False
    motivos = []

    cab = f"# Inspección {new['fecha'][:16]}"
    lines += [cab, "", f"- **Total:** {new['total']} URLs", f"- **Indexadas:** {new['indexadas']}",
              f"- **No indexadas:** {new['no_indexadas']}", f"- **Errores:** {new['errores']}"]
    tg += [f"Inspección {new['fecha'][:10]} · {new['indexadas']} indexadas / {new['no_indexadas']} fuera de {new['total']}"]

    # ------------------------------------------------------------------ 1. totales y entradas/salidas
    if old:
        d_ix = new["indexadas"] - old["indexadas"]
        d_ni = new["no_indexadas"] - old["no_indexadas"]
        lines += ["", f"**Cambio vs snapshot previo ({old['fecha'][:16]}):** indexadas {d_ix:+d}, no indexadas {d_ni:+d}."]
        tg.append(f"vs {old['fecha'][:10]}: indexadas {d_ix:+d}")
        if d_ix != 0 or d_ni != 0:
            alert = True
            motivos.append("cambio en totales")

        new_set, old_set = set(new["detalle_indexadas"]), set(old["detalle_indexadas"])
        nuevas, caidas = sorted(new_set - old_set), sorted(old_set - new_set)
        if nuevas:
            alert = True
            motivos.append("nuevas indexadas")
            lines += ["", f"## 🆕 Nuevas indexadas ({len(nuevas)})"] + [f"- `{u}`" for u in nuevas]
            tg += ["", f"🆕 Entran ({len(nuevas)}): " + ", ".join(nuevas)]
        if caidas:
            alert = True
            motivos.append("salidas del índice")
            lines += ["", f"## ⚠️ Salieron del índice ({len(caidas)})"] + [f"- `{u}`" for u in caidas]
            tg += ["", f"⚠️ Salen ({len(caidas)}): " + ", ".join(caidas)]

    # ------------------------------------------------------------------ 2. Google ha vuelto a pasar
    # Solo se puede saber comparando con el snapshot anterior. Se separa en:
    #   a) volvió y SIGUE FUERA  -> veredicto negativo sobre la versión que vio
    #   b) volvió por una URL clave indexada -> ha visto el cambio (informativo)
    #   c) resto de indexadas re-rastreadas -> solo el número
    if old:
        vuelve_fuera, vuelve_clave, vuelve_resto = [], [], []
        for u, r in res_new.items():
            c_new, c_old = fecha(r.get("crawled")), fecha(res_old.get(u, {}).get("crawled"))
            if not c_new or c_new == c_old:
                continue
            if r.get("verdict") != "PASS":
                vuelve_fuera.append((u, c_new, r.get("coverage", "?")))
            elif u in URLS_CLAVE:
                vuelve_clave.append((u, c_new))
            else:
                vuelve_resto.append((u, c_new))
        if vuelve_fuera or vuelve_clave or vuelve_resto:
            lines += ["", "## 🔁 Google ha vuelto a pasar desde el snapshot anterior"]
        if vuelve_fuera:
            alert = True
            motivos.append("re-rastreo de páginas fuera del índice")
            lines += ["", f"### 🔴 Volvió y SIGUEN FUERA ({len(vuelve_fuera)}) — veredicto sobre lo que vio"]
            tg += ["", f"🔴 Google volvió y siguen fuera ({len(vuelve_fuera)}):"]
            for u, c, cov in vuelve_fuera:
                lm = lastmod.get(u)
                nota = f"vio la versión del {lm}" if lm and c >= lm else (f"⚠️ pero vio una versión ANTERIOR al cambio del {lm}" if lm else "")
                lines.append(f"- `{u}` rastreada el {c} → {cov}. {nota}")
                tg.append(f"  · {u} ({c}) {('— ' + nota) if nota else ''}")
        if vuelve_clave:
            lines += ["", f"### 👁 URLs clave que ha vuelto a leer ({len(vuelve_clave)})"] + [f"- `{u}` el {c}" for u, c in vuelve_clave]
            tg += ["", "👁 Releídas (clave): " + ", ".join(f"{u} ({c[5:]})" for u, c in vuelve_clave)]
        if vuelve_resto:
            lines += ["", f"_Además ha vuelto a leer {len(vuelve_resto)} páginas indexadas más._"]

    # ------------------------------------------------------------------ 3. URLs clave
    lines += ["", "## 🎯 URLs clave (money pages y rescates del 14-ago)", "",
              "| URL | Estado | ¿Ha visto el último cambio? | Estado previo |", "|---|---|---|---|"]
    tg_clave_cambios = []
    tg_clave_pendientes = []
    for u in URLS_CLAVE:
        r = res_new.get(u)
        if r is None:
            lines.append(f"| `{u}` | — (fuera del sitemap) | — | — |")
            continue
        est = estado_corto(r)
        visto, ha_visto = visto_el_cambio(r, lastmod.get(u))
        prev = estado_corto(res_old.get(u)) if old else "n/a"
        prev = prev or "n/a"
        marca = ""
        if old and res_old.get(u) is not None and prev != est:
            alert = True
            motivos.append(f"cambio de estado en {u}")
            marca = " **(cambió)**"
            tg_clave_cambios.append(f"{u}: {prev} → {est}")
        lines.append(f"| `{u}` | {est}{marca} | {visto} | {prev} |")
        if ha_visto is False and r.get("verdict") != "PASS":
            tg_clave_pendientes.append(u)
    if tg_clave_cambios:
        tg += ["", "🎯 Cambios en URLs clave: " + " · ".join(tg_clave_cambios)]
    if tg_clave_pendientes:
        tg += ["", f"⏳ Fuera del índice y Google aún no ha visto la versión nueva ({len(tg_clave_pendientes)}): " + ", ".join(tg_clave_pendientes)]

    # ------------------------------------------------------------------ 4. desglose de no indexadas
    estados = Counter()
    for u, r in res_new.items():
        if r["verdict"] != "PASS":
            estados[r["coverage"]] += 1
    if estados:
        sin_rastrear = sum(v for k, v in estados.items() if k in SIN_RASTREAR)
        lines += ["", "## Desglose no indexadas"]
        for k, v in estados.most_common():
            if k in SIN_RASTREAR:
                continue
            lines.append(f"- **{k}:** {v}")
        if sin_rastrear:
            det = " · ".join(f"{k.split(' - ')[0]} {v}" for k, v in estados.items() if k in SIN_RASTREAR)
            lines.append(f"- **Sin rastrear todavía:** {sin_rastrear} ({det}; la API alterna entre ambos, es el mismo cajón)")

    # URLs "Crawled - currently not indexed", con la fecha del rastreo y si vio el cambio
    crawled_ni = sorted([(u, r) for u, r in res_new.items() if r.get("coverage") == "Crawled - currently not indexed"])
    if crawled_ni:
        lines += ["", f"## 🔴 Crawled - currently not indexed ({len(crawled_ni)})"]
        pend = 0
        for u, r in crawled_ni:
            visto, ha_visto = visto_el_cambio(r, lastmod.get(u))
            if ha_visto is False:
                pend += 1
            lines.append(f"- `{u}` — {visto}")
        if pend:
            lines += ["", f"_{pend} de {len(crawled_ni)} han cambiado después del último rastreo de Google: su veredicto está pendiente, no dado._"]
            tg += ["", f"🔴 Rastreadas y fuera: {len(crawled_ni)} ({pend} con cambios que Google aún no ha visto)"]
        else:
            tg += ["", f"🔴 Rastreadas y fuera: {len(crawled_ni)}"]

    if motivos:
        lines += ["", f"_Aviso disparado por: {'; '.join(dict.fromkeys(motivos))}._"]

    summary = "\n".join(lines)
    Path(args.summary_out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.summary_out).write_text(summary, encoding="utf-8")
    texto_tg = "\n".join(tg)
    if len(texto_tg) > 3000:
        texto_tg = texto_tg[:2990] + "\n…"
    Path(args.telegram_out).write_text(texto_tg, encoding="utf-8")
    print(summary)

    # Exit code: 0 si no hay cambios (silent), 1 si hay cambios (avisar). 2 en errores.
    if alert:
        # Flag file para que el workflow lo detecte sin parsear exit codes.
        Path("scripts_seo/.alert").write_text("1", encoding="utf-8")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
