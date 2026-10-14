(async()=>{
 'use strict';const C=FontDeckConfig;let settings=C.normalizeSettings((await chrome.storage.local.get('settings')).settings),host='';
 const status=document.querySelector('#popup-status'),controls={};
 const enabled=document.querySelector('#global-enabled');
 function siteLabel(){if(host)document.querySelector('#site-toggle').textContent=C.isExcluded(host,settings.exclude)?'在此网站启用':'暂停此网站';}
 function receive(next){settings=C.normalizeSettings(next);enabled.checked=settings.enabled;for(const [kind,u] of Object.entries(controls)){u.on.checked=settings[kind].enabled;u.picker.setValue(settings[kind].family);}siteLabel();}
 async function save(patch){try{const result=await chrome.runtime.sendMessage({type:'font-deck-settings-update',patch});if(!result?.ok)throw new Error(result?.error||'后台未响应，请重新加载扩展');receive(result.settings);status.textContent='已应用到已打开的网页';}catch(e){status.textContent='保存失败 · '+e.message;}}
 enabled.checked=settings.enabled;enabled.onchange=()=>{settings.enabled=enabled.checked;save({enabled:enabled.checked});};
 const labels={text:'普通文本',code:'代码文本',math:'数学公式'};
 for(const kind of ['text','code','math']){
  const row=document.createElement('div');row.className='quick-row';const label=document.createElement('label');label.className='quick-label';const on=document.createElement('input');on.type='checkbox';on.checked=settings[kind].enabled;on.setAttribute('aria-label','替换'+labels[kind]);label.append(on,labels[kind]);
  const options=FontDeckCatalog.filter(f=>f.kinds.includes(kind)).map(f=>({value:f.id,label:f.label,description:f.weights+' · '+(f.online?'在线':'本机'),keywords:f.coverage}));options.push({value:'custom',label:'本机自定义字体',description:settings[kind].custom||'在完整设置页填写已安装字体名称'});
  const picker=FontDeckPicker.create({id:'quick-'+kind,label:labels[kind]+'字体',options,value:settings[kind].family,onChange:value=>{settings[kind].family=value;save({[kind+'.family']:value});}});
  controls[kind]={on,picker};on.onchange=()=>{settings[kind].enabled=on.checked;save({[kind+'.enabled']:on.checked});};row.append(label,picker.element);document.querySelector('#quick-controls').append(row);
 }
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.settings)receive(changes.settings.newValue);});
 try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const url=new URL(tab.url);if(['http:','https:','file:'].includes(url.protocol)){host=url.hostname;document.querySelector('#site-label').textContent=host||'本地文件';if(host){const button=document.querySelector('#site-toggle');button.disabled=false;siteLabel();button.onclick=async()=>{const exclude=C.isExcluded(host,settings.exclude)?settings.exclude.filter(rule=>!C.isExcluded(host,[rule])):[...settings.exclude,host];await save({exclude});siteLabel();};}try{const s=await chrome.tabs.sendMessage(tab.id,{type:'font-deck-status'},{frameId:0});status.textContent=s.enabled?(s.fontLoading?.errors?.length?'字体加载失败 · '+s.fontLoading.errors[0].message:s.fontLoading?.loading?'在线字体加载中 · '+s.fontLoading.loading+' 个字体面':'此页已启用 · '+s.elements+' 个文字节点'):s.pending?'正在准备字体':'此页已暂停';}catch{status.textContent='首次安装或升级后请刷新网页';}}else status.textContent='Chrome 内置页与扩展商店不能替换字体';}catch{status.textContent='打开普通网页后可设置网站开关';}
 document.querySelector('#open-options').onclick=()=>chrome.runtime.openOptionsPage();
})();
