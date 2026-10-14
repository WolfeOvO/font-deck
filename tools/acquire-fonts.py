from pathlib import Path
import argparse,json,hashlib,urllib.request,concurrent.futures
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--workers',type=int,default=3);args=p.parse_args();out=Path(args.output);sources=json.loads((root/'extension/FONT-SOURCES.json').read_text())['font_resources']
def get(a):
 target=out/a['original_path'];target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists() and target.stat().st_size==a['bytes'] and hashlib.file_digest(target.open('rb'),'sha256').hexdigest()==a['sha256']:return a['id']
 partial=target.with_suffix(target.suffix+'.partial');req=urllib.request.Request(a['source_url'],headers={'User-Agent':'Mozilla/5.0 FontDeckSourceAcquisition'})
 with urllib.request.urlopen(req,timeout=120) as response,partial.open('wb') as stream:
  while chunk:=response.read(1024*1024):stream.write(chunk)
 assert partial.stat().st_size==a['bytes'] and hashlib.file_digest(partial.open('rb'),'sha256').hexdigest()==a['sha256'],a['original_path'];partial.replace(target);return a['id']
with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(8,args.workers))) as pool:
 ids=list(pool.map(get,sources))
assert len(ids)==len(set(ids))==516
print(json.dumps({'pass':True,'output':str(out),'verified':len(ids)},indent=2))
