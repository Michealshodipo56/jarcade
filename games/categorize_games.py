"""
Reads file_index.json and produces games_by_category.json.

Each game is assigned to the best-matching category via keyword matching on
the cleaned filename. Duplicate clean-names are collapsed (first URL wins).
Each category is capped at MAX_PER_CATEGORY entries so the output stays
browser-friendly. Uncategorised games go into "general".
"""

import json
import re
from collections import defaultdict
from pathlib import Path

MAX_PER_CATEGORY = 5000   # hard cap per bucket

# ── name cleaning ────────────────────────────────────────────────────────────

_JUNK = [
    r'\s*-\s*mastiwap\.com\.?',
    r'\s*-\s*sasisa\.ru\.?',
    r'\s*-\s*wap\d*\..*',
    r'\s*-\s*[\w]+\.(?:com|ru|net|org)\.?',
    r'\[?\d{2,3}x\d{2,3}\]?',
    r'[_\s](?:nokia|samsung|sony|lg|motorola|alcatel|siemens|ericsson)'
    r'(?:[-_\s]\w+)*',
    r'[_\s](?:s40|s60|s60v\d*|cldc[-_]\d+|midp[-_]\d+)',
    r'[_\s](?:desktop|mobile|retail|demo|trial|full|mod|fixed|patch)',
    r'[_\s]n(?:95|73|70|85|81|82|97|86|80|91|92|900|series)\b',
    r'[_\s]v\d+(?:[._]\d+)*\b',
    r'[_\s](?:240x320|320x240|176x220|128x128|128x160|240x400|360x640)',
    r'\(v?[\d.]+\)',
    r'[_\s](?:en|fr|de|it|es|pt|ru|pl|ro|hu|cs|sk)\b',
    r'[-_]+$',
]

