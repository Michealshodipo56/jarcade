"""
Index the 798 individual j2me-game-* archive.org items.
Each item stores its game in a zip file (e.g. copman3d.zip)
which contains one or more .jar files.
Uses remotezip + HTTP range requests — no full downloads.
Saves progress to a checkpoint file so it can be resumed.
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from remotezip import RemoteZip

OUTPUT    = Path(__file__).parent / "file_index.json"
CHECKPOINT = Path(__file__).parent / "individual_checkpoint.json"
IDS_FILE  = Path("/tmp/j2me_game_ids.json")
IA_BASE   = "https://archive.org/download"
TIMEOUT   = 15   # seconds per HTTP request


def ia_meta(identifier: str) -> dict:
    url = f"https://archive.org/metadata/{identifier}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.load(r)


def index_zip(identifier: str, zip_name: str) -> list[dict]:
    url = f"{IA_BASE}/{identifier}/{urllib.parse.quote(zip_name)}"
    try:
        with RemoteZip(url) as rz:
            return [
                {
                    "name": n,
                    "path": f"//archive.org/download/{identifier}/{zip_name}/{n}",
                    "url": f"{IA_BASE}/{identifier}/{urllib.parse.quote(zip_name)}/{urllib.parse.quote(n, safe='')}",
                    "source": identifier,
                }
                for n in rz.namelist()
                if n.lower().endswith(".jar") and not n.endswith("/")
            ]
    except Exception as e:
        print(f"    skip zip {zip_name}: {e}", flush=True)
        return []


def main():
    # Load existing index URLs for dedup
    with open(OUTPUT) as f:
        existing = json.load(f)
    existing_urls = {e["url"] for e in existing}
    print(f"Loaded {len(existing)} existing entries", flush=True)

    # Load all IDs
    with open(IDS_FILE) as f:
        all_ids: list[str] = json.load(f)

    # Load checkpoint (already processed IDs)
    done_ids: set[str] = set()
    new_entries: list[dict] = []
    if CHECKPOINT.exists():
        cp = json.loads(CHECKPOINT.read_text())
        done_ids = set(cp.get("done", []))
        new_entries = cp.get("entries", [])
        print(f"Resuming from checkpoint: {len(done_ids)} done, {len(new_entries)} entries so far", flush=True)

    pending = [i for i in all_ids if i not in done_ids]
    total = len(all_ids)
    print(f"{len(pending)} remaining out of {total}", flush=True)

    for idx, identifier in enumerate(pending):
        pos = len(done_ids) + idx + 1
        if pos % 25 == 1:
            print(f"[{pos}/{total}] {identifier}", flush=True)

        try:
            meta = ia_meta(identifier)
            title = meta.get("metadata", {}).get("title", identifier)
            files = meta.get("files", [])

            # bare .jar files
            for f in files:
                if f.get("name", "").lower().endswith(".jar"):
                    name = f["name"]
                    new_entries.append({
                        "name": f"{title}/{name}",
                        "path": f"//archive.org/download/{identifier}/{name}",
                        "url": f"{IA_BASE}/{identifier}/{urllib.parse.quote(name, safe='')}",
                        "source": identifier,
                    })

            # zip-wrapped .jar files
            for f in files:
                zname = f.get("name", "")
                if zname.endswith(".zip") and not zname.endswith("_jp2.zip"):
                    for e in index_zip(identifier, zname):
                        e["name"] = f"{title}/{e['name']}"
                        new_entries.append(e)

        except Exception as e:
            print(f"    skip meta {identifier}: {e}", flush=True)

        done_ids.add(identifier)
        time.sleep(0.05)

        # Save checkpoint every 50 items
        if len(done_ids) % 50 == 0:
            CHECKPOINT.write_text(json.dumps({"done": list(done_ids), "entries": new_entries}))
            added_so_far = sum(1 for e in new_entries if e["url"] not in existing_urls)
            print(f"  checkpoint saved — {added_so_far} new entries so far", flush=True)

    # Final save
    CHECKPOINT.write_text(json.dumps({"done": list(done_ids), "entries": new_entries}))
    added = [e for e in new_entries if e["url"] not in existing_urls]
    merged = existing + added
    with open(OUTPUT, "w") as f:
        json.dump(merged, f, indent=2)

    print(f"\nDone — {len(merged)} total entries ({len(added)} new from individual items)", flush=True)
    CHECKPOINT.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
