#!/usr/bin/env python3
"""
Proyecto anti-ratas (Python)

Compara a quién sigues vs quién te sigue, y opcionalmente deja de seguir
a quienes no te siguen de vuelta.

Uso:
    export GITHUB_TOKEN=ghp_xxx          # token con scope user:follow
    python anti_ratas.py                  # solo lista (simulación)
    python anti_ratas.py --unfollow       # deja de seguir de verdad
    python anti_ratas.py --whitelist amigo1 amigo2
    (también puedes poner usuarios a salvo, uno por línea, en whitelist.txt)

Requiere: pip install requests
"""
import argparse
import os
import sys
import time

import requests

API = "https://api.github.com"


def make_session(token):
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    return s


def get_all_logins(s, path):
    """Recorre todas las páginas de un endpoint de usuarios."""
    logins = []
    url = f"{API}{path}"
    params = {"per_page": 100}
    while url:
        r = s.get(url, params=params)
        r.raise_for_status()
        logins += [u["login"] for u in r.json()]
        url = r.links.get("next", {}).get("url")
        params = None  # la URL "next" ya trae los parámetros
    return logins


def load_whitelist(extra):
    names = set(n.lower() for n in extra)
    if os.path.exists("whitelist.txt"):
        with open("whitelist.txt", encoding="utf-8") as f:
            names |= {l.strip().lower() for l in f if l.strip() and not l.startswith("#")}
    return names


def unfollow(s, login):
    r = s.delete(f"{API}/user/following/{login}")
    if r.status_code == 204:
        return True
    if r.status_code in (403, 429):
        wait = int(r.headers.get("Retry-After", 60))
        print(f"  Límite de uso alcanzado, esperando {wait}s...")
        time.sleep(wait)
        return unfollow(s, login)
    print(f"  Error {r.status_code} con {login}: {r.text}")
    return False


def main():
    p = argparse.ArgumentParser(description="Detecta (y opcionalmente deja de seguir) a quienes no te siguen de vuelta.")
    p.add_argument("--unfollow", action="store_true", help="dejar de seguir de verdad (por defecto solo lista)")
    p.add_argument("--whitelist", nargs="*", default=[], help="usuarios que nunca se dejan de seguir")
    p.add_argument("--delay", type=float, default=2.0, help="segundos entre cada unfollow (default 2)")
    args = p.parse_args()

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        sys.exit("Falta la variable de entorno GITHUB_TOKEN")

    s = make_session(token)
    me = s.get(f"{API}/user")
    me.raise_for_status()
    print(f"Usuario autenticado: {me.json()['login']}")

    followers = {l.lower() for l in get_all_logins(s, "/user/followers")}
    following = get_all_logins(s, "/user/following")
    safe = load_whitelist(args.whitelist)

    ratas = [l for l in following if l.lower() not in followers and l.lower() not in safe]

    print(f"Te siguen: {len(followers)} | Sigues: {len(following)} | No te siguen de vuelta: {len(ratas)}\n")
    for l in ratas:
        print(f"  https://github.com/{l}")

    if not ratas:
        return
    if not args.unfollow:
        print("\nModo simulación: no se hizo ningún cambio. Usa --unfollow para ejecutar.")
        return

    print("\nDejando de seguir...")
    done = 0
    for l in ratas:
        if unfollow(s, l):
            done += 1
            print(f"  ✔ {l}")
        time.sleep(args.delay)
    print(f"\nListo: {done}/{len(ratas)} usuarios dejados de seguir.")


if __name__ == "__main__":
    main()
