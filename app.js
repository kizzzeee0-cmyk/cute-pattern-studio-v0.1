
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
const STORAGE={state:'cps-v151-state',favorites:'cps-v151-favorites',presets:'cps-v151-presets',assets:'cps-v151-assets'};
const MAX_LAYERS=8;
const AI_EXAMPLES=[
  'mint kawaii doodle background',
  'pastel halftone background',
  'cute cloud doodle',
  'soft pastel pink gingham, tiny bows, hand drawn texture, cute profile background',
  'peach and cream mini polka dot, soft ribbon accents, dreamy cute background'
];
const AI_EXCLUDE_EXAMPLES=['checker, gingham, plaid','hearts, stars','bows, ribbons','dots, halftone','clouds'];
const colorMeta=[['배경 A','주 배경/기본색'],['패턴 A','패턴 기본색'],['패턴 B','서브 패턴색'],['포인트','포인트/장식색'],['선 색','체크 외곽선/그리드 선']];
const defaultBg=['#FFF9FC','#F5B9D4'];
const MAX_BG_STOPS=6;
let zoom=1,activeCategory='전체',activeLayerIndex=0,thumbTimer=0,referencePalette=[],aiSuggestions=[];

function normalizeHexLike(value,fallback='#FFFFFF'){return /^#[0-9a-fA-F]{6}$/.test(String(value||'').trim())?String(value).trim().toUpperCase():fallback}
function buildGradientStopsFromColors(colors){let list=(Array.isArray(colors)?colors:[...defaultBg]).filter(Boolean).map((c,i)=>normalizeHexLike(c,defaultBg[Math.min(i,defaultBg.length-1)]||'#FFFFFF')).slice(0,MAX_BG_STOPS);if(!list.length)list=[defaultBg[0],defaultBg[1]];if(list.length===1)list.push(list[0]);let step=list.length>1?100/(list.length-1):100;return list.map((color,i)=>({color,pos:Math.round(step*i)}))}
function normalizeGradientStops(stops,fallbackColors=defaultBg){let base=Array.isArray(stops)?stops.filter(Boolean).slice(0,MAX_BG_STOPS):[];if(!base.length)base=buildGradientStopsFromColors(fallbackColors);let count=Math.max(2,base.length);let out=base.map((stop,i)=>({color:normalizeHexLike(stop?.color,(fallbackColors[i]||fallbackColors[fallbackColors.length-1]||'#FFFFFF')),pos:clampInt(stop?.pos??stop?.offset??Math.round((i/(count-1))*100),0,100,Math.round((i/(count-1))*100))})).sort((a,b)=>a.pos-b.pos);if(out.length<2)out=buildGradientStopsFromColors(fallbackColors);return out.slice(0,MAX_BG_STOPS)}
function bgStopsToLegacyColors(stops){let sorted=normalizeGradientStops(stops);return [sorted[0].color,sorted[sorted.length-1].color]}
function syncBgGradientState(bg){bg.gradientStops=normalizeGradientStops(bg.gradientStops,bg.colors||defaultBg);bg.colors=bgStopsToLegacyColors(bg.gradientStops);return bg}
function setBgGradientFromPalette(colors){let list=(Array.isArray(colors)?colors:[]).filter(Boolean).slice(0,4);if(!list.length)list=[defaultBg[0],defaultBg[1]];state.bg.gradientStops=buildGradientStopsFromColors(list);state.bg.colors=bgStopsToLegacyColors(state.bg.gradientStops)}

function normalizeColors(colors){let base=(colors||[]).slice(0,5);while(base.length<4)base.push(base[base.length-1]||'#FFFFFF');if(!base[4])base[4]=base[3]||base[2]||base[1]||'#CDB9E8';return base}
function checkPresetOnly(p){let text=`${p.id} ${p.name} ${p.desc}`.toLowerCase();return /(check|checker|gingham|plaid)/.test(text)||/체크|깅엄|플래드/.test(`${p.name} ${p.desc}`)}
function isCheckPreset(p){return !!p&&checkPresetOnly(p)}
function isCheckLikePresetId(id){return isCheckPreset(getPreset(id))}
function hexToRgb(hex){let v=(hex||'#000000').replace('#','').trim();if(v.length===3)v=v.split('').map(c=>c+c).join('');let n=parseInt(v,16);return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}}
function rgbToHexObj({r,g,b}){return '#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('').toUpperCase()}
function rgbToHsl({r,g,b}){r/=255;g/=255;b/=255;let max=Math.max(r,g,b),min=Math.min(r,g,b),h,s,l=(max+min)/2;if(max===min){h=s=0}else{let d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h*=60}return {h,s,l}}
function hslToRgb(h,s,l){h=((h%360)+360)%360;let c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return {r:(r+m)*255,g:(g+m)*255,b:(b+m)*255}}
function hslToHex(h,s,l){return rgbToHexObj(hslToRgb(h,s,l))}
function mixHex(a,b,ratio=.5){let ca=hexToRgb(a),cb=hexToRgb(b);return rgbToHexObj({r:ca.r*(1-ratio)+cb.r*ratio,g:ca.g*(1-ratio)+cb.g*ratio,b:ca.b*(1-ratio)+cb.b*ratio})}
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


function aiStatus(message,type=''){
  let el=$('#aiStatus');
  if(!el)return;
  el.className=`mini-copy ${type?`status-${type}`:'muted'}`;
  el.innerHTML=message;
}
function aiDiagnosticMessage(data){
  let code=data?.diagnostic?.code||'';
  let status=data?.diagnostic?.http_status;
  const map={
    missing_api_key:'API KEY 없음: Cloudflare → Settings → Variables and Secrets에 <code>OPENAI_API_KEY</code>를 Secret으로 추가한 뒤 다시 배포해줘.',
    auth_failed:'401 인증 실패: 저장한 <code>OPENAI_API_KEY</code>가 잘못되었거나 사용할 수 없는 키인지 확인해줘.',
    rate_limit:'429 한도 문제: OpenAI API 크레딧/결제 상태 또는 요청 한도를 확인해줘.',
    model_error:'모델 오류: <code>OPENAI_MODEL</code> 값이 잘못되었거나 해당 모델을 사용할 권한이 없는지 확인해줘.',
    api_error:`OpenAI API 오류${status?` (${status})`:''}: Cloudflare Functions 로그에서 상세 내용을 확인해줘.`
  };
  return map[code]||'OpenAI 응답에 문제가 있어 로컬 fallback 추천안을 보여주는 중이야.';
}

function parseNegativePrompt(text=''){return String(text||'').split(/[\n,]/).map(v=>v.trim()).filter(Boolean)}
function buildExcludeTokens(prompt='',negative=''){let combined=`${prompt} ${negative}`.toLowerCase();let raw=parseNegativePrompt(negative).map(v=>v.toLowerCase());
  const tokens=new Set(raw);
  const checks=[['checker',/(?:without|no|exclude|except)\s+check(?:er|ers)?|(?:without|no|exclude|except)\s+gingham|(?:without|no|exclude|except)\s+plaid|체크\s*제외|깅엄\s*제외/],['gingham',/gingham/],['plaid',/plaid/],['dots',/(?:without|no|exclude|except)\s+(?:dot|dots|polka|halftone)|도트\s*제외|땡땡이\s*제외/],['halftone',/halftone/],['hearts',/(?:without|no|exclude|except)\s+heart|하트\s*제외/],['stars',/(?:without|no|exclude|except)\s+star|별\s*제외/],['bows',/(?:without|no|exclude|except)\s+(?:bow|bows|ribbon|ribbons)|리본\s*제외/],['clouds',/(?:without|no|exclude|except)\s+cloud|구름\s*제외/],['doodle',/(?:without|no|exclude|except)\s+doodle|낙서\s*제외/]];
  checks.forEach(([name,re])=>{if(re.test(combined))tokens.add(name)});
  return [...tokens];
}
function buildExcludePatternMap(tokens=[]){let set=new Set(tokens.map(v=>v.toLowerCase()));return {checker:set.has('checker')||set.has('gingham')||set.has('plaid'),dots:set.has('dots')||set.has('halftone')||set.has('polka'),hearts:set.has('hearts')||set.has('heart'),stars:set.has('stars')||set.has('star'),bows:set.has('bows')||set.has('bow')||set.has('ribbon')||set.has('ribbons'),clouds:set.has('clouds')||set.has('cloud'),doodle:set.has('doodle')}}

function presetIdOrFallback(id){return PE.presets.some(p=>p.id===id)?id:'pastel-checker'}
function clampInt(v,min,max,fallback){let n=Math.round(Number(v));if(Number.isNaN(n))n=fallback;return clamp(n,min,max)}
function normalizeAiLayer(layer,i=0){
  let base=defaultLayer(i,presetIdOrFallback(layer?.presetId||'pastel-checker'),i===0?true:(layer?.enabled!==false));
  let next={...base,...(layer||{})};
  next.enabled=i===0?true:(layer?.enabled!==false);
  next.sourceType='builtin';
  next.presetId=presetIdOrFallback(next.presetId);
  next.colors=normalizeColors(next.colors||base.colors);
  next.size=clampInt(next.size,12,220,base.size);
  next.gap=clampInt(next.gap,0,140,base.gap);
  next.jitter=clampInt(next.jitter,0,100,base.jitter);
  next.rotation=clampInt(next.rotation,-180,180,base.rotation);
  next.stroke=clampInt(next.stroke,0,18,base.stroke);
  next.opacity=clampInt(next.opacity,0,100,base.opacity);
  next.detail=clampInt(next.detail,0,100,base.detail);
  next.randomSize=next.randomSize!==false;
  next.randomAngle=next.randomAngle!==false;
  next.randomPosition=next.randomPosition!==false;
  next.offsetX=clampInt(next.offsetX,-200,200,0);
  next.offsetY=clampInt(next.offsetY,-200,200,0);
  next.seed=Math.floor(Math.random()*1e9);
  return next;
}
function normalizeAiSuggestion(suggestion,index=0){
  let safe=suggestion&&typeof suggestion==='object'?clone(suggestion):{};
  let layers=(safe.layers||[]).slice(0,MAX_LAYERS).map((layer,i)=>normalizeAiLayer(layer,i));
  if(!layers.length)layers=[normalizeAiLayer({presetId:'pastel-checker'},0)];
  let bg={transparent:false,mode:'solid',colors:[...defaultBg],gradientAngle:135,gradientStops:buildGradientStopsFromColors(defaultBg),vignette:{enabled:false,color:'#6F55C9',range:72,strength:28,softness:28},...(safe.bg||{})};
  bg.transparent=!!bg.transparent;
  bg.mode=bg.mode==='linear'?'linear':'solid';
  bg.colors=[bg.colors?.[0]||defaultBg[0],bg.colors?.[1]||bg.colors?.[0]||defaultBg[1]];
  bg.gradientAngle=clampInt(bg.gradientAngle,0,360,135);
  syncBgGradientState(bg);
  return {
    id:safe.id||uid('ai'),
    title:safe.title||`AI 추천안 ${index+1}`,
    summary:safe.summary||'AI가 생성한 패턴 조합',
    tags:Array.isArray(safe.tags)?safe.tags.slice(0,8):[],
    bg,
    layers
  };
}
function applyAiSuggestion(suggestion){
  let normalized=normalizeAiSuggestion(suggestion,0);
  let exportW=state.exportW,exportH=state.exportH,tileW=state.tileW,tileH=state.tileH;
  state={
    bg:normalized.bg,
    exportW,exportH,tileW,tileH,
    layers:normalized.layers
  };
  activeLayerIndex=0;
  persistAll();
  syncAll();
  toast(`AI 추천안 "${normalized.title}"을 적용했어.`);
}
function palettePreviewFromSuggestion(item){
  let colors=[];
  if(item.bg?.colors?.[0])colors.push(item.bg.colors[0]);
  if(item.bg?.colors?.[1]&&item.bg.colors[1]!==item.bg.colors[0])colors.push(item.bg.colors[1]);
  (item.layers||[]).forEach(layer=>normalizeColors(layer.colors).forEach(c=>{if(colors.length<8&&!colors.includes(c))colors.push(c)}));
  return colors.slice(0,8);
}
function renderAiSuggestions(){
  let wrap=$('#aiResultList');
  if(!wrap)return;
  wrap.innerHTML='';
  if(!aiSuggestions.length){
    wrap.innerHTML='<div class="muted mini-copy">AI 추천 결과가 아직 없어. 위에 영어 키워드를 넣고 생성해봐.</div>';
    return;
  }
  aiSuggestions.forEach((raw,i)=>{
    let item=normalizeAiSuggestion(raw,i);
    let card=document.createElement('div');
    card.className='preset-card ai-result-card';
    let left=document.createElement('div');
    left.className='ai-meta';
    left.innerHTML=`<strong>${item.title}</strong><small>${item.summary}</small>`;
    let sw=document.createElement('div'); sw.className='swatch-row';
    palettePreviewFromSuggestion(item).forEach(c=>{let s=document.createElement('div');s.className='swatch';s.style.background=c;s.title=c;sw.appendChild(s)});
    left.appendChild(sw);
    if(item.tags?.length){let tags=document.createElement('div');tags.className='ai-tag-row';item.tags.forEach(tag=>{let el=document.createElement('span');el.className='ai-tag';el.textContent='#'+tag;tags.appendChild(el)});left.appendChild(tags)}
    let layerList=document.createElement('div');layerList.className='ai-layer-list';
    item.layers.slice(0,3).forEach((layer,idx)=>{let name=getPreset(layer.presetId).name;let row=document.createElement('div');row.className='ai-layer-item';row.textContent=`Layer ${idx+1} · ${name} · size ${layer.size} · gap ${layer.gap}`;layerList.appendChild(row)});
    left.appendChild(layerList);
    let acts=document.createElement('div');acts.className='preset-actions';
    let apply=document.createElement('button');apply.className='mini-btn';apply.textContent='적용';apply.onclick=()=>applyAiSuggestion(item);
    let copy=document.createElement('button');copy.className='mini-btn';copy.textContent='JSON 복사';copy.onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(item,null,2));toast('추천안 JSON을 복사했어.')}catch{toast('클립보드 복사에 실패했어.')}};
    acts.append(apply,copy);
    card.append(left,acts);
    wrap.appendChild(card);
  });
}
function renderAiPromptExamples(){
  let wrap=$('#aiPromptExamples');
  if(wrap){wrap.innerHTML='';AI_EXAMPLES.forEach(example=>{let b=document.createElement('button');b.type='button';b.className='chip example-chip';b.textContent=example;b.onclick=()=>{$('#aiPrompt').value=example};wrap.appendChild(b)})}
  let ex=$('#aiExcludeExamples');
  if(ex){ex.innerHTML='';AI_EXCLUDE_EXAMPLES.forEach(example=>{let b=document.createElement('button');b.type='button';b.className='chip exclude-chip';b.textContent=`exclude: ${example}`;b.onclick=()=>{$('#aiNegativePrompt').value=example};ex.appendChild(b)})}
}
function buildAiColorContext(){
  let layer=currentLayer();
  return {
    base: layer.colors[1],
    sub: layer.colors[2],
    accent: layer.colors[3],
    line: layer.colors[4],
    background: state.bg.colors[0]
  };
}
async function generateAiSuggestions(){
  let prompt=$('#aiPrompt')?.value?.trim();
  if(!prompt){toast('영어 키워드나 프롬프트를 먼저 입력해줘.');$('#aiPrompt')?.focus();return}
  let negativePrompt=$('#aiNegativePrompt')?.value?.trim()||'';
  let excludeTokens=buildExcludeTokens(prompt,negativePrompt);
  let btn=$('#aiGenerateBtn');
  let preferBackground=$('#aiPreferBackground')?.checked!==false;
  btn.disabled=true;
  aiStatus('AI 추천안을 생성 중이야… 잠시만 기다려줘.', '');
  try{
    let res=await fetch('/api/ai-pattern',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,negativePrompt,excludePatterns:excludeTokens,count:4,preferBackground,colorContext:buildAiColorContext()})});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    let data=await res.json();
    aiSuggestions=(data.suggestions||data.variations||[]).map((v,i)=>normalizeAiSuggestion(v,i));
    renderAiSuggestions();
    let source=data.source==='fallback'?'fallback':'ok';
    let excludeMessage=excludeTokens.length?` 제외 요소: <code>${excludeTokens.join(', ')}</code>. `:'';
    if(source==='fallback')aiStatus(aiDiagnosticMessage(data)+excludeMessage,'fallback');
    else aiStatus('Cloudflare Worker가 OpenAI AI 추천안을 성공적으로 생성했어.'+excludeMessage,'ok');
    if(!aiSuggestions.length)aiStatus('추천 결과가 비어 있어. 프롬프트를 조금 더 구체적으로 적어봐.', 'error');
  }catch(err){
    console.error(err);
    aiSuggestions=[];
    renderAiSuggestions();
    aiStatus('AI 추천 생성에 실패했어. Worker 경로와 API 설정을 확인해줘.', 'error');
    toast('AI 추천 생성에 실패했어.');
  }finally{btn.disabled=false;}
}
function seedAiPromptFromCurrentColors(){
  let c=buildAiColorContext();
  $('#aiPrompt').value=`cute pastel background using ${c.base.toLowerCase()}, ${c.sub.toLowerCase()} and ${c.accent.toLowerCase()}, soft doodle pattern, clean profile background`;
  toast('현재 레이어 색상을 바탕으로 프롬프트를 채웠어.');
}
function applyNoCheckerExclude(){let input=$('#aiNegativePrompt');if(!input)return;let items=parseNegativePrompt(input.value);['checker','gingham','plaid'].forEach(v=>{if(!items.map(x=>x.toLowerCase()).includes(v))items.push(v)});input.value=items.join(', ');toast('체크/깅엄 제외 조건을 추가했어.')}

