#!/usr/bin/env python3
"""Da de alta un dominio en Search Console usando la cuenta de servicio (secret GOOGLE_SA_JSON).

Fase "token":     pide a Google el registro TXT de verificación del dominio (DNS) y lo imprime.
Fase "verificar": una vez publicado el TXT en el DNS, verifica el dominio, añade al propietario humano,
                  da de alta la propiedad sc-domain: en Search Console y envía el sitemap.
Uso: gsc_alta_dominio.py --dominio victormarron.es --fase token|verificar [--propietario email] [--sitemap URL]
"""
import argparse, json, os, sys, time, urllib.parse, urllib.request, urllib.error
import jwt

SCOPES = "https://www.googleapis.com/auth/siteverification https://www.googleapis.com/auth/webmasters"

def sa():
    s = os.environ.get("GOOGLE_SA_JSON")
    if not s: sys.exit("GOOGLE_SA_JSON no definido")
    return json.loads(s)

def token(sa):
    now = int(time.time())
    signed = jwt.encode({"iss": sa["client_email"], "scope": SCOPES, "aud": sa["token_uri"], "iat": now, "exp": now + 3600}, sa["private_key"], algorithm="RS256")
    data = urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": signed}).encode()
    req = urllib.request.Request(sa["token_uri"], data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    return json.loads(urllib.request.urlopen(req).read())["access_token"]

def call(tok, method, url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method,
                                 headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw.strip() else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        return e.code, (json.loads(raw) if raw.strip().startswith("{") else raw)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dominio", required=True)
    ap.add_argument("--fase", choices=["token", "verificar"], required=True)
    ap.add_argument("--propietario", default="")
    ap.add_argument("--sitemap", default="")
    a = ap.parse_args()
    s = sa(); tok = token(s)
    site = {"type": "INET_DOMAIN", "identifier": a.dominio}
    print(f"Cuenta de servicio: {s['client_email']}")
    if a.fase == "token":
        st, r = call(tok, "POST", "https://www.googleapis.com/siteVerification/v1/token", {"site": site, "verificationMethod": "DNS_TXT"})
        print("HTTP", st, json.dumps(r, ensure_ascii=False))
        if st == 200: print("TXT_A_PUBLICAR=" + r["token"])
        sys.exit(0 if st == 200 else 1)
    # verificar
    st, r = call(tok, "POST", "https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=DNS_TXT", {"site": site})
    print("verify HTTP", st, json.dumps(r, ensure_ascii=False))
    if st != 200: sys.exit(1)
    rid = r["id"]
    if a.propietario:
        owners = sorted(set(r.get("owners", []) + [a.propietario]))
        st2, r2 = call(tok, "PUT", f"https://www.googleapis.com/siteVerification/v1/webResource/{urllib.parse.quote(rid, safe='')}", {"id": rid, "site": site, "owners": owners})
        print("owners HTTP", st2, json.dumps(r2, ensure_ascii=False))
    prop = "sc-domain:" + a.dominio
    st3, r3 = call(tok, "PUT", "https://www.googleapis.com/webmasters/v3/sites/" + urllib.parse.quote(prop, safe=""))
    print("sites.add HTTP", st3, r3)
    if a.sitemap:
        st4, r4 = call(tok, "PUT", f"https://www.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(prop, safe='')}/sitemaps/{urllib.parse.quote(a.sitemap, safe='')}")
        print("sitemap HTTP", st4, r4)
    st5, r5 = call(tok, "GET", "https://www.googleapis.com/webmasters/v3/sites")
    print("sites.list HTTP", st5, json.dumps(r5, ensure_ascii=False)[:800])

if __name__ == "__main__":
    main()
