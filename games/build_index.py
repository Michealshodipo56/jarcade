"""
Rebuild file_index.json by reading the ZIP central directories of all
6 zip bundles in the HugeJavaMobileGameDump archive item via HTTP range
requests — no need to download the full files.
"""

import json
import urllib.parse
import sys
from remotezip import RemoteZip

ITEM = "HugeJavaMobileGameDump"
BASE_URL = f"https://archive.org/download/{ITEM}"

ZIP_BUNDLES = [
    "Huge Java Mobile Game Dump (mastiwap dir 1).zip",
    "Huge Java Mobile Game Dump (mastiwap dir 2).zip",
    "Huge Java Mobile Game Dump (mastiwap dir 3 - nokia).zip",
    "Huge Java Mobile Game Dump (mastiwap dir 4).zip",
    "Huge Java Mobile Game Dump (mastiwap dir 5).zip",
    "Huge Java Mobile Game Dump (sasisa.ru).zip",
]

OUTPUT = "file_index.json"


def make_url(zip_name: str, internal_path: str) -> str:
    return (
        f"{BASE_URL}/{urllib.parse.quote(zip_name)}"
        f"/{urllib.parse.quote(internal_path, safe='')}"
    )


def index_zip(zip_name: str) -> list[dict]:
    url = f"{BASE_URL}/{urllib.parse.quote(zip_name)}"
    print(f"\n  Opening: {zip_name}")
    entries = []
    try:
        with RemoteZip(url) as rz:
            names = rz.namelist()
            jar_names = [n for n in names if n.lower().endswith(".jar")]
            print(f"    {len(names)} total entries, {len(jar_names)} .jar files")
            for name in jar_names:
                entries.append({
                    "name": name,
                    "path": f"//archive.org/download/{ITEM}/{zip_name}/{name}",
                    "url": make_url(zip_name, name),
                })
    except Exception as e:
        print(f"  ERROR reading {zip_name}: {e}", file=sys.stderr)
    return entries


def main():
    all_entries = []
    for zip_name in ZIP_BUNDLES:
        entries = index_zip(zip_name)
        all_entries.extend(entries)
        print(f"    Running total: {len(all_entries)}")

    print(f"\nTotal .jar entries: {len(all_entries)}")
    with open(OUTPUT, "w") as f:
        json.dump(all_entries, f, indent=2)
    print(f"Written to {OUTPUT}")


if __name__ == "__main__":
    main()
