#!/usr/bin/env python3
"""
Compara un resultado nuevo de inspección contra el último commiteado.
Escribe un resumen en markdown (stdout + --summary-out) y exit code != 0
si hay cambios que merecen alerta.

Usado por la GitHub Action para decidir si abrir un issue y commitear
el nuevo snapshot.
"""
import argparse
import json
import sys
from pathlib import Path

# URLs que nos interesa vigilar especialmente (las reescritas el 21 abr 2026).
VIGILADAS = [
    "/islandia/",
    "/pro-tips-marruecos/",
    "/pro-tips-praga-viena-budapest/",
    "/pro-tips-tanzania/",
]


def load(path):
    if not Path(path).exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--new", required=True)
    ap.add_argument("--old", required=True)
    ap.add_argument("--summary-out", default="scripts_seo/last_summary.md")
    args = ap.parse_args()

    new = load(args.new)
    old = load(args.old)
    if not new:
        print("ERROR: no new results", file=sys.stderr)
        return 2

    lines = []
    alert = False

    lines.append(f"# Inspección {new['fecha'][:16]}")
    lines.append("")
    lines.append(f"- **Total:** {new['total']} URLs")
    lines.append(f"- **Indexadas:** {new['indexadas']}")
    lines.append(f"- **No indexadas:** {new['no_indexadas']}")
    lines.append(f"- **Errores:** {new['errores']}")

    if old:
        d_ix = new["indexadas"] - old["indexadas"]
        d_ni = new["no_indexadas"] - old["no_indexadas"]
        lines.append("")
        lines.append(f"**Cambio vs snapshot previo ({old['fecha'][:16]}):** indexadas {d_ix:+d}, no indexadas {d_ni:+d}.")
        if d_ix != 0 or d_ni != 0:
            alert = True

        new_set = set(new["detalle_indexadas"])
        old_set = set(old["detalle_indexadas"])
        nuevas = sorted(new_set - old_set)
        caidas = sorted(old_set - new_set)
        if nuevas:
            alert = True
            lines.append("")
            lines.append(f"## 🆕 Nuevas indexadas ({len(nuevas)})")
            for u in nuevas:
                lines.append(f"- `{u}`")
        if caidas:
            alert = True
            lines.append("")
            lines.append(f"## ⚠️ Salieron del índice ({len(caidas)})")
            for u in caidas:
                lines.append(f"- `{u}`")

    # Estado de las 4 vigiladas
    lines.append("")
    lines.append("## 🎯 Las 4 URLs vigiladas (reescritas el 21 abr 2026)")
    lines.append("")
    lines.append("| URL | Estado actual | Estado previo |")
    lines.append("|---|---|---|")
    for u in VIGILADAS:
        cur = new["resultados_completos"].get(u, {})
        cur_state = "✅ INDEXADA" if cur.get("verdict") == "PASS" else cur.get("coverage", "?")
        prev_state = "n/a"
        if old:
            prev = old["resultados_completos"].get(u, {})
            prev_state = "✅ INDEXADA" if prev.get("verdict") == "PASS" else prev.get("coverage", "?")
            if cur_state != prev_state:
                alert = True
                cur_state = f"**{cur_state}** (cambió)"
        lines.append(f"| `{u}` | {cur_state} | {prev_state} |")

    # Breakdown de estados
    from collections import Counter
    estados = Counter()
    for u, r in new["resultados_completos"].items():
        if r["verdict"] != "PASS":
            estados[r["coverage"]] += 1
    if estados:
        lines.append("")
        lines.append("## Desglose no indexadas")
        for k, v in estados.most_common():
            lines.append(f"- **{k}:** {v}")

    # URLs "Crawled - currently not indexed" (alarma roja)
    crawled_ni = sorted([u for u, r in new["resultados_completos"].items()
                          if r.get("coverage") == "Crawled - currently not indexed"])
    if crawled_ni:
        lines.append("")
        lines.append(f"## 🔴 Crawled - currently not indexed ({len(crawled_ni)})")
        for u in crawled_ni:
            lines.append(f"- `{u}`")

    summary = "\n".join(lines)
    Path(args.summary_out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.summary_out).write_text(summary, encoding="utf-8")
    print(summary)

    # Exit code: 0 si no hay cambios (silent), 1 si hay cambios (abrir issue).
    # 2 en errores.
    if alert:
        # Escribe un flag file para que el workflow lo detecte sin parsear exit codes.
        Path("scripts_seo/.alert").write_text("1", encoding="utf-8")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
