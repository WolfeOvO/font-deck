(() => {
  'use strict';
  const DEFAULTS = {
    version: 3, enabled: true, locale: 'AUTO', exclude: [], protectIcons: true,
    text: {enabled:true, family:'noto-sans', custom:'', weight:'original', variant:'auto', stretch:'original'},
    code: {enabled:true, family:'jetbrains-mono', custom:'', weight:'original', variant:'auto', stretch:'original'},
    math: {enabled:true, family:'stix-two-math', custom:'', weight:'original', mode:'native', variant:'auto', stretch:'original'}
  };
  function normalizeSettings(input = {}) {
    const raw = input && typeof input === 'object' ? input : {};
    const out = JSON.parse(JSON.stringify(DEFAULTS));
    out.enabled = typeof raw.enabled === 'boolean' ? raw.enabled : true;
    out.locale = ['AUTO','SC','TC','HK','JP','KR'].includes(raw.locale) ? raw.locale : 'AUTO';
    out.exclude = Array.isArray(raw.exclude) ? raw.exclude.filter(x=>typeof x==='string').map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,500) : [];
    for (const kind of ['text','code','math']) {
      const v = raw[kind] && typeof raw[kind] === 'object' ? raw[kind] : {};
      out[kind].enabled = typeof v.enabled === 'boolean' ? v.enabled : true;
      out[kind].family = typeof v.family === 'string' && /^[a-z0-9-]{1,60}$/.test(v.family) ? v.family : DEFAULTS[kind].family;
      if(Number(raw.version||1)<2 && out[kind].family==='source-han-sans')out[kind].family='noto-sans';
      out[kind].variant=typeof v.variant==='string' && /^[a-z0-9-]{1,90}$/.test(v.variant)?v.variant:'auto';
      out[kind].stretch=/^(?:[1-9]\d{0,2})(?:\.\d{1,3})?$/.test(String(v.stretch)) && Number(v.stretch)>=50 && Number(v.stretch)<=200?String(v.stretch):'original';
      out[kind].custom = typeof v.custom === 'string' ? v.custom.trim().slice(0,160) : '';
      out[kind].weight = /^(?:[1-9]\d{0,3})(?:\.\d{1,3})?$/.test(String(v.weight)) && Number(v.weight)<=1000 ? String(v.weight) : 'original';
    }
    if(Number(raw.version||1)<3 && raw.locale==='SC' && ['noto-sans','noto-mono'].includes(out.text.family))out.locale='AUTO';
    out.math.mode = raw.math?.mode === 'conservative' ? 'conservative' : 'native';
    return out;
  }
  function isExcluded(host, rules = []) {
    host=String(host||'').toLowerCase().replace(/\.$/,'');
    return rules.some(rule=>{
      let r=String(rule).trim().toLowerCase();
      try { if(r.includes('://')) r=new URL(r).hostname; } catch { return false; }
      r=r.replace(/^\*\./,'').replace(/\.$/,'');
      return Boolean(r) && (host===r || host.endsWith('.'+r));
    });
  }
  function quoteFont(name) { return '"'+String(name).replace(/[\x00-\x1f\x7f]/g,'').replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"'; }
  const routeCache=new WeakMap();
  function routeNames(f, names, text) {
    if(text==null || !f.route_ranges?.length) return names;
    let info=routeCache.get(f);if(!info){info={aliases:new Set(f.route_ranges.map(r=>r[2]))};routeCache.set(f,info);}
    const selected=new Set(f.latin_alias?[f.latin_alias]:[]);
    for(const char of new Set(text)) {
      const cp=char.codePointAt(0);let lo=0,hi=f.route_ranges.length-1;
      while(lo<=hi){const mid=(lo+hi)>>1,r=f.route_ranges[mid];if(cp<r[0])hi=mid-1;else if(cp>r[1])lo=mid+1;else{selected.add(r[2]);break;}}
    }
    if(f.preferred_stack)return names.filter(n=>selected.has(n)||!info.aliases.has(n));
    return [...selected,...names.filter(n=>!info.aliases.has(n))];
  }
  function fontStack(category, locale='AUTO', catalog=globalThis.FontDeckCatalog||[], text=null) {
    const f=catalog.find(x=>x.id===category.family);
    const fallbacks=category.family==='jetbrains-mono' ? 'monospace' : category.family==='stix-two-math' ? 'math, serif' : 'sans-serif';
    if(category.family==='custom') return category.custom ? `${quoteFont(category.custom)}, ${fallbacks}` : '';
    if(!f) return '';
    let names=f.families?.[locale] || f.families?.AUTO || f.families?.SC || f.families?.default || [f.cssFamily];
    names=routeNames(f,names,text);
    const variant=f.variants?.find(v=>v.id===category.variant);
    if(variant)names=[variant.alias,...names];
    return [...new Set(names.filter(Boolean))].map(quoteFont).concat(f.fallback||fallbacks).join(', ');
  }
  function categoryStack(kind, settings, catalog=globalThis.FontDeckCatalog||[], text=null) {
    const own=fontStack(settings[kind],settings.locale,catalog,text);
    if(kind!=='code' || settings.code.family!=='jetbrains-mono' || !settings.text.enabled) return own;
    const prose=catalog.find(f=>f.id===settings.text.family);
    let names=settings.text.family==='custom' ? [settings.text.custom] : (prose?.families?.[settings.locale] || prose?.families?.AUTO || prose?.families?.SC || prose?.families?.default || []);
    if(prose)names=routeNames(prose,names,text);
    const variant=prose?.variants?.find(v=>v.id===settings.text.variant);if(variant)names=[variant.alias,...names];
    const code=catalog.find(f=>f.id==='jetbrains-mono');
    return (code?.families?.default || ['FD JetBrains Mono']).concat(names).filter(Boolean).map(quoteFont).concat('monospace').join(', ');
  }
  globalThis.FontDeckConfig={DEFAULTS,normalizeSettings,isExcluded,quoteFont,fontStack,categoryStack};
})();
