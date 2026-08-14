#!/usr/bin/env python3
"""
¿La caída es de agosto o es nuestra? Separa demanda (menos gente buscando) de
posicionamiento (Google nos ha bajado).

Existe porque el informe semanal del 14-ago dijo que /molins-de-rei/ perdía un 31% de
impresiones y el sitio 572, y «puede ser agosto» no es una respuesta: hay que probarlo.
La prueba está en tres cruces:

  1. La CURVA semanal. Una caída estacional baja en pendiente; una penalización o una
     desindexación baja de golpe, en un escalón, un día concreto.
  2. La POSICIÓN de las consultas que siguen ahí. Si aparecemos igual de arriba y aun así
     hay menos impresiones, es que hay menos búsquedas: eso es agosto. Si la posición
     empeora, el problema es nuestro.
  3. El REPARTO por páginas. Agosto le pega a todo el sitio; un problema técnico o de
     contenido se concentra en unas pocas URLs.

Y de propina el interanual (mismas fechas de hace un año), que solo vale si el sitio ya
tenía tráfico entonces — con una base de 20 impresiones no se compara nada.

Necesita GOOGLE_SA_JSON, así que en la práctica se lanza desde el workflow gsc-estacionalidad.yml:
    python3 scripts_seo/estacionalidad.py [--pagina /molins-de-rei/] [--semanas 16]
"""
import argparse
import json
import os
import time
import urllib.parse
import urllib.request
from datetime import date, timedelta

import jwt  # PyJWT

SITE_URL = "sc-domain:horizonteexclusivo.es"
BASE = "https://www.horizonteexclusivo.es"
SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
API = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(SITE_URL, safe='')}/searchAnalytics/query"
LAG_DAYS = 3
WINDOW_DAYS = 28
# 364 y no 365: así el periodo de hace un año cae en los mismos días de la semana, que
# tienen mucho peso (el fin de semana se busca menos).
YEAR_SHIFT = 364


def load_service_account():
    sa_json = os.environ.get("GOOGLE_SA_JSON")
    if sa_json:
        return json.loads(sa_json)
    with open(os.environ.get("GOOGLE_SA_FILE", "service-account.json")) as f:
        return json.load(f)


def get_token(sa):
    now = int(time.time())
    signed = jwt.encode({"iss": sa["client_email"], "scope": SCOPE, "aud": sa["token_uri"],
                         "iat": now, "exp": now + 3600}, sa["private_key"], algorithm="RS256")
    data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": signed}).encode()
    req = urllib.request.Request(sa["token_uri"], data=data)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())["access_token"]


def consulta(token, start, end, dimensions=(), pagina=None, row_limit=1000):
    body = {"startDate": start.isoformat(), "endDate": end.isoformat(),
            "dimensions": list(dimensions), "rowLimit": row_limit, "dataState": "final"}
    if pagina:
        body["dimensionFilterGroups"] = [{"filters": [
            {"dimension": "page", "operator": "equals", "expression": BASE + pagina}]}]
    req = urllib.request.Request(API, data=json.dumps(body).encode())
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode()).get("rows", [])


def total(token, start, end, pagina=None):
    """Total SIN dimensiones. Es el único número que Search Console da por bueno: en cuanto
    se desglosa por consulta, las consultas poco frecuentes se anonimizan y el total sale
    muy corto (el error del 14-ago)."""
    filas = consulta(token, start, end, (), pagina)
    if not filas:
        return {"impr": 0, "clicks": 0, "pos": 0.0}
    f = filas[0]
    return {"impr": int(f["impressions"]), "clicks": int(f["clicks"]), "pos": f["position"]}


def serie_semanal(token, start, end, pagina=None):
    """Impresiones por semana. El desglose por FECHA sí suma el total (la anonimización es
    de las consultas, no de los días), así que aquí agrupar es legítimo."""
    filas = consulta(token, start, end, ("date",), pagina, row_limit=500)
    por_dia = {r["keys"][0]: r for r in filas}
    semanas = []
    cursor = end
    while cursor >= start:
        ini = max(cursor - timedelta(days=6), start)
        impr = clicks = 0
        pos_pond = 0.0
        d = ini
        while d <= cursor:
            r = por_dia.get(d.isoformat())
            if r:
                i = int(r["impressions"])
                impr += i
                clicks += int(r["clicks"])
                pos_pond += r["position"] * i
            d += timedelta(days=1)
        semanas.append({"ini": ini, "fin": cursor, "impr": impr, "clicks": clicks,
                        "pos": pos_pond / impr if impr else 0.0})
        cursor = ini - timedelta(days=1)
    return list(reversed(semanas))


def fmt(p):
    return f"{p:.1f}".replace(".", ",")


def pct(a, b):
    if not b:
        return "n/a"
    v = (a - b) / b * 100
    return f"{v:+.0f}%".replace(".", ",")


