
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
let zoom=1,activeCategory='전체',activeLayerIndex=0,thumbTimer=0,referencePalette=[],recentReferenceColors=[],referenceImage=null,referenceObjectUrl='',referenceSampleCanvas=null,referenceSelectedColor='',referenceSelectedRgb=null,referenceZoom=1,referencePanX=0,referencePanY=0,referenceViewMetrics=null,activeReferenceColorInput=null,activeReferenceColorLabel='',referenceDragState=null,referenceDockCollapsed=localStorage.getItem('cps-v260-reference-dock-collapsed')==='1';

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
function buildLayeredPlaidPalette(baseHex,soft=false){let master=normalizeHexLike(baseHex,'#6E88C8');return soft?{bgA:mixHex(master,'#FFFFFF',.91),bgB:mixHex(master,'#FFFFFF',.82),wide:mixHex(master,'#FFFFFF',.52),mid:mixHex(master,'#FFFFFF',.30),dark:master,hatch:master}:{bgA:mixHex(master,'#FFFFFF',.86),bgB:mixHex(master,'#FFFFFF',.72),wide:mixHex(master,'#FFFFFF',.34),mid:mixHex(master,'#FFFFFF',.18),dark:master,hatch:master}}
function applyLayeredPlaidMaster(layer,baseHex,soft=isSoftAnchorPresetId(layer.presetId)){let pal=buildLayeredPlaidPalette(baseHex,soft);layer.plaidMaster=normalizeHexLike(baseHex,'#F39BBC');layer.colors=[pal.bgA,pal.wide,pal.mid,pal.dark,pal.hatch];layer.plaidBg2=pal.bgB;layer.plaidHatch=layer.plaidHatch!==false;layer.plaidHatchStrength=layer.plaidHatchStrength??40;return pal}
const MASTER_COLOR_SWATCHES=['#D94B5E','#E78238','#D4B83A','#4F9866','#4B79C8','#535AA8','#8A5CC2'];
function defaultAnchorProfileForPreset(presetId=''){
  let preset=PE.presets.find(p=>p.id===presetId),type=preset?.type||'',soft=preset?.opt?.anchorMode==='soft';
  if(type==='grid'||type==='dashed-grid')return [.96,0,.60,.84,.08];
  if(['checker','wavy-checker','textured-checker','plaid','layered-fabric-plaid','overlap-check','airy-mix-check','torn-checker'].includes(type))return soft?[.95,0,.50,.78,.08]:[.90,0,.28,.64,.10];
  if(type==='reference-plaid')return soft?[.96,0,.56,.86,.22]:[.88,0,.32,.66,.14];
  if(['sunburst-bg','soft-sunburst-bg','glossy-sun-bg','sparkle-glow-bg'].includes(type))return [.93,0,.34,.72,.10];
  return [.95,0,.48,.78,.10]
}
function buildAnchorToneProfile(colors,presetId=''){
  let list=normalizeColors(colors),lum=list.map(c=>luminance(c)),min=Math.min(...lum),den=Math.max(1,255-min);
  let profile=lum.map(v=>{let t=(v-min)/den;if(v>=238)t=Math.max(t,.92);return clamp(t,0,.97)});
  if(!profile.some(v=>v<=.02))return defaultAnchorProfileForPreset(presetId);
  return profile
}
function buildThemeTonePalette(baseHex,presetId='',profile=null){
  let master=normalizeHexLike(baseHex,'#D94B7A'),preset=PE.presets.find(p=>p.id===presetId),type=preset?.type||'',soft=preset?.opt?.anchorMode==='soft';
  if(type==='graphic-composition')return normalizeColors([mixHex(master,'#FFFFFF',.96),master,mixHex(master,'#FFFFFF',.58),'#FFFFFF',mixHex(master,'#FFFFFF',.22)]);
  if(type==='reference-plaid')return soft?normalizeColors([mixHex(master,'#FFFFFF',.96),master,mixHex(master,'#FFFFFF',.56),mixHex(master,'#FFFFFF',.86),mixHex(master,'#FFFFFF',.22)]):normalizeColors([mixHex(master,'#FFFFFF',.88),master,mixHex(master,'#FFFFFF',.32),mixHex(master,'#FFFFFF',.66),mixHex(master,'#FFFFFF',.14)]);
  if(['checker','wavy-checker','textured-checker','plaid','overlap-check','airy-mix-check','torn-checker'].includes(type)&&!soft)return normalizeColors([mixHex(master,'#FFFFFF',.90),master,mixHex(master,'#FFFFFF',.28),mixHex(master,'#FFFFFF',.64),mixHex(master,'#FFFFFF',.10)]);
  let tone=(Array.isArray(profile)&&profile.length>=5?profile:defaultAnchorProfileForPreset(presetId)).slice(0,5);
  return tone.map(t=>mixHex(master,'#FFFFFF',clamp(Number(t)||0,0,.975)))
}
function syncCanvasBackgroundToMaster(palette){if(activeLayerIndex!==0||state.bg.transparent)return;let bg=palette[0];state.bg.colors[0]=bg;if(state.bg.mode==='solid'){state.bg.gradientStops=buildGradientStopsFromColors([bg,state.bg.colors[1]||bg])}else if(Array.isArray(state.bg.gradientStops)&&state.bg.gradientStops.length){state.bg.gradientStops[0].color=bg}syncBgGradientState(state.bg)}
function applyMasterTone(layer,baseHex,syncBg=true){
  let master=normalizeHexLike(baseHex,layer.masterColor||'#F59BBC');layer.masterColor=master;layer.colorMode='auto';
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
function defaultLayer(i,presetId='pastel-checker',enabled=true){return {enabled,name:i===0?'기본 레이어':`추가 레이어 ${i}`,sourceType:'builtin',presetId,assetId:'',renderMode:'motif',colors:buildThemeTonePalette('#F59BBC',presetId),size:i===0?72:58,gap:i===0?24:28,jitter:i===0?18:22,rotation:0,stroke:4,opacity:i===0?100:78,detail:45,seed:Math.floor(Math.random()*1e9),svgColorMode:'original',randomSize:true,randomAngle:true,randomPosition:true,offsetX:0,offsetY:0,row1OffsetX:0,row1OffsetY:0,row1Angle:0,row2OffsetX:0,row2OffsetY:0,row2Angle:0,checkerToneMode:false,checkerToneBase:'#AFC3FF',colorMode:'auto',masterColor:'#F59BBC'}}
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
function mergeState(saved){let base=makeInitialState();if(!saved||typeof saved!=='object')return base;let merged={...base,...saved,bg:{...base.bg,...(saved.bg||{})}};merged.gradientOverlays={overlay1:normalizeGradientOverlay(saved.gradientOverlays?.overlay1,1),overlay2:normalizeGradientOverlay(saved.gradientOverlays?.overlay2,2)};merged.layers=(saved.layers||base.layers).slice(0,MAX_LAYERS).map((l,i)=>({...defaultLayer(i),...l,colors:normalizeColors(l.colors||defaultLayer(i).colors)}));if(!merged.layers.length)merged.layers=[defaultLayer(0,'pastel-checker',true)];merged.layers[0].enabled=true;merged.layers[0].name='기본 레이어';if(!Number.isFinite(+merged.layers[0].opacity)||+merged.layers[0].opacity<=0)merged.layers[0].opacity=100;merged.bg.colors=[merged.bg.colors?.[0]||defaultBg[0],merged.bg.colors?.[1]||merged.bg.colors?.[0]||defaultBg[1]];merged.bg.gradientAngle=clampInt(merged.bg.gradientAngle,0,360,135);merged.bg.backgroundOnly=!!merged.bg.backgroundOnly;merged.bg.watercolorSpread=clampInt(merged.bg.watercolorSpread,10,100,62);merged.bg.watercolorScale=clampInt(merged.bg.watercolorScale,15,100,58);merged.bg.watercolorIrregular=clampInt(merged.bg.watercolorIrregular,0,100,72);merged.bg.watercolorTexture=merged.bg.watercolorTexture!==false;merged.bg.watercolorStyle=['mist','cloud','bloom','aqua','pearl','blotch','wash','corner','aquaMilk','aquaSparkle','aquaFrost','wateryCloud'].includes(merged.bg.watercolorStyle)?merged.bg.watercolorStyle:'mist';merged.bg.watercolorDefinition=clampInt(merged.bg.watercolorDefinition,0,100,52);merged.bg.watercolorSparkle=clampInt(merged.bg.watercolorSparkle,0,100,28);merged.bg.watercolorSeed=clampInt(merged.bg.watercolorSeed,0,999999999,47291);merged.bg.vignette={enabled:!!merged.bg.vignette?.enabled,color:normalizeHexLike(merged.bg.vignette?.color||'#6F55C9','#6F55C9'),range:clampInt(merged.bg.vignette?.range,0,100,72),strength:clampInt(merged.bg.vignette?.strength,0,100,28),softness:clampInt(merged.bg.vignette?.softness,0,100,28)};syncBgGradientState(merged.bg);merged.layers.forEach((layer,i)=>{if(i>0&&!layer.name)layer.name=`추가 레이어 ${i}`;if(layer.presetId==='legacy-soft-airy-mix-check')layer.presetId='airy-mix-check';if(layer.sourceType==='builtin'&&!PE.presets.some(p=>p.id===layer.presetId))layer.presetId='pastel-checker';if(layer.randomSize===undefined)layer.randomSize=true;if(layer.randomAngle===undefined)layer.randomAngle=true;if(layer.randomPosition===undefined)layer.randomPosition=true;if(isUniformShapePresetId(layer.presetId)){layer.randomSize=false;layer.randomAngle=false;layer.randomPosition=false;}if(layer.offsetX===undefined)layer.offsetX=0;if(layer.offsetY===undefined)layer.offsetY=0;['row1OffsetX','row1OffsetY','row1Angle','row2OffsetX','row2OffsetY','row2Angle'].forEach(k=>{if(layer[k]===undefined)layer[k]=0});if(layer.checkerToneMode===undefined)layer.checkerToneMode=false;if(!layer.checkerToneBase)layer.checkerToneBase=(layer.colors&&layer.colors[1])||'#AFC3FF';if(!layer.colorMode)layer.colorMode='individual';if(!layer.masterColor)layer.masterColor=(layer.colors&&layer.colors[1])||'#F59BBC';if(!Array.isArray(layer.anchorToneProfile)||layer.anchorToneProfile.length<5)layer.anchorToneProfile=defaultAnchorProfileForPreset(layer.presetId);if(isPastelGridPresetId(layer.presetId)){let d=PE.defaults['grid']||{};if(layer.gridX===undefined)layer.gridX=d.gridX??96;if(layer.gridY===undefined)layer.gridY=d.gridY??96}if(isDashedGridPresetId(layer.presetId)){let d=PE.defaults[layer.presetId]||PE.defaults['dashed-grid']||{};['dashedLineColor','dashedLineOpacity','dashedLineWidth','dashLength','dashGap','gridX','gridY'].forEach(k=>{if(layer[k]===undefined)layer[k]=d[k]});if(isHeartDashedGridPresetId(layer.presetId)){['dashedHeartColor','dashedHeartOpacity','dashedHeartSize','dashedHeartEvery'].forEach(k=>{if(layer[k]===undefined)layer[k]=d[k]})}}if(isTriHatchPresetId(layer.presetId)){let d=PE.defaults[layer.presetId]||PE.defaults['no-gap-tri-check']||{};if(layer.triHatch===undefined)layer.triHatch=d.triHatch!==false;if(layer.triHatchStrength===undefined)layer.triHatchStrength=d.triHatchStrength??40;if(layer.triHatchAlternate===undefined)layer.triHatchAlternate=d.triHatchAlternate!==false}if(isAiryMixPresetId(layer.presetId)){let d=PE.defaults[layer.presetId]||{};if(!layer.airyStripeColor)layer.airyStripeColor=d.airyStripeColor||'#FFFFFF';if(layer.airyPointCount===undefined)layer.airyPointCount=d.airyPointCount??24;if(!layer.airyPointColor)layer.airyPointColor=d.airyPointColor||'#FFFFFF';if(layer.airyPointGrid===undefined)layer.airyPointGrid=d.airyPointGrid??4;if(!['all','every2','every3','checker','vertical','horizontal'].includes(layer.airyPointPattern))layer.airyPointPattern=d.airyPointPattern||'every3'}if(isGraphicCompositionPresetId(layer.presetId)){let d=PE.defaults[layer.presetId]||{};if(layer.graphicSafeArea===undefined)layer.graphicSafeArea=d.graphicSafeArea??60;if(layer.graphicBarScale===undefined)layer.graphicBarScale=d.graphicBarScale??100;if(layer.graphicCircleScale===undefined)layer.graphicCircleScale=d.graphicCircleScale??100;if(layer.graphicSmallScale===undefined)layer.graphicSmallScale=d.graphicSmallScale??100;if(layer.graphicLargeScale===undefined)layer.graphicLargeScale=d.graphicLargeScale??110;if(layer.graphicBalance===undefined)layer.graphicBalance=d.graphicBalance??90;if(!layer.graphicMotifMode)layer.graphicMotifMode=d.graphicMotifMode||'mixed'}layer.colors=normalizeColors(layer.colors)});return merged}
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
function layerToPatternState(layer,seamless=false){let uniform=isUniformShapePresetId(layer.presetId);return {presetId:layer.presetId,colors:normalizeColors(layer.colors),anchorExact:layer.colorMode==='auto'&&!isSoftAnchorPresetId(layer.presetId),anchorColor:layer.masterColor,size:layer.size,gap:layer.gap,jitter:seamless?0:layer.jitter,rotation:layer.rotation,stroke:layer.stroke,opacity:layer.opacity,detail:layer.detail,seed:layer.seed,bgMode:'solid',gradientAngle:0,transparentBg:false,skipBackground:true,randomSize:uniform?false:layer.randomSize!==false,randomAngle:uniform?false:layer.randomAngle!==false,randomPosition:layer.randomPosition!==false,offsetX:layer.offsetX||0,offsetY:layer.offsetY||0,row1OffsetX:layer.row1OffsetX||0,row1OffsetY:layer.row1OffsetY||0,row1Angle:layer.row1Angle||0,row2OffsetX:layer.row2OffsetX||0,row2OffsetY:layer.row2OffsetY||0,row2Angle:layer.row2Angle||0,plaidBg2:layer.plaidBg2,plaidHatch:layer.plaidHatch,plaidHatchStrength:layer.plaidHatchStrength,triHatch:layer.triHatch,triHatchStrength:layer.triHatchStrength,triHatchAlternate:layer.triHatchAlternate,airyStripeColor:layer.airyStripeColor,airyPointCount:layer.airyPointCount,airyPointColor:layer.airyPointColor,airyPointGrid:layer.airyPointGrid,airyPointPattern:layer.airyPointPattern,dashedLineColor:layer.dashedLineColor,dashedLineOpacity:layer.dashedLineOpacity,dashedLineWidth:layer.dashedLineWidth,dashLength:layer.dashLength,dashGap:layer.dashGap,gridX:layer.gridX,gridY:layer.gridY,dashedHeartColor:layer.dashedHeartColor,dashedHeartOpacity:layer.dashedHeartOpacity,dashedHeartSize:layer.dashedHeartSize,dashedHeartEvery:layer.dashedHeartEvery,graphicSafeArea:layer.graphicSafeArea,graphicBarScale:layer.graphicBarScale,graphicCircleScale:layer.graphicCircleScale,graphicSmallScale:layer.graphicSmallScale,graphicLargeScale:layer.graphicLargeScale,graphicBalance:layer.graphicBalance,graphicMotifMode:layer.graphicMotifMode}}
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
function composePreviewFrame(){
  let frame=document.createElement('canvas');frame.width=canvas.width;frame.height=canvas.height;
  let fctx=frame.getContext('2d');
  fctx.setTransform(1,0,0,1,0,0);fctx.globalAlpha=1;fctx.globalCompositeOperation='source-over';
  drawBackground(fctx,frame.width,frame.height);
  if(!state.bg.backgroundOnly) for(let layer of state.layers){
    if(!layer.enabled)continue;
    try{
      fctx.setTransform(1,0,0,1,0,0);fctx.globalAlpha=1;fctx.globalCompositeOperation='source-over';
      if(layer.sourceType==='builtin')PE.render(fctx,frame.width,frame.height,layerToPatternState(layer,false),getPreset(layer.presetId),frame.width/2000);
      else renderUploadedLayer(fctx,frame.width,frame.height,layer,frame.width/2000,false);
    }catch(err){console.error('Layer render failed:',layer?.presetId||layer?.assetId,err)}
  }
  fctx.setTransform(1,0,0,1,0,0);fctx.globalAlpha=1;fctx.globalCompositeOperation='source-over';
  applyGradientOverlays(fctx,frame.width,frame.height);
  applyVignette(fctx,frame.width,frame.height);
  return frame
}
function renderMainNow(){
  const frame=composePreviewFrame();
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='copy';ctx.drawImage(frame,0,0);ctx.globalCompositeOperation='source-over';
  updateSelected();renderCirclePreview()
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
function thumbnailLayerForPreset(p){let layer={...currentLayer(),presetId:p.id,sourceType:'builtin'};let d=PE.defaults[p.id]||{};Object.assign(layer,d);return layer}
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
    if(layer.colorMode==='auto')applyMasterTone(layer,layer.masterColor,!isDashedGridPresetId(id));
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
  let colorHead=document.createElement('div');colorHead.className='section-title-row';colorHead.innerHTML='<div><h3>색상 설정</h3><div class="control-subtitle">디자인 구조는 그대로 두고 색만 바꿔.</div></div>';colorBox.appendChild(colorHead);
  let mode=document.createElement('div');mode.className='color-mode-tabs';let autoBtn=document.createElement('button'),manualBtn=document.createElement('button');autoBtn.type=manualBtn.type='button';autoBtn.textContent='대표색으로 자동 설정';manualBtn.textContent='개별 색상 직접 설정';autoBtn.className=layer.colorMode!=='individual'?'active':'';manualBtn.className=layer.colorMode==='individual'?'active':'';mode.append(autoBtn,manualBtn);colorBox.appendChild(mode);
  if(layer.colorMode!=='individual'){let master=document.createElement('div');master.className='master-color-panel';let lab=document.createElement('div');lab.className='master-label';lab.innerHTML='<strong>대표 색상 · Anchor Color</strong><span>선택한 색상을 가장 진한 기준색으로 사용하고, 나머지는 기존 밝기 관계를 유지한 틴트로 자동 생성해.</span>';let row=document.createElement('div');row.className='master-color-row';let picker=document.createElement('input');picker.type='color';picker.value=normalizeHexLike(layer.masterColor||layer.colors[1]||'#F59BBC','#F59BBC');let txt=document.createElement('input');txt.type='text';txt.maxLength=7;txt.value=picker.value.toUpperCase();let apply=function(v){v=normalizeHexLike(v,picker.value);picker.value=v;txt.value=v;applyMasterTone(layer,v,!isDashedGridPresetId(layer.presetId));persistAll();renderPatternListDebounced();syncGlobalControls();renderMain()};picker.oninput=function(){apply(picker.value)};txt.onchange=function(){if(/^#[0-9a-fA-F]{6}$/.test(txt.value))apply(txt.value)};row.append(picker,txt,makeEyeDropperButton(apply));let sw=document.createElement('div');sw.className='master-swatches';MASTER_COLOR_SWATCHES.forEach(function(c){let b=document.createElement('button');b.type='button';b.className='master-swatch';b.style.background=c;b.title=c;b.onclick=function(){apply(c)};sw.appendChild(b)});master.append(lab,row,sw);colorBox.appendChild(master)}else{let note=document.createElement('div');note.className='individual-note';note.textContent='캔버스 배경과 패턴에 사용되는 색을 각각 직접 지정할 수 있어.';colorBox.appendChild(note);let uniformShape=layer.sourceType==='builtin'&&isUniformShapePresetId(layer.presetId);if(activeLayerIndex===0){let bgRow=document.createElement('div');bgRow.className='color-row actual-bg-row';let bgLab=document.createElement('div');bgLab.className='color-label';bgLab.textContent='캔버스 배경';let bgPicker=document.createElement('input');bgPicker.type='color';bgPicker.value=state.bg.colors[0]||'#FFFFFF';let bgText=document.createElement('input');bgText.type='text';bgText.maxLength=7;bgText.value=bgPicker.value.toUpperCase();let setBg=function(v){v=normalizeHexLike(v,bgPicker.value);state.bg.colors[0]=v;bgPicker.value=v;bgText.value=v;syncBgGradientState(state.bg);persistAll();renderMain()};bgPicker.oninput=function(){setBg(bgPicker.value)};bgText.onchange=function(){if(/^#[0-9a-fA-F]{6}$/.test(bgText.value))setBg(bgText.value)};bgRow.append(bgLab,bgPicker,bgText);colorBox.appendChild(bgRow)}
if(uniformShape){
  let row=document.createElement('div');row.className='color-row actual-bg-row';
  let lab=document.createElement('div');lab.className='color-label';lab.textContent='모양 색상';
  let picker=document.createElement('input');picker.type='color';picker.value=layer.colors[1]||'#F59BBC';
  let txt=document.createElement('input');txt.type='text';txt.maxLength=7;txt.value=picker.value.toUpperCase();
  let setShape=v=>{v=normalizeHexLike(v,layer.colors[1]||'#F59BBC');layer.colors[1]=v;picker.value=v;txt.value=v;persistAll();renderPatternListDebounced();renderMain()};
  picker.oninput=()=>setShape(picker.value);txt.onchange=()=>{if(/^#[0-9a-fA-F]{6}$/.test(txt.value))setShape(txt.value)};
  row.append(lab,picker,txt,makeEyeDropperButton(setShape));colorBox.appendChild(row)
}else colorBox.appendChild(renderColorInputs(layer.colors,()=>{persistAll();let asset=userAssets.find(v=>v.id===layer.assetId);if(asset&&asset.kind==='svg'){asset._img=null;ensureAssetImage(asset,layer).then(renderMain)}renderPatternListDebounced();renderAssetList();renderMain()}))}
  autoBtn.onclick=function(){if(layer.colorMode==='individual')layer.anchorToneProfile=buildAnchorToneProfile(layer.colors,layer.presetId);layer.colorMode='auto';applyMasterTone(layer,layer.masterColor||layer.colors[1]||'#F59BBC',true);persistAll();renderLayerEditor();syncGlobalControls();renderPatternListDebounced();renderMain()};manualBtn.onclick=function(){layer.colorMode='individual';persistAll();renderLayerEditor();renderMain()};top.appendChild(colorBox);
  if(layer.sourceType==='builtin'&&['checker','plaid','overlap-check','airy-mix-check','layered-fabric-plaid','reference-plaid','textured-checker'].includes(PE.presets.find(p=>p.id===layer.presetId)?.type)){
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
  if(layer.sourceType==='builtin'&&isPastelGridPresetId(layer.presetId)){
    let d=PE.defaults['grid']||{};
    if(layer.gridX===undefined)layer.gridX=d.gridX??96;
    if(layer.gridY===undefined)layer.gridY=d.gridY??96;
    let box=document.createElement('div');box.className='layer-editor-card';
    box.innerHTML='<div class="section-title-row"><h3>파스텔 격자 크기</h3></div><div class="control-subtitle">정사각형뿐 아니라 가로로 긴 격자·세로로 긴 격자도 만들 수 있도록 <strong>X 크기와 Y 크기를 각각 독립적으로</strong> 조절해.</div>';
    let grid=document.createElement('div');grid.className='layer-editor-grid';
    grid.append(
      sliderRow('격자 X 크기 · 가로','gridX',layer.gridX??96,20,400,'px',v=>layer.gridX=v),
      sliderRow('격자 Y 크기 · 세로','gridY',layer.gridY??96,20,400,'px',v=>layer.gridY=v)
    );
    let reset=document.createElement('button');reset.type='button';reset.className='mini-btn';reset.textContent='X/Y 동일하게 초기화';
    reset.onclick=()=>{layer.gridX=d.gridX??96;layer.gridY=d.gridY??96;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
    box.append(grid,reset);top.appendChild(box)
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

async function handleAssetFiles(files){let added=0,addedAssets=[];for(let file of files){try{let asset=await fileToAsset(file);userAssets.unshift(asset);addedAssets.unshift(asset);added++}catch(e){console.error(e)}}if(added){let layer=currentLayer();if(addedAssets[0]){layer.sourceType='uploaded';layer.assetId=addedAssets[0].id;layer.renderMode=layer.renderMode||'motif'}persistAll();syncLayerUI();renderAssetList();toast(`${added}개 에셋을 추가했고, 현재 레이어에 바로 연결했어.`);renderMain()}}
function readFileAsDataURL(file){return new Promise((resolve,reject)=>{let fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(file)})}
function readFileAsText(file){return new Promise((resolve,reject)=>{let fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsText(file)})}
async function fileToAsset(file){let kind=file.type.includes('svg')||file.name.toLowerCase().endsWith('.svg')?'svg':'raster';let dataURL=await readFileAsDataURL(file);let asset={id:uid('asset'),name:file.name,kind,dataURL,addedAt:Date.now(),svgText:'',svgColorMode:'original',tint:'#9B87F5'};if(kind==='svg')asset.svgText=await readFileAsText(file);await ensureAssetImage(asset,{svgColorMode:'original',colors:['#FFF','#9B87F5','#B9D7FF','#BFAAF2']}).catch(()=>null);return asset}
function renderAssetList(){let wrap=$('#assetList');wrap.innerHTML='';if(!userAssets.length){wrap.innerHTML='<div class="reference-preview empty">아직 업로드한 에셋이 없어. 위의 업로드 박스에 투명 PNG/SVG를 넣으면 바로 패턴용으로 사용할 수 있어.</div>';return}userAssets.forEach(asset=>{let card=document.createElement('div');card.className='asset-card';let thumb=asset._img?document.createElement('img'):document.createElement('div');thumb.className='asset-thumb'+(asset._img?'':' fallback');if(asset._img)thumb.src=asset._img.src;else thumb.textContent=asset.kind==='svg'?'◇':'▣';let meta=document.createElement('div');meta.className='asset-meta';meta.innerHTML=`<strong>${asset.name}</strong><small>${asset.kind==='svg'?'SVG (색상 변환 가능)':'PNG/JPG (크기·간격 조절 가능)'}</small>`;let acts=document.createElement('div');acts.className='asset-actions';let assign=document.createElement('button');assign.className='mini-btn';assign.textContent='현재 레이어에 적용';assign.onclick=()=>{let layer=currentLayer();layer.sourceType='uploaded';layer.assetId=asset.id;persistAll();syncLayerUI();renderAssetList();renderMain()};let del=document.createElement('button');del.className='mini-btn';del.textContent='삭제';del.onclick=()=>{if(!confirm('이 에셋을 삭제할까?'))return;userAssets=userAssets.filter(a=>a.id!==asset.id);state.layers.forEach(layer=>{if(layer.assetId===asset.id){layer.assetId='';layer.sourceType='builtin'}});persistAll();renderAssetList();syncLayerUI();renderMain()};acts.append(assign,del);card.append(thumb,meta,acts);if(currentLayer().sourceType==='uploaded'&&currentLayer().assetId===asset.id)card.style.borderColor='#9b87f0';wrap.appendChild(card)})}

function renderFavoritePreview(){let wrap=$('#favoritePreview');wrap.innerHTML='';if(!favorites.size){wrap.innerHTML='<span class="muted mini-copy">즐겨찾기한 패턴이 아직 없어.</span>';return}[...favorites].slice(0,18).forEach(id=>{let p=getPreset(id);let chip=document.createElement('button');chip.className='chip';chip.textContent=`★ ${p.name}`;chip.onclick=()=>{activeCategory='전체';setupCategories();selectPatternForActiveLayer(id);renderPatternList()};wrap.appendChild(chip)})}
function renderSavedPresets(){let wrap=$('#savedPresetList');wrap.innerHTML='';if(!myPresets.length){wrap.innerHTML='<div class="muted mini-copy">저장된 내 프리셋이 아직 없어.</div>';return}myPresets.forEach(item=>{let card=document.createElement('div');card.className='preset-card';let info=document.createElement('div');info.innerHTML=`<strong>${item.name}</strong><small>${new Date(item.savedAt).toLocaleString()}</small>`;let acts=document.createElement('div');acts.className='preset-actions';let apply=document.createElement('button');apply.className='mini-btn';apply.textContent='적용';apply.onclick=()=>{state=mergeState(clone(item.state));activeLayerIndex=0;persistAll();syncAll()};let del=document.createElement('button');del.className='mini-btn';del.textContent='삭제';del.onclick=()=>{myPresets=myPresets.filter(v=>v.id!==item.id);persistAll();renderSavedPresets();toast('프리셋을 삭제했어.')};acts.append(apply,del);card.append(info,acts);wrap.appendChild(card)})}
function saveCurrentPreset(){let name=prompt('저장할 프리셋 이름을 입력해줘.','내 패턴 프리셋');if(!name)return;myPresets.unshift({id:uid('preset'),name:name.trim()||'내 프리셋',savedAt:Date.now(),state:clone(stripStateForSave(state))});myPresets=myPresets.slice(0,40);persistAll();renderSavedPresets();toast('현재 설정을 내 프리셋에 저장했어.')}

function setupPalettes(){/* reserved for future UI विस्तार */}
function syncGlobalControls(){renderBgColorInputs();renderGradientOverlayEditor();$('#bgMode').value=state.bg.mode;$('#transparentBg').checked=state.bg.transparent;$('#gradientAngle').value=state.bg.gradientAngle;$('#gradientAngleVal').textContent=`${state.bg.gradientAngle}°`;$('#gradientControls').style.display=state.bg.mode==='linear'&&!state.bg.transparent?'block':'none';$('#watercolorControls').style.display=state.bg.mode==='watercolor'&&!state.bg.transparent?'block':'none';$('#backgroundOnly').checked=!!state.bg.backgroundOnly;$('#watercolorSpread').value=state.bg.watercolorSpread??62;$('#watercolorSpreadVal').textContent=`${state.bg.watercolorSpread??62}%`;$('#watercolorScale').value=state.bg.watercolorScale??58;$('#watercolorScaleVal').textContent=`${state.bg.watercolorScale??58}%`;$('#watercolorIrregular').value=state.bg.watercolorIrregular??72;$('#watercolorIrregularVal').textContent=`${state.bg.watercolorIrregular??72}%`;if($('#watercolorDefinition'))$('#watercolorDefinition').value=state.bg.watercolorDefinition??52;if($('#watercolorDefinitionVal'))$('#watercolorDefinitionVal').textContent=`${state.bg.watercolorDefinition??52}%`;if($('#watercolorSparkle'))$('#watercolorSparkle').value=state.bg.watercolorSparkle??28;if($('#watercolorSparkleVal'))$('#watercolorSparkleVal').textContent=`${state.bg.watercolorSparkle??28}%`;$('#watercolorTexture').checked=state.bg.watercolorTexture!==false;if($('#watercolorStyle'))$('#watercolorStyle').value=state.bg.watercolorStyle||'mist';let v=state.bg.vignette||{};if($('#vignetteEnabled'))$('#vignetteEnabled').checked=!!v.enabled;if($('#vignetteColor'))$('#vignetteColor').value=normalizeHexLike(v.color||'#6F55C9','#6F55C9');if($('#vignetteColorText'))$('#vignetteColorText').value=normalizeHexLike(v.color||'#6F55C9','#6F55C9');if($('#vignetteRange'))$('#vignetteRange').value=v.range??72;if($('#vignetteRangeVal'))$('#vignetteRangeVal').textContent=`${v.range??72}%`;if($('#vignetteStrength'))$('#vignetteStrength').value=v.strength??28;if($('#vignetteStrengthVal'))$('#vignetteStrengthVal').textContent=`${v.strength??28}%`;if($('#vignetteSoftness'))$('#vignetteSoftness').value=v.softness??28;if($('#vignetteSoftnessVal'))$('#vignetteSoftnessVal').textContent=`${v.softness??28}%`;if($('#vignetteControls'))$('#vignetteControls').style.display=v.enabled?'block':'none';$('#exportW').value=state.exportW;$('#exportH').value=state.exportH;$('#tileW').value=state.tileW;$('#tileH').value=state.tileH}
function setZoom(v){zoom=clamp(v,.3,1.6);$('#zoomText').textContent=Math.round(zoom*100)+'%';canvas.style.width=`min(${72*zoom}vh, ${78*zoom}vw)`}
function renderCirclePreview(){if(!circleCtx||!circleCanvas)return;let w=circleCanvas.width,h=circleCanvas.height,r=Math.min(w,h)/2-4;circleCtx.clearRect(0,0,w,h);circleCtx.save();circleCtx.beginPath();circleCtx.arc(w/2,h/2,r,0,Math.PI*2);circleCtx.closePath();circleCtx.clip();circleCtx.drawImage(canvas,0,0,w,h);circleCtx.restore();circleCtx.save();circleCtx.beginPath();circleCtx.arc(w/2,h/2,r,0,Math.PI*2);circleCtx.lineWidth=8;circleCtx.strokeStyle='rgba(255,255,255,.96)';circleCtx.stroke();circleCtx.beginPath();circleCtx.arc(w/2,h/2,r,0,Math.PI*2);circleCtx.lineWidth=1.5;circleCtx.strokeStyle='rgba(210,198,240,.95)';circleCtx.stroke();circleCtx.restore();}
function randomizeAll(){
let palette=palettePresets[Math.floor(Math.random()*palettePresets.length)];state.bg.colors=[palette[0],palette[1]];state.bg.gradientStops=buildGradientStopsFromColors([palette[0],palette[1]]);state.layers.forEach((layer,i)=>{let candidates=PE.presets.filter(p=>(!$('#favoriteOnly').checked||favorites.has(p.id))&&(!$('#checkOnly')?.checked||checkPresetOnly(p)));let pool=candidates.length?candidates:PE.presets;let p=pool[Math.floor(Math.random()*Math.max(1,pool.length))];layer.sourceType='builtin';layer.presetId=p.id;let d=PE.defaults[p.id]||{};Object.assign(layer,d);layer.colors=normalizeColors(shuffle(palette.concat()).slice(0,4));layer.colors[4]=suggestLineColor(layer.colors);layer.size=clamp((d.size??layer.size)+(i*10),12,220);layer.gap=clamp((d.gap??layer.gap)+Math.floor(Math.random()*30),0,140);layer.jitter=clamp((d.jitter??20)+Math.floor(Math.random()*40),0,100);layer.rotation=Math.floor(-18+Math.random()*36);layer.opacity=clamp(100-i*18,20,100);layer.detail=Math.floor(25+Math.random()*70);layer.enabled=i===0?true:(Math.random()>.25);layer.randomSize=isUniformShapePresetId(p.id)?false:true;layer.randomAngle=isUniformShapePresetId(p.id)?false:true;layer.randomPosition=isUniformShapePresetId(p.id)?false:true;layer.offsetX=0;layer.offsetY=0;layer.row1OffsetX=0;layer.row1OffsetY=0;layer.row1Angle=0;layer.row2OffsetX=0;layer.row2OffsetY=0;layer.row2Angle=0;if(p.type==='graphic-composition'){layer.graphicSafeArea=d.graphicSafeArea??60;layer.graphicBarScale=d.graphicBarScale??100;layer.graphicCircleScale=d.graphicCircleScale??100;layer.graphicMotifMode=d.graphicMotifMode||'auto'}layer.checkerToneMode=false;layer.checkerToneBase=layer.colors[1];layer.seed=Math.floor(Math.random()*1e9)});persistAll();syncAll();toast('배경과 레이어 패턴을 랜덤으로 조합했어.')
}
async function exportPNG(seamless=false){
  let w=clamp(+($('#exportW').value)||2000,256,6000),h=clamp(+($('#exportH').value)||2000,256,6000);
  if(seamless){w=clamp(+($('#tileW').value)||512,64,4000);h=clamp(+($('#tileH').value)||512,64,4000)}
  state.exportW=w;state.exportH=h;if(seamless){state.tileW=w;state.tileH=h}persistAll();
  let out=document.createElement('canvas');out.width=w;out.height=h;let octx=out.getContext('2d');
  drawBackground(octx,w,h);
  if(!state.bg.backgroundOnly) for(let layer of state.layers){
    if(!layer.enabled)continue;
    if(layer.sourceType==='builtin'){PE.render(octx,w,h,layerToPatternState(layer,seamless),getPreset(layer.presetId),w/2000)}
    else{let asset=userAssets.find(v=>v.id===layer.assetId);if(asset){await ensureAssetImage(asset,layer).catch(()=>null);renderUploadedLayer(octx,w,h,layer,w/2000,seamless)}}
  }
  applyGradientOverlays(octx,w,h);
  applyVignette(octx,w,h);
  let blob=await new Promise(r=>out.toBlob(r,'image/png'));if(!blob){toast('PNG 생성에 실패했어.');return}
  let link=document.createElement('a');link.href=URL.createObjectURL(blob);
  link.download=seamless?('cute-pattern-seamless-'+w+'x'+h+'.png'):('cute-pattern-'+w+'x'+h+'.png');
  link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1500);toast(w+'×'+h+' PNG를 저장했어.')
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
    state.bg.colors[0]=hex;if(!Array.isArray(state.bg.gradientStops)||!state.bg.gradientStops.length)state.bg.gradientStops=buildGradientStopsFromColors(state.bg.colors);
    state.bg.gradientStops[0].color=hex;syncBgGradientState(state.bg);persistAll();syncGlobalControls();renderMain();toast('배경색에 '+hex+' 적용');return
  }
  if(kind==='anchor'){
    layer.colorMode='auto';applyMasterTone(layer,hex,!isDashedGridPresetId(layer.presetId));persistAll();syncLayerUI();syncGlobalControls();renderPatternListDebounced();renderMain();toast('대표색에 '+hex+' 적용');return
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
  window.addEventListener('resize',()=>{syncReferenceDockUI();if(referenceImage)drawReferenceCanvas()});
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
  $('#exportW').oninput=e=>{state.exportW=clamp(+e.target.value||2000,256,6000);if($('#lockSquare').checked){state.exportH=state.exportW;$('#exportH').value=state.exportH}persistAll()};
  $('#exportH').oninput=e=>{state.exportH=clamp(+e.target.value||2000,256,6000);if($('#lockSquare').checked){state.exportW=state.exportH;$('#exportW').value=state.exportW}persistAll()};
  $('#tileW').oninput=e=>{state.tileW=clamp(+e.target.value||512,64,4000);if($('#lockTileSquare').checked){state.tileH=state.tileW;$('#tileH').value=state.tileH}persistAll()};
  $('#tileH').oninput=e=>{state.tileH=clamp(+e.target.value||512,64,4000);if($('#lockTileSquare').checked){state.tileW=state.tileH;$('#tileW').value=state.tileW}persistAll()};
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
