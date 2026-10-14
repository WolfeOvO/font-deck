(() => {
 'use strict';if(globalThis.__fontDeckContent)return;globalThis.__fontDeckContent=true;
 let engine,loader,latest,topHost='';
 async function init(){try{const [stored,context]=await Promise.all([chrome.storage.local.get('settings'),chrome.runtime.sendMessage({type:'font-deck-context'}).catch(()=>({}))]);latest=latest||stored.settings;topHost=context?.topHost||'';const start=()=>{if(engine||!document.documentElement)return;loader=FontDeckLoader.create(document);engine=FontDeckEngine.create(document,latest,{topHost,requestFonts:(...args)=>loader.request(...args)});};start();if(!engine)document.addEventListener('DOMContentLoaded',start,{once:true});}catch(e){console.warn('[Font Deck Online]',e.message);}}
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.settings){latest=changes.settings.newValue;engine?.configure(latest);}});
 chrome.runtime.onMessage.addListener((msg,sender,reply)=>{if(msg?.type==='font-deck-status')reply(engine?{...engine.status(),fontLoading:loader.status()}:{enabled:false,pending:true});if(msg?.type==='font-deck-font-retry'){loader?.retry();engine?.configure(latest);reply({ok:true});}});
 init();
})();
