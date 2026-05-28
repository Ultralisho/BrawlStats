#!/usr/bin/env python3
"""
recolector_masivo.py  –  Recolección masiva (~1 M partidas) de jugadores normales
==================================================================================
Trabajo de Fin de Grado

Estrategia para diversidad real (evita el sesgo de top players):
  1. Rankings de 80+ países   → ~16 000 jugadores semilla diversos
  2. Battlelog de cada semilla → ~400 000 partidas brutas
  3. Expansión de clubs        → +800 000 más
  4. Deduplicación continua    → objetivo ~1 000 000 partidas únicas

Características:
  - Checkpoint automático cada 10 min → puedes parar con Ctrl+C y reanudar
  - ETA en pantalla en tiempo real
  - Límite configurable (TARGET_UNIQUE) para no pasarse

Instalación:
  pip install aiohttp

Uso:
  python recolector_masivo.py            # lanzamiento normal
  python recolector_masivo.py --resume   # retoma desde checkpoint
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional

import aiohttp

# ─────────────────────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────────────────────

def _read_dotenv(path: str = ".env") -> dict[str, str]:
    for enc in ("utf-8-sig", "utf-8", "utf-16"):
        try:
            result: dict[str, str] = {}
            with open(path, encoding=enc) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, _, v = line.partition("=")
                        result[k.strip()] = v.strip()
            return result
        except UnicodeDecodeError:
            continue
        except FileNotFoundError:
            return {}
    return {}

_env = _read_dotenv()

API_KEY = (
    _env.get("BRAWL_API_TOKEN") or _env.get("BRAWL_API_KEY")
    or os.getenv("BRAWL_API_TOKEN") or os.getenv("BRAWL_API_KEY")
    or ""
).strip()

BASE_URL       = "https://api.brawlstars.com/v1"
CALLS_PER_SEC  = 5
MAX_CLUBS      = 300          # clubs a expandir en fase 3
TARGET_UNIQUE  = 1_000_000   # parar cuando lleguemos aquí
CHECKPOINT_FILE = "checkpoint_masivo.json"
OUTPUT_JSON    = "partidas_masivo.json"
OUTPUT_CSV     = "partidas_masivo.csv"
CHECKPOINT_EVERY = 600        # segundos entre checkpoints automáticos

CSV_COLS = ["fecha", "modo", "mapa", "resultado", "brawler", "trofeos_brawler"]

# Países con rankings activos en Brawl Stars (ISO 3166-1 alpha-2)
# "global" primero, luego los más activos por región
COUNTRY_CODES = [
    "global",
    # América
    "US","BR","MX","AR","CO","CL","PE","VE","EC","GT","CR","PA","DO","HN","SV","NI","BO","PY","UY",
    # Europa
    "DE","FR","ES","IT","PL","RU","TR","NL","BE","SE","NO","DK","FI","PT","RO","CZ","HU","GR","AT","CH","HR","SK","BG","RS","LT","LV","EE","SI","UA","BY",
    # Asia
    "KR","JP","TH","PH","MY","SG","ID","VN","TW","HK","CN","SA","AE","IQ","EG","PK","IN","BD","LK","MM","KH","LA",
    # Oceanía y otros
    "AU","NZ","ZA","NG","GH","MA","KE",
]

# ─────────────────────────────────────────────────────────────
# Estado global
# ─────────────────────────────────────────────────────────────

_battles: dict[str, dict] = {}
_seen:    set[str]         = set()
_club_tags_seen: set[str]  = set()
_cnt = dict(jugadores=0, clubs=0, battlelogs=0, brutas=0, unicas=0)
_rl: Optional["_RateLimiter"] = None
_start_time: float = 0.0
_last_checkpoint: float = 0.0


# ─────────────────────────────────────────────────────────────
# Rate limiter
# ─────────────────────────────────────────────────────────────

class _RateLimiter:
    def __init__(self, rps: int) -> None:
        self._sem = asyncio.Semaphore(rps)

    @asynccontextmanager
    async def __call__(self):
        await self._sem.acquire()
        try:
            yield
        finally:
            asyncio.get_running_loop().call_later(1.0, self._sem.release)


# ─────────────────────────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────────────────────────

def _norm(tag: str) -> str:
    t = tag.strip().upper()
    return t if t.startswith("#") else f"#{t}"

def _enc(tag: str) -> str:
    return tag.replace("#", "%23")

def _battle_key(entry: dict) -> str:
    b = entry.get("battle", {})
    tags: list[str] = []
    for team in b.get("teams", []):
        for p in team:
            tags.append(p.get("tag", ""))
    for p in b.get("players", []):
        tags.append(p.get("tag", ""))
    return f"{entry.get('battleTime', '')}|{'|'.join(sorted(tags))}"

def _parse_dt(bt: str) -> str:
    try:
        return datetime.strptime(bt, "%Y%m%dT%H%M%S.%fZ").strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return bt

def _make_row(entry: dict, player_tag: str) -> dict:
    event = entry.get("event", {})
    b     = entry.get("battle", {})
    ptag  = player_tag.upper()
    brawler = "?"
    trofeos: Optional[int] = None
    for team in b.get("teams", []):
        for p in team:
            if p.get("tag", "").upper() == ptag:
                br = p.get("brawler", {})
                brawler = br.get("name", "?")
                trofeos = br.get("trophies")
                break
    if brawler == "?":
        for p in b.get("players", []):
            if p.get("tag", "").upper() == ptag:
                br = p.get("brawler", {})
                brawler = br.get("name", "?")
                trofeos = br.get("trophies")
                break
    return {
        "fecha":           _parse_dt(entry.get("battleTime", "")),
        "modo":            event.get("mode") or b.get("mode", "?"),
        "mapa":            event.get("map", "?"),
        "resultado":       b.get("result", "?"),
        "brawler":         brawler,
        "trofeos_brawler": trofeos,
        "_player_tag":    player_tag,
        "_battle_time":   entry.get("battleTime", ""),
        "_event_id":      event.get("id"),
        "_type":          b.get("type", "?"),
        "_rank":          b.get("rank"),
        "_trophy_change": b.get("trophyChange"),
        "_star_player":   (b.get("starPlayer") or {}).get("tag"),
    }

def _eta() -> str:
    elapsed = time.time() - _start_time
    unicas  = _cnt["unicas"]
    if unicas < 100 or elapsed < 10:
        return "calculando..."
    rate    = unicas / elapsed          # partidas/segundo
    remaining = max(0, TARGET_UNIQUE - unicas)
    secs    = remaining / rate
    return str(timedelta(seconds=int(secs)))

def _log(fase: str = "") -> None:
    c = _cnt
    eta = _eta()
    pct = min(100, c["unicas"] * 100 // TARGET_UNIQUE)
    bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
    print(
        f"\r  {fase}│ {bar} {pct:>3}% │"
        f" jugadores {c['jugadores']:>5} │"
        f" partidas únicas {c['unicas']:>7} │"
        f" ETA {eta}   ",
        end="", flush=True,
    )


# ─────────────────────────────────────────────────────────────
# Checkpoint
# ─────────────────────────────────────────────────────────────

def _save_checkpoint() -> None:
    global _last_checkpoint
    data = {
        "battles": _battles,
        "seen":    list(_seen),
        "club_tags_seen": list(_club_tags_seen),
        "cnt":     _cnt,
    }
    tmp = CHECKPOINT_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, CHECKPOINT_FILE)
    _last_checkpoint = time.time()
    print(f"\n  💾 Checkpoint guardado ({_cnt['unicas']} partidas)", flush=True)

def _load_checkpoint() -> bool:
    global _battles, _seen, _club_tags_seen, _cnt
    if not os.path.exists(CHECKPOINT_FILE):
        return False
    try:
        with open(CHECKPOINT_FILE, encoding="utf-8") as f:
            data = json.load(f)
        _battles         = data.get("battles", {})
        _seen            = set(data.get("seen", []))
        _club_tags_seen  = set(data.get("club_tags_seen", []))
        _cnt             = data.get("cnt", _cnt)
        print(f"  ✅ Checkpoint cargado: {_cnt['unicas']} partidas, {len(_seen)} jugadores vistos")
        return True
    except Exception as e:
        print(f"  ⚠  Checkpoint corrupto ({e}), empezando de cero")
        return False

def _maybe_checkpoint() -> None:
    if time.time() - _last_checkpoint >= CHECKPOINT_EVERY:
        _save_checkpoint()


# ─────────────────────────────────────────────────────────────
# Capa de red
# ─────────────────────────────────────────────────────────────

async def _get(session: aiohttp.ClientSession, path: str) -> Optional[dict]:
    async with _rl():
        try:
            async with session.get(
                f"{BASE_URL}/{path}",
                headers={"Authorization": f"Bearer {API_KEY}"},
                timeout=aiohttp.ClientTimeout(total=20),
            ) as r:
                if r.status == 200:
                    return await r.json()
                if r.status == 429:
                    await asyncio.sleep(3)
                return None
        except (asyncio.TimeoutError, aiohttp.ClientError):
            return None

async def _battlelog(session: aiohttp.ClientSession, tag: str) -> list[dict]:
    data = await _get(session, f"players/{_enc(tag)}/battlelog")
    return (data or {}).get("items", [])

async def _profile(session: aiohttp.ClientSession, tag: str) -> Optional[dict]:
    return await _get(session, f"players/{_enc(tag)}")

async def _ranking(session: aiohttp.ClientSession, country: str) -> list[str]:
    data = await _get(session, f"rankings/{country}/players")
    items = (data or {}).get("items", [])
    return [p["tag"] for p in items if p.get("tag")]

async def _club_members(session: aiohttp.ClientSession, club_tag: str) -> list[str]:
    data = await _get(session, f"clubs/{_enc(club_tag)}/members")
    return [m["tag"] for m in (data or {}).get("items", [])]


# ─────────────────────────────────────────────────────────────
# Lógica de recolección
# ─────────────────────────────────────────────────────────────

async def _process(session: aiohttp.ClientSession, raw_tag: str, fase: str = "") -> Optional[str]:
    tag = _norm(raw_tag)
    if tag in _seen:
        return None
    _seen.add(tag)

    if _cnt["unicas"] >= TARGET_UNIQUE:
        return None

    battles_raw, perfil = await asyncio.gather(
        _battlelog(session, tag),
        _profile(session, tag),
        return_exceptions=True,
    )

    if isinstance(battles_raw, Exception):
        battles_raw = []
    if isinstance(perfil, Exception):
        perfil = None

    _cnt["battlelogs"] += 1
    _cnt["jugadores"]  += 1
    _cnt["brutas"]     += len(battles_raw)

    for entry in battles_raw:
        if _cnt["unicas"] >= TARGET_UNIQUE:
            break
        key = _battle_key(entry)
        if key not in _battles:
            _battles[key] = _make_row(entry, tag)
            _cnt["unicas"] += 1

    _log(fase)
    _maybe_checkpoint()

    if perfil and isinstance(perfil, dict) and perfil.get("club"):
        return perfil["club"].get("tag")
    return None


# ─────────────────────────────────────────────────────────────
# Exportación
# ─────────────────────────────────────────────────────────────

def _export(rows: list[dict]) -> None:
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    print(f"  → {OUTPUT_JSON}  ({len(rows)} registros)")

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    print(f"  → {OUTPUT_CSV}  ({len(rows)} filas · columnas: {', '.join(CSV_COLS)})")


# ─────────────────────────────────────────────────────────────
# Orquestación
# ─────────────────────────────────────────────────────────────

async def main(resume: bool) -> None:
    global _rl, _start_time, _last_checkpoint
    _rl = _RateLimiter(CALLS_PER_SEC)
    _start_time = time.time()
    _last_checkpoint = time.time()

    if not API_KEY:
        sys.exit("❌  API key no encontrada en .env (BRAWL_API_TOKEN)")

    print("━" * 64)
    print("  Recolector masivo ~1M partidas · TFG")
    print(f"  Objetivo: {TARGET_UNIQUE:,} partidas únicas")
    print(f"  API key:  ...{API_KEY[-12:]}  ({len(API_KEY)} chars)")
    print("━" * 64)

    if resume:
        loaded = _load_checkpoint()
        if not loaded:
            print("  No se encontró checkpoint, empezando de cero.")

    if _cnt["unicas"] >= TARGET_UNIQUE:
        print(f"  Ya tenemos {_cnt['unicas']:,} partidas. Exportando...")
        _export(list(_battles.values()))
        return

    async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(limit=50)) as session:

        # ── Fase 1: Rankings de todos los países ───────────────────────────
        print(f"\n[1/3] Rankings de {len(COUNTRY_CODES)} países/regiones …")
        ranking_tasks = [_ranking(session, c) for c in COUNTRY_CODES]
        country_results = await asyncio.gather(*ranking_tasks, return_exceptions=True)

        seed_tags: list[str] = []
        for tags in country_results:
            if isinstance(tags, list):
                for t in tags:
                    nt = _norm(t)
                    if nt not in _seen:
                        seed_tags.append(t)

        seed_tags = list(dict.fromkeys(seed_tags))  # dedup preservando orden
        print(f"      {len(seed_tags)} jugadores semilla únicos de los rankings")

        if _cnt["unicas"] >= TARGET_UNIQUE:
            print("  Objetivo alcanzado ya con checkpoint.")
        else:
            # ── Fase 2: Battlelogs de los seeds ───────────────────────────
            print(f"\n[2/3] Battlelogs de {len(seed_tags)} jugadores semilla …")
            print()

            # Procesar en lotes de 50 para no saturar
            BATCH = 50
            club_tags: set[str] = set()
            for i in range(0, len(seed_tags), BATCH):
                if _cnt["unicas"] >= TARGET_UNIQUE:
                    break
                batch = seed_tags[i:i + BATCH]
                results = await asyncio.gather(
                    *[_process(session, t, f"F2 {i+len(batch):>5}/{len(seed_tags)} ") for t in batch],
                    return_exceptions=True,
                )
                for r in results:
                    if isinstance(r, str) and r and r not in _club_tags_seen:
                        club_tags.add(r)

            print(f"\n      {_cnt['unicas']:,} partidas únicas │ {len(club_tags)} clubs encontrados")

            # ── Fase 3: Expansión por clubs ────────────────────────────────
            if _cnt["unicas"] < TARGET_UNIQUE:
                to_expand = [c for c in list(club_tags) if c not in _club_tags_seen][:MAX_CLUBS]
                _club_tags_seen.update(to_expand)
                _cnt["clubs"] += len(to_expand)

                print(f"\n[3/3] Miembros de {len(to_expand)} clubs …")
                print()

                member_lists = await asyncio.gather(
                    *[_club_members(session, ct) for ct in to_expand],
                    return_exceptions=True,
                )

                new_tags: list[str] = []
                for ml in member_lists:
                    if isinstance(ml, list):
                        for mt in ml:
                            if _norm(mt) not in _seen:
                                new_tags.append(mt)
                new_tags = list(dict.fromkeys(new_tags))
                print(f"\n      {len(new_tags)} nuevos jugadores de clubs")
                print()

                for i in range(0, len(new_tags), BATCH):
                    if _cnt["unicas"] >= TARGET_UNIQUE:
                        break
                    batch = new_tags[i:i + BATCH]
                    await asyncio.gather(
                        *[_process(session, t, f"F3 {i+len(batch):>6}/{len(new_tags)} ") for t in batch],
                        return_exceptions=True,
                    )

                print(f"\n      {_cnt['unicas']:,} partidas únicas en total")

        # ── Guardar ────────────────────────────────────────────────────────
        print(f"\n[✓] Guardando resultados …")
        rows = list(_battles.values())
        _export(rows)

        # Borrar checkpoint si terminamos limpiamente
        if os.path.exists(CHECKPOINT_FILE):
            os.remove(CHECKPOINT_FILE)
            print("  Checkpoint eliminado (ejecución completada).")

    c = _cnt
    elapsed = timedelta(seconds=int(time.time() - _start_time))
    print(f"\n{'━' * 64}")
    print(f"  RESUMEN  (tiempo total: {elapsed})")
    print(f"{'━' * 64}")
    print(f"  Jugadores procesados  : {c['jugadores']:>10,}")
    print(f"  Clubs expandidos      : {c['clubs']:>10,}")
    print(f"  Partidas brutas       : {c['brutas']:>10,}")
    print(f"  Partidas únicas       : {c['unicas']:>10,}")
    print(f"{'━' * 64}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", action="store_true", help="Reanudar desde checkpoint")
    args = parser.parse_args()

    try:
        asyncio.run(main(resume=args.resume))
    except KeyboardInterrupt:
        print(f"\n\n  Interrumpido. {_cnt['unicas']:,} partidas hasta ahora.")
        if _battles:
            print("  Guardando checkpoint y datos parciales …")
            _save_checkpoint()
            _export(list(_battles.values()))