def barra(valor, maximo, ancho=32):
    if maximo <= 0:
        return ""
    return "█" * max(1, round(valor / maximo * ancho)) if valor else ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pagina", default="/molins-de-rei/")
    ap.add_argument("--semanas", type=int, default=16)
    ap.add_argument("--top", type=int, default=20)
    args = ap.parse_args()

    token = get_token(load_service_account())
    end = date.today() - timedelta(days=LAG_DAYS)
    start = end - timedelta(days=WINDOW_DAYS - 1)
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=WINDOW_DAYS - 1)
    serie_ini = end - timedelta(days=args.semanas * 7 - 1)

    print(f"📅 Ventana actual {start:%d/%m}-{end:%d/%m} · anterior {prev_start:%d/%m}-{prev_end:%d/%m}")
    print(f"   (dataState final, lag de {LAG_DAYS} días)\n")

    # ── 1. La curva: ¿pendiente o escalón? ────────────────────────────────────────────
    for etiqueta, pag in (("TODO EL SITIO", None), (args.pagina, args.pagina)):
        semanas = serie_semanal(token, serie_ini, end, pag)
        techo = max((s["impr"] for s in semanas), default=0)
        print(f"📈 Impresiones por semana — {etiqueta}")
        for s in semanas:
            print(f"   {s['ini']:%d/%m}-{s['fin']:%d/%m} {s['impr']:5d} impr · pos {fmt(s['pos']):>5} "
                  f"· {s['clicks']:3d} clics  {barra(s['impr'], techo)}")
        print()

    # ── 2. Interanual: solo vale si hace un año había algo que comparar ───────────────
    print("🗓️  Mismas fechas del año pasado (mismos días de la semana)")
    for etiqueta, pag in (("TODO EL SITIO", None), (args.pagina, args.pagina)):
        ahora = total(token, start, end, pag)
        hace_un_ano = total(token, start - timedelta(days=YEAR_SHIFT),
                            end - timedelta(days=YEAR_SHIFT), pag)
        julio_pasado = total(token, prev_start - timedelta(days=YEAR_SHIFT),
                             prev_end - timedelta(days=YEAR_SHIFT), pag)
        print(f"   {etiqueta}: {hace_un_ano['impr']} impr hace un año → {ahora['impr']} ahora")
        print(f"      y el año pasado, de julio a agosto: {julio_pasado['impr']} → {hace_un_ano['impr']} "
              f"({pct(hace_un_ano['impr'], julio_pasado['impr'])})")
        if julio_pasado["impr"] < 50:
            print("      ⚠️ base demasiado pequeña: este dato NO decide nada")
    print()

    # ── 3. ¿La caída está repartida o concentrada? ────────────────────────────────────
    ahora_p = {r["keys"][0]: r for r in consulta(token, start, end, ("page",), row_limit=1000)}
    antes_p = {r["keys"][0]: r for r in consulta(token, prev_start, prev_end, ("page",), row_limit=1000)}
    urls = set(ahora_p) | set(antes_p)
    filas = []
    for u in urls:
        ia = int(ahora_p[u]["impressions"]) if u in ahora_p else 0
        ib = int(antes_p[u]["impressions"]) if u in antes_p else 0
        pa = ahora_p[u]["position"] if u in ahora_p else 0.0
        pb = antes_p[u]["position"] if u in antes_p else 0.0
        filas.append((ia - ib, u.replace(BASE, ""), ib, ia, pb, pa))
    filas.sort()
    tsitio_a = total(token, start, end)
    tsitio_b = total(token, prev_start, prev_end)
    print(f"🧮 TOTAL del sitio: {tsitio_b['impr']} → {tsitio_a['impr']} impr "
          f"({pct(tsitio_a['impr'], tsitio_b['impr'])}) · pos {fmt(tsitio_b['pos'])} → {fmt(tsitio_a['pos'])} "
          f"· clics {tsitio_b['clicks']} → {tsitio_a['clicks']}")
    bajan = [f for f in filas if f[0] < 0]
    caida_total = sum(-f[0] for f in bajan)
    top3 = sum(-f[0] for f in bajan[:3])
    if caida_total:
        print(f"   páginas que bajan: {len(bajan)} de {len(urls)} · las 3 peores explican "
              f"{top3} de {caida_total} impresiones perdidas ({top3 / caida_total * 100:.0f}%)")
    print("\n📉 Las que más pierden")
    for d, u, ib, ia, pb, pa in filas[:args.top]:
        if d >= 0:
            break
        print(f"   {d:+5d} · {ib:5d} → {ia:5d} impr · pos {fmt(pb):>5} → {fmt(pa):>5} · {u}")
    print("\n📈 Las que más ganan")
    for d, u, ib, ia, pb, pa in reversed(filas[-args.top:]):
        if d <= 0:
            break
        print(f"   {d:+5d} · {ib:5d} → {ia:5d} impr · pos {fmt(pb):>5} → {fmt(pa):>5} · {u}")

    # ── 4. La página vigilada: ¿menos búsquedas o peor posición? ──────────────────────
    print(f"\n🔎 {args.pagina} — consultas que están en los DOS periodos")
    ca = {r["keys"][0]: r for r in consulta(token, start, end, ("query",), args.pagina, 500)}
    cb = {r["keys"][0]: r for r in consulta(token, prev_start, prev_end, ("query",), args.pagina, 500)}
    comunes = [q for q in ca if q in cb]
    if comunes:
        impr_a = sum(int(ca[q]["impressions"]) for q in comunes)
        impr_b = sum(int(cb[q]["impressions"]) for q in comunes)
        pos_a = sum(ca[q]["position"] * int(ca[q]["impressions"]) for q in comunes) / impr_a
        pos_b = sum(cb[q]["position"] * int(cb[q]["impressions"]) for q in comunes) / impr_b
        print(f"   {len(comunes)} consultas · {impr_b} → {impr_a} impr ({pct(impr_a, impr_b)}) "
              f"· pos {fmt(pos_b)} → {fmt(pos_a)}")
        print("   ↑ si la posición aguanta y las impresiones caen, es DEMANDA (agosto), no ranking\n")
        for q in sorted(comunes, key=lambda x: -int(ca[x]["impressions"]))[:args.top]:
            a, b = ca[q], cb[q]
            print(f"     {int(b['impressions']):4d} → {int(a['impressions']):4d} impr · "
                  f"pos {fmt(b['position']):>5} → {fmt(a['position']):>5} · «{q}»")


if __name__ == "__main__":
    main()
