from pathlib import Path
import json,struct,hashlib,subprocess,tempfile,zipfile,io,os
root=Path(__file__).resolve().parents[1];report=json.loads((root/'dist/package.json').read_text());p=Path(next(f['path'] for f in report['packages'] if f['path'].endswith('.crx')));data=p.read_bytes();assert data[:4]==b'Cr24';version,size=struct.unpack('<II',data[4:12]);assert version==3;header=data[12:12+size];payload=data[12+size:]
def varint(b,i):
 v=0;shift=0
 while True:
  n=b[i];i+=1;v|=(n&127)<<shift
  if n<128:return v,i
  shift+=7;assert shift<70

def fields(b):
 i=0;out=[]
 while i<len(b):
  tag,i=varint(b,i);assert tag&7==2;length,i=varint(b,i);out.append((tag>>3,b[i:i+length]));i+=length
 return out
items=fields(header);signed=next(v for k,v in items if k==10000);proof=next(v for k,v in items if k==2);proof=dict(fields(proof));public,signature=proof[1],proof[2];crxid=dict(fields(signed))[1];assert crxid==hashlib.sha256(public).digest()[:16];identifier=''.join(chr(97+int(c,16)) for c in crxid.hex());assert identifier==report['extensionId']
with tempfile.TemporaryDirectory(prefix='fd-crx-verify-',dir=os.environ.get('TMPDIR')) as directory:
 d=Path(directory);(d/'public.der').write_bytes(public);(d/'signature').write_bytes(signature);(d/'signed.bin').write_bytes(b'CRX3 SignedData\x00'+struct.pack('<I',len(signed))+signed+payload)
 subprocess.run(['openssl','pkey','-pubin','-inform','DER','-in',str(d/'public.der'),'-out',str(d/'public.pem')],check=True,capture_output=True)
 result=subprocess.run(['openssl','dgst','-sha256','-verify',str(d/'public.pem'),'-signature',str(d/'signature'),str(d/'signed.bin')],capture_output=True,text=True);assert result.returncode==0
with zipfile.ZipFile(io.BytesIO(payload)) as z:
 assert z.testzip() is None;manifest=json.loads(z.read('manifest.json'));checks=json.loads(z.read('CHECKSUMS.json'));assert {n for n in z.namelist() if not n.endswith('/') and n!='CHECKSUMS.json'}==set(checks)
 for name,check in checks.items():
  value=z.read(name);assert len(value)==check['bytes'] and hashlib.sha256(value).hexdigest()==check['sha256'],name
 assert not any(n.endswith(('.ttf','.woff2','.pem','.key')) for n in z.namelist())
result={'pass':True,'format':'CRX3','extensionId':identifier,'signatureVerified':True,'payloadVerified':True,'fontFilesBundled':0,'version':manifest['version'],'packages':report['packages']};(root/'artifacts/crx-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
