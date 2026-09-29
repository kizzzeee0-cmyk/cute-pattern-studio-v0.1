(function(){
  const TAU=Math.PI*2;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const normalizeHex=(v,f='#69B9F2')=>/^#[0-9a-fA-F]{6}$/.test(String(v||'').trim())?String(v).trim().toUpperCase():f;
  function hexToRgb(hex){let v=normalizeHex(hex,'#000000').slice(1),n=parseInt(v,16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255}}
  function rgbToHex({r,g,b}){return '#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('').toUpperCase()}
  function rgbToHsl({r,g,b}){r/=255;g/=255;b/=255;let max=Math.max(r,g,b),min=Math.min(r,g,b),h=0,s=0,l=(max+min)/2;if(max!==min){let d=max-min;s=l>.5?d/(2-max-min):d/(max+min);if(max===r)h=(g-b)/d+(g<b?6:0);else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60}return{h,s,l}}
  function hslToRgb(h,s,l){h=((h%360)+360)%360;let c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return{r:(r+m)*255,g:(g+m)*255,b:(b+m)*255}}
  const hslToHex=(h,s,l)=>rgbToHex(hslToRgb(h,s,l));
  function mix(a,b,t=.5){let x=hexToRgb(a),y=hexToRgb(b);return rgbToHex({r:x.r+(y.r-x.r)*t,g:x.g+(y.g-x.g)*t,b:x.b+(y.b-x.b)*t})}
  function hueDiff(a,b){let d=((a-b+540)%360)-180;return d}
  function transferColor(base,anchorBase,master){
    let b=rgbToHsl(hexToRgb(base)),a=rgbToHsl(hexToRgb(anchorBase)),m=rgbToHsl(hexToRgb(master));
    let nearWhite=b.l>.91;
    let h=m.h+hueDiff(b.h,a.h)*(nearWhite?.12:.58);
    let s=nearWhite?Math.min(.16,m.s*.18):clamp(m.s*(a.s>.05?b.s/a.s:.72),.08,.92);
    let delta=b.l-a.l;
    let l=clamp(m.l+delta*(nearWhite?.42:.88),.08,.985);
    if(nearWhite)l=Math.max(l,.92);
    return hslToHex(h,s,l);
  }
  function rolePalette(concept,state){
    let roleMap={},anchor=concept.roles.find(r=>r.id===concept.anchorRole)||concept.roles[0];
    if((state.colorMode||'auto')==='individual'){
      concept.roles.forEach(r=>roleMap[r.id]=normalizeHex(state.roleColors&&state.roleColors[r.id],r.color));
    }else{
      let master=normalizeHex(state.masterColor,concept.defaultMaster);
      concept.roles.forEach(r=>roleMap[r.id]=transferColor(r.color,anchor.color,master));
      let over=state.overrides||{};
      Object.keys(over).forEach(k=>{if(over[k])roleMap[k]=normalizeHex(over[k],roleMap[k]||master)});
    }
    return roleMap;
  }
  function roundedRect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function sparkle(ctx,x,y,s,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-s);ctx.quadraticCurveTo(x+s*.12,y-s*.12,x+s,y);ctx.quadraticCurveTo(x+s*.12,y+s*.12,x,y+s);ctx.quadraticCurveTo(x-s*.12,y+s*.12,x-s,y);ctx.quadraticCurveTo(x-s*.12,y-s*.12,x,y-s);ctx.fill();ctx.restore()}
  function heart(ctx,x,y,s,fill,stroke=null,lw=2){ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.moveTo(0,s*.38);ctx.bezierCurveTo(-s*.65,-s*.02,-s*.5,-s*.62,0,-s*.30);ctx.bezierCurveTo(s*.5,-s*.62,s*.65,-s*.02,0,s*.38);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.lineJoin='round';ctx.stroke()}ctx.restore()}
  function flower4(ctx,x,y,s,fill,stroke=null,lw=2){ctx.save();ctx.translate(x,y);for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2);ctx.beginPath();ctx.ellipse(0,-s*.26,s*.22,s*.32,0,0,TAU);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}ctx.restore()}ctx.restore()}
  function daisy(ctx,x,y,s,petal,center,stroke=null,lw=2){ctx.save();ctx.translate(x,y);for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*TAU/6);ctx.beginPath();ctx.ellipse(0,-s*.30,s*.16,s*.31,0,0,TAU);ctx.fillStyle=petal;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}ctx.restore()}ctx.beginPath();ctx.arc(0,0,s*.16,0,TAU);ctx.fillStyle=center;ctx.fill();ctx.restore()}
  function cloud(ctx,x,y,s,fill,stroke=null,lw=2){ctx.save();ctx.beginPath();ctx.arc(x-s*.34,y+s*.02,s*.24,Math.PI*.55,Math.PI*1.62);ctx.arc(x-s*.05,y-s*.12,s*.34,Math.PI,TAU);ctx.arc(x+s*.30,y,s*.25,Math.PI*1.30,Math.PI*.46);ctx.quadraticCurveTo(x+s*.20,y+s*.21,x,y+s*.19);ctx.quadraticCurveTo(x-s*.24,y+s*.22,x-s*.42,y+s*.08);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.lineJoin='round';ctx.stroke()}ctx.restore()}
  function catHead(ctx,x,y,s,fill,stroke,lw=3){
    ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.moveTo(-s*.46,-s*.10);ctx.lineTo(-s*.36,-s*.52);ctx.lineTo(-s*.08,-s*.34);ctx.quadraticCurveTo(0,-s*.39,s*.08,-s*.34);ctx.lineTo(s*.36,-s*.52);ctx.lineTo(s*.46,-s*.10);ctx.quadraticCurveTo(s*.50,s*.34,0,s*.42);ctx.quadraticCurveTo(-s*.50,s*.34,-s*.46,-s*.10);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.lineJoin='round';ctx.stroke()}ctx.restore()
  }
  function paw(ctx,x,y,s,fill,stroke=null,lw=2){ctx.save();ctx.translate(x,y);ctx.fillStyle=fill;ctx.strokeStyle=stroke||'transparent';ctx.lineWidth=lw;[[0,.17,.25],[-.28,-.08,.13],[-.08,-.25,.13],[.15,-.25,.13],[.34,-.05,.13]].forEach(([px,py,r],i)=>{ctx.beginPath();ctx.arc(px*s,py*s,r*s,0,TAU);ctx.fill();if(stroke)ctx.stroke()});ctx.restore()}
  function bow(ctx,x,y,s,color,stroke=null,lw=2,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle=color;ctx.strokeStyle=stroke||color;ctx.lineWidth=lw;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(-s*.08,0);ctx.bezierCurveTo(-s*.56,-s*.45,-s*.72,-s*.06,-s*.35,s*.12);ctx.bezierCurveTo(-s*.63,s*.48,-s*.18,s*.54,-s*.04,s*.11);ctx.closePath();ctx.fill();if(stroke)ctx.stroke();ctx.beginPath();ctx.moveTo(s*.08,0);ctx.bezierCurveTo(s*.56,-s*.45,s*.72,-s*.06,s*.35,s*.12);ctx.bezierCurveTo(s*.63,s*.48,s*.18,s*.54,s*.04,s*.11);ctx.closePath();ctx.fill();if(stroke)ctx.stroke();ctx.beginPath();ctx.arc(0,0,s*.12,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(-s*.04,s*.10);ctx.quadraticCurveTo(-s*.18,s*.55,-s*.27,s*.66);ctx.moveTo(s*.04,s*.10);ctx.quadraticCurveTo(s*.18,s*.55,s*.34,s*.60);ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineWidth=Math.max(lw,s*.08);ctx.stroke();ctx.restore()}
  function ribbonCurve(ctx,pts,color,lw,dash=[]){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i+2<pts.length;i+=3)ctx.bezierCurveTo(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],pts[i+2][0],pts[i+2][1]);ctx.stroke();ctx.restore()}
  function strawberry(ctx,x,y,s,fruit,leaf,seed,stroke=null,lw=2){ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.moveTo(0,s*.48);ctx.bezierCurveTo(-s*.44,s*.18,-s*.42,-s*.36,0,-s*.37);ctx.bezierCurveTo(s*.42,-s*.36,s*.44,s*.18,0,s*.48);ctx.closePath();ctx.fillStyle=fruit;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}ctx.fillStyle=leaf;for(let i=0;i<5;i++){ctx.save();ctx.rotate(i*TAU/5);ctx.beginPath();ctx.moveTo(0,-s*.24);ctx.lineTo(-s*.11,-s*.45);ctx.lineTo(s*.03,-s*.37);ctx.closePath();ctx.fill();ctx.restore()}ctx.fillStyle=seed;[[-.16,-.12],[.12,-.14],[-.23,.08],[.03,.08],[.22,.10],[-.11,.27],[.12,.27]].forEach(([px,py])=>{ctx.beginPath();ctx.ellipse(px*s,py*s,s*.025,s*.05,0,0,TAU);ctx.fill()});ctx.restore()}
  function petal(ctx,x,y,s,color,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();ctx.moveTo(0,-s*.5);ctx.quadraticCurveTo(s*.42,-s*.10,0,s*.5);ctx.quadraticCurveTo(-s*.42,-s*.10,0,-s*.5);ctx.fillStyle=color;ctx.fill();ctx.restore()}
  function japaneseCloud(ctx,x,y,s,fill,stroke=null,lw=2){ctx.save();ctx.translate(x,y);ctx.fillStyle=fill;ctx.strokeStyle=stroke||fill;ctx.lineWidth=lw;let widths=[1,.78,.56];for(let i=0;i<widths.length;i++){roundedRect(ctx,-s*.5*widths[i],(i-1)*s*.22,s*widths[i],s*.16,s*.08);ctx.fill();if(stroke)ctx.stroke()}ctx.restore()}
  function clover(ctx,x,y,s,fill,stroke=null,lw=2){ctx.save();ctx.translate(x,y);ctx.fillStyle=fill;ctx.strokeStyle=stroke||fill;ctx.lineWidth=lw;[[0,-.22],[.22,0],[0,.22],[-.22,0]].forEach(([px,py])=>{ctx.beginPath();ctx.arc(px*s,py*s,s*.26,0,TAU);ctx.fill();if(stroke)ctx.stroke()});ctx.restore()}
  function bubble(ctx,x,y,r,stroke,lw=2,alpha=.5){ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();ctx.restore()}
  function dashedGrid(ctx,w,h,color,alpha=.30,sx=170,sy=170,rot=0,lw=2,dash=10,gap=12,ox=0,oy=0){
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.lineCap='round';ctx.setLineDash([dash,gap]);ctx.translate(w/2,h/2);ctx.rotate(rot*Math.PI/180);ctx.translate(-w/2,-h/2);let extra=Math.hypot(w,h),startX=-extra+((ox%sx)+sx)%sx,startY=-extra+((oy%sy)+sy)%sy;for(let x=startX;x<w+extra;x+=sx){ctx.beginPath();ctx.moveTo(x,-extra);ctx.lineTo(x,h+extra);ctx.stroke()}for(let y=startY;y<h+extra;y+=sy){ctx.beginPath();ctx.moveTo(-extra,y);ctx.lineTo(w+extra,y);ctx.stroke()}ctx.restore()
  }
  function plaid(ctx,w,h,c1,c2,line,alpha=.18,cell=110){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=c1;for(let x=-cell;x<w+cell;x+=cell*2)ctx.fillRect(x,0,cell*.62,h);ctx.fillStyle=c2;for(let y=-cell;y<h+cell;y+=cell*2)ctx.fillRect(0,y,w,cell*.62);ctx.strokeStyle=line;ctx.lineWidth=Math.max(1,cell*.018);ctx.globalAlpha*=.65;for(let x=0;x<w;x+=cell*.5){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=cell*.5){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}ctx.restore()}
  function checkerPatch(ctx,x,y,w,h,a,b,alpha=.55,cell=32,rot=0){ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.rotate(rot);for(let row=0,yy=0;yy<h;row++,yy+=cell){for(let col=0,xx=0;xx<w;col++,xx+=cell){ctx.fillStyle=(row+col)%2?a:b;ctx.fillRect(xx,yy,cell,cell)}}ctx.restore()}
  function asanohaPatch(ctx,x,y,size,color,alpha=.32){ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,size*.015);ctx.translate(x,y);let r=size/2,step=size/3;for(let yy=-r;yy<=r;yy+=step){for(let xx=-r;xx<=r;xx+=step){ctx.beginPath();for(let i=0;i<6;i++){let a=i*TAU/6,px=xx+Math.cos(a)*step*.48,py=yy+Math.sin(a)*step*.48;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.stroke();for(let i=0;i<3;i++){let a=i*TAU/3;ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx+Math.cos(a)*step*.48,yy+Math.sin(a)*step*.48);ctx.stroke()}}}ctx.restore()}
  function edgeClouds(ctx,w,h,p,variant,scale=1){
    let C=p.cloud||p.light||'#FFFFFF',L=p.line||p.accent||'#7BAEDB';
    let list=variant==='simple'?[[.06,.90,.18],[.86,.93,.15],[.93,.12,.12]]:
      variant==='cloud-ribbon'?[[.03,.10,.18],[.24,.03,.14],[.86,.05,.17],[.97,.35,.13],[.10,.90,.21],[.78,.95,.20]]:
      [[.02,.18,.14],[.18,.96,.20],[.45,.98,.16],[.78,.96,.18],[.96,.18,.14],[.93,.78,.15]];
    list.forEach(([px,py,s],i)=>cloud(ctx,w*px,h*py,Math.min(w,h)*s*scale,C,L,Math.max(1.5,Math.min(w,h)*.003)));
  }
  const variants=[
    {id:'base',name:'기본 디자인',desc:'채택한 기본 구성'},
    {id:'cloud-ribbon',name:'구름 리본',desc:'구름과 곡선 리본 흐름을 강조'},
    {id:'check',name:'체크',desc:'체크 조각과 격자 포인트를 강조'},
    {id:'dot-bubble',name:'도트버블',desc:'도트·버블·링 장식을 강조'},
    {id:'simple',name:'심플',desc:'중앙 여백을 가장 넓게 유지'}
  ];
  const concepts=[
    {id:'sky-cat',name:'고양이 / 하늘',desc:'스카이블루 · 고양이 · 구름 · 산뜻한 키치',defaultMaster:'#62B2EA',anchorRole:'cat',roles:[
      {id:'background',label:'배경',color:'#B7DFFF'},{id:'grid',label:'점선 체크',color:'#F8FCFF'},{id:'cloud',label:'구름',color:'#F8FBFF'},{id:'cat',label:'고양이',color:'#62B2EA'},{id:'ear',label:'귀 안쪽 / 크림',color:'#FFF0C7'},{id:'ribbon',label:'리본',color:'#5AA9E5'},{id:'paw',label:'발바닥',color:'#FFD98A'},{id:'accent',label:'하트 / 별',color:'#FFF1B7'},{id:'line',label:'윤곽선',color:'#4C9DDA'}
    ]},
    {id:'sage-cloud',name:'세이지 / 구름',desc:'세이지그린 · 크림 · 구름 · 코지',defaultMaster:'#748D5B',anchorRole:'line',roles:[
      {id:'background',label:'배경',color:'#9CAF82'},{id:'check1',label:'체크 1',color:'#8FA276'},{id:'check2',label:'체크 2',color:'#B3C29D'},{id:'cloud',label:'구름',color:'#FBF8EC'},{id:'clover',label:'클로버 장식',color:'#AFC39A'},{id:'ribbon',label:'리본 / 곡선',color:'#EDE7D3'},{id:'accent',label:'별 포인트',color:'#FFE1A0'},{id:'line',label:'윤곽선',color:'#748D5B'}
    ]},
    {id:'purple-japanese',name:'라벤더 / 일본풍',desc:'라벤더 · 구름문양 · 꽃잎 · 전통 패턴 포인트',defaultMaster:'#8D73D7',anchorRole:'accent',roles:[
      {id:'background',label:'배경',color:'#C7BAF0'},{id:'cloud',label:'구름문양',color:'#F7F4FF'},{id:'flower',label:'꽃',color:'#E9E0FA'},{id:'petal',label:'꽃잎',color:'#A88CE5'},{id:'pattern',label:'전통 패턴',color:'#B5A3EA'},{id:'line',label:'곡선 / 선',color:'#9B83DD'},{id:'accent',label:'포인트 보라',color:'#8D73D7'}
    ]},
    {id:'strawberry-lovely',name:'딸기 / 러블리',desc:'베이비핑크 · 딸기 · 리본 · 데이지',defaultMaster:'#F05275',anchorRole:'strawberry',roles:[
      {id:'background',label:'배경',color:'#F7B8C8'},{id:'grid',label:'점선 체크',color:'#FFF6F8'},{id:'strawberry',label:'딸기',color:'#F05275'},{id:'leaf',label:'딸기 잎',color:'#52AD7A'},{id:'ribbon',label:'리본',color:'#EC5A80'},{id:'flower',label:'데이지',color:'#FFF9F6'},{id:'flowerCenter',label:'꽃 중심',color:'#FFD76C'},{id:'accent',label:'하트 / 꽃잎',color:'#F77F9F'},{id:'check',label:'체크 조각',color:'#F8D5DF'}
    ]}
  ];
  const getConcept=id=>concepts.find(c=>c.id===id)||concepts[0];
  const getVariant=id=>variants.find(v=>v.id===id)||variants[0];
  function defaultState(conceptId='sky-cat',variantId='base'){let c=getConcept(conceptId);let roleColors={};c.roles.forEach(r=>roleColors[r.id]=r.color);return{conceptId:c.id,variantId:getVariant(variantId).id,colorMode:'auto',masterColor:c.defaultMaster,roleColors,overrides:{},decorationScale:100,density:100}}
  function normalizeState(s){let base=defaultState(s&&s.conceptId,s&&s.variantId),out=Object.assign(base,s||{});let c=getConcept(out.conceptId);out.variantId=getVariant(out.variantId).id;out.colorMode=out.colorMode==='individual'?'individual':'auto';out.masterColor=normalizeHex(out.masterColor,c.defaultMaster);out.roleColors=Object.assign({},base.roleColors,out.roleColors||{});out.overrides=Object.assign({},out.overrides||{});out.decorationScale=clamp(Number(out.decorationScale)||100,60,150);out.density=clamp(Number(out.density)||100,50,150);return out}
  function skyRender(ctx,w,h,p,v,s){
    let u=Math.min(w,h),ds=(s.decorationScale||100)/100,d=(s.density||100)/100;
    ctx.fillStyle=p.background;ctx.fillRect(0,0,w,h);
    if(v!=='simple')dashedGrid(ctx,w,h,p.grid,v==='check'?.42:.24,u*.16,u*.16,-12,u*.0024,u*.010,u*.014,0,0);
    if(v==='check'){checkerPatch(ctx,w*.74,-h*.02,w*.30,h*.18,mix(p.background,'#FFFFFF',.35),mix(p.grid,p.background,.55),.70,u*.035,.05);checkerPatch(ctx,-w*.05,h*.72,w*.28,h*.20,mix(p.background,'#FFFFFF',.35),mix(p.grid,p.background,.58),.62,u*.032,-.04)}
    if(v==='dot-bubble'){for(let i=0;i<12;i++)bubble(ctx,w*(.08+(i*37%83)/100),h*(.12+(i*53%78)/100),u*(.014+(i%3)*.008),p.grid,u*.002,.42)}
    edgeClouds(ctx,w,h,{cloud:p.cloud,line:p.line},v,ds);
    if(v!=='simple'){bow(ctx,w*.14,h*.11,u*.09*ds,p.ribbon,p.cloud,u*.003,-.10);ribbonCurve(ctx,[[w*.12,h*.12],[w*.26,h*.01],[w*.31,h*.12],[w*.35,h*.18]],p.ribbon,u*.012*ds)}
    catHead(ctx,w*(v==='cloud-ribbon'?.82:.86),h*(v==='cloud-ribbon'?.18:.14),u*.11*ds,p.cat,p.cloud,u*.006);
    catHead(ctx,w*.23,h*.86,u*.12*ds,p.cloud,p.line,u*.005);
    heart(ctx,w*.90,h*.21,u*.035*ds,p.accent,p.cloud,u*.004);paw(ctx,w*.78,h*.78,u*.07*ds,p.paw,p.cloud,u*.004);
    let pts=[[.10,.31],[.18,.58],[.32,.23],[.42,.82],[.66,.18],[.70,.67],[.87,.55],[.55,.35]];
    pts.slice(0,Math.round(pts.length*Math.min(1,d))).forEach(([x,y],i)=>{if(i%3===0)paw(ctx,w*x,h*y,u*.035,p.cat);else if(i%3===1)heart(ctx,w*x,h*y,u*.020,p.cloud,p.line,u*.002);else sparkle(ctx,w*x,h*y,u*.018,p.accent,.9)});
  }
  function sageRender(ctx,w,h,p,v,s){
    let u=Math.min(w,h),ds=(s.decorationScale||100)/100;
    ctx.fillStyle=p.background;ctx.fillRect(0,0,w,h);
    plaid(ctx,w,h,p.check1,p.check2,p.line,v==='simple'?.08:v==='check'?.32:.18,u*.085);
    if(v==='dot-bubble'){for(let i=0;i<14;i++){let x=w*(.08+(i*41%84)/100),y=h*(.08+(i*57%84)/100);bubble(ctx,x,y,u*(.012+(i%4)*.007),p.cloud,u*.002,.36)}}
    edgeClouds(ctx,w,h,{cloud:p.cloud,line:p.line},v,ds);
    let cl=[[.15,.20,.045],[.83,.24,.038],[.23,.68,.052],[.76,.77,.046],[.44,.14,.030],[.58,.90,.032]];
    if(v==='simple')cl=cl.slice(0,3);
    cl.forEach(([x,y,z],i)=>clover(ctx,w*x,h*y,u*z*ds,i%2?p.clover:p.cloud,p.line,u*.003));
    ribbonCurve(ctx,[[w*.01,h*.22],[w*.20,h*.12],[w*.27,h*.30],[w*.36,h*.34]],p.ribbon,u*.005*ds,[u*.012,u*.010]);
    ribbonCurve(ctx,[[w*.72,h*.90],[w*.78,h*.72],[w*.92,h*.82],[w*1.02,h*.68]],p.ribbon,u*.006*ds);
    [ [.18,.12],[.88,.38],[.62,.18],[.78,.62],[.27,.82] ].forEach(([x,y],i)=>sparkle(ctx,w*x,h*y,u*(.017+(i%2)*.005),p.accent,.9));
  }
  function purpleRender(ctx,w,h,p,v,s){
    let u=Math.min(w,h),ds=(s.decorationScale||100)/100;
    ctx.fillStyle=p.background;ctx.fillRect(0,0,w,h);
    if(v==='check'){checkerPatch(ctx,-w*.02,h*.72,w*.30,h*.30,mix(p.background,'#FFFFFF',.25),mix(p.pattern,p.background,.58),.45,u*.045,0);checkerPatch(ctx,w*.78,-h*.02,w*.24,h*.20,mix(p.background,'#FFFFFF',.25),mix(p.pattern,p.background,.58),.35,u*.04,0)}
    if(v!=='simple'){asanohaPatch(ctx,w*.88,h*.10,u*.24,p.pattern,.34);asanohaPatch(ctx,w*.12,h*.88,u*.18,p.pattern,.20)}
    japaneseCloud(ctx,w*.12,h*.13,u*.20*ds,p.cloud,p.line,u*.002);japaneseCloud(ctx,w*.83,h*.27,u*.18*ds,p.cloud,null);
    if(v==='cloud-ribbon')ribbonCurve(ctx,[[w*.06,h*.22],[w*.24,h*.05],[w*.38,h*.18],[w*.46,h*.10]],p.line,u*.006*ds);
    let fs=v==='simple'?[[.16,.22,.038],[.83,.76,.034]]:[[.14,.28,.040],[.82,.22,.036],[.18,.79,.050],[.78,.74,.044],[.58,.16,.026]];
    fs.forEach(([x,y,z],i)=>{flower4(ctx,w*x,h*y,u*z*ds,i%2?p.flower:p.accent,p.cloud,u*.002);if(i%2===0)petal(ctx,w*(x+.06),h*(y+.04),u*z*.7,p.petal,.6)});
    [[.27,.17],[.70,.28],[.25,.58],[.64,.78],[.88,.55],[.43,.88]].forEach(([x,y],i)=>{if(v==='simple'&&i>2)return;petal(ctx,w*x,h*y,u*.026,p.petal,(i*.8));if(i%2===0)sparkle(ctx,w*(x+.05),h*(y-.03),u*.013,p.cloud,.8)});
    ribbonCurve(ctx,[[w*.05,h*.42],[w*.20,h*.36],[w*.30,h*.48],[w*.38,h*.44]],p.line,u*.004*ds);
    ribbonCurve(ctx,[[w*.66,h*.92],[w*.78,h*.80],[w*.90,h*.91],[w*1.02,h*.80]],p.line,u*.004*ds);
  }
  function strawberryRender(ctx,w,h,p,v,s){
    let u=Math.min(w,h),ds=(s.decorationScale||100)/100,d=(s.density||100)/100;
    ctx.fillStyle=p.background;ctx.fillRect(0,0,w,h);
    if(v!=='simple')dashedGrid(ctx,w,h,p.grid,v==='check'?.46:.30,u*.16,u*.16,45,u*.0022,u*.010,u*.015,0,0);
    if(v==='check'){checkerPatch(ctx,w*.72,-h*.03,w*.31,h*.22,p.check,mix(p.background,'#FFFFFF',.28),.62,u*.040,.04);checkerPatch(ctx,-w*.05,h*.72,w*.31,h*.25,p.check,mix(p.background,'#FFFFFF',.28),.58,u*.038,-.02)}
    if(v==='dot-bubble'){for(let i=0;i<16;i++){let x=w*(.08+(i*31%84)/100),y=h*(.10+(i*47%80)/100);bubble(ctx,x,y,u*(.010+(i%4)*.006),p.grid,u*.002,.34)}}
    bow(ctx,w*.13,h*.12,u*.10*ds,p.ribbon,p.grid,u*.003,-.08);ribbonCurve(ctx,[[w*.10,h*.12],[w*.24,h*.01],[w*.28,h*.16],[w*.40,h*.20]],p.ribbon,u*.011*ds);
    bow(ctx,w*.89,h*.80,u*.08*ds,p.ribbon,p.grid,u*.003,.18);ribbonCurve(ctx,[[w*.91,h*.80],[w*.78,h*.92],[w*.68,h*.87],[w*.58,h*.98]],p.ribbon,u*.010*ds);
    let berries=v==='simple'?[[.16,.18,.075],[.78,.78,.070],[.87,.25,.048]]:[[.18,.18,.078],[.80,.62,.080],[.15,.80,.063],[.90,.18,.050],[.63,.88,.045]];
    berries.slice(0,Math.round(berries.length*Math.min(1,d))).forEach(([x,y,z])=>strawberry(ctx,w*x,h*y,u*z*ds,p.strawberry,p.leaf,p.grid,p.grid,u*.003));
    let flowers=[[.10,.35,.045],[.33,.20,.034],[.86,.38,.045],[.28,.78,.040],[.70,.22,.030],[.73,.82,.035]];
    flowers.slice(0,v==='simple'?3:flowers.length).forEach(([x,y,z])=>daisy(ctx,w*x,h*y,u*z,p.flower,p.flowerCenter,null));
    let petals=[[.22,.32],[.42,.17],[.57,.38],[.28,.58],[.64,.68],[.48,.84],[.82,.48],[.13,.63]];
    petals.slice(0,Math.round(petals.length*Math.min(1,d))).forEach(([x,y],i)=>{petal(ctx,w*x,h*y,u*.026,p.accent,i*.75);if(i%3===0)heart(ctx,w*(x+.05),h*(y+.04),u*.016,null,p.grid,u*.002)});
  }
  function render(ctx,w,h,state){
    let s=normalizeState(state),c=getConcept(s.conceptId),v=s.variantId,p=rolePalette(c,s);
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.lineCap='round';ctx.lineJoin='round';
    if(c.id==='sky-cat')skyRender(ctx,w,h,p,v,s);
    else if(c.id==='sage-cloud')sageRender(ctx,w,h,p,v,s);
    else if(c.id==='purple-japanese')purpleRender(ctx,w,h,p,v,s);
    else strawberryRender(ctx,w,h,p,v,s);
    ctx.restore();
  }
  function roleColors(state){let s=normalizeState(state),c=getConcept(s.conceptId);return rolePalette(c,s)}
  window.DesignEngine={concepts,variants,getConcept,getVariant,defaultState,normalizeState,roleColors,render,normalizeHex,mix};
})();