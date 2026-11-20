
const PE=window.PatternEngine;
const $=q=>document.querySelector(q);
const canvas=$('#previewCanvas'),ctx=canvas.getContext('2d');
const circleCanvas=$('#circlePreviewCanvas'),circleCtx=circleCanvas?circleCanvas.getContext('2d'):null;
const palettePresets=[
  ['#FFF8FC','#F7B9D7','#B7D5FF','#D7C2FF'],['#FFF9F3','#FFD7A8','#FFB8C8','#BFE6D3'],['#F7F5FF','#AFA0F4','#D5C9FF','#9EDAE3'],['#FFF8F2','#F3AFA7','#F7D68B','#AECFBA'],
  ['#F7FAFF','#A9C9FF','#BBDCF4','#D9C7FF'],['#FFF8F8','#EFA3B5','#B9D8B4','#F0D78F'],['#FAF7FF','#D7B8FF','#B5E1DE','#FFC6D9'],['#FFF9EC','#F2C572','#F2A4A4','#9FCBC4']
];
const curatedHarmonyPresets=[
  {name:'딸기 우유',note:'핑크 + 크림 + 라벤더',colors:['#FFF8FC','#F4B6D2','#F8DDE8','#C9B8F3','#E4A9C7']},
  {name:'버터 레몬',note:'옐로우 + 크림 + 브라운 라인',colors:['#FFFBEF','#F5D36C','#FBE9AF','#F3C99B','#C79A58']},
  {name:'민트 소다',note:'민트 + 하늘 + 퍼플',colors:['#F7FFFD','#9FDCCB','#D3F2ED','#B7CBFF','#7BAAA0']},
  {name:'블루베리 요거트',note:'블루 + 연보라 + 핑크 포인트',colors:['#F7F8FF','#AFC3FF','#D9D7FF','#F4BED8','#8EA1D6']},
  {name:'피치 크림',note:'복숭아 + 코랄 + 바닐라',colors:['#FFF8F2','#F6C2B1','#FFE0CC','#F3D27B','#D7A080']},
  {name:'세이지 체크',note:'세이지 + 아이보리 + 부드러운 라인',colors:['#FBFCF8','#A8B4A3','#D8DED3','#F2E6D0','#8F9889']}
];
const STORAGE={state:'cps-v151-state',favorites:'cps-v151-favorites',presets:'cps-v151-presets',assets:'cps-v151-assets',hiddenPatterns:'cps-v160-hidden-patterns',deletedPatterns:'cps-v200-deleted-patterns',recentReferenceColors:'cps-v240-recent-reference-colors'};
const MAX_LAYERS=8;
const colorMeta=[['배경 A','주 배경/기본색'],['패턴 A','패턴 기본색'],['패턴 B','서브 패턴색'],['포인트','포인트/장식색'],['선 색','체크 외곽선/그리드 선']];
const defaultBg=['#FFF9FC','#F5B9D4'];
const MAX_BG_STOPS=6;
let zoom=1,activeCategory='전체',activeLayerIndex=0,thumbTimer=0,referencePalette=[],recentReferenceColors=[],referenceImage=null,referenceObjectUrl='',referenceSampleCanvas=null,referenceSelectedColor='',referenceSelectedRgb=null,referenceZoom=1,referencePanX=0,referencePanY=0,referenceViewMetrics=null,activeReferenceColorInput=null,activeReferenceColorLabel='',referenceDragState=null,referenceDockCollapsed=localStorage.getItem('cps-v260-reference-dock-collapsed')==='1',patternRestoreImage=null,patternRestoreObjectUrl='',patternRestoreResult=null,patternRestorePreviousState=null,patternRestoreBusy=false,patternRestoreSourceFile=null,patternRestoreCompareMode='overlay',patternRestoreForcedPresetId='';

