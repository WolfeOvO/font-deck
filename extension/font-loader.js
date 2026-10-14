(() => {
 'use strict';
 function create(doc,onChange=()=>{}){
  const loaded=new Map(),jobs=new Map(),dataJobs=new Map(),failed=new Map(),assets=new Map(FontDeckRegistry.assets.map(a=>[a.id,a]));let disposed=false;
  const signature=f=>f.family+'|'+f.asset+'|'+f.descriptors.style+'|'+f.descriptors.weight;
  async function message(value){const result=await chrome.runtime.sendMessage(value);if(!result?.ok)throw new Error(result?.error||'字体后台未响应');return result;}
  function bytes(asset){if(dataJobs.has(asset.id))return dataJobs.get(asset.id);const job=(async()=>{const info=await message({type:'font-deck-font-info',id:asset.id});if(info.bytes!==asset.bytes||info.chunkSize!==256*1024)throw new Error('字体传输长度异常');const output=new Uint8Array(info.bytes);for(let offset=0;offset<info.bytes;offset+=info.chunkSize){const part=await message({type:'font-deck-font-chunk',id:asset.id,offset});if(part.offset!==offset||part.id!==asset.id||typeof part.data!=='string')throw new Error('字体传输区块异常');const binary=atob(part.data),expected=Math.min(info.chunkSize,info.bytes-offset);if(binary.length!==expected)throw new Error('字体区块长度异常');for(let i=0;i<binary.length;i++)output[offset+i]=binary.charCodeAt(i);}await FontDeckPlanner.verify(output,asset);return output;})();dataJobs.set(asset.id,job);job.finally(()=>{if(dataJobs.get(asset.id)===job)dataJobs.delete(asset.id);}).catch(()=>{});return job;}
  function load(face){const key=signature(face);if(loaded.has(key))return Promise.resolve(true);if(jobs.has(key))return jobs.get(key);if(failed.has(key)&&Date.now()-failed.get(key).time<15000)return Promise.resolve(false);
   const job=(async()=>{try{const data=await bytes(assets.get(face.asset));if(disposed)return;const font=new FontFace(face.family,data,face.descriptors);await font.load();if(disposed)return;doc.fonts.add(font);loaded.set(key,font);failed.delete(key);return true;}catch(e){failed.set(key,{time:Date.now(),asset:face.asset,family:face.family,message:e.message});return false;}finally{jobs.delete(key);onChange(status());}})();jobs.set(key,job);onChange(status());return job;
  }
  function request(root,stack,text,style){if(disposed)return;const unavailable=new Set([...failed.values()].filter(f=>Date.now()-f.time<15000).map(f=>f.asset));const selected=FontDeckPlanner.plan(stack,text,{weight:style.fontWeight||style.weight,stretch:style.fontStretch||style.stretch,style:style.fontStyle||style.style},unavailable);for(const face of selected)load(face).then(ok=>{if(ok===false&&!disposed)request(root,stack,text,style);});}
  function status(){return {loaded:loaded.size,loading:jobs.size,errors:[...failed.values()].map(x=>({family:x.family,message:x.message})),online:true};}
  async function settle(){for(let i=0;i<30&&jobs.size;i++)await Promise.all([...jobs.values()]);return status();}
  function retry(){failed.clear();onChange(status());}
  function destroy(){disposed=true;for(const font of loaded.values())doc.fonts.delete(font);loaded.clear();failed.clear();}
  return {request,status,settle,retry,destroy};
 }
 globalThis.FontDeckLoader={create};
})();
