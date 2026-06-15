import requests
import os
from urllib.parse import quote, unquote

url = "https://archive.org/download/HugeJavaMobileGameDump/Huge%20Java%20Mobile%20Game%20Dump%20%28mastiwap%20dir%202%29.zip/Mobile_Games/Nokia%20Games/Nokia_S60V5/452%20Games%20N95%208Gb/Aqua_Stax%20-%20Mastiwap.Com.jar"

print(f"Downloading from {url}")
try:
    resp = requests.get(url, stream=True, timeout=120)
    print(f"Status Code: {resp.status_code}")
    resp.raise_for_status()
    
    content_type = resp.headers.get('content-type', '').lower()
    content_disp = resp.headers.get('content-disposition', '').lower()
    
    print(f"Content-Type: {content_type}")
    print(f"Content-Disposition: {content_disp}")
    
    dest_path = "test.jar"
    with open(dest_path, 'wb') as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
            break # Just test first chunk
    
    print(f"Saved size: {os.path.getsize(dest_path)}")
except Exception as e:
    import traceback
    traceback.print_exc()
