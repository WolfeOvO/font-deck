(() => {
 'use strict';
 const registry=globalThis.FontDeckRegistry,byFamily=new Map();
 for(const face of registry.faces){if(!byFamily.has(face.family))byFamily.set(face.family,[]);byFamily.get(face.family).push(face);}
 function contains(ranges,cp){let lo=0,hi=ranges.length-1;while(lo<=hi){const m=(lo+hi)>>1,r=ranges[m];if(cp<r[0])hi=m-1;else if(cp>r[1])lo=m+1;else return true;}return false;}
 function distance(value,range){const nums=String(range).match(/[\d.]+/g)?.map(Number)||[400];return value<nums[0]?nums[0]-value:value>nums.at(-1)?value-nums.at(-1):0;}
 function plan(stack,text,style={},unavailable=new Set()){
  if(!text)return [];
  const names=[...String(stack).matchAll(/"((?:\\.|[^"\\])*)"/g)].map(m=>m[1].replace(/\\([\\"])/g,'$1'));
  const candidates=names.map(name=>{const all=(byFamily.get(name)||[]).filter(f=>!unavailable.has(f.asset)),preferred=all.filter(f=>f.descriptors.style===(style.style||'normal'));return (preferred.length?preferred:all).slice().sort((a,b)=>distance(Number(style.weight)||400,a.descriptors.weight)-distance(Number(style.weight)||400,b.descriptors.weight)||distance(Number.parseFloat(style.stretch)||100,a.descriptors.stretch)-distance(Number.parseFloat(style.stretch)||100,b.descriptors.stretch));});
  const selected=new Set();
  for(const char of new Set(text)){const cp=char.codePointAt(0);for(const faces of candidates){const face=faces.find(f=>contains(f.ranges,cp));if(face){selected.add(face);break;}}}
  return [...selected];
 }
 async function verify(bytes,asset){if(bytes.byteLength!==asset.bytes)throw new Error('font length mismatch');const digest=await crypto.subtle.digest('SHA-256',bytes),hex=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');if(hex!==asset.sha256)throw new Error('font checksum mismatch');return true;}
 globalThis.FontDeckPlanner={plan,contains,verify};
})();
