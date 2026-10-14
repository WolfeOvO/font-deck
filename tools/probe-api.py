from pathlib import Path
import json,hashlib,subprocess,urllib.request,urllib.error
root=Path(__file__).resolve().parents[1];base='https://draft.wolfeovo.top/font-deck-api/v1-r1/';sample=json.loads((root/'extension/FONT-SOURCES.json').read_text())['font_resources'][0];ua='Mozilla/5.0 FontDeckAPIProbe'
origin=subprocess.run(['curl','--silent','--show-error','--fail','--resolve','draft.wolfeovo.top:443:127.0.0.1','-A',ua,base+'manifest.json'],capture_output=True);assert origin.returncode==0;assert json.loads(origin.stdout)['summary']['font_resources']==516
with urllib.request.urlopen(urllib.request.Request(base+'manifest.json',headers={'User-Agent':ua}),timeout=30) as response:public=json.load(response);assert response.status==200 and response.headers.get('Access-Control-Allow-Origin')=='*'
assert public==json.loads((root/'extension/FONT-SOURCES.json').read_text())
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
opener=urllib.request.build_opener(NoRedirect)
for suffix,expected in [('https://draft.wolfeovo.top/font-deck-1.2.1/',302),(base+'files/not-allowed.ttf',404)]:
 try:
  with opener.open(urllib.request.Request(suffix,headers={'User-Agent':ua}),timeout=30) as response:status=response.status
 except urllib.error.HTTPError as e:status=e.code
 assert status==expected,(suffix,status)
print(json.dumps({'pass':True,'api':base,'count':516,'originPublicEqual':True,'anonymousAPI':200,'unrelatedGate':302,'invalidFile':404},indent=2))
