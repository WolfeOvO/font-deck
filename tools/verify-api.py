from pathlib import Path
import json,hashlib,urllib.request,urllib.error,concurrent.futures,time
root=Path(__file__).resolve().parents[1];manifest=json.loads((root/'extension/FONT-SOURCES.json').read_text());base='https://draft.wolfeovo.top/font-deck-api/v1-r1/';headers={'User-Agent':'Mozilla/5.0 FontDeckOnlineVerification','Accept-Encoding':'identity'};out=root/'artifacts/api-public-verification.json';out.parent.mkdir(exist_ok=True)
def verify(asset):
 for attempt in range(3):
  try:
   request=urllib.request.Request(base+'files/'+asset['file'],headers=headers);h=hashlib.sha256();size=0
   with urllib.request.urlopen(request,timeout=90) as response:
    status=response.status;mime=response.headers.get('Content-Type');cors=response.headers.get('Access-Control-Allow-Origin');length=response.headers.get('Content-Length');encoding=response.headers.get('Transfer-Encoding')
    assert status==200 and cors=='*'
    while block:=response.read(1024*1024):size+=len(block);h.update(block)
   assert size==asset['bytes'] and h.hexdigest()==asset['sha256'],asset['file']+' body mismatch'
   if length is not None:assert int(length)==size,asset['file']+' declared length mismatch'
   return {'id':asset['id'],'bytes':size,'sha256':h.hexdigest(),'mime':mime,'contentLength':int(length) if length else None,'transferEncoding':encoding,'pass':True}
  except (urllib.error.URLError,TimeoutError,OSError) as error:
   if attempt==2:raise
   time.sleep(1)
with urllib.request.urlopen(urllib.request.Request(base+'manifest.json',headers=headers),timeout=30) as response:public=json.load(response)
assert public==manifest
expected={a['id'] for a in manifest['font_resources']};results={};failures=[]
# Do not trust prior partial reports: verify all assets against current inventory.
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
 futures={executor.submit(verify,a):a for a in manifest['font_resources']}
 for future in concurrent.futures.as_completed(futures):
  asset=futures[future]
  try:result=future.result();results[result['id']]=result
  except Exception as error:failures.append({'id':asset['id'],'file':asset['file'],'error':str(error)})
  if (len(results)+len(failures))%20==0 or failures:
   out.write_text(json.dumps({'pass':False,'expected':len(expected),'verified':len(results),'results':list(results.values()),'failures':failures},indent=2)+'\n');print('VERIFIED',len(results),'FAILED',len(failures),flush=True)
assert not failures and set(results)==expected and len(results)==516,failures
sample=manifest['font_resources'][0];request=urllib.request.Request(base+'files/'+sample['file'],headers={**headers,'Range':'bytes=10-99'})
with urllib.request.urlopen(request,timeout=30) as response:
 assert response.status==206 and len(response.read())==90;range_result={'status':206,'contentRange':response.headers.get('Content-Range')}
request=urllib.request.Request(base+'files/'+sample['file'],headers=headers,method='HEAD')
with urllib.request.urlopen(request,timeout=30) as response:
 assert response.status==200;head_length=response.headers.get('Content-Length')
 if head_length is not None:assert int(head_length)==sample['bytes']
 head_result={'status':200,'contentLength':int(head_length) if head_length else None}
rows=[results[k] for k in sorted(results)];result={'pass':True,'base':base,'expected':516,'verified':len(rows),'bytes':sum(r['bytes'] for r in rows),'results':rows,'failures':[],'range':range_result,'headVerified':True,'head':head_result,'noCookie':True,'actualBodyLengthAndSHA256Verified':True};out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='results'},indent=2))
