from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1]
def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()
def load(name):
    value=json.loads((root/'artifacts'/name).read_text());assert value['pass'],name;return value
api=load('api-public-verification.json');assert api['verified']==api['expected']==len(api['results'])==516
browser=load('browser-online-report.json');assert browser['restartOffline'] and browser['strictCSP']
public=load('public-browser-report.json');assert public['regionalSamePixels'] and public['stableFacesAcross300Updates']
ui=load('ui-online-report.json');assert [v['width'] for v in ui['viewports']]==[1440,1024,768,390] and ui['cacheClearVerified']
crx=load('crx-verification.json');assert crx['signatureVerified'] and crx['payloadVerified']
packed=load('packed-online-report.json');assert len(packed['results'])==2
review=json.loads((root/'review/verdict.json').read_text());assert review['passed'] and not review['logic_errors']
packages=json.loads((root/'dist/package.json').read_text())
for package in packages['packages']:
    assert package['sha256']==digest(Path(package['path'])) and package['size']==Path(package['path']).stat().st_size
baseline=json.loads((root/'artifacts/offline-baseline.json').read_text())
assert all(digest(Path('/data/font-deck-extension/extension')/name)==hash for name,hash in baseline.items())
report={'pass':True,'version':'1.3.0','extensionId':packages['extensionId'],'packages':packages['packages'],'fontFilesBundled':0,'fontAPI':{'base':api['base'],'verifiedFiles':516,'verifiedBytes':api['bytes'],'head':api['headVerified'],'range':api['range'],'cors':True},'features':{'strictCSP':True,'realFontGlyphs':public['actual'],'TCGlyphsSamePixels':True,'warmCacheAndRestartOffline':True,'failureFallbackAndRetry':'unit tests','fourUIWidths':[v['width'] for v in ui['viewports']],'settingsSaved':ui['settingsSaved'],'cacheClear':ui['cacheClearVerified'],'stableFontFacesAcross300Updates':True},'independentReview':review,'offlineEditionUnchanged':True,'engineSha256':digest(root/'extension/engine.js'),'scope':'Linux Chromium; fresh ZIP/CRX payload loaded unpacked; no claim of Windows/macOS off-store installation or hours-long user-device testing'}
(root/'artifacts/verification-online.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['independentReview','features']},indent=2))
