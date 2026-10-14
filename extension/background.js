importScripts('catalog.js','config.js','font-registry.js','font-planner.js','font-cache.js');
let writes=Promise.resolve();
function enqueue(task){const result=writes.then(task);writes=result.catch(()=>{});return result;}
const fields=new Set(['enabled','locale','exclude','protectIcons',...['text','code','math'].flatMap(k=>['enabled','family','custom','weight','variant','stretch'].map(f=>k+'.'+f)),'math.mode']);
function mergeSettings(settings,patch){
 if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).length>24)throw new Error('无效的设置修改');
 const next=FontDeckConfig.normalizeSettings(settings);
 for(const [key,value] of Object.entries(patch)){
  if(!fields.has(key))throw new Error('不支持的设置字段');const parts=key.split('.');
  if(parts.length===1)next[key]=value;else next[parts[0]][parts[1]]=value;
 }
 for(const kind of ['text','code','math'])if(Object.hasOwn(patch,kind+'.family')){
  const f=FontDeckCatalog.find(f=>f.id===next[kind].family);
  if(!(f?.variants||[]).some(v=>v.id===next[kind].variant))next[kind].variant='auto';
 }
 return FontDeckConfig.normalizeSettings(next);
}
chrome.runtime.onInstalled.addListener(()=>{enqueue(async()=>{const {settings}=await chrome.storage.local.get('settings');await chrome.storage.local.set({settings:FontDeckConfig.normalizeSettings(settings||{})});}).catch(e=>console.error('初始化设置失败',e.message));});
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
 if(msg?.type==='font-deck-context'){let topHost='';try{topHost=new URL(sender.tab?.url||'').hostname;}catch{}reply({topHost});return;}
 const fontRequest=['font-deck-font-info','font-deck-font-chunk','font-deck-cache-stats','font-deck-cache-clear'].includes(msg?.type);
 if(fontRequest){
  let allowed=sender.id===chrome.runtime.id;let ui=false;try{const u=new URL(sender.url);ui=u.protocol==='chrome-extension:'&&u.hostname===chrome.runtime.id&&['/options.html','/popup.html'].includes(u.pathname);}catch{}
  if(!allowed||(!sender.tab&&!ui)||(msg.type==='font-deck-cache-clear'&&!ui)){reply({ok:false,error:'字体请求来源不允许'});return;}
  const task=msg.type==='font-deck-font-info'?()=>FontDeckCache.info(msg.id):msg.type==='font-deck-font-chunk'?()=>FontDeckCache.chunk(msg.id,msg.offset):msg.type==='font-deck-cache-clear'?()=>FontDeckCache.clear():()=>FontDeckCache.stats();
  Promise.resolve().then(task).then(value=>reply({ok:true,...value}),error=>reply({ok:false,error:error.message}));return true;
 }
 if(msg?.type!=='font-deck-settings-update')return;
 let allowed=false;try{const u=new URL(sender.url);allowed=sender.id===chrome.runtime.id&&u.protocol==='chrome-extension:'&&u.hostname===chrome.runtime.id&&['/options.html','/popup.html'].includes(u.pathname);}catch{}
 if(!allowed){reply({ok:false,error:'此页面没有修改设置的权限'});return;}
 enqueue(async()=>{const {settings}=await chrome.storage.local.get('settings');const next=msg.reset?FontDeckConfig.normalizeSettings({}):mergeSettings(settings,msg.patch);await chrome.storage.local.set({settings:next});return next;}).then(settings=>reply({ok:true,settings}),e=>reply({ok:false,error:e.message}));return true;
});
