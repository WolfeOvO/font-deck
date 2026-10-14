from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1]
files=sorted(p for p in (root/'extension').rglob('*') if p.is_file() and p.name!='CHECKSUMS.json')
report={'files':{str(p.relative_to(root/'extension')):hashlib.file_digest(p.open('rb'),'sha256').hexdigest() for p in files},'engineHasOnlyOptionalResourceCallback':'two optional requestFonts call sites relative to offline1.2.1','apiAllowlisted':True}
(root/'artifacts/source-fingerprint.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'files':len(files),'fingerprint':hashlib.sha256(json.dumps(report,sort_keys=True).encode()).hexdigest()},indent=2))
