from pathlib import Path
import argparse,subprocess,json,hashlib,base64,zipfile,tempfile,shutil,os
root=Path(__file__).resolve().parents[1];ext=root/'extension';dist=root/'dist';dist.mkdir(exist_ok=True)
p=argparse.ArgumentParser();p.add_argument('--key',required=True);p.add_argument('--chromium',default=os.environ.get('CHROMIUM_PATH','chromium'));args=p.parse_args();key=Path(args.key).expanduser();key.parent.mkdir(parents=True,exist_ok=True);key.parent.chmod(0o700)
if not key.exists():subprocess.run(['openssl','genpkey','-algorithm','RSA','-pkeyopt','rsa_keygen_bits:2048','-out',str(key)],check=True,capture_output=True);key.chmod(0o600)
assert key.stat().st_mode&0o077==0,'signing key must not be public'
public=subprocess.check_output(['openssl','pkey','-in',str(key),'-pubout','-outform','DER']);manifest=json.loads((ext/'manifest.json').read_text());manifest['key']=base64.b64encode(public).decode();(ext/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
assert not list(ext.rglob('*.ttf')) and not list(ext.rglob('*.woff2'))
name='font-deck-online-'+manifest['version'];checks={str(f.relative_to(ext)):{'bytes':f.stat().st_size,'sha256':hashlib.file_digest(f.open('rb'),'sha256').hexdigest()} for f in sorted(ext.rglob('*')) if f.is_file() and f.name!='CHECKSUMS.json'};(ext/'CHECKSUMS.json').write_text(json.dumps(checks,indent=2)+'\n')
archive=dist/(name+'.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for f in sorted(ext.rglob('*')):
  if f.is_file():z.write(f,name+'/'+str(f.relative_to(ext)))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
with tempfile.TemporaryDirectory(prefix='fd-pack-',dir=os.environ.get('TMPDIR')) as profile:
 result=subprocess.run([args.chromium,'--headless','--no-sandbox','--user-data-dir='+profile,'--pack-extension='+str(ext),'--pack-extension-key='+str(key)],capture_output=True,text=True,timeout=60)
 if result.returncode:raise RuntimeError('Chromium package failed: '+str(result.returncode))
crx=ext.with_suffix('.crx');assert crx.exists();target=dist/(name+'.crx');shutil.move(str(crx),target)
identifier=''.join(chr(97+int(c,16)) for c in hashlib.sha256(public).hexdigest()[:32]);report={'version':manifest['version'],'extensionId':identifier,'fontFilesBundled':0,'files':len(checks)+1,'packages':[{'path':str(f),'size':f.stat().st_size,'sha256':hashlib.file_digest(f.open('rb'),'sha256').hexdigest()} for f in [archive,target]],'privateKeyExcluded':True};(dist/'package.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