function normalizeHexLike(value,fallback='#FFFFFF'){return /^#[0-9a-fA-F]{6}$/.test(String(value||'').trim())?String(value).trim().toUpperCase():fallback}
function buildGradientStopsFromColors(colors){let list=(Array.isArray(colors)?colors:[...defaultBg]).filter(Boolean).map((c,i)=>normalizeHexLike(c,defaultBg[Math.min(i,defaultBg.length-1)]||'#FFFFFF')).slice(0,MAX_BG_STOPS);if(!list.length)list=[defaultBg[0],defaultBg[1]];if(list.length===1)list.push(list[0]);let step=list.length>1?100/(list.length-1):100;return list.map((color,i)=>({color,pos:Math.round(step*i)}))}
function normalizeGradientStops(stops,fallbackColors=defaultBg){let base=Array.isArray(stops)?stops.filter(Boolean).slice(0,MAX_BG_STOPS):[];if(!base.length)base=buildGradientStopsFromColors(fallbackColors);let count=Math.max(2,base.length);let out=base.map((stop,i)=>({color:normalizeHexLike(stop?.color,(fallbackColors[i]||fallbackColors[fallbackColors.length-1]||'#FFFFFF')),pos:clampInt(stop?.pos??stop?.offset??Math.round((i/(count-1))*100),0,100,Math.round((i/(count-1))*100))})).sort((a,b)=>a.pos-b.pos);if(out.length<2)out=buildGradientStopsFromColors(fallbackColors);return out.slice(0,MAX_BG_STOPS)}
function bgStopsToLegacyColors(stops){let sorted=normalizeGradientStops(stops);return [sorted[0].color,sorted[sorted.length-1].color]}
function syncBgGradientState(bg){bg.gradientStops=normalizeGradientStops(bg.gradientStops,bg.colors||defaultBg);bg.colors=bgStopsToLegacyColors(bg.gradientStops);return bg}
function setBgGradientFromPalette(colors){let list=(Array.isArray(colors)?colors:[]).filter(Boolean).slice(0,4);if(!list.length)list=[defaultBg[0],defaultBg[1]];state.bg.gradientStops=buildGradientStopsFromColors(list);state.bg.colors=bgStopsToLegacyColors(state.bg.gradientStops)}

function normalizeColors(colors){let base=(colors||[]).slice(0,5);while(base.length<4)base.push(base[base.length-1]||'#FFFFFF');if(!base[4])base[4]=base[3]||base[2]||base[1]||'#CDB9E8';return base}
function checkPresetOnly(p){let text=`${p.id} ${p.name} ${p.desc}`.toLowerCase();return /(check|checker|gingham|plaid)/.test(text)||/체크|깅엄|플래드/.test(`${p.name} ${p.desc}`)}
const UNIFORM_SHAPE_PRESET_IDS=new Set(['polka','tiny-dot','irregular-dot','doodle-dot','ring-dot','bubble-dot','hearts','outline-hearts','stars','outline-stars','sparkles','kira-sparkle','bows','tiny-bows','puff-hearts','candy-stars','flowers','daisy-dot','cloud','raindrop']);
function isUniformShapePresetId(id){return UNIFORM_SHAPE_PRESET_IDS.has(id)}
function isGraphicCompositionPresetId(id){let p=PE.presets.find(x=>x.id===id);return p?.type==='graphic-composition'}
function isDashedGridPresetId(id){return id==='dashed-grid'||id==='heart-dashed-grid'}
function isHeartDashedGridPresetId(id){return id==='heart-dashed-grid'}
function isPastelGridPresetId(id){return id==='grid'}
function isPastelDiamondGridPresetId(id){return id==='grid-diamond'}
function isSimpleDiamondPresetId(id){return id==='simple-diamond'}
function isPastelArgylePresetId(id){let p=PE.presets.find(x=>x.id===id);return p?.type==='pastel-argyle'}
function isSoftSunburstPresetId(id){return id==='soft-sunburst-bg'}
function isMiniDotPresetId(id){return id==='tiny-dot'}
function isSoftWindowCheckPresetId(id){return id==='soft-window-check'}
function isMilkyMiniCheckWindowPresetId(id){return id==='milky-mini-check-window'}
const BASIC_ZERO_GAP_PRESET_IDS=new Set(['pastel-checker','mini-checker','rounded-checker','gingham','hand-checker','retro-checker','milk-checker','soft-gingham','marshmallow-check','picnic-check','micro-gingham','checker-heart','checker-star','checker-dot']);
function isBasicZeroGapPresetId(id){return BASIC_ZERO_GAP_PRESET_IDS.has(id)}
function isSoftAnchorPresetId(id){let p=PE.presets.find(x=>x.id===id);return p?.opt?.anchorMode==='soft'}
function isTriHatchPresetId(id){return id==='no-gap-tri-check'||id==='legacy-soft-no-gap-tri-check'||id==='airy-mix-check'}
function isAiryMixPresetId(id){return id==='airy-mix-check'}
function isLayeredFabricPlaidPresetId(id){let p=PE.presets.find(x=>x.id===id);return p?.type==='layered-fabric-plaid'}

function isCheckPreset(p){return !!p&&checkPresetOnly(p)}
function isCheckLikePresetId(id){return isCheckPreset(getPreset(id))}
function hexToRgb(hex){let v=(hex||'#000000').replace('#','').trim();if(v.length===3)v=v.split('').map(c=>c+c).join('');let n=parseInt(v,16);return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}}
function rgbToHexObj({r,g,b}){return '#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('').toUpperCase()}
function rgbToHsl({r,g,b}){r/=255;g/=255;b/=255;let max=Math.max(r,g,b),min=Math.min(r,g,b),h,s,l=(max+min)/2;if(max===min){h=s=0}else{let d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h*=60}return {h,s,l}}
function hslToRgb(h,s,l){h=((h%360)+360)%360;let c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return {r:(r+m)*255,g:(g+m)*255,b:(b+m)*255}}
function hslToHex(h,s,l){return rgbToHexObj(hslToRgb(h,s,l))}
function mixHex(a,b,ratio=.5){let ca=hexToRgb(a),cb=hexToRgb(b);return rgbToHexObj({r:ca.r*(1-ratio)+cb.r*ratio,g:ca.g*(1-ratio)+cb.g*ratio,b:ca.b*(1-ratio)+cb.b*ratio})}
function buildLayeredPlaidPalette(baseHex,soft=false){let master=normalizeHexLike(baseHex,'#6E88C8');return soft?{bgA:mixHex(master,'#FFFFFF',.88),bgB:mixHex(master,'#FFFFFF',.76),wide:mixHex(master,'#FFFFFF',.46),mid:mixHex(master,'#FFFFFF',.26),dark:master,hatch:master}:{bgA:mixHex(master,'#FFFFFF',.72),bgB:mixHex(master,'#FFFFFF',.56),wide:mixHex(master,'#FFFFFF',.24),mid:mixHex(master,'#FFFFFF',.12),dark:master,hatch:master}}
function applyLayeredPlaidMaster(layer,baseHex,soft=isSoftAnchorPresetId(layer.presetId)){let pal=buildLayeredPlaidPalette(baseHex,soft);layer.plaidMaster=normalizeHexLike(baseHex,'#F39BBC');layer.colors=[pal.bgA,pal.wide,pal.mid,pal.dark,pal.hatch];layer.plaidBg2=pal.bgB;layer.plaidHatch=layer.plaidHatch!==false;layer.plaidHatchStrength=layer.plaidHatchStrength??40;return pal}
const MASTER_COLOR_SWATCHES=['#D94B5E','#E78238','#D4B83A','#4F9866','#4B79C8','#535AA8','#8A5CC2'];
function defaultAnchorProfileForPreset(presetId=''){
  let preset=PE.presets.find(p=>p.id===presetId),type=preset?.type||'',soft=preset?.opt?.anchorMode==='soft';
  if(type==='grid'||type==='grid-diamond'||type==='dashed-grid')return [.82,0,.38,.62,.08];
  if(type==='pastel-argyle')return [.68,0,.22,.42,.06];
  if(type==='soft-window-check')return [0,0,.34,.52,.20];
  if(type==='milky-mini-check-window')return [.82,0,.42,.64,.12];
  if(['checker','wavy-checker','textured-checker','plaid','layered-fabric-plaid','overlap-check','airy-mix-check','torn-checker'].includes(type))return soft?[.86,0,.38,.62,.12]:[.76,0,.20,.44,.08];
  if(type==='reference-plaid')return soft?[.86,0,.40,.64,.12]:[.74,0,.18,.42,.08];
  if(['sunburst-bg','soft-sunburst-bg','glossy-sun-bg','sparkle-glow-bg'].includes(type))return [.86,0,.26,.54,.08];
  return [.82,0,.32,.56,.10]
}
function buildAnchorToneProfile(colors,presetId=''){
  let list=normalizeColors(colors),lum=list.map(c=>luminance(c)),min=Math.min(...lum),den=Math.max(1,255-min);
  let profile=lum.map(v=>{let t=(v-min)/den;if(v>=238)t=Math.max(t,.92);return clamp(t,0,.97)});
  if(!profile.some(v=>v<=.02))return defaultAnchorProfileForPreset(presetId);
  return profile
}
function buildThemeTonePalette(baseHex,presetId='',profile=null){
  let master=normalizeHexLike(baseHex,'#D94B7A'),preset=PE.presets.find(p=>p.id===presetId),type=preset?.type||'',soft=preset?.opt?.anchorMode==='soft';
  if(type==='graphic-composition')return normalizeColors([mixHex(master,'#FFFFFF',.88),master,mixHex(master,'#FFFFFF',.42),mixHex(master,'#FFFFFF',.68),mixHex(master,'#FFFFFF',.16)]);
  if(type==='pastel-argyle')return normalizeColors([mixHex(master,'#FFFFFF',.68),master,mixHex(master,'#FFFFFF',.22),mixHex(master,'#FFFFFF',.42),mixHex(master,'#FFFFFF',.06)]);
  if(type==='soft-window-check')return normalizeColors([master,master,mixHex(master,'#FFFFFF',.34),mixHex(master,'#FFFFFF',.52),mixHex(master,'#FFFFFF',.20)]);
  if(type==='reference-plaid')return soft
    ?normalizeColors([mixHex(master,'#FFFFFF',.86),master,mixHex(master,'#FFFFFF',.40),mixHex(master,'#FFFFFF',.64),mixHex(master,'#FFFFFF',.12)])
    :normalizeColors([mixHex(master,'#FFFFFF',.74),master,mixHex(master,'#FFFFFF',.18),mixHex(master,'#FFFFFF',.42),mixHex(master,'#FFFFFF',.08)]);
  if(['checker','wavy-checker','textured-checker','plaid','overlap-check','airy-mix-check','torn-checker'].includes(type))return soft
    ?normalizeColors([mixHex(master,'#FFFFFF',.86),master,mixHex(master,'#FFFFFF',.38),mixHex(master,'#FFFFFF',.62),mixHex(master,'#FFFFFF',.12)])
    :normalizeColors([mixHex(master,'#FFFFFF',.76),master,mixHex(master,'#FFFFFF',.20),mixHex(master,'#FFFFFF',.44),mixHex(master,'#FFFFFF',.08)]);
  let defaults=defaultAnchorProfileForPreset(presetId),raw=(Array.isArray(profile)&&profile.length>=5?profile:defaults).slice(0,5);
  // Saved profiles from older versions may contain 90~97% white mixing.
  // Cap them to the new preset defaults so automatic colors cannot become washed out again.
  let tone=raw.map((t,i)=>Math.min(clamp(Number(t)||0,0,.975),defaults[i]));
  return tone.map(t=>mixHex(master,'#FFFFFF',t))
}
function setCanvasBackgroundColor(value){
  let fallback=state.bg.colors?.[0]||'#FFFFFF',bg=normalizeHexLike(value,fallback);
  state.bg.colors=Array.isArray(state.bg.colors)?state.bg.colors:[bg,bg];
  state.bg.colors[0]=bg;
  if(!Array.isArray(state.bg.gradientStops)||!state.bg.gradientStops.length)state.bg.gradientStops=buildGradientStopsFromColors(state.bg.colors);
  if(state.bg.gradientStops[0])state.bg.gradientStops[0].color=bg;
  syncBgGradientState(state.bg);
  return bg
}
function syncCanvasBackgroundToMaster(palette){if(activeLayerIndex!==0||state.bg.transparent)return;let bg=palette[0];state.bg.colors[0]=bg;if(state.bg.mode==='solid'){state.bg.gradientStops=buildGradientStopsFromColors([bg,state.bg.colors[1]||bg])}else if(Array.isArray(state.bg.gradientStops)&&state.bg.gradientStops.length){state.bg.gradientStops[0].color=bg}syncBgGradientState(state.bg)}
function applyMasterTone(layer,baseHex,syncBg=true,mode='auto'){
  let master=normalizeHexLike(baseHex,layer.masterColor||'#F59BBC'),resolvedMode=mode==='pattern-auto'?'pattern-auto':'auto';layer.masterColor=master;layer.colorMode=resolvedMode;
  if(!Array.isArray(layer.anchorToneProfile)||layer.anchorToneProfile.length<5)layer.anchorToneProfile=defaultAnchorProfileForPreset(layer.presetId);
  if(isLayeredFabricPlaidPresetId(layer.presetId)){applyLayeredPlaidMaster(layer,master,isSoftAnchorPresetId(layer.presetId));layer.masterColor=master}
  else{layer.colors=buildThemeTonePalette(master,layer.presetId,layer.anchorToneProfile)}
  if(syncBg)syncCanvasBackgroundToMaster(layer.colors);return layer.colors
}
function luminance(hex){let {r,g,b}=hexToRgb(hex);return .2126*r+.7152*g+.0722*b}
function suggestLineColor(colors){let c=normalizeColors(colors);let candidate=mixHex(c[1],c[2],.55);let {h,s,l}=rgbToHsl(hexToRgb(candidate));return hslToHex(h,Math.min(.5,Math.max(.15,s*.65)),Math.max(.30,Math.min(.50,l*.56)))}
function generateAutoPalettes(baseHex){let {h,s,l}=rgbToHsl(hexToRgb(baseHex));let softS=Math.max(.28,Math.min(.72,s||.45));let softL=Math.max(.55,Math.min(.78,l||.68));let out=[
  {name:'소프트 단색',note:'한 가지 색을 부드럽게 확장',colors:[hslToHex(h,softS*.15,.96),hslToHex(h,softS*.75,softL),hslToHex(h,softS*.45,.87),hslToHex(h,Math.min(.7,softS*.85),Math.max(.52,softL-.08)),hslToHex(h,Math.min(.45,softS*.55),Math.max(.34,softL-.24))]},
  {name:'비슷한 색 조합',note:'옆 색상끼리 자연스럽게',colors:[hslToHex(h-16,softS*.14,.97),hslToHex(h-12,softS*.62,softL),hslToHex(h+16,softS*.48,.84),hslToHex(h+28,Math.min(.72,softS*.75),Math.max(.56,softL-.06)),hslToHex(h,Math.min(.4,softS*.4),Math.max(.34,softL-.22))]},
  {name:'포인트 대비',note:'메인은 유지하고 포인트만 또렷하게',colors:[hslToHex(h,softS*.10,.97),hslToHex(h,softS*.72,softL),hslToHex(h,softS*.28,.90),hslToHex(h+165,Math.min(.6,softS*.85),.68),hslToHex(h,Math.min(.42,softS*.45),.36)]},
  {name:'캔디 믹스',note:'귀엽고 또렷한 파스텔 느낌',colors:[hslToHex(h-8,softS*.12,.98),hslToHex(h,Math.min(.8,softS*.82),softL),hslToHex(h+140,Math.min(.55,softS*.7),.83),hslToHex(h-145,Math.min(.58,softS*.72),.78),hslToHex(h,Math.min(.44,softS*.50),.38)]}
];
out.forEach(v=>{v.colors=normalizeColors(v.colors);v.colors[4]=suggestLineColor(v.colors)});return out}
function buildCheckerTonePalette(baseHex){let {h,s,l}=rgbToHsl(hexToRgb(baseHex||'#AFC3FF'));let softS=Math.max(.22,Math.min(.74,s||.5));let midL=Math.max(.56,Math.min(.76,l||.68));let toneA=hslToHex(h,Math.min(.75,softS*.92+.05),midL);let toneB=hslToHex(h+3,Math.max(.16,softS*.42),Math.min(.88,midL+.18));let toneC=hslToHex(h-4,Math.max(.12,softS*.26),Math.min(.94,midL+.28));let bg=hslToHex(h,Math.max(.06,softS*.12),.97);let line=suggestLineColor([bg,toneA,toneB,toneC,'#000000']);return normalizeColors([bg,toneA,toneB,toneC,line])}
function applyCheckerTonePalette(layer=currentLayer(),sync=true){let base=(layer.checkerToneBase||layer.colors?.[1]||'#AFC3FF').toUpperCase();layer.checkerToneBase=base;layer.colors=buildCheckerTonePalette(base);if(sync){persistAll();syncLayerUI();renderPatternListDebounced();renderMain()}}
function applyPaletteToCurrentLayer(colors,applyBg=false){let layer=currentLayer();layer.colors=normalizeColors(colors);layer.colors[4]=suggestLineColor(layer.colors);if(applyBg){setBgGradientFromPalette([layer.colors[0],mixHex(layer.colors[0],layer.colors[2],.28)])}persistAll();syncAll()}
function renderPaletteCard(parent,item){let card=document.createElement('div');card.className='preset-card';let info=document.createElement('div');info.innerHTML=`<strong>${item.name}</strong><small>${item.note||'추천 팔레트'}</small>`;let sw=document.createElement('div');sw.className='swatch-row';item.colors.forEach(c=>{let s=document.createElement('div');s.className='swatch';s.style.background=c;s.title=c;sw.appendChild(s)});info.appendChild(sw);let acts=document.createElement('div');acts.className='preset-actions';let a1=document.createElement('button');a1.className='mini-btn';a1.textContent='레이어 적용';a1.onclick=()=>applyPaletteToCurrentLayer(item.colors,false);let a2=document.createElement('button');a2.className='mini-btn';a2.textContent='배경+레이어';a2.onclick=()=>applyPaletteToCurrentLayer(item.colors,true);acts.append(a1,a2);card.append(info,acts);parent.appendChild(card)}
function renderColorRecommendationPanels(){let curated=$('#curatedPaletteList'),auto=$('#autoPaletteList');if(!curated||!auto)return;curated.innerHTML='<div class="muted mini-copy">함께 쓰면 예쁜 조합 프리셋</div>';auto.innerHTML='<div class="muted mini-copy">기준 색상으로 자동 생성한 추천 팔레트</div>';curatedHarmonyPresets.forEach(item=>renderPaletteCard(curated,item));let base=$('#baseColorInput')?.value||currentLayer().colors[1]||'#F5B9D4';generateAutoPalettes(base).forEach(item=>renderPaletteCard(auto,item))}


function runtimeSelfCheck(){let problems=[];if(typeof clampInt!=='function')problems.push('clampInt');if(typeof renderMain!=='function')problems.push('renderMain');if(!window.PatternEngine)problems.push('PatternEngine');if(problems.length)console.error('Cute Pattern Studio runtime check failed:',problems);return problems.length===0}
function uid(prefix='id'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
function clone(v){return JSON.parse(JSON.stringify(v))}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function clampInt(value,min,max,fallback=min){let n=Number(value);if(!Number.isFinite(n))n=Number(fallback);if(!Number.isFinite(n))n=min;return Math.round(clamp(n,min,max))}
function shuffle(a){let out=[...a];for(let i=out.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function toast(msg){let el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),1800)}
function categories(){return ['전체',...new Set(PE.presets.map(p=>p.category))]}
function getPreset(id){return PE.presets.find(p=>p.id===id)||PE.presets[0]}
function defaultLayer(i,presetId='pastel-checker',enabled=true){return {enabled,name:i===0?'기본 레이어':`추가 레이어 ${i}`,sourceType:'builtin',presetId,assetId:'',renderMode:'motif',colors:buildThemeTonePalette('#F59BBC',presetId),size:i===0?72:58,gap:isBasicZeroGapPresetId(presetId)?0:(i===0?24:28),jitter:i===0?18:22,rotation:0,stroke:4,opacity:i===0?100:78,detail:45,seed:Math.floor(Math.random()*1e9),svgColorMode:'original',randomSize:true,randomAngle:true,randomPosition:true,offsetX:0,offsetY:0,row1OffsetX:0,row1OffsetY:0,row1Angle:0,row2OffsetX:0,row2OffsetY:0,row2Angle:0,checkerToneMode:false,checkerToneBase:'#AFC3FF',colorMode:'auto',masterColor:'#F59BBC'}}
function defaultGradientOverlay(index=1){return index===1?{enabled:false,direction:'top-to-bottom',color:'#8ED8FF',opacity:35,start:0,end:35,spread:70}:{enabled:false,direction:'bottom-to-top',color:'#5AA7E8',opacity:45,start:70,end:100,spread:70}}
function normalizeGradientOverlay(value,index=1){let d=defaultGradientOverlay(index),v={...d,...(value||{})};v.enabled=!!v.enabled;v.direction=v.direction==='bottom-to-top'?'bottom-to-top':'top-to-bottom';v.color=normalizeHexLike(v.color,d.color);v.opacity=clampInt(v.opacity,0,100,d.opacity);v.start=clampInt(v.start,0,99,d.start);v.end=clampInt(v.end,1,100,d.end);if(v.start>=v.end){if(v.start>=99)v.start=98;v.end=Math.min(100,v.start+1)}v.spread=clampInt(v.spread,0,100,d.spread);return v}

function makeInitialState(){return {bg:{transparent:false,mode:'solid',colors:[...defaultBg],gradientAngle:135,gradientStops:buildGradientStopsFromColors(defaultBg),backgroundOnly:false,watercolorSpread:62,watercolorScale:58,watercolorIrregular:72,watercolorTexture:true,watercolorStyle:'mist',watercolorDefinition:52,watercolorSparkle:28,watercolorSeed:47291,vignette:{enabled:false,color:'#6F55C9',range:72,strength:28,softness:28}},gradientOverlays:{overlay1:defaultGradientOverlay(1),overlay2:defaultGradientOverlay(2)},exportW:2000,exportH:2000,tileW:512,tileH:512,layers:[defaultLayer(0,'pastel-checker',true)]}}
let favorites=new Set();
let deletedPatterns=new Set();
let myPresets=[];
let userAssets=[];
let state=makeInitialState();

function loadLocal(){
  try{favorites=new Set(JSON.parse(localStorage.getItem(STORAGE.favorites)||'[]'))}catch{}
  try{
    let oldHidden=JSON.parse(localStorage.getItem(STORAGE.hiddenPatterns)||'[]')||[];
    let savedDeleted=JSON.parse(localStorage.getItem(STORAGE.deletedPatterns)||'[]')||[];
    deletedPatterns=new Set([...savedDeleted,...oldHidden]);
    if(oldHidden.length)localStorage.removeItem(STORAGE.hiddenPatterns);
    if(deletedPatterns.size){
      for(let i=PE.presets.length-1;i>=0;i--)if(deletedPatterns.has(PE.presets[i].id))PE.presets.splice(i,1);
      deletedPatterns.forEach(id=>{delete PE.defaults[id];favorites.delete(id)});
      localStorage.setItem(STORAGE.deletedPatterns,JSON.stringify([...deletedPatterns]));
    }
  }catch{deletedPatterns=new Set()}
  try{myPresets=JSON.parse(localStorage.getItem(STORAGE.presets)||'[]')||[]}catch{}
  try{userAssets=JSON.parse(localStorage.getItem(STORAGE.assets)||'[]')||[]}catch{}
  try{recentReferenceColors=(JSON.parse(localStorage.getItem(STORAGE.recentReferenceColors)||'[]')||[]).filter(c=>/^#[0-9a-fA-F]{6}$/.test(c)).map(c=>c.toUpperCase()).slice(0,10)}catch{recentReferenceColors=[]}
  try{let saved=JSON.parse(localStorage.getItem(STORAGE.state)||'null');if(saved)state=mergeState(saved)}catch{}
}
function mergeState(saved){let base=makeInitialState();if(!saved||typeof saved!=='object')return base;let merged={...base,...saved,bg:{...base.bg,...(saved.bg||{})}};merged.gradientOverlays={overlay1:normalizeGradientOverlay(saved.gradientOverlays?.overlay1,1),overlay2:normalizeGradientOverlay(saved.gradientOverlays?.overlay2,2)};merged.exportW=clampInt(merged.exportW,16,8000,2000);merged.exportH=clampInt(merged.exportH,16,8000,2000);merged.tileW=clampInt(merged.tileW,16,4000,512);merged.tileH=clampInt(merged.tileH,16,4000,512);merged.layers=(saved.layers||base.layers).slice(0,MAX_LAYERS).map((l,i)=>({...defaultLayer(i),...l,colors:normalizeColors(l.colors||defaultLayer(i).colors)}));if(!merged.layers.length)merged.layers=[defaultLayer(0,'pastel-checker',true)];merged.layers[0].enabled=true;merged.layers[0].name='기본 레이어';if(!Number.isFinite(+merged.layers[0].opacity)||+merged.layers[0].opacity<=0)merged.layers[0].opacity=100;merged.bg.colors=[merged.bg.colors?.[0]||defaultBg[0],merged.bg.colors?.[1]||merged.bg.colors?.[0]||defaultBg[1]];merged.bg.gradientAngle=clampInt(merged.bg.gradientAngle,0,360,135);merged.bg.backgroundOnly=!!merged.bg.backgroundOnly;merged.bg.watercolorSpread=clampInt(merged.bg.watercolorSpread,10,100,62);merged.bg.watercolorScale=clampInt(merged.bg.watercolorScale,15,100,58);merged.bg.watercolorIrregular=clampInt(merged.bg.watercolorIrregular,0,100,72);merged.bg.watercolorTexture=merged.bg.watercolorTexture!==false;merged.bg.watercolorStyle=['mist','cloud','bloom','aqua','pearl','blotch','wash','corner','aquaMilk','aquaSparkle','aquaFrost','wateryCloud'].includes(merged.bg.watercolorStyle)?merged.bg.watercolorStyle:'mist';merged.bg.watercolorDefinition=clampInt(merged.bg.watercolorDefinition,0,100,52);merged.bg.watercolorSparkle=clampInt(merged.bg.watercolorSparkle,0,100,28);merged.bg.watercolorSeed=clampInt(merged.bg.watercolorSeed,0,999999999,47291);merged.bg.vignette={enabled:!!merged.bg.vignette?.enabled,color:normalizeHexLike(merged.bg.vignette?.color||'#6F55C9','#6F55C9'),range:clampInt(merged.bg.vignette?.range,0,100,72),strength:clampInt(merged.bg.vignette?.strength,0,100,28),softness:clampInt(merged.bg.vignette?.softness,0,100,28)};syncBgGradientState(merged.bg);merged.layers.forEach((layer,i)=>{if(i>0&&!layer.name)layer.name=`추가 레이어 ${i}`;if(layer.presetId==='legacy-soft-airy-mix-check')layer.presetId='airy-mix-check';if(layer.presetId==='radial-check-rays')layer.presetId='soft-sunburst-bg';if(layer.sourceType==='builtin'&&!PE.presets.some(p=>p.id===layer.presetId))layer.presetId='pastel-checker';let oldBasicGap={ 'pastel-checker':24,'mini-checker':8,'rounded-checker':24,'gingham':8,'hand-checker':8,'retro-checker':24,'milk-checker':10,'soft-gingham':12,'marshmallow-check':12,'picnic-check':10,'micro-gingham':6,'checker-heart':24,'checker-star':24,'checker-dot':24}[layer.presetId];if(isBasicZeroGapPresetId(layer.presetId)&&(layer.gap===undefined||Number(layer.gap)===Number(oldBasicGap)))layer.gap=0;if(layer.randomSize===undefined)layer.randomSize=true;if(layer.randomAngle===undefined)layer.randomAngle=true;if(layer.randomPosition===undefined)layer.randomPosition=true;if(isUniformShapePresetId(layer.presetId)){layer.randomSize=false;layer.randomAngle=false;layer.randomPosition=false;}if(layer.offsetX===undefined)layer.offsetX=0;if(layer.offsetY===undefined)layer.offsetY=0;['row1OffsetX','row1OffsetY','row1Angle','row2OffsetX','row2OffsetY','row2Angle'].forEach(k=>{if(layer[k]===undefined)layer[k]=0});if(layer.checkerToneMode===undefined)layer.checkerToneMode=false;if(!layer.checkerToneBase)layer.checkerToneBase=(layer.colors&&layer.colors[1])||'#AFC3FF';if(!['auto','pattern-auto','individual'].includes(layer.colorMode))layer.colorMode='individual';if(!layer.masterColor)layer.masterColor=(layer.colors&&layer.colors[1])||'#F59BBC';if(!Array.isArray(layer.anchorToneProfile)||layer.anchorToneProfile.length<5)layer.anchorToneProfile=defaultAnchorProfileForPreset(layer.presetId);if(isPastelGridPresetId(layer.presetId)){let d=PE.defaults['grid']||{};if(layer.gridX===undefined)layer.gridX=d.gridX??96;if(layer.gridY===undefined)layer.gridY=d.gridY??96}if(isMiniDotPresetId(layer.presetId)){let d=PE.defaults['tiny-dot']||{};if(layer.tinyDotGapX===undefined)layer.tinyDotGapX=d.tinyDotGapX??0;if(layer.tinyDotGapY===undefined)layer.tinyDotGapY=d.tinyDotGapY??0}if(isSimpleDiamondPresetId(layer.presetId)){let d=PE.defaults['simple-diamond']||{};if(layer.simpleDiamondX===undefined)layer.simpleDiamondX=d.simpleDiamondX??78;if(layer.simpleDiamondY===undefined)layer.simpleDiamondY=d.simpleDiamondY??132}if(isPastelArgylePresetId(layer.presetId)){let d=PE.defaults[layer.presetId]||{};['argyleX','argyleY','argyleLineOpacity','argyleLineWidth','argyleDashLength','argyleDashGap','argyleMotifSize','argyleMotifEvery'].forEach(k=>{if(layer[k]===undefined)layer[k]=d[k]});}if(isSoftSunburstPresetId(layer.presetId)){let d=PE.defaults[layer.presetId]||{};['softSunRayCount','softSunRayOpacity','softSunSoftness','softSunCenterX','softSunCenterY'].forEach(k=>{if(layer[k]===undefined)layer[k]=d[k]});if(layer.softSunThicknessMode!=='equal-bands-v2'){let old=Math.max(1,Number(layer.softSunRayThickness)||8);layer.softSunRayThickness=Math.max(25,Math.min(400,Math.round(old/8*100)));layer.softSunThicknessMode='equal-bands-v2'}if(layer.softSunRayThickness===undefined)layer.softSunRayThickness=d.softSunRayThickness??100;}if(isSoftWindowCheckPresetId(layer.presetId)){let d=PE.defaults['soft-window-check']||{};if(layer.windowCheckX===undefined)layer.windowCheckX=d.windowCheckX??118;if(layer.windowCheckY===undefined)layer.windowCheckY=d.windowCheckY??96;if(layer.windowCheckLineWidth===undefined)layer.windowCheckLineWidth=d.windowCheckLineWidth??2;if(layer.windowCheckSecondaryOpacity===undefined)layer.windowCheckSecondaryOpacity=d.windowCheckSecondaryOpacity??28}if(isMilkyMiniCheckWindowPresetId(layer.presetId)){let d=PE.defaults['milky-mini-check-window']||{};let legacyDefault=layer.milkyCheckX===122&&layer.milkyCheckY===104&&layer.milkyBandWidth===34&&layer.milkyCheckOpacity===38&&layer.milkyOverlapOpacity===18&&layer.milkyMiniSize===28&&layer.milkyMiniEvery===3&&layer.milkyMiniGap===3;if(layer.milkyReferenceMode!=='reference-v2'&&legacyDefault){layer.milkyCheckX=d.milkyCheckX??60;layer.milkyCheckY=d.milkyCheckY??56;layer.milkyBandWidth=d.milkyBandWidth??14;layer.milkyBaseWashOpacity=d.milkyBaseWashOpacity??10;layer.milkyCheckOpacity=d.milkyCheckOpacity??20;layer.milkyOverlapOpacity=d.milkyOverlapOpacity??7;layer.milkyFineGridOpacity=d.milkyFineGridOpacity??8;layer.milkyMiniSize=d.milkyMiniSize??16;layer.milkyMiniEvery=d.milkyMiniEvery??2;layer.milkyMiniGap=d.milkyMiniGap??2;if(!layer.milkyMiniColor||layer.milkyMiniColor==='#FFF9EF')layer.milkyMiniColor=d.milkyMiniColor||'#FFF9F1'}['milkyCheckX','milkyCheckY','milkyBandWidth','milkyBaseWashOpacity','milkyCheckOpacity','milkyOverlapOpacity','milkyFineGridOpacity','milkyMiniSize','milkyMiniEvery','milkyMiniGap'].forEach(k=>{if(layer[k]===undefined)layer[k]=d[k]});if(!layer.milkyMiniColor)layer.milkyMiniColor=d.milkyMiniColor||'#FFF9F1';layer.milkyReferenceMode='reference-v3'}if(isPastelDiamondGridPresetId(layer.presetId)){let d=PE.defaults['grid-diamond']||{};if(layer.gridX===undefined)layer.gridX=d.gridX??96;if(layer.gridY===undefined)layer.gridY=d.gridY??96;if(!layer.diamondColor)layer.diamondColor=d.diamondColor||'#BFD7FF';if(layer.diamondSize===undefined)layer.diamondSize=d.diamondSize??10}if(isDashedGridPresetId(layer.presetId)){let d=PE.defaults[layer.presetId]||PE.defaults['dashed-grid']||{};['dashedLineColor','dashedLineOpacity','dashedLineWidth','dashLength','dashGap','gridX','gridY'].forEach(k=>{if(layer[k]===undefined)layer[k]=d[k]});if(isHeartDashedGridPresetId(layer.presetId)){['dashedHeartColor','dashedHeartOpacity','dashedHeartSize','dashedHeartEvery'].forEach(k=>{if(layer[k]===undefined)layer[k]=d[k]})}}if(isTriHatchPresetId(layer.presetId)){let d=PE.defaults[layer.presetId]||PE.defaults['no-gap-tri-check']||{};if(layer.triHatch===undefined)layer.triHatch=d.triHatch!==false;if(layer.triHatchStrength===undefined)layer.triHatchStrength=d.triHatchStrength??40;if(layer.triHatchAlternate===undefined)layer.triHatchAlternate=d.triHatchAlternate!==false}if(isAiryMixPresetId(layer.presetId)){let d=PE.defaults[layer.presetId]||{};if(!layer.airyStripeColor)layer.airyStripeColor=d.airyStripeColor||'#FFFFFF';if(layer.airyPointCount===undefined)layer.airyPointCount=d.airyPointCount??24;if(!layer.airyPointColor)layer.airyPointColor=d.airyPointColor||'#FFFFFF';if(layer.airyPointGrid===undefined)layer.airyPointGrid=d.airyPointGrid??4;if(!['all','every2','every3','checker','vertical','horizontal'].includes(layer.airyPointPattern))layer.airyPointPattern=d.airyPointPattern||'every3'}if(isGraphicCompositionPresetId(layer.presetId)){let d=PE.defaults[layer.presetId]||{};if(layer.graphicSafeArea===undefined)layer.graphicSafeArea=d.graphicSafeArea??60;if(layer.graphicBarScale===undefined)layer.graphicBarScale=d.graphicBarScale??100;if(layer.graphicCircleScale===undefined)layer.graphicCircleScale=d.graphicCircleScale??100;if(layer.graphicSmallScale===undefined)layer.graphicSmallScale=d.graphicSmallScale??100;if(layer.graphicLargeScale===undefined)layer.graphicLargeScale=d.graphicLargeScale??110;if(layer.graphicBalance===undefined)layer.graphicBalance=d.graphicBalance??90;if(!layer.graphicMotifMode)layer.graphicMotifMode=d.graphicMotifMode||'mixed'}layer.colors=normalizeColors(layer.colors)});return merged}
function persistAll(){localStorage.setItem(STORAGE.favorites,JSON.stringify([...favorites]));localStorage.setItem(STORAGE.deletedPatterns,JSON.stringify([...deletedPatterns]));localStorage.removeItem(STORAGE.hiddenPatterns);localStorage.setItem(STORAGE.presets,JSON.stringify(myPresets));localStorage.setItem(STORAGE.assets,JSON.stringify(stripAssetCache(userAssets)));localStorage.setItem(STORAGE.state,JSON.stringify(stripStateForSave(state)))}
function stripStateForSave(s){let copy=clone(s);return copy}
function stripAssetCache(arr){return arr.map(a=>{let c={...a};delete c._img;delete c._cacheKey;return c})}

function currentLayer(){return state.layers[activeLayerIndex]}
function layerSupportsScatterControls(layer=currentLayer()){if(layer.sourceType==='uploaded')return true;if(layer.sourceType!=='builtin')return false;let preset=getPreset(layer.presetId);return ['motif','dots','raindrops','doodles'].includes(preset.type)}
function layerTitle(layer,idx){if(layer.sourceType==='builtin'){let p=getPreset(layer.presetId);return `${layer.name} · ${p.name}`}let a=userAssets.find(v=>v.id===layer.assetId);return `${layer.name} · ${a?a.name:'업로드 에셋 없음'}`}
function addLayer(fromCurrent=true){if(state.layers.length>=MAX_LAYERS){toast(`레이어는 최대 ${MAX_LAYERS}개까지 추가할 수 있어.`);return}let i=state.layers.length;let base=fromCurrent?clone(currentLayer()):defaultLayer(i,'tiny-dot',true);base.name=`추가 레이어 ${i}`;base.enabled=true;base.seed=Math.floor(Math.random()*1e9);state.layers.push(base);activeLayerIndex=state.layers.length-1;persistAll();syncAll();toast(`${base.name}를 추가했어.`)}
function removeActiveLayer(){if(activeLayerIndex===0){toast('기본 레이어는 삭제할 수 없어.');return}let removed=state.layers.splice(activeLayerIndex,1)[0];state.layers.forEach((layer,i)=>{layer.name=i===0?'기본 레이어':`추가 레이어 ${i}`});activeLayerIndex=Math.max(0,activeLayerIndex-1);persistAll();syncAll();toast(`${removed.name}를 삭제했어.`)}
function moveActiveLayer(dir){let i=activeLayerIndex,target=i+dir;if(i<=0||target<=0||target>=state.layers.length)return;let tmp=state.layers[i];state.layers[i]=state.layers[target];state.layers[target]=tmp;state.layers.forEach((layer,idx)=>{layer.name=idx===0?'기본 레이어':`추가 레이어 ${idx}`});activeLayerIndex=target;persistAll();syncAll();toast('레이어 순서를 변경했어.')}

function drawBackground(target,w,h){
  if(state.bg.transparent){target.clearRect(0,0,w,h);return}
  target.clearRect(0,0,w,h);
  if(state.bg.mode==='linear'){
    let a=(state.bg.gradientAngle||135)*Math.PI/180,cx=w/2,cy=h/2,L=Math.abs(w*Math.cos(a))+Math.abs(h*Math.sin(a)),dx=Math.cos(a)*L/2,dy=Math.sin(a)*L/2;
    let g=target.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);let stops=normalizeGradientStops(state.bg.gradientStops,state.bg.colors);stops.forEach(stop=>g.addColorStop(clamp((stop.pos||0)/100,0,1),stop.color));target.fillStyle=g;target.fillRect(0,0,w,h);return
  }
  if(state.bg.mode==='watercolor'){
    drawWatercolorBackground(target,w,h);return
  }
  target.fillStyle=state.bg.colors[0];target.fillRect(0,0,w,h)
}
function drawWatercolorBackground(target,w,h){
  let stops=normalizeGradientStops(state.bg.gradientStops,state.bg.colors), colors=stops.map(x=>x.color).filter(Boolean);
  if(!colors.length)colors=[defaultBg[0],defaultBg[1]];
  while(colors.length<2)colors.push(colors[0]);
  let style=['mist','cloud','bloom','aqua','pearl','blotch','wash','corner','aquaMilk','aquaSparkle','aquaFrost','wateryCloud'].includes(state.bg.watercolorStyle)?state.bg.watercolorStyle:'mist';
  let rng=mulberry32(state.bg.watercolorSeed||47291);
  let spread=(state.bg.watercolorSpread??62)/100, scale=(state.bg.watercolorScale??58)/100, irregular=(state.bg.watercolorIrregular??72)/100;
  let definition=(state.bg.watercolorDefinition??52)/100, sparkle=(state.bg.watercolorSparkle??28)/100;
  const cfg={
    mist:{count:18+Math.round(spread*10),r:.42+.28*scale,blur:.095-.025*definition,alpha:.095,white:.035,drift:.12+.15*irregular},
    cloud:{count:18+Math.round(spread*13),r:.30+.30*scale,blur:.060-.025*definition,alpha:.125,white:.018,drift:.18+.22*irregular},
    bloom:{count:26+Math.round(spread*18),r:.16+.22*scale,blur:.040-.018*definition,alpha:.135,white:.012,drift:.25+.28*irregular},
    aqua:{count:20+Math.round(spread*12),r:.25+.32*scale,blur:.055-.022*definition,alpha:.125,white:.085,drift:.16+.18*irregular},
    pearl:{count:16+Math.round(spread*10),r:.44+.30*scale,blur:.105-.025*definition,alpha:.080,white:.20,drift:.10+.12*irregular},
    blotch:{count:20+Math.round(spread*16),r:.20+.22*scale,blur:.045-.028*definition,alpha:.155,white:.00,drift:.20+.30*irregular},
    wash:{count:12+Math.round(spread*8),r:.34+.34*scale,blur:.070-.028*definition,alpha:.115,white:.025,drift:.08+.12*irregular},
    corner:{count:18+Math.round(spread*12),r:.30+.28*scale,blur:.060-.022*definition,alpha:.120,white:.055,drift:.12+.20*irregular},
    aquaMilk:{count:30+Math.round(spread*12),r:.18+.28*scale,blur:.050-.018*definition,alpha:.115,white:.16,drift:.16+.18*irregular},
    aquaSparkle:{count:28+Math.round(spread*14),r:.20+.27*scale,blur:.045-.018*definition,alpha:.145,white:.08,drift:.18+.22*irregular},
    aquaFrost:{count:24+Math.round(spread*12),r:.25+.30*scale,blur:.065-.022*definition,alpha:.11,white:.20,drift:.22+.22*irregular},
    wateryCloud:{count:34+Math.round(spread*16),r:.14+.22*scale,blur:.050-.016*definition,alpha:.105,white:.07,drift:.22+.28*irregular}
  }[style];

  target.clearRect(0,0,w,h);
  target.fillStyle=colors[0];target.fillRect(0,0,w,h);
  let wash=document.createElement('canvas');wash.width=w;wash.height=h;
  let wc=wash.getContext('2d');
  let baseR=Math.min(w,h)*cfg.r;
  let blurPx=Math.max(3,Math.min(w,h)*cfg.blur);

  // New aqua styles use intentional composition, not merely different blur amounts.
  const aquaPalette=colors.length>=3?colors:style==='aquaMilk'?['#BCECF2','#DFF8FA','#FFFFFF']:style==='aquaSparkle'?['#55D6E1','#A9EDF0','#F8FFFF']:style==='aquaFrost'?['#8EDBE8','#BFC9F5','#FFFFFF']:['#8EDFE8','#D8F4F6','#FFFFFF'];
  if(['aquaMilk','aquaSparkle','aquaFrost','wateryCloud'].includes(style)) colors=aquaPalette;

  for(let i=0;i<cfg.count;i++){
    let c=colors[i%colors.length], x,y;
    if(style==='aquaMilk'){
      // broad cyan wash entering from upper-left, with a milky white center/right.
      x=w*(-.05+rng()*1.02); y=h*(-.12+rng()*1.02);
      if(i%4===0){x=w*(.08+rng()*.36);y=h*(.02+rng()*.42)}
    }else if(style==='aquaSparkle'){
      x=w*(-.05+rng()*.90); y=h*(.08+rng()*.88);
      if(i%5===0){x=w*(.45+rng()*.50);y=h*(.05+rng()*.38)}
    }else if(style==='aquaFrost'){
      x=w*(.05+rng()*.92); y=h*(.02+rng()*.94);
    }else if(style==='wateryCloud'){
      x=w*(-.08+rng()*1.16); y=h*(-.05+rng()*1.10);
    }else if(style==='aqua'){
      x=w*(.02+rng()*.78); y=h*(.18+rng()*.80);
    }else if(style==='corner'){
      let corner=i%4;x=(corner===1||corner===3)?w*(.58+rng()*.48):w*(-.08+rng()*.50);y=(corner>=2)?h*(.58+rng()*.48):h*(-.08+rng()*.50);
    }else if(style==='wash'){
      x=w*(.04+rng()*.92); y=h*(.05+rng()*.90);
    }else if(style==='bloom'){
      x=w*(.18+rng()*.64); y=h*(.18+rng()*.64);
    }else{x=w*(.02+rng()*.96);y=h*(.02+rng()*.96)}
    x+=(rng()-.5)*w*cfg.drift; y+=(rng()-.5)*h*cfg.drift;
    let r=baseR*(.58+rng()*.88), sx=.62+rng()*(.48+irregular*.52), sy=.62+rng()*(.48+irregular*.52);
    if(style==='wateryCloud'){sx*=1.35;sy*=.82}
    let a=cfg.alpha*(.68+rng()*.62)*(0.72+spread*.40)*(0.65+definition*.55);
    let g=wc.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,hexToRgba(c,a));g.addColorStop(.18,hexToRgba(c,a*.92));g.addColorStop(.42,hexToRgba(c,a*.62));g.addColorStop(.68,hexToRgba(c,a*.26));g.addColorStop(1,'rgba(255,255,255,0)');
    wc.save();wc.translate(x,y);wc.rotate((rng()-.5)*Math.PI);wc.scale(sx,sy);wc.translate(-x,-y);wc.fillStyle=g;wc.fillRect(x-r*1.35,y-r*1.35,r*2.7,r*2.7);wc.restore();
    if(['blotch','bloom','wateryCloud'].includes(style)){
      let rr=r*(.62+rng()*.30), aa=a*(style==='blotch'?.34:style==='wateryCloud'?.24:.24);
      let edge=wc.createRadialGradient(x+rr*.08,y-rr*.04,rr*.10,x,y,rr);edge.addColorStop(0,'rgba(255,255,255,0)');edge.addColorStop(.68,hexToRgba(c,aa*.18));edge.addColorStop(.88,hexToRgba(c,aa));edge.addColorStop(1,'rgba(255,255,255,0)');
      wc.save();wc.translate(x,y);wc.rotate((rng()-.5)*1.8);wc.scale(.8+rng()*.5,.8+rng()*.5);wc.translate(-x,-y);wc.fillStyle=edge;wc.fillRect(x-rr*1.4,y-rr*1.4,rr*2.8,rr*2.8);wc.restore();
    }
  }

  if(style==='wash'){
    let strokes=7+Math.round(spread*5);for(let i=0;i<strokes;i++){let c=colors[(i+1)%colors.length],x=w*(-.15+rng()*1.2),y=h*(-.1+rng()*1.2),rw=Math.min(w,h)*(.42+rng()*.50),rh=Math.min(w,h)*(.10+rng()*.16);let g=wc.createRadialGradient(x,y,0,x,y,rw),a=.12*(.65+definition*.55);g.addColorStop(0,hexToRgba(c,a));g.addColorStop(.45,hexToRgba(c,a*.58));g.addColorStop(1,'rgba(255,255,255,0)');wc.save();wc.translate(x,y);wc.rotate(-.35+rng()*.7);wc.scale(1,.65+rng()*.7);wc.translate(-x,-y);wc.fillStyle=g;wc.fillRect(x-rw,y-rw*.45,rw*2,rw);wc.restore()}
  }

  let blurred=document.createElement('canvas');blurred.width=w;blurred.height=h;let bc=blurred.getContext('2d');bc.filter=`blur(${blurPx}px)`;bc.drawImage(wash,0,0);target.drawImage(blurred,0,0);

  if(cfg.white>0){let gx=style==='aqua'?.60:style==='aquaMilk'?.58:style==='aquaSparkle'?.56:style==='aquaFrost'?.52:style==='pearl'?.50:.50,gy=style==='aqua'?.42:style==='aquaMilk'?.48:style==='aquaSparkle'?.45:style==='aquaFrost'?.50:.50;let white=target.createRadialGradient(w*gx,h*gy,0,w*gx,h*gy,Math.max(w,h)*(.38+.24*scale));white.addColorStop(0,`rgba(255,255,255,${cfg.white})`);white.addColorStop(.55,`rgba(255,255,255,${cfg.white*.38})`);white.addColorStop(1,'rgba(255,255,255,0)');target.fillStyle=white;target.fillRect(0,0,w,h)}
  if(style==='bloom'){let bloom=target.createRadialGradient(w*.22,h*.78,0,w*.22,h*.78,Math.max(w,h)*.46);bloom.addColorStop(0,hexToRgba(colors[1]||colors[0],.10*(.7+definition*.5)));bloom.addColorStop(.55,hexToRgba(colors[2]||colors[0],.045));bloom.addColorStop(1,'rgba(255,255,255,0)');target.fillStyle=bloom;target.fillRect(0,0,w,h)}
  if(style==='aqua'){let edge=target.createLinearGradient(0,h,w*.90,h*.05);edge.addColorStop(0,hexToRgba(colors[0],.12));edge.addColorStop(.48,hexToRgba(colors[1]||colors[0],.05));edge.addColorStop(1,'rgba(255,255,255,0)');target.fillStyle=edge;target.fillRect(0,0,w,h)}
  if(style==='corner'){let edge=target.createRadialGradient(w*.08,h*.88,0,w*.08,h*.88,Math.max(w,h)*.65);edge.addColorStop(0,hexToRgba(colors[1]||colors[0],.13));edge.addColorStop(.5,hexToRgba(colors[0],.045));edge.addColorStop(1,'rgba(255,255,255,0)');target.fillStyle=edge;target.fillRect(0,0,w,h)}

  // Distinct compositions for the requested aqua/cloud references.
  if(style==='aquaMilk'){
    let white=target.createLinearGradient(0,0,w,h);white.addColorStop(0,'rgba(255,255,255,.03)');white.addColorStop(.52,'rgba(255,255,255,.22)');white.addColorStop(1,'rgba(255,255,255,.42)');target.fillStyle=white;target.fillRect(0,0,w,h);
  }
  if(style==='aquaFrost'){
    let lavender=target.createRadialGradient(w*.82,h*.12,0,w*.82,h*.12,Math.max(w,h)*.55);lavender.addColorStop(0,hexToRgba(colors[1],.18));lavender.addColorStop(.6,hexToRgba(colors[1],.06));lavender.addColorStop(1,'rgba(255,255,255,0)');target.fillStyle=lavender;target.fillRect(0,0,w,h);
    let clear=target.createRadialGradient(w*.48,h*.58,0,w*.48,h*.58,Math.max(w,h)*.46);clear.addColorStop(0,'rgba(255,255,255,.30)');clear.addColorStop(1,'rgba(255,255,255,0)');target.fillStyle=clear;target.fillRect(0,0,w,h);
  }
  if(style==='wateryCloud'){
    let soft=target.createRadialGradient(w*.50,h*.52,0,w*.50,h*.52,Math.max(w,h)*.60);soft.addColorStop(0,'rgba(255,255,255,.14)');soft.addColorStop(.55,'rgba(255,255,255,.03)');soft.addColorStop(1,'rgba(255,255,255,0)');target.fillStyle=soft;target.fillRect(0,0,w,h);
  }
  if(style==='aquaSparkle'){
    // Tiny soft sparkles like the reference; never a dense glitter pattern.
    let count=Math.round(5+sparkle*.14), layer=document.createElement('canvas');layer.width=w;layer.height=h;let lc=layer.getContext('2d');
    for(let i=0;i<count;i++){
      let x=w*(.03+rng()*.78),y=h*(.16+rng()*.78),r=Math.min(w,h)*(.0015+rng()*.0035)*(0.6+sparkle*.01),a=.25+.45*sparkle/100;
      let g=lc.createRadialGradient(x,y,0,x,y,r*5);g.addColorStop(0,`rgba(255,255,255,${a})`);g.addColorStop(.25,`rgba(255,255,255,${a*.45})`);g.addColorStop(1,'rgba(255,255,255,0)');lc.fillStyle=g;lc.fillRect(x-r*5,y-r*5,r*10,r*10);
      lc.strokeStyle=`rgba(255,255,255,${a*.55})`;lc.lineWidth=Math.max(1,r*.45);lc.beginPath();lc.moveTo(x-r*4,y);lc.lineTo(x+r*4,y);lc.moveTo(x,y-r*4);lc.lineTo(x,y+r*4);lc.stroke();
    }
    target.drawImage(layer,0,0);
  }
  if(state.bg.watercolorTexture){let dots=Math.round(w*h/90000),opacity=.004+.004*(1-irregular*.2);target.globalAlpha=opacity;for(let i=0;i<dots;i++){let x=rng()*w,y=rng()*h,r=.25+rng()*.8;target.fillStyle=i%2?'#FFFFFF':'#8D8496';target.beginPath();target.arc(x,y,r,0,Math.PI*2);target.fill()}target.globalAlpha=1}
}
function hexToRgba(hex,a){let v=(hex||'#000000').replace('#','').trim();if(v.length===3)v=v.split('').map(c=>c+c).join('');let n=parseInt(v,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${Math.max(0,Math.min(1,a))})`}

function applyVignette(target,w,h){let v=state.bg.vignette||{};if(!v.enabled||Number(v.strength)<=0)return;let cx=w/2,cy=h/2,maxR=Math.sqrt((w/2)*(w/2)+(h/2)*(h/2));let inner=clamp(Number(v.range)||0,0,100)/100,soft=clamp(Number(v.softness)||0,0,100)/100;let outer=Math.max(inner+0.001,Math.min(1,inner+soft));let g=target.createRadialGradient(cx,cy,maxR*inner,cx,cy,maxR);let alpha=clamp(Number(v.strength)||0,0,100)/100;let color=normalizeHexLike(v.color||'#6F55C9','#6F55C9').replace('#','');let rr=parseInt(color.slice(0,2),16),gg=parseInt(color.slice(2,4),16),bb=parseInt(color.slice(4,6),16),rgba=a=>`rgba(${rr},${gg},${bb},${a})`;g.addColorStop(Math.min(inner,outer),rgba(0));g.addColorStop(outer,rgba(alpha));g.addColorStop(1,rgba(alpha));target.save();target.fillStyle=g;target.fillRect(0,0,w,h);target.restore()}
function drawGradientOverlay(target,w,h,settings){
  let o=settings||{};if(!o.enabled)return;
  let start=clamp(Number(o.start)||0,0,99),end=clamp(Number(o.end)||100,1,100);if(start>=end)return;
  let y1=h*start/100,y2=h*end/100,alpha=clamp(Number(o.opacity)||0,0,100)/100;if(alpha<=0)return;
  let spread=clamp(Number(o.spread)||0,0,100)/100;
  let mid=.16+spread*.60,midAlpha=alpha*(.26+spread*.28),color=normalizeHexLike(o.color||'#8ED8FF','#8ED8FF');
  let g=target.createLinearGradient(0,y1,0,y2);
  if(o.direction==='bottom-to-top'){
    g.addColorStop(0,hexToRgba(color,0));
    g.addColorStop(Math.max(0,1-mid),hexToRgba(color,midAlpha));
    g.addColorStop(1,hexToRgba(color,alpha));
  }else{
    g.addColorStop(0,hexToRgba(color,alpha));
    g.addColorStop(Math.min(1,mid),hexToRgba(color,midAlpha));
    g.addColorStop(1,hexToRgba(color,0));
  }
  target.save();target.setTransform(1,0,0,1,0,0);target.globalCompositeOperation='source-over';target.globalAlpha=1;target.fillStyle=g;target.fillRect(0,y1,w,y2-y1);target.restore()
}
function applyGradientOverlays(target,w,h){
  let list=state.gradientOverlays||{};drawGradientOverlay(target,w,h,list.overlay1);drawGradientOverlay(target,w,h,list.overlay2)
}
function layerToPatternState(layer,seamless=false){let uniform=isUniformShapePresetId(layer.presetId);return {presetId:layer.presetId,colors:normalizeColors(layer.colors),anchorExact:layer.colorMode!=='individual'&&!isSoftAnchorPresetId(layer.presetId),anchorColor:layer.masterColor,size:layer.size,gap:layer.gap,jitter:seamless?0:layer.jitter,rotation:layer.rotation,stroke:layer.stroke,opacity:layer.opacity,detail:layer.detail,seed:layer.seed,bgMode:'solid',gradientAngle:0,transparentBg:!!state.bg.transparent,skipBackground:true,randomSize:uniform?false:layer.randomSize!==false,randomAngle:uniform?false:layer.randomAngle!==false,randomPosition:layer.randomPosition!==false,offsetX:layer.offsetX||0,offsetY:layer.offsetY||0,row1OffsetX:layer.row1OffsetX||0,row1OffsetY:layer.row1OffsetY||0,row1Angle:layer.row1Angle||0,row2OffsetX:layer.row2OffsetX||0,row2OffsetY:layer.row2OffsetY||0,row2Angle:layer.row2Angle||0,plaidBg2:layer.plaidBg2,plaidHatch:layer.plaidHatch,plaidHatchStrength:layer.plaidHatchStrength,triHatch:layer.triHatch,triHatchStrength:layer.triHatchStrength,triHatchAlternate:layer.triHatchAlternate,airyStripeColor:layer.airyStripeColor,airyPointCount:layer.airyPointCount,airyPointColor:layer.airyPointColor,airyPointGrid:layer.airyPointGrid,airyPointPattern:layer.airyPointPattern,dashedLineColor:layer.dashedLineColor,dashedLineOpacity:layer.dashedLineOpacity,dashedLineWidth:layer.dashedLineWidth,dashLength:layer.dashLength,dashGap:layer.dashGap,gridX:layer.gridX,gridY:layer.gridY,diamondColor:layer.diamondColor,diamondSize:layer.diamondSize,simpleDiamondColor:layer.simpleDiamondColor,simpleDiamondX:layer.simpleDiamondX,simpleDiamondY:layer.simpleDiamondY,argyleX:layer.argyleX,argyleY:layer.argyleY,argyleLineColor:layer.argyleLineColor,argyleLineOpacity:layer.argyleLineOpacity,argyleLineWidth:layer.argyleLineWidth,argyleDashLength:layer.argyleDashLength,argyleDashGap:layer.argyleDashGap,argyleMotifColor:layer.argyleMotifColor,argyleMotifSize:layer.argyleMotifSize,argyleMotifEvery:layer.argyleMotifEvery,softSunRayCount:layer.softSunRayCount,softSunRayThickness:layer.softSunRayThickness,softSunRayOpacity:layer.softSunRayOpacity,softSunSoftness:layer.softSunSoftness,softSunCenterX:layer.softSunCenterX,softSunCenterY:layer.softSunCenterY,tinyDotGapX:layer.tinyDotGapX,tinyDotGapY:layer.tinyDotGapY,windowCheckX:layer.windowCheckX,windowCheckY:layer.windowCheckY,windowCheckLineWidth:layer.windowCheckLineWidth,windowCheckSecondaryOpacity:layer.windowCheckSecondaryOpacity,milkyCheckColor:layer.milkyCheckColor,milkyCheckX:layer.milkyCheckX,milkyCheckY:layer.milkyCheckY,milkyBandWidth:layer.milkyBandWidth,milkyBaseWashOpacity:layer.milkyBaseWashOpacity,milkyCheckOpacity:layer.milkyCheckOpacity,milkyOverlapOpacity:layer.milkyOverlapOpacity,milkyFineGridOpacity:layer.milkyFineGridOpacity,milkyMiniColor:layer.milkyMiniColor,milkyMiniSize:layer.milkyMiniSize,milkyMiniEvery:layer.milkyMiniEvery,milkyMiniGap:layer.milkyMiniGap,dashedHeartColor:layer.dashedHeartColor,dashedHeartOpacity:layer.dashedHeartOpacity,dashedHeartSize:layer.dashedHeartSize,dashedHeartEvery:layer.dashedHeartEvery,graphicSafeArea:layer.graphicSafeArea,graphicBarScale:layer.graphicBarScale,graphicCircleScale:layer.graphicCircleScale,graphicSmallScale:layer.graphicSmallScale,graphicLargeScale:layer.graphicLargeScale,graphicBalance:layer.graphicBalance,graphicMotifMode:layer.graphicMotifMode}}
async function ensureAssetImage(asset,layer=null){if(!asset)return null;let key='';let src='';if(asset.kind==='svg'){let mode=layer?.svgColorMode||asset.svgColorMode||'original';let tint=(layer?.colors?.[1]||asset.tint||'#9B87F5').toUpperCase();key=`${mode}|${tint}`;src=mode==='single'?svgToDataUrl(recolorSvg(asset.svgText||'',tint)):asset.dataURL}else{key='original';src=asset.dataURL}if(asset._img&&asset._cacheKey===key)return asset._img;asset._cacheKey=key;asset._img=await loadImage(src);return asset._img}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src})}
function svgToDataUrl(svg){return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
function recolorSvg(text,color){try{let doc=new DOMParser().parseFromString(text,'image/svg+xml');doc.querySelectorAll('*').forEach(el=>{['fill','stroke'].forEach(attr=>{let v=el.getAttribute(attr);if(v&&v!=='none')el.setAttribute(attr,color)});let style=el.getAttribute('style');if(style){style=style.replace(/fill\s*:\s*([^;]+)/gi,`fill:${color}`).replace(/stroke\s*:\s*([^;]+)/gi,`stroke:${color}`);el.setAttribute('style',style)}});return new XMLSerializer().serializeToString(doc)}catch{return text}}
function fitSize(img,size,mode='motif'){let ratio=img.width&&img.height?img.width/img.height:1;if(mode==='tile'){if(ratio>=1)return [size,size/ratio];return [size*ratio,size]}if(ratio>=1)return [size,size/ratio];return [size*ratio,size]}
function renderUploadedLayer(target,w,h,layer,scale,seamless=false){let asset=userAssets.find(v=>v.id===layer.assetId);if(!asset||!asset._img)return;let img=asset._img;let rng=mulberry32(hashString(layer.seed+':upload'));let mode=layer.renderMode||'motif';let size=layer.size*scale, gap=layer.gap*scale, step=Math.max(8,size+gap), cleanAlign=(layer.randomPosition===false)||(layer.randomSize===false&&layer.randomAngle===false), jit=(seamless||cleanAlign?0:layer.jitter/100*size*.42), rot=(cleanAlign&&layer.rotation===0?0:layer.rotation)*Math.PI/180, op=layer.opacity/100, offX=(layer.offsetX||0)*scale, offY=(layer.offsetY||0)*scale;let [dw,dh]=fitSize(img,size,mode);target.save();target.globalAlpha=op;target.translate(w/2,h/2);target.rotate(rot);target.translate(-w/2,-h/2);let rowIndex=0;for(let y=-step;y<h+step;y+=step,rowIndex++){let colIndex=0;for(let x=-step;x<w+step;x+=step,colIndex++){let shiftX=0,shiftY=0;if(mode==='brick'&&rowIndex%2)shiftX=step/2;if(mode==='halfdrop'&&colIndex%2)shiftY=step/2;if(mode==='diagonal'){shiftX=(rowIndex%2)*step/2;shiftY=(colIndex%2)*step/2}let centered=(cleanAlign&&mode!=='tile');let baseX=(centered?x+step/2:x)+shiftX+offX;let baseY=(centered?y+step/2:y)+shiftY+offY;let xx=baseX+(seamless?0:jitterRand(rng,jit));let yy=baseY+(seamless?0:jitterRand(rng,jit));if(mode==='tile'){target.drawImage(img,xx,yy,dw,dh)}else{target.drawImage(img,xx-dw/2,yy-dh/2,dw,dh)}}}target.restore()}
function jitterRand(rng,a){return (rng()-.5)*2*a}
function hashString(str){let h=2166136261>>>0;str=String(str);for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
async function ensureVisibleAssets(){let needs=[];for(let layer of state.layers){if(layer.enabled&&layer.sourceType==='uploaded'&&layer.assetId){let asset=userAssets.find(v=>v.id===layer.assetId);if(asset)needs.push(ensureAssetImage(asset,layer).catch(()=>null))}}if(needs.length)await Promise.all(needs)}
let previewRenderToken=0;
function getCanvasTargetSize(){
  return {
    w:clampInt(state.exportW,16,8000,2000),
    h:clampInt(state.exportH,16,8000,2000)
  }
}
function resetCanvasRenderState(target){
  target.setTransform(1,0,0,1,0,0);
  target.globalAlpha=1;
  target.globalCompositeOperation='source-over';
  target.shadowColor='transparent';
  target.shadowBlur=0;
  target.shadowOffsetX=0;
  target.shadowOffsetY=0;
  if('filter' in target)target.filter='none'
}
function resizePreviewCanvasToOutput(){
  if(!canvas)return;
  let {w,h}=getCanvasTargetSize(),maxDim=1800,previewScale=Math.min(1,maxDim/Math.max(w,h)),
    pw=Math.max(1,Math.round(w*previewScale)),ph=Math.max(1,Math.round(h*previewScale));
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph}
  if($('#canvasSizeText'))$('#canvasSizeText').textContent=w+'×'+h+'px';
  canvas.classList.toggle('transparent-preview',!!state.bg.transparent);
  refreshPreviewZoom()
}
function composePreviewFrame(){
  let frame=document.createElement('canvas');frame.width=canvas.width;frame.height=canvas.height;
  let fctx=frame.getContext('2d'),target=getCanvasTargetSize(),
      renderScale=Math.min(frame.width/Math.max(1,target.w),frame.height/Math.max(1,target.h));
  resetCanvasRenderState(fctx);
  fctx.clearRect(0,0,frame.width,frame.height);
  drawBackground(fctx,frame.width,frame.height);
  if(!state.bg.backgroundOnly) for(let layer of state.layers){
    if(!layer.enabled)continue;
    try{
      resetCanvasRenderState(fctx);
      if(layer.sourceType==='builtin')PE.render(fctx,frame.width,frame.height,layerToPatternState(layer,false),getPreset(layer.presetId),renderScale);
      else renderUploadedLayer(fctx,frame.width,frame.height,layer,renderScale,false);
      resetCanvasRenderState(fctx);
    }catch(err){console.error('Layer render failed:',layer?.presetId||layer?.assetId,err)}
  }
  // Transparent mode means pattern pixels only: no vignette / gradient haze on alpha.
  if(!state.bg.transparent){
    resetCanvasRenderState(fctx);
    applyGradientOverlays(fctx,frame.width,frame.height);
    applyVignette(fctx,frame.width,frame.height)
  }
  resetCanvasRenderState(fctx);
  return frame
}
function renderMainNow(){
  const frame=composePreviewFrame();
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='copy';ctx.drawImage(frame,0,0);ctx.globalCompositeOperation='source-over';
  updateSelected();renderCirclePreview();if(patternRestoreImage)drawPatternRestoreComparison()
}
function renderMain(){
  const token=++previewRenderToken;
  renderMainNow();
  const pending=state.layers.some(layer=>layer.enabled&&layer.sourceType==='uploaded'&&layer.assetId&&userAssets.some(asset=>asset.id===layer.assetId&&!asset._img));
  if(pending)ensureVisibleAssets().then(()=>{if(token===previewRenderToken)renderMainNow()}).catch(err=>console.error('Asset preload failed:',err))
}
function forcePreviewRefresh(){
  // First repaint in the current event, then again after DOM/control updates.
  renderMain();
  requestAnimationFrame(()=>{renderMain();setTimeout(()=>renderMain(),0)})
}
function updateSelected(){let layer=currentLayer();if(layer.sourceType==='builtin'){let p=getPreset(layer.presetId);$('#selectedCategory').textContent=p.category;$('#selectedName').textContent=p.name;$('#selectedDesc').textContent=`${layer.name} 편집 중 · ${p.desc}`}else{let asset=userAssets.find(v=>v.id===layer.assetId);$('#selectedCategory').textContent='업로드 에셋';$('#selectedName').textContent=asset?asset.name:'에셋 없음';let modeLabel={motif:'모티프 반복',tile:'반복 타일',brick:'브릭 반복',halfdrop:'하프드롭 반복',diagonal:'대각 반복'}[layer.renderMode]||'모티프 반복';$('#selectedDesc').textContent=`${layer.name} 편집 중 · ${modeLabel}`}}
function setupCategories(){let wrap=$('#categoryTabs');wrap.innerHTML='';categories().forEach(c=>{let b=document.createElement('button');b.className='tab'+(c===activeCategory?' active':'');b.textContent=c;b.onclick=()=>{activeCategory=c;setupCategories();renderPatternList()};wrap.appendChild(b)})}
function filteredPresets(){let q=$('#searchInput').value.trim().toLowerCase(),checksOnly=$('#checkOnly')?.checked;return PE.presets.filter(p=>(activeCategory==='전체'||p.category===activeCategory)&&(!$('#favoriteOnly').checked||favorites.has(p.id))&&(!checksOnly||checkPresetOnly(p))&&(!q||`${p.name} ${p.category} ${p.desc} ${p.id}`.toLowerCase().includes(q)))}
function thumbnailLayerForPreset(p){
  let layer={...currentLayer(),presetId:p.id,sourceType:'builtin'},d=PE.defaults[p.id]||{};
  Object.assign(layer,d);
  if(layer.colorMode==='auto'||layer.colorMode==='pattern-auto'){
    layer.anchorToneProfile=defaultAnchorProfileForPreset(p.id);
    if(isLayeredFabricPlaidPresetId(p.id)){applyLayeredPlaidMaster(layer,layer.masterColor||layer.colors?.[1]||'#F59BBC',isSoftAnchorPresetId(p.id))}
    else layer.colors=buildThemeTonePalette(layer.masterColor||layer.colors?.[1]||'#F59BBC',p.id,layer.anchorToneProfile);
  }else{
    layer.colors=normalizeColors(layer.colors)
  }
  return layer
}
function renderPatternList(){
  let list=$('#patternList'),items=filteredPresets();
  if($('#patternCount'))$('#patternCount').textContent=`${PE.presets.length}개 패턴 · 현재 ${items.length}개`;
  list.innerHTML='';
  items.forEach(p=>{
    let b=document.createElement('div');b.className='pattern-card'+(currentLayer().sourceType==='builtin'&&p.id===currentLayer().presetId?' active':'');b.dataset.presetId=p.id;b.setAttribute('role','button');b.tabIndex=0;
    let fav=document.createElement('button');fav.type='button';fav.className='pattern-fav'+(favorites.has(p.id)?' on':'');fav.textContent=favorites.has(p.id)?'★':'☆';fav.title='즐겨찾기';fav.onclick=e=>{e.stopPropagation();toggleFavorite(p.id)};
    let c=document.createElement('canvas');c.width=c.height=180;
    try{let thumbLayer=thumbnailLayerForPreset(p);PE.render(c.getContext('2d'),180,180,layerToPatternState(thumbLayer,false),p,180/720)}catch(err){console.error('Pattern thumbnail failed:',p.id,err);let x=c.getContext('2d');x.clearRect(0,0,180,180);x.fillStyle='#FAF8FF';x.fillRect(0,0,180,180);x.fillStyle='#8E83A4';x.font='12px sans-serif';x.textAlign='center';x.fillText('미리보기 오류',90,92)}
    let st=document.createElement('strong');st.textContent=p.name;let sm=document.createElement('small');sm.textContent=p.desc;
    b.append(fav,c,st,sm);const choose=()=>selectPatternForActiveLayer(p.id);b.onclick=choose;b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}};list.appendChild(b)
  })
}
function updatePatternSelectionUI(id){document.querySelectorAll('#patternList .pattern-card').forEach(card=>card.classList.toggle('active',card.dataset.presetId===id))}
function toggleFavorite(id){favorites.has(id)?favorites.delete(id):favorites.add(id);persistAll();renderPatternList();renderFavoritePreview()}
function selectPatternForActiveLayer(id){
  let layer=currentLayer(),preset=PE.presets.find(p=>p.id===id);if(!preset)return;
  let keepColorMode=layer.colorMode||'individual',keepMaster=layer.masterColor||layer.colors?.[1]||'#F59BBC',keepColors=normalizeColors(layer.colors),keepRows={row1OffsetX:layer.row1OffsetX||0,row1OffsetY:layer.row1OffsetY||0,row1Angle:layer.row1Angle||0,row2OffsetX:layer.row2OffsetX||0,row2OffsetY:layer.row2OffsetY||0,row2Angle:layer.row2Angle||0};
  let base={size:72,gap:24,jitter:0,rotation:0,stroke:4,opacity:100,detail:45,randomSize:true,randomAngle:true,randomPosition:true,offsetX:0,offsetY:0};
  Object.assign(layer,base,PE.defaults[id]||{});
  layer.enabled=true;layer.sourceType='builtin';layer.presetId=id;layer.colorMode=keepColorMode;layer.masterColor=keepMaster;layer.colors=keepColors;layer.anchorToneProfile=defaultAnchorProfileForPreset(id);if(isUniformShapePresetId(id)){layer.randomSize=false;layer.randomAngle=false;layer.randomPosition=false;Object.assign(layer,keepRows);}
  state.bg.backgroundOnly=false;

  // Commit the actual selection first. A color helper must never be able to cancel a click.
  updatePatternSelectionUI(id);
  try{
    if(layer.colorMode==='auto'||layer.colorMode==='pattern-auto')applyMasterTone(layer,layer.masterColor,layer.colorMode==='auto'&&!isDashedGridPresetId(id),layer.colorMode);
    else if(layer.checkerToneMode&&isCheckLikePresetId(id))applyCheckerTonePalette(layer,false);
  }catch(err){
    console.error('Pattern color setup failed, continuing with selection:',err);
    layer.colors=normalizeColors(layer.colors);
  }

  layer.seed=Math.floor(Math.random()*1e9);
  persistAll();

  // Render before rebuilding controls, then refresh controls and render once more.
  renderMain();
  syncGlobalControls();
  try{syncLayerUI()}catch(err){console.error('Layer editor refresh failed after pattern selection:',err);updateSelected()}
  renderMain();
  requestAnimationFrame(()=>renderMain());
  toast(`${preset.name} 패턴을 적용했어.`)
}
function setupLayerTabs(){let wrap=$('#layerTabs');wrap.innerHTML='';state.layers.forEach((layer,i)=>{let b=document.createElement('button');b.className='layer-tab'+(i===activeLayerIndex?' active':'');b.textContent=`${layer.name}`;b.onclick=()=>{activeLayerIndex=i;setupLayerTabs();syncLayerUI();renderPatternList();renderAssetList();renderMain()};wrap.appendChild(b)});let add=document.createElement('button');add.className='layer-tab';add.textContent='＋ 레이어 추가';add.onclick=()=>addLayer(true);wrap.appendChild(add);$('#activeLayerLabel').textContent=`현재 편집: ${state.layers[activeLayerIndex].name} · 총 ${state.layers.length}개`}
function renderLayerSummary(){let wrap=$('#layerSummary');wrap.innerHTML='';state.layers.forEach((layer,i)=>{let row=document.createElement('button');row.className='layer-chip'+(i===activeLayerIndex?' active':'');let name=document.createElement('div');let sourceName=layer.sourceType==='builtin'?(getPreset(layer.presetId).name):(userAssets.find(v=>v.id===layer.assetId)?.name||'업로드 에셋');name.innerHTML=`<strong>${layer.name}</strong><small>${i===0?'상시 활성':(layer.enabled?'활성':'비활성')} · ${sourceName}</small>`;let bullet=document.createElement('span');bullet.className='bullet';bullet.style.opacity=layer.enabled?1:.35;let actions=document.createElement('div');actions.className='preset-actions';let eye=document.createElement('button');eye.type='button';eye.className='mini-btn';eye.textContent=i===0?'기본':(layer.enabled?'끄기':'켜기');eye.disabled=i===0;eye.onclick=e=>{e.stopPropagation();layer.enabled=!layer.enabled;persistAll();syncLayerUI();renderMain()};actions.appendChild(eye);if(i>0){let del=document.createElement('button');del.type='button';del.className='mini-btn';del.textContent='삭제';del.onclick=e=>{e.stopPropagation();activeLayerIndex=i;removeActiveLayer()};actions.appendChild(del)}row.append(bullet,name,actions);row.onclick=()=>{activeLayerIndex=i;setupLayerTabs();syncLayerUI();renderPatternList();renderAssetList();renderMain()};wrap.appendChild(row)})}
function renderColorInputs(colors,onChange,prefix='c'){let wrap=document.createElement('div');wrap.className='color-grid';colorMeta.forEach((meta,i)=>{let row=document.createElement('div');row.className='color-row';let label=document.createElement('div');label.className='color-label';label.textContent=`${meta[0]} · ${meta[1]}`;let picker=document.createElement('input');picker.type='color';picker.value=colors[i]||'#FFFFFF';picker.dataset.i=i;let text=document.createElement('input');text.type='text';text.value=(colors[i]||'#FFFFFF').toUpperCase();text.maxLength=7;let drop=document.createElement('button');drop.type='button';drop.className='dropper';drop.textContent='💧';drop.title='화면에서 색상 추출';row.append(label,picker,text,drop);picker.oninput=()=>{colors[i]=picker.value.toUpperCase();text.value=colors[i];onChange()};text.oninput=()=>{if(/^#[0-9a-fA-F]{6}$/.test(text.value)){colors[i]=text.value.toUpperCase();picker.value=colors[i];onChange()}};drop.onclick=async()=>{if(!window.EyeDropper){toast('이 브라우저는 화면 스포이드를 지원하지 않아.');return}try{let res=await new EyeDropper().open();colors[i]=res.sRGBHex.toUpperCase();picker.value=colors[i];text.value=colors[i];onChange()}catch{}};wrap.appendChild(row)});return wrap}
function renderBgColorInputs(){let root=$('#bgColorGrid');root.innerHTML='';root.classList.toggle('gradient-grid',state.bg.mode==='linear');
  const persistBg=()=>{syncBgGradientState(state.bg);persistAll();syncGlobalControls();renderMain()};
  const makeDropper=onPick=>{let btn=document.createElement('button');btn.type='button';btn.className='dropper';btn.textContent='💧';btn.onclick=async()=>{if(!window.EyeDropper){toast('이 브라우저는 화면 스포이드를 지원하지 않아.');return}try{let res=await new EyeDropper().open();onPick(res.sRGBHex.toUpperCase())}catch{}};return btn};
  if(state.bg.mode==='solid'){
    let row=document.createElement('div');row.className='color-row';
    let label=document.createElement('div');label.className='color-label';label.textContent='배경색';
    let picker=document.createElement('input');picker.type='color';picker.value=state.bg.colors[0];
    let text=document.createElement('input');text.type='text';text.value=state.bg.colors[0];text.maxLength=7;
    let apply=color=>{state.bg.colors[0]=normalizeHexLike(color,state.bg.colors[0]);state.bg.gradientStops[0].color=state.bg.colors[0];text.value=state.bg.colors[0];picker.value=state.bg.colors[0];persistBg()};
    picker.oninput=()=>apply(picker.value);text.oninput=()=>{if(/^#[0-9a-fA-F]{6}$/.test(text.value))apply(text.value)};
    row.append(label,picker,text,makeDropper(apply));root.appendChild(row);
    return;
  }
  let stops=normalizeGradientStops(state.bg.gradientStops,state.bg.colors);state.bg.gradientStops=stops;state.bg.colors=bgStopsToLegacyColors(stops);
  stops.forEach((stop,i)=>{
    let card=document.createElement('div');card.className='gradient-stop-card';
    let top=document.createElement('div');top.className='gradient-stop-top';
    let title=document.createElement('div');title.className='gradient-stop-title';title.textContent=`색상 ${i+1}`;
    let remove=document.createElement('button');remove.type='button';remove.className='mini-btn';remove.textContent='삭제';remove.disabled=stops.length<=2;remove.onclick=()=>{if(state.bg.gradientStops.length<=2)return;state.bg.gradientStops.splice(i,1);persistBg()};
    top.append(title,remove);
    let colorRow=document.createElement('div');colorRow.className='color-row';
    let picker=document.createElement('input');picker.type='color';picker.value=stop.color;
    let text=document.createElement('input');text.type='text';text.value=stop.color;text.maxLength=7;
    let apply=color=>{state.bg.gradientStops[i].color=normalizeHexLike(color,stop.color);picker.value=state.bg.gradientStops[i].color;text.value=state.bg.gradientStops[i].color;persistBg()};
    picker.oninput=()=>apply(picker.value);text.oninput=()=>{if(/^#[0-9a-fA-F]{6}$/.test(text.value))apply(text.value)};
    colorRow.append(picker,text,makeDropper(apply));
    let posWrap=document.createElement('div');posWrap.className='gradient-stop-pos';
    let posLabel=document.createElement('div');posLabel.className='color-label';posLabel.textContent='범위 / 위치';
    let range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.value=stop.pos;
    let num=document.createElement('input');num.type='number';num.min='0';num.max='100';num.value=stop.pos;
    let setPos=v=>{state.bg.gradientStops[i].pos=clampInt(v,0,100,stop.pos);num.value=state.bg.gradientStops[i].pos;range.value=state.bg.gradientStops[i].pos;persistBg()};
    range.oninput=()=>setPos(range.value);num.oninput=()=>setPos(num.value);
    posWrap.append(posLabel,range,num);
    card.append(top,colorRow,posWrap);root.appendChild(card)
  });
  let actions=document.createElement('div');actions.className='gradient-stop-actions';
  let add=document.createElement('button');add.type='button';add.className='mini-btn';add.textContent='그라데이션 색상 추가';add.onclick=()=>{let current=normalizeGradientStops(state.bg.gradientStops,state.bg.colors);if(current.length>=MAX_BG_STOPS){toast(`그라데이션 색상은 최대 ${MAX_BG_STOPS}개까지 가능해.`);return}let prev=current[current.length-2]||current[0],last=current[current.length-1]||prev;let pos=Math.round((prev.pos+last.pos)/2);current.splice(current.length-1,0,{color:last.color,pos});state.bg.gradientStops=current;persistBg()};
  let even=document.createElement('button');even.type='button';even.className='mini-btn';even.textContent='범위 균등 정렬';even.onclick=()=>{let current=normalizeGradientStops(state.bg.gradientStops,state.bg.colors);let step=current.length>1?100/(current.length-1):100;state.bg.gradientStops=current.map((s,idx)=>({...s,pos:Math.round(step*idx)}));persistBg()};
  let note=document.createElement('div');note.className='micro-copy';note.textContent='각 색상의 범위는 0~100 위치로 조절돼. 값이 가까우면 색이 빠르게 바뀌고, 넓게 벌리면 더 부드럽게 이어져.';
  actions.append(add,even);root.append(actions,note)
}
function renderLayerEditor(){let layer=currentLayer();let root=$('#layerEditor');root.innerHTML='';let card=document.createElement('div');card.className='layer-editor-card';let top=document.createElement('div');top.className='layer-editor-grid';let canToggle=activeLayerIndex>0;let canDelete=activeLayerIndex>0;top.innerHTML=`<div class="inline-row"><strong>${layer.name}</strong><label class="switch-row compact"><input id="layerEnabledToggle" type="checkbox" ${layer.enabled?'checked':''} ${canToggle?'':'disabled'}/> ${canToggle?'사용':'기본 레이어는 항상 켜짐'}</label></div><div class="control-subtitle">패턴 카드 선택은 현재 활성 레이어에 바로 적용돼. 필요하면 레이어를 추가해서 패턴을 겹칠 수 있어.</div>`;
  let topActions=document.createElement('div');topActions.className='section-title-row';topActions.innerHTML='<h3>레이어 작업</h3>';
  let actionWrap=document.createElement('div');actionWrap.className='preset-actions';
  let addBtn=document.createElement('button');addBtn.className='mini-btn';addBtn.type='button';addBtn.textContent='현재 레이어 복제 추가';addBtn.onclick=()=>addLayer(true);
  actionWrap.appendChild(addBtn);
  if(activeLayerIndex>1){let upBtn=document.createElement('button');upBtn.className='mini-btn';upBtn.type='button';upBtn.textContent='위로';upBtn.onclick=()=>moveActiveLayer(-1);actionWrap.appendChild(upBtn)}
  if(activeLayerIndex>0&&activeLayerIndex<state.layers.length-1){let downBtn=document.createElement('button');downBtn.className='mini-btn';downBtn.type='button';downBtn.textContent='아래로';downBtn.onclick=()=>moveActiveLayer(1);actionWrap.appendChild(downBtn)}
  if(canDelete){let delBtn=document.createElement('button');delBtn.className='mini-btn';delBtn.type='button';delBtn.textContent='현재 레이어 삭제';delBtn.onclick=removeActiveLayer;actionWrap.appendChild(delBtn)}
  topActions.appendChild(actionWrap);top.appendChild(topActions);
  let sourceRow=document.createElement('div');sourceRow.className='source-type-row';let builtinBtn=document.createElement('button');builtinBtn.className='ghost'+(layer.sourceType==='builtin'?' active':'');builtinBtn.textContent='내장 패턴';let uploadBtn=document.createElement('button');uploadBtn.className='ghost'+(layer.sourceType==='uploaded'?' active':'');uploadBtn.textContent='업로드 에셋';builtinBtn.onclick=()=>{layer.sourceType='builtin';persistAll();syncLayerUI();renderPatternList();renderMain()};uploadBtn.onclick=()=>{layer.sourceType='uploaded';persistAll();syncLayerUI();renderAssetList();renderMain()};sourceRow.append(builtinBtn,uploadBtn);top.appendChild(sourceRow);
  if(layer.sourceType==='builtin'){
    let sel=document.createElement('div');sel.className='selectish';let p=getPreset(layer.presetId);sel.textContent=`현재 선택: ${p.name} · ${p.category}`;top.appendChild(sel)
  }else{
    let box=document.createElement('div');box.className='layer-editor-grid';let assetSel=document.createElement('select');let placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='업로드 에셋 선택';assetSel.appendChild(placeholder);userAssets.forEach(a=>{let op=document.createElement('option');op.value=a.id;op.textContent=`${a.name} (${a.kind==='svg'?'SVG':'PNG/JPG'})`;if(a.id===layer.assetId)op.selected=true;assetSel.appendChild(op)});assetSel.onchange=()=>{layer.assetId=assetSel.value;persistAll();renderAssetList();renderMain()};let renderMode=document.createElement('select');[['motif','모티프 반복'],['tile','반복 타일'],['brick','브릭 반복'],['halfdrop','하프드롭 반복'],['diagonal','대각 반복']].forEach(([v,t])=>{let op=document.createElement('option');op.value=v;op.textContent=t;if(layer.renderMode===v)op.selected=true;renderMode.appendChild(op)});renderMode.onchange=()=>{layer.renderMode=renderMode.value;persistAll();renderMain()};box.appendChild(labeled('업로드 에셋',assetSel));box.appendChild(labeled('배치 방식',renderMode));let selectedAsset=userAssets.find(v=>v.id===layer.assetId);if(!selectedAsset){let help=document.createElement('div');help.className='control-subtitle';help.textContent='왼쪽 업로드 박스에 투명 PNG/SVG를 올리면 현재 레이어에 바로 연결돼. 원하는 크기와 간격으로 반복 패턴을 만들 수 있어.';box.appendChild(help)}if(selectedAsset?.kind==='svg'){let svgMode=document.createElement('select');[['original','원본 색상 유지'],['single','레이어 패턴 A 색으로 단색 변환']].forEach(([v,t])=>{let op=document.createElement('option');op.value=v;op.textContent=t;if((layer.svgColorMode||'original')===v)op.selected=true;svgMode.appendChild(op)});svgMode.onchange=async()=>{layer.svgColorMode=svgMode.value;selectedAsset._img=null;persistAll();await ensureAssetImage(selectedAsset,layer).catch(()=>null);renderAssetList();renderMain()};box.appendChild(labeled('SVG 색상 모드',svgMode))}
    top.appendChild(box)
  }
  let colorBox=document.createElement('div');colorBox.className='theme-color-box';
  let colorHead=document.createElement('div');colorHead.className='section-title-row';colorHead.innerHTML='<div><h3>색상 설정</h3><div class="control-subtitle">배경 연동 여부와 패턴 색상 지정 방식을 작업 흐름에 맞게 선택해.</div></div>';colorBox.appendChild(colorHead);
  let mode=document.createElement('div');mode.className='color-mode-tabs';
  let autoBtn=document.createElement('button'),patternAutoBtn=document.createElement('button'),manualBtn=document.createElement('button');
  autoBtn.type=patternAutoBtn.type=manualBtn.type='button';
  autoBtn.textContent='전체 자동 연동';
  patternAutoBtn.textContent='배경 고정 · 패턴 자동';
  manualBtn.textContent='모든 색 개별 설정';
  autoBtn.className=layer.colorMode==='auto'?'active':'';
  patternAutoBtn.className=layer.colorMode==='pattern-auto'?'active':'';
  manualBtn.className=layer.colorMode==='individual'?'active':'';
  mode.append(autoBtn,patternAutoBtn,manualBtn);colorBox.appendChild(mode);

  const appendCanvasBackgroundControl=()=>{
    if(activeLayerIndex!==0)return;
    let bgRow=document.createElement('div');bgRow.className='color-row actual-bg-row';
    let bgLab=document.createElement('div');bgLab.className='color-label';bgLab.textContent=layer.colorMode==='pattern-auto'?'고정 배경색':'캔버스 배경';
    let bgPicker=document.createElement('input');bgPicker.type='color';bgPicker.value=normalizeHexLike(state.bg.colors?.[0]||'#FFFFFF','#FFFFFF');
    let bgText=document.createElement('input');bgText.type='text';bgText.maxLength=7;bgText.value=bgPicker.value.toUpperCase();
    let setBg=function(v){v=setCanvasBackgroundColor(v);bgPicker.value=v;bgText.value=v;persistAll();syncGlobalControls();renderMain()};
    bgPicker.oninput=function(){setBg(bgPicker.value)};
    bgText.onchange=function(){if(/^#[0-9a-fA-F]{6}$/.test(bgText.value))setBg(bgText.value)};
    bgRow.append(bgLab,bgPicker,bgText,makeEyeDropperButton(setBg));colorBox.appendChild(bgRow)
  };

  if(layer.colorMode!=='individual'){
    let master=document.createElement('div');master.className='master-color-panel';
    let lab=document.createElement('div');lab.className='master-label';
    let patternOnly=layer.colorMode==='pattern-auto';
    lab.innerHTML=patternOnly
      ?'<strong>패턴 대표 색상 · Anchor Color</strong><span>현재 캔버스 배경색은 그대로 고정하고, 패턴의 가장 진한 색을 기준으로 채도와 색감을 유지한 중간톤·연한톤만 자동으로 맞춰.</span>'
      :'<strong>대표 색상 · Anchor Color</strong><span>대표색을 가장 진한 기준색으로 사용하고, 지나치게 흰색으로 빠지지 않는 비슷한 색조의 중간톤·연한톤으로 자연스럽게 연결해.</span>';
    let row=document.createElement('div');row.className='master-color-row';
    let picker=document.createElement('input');picker.type='color';picker.value=normalizeHexLike(layer.masterColor||layer.colors[1]||'#F59BBC','#F59BBC');
    let txt=document.createElement('input');txt.type='text';txt.maxLength=7;txt.value=picker.value.toUpperCase();
    let apply=function(v){
      v=normalizeHexLike(v,picker.value);picker.value=v;txt.value=v;
      let syncBg=layer.colorMode==='auto'&&!isDashedGridPresetId(layer.presetId);
      applyMasterTone(layer,v,syncBg,layer.colorMode);
      persistAll();renderPatternListDebounced();syncGlobalControls();renderMain()
    };
    picker.oninput=function(){apply(picker.value)};
    txt.onchange=function(){if(/^#[0-9a-fA-F]{6}$/.test(txt.value))apply(txt.value)};
    row.append(picker,txt,makeEyeDropperButton(apply));
    let sw=document.createElement('div');sw.className='master-swatches';
    MASTER_COLOR_SWATCHES.forEach(function(c){let b=document.createElement('button');b.type='button';b.className='master-swatch';b.style.background=c;b.title=c;b.onclick=function(){apply(c)};sw.appendChild(b)});
    master.append(lab,row,sw);colorBox.appendChild(master);
    if(patternOnly)appendCanvasBackgroundControl()
  }else{
    let note=document.createElement('div');note.className='individual-note';note.textContent='캔버스 배경과 패턴에 포함되는 모든 색상을 각각 직접 지정해.';colorBox.appendChild(note);
    let uniformShape=layer.sourceType==='builtin'&&isUniformShapePresetId(layer.presetId);
    appendCanvasBackgroundControl();
    if(uniformShape){
      let row=document.createElement('div');row.className='color-row actual-bg-row';
      let lab=document.createElement('div');lab.className='color-label';lab.textContent='모양 색상';
      let picker=document.createElement('input');picker.type='color';picker.value=layer.colors[1]||'#F59BBC';
      let txt=document.createElement('input');txt.type='text';txt.maxLength=7;txt.value=picker.value.toUpperCase();
      let setShape=v=>{v=normalizeHexLike(v,layer.colors[1]||'#F59BBC');layer.colors[1]=v;picker.value=v;txt.value=v;persistAll();renderPatternListDebounced();renderMain()};
      picker.oninput=()=>setShape(picker.value);txt.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(txt.value))setShape(txt.value)};
      row.append(lab,picker,txt,makeEyeDropperButton(setShape));colorBox.appendChild(row)
    }else colorBox.appendChild(renderColorInputs(layer.colors,()=>{persistAll();let asset=userAssets.find(v=>v.id===layer.assetId);if(asset&&asset.kind==='svg'){asset._img=null;ensureAssetImage(asset,layer).then(renderMain)}renderPatternListDebounced();renderAssetList();renderMain()}))
  }

  autoBtn.onclick=function(){
    if(layer.colorMode==='individual')layer.anchorToneProfile=buildAnchorToneProfile(layer.colors,layer.presetId);
    applyMasterTone(layer,layer.masterColor||layer.colors[1]||'#F59BBC',!isDashedGridPresetId(layer.presetId),'auto');
    persistAll();renderLayerEditor();syncGlobalControls();renderPatternListDebounced();renderMain()
  };
  patternAutoBtn.onclick=function(){
    if(layer.colorMode==='individual')layer.anchorToneProfile=buildAnchorToneProfile(layer.colors,layer.presetId);
    applyMasterTone(layer,layer.masterColor||layer.colors[1]||'#F59BBC',false,'pattern-auto');
    persistAll();renderLayerEditor();syncGlobalControls();renderPatternListDebounced();renderMain()
  };
  manualBtn.onclick=function(){layer.colorMode='individual';persistAll();renderLayerEditor();renderMain()};
  top.appendChild(colorBox);
  if(layer.sourceType==='builtin'&&['checker','plaid','overlap-check','airy-mix-check','layered-fabric-plaid','reference-plaid','textured-checker','soft-window-check'].includes(PE.presets.find(p=>p.id===layer.presetId)?.type)){
    let soft=isSoftAnchorPresetId(layer.presetId),mode=document.createElement('div');mode.className='layer-editor-card';
    mode.innerHTML='<div class="section-title-row"><h3>색상 렌더링 방식</h3></div><div class="control-subtitle">'+(soft?'<strong>소프트 투명</strong> · 대표색을 기준으로 사용하지만 기존처럼 투명도와 겹침을 유지해서 실제 화면에서는 조금 더 연하고 부드럽게 보여.':'<strong>진한 기준색 연동</strong> · 스포이드/HEX 대표색을 가장 진한 부분에 정확히 쓰고, 중간톤과 연한톤도 같은 색상 결로 함께 진해져.')+'</div>';
    top.appendChild(mode)
  }
  if(layer.sourceType==='builtin'&&PE.presets.find(p=>p.id===layer.presetId)?.type==='reference-plaid'){
    let note=document.createElement('div');note.className='layer-editor-card';
    note.innerHTML='<div class="section-title-row"><h3>레퍼런스 플래드 색상 기준</h3></div><div class="control-subtitle">대표색 · Anchor Color는 이 패턴의 <strong>실제로 보이는 가장 진한 부분과 같은 색</strong>으로 사용돼. 스포이드로 찍은 색을 넣으면 가장 진한 교차 체크가 그 HEX와 동일하게 표시되고, 중간톤·연한톤·거의 흰색만 자동으로 밝아져. 개별 색상 지정 모드에서는 모든 색을 직접 바꿀 수 있어.</div>';
    top.appendChild(note)
  }
  if(layer.sourceType==='builtin'&&isLayeredFabricPlaidPresetId(layer.presetId)){
    if(!layer.plaidMaster)layer.plaidMaster='#F39BBC';if(!layer.plaidBg2)layer.plaidBg2='#FFEAF2';if(layer.plaidHatch===undefined)layer.plaidHatch=true;if(layer.plaidHatchStrength===undefined)layer.plaidHatchStrength=40;
    let box=document.createElement('div');box.className='layer-editor-card';box.innerHTML='<div class="section-title-row"><h3>플래드 해칭 설정</h3></div><div class="control-subtitle">중간 진함 이상 체크 영역 전체에 45° 미세 사선 해칭을 적용해. 해칭은 완전히 끄거나 불투명도를 0~100%로 조절할 수 있어.</div>';
    if(layer.colorMode==='individual'){let grid=document.createElement('div');grid.className='color-grid';let specs=[['배경 B','plaidBg2',null,'#FFEAF2']];
    specs.forEach(function(sp){let label=sp[0],prop=sp[1],idx=sp[2],fallback=sp[3],row=document.createElement('div');row.className='color-row';let lab=document.createElement('div');lab.className='color-label';lab.textContent=label;let picker=document.createElement('input');picker.type='color';let val=prop?(layer[prop]||fallback):(layer.colors[idx]||fallback);picker.value=val;let txt=document.createElement('input');txt.type='text';txt.maxLength=7;txt.value=val.toUpperCase();function set(v){v=normalizeHexLike(v,val);if(prop)layer[prop]=v;else layer.colors[idx]=v;picker.value=v;txt.value=v;if(prop==='plaidMaster'&&layer.plaidAuto!==false)applyLayeredPlaidMaster(layer,v);persistAll();renderPatternListDebounced();renderMain()}picker.oninput=function(){set(picker.value)};txt.onchange=function(){if(/^#[0-9a-fA-F]{6}$/.test(txt.value))set(txt.value)};row.append(lab,picker,txt);grid.appendChild(row)});box.appendChild(grid)}
    let hatch=document.createElement('label');hatch.className='switch-row';hatch.innerHTML='<input id="plaidHatchToggle" type="checkbox" '+(layer.plaidHatch!==false?'checked':'')+'/> 45° 미세 사선 해칭 사용';let hr=sliderRow('해칭 불투명도','plaidHatchStrength',layer.plaidHatchStrength??40,0,100,'%',function(v){layer.plaidHatchStrength=v});box.append(hatch,hr);top.appendChild(box);
    setTimeout(function(){let ht=$('#plaidHatchToggle');if(ht)ht.onchange=function(e){layer.plaidHatch=e.target.checked;persistAll();renderPatternListDebounced();renderMain()}},0);
  }
  if(layer.sourceType==='builtin'&&isTriHatchPresetId(layer.presetId)){
    let d=PE.defaults[layer.presetId]||PE.defaults['no-gap-tri-check']||{};
    if(layer.triHatch===undefined)layer.triHatch=d.triHatch!==false;
    if(layer.triHatchStrength===undefined)layer.triHatchStrength=d.triHatchStrength??40;
    if(layer.triHatchAlternate===undefined)layer.triHatchAlternate=d.triHatchAlternate!==false;

    let box=document.createElement('div');box.className='layer-editor-card';
    if(isAiryMixPresetId(layer.presetId)){
      if(!layer.airyStripeColor)layer.airyStripeColor=d.airyStripeColor||'#FFFFFF';
      box.innerHTML='<div class="section-title-row"><h3>에어리 믹스 · 45° 사선 스트라이프</h3></div><div class="control-subtitle">기존 배경 비침 해칭 대신, <strong>두 번째로 진한 단일 밴드 영역에만 얇고 또렷한 45° 스트라이프</strong>를 그려. 스트라이프 색상을 별도로 지정할 수 있고 가장 진한 교차 영역은 에어리 포인트 전용 영역으로 유지돼.</div>';

      let stripeToggle=document.createElement('label');stripeToggle.className='switch-row';
      stripeToggle.innerHTML='<input id="triHatchToggle" type="checkbox" '+(layer.triHatch!==false?'checked':'')+'/> 45° 사선 스트라이프 사용';

      let colorRow=document.createElement('div');colorRow.className='color-row';
      let lab=document.createElement('div');lab.className='color-label';lab.textContent='스트라이프 색상';
      let picker=document.createElement('input');picker.type='color';picker.value=normalizeHexLike(layer.airyStripeColor||'#FFFFFF','#FFFFFF');
      let txt=document.createElement('input');txt.type='text';txt.maxLength=7;txt.value=picker.value.toUpperCase();
      let setStripeColor=v=>{layer.airyStripeColor=normalizeHexLike(v,layer.airyStripeColor||'#FFFFFF');picker.value=txt.value=layer.airyStripeColor;persistAll();renderPatternListDebounced();renderMain()};
      picker.oninput=()=>setStripeColor(picker.value);txt.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(txt.value))setStripeColor(txt.value)};
      colorRow.append(lab,picker,txt,makeEyeDropperButton(setStripeColor));

      let opacityRow=sliderRow('스트라이프 불투명도','triHatchStrength',layer.triHatchStrength??55,0,100,'%',function(v){layer.triHatchStrength=v});
      box.append(stripeToggle,colorRow,opacityRow);top.appendChild(box);

      setTimeout(function(){
        let ht=$('#triHatchToggle');if(ht)ht.onchange=function(e){layer.triHatch=e.target.checked;persistAll();renderPatternListDebounced();renderMain()}
      },0)
    }else{
      box.innerHTML='<div class="section-title-row"><h3>노갭 3톤 해칭 설정</h3></div><div class="control-subtitle">3톤 중 <strong>두 번째로 진한 영역</strong>에만 배경 비침 사선을 적용해. 기본값은 <strong>1줄 ↙ / 2줄 ↘</strong> 방향이 번갈아 반복되고, 가장 진한 교차 영역과 가장 연한 배경 영역은 그대로 유지돼.</div>';
      let hatch=document.createElement('label');hatch.className='switch-row';hatch.innerHTML='<input id="triHatchToggle" type="checkbox" '+(layer.triHatch!==false?'checked':'')+'/> 45° 배경 비침 해칭 사용';
      let alternate=document.createElement('label');alternate.className='switch-row';alternate.innerHTML='<input id="triHatchAlternateToggle" type="checkbox" '+(layer.triHatchAlternate!==false?'checked':'')+'/> 줄마다 해칭 방향 교차 · 1줄 ↙ / 2줄 ↘';
      let hr=sliderRow('배경 비침 강도','triHatchStrength',layer.triHatchStrength??40,0,100,'%',function(v){layer.triHatchStrength=v});
      box.append(hatch,alternate,hr);top.appendChild(box);
      setTimeout(function(){
        let ht=$('#triHatchToggle');if(ht)ht.onchange=function(e){layer.triHatch=e.target.checked;persistAll();renderPatternListDebounced();renderMain()};
        let at=$('#triHatchAlternateToggle');if(at)at.onchange=function(e){layer.triHatchAlternate=e.target.checked;persistAll();renderPatternListDebounced();renderMain()}
      },0)
    }
  }
  if(layer.sourceType==='builtin'&&isAiryMixPresetId(layer.presetId)){
    let d=PE.defaults[layer.presetId]||{};
    if(layer.airyPointCount===undefined)layer.airyPointCount=d.airyPointCount??24;
    if(!layer.airyPointColor)layer.airyPointColor=d.airyPointColor||'#FFFFFF';
    if(layer.airyPointGrid===undefined)layer.airyPointGrid=d.airyPointGrid??4;
    if(!['all','every2','every3','checker','vertical','horizontal'].includes(layer.airyPointPattern))layer.airyPointPattern=d.airyPointPattern||'every3';
    let box=document.createElement('div');box.className='layer-editor-card';
    box.innerHTML='<div class="section-title-row"><h3>가장 진한 칸 · 에어리 포인트</h3></div><div class="control-subtitle">가장 진한 교차 영역 안의 에어리 체크 자체 크기를 줄이는 방식이 아니라, <strong>내부 체크 분할 수</strong>를 늘려 더 작고 촘촘한 체크가 많이 보이도록 조절해. 흰 박스·프레임·추가 외곽선은 만들지 않아.</div>';

    let colorRow=document.createElement('div');colorRow.className='color-row';
    let lab=document.createElement('div');lab.className='color-label';lab.textContent='내부 에어리 체크 색상';
    let picker=document.createElement('input');picker.type='color';picker.value=normalizeHexLike(layer.airyPointColor||'#FFFFFF','#FFFFFF');
    let txt=document.createElement('input');txt.type='text';txt.maxLength=7;txt.value=picker.value.toUpperCase();
    let setPointColor=v=>{layer.airyPointColor=normalizeHexLike(v,layer.airyPointColor||'#FFFFFF');picker.value=txt.value=layer.airyPointColor;persistAll();renderPatternListDebounced();renderMain()};
    picker.oninput=()=>setPointColor(picker.value);txt.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(txt.value))setPointColor(txt.value)};
    colorRow.append(lab,picker,txt,makeEyeDropperButton(setPointColor));

    let patternSelect=document.createElement('select');
    [
      ['every3','2칸 띄우고 1개'],
      ['every2','1칸 띄우고 1개'],
      ['checker','체커형 교차 배치'],
      ['vertical','세로 줄형'],
      ['horizontal','가로 줄형'],
      ['all','전체 적용']
    ].forEach(([v,t])=>{let op=document.createElement('option');op.value=v;op.textContent=t;if(layer.airyPointPattern===v)op.selected=true;patternSelect.appendChild(op)});
    patternSelect.onchange=()=>{layer.airyPointPattern=patternSelect.value;persistAll();renderPatternListDebounced();renderMain()};
    let patternWrap=labeled('에어리 포인트 배치 방식',patternSelect);

    let gridRow=sliderRow('내부 체크 분할 수','airyPointGrid',layer.airyPointGrid??4,2,16,'칸',v=>layer.airyPointGrid=v);
    let countRow=sliderRow('에어리 포인트 최대 개수','airyPointCount',layer.airyPointCount??24,0,200,'개',v=>layer.airyPointCount=v);
    let note=document.createElement('div');note.className='control-subtitle';
    note.innerHTML='<strong>내부 체크 분할 수</strong>: 4칸이면 약 4×4 = 16칸의 기존 밀도, 8칸이면 8×8 = 64칸처럼 더 작고 촘촘해져. 두 번째로 진한 영역에는 위에서 지정한 <strong>45° 사선 스트라이프</strong>가 표시돼. <strong>전체 적용</strong>은 가장 진한 교차 영역 전체에 적용돼.';
    box.append(colorRow,patternWrap,gridRow,countRow,note);top.appendChild(box)
  }
  if(layer.sourceType==='builtin'&&isSoftSunburstPresetId(layer.presetId)){
    let d=PE.defaults[layer.presetId]||{};
    ['softSunRayCount','softSunRayOpacity','softSunSoftness','softSunCenterX','softSunCenterY'].forEach(k=>{if(layer[k]===undefined)layer[k]=d[k]});
    if(layer.softSunThicknessMode!=='equal-bands-v2'){let old=Math.max(1,Number(layer.softSunRayThickness)||8);layer.softSunRayThickness=Math.max(25,Math.min(400,Math.round(old/8*100)));layer.softSunThicknessMode='equal-bands-v2'}
    if(layer.softSunRayThickness===undefined)layer.softSunRayThickness=d.softSunRayThickness??100;
    let box=document.createElement('div');box.className='layer-editor-card';
    box.innerHTML='<div class="section-title-row"><h3>소프트 썬버스트 세부 설정</h3></div><div class="control-subtitle">진한 부분과 연한 부분을 <strong>항상 같은 폭으로 번갈아 배치</strong>하도록 수정했어. 방사선 굵기는 이전보다 훨씬 두껍게까지 조절할 수 있고, 개수와 함께 사용해서 촘촘함을 맞출 수 있어.</div>';
    let grid=document.createElement('div');grid.className='layer-editor-grid';
    grid.append(
      sliderRow('방사선 개수','softSunRayCount',layer.softSunRayCount??36,4,180,'개',v=>layer.softSunRayCount=v),
      sliderRow('방사선 굵기 · 균일 폭','softSunRayThickness',layer.softSunRayThickness??100,25,400,'%',v=>{layer.softSunRayThickness=v;layer.softSunThicknessMode='equal-bands-v2'}),
      sliderRow('연한 영역 불투명도','softSunRayOpacity',layer.softSunRayOpacity??72,0,100,'%',v=>layer.softSunRayOpacity=v),
      sliderRow('부드러움 · 중심 글로우','softSunSoftness',layer.softSunSoftness??34,0,100,'%',v=>layer.softSunSoftness=v),
      sliderRow('중심점 X','softSunCenterX',layer.softSunCenterX??48,0,100,'%',v=>layer.softSunCenterX=v),
      sliderRow('중심점 Y','softSunCenterY',layer.softSunCenterY??54,0,100,'%',v=>layer.softSunCenterY=v)
    );
    let note=document.createElement('div');note.className='control-subtitle';
    note.innerHTML='<strong>100%</strong>가 기본 굵기야. 25~75%는 더 얇고 촘촘하게, 150~400%는 훨씬 두껍게 보여. 굵기를 바꿔도 <strong>진한 띠와 연한 띠의 폭은 항상 1:1</strong>로 유지돼. 아래 공통 <strong>회전</strong>으로 전체 각도를 돌릴 수 있어.';
    let reset=document.createElement('button');reset.type='button';reset.className='mini-btn';reset.textContent='소프트 썬버스트 설정 초기화';
    reset.onclick=()=>{['softSunRayCount','softSunRayThickness','softSunRayOpacity','softSunSoftness','softSunCenterX','softSunCenterY'].forEach(k=>layer[k]=d[k]);layer.softSunThicknessMode='equal-bands-v2';persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
    box.append(grid,note,reset);top.appendChild(box)
  }
  if(layer.sourceType==='builtin'&&isPastelArgylePresetId(layer.presetId)){
    let preset=getPreset(layer.presetId),d=PE.defaults[layer.presetId]||{},motif=preset?.opt?.motif||'';
    ['argyleX','argyleY','argyleLineOpacity','argyleLineWidth','argyleDashLength','argyleDashGap','argyleMotifSize','argyleMotifEvery'].forEach(k=>{if(layer[k]===undefined)layer[k]=d[k]});
    let box=document.createElement('div');box.className='layer-editor-card';
    box.innerHTML='<div class="section-title-row"><h3>파스텔 아가일 세부 설정</h3></div><div class="control-subtitle">첨부 레퍼런스처럼 세로로 긴 마름모 색면 위에 얇은 사선 점선을 겹치는 아가일이야. <strong>X/Y 마름모 크기, 점선, 포인트 장식</strong>을 따로 조절할 수 있고 공통 패턴 크기로 전체 비율도 함께 바뀌어.</div>';

    let grid=document.createElement('div');grid.className='layer-editor-grid';
    grid.append(
      sliderRow('다이아 X 크기 · 가로','argyleX',layer.argyleX??112,48,320,'px',v=>layer.argyleX=v),
      sliderRow('다이아 Y 크기 · 세로','argyleY',layer.argyleY??92,40,280,'px',v=>layer.argyleY=v),
      sliderRow('사선 점선 불투명도','argyleLineOpacity',layer.argyleLineOpacity??78,0,100,'%',v=>layer.argyleLineOpacity=v),
      sliderRow('사선 점선 두께','argyleLineWidth',layer.argyleLineWidth??2,0.5,8,'px',v=>layer.argyleLineWidth=v),
      sliderRow('점선 길이','argyleDashLength',layer.argyleDashLength??10,2,36,'px',v=>layer.argyleDashLength=v),
      sliderRow('점선 간격','argyleDashGap',layer.argyleDashGap??8,2,36,'px',v=>layer.argyleDashGap=v)
    );

    let lineRow=document.createElement('div');lineRow.className='color-row';
    let lineLab=document.createElement('div');lineLab.className='color-label';lineLab.textContent='사선 점선 색상';
    let linePicker=document.createElement('input');linePicker.type='color';linePicker.value=normalizeHexLike(layer.argyleLineColor||layer.colors[4]||'#FFFFFF','#FFFFFF');
    let lineText=document.createElement('input');lineText.type='text';lineText.maxLength=7;lineText.value=linePicker.value.toUpperCase();
    let setLine=v=>{layer.argyleLineColor=normalizeHexLike(v,layer.colors[4]||'#FFFFFF');linePicker.value=layer.argyleLineColor;lineText.value=layer.argyleLineColor;persistAll();renderPatternListDebounced();renderMain()};
    linePicker.oninput=()=>setLine(linePicker.value);
    lineText.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(lineText.value))setLine(lineText.value)};
    let lineAuto=document.createElement('button');lineAuto.type='button';lineAuto.className='mini-btn';lineAuto.textContent='대표색 연동';
    lineAuto.onclick=()=>{delete layer.argyleLineColor;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
    lineRow.append(lineLab,linePicker,lineText,makeEyeDropperButton(setLine),lineAuto);

    box.append(lineRow,grid);

    if(motif){
      let motifRow=document.createElement('div');motifRow.className='color-row';
      let motifLab=document.createElement('div');motifLab.className='color-label';motifLab.textContent=motif==='heart'?'하트 색상':motif==='bow'?'리본 색상':'꽃 색상';
      let motifPicker=document.createElement('input');motifPicker.type='color';motifPicker.value=normalizeHexLike(layer.argyleMotifColor||layer.colors[4]||layer.colors[1]||'#F2AFC4','#F2AFC4');
      let motifText=document.createElement('input');motifText.type='text';motifText.maxLength=7;motifText.value=motifPicker.value.toUpperCase();
      let setMotif=v=>{layer.argyleMotifColor=normalizeHexLike(v,layer.colors[4]||'#F2AFC4');motifPicker.value=layer.argyleMotifColor;motifText.value=layer.argyleMotifColor;persistAll();renderPatternListDebounced();renderMain()};
      motifPicker.oninput=()=>setMotif(motifPicker.value);
      motifText.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(motifText.value))setMotif(motifText.value)};
      let motifAuto=document.createElement('button');motifAuto.type='button';motifAuto.className='mini-btn';motifAuto.textContent='대표색 연동';
      motifAuto.onclick=()=>{delete layer.argyleMotifColor;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
      motifRow.append(motifLab,motifPicker,motifText,makeEyeDropperButton(setMotif),motifAuto);

      let motifGrid=document.createElement('div');motifGrid.className='layer-editor-grid';
      motifGrid.append(
        sliderRow('포인트 장식 크기','argyleMotifSize',layer.argyleMotifSize??18,6,54,'px',v=>layer.argyleMotifSize=v),
        sliderRow('포인트 배치 간격','argyleMotifEvery',layer.argyleMotifEvery??3,1,8,'칸',v=>layer.argyleMotifEvery=v)
      );
      box.append(motifRow,motifGrid)
    }

    let note=document.createElement('div');note.className='control-subtitle';
    note.innerHTML='<strong>색상 자동 연동</strong>에서는 마름모 색들이 대표색과 같은 계열의 파스텔 톤으로 자동 생성돼. 점선/장식 색상도 기본은 대표색 계열을 따라가고, 원하는 경우 별도 색상을 직접 지정할 수 있어.';
    let reset=document.createElement('button');reset.type='button';reset.className='mini-btn';reset.textContent='아가일 설정 초기화';
    reset.onclick=()=>{['argyleX','argyleY','argyleLineOpacity','argyleLineWidth','argyleDashLength','argyleDashGap','argyleMotifSize','argyleMotifEvery'].forEach(k=>layer[k]=d[k]);delete layer.argyleLineColor;delete layer.argyleMotifColor;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
    box.append(note,reset);top.appendChild(box)
  }
  if(layer.sourceType==='builtin'&&isMiniDotPresetId(layer.presetId)){
    let d=PE.defaults['tiny-dot']||{};
    if(layer.tinyDotGapX===undefined)layer.tinyDotGapX=d.tinyDotGapX??0;
    if(layer.tinyDotGapY===undefined)layer.tinyDotGapY=d.tinyDotGapY??0;

    let box=document.createElement('div');box.className='layer-editor-card';
    box.innerHTML='<div class="section-title-row"><h3>미니 도트 X/Y 간격 미세 조정</h3></div><div class="control-subtitle">기존 <strong>패턴 크기</strong>와 <strong>간격</strong>이 전체 도트 크기·기본 간격을 잡고, 여기서는 가로와 세로 간격만 따로 미세 보정해. 예를 들어 가로는 +값으로 넓히고 세로는 -값으로 좁힐 수 있어.</div>';

    let grid=document.createElement('div');grid.className='layer-editor-grid';
    grid.append(
      sliderRow('가로 간격 보정 · X','tinyDotGapX',layer.tinyDotGapX??0,-60,120,'px',v=>layer.tinyDotGapX=v),
      sliderRow('세로 간격 보정 · Y','tinyDotGapY',layer.tinyDotGapY??0,-60,120,'px',v=>layer.tinyDotGapY=v)
    );

    let note=document.createElement('div');note.className='control-subtitle';
    note.innerHTML='<strong>0px</strong>이 기존 미니 도트와 같은 간격이야. 음수는 더 촘촘하게, 양수는 더 넓게 배치해. 도트 자체 크기는 이 값으로 바뀌지 않아.';

    let reset=document.createElement('button');reset.type='button';reset.className='mini-btn';reset.textContent='X/Y 간격 보정 초기화';
    reset.onclick=()=>{layer.tinyDotGapX=0;layer.tinyDotGapY=0;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};

    box.append(grid,note,reset);top.appendChild(box)
  }
  if(layer.sourceType==='builtin'&&isMilkyMiniCheckWindowPresetId(layer.presetId)){
    let d=PE.defaults['milky-mini-check-window']||{};
    ['milkyCheckX','milkyCheckY','milkyBandWidth','milkyBaseWashOpacity','milkyCheckOpacity','milkyOverlapOpacity','milkyFineGridOpacity','milkyMiniSize','milkyMiniEvery','milkyMiniGap'].forEach(k=>{if(layer[k]===undefined)layer[k]=d[k]});
    if(!layer.milkyMiniColor)layer.milkyMiniColor=d.milkyMiniColor||'#FFF9F1';

    let box=document.createElement('div');box.className='layer-editor-card';
    box.innerHTML='<div class="section-title-row"><h3>밀키 미니 체크 윈도우 설정</h3></div><div class="control-subtitle">첨부 레퍼런스처럼 <strong>캔버스 전체를 하나로 잇는 세로·가로 체크 띠</strong> 위에 얇은 보조 격자와 네 칸이 모두 채워진 크림 2×2 미니 블록이 규칙적으로 반복돼. 큰 셀을 흰 박스로 따로 찍는 방식은 사용하지 않아.</div>';

    let mainRow=document.createElement('div');mainRow.className='color-row';
    let mainLab=document.createElement('div');mainLab.className='color-label';mainLab.textContent='큰 체크 색상';
    let mainFallback=layer.colors?.[2]||'#CFE7FF';
    let mainPicker=document.createElement('input');mainPicker.type='color';mainPicker.value=normalizeHexLike(layer.milkyCheckColor||mainFallback,mainFallback);
    let mainText=document.createElement('input');mainText.type='text';mainText.maxLength=7;mainText.value=mainPicker.value.toUpperCase();
    let setMain=v=>{layer.milkyCheckColor=normalizeHexLike(v,mainFallback);mainPicker.value=layer.milkyCheckColor;mainText.value=layer.milkyCheckColor;persistAll();renderPatternListDebounced();renderMain()};
    mainPicker.oninput=()=>setMain(mainPicker.value);
    mainText.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(mainText.value))setMain(mainText.value)};
    let mainAuto=document.createElement('button');mainAuto.type='button';mainAuto.className='mini-btn';mainAuto.textContent='대표색 연동';
    mainAuto.onclick=()=>{delete layer.milkyCheckColor;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
    mainRow.append(mainLab,mainPicker,mainText,makeEyeDropperButton(setMain),mainAuto);

    let miniRow=document.createElement('div');miniRow.className='color-row';
    let miniLab=document.createElement('div');miniLab.className='color-label';miniLab.textContent='미니 체크 색상';
    let miniPicker=document.createElement('input');miniPicker.type='color';miniPicker.value=normalizeHexLike(layer.milkyMiniColor||'#FFF9F1','#FFF9F1');
    let miniText=document.createElement('input');miniText.type='text';miniText.maxLength=7;miniText.value=miniPicker.value.toUpperCase();
    let setMini=v=>{layer.milkyMiniColor=normalizeHexLike(v,'#FFF9F1');miniPicker.value=layer.milkyMiniColor;miniText.value=layer.milkyMiniColor;persistAll();renderPatternListDebounced();renderMain()};
    miniPicker.oninput=()=>setMini(miniPicker.value);
    miniText.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(miniText.value))setMini(miniText.value)};
    miniRow.append(miniLab,miniPicker,miniText,makeEyeDropperButton(setMini));

    let grid=document.createElement('div');grid.className='layer-editor-grid';
    grid.append(
      sliderRow('큰 체크 X 크기','milkyCheckX',layer.milkyCheckX??60,28,280,'px',v=>layer.milkyCheckX=v),
      sliderRow('큰 체크 Y 크기','milkyCheckY',layer.milkyCheckY??56,28,280,'px',v=>layer.milkyCheckY=v),
      sliderRow('큰 체크 밴드 두께','milkyBandWidth',layer.milkyBandWidth??14,3,100,'px',v=>layer.milkyBandWidth=v),
      sliderRow('바탕 밀키 워시','milkyBaseWashOpacity',layer.milkyBaseWashOpacity??10,0,40,'%',v=>layer.milkyBaseWashOpacity=v),
      sliderRow('큰 체크 불투명도','milkyCheckOpacity',layer.milkyCheckOpacity??20,0,100,'%',v=>layer.milkyCheckOpacity=v),
      sliderRow('교차 영역 진하기','milkyOverlapOpacity',layer.milkyOverlapOpacity??7,0,100,'%',v=>layer.milkyOverlapOpacity=v),
      sliderRow('얇은 보조 격자 강도','milkyFineGridOpacity',layer.milkyFineGridOpacity??8,0,50,'%',v=>layer.milkyFineGridOpacity=v),
      sliderRow('미니 체크 크기','milkyMiniSize',layer.milkyMiniSize??16,8,80,'px',v=>layer.milkyMiniSize=v),
      sliderRow('미니 체크 배치 간격','milkyMiniEvery',layer.milkyMiniEvery??2,1,8,'칸',v=>layer.milkyMiniEvery=v),
      sliderRow('미니 체크 내부 간격','milkyMiniGap',layer.milkyMiniGap??2,0,20,'px',v=>layer.milkyMiniGap=v)
    );

    let note=document.createElement('div');note.className='control-subtitle';
    note.innerHTML='배경색은 기존 캔버스 배경을 그대로 사용하지만, <strong>바탕 밀키 워시</strong>가 같은 색 계열을 아주 약하게 한 번 더 덮어 빈 칸이 흰 사각형처럼 따로 뜨지 않게 해. 기본값은 밴드는 연하고 촘촘하게, 미니 블록은 한 칸 걸러 규칙 배치돼. 대표색 연동 시 큰 체크는 현재 대표색 계열의 연한 톤을 따라가고, 미니 블록은 크림화이트 계열로 독립 지정할 수 있어. 아래 공통 <strong>패턴 크기</strong>를 조절하면 현재 X/Y 비율을 유지한 채 전체 체크와 미니 포인트가 함께 커져.';

    let reset=document.createElement('button');reset.type='button';reset.className='mini-btn';reset.textContent='밀키 미니 체크 설정 초기화';
    reset.onclick=()=>{['milkyCheckX','milkyCheckY','milkyBandWidth','milkyBaseWashOpacity','milkyCheckOpacity','milkyOverlapOpacity','milkyFineGridOpacity','milkyMiniSize','milkyMiniEvery','milkyMiniGap'].forEach(k=>layer[k]=d[k]);delete layer.milkyCheckColor;layer.milkyMiniColor=d.milkyMiniColor||'#FFF9F1';persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};

    box.append(mainRow,miniRow,grid,note,reset);top.appendChild(box)
  }
  if(layer.sourceType==='builtin'&&isSoftWindowCheckPresetId(layer.presetId)){
    let d=PE.defaults['soft-window-check']||{};
    if(layer.windowCheckX===undefined)layer.windowCheckX=d.windowCheckX??118;
    if(layer.windowCheckY===undefined)layer.windowCheckY=d.windowCheckY??96;
    if(layer.windowCheckLineWidth===undefined)layer.windowCheckLineWidth=d.windowCheckLineWidth??2;
    if(layer.windowCheckSecondaryOpacity===undefined)layer.windowCheckSecondaryOpacity=d.windowCheckSecondaryOpacity??28;

    let box=document.createElement('div');box.className='layer-editor-card';
    box.innerHTML='<div class="section-title-row"><h3>소프트 윈도우 체크 설정</h3></div><div class="control-subtitle">첨부 레퍼런스 안쪽처럼 <strong>큰 사각 체크 + 얇은 밝은 선 + 한 단계 더 옅은 보조선</strong>이 겹치는 패브릭 체크야. X/Y를 따로 잡고 공통 패턴 크기로 전체 비율을 함께 확대·축소할 수 있어.</div>';

    let grid=document.createElement('div');grid.className='layer-editor-grid';
    grid.append(
      sliderRow('체크 X 크기 · 가로','windowCheckX',layer.windowCheckX??118,40,400,'px',v=>layer.windowCheckX=v),
      sliderRow('체크 Y 크기 · 세로','windowCheckY',layer.windowCheckY??96,40,400,'px',v=>layer.windowCheckY=v),
      sliderRow('메인 선 두께','windowCheckLineWidth',layer.windowCheckLineWidth??2,1,10,'px',v=>layer.windowCheckLineWidth=v),
      sliderRow('보조선 강도','windowCheckSecondaryOpacity',layer.windowCheckSecondaryOpacity??28,0,100,'%',v=>layer.windowCheckSecondaryOpacity=v)
    );

    let note=document.createElement('div');note.className='control-subtitle';
    note.innerHTML='색상은 위의 색상 설정과 연결돼. <strong>전체 자동 연동</strong>에서는 대표색이 진한 바탕이 되고 밝은 체크선이 자동 생성돼. <strong>배경 고정 · 패턴 자동</strong>에서는 현재 배경을 유지한 채 체크선 계열만 대표색 기준으로 맞춰져.';

    let reset=document.createElement('button');reset.type='button';reset.className='mini-btn';reset.textContent='윈도우 체크 설정 초기화';
    reset.onclick=()=>{layer.windowCheckX=d.windowCheckX??118;layer.windowCheckY=d.windowCheckY??96;layer.windowCheckLineWidth=d.windowCheckLineWidth??2;layer.windowCheckSecondaryOpacity=d.windowCheckSecondaryOpacity??28;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};

    box.append(grid,note,reset);top.appendChild(box)
  }
  if(layer.sourceType==='builtin'&&isPastelGridPresetId(layer.presetId)){
    let d=PE.defaults['grid']||{};
    if(layer.gridX===undefined)layer.gridX=d.gridX??96;
    if(layer.gridY===undefined)layer.gridY=d.gridY??96;
    let box=document.createElement('div');box.className='layer-editor-card';
    box.innerHTML='<div class="section-title-row"><h3>파스텔 격자 크기</h3></div><div class="control-subtitle"><strong>X 크기와 Y 크기는 각각 독립적으로</strong> 비율을 잡을 수 있고, 아래 공통 <strong>패턴 크기</strong>를 조절하면 현재 X/Y 비율을 유지한 채 격자 전체가 함께 커지거나 작아져.</div>';
    let grid=document.createElement('div');grid.className='layer-editor-grid';
    grid.append(
      sliderRow('격자 X 크기 · 가로','gridX',layer.gridX??96,20,400,'px',v=>layer.gridX=v),
      sliderRow('격자 Y 크기 · 세로','gridY',layer.gridY??96,20,400,'px',v=>layer.gridY=v)
    );
    let reset=document.createElement('button');reset.type='button';reset.className='mini-btn';reset.textContent='X/Y 동일하게 초기화';
    reset.onclick=()=>{layer.gridX=d.gridX??96;layer.gridY=d.gridY??96;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
    box.append(grid,reset);top.appendChild(box)
  }
  if(layer.sourceType==='builtin'&&isSimpleDiamondPresetId(layer.presetId)){
    let d=PE.defaults['simple-diamond']||{};
    if(layer.simpleDiamondX===undefined)layer.simpleDiamondX=d.simpleDiamondX??78;
    if(layer.simpleDiamondY===undefined)layer.simpleDiamondY=d.simpleDiamondY??132;

    let box=document.createElement('div');box.className='layer-editor-card';
    box.innerHTML='<div class="section-title-row"><h3>심플 다이아 설정</h3></div><div class="control-subtitle">첨부 레퍼런스처럼 <strong>가로·세로 줄이 정확히 맞는 마름모 격자</strong>로 반복되고, 색이 들어간 다이아 줄과 배경 다이아 줄이 규칙적으로 번갈아 보여. 선·점선·장식은 들어가지 않아.</div>';

    let colorRow=document.createElement('div');colorRow.className='color-row';
    let lab=document.createElement('div');lab.className='color-label';lab.textContent='다이아 색상';
    let linkedColor=layer.colors?.[1]||'#CFEFF7';
    let current=normalizeHexLike(layer.simpleDiamondColor||linkedColor,linkedColor);
    let picker=document.createElement('input');picker.type='color';picker.value=current;
    let txt=document.createElement('input');txt.type='text';txt.maxLength=7;txt.value=current.toUpperCase();
    let setColor=v=>{layer.simpleDiamondColor=normalizeHexLike(v,linkedColor);picker.value=layer.simpleDiamondColor;txt.value=layer.simpleDiamondColor;persistAll();renderPatternListDebounced();renderMain()};
    picker.oninput=()=>setColor(picker.value);
    txt.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(txt.value))setColor(txt.value)};
    let auto=document.createElement('button');auto.type='button';auto.className='mini-btn';auto.textContent='대표색 연동';
    auto.onclick=()=>{delete layer.simpleDiamondColor;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
    colorRow.append(lab,picker,txt,makeEyeDropperButton(setColor),auto);

    let controls=document.createElement('div');controls.className='layer-editor-grid';
    controls.append(
      sliderRow('다이아 X 크기 · 가로','simpleDiamondX',layer.simpleDiamondX??78,24,260,'px',v=>layer.simpleDiamondX=v),
      sliderRow('다이아 Y 크기 · 세로','simpleDiamondY',layer.simpleDiamondY??132,36,360,'px',v=>layer.simpleDiamondY=v)
    );

    let note=document.createElement('div');note.className='control-subtitle';
    note.innerHTML='흰색으로 보이는 다이아 영역은 <strong>현재 캔버스 배경색</strong>이 그대로 드러나는 구조야. 그래서 다이아 색상과 배경색을 각각 따로 정할 수 있고, 아래 공통 <strong>패턴 크기</strong>를 조절하면 현재 X/Y 비율을 유지한 채 전체가 함께 커지거나 작아져.';

    let reset=document.createElement('button');reset.type='button';reset.className='mini-btn';reset.textContent='심플 다이아 설정 초기화';
    reset.onclick=()=>{layer.simpleDiamondX=d.simpleDiamondX??78;layer.simpleDiamondY=d.simpleDiamondY??132;delete layer.simpleDiamondColor;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};

    box.append(colorRow,controls,note,reset);top.appendChild(box)
  }
  if(layer.sourceType==='builtin'&&isPastelDiamondGridPresetId(layer.presetId)){
    let d=PE.defaults['grid-diamond']||{};
    if(layer.gridX===undefined)layer.gridX=d.gridX??96;
    if(layer.gridY===undefined)layer.gridY=d.gridY??96;
    if(!layer.diamondColor)layer.diamondColor=d.diamondColor||'#BFD7FF';
    if(layer.diamondSize===undefined)layer.diamondSize=d.diamondSize??10;

    let box=document.createElement('div');box.className='layer-editor-card';
    box.innerHTML='<div class="section-title-row"><h3>파스텔 다이아 격자 설정</h3></div><div class="control-subtitle"><strong>격자 X/Y는 각각 독립적으로</strong> 비율을 잡고, 아래 공통 <strong>패턴 크기</strong>를 조절하면 현재 X/Y 비율을 유지한 채 격자 전체와 다이아 포인트가 함께 커지거나 작아져. 다이아 색상과 기본 크기는 별도로 조절할 수 있어.</div>';

    let colorRow=document.createElement('div');colorRow.className='color-row';
    let lab=document.createElement('div');lab.className='color-label';lab.textContent='다이아 색상';
    let picker=document.createElement('input');picker.type='color';picker.value=normalizeHexLike(layer.diamondColor||'#BFD7FF','#BFD7FF');
    let txt=document.createElement('input');txt.type='text';txt.maxLength=7;txt.value=picker.value.toUpperCase();
    let setDiamondColor=v=>{layer.diamondColor=normalizeHexLike(v,layer.diamondColor||'#BFD7FF');picker.value=layer.diamondColor;txt.value=layer.diamondColor;persistAll();renderPatternListDebounced();renderMain()};
    picker.oninput=()=>setDiamondColor(picker.value);
    txt.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(txt.value))setDiamondColor(txt.value)};
    colorRow.append(lab,picker,txt,makeEyeDropperButton(setDiamondColor));

    let controls=document.createElement('div');controls.className='layer-editor-grid';
    controls.append(
      sliderRow('격자 X 크기 · 가로','gridX',layer.gridX??96,20,400,'px',v=>layer.gridX=v),
      sliderRow('격자 Y 크기 · 세로','gridY',layer.gridY??96,20,400,'px',v=>layer.gridY=v),
      sliderRow('다이아 크기','diamondSize',layer.diamondSize??10,2,60,'px',v=>layer.diamondSize=v)
    );

    let reset=document.createElement('button');reset.type='button';reset.className='mini-btn';reset.textContent='다이아 격자 설정 초기화';
    reset.onclick=()=>{layer.gridX=d.gridX??96;layer.gridY=d.gridY??96;layer.diamondColor=d.diamondColor||'#BFD7FF';layer.diamondSize=d.diamondSize??10;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};

    box.append(colorRow,controls,reset);top.appendChild(box)
  }
  if(layer.sourceType==='builtin'&&isDashedGridPresetId(layer.presetId)){
    let d=PE.defaults[layer.presetId]||PE.defaults['dashed-grid']||{};['dashedLineColor','dashedLineOpacity','dashedLineWidth','dashLength','dashGap','gridX','gridY'].forEach(k=>{if(layer[k]===undefined)layer[k]=d[k]});
    let box=document.createElement('div');box.className='layer-editor-card';
    box.innerHTML='<div class="section-title-row"><h3>'+(isHeartDashedGridPresetId(layer.presetId)?'하트 점선 격자 세부 설정':'점선 체크 세부 설정')+'</h3></div><div class="control-subtitle">'+(isHeartDashedGridPresetId(layer.presetId)?'45° 점선 다이아 격자의 교차점에 작은 하트를 배치해. 점선과 하트는 각각 색상·투명도·크기를 따로 조절할 수 있어.':'면을 채우지 않고 round cap 점선만으로 큰 사각 격자를 만들어.')+'</div>';
    let colorRow=document.createElement('div');colorRow.className='color-row';
    let lab=document.createElement('div');lab.className='color-label';lab.textContent='선 색상';
    let picker=document.createElement('input');picker.type='color';picker.value=layer.dashedLineColor||'#FFFFFF';
    let txt=document.createElement('input');txt.type='text';txt.maxLength=7;txt.value=picker.value.toUpperCase();
    let setLine=v=>{layer.dashedLineColor=normalizeHexLike(v,layer.dashedLineColor||'#FFFFFF');picker.value=txt.value=layer.dashedLineColor;persistAll();renderPatternListDebounced();renderMain()};
    picker.oninput=()=>setLine(picker.value);txt.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(txt.value))setLine(txt.value)};
    colorRow.append(lab,picker,txt,makeEyeDropperButton(setLine));box.appendChild(colorRow);
    let grid=document.createElement('div');grid.className='layer-editor-grid';
    grid.append(
      sliderRow('선 투명도','dashedLineOpacity',layer.dashedLineOpacity,0,100,'%',v=>layer.dashedLineOpacity=v),
      sliderRow('점선 두께','dashedLineWidth',layer.dashedLineWidth,1,12,'px',v=>layer.dashedLineWidth=v),
      sliderRow('점선 길이','dashLength',layer.dashLength,1,40,'px',v=>layer.dashLength=v),
      sliderRow('점선 간격','dashGap',layer.dashGap,1,50,'px',v=>layer.dashGap=v),
      sliderRow('격자 가로 간격','gridX',layer.gridX,30,360,'px',v=>layer.gridX=v),
      sliderRow('격자 세로 간격','gridY',layer.gridY,30,360,'px',v=>layer.gridY=v)
    );
    box.appendChild(grid);
    if(isHeartDashedGridPresetId(layer.presetId)){
      ['dashedHeartColor','dashedHeartOpacity','dashedHeartSize','dashedHeartEvery'].forEach(k=>{if(layer[k]===undefined)layer[k]=d[k]});
      let heartTitle=document.createElement('div');heartTitle.className='control-subtitle';heartTitle.innerHTML='<strong>교차점 하트</strong> — 참고 이미지처럼 점선 격자의 교차점에 작고 또렷한 하트를 반복 배치해.';
      let heartColor=document.createElement('div');heartColor.className='color-row';
      let heartLab=document.createElement('div');heartLab.className='color-label';heartLab.textContent='하트 색상';
      let heartPicker=document.createElement('input');heartPicker.type='color';heartPicker.value=layer.dashedHeartColor||layer.dashedLineColor||'#FFFFFF';
      let heartText=document.createElement('input');heartText.type='text';heartText.maxLength=7;heartText.value=heartPicker.value.toUpperCase();
      let setHeart=v=>{layer.dashedHeartColor=normalizeHexLike(v,layer.dashedHeartColor||'#FFFFFF');heartPicker.value=heartText.value=layer.dashedHeartColor;persistAll();renderPatternListDebounced();renderMain()};
      heartPicker.oninput=()=>setHeart(heartPicker.value);heartText.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(heartText.value))setHeart(heartText.value)};
      heartColor.append(heartLab,heartPicker,heartText,makeEyeDropperButton(setHeart));
      let heartGrid=document.createElement('div');heartGrid.className='layer-editor-grid';
      heartGrid.append(
        sliderRow('하트 불투명도','dashedHeartOpacity',layer.dashedHeartOpacity??92,0,100,'%',v=>layer.dashedHeartOpacity=v),
        sliderRow('하트 크기','dashedHeartSize',layer.dashedHeartSize??14,4,40,'px',v=>layer.dashedHeartSize=v),
        sliderRow('하트 배치 간격','dashedHeartEvery',layer.dashedHeartEvery??1,1,4,'칸',v=>layer.dashedHeartEvery=v)
      );
      box.append(heartTitle,heartColor,heartGrid)
    }
    top.appendChild(box)
  }
  if(layerSupportsScatterControls(layer)){
    let uniformShape=layer.sourceType==='builtin'&&isUniformShapePresetId(layer.presetId);
    if(uniformShape){
      ['row1OffsetX','row1OffsetY','row1Angle','row2OffsetX','row2OffsetY','row2Angle'].forEach(k=>{if(layer[k]===undefined)layer[k]=0});
      layer.randomSize=false;layer.randomAngle=false;layer.randomPosition=false;
      let pairBox=document.createElement('div');pairBox.className='layer-editor-card';
      let head=document.createElement('div');head.className='section-title-row';
      head.innerHTML='<div><h3>2줄 반복 배치</h3><div class="control-subtitle">1줄 + 2줄을 한 세트로 반복해. 2줄은 기본적으로 1줄 요소 사이의 중간 지점(반 칸 이동)에서 시작하고, 각 줄의 위치와 각도를 따로 조절할 수 있어.</div></div>';
      let reset=document.createElement('button');reset.type='button';reset.className='mini-btn';reset.textContent='두 줄 초기화';
      reset.onclick=()=>{layer.row1OffsetX=0;layer.row1OffsetY=0;layer.row1Angle=0;layer.row2OffsetX=0;layer.row2OffsetY=0;layer.row2Angle=0;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
      head.appendChild(reset);pairBox.appendChild(head);
      let row1Title=document.createElement('div');row1Title.className='control-subtitle';row1Title.innerHTML='<strong>1번째 줄 · A줄</strong> — 3번째, 5번째 줄에도 같은 설정 반복';
      let row1=document.createElement('div');row1.className='layer-editor-grid';
      row1.append(
        sliderRow('1줄 X 위치','row1OffsetX',layer.row1OffsetX,-180,180,'px',v=>layer.row1OffsetX=v),
        sliderRow('1줄 Y 위치','row1OffsetY',layer.row1OffsetY,-120,120,'px',v=>layer.row1OffsetY=v),
        sliderRow('1줄 각도','row1Angle',layer.row1Angle,-180,180,'°',v=>layer.row1Angle=v)
      );
      let row2Title=document.createElement('div');row2Title.className='control-subtitle';row2Title.innerHTML='<strong>2번째 줄 · B줄</strong> — 기본 반 칸 엇갈림 + 아래 값만큼 추가 이동 · 4번째, 6번째 줄에도 반복';
      let row2=document.createElement('div');row2.className='layer-editor-grid';
      row2.append(
        sliderRow('2줄 X 추가 이동','row2OffsetX',layer.row2OffsetX,-180,180,'px',v=>layer.row2OffsetX=v),
        sliderRow('2줄 Y 위치','row2OffsetY',layer.row2OffsetY,-120,120,'px',v=>layer.row2OffsetY=v),
        sliderRow('2줄 각도','row2Angle',layer.row2Angle,-180,180,'°',v=>layer.row2Angle=v)
      );
      let fixed=document.createElement('div');fixed.className='control-subtitle';fixed.textContent='색상과 크기는 각 요소마다 동일하게 유지되며, 요소 단위 랜덤 위치/각도는 사용하지 않아. 전체 패턴은 아래의 회전·위치 X/Y로 한꺼번에 움직일 수 있어.';
      pairBox.append(row1Title,row1,row2Title,row2,fixed);top.appendChild(pairBox)
    }else{
      let scatterBox=document.createElement('div');scatterBox.className='layer-editor-card';
      scatterBox.innerHTML='<div class="section-title-row"><h3>반복 요소 정렬</h3><button id="cleanAlignBtn" class="mini-btn" type="button">깔끔 정렬 적용</button></div><div class="control-subtitle">반복 요소를 더 반듯하게 맞추고 싶을 때 사용해. 랜덤을 끄면 같은 크기·같은 방향·같은 간격에 가깝게 정렬돼.</div>';
      let sizeRow=document.createElement('label');sizeRow.className='switch-row';sizeRow.innerHTML=`<input id="randomSizeToggle" type="checkbox" ${layer.randomSize!==false?'checked':''}/> 요소 크기 랜덤`;
      let angleRow=document.createElement('label');angleRow.className='switch-row';angleRow.innerHTML=`<input id="randomAngleToggle" type="checkbox" ${layer.randomAngle!==false?'checked':''}/> 요소 각도 랜덤`;
      let posRow=document.createElement('label');posRow.className='switch-row';posRow.innerHTML=`<input id="randomPositionToggle" type="checkbox" ${layer.randomPosition!==false?'checked':''}/> 요소 위치 랜덤`;
      scatterBox.append(sizeRow,angleRow,posRow);top.appendChild(scatterBox)
    }
  }
  if(layer.sourceType==='builtin'&&isGraphicCompositionPresetId(layer.presetId)){
    let d=PE.defaults[layer.presetId]||{};
    if(layer.graphicSafeArea===undefined)layer.graphicSafeArea=d.graphicSafeArea??60;
    if(layer.graphicBarScale===undefined)layer.graphicBarScale=d.graphicBarScale??100;
    if(layer.graphicCircleScale===undefined)layer.graphicCircleScale=d.graphicCircleScale??100;
    if(layer.graphicSmallScale===undefined)layer.graphicSmallScale=d.graphicSmallScale??100;
    if(layer.graphicLargeScale===undefined)layer.graphicLargeScale=d.graphicLargeScale??110;
    if(layer.graphicBalance===undefined)layer.graphicBalance=d.graphicBalance??90;
    if(!layer.graphicMotifMode)layer.graphicMotifMode=d.graphicMotifMode||'mixed';
    let gbox=document.createElement('div');gbox.className='layer-editor-card';
    let ghead=document.createElement('div');ghead.className='section-title-row';
    ghead.innerHTML='<div><h3>그래픽 배경 세부 설정</h3><div class="control-subtitle">도형이 한곳에 뭉치지 않도록 가장자리 슬롯에 균형 있게 분산해. 원·링 / 긴 캡슐 / 점선 / 혼합 세트를 골라 조합할 수 있고 중앙 여백은 유지돼.</div></div>';
    let reroll=document.createElement('button');reroll.type='button';reroll.className='mini-btn';reroll.textContent='구도 새로 섞기';reroll.onclick=()=>{layer.seed=Math.floor(Math.random()*1e9);persistAll();renderPatternListDebounced();renderMain()};
    ghead.appendChild(reroll);gbox.appendChild(ghead);
    let motif=document.createElement('select');
    [['mixed','전체 혼합'],['circles','원·링 중심'],['bars','긴 막대·캡슐 중심'],['dotted','점선·도트 중심'],['geometric','기하학 중심'],['cute','귀여운 포인트'],['sparkle','스파클 중심'],['minimal','미니멀']].forEach(([v,t])=>{let op=document.createElement('option');op.value=v;op.textContent=t;if(layer.graphicMotifMode===v)op.selected=true;motif.appendChild(op)});
    motif.onchange=()=>{layer.graphicMotifMode=motif.value;layer.seed=Math.floor(Math.random()*1e9);persistAll();renderPatternListDebounced();renderMain()};
    gbox.appendChild(labeled('요소 세트',motif));
    let ggrid=document.createElement('div');ggrid.className='layer-editor-grid';
    ggrid.append(
      sliderRow('중앙 여백','graphicSafeArea',layer.graphicSafeArea,38,82,'%',v=>layer.graphicSafeArea=v),
      sliderRow('분산 균형','graphicBalance',layer.graphicBalance,45,100,'%',v=>layer.graphicBalance=v),
      sliderRow('작은 장식 크기','graphicSmallScale',layer.graphicSmallScale,40,200,'%',v=>layer.graphicSmallScale=v),
      sliderRow('큰 프레임 요소','graphicLargeScale',layer.graphicLargeScale,50,240,'%',v=>layer.graphicLargeScale=v),
      sliderRow('긴 막대·캡슐 크기','graphicBarScale',layer.graphicBarScale,45,220,'%',v=>layer.graphicBarScale=v),
      sliderRow('원·링 크기','graphicCircleScale',layer.graphicCircleScale,45,220,'%',v=>layer.graphicCircleScale=v)
    );
    let tip=document.createElement('div');tip.className='micro-copy';tip.textContent='크기를 크게 바꿔도 구도가 다시 섞이지 않도록 유지돼. ‘구도 새로 섞기’를 눌렀을 때만 배치 seed가 변경돼.';
    gbox.append(ggrid,tip);top.appendChild(gbox)
  }
  let controls=document.createElement('div');controls.className='layer-editor-grid';let graphicMode=layer.sourceType==='builtin'&&isGraphicCompositionPresetId(layer.presetId);if(isDashedGridPresetId(layer.presetId))controls.appendChild(sliderRow(isHeartDashedGridPresetId(layer.presetId)?'하트 점선 격자 전체 크기':'점선 체크 전체 크기','size',layer.size,36,360,'px',v=>layer.size=v));else controls.appendChild(sliderRow(graphicMode?'도형 전체 크기':'패턴 크기','size',layer.size,graphicMode?30:12,graphicMode?420:260,'px',v=>layer.size=v));if(!graphicMode){controls.appendChild(sliderRow('간격','gap',layer.gap,0,180,'px',v=>layer.gap=v));controls.appendChild(sliderRow('불규칙함','jitter',layer.jitter,0,100,'%',v=>layer.jitter=v))}controls.appendChild(sliderRow(isDashedGridPresetId(layer.presetId)?'전체 패턴 회전':'회전','rotation',layer.rotation,isDashedGridPresetId(layer.presetId)?-180:-45,isDashedGridPresetId(layer.presetId)?180:45,'°',v=>layer.rotation=v));controls.appendChild(sliderRow('위치 X','offsetX',layer.offsetX||0,-200,200,'px',v=>layer.offsetX=v));controls.appendChild(sliderRow('위치 Y','offsetY',layer.offsetY||0,-200,200,'px',v=>layer.offsetY=v));if(!graphicMode)controls.appendChild(sliderRow('선 두께','stroke',layer.stroke,0,18,'px',v=>layer.stroke=v));controls.appendChild(sliderRow('패턴 투명도','opacity',layer.opacity,0,100,'%',v=>layer.opacity=v));controls.appendChild(sliderRow(graphicMode?'장식 밀도':'포인트/디테일','detail',layer.detail,0,100,'%',v=>layer.detail=v));top.appendChild(controls);let offsetRow=document.createElement('div');offsetRow.className='section-title-row';offsetRow.innerHTML='<div class="control-subtitle">패턴이 애매하게 잘려 보일 때는 위치 X/Y를 살짝 움직여 반복 시작 위치를 조정할 수 있어. 숫자를 직접 입력해서 미세 조정도 가능해.</div><button id="resetOffsetBtn" class="mini-btn" type="button">오프셋 초기화</button>';top.appendChild(offsetRow);card.appendChild(top);root.appendChild(card);
  $('#layerEnabledToggle').onchange=e=>{layer.enabled=e.target.checked;persistAll();renderLayerSummary();renderMain()};
  if($('#randomSizeToggle'))$('#randomSizeToggle').onchange=e=>{layer.randomSize=e.target.checked;persistAll();renderPatternListDebounced();renderMain()};
  if($('#randomAngleToggle'))$('#randomAngleToggle').onchange=e=>{layer.randomAngle=e.target.checked;persistAll();renderPatternListDebounced();renderMain()};
  if($('#randomPositionToggle'))$('#randomPositionToggle').onchange=e=>{layer.randomPosition=e.target.checked;persistAll();renderPatternListDebounced();renderMain()};
  if($('#cleanAlignBtn'))$('#cleanAlignBtn').onclick=()=>{layer.randomSize=false;layer.randomAngle=false;layer.randomPosition=false;layer.jitter=0;layer.rotation=0;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
  if($('#resetOffsetBtn'))$('#resetOffsetBtn').onclick=()=>{layer.offsetX=0;layer.offsetY=0;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
  if($('#checkerTonePreview')){let sw=$('#checkerTonePreview');let previewColors=buildCheckerTonePalette(layer.checkerToneBase||layer.colors[1]||'#AFC3FF');sw.innerHTML='';previewColors.slice(1,5).forEach(c=>{let s=document.createElement('div');s.className='swatch';s.style.background=c;s.title=c;sw.appendChild(s)})}
  if($('#checkerToneModeToggle'))$('#checkerToneModeToggle').onchange=e=>{layer.checkerToneMode=e.target.checked;persistAll();};
  if($('#checkerToneBasePicker'))$('#checkerToneBasePicker').oninput=e=>{let value=e.target.value.toUpperCase();layer.checkerToneBase=value;$('#checkerToneBaseText').value=value;if(layer.checkerToneMode)applyCheckerTonePalette(layer,true);else{persistAll();renderLayerEditor()}};
  if($('#checkerToneBaseText'))$('#checkerToneBaseText').oninput=e=>{let value=e.target.value.toUpperCase();if(/^#[0-9A-F]{6}$/.test(value)){layer.checkerToneBase=value;$('#checkerToneBasePicker').value=value;if(layer.checkerToneMode)applyCheckerTonePalette(layer,true);else{persistAll();renderLayerEditor()}}};
  if($('#applyCheckerToneBtn'))$('#applyCheckerToneBtn').onclick=()=>{applyCheckerTonePalette(layer,true);toast('대표색 기준으로 체크용 3톤 팔레트를 적용했어.')}
}
function labeled(labelText,node){let wrap=document.createElement('label');wrap.textContent=labelText;wrap.appendChild(node);return wrap}
function sliderRow(label,key,val,min,max,unit,setter){let wrap=document.createElement('label');let head=document.createElement('div');head.style.display='flex';head.style.alignItems='center';head.style.justifyContent='space-between';head.style.gap='8px';let title=document.createElement('span');title.textContent=label;let controls=document.createElement('div');controls.style.display='flex';controls.style.alignItems='center';controls.style.gap='6px';let number=document.createElement('input');number.type='number';number.min=min;number.max=max;number.step='1';number.value=val;number.style.width='68px';number.style.padding='5px 7px';number.style.fontSize='11px';let applyVal=v=>{let next=Math.max(min,Math.min(max,Number(v)||0));setter(next);input.value=next;number.value=next;let stableGraphic=isGraphicCompositionPresetId(currentLayer().presetId)&&['size','graphicSafeArea','graphicBalance','graphicSmallScale','graphicLargeScale','graphicBarScale','graphicCircleScale','detail','opacity','rotation'].includes(key);if(!['seed','offsetX','offsetY'].includes(key)&&!stableGraphic){currentLayer().seed=Math.floor(Math.random()*1e9)}persistAll();renderPatternListDebounced();renderMain()};if(key==='offsetX'||key==='offsetY'){[-5,-1,1,5].forEach(step=>{let b=document.createElement('button');b.type='button';b.className='mini-btn';b.textContent=step>0?`+${step}`:`${step}`;b.style.padding='4px 6px';b.onclick=e=>{e.preventDefault();applyVal((+number.value||0)+step)};controls.appendChild(b)})}let unitSpan=document.createElement('span');unitSpan.textContent=unit;unitSpan.style.float='none';unitSpan.style.color='#8c83a0';controls.append(number,unitSpan);head.append(title,controls);wrap.appendChild(head);let input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.value=val;input.oninput=()=>applyVal(input.value);number.onchange=()=>applyVal(number.value);wrap.appendChild(input);return wrap}
function syncLayerUI(){setupLayerTabs();renderLayerSummary();try{renderLayerEditor()}catch(err){console.error('Layer editor render failed:',err);let root=$('#layerEditor');if(root)root.innerHTML='<div class="info-box"><strong>설정 패널을 다시 불러오는 중이야.</strong><div class="micro-copy">패턴 미리보기와 선택 기능은 계속 사용할 수 있어. 새로고침하면 설정 패널도 다시 시도돼.</div></div>'}updateSelected();persistAll()}
function renderPatternListDebounced(){clearTimeout(thumbTimer);thumbTimer=setTimeout(renderPatternList,160)}

async function shouldRouteAssetFileToPatternRestore(file){
  if(!file||file.type?.includes('svg')||/\.svg$/i.test(file.name||''))return false;
  if(await readPatternStudioMetadata(file).catch(()=>null))return true;
  return /^cute-pattern(?:-|_|\s)/i.test(file.name||'')||/^pattern(?:-|_|\s).*\d+x\d+/i.test(file.name||'')
}
async function handleAssetFiles(files){
  let added=0,addedAssets=[],restored=0;
  for(let file of files){
    try{
      if(await shouldRouteAssetFileToPatternRestore(file)){
        patternRestorePreviousState=null;await handlePatternRestoreFile(file);restored++;continue
      }
      let asset=await fileToAsset(file);userAssets.unshift(asset);addedAssets.unshift(asset);added++
    }catch(e){console.error(e)}
  }
  if(added){
    let layer=currentLayer();
    if(addedAssets[0]){layer.sourceType='uploaded';layer.assetId=addedAssets[0].id;layer.renderMode=layer.renderMode||'motif'}
    persistAll();syncLayerUI();renderAssetList();toast(`${added}개 모티프 에셋을 추가했어.`);renderMain()
  }else if(restored){
    renderAssetList()
  }
}
function readFileAsDataURL(file){return new Promise((resolve,reject)=>{let fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(file)})}
function readFileAsText(file){return new Promise((resolve,reject)=>{let fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsText(file)})}
async function fileToAsset(file){let kind=file.type.includes('svg')||file.name.toLowerCase().endsWith('.svg')?'svg':'raster';let dataURL=await readFileAsDataURL(file);let asset={id:uid('asset'),name:file.name,kind,dataURL,addedAt:Date.now(),svgText:'',svgColorMode:'original',tint:'#9B87F5'};if(kind==='svg')asset.svgText=await readFileAsText(file);await ensureAssetImage(asset,{svgColorMode:'original',colors:['#FFF','#9B87F5','#B9D7FF','#BFAAF2']}).catch(()=>null);return asset}
function renderAssetList(){let wrap=$('#assetList');wrap.innerHTML='';if(!userAssets.length){wrap.innerHTML='<div class="reference-preview empty">아직 업로드한 에셋이 없어. 위의 업로드 박스에 투명 PNG/SVG를 넣으면 바로 패턴용으로 사용할 수 있어.</div>';return}userAssets.forEach(asset=>{let card=document.createElement('div');card.className='asset-card';let thumb=asset._img?document.createElement('img'):document.createElement('div');thumb.className='asset-thumb'+(asset._img?'':' fallback');if(asset._img)thumb.src=asset._img.src;else thumb.textContent=asset.kind==='svg'?'◇':'▣';let meta=document.createElement('div');meta.className='asset-meta';meta.innerHTML=`<strong>${asset.name}</strong><small>${asset.kind==='svg'?'SVG (색상 변환 가능)':'PNG/JPG (크기·간격 조절 가능)'}</small>`;let acts=document.createElement('div');acts.className='asset-actions';let assign=document.createElement('button');assign.className='mini-btn';assign.textContent='현재 레이어에 적용';assign.onclick=()=>{let layer=currentLayer();layer.sourceType='uploaded';layer.assetId=asset.id;persistAll();syncLayerUI();renderAssetList();renderMain()};let del=document.createElement('button');del.className='mini-btn';del.textContent='삭제';del.onclick=()=>{if(!confirm('이 에셋을 삭제할까?'))return;userAssets=userAssets.filter(a=>a.id!==asset.id);state.layers.forEach(layer=>{if(layer.assetId===asset.id){layer.assetId='';layer.sourceType='builtin'}});persistAll();renderAssetList();syncLayerUI();renderMain()};acts.append(assign,del);card.append(thumb,meta,acts);if(currentLayer().sourceType==='uploaded'&&currentLayer().assetId===asset.id)card.style.borderColor='#9b87f0';wrap.appendChild(card)})}

function renderFavoritePreview(){let wrap=$('#favoritePreview');wrap.innerHTML='';if(!favorites.size){wrap.innerHTML='<span class="muted mini-copy">즐겨찾기한 패턴이 아직 없어.</span>';return}[...favorites].slice(0,18).forEach(id=>{let p=getPreset(id);let chip=document.createElement('button');chip.className='chip';chip.textContent=`★ ${p.name}`;chip.onclick=()=>{activeCategory='전체';setupCategories();selectPatternForActiveLayer(id);renderPatternList()};wrap.appendChild(chip)})}
function renderSavedPresets(){let wrap=$('#savedPresetList');wrap.innerHTML='';if(!myPresets.length){wrap.innerHTML='<div class="muted mini-copy">저장된 내 프리셋이 아직 없어.</div>';return}myPresets.forEach(item=>{let card=document.createElement('div');card.className='preset-card';let info=document.createElement('div');info.innerHTML=`<strong>${item.name}</strong><small>${new Date(item.savedAt).toLocaleString()}</small>`;let acts=document.createElement('div');acts.className='preset-actions';let apply=document.createElement('button');apply.className='mini-btn';apply.textContent='적용';apply.onclick=()=>{state=mergeState(clone(item.state));activeLayerIndex=0;persistAll();syncAll()};let del=document.createElement('button');del.className='mini-btn';del.textContent='삭제';del.onclick=()=>{myPresets=myPresets.filter(v=>v.id!==item.id);persistAll();renderSavedPresets();toast('프리셋을 삭제했어.')};acts.append(apply,del);card.append(info,acts);wrap.appendChild(card)})}
function saveCurrentPreset(){let name=prompt('저장할 프리셋 이름을 입력해줘.','내 패턴 프리셋');if(!name)return;myPresets.unshift({id:uid('preset'),name:name.trim()||'내 프리셋',savedAt:Date.now(),state:clone(stripStateForSave(state))});myPresets=myPresets.slice(0,40);persistAll();renderSavedPresets();toast('현재 설정을 내 프리셋에 저장했어.')}

function setupPalettes(){/* reserved for future UI विस्तार */}
function syncGlobalControls(){renderBgColorInputs();renderGradientOverlayEditor();$('#bgMode').value=state.bg.mode;$('#transparentBg').checked=state.bg.transparent;$('#gradientAngle').value=state.bg.gradientAngle;$('#gradientAngleVal').textContent=`${state.bg.gradientAngle}°`;$('#gradientControls').style.display=state.bg.mode==='linear'&&!state.bg.transparent?'block':'none';$('#watercolorControls').style.display=state.bg.mode==='watercolor'&&!state.bg.transparent?'block':'none';$('#backgroundOnly').checked=!!state.bg.backgroundOnly;$('#watercolorSpread').value=state.bg.watercolorSpread??62;$('#watercolorSpreadVal').textContent=`${state.bg.watercolorSpread??62}%`;$('#watercolorScale').value=state.bg.watercolorScale??58;$('#watercolorScaleVal').textContent=`${state.bg.watercolorScale??58}%`;$('#watercolorIrregular').value=state.bg.watercolorIrregular??72;$('#watercolorIrregularVal').textContent=`${state.bg.watercolorIrregular??72}%`;if($('#watercolorDefinition'))$('#watercolorDefinition').value=state.bg.watercolorDefinition??52;if($('#watercolorDefinitionVal'))$('#watercolorDefinitionVal').textContent=`${state.bg.watercolorDefinition??52}%`;if($('#watercolorSparkle'))$('#watercolorSparkle').value=state.bg.watercolorSparkle??28;if($('#watercolorSparkleVal'))$('#watercolorSparkleVal').textContent=`${state.bg.watercolorSparkle??28}%`;$('#watercolorTexture').checked=state.bg.watercolorTexture!==false;if($('#watercolorStyle'))$('#watercolorStyle').value=state.bg.watercolorStyle||'mist';let v=state.bg.vignette||{};if($('#vignetteEnabled'))$('#vignetteEnabled').checked=!!v.enabled;if($('#vignetteColor'))$('#vignetteColor').value=normalizeHexLike(v.color||'#6F55C9','#6F55C9');if($('#vignetteColorText'))$('#vignetteColorText').value=normalizeHexLike(v.color||'#6F55C9','#6F55C9');if($('#vignetteRange'))$('#vignetteRange').value=v.range??72;if($('#vignetteRangeVal'))$('#vignetteRangeVal').textContent=`${v.range??72}%`;if($('#vignetteStrength'))$('#vignetteStrength').value=v.strength??28;if($('#vignetteStrengthVal'))$('#vignetteStrengthVal').textContent=`${v.strength??28}%`;if($('#vignetteSoftness'))$('#vignetteSoftness').value=v.softness??28;if($('#vignetteSoftnessVal'))$('#vignetteSoftnessVal').textContent=`${v.softness??28}%`;if($('#vignetteControls'))$('#vignetteControls').style.display=v.enabled?'block':'none';$('#exportW').value=state.exportW;$('#exportH').value=state.exportH;$('#tileW').value=state.tileW;$('#tileH').value=state.tileH;resizePreviewCanvasToOutput()}
function refreshPreviewZoom(){
  let stage=$('#canvasStage');if(!stage||!canvas)return;
  let cs=getComputedStyle(stage),padX=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0),padY=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
  let availW=Math.max(120,stage.clientWidth-padX),availH=Math.max(120,stage.clientHeight-padY),ratio=(canvas.width||1)/(canvas.height||1);
  let fitW=Math.min(availW,availH*ratio),fitH=fitW/ratio;
  canvas.style.maxWidth='none';
  canvas.style.maxHeight='none';
  canvas.style.width=Math.max(80,fitW*zoom)+'px';
  canvas.style.height=Math.max(80,fitH*zoom)+'px'
}
function setZoom(v){zoom=clamp(v,.3,1.6);$('#zoomText').textContent=Math.round(zoom*100)+'%';refreshPreviewZoom()}
function renderCirclePreview(){if(!circleCtx||!circleCanvas)return;let w=circleCanvas.width,h=circleCanvas.height,r=Math.min(w,h)/2-4;circleCtx.clearRect(0,0,w,h);circleCtx.save();circleCtx.beginPath();circleCtx.arc(w/2,h/2,r,0,Math.PI*2);circleCtx.closePath();circleCtx.clip();circleCtx.drawImage(canvas,0,0,w,h);circleCtx.restore();circleCtx.save();circleCtx.beginPath();circleCtx.arc(w/2,h/2,r,0,Math.PI*2);circleCtx.lineWidth=8;circleCtx.strokeStyle='rgba(255,255,255,.96)';circleCtx.stroke();circleCtx.beginPath();circleCtx.arc(w/2,h/2,r,0,Math.PI*2);circleCtx.lineWidth=1.5;circleCtx.strokeStyle='rgba(210,198,240,.95)';circleCtx.stroke();circleCtx.restore();}
function randomizeAll(){
let palette=palettePresets[Math.floor(Math.random()*palettePresets.length)];state.bg.colors=[palette[0],palette[1]];state.bg.gradientStops=buildGradientStopsFromColors([palette[0],palette[1]]);state.layers.forEach((layer,i)=>{let candidates=PE.presets.filter(p=>(!$('#favoriteOnly').checked||favorites.has(p.id))&&(!$('#checkOnly')?.checked||checkPresetOnly(p)));let pool=candidates.length?candidates:PE.presets;let p=pool[Math.floor(Math.random()*Math.max(1,pool.length))];layer.sourceType='builtin';layer.presetId=p.id;let d=PE.defaults[p.id]||{};Object.assign(layer,d);layer.colors=normalizeColors(shuffle(palette.concat()).slice(0,4));layer.colors[4]=suggestLineColor(layer.colors);layer.size=clamp((d.size??layer.size)+(i*10),12,220);layer.gap=clamp((d.gap??layer.gap)+Math.floor(Math.random()*30),0,140);layer.jitter=clamp((d.jitter??20)+Math.floor(Math.random()*40),0,100);layer.rotation=Math.floor(-18+Math.random()*36);layer.opacity=clamp(100-i*18,20,100);layer.detail=Math.floor(25+Math.random()*70);layer.enabled=i===0?true:(Math.random()>.25);layer.randomSize=isUniformShapePresetId(p.id)?false:true;layer.randomAngle=isUniformShapePresetId(p.id)?false:true;layer.randomPosition=isUniformShapePresetId(p.id)?false:true;layer.offsetX=0;layer.offsetY=0;layer.row1OffsetX=0;layer.row1OffsetY=0;layer.row1Angle=0;layer.row2OffsetX=0;layer.row2OffsetY=0;layer.row2Angle=0;if(p.type==='graphic-composition'){layer.graphicSafeArea=d.graphicSafeArea??60;layer.graphicBarScale=d.graphicBarScale??100;layer.graphicCircleScale=d.graphicCircleScale??100;layer.graphicMotifMode=d.graphicMotifMode||'auto'}layer.checkerToneMode=false;layer.checkerToneBase=layer.colors[1];layer.seed=Math.floor(Math.random()*1e9)});persistAll();syncAll();toast('배경과 레이어 패턴을 랜덤으로 조합했어.')
}
async function exportPNG(seamless=false){
  let w=clampInt($('#exportW')?.value,16,8000,state.exportW||2000),
      h=clampInt($('#exportH')?.value,16,8000,state.exportH||2000);
  if(seamless){
    w=clampInt($('#tileW')?.value,16,4000,state.tileW||512);
    h=clampInt($('#tileH')?.value,16,4000,state.tileH||512)
  }else{
    state.exportW=w;state.exportH=h;
    resizePreviewCanvasToOutput()
  }
  if(seamless){state.tileW=w;state.tileH=h}
  persistAll();

  let out=document.createElement('canvas');out.width=w;out.height=h;
  let octx=out.getContext('2d',{alpha:true});
  resetCanvasRenderState(octx);
  octx.clearRect(0,0,w,h);

  if(!state.bg.transparent)drawBackground(octx,w,h);

  if(!state.bg.backgroundOnly) for(let layer of state.layers){
    if(!layer.enabled)continue;
    resetCanvasRenderState(octx);
    if(layer.sourceType==='builtin'){
      PE.render(octx,w,h,layerToPatternState(layer,seamless),getPreset(layer.presetId),1)
    }else{
      let asset=userAssets.find(v=>v.id===layer.assetId);
      if(asset){
        await ensureAssetImage(asset,layer).catch(()=>null);
        resetCanvasRenderState(octx);
        renderUploadedLayer(octx,w,h,layer,1,seamless)
      }
    }
    resetCanvasRenderState(octx)
  }

  // On transparent PNG export, never add canvas-wide effects that create dark/soft alpha haze.
  if(!state.bg.transparent){
    resetCanvasRenderState(octx);
    applyGradientOverlays(octx,w,h);
    applyVignette(octx,w,h)
  }

  resetCanvasRenderState(octx);
  let blob=await new Promise(r=>out.toBlob(r,'image/png'));
  if(!blob){toast('PNG 생성에 실패했어.');return}
  blob=await attachPatternStudioMetadata(blob,{schema:2,version:'2.9.1',savedAt:Date.now(),state:stripStateForSave(state),export:{w,h,seamless:!!seamless}});
  let link=document.createElement('a');link.href=URL.createObjectURL(blob);
  link.download=seamless?('cute-pattern-seamless-'+w+'x'+h+'.png'):('cute-pattern-'+w+'x'+h+'.png');
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1500);
  toast(w+'×'+h+(state.bg.transparent?' 투명':'')+' PNG를 저장했어.')
}

async function handleReferenceFile(file){
  if(!file)return;
  let ok=/^image\/(png|jpeg|webp)$/i.test(file.type||'')||/\.(png|jpe?g|webp)$/i.test(file.name||'');
  if(!ok){toast('JPG / JPEG / PNG / WEBP 이미지만 첨부할 수 있어.');return}
  try{
    if(referenceObjectUrl)URL.revokeObjectURL(referenceObjectUrl);
    referenceObjectUrl=URL.createObjectURL(file);
    referenceImage=await loadImage(referenceObjectUrl);
    referenceZoom=1;referencePanX=0;referencePanY=0;referenceSelectedColor='';referenceSelectedRgb=null;
    buildReferenceSampleCanvas();
    referencePalette=extractPalette(referenceImage,5);
    renderReferenceWorkspace();
    requestAnimationFrame(()=>drawReferenceCanvas());
    toast('참고 이미지를 불러왔어. 원하는 부분을 클릭해서 색상을 뽑아봐.')
  }catch(err){
    referenceImage=null;referencePalette=[];toast('참고 이미지를 불러오지 못했어.')
  }
}
function clearReferenceImage(){
  if(referenceObjectUrl){URL.revokeObjectURL(referenceObjectUrl);referenceObjectUrl=''}
  referenceImage=null;referenceSampleCanvas=null;referencePalette=[];referenceSelectedColor='';referenceSelectedRgb=null;referenceZoom=1;referencePanX=0;referencePanY=0;referenceViewMetrics=null;
  renderReferenceWorkspace()
}
function buildReferenceSampleCanvas(){
  if(!referenceImage){referenceSampleCanvas=null;return}
  let maxDim=4096,ratio=Math.min(1,maxDim/Math.max(referenceImage.naturalWidth||referenceImage.width,referenceImage.naturalHeight||referenceImage.height));
  let c=document.createElement('canvas');c.width=Math.max(1,Math.round((referenceImage.naturalWidth||referenceImage.width)*ratio));c.height=Math.max(1,Math.round((referenceImage.naturalHeight||referenceImage.height)*ratio));
  let cctx=c.getContext('2d',{willReadFrequently:true});cctx.drawImage(referenceImage,0,0,c.width,c.height);referenceSampleCanvas=c
}
function getReferenceViewportSize(){
  let viewport=$('#referenceViewport');if(!viewport)return {w:0,h:0,dpr:1};
  let rect=viewport.getBoundingClientRect(),w=Math.max(240,Math.round(rect.width||320)),h=Math.max(220,Math.round(rect.height||300)),dpr=Math.min(2,window.devicePixelRatio||1);return {w,h,dpr}
}
function drawReferenceCanvas(){
  let canvas=$('#referenceCanvas');if(!canvas||!referenceImage)return;
  let {w,h,dpr}=getReferenceViewportSize();canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';
  let cctx=canvas.getContext('2d');cctx.setTransform(dpr,0,0,dpr,0,0);cctx.clearRect(0,0,w,h);
  let iw=referenceImage.naturalWidth||referenceImage.width,ih=referenceImage.naturalHeight||referenceImage.height,fit=Math.min((w*.96)/iw,(h*.96)/ih),scale=fit*referenceZoom;
  let dw=iw*scale,dh=ih*scale,x=(w-dw)/2+referencePanX,y=(h-dh)/2+referencePanY;
  cctx.imageSmoothingEnabled=true;cctx.imageSmoothingQuality='high';cctx.drawImage(referenceImage,x,y,dw,dh);
  referenceViewMetrics={w,h,iw,ih,fit,scale,x,y};
  if($('#referenceZoomRange'))$('#referenceZoomRange').value=Math.round(referenceZoom*100);
  if($('#referenceZoomText'))$('#referenceZoomText').textContent=Math.round(referenceZoom*100)+'%'
}
function referenceCanvasPointToImage(clientX,clientY){
  let canvas=$('#referenceCanvas'),m=referenceViewMetrics;if(!canvas||!m)return null;
  let rect=canvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top,ix=(x-m.x)/m.scale,iy=(y-m.y)/m.scale;
  if(ix<0||iy<0||ix>=m.iw||iy>=m.ih)return null;
  return {ix,iy,x,y}
}
function sampleReferencePixel(ix,iy){
  if(!referenceSampleCanvas||!referenceImage)return null;
  let iw=referenceImage.naturalWidth||referenceImage.width,ih=referenceImage.naturalHeight||referenceImage.height;
  let sx=clamp(Math.floor(ix/iw*referenceSampleCanvas.width),0,referenceSampleCanvas.width-1),sy=clamp(Math.floor(iy/ih*referenceSampleCanvas.height),0,referenceSampleCanvas.height-1);
  let d=referenceSampleCanvas.getContext('2d',{willReadFrequently:true}).getImageData(sx,sy,1,1).data;
  if(d[3]<10)return null;return {hex:rgbToHex([d[0],d[1],d[2]]),rgb:[d[0],d[1],d[2]],sx,sy}
}
function setReferenceZoom(next,anchorClientX=null,anchorClientY=null){
  if(!referenceImage)return;
  next=clamp(Number(next)||1,.25,8);
  let old=referenceViewMetrics,anchor=null;
  if(old&&anchorClientX!=null&&anchorClientY!=null)anchor=referenceCanvasPointToImage(anchorClientX,anchorClientY);
  referenceZoom=next;
  if(anchor&&old){
    let {w,h}=old,newScale=old.fit*referenceZoom;
    let canvas=$('#referenceCanvas'),rect=canvas.getBoundingClientRect(),ax=anchorClientX-rect.left,ay=anchorClientY-rect.top;
    referencePanX=ax-(w-(old.iw*newScale))/2-anchor.ix*newScale;
    referencePanY=ay-(h-(old.ih*newScale))/2-anchor.iy*newScale
  }
  drawReferenceCanvas()
}
function resetReferenceView(){referenceZoom=1;referencePanX=0;referencePanY=0;drawReferenceCanvas()}
function renderReferenceMagnifier(clientX,clientY){
  let mag=$('#referenceMagnifier'),pt=referenceCanvasPointToImage(clientX,clientY);if(!mag||!pt||!referenceSampleCanvas){if(mag)mag.style.display='none';return}
  let sampled=sampleReferencePixel(pt.ix,pt.iy);if(!sampled){mag.style.display='none';return}
  let mc=mag.getContext('2d'),sampleSize=11,half=Math.floor(sampleSize/2),sx=clamp(sampled.sx-half,0,Math.max(0,referenceSampleCanvas.width-sampleSize)),sy=clamp(sampled.sy-half,0,Math.max(0,referenceSampleCanvas.height-sampleSize));
  mc.clearRect(0,0,mag.width,mag.height);mc.imageSmoothingEnabled=false;mc.drawImage(referenceSampleCanvas,sx,sy,sampleSize,sampleSize,0,0,mag.width,mag.height);
  mc.strokeStyle='rgba(255,255,255,.95)';mc.lineWidth=3;mc.strokeRect(mag.width/2-7,mag.height/2-7,14,14);mc.strokeStyle='rgba(0,0,0,.75)';mc.lineWidth=1;mc.strokeRect(mag.width/2-7,mag.height/2-7,14,14);
  let viewport=$('#referenceViewport'),vr=viewport.getBoundingClientRect(),x=clientX-vr.left+16,y=clientY-vr.top+16;
  if(x+130>vr.width)x-=150;if(y+130>vr.height)y-=150;mag.style.left=x+'px';mag.style.top=y+'px';mag.style.display='block'
}
function saveRecentReferenceColors(){
  recentReferenceColors=recentReferenceColors.filter(c=>/^#[0-9A-F]{6}$/.test(c)).slice(0,10);
  localStorage.setItem(STORAGE.recentReferenceColors,JSON.stringify(recentReferenceColors))
}
function addRecentReferenceColor(hex){
  hex=normalizeHexLike(hex,'#FFFFFF');recentReferenceColors=[hex,...recentReferenceColors.filter(c=>c!==hex)].slice(0,10);saveRecentReferenceColors();renderRecentReferenceColors()
}
function setReferenceSelectedColor(hex,rgb=null,{remember=true,autoApplyActive=false}={}){
  hex=normalizeHexLike(hex,'#FFFFFF');referenceSelectedColor=hex;let c=rgb||hexToRgb(hex);referenceSelectedRgb=Array.isArray(c)?c:[c.r,c.g,c.b];
  if(remember)addRecentReferenceColor(hex);renderReferenceSelectedColor();
  if(autoApplyActive&&activeReferenceColorInput)applyReferenceColorToActiveInput(hex)
}
function describeColorInput(el){
  if(!el)return '';
  let row=el.closest('.color-row'),label=row?.querySelector('.color-label')?.textContent?.trim();
  if(label)return label;
  let card=el.closest('.gradient-stop-card'),title=card?.querySelector('.gradient-stop-title')?.textContent?.trim();
  if(title)return '배경 '+title;
  if(el.id==='vignetteColor'||el.id==='vignetteColorText')return '비네트 색상';
  return el.getAttribute('aria-label')||el.id||'현재 색상 입력'
}
function rememberActiveReferenceColorInput(el){
  if(!el||el.tagName!=='INPUT')return;
  let isColor=el.type==='color',isHex=el.type==='text'&&(el.maxLength===7||/^#[0-9A-Fa-f]{0,6}$/.test(el.value||''));
  if(!isColor&&!isHex)return;activeReferenceColorInput=el;activeReferenceColorLabel=describeColorInput(el);openReferenceDockForColorInput();renderReferenceSelectedColor()
}
function applyReferenceColorToActiveInput(hex){
  let el=activeReferenceColorInput;if(!el){toast('먼저 적용할 색상 입력칸을 클릭해줘.');return false}
  hex=normalizeHexLike(hex,'#FFFFFF');
  if(el.type==='color'){el.value=hex;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
  else{el.value=hex;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
  toast((activeReferenceColorLabel||'현재 색상 입력')+'에 '+hex+' 적용');return true
}
function applyReferenceColor(kind,hex=referenceSelectedColor){
  if(!hex){toast('먼저 이미지에서 색상을 선택해줘.');return}
  hex=normalizeHexLike(hex,'#FFFFFF');let layer=currentLayer();
  if(kind==='active'){applyReferenceColorToActiveInput(hex);return}
  if(kind==='background'){
    setCanvasBackgroundColor(hex);persistAll();syncGlobalControls();renderMain();toast('배경색에 '+hex+' 적용');return
  }
  if(kind==='anchor'){
    let mode=layer.colorMode==='pattern-auto'?'pattern-auto':'auto';applyMasterTone(layer,hex,mode==='auto'&&!isDashedGridPresetId(layer.presetId),mode);persistAll();syncLayerUI();syncGlobalControls();renderPatternListDebounced();renderMain();toast((mode==='pattern-auto'?'패턴 대표색':'대표색')+'에 '+hex+' 적용');return
  }
  let index={pattern1:1,pattern2:2,pattern3:3,line:4}[kind];if(index===undefined)return;
  layer.colorMode='individual';layer.colors=normalizeColors(layer.colors);layer.colors[index]=hex;persistAll();syncLayerUI();renderPatternListDebounced();renderMain();
  let label={pattern1:'패턴 색상 1',pattern2:'패턴 색상 2',pattern3:'패턴 색상 3',line:'선 / 외곽선'}[kind];toast(label+'에 '+hex+' 적용')
}
function renderReferenceSelectedColor(){
  let sw=$('#referenceSelectedSwatch'),hex=$('#referenceSelectedHex'),rgb=$('#referenceSelectedRgb'),target=$('#referenceActiveTarget'),apply=$('#applyReferenceToActive');
  if(sw)sw.style.background=referenceSelectedColor||'transparent';
  if(hex)hex.textContent=referenceSelectedColor||'선택한 색상 없음';
  if(rgb)rgb.textContent=referenceSelectedRgb?('RGB '+referenceSelectedRgb.join(', ')):'이미지를 클릭하면 HEX / RGB가 표시돼.';
  if(target)target.textContent='활성 색상 입력: '+(activeReferenceColorLabel||'없음');
  if(apply)apply.disabled=!referenceSelectedColor||!activeReferenceColorInput
}
function extractPalette(img,count=5){
  let c=document.createElement('canvas'),max=160,ratio=Math.min(max/(img.naturalWidth||img.width),max/(img.naturalHeight||img.height),1);
  c.width=Math.max(24,Math.floor((img.naturalWidth||img.width)*ratio));c.height=Math.max(24,Math.floor((img.naturalHeight||img.height)*ratio));
  let x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,c.width,c.height);let data=x.getImageData(0,0,c.width,c.height).data,buckets=new Map();
  for(let i=0;i<data.length;i+=4){if(data[i+3]<180)continue;let rr=data[i],gg=data[i+1],bb=data[i+2],key=[Math.round(rr/24)*24,Math.round(gg/24)*24,Math.round(bb/24)*24].map(v=>clamp(v,0,255)).join(',');let item=buckets.get(key)||{count:0,r:0,g:0,b:0};item.count++;item.r+=rr;item.g+=gg;item.b+=bb;buckets.set(key,item)}
  let ranked=[...buckets.values()].map(v=>{let rgb=[Math.round(v.r/v.count),Math.round(v.g/v.count),Math.round(v.b/v.count)],hsl=rgbToHsl({r:rgb[0],g:rgb[1],b:rgb[2]});return {rgb,count:v.count,score:v.count*(.82+.30*hsl.s)}}).sort((aa,bb)=>bb.score-aa.score);
  let out=[],lightCount=0,darkCount=0;
  for(let item of ranked){let rgb=item.rgb,lum=(rgb[0]+rgb[1]+rgb[2])/3;if(lum>238&&lightCount>=1)continue;if(lum<28&&darkCount>=1)continue;if(out.every(v=>colorDistance(v,rgb)>50)){out.push(rgb);if(lum>238)lightCount++;if(lum<28)darkCount++;if(out.length>=count)break}}
  for(let item of ranked){if(out.length>=count)break;if(out.every(v=>colorDistance(v,item.rgb)>28))out.push(item.rgb)}
  return out.slice(0,count).map(rgbToHex)
}
function colorDistance(a,b){let dr=a[0]-b[0],dg=a[1]-b[1],db=a[2]-b[2];return Math.sqrt(dr*dr+dg*dg+db*db)}

function rgbToHex([r,g,b]){return '#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('').toUpperCase()}

// ---- Pattern image restore / embedded PNG state metadata ----
const PATTERN_RESTORE_META_KEY='CutePatternStudio';
const RESTORE_EXCLUDED_TYPES=new Set(['graphic-composition','sunburst-bg','soft-sunburst-bg','glossy-sun-bg','sparkle-glow-bg']);
function utf8ToBase64(text){
  let bytes=new TextEncoder().encode(text),binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(binary)
}
function base64ToUtf8(text){
  let binary=atob(text),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new TextDecoder().decode(bytes)
}
function crc32Bytes(bytes){
  let crc=0xFFFFFFFF;
  for(let i=0;i<bytes.length;i++){
    crc^=bytes[i];
    for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xEDB88320:0)
  }
  return (crc^0xFFFFFFFF)>>>0
}
function makePngTextChunk(keyword,text){
  let enc=new TextEncoder(),type=enc.encode('tEXt'),key=enc.encode(keyword),value=enc.encode(text),
      data=new Uint8Array(key.length+1+value.length);
  data.set(key,0);data[key.length]=0;data.set(value,key.length+1);
  let crcInput=new Uint8Array(type.length+data.length);crcInput.set(type);crcInput.set(data,type.length);
  let chunk=new Uint8Array(12+data.length),view=new DataView(chunk.buffer);
  view.setUint32(0,data.length);chunk.set(type,4);chunk.set(data,8);view.setUint32(8+data.length,crc32Bytes(crcInput));
  return chunk
}
async function attachPatternStudioMetadata(blob,payload){
  try{
    let bytes=new Uint8Array(await blob.arrayBuffer());
    if(bytes.length<12||bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71)return blob;
    let offset=8,iend=-1;
    while(offset+12<=bytes.length){
      let view=new DataView(bytes.buffer,bytes.byteOffset+offset),len=view.getUint32(0),
          type=String.fromCharCode(bytes[offset+4],bytes[offset+5],bytes[offset+6],bytes[offset+7]);
      if(type==='IEND'){iend=offset;break}
      offset+=12+len
    }
    if(iend<0)return blob;
    let packed='b64:'+utf8ToBase64(JSON.stringify(payload)),chunk=makePngTextChunk(PATTERN_RESTORE_META_KEY,packed);
    return new Blob([bytes.slice(0,iend),chunk,bytes.slice(iend)],{type:'image/png'})
  }catch(err){console.warn('PNG restore metadata attach failed',err);return blob}
}
async function readPatternStudioMetadata(file){
  try{
    if(!file||!(file.type==='image/png'||/\.png$/i.test(file.name||'')))return null;
    let bytes=new Uint8Array(await file.arrayBuffer());
    if(bytes.length<12||bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71)return null;
    let offset=8;
    while(offset+12<=bytes.length){
      let view=new DataView(bytes.buffer,bytes.byteOffset+offset),len=view.getUint32(0),
          type=String.fromCharCode(bytes[offset+4],bytes[offset+5],bytes[offset+6],bytes[offset+7]);
      if(type==='tEXt'&&offset+12+len<=bytes.length){
        let data=bytes.slice(offset+8,offset+8+len),zero=data.indexOf(0);
        if(zero>0){
          let key=new TextDecoder().decode(data.slice(0,zero));
          if(key===PATTERN_RESTORE_META_KEY){
            let value=new TextDecoder().decode(data.slice(zero+1));
            if(value.startsWith('b64:'))return JSON.parse(base64ToUtf8(value.slice(4)))
          }
        }
      }
      if(type==='IEND')break;
      offset+=12+len
    }
  }catch(err){console.warn('PNG restore metadata read failed',err)}
  return null
}
function buildRestoreSampleCanvas(img,maxDim=192){
  let iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,ratio=Math.min(1,maxDim/Math.max(iw,ih)),
      c=document.createElement('canvas');
  c.width=Math.max(24,Math.round(iw*ratio));c.height=Math.max(24,Math.round(ih*ratio));
  let x=c.getContext('2d',{willReadFrequently:true});x.clearRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
  return c
}
function restoreImageHasTransparency(canvas){
  let d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data,
      transparent=0,total=d.length/4;
  for(let i=3;i<d.length;i+=4)if(d[i]<245)transparent++;
  return transparent/Math.max(1,total)>.015
}
function estimateRestoreBackground(canvas,palette,transparent){
  if(transparent)return '#FFFFFF';
  let x=canvas.getContext('2d',{willReadFrequently:true}),d=x.getImageData(0,0,canvas.width,canvas.height).data,
      buckets=new Map(),w=canvas.width,h=canvas.height,border=Math.max(2,Math.round(Math.min(w,h)*.08));
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
    if(xx>=border&&xx<w-border&&yy>=border&&yy<h-border)continue;
    let i=(yy*w+xx)*4;if(d[i+3]<200)continue;
    let key=[Math.round(d[i]/20)*20,Math.round(d[i+1]/20)*20,Math.round(d[i+2]/20)*20].map(v=>clamp(v,0,255)).join(',');
    let b=buckets.get(key)||{n:0,r:0,g:0,b:0};b.n++;b.r+=d[i];b.g+=d[i+1];b.b+=d[i+2];buckets.set(key,b)
  }
  let best=[...buckets.values()].sort((a,b)=>b.n-a.n)[0];
  if(best)return rgbToHex([best.r/best.n,best.g/best.n,best.b/best.n]);
  return palette[0]||'#FFFFFF'
}
function buildRestoreColors(palette,bg){
  let bgRgb=Object.values(hexToRgb(bg)),unique=(palette||[]).filter(c=>{
    let rgb=Object.values(hexToRgb(c));return colorDistance(rgb,bgRgb)>20
  });
  if(!unique.length)unique=(palette||[]).slice();
  unique.sort((a,b)=>luminance(a)-luminance(b));
  let p1=unique[0]||'#AFC3FF',p2=unique[1]||mixHex(p1,'#FFFFFF',.45),
      p3=unique[2]||unique[unique.length-1]||mixHex(p1,'#FFFFFF',.72),
      line=unique[0]||p1;
  return normalizeColors([bg,p1,p2,p3,line])
}
function restoreFeatureVector(canvas){
  let {width:w,height:h}=canvas,d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data,
      gray=new Float32Array(w*h),alpha=new Float32Array(w*h),edge=new Float32Array(w*h);
  for(let i=0,p=0;i<d.length;i+=4,p++){alpha[p]=d[i+3]/255;gray[p]=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let i=y*w+x,x2=Math.min(w-1,x+1),y2=Math.min(h-1,y+1),
        ex=Math.abs(gray[y*w+x2]-gray[i])+.8*Math.abs(alpha[y*w+x2]-alpha[i]),
        ey=Math.abs(gray[y2*w+x]-gray[i])+.8*Math.abs(alpha[y2*w+x]-alpha[i]);
    edge[i]=Math.min(1,ex+ey)
  }
  return {gray,alpha,edge}
}
function vectorSimilarity(a,b){
  if(!a||!b||a.length!==b.length||!a.length)return 0;
  let ma=0,mb=0;for(let i=0;i<a.length;i++){ma+=a[i];mb+=b[i]}ma/=a.length;mb/=b.length;
  let num=0,da=0,db=0;
  for(let i=0;i<a.length;i++){let aa=a[i]-ma,bb=b[i]-mb;num+=aa*bb;da+=aa*aa;db+=bb*bb}
  if(da<1e-8||db<1e-8){
    let diff=0;for(let i=0;i<a.length;i++)diff+=Math.abs(a[i]-b[i]);
    return Math.max(0,1-diff/a.length)
  }
  return clamp((num/Math.sqrt(da*db)+1)/2,0,1)
}
function restoreFeatureScore(source,candidate){
  let e=vectorSimilarity(source.edge,candidate.edge),g=vectorSimilarity(source.gray,candidate.gray),
      a=vectorSimilarity(source.alpha,candidate.alpha),mean=(v)=>{let s=0;for(let n of v)s+=n;return s/v.length},
      density=1-Math.min(1,Math.abs(mean(source.edge)-mean(candidate.edge))*4);
  return clamp(e*.56+g*.22+a*.12+density*.10,0,1)
}
function restoreCandidatePresets(){
  return PE.presets.filter(p=>!RESTORE_EXCLUDED_TYPES.has(p.type)&&p.id!=='torn-checker')
}
function buildRestoreCandidateLayer(preset,palette,size,rotation=0){
  let d=PE.defaults[preset.id]||{},layer=defaultLayer(0,preset.id,true);
  Object.assign(layer,d);
  layer.sourceType='builtin';layer.presetId=preset.id;layer.size=size;layer.rotation=rotation;
  layer.jitter=d.jitter??0;layer.gap=isBasicZeroGapPresetId(preset.id)?0:(d.gap??layer.gap??0);
  layer.stroke=d.stroke??layer.stroke;layer.opacity=d.opacity??100;layer.detail=d.detail??layer.detail;
  layer.colorMode='individual';layer.colors=normalizeColors(palette);layer.masterColor=layer.colors[1];layer.seed=47291;
  if(layer.simpleDiamondColor!==undefined)layer.simpleDiamondColor=layer.colors[1];
  if(layer.diamondColor!==undefined)layer.diamondColor=layer.colors[1];
  if(layer.argyleLineColor!==undefined)layer.argyleLineColor=layer.colors[4];
  if(layer.dashedLineColor!==undefined)layer.dashedLineColor=layer.colors[4];
  if(layer.dashedHeartColor!==undefined)layer.dashedHeartColor=layer.colors[3];
  if(layer.airyStripeColor!==undefined)layer.airyStripeColor=layer.colors[4];
  if(layer.airyPointColor!==undefined)layer.airyPointColor=layer.colors[3];
  if(layer.milkyCheckColor!==undefined)layer.milkyCheckColor=layer.colors[2];
  if(layer.milkyMiniColor!==undefined)layer.milkyMiniColor=layer.colors[3];
  return layer
}
function renderRestoreCandidate(preset,palette,size,rotation,w,h,transparent){
  let c=document.createElement('canvas');c.width=w;c.height=h;let x=c.getContext('2d',{willReadFrequently:true}),
      layer=buildRestoreCandidateLayer(preset,palette,size,rotation),s=layerToPatternState(layer,false);
  resetCanvasRenderState(x);x.clearRect(0,0,w,h);
  s.skipBackground=false;s.transparentBg=transparent;s.bgMode='solid';s.anchorExact=false;
  PE.render(x,w,h,s,preset,w/2000);
  return c
}
async function analyzePatternRestoreImage(img){
  let source=buildRestoreSampleCanvas(img,192),transparent=restoreImageHasTransparency(source),
      palette=extractPalette(img,5),bg=estimateRestoreBackground(source,palette,transparent),
      colors=buildRestoreColors(palette,bg),features=restoreFeatureVector(source),
      presets=restoreCandidatePresets(),results=[],checks=0;
  for(let preset of presets){
    let d=PE.defaults[preset.id]||{},base=Math.max(12,Number(d.size)||72),
        sizes=[.48,.62,.78,.92,1,1.18,1.42,1.72,2.05].map(m=>clamp(Math.round(base*m),12,240)),
        uniq=[...new Set(sizes)],best=null;
    for(let size of uniq){
      let cand=renderRestoreCandidate(preset,colors,size,0,source.width,source.height,transparent),
          score=restoreFeatureScore(features,restoreFeatureVector(cand));
      if(!best||score>best.score)best={id:preset.id,size,rotation:0,score};
      if(++checks%28===0)await new Promise(r=>requestAnimationFrame(r))
    }
    if(best)results.push(best)
  }
  results.sort((a,b)=>b.score-a.score);
  let refined=[];
  for(let seed of results.slice(0,5)){
    let preset=getPreset(seed.id),sizes=[.82,.91,1,1.09,1.18].map(m=>clamp(Math.round(seed.size*m),12,260)),
        rotations=[-45,-30,-15,0,15,30,45],best=seed;
    for(let size of [...new Set(sizes)])for(let rotation of rotations){
      let cand=renderRestoreCandidate(preset,colors,size,rotation,source.width,source.height,transparent),
          score=restoreFeatureScore(features,restoreFeatureVector(cand));
      if(score>best.score)best={id:preset.id,size,rotation,score};
      if(++checks%24===0)await new Promise(r=>requestAnimationFrame(r))
    }
    refined.push(best)
  }
  refined.sort((a,b)=>b.score-a.score);
  return {
    exact:false,transparent,bg,colors,palette,
    width:img.naturalWidth||img.width,height:img.naturalHeight||img.height,
    candidates:refined.slice(0,3)
  }
}
function applyRestoreCandidate(candidate,result=patternRestoreResult,{remember=true}={}){
  if(!candidate||!result)return;
  if(remember&&!patternRestorePreviousState)patternRestorePreviousState=clone(stripStateForSave(state));
  state.exportW=clampInt(result.width,16,8000,state.exportW||2000);
  state.exportH=clampInt(result.height,16,8000,state.exportH||2000);
  state.bg.transparent=!!result.transparent;state.bg.mode='solid';state.bg.colors=[result.bg,result.bg];
  state.bg.gradientStops=buildGradientStopsFromColors([result.bg,result.bg]);state.bg.backgroundOnly=false;
  state.bg.vignette={enabled:false,color:'#6F55C9',range:72,strength:28,softness:28};
  state.gradientOverlays={overlay1:defaultGradientOverlay(1),overlay2:defaultGradientOverlay(2)};
  let preset=getPreset(candidate.id),layer=buildRestoreCandidateLayer(preset,result.colors,candidate.size,candidate.rotation);
  state.layers=[layer];activeLayerIndex=0;
  persistAll();syncAll();renderPatternRestoreResult()
}
function restoreExactState(meta,img){
  if(!meta?.state)return false;
  let missingAsset=(meta.state.layers||[]).some(layer=>layer?.sourceType==='uploaded'&&layer.assetId&&!userAssets.some(a=>a.id===layer.assetId));
  if(missingAsset)return false;
  if(!patternRestorePreviousState)patternRestorePreviousState=clone(stripStateForSave(state));
  state=mergeState(meta.state);
  state.exportW=clampInt(img.naturalWidth||img.width,16,8000,state.exportW||2000);
  state.exportH=clampInt(img.naturalHeight||img.height,16,8000,state.exportH||2000);
  activeLayerIndex=0;persistAll();syncAll();return true
}
function renderPatternRestoreResult(){
  let root=$('#patternRestoreResult'),status=$('#patternRestoreStatus');if(!root)return;
  root.innerHTML='';
  if(patternRestoreBusy){if(status)status.textContent='패턴과 색상을 분석 중…';root.innerHTML='<div class="pattern-restore-loading">이미지 구조를 내장 패턴들과 비교하고 있어.</div>';return}
  if(!patternRestoreResult){if(status)status.textContent='이미지를 첨부하면 분석 결과가 여기에 표시돼.';return}
  let r=patternRestoreResult;
  if(status)status.textContent=r.exact?'이 프로그램의 복원 데이터를 확인했어.':'픽셀 분석으로 가장 가까운 패턴을 찾았어.';
  let summary=document.createElement('div');summary.className='pattern-restore-summary';
  let confidence=r.exact?'정확 복원':(r.candidates?.[0]?Math.round(r.candidates[0].score*100)+'% 유사도':'분석 불가');
  summary.innerHTML='<strong>'+(r.exact?'설정 데이터로 복원 완료':'분석 결과 적용 완료')+'</strong><span>원본 '+r.width+'×'+r.height+'px · '+confidence+'</span>';
  let palette=document.createElement('div');palette.className='pattern-restore-palette';
  (r.palette||r.colors||[]).slice(0,5).forEach(c=>{let sw=document.createElement('span');sw.title=c;sw.style.background=c;palette.appendChild(sw)});
  root.append(summary,palette);
  if(!r.exact&&r.candidates?.length){
    let list=document.createElement('div');list.className='pattern-restore-candidates';
    r.candidates.forEach((cand,i)=>{
      let p=getPreset(cand.id),b=document.createElement('button');b.type='button';b.className='pattern-restore-candidate'+(i===0?' best':'');
      b.innerHTML='<strong>'+(i===0?'추천 · ':'')+p.name+'</strong><span>패턴 크기 '+cand.size+' · 회전 '+cand.rotation+'° · '+Math.round(cand.score*100)+'%</span>';
      b.onclick=()=>applyRestoreCandidate(cand,r,{remember:false});list.appendChild(b)
    });
    root.appendChild(list)
  }
  if(patternRestorePreviousState){
    let undo=document.createElement('button');undo.type='button';undo.className='mini-btn';undo.textContent='분석 전 작업으로 되돌리기';
    undo.onclick=()=>{state=mergeState(clone(patternRestorePreviousState));patternRestorePreviousState=null;activeLayerIndex=0;persistAll();syncAll();renderPatternRestoreResult();toast('분석 전 작업으로 되돌렸어.')};
    root.appendChild(undo)
  }
}
async function handlePatternRestoreFile(file){
  if(!file)return;
  let ok=/^image\/(png|jpeg|webp)$/i.test(file.type||'')||/\.(png|jpe?g|webp)$/i.test(file.name||'');
  if(!ok){toast('PNG / JPG / JPEG / WEBP 이미지만 분석할 수 있어.');return}
  patternRestoreBusy=true;patternRestoreResult=null;renderPatternRestoreResult();
  try{
    if(patternRestoreObjectUrl)URL.revokeObjectURL(patternRestoreObjectUrl);
    patternRestoreObjectUrl=URL.createObjectURL(file);
    patternRestoreImage=await loadImage(patternRestoreObjectUrl);
    let preview=$('#patternRestorePreview');if(preview){preview.src=patternRestoreObjectUrl;preview.hidden=false}
    patternRestorePreviousState=clone(stripStateForSave(state));
    let meta=await readPatternStudioMetadata(file);
    if(meta?.state&&restoreExactState(meta,patternRestoreImage)){
      patternRestoreResult={
        exact:true,width:patternRestoreImage.naturalWidth||patternRestoreImage.width,
        height:patternRestoreImage.naturalHeight||patternRestoreImage.height,
        palette:extractPalette(patternRestoreImage,5),colors:currentLayer().colors||[],candidates:[]
      };
      toast('이 프로그램에서 저장한 설정을 정확하게 복원했어.')
    }else{
      patternRestoreResult=await analyzePatternRestoreImage(patternRestoreImage);
      let best=patternRestoreResult.candidates?.[0];
      if(best){applyRestoreCandidate(best,patternRestoreResult,{remember:false});toast('이미지에서 가장 가까운 패턴과 색상을 복원했어.')}
      else toast('패턴 후보를 찾지 못했어.')
    }
  }catch(err){
    console.error('Pattern restore failed',err);patternRestoreResult=null;toast('이미지 분석 중 오류가 발생했어.')
  }finally{patternRestoreBusy=false;renderPatternRestoreResult()}
}
function bindPatternRestoreControls(){
  let input=$('#patternRestoreInput'),pick=$('#patternRestorePickBtn'),drop=$('#patternRestoreDropzone');
  if(!input||!pick||!drop)return;
  pick.onclick=()=>input.click();
  drop.onclick=e=>{if(e.target.closest('button'))return;input.click()};
  input.onchange=()=>{let file=input.files?.[0];if(file)handlePatternRestoreFile(file);input.value=''};
  ['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('dragover')}));
  ['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('dragover')}));
  drop.addEventListener('drop',e=>{let file=[...(e.dataTransfer?.files||[])][0];if(file)handlePatternRestoreFile(file)});
  renderPatternRestoreResult()
}


// ---- v2.9 advanced editable pattern reconstruction ----
function buildRestoreSampleInfo(img,maxDim=240){
  let iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,
      scale=Math.min(1,maxDim/Math.max(1,iw,ih)),canvas=document.createElement('canvas');
  canvas.width=Math.max(24,Math.round(iw*scale));canvas.height=Math.max(24,Math.round(ih*scale));
  let x=canvas.getContext('2d',{willReadFrequently:true});x.clearRect(0,0,canvas.width,canvas.height);
  x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(img,0,0,canvas.width,canvas.height);
  return {canvas,scale,iw,ih}
}
function restoreRgbDistance(a,b){
  let dr=a[0]-b[0],dg=a[1]-b[1],db=a[2]-b[2];return Math.sqrt(dr*dr+dg*dg+db*db)
}
function restoreHexRgb(hex){let c=hexToRgb(hex);return [c.r,c.g,c.b]}
function extractRestorePaletteStable(img,count=6){
  let info=buildRestoreSampleInfo(img,260),c=info.canvas,x=c.getContext('2d',{willReadFrequently:true}),
      d=x.getImageData(0,0,c.width,c.height).data,w=c.width,h=c.height,buckets=new Map();
  const px=(xx,yy)=>{
    xx=clamp(xx,0,w-1);yy=clamp(yy,0,h-1);let i=(yy*w+xx)*4;return [d[i],d[i+1],d[i+2],d[i+3]]
  };
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
    let i=(yy*w+xx)*4,a=d[i+3]/255;if(a<.12)continue;
    let r=d[i],g=d[i+1],b=d[i+2],r2=px(Math.min(w-1,xx+1),yy),d2=px(xx,Math.min(h-1,yy+1)),
        edge=(Math.abs(r-r2[0])+Math.abs(g-r2[1])+Math.abs(b-r2[2])+Math.abs(r-d2[0])+Math.abs(g-d2[1])+Math.abs(b-d2[2]))/(255*6),
        flatWeight=edge<.025?4:edge<.07?2.3:edge<.14?1.15:.35,
        weight=a*flatWeight,q=16,key=[Math.round(r/q)*q,Math.round(g/q)*q,Math.round(b/q)*q].map(v=>clamp(v,0,255)).join(',');
    let item=buckets.get(key)||{weight:0,count:0,r:0,g:0,b:0};
    item.weight+=weight;item.count++;item.r+=r*weight;item.g+=g*weight;item.b+=b*weight;buckets.set(key,item)
  }
  let ranked=[...buckets.values()].filter(v=>v.weight>0).map(v=>{
    let rgb=[Math.round(v.r/v.weight),Math.round(v.g/v.weight),Math.round(v.b/v.weight)];
    return {rgb,score:v.weight*(1+.15*(rgbToHsl({r:rgb[0],g:rgb[1],b:rgb[2]}).s||0))}
  }).sort((a,b)=>b.score-a.score),out=[];
  for(let item of ranked){
    if(out.every(v=>restoreRgbDistance(v,item.rgb)>26)){out.push(item.rgb);if(out.length>=count)break}
  }
  for(let item of ranked){
    if(out.length>=count)break;
    if(out.every(v=>restoreRgbDistance(v,item.rgb)>14))out.push(item.rgb)
  }
  return out.slice(0,count).map(rgbToHex)
}
function estimateRestoreBackgroundAdvanced(sampleInfo,palette,transparent){
  if(transparent)return '#FFFFFF';
  let c=sampleInfo.canvas,x=c.getContext('2d',{willReadFrequently:true}),d=x.getImageData(0,0,c.width,c.height).data,
      w=c.width,h=c.height,border=Math.max(2,Math.round(Math.min(w,h)*.10)),buckets=new Map();
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
    if(xx>=border&&xx<w-border&&yy>=border&&yy<h-border)continue;
    let i=(yy*w+xx)*4,a=d[i+3]/255;if(a<.7)continue;
    let q=14,key=[Math.round(d[i]/q)*q,Math.round(d[i+1]/q)*q,Math.round(d[i+2]/q)*q].map(v=>clamp(v,0,255)).join(',');
    let item=buckets.get(key)||{n:0,r:0,g:0,b:0};item.n+=a;item.r+=d[i]*a;item.g+=d[i+1]*a;item.b+=d[i+2]*a;buckets.set(key,item)
  }
  let best=[...buckets.values()].sort((a,b)=>b.n-a.n)[0];
  return best?rgbToHex([best.r/best.n,best.g/best.n,best.b/best.n]):(palette[0]||'#FFFFFF')
}
function buildRestoreColorsAdvanced(palette,bg){
  let bgRgb=restoreHexRgb(bg),items=(palette||[]).map(c=>({c,dist:restoreRgbDistance(restoreHexRgb(c),bgRgb)}))
      .filter(v=>v.dist>10).sort((a,b)=>b.dist-a.dist);
  let main=items[0]?.c||'#AFC3FF',second=items[1]?.c||mixHex(main,bg,.40),
      third=items[2]?.c||mixHex(main,bg,.70),line=items[0]?.c||main;
  return normalizeColors([bg,main,second,third,line])
}
function restoreProfileStats(arr){
  if(!arr.length)return {min:0,max:0,mean:0,median:0};
  let min=Infinity,max=-Infinity,sum=0,copy=Array.from(arr).sort((a,b)=>a-b);
  for(let v of arr){min=Math.min(min,v);max=Math.max(max,v);sum+=v}
  return {min,max,mean:sum/arr.length,median:copy[Math.floor(copy.length/2)]}
}
function smoothRestoreProfile(arr,radius=1){
  let out=new Float32Array(arr.length);
  for(let i=0;i<arr.length;i++){let sum=0,n=0;for(let j=Math.max(0,i-radius);j<=Math.min(arr.length-1,i+radius);j++){sum+=arr[j];n++}out[i]=sum/n}
  return out
}
function restoreAxisProfiles(canvas,bgHex,axis){
  let x=canvas.getContext('2d',{willReadFrequently:true}),w=canvas.width,h=canvas.height,d=x.getImageData(0,0,w,h).data,
      len=axis==='x'?w:h,other=axis==='x'?h:w,edge=new Float32Array(len),fg=new Float32Array(len),bg=restoreHexRgb(bgHex),
      stride=Math.max(1,Math.floor(other/180));
  for(let a=0;a<len;a++){
    let e=0,f=0,n=0;
    for(let b=0;b<other;b+=stride){
      let xx=axis==='x'?a:b,yy=axis==='x'?b:a,prev=Math.max(0,a-1),
          pxx=axis==='x'?prev:b,pyy=axis==='x'?b:prev,
          i=(yy*w+xx)*4,pi=(pyy*w+pxx)*4,alpha=d[i+3]/255,pa=d[pi+3]/255;
      if(alpha<.03&&pa<.03)continue;
      let rgb=[d[i],d[i+1],d[i+2]],prgb=[d[pi],d[pi+1],d[pi+2]];
      e+=(restoreRgbDistance(rgb,prgb)/441)*Math.max(alpha,pa);
      f+=Math.max(restoreRgbDistance(rgb,bg)/441,Math.abs(alpha-pa)*.85,alpha<.98?(1-alpha)*.45:0);
      n++
    }
    edge[a]=n?e/n:0;fg[a]=n?f/n:0
  }
  return {edge:smoothRestoreProfile(edge,1),fg:smoothRestoreProfile(fg,1)}
}
function restoreProfileCorrelation(profile,lag){
  let n=profile.length-lag;if(n<8)return -1;
  let ma=0,mb=0;for(let i=0;i<n;i++){ma+=profile[i];mb+=profile[i+lag]}ma/=n;mb/=n;
  let num=0,da=0,db=0,err=0;
  for(let i=0;i<n;i++){let a=profile[i]-ma,b=profile[i+lag]-mb;num+=a*b;da+=a*a;db+=b*b;err+=Math.abs(profile[i]-profile[i+lag])}
  let corr=(da>1e-10&&db>1e-10)?num/Math.sqrt(da*db):0,st=restoreProfileStats(profile),range=Math.max(1e-5,st.max-st.min),
      similarity=1-Math.min(1,(err/n)/range);
  return clamp((corr+1)*.34+similarity*.32,0,1)
}
function estimateRestorePeriod(profile){
  let n=profile.length,maxLag=Math.min(Math.floor(n*.48),180);if(maxLag<5)return {period:0,score:0};
  let candidates=[];
  for(let lag=4;lag<=maxLag;lag++){
    if(n/lag<2.05)continue;
    let score=restoreProfileCorrelation(profile,lag)-Math.min(.06,lag/n*.05);
    candidates.push({lag,score})
  }
  candidates.sort((a,b)=>b.score-a.score);
  if(!candidates.length)return {period:0,score:0};
  let top=candidates[0],near=candidates.filter(c=>c.score>=top.score-.025).sort((a,b)=>a.lag-b.lag);
  let chosen=near[0]||top;
  // Reject tiny harmonic lags unless they are almost as structurally strong as a larger repeated spacing.
  let larger=candidates.filter(c=>c.lag>=chosen.lag*1.7&&c.lag<=chosen.lag*2.3&&c.score>=chosen.score-.018).sort((a,b)=>b.score-a.score)[0];
  if(chosen.lag<9&&larger)chosen=larger;
  return {period:chosen.lag,score:clamp(chosen.score,0,1)}
}
function restoreProfileRuns(profile,period=0){
  let st=restoreProfileStats(profile),range=st.max-st.median;if(range<1e-5)return [];
  let threshold=st.median+range*.42,runs=[],start=-1;
  for(let i=0;i<=profile.length;i++){
    let on=i<profile.length&&profile[i]>=threshold;
    if(on&&start<0)start=i;
    if(!on&&start>=0){let len=i-start;if(len>0&&(!period||len<period*.7))runs.push({start,end:i-1,len,center:(start+i-1)/2,peak:Math.max(...Array.from(profile.slice(start,i)))});start=-1}
  }
  return runs
}
function restoreMedian(values,fallback=0){
  let v=values.filter(Number.isFinite).sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:fallback
}
function estimateRestoreBandWidth(profile,period){
  let runs=restoreProfileRuns(profile,period);if(!runs.length)return 0;
  return restoreMedian(runs.map(r=>r.len),0)
}
function estimateRestorePhase(profile,period){
  period=Math.round(period);if(!period||period<2)return 0;
  let sums=new Float64Array(period),counts=new Uint32Array(period);
  for(let i=0;i<profile.length;i++){let r=((i%period)+period)%period;sums[r]+=profile[i];counts[r]++}
  let best=0,bv=-Infinity;for(let r=0;r<period;r++){let v=counts[r]?sums[r]/counts[r]:0;if(v>bv){bv=v;best=r}}
  return best
}
function estimateRestoreDash(canvas,bgHex,verticalCoord,scale){
  let x=canvas.getContext('2d',{willReadFrequently:true}),w=canvas.width,h=canvas.height,d=x.getImageData(0,0,w,h).data,
      xx=clamp(Math.round(verticalCoord),0,w-1),bg=restoreHexRgb(bgHex),profile=new Float32Array(h);
  for(let y=0;y<h;y++){
    let sum=0,n=0;
    for(let dx=-1;dx<=1;dx++){
      let cx=clamp(xx+dx,0,w-1),i=(y*w+cx)*4,a=d[i+3]/255;if(a<.03)continue;
      sum+=Math.max(restoreRgbDistance([d[i],d[i+1],d[i+2]],bg)/441,a<.98?(1-a)*.5:0);n++
    }
    profile[y]=n?sum/n:0
  }
  let st=restoreProfileStats(profile),threshold=st.median+(st.max-st.median)*.45,runs=[],gaps=[],start=-1,lastEnd=-1;
  for(let i=0;i<=profile.length;i++){
    let on=i<profile.length&&profile[i]>=threshold;
    if(on&&start<0)start=i;
    if(!on&&start>=0){if(lastEnd>=0&&start-lastEnd>0)gaps.push(start-lastEnd);runs.push(i-start);lastEnd=i;start=-1}
  }
  return {dashLength:Math.max(1,Math.round(restoreMedian(runs,0)/Math.max(scale,.001))),dashGap:Math.max(1,Math.round(restoreMedian(gaps,0)/Math.max(scale,.001)))}
}
function estimateRestoreStructure(sampleInfo,bgHex){
  let px=restoreAxisProfiles(sampleInfo.canvas,bgHex,'x'),py=restoreAxisProfiles(sampleInfo.canvas,bgHex,'y'),
      rx=estimateRestorePeriod(px.edge),ry=estimateRestorePeriod(py.edge),
      sx=Math.max(sampleInfo.scale,.001),
      periodX=rx.period?rx.period/sx:0,periodY=ry.period?ry.period/sx:0,
      bandX=estimateRestoreBandWidth(px.fg,rx.period)/sx,bandY=estimateRestoreBandWidth(py.fg,ry.period)/sx,
      phaseX=rx.period?estimateRestorePhase(px.fg,rx.period)/sx:0,phaseY=ry.period?estimateRestorePhase(py.fg,ry.period)/sx:0,
      dash=estimateRestoreDash(sampleInfo.canvas,bgHex,rx.period?estimateRestorePhase(px.fg,rx.period):0,sx);
  return {
    periodX:periodX||periodY||72,periodY:periodY||periodX||72,
    periodScoreX:rx.score,periodScoreY:ry.score,
    bandX:bandX||bandY||2,bandY:bandY||bandX||2,
    phaseX,phaseY,dashLength:dash.dashLength||9,dashGap:dash.dashGap||12,
    confidence:clamp((rx.score+ry.score)/2,0,1)
  }
}
function estimateRestoreOverlapBlend(bgHex,palette){
  let bg=restoreHexRgb(bgHex),colors=(palette||[]).filter(c=>restoreRgbDistance(restoreHexRgb(c),bg)>14)
      .sort((a,b)=>restoreRgbDistance(restoreHexRgb(a),bg)-restoreRgbDistance(restoreHexRgb(b),bg));
  if(colors.length<2)return null;
  let single=restoreHexRgb(colors[Math.max(0,colors.length-2)]),cross=restoreHexRgb(colors[colors.length-1]),ratios=[];
  for(let k=0;k<3;k++){
    let den=single[k]-bg[k];if(Math.abs(den)<8)continue;
    let r=(cross[k]-single[k])/den;if(Number.isFinite(r)&&r>=-.1&&r<=1.1)ratios.push(r)
  }
  if(!ratios.length)return null;
  let keep=clamp(1-restoreMedian(ratios,.7),.08,.9),fg=[];
  for(let k=0;k<3;k++)fg[k]=clamp((single[k]-(1-keep)*bg[k])/Math.max(.02,keep),0,255);
  return {alpha:keep,foreground:rgbToHex(fg),single:rgbToHex(single),intersection:rgbToHex(cross)}
}
function restoreFeatureVectorAdvanced(canvas){
  let {width:w,height:h}=canvas,d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data,
      gray=new Float32Array(w*h),alpha=new Float32Array(w*h),edge=new Float32Array(w*h);
  for(let i=0,p=0;i<d.length;i+=4,p++){alpha[p]=d[i+3]/255;gray[p]=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let i=y*w+x,x2=Math.min(w-1,x+1),y2=Math.min(h-1,y+1),
        ex=Math.abs(gray[y*w+x2]-gray[i])+.65*Math.abs(alpha[y*w+x2]-alpha[i]),
        ey=Math.abs(gray[y2*w+x]-gray[i])+.65*Math.abs(alpha[y2*w+x]-alpha[i]);
    edge[i]=Math.min(1,ex+ey)
  }
  return {gray,alpha,edge}
}
function restoreVectorSimilarityAdvanced(a,b){
  if(!a||!b||a.length!==b.length||!a.length)return 0;
  let ma=0,mb=0;for(let i=0;i<a.length;i++){ma+=a[i];mb+=b[i]}ma/=a.length;mb/=b.length;
  let num=0,da=0,db=0,err=0;
  for(let i=0;i<a.length;i++){let aa=a[i]-ma,bb=b[i]-mb;num+=aa*bb;da+=aa*aa;db+=bb*bb;err+=Math.abs(a[i]-b[i])}
  let corr=(da>1e-10&&db>1e-10)?(num/Math.sqrt(da*db)+1)/2:0,
      mseLike=1-Math.min(1,err/a.length);
  return clamp(corr*.68+mseLike*.32,0,1)
}
function restoreFeatureScoreAdvanced(source,candidate){
  let e=restoreVectorSimilarityAdvanced(source.edge,candidate.edge),
      g=restoreVectorSimilarityAdvanced(source.gray,candidate.gray),
      a=restoreVectorSimilarityAdvanced(source.alpha,candidate.alpha),
      mean=v=>{let s=0;for(let n of v)s+=n;return s/v.length},
      density=1-Math.min(1,Math.abs(mean(source.edge)-mean(candidate.edge))*4.5);
  return clamp(e*.60+g*.22+a*.08+density*.10,0,1)
}
function buildRestoreCandidateLayerAdvanced(preset,result){
  let d=PE.defaults[preset.id]||{},layer=defaultLayer(0,preset.id,true),st=result.structure||{},
      px=Math.max(8,st.periodX||72),py=Math.max(8,st.periodY||px),period=restoreMedian([px,py],72),
      thick=Math.max(.8,restoreMedian([st.bandX,st.bandY],2)),opt=preset.opt||{};
  Object.assign(layer,d);
  layer.sourceType='builtin';layer.presetId=preset.id;layer.enabled=true;layer.rotation=0;layer.jitter=0;
  layer.randomSize=false;layer.randomAngle=false;layer.randomPosition=false;layer.colorMode='individual';
  layer.colors=normalizeColors(result.colors);layer.masterColor=layer.colors[1];layer.seed=47291;
  layer.offsetX=Math.round(st.phaseX||0);layer.offsetY=Math.round(st.phaseY||0);
  if(isBasicZeroGapPresetId(preset.id))layer.gap=0;

  if(preset.type==='grid'||preset.type==='grid-diamond'){
    layer.size=70;layer.gap=0;layer.gridX=Math.round(px);layer.gridY=Math.round(py);layer.stroke=Math.max(1,Math.round(thick));
    layer.colors[1]=result.lineColor||result.colors[1];layer.colors[4]=layer.colors[1];
    if(preset.type==='grid-diamond'){layer.diamondColor=result.colors[2]||result.colors[1];layer.diamondSize=Math.max(3,Math.round(thick*2.6))}
  }else if(preset.type==='dashed-grid'){
    layer.size=180;layer.gap=0;layer.gridX=Math.round(px);layer.gridY=Math.round(py);
    layer.dashedLineColor=result.lineColor||result.colors[1];layer.dashedLineOpacity=100;layer.dashedLineWidth=Math.max(1,Math.round(thick));
    layer.dashLength=clampInt(st.dashLength,1,200,9);layer.dashGap=clampInt(st.dashGap,1,200,12);layer.stroke=layer.dashedLineWidth
  }else if(preset.type==='checker'){
    layer.size=Math.max(8,Math.round(period));layer.gap=isBasicZeroGapPresetId(preset.id)?0:Math.max(0,Math.round((d.gap??0)));
    layer.stroke=0;layer.opacity=100;
    if(opt.contiguous){layer.colors[2]=result.bg}
  }else if(preset.type==='overlap-check'){
    layer.size=Math.max(8,Math.round(period));layer.gap=0;layer.stroke=0;layer.opacity=100;
    let blend=estimateRestoreOverlapBlend(result.bg,result.palette);
    if(blend){
      layer.colors[1]=blend.foreground;layer.masterColor=blend.foreground;
      let target=blend.alpha;
      if(target<.22){layer.detail=0;layer.opacity=clampInt(target/.22*100,10,100,100)}
      else if(target<=.44){layer.detail=clampInt((target-.22)/.22*100,0,100,45);layer.opacity=100}
      else{layer.detail=100;layer.opacity=100}
    }
  }else if(preset.type==='soft-window-check'){
    layer.size=84;layer.gap=0;layer.windowCheckX=Math.round(px);layer.windowCheckY=Math.round(py);
    layer.windowCheckLineWidth=Math.max(1,Math.round(thick));layer.windowCheckSecondaryOpacity=28
  }else if(preset.type==='milky-mini-check-window'){
    layer.size=84;layer.gap=0;layer.milkyCheckX=Math.round(px);layer.milkyCheckY=Math.round(py);
    layer.milkyBandWidth=Math.max(3,Math.round(thick));layer.milkyCheckColor=result.colors[2]||result.colors[1];
    layer.milkyMiniColor=result.colors[3]||'#FFF9F1'
  }else if(preset.type==='simple-diamond'){
    layer.size=90;layer.gap=0;layer.simpleDiamondX=Math.round(px);layer.simpleDiamondY=Math.round(Math.max(py,px*1.2));
    layer.simpleDiamondColor=result.colors[1]
  }else if(preset.type==='pastel-argyle'){
    layer.size=92;layer.gap=0;layer.argyleX=Math.round(px);layer.argyleY=Math.round(py);
    layer.argyleLineWidth=Math.max(1,Math.round(thick));layer.argyleLineColor=result.colors[4]
  }else if(preset.type==='stripes'){
    let stripeSize=Math.max(6,Math.round(thick/.55)),step=Math.max(stripeSize,Math.round(py||px));
    layer.size=stripeSize;layer.gap=Math.max(0,step-stripeSize);layer.stroke=0
  }else if(preset.type==='plaid'||preset.type==='reference-plaid'||preset.type==='layered-fabric-plaid'||preset.type==='textured-checker'||preset.type==='wavy-checker'){
    layer.size=Math.max(10,Math.round(period));layer.gap=Math.max(0,Math.round(d.gap??0));layer.stroke=Math.max(1,Math.round(thick))
  }else if(preset.type==='motif'||preset.type==='raindrops'){
    let step=Math.max(12,Math.round(period));layer.size=Math.max(12,Math.round(Math.min(step*.7,Math.max(thick*2.4,step*.38))));
    layer.gap=Math.max(0,step-layer.size)
  }else{
    layer.size=Math.max(10,Math.round(period));layer.gap=Math.max(0,Math.round(d.gap??0));layer.stroke=Math.max(0,Math.round(d.stroke??layer.stroke??0))
  }
  if(layer.dashedHeartColor!==undefined)layer.dashedHeartColor=result.colors[3];
  if(layer.airyStripeColor!==undefined)layer.airyStripeColor=result.colors[4];
  if(layer.airyPointColor!==undefined)layer.airyPointColor=result.colors[3];
  return layer
}
function renderRestoreLayerCandidate(layer,result,sampleInfo){
  let c=document.createElement('canvas');c.width=sampleInfo.canvas.width;c.height=sampleInfo.canvas.height;
  let x=c.getContext('2d',{willReadFrequently:true}),preset=getPreset(layer.presetId),s=layerToPatternState(layer,false);
  resetCanvasRenderState(x);x.clearRect(0,0,c.width,c.height);
  s.skipBackground=false;s.transparentBg=!!result.transparent;s.bgMode='solid';s.anchorExact=false;s.colors=normalizeColors(layer.colors);
  PE.render(x,c.width,c.height,s,preset,sampleInfo.scale);
  return c
}
function restoreParameterSpecs(preset,layer,result){
  let st=result.structure||{},specs=[];
  const add=(key,min,max,ratios=[.88,.96,1,1.04,1.12])=>{
    let cur=Number(layer[key]);if(!Number.isFinite(cur))return;
    specs.push({key,values:[...new Set(ratios.map(r=>clamp(Math.round(cur*r*100)/100,min,max)))]})
  };
  if(preset.type==='grid'||preset.type==='grid-diamond'){
    add('gridX',8,2000,[.9,.96,1,1.04,1.1]);add('gridY',8,2000,[.9,.96,1,1.04,1.1]);add('stroke',1,80,[.65,.82,1,1.18,1.4])
  }else if(preset.type==='dashed-grid'){
    add('gridX',8,2000,[.9,.96,1,1.04,1.1]);add('gridY',8,2000,[.9,.96,1,1.04,1.1]);
    add('dashedLineWidth',.5,80,[.65,.82,1,1.18,1.4]);add('dashLength',1,300,[.75,.9,1,1.12,1.3]);add('dashGap',1,300,[.75,.9,1,1.12,1.3])
  }else if(preset.type==='soft-window-check'){
    add('windowCheckX',12,2000,[.9,.96,1,1.04,1.1]);add('windowCheckY',12,2000,[.9,.96,1,1.04,1.1]);add('windowCheckLineWidth',.5,80,[.65,.82,1,1.18,1.4])
  }else if(preset.type==='milky-mini-check-window'){
    add('milkyCheckX',16,2000,[.9,.96,1,1.04,1.1]);add('milkyCheckY',16,2000,[.9,.96,1,1.04,1.1]);add('milkyBandWidth',2,300,[.7,.85,1,1.15,1.35])
  }else if(preset.type==='simple-diamond'){
    add('simpleDiamondX',12,2000,[.9,.96,1,1.04,1.1]);add('simpleDiamondY',18,2400,[.9,.96,1,1.04,1.1])
  }else if(preset.type==='pastel-argyle'){
    add('argyleX',20,2000,[.9,.96,1,1.04,1.1]);add('argyleY',18,2000,[.9,.96,1,1.04,1.1]);add('argyleLineWidth',.5,80,[.7,.85,1,1.15,1.35])
  }else{
    add('size',6,1200,[.82,.91,.97,1,1.04,1.1,1.2]);
    if(!isBasicZeroGapPresetId(preset.id)&&Number(layer.gap)>0)add('gap',0,1000,[.55,.8,1,1.2,1.5])
    if(Number(layer.stroke)>0)add('stroke',0,80,[.65,.82,1,1.18,1.4])
  }
  return specs
}
async function optimizeRestoreLayer(preset,initial,result,sampleInfo,sourceFeatures){
  let bestLayer=clone(initial),bestScore=restoreFeatureScoreAdvanced(sourceFeatures,restoreFeatureVectorAdvanced(renderRestoreLayerCandidate(bestLayer,result,sampleInfo))),
      specs=restoreParameterSpecs(preset,bestLayer,result),checks=0;
  for(let pass=0;pass<2;pass++){
    for(let spec of specs){
      let localBest=bestScore,localValue=bestLayer[spec.key];
      for(let value of spec.values){
        let test=clone(bestLayer);test[spec.key]=value;
        if(spec.key==='dashedLineWidth')test.stroke=value;
        let score=restoreFeatureScoreAdvanced(sourceFeatures,restoreFeatureVectorAdvanced(renderRestoreLayerCandidate(test,result,sampleInfo)));
        if(score>localBest){localBest=score;localValue=value}
        if(++checks%16===0)await new Promise(r=>requestAnimationFrame(r))
      }
      bestLayer[spec.key]=localValue;if(spec.key==='dashedLineWidth')bestLayer.stroke=localValue;bestScore=localBest
    }
    let rotationValues=[-45,-30,-15,-8,0,8,15,30,45],rb=bestScore,rv=bestLayer.rotation||0;
    for(let rot of rotationValues){
      let test=clone(bestLayer);test.rotation=rot;
      let score=restoreFeatureScoreAdvanced(sourceFeatures,restoreFeatureVectorAdvanced(renderRestoreLayerCandidate(test,result,sampleInfo)));
      if(score>rb){rb=score;rv=rot}
      if(++checks%16===0)await new Promise(r=>requestAnimationFrame(r))
    }
    bestLayer.rotation=rv;bestScore=rb
  }
  return {layer:bestLayer,score:bestScore}
}
function restoreConfidence(score,margin=0,structureConfidence=.5){
  let fit=clamp((score-.50)/.40,0,1),sep=clamp(margin/.10,0,1);
  return clamp(fit*.72+sep*.18+structureConfidence*.10,0,1)
}
function restoreConfidenceLabel(v){
  return v>=.78?'높음':v>=.58?'보통':'낮음'
}
function restoreSettingsSummary(preset,layer,result,candidate){
  let st=result.structure||{},uncertain=(candidate?.confidence??0)<.58,estimateStatus=uncertain?'불확실 · 수정 가능':'추정',
      structureStatus=uncertain?'불확실 · 반복 분석':'반복 주기 분석',rows=[
    {label:'패턴 종류',value:preset.name,status:candidate?.confidence>=.78?'추정 · 높은 신뢰':estimateStatus},
    {label:'캔버스',value:result.width+'×'+result.height+'px',status:'이미지 원본값'},
    {label:'배경색',value:result.transparent?'투명':result.bg,status:estimateStatus},
    {label:'패턴 색상',value:(layer.colors||[]).slice(1,4).join(' / '),status:estimateStatus}
  ];
  if(preset.type==='grid'||preset.type==='grid-diamond')rows.push(
    {label:'격자 X / Y',value:Math.round(layer.gridX)+' / '+Math.round(layer.gridY)+'px',status:structureStatus},
    {label:'선 두께',value:Math.round(layer.stroke*10)/10+'px',status:estimateStatus}
  );
  else if(preset.type==='dashed-grid')rows.push(
    {label:'격자 X / Y',value:Math.round(layer.gridX)+' / '+Math.round(layer.gridY)+'px',status:structureStatus},
    {label:'선 두께',value:Math.round(layer.dashedLineWidth*10)/10+'px',status:estimateStatus},
    {label:'점선 길이 / 간격',value:Math.round(layer.dashLength)+' / '+Math.round(layer.dashGap)+'px',status:estimateStatus}
  );
  else if(preset.type==='soft-window-check')rows.push(
    {label:'윈도우 X / Y',value:Math.round(layer.windowCheckX)+' / '+Math.round(layer.windowCheckY)+'px',status:structureStatus},
    {label:'선 두께',value:Math.round(layer.windowCheckLineWidth*10)/10+'px',status:estimateStatus}
  );
  else if(preset.type==='milky-mini-check-window')rows.push(
    {label:'체크 X / Y',value:Math.round(layer.milkyCheckX)+' / '+Math.round(layer.milkyCheckY)+'px',status:structureStatus},
    {label:'밴드 두께',value:Math.round(layer.milkyBandWidth)+'px',status:estimateStatus}
  );
  else if(preset.type==='simple-diamond')rows.push(
    {label:'다이아 X / Y',value:Math.round(layer.simpleDiamondX)+' / '+Math.round(layer.simpleDiamondY)+'px',status:estimateStatus}
  );
  else if(preset.type==='pastel-argyle')rows.push(
    {label:'아가일 X / Y',value:Math.round(layer.argyleX)+' / '+Math.round(layer.argyleY)+'px',status:estimateStatus},
    {label:'선 두께',value:Math.round(layer.argyleLineWidth*10)/10+'px',status:estimateStatus}
  );
  else rows.push(
    {label:'패턴 크기',value:Math.round(layer.size)+'px',status:'반복 구조 분석'},
    {label:'간격',value:Math.round(layer.gap||0)+'px',status:isBasicZeroGapPresetId(preset.id)?'원본 구조 우선 · 0':'추정'}
  );
  rows.push({label:'회전',value:Math.round(layer.rotation||0)+'°',status:uncertain?'불확실 · 오차 비교':'재생성 오차 비교'});
  if(st.phaseX||st.phaseY)rows.push({label:'반복 기준 위치',value:Math.round(st.phaseX||0)+' / '+Math.round(st.phaseY||0)+'px',status:estimateStatus});
  return rows
}


function buildRestoreNativeProbe(img,maxSide=1024){
  let iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,
      cw=Math.max(24,Math.min(iw,maxSide)),ch=Math.max(24,Math.min(ih,maxSide)),
      sx=Math.max(0,Math.floor((iw-cw)/2)),sy=Math.max(0,Math.floor((ih-ch)/2)),
      canvas=document.createElement('canvas');
  canvas.width=cw;canvas.height=ch;
  let x=canvas.getContext('2d',{willReadFrequently:true});x.clearRect(0,0,cw,ch);
  x.imageSmoothingEnabled=false;x.drawImage(img,sx,sy,cw,ch,0,0,cw,ch);
  return {canvas,scale:1,iw,ih,originX:sx,originY:sy}
}
function normalizeRestoreProbeStructure(structure,probe){
  let out={...structure};
  if(out.periodX>0)out.phaseX=(((out.phaseX||0)+(probe.originX||0))%out.periodX+out.periodX)%out.periodX;
  if(out.periodY>0)out.phaseY=(((out.phaseY||0)+(probe.originY||0))%out.periodY+out.periodY)%out.periodY;
  return out
}

function sampleSolidGridLineColor(probe,bgHex,mx,my){
  let c=probe.canvas,x=c.getContext('2d',{willReadFrequently:true}),w=c.width,h=c.height,
      d=x.getImageData(0,0,w,h).data,bg=restoreHexRgb(bgHex),buckets=new Map();
  const addPixel=(xx,yy)=>{
    xx=clamp(Math.round(xx),0,w-1);yy=clamp(Math.round(yy),0,h-1);
    let best=null,bestDist=0,radius=2;
    for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++){
      let px=clamp(xx+ox,0,w-1),py=clamp(yy+oy,0,h-1),i=(py*w+px)*4;
      if(d[i+3]<220)continue;
      let rgb=[d[i],d[i+1],d[i+2]],dist=restoreRgbDistance(rgb,bg);
      if(dist>bestDist){bestDist=dist;best=rgb}
    }
    if(!best||bestDist<12)return;
    let q=2,key=best.map(v=>Math.round(v/q)*q).join(','),item=buckets.get(key)||{n:0,r:0,g:0,b:0};
    item.n++;item.r+=best[0];item.g+=best[1];item.b+=best[2];buckets.set(key,item)
  };
  if(mx?.period>0){
    let p=mx.period,phase=((mx.phase%p)+p)%p;
    for(let xx=phase;xx<w;xx+=p)for(let yy=3;yy<h;yy+=Math.max(3,Math.floor(h/120)))addPixel(xx,yy)
  }
  if(my?.period>0){
    let p=my.period,phase=((my.phase%p)+p)%p;
    for(let yy=phase;yy<h;yy+=p)for(let xx=3;xx<w;xx+=Math.max(3,Math.floor(w/180)))addPixel(xx,yy)
  }
  let best=[...buckets.values()].sort((a,b)=>b.n-a.n)[0];
  return best?rgbToHex([best.r/best.n,best.g/best.n,best.b/best.n]):null
}
function restoreMostDistinctPaletteColor(palette,bgHex){
  let bg=restoreHexRgb(bgHex),best=null,bestDist=-1;
  for(let c of (palette||[])){
    let d=restoreRgbDistance(restoreHexRgb(c),bg);
    if(d>bestDist){bestDist=d;best=c}
  }
  return best||'#808080'
}

function measureSolidGridAxis(probe,bgHex,axis){
  let profiles=restoreAxisProfiles(probe.canvas,bgHex,axis),rough=estimateRestorePeriod(profiles.edge),
      runs=restoreProfileRuns(profiles.fg,rough.period||0),
      centers=runs.map(r=>r.center),diffs=[];
  for(let i=1;i<centers.length;i++){let d=centers[i]-centers[i-1];if(d>=3)diffs.push(d)}
  let period=restoreMedian(diffs,rough.period||0),band=restoreMedian(runs.map(r=>r.len),0),
      phase=runs.length&&period?(((runs[0].center%period)+period)%period):estimateRestorePhase(profiles.fg,rough.period||1);
  return {period:period/Math.max(.001,probe.scale),band:band/Math.max(.001,probe.scale),phase:phase/Math.max(.001,probe.scale),score:rough.score,runs:runs.length}
}
function restoreGridAxisCoverage(sampleInfo,bgHex,axis,periodOriginal,phaseOriginal,bandOriginal){
  let c=sampleInfo.canvas,x=c.getContext('2d',{willReadFrequently:true}),w=c.width,h=c.height,
      d=x.getImageData(0,0,w,h).data,bg=restoreHexRgb(bgHex),scale=Math.max(.001,sampleInfo.scale),
      period=Math.max(2,periodOriginal*scale),phase=((phaseOriginal*scale)%period+period)%period,
      radius=Math.max(0,Math.min(3,Math.round((bandOriginal*scale)/2))),
      len=axis==='x'?w:h,other=axis==='x'?h:w,threshold=12,coverages=[];
  for(let coord=phase;coord<len;coord+=period){
    let ci=Math.round(coord),hit=0,total=0;
    for(let b=0;b<other;b+=Math.max(1,Math.floor(other/220))){
      let best=0;
      for(let o=-radius;o<=radius;o++){
        let xx=axis==='x'?clamp(ci+o,0,w-1):b,yy=axis==='x'?b:clamp(ci+o,0,h-1),
            i=(yy*w+xx)*4,a=d[i+3]/255;if(a<.1)continue;
        best=Math.max(best,restoreRgbDistance([d[i],d[i+1],d[i+2]],bg))
      }
      if(best>threshold)hit++;total++
    }
    if(total)coverages.push(hit/total)
  }
  return coverages.length?restoreMedian(coverages,0):0
}
function detectSolidPastelGridRestore(img,palette,bgHex,transparent){
  let probe=buildRestoreNativeProbe(img,1024),mx=measureSolidGridAxis(probe,bgHex,'x'),my=measureSolidGridAxis(probe,bgHex,'y'),
      localStructure=estimateRestoreStructure(probe,bgHex),
      px=Math.max(1,mx.period||localStructure.periodX||0),py=Math.max(1,my.period||localStructure.periodY||0),
      bx=Math.max(.5,mx.band||localStructure.bandX||0),by=Math.max(.5,my.band||localStructure.bandY||0);
  localStructure.periodX=px;localStructure.periodY=py;localStructure.bandX=bx;localStructure.bandY=by;
  localStructure.phaseX=mx.phase||localStructure.phaseX||0;localStructure.phaseY=my.phase||localStructure.phaseY||0;
  localStructure.periodScoreX=mx.score||localStructure.periodScoreX;localStructure.periodScoreY=my.score||localStructure.periodScoreY;
  localStructure.confidence=clamp(((mx.score||0)+(my.score||0))/2,0,1);
  let covX=restoreGridAxisCoverage(probe,bgHex,'x',px,localStructure.phaseX||0,bx),
      covY=restoreGridAxisCoverage(probe,bgHex,'y',py,localStructure.phaseY||0,by),
      structure=normalizeRestoreProbeStructure(localStructure,probe),
      thinX=bx/px,thinY=by/py,
      regular=(mx.runs>=3&&my.runs>=3)&&(structure.periodScoreX>=.52&&structure.periodScoreY>=.52),
      thin=thinX<=.28&&thinY<=.28,
      continuous=covX>=.78&&covY>=.78,
      squareish=Math.max(px,py)/Math.max(1,Math.min(px,py))<=2.5,
      confidence=clamp(structure.confidence*.35+Math.min(covX,covY)*.55+(thin?.10:0),0,1);
  if(!regular||!thin||!continuous||!squareish)return null;
  let lineColor=sampleSolidGridLineColor(probe,bgHex,mx,my)||restoreMostDistinctPaletteColor(palette,bgHex),result={
    exact:false,transparent,bg:bgHex,palette,colors:normalizeColors([bgHex,lineColor,mixHex(lineColor,bgHex,.35),mixHex(lineColor,bgHex,.65),lineColor]),
    width:img.naturalWidth||img.width,height:img.naturalHeight||img.height,
    structure,lineColor,candidates:[],forcedPresetId:'',detector:'solid-grid'
  };
  let preset=getPreset('grid'),layer=buildRestoreCandidateLayerAdvanced(preset,result);
  layer.size=70;layer.gap=0;layer.gridX=Math.max(8,Math.round(px));layer.gridY=Math.max(8,Math.round(py));
  layer.stroke=Math.max(1,Math.round(restoreMedian([bx,by],2)*10)/10);
  layer.opacity=100;layer.rotation=0;layer.colors[0]=bgHex;layer.colors[1]=lineColor;layer.colors[4]=lineColor;
  layer.masterColor=lineColor;layer.offsetX=Math.round(structure.phaseX||0);layer.offsetY=Math.round(structure.phaseY||0);
  let candidate={id:'grid',layer,score:clamp(.82+confidence*.15,0,1),confidence:Math.max(.90,confidence)};
  candidate.settings=restoreSettingsSummary(preset,layer,result,candidate);
  result.candidates=[candidate];result.structure=structure;
  return result
}
async function analyzePatternRestoreImage(img,forcedPresetId=''){
  let sampleInfo=buildRestoreSampleInfo(img,240),fullMeasureInfo=buildRestoreSampleInfo(img,720),
      probe=buildRestoreNativeProbe(img,1024),transparent=restoreImageHasTransparency(sampleInfo.canvas),
      palette=extractRestorePaletteStable(img,7),bg=estimateRestoreBackgroundAdvanced(fullMeasureInfo,palette,transparent),
      colors=buildRestoreColorsAdvanced(palette,bg),
      structure=normalizeRestoreProbeStructure(estimateRestoreStructure(probe,bg),probe);

  // Strong primitive recognition comes before the broad library competition.
  // A continuous axis-aligned grid should restore as the built-in "파스텔 격자",
  // never as an uploaded tile or a visually similar dashed/stripe preset.
  if(!forcedPresetId||forcedPresetId==='grid'){
    let directGrid=detectSolidPastelGridRestore(img,palette,bg,transparent);
    if(directGrid)return directGrid
  }

  let result={exact:false,transparent,bg,colors,palette,width:sampleInfo.iw,height:sampleInfo.ih,structure,lineColor:colors[1],candidates:[],forcedPresetId:forcedPresetId||''},
      sourceFeatures=restoreFeatureVectorAdvanced(sampleInfo.canvas),
      presets=forcedPresetId?[getPreset(forcedPresetId)]:restoreCandidatePresets(),coarse=[],checks=0;
  presets=presets.filter(Boolean);
  for(let preset of presets){
    let layer=buildRestoreCandidateLayerAdvanced(preset,result),
        candidateCanvas=renderRestoreLayerCandidate(layer,result,sampleInfo),
        score=restoreFeatureScoreAdvanced(sourceFeatures,restoreFeatureVectorAdvanced(candidateCanvas));
    coarse.push({preset,layer,score});
    if(++checks%18===0)await new Promise(r=>requestAnimationFrame(r))
  }
  coarse.sort((a,b)=>b.score-a.score);
  let refineCount=forcedPresetId?1:Math.min(6,coarse.length),refined=[];
  for(let i=0;i<refineCount;i++){
    let seed=coarse[i],fit=await optimizeRestoreLayer(seed.preset,seed.layer,result,sampleInfo,sourceFeatures);
    refined.push({id:seed.preset.id,layer:fit.layer,score:fit.score})
  }
  refined.sort((a,b)=>b.score-a.score);
  let second=refined[1]?.score??(refined[0]?.score??0);
  refined.forEach((cand,i)=>{
    let margin=i===0?Math.max(0,cand.score-second):0;
    cand.confidence=restoreConfidence(cand.score,margin,structure.confidence);
    cand.settings=restoreSettingsSummary(getPreset(cand.id),cand.layer,result,cand)
  });
  result.candidates=refined.slice(0,3);
  return result
}
function applyRestoreCandidate(candidate,result=patternRestoreResult,{remember=true}={}){
  if(!candidate||!result||!candidate.layer)return;
  if(remember&&!patternRestorePreviousState)patternRestorePreviousState=clone(stripStateForSave(state));
  state.exportW=clampInt(result.width,16,8000,state.exportW||2000);
  state.exportH=clampInt(result.height,16,8000,state.exportH||2000);
  state.bg.transparent=!!result.transparent;state.bg.mode='solid';state.bg.colors=[result.bg,result.bg];
  state.bg.gradientStops=buildGradientStopsFromColors([result.bg,result.bg]);state.bg.backgroundOnly=false;
  state.bg.vignette={enabled:false,color:'#6F55C9',range:72,strength:28,softness:28};
  state.gradientOverlays={overlay1:defaultGradientOverlay(1),overlay2:defaultGradientOverlay(2)};
  state.layers=[clone(candidate.layer)];state.layers[0].name='기본 레이어';state.layers[0].enabled=true;
  activeLayerIndex=0;result.appliedCandidateId=candidate.id;
  persistAll();syncAll();renderPatternRestoreResult()
}
function drawPatternRestoreComparison(){
  let compare=$('#patternRestoreCompareCanvas');if(!compare||!patternRestoreImage)return;
  let rect=compare.getBoundingClientRect(),cssW=Math.max(260,Math.round(rect.width||520)),
      ratio=(patternRestoreImage.naturalWidth||patternRestoreImage.width)/Math.max(1,(patternRestoreImage.naturalHeight||patternRestoreImage.height)),
      cssH=Math.max(160,Math.min(360,Math.round(cssW/Math.max(.35,Math.min(3.5,ratio))))),dpr=Math.min(2,window.devicePixelRatio||1);
  compare.width=Math.round(cssW*dpr);compare.height=Math.round(cssH*dpr);compare.style.height=cssH+'px';
  let x=compare.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,cssW,cssH);
  const drawFit=(img,alpha=1)=>{
    let iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,fit=Math.min(cssW/iw,cssH/ih),
        dw=iw*fit,dh=ih*fit,dx=(cssW-dw)/2,dy=(cssH-dh)/2;
    x.save();x.globalAlpha=alpha;x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(img,dx,dy,dw,dh);x.restore()
  };
  if(patternRestoreCompareMode==='original')drawFit(patternRestoreImage,1);
  else if(patternRestoreCompareMode==='restored')drawFit(canvas,1);
  else{
    drawFit(patternRestoreImage,1);
    drawFit(canvas,.5);
    x.save();x.fillStyle='rgba(255,255,255,.88)';x.font='700 11px sans-serif';x.fillText('원본 + 복원 50%',10,18);x.restore()
  }
}
function populatePatternRestorePresetSelect(){
  let sel=$('#patternRestorePresetSelect');if(!sel)return;
  let current=sel.value||patternRestoreForcedPresetId||'';sel.innerHTML='';
  let auto=document.createElement('option');auto.value='';auto.textContent='자동 인식 결과 사용';sel.appendChild(auto);
  let groups=new Map();
  restoreCandidatePresets().forEach(p=>{if(!groups.has(p.category))groups.set(p.category,[]);groups.get(p.category).push(p)});
  groups.forEach((items,category)=>{
    let g=document.createElement('optgroup');g.label=category;
    items.forEach(p=>{let op=document.createElement('option');op.value=p.id;op.textContent=p.name;g.appendChild(op)});sel.appendChild(g)
  });
  sel.value=current
}
function renderPatternRestoreResult(){
  let root=$('#patternRestoreResult'),status=$('#patternRestoreStatus');if(!root)return;
  root.innerHTML='';populatePatternRestorePresetSelect();
  if(patternRestoreBusy){if(status)status.textContent='패턴 구조와 설정값을 분석 중…';root.innerHTML='<div class="pattern-restore-loading">반복 주기·선 두께·색상 영역을 분석하고 내장 패턴으로 다시 렌더링해 오차를 비교하고 있어.</div>';return}
  if(!patternRestoreResult){if(status)status.textContent='이미지를 첨부하면 분석 결과가 여기에 표시돼.';drawPatternRestoreComparison();return}
  let r=patternRestoreResult;
  if(r.exact){
    if(status)status.textContent='PNG 메타데이터의 실제 편집 설정을 사용해 정확 복원했어.';
    let summary=document.createElement('div');summary.className='pattern-restore-summary';
    summary.innerHTML='<strong>정확 복원</strong><span>원본 '+r.width+'×'+r.height+'px · 저장된 설정값 사용</span>';root.appendChild(summary);
    let exact=document.createElement('div');exact.className='pattern-restore-settings';
    let layer=currentLayer(),p=layer.sourceType==='builtin'?getPreset(layer.presetId):null;
    [
      ['패턴 종류',p?p.name:'업로드 에셋','정확'],
      ['캔버스',r.width+'×'+r.height+'px','정확'],
      ['패턴 크기',Math.round(layer.size||0)+'px','정확'],
      ['간격',Math.round(layer.gap||0)+'px','정확'],
      ['불투명도',Math.round(layer.opacity??100)+'%','정확']
    ].forEach(v=>{let row=document.createElement('div');row.className='pattern-restore-setting-row';row.innerHTML='<span>'+v[0]+'</span><strong>'+v[1]+'</strong><small>'+v[2]+'</small>';exact.appendChild(row)});
    root.appendChild(exact)
  }else{
    let best=r.candidates?.[0],applied=r.appliedCandidateId&&r.candidates?.find(c=>c.id===r.appliedCandidateId)||best;
    if(status){
      if(!best)status.textContent='일치하는 패턴 후보를 찾지 못했어. 패턴 종류를 직접 선택해서 다시 분석해 봐.';
      else if(best.confidence<.58&&!r.appliedCandidateId)status.textContent='자동 인식 신뢰도가 낮아서 기존 작업을 변경하지 않았어. 패턴 종류를 직접 선택하면 해당 구조로 다시 분석해.';
      else status.textContent='업로드 이미지를 직접 표시한 것이 아니라 분석한 설정으로 패턴을 다시 생성했어.'
    }
    if(best){
      let summary=document.createElement('div');summary.className='pattern-restore-summary';
      summary.innerHTML='<strong>'+getPreset(best.id).name+(r.forcedPresetId?' · 수동 선택 분석':' · 자동 인식')+'</strong><span>유사도 '+Math.round(best.score*100)+'% · 신뢰도 '+restoreConfidenceLabel(best.confidence)+' '+Math.round(best.confidence*100)+'%</span>';
      root.appendChild(summary);
      let palette=document.createElement('div');palette.className='pattern-restore-palette';
      (r.palette||[]).slice(0,7).forEach(c=>{let sw=document.createElement('span');sw.title=c;sw.style.background=c;palette.appendChild(sw)});root.appendChild(palette);
      let settings=document.createElement('div');settings.className='pattern-restore-settings';
      (applied?.settings||best.settings||[]).forEach(item=>{let row=document.createElement('div');row.className='pattern-restore-setting-row';row.innerHTML='<span>'+item.label+'</span><strong>'+item.value+'</strong><small>'+item.status+'</small>';settings.appendChild(row)});root.appendChild(settings)
    }
    if(r.candidates?.length){
      let list=document.createElement('div');list.className='pattern-restore-candidates';
      r.candidates.forEach((cand,i)=>{
        let p=getPreset(cand.id),b=document.createElement('button');b.type='button';b.className='pattern-restore-candidate'+(cand.id===r.appliedCandidateId?' best':'');
        b.innerHTML='<strong>'+(i===0?'추천 · ':'')+p.name+'</strong><span>유사도 '+Math.round(cand.score*100)+'% · 신뢰도 '+restoreConfidenceLabel(cand.confidence)+' · 패턴 크기 '+Math.round(cand.layer.size||0)+'px</span>';
        b.onclick=()=>applyRestoreCandidate(cand,r,{remember:false});list.appendChild(b)
      });
      root.appendChild(list)
    }
  }
  if(patternRestorePreviousState){
    let undo=document.createElement('button');undo.type='button';undo.className='mini-btn';undo.textContent='분석 전 작업으로 되돌리기';
    undo.onclick=()=>{state=mergeState(clone(patternRestorePreviousState));patternRestorePreviousState=null;activeLayerIndex=0;persistAll();syncAll();renderPatternRestoreResult();toast('분석 전 작업으로 되돌렸어.')};
    root.appendChild(undo)
  }
  drawPatternRestoreComparison()
}
function restoreExactState(meta,img){
  if(!meta?.state)return false;
  let missingAsset=(meta.state.layers||[]).some(layer=>layer?.sourceType==='uploaded'&&layer.assetId&&!userAssets.some(a=>a.id===layer.assetId));
  if(missingAsset)return false;
  if(!patternRestorePreviousState)patternRestorePreviousState=clone(stripStateForSave(state));
  let restored=clone(meta.state),legacyPixelScale=(Number(meta.schema)||1)<2;
  if(legacyPixelScale){
    let oldW=Number(meta.export?.w||restored.exportW||img.naturalWidth||img.width||2000),factor=Math.max(.05,oldW/2000);
    (restored.layers||[]).forEach(layer=>{
      ['size','gap','stroke','offsetX','offsetY','row1OffsetX','row1OffsetY','row2OffsetX','row2OffsetY'].forEach(k=>{
        if(Number.isFinite(+layer[k]))layer[k]=Math.round(+layer[k]*factor*100)/100
      })
    })
  }
  state=mergeState(restored);
  state.exportW=clampInt(img.naturalWidth||img.width,16,8000,state.exportW||2000);
  state.exportH=clampInt(img.naturalHeight||img.height,16,8000,state.exportH||2000);
  activeLayerIndex=0;persistAll();syncAll();return true
}
async function reanalyzePatternRestoreSelectedPreset(){
  if(!patternRestoreImage||patternRestoreBusy)return;
  let sel=$('#patternRestorePresetSelect'),id=sel?.value||'';if(!id){toast('직접 분석할 패턴 종류를 선택해줘.');return}
  patternRestoreForcedPresetId=id;patternRestoreBusy=true;renderPatternRestoreResult();
  try{
    let r=await analyzePatternRestoreImage(patternRestoreImage,id);patternRestoreResult=r;
    let best=r.candidates?.[0];
    if(best){applyRestoreCandidate(best,r,{remember:false});toast(getPreset(id).name+' 구조로 다시 분석해서 적용했어.')}
    else toast('선택한 패턴 구조로 설정값을 찾지 못했어.')
  }catch(err){console.error('Manual restore analysis failed',err);toast('선택한 패턴 재분석 중 오류가 발생했어.')}
  finally{patternRestoreBusy=false;renderPatternRestoreResult()}
}
async function handlePatternRestoreFile(file){
  if(!file)return;
  let ok=/^image\/(png|jpeg|webp)$/i.test(file.type||'')||/\.(png|jpe?g|webp)$/i.test(file.name||'');
  if(!ok){toast('PNG / JPG / JPEG / WEBP 이미지만 분석할 수 있어.');return}
  if(file.size>80*1024*1024){toast('이미지 파일이 너무 커. 80MB 이하 파일을 사용해줘.');return}
  patternRestoreBusy=true;patternRestoreResult=null;patternRestoreForcedPresetId='';patternRestoreSourceFile=file;
  if(!patternRestorePreviousState)patternRestorePreviousState=clone(stripStateForSave(state));
  renderPatternRestoreResult();
  try{
    if(patternRestoreObjectUrl)URL.revokeObjectURL(patternRestoreObjectUrl);
    patternRestoreObjectUrl=URL.createObjectURL(file);patternRestoreImage=await loadImage(patternRestoreObjectUrl);
    let preview=$('#patternRestorePreview');if(preview){preview.src=patternRestoreObjectUrl;preview.hidden=false}
    let meta=await readPatternStudioMetadata(file);
    if(meta?.state&&restoreExactState(meta,patternRestoreImage)){
      patternRestoreResult={exact:true,width:patternRestoreImage.naturalWidth||patternRestoreImage.width,height:patternRestoreImage.naturalHeight||patternRestoreImage.height,palette:extractRestorePaletteStable(patternRestoreImage,7),colors:currentLayer().colors||[],candidates:[],metadataVersion:meta.version||''};
      toast('PNG에 저장된 실제 편집 설정을 정확하게 복원했어.')
    }else{
      let r=await analyzePatternRestoreImage(patternRestoreImage,'');patternRestoreResult=r;
      let best=r.candidates?.[0];
      if(best&&best.confidence>=.58){applyRestoreCandidate(best,r,{remember:false});toast('이미지를 분석해 가장 가까운 편집 가능한 패턴을 재생성했어.')}
      else if(best){toast('자동 인식 신뢰도가 낮아 기존 작업은 유지했어. 패턴 종류를 직접 선택해 다시 분석할 수 있어.')}
      else toast('패턴 후보를 찾지 못했어. 패턴 종류 직접 선택을 사용해봐.')
    }
  }catch(err){
    console.error('Pattern restore failed',err);patternRestoreResult=null;toast('이미지 분석 중 오류가 발생했어. 기존 작업은 유지했어.')
  }finally{patternRestoreBusy=false;renderPatternRestoreResult()}
}
function bindPatternRestoreControls(){
  let input=$('#patternRestoreInput'),pick=$('#patternRestorePickBtn'),drop=$('#patternRestoreDropzone');
  if(!input||!pick||!drop)return;
  populatePatternRestorePresetSelect();
  pick.onclick=()=>input.click();
  drop.onclick=e=>{if(e.target.closest('button,select'))return;input.click()};
  input.onchange=()=>{let file=input.files?.[0];if(file){patternRestorePreviousState=null;handlePatternRestoreFile(file)}input.value=''};
  ['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('dragover')}));
  ['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('dragover')}));
  drop.addEventListener('drop',e=>{let file=[...(e.dataTransfer?.files||[])][0];if(file){patternRestorePreviousState=null;handlePatternRestoreFile(file)}});
  let leftBtn=$('#patternRestoreLeftBtn'),leftDrop=$('#patternRestoreLeftDropzone');
  if(leftBtn)leftBtn.onclick=()=>input.click();
  if(leftDrop){
    leftDrop.onclick=()=>input.click();
    ['dragenter','dragover'].forEach(type=>leftDrop.addEventListener(type,e=>{e.preventDefault();leftDrop.classList.add('dragover')}));
    ['dragleave','drop'].forEach(type=>leftDrop.addEventListener(type,e=>{e.preventDefault();leftDrop.classList.remove('dragover')}));
    leftDrop.addEventListener('drop',e=>{let file=[...(e.dataTransfer?.files||[])][0];if(file){patternRestorePreviousState=null;handlePatternRestoreFile(file)}})
  }
  let re=$('#patternRestoreReanalyzeBtn');if(re)re.onclick=reanalyzePatternRestoreSelectedPreset;
  document.querySelectorAll('[data-restore-compare]').forEach(btn=>btn.onclick=()=>{
    patternRestoreCompareMode=btn.dataset.restoreCompare||'overlay';
    document.querySelectorAll('[data-restore-compare]').forEach(b=>b.classList.toggle('active',b===btn));drawPatternRestoreComparison()
  });
  renderPatternRestoreResult()
}
async function runPatternRestoreSyntheticTests(){
  const makeResult=(bg,colors)=>({transparent:false,bg,colors:normalizeColors(colors),palette:colors,width:512,height:512,structure:{periodX:64,periodY:64,bandX:3,bandY:3,phaseX:0,phaseY:0,dashLength:9,dashGap:12,confidence:1}});
  let tests=[];
  try{
    let gridResult=makeResult('#131515',['#131515','#505050','#404242','#303232','#505050']),gridPreset=getPreset('grid'),
        gridLayer=buildRestoreCandidateLayerAdvanced(gridPreset,gridResult);gridLayer.gridX=34;gridLayer.gridY=34;gridLayer.stroke=3;gridLayer.colors=normalizeColors(['#131515','#505050','#404242','#303232','#505050']);
    let gridCanvas=document.createElement('canvas');gridCanvas.width=1024;gridCanvas.height=298;
    let gx=gridCanvas.getContext('2d');gx.fillStyle='#131515';gx.fillRect(0,0,gridCanvas.width,gridCanvas.height);
    let gs=layerToPatternState(gridLayer,false);gs.skipBackground=true;gs.transparentBg=false;PE.render(gx,gridCanvas.width,gridCanvas.height,gs,gridPreset,1);
    let ga=await analyzePatternRestoreImage(gridCanvas,''),gb=ga.candidates?.[0];
    tests.push({name:'A dark grid auto-detect',pass:!!gb&&gb.id==='grid'&&Math.abs(gb.layer.gridX-34)<=2&&Math.abs(gb.layer.gridY-34)<=2&&Math.abs(gb.layer.stroke-3)<=2,result:gb});

    let checkResult=makeResult('#FFF7E8',['#FFF7E8','#BBD98F','#E3F1C8','#F4EEDB','#9EBB73']),checkPreset=getPreset('pastel-checker'),
        checkLayer=buildRestoreCandidateLayerAdvanced(checkPreset,checkResult);checkLayer.size=48;checkLayer.gap=0;
    let checkCanvas=document.createElement('canvas');checkCanvas.width=checkCanvas.height=512;
    let cs=layerToPatternState(checkLayer,false);cs.skipBackground=false;cs.transparentBg=false;PE.render(checkCanvas.getContext('2d'),512,512,cs,checkPreset,1);
    let ca=await analyzePatternRestoreImage(checkCanvas,'pastel-checker'),cb=ca.candidates?.[0];
    tests.push({name:'B green checker',pass:!!cb&&cb.id==='pastel-checker'&&cb.layer.gap===0&&Math.abs(cb.layer.size-48)<=10,result:cb});

    let ma=await analyzePatternRestoreImage(checkCanvas,'pastel-checker'),mb=ma.candidates?.[0];
    tests.push({name:'C manual preset reanalysis',pass:!!mb&&mb.id==='pastel-checker',result:mb});

    let tiny=document.createElement('canvas');tiny.width=tiny.height=8;let blob=await new Promise(r=>tiny.toBlob(r,'image/png')),
        payload={schema:2,version:'2.9.1',state:stripStateForSave(state)},tagged=await attachPatternStudioMetadata(blob,payload),
        file=new File([tagged],'restore-test.png',{type:'image/png'}),meta=await readPatternStudioMetadata(file);
    tests.push({name:'D PNG metadata roundtrip',pass:meta?.schema===2&&meta?.version==='2.9.0'})
  }catch(err){tests.push({name:'diagnostic error',pass:false,error:String(err)})}
  return {passed:tests.filter(t=>t.pass).length,total:tests.length,tests}
}
window.CutePatternRestoreDiagnostics={runSyntheticTests:runPatternRestoreSyntheticTests};
function renderReferencePalette(){
  let wrap=$('#referencePalette');if(!wrap)return;wrap.innerHTML='';
  if(!referencePalette.length){wrap.innerHTML='<div class="micro-copy">이미지를 첨부하면 대표색 5개가 자동으로 나타나.</div>';return}
  referencePalette.forEach((c,i)=>{
    let b=document.createElement('button');b.type='button';b.className='reference-palette-chip';b.title=c+' 선택';
    let sw=document.createElement('span');sw.className='reference-palette-swatch';sw.style.background=c;
    let copy=document.createElement('span');copy.innerHTML='<strong>대표색 '+(i+1)+'</strong><small>'+c+'</small>';
    b.append(sw,copy);b.onclick=()=>setReferenceSelectedColor(c,null,{remember:false,autoApplyActive:!!activeReferenceColorInput});wrap.appendChild(b)
  })
}
function renderRecentReferenceColors(){
  let wrap=$('#recentReferenceColors');if(!wrap)return;wrap.innerHTML='';
  if(!recentReferenceColors.length){wrap.innerHTML='<div class="micro-copy">스포이드로 뽑은 색상이 여기에 쌓여.</div>';return}
  recentReferenceColors.forEach((c,i)=>{
    let item=document.createElement('div');item.className='recent-reference-item';
    let use=document.createElement('button');use.type='button';use.className='recent-reference-use';use.title=c;use.innerHTML='<span style="background:'+c+'"></span><small>'+c+'</small>';
    use.onclick=()=>setReferenceSelectedColor(c,null,{remember:false,autoApplyActive:!!activeReferenceColorInput});
    let del=document.createElement('button');del.type='button';del.className='recent-reference-delete';del.textContent='×';del.title='이 색상 삭제';del.onclick=()=>{recentReferenceColors.splice(i,1);saveRecentReferenceColors();renderRecentReferenceColors()};
    item.append(use,del);wrap.appendChild(item)
  })
}
function syncReferenceDockUI(){
  let section=$('#referenceColorSection'),toggle=$('#referenceDockToggle');if(!section)return;
  let mobile=window.innerWidth<=1060;
  section.classList.toggle('is-collapsed',!mobile&&referenceDockCollapsed);
  if(toggle){toggle.hidden=mobile;toggle.textContent=referenceDockCollapsed?'펼치기':'접기';toggle.setAttribute('aria-expanded',String(!referenceDockCollapsed))}
}
function setReferenceDockCollapsed(value){
  referenceDockCollapsed=!!value;
  localStorage.setItem('cps-v260-reference-dock-collapsed',referenceDockCollapsed?'1':'0');
  syncReferenceDockUI();
  if(!referenceDockCollapsed&&referenceImage)requestAnimationFrame(drawReferenceCanvas)
}
function openReferenceDockForColorInput(){
  if(window.innerWidth<=1060)return;
  if(referenceDockCollapsed)setReferenceDockCollapsed(false);
}

function renderReferenceWorkspace(){
  syncReferenceDockUI();
  let has=!!referenceImage,empty=$('#referenceEmpty'),viewport=$('#referenceViewport'),zoomBar=$('#referenceZoomBar'),replace=$('#replaceReferenceBtn'),del=$('#deleteReferenceBtn');
  if(empty)empty.hidden=has;if(viewport)viewport.hidden=!has;if(zoomBar)zoomBar.hidden=!has;if(replace)replace.disabled=!has;if(del)del.disabled=!has;
  renderReferenceSelectedColor();renderReferencePalette();renderRecentReferenceColors();
  if(has)requestAnimationFrame(drawReferenceCanvas)
}
function setupReferenceInteractions(){
  let canvas=$('#referenceCanvas'),viewport=$('#referenceViewport');if(!canvas||!viewport)return;
  canvas.addEventListener('wheel',e=>{if(!referenceImage)return;e.preventDefault();setReferenceZoom(referenceZoom*(e.deltaY<0?1.12:.89),e.clientX,e.clientY)},{passive:false});
  canvas.addEventListener('pointerdown',e=>{if(!referenceImage)return;canvas.setPointerCapture?.(e.pointerId);referenceDragState={id:e.pointerId,startX:e.clientX,startY:e.clientY,panX:referencePanX,panY:referencePanY,dragged:false};canvas.classList.add('dragging')});
  canvas.addEventListener('pointermove',e=>{
    if(referenceDragState&&referenceDragState.id===e.pointerId){
      let dx=e.clientX-referenceDragState.startX,dy=e.clientY-referenceDragState.startY;if(Math.hypot(dx,dy)>3)referenceDragState.dragged=true;
      if(referenceDragState.dragged){referencePanX=referenceDragState.panX+dx;referencePanY=referenceDragState.panY+dy;drawReferenceCanvas()}
    }
    renderReferenceMagnifier(e.clientX,e.clientY)
  });
  canvas.addEventListener('pointerup',e=>{
    if(!referenceDragState||referenceDragState.id!==e.pointerId)return;
    let dragged=referenceDragState.dragged;referenceDragState=null;canvas.classList.remove('dragging');
    if(!dragged){let pt=referenceCanvasPointToImage(e.clientX,e.clientY),sample=pt&&sampleReferencePixel(pt.ix,pt.iy);if(sample)setReferenceSelectedColor(sample.hex,sample.rgb,{remember:true,autoApplyActive:!!activeReferenceColorInput})}
  });
  canvas.addEventListener('pointercancel',()=>{referenceDragState=null;canvas.classList.remove('dragging')});
  canvas.addEventListener('mouseleave',()=>{let m=$('#referenceMagnifier');if(m&&!referenceDragState)m.style.display='none'});
}

function makeEyeDropperButton(onPick){
  let b=document.createElement('button');b.type='button';b.className='dropper';b.textContent='💧';b.title='화면에서 색상 추출';
  b.onclick=async()=>{if(!window.EyeDropper){toast('이 브라우저는 화면 스포이드를 지원하지 않아.');return}try{let r=await new EyeDropper().open();onPick(r.sRGBHex.toUpperCase())}catch{}};return b
}
function overlaySliderRow(label,value,min,max,unit,onChange){
  let wrap=document.createElement('label'),head=document.createElement('div');head.className='overlay-slider-head';
  let title=document.createElement('span');title.textContent=label;
  let valueBox=document.createElement('div');valueBox.className='overlay-slider-value';
  let number=document.createElement('input');number.type='number';number.min=min;number.max=max;number.step='1';number.value=value;
  let suffix=document.createElement('span');suffix.textContent=unit;valueBox.append(number,suffix);head.append(title,valueBox);
  let range=document.createElement('input');range.type='range';range.min=min;range.max=max;range.value=value;
  const apply=v=>{let n=clampInt(v,min,max,value);onChange(n);range.value=n;number.value=n;persistAll();renderMain()};
  range.oninput=()=>apply(range.value);number.onchange=()=>apply(number.value);wrap.append(head,range);return wrap
}
function renderGradientOverlayEditor(){
  let root=$('#gradientOverlayEditor');if(!root)return;
  if(!state.gradientOverlays)state.gradientOverlays={overlay1:defaultGradientOverlay(1),overlay2:defaultGradientOverlay(2)};
  root.innerHTML='';
  [1,2].forEach(index=>{
    let key='overlay'+index,o=state.gradientOverlays[key]=normalizeGradientOverlay(state.gradientOverlays[key],index);
    let card=document.createElement('div');card.className='gradient-overlay-card layer-editor-card';
    let head=document.createElement('div');head.className='section-title-row';
    let title=document.createElement('div');title.innerHTML='<strong>그라데이션 '+index+'</strong><div class="control-subtitle">패턴 구조는 그대로 두고 위에 별도 색상 레이어로 합성돼.</div>';
    let toggle=document.createElement('label');toggle.className='switch-row compact';toggle.innerHTML='<input type="checkbox" '+(o.enabled?'checked':'')+'/> 사용';
    toggle.querySelector('input').onchange=e=>{o.enabled=e.target.checked;persistAll();renderGradientOverlayEditor();renderMain()};
    head.append(title,toggle);card.appendChild(head);
    let body=document.createElement('div');body.className='gradient-overlay-controls';body.style.display=o.enabled?'grid':'none';
    let direction=document.createElement('select');[['top-to-bottom','위 → 아래'],['bottom-to-top','아래 → 위']].forEach(([v,t])=>{let op=document.createElement('option');op.value=v;op.textContent=t;if(o.direction===v)op.selected=true;direction.appendChild(op)});direction.onchange=()=>{o.direction=direction.value;persistAll();renderMain()};
    body.appendChild(labeled('방향',direction));
    let colorRow=document.createElement('div');colorRow.className='color-row';
    let colorLabel=document.createElement('div');colorLabel.className='color-label';colorLabel.textContent='오버레이 색상';
    let picker=document.createElement('input');picker.type='color';picker.value=o.color;
    let txt=document.createElement('input');txt.type='text';txt.maxLength=7;txt.value=o.color.toUpperCase();
    const setColor=v=>{o.color=normalizeHexLike(v,o.color);picker.value=o.color;txt.value=o.color;persistAll();renderMain()};
    picker.oninput=()=>setColor(picker.value);txt.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(txt.value))setColor(txt.value)};
    colorRow.append(colorLabel,picker,txt,makeEyeDropperButton(setColor));body.appendChild(colorRow);
    let grid=document.createElement('div');grid.className='gradient-overlay-grid';
    grid.append(
      overlaySliderRow('불투명도',o.opacity,0,100,'%',v=>o.opacity=v),
      overlaySliderRow('시작 위치',o.start,0,99,'%',v=>{o.start=Math.min(v,o.end-1)}),
      overlaySliderRow('끝 위치',o.end,1,100,'%',v=>{o.end=Math.max(v,o.start+1)}),
      overlaySliderRow('퍼지는 정도',o.spread,0,100,'%',v=>o.spread=v)
    );
    body.appendChild(grid);
    let tip=document.createElement('div');tip.className='micro-copy';tip.textContent=o.direction==='top-to-bottom'?'시작 위치에서 가장 진하고 끝 위치로 갈수록 투명해져.':'끝 위치에서 가장 진하고 시작 위치 쪽으로 갈수록 투명해져.';
    let actions=document.createElement('div');actions.className='preset-actions';
    let reset=document.createElement('button');reset.type='button';reset.className='mini-btn';reset.textContent='이 그라데이션 초기화';reset.onclick=()=>{state.gradientOverlays[key]=defaultGradientOverlay(index);persistAll();renderGradientOverlayEditor();renderMain()};
    actions.appendChild(reset);body.append(tip,actions);card.appendChild(body);root.appendChild(card)
  })
}
function bindPatternWheelScroll(){
  let list=$('#patternList');if(!list)return;
  list.addEventListener('wheel',e=>{
    if(Math.abs(e.deltaY)<Math.abs(e.deltaX))return;
    let max=list.scrollHeight-list.clientHeight;if(max<=0)return;
    let before=list.scrollTop;list.scrollTop+=e.deltaY;
    if(list.scrollTop!==before)e.preventDefault()
  },{passive:false})
}
function bindGlobalControls(){
  bindPatternRestoreControls();
  $('#searchInput').oninput=renderPatternList;
  $('#favoriteOnly').onchange=renderPatternList;
  $('#checkOnly').onchange=renderPatternList;
  $('#uploadAssetBtn').onclick=()=>$('#assetInput').click();
  $('#assetDropzone').onclick=()=>$('#assetInput').click();
  ['dragenter','dragover'].forEach(evt=>$('#assetDropzone').addEventListener(evt,e=>{e.preventDefault();$('#assetDropzone').classList.add('dragover')}));
  ['dragleave','drop'].forEach(evt=>$('#assetDropzone').addEventListener(evt,e=>{e.preventDefault();$('#assetDropzone').classList.remove('dragover')}));
  $('#assetDropzone').addEventListener('drop',e=>{const files=[...(e.dataTransfer?.files||[])];if(files.length)handleAssetFiles(files)});
  $('#assetInput').onchange=e=>{handleAssetFiles([...e.target.files]);e.target.value=''};
  if($('#referenceDockToggle'))$('#referenceDockToggle').onclick=()=>setReferenceDockCollapsed(!referenceDockCollapsed);
  $('#uploadReferenceBtn').onclick=()=>$('#referenceInput').click();
  $('#replaceReferenceBtn').onclick=()=>$('#referenceInput').click();
  $('#deleteReferenceBtn').onclick=clearReferenceImage;
  $('#referenceEmpty').onclick=()=>$('#referenceInput').click();
  $('#referenceInput').onchange=e=>{if(e.target.files[0])handleReferenceFile(e.target.files[0]);e.target.value=''};
  ['dragenter','dragover'].forEach(evt=>$('#referenceDropzone').addEventListener(evt,e=>{e.preventDefault();$('#referenceDropzone').classList.add('dragover')}));
  ['dragleave','drop'].forEach(evt=>$('#referenceDropzone').addEventListener(evt,e=>{e.preventDefault();$('#referenceDropzone').classList.remove('dragover')}));
  $('#referenceDropzone').addEventListener('drop',e=>{let file=e.dataTransfer?.files?.[0];if(file)handleReferenceFile(file)});
  $('#referenceZoomOut').onclick=()=>setReferenceZoom(referenceZoom/1.2);
  $('#referenceZoomIn').onclick=()=>setReferenceZoom(referenceZoom*1.2);
  $('#referenceZoomRange').oninput=e=>setReferenceZoom(+e.target.value/100);
  $('#referenceResetView').onclick=resetReferenceView;
  $('#applyReferenceToActive').onclick=()=>applyReferenceColor('active');
  document.querySelectorAll('[data-reference-apply]').forEach(btn=>btn.onclick=()=>applyReferenceColor(btn.dataset.referenceApply));
  $('#clearRecentReferenceColors').onclick=()=>{recentReferenceColors=[];saveRecentReferenceColors();renderRecentReferenceColors()};
  document.addEventListener('focusin',e=>rememberActiveReferenceColorInput(e.target));
  document.addEventListener('pointerdown',e=>rememberActiveReferenceColorInput(e.target),true);
  window.addEventListener('resize',()=>{syncReferenceDockUI();refreshPreviewZoom();if(referenceImage)drawReferenceCanvas()});
  setupReferenceInteractions();
  $('#bgMode').onchange=e=>{state.bg.mode=e.target.value;if(state.bg.mode==='linear'&&(!state.bg.gradientStops||state.bg.gradientStops.length<2))state.bg.gradientStops=buildGradientStopsFromColors(state.bg.colors);persistAll();syncGlobalControls();renderMain()};
  $('#transparentBg').onchange=e=>{state.bg.transparent=e.target.checked;persistAll();syncGlobalControls();renderMain()};
  $('#backgroundOnly').onchange=e=>{state.bg.backgroundOnly=e.target.checked;persistAll();renderMain()};
  $('#watercolorSpread').oninput=e=>{state.bg.watercolorSpread=+e.target.value;$('#watercolorSpreadVal').textContent=`${e.target.value}%`;persistAll();renderMain()};
  $('#watercolorScale').oninput=e=>{state.bg.watercolorScale=+e.target.value;$('#watercolorScaleVal').textContent=`${e.target.value}%`;persistAll();renderMain()};
  $('#watercolorIrregular').oninput=e=>{state.bg.watercolorIrregular=+e.target.value;$('#watercolorIrregularVal').textContent=`${e.target.value}%`;persistAll();renderMain()};
  $('#watercolorDefinition').oninput=e=>{state.bg.watercolorDefinition=+e.target.value;$('#watercolorDefinitionVal').textContent=`${e.target.value}%`;persistAll();renderMain()};
  if($('#watercolorSparkle'))$('#watercolorSparkle').oninput=e=>{state.bg.watercolorSparkle=+e.target.value;$('#watercolorSparkleVal').textContent=`${e.target.value}%`;persistAll();renderMain()};
  $('#watercolorStyle').onchange=e=>{state.bg.watercolorStyle=e.target.value;persistAll();renderMain()};
  document.querySelectorAll('[data-watercolor-style]').forEach(btn=>btn.onclick=()=>{state.bg.watercolorStyle=btn.dataset.watercolorStyle;persistAll();syncGlobalControls();renderMain()});
  $('#watercolorTexture').onchange=e=>{state.bg.watercolorTexture=e.target.checked;persistAll();renderMain()};
  $('#gradientAngle').oninput=e=>{state.bg.gradientAngle=+e.target.value;$('#gradientAngleVal').textContent=`${state.bg.gradientAngle}°`;persistAll();renderMain()};
  $('#vignetteEnabled').onchange=e=>{state.bg.vignette=state.bg.vignette||{};state.bg.vignette.enabled=e.target.checked;persistAll();syncGlobalControls();renderMain()};
  $('#vignetteColor').oninput=e=>{state.bg.vignette=state.bg.vignette||{};state.bg.vignette.color=normalizeHexLike(e.target.value,state.bg.vignette.color||'#6F55C9');if($('#vignetteColorText'))$('#vignetteColorText').value=state.bg.vignette.color;persistAll();renderMain()};
  $('#vignetteColorText').oninput=e=>{if(/^#[0-9a-fA-F]{6}$/.test(e.target.value)){state.bg.vignette=state.bg.vignette||{};state.bg.vignette.color=e.target.value.toUpperCase();$('#vignetteColor').value=state.bg.vignette.color;persistAll();renderMain()}};
  $('#vignetteRange').oninput=e=>{state.bg.vignette=state.bg.vignette||{};state.bg.vignette.range=+e.target.value;$('#vignetteRangeVal').textContent=`${e.target.value}%`;persistAll();renderMain()};
  $('#vignetteStrength').oninput=e=>{state.bg.vignette=state.bg.vignette||{};state.bg.vignette.strength=+e.target.value;$('#vignetteStrengthVal').textContent=`${e.target.value}%`;persistAll();renderMain()};
  $('#vignetteSoftness').oninput=e=>{state.bg.vignette=state.bg.vignette||{};state.bg.vignette.softness=+e.target.value;$('#vignetteSoftnessVal').textContent=`${e.target.value}%`;persistAll();renderMain()};
  $('#resetVignetteBtn').onclick=()=>{state.bg.vignette={enabled:false,color:'#6F55C9',range:72,strength:28,softness:28};persistAll();syncGlobalControls();renderMain()};
  $('#randomizeAll').onclick=randomizeAll;
  $('#resetBtn').onclick=()=>{if(!confirm('현재 설정을 초기화할까?'))return;state=makeInitialState();activeLayerIndex=0;persistAll();syncAll();toast('초기 상태로 되돌렸어.')};
  $('#savePresetBtn').onclick=saveCurrentPreset;
  $('#duplicateLayerBtn').onclick=()=>addLayer(true);
  $('#exportBtn').onclick=()=>exportPNG(false);
  $('#exportBtn2').onclick=()=>exportPNG(false);
  $('#exportTileBtn').onclick=()=>exportPNG(true);
  $('#exportTileBtn2').onclick=()=>exportPNG(true);
  $('#zoomIn').onclick=()=>setZoom(zoom+.1);
  $('#zoomOut').onclick=()=>setZoom(zoom-.1);
  const parseSizeDraft=(value,min,max)=>{
    let raw=String(value??'').trim();
    if(raw===''||!/^[0-9]+$/.test(raw))return null;
    let n=Number(raw);
    return Number.isFinite(n)&&n>=min&&n<=max?Math.round(n):null
  };
  const applyCanvasSizeDraft=(axis,value)=>{
    let next=parseSizeDraft(value,16,8000);
    if(next===null)return;
    if(axis==='w')state.exportW=next;else state.exportH=next;
    if($('#lockSquare').checked){
      if(axis==='w'){state.exportH=next;$('#exportH').value=next}
      else{state.exportW=next;$('#exportW').value=next}
    }
    persistAll();
    resizePreviewCanvasToOutput();
    renderMain()
  };
  const commitCanvasSize=(axis,input)=>{
    let fallback=axis==='w'?(state.exportW||2000):(state.exportH||2000);
    let next=clampInt(input.value,16,8000,fallback);
    if(axis==='w')state.exportW=next;else state.exportH=next;
    if($('#lockSquare').checked){
      if(axis==='w')state.exportH=next;
      else state.exportW=next
    }
    $('#exportW').value=state.exportW;
    $('#exportH').value=state.exportH;
    persistAll();
    resizePreviewCanvasToOutput();
    renderMain()
  };
  $('#exportW').oninput=e=>applyCanvasSizeDraft('w',e.target.value);
  $('#exportH').oninput=e=>applyCanvasSizeDraft('h',e.target.value);
  $('#exportW').onchange=e=>commitCanvasSize('w',e.target);
  $('#exportH').onchange=e=>commitCanvasSize('h',e.target);
  $('#exportW').onblur=e=>commitCanvasSize('w',e.target);
  $('#exportH').onblur=e=>commitCanvasSize('h',e.target);
  $('#lockSquare').onchange=()=>{
    if($('#lockSquare').checked){
      state.exportH=state.exportW;
      $('#exportH').value=state.exportH;
      persistAll();resizePreviewCanvasToOutput();renderMain()
    }
  };

  const applyTileSizeDraft=(axis,value)=>{
    let next=parseSizeDraft(value,16,4000);
    if(next===null)return;
    if(axis==='w')state.tileW=next;else state.tileH=next;
    if($('#lockTileSquare').checked){
      if(axis==='w'){state.tileH=next;$('#tileH').value=next}
      else{state.tileW=next;$('#tileW').value=next}
    }
    persistAll()
  };
  const commitTileSize=(axis,input)=>{
    let fallback=axis==='w'?(state.tileW||512):(state.tileH||512);
    let next=clampInt(input.value,16,4000,fallback);
    if(axis==='w')state.tileW=next;else state.tileH=next;
    if($('#lockTileSquare').checked){
      if(axis==='w')state.tileH=next;
      else state.tileW=next
    }
    $('#tileW').value=state.tileW;
    $('#tileH').value=state.tileH;
    persistAll()
  };
  $('#tileW').oninput=e=>applyTileSizeDraft('w',e.target.value);
  $('#tileH').oninput=e=>applyTileSizeDraft('h',e.target.value);
  $('#tileW').onchange=e=>commitTileSize('w',e.target);
  $('#tileH').onchange=e=>commitTileSize('h',e.target);
  $('#tileW').onblur=e=>commitTileSize('w',e.target);
  $('#tileH').onblur=e=>commitTileSize('h',e.target);
}
function syncAll(){syncGlobalControls();syncLayerUI();renderPatternList();renderMain();renderAssetList();renderFavoritePreview();renderSavedPresets();renderReferenceWorkspace()}

loadLocal();
runtimeSelfCheck();
bindGlobalControls();
bindPatternWheelScroll();
setupCategories();
setupLayerTabs();
syncAll();
setZoom(1);
if(window.ResizeObserver&&$('#canvasStage'))new ResizeObserver(()=>refreshPreviewZoom()).observe($('#canvasStage'));
