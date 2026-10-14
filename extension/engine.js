(() => {
  'use strict';
  if (globalThis.FontDeckEngine) return;
  const MATH = 'math,.katex,mjx-container,.MathJax,.MathJax_Display,[data-font-deck-math]';
  const CODE = 'code,pre,kbd,samp,.hljs,.highlight pre,.highlight code,.mw-highlight,.code-block,.codeblock,.codehilite,.w3-code,.ql-code-block,.CodeMirror,.monaco-editor,.cm-editor,.ace_editor,[data-code-block="true"],[data-font-deck-kind="code"]';
  const INLINE_CODE = '.inline-code,.inline_code,.code-inline,.code_inline,[data-inline-code="true"],[data-inline-code=""],[data-code="true"],[data-code=""],[data-mark="code"],[data-type="inline-code"]';
  const MONO_FONT = /(?:\bmonospace\b|SFMono|\bMenlo\b|\bConsolas\b|\bMonaco\b|\bCourier\b|\bCascadia\b|\bJetBrains Mono\b|\bFira Code\b|\bLiberation Mono\b|\bNoto Sans Mono\b)/i;
  const IGNORE = 'script,style,noscript,template,title,head,annotation,annotation-xml,mjx-assistive-mml,.katex-mathml';
  const ICON_CLASSES = /(?:^|\s)(?:material-icons(?:-[\w-]+)?|material-symbols-[\w-]+|fa|fas|far|fab|fal|fad|fa-[\w-]+|iconfont|anticon|glyphicon(?:-[\w-]+)?|[a-z]*icon-[\w-]+|[trbs]i-[\w-]+|octicon(?:-[\w-]+)?)(?:\s|$)/i;
  const ICON_FONT = /(?:material\s*(?:icons|symbols)|font\s*awesome|iconfont|glyphicons|icomoon|octicons|bootstrap-icons|remixicon|tabler-icons|fluent.*icons)/i;
  const PUA_ONLY = /^[\s\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]+$/u;
  const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|[\uFE0E\uFE0F\u200D\u20E3\s])+$/u;
  const KEYCAP_ONLY = /^(?:[0-9#*]\uFE0F?\u20E3|\s)+$/u;
  function parent(el) { return el.parentElement || el.getRootNode()?.host || null; }
  function hasAncestor(el, selector) { for(let n=el;n;n=parent(n)) if(n.matches?.(selector)) return true; return false; }
  function codeLanguage(value) {
    const v=String(value||'').trim().toLowerCase();
    if(!/^[a-z][a-z0-9+#.-]{0,60}$/.test(v) || /^(?:name|label|title|selector|select|switcher|button|menu|list|header|heading|bar|option|options|description)$/.test(v))return false;
    // Two/three-letter locale tags are not programming-language evidence.
    // Keep established short grammar IDs that would otherwise be ambiguous.
    return /^(?:c|c\+\+|c#|cs|cpp|css|js|ts|jsx|tsx|go|sh|bash|zsh|sql|xml|html|php|r|rb|py|lua|ini|json|yaml|yml|md|tex|asm|vb|bat|ps1)$/.test(v) || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(v);
  }
  function languageCode(el) {
    if(!['PRE','CODE','DIV','SPAN'].includes(el.tagName))return false;
    return codeLanguage(el.getAttribute('data-language')) || [...el.classList].some(c=>{
      const m=/^(?:language|lang)-(.+)$/i.exec(c);return m&&codeLanguage(m[1]);
    });
  }
  function kindOf(el,inlineCode=()=>false) {
    let code=false;
    for(let n=el;n;n=parent(n)) {
      if(n.matches?.(MATH)) return 'math';
      if(n.matches?.(CODE) || languageCode(n) || inlineCode(n)) code=true;
    }
    return code ? 'code' : 'text';
  }
  function directText(el) { return [...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join(''); }
  function generatedText(content) {
    if(!content || ['none','normal'].includes(content))return '';
    const hasCounter=/\b(?:counter|counters)\s*\(/i.test(content);
    const tokens=/"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\/|url\(/gi;let text='',m;
    while((m=tokens.exec(content))) {
      if(m[0]==='/')break;
      if(/^url\(/i.test(m[0]))return '';
      text+=m[0].slice(1,-1).replace(/\\([0-9a-f]{1,6})\s?|\\([\s\S])/gi,(_,hex,char)=>hex?String.fromCodePoint(Number.parseInt(hex,16)||0xfffd):char);
    }
    return text+(hasCounter?'0':'');
  }
  function readableGenerated(text,family) {
    return /[\p{L}\p{N}]/u.test(text) && !PUA_ONLY.test(text) && !EMOJI_ONLY.test(text) && !KEYCAP_ONLY.test(text) && !ICON_FONT.test(family);
  }
  function create(doc, initial, resources={}) {
    let settings=FontDeckConfig.normalizeSettings(initial), enabled=true, destroyed=false, scanning=false, scans=0;
    const roots=new Set([doc]), observers=new Map(), changes=new Map(), pseudos=new Map(), adapters=new Map();
    const ownStyles=new Map(), fontStyles=new Map(), expectedStyle=new WeakMap(), ruleDirty=new Set();let ruleBuilds=0;
    const styleParser=doc.createElement('span');
    const shadowHosts=new Set();let shadowCursor=null,shadowChecks=0,shadowTicks=0,shadowMaxBatch=0;
    const dirty=new Set(), deepDirty=new Set(), stylesheetRoots=new Set(), pseudoStyleRoots=new Set();let fullScan=true, queued=false, queueGeneration=0;
    const token='data-fd-'+Math.random().toString(36).slice(2,10);
    let seq=0;
    function remember(el) {
      if(!changes.has(el)) changes.set(el,{props:{},applied:{}});
      return changes.get(el);
    }
    function set(el,prop,value,priority='important') {
      const rec=remember(el);
      if(!(prop in rec.props)) rec.props[prop]=[el.style.getPropertyValue(prop),el.style.getPropertyPriority(prop)];
      if(el.style.getPropertyValue(prop)!==value || el.style.getPropertyPriority(prop)!==priority) el.style.setProperty(prop,value,priority);
      rec.applied[prop]=[el.style.getPropertyValue(prop),el.style.getPropertyPriority(prop)];
    }
    function captureSiteEdits(el) {
      const rec=changes.get(el); if(!rec) return;
      for(const prop of Object.keys(rec.props)) {
        const now=[el.style.getPropertyValue(prop),el.style.getPropertyPriority(prop)];
        if(now[0]!==rec.applied[prop]?.[0] || now[1]!==rec.applied[prop]?.[1]) {rec.props[prop]=now;if(prop==='font-family') rec.family=null;}
      }
    }
    function release(el) {
      const rec=changes.get(el);
      if(rec) {
        captureSiteEdits(el);
        for(const [prop,[value,priority]] of Object.entries(rec.props)) {
          if(value) el.style.setProperty(prop,value,priority); else el.style.removeProperty(prop);
        }
        changes.delete(el);
      }
      if(pseudos.has(el)) {ruleDirty.add(pseudos.get(el).root||el.getRootNode());el.removeAttribute(token);pseudos.delete(el);}
    }
    function restoreChanges() {
      for(const el of [...changes.keys()]) release(el);
      for(const el of pseudos.keys()) el.removeAttribute(token);
      pseudos.clear();
    }
    function originalFamily(el, computed) {
      const rec=changes.get(el);
      if(rec?.family) return rec.family;
      // A new child may inherit an existing parent override. Restore only that
      // override's baseline; preserve an explicit site font on the child.
      for(let p=parent(el);p;p=parent(p)) {
        const ancestor=changes.get(p), applied=ancestor?.applied?.['font-family'];
        if(ancestor?.family && applied?.[0]===doc.defaultView.getComputedStyle(p).fontFamily) {
          if(computed===applied[0]) return ancestor.family;
        }
      }
      return computed;
    }
    function inlineCode(el) {
      if(el.matches?.(INLINE_CODE))return true;
      if(el.tagName==='SPAN' && [...el.classList].some(c=>c==='editor-text-code'||/^[a-zA-Z][\w-]*__textCode$/.test(c)))return true;
      // A small rich-text leaf can encode a code mark without a <code> tag.
      // Require its own explicit mono style AND disabled spelling, not inheritance.
      if(el.tagName!=='SPAN'||el.getAttribute('spellcheck')!=='false'||!(el.isContentEditable||el.hasAttribute('data-token-index')||el.hasAttribute('data-slate-leaf')||el.hasAttribute('data-lexical-text')))return false;
      captureSiteEdits(el);const rec=changes.get(el);
      const original=rec?.props?.['font-family']?.[0] ?? el.style.getPropertyValue('font-family');
      return Boolean(original && MONO_FONT.test(original));
    }
    function restoreProperty(el,prop) {
      const rec=changes.get(el);
      if(!rec || !(prop in rec.props)) return;
      const [value,priority]=rec.props[prop];
      if(value) el.style.setProperty(prop,value,priority);else el.style.removeProperty(prop);
      delete rec.props[prop];delete rec.applied[prop];
    }
    function refreshRules() {
      for(const [root,style] of ownStyles)if(!style.isConnected)ruleDirty.add(root);
      for(const root of ruleDirty) {
        if(!roots.has(root))continue;
        ruleBuilds++;
        const rules=[];
        for(const [el,p] of pseudos) if(el.getRootNode()===root) {
          for(const [name,family] of Object.entries(p.fonts)) rules.push(`:not(#${token}#${token}#${token}#${token})[${token}="${p.id}"]::${name}{font-family:${family}!important;}`);
        }
        let style=ownStyles.get(root);
        if(!enabled || !rules.length) {style?.remove();ownStyles.delete(root);continue;}
        if(!style?.isConnected){style=doc.createElement('style');style.setAttribute('data-font-deck-style','protection');(root===doc?doc.head||doc.documentElement:root).appendChild(style);ownStyles.set(root,style);}
        const css=rules.join('\n');if(style.textContent!==css) style.textContent=css;
      }
      ruleDirty.clear();
    }
    function registerFonts(root) {
      if(!resources.fontCss || fontStyles.get(root)?.isConnected) return;
      const style=doc.createElement('style');style.setAttribute('data-font-deck-style','fonts');style.textContent=resources.fontCss;
      (root===doc?doc.head||doc.documentElement:root).appendChild(style);fontStyles.set(root,style);
    }
    function captureFormulaEdits(a, rehide=false) {
      for(const entry of a.hidden) {
        const visual=entry[0], value=visual.style.getPropertyValue('display'), priority=visual.style.getPropertyPriority('display');
        if(value!=='none' || priority!=='important') {entry[1]=value;entry[2]=priority;}
        if(rehide && (value!=='none' || priority!=='important')) visual.style.setProperty('display','none','important');
      }
    }
    function restoreFormula(el, a) {
      captureFormulaEdits(a);
      a.clone.remove();
      for(const [visual,value,priority] of a.hidden) {
        if(value) visual.style.setProperty('display',value,priority); else visual.style.removeProperty('display');
      }
      adapters.delete(el);
    }
    function formulaRoots(root) {
      return [...(root.matches?.('.katex,mjx-container,.MathJax,.MathJax_Display')?[root]:[]),...root.querySelectorAll('.katex,mjx-container,.MathJax,.MathJax_Display')].filter(el=>!hasAncestor(parent(el),'.katex,mjx-container,.MathJax,.MathJax_Display'));
    }
    function adapt(root) {
      for(const [el,a] of adapters) {
        if(root!==el && !root.contains?.(el) && !el.contains(root))continue;
        captureFormulaEdits(a,true);
        if(!el.isConnected || !enabled || !settings.math.enabled || settings.math.mode!=='native' || a.source.innerHTML!==a.signature || !el.contains(a.source)) restoreFormula(el,a);
      }
      if(!enabled || !settings.math.enabled || settings.math.mode!=='native') return;
      for(const el of formulaRoots(root)) {
        if(adapters.has(el)) continue;
        const source=el.querySelector('.katex-mathml math,mjx-assistive-mml math,math');
        if(!source || source.hasAttribute('data-font-deck-math') || source.querySelector('merror')) continue;
        // Only replace renderers with an existing semantic MathML representation.
        const visuals=el.matches('.katex') ? [...el.querySelectorAll(':scope > .katex-html,:scope > .katex-mathml')] : [...el.children].filter(n=>!n.hasAttribute('data-font-deck-owned'));
        if(!visuals.length) continue;
        const clone=source.cloneNode(true);
        clone.removeAttribute('id'); for(const n of clone.querySelectorAll('[id]')) n.removeAttribute('id');
        clone.setAttribute('data-font-deck-math',''); clone.setAttribute('data-font-deck-owned','math');
        clone.removeAttribute('aria-hidden'); clone.removeAttribute('style');
        const block=el.getAttribute('display')==='true' || source.getAttribute('display')==='block' || el.parentElement?.matches('.katex-display,.MathJax_Display');
        clone.setAttribute('display',block?'block':'inline');
        const hidden=visuals.map(n=>[n,n.style.getPropertyValue('display'),n.style.getPropertyPriority('display')]);
        for(const [n] of hidden) n.style.setProperty('display','none','important');
        el.appendChild(clone); adapters.set(el,{source,clone,hidden,signature:source.innerHTML});
      }
    }
    function active() {
      let host=doc.location?.hostname || '';
      if(!host) {
        try {host=new URL(doc.referrer).hostname;} catch {}
        if(!host) try {host=new URL(doc.defaultView.location.ancestorOrigins[0]).hostname;} catch {}
      }
      return settings.enabled && !FontDeckConfig.isExcluded(host,settings.exclude) && !FontDeckConfig.isExcluded(resources.topHost,settings.exclude);
    }
    function mark(node, deep=false) {
      if(!node) return;
      const el=node.nodeType===3?node.parentElement:node;
      if(el && (el.nodeType===1 || el.nodeType===9 || el.nodeType===11)) {
        if(deep) deepDirty.add(el);
        dirty.add(el);
      }
    }
    function elementsFor(targets, full) {
      const elements=new Set();
      for(const target of targets) {
        if(target.nodeType===1) elements.add(target);
        if(full || deepDirty.has(target)) for(const el of target.querySelectorAll('*')) elements.add(el);
      }
      return elements;
    }
    function scan() {
      if(destroyed || scanning) return;
      scanning=true;queued=false;queueGeneration++;
      // Include pending site mutations before disconnecting our own writes.
      for(const obs of observers.values()) {
        collectMutations(obs.takeRecords());obs.disconnect();
      }
      const refreshPseudoRoots=new Set(stylesheetRoots), readPseudoRoots=new Set([...stylesheetRoots,...pseudoStyleRoots]);stylesheetRoots.clear();pseudoStyleRoots.clear();
      const full=fullScan || refreshPseudoRoots.size>0;fullScan=false;
      enabled=active();
      const touched=new Set(), suspended=[];
      for(const root of readPseudoRoots){const style=ownStyles.get(root);if(style?.sheet){suspended.push([style,style.sheet.disabled]);style.sheet.disabled=true;}}

      try {
        for(const root of [...roots]) if(root!==doc && !root.host?.isConnected) {
          roots.delete(root);ownStyles.get(root)?.remove();ownStyles.delete(root);
          fontStyles.get(root)?.remove();fontStyles.delete(root);
          ruleDirty.delete(root);
          observers.get(root)?.disconnect();observers.delete(root);root.removeEventListener('input',onInput,true);root.removeEventListener('change',onInput,true);
        }
        for(const [el,a] of adapters)if(!el.isConnected)restoreFormula(el,a);
        if(full) discover(false);
        // Register immutable font faces separately from dynamic icon protection.
        if(enabled) for(const root of roots) registerFonts(root);
        else for(const [root,style] of fontStyles) {style.remove();fontStyles.delete(root);}
        const targets=full?[...roots]:[...dirty];
        const elements=elementsFor(targets,full);dirty.clear();deepDirty.clear();
        const plans=[];
        if(!enabled) {
          restoreChanges();
          for(const [el,a] of [...adapters]) restoreFormula(el,a);
        } else {
          // Update existing semantic formula adapters; discover new formulas only
          // inside changed subtrees (the document is searched on initial scan).
          const formulaAreas=new Set(full?[...roots]:targets);
          for(const target of targets) if(target.nodeType===1) {
            const renderer=target.closest('.katex,mjx-container,.MathJax,.MathJax_Display');
            if(renderer) formulaAreas.add(renderer);
          }
          for(const area of formulaAreas) adapt(area);
          for(const [el,a] of adapters) if(!changes.has(a.clone)) {
            elements.add(a.clone);for(const n of a.clone.querySelectorAll('*')) elements.add(n);
          }
          for(const el of elements) {
            if(el.isConnected)inspectShadow(el);
            if(!el.isConnected || el.hasAttribute('data-font-deck-style') || hasAncestor(el,IGNORE)) {release(el);continue;}
            const text=directText(el), isInput=el.matches('input:not([type="password"]):not([type="hidden"]),textarea,select,option');
            const hint=el.getAttribute('placeholder')||el.getAttribute('data-placeholder')||el.getAttribute('aria-placeholder')||'';
            const editable=el.isContentEditable;
            let generated=null;
            if(!text.trim() && !isInput && !editable && !hint.trim()) {
              generated={};for(const name of ['before','after']){const c=doc.defaultView.getComputedStyle(el,'::'+name);if(c.content && !['none','normal','\"\"'].includes(c.content))generated[name]=c;}
            }
            const svg=el.namespaceURI==='http://www.w3.org/2000/svg';
            if(svg && el.localName!=='svg') {release(el);continue;}
            const isMathRoot=el.localName==='math', codeRoot=el.matches(CODE)||languageCode(el)||inlineCode(el);
            const icon=ICON_CLASSES.test(typeof el.className==='string'?el.className:'') || el.matches('mat-icon,[fonticon],[data-mat-icon-type]');
            if(!text.trim() && !isInput && !editable && !hint.trim() && !Object.keys(generated||{}).length && !svg && !icon && !isMathRoot && !codeRoot && el.getAttribute('type')!=='password') {release(el);continue;}
            captureSiteEdits(el);
            const cs=doc.defaultView.getComputedStyle(el), family=originalFamily(el,cs.fontFamily);
            const protectedText=svg || el.getAttribute('type')==='password' || icon || ICON_FONT.test(family) || (Boolean(text.trim()) && (PUA_ONLY.test(text) || EMOJI_ONLY.test(text) || KEYCAP_ONLY.test(text)));
            const kind=kindOf(el,inlineCode), category=settings[kind];
            const rendererMath=kind==='math' && !hasAncestor(el,'math');
            const stack=FontDeckConfig.categoryStack(kind,settings,globalThis.FontDeckCatalog||[],text || el.value || hint || el.textContent || '');
            if(!protectedText && !rendererMath && category.enabled && stack && resources.requestFonts)resources.requestFonts(el.getRootNode(),stack,text || el.value || hint || el.textContent || '',{fontWeight:category.weight==='original'?cs.fontWeight:category.weight,fontStyle:cs.fontStyle,fontStretch:cs.fontStretch});
            const pseudo={},originals={};const previous=pseudos.get(el);
            for(const name of ['before','after',...(isInput&&el.matches('input,textarea')&&hint.trim()?['placeholder']:[])]) {
              const c=generated?.[name]||doc.defaultView.getComputedStyle(el,'::'+name);
              if(name==='placeholder' || (c.content && !['none','normal','""'].includes(c.content))) {
                const prior=!readPseudoRoots.has(el.getRootNode())&&previous?.originals?.[name];
                const old=prior|| (c.fontFamily===cs.fontFamily?family:c.fontFamily);originals[name]=old;
                const value=name==='placeholder'?hint:generatedText(c.content);
                const replace=!protectedText&&!rendererMath&&category.enabled&&readableGenerated(value,old);
                const target=replace?FontDeckConfig.categoryStack(kind,settings,globalThis.FontDeckCatalog||[],value):'';
                if(target && resources.requestFonts)resources.requestFonts(el.getRootNode(),target,value,{fontWeight:category.weight==='original'?c.fontWeight:category.weight,fontStyle:c.fontStyle,fontStretch:c.fontStretch});
                pseudo[name]=target?target+', '+old:old;
              }
            }
            plans.push({el,family,protectedText:protectedText||rendererMath,category,stack,pseudo,originals});
          }
          // Snapshot baselines before writing, avoiding inherited-font pollution.
          for(const p of plans) {
            const {el,protectedText,family,category,stack,pseudo,originals}=p;
            remember(el).family=family;
            if(protectedText || !category.enabled || !stack) {
              set(el,'font-family',family);restoreProperty(el,'font-weight');restoreProperty(el,'font-stretch');
            } else {
              set(el,'font-family',stack+', '+family);
              if(category.weight!=='original') set(el,'font-weight',category.weight);
              else restoreProperty(el,'font-weight');
              if(category.stretch && category.stretch!=='original')set(el,'font-stretch',category.stretch+'%');else restoreProperty(el,'font-stretch');
            }
            if(Object.keys(pseudo).length) {
              let state=pseudos.get(el);
              if(!state) {state={id:String(++seq),fonts:{},root:el.getRootNode()};pseudos.set(el,state);ruleDirty.add(state.root);}
              if(state.root!==el.getRootNode()){ruleDirty.add(state.root);state.root=el.getRootNode();ruleDirty.add(state.root);}
              if(Object.keys(state.fonts).length!==Object.keys(pseudo).length || Object.keys(pseudo).some(k=>pseudo[k]!==state.fonts[k]))ruleDirty.add(state.root);
              state.fonts=pseudo;state.originals=originals;
              if(el.getAttribute(token)!==state.id) el.setAttribute(token,state.id);
            } else if(pseudos.has(el)) {ruleDirty.add(pseudos.get(el).root||el.getRootNode());el.removeAttribute(token);pseudos.delete(el);}
            touched.add(el);
          }
        }
        for(const el of [...changes.keys()]) if(!el.isConnected) release(el);
        for(const el of [...pseudos.keys()]) if(!el.isConnected) release(el);
        refreshRules();
        for(const el of touched) expectedStyle.set(el,el.getAttribute('style'));
        scans++;
      } finally {
        for(const [style,disabled] of suspended) if(style.sheet) style.sheet.disabled=disabled;
        scanning=false;
        for(const root of roots) observe(root);
        if(dirty.size || stylesheetRoots.size || pseudoStyleRoots.size)schedule();
      }
    }
    function schedule() {
      if(queued || destroyed || scanning) return;
      queued=true;const generation=++queueGeneration;
      // MutationObserver delivery runs before paint; no animation-length delay.
      queueMicrotask(()=>{if(!destroyed && queued && generation===queueGeneration) scan();});
    }
    function owned(n) {return n?.nodeType===1 && n.hasAttribute('data-font-deck-style');}
    function markStylesheet(node) {
      const el=node?.nodeType===3?node.parentElement:node;
      if(!el || owned(el)) return false;
      const sheet=el.matches?.('style,link[rel~="stylesheet"]')?el:el.closest?.('style');
      if(!sheet) return false;
      const root=sheet.getRootNode(),target=root===doc || root.host?root:doc;stylesheetRoots.add(target);
      return true;
    }
    function selectorDependencies(root) {
      // CSSOM insertRule/replaceSync/adoptedStyleSheets do not emit DOM records.
      // Read rule metadata here rather than trusting a DOM-only cache. This does
      // not force layout or re-read unrelated generated text.
      const dependent={style:false,structure:false,container:false};
      const visited=new Set();
      function inspect(sheet) {
        if(visited.has(sheet))return;visited.add(sheet);
        let rules;try{rules=sheet.cssRules;}catch{dependent.style=true;dependent.structure=true;dependent.container=true;return;}
        if(!rules)return;
        for(const rule of rules){
          if(/\[\s*style(?:[\s~|^$*=\]])|\battr\(\s*style\b/i.test((rule.selectorText||'')+' '+(rule.style?.cssText||'')))dependent.style=true;
          if(/[+~]|:(?:has|empty|nth-|first-|last-|only-)/i.test(rule.selectorText||'') || /counter\(|counter-(?:increment|reset|set)/i.test(rule.style?.cssText||''))dependent.structure=true;
          if(rule.constructor?.name==='CSSContainerRule')dependent.container=true;
          if(rule.styleSheet)inspect(rule.styleSheet);
          else if(rule.cssRules)inspect(rule);
          if(dependent.style && dependent.structure && dependent.container)return;
        }
      }
      for(const sheet of [...(root.styleSheets||[]),...(root.adoptedStyleSheets||[])])if(!owned(sheet.ownerNode)){inspect(sheet);if(dependent.style && dependent.structure && dependent.container)break;}
      return dependent;
    }
    function fontRelatedStyleChange(el,oldValue) {
      const dependent=selectorDependencies(el.getRootNode());
      if(dependent.style)return true;
      const relevant=/^(?:all$|font(?:-|$)|--|content$|display$|visibility$|writing-mode$|direction$|text-orientation$|math-style$|counter-|quotes$)/;
      styleParser.style.cssText=oldValue||'';
      const containerSize=/^(?:width$|height$|(?:min|max|inline|block)-(?:width|height|size)$|(?:min|max)-(?:inline|block)-size$|container(?:-|$)|padding|border|box-sizing$|aspect-ratio$|flex|grid|position$|inset|left$|right$|top$|bottom$|margin|contain$|zoom$|transform)/;
      const props=new Set([...styleParser.style,...el.style].filter(p=>relevant.test(p)||(dependent.container&&containerSize.test(p))));
      return [...props].some(p=>styleParser.style.getPropertyValue(p)!==el.style.getPropertyValue(p)||styleParser.style.getPropertyPriority(p)!==el.style.getPropertyPriority(p));
    }
    function invalidatePseudos(root) {
      if(!ownStyles.has(root))return;
      pseudoStyleRoots.add(root);
      for(const el of pseudos.keys())if(el.getRootNode()===root)mark(el);
    }
    function collectMutations(records) {
      for(const r of records) {
        if(r.type==='childList' && [...r.removedNodes].some(n=>owned(n)&&n.getAttribute('data-font-deck-style')==='protection')){
          const root=r.target.getRootNode();ruleDirty.add(root);mark(root);
        }
        if(owned(r.target) || owned(r.target.parentElement) || (r.type==='attributes' && r.attributeName===token)) continue;
        if(r.type==='attributes' && r.attributeName==='style' && expectedStyle.get(r.target)===r.target.getAttribute('style')) continue;
        if(r.type==='attributes' && r.attributeName==='style' && !fontRelatedStyleChange(r.target,r.oldValue))continue;
        if(r.type==='childList' && [...r.addedNodes,...r.removedNodes].length && [...r.addedNodes,...r.removedNodes].every(owned)) continue;
        markStylesheet(r.target);
        if(r.type==='childList') for(const n of [...r.addedNodes,...r.removedNodes]) markStylesheet(n);
        if(r.type==='attributes') {
          const root=r.target.getRootNode();
          // Attribute selectors, sibling combinators and :has() may affect peers.
          invalidatePseudos(root);
          captureSiteEdits(r.target);
          mark(r.target,true);
        } else if(r.type==='characterData') mark(r.target);
        else {
          if([...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1) && selectorDependencies(r.target.getRootNode()).structure)invalidatePseudos(r.target.getRootNode());
          mark(r.target);
          for(const n of r.addedNodes) if(!owned(n)) mark(n,true);
        }
      }
    }
    function mutations(records) {collectMutations(records);if(dirty.size || stylesheetRoots.size || pseudoStyleRoots.size) schedule();}
    function onInput(event) {
      const target=event.composedPath?.()[0] || event.target;
      if(!enabled || destroyed || target?.getAttribute?.('type')==='password')return;
      mark(target,true);schedule();
    }
    function observe(root) {
      let obs=observers.get(root);
      if(!obs){obs=new doc.defaultView.MutationObserver(mutations);observers.set(root,obs);root.addEventListener('input',onInput,true);root.addEventListener('change',onInput,true);}
      // CSS attr() and attribute selectors are not limited to named sites/attributes.
      obs.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeOldValue:true});
    }
    function discover(reschedule=true) {
      let changed=false;
      for(const root of roots) for(const el of root.querySelectorAll('*'))if(inspectShadow(el))changed=true;
      if(changed && reschedule) schedule();
    }
    function inspectShadow(el) {
      if(el.shadowRoot){
        shadowHosts.delete(el);
        if(!roots.has(el.shadowRoot)){roots.add(el.shadowRoot);mark(el.shadowRoot,true);return true;}
      }else if(el.namespaceURI==='http://www.w3.org/1999/xhtml' && (/^(?:ARTICLE|ASIDE|BLOCKQUOTE|BODY|DIV|FOOTER|H[1-6]|HEADER|MAIN|NAV|P|SECTION|SPAN)$/.test(el.tagName)||el.localName.includes('-')))shadowHosts.add(el);
      return false;
    }
    function discoverBatch() {
      if(!enabled || destroyed || doc.hidden || !shadowHosts.size)return;
      shadowTicks++;let changed=false,checked=0;const start=doc.defaultView.performance.now();
      if(!shadowCursor)shadowCursor=shadowHosts.values();
      while(checked<128 && doc.defaultView.performance.now()-start<3){
        const next=shadowCursor.next();if(next.done){shadowCursor=null;break;}
        const el=next.value;checked++;
        if(!el.isConnected)shadowHosts.delete(el);else if(inspectShadow(el))changed=true;
      }
      shadowChecks+=checked;shadowMaxBatch=Math.max(shadowMaxBatch,checked);
      if(changed)schedule();
    }
    const shadowTimer=doc.defaultView.setInterval(discoverBatch,100);
    function configure(raw) {settings=FontDeckConfig.normalizeSettings(raw);fullScan=true;scan();}
    function destroy() {
      destroyed=true;queued=false;queueGeneration++;doc.defaultView.clearInterval(shadowTimer);
      for(const [root,obs] of observers){obs.disconnect();root.removeEventListener('input',onInput,true);root.removeEventListener('change',onInput,true);}
      restoreChanges();for(const [el,a] of adapters) restoreFormula(el,a);for(const s of ownStyles.values()) s.remove();for(const s of fontStyles.values()) s.remove();
      roots.clear();observers.clear();ownStyles.clear();fontStyles.clear();dirty.clear();deepDirty.clear();stylesheetRoots.clear();pseudoStyleRoots.clear();ruleDirty.clear();shadowHosts.clear();shadowCursor=null;
    }
    function status() {return {enabled,scans,elements:changes.size,shadowRoots:roots.size-1,formulas:adapters.size,fontFaces:doc.fonts.size,mathMode:settings.math.mode,ruleBuilds,shadowCandidates:shadowHosts.size,shadowChecks,shadowTicks,shadowMaxBatch};}
    scan();return {configure,status,destroy};
  }
  globalThis.FontDeckEngine={create};
})();
