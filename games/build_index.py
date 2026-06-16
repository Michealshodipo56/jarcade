"""
Rebuild file_index.json to include every .jar game accessible from archive.org:

  1. HugeJavaMobileGameDump   - 6 zip bundles (remotezip)
  2. mobiles24j2me             - 27 alphabetical zip bundles (remotezip)
  3. 800j2megames_201805       - 1 zip (remotezip)
  4. bfgs-personal-j2me-archive - 1 zip (remotezip)
  5. mobile-games              - 1 zip (remotezip)
  6. j2me128x128ulozto         - 1 zip (remotezip)
  7. j2me-hipnosis             - 25 per-game zips (remotezip)
  8. j2me-games-collection_20241209 - 15 per-game zips (remotezip)
  9. good-sorted-games-nokia-5800-xm - 1 zip (remotezip)
 10. good-sorted-games-nokia-6700-slide - 1 zip (remotezip)
 11. keitai-archive-willcom    - 1 zip (remotezip)
 12. J2MEarchivesMay2020       - 28 zips (remotezip, skip on server error)
 13. individual j2me-game-*   - 798 items, .jar files directly on archive.org

Deduplicates by URL so re-running is safe.
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

try:
    from remotezip import RemoteZip
except ImportError:
    print("remotezip not found. Run: pip install remotezip --break-system-packages")
    sys.exit(1)

OUTPUT = Path(__file__).parent / "file_index.json"
IA_BASE = "https://archive.org/download"

# ── helpers ──────────────────────────────────────────────────────────────────

def ia_url(identifier: str, filename: str) -> str:
    return f"{IA_BASE}/{identifier}/{urllib.parse.quote(filename, safe='')}"


def ia_zip_url(identifier: str, zip_name: str) -> str:
    return f"{IA_BASE}/{identifier}/{urllib.parse.quote(zip_name)}"


def ia_meta(identifier: str) -> dict:
    url = f"https://archive.org/metadata/{identifier}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def index_zip(identifier: str, zip_name: str) -> list[dict]:
    """Read .jar entries from a remote zip via HTTP range requests."""
    url = ia_zip_url(identifier, zip_name)
    try:
        with RemoteZip(url) as rz:
            names = rz.namelist()
            jars = [n for n in names if n.lower().endswith(".jar") and not n.endswith("/")]
            return [
                {
                    "name": n,
                    "path": f"//archive.org/download/{identifier}/{zip_name}/{n}",
                    "url": f"{IA_BASE}/{identifier}/{urllib.parse.quote(zip_name)}/{urllib.parse.quote(n, safe='')}",
                    "source": identifier,
                }
                for n in jars
            ]
    except Exception as e:
        print(f"    SKIP (zip error): {zip_name} — {e}", file=sys.stderr)
        return []


# ── source definitions ────────────────────────────────────────────────────────

ZIP_COLLECTIONS = [
    # (identifier, [zip_name, ...])
    ("HugeJavaMobileGameDump", [
        "Huge Java Mobile Game Dump (mastiwap dir 1).zip",
        "Huge Java Mobile Game Dump (mastiwap dir 2).zip",
        "Huge Java Mobile Game Dump (mastiwap dir 3 - nokia).zip",
        "Huge Java Mobile Game Dump (mastiwap dir 4).zip",
        "Huge Java Mobile Game Dump (mastiwap dir 5).zip",
        "Huge Java Mobile Game Dump (sasisa.ru).zip",
    ]),
    ("mobiles24j2me", [
        "#.zip","A.zip","B.zip","C.zip","D.zip","E.zip","F.zip","G.zip",
        "H.zip","I.zip","J.zip","K.zip","L.zip","M.zip","N.zip","O.zip",
        "P.zip","Q.zip","R.zip","S.zip","T.zip","U.zip","V.zip","W.zip",
        "X.zip","Y.zip","Z.zip",
    ]),
    ("800j2megames_201805", ["JavaMobileGames-all.zip"]),
    ("bfgs-personal-j2me-archive", ["BFG's personal J2ME archive.zip"]),
    ("mobile-games", ["Mobile Games.zip"]),
    ("j2me128x128ulozto", ["128x128.zip"]),
    ("good-sorted-games-nokia-5800-xm", ["GoodSortedJavaGames5800XM.zip"]),
    ("good-sorted-games-nokia-6700-slide", ["GoodSortedJavaGames6700Slide.zip"]),
    ("keitai-archive-willcom", ["Fully-Working Willcom Appli.zip"]),
]

# These are fetched by reading item metadata to get zip list dynamically
DYNAMIC_ZIP_COLLECTIONS = [
    "j2me-hipnosis",
    "j2me-games-collection_20241209",
    "J2MEarchivesMay2020",
]


def collect_zip_sources() -> list[dict]:
    entries = []
    for identifier, zip_names in ZIP_COLLECTIONS:
        print(f"\n[ZIP] {identifier}")
        for zip_name in zip_names:
            found = index_zip(identifier, zip_name)
            print(f"  {zip_name}: {len(found)} jars")
            entries.extend(found)
    return entries


def collect_dynamic_zip_sources() -> list[dict]:
    entries = []
    for identifier in DYNAMIC_ZIP_COLLECTIONS:
        print(f"\n[DYNAMIC ZIP] {identifier}")
        try:
            meta = ia_meta(identifier)
            files = meta.get("files", [])
            zip_names = [
                f["name"] for f in files
                if f.get("name", "").endswith(".zip")
                and not f["name"].endswith("_jp2.zip")
            ]
            print(f"  {len(zip_names)} zips found")
            for zip_name in zip_names:
                found = index_zip(identifier, zip_name)
                print(f"  {zip_name[:60]}: {len(found)} jars")
                entries.extend(found)
                time.sleep(0.1)
        except Exception as e:
            print(f"  ERROR: {e}", file=sys.stderr)
    return entries


def collect_individual_items(identifiers: list[str]) -> list[dict]:
    """
    Fetch .jar files from individual archive.org items.
    Each j2me-game-* item stores its game in a zip (e.g. copman3d.zip),
    not as a bare .jar. We use remotezip to read the zip's file listing.
    """
    entries = []
    total = len(identifiers)
    for i, identifier in enumerate(identifiers):
        if i % 50 == 0:
            print(f"  [{i}/{total}] processing individual items...")
        try:
            meta = ia_meta(identifier)
            title = meta.get("metadata", {}).get("title", identifier)
            files = meta.get("files", [])

            # Case 1: bare .jar files directly in the item
            jars = [f for f in files if f.get("name", "").lower().endswith(".jar")]
            for f in jars:
                name = f["name"]
                entries.append({
                    "name": f"{title}/{name}",
                    "path": f"//archive.org/download/{identifier}/{name}",
                    "url": ia_url(identifier, name),
                    "source": identifier,
                })

            # Case 2: zips containing .jar files (common pattern for j2me-game-*)
            zips = [
                f["name"] for f in files
                if f.get("name", "").endswith(".zip")
                and not f["name"].endswith("_jp2.zip")
            ]
            for zip_name in zips:
                inner = index_zip(identifier, zip_name)
                for e in inner:
                    e["name"] = f"{title}/{e['name']}"
                entries.extend(inner)

            time.sleep(0.05)
        except Exception as e:
            print(f"  SKIP {identifier}: {e}", file=sys.stderr)
    return entries


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    # Load existing index
    existing_urls: set[str] = set()
    existing_entries: list[dict] = []
    if OUTPUT.exists():
        with open(OUTPUT) as f:
            existing_entries = json.load(f)
        existing_urls = {e["url"] for e in existing_entries}
        print(f"Loaded {len(existing_entries)} existing entries")
    else:
        print("No existing index found, starting fresh")

    all_new: list[dict] = []

    def add(entries: list[dict]):
        added = 0
        for e in entries:
            if e["url"] not in existing_urls:
                existing_urls.add(e["url"])
                all_new.append(e)
                added += 1
        print(f"  → {added} new (of {len(entries)} found)")

    # 1. ZIP collections (static list)
    print("\n=== ZIP COLLECTIONS ===")
    add(collect_zip_sources())

    # 2. Dynamic zip collections
    print("\n=== DYNAMIC ZIP COLLECTIONS ===")
    add(collect_dynamic_zip_sources())

    # 3. Individual j2me-game-* items
    print("\n=== INDIVIDUAL ITEMS ===")
    j2me_ids_path = Path("/tmp/j2me_game_ids.json")
    if j2me_ids_path.exists():
        with open(j2me_ids_path) as f:
            j2me_ids = json.load(f)
        print(f"  {len(j2me_ids)} j2me-game-* identifiers to process")
        add(collect_individual_items(j2me_ids))
    else:
        print("  No j2me_game_ids.json found, fetching from archive.org...")
        meta_search = urllib.request.urlopen(
            "https://archive.org/advancedsearch.php?q=identifier%3Aj2me-game-*"
            "&fl%5B%5D=identifier&rows=5000&output=json"
        )
        data = json.load(meta_search)
        j2me_ids = [x["identifier"] for x in data["response"]["docs"]]
        print(f"  {len(j2me_ids)} identifiers found")
        add(collect_individual_items(j2me_ids))

    # Write merged index
    merged = existing_entries + all_new
    with open(OUTPUT, "w") as f:
        json.dump(merged, f, indent=2)

    print(f"\n✓ Done — {len(merged)} total entries ({len(all_new)} new)")
    print(f"Written to {OUTPUT}")


if __name__ == "__main__":
    main()
