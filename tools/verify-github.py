from pathlib import Path
import json,hashlib,subprocess,urllib.request
root=Path(__file__).resolve().parents[1];repo='WolfeOvO/font-deck';version='v1.3.0-online'
summary=json.loads((root/'artifacts/verification-online.json').read_text());assert summary['pass'] and summary['independentReview']['passed']
package=json.loads((root/'dist/package.json').read_text())
for item in package['packages']:
 assert Path(item['path']).stat().st_size==item['size'];assert hashlib.file_digest(Path(item['path']).open('rb'),'sha256').hexdigest()==item['sha256']
# Repository/source writes are intentionally executed by parent after this gate.
repo_info=json.loads(subprocess.check_output(['gh','repo','view',repo,'--json','name,url,visibility,defaultBranchRef'],text=True));assert repo_info['visibility']=='PUBLIC'
local=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip();remote=json.loads(subprocess.check_output(['gh','api','repos/'+repo+'/commits/main'],text=True));assert remote['sha']==local
release=json.loads(subprocess.check_output(['gh','release','view',version,'--repo',repo,'--json','url,tagName,isDraft,isPrerelease,assets'],text=True));assert not release['isDraft'] and not release['isPrerelease'];assets={a['name']:a for a in release['assets']}
checks=[]
for item in package['packages']:
 name=Path(item['path']).name;assert name in assets;url=assets[name]['url'];h=hashlib.sha256();size=0
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 FontDeckReleaseVerification'}),timeout=90) as response:
  assert response.status==200
  while block:=response.read(1024*1024):size+=len(block);h.update(block)
 assert size==item['size'] and h.hexdigest()==item['sha256'],name
 checks.append({'file':name,'bytes':size,'sha256':h.hexdigest(),'url':url,'pass':True})
tree=json.loads(subprocess.check_output(['gh','api','repos/'+repo+'/git/trees/'+local+'?recursive=1'],text=True));assert not tree.get('truncated');paths={r['path'] for r in tree['tree']};required={'README.md','LICENSE','extension/manifest.json','extension/font-cache.js','extension/font-loader.js','extension/font-registry.js','server/font-api.conf','tools/package.py','tools/acquire-fonts.py','.github/workflows/verify.yml'};assert required<=paths
assert not any(p.endswith(('.pem','.key','.ttf','.woff2')) or p.startswith(('node_modules/','qa/','cache/')) for p in paths)
result={'pass':True,'repo':repo_info['url'],'release':release['url'],'visibility':'PUBLIC','commit':local,'sourceFiles':len(paths),'requiredSourceVerified':True,'noKeysOrFontBinaries':True,'downloads':checks};(root/'artifacts/github-publication-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
