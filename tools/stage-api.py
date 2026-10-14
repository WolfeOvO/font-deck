from pathlib import Path
import argparse,json,hashlib,shutil
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--source',default='/data/font-deck-extension/extension');p.add_argument('--output',default='/opt/1panel/www/sites/draft.wolfeovo.top/index/font-deck-api/v1-r1');args=p.parse_args();source=Path(args.source);out=Path(args.output);out.mkdir(parents=True,exist_ok=True);(out/'files').mkdir(exist_ok=True)
sources=json.loads((root/'extension/FONT-SOURCES.json').read_text());rows=[]
for asset in sources['font_resources']:
 src=source/asset['original_path'];assert src.stat().st_size==asset['bytes'];assert hashlib.file_digest(src.open('rb'),'sha256').hexdigest()==asset['sha256']
 dst=out/'files'/asset['file']
 if dst.exists():assert hashlib.file_digest(dst.open('rb'),'sha256').hexdigest()==asset['sha256']
 else:shutil.copyfile(src,dst)
 dst.chmod(0o644);rows.append({'file':asset['file'],'bytes':dst.stat().st_size,'sha256':hashlib.file_digest(dst.open('rb'),'sha256').hexdigest()})
assert len(rows)==len({r['file'] for r in rows})==516
shutil.copytree(root/'extension/licenses',out/'licenses',dirs_exist_ok=True)
(out/'manifest.json').write_text(json.dumps(sources,ensure_ascii=False,separators=(',',':'))+'\n')
(out/'manifest.json').chmod(0o644)
report={'pass':True,'output':str(out),'files':len(rows),'bytes':sum(r['bytes'] for r in rows),'inventory':rows};(root/'artifacts/api-local-inventory.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='inventory'},indent=2))