function uid(prefix='id'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
function clone(v){return JSON.parse(JSON.stringify(v))}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function shuffle(a){let out=[...a];for(let i=out.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function toast(msg){let el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),1800)}
function categories(){return ['전체',...new Set(PE.presets.map(p=>p.category))]}
function getPreset(id){return PE.presets.find(p=>p.id===id)||PE.presets[0]}
function defaultLayer(i,presetId='pastel-checker',enabled=true){return {enabled,name:i===0?'기본 레이어':`추가 레이어 ${i}`,sourceType:'builtin',presetId,assetId:'',renderMode:'motif',colors:normalizeColors(['#FFF9FC','#F5B9D4','#B9D7FF','#BFAAF2','#E4C57A']),size:i===0?72:58,gap:i===0?24:28,jitter:i===0?18:22,rotation:0,stroke:4,opacity:i===0?100:78,detail:45,seed:Math.floor(Math.random()*1e9),svgColorMode:'original',randomSize:true,randomAngle:true,randomPosition:true,offsetX:0,offsetY:0,checkerToneMode:false,checkerToneBase:'#AFC3FF'}}
function makeInitialState(){return {bg:{transparent:false,mode:'solid',colors:[...defaultBg],gradientAngle:135,gradientStops:buildGradientStopsFromColors(defaultBg),vignette:{enabled:false,color:'#6F55C9',range:72,strength:28,softness:28}},exportW:2000,exportH:2000,tileW:512,tileH:512,layers:[defaultLayer(0,'pastel-checker',true)]}}
let favorites=new Set();
let myPresets=[];
let userAssets=[];
let state=makeInitialState();

function loadLocal(){
  try{favorites=new Set(JSON.parse(localStorage.getItem(STORAGE.favorites)||'[]'))}catch{}
  try{myPresets=JSON.parse(localStorage.getItem(STORAGE.presets)||'[]')||[]}catch{}
  try{userAssets=JSON.parse(localStorage.getItem(STORAGE.assets)||'[]')||[]}catch{}
  try{let saved=JSON.parse(localStorage.getItem(STORAGE.state)||'null');if(saved)state=mergeState(saved)}catch{}
}
function mergeState(saved){let base=makeInitialState();if(!saved||typeof saved!=='object')return base;let merged={...base,...saved,bg:{...base.bg,...(saved.bg||{})}};merged.layers=(saved.layers||base.layers).slice(0,MAX_LAYERS).map((l,i)=>({...defaultLayer(i),...l,colors:normalizeColors(l.colors||defaultLayer(i).colors)}));if(!merged.layers.length)merged.layers=[defaultLayer(0,'pastel-checker',true)];merged.layers[0].enabled=true;merged.layers[0].name='기본 레이어';merged.bg.colors=[merged.bg.colors?.[0]||defaultBg[0],merged.bg.colors?.[1]||merged.bg.colors?.[0]||defaultBg[1]];merged.bg.gradientAngle=clampInt(merged.bg.gradientAngle,0,360,135);merged.bg.vignette={enabled:!!merged.bg.vignette?.enabled,color:normalizeHexLike(merged.bg.vignette?.color||'#6F55C9','#6F55C9'),range:clampInt(merged.bg.vignette?.range,0,100,72),strength:clampInt(merged.bg.vignette?.strength,0,100,28),softness:clampInt(merged.bg.vignette?.softness,0,100,28)};syncBgGradientState(merged.bg);merged.layers.forEach((layer,i)=>{if(i>0&&!layer.name)layer.name=`추가 레이어 ${i}`;if(layer.randomSize===undefined)layer.randomSize=true;if(layer.randomAngle===undefined)layer.randomAngle=true;if(layer.randomPosition===undefined)layer.randomPosition=true;if(layer.offsetX===undefined)layer.offsetX=0;if(layer.offsetY===undefined)layer.offsetY=0;if(layer.checkerToneMode===undefined)layer.checkerToneMode=false;if(!layer.checkerToneBase)layer.checkerToneBase=(layer.colors&&layer.colors[1])||'#AFC3FF';layer.colors=normalizeColors(layer.colors)});return merged}
function persistAll(){localStorage.setItem(STORAGE.favorites,JSON.stringify([...favorites]));localStorage.setItem(STORAGE.presets,JSON.stringify(myPresets));localStorage.setItem(STORAGE.assets,JSON.stringify(stripAssetCache(userAssets)));localStorage.setItem(STORAGE.state,JSON.stringify(stripStateForSave(state)))}
function stripStateForSave(s){let copy=clone(s);return copy}
function stripAssetCache(arr){return arr.map(a=>{let c={...a};delete c._img;delete c._cacheKey;return c})}

function currentLayer(){return state.layers[activeLayerIndex]}
function layerSupportsScatterControls(layer=currentLayer()){if(layer.sourceType==='uploaded')return true;if(layer.sourceType!=='builtin')return false;let preset=getPreset(layer.presetId);return ['motif','dots','raindrops','doodles'].includes(preset.type)}
function layerTitle(layer,idx){if(layer.sourceType==='builtin'){let p=getPreset(layer.presetId);return `${layer.name} · ${p.name}`}let a=userAssets.find(v=>v.id===layer.assetId);return `${layer.name} · ${a?a.name:'업로드 에셋 없음'}`}
function addLayer(fromCurrent=true){if(state.layers.length>=MAX_LAYERS){toast(`레이어는 최대 ${MAX_LAYERS}개까지 추가할 수 있어.`);return}let i=state.layers.length;let base=fromCurrent?clone(currentLayer()):defaultLayer(i,'tiny-dot',true);base.name=`추가 레이어 ${i}`;base.enabled=true;base.seed=Math.floor(Math.random()*1e9);state.layers.push(base);activeLayerIndex=state.layers.length-1;persistAll();syncAll();toast(`${base.name}를 추가했어.`)}
function removeActiveLayer(){if(activeLayerIndex===0){toast('기본 레이어는 삭제할 수 없어.');return}let removed=state.layers.splice(activeLayerIndex,1)[0];state.layers.forEach((layer,i)=>{layer.name=i===0?'기본 레이어':`추가 레이어 ${i}`});activeLayerIndex=Math.max(0,activeLayerIndex-1);persistAll();syncAll();toast(`${removed.name}를 삭제했어.`)}
function moveActiveLayer(dir){let i=activeLayerIndex,target=i+dir;if(i<=0||target<=0||target>=state.layers.length)return;let tmp=state.layers[i];state.layers[i]=state.layers[target];state.layers[target]=tmp;state.layers.forEach((layer,idx)=>{layer.name=idx===0?'기본 레이어':`추가 레이어 ${idx}`});activeLayerIndex=target;persistAll();syncAll();toast('레이어 순서를 변경했어.')}

function drawBackground(target,w,h){if(state.bg.transparent){target.clearRect(0,0,w,h);return}target.clearRect(0,0,w,h);if(state.bg.mode==='linear'){let a=(state.bg.gradientAngle||135)*Math.PI/180,cx=w/2,cy=h/2,L=Math.abs(w*Math.cos(a))+Math.abs(h*Math.sin(a)),dx=Math.cos(a)*L/2,dy=Math.sin(a)*L/2;let g=target.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);let stops=normalizeGradientStops(state.bg.gradientStops,state.bg.colors);stops.forEach(stop=>g.addColorStop(clamp((stop.pos||0)/100,0,1),stop.color));target.fillStyle=g}else target.fillStyle=state.bg.colors[0];target.fillRect(0,0,w,h)}
function applyVignette(target,w,h){let v=state.bg.vignette||{};if(!v.enabled||Number(v.strength)<=0)return;let cx=w/2,cy=h/2,maxR=Math.sqrt((w/2)*(w/2)+(h/2)*(h/2));let inner=clamp(Number(v.range)||0,0,100)/100,soft=clamp(Number(v.softness)||0,0,100)/100;let outer=Math.max(inner+0.001,Math.min(1,inner+soft));let g=target.createRadialGradient(cx,cy,maxR*inner,cx,cy,maxR);let alpha=clamp(Number(v.strength)||0,0,100)/100;let color=normalizeHexLike(v.color||'#6F55C9','#6F55C9').replace('#','');let rr=parseInt(color.slice(0,2),16),gg=parseInt(color.slice(2,4),16),bb=parseInt(color.slice(4,6),16),rgba=a=>`rgba(${rr},${gg},${bb},${a})`;g.addColorStop(Math.min(inner,outer),rgba(0));g.addColorStop(outer,rgba(alpha));g.addColorStop(1,rgba(alpha));target.save();target.fillStyle=g;target.fillRect(0,0,w,h);target.restore()}
function layerToPatternState(layer,seamless=false){return {presetId:layer.presetId,colors:normalizeColors(layer.colors),size:layer.size,gap:layer.gap,jitter:seamless?0:layer.jitter,rotation:layer.rotation,stroke:layer.stroke,opacity:layer.opacity,detail:layer.detail,seed:layer.seed,bgMode:'solid',gradientAngle:0,transparentBg:false,skipBackground:true,randomSize:layer.randomSize!==false,randomAngle:layer.randomAngle!==false,randomPosition:layer.randomPosition!==false,offsetX:layer.offsetX||0,offsetY:layer.offsetY||0}}
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
async function renderMain(){
  await ensureVisibleAssets();
  ctx.save();ctx.setTransform(1,0,0,1,0,0);drawBackground(ctx,canvas.width,canvas.height);ctx.restore();
  for(let layer of state.layers){
    if(!layer.enabled)continue;
    try{
      if(layer.sourceType==='builtin')PE.render(ctx,canvas.width,canvas.height,layerToPatternState(layer,false),getPreset(layer.presetId),canvas.width/2000);
      else renderUploadedLayer(ctx,canvas.width,canvas.height,layer,canvas.width/2000,false);
    }catch(err){console.error('Layer render failed:',layer?.presetId||layer?.assetId,err)}
  }
  applyVignette(ctx,canvas.width,canvas.height);
  updateSelected();renderCirclePreview()
}
function updateSelected(){let layer=currentLayer();if(layer.sourceType==='builtin'){let p=getPreset(layer.presetId);$('#selectedCategory').textContent=p.category;$('#selectedName').textContent=p.name;$('#selectedDesc').textContent=`${layer.name} 편집 중 · ${p.desc}`}else{let asset=userAssets.find(v=>v.id===layer.assetId);$('#selectedCategory').textContent='업로드 에셋';$('#selectedName').textContent=asset?asset.name:'에셋 없음';let modeLabel={motif:'모티프 반복',tile:'반복 타일',brick:'브릭 반복',halfdrop:'하프드롭 반복',diagonal:'대각 반복'}[layer.renderMode]||'모티프 반복';$('#selectedDesc').textContent=`${layer.name} 편집 중 · ${modeLabel}`}}
function setupCategories(){let wrap=$('#categoryTabs');wrap.innerHTML='';categories().forEach(c=>{let b=document.createElement('button');b.className='tab'+(c===activeCategory?' active':'');b.textContent=c;b.onclick=()=>{activeCategory=c;setupCategories();renderPatternList()};wrap.appendChild(b)})}
function filteredPresets(){let q=$('#searchInput').value.trim().toLowerCase();let checksOnly=$('#checkOnly')?.checked;return PE.presets.filter(p=>(activeCategory==='전체'||p.category===activeCategory)&&(!$('#favoriteOnly').checked||favorites.has(p.id))&&(!checksOnly||checkPresetOnly(p))&&(!q||`${p.name} ${p.category} ${p.desc} ${p.id}`.toLowerCase().includes(q)))}
function thumbnailLayerForPreset(p){let layer={...currentLayer(),presetId:p.id,sourceType:'builtin'};let d=PE.defaults[p.id]||{};Object.assign(layer,d);return layer}
function renderPatternList(){
  let list=$('#patternList'),items=filteredPresets();
  $('#patternCount').textContent=`${PE.presets.length}가지 패턴 · 현재 ${items.length}개`;
  list.innerHTML='';
  items.forEach(p=>{
    let b=document.createElement('button');b.className='pattern-card'+(currentLayer().sourceType==='builtin'&&p.id===currentLayer().presetId?' active':'');
    let fav=document.createElement('button');fav.type='button';fav.className='pattern-fav'+(favorites.has(p.id)?' on':'');fav.textContent=favorites.has(p.id)?'★':'☆';fav.title='즐겨찾기';fav.onclick=e=>{e.stopPropagation();toggleFavorite(p.id)};
    let c=document.createElement('canvas');c.width=c.height=180;
    try{
      let thumbLayer=thumbnailLayerForPreset(p);
      PE.render(c.getContext('2d'),180,180,layerToPatternState(thumbLayer,false),p,180/720)
    }catch(err){
      console.error('Pattern thumbnail failed:',p.id,err);
      let x=c.getContext('2d');x.clearRect(0,0,180,180);x.fillStyle='#FAF8FF';x.fillRect(0,0,180,180);x.fillStyle='#8E83A4';x.font='12px sans-serif';x.textAlign='center';x.fillText('미리보기 오류',90,92)
    }
    let st=document.createElement('strong');st.textContent=p.name;
    let sm=document.createElement('small');sm.textContent=p.desc;
    b.append(fav,c,st,sm);b.onclick=()=>selectPatternForActiveLayer(p.id);list.appendChild(b)
  })
}
function toggleFavorite(id){favorites.has(id)?favorites.delete(id):favorites.add(id);persistAll();renderPatternList();renderFavoritePreview()}
function selectPatternForActiveLayer(id){let layer=currentLayer();layer.sourceType='builtin';layer.presetId=id;let d=PE.defaults[id]||{};Object.assign(layer,d);if(layer.checkerToneMode&&isCheckLikePresetId(id))applyCheckerTonePalette(layer,false);layer.seed=Math.floor(Math.random()*1e9);persistAll();syncLayerUI();renderPatternList();renderMain()}
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
  let colorTitle=document.createElement('div');colorTitle.className='section-title-row';colorTitle.innerHTML='<h3>레이어 색상</h3><div class="preset-actions"><button id="applyPaletteToLayer" class="mini-btn" type="button">팔레트 랜덤</button><button id="autoLineColorBtn" class="mini-btn" type="button">선 색 자동 추천</button></div>';top.appendChild(colorTitle);
  top.appendChild(renderColorInputs(layer.colors,()=>{persistAll();let asset=userAssets.find(v=>v.id===layer.assetId);if(asset&&asset.kind==='svg'){asset._img=null;ensureAssetImage(asset,layer).then(renderMain)}persistAll();renderPatternListDebounced();renderAssetList();renderMain()}));
  if(layer.sourceType==='builtin'&&isCheckLikePresetId(layer.presetId)){
    let toneBox=document.createElement('div');
    toneBox.className='layer-editor-card';
    toneBox.innerHTML='<div class="section-title-row"><h3>체크 전용 1색 → 3톤 자동 배색</h3><div class="preset-actions"><button id="applyCheckerToneBtn" class="mini-btn" type="button">3톤 생성 적용</button></div></div><div class="control-subtitle">대표색 하나만 고르면 비슷한 톤 3가지와 선 색을 자동으로 만들어줘. 가운데 구분선이 없는 체크나 3색 체크를 빠르게 만들고 싶을 때 사용해.</div>';
    let modeRow=document.createElement('label');modeRow.className='switch-row';modeRow.innerHTML=`<input id="checkerToneModeToggle" type="checkbox" ${layer.checkerToneMode?'checked':''}/> 대표색 변경 시 자동으로 3톤 다시 생성`;
    let baseRow=document.createElement('div');baseRow.className='color-row';
    let baseLabel=document.createElement('div');baseLabel.className='color-label';baseLabel.textContent='대표색';
    let basePicker=document.createElement('input');basePicker.type='color';basePicker.id='checkerToneBasePicker';basePicker.value=(layer.checkerToneBase||layer.colors[1]||'#AFC3FF').toUpperCase();
    let baseText=document.createElement('input');baseText.type='text';baseText.id='checkerToneBaseText';baseText.maxLength=7;baseText.value=basePicker.value;
    let preview=document.createElement('div');preview.className='swatch-row';preview.id='checkerTonePreview';preview.style.marginTop='8px';
    baseRow.append(baseLabel,basePicker,baseText);toneBox.append(modeRow,baseRow,preview);top.appendChild(toneBox);
  }
  if(layerSupportsScatterControls(layer)){
    let scatterBox=document.createElement('div');
    scatterBox.className='layer-editor-card';
    scatterBox.innerHTML='<div class="section-title-row"><h3>반복 요소 정렬</h3><button id="cleanAlignBtn" class="mini-btn" type="button">깔끔 정렬 적용</button></div><div class="control-subtitle">하트·별·도트·리본·업로드 오브젝트처럼 반복되는 요소를 더 반듯하게 맞추고 싶을 때 사용해. 랜덤을 끄면 같은 크기·같은 방향·같은 간격에 가깝게 정렬돼.</div>';
    let sizeRow=document.createElement('label');
    sizeRow.className='switch-row';
    sizeRow.innerHTML=`<input id="randomSizeToggle" type="checkbox" ${layer.randomSize!==false?'checked':''}/> 요소 크기 랜덤`;
    let angleRow=document.createElement('label');
    angleRow.className='switch-row';
    angleRow.innerHTML=`<input id="randomAngleToggle" type="checkbox" ${layer.randomAngle!==false?'checked':''}/> 요소 각도 랜덤`;
    let posRow=document.createElement('label');
    posRow.className='switch-row';
    posRow.innerHTML=`<input id="randomPositionToggle" type="checkbox" ${layer.randomPosition!==false?'checked':''}/> 요소 위치 랜덤`;
    let note=document.createElement('div');
    note.className='control-subtitle';
    note.textContent='세 옵션을 모두 끄거나 “깔끔 정렬 적용”을 누르면 위치 흔들림을 없애고, 불규칙함과 레이어 회전도 0으로 맞춰 훨씬 더 깔끔하게 정렬돼.';
    scatterBox.append(sizeRow,angleRow,posRow,note);
    top.appendChild(scatterBox)
  }
  let controls=document.createElement('div');controls.className='layer-editor-grid';controls.appendChild(sliderRow('패턴 크기','size',layer.size,12,260,'px',v=>layer.size=v));controls.appendChild(sliderRow('간격','gap',layer.gap,0,180,'px',v=>layer.gap=v));controls.appendChild(sliderRow('불규칙함','jitter',layer.jitter,0,100,'%',v=>layer.jitter=v));controls.appendChild(sliderRow('회전','rotation',layer.rotation,-45,45,'°',v=>layer.rotation=v));controls.appendChild(sliderRow('위치 X','offsetX',layer.offsetX||0,-200,200,'px',v=>layer.offsetX=v));controls.appendChild(sliderRow('위치 Y','offsetY',layer.offsetY||0,-200,200,'px',v=>layer.offsetY=v));controls.appendChild(sliderRow('선 두께','stroke',layer.stroke,0,18,'px',v=>layer.stroke=v));controls.appendChild(sliderRow('패턴 투명도','opacity',layer.opacity,0,100,'%',v=>layer.opacity=v));controls.appendChild(sliderRow('포인트/디테일','detail',layer.detail,0,100,'%',v=>layer.detail=v));top.appendChild(controls);let offsetRow=document.createElement('div');offsetRow.className='section-title-row';offsetRow.innerHTML='<div class="control-subtitle">패턴이 애매하게 잘려 보일 때는 위치 X/Y를 살짝 움직여 반복 시작 위치를 조정할 수 있어. 숫자를 직접 입력해서 미세 조정도 가능해.</div><button id="resetOffsetBtn" class="mini-btn" type="button">오프셋 초기화</button>';top.appendChild(offsetRow);card.appendChild(top);root.appendChild(card);
  $('#layerEnabledToggle').onchange=e=>{layer.enabled=e.target.checked;persistAll();renderLayerSummary();renderMain()};
  if($('#randomSizeToggle'))$('#randomSizeToggle').onchange=e=>{layer.randomSize=e.target.checked;persistAll();renderPatternListDebounced();renderMain()};
  if($('#randomAngleToggle'))$('#randomAngleToggle').onchange=e=>{layer.randomAngle=e.target.checked;persistAll();renderPatternListDebounced();renderMain()};
  if($('#randomPositionToggle'))$('#randomPositionToggle').onchange=e=>{layer.randomPosition=e.target.checked;persistAll();renderPatternListDebounced();renderMain()};
  if($('#cleanAlignBtn'))$('#cleanAlignBtn').onclick=()=>{layer.randomSize=false;layer.randomAngle=false;layer.randomPosition=false;layer.jitter=0;layer.rotation=0;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
  if($('#resetOffsetBtn'))$('#resetOffsetBtn').onclick=()=>{layer.offsetX=0;layer.offsetY=0;persistAll();syncLayerUI();renderPatternListDebounced();renderMain()};
  $('#applyPaletteToLayer').onclick=()=>{let p=palettePresets[Math.floor(Math.random()*palettePresets.length)];layer.colors=normalizeColors([...p,p[3]||p[2]||p[1]||p[0]]);layer.colors[4]=suggestLineColor(layer.colors);layer.checkerToneBase=layer.colors[1];persistAll();syncLayerUI();renderPatternListDebounced();renderMain()}
  if($('#autoLineColorBtn'))$('#autoLineColorBtn').onclick=()=>{layer.colors[4]=suggestLineColor(layer.colors);persistAll();syncLayerUI();renderPatternListDebounced();renderMain();toast('현재 레이어 색상에 맞춰 선 색을 자동 추천했어.')}
  if($('#checkerTonePreview')){let sw=$('#checkerTonePreview');let previewColors=buildCheckerTonePalette(layer.checkerToneBase||layer.colors[1]||'#AFC3FF');sw.innerHTML='';previewColors.slice(1,5).forEach(c=>{let s=document.createElement('div');s.className='swatch';s.style.background=c;s.title=c;sw.appendChild(s)})}
  if($('#checkerToneModeToggle'))$('#checkerToneModeToggle').onchange=e=>{layer.checkerToneMode=e.target.checked;persistAll();};
  if($('#checkerToneBasePicker'))$('#checkerToneBasePicker').oninput=e=>{let value=e.target.value.toUpperCase();layer.checkerToneBase=value;$('#checkerToneBaseText').value=value;if(layer.checkerToneMode)applyCheckerTonePalette(layer,true);else{persistAll();renderLayerEditor()}};
  if($('#checkerToneBaseText'))$('#checkerToneBaseText').oninput=e=>{let value=e.target.value.toUpperCase();if(/^#[0-9A-F]{6}$/.test(value)){layer.checkerToneBase=value;$('#checkerToneBasePicker').value=value;if(layer.checkerToneMode)applyCheckerTonePalette(layer,true);else{persistAll();renderLayerEditor()}}};
  if($('#applyCheckerToneBtn'))$('#applyCheckerToneBtn').onclick=()=>{applyCheckerTonePalette(layer,true);toast('대표색 기준으로 체크용 3톤 팔레트를 적용했어.')}
}
function labeled(labelText,node){let wrap=document.createElement('label');wrap.textContent=labelText;wrap.appendChild(node);return wrap}
function sliderRow(label,key,val,min,max,unit,setter){let wrap=document.createElement('label');let head=document.createElement('div');head.style.display='flex';head.style.alignItems='center';head.style.justifyContent='space-between';head.style.gap='8px';let title=document.createElement('span');title.textContent=label;let controls=document.createElement('div');controls.style.display='flex';controls.style.alignItems='center';controls.style.gap='6px';let number=document.createElement('input');number.type='number';number.min=min;number.max=max;number.step='1';number.value=val;number.style.width='68px';number.style.padding='5px 7px';number.style.fontSize='11px';let applyVal=v=>{let next=Math.max(min,Math.min(max,Number(v)||0));setter(next);input.value=next;number.value=next;if(!['seed','offsetX','offsetY'].includes(key)){currentLayer().seed=Math.floor(Math.random()*1e9)}persistAll();renderPatternListDebounced();renderMain()};if(key==='offsetX'||key==='offsetY'){[-5,-1,1,5].forEach(step=>{let b=document.createElement('button');b.type='button';b.className='mini-btn';b.textContent=step>0?`+${step}`:`${step}`;b.style.padding='4px 6px';b.onclick=e=>{e.preventDefault();applyVal((+number.value||0)+step)};controls.appendChild(b)})}let unitSpan=document.createElement('span');unitSpan.textContent=unit;unitSpan.style.float='none';unitSpan.style.color='#8c83a0';controls.append(number,unitSpan);head.append(title,controls);wrap.appendChild(head);let input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.value=val;input.oninput=()=>applyVal(input.value);number.onchange=()=>applyVal(number.value);wrap.appendChild(input);return wrap}
function syncLayerUI(){setupLayerTabs();renderLayerSummary();renderLayerEditor();updateSelected();persistAll()}
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
function syncGlobalControls(){renderBgColorInputs();$('#bgMode').value=state.bg.mode;$('#transparentBg').checked=state.bg.transparent;$('#gradientAngle').value=state.bg.gradientAngle;$('#gradientAngleVal').textContent=`${state.bg.gradientAngle}°`;$('#gradientControls').style.display=state.bg.mode==='linear'&&!state.bg.transparent?'block':'none';let v=state.bg.vignette||{};if($('#vignetteEnabled'))$('#vignetteEnabled').checked=!!v.enabled;if($('#vignetteColor'))$('#vignetteColor').value=normalizeHexLike(v.color||'#6F55C9','#6F55C9');if($('#vignetteColorText'))$('#vignetteColorText').value=normalizeHexLike(v.color||'#6F55C9','#6F55C9');if($('#vignetteRange'))$('#vignetteRange').value=v.range??72;if($('#vignetteRangeVal'))$('#vignetteRangeVal').textContent=`${v.range??72}%`;if($('#vignetteStrength'))$('#vignetteStrength').value=v.strength??28;if($('#vignetteStrengthVal'))$('#vignetteStrengthVal').textContent=`${v.strength??28}%`;if($('#vignetteSoftness'))$('#vignetteSoftness').value=v.softness??28;if($('#vignetteSoftnessVal'))$('#vignetteSoftnessVal').textContent=`${v.softness??28}%`;if($('#vignetteControls'))$('#vignetteControls').style.display=v.enabled?'block':'none';$('#exportW').value=state.exportW;$('#exportH').value=state.exportH;$('#tileW').value=state.tileW;$('#tileH').value=state.tileH}
function setZoom(v){zoom=clamp(v,.3,1.6);$('#zoomText').textContent=Math.round(zoom*100)+'%';canvas.style.width=`min(${72*zoom}vh, ${78*zoom}vw)`}
function renderCirclePreview(){if(!circleCtx||!circleCanvas)return;let w=circleCanvas.width,h=circleCanvas.height,r=Math.min(w,h)/2-4;circleCtx.clearRect(0,0,w,h);circleCtx.save();circleCtx.beginPath();circleCtx.arc(w/2,h/2,r,0,Math.PI*2);circleCtx.closePath();circleCtx.clip();circleCtx.drawImage(canvas,0,0,w,h);circleCtx.restore();circleCtx.save();circleCtx.beginPath();circleCtx.arc(w/2,h/2,r,0,Math.PI*2);circleCtx.lineWidth=8;circleCtx.strokeStyle='rgba(255,255,255,.96)';circleCtx.stroke();circleCtx.beginPath();circleCtx.arc(w/2,h/2,r,0,Math.PI*2);circleCtx.lineWidth=1.5;circleCtx.strokeStyle='rgba(210,198,240,.95)';circleCtx.stroke();circleCtx.restore();}
function randomizeAll(){let palette=palettePresets[Math.floor(Math.random()*palettePresets.length)];state.bg.colors=[palette[0],palette[1]];state.bg.gradientStops=buildGradientStopsFromColors([palette[0],palette[1]]);state.layers.forEach((layer,i)=>{let candidates=PE.presets.filter(p=>(!$('#favoriteOnly').checked||favorites.has(p.id))&&(!$('#checkOnly')?.checked||checkPresetOnly(p)));let pool=candidates.length?candidates:PE.presets;let p=pool[Math.floor(Math.random()*Math.max(1,pool.length))];layer.sourceType='builtin';layer.presetId=p.id;let d=PE.defaults[p.id]||{};Object.assign(layer,d);layer.colors=normalizeColors(shuffle(palette.concat()).slice(0,4));layer.colors[4]=suggestLineColor(layer.colors);layer.size=clamp((d.size??layer.size)+(i*10),12,220);layer.gap=clamp((d.gap??layer.gap)+Math.floor(Math.random()*30),0,140);layer.jitter=clamp((d.jitter??20)+Math.floor(Math.random()*40),0,100);layer.rotation=Math.floor(-18+Math.random()*36);layer.opacity=clamp(100-i*18,20,100);layer.detail=Math.floor(25+Math.random()*70);layer.enabled=i===0?true:(Math.random()>.25);layer.randomSize=true;layer.randomAngle=true;layer.randomPosition=true;layer.offsetX=0;layer.offsetY=0;layer.checkerToneMode=false;layer.checkerToneBase=layer.colors[1];layer.seed=Math.floor(Math.random()*1e9)});persistAll();syncAll();toast('배경과 레이어 패턴을 랜덤으로 조합했어.')}
async function exportPNG(seamless=false){let w=clamp(+($('#exportW').value)||2000,256,6000),h=clamp(+($('#exportH').value)||2000,256,6000);if(seamless){w=clamp(+($('#tileW').value)||512,64,4000);h=clamp(+($('#tileH').value)||512,64,4000)}state.exportW=w;state.exportH=h;if(seamless){state.tileW=w;state.tileH=h}persistAll();let out=document.createElement('canvas');out.width=w;out.height=h;let octx=out.getContext('2d');drawBackground(octx,w,h);for(let layer of state.layers){if(!layer.enabled)continue;if(layer.sourceType==='builtin'){PE.render(octx,w,h,layerToPatternState(layer,seamless),getPreset(layer.presetId),w/2000)}else{let asset=userAssets.find(v=>v.id===layer.assetId);if(asset){await ensureAssetImage(asset,layer).catch(()=>null);renderUploadedLayer(octx,w,h,layer,w/2000,seamless)}}}applyVignette(octx,w,h);let blob=await new Promise(r=>out.toBlob(r,'image/png'));if(!blob){toast('PNG 생성에 실패했어.');return}let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=seamless?`cute-pattern-seamless-${w}x${h}.png`:`cute-pattern-${w}x${h}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);toast(`${w}×${h} ${seamless?'심리스 타일':'PNG'}를 저장했어.`)}

async function handleReferenceFile(file){let dataURL=await readFileAsDataURL(file);let img=await loadImage(dataURL);let prev=$('#referencePreview');prev.innerHTML='';let el=document.createElement('img');el.src=dataURL;prev.classList.remove('empty');prev.appendChild(el);referencePalette=extractPalette(img,6);renderReferencePalette()}
function extractPalette(img,count=6){let c=document.createElement('canvas');let max=90;let ratio=Math.min(max/img.width,max/img.height,1);c.width=Math.max(16,Math.floor(img.width*ratio));c.height=Math.max(16,Math.floor(img.height*ratio));let x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,c.width,c.height);let data=x.getImageData(0,0,c.width,c.height).data;let buckets=new Map();for(let i=0;i<data.length;i+=4){let a=data[i+3];if(a<180)continue;let r=Math.round(data[i]/32)*32,g=Math.round(data[i+1]/32)*32,b=Math.round(data[i+2]/32)*32;if(r>248&&g>248&&b>248)continue;let key=[clamp(r,0,255),clamp(g,0,255),clamp(b,0,255)].join(',');buckets.set(key,(buckets.get(key)||0)+1)}let ranked=[...buckets.entries()].sort((a,b)=>b[1]-a[1]).map(([k])=>k.split(',').map(Number));let out=[];for(let rgb of ranked){if(out.every(v=>colorDistance(v,rgb)>42)){out.push(rgb);if(out.length>=count)break}}while(out.length<count)out.push([255,244,248]);return out.map(rgbToHex)}
function colorDistance(a,b){let dr=a[0]-b[0],dg=a[1]-b[1],db=a[2]-b[2];return Math.sqrt(dr*dr+dg*dg+db*db)}
function rgbToHex([r,g,b]){return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()}
function renderReferencePalette(){let wrap=$('#referencePalette');wrap.innerHTML='';if(!referencePalette.length)return;let box=document.createElement('div');box.className='swatch-pack';let row=document.createElement('div');row.className='swatch-row';referencePalette.forEach(c=>{let s=document.createElement('div');s.className='swatch';s.style.background=c;s.title=c;row.appendChild(s)});let actions=document.createElement('div');actions.className='preset-actions';let toLayer=document.createElement('button');toLayer.className='mini-btn';toLayer.textContent='현재 레이어에 적용';toLayer.onclick=()=>{let layer=currentLayer();layer.colors=normalizeColors([referencePalette[0],referencePalette[1]||referencePalette[0],referencePalette[2]||referencePalette[1]||referencePalette[0],referencePalette[3]||referencePalette[2]||referencePalette[1]||referencePalette[0],referencePalette[4]||referencePalette[3]||referencePalette[2]||referencePalette[1]||referencePalette[0]]);layer.colors[4]=suggestLineColor(layer.colors);persistAll();syncLayerUI();renderMain()};let toBg=document.createElement('button');toBg.className='mini-btn';toBg.textContent='배경에 적용';toBg.onclick=()=>{setBgGradientFromPalette(referencePalette);persistAll();syncGlobalControls();renderMain()};let toBoth=document.createElement('button');toBoth.className='mini-btn';toBoth.textContent='배경+현재 레이어';toBoth.onclick=()=>{setBgGradientFromPalette(referencePalette);let layer=currentLayer();layer.colors=normalizeColors([referencePalette[0],referencePalette[1]||referencePalette[0],referencePalette[2]||referencePalette[1]||referencePalette[0],referencePalette[3]||referencePalette[2]||referencePalette[1]||referencePalette[0],referencePalette[4]||referencePalette[3]||referencePalette[2]||referencePalette[1]||referencePalette[0]]);layer.colors[4]=suggestLineColor(layer.colors);persistAll();syncAll()};actions.append(toLayer,toBg,toBoth);box.append(row,actions);wrap.appendChild(box)}

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
  $('#uploadReferenceBtn').onclick=()=>$('#referenceInput').click();
  $('#referenceInput').onchange=e=>{if(e.target.files[0])handleReferenceFile(e.target.files[0]);e.target.value=''};
  $('#bgMode').onchange=e=>{state.bg.mode=e.target.value;if(state.bg.mode==='linear'&&(!state.bg.gradientStops||state.bg.gradientStops.length<2))state.bg.gradientStops=buildGradientStopsFromColors(state.bg.colors);persistAll();syncGlobalControls();renderMain()};
  $('#transparentBg').onchange=e=>{state.bg.transparent=e.target.checked;persistAll();syncGlobalControls();renderMain()};
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
  $('#refreshColorSuggestionBtn').onclick=()=>{renderColorRecommendationPanels();toast('컬러 추천을 새로고침했어.')};
  $('#baseColorInput').oninput=e=>{e.target.dataset.touched='1';renderColorRecommendationPanels()};
  $('#aiGenerateBtn').onclick=generateAiSuggestions;
  $('#aiUseCurrentColorBtn').onclick=seedAiPromptFromCurrentColors;
  $('#aiNoCheckerBtn').onclick=applyNoCheckerExclude;
  $('#aiClearBtn').onclick=()=>{$('#aiPrompt').value='';$('#aiNegativePrompt').value='';aiStatus('입력창을 비웠어. 예시 칩을 눌러 바로 시작할 수도 있어.','');};
  $('#aiPrompt').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();generateAiSuggestions()}});
  $('#aiNegativePrompt').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();generateAiSuggestions()}});
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
function syncAll(){syncGlobalControls();if($('#baseColorInput')&&!$('#baseColorInput').dataset.touched){$('#baseColorInput').value=currentLayer().colors[1]||'#F5B9D4'}syncLayerUI();renderMain();renderPatternList();renderAssetList();renderFavoritePreview();renderSavedPresets();renderColorRecommendationPanels();renderAiSuggestions()}

loadLocal();
bindGlobalControls();
setupCategories();
setupLayerTabs();
renderAiPromptExamples();
renderAiSuggestions();
syncAll();
setZoom(1);