def clean_name(raw: str) -> str:
    name = raw.split("/")[-1]
    name = re.sub(r"\.jar$", "", name, flags=re.IGNORECASE)
    for pat in _JUNK:
        name = re.sub(pat, "", name, flags=re.IGNORECASE)
    name = re.sub(r"[-_]+", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name.title() if name else "Unknown Game"


def norm(name: str) -> str:
    """Normalise for dedup."""
    return re.sub(r"\W+", "", name.lower())


# ── categories ───────────────────────────────────────────────────────────────
# Order matters: first match wins.

CATEGORIES = [
    ("racing", "Racing", "fa-flag-checkered", "#f59e0b", [
        "asphalt", "need for speed", "gran turismo", "fast and furious",
        "motocross", "speedway", "superbike", "burnout nitro",
        "dakar", "formula racing", "wrc", "rally", "racing", "drift",
        "turbo racing", "road rash", "traffic rush", "moto gp",
        "nascar", "race driver", "burnout", "nitro",
        "moto", "turbo", "kart", "circuit", "race", "speed",
    ]),
    ("sports", "Sports", "fa-trophy", "#10b981", [
        "real football", "fifa", "pro evolution soccer", "nba", "nfl", "nhl",
        "pga tour", "wwe smackdown", "ufc", "wimbledon",
        "basketball", "football", "soccer", "tennis", "cricket",
        "golf", "boxing", "bowling", "baseball", "billiards",
        "billiard", "pool", "volleyball", "hockey", "wrestling",
        "badminton", "ping pong", "pingpong", "snooker", "darts",
        "skateboard", "surfing", "snowboard", "skiing", "swimming",
        "olympic", "agassi", "federer", "sport",
    ]),
    ("puzzle", "Puzzle", "fa-puzzle-piece", "#8b5cf6", [
        "bejeweled", "mahjong", "mahjongg", "sokoban", "zuma",
        "tetris", "bubble", "jewel quest", "gem jam", "sudoku",
        "crossword", "block breaker", "tower bloxx", "peggle",
        "diamond", "jewel", "gem", "match", "puzzle", "lines",
        "pipe", "hex", "slide", "block",
    ]),
    ("action", "Action", "fa-bolt", "#ef4444", [
        "batman", "spider-man", "spiderman", "iron man", "ironman",
        "splinter cell", "metal slug", "mortal kombat", "street fighter",
        "gangstar", "gta san andreas", "grand theft auto",
        "assassin", "hitman", "manhunt",
        "contra", "kung fu", "worms", "doom",
        "ninja", "commando", "warrior", "brawl", "combat",
        "fight", "blade", "dark knight", "hero of sparta",
        "god of war", "devil may cry", "ghost rider",
        "star wars", "matrix", "rambo", "terminator",
    ]),
    ("adventure", "Adventure", "fa-map", "#06b6d4", [
        "prince of persia", "tomb raider", "diamond rush",
        "castlevania", "earthworm jim", "indiana jones",
        "king kong", "shrek", "nemo", "ice age",
        "lara croft", "zelda", "metroid",
        "legend of spyro", "ratchet", "jak and daxter",
        "sonic", "mario", "treasure", "quest", "adventure",
        "temple", "dungeon", "explore", "journey",
    ]),
    ("shooting", "Shooting", "fa-crosshairs", "#f97316", [
        "call of duty", "battlefield", "counter-strike",
        "ghost recon", "rainbow six", "heli strike",
        "air combat", "star wars shooter",
        "sniper", "shooter", "gunner", "blaster", "blazer",
        "cannon", "laser", "shoot", "target",
    ]),
    ("arcade", "Arcade", "fa-gamepad", "#ec4899", [
        "pac-man", "pacman", "bubble bobble", "arkanoid",
        "breakout", "galaxian", "galaga", "centipede",
        "frogger", "pinball", "defender", "missile command",
        "asteroids", "space invader", "donkey kong",
        "snake", "breakout", "pong",
    ]),
    ("strategy", "Strategy", "fa-chess", "#64748b", [
        "age of empires", "warcraft", "starcraft", "command conquer",
        "civilization", "stronghold", "settlers", "risk",
        "tower defense", "tower defence",
        "empire", "conquest", "simcity", "sim city", "strategy",
    ]),
    ("rpg", "RPG", "fa-dragon", "#a855f7", [
        "final fantasy", "sacred", "dungeons and dragons",
        "baldur", "diablo", "neverwinter",
        "dragon age", "dark souls",
        "rpg", "dragon", "mage", "wizard",
        "dungeon master", "realm", "elf quest",
    ]),
    ("horror", "Horror", "fa-skull", "#6b7280", [
        "resident evil", "silent hill", "darkest fear",
        "dead space", "dead rising", "evil dead",
        "zombie", "horror", "haunted", "cursed", "terror",
    ]),
    ("simulation", "Simulation", "fa-city", "#0ea5e9", [
        "the sims", "sim city", "roller coaster",
        "virtual villagers", "fish tycoon",
        "tycoon", "manager", "simulation",
        "restaurant", "hospital", "airport", "zoo",
        "farm", "shop", "life simulator",
    ]),
    ("casual", "Casual", "fa-star", "#fbbf24", [
        "angry birds", "cut the rope", "fruit ninja",
        "doodle jump", "flappy", "bubble shooter",
        "candy", "jelly", "cookie", "pop", "tap", "fun",
    ]),
    ("general", "General", "fa-grip-vertical", "#94a3b8", []),
]

CAT_KEYS    = [c[0] for c in CATEGORIES]
CAT_LABELS  = {c[0]: c[1] for c in CATEGORIES}
CAT_ICONS   = {c[0]: c[2] for c in CATEGORIES}
CAT_COLORS  = {c[0]: c[3] for c in CATEGORIES}
CAT_KW      = [(c[0], [kw.lower() for kw in c[4]]) for c in CATEGORIES if c[4]]


def assign_category(name_lower: str) -> str:
    for key, keywords in CAT_KW:
        for kw in keywords:
            if kw in name_lower:
                return key
    return "general"


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    here = Path(__file__).parent
    index_path = here / "file_index.json"
    out_path   = here / "games_by_category.json"

    print(f"Loading {index_path} …")
    with open(index_path) as f:
        entries = json.load(f)
    print(f"  {len(entries):,} raw entries")

    buckets: dict[str, list] = defaultdict(list)
    seen: dict[str, set] = defaultdict(set)   # key → set of norm-names

    for entry in entries:
        raw_name = entry.get("name", "")
        url      = entry.get("url", "")
        if not raw_name or not url:
            continue

        name  = clean_name(raw_name)
        key   = assign_category(name.lower())
        nname = norm(name)

        if nname in seen[key]:
            continue                  # skip duplicate
        seen[key].add(nname)

        if len(buckets[key]) >= MAX_PER_CATEGORY:
            continue

        buckets[key].append({"n": name, "u": url})

    # build ordered output
    result = {"categories": []}
    for cat_key, cat_label, cat_icon, cat_color, _ in CATEGORIES:
        games = buckets.get(cat_key, [])
        result["categories"].append({
            "key":   cat_key,
            "label": cat_label,
            "icon":  cat_icon,
            "color": cat_color,
            "games": games,
        })
        print(f"  {cat_label:<14} {len(games):>6,} games")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = out_path.stat().st_size / 1024
    print(f"\nWritten to {out_path}  ({size_kb:.0f} KB)")

    # Also write per-category files for lazy loading
    cat_dir = here / "categories"
    cat_dir.mkdir(exist_ok=True)
    for cat in result["categories"]:
        cat_path = cat_dir / f"{cat['key']}.json"
        with open(cat_path, "w", encoding="utf-8") as f:
            json.dump(cat["games"], f, ensure_ascii=False, separators=(",", ":"))
        size = cat_path.stat().st_size / 1024
        print(f"  {cat_dir.name}/{cat['key']}.json  {size:.0f} KB")


if __name__ == "__main__":
    main()
