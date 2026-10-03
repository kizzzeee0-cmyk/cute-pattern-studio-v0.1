(function(){
  const TAU=Math.PI*2;
  function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  function hashSeed(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function rr(rng,a,b){return a+(b-a)*rng()}
  function pick(rng,a){return a[Math.floor(rng()*a.length)]}
  function jitter(rng,amount){return (rng()-.5)*2*amount}
  function rotatePoint(x,y,a){let c=Math.cos(a),s=Math.sin(a);return[x*c-y*s,x*s+y*c]}
  function roundRect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function heart(ctx,x,y,s,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();ctx.moveTo(0,s*.35);ctx.bezierCurveTo(-s*.62,-s*.05,-s*.48,-s*.58,0,-s*.30);ctx.bezierCurveTo(s*.48,-s*.58,s*.62,-s*.05,0,s*.35);ctx.closePath();ctx.restore()}
  function star(ctx,x,y,r1,r2,n=5,rot=-Math.PI/2){ctx.beginPath();for(let i=0;i<n*2;i++){let r=i%2?r2:r1,a=rot+i*Math.PI/n;let px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath()}
  function sparkle(ctx,x,y,s,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();ctx.moveTo(0,-s);ctx.quadraticCurveTo(s*.12,-s*.12,s,0);ctx.quadraticCurveTo(s*.12,s*.12,0,s);ctx.quadraticCurveTo(-s*.12,s*.12,-s,0);ctx.quadraticCurveTo(-s*.12,-s*.12,0,-s);ctx.closePath();ctx.restore()}
  function bow(ctx,x,y,s,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();ctx.moveTo(-s*.08,0);ctx.bezierCurveTo(-s*.52,-s*.5,-s*.8,-s*.1,-s*.38,s*.12);ctx.bezierCurveTo(-s*.7,s*.52,-s*.25,s*.58,-s*.05,s*.12);ctx.arc(0,0,s*.13,0,TAU);ctx.moveTo(s*.08,0);ctx.bezierCurveTo(s*.52,-s*.5,s*.8,-s*.1,s*.38,s*.12);ctx.bezierCurveTo(s*.7,s*.52,s*.25,s*.58,s*.05,s*.12);ctx.fill();ctx.restore()}
  function flower(ctx,x,y,s,petals=5,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);for(let i=0;i<petals;i++){let a=i*TAU/petals;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,-s*.30,s*.20,s*.34,0,0,TAU);ctx.fill();ctx.restore()}ctx.restore()}
  function cloud(ctx,x,y,s){ctx.beginPath();ctx.arc(x-s*.28,y,s*.22,Math.PI*.55,Math.PI*1.65);ctx.arc(x,y-s*.12,s*.30,Math.PI,TAU);ctx.arc(x+s*.28,y,s*.22,Math.PI*1.35,Math.PI*.45);ctx.quadraticCurveTo(x+s*.2,y+s*.2,x,y+s*.18);ctx.quadraticCurveTo(x-s*.2,y+s*.2,x-s*.36,y+s*.08);ctx.closePath()}
  function cherry(ctx,x,y,s){ctx.save();ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y-s*.34);ctx.quadraticCurveTo(x+s*.2,y-s*.75,x+s*.42,y-s*.58);ctx.moveTo(x,y-s*.34);ctx.quadraticCurveTo(x-s*.08,y-s*.62,x-s*.25,y-s*.54);ctx.stroke();ctx.beginPath();ctx.arc(x-s*.24,y,s*.22,0,TAU);ctx.arc(x+s*.22,y+s*.1,s*.22,0,TAU);ctx.fill();ctx.restore()}
  function strawberry(ctx,x,y,s){ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.moveTo(0,s*.45);ctx.bezierCurveTo(-s*.42,s*.18,-s*.42,-s*.38,0,-s*.38);ctx.bezierCurveTo(s*.42,-s*.38,s*.42,s*.18,0,s*.45);ctx.closePath();ctx.fill();ctx.restore()}
  function smile(ctx,x,y,s){ctx.beginPath();ctx.arc(x,y,s*.36,0,TAU);ctx.fill();}
  function cellLoop(w,h,step,cb){for(let y=-step;y<h+step;y+=step)for(let x=-step;x<w+step;x+=step)cb(x,y)}
  function withAlpha(ctx,a,fn){ctx.save();ctx.globalAlpha*=a;fn();ctx.restore()}
  function common(s,scale){return{size:s.size*scale,gap:s.gap*scale,jit:s.jitter/100*s.size*scale*.42,stroke:s.stroke*scale,detail:s.detail/100,rot:s.rotation*Math.PI/180,op:s.opacity/100,seed:hashSeed(String(s.seed))}}
  const UNIFORM_SHAPE_PRESETS=new Set([
    'polka','tiny-dot','irregular-dot','doodle-dot','ring-dot','bubble-dot',
    'hearts','outline-hearts','stars','outline-stars','sparkles','kira-sparkle',
    'bows','tiny-bows','puff-hearts','candy-stars','flowers','daisy-dot',
    'cloud','raindrop'
  ]);
  function uniformShapePreset(s){return UNIFORM_SHAPE_PRESETS.has(s.presetId)}
  function uniformRowConfig(s,rowIndex,step,scale){
    let second=((rowIndex%2)+2)%2===1;
    return {
      second,
      x:(second?step/2:0)+((second?s.row2OffsetX:s.row1OffsetX)||0)*scale,
      y:((second?s.row2OffsetY:s.row1OffsetY)||0)*scale,
      angle:((second?s.row2Angle:s.row1Angle)||0)*Math.PI/180
    }
  }

  function drawBackground(ctx,w,h,s){if(s.skipBackground)return;if(s.transparentBg){ctx.clearRect(0,0,w,h);return}ctx.save();if(s.bgMode==='linear'){let a=(s.gradientAngle||135)*Math.PI/180,cx=w/2,cy=h/2,L=Math.abs(w*Math.cos(a))+Math.abs(h*Math.sin(a));let dx=Math.cos(a)*L/2,dy=Math.sin(a)*L/2;let g=ctx.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);g.addColorStop(0,s.colors[0]);g.addColorStop(1,s.colors[1]);ctx.fillStyle=g}else ctx.fillStyle=s.colors[0];ctx.fillRect(0,0,w,h);ctx.restore()}
  function hexToRgb(hex){let v=(hex||'#000000').replace('#','').trim();if(v.length===3)v=v.split('').map(c=>c+c).join('');let n=parseInt(v,16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255}}
  function rgbToHex(rgb){return '#'+[rgb.r,rgb.g,rgb.b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}
  function mixColor(a,b,t=.5){let c1=hexToRgb(a),c2=hexToRgb(b),m=(x,y)=>x+(y-x)*t;return rgbToHex({r:m(c1.r,c2.r),g:m(c1.g,c2.g),b:m(c1.b,c2.b)})}
  function checker(ctx,w,h,s,scale,opt={}){let p=common(s,scale),cell=Math.max(4,p.size),contiguous=!!opt.contiguous,step=contiguous?cell:Math.max(cell*.45,cell+p.gap),rng=mulberry32(p.seed),cols=s.colors,outlineColor=cols[4]||cols[3]||cols[2]||cols[1],extraRot=((opt.rotate45?45:0)+(opt.rotateDeg||0))*Math.PI/180;ctx.save();ctx.globalAlpha=p.op;ctx.translate(w/2,h/2);ctx.rotate(p.rot+extraRot);ctx.translate(-w/2,-h/2);for(let row=-3,y=-step*3; y<h+step*3; row++,y+=step){for(let col=-3,x=-step*3; x<w+step*3; col++,x+=step){let on=(row+col)%2===0;let wob=opt.hand?p.jit*.3:0,xx=x+jitter(rng,wob),yy=y+jitter(rng,wob),sz=cell+(opt.hand?jitter(rng,p.jit*.18):0),drawn=false;ctx.lineWidth=p.stroke;ctx.strokeStyle=outlineColor;if(opt.tricolor){ctx.globalAlpha=p.op;ctx.fillStyle=[cols[1],cols[2],cols[3]][Math.abs((row+col)%3)];if(opt.round){roundRect(ctx,xx,yy,sz,sz,Math.max(3,sz*.16));ctx.fill();if(p.stroke>0&&opt.outline!==false)ctx.stroke()}else{ctx.fillRect(xx,yy,sz,sz);if(p.stroke>0&&opt.outline!==false)ctx.strokeRect(xx,yy,sz,sz)}drawn=true}else if(opt.gingham){ctx.globalAlpha=p.op*(on?.62:.18);ctx.fillStyle=on?cols[2]:cols[1];ctx.fillRect(xx,yy,sz,sz);if(p.stroke>0&&opt.outline!==false){ctx.globalAlpha=p.op;ctx.strokeRect(xx,yy,sz,sz)}drawn=true}else if(contiguous){ctx.globalAlpha=p.op;ctx.fillStyle=on?cols[1]:cols[2];if(opt.round){roundRect(ctx,xx,yy,sz,sz,Math.max(3,sz*.18));ctx.fill();if(p.stroke>0&&opt.outline!==false)ctx.stroke()}else{ctx.fillRect(xx,yy,sz,sz);if(p.stroke>0&&opt.outline!==false)ctx.strokeRect(xx,yy,sz,sz)}drawn=true}else{if(!on)continue;ctx.globalAlpha=p.op;ctx.fillStyle=on?cols[1]:cols[2];if(opt.round){roundRect(ctx,xx,yy,sz,sz,Math.max(3,sz*.18));ctx.fill();if(p.stroke>0&&opt.outline!==false)ctx.stroke()}else{ctx.fillRect(xx,yy,sz,sz);if(p.stroke>0&&opt.outline!==false)ctx.strokeRect(xx,yy,sz,sz)}drawn=true}if(drawn&&opt.soft){ctx.globalAlpha=p.op*.14;ctx.fillStyle=opt.tricolor?cols[(Math.abs((row+col)%3)+1)%3+1]:on?cols[2]:cols[1];ctx.fillRect(xx+sz*.08,yy+sz*.08,sz*.84,sz*.84)}if(drawn&&opt.motif&&rng()<.35+p.detail*.5){ctx.fillStyle=cols[3];ctx.globalAlpha=p.op*.88;let mx=xx+sz/2,my=yy+sz/2,ms=sz*(.16+.13*p.detail);if(opt.motif==='heart'){heart(ctx,mx,my,ms);ctx.fill()}if(opt.motif==='star'){star(ctx,mx,my,ms,ms*.48);ctx.fill()}if(opt.motif==='dot'){ctx.beginPath();ctx.arc(mx,my,ms*.65,0,TAU);ctx.fill()}}}}ctx.restore()}
  function overlapChecker(ctx,w,h,s,scale,opt={}){
    let p=common(s,scale),cell=Math.max(8,p.size),step=Math.max(8,cell+(opt.allowGap?(p.gap||0):0)),rng=mulberry32(p.seed),
      extraRot=((opt.rotate45?45:0)+(opt.rotateDeg||0))*Math.PI/180,
      bandColor=s.colors[1]||'#9CC8F0',softColor=s.colors[2]||bandColor,lineColor=s.colors[4]||softColor,
      aStrong=Math.max(.18,Math.min(.46,.22+p.detail*.22)),aSoft=Math.max(.08,Math.min(.28,.10+p.detail*.12)),
      hatchOn=opt.hatchMid&&s.triHatch!==false,hatchStrength=Math.max(0,Math.min(1,(s.triHatchStrength??40)/100));
    let workCanvas=null,target=ctx;
    if(hatchOn){
      workCanvas=document.createElement('canvas');workCanvas.width=w;workCanvas.height=h;target=workCanvas.getContext('2d')
    }
    target.save();target.globalAlpha=p.op;target.translate(w/2,h/2);target.rotate(p.rot+extraRot);target.translate(-w/2,-h/2);
    let startX=-step*4+(s.offsetX||0)*scale,startY=-step*4+(s.offsetY||0)*scale;
    let verticalBands=[],horizontalBands=[];
    for(let i=0,x=startX;i<Math.ceil((w+step*8)/step);i++,x+=step){
      let even=i%2===0,xx=x+((s.randomPosition===false)?0:jitter(rng,p.jit*.08));
      if(even){target.globalAlpha=p.op*aStrong;target.fillStyle=bandColor;target.fillRect(xx,-step*4,cell,h+step*8);verticalBands.push([xx,cell])}
      else if(opt.secondary){target.globalAlpha=p.op*aSoft;target.fillStyle=softColor;target.fillRect(xx,-step*4,cell,h+step*8)}
    }
    for(let j=0,y=startY;j<Math.ceil((h+step*8)/step);j++,y+=step){
      let even=j%2===0,yy=y+((s.randomPosition===false)?0:jitter(rng,p.jit*.08));
      if(even){target.globalAlpha=p.op*aStrong;target.fillStyle=bandColor;target.fillRect(-step*4,yy,w+step*8,cell);horizontalBands.push([yy,cell])}
      else if(opt.secondary){target.globalAlpha=p.op*aSoft;target.fillStyle=softColor;target.fillRect(-step*4,yy,w+step*8,cell)}
    }
    if(hatchOn&&hatchStrength>0&&verticalBands.length&&horizontalBands.length){
      let revealAlpha=.10+.90*hatchStrength,hatchWidth=Math.max(.7,cell*.018),hatchGap=Math.max(4,cell*.075),alternate=s.triHatchAlternate!==false;
      const revealRect=(x,y,ww,hh)=>{
        if(ww<=0||hh<=0)return;
        let row=Math.floor((((y+hh/2)-startY)/step)+1e-6),reverse=alternate&&(Math.abs(row)%2===1);
        target.save();target.beginPath();target.rect(x,y,ww,hh);target.clip();
        target.globalCompositeOperation='destination-out';target.globalAlpha=revealAlpha;target.strokeStyle='#000000';target.lineWidth=hatchWidth;target.lineCap='round';
        for(let d=-hh;d<ww+hh;d+=hatchGap){
          target.beginPath();
          if(reverse){target.moveTo(x+d,y);target.lineTo(x+d+hh,y+hh)}
          else{target.moveTo(x+d,y+hh);target.lineTo(x+d+hh,y)}
          target.stroke()
        }
        target.restore()
      };
      // Cut transparent diagonal lines only through the medium-tone single-band areas.
      // Adjacent rows alternate / and \ so row A / row B becomes one repeating hatch pair.
      for(const [vx,vw] of verticalBands){
        let sorted=horizontalBands.slice().sort((a,b)=>a[0]-b[0]),cursor=-step*4;
        for(const [hy,hh] of sorted){if(hy>cursor)revealRect(vx,cursor,vw,hy-cursor);cursor=Math.max(cursor,hy+hh)}
        if(cursor<h+step*4)revealRect(vx,cursor,vw,h+step*4-cursor)
      }
      for(const [hy,hh] of horizontalBands){
        let sorted=verticalBands.slice().sort((a,b)=>a[0]-b[0]),cursor=-step*4;
        for(const [vx,vw] of sorted){if(vx>cursor)revealRect(cursor,hy,vx-cursor,hh);cursor=Math.max(cursor,vx+vw)}
        if(cursor<w+step*4)revealRect(cursor,hy,w+step*4-cursor,hh)
      }
      target.globalCompositeOperation='source-over'
    }
    if((opt.grid||opt.outline)&&p.stroke>0){
      target.globalAlpha=p.op*.55;target.strokeStyle=lineColor;target.lineWidth=Math.max(.5,p.stroke*.28);
      for(let x=startX;x<w+step*4;x+=step){target.beginPath();target.moveTo(x,-step*4);target.lineTo(x,h+step*4);target.stroke()}
      for(let y=startY;y<h+step*4;y+=step){target.beginPath();target.moveTo(-step*4,y);target.lineTo(w+step*4,y);target.stroke()}
    }
    target.restore();
    if(workCanvas){ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.drawImage(workCanvas,0,0);ctx.restore()}
  }
  function wavyChecker(ctx,w,h,s,scale){let p=common(s,scale),cell=Math.max(10,p.size),step=Math.max(cell*.55,cell+p.gap),rng=mulberry32(p.seed);ctx.save();ctx.globalAlpha=p.op;ctx.translate(w/2,h/2);ctx.rotate(p.rot);ctx.translate(-w/2,-h/2);for(let row=-3,y=-step*3;y<h+step*3;row++,y+=step){for(let col=-3,x=-step*3;x<w+step*3;col++,x+=step){if((row+col)%2)continue;let amp=cell*(.06+.10*p.detail),xx=x+jitter(rng,p.jit*.25),yy=y+jitter(rng,p.jit*.25);ctx.fillStyle=(row+col)%4===0?s.colors[1]:s.colors[2];ctx.beginPath();ctx.moveTo(xx,yy+amp);ctx.bezierCurveTo(xx+cell*.3,yy-amp,xx+cell*.7,yy+amp,xx+cell,yy);ctx.lineTo(xx+cell,yy+cell-amp);ctx.bezierCurveTo(xx+cell*.7,yy+cell+amp,xx+cell*.3,yy+cell-amp,xx,yy+cell);ctx.closePath();ctx.fill()}}ctx.restore()}
  function dots(ctx,w,h,s,scale,opt={}){
    let p=common(s,scale),step=Math.max(8,p.size+p.gap),rng=mulberry32(p.seed),uniform=uniformShapePreset(s),r=Math.max(2,p.size*.22),shapeColor=s.colors[1]||'#F59BBC';
    ctx.save();ctx.globalAlpha=p.op;ctx.translate(w/2,h/2);ctx.rotate(p.rot);ctx.translate(-w/2,-h/2);
    if(uniform){
      for(let row=-3,y=-step*3;y<h+step*3;row++,y+=step){
        let rc=uniformRowConfig(s,row,step,scale);
        for(let x=-step*3;x<w+step*3;x+=step){
          let xx=x+step/2+rc.x,yy=y+step/2+rc.y,rr=r;
          ctx.fillStyle=shapeColor;ctx.strokeStyle=shapeColor;ctx.lineWidth=p.stroke;
          if(opt.ring){ctx.beginPath();ctx.arc(xx,yy,rr,0,TAU);ctx.stroke()}
          else if(opt.doodle){ctx.beginPath();let n=10;for(let i=0;i<=n;i++){let aa=i/n*TAU,px=xx+Math.cos(aa)*rr,py=yy+Math.sin(aa)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.fill()}
          else{ctx.beginPath();ctx.arc(xx,yy,rr,0,TAU);ctx.fill()}
        }
      }
      ctx.restore();return
    }
    let aligned=(s.randomPosition===false),posJit=aligned?0:p.jit;
    cellLoop(w,h,step,(x,y)=>{let baseX=aligned?x+step/2:x,baseY=aligned?y+step/2:y,xx=baseX+(opt.irregular?jitter(rng,posJit):0),yy=baseY+(opt.irregular?jitter(rng,posJit):0),rr=r;ctx.fillStyle=shapeColor;ctx.strokeStyle=shapeColor;ctx.lineWidth=p.stroke;if(opt.ring){ctx.beginPath();ctx.arc(xx,yy,rr,0,TAU);ctx.stroke()}else if(opt.doodle){ctx.beginPath();let n=10;for(let i=0;i<=n;i++){let aa=i/n*TAU,rad=rr+jitter(rng,p.jit*.18),px=xx+Math.cos(aa)*rad,py=yy+Math.sin(aa)*rad;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.fill()}else{ctx.beginPath();ctx.arc(xx,yy,rr,0,TAU);ctx.fill()}});
    ctx.restore()
  }
  function rrand(rng,a,b){return a+(b-a)*rng()}
  function grid(ctx,w,h,s,scale,opt={}){let p=common(s,scale),step=Math.max(10,p.size+p.gap),rng=mulberry32(p.seed);ctx.save();ctx.globalAlpha=p.op;ctx.strokeStyle=s.colors[1];ctx.lineWidth=p.stroke;ctx.lineCap='round';ctx.translate(w/2,h/2);ctx.rotate(p.rot);ctx.translate(-w/2,-h/2);for(let x=-step;x<w+step;x+=step){ctx.beginPath();for(let y=-step;y<=h+step;y+=step/3){let xx=x+(opt.hand?jitter(rng,p.jit*.22):0);y===-step?ctx.moveTo(xx,y):ctx.lineTo(xx,y)}ctx.stroke()}for(let y=-step;y<h+step;y+=step){ctx.beginPath();for(let x=-step;x<=w+step;x+=step/3){let yy=y+(opt.hand?jitter(rng,p.jit*.22):0);x===-step?ctx.moveTo(x,yy):ctx.lineTo(x,yy)}ctx.stroke()}ctx.restore()}
  function stripes(ctx,w,h,s,scale,opt={}){let p=common(s,scale),step=Math.max(8,p.size+p.gap),rng=mulberry32(p.seed);ctx.save();ctx.globalAlpha=p.op;ctx.translate(w/2,h/2);ctx.rotate(p.rot+(opt.diagonal?Math.PI/4:0));ctx.translate(-w/2,-h/2);ctx.lineWidth=Math.max(2,p.size*.55);ctx.lineCap='round';for(let y=-h;y<h*2;y+=step){ctx.strokeStyle=pick(rng,s.colors.slice(1));ctx.beginPath();if(opt.wavy){ctx.moveTo(-w,y);for(let x=-w;x<=w*2;x+=step*.55){ctx.quadraticCurveTo(x+step*.27,y+Math.sin(x/step*2)*p.size*.18*(.3+p.detail),x+step*.55,y)}}else if(opt.scribble){ctx.moveTo(-w,y);for(let x=-w;x<=w*2;x+=step*.35)ctx.lineTo(x,y+jitter(rng,p.jit*.6))}else{ctx.moveTo(-w,y);ctx.lineTo(w*2,y)}ctx.stroke()}ctx.restore()}
  function zigzag(ctx,w,h,s,scale){let p=common(s,scale),step=Math.max(12,p.size+p.gap),amp=p.size*.35;ctx.save();ctx.globalAlpha=p.op;ctx.strokeStyle=s.colors[1];ctx.lineWidth=p.stroke;ctx.translate(w/2,h/2);ctx.rotate(p.rot);ctx.translate(-w/2,-h/2);for(let y=-step;y<h+step;y+=step){ctx.beginPath();for(let x=-step,i=0;x<w+step;x+=step/2,i++){let yy=y+(i%2?amp:-amp);i?ctx.lineTo(x,yy):ctx.moveTo(x,yy)}ctx.stroke()}ctx.restore()}
  function motifScatter(ctx,w,h,s,scale,type,opt={}){
    let p=common(s,scale),step=Math.max(14,p.size+p.gap),rng=mulberry32(p.seed),uniform=uniformShapePreset(s),uniformColor=s.colors[1]||'#F59BBC';
    const drawOne=(xx,yy,sz,col,a)=>{
      ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineWidth=p.stroke;
      if(type==='heart'){heart(ctx,xx,yy,sz,a);opt.outline?ctx.stroke():ctx.fill()}
      else if(type==='star'){star(ctx,xx,yy,sz,sz*.48,opt.sparkle?4:5,a-Math.PI/2);opt.outline?ctx.stroke():ctx.fill()}
      else if(type==='sparkle'){sparkle(ctx,xx,yy,sz,a);ctx.fill()}
      else if(type==='bow'){bow(ctx,xx,yy,sz,a)}
      else if(type==='flower'){flower(ctx,xx,yy,sz,5,a);if(p.detail>.15){ctx.fillStyle=uniform?col:s.colors[3];ctx.beginPath();ctx.arc(xx,yy,sz*.13,0,TAU);ctx.fill()}}
      else if(type==='cloud'){ctx.save();ctx.translate(xx,yy);ctx.rotate(a);cloud(ctx,0,0,sz);ctx.fill();ctx.restore()}
      else if(type==='moonstar'){ctx.save();ctx.translate(xx,yy);ctx.rotate(a);ctx.beginPath();ctx.arc(0,0,sz*.7,0,TAU);ctx.fill();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(sz*.3,-sz*.08,sz*.62,0,TAU);ctx.fill();ctx.globalCompositeOperation='source-over';ctx.restore()}
      else if(type==='smile'){ctx.save();ctx.translate(xx,yy);ctx.rotate(a);smile(ctx,0,0,sz);ctx.fillStyle=s.colors[0];ctx.beginPath();ctx.arc(-sz*.12,-sz*.07,sz*.035,0,TAU);ctx.arc(sz*.12,-sz*.07,sz*.035,0,TAU);ctx.fill();ctx.strokeStyle=s.colors[0];ctx.lineWidth=Math.max(1,p.stroke*.65);ctx.beginPath();ctx.arc(0,sz*.02,sz*.16,.1*Math.PI,.9*Math.PI);ctx.stroke();ctx.restore()}
      else if(type==='cherry'){ctx.save();ctx.translate(xx,yy);ctx.rotate(a);ctx.strokeStyle=s.colors[2];ctx.fillStyle=s.colors[1];cherry(ctx,0,0,sz);ctx.restore()}
      else if(type==='strawberry'){ctx.save();ctx.translate(xx,yy);ctx.rotate(a);ctx.fillStyle=s.colors[1];strawberry(ctx,0,0,sz);ctx.fillStyle=s.colors[2];for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(jitter(rng,sz*.18),jitter(rng,sz*.22),Math.max(1,sz*.03),Math.max(1,sz*.06),0,0,TAU);ctx.fill()}ctx.fillStyle=s.colors[3];star(ctx,0,-sz*.35,sz*.18,sz*.08,5,Math.PI/2);ctx.fill();ctx.restore()}
    };
    ctx.save();ctx.globalAlpha=p.op;ctx.translate(w/2,h/2);ctx.rotate(p.rot);ctx.translate(-w/2,-h/2);
    if(uniform){
      let sz=p.size*.38;
      for(let row=-3,y=-step*3;y<h+step*3;row++,y+=step){
        let rc=uniformRowConfig(s,row,step,scale);
        for(let x=-step*3;x<w+step*3;x+=step){
          drawOne(x+step/2+rc.x,y+step/2+rc.y,sz,uniformColor,rc.angle)
        }
      }
      ctx.restore();return
    }
    let aligned=s.randomPosition===false,fixedSize=s.randomSize===false||aligned,fixedAngle=s.randomAngle===false||aligned,posJit=aligned?0:p.jit;
    cellLoop(w,h,step,(x,y)=>{let baseX=aligned?x+step/2:x,baseY=aligned?y+step/2:y,xx=baseX+jitter(rng,posJit),yy=baseY+jitter(rng,posJit),sz=fixedSize?p.size*.38:p.size*rrand(rng,.28,.48),col=pick(rng,s.colors.slice(1)),a=fixedAngle?0:jitter(rng,.35*p.detail);drawOne(xx,yy,sz,col,a)});
    ctx.restore()
  }
  function raindrops(ctx,w,h,s,scale){
    let p=common(s,scale),step=p.size+p.gap,rng=mulberry32(p.seed),uniform=uniformShapePreset(s),sz=p.size*.32,shapeColor=s.colors[1]||'#F59BBC';
    ctx.save();ctx.globalAlpha=p.op;ctx.translate(w/2,h/2);ctx.rotate(p.rot);ctx.translate(-w/2,-h/2);
    const drawDrop=(xx,yy,a)=>{
      ctx.save();ctx.translate(xx,yy);ctx.rotate(a);ctx.fillStyle=shapeColor;ctx.beginPath();ctx.moveTo(0,-sz);ctx.bezierCurveTo(sz*.65,-sz*.15,sz*.55,sz*.65,0,sz*.72);ctx.bezierCurveTo(-sz*.55,sz*.65,-sz*.65,-sz*.15,0,-sz);ctx.fill();ctx.restore()
    };
    if(uniform){
      for(let row=-3,y=-step*3;y<h+step*3;row++,y+=step){
        let rc=uniformRowConfig(s,row,step,scale);
        for(let x=-step*3;x<w+step*3;x+=step)drawDrop(x+step/2+rc.x,y+step/2+rc.y,rc.angle)
      }
      ctx.restore();return
    }
    let aligned=s.randomPosition===false,posJit=aligned?0:p.jit;
    cellLoop(w,h,step,(x,y)=>{let baseX=aligned?x+step/2:x,baseY=aligned?y+step/2:y;drawDrop(baseX+jitter(rng,posJit),baseY+jitter(rng,posJit),s.randomAngle===false?0:jitter(rng,.35*p.detail))});
    ctx.restore()
  }
  function confetti(ctx,w,h,s,scale){let p=common(s,scale),rng=mulberry32(p.seed),count=Math.floor((w*h)/Math.max(800,p.size*p.size*1.45));ctx.save();ctx.globalAlpha=p.op;ctx.lineCap='round';for(let i=0;i<count;i++){let x=rng()*w,y=rng()*h,sz=p.size*rrand(rng,.10,.28),a=rng()*TAU;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=pick(rng,s.colors.slice(1));ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=Math.max(1,p.stroke);let t=Math.floor(rng()*4);if(t===0)ctx.fillRect(-sz*.5,-sz*.14,sz,sz*.28);else if(t===1){ctx.beginPath();ctx.arc(0,0,sz*.24,0,TAU);ctx.fill()}else if(t===2){star(ctx,0,0,sz*.34,sz*.16,4);ctx.fill()}else{ctx.beginPath();ctx.moveTo(-sz*.5,0);ctx.quadraticCurveTo(0,-sz*.5,sz*.5,0);ctx.stroke()}ctx.restore()}ctx.restore()}
  function doodles(ctx,w,h,s,scale){let p=common(s,scale),rng=mulberry32(p.seed),step=p.size+p.gap,aligned=(s.randomPosition===false)||(s.randomSize===false&&s.randomAngle===false),posJit=aligned?0:p.jit;ctx.save();ctx.globalAlpha=p.op;cellLoop(w,h,step,(x,y)=>{let baseX=aligned?x+step/2:x,baseY=aligned?y+step/2:y,xx=baseX+jitter(rng,posJit),yy=baseY+jitter(rng,posJit),sz=(s.randomSize===false||aligned)?p.size*.32:p.size*.32,t=aligned?0:Math.floor(rng()*7),rot=(s.randomAngle===false||aligned)?0:rng()*TAU;ctx.strokeStyle=pick(rng,s.colors.slice(1));ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=p.stroke;ctx.lineCap='round';ctx.save();ctx.translate(xx,yy);ctx.rotate(rot);if(t===0){heart(ctx,0,0,sz);ctx.stroke()}else if(t===1){star(ctx,0,0,sz,sz*.42);ctx.stroke()}else if(t===2){sparkle(ctx,0,0,sz);ctx.stroke()}else if(t===3){ctx.beginPath();ctx.arc(0,0,sz*.6,0,TAU);ctx.stroke()}else if(t===4){ctx.beginPath();ctx.moveTo(-sz,0);ctx.bezierCurveTo(-sz*.4,-sz,sz*.4,sz,sz,0);ctx.stroke()}else if(t===5){ctx.beginPath();for(let i=0;i<4;i++)ctx.arc(i*sz*.24-sz*.36,0,sz*.15,0,TAU);ctx.stroke()}else{ctx.beginPath();ctx.moveTo(-sz*.7,-sz*.7);ctx.lineTo(sz*.7,sz*.7);ctx.moveTo(sz*.7,-sz*.7);ctx.lineTo(-sz*.7,sz*.7);ctx.stroke()}ctx.restore()});ctx.restore()}
  function blobs(ctx,w,h,s,scale,opt={}){let p=common(s,scale),rng=mulberry32(p.seed),count=Math.floor((w*h)/Math.max(1000,p.size*p.size*2.2));ctx.save();ctx.globalAlpha=p.op;for(let i=0;i<count;i++){let x=rng()*w,y=rng()*h,rad=p.size*rrand(rng,.28,.72),n=7;ctx.fillStyle=pick(rng,s.colors.slice(1));ctx.beginPath();for(let j=0;j<=n;j++){let a=j/n*TAU,r=rad*rrand(rng,.7,1.18),px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;j?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.fill();if(opt.dot&&rng()<.7){ctx.fillStyle=s.colors[3];ctx.beginPath();ctx.arc(x,y,rad*.17,0,TAU);ctx.fill()}}ctx.restore()}
  function groovyFlower(ctx,w,h,s,scale){let p=common(s,scale),rng=mulberry32(p.seed),step=p.size+p.gap;ctx.save();ctx.globalAlpha=p.op;cellLoop(w,h,step,(x,y)=>{let xx=x+jitter(rng,p.jit),yy=y+jitter(rng,p.jit),sz=p.size*.42,pet=rrand(rng,5,8)|0;ctx.fillStyle=pick(rng,s.colors.slice(1,3));flower(ctx,xx,yy,sz,pet,rng()*TAU);ctx.fillStyle=s.colors[3];ctx.beginPath();ctx.arc(xx,yy,sz*.23,0,TAU);ctx.fill()});ctx.restore()}
  function waveLines(ctx,w,h,s,scale){let p=common(s,scale),rng=mulberry32(p.seed),step=p.size+p.gap;ctx.save();ctx.globalAlpha=p.op;ctx.lineWidth=p.stroke;ctx.lineCap='round';for(let y=-step;y<h+step;y+=step){ctx.strokeStyle=pick(rng,s.colors.slice(1));ctx.beginPath();ctx.moveTo(-step,y);for(let x=-step;x<w+step;x+=step*.7){let amp=p.size*(.18+.2*p.detail);ctx.quadraticCurveTo(x+step*.35,y+amp,x+step*.7,y)}ctx.stroke()}ctx.restore()}
  function texturedChecker(ctx,w,h,s,scale,opt={}){let p=common(s,scale),cell=Math.max(10,p.size),step=Math.max(cell*.5,cell+p.gap),rng=mulberry32(p.seed),outlineColor=s.colors[4]||s.colors[3]||s.colors[2]||s.colors[1],extraRot=((opt.rotate45?45:0)+(opt.rotateDeg||0))*Math.PI/180;ctx.save();ctx.globalAlpha=p.op;ctx.translate(w/2,h/2);ctx.rotate(p.rot+extraRot);ctx.translate(-w/2,-h/2);for(let row=-3,y=-step*3; y<h+step*3; row++,y+=step){for(let col=-3,x=-step*3; x<w+step*3; col++,x+=step){let colr=opt.tricolor?[s.colors[1],s.colors[2],s.colors[3]][Math.abs((row+col)%3)]:((row+col)%2===0?s.colors[1]:s.colors[2]),xx=x+jitter(rng,p.jit*.15),yy=y+jitter(rng,p.jit*.15),sz=cell;ctx.globalAlpha=p.op*.92;ctx.fillStyle=colr;ctx.fillRect(xx,yy,sz,sz);for(let i=0;i<8+Math.floor(p.detail*16);i++){ctx.globalAlpha=p.op*(0.025+0.018*p.detail);ctx.fillStyle=i%2?s.colors[3]:s.colors[0];ctx.fillRect(xx+jitter(rng,sz*.08),yy+jitter(rng,sz*.08),sz*(.88+rr(rng,-.1,.1)),Math.max(1,sz*(.02+.012*rng())))}if(opt.grid&&p.stroke>0){ctx.globalAlpha=p.op*.72;ctx.strokeStyle=outlineColor;ctx.lineWidth=Math.max(.5,p.stroke*.38);ctx.strokeRect(xx,yy,sz,sz)}}}ctx.restore()}
  function plaid(ctx,w,h,s,scale,opt={}){let p=common(s,scale),step=Math.max(12,p.size+p.gap),band=Math.max(6,p.size*(opt.bandScale||.42)),rng=mulberry32(p.seed),outlineColor=s.colors[4]||s.colors[3]||s.colors[2]||s.colors[1],extraRot=((opt.rotate45?45:0)+(opt.rotateDeg||0))*Math.PI/180;ctx.save();ctx.globalAlpha=p.op;ctx.translate(w/2,h/2);ctx.rotate(p.rot+extraRot);ctx.translate(-w/2,-h/2);for(let x=-step*3;x<w+step*3;x+=step){let wob=opt.wobble?jitter(rng,p.jit*.22):0;ctx.globalAlpha=p.op*.35;ctx.fillStyle=s.colors[1];ctx.fillRect(x+wob,-step*3,band,h+step*6);ctx.globalAlpha=p.op*.18;ctx.fillStyle=s.colors[2];ctx.fillRect(x+wob+band*.52,-step*3,Math.max(2,band*.38),h+step*6);if(opt.fine&&p.stroke>0){ctx.globalAlpha=p.op*.78;ctx.fillStyle=outlineColor;ctx.fillRect(x+wob-band*.22,-step*3,Math.max(.5,p.stroke*.45),h+step*6)}}for(let y=-step*3;y<h+step*3;y+=step){let wob=opt.wobble?jitter(rng,p.jit*.22):0;ctx.globalAlpha=p.op*.35;ctx.fillStyle=s.colors[1];ctx.fillRect(-step*3,y+wob,w+step*6,band);ctx.globalAlpha=p.op*.18;ctx.fillStyle=s.colors[2];ctx.fillRect(-step*3,y+wob+band*.52,w+step*6,Math.max(2,band*.38));if(opt.fine&&p.stroke>0){ctx.globalAlpha=p.op*.78;ctx.fillStyle=outlineColor;ctx.fillRect(-step*3,y+wob-band*.22,w+step*6,Math.max(.5,p.stroke*.45))}}if(opt.fabric&&p.stroke>0){ctx.globalAlpha=p.op*.22;ctx.strokeStyle=outlineColor;ctx.lineWidth=Math.max(.5,p.stroke*.32);for(let y=-step*2;y<h+step*2;y+=Math.max(10,band*.62)){ctx.beginPath();for(let x=-step*2;x<=w+step*2;x+=step*.35){let off=opt.wobble?jitter(rng,p.jit*.12):0;x===-step*2?ctx.moveTo(x,y+off):ctx.lineTo(x,y+off)}ctx.stroke()}for(let x=-step*2;x<w+step*2;x+=Math.max(10,band*.62)){ctx.beginPath();for(let y=-step*2;y<=h+step*2;y+=step*.35){let off=opt.wobble?jitter(rng,p.jit*.12):0;y===-step*2?ctx.moveTo(x+off,y):ctx.lineTo(x+off,y)}ctx.stroke()}}ctx.restore()}
  function layeredFabricPlaid(ctx,w,h,s,scale,opt={}){let p=common(s,scale),unit=Math.max(34,p.size),period=Math.max(unit*2.45,unit*2.45+p.gap*.55),bgA=s.colors[0]||'#FFF7FA',bgB=s.plaidBg2||'#FFEAF2',wide=s.colors[1]||'#F7B4CF',mid=s.colors[2]||'#F49ABD',dark=s.colors[3]||'#E978A5',hatch=s.colors[4]||dark,hatchOn=s.plaidHatch!==false,hatchStrength=Math.max(0,Math.min(1,(s.plaidHatchStrength??40)/100));ctx.save();ctx.globalAlpha=1;ctx.fillStyle=bgA;ctx.fillRect(0,0,w,h);ctx.globalAlpha=.42;ctx.fillStyle=bgB;for(let y=-period;y<h+period;y+=period*2)ctx.fillRect(0,y,w,period*.86);for(let x=period*.62;x<w+period;x+=period*2)ctx.fillRect(x,0,period*.48,h);let hatchRects=[];const bands=[[0,unit*.78,wide,.30],[unit*.96,unit*.30,mid,.24],[unit*1.48,Math.max(1.2,p.stroke*.52),dark,.62],[unit*1.70,unit*.13,mid,.18],[unit*2.08,Math.max(.8,p.stroke*.30),dark,.38]];const drawBands=(vertical)=>{for(let k=-2;k<Math.ceil((vertical?w:h)/period)+3;k++){let pos=k*period;for(const [off,bw,c,alpha] of bands){ctx.globalAlpha=p.op*alpha;ctx.fillStyle=c;if(vertical)ctx.fillRect(pos+off,-period,bw,h+period*2);else ctx.fillRect(-period,pos+off,w+period*2,bw);if(alpha>=.24){if(vertical)hatchRects.push([pos+off,-period,bw,h+period*2]);else hatchRects.push([-period,pos+off,w+period*2,bw])}}}};drawBands(true);drawBands(false);if(hatchOn&&hatchStrength>0){ctx.save();ctx.globalAlpha=p.op*(.08+.42*hatchStrength);ctx.strokeStyle=hatch;ctx.lineWidth=Math.max(.5,unit*.0105);let step=Math.max(4,unit*.068);for(const [x,y,ww,hh] of hatchRects){ctx.save();ctx.beginPath();ctx.rect(x,y,ww,hh);ctx.clip();for(let d=-hh;d<ww+hh;d+=step){ctx.beginPath();ctx.moveTo(x+d,y+hh);ctx.lineTo(x+d+hh,y);ctx.stroke()}ctx.restore()}ctx.restore()}ctx.restore()}
  function tornChecker(ctx,w,h,s,scale,opt={}){checker(ctx,w,h,s,scale,{contiguous:true,soft:true,round:false});let p=common(s,scale),rng=mulberry32(p.seed+991),paper=s.colors[0]||'#FFFFFF';ctx.save();ctx.fillStyle=paper;ctx.shadowColor='rgba(0,0,0,0.10)';ctx.shadowBlur=18*scale;ctx.shadowOffsetY=2*scale;let startY=h*(.02+rr(rng,.00,.08));ctx.beginPath();ctx.moveTo(0,startY);let pts=[[w*.06,h*.08],[w*.11,h*.16],[w*.18,h*.24],[w*.28,h*.31],[w*.39,h*.44],[w*.54,h*.57],[w*.70,h*.72],[w*.85,h*.83],[w*.96,h*.99]];pts.forEach((pt,i)=>{let px=pt[0]+jitter(rng,w*.015),py=pt[1]+jitter(rng,h*.018);ctx.quadraticCurveTo(px-w*.03,py-h*.03,px,py)});ctx.lineTo(0,h);ctx.closePath();ctx.fill();ctx.shadowColor='transparent';ctx.strokeStyle='rgba(255,255,255,0.72)';ctx.lineWidth=Math.max(1.2,2.2*scale);ctx.beginPath();ctx.moveTo(0,startY);pts.forEach((pt,i)=>{let px=pt[0],py=pt[1];ctx.quadraticCurveTo(px-w*.03,py-h*.03,px,py)});ctx.stroke();ctx.restore()}
  function sunburstBackground(ctx,w,h,s,scale,opt={}){let p=common(s,scale),cx=w*.5,cy=h*.53,R=Math.hypot(w,h)*.78,rayCount=Math.max(12,Math.round(12+p.detail*18)),base=s.colors[1]||'#FFD95A',deep=s.colors[2]||'#FFB83D',spark=s.colors[3]||'#FFFFFF';ctx.save();ctx.globalAlpha=p.op;ctx.translate(cx,cy);ctx.rotate(p.rot);ctx.translate(-cx,-cy);let bg=ctx.createRadialGradient(cx,cy,Math.min(w,h)*.04,cx,cy,R*.92);bg.addColorStop(0,mixColor(base,'#FFFFFF',.82));bg.addColorStop(.44,mixColor(base,'#FFFFFF',.35));bg.addColorStop(1,deep);ctx.fillStyle=bg;ctx.fillRect(-R,-R,w+R*2,h+R*2);for(let i=0;i<rayCount;i++){let a1=-Math.PI/2+i*TAU/rayCount,a2=-Math.PI/2+(i+1)*TAU/rayCount;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a1)*R,cy+Math.sin(a1)*R);ctx.arc(cx,cy,R,a1,a2);ctx.closePath();ctx.globalAlpha=p.op*(i%2===0?.22:.08);ctx.fillStyle=i%2===0?mixColor(base,'#FFFFFF',.44):mixColor(deep,'#FFFFFF',.18);ctx.fill()}ctx.globalAlpha=p.op;let glow=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.min(w,h)*.42);glow.addColorStop(0,'rgba(255,255,255,.72)');glow.addColorStop(.55,'rgba(255,255,255,.24)');glow.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);ctx.fillStyle=spark;let unit=Math.min(w,h);[[.30,.19,.032],[.83,.49,.036],[.12,.61,.03]].forEach(([px,py,ss])=>{sparkle(ctx,w*px,h*py,unit*ss);ctx.fill()});ctx.restore()}
  function softSunburstBackground(ctx,w,h,s,scale,opt={}){let p=common(s,scale),cx=w*.48,cy=h*.54,R=Math.hypot(w,h)*.82,rayCount=Math.max(10,Math.round(10+p.detail*12)),color1=s.colors[1]||'#FFE88D',color2=s.colors[2]||'#FFFFFF';ctx.save();ctx.globalAlpha=p.op;ctx.translate(cx,cy);ctx.rotate(p.rot);ctx.translate(-cx,-cy);ctx.fillStyle=color1;ctx.fillRect(-R,-R,w+R*2,h+R*2);for(let i=0;i<rayCount;i++){let a1=-Math.PI/2+i*TAU/rayCount,a2=-Math.PI/2+(i+1)*TAU/rayCount;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a1)*R,cy+Math.sin(a1)*R);ctx.arc(cx,cy,R,a1,a2);ctx.closePath();ctx.globalAlpha=p.op;ctx.fillStyle=i%2===0?color1:color2;ctx.fill()}let glow=ctx.createRadialGradient(cx,cy,0,cx,cy,R*.55);glow.addColorStop(0,'rgba(255,255,255,.28)');glow.addColorStop(.5,'rgba(255,255,255,.10)');glow.addColorStop(1,'rgba(255,255,255,0)');ctx.globalAlpha=p.op;ctx.fillStyle=glow;ctx.fillRect(-R,-R,w+R*2,h+R*2);ctx.restore()}
  function glossySunshineBackground(ctx,w,h,s,scale,opt={}){let p=common(s,scale),cx=w*.5,cy=h*.5,unit=Math.min(w,h),base=s.colors[1]||'#FFE05E',deep=s.colors[2]||'#FFB733',spark=s.colors[3]||'#FFFFFF',accent=s.colors[4]||'#FF8C13';ctx.save();ctx.globalAlpha=p.op;let bg=ctx.createRadialGradient(cx,cy,unit*.04,cx,cy,Math.hypot(w,h)*.66);bg.addColorStop(0,mixColor(base,'#FFFFFF',.9));bg.addColorStop(.48,mixColor(base,'#FFFFFF',.36));bg.addColorStop(1,deep);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);let glow=ctx.createRadialGradient(cx,cy,0,cx,cy,unit*.38);glow.addColorStop(0,'rgba(255,255,255,.58)');glow.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);ctx.translate(cx,cy);ctx.rotate(p.rot);ctx.translate(-cx,-cy);ctx.strokeStyle=mixColor(base,'#FFFFFF',.58);ctx.lineCap='round';ctx.lineWidth=Math.max(7,unit*.026);ctx.globalAlpha=p.op*.56;let arcs=[[w*.05,h*.19,w*.31,h*.04,w*.34,h*.10],[w*.68,h*.10,w*.93,h*.18,w*.92,h*.34],[w*.08,h*.62,w*.16,h*.91,w*.34,h*.94],[w*.73,h*.89,w*.90,h*.76,w*.92,h*.66]];arcs.forEach(([x1,y1,x2,y2,cx2,cy2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(cx2,cy2,x2,y2);ctx.stroke()});ctx.globalAlpha=p.op;ctx.fillStyle=spark;[[.29,.20,.034],[.83,.44,.04],[.24,.73,.036]].forEach(([px,py,ss])=>{sparkle(ctx,w*px,h*py,unit*ss);ctx.fill()});ctx.fillStyle=accent;[[.21,.25,.019],[.86,.51,.022],[.20,.68,.019]].forEach(([px,py,rr])=>{let x=w*px,y=h*py,r=unit*rr;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.arc(x-r*.2,y-r*.22,r*.44,0,TAU);ctx.fill();ctx.fillStyle=accent});ctx.restore()}
  function sparkleGlowBackground(ctx,w,h,s,scale,opt={}){let p=common(s,scale),cx=w*.5,cy=h*.5,unit=Math.min(w,h),base=s.colors[1]||'#FFE994',deep=s.colors[2]||'#FFC85B',spark=s.colors[3]||'#FFFFFF';ctx.save();ctx.globalAlpha=p.op;let bg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.hypot(w,h)*.72);bg.addColorStop(0,mixColor(base,'#FFFFFF',.92));bg.addColorStop(.52,mixColor(base,'#FFFFFF',.40));bg.addColorStop(1,deep);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle=spark;let pts=[[.16,.18,.028],[.31,.12,.018],[.82,.24,.028],[.89,.55,.02],[.72,.83,.028],[.20,.78,.025],[.10,.50,.018]];pts.forEach(([px,py,ss],i)=>{ctx.globalAlpha=p.op*(i%2?.55:.92);sparkle(ctx,w*px,h*py,unit*ss);ctx.fill()});ctx.restore()}

  function dashedGridPattern(ctx,w,h,s,scale,opt={}){
    let lineColor=s.dashedLineColor||s.colors[4]||'#FFFFFF';
    let lineOpacity=Math.max(0,Math.min(100,s.dashedLineOpacity??28))/100;
    let overallScale=Math.max(.2,Math.min(2.5,(s.size??180)/180));
    let lineWidth=Math.max(.5,(s.dashedLineWidth??2)*overallScale*scale);
    let dashLength=Math.max(.5,(s.dashLength??9)*overallScale*scale);
    let dashGap=Math.max(.5,(s.dashGap??12)*overallScale*scale);
    let gridX=Math.max(8,(s.gridX??180)*overallScale*scale);
    let gridY=Math.max(8,(s.gridY??180)*overallScale*scale);
    let extraRotation=opt.diamond?45:0,rot=((s.rotation||0)+extraRotation)*Math.PI/180;
    let ox=0,oy=0,extra=Math.hypot(w,h);
    let heartSize=Math.max(3,(s.dashedHeartSize??14)*overallScale*scale);
    let heartPadding=Math.max(lineWidth*2.2,(s.dashedHeartGap??4)*overallScale*scale);
    let heartClearance=heartSize*.72+heartPadding;
    let every=Math.max(1,Math.round(s.dashedHeartEvery??1));
    ctx.save();
    ctx.translate(w/2,h/2);
    ctx.rotate(rot);
    ctx.translate(-w/2,-h/2);
    let startX=-extra+((((ox%gridX)+gridX)%gridX));
    let startY=-extra+((((oy%gridY)+gridY)%gridY));
    let xLines=[],yLines=[];
    for(let x=startX,xi=0;x<w+extra;x+=gridX,xi++)xLines.push({x,xi});
    for(let y=startY,yi=0;y<h+extra;y+=gridY,yi++)yLines.push({y,yi});
    const hasHeart=(xi,yi)=>opt.hearts&&((xi+yi)%every===0);
    ctx.globalAlpha=(s.opacity??100)/100*lineOpacity;
    ctx.strokeStyle=lineColor;
    ctx.lineWidth=lineWidth;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.setLineDash([dashLength,dashGap]);
    const strokeVertical=(x,xi)=>{
      if(!opt.hearts){ctx.beginPath();ctx.moveTo(x,-extra);ctx.lineTo(x,h+extra);ctx.stroke();return}
      let cursor=-extra;
      for(const {y,yi} of yLines){
        if(!hasHeart(xi,yi))continue;
        let a=y-heartClearance,b=y+heartClearance;
        if(a>cursor){ctx.beginPath();ctx.moveTo(x,cursor);ctx.lineTo(x,a);ctx.stroke()}
        cursor=Math.max(cursor,b)
      }
      if(cursor<h+extra){ctx.beginPath();ctx.moveTo(x,cursor);ctx.lineTo(x,h+extra);ctx.stroke()}
    };
    const strokeHorizontal=(y,yi)=>{
      if(!opt.hearts){ctx.beginPath();ctx.moveTo(-extra,y);ctx.lineTo(w+extra,y);ctx.stroke();return}
      let cursor=-extra;
      for(const {x,xi} of xLines){
        if(!hasHeart(xi,yi))continue;
        let a=x-heartClearance,b=x+heartClearance;
        if(a>cursor){ctx.beginPath();ctx.moveTo(cursor,y);ctx.lineTo(a,y);ctx.stroke()}
        cursor=Math.max(cursor,b)
      }
      if(cursor<w+extra){ctx.beginPath();ctx.moveTo(cursor,y);ctx.lineTo(w+extra,y);ctx.stroke()}
    };
    xLines.forEach(({x,xi})=>strokeVertical(x,xi));
    yLines.forEach(({y,yi})=>strokeHorizontal(y,yi));
    if(opt.hearts){
      let heartColor=s.dashedHeartColor||lineColor;
      let heartOpacity=Math.max(0,Math.min(100,s.dashedHeartOpacity??88))/100;
      ctx.setLineDash([]);
      ctx.fillStyle=heartColor;
      ctx.globalAlpha=(s.opacity??100)/100*heartOpacity;
      for(const {x,xi} of xLines){
        for(const {y,yi} of yLines){
          if(!hasHeart(xi,yi))continue;
          heart(ctx,x,y,heartSize,-rot);ctx.fill()
        }
      }
    }
    ctx.restore()
  }

  function graphicRoundedBar(ctx,cx,cy,len,thick,angle,color,alpha=1,outline=false){
    ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.globalAlpha*=alpha;ctx.lineWidth=Math.max(1,thick*.12);ctx.fillStyle=color;ctx.strokeStyle=color;
    roundRect(ctx,-len/2,-thick/2,len,thick,thick/2);outline?ctx.stroke():ctx.fill();ctx.restore()
  }
  function graphicRing(ctx,cx,cy,r,color,width,alpha=1,dashed=false){
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
    if(dashed)ctx.setLineDash([Math.max(2,width*1.1),Math.max(4,width*2.1)]);
    ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.stroke();ctx.restore()
  }
  function graphicDotGrid(ctx,cx,cy,cols,rows,gap,r,color,alpha=1){
    ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;let ox=(cols-1)*gap/2,oy=(rows-1)*gap/2;
    for(let yy=0;yy<rows;yy++)for(let xx=0;xx<cols;xx++){ctx.beginPath();ctx.arc(cx-ox+xx*gap,cy-oy+yy*gap,r,0,TAU);ctx.fill()}ctx.restore()
  }
  function graphicStripedCircle(ctx,cx,cy,r,color,lineWidth,gap,alpha=1,angle=-Math.PI/4){
    ctx.save();ctx.globalAlpha*=alpha;ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.clip();ctx.translate(cx,cy);ctx.rotate(angle);ctx.translate(-cx,-cy);
    ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.lineCap='round';for(let x=cx-r*2;x<=cx+r*2;x+=gap){ctx.beginPath();ctx.moveTo(x,cy-r*2);ctx.lineTo(x,cy+r*2);ctx.stroke()}ctx.restore()
  }
  function graphicCheckPatch(ctx,cx,cy,cell,count,color,alpha=1){
    ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;let start=-(count*cell)/2;
    for(let y=0;y<count;y++)for(let x=0;x<count;x++)if((x+y)%2===0)ctx.fillRect(cx+start+x*cell,cy+start+y*cell,cell,cell);ctx.restore()
  }
  function graphicDiamond(ctx,cx,cy,r,color,alpha=1,outline=false,width=2){
    ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r,cy);ctx.lineTo(cx,cy+r);ctx.lineTo(cx-r,cy);ctx.closePath();outline?ctx.stroke():ctx.fill();ctx.restore()
  }
  function graphicDottedLine(ctx,x1,y1,x2,y2,color,width,alpha=1,gap=14){
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.setLineDash([Math.max(1,width*.3),Math.max(5,gap)]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()
  }
  function graphicParallelBars(ctx,cx,cy,len,thick,count,gap,angle,color,alpha=1){
    ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.globalAlpha*=alpha;ctx.fillStyle=color;
    let total=(count-1)*gap;for(let i=0;i<count;i++){let yy=-total/2+i*gap;roundRect(ctx,-len/2,yy-thick/2,len,thick,thick/2);ctx.fill()}ctx.restore()
  }
  function graphicCapsule(ctx,cx,cy,len,thick,angle,color,alpha=1,variant='fill'){
    if(variant==='outline')return graphicRoundedBar(ctx,cx,cy,len,thick,angle,color,alpha,true);
    if(variant==='stripe'){
      ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.globalAlpha*=alpha;ctx.beginPath();roundRect(ctx,-len/2,-thick/2,len,thick,thick/2);ctx.clip();
      ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,thick*.12);for(let x=-len;x<len;x+=thick*.38){ctx.beginPath();ctx.moveTo(x,-thick);ctx.lineTo(x+thick*1.6,thick);ctx.stroke()}ctx.restore();return
    }
    graphicRoundedBar(ctx,cx,cy,len,thick,angle,color,alpha,false)
  }
  function graphicComposition(ctx,w,h,s,scale,opt={}){
    let q=common(s,scale),rng=mulberry32(q.seed),cols=s.colors||['#FFF','#8EDFD7','#BDEFE8','#FFFFFF','#59CFC2'];
    let mode=s.graphicMotifMode||'mixed',safe=Math.max(.38,Math.min(.82,(s.graphicSafeArea??60)/100));
    let barScale=Math.max(.45,Math.min(2.2,(s.graphicBarScale??100)/100)),circleScale=Math.max(.45,Math.min(2.2,(s.graphicCircleScale??100)/100));
    let smallScale=Math.max(.4,Math.min(2,(s.graphicSmallScale??100)/100)),largeScale=Math.max(.5,Math.min(2.4,(s.graphicLargeScale??100)/100));
    let balance=Math.max(0,Math.min(1,(s.graphicBalance??82)/100)),density=Math.max(.12,Math.min(1,q.detail||.45)),base=Math.min(w,h);
    let shapeScale=Math.max(.42,Math.min(2.2,(s.size??90)/90)),layout=opt.layout||'frame',rot=q.rot;
    let safeRect={x:(w-w*safe)/2,y:(h-h*safe)/2,w:w*safe,h:h*safe},margin=base*.035;
    const color=(i=1)=>cols[Math.max(1,Math.min(4,i))]||cols[1]||'#7EDFD4';
    const rand=(a,b)=>a+(b-a)*rng(),choose=arr=>arr[Math.floor(rng()*arr.length)];
    const jitter=(amp)=>rand(-amp,amp)*(1-balance);
    const family=()=>{
      if(mode==='circles')return ['circle','ring','dashedring','stripecircle','dotgrid','bubble'];
      if(mode==='bars')return ['bar','capsule','outlinepill','stripepill','parallel','line'];
      if(mode==='dotted')return ['dottedline','dashedring','dotgrid','ring','diamond','sparkle'];
      if(mode==='cute')return ['circle','ring','bar','heart','flower','sparkle','bubble','diamond'];
      if(mode==='geometric')return ['bar','capsule','outlinepill','parallel','line','circle','ring','dotgrid','stripecircle','check','diamond','dottedline'];
      if(mode==='sparkle')return ['circle','ring','dashedring','dotgrid','sparkle','diamond','dottedline'];
      if(mode==='minimal')return ['bar','capsule','line','circle','ring','dottedline'];
      return ['bar','capsule','outlinepill','stripepill','parallel','line','circle','ring','dashedring','dotgrid','stripecircle','check','sparkle','diamond','dottedline','bubble'];
    };
    const types=family();
    const perimeterPoint=(i,total)=>{
      let side=i%4,slot=Math.floor(i/4),perSide=Math.max(1,Math.ceil(total/4)),t=(slot+1)/(perSide+1),x=0,y=0;
      let edge=base*(.055+.035*density),jx=w*.035*(1-balance),jy=h*.035*(1-balance);
      if(layout==='diagonal'){
        let a=i%2===0;
        t=(Math.floor(i/2)+1)/(Math.ceil(total/2)+1);
        x=a?w*(.02+.42*t):w*(.58+.40*t);y=a?h*(.02+.42*t):h*(.58+.40*t);
      }else if(layout==='corner'){
        let corner=i%4,u=(Math.floor(i/4)+1)/(Math.ceil(total/4)+1),span=.20;
        if(corner===0){x=w*(.02+span*u);y=h*(.02+span*(1-u))}
        if(corner===1){x=w*(.98-span*u);y=h*(.02+span*u)}
        if(corner===2){x=w*(.98-span*u);y=h*(.98-span*(1-u))}
        if(corner===3){x=w*(.02+span*u);y=h*(.98-span*u)}
      }else{
        if(side===0){x=w*t;y=margin-edge*.30}
        if(side===1){x=w-margin+edge*.30;y=h*t}
        if(side===2){x=w*(1-t);y=h-margin+edge*.30}
        if(side===3){x=margin-edge*.30;y=h*(1-t)}
      }
      x+=jitter(jx);y+=jitter(jy);return [x,y]
    };
    const drawShape=(type,x,y,sz,c,a,angle)=>{
      if(type==='bar')graphicRoundedBar(ctx,x,y,sz*rand(3.2,6.8)*barScale,sz*rand(.62,1.18)*barScale,angle,c,a);
      else if(type==='capsule')graphicCapsule(ctx,x,y,sz*rand(4.8,8.4)*barScale,sz*rand(.8,1.28)*barScale,angle,c,a,'fill');
      else if(type==='outlinepill')graphicCapsule(ctx,x,y,sz*rand(4.2,7.2)*barScale,sz*rand(.78,1.15)*barScale,angle,c,a,'outline');
      else if(type==='stripepill')graphicCapsule(ctx,x,y,sz*rand(4.2,7.2)*barScale,sz*rand(.9,1.3)*barScale,angle,c,a,'stripe');
      else if(type==='parallel')graphicParallelBars(ctx,x,y,sz*rand(3.2,5.8)*barScale,Math.max(2,sz*.22),choose([2,3,4]),Math.max(5,sz*.34),angle,c,a);
      else if(type==='line'){ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=c;ctx.lineWidth=Math.max(1.2,sz*.13);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-Math.cos(angle)*sz*2.7,y-Math.sin(angle)*sz*2.7);ctx.lineTo(x+Math.cos(angle)*sz*2.7,y+Math.sin(angle)*sz*2.7);ctx.stroke();ctx.restore()}
      else if(type==='circle'){ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,sz*circleScale,0,TAU);ctx.fill();ctx.restore()}
      else if(type==='bubble'){ctx.save();ctx.globalAlpha*=a*.45;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,sz*1.4*circleScale,0,TAU);ctx.fill();ctx.restore()}
      else if(type==='ring')graphicRing(ctx,x,y,sz*1.35*circleScale,c,Math.max(1.5,sz*.16),a,false);
      else if(type==='dashedring')graphicRing(ctx,x,y,sz*1.7*circleScale,c,Math.max(1.2,sz*.12),a,true);
      else if(type==='dotgrid')graphicDotGrid(ctx,x,y,choose([4,5,6]),choose([3,4,5]),Math.max(5,sz*.46),Math.max(1.3,sz*.095),c,a);
      else if(type==='stripecircle')graphicStripedCircle(ctx,x,y,sz*1.9*circleScale,c,Math.max(1.2,sz*.13),Math.max(5,sz*.42),a,angle);
      else if(type==='check')graphicCheckPatch(ctx,x,y,Math.max(5,sz*.40),choose([4,5]),c,a*.55);
      else if(type==='sparkle'){ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=c;sparkle(ctx,x,y,sz*1.15,0);ctx.fill();ctx.restore()}
      else if(type==='diamond')graphicDiamond(ctx,x,y,sz*.85,c,a,rng()>.55,Math.max(1.2,sz*.12));
      else if(type==='dottedline'){let len=sz*rand(4.5,8.5);graphicDottedLine(ctx,x-Math.cos(angle)*len/2,y-Math.sin(angle)*len/2,x+Math.cos(angle)*len/2,y+Math.sin(angle)*len/2,c,Math.max(2,sz*.13),a,Math.max(6,sz*.55))}
      else if(type==='heart'){ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=c;heart(ctx,x,y,sz*.82,0);ctx.fill();ctx.restore()}
      else if(type==='flower'){ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=c;flower(ctx,x,y,sz,5,0);ctx.restore()}
    };
    ctx.save();ctx.globalAlpha=q.op;ctx.translate(w/2,h/2);ctx.rotate(rot);ctx.translate(-w/2,-h/2);
    // Large translucent shapes use fixed perimeter slots to avoid clumping.
    let largeCount=layout==='center-space'?6:layout==='corner'?8:10;
    for(let i=0;i<largeCount;i++){
      let [x,y]=perimeterPoint(i,largeCount),sz=base*rand(.045,.105)*largeScale*shapeScale,c=color(choose([2,3,4])),a=rand(.08,.20);
      drawShape(choose(mode==='bars'?['capsule','parallel','bar']:mode==='circles'?['circle','ring','stripecircle']:['circle','capsule','ring','stripecircle']),x,y,sz,c,a,choose([-1,1])*Math.PI/4)
    }
    // Small/medium details are distributed evenly around the perimeter.
    let count=Math.round(16+24*density);
    for(let i=0;i<count;i++){
      let [x,y]=perimeterPoint(i,count),tier=(i%5===0?1.45:i%3===0?1.12:.82),sz=base*rand(.012,.033)*smallScale*shapeScale*tier;
      let type=types[i%types.length];if(balance<.75&&rng()>.55)type=choose(types);
      let c=color(choose([1,2,3,4])),a=rand(.45,.90),angle=(i%2?1:-1)*Math.PI/4+jitter(.18);
      drawShape(type,x,y,sz,c,a,angle)
    }
    // Intentional frame accents: each preset feels designed, not randomly piled.
    let strong=color(1),mid=color(2),white=color(3),accent=color(4);
    if(layout==='diagonal'){
      graphicParallelBars(ctx,w*.08,h*.16,base*.18*barScale*shapeScale,base*.010*shapeScale,3,base*.020*shapeScale,-Math.PI/4,mid,.66);
      graphicParallelBars(ctx,w*.92,h*.84,base*.18*barScale*shapeScale,base*.010*shapeScale,3,base*.020*shapeScale,-Math.PI/4,strong,.66);
      graphicDottedLine(ctx,w*.05,h*.28,w*.28,h*.05,accent,Math.max(2,base*.003),.65,base*.012);
      graphicDottedLine(ctx,w*.72,h*.95,w*.95,h*.72,accent,Math.max(2,base*.003),.65,base*.012)
    }else if(layout==='corner'){
      graphicRing(ctx,w*.08,h*.09,base*.082*circleScale*largeScale,accent,Math.max(2,base*.004),.72);
      graphicRing(ctx,w*.92,h*.91,base*.092*circleScale*largeScale,accent,Math.max(2,base*.004),.72);
      graphicCapsule(ctx,w*.09,h*.87,base*.20*barScale*largeScale,base*.026*barScale*largeScale,-Math.PI/4,mid,.58,'fill');
      graphicCapsule(ctx,w*.91,h*.13,base*.20*barScale*largeScale,base*.026*barScale*largeScale,-Math.PI/4,strong,.58,'fill')
    }else if(layout==='frame'){
      graphicRing(ctx,w*.07,h*.10,base*.095*circleScale*largeScale,white,Math.max(2,base*.004),.82);
      graphicRing(ctx,w*.93,h*.90,base*.105*circleScale*largeScale,accent,Math.max(2,base*.004),.70);
      graphicDotGrid(ctx,w*.08,h*.87,5,4,base*.015,base*.0028,strong,.72);
      graphicDotGrid(ctx,w*.92,h*.13,5,4,base*.015,base*.0028,white,.85)
    }else if(layout==='center-space'){
      graphicCapsule(ctx,w*.08,h*.16,base*.22*barScale*largeScale,base*.030*barScale*largeScale,-Math.PI/4,mid,.62,'fill');
      graphicCapsule(ctx,w*.92,h*.84,base*.22*barScale*largeScale,base*.030*barScale*largeScale,-Math.PI/4,strong,.62,'fill');
      graphicDottedLine(ctx,w*.03,h*.73,w*.24,h*.94,accent,Math.max(2,base*.003),.62,base*.012);
      graphicDottedLine(ctx,w*.76,h*.06,w*.97,h*.27,accent,Math.max(2,base*.003),.62,base*.012)
    }else{
      graphicRing(ctx,w*.07,h*.12,base*.08*circleScale*largeScale,accent,Math.max(2,base*.0035),.62);
      graphicCapsule(ctx,w*.92,h*.18,base*.19*barScale*largeScale,base*.026*barScale*largeScale,-Math.PI/4,mid,.60,'fill');
      graphicDottedLine(ctx,w*.02,h*.62,w*.20,h*.80,strong,Math.max(2,base*.003),.58,base*.012)
    }
    ctx.restore()
  }
  function render(ctx,w,h,s,preset,scale=1){ctx.save();ctx.setTransform(1,0,0,1,0,0);drawBackground(ctx,w,h,s);ctx.restore();ctx.save();ctx.translate((s.offsetX||0)*scale,(s.offsetY||0)*scale);let t=preset.type,o=preset.opt||{};if(t==='checker')checker(ctx,w,h,s,scale,o);else if(t==='wavy-checker')wavyChecker(ctx,w,h,s,scale);else if(t==='textured-checker')texturedChecker(ctx,w,h,s,scale,o);else if(t==='plaid')plaid(ctx,w,h,s,scale,o);else if(t==='layered-fabric-plaid')layeredFabricPlaid(ctx,w,h,s,scale,o);else if(t==='overlap-check')overlapChecker(ctx,w,h,s,scale,o);else if(t==='torn-checker')tornChecker(ctx,w,h,s,scale,o);else if(t==='dots')dots(ctx,w,h,s,scale,o);else if(t==='grid')grid(ctx,w,h,s,scale,o);else if(t==='dashed-grid')dashedGridPattern(ctx,w,h,s,scale,o);else if(t==='stripes')stripes(ctx,w,h,s,scale,o);else if(t==='zigzag')zigzag(ctx,w,h,s,scale);else if(t==='motif')motifScatter(ctx,w,h,s,scale,o.motif,o);else if(t==='raindrops')raindrops(ctx,w,h,s,scale);else if(t==='confetti')confetti(ctx,w,h,s,scale);else if(t==='doodles')doodles(ctx,w,h,s,scale);else if(t==='blobs')blobs(ctx,w,h,s,scale,o);else if(t==='groovy-flower')groovyFlower(ctx,w,h,s,scale);else if(t==='wave-lines')waveLines(ctx,w,h,s,scale);else if(t==='sunburst-bg')sunburstBackground(ctx,w,h,s,scale,o);else if(t==='soft-sunburst-bg')softSunburstBackground(ctx,w,h,s,scale,o);else if(t==='glossy-sun-bg')glossySunshineBackground(ctx,w,h,s,scale,o);else if(t==='sparkle-glow-bg')sparkleGlowBackground(ctx,w,h,s,scale,o);else if(t==='graphic-composition')graphicComposition(ctx,w,h,s,scale,o);ctx.restore()}

  const presets=[
    ['pastel-checker','파스텔 체크','체크·도트','깔끔한 기본 체커보드','checker',{}],
    ['mini-checker','미니 체크','체크·도트','잔잔한 작은 체크','checker',{}],
    ['rounded-checker','둥근 체크','체크·도트','모서리가 말랑한 체크','checker',{round:true}],
    ['gingham','파스텔 깅엄','체크·도트','천 느낌의 겹친 체크','checker',{gingham:true}],
    ['wavy-checker','웨이브 체크','체크·도트','삐뚤삐뚤 물결 체커','wavy-checker',{}],
    ['hand-checker','손그림 체크','체크·도트','조금씩 흔들리는 체크','checker',{hand:true}],
    ['retro-checker','레트로 체크','체크·도트','색이 교차하는 복고 체크','checker',{round:true}],
    ['soft-plaid','소프트 플래드','체크·도트','연한 줄과 밴드가 겹치는 부드러운 체크','plaid',{fine:true}],
    ['layered-fabric-plaid','레이어드 패브릭 플래드','체크·도트','굵은 띠·중간 띠·얇은 선과 45도 해칭이 겹치는 저대비 플래드','layered-fabric-plaid',{}],
    ['airy-plaid','에어리 플래드','체크·도트','여백이 넓고 가벼운 투명 체크','plaid',{fine:true,bandScale:.28}],
    ['powder-gingham','파우더 깅엄','체크·도트','보송한 분위기의 텍스처 깅엄','textured-checker',{grid:true}],
    ['fabric-checker','패브릭 체크','체크·도트','천 느낌처럼 포근한 손그림 플래드','plaid',{fine:true,fabric:true}],
    ['milk-checker','밀크 체크','체크·도트','아주 부드러운 잔체크','checker',{round:true}],
    ['soft-gingham','소프트 깅엄','체크·도트','연하고 부드러운 깅엄 체크','checker',{soft:true,gingham:true}],
    ['handmade-plaid','핸드메이드 플래드','체크·도트','손그림 느낌으로 살짝 흔들리는 체크','plaid',{fine:true,fabric:true,wobble:true}],
    ['textured-checker','텍스처 체크','체크·도트','분필/종이 질감의 포근한 체크','textured-checker',{grid:true}],
    ['sketch-plaid','스케치 플래드','체크·도트','가느다란 손그림 라인의 체크','plaid',{fine:true,fabric:true,wobble:true}],
    ['marshmallow-check','마시멜로 체크','체크·도트','둥글고 부드러운 캔디 느낌 체크','checker',{round:true,soft:true}],
    ['picnic-check','피크닉 체크','체크·도트','고전적인 도시락 천 느낌의 깅엄 체크','checker',{gingham:true,soft:true}],
    ['windowpane-check','윈도우페인 체크','체크·도트','여백감 있는 큰 칸의 얇은 체크','plaid',{fine:true,bandScale:.20}],
    ['layered-check','레이어드 체크','체크·도트','굵은 줄과 얇은 줄이 겹치는 체크','plaid',{fine:true,bandScale:.34,fabric:true}],
    ['micro-gingham','마이크로 깅엄','체크·도트','촘촘하고 작은 깅엄 체크','checker',{gingham:true}],
    ['tri-color-check','3톤 겹침 체크','체크·도트','한 색 밴드가 겹치며 3톤이 만들어지는 체크','overlap-check',{secondary:false}],
    ['diamond-check','다이아 체크','체크·도트','마름모처럼 보이는 사선 체크','checker',{rotate45:true,round:true}],
    ['diamond-gingham','다이아 깅엄','체크·도트','45도로 기울어진 부드러운 깅엄 체크','checker',{rotate45:true,gingham:true,soft:true}],
    ['flat-checker','플랫 체크','체크·도트','가운데 구분선과 빈칸 없이 색면으로만 이어지는 체크','checker',{contiguous:true}],
    ['flat-tri-check','플랫 3톤 체크','체크·도트','붙어 있는 겹침 밴드로 3톤이 보이는 체크','overlap-check',{secondary:false}],
    ['no-gap-checker','노갭 체크','체크·도트','첨부 예시처럼 칸 사이가 뜨지 않는 연속 체크','checker',{contiguous:true}],
    ['soft-no-gap-check','소프트 노갭 체크','체크·도트','노갭 체크를 부드럽게 톤온톤으로 표현','checker',{contiguous:true,soft:true}],
    ['soft-overlap-check','소프트 겹침 체크','체크·도트','연한 밴드가 교차하며 3톤이 되는 부드러운 체크','overlap-check',{secondary:true}],
    ['airy-overlap-check','에어리 겹침 체크','체크·도트','여백감 있게 투명 밴드가 교차하는 예시형 체크','overlap-check',{secondary:false}],
    ['no-gap-tri-check','노갭 3톤 체크','체크·도트','같은색 밴드가 겹쳐 3톤이 되고, 두 번째로 진한 영역에 45° 미세 해칭을 선택 적용하는 체크','overlap-check',{secondary:false,hatchMid:true}],
    ['torn-checker','찢어진 체크','체크·도트','종이가 찢어진 듯한 코너 연출이 들어간 체크','torn-checker',{}],
    ['pencil-check','색연필 체크','체크·도트','색연필로 칠한 듯한 보송한 체크','textured-checker',{grid:true}],
    ['pastel-crayon-check','파스텔 크레용 체크','체크·도트','파스텔/크레용 텍스처가 살아있는 체크','textured-checker',{tricolor:true,grid:true}],
    ['checker-heart','하트 체크','체크·도트','체크 칸 안에 미니 하트','checker',{motif:'heart'}],
    ['checker-star','별 체크','체크·도트','체크 칸 안에 미니 별','checker',{motif:'star'}],
    ['checker-dot','도트 체크','체크·도트','체크 칸 안에 작은 도트','checker',{motif:'dot'}],
    ['polka','파스텔 땡땡이','체크·도트','기본 폴카 도트','dots',{}],
    ['tiny-dot','미니 도트','체크·도트','프사 배경용 잔도트','dots',{}],
    ['irregular-dot','불규칙 도트','체크·도트','위치와 크기가 살짝 랜덤','dots',{irregular:true}],
    ['doodle-dot','손그림 도트','체크·도트','동그라미 선이 살짝 흔들림','dots',{doodle:true,irregular:true}],
    ['ring-dot','링 도트','체크·도트','속이 빈 원형 도트','dots',{ring:true,irregular:true}],
    ['bubble-dot','버블 도트','체크·도트','크기가 섞인 말랑한 점','dots',{irregular:true}],
    ['grid','파스텔 격자','격자·줄무늬','깔끔한 기본 그리드','grid',{}],
    ['dashed-grid','점선 체크 / Dashed Grid','격자·줄무늬','얇은 점선이 가로·세로로 교차하는 넓은 저대비 격자','dashed-grid',{}],
    ['heart-dashed-grid','하트 점선 다이아 격자','격자·줄무늬','45° 점선 격자 교차점마다 작은 하트가 들어가는 러블리 저대비 패턴','dashed-grid',{diamond:true,hearts:true}],
    ['hand-grid','손그림 격자','격자·줄무늬','선이 조금씩 흔들리는 격자','grid',{hand:true}],
    ['stripe','파스텔 스트라이프','격자·줄무늬','부드러운 줄무늬','stripes',{}],
    ['diagonal-stripe','사선 스트라이프','격자·줄무늬','캔디 같은 사선 줄무늬','stripes',{diagonal:true}],
    ['wavy-stripe','물결 줄무늬','격자·줄무늬','살랑거리는 웨이브 스트라이프','stripes',{wavy:true}],
    ['scribble-stripe','낙서 줄무늬','격자·줄무늬','손으로 그은 듯한 줄무늬','stripes',{scribble:true}],
    ['wave-lines','물결 라인','격자·줄무늬','반복되는 부드러운 물결선','wave-lines',{}],
    ['zigzag','지그재그','격자·줄무늬','깔끔한 파스텔 지그재그','zigzag',{}],
    ['hearts','미니 하트','리본·하트·별','작은 하트 반복','motif',{motif:'heart'}],
    ['outline-hearts','낙서 하트','리본·하트·별','선으로 그린 손그림 하트','motif',{motif:'heart',outline:true}],
    ['stars','미니 별','리본·하트·별','작은 별 반복','motif',{motif:'star'}],
    ['outline-stars','손그림 별','리본·하트·별','선으로 그린 낙서 별','motif',{motif:'star',outline:true}],
    ['sparkles','반짝이','리본·하트·별','트윙클 스파클 반복','motif',{motif:'sparkle'}],
    ['kira-sparkle','키라 스파클','리본·하트·별','더 촘촘한 반짝이 패턴','motif',{motif:'sparkle'}],
    ['bows','미니 리본','리본·하트·별','귀여운 리본 반복','motif',{motif:'bow'}],
    ['tiny-bows','잔리본','리본·하트·별','더 촘촘한 작은 리본 반복','motif',{motif:'bow'}],
    ['puff-hearts','퍼프 하트','리본·하트·별','통통한 작은 하트 반복','motif',{motif:'heart'}],
    ['candy-stars','캔디 스타','리본·하트·별','사탕처럼 말랑한 별 반복','motif',{motif:'star'}],
    ['flowers','미니 꽃','귀여운 오브젝트','작은 데이지 패턴','motif',{motif:'flower'}],
    ['daisy-dot','데이지 도트','귀여운 오브젝트','작은 꽃이 촘촘히 반복되는 패턴','motif',{motif:'flower'}],
    ['groovy-flower','그루비 꽃','귀여운 오브젝트','복고풍 둥근 꽃','groovy-flower',{}],
    ['cherry','체리','귀여운 오브젝트','미니 체리 반복','motif',{motif:'cherry'}],
    ['strawberry','딸기','귀여운 오브젝트','작은 딸기 반복','motif',{motif:'strawberry'}],
    ['cloud','구름','귀여운 오브젝트','말랑한 구름 반복','motif',{motif:'cloud'}],
    ['moonstar','달·별','귀여운 오브젝트','달과 별이 섞인 셀레스티얼','motif',{motif:'moonstar'}],
    ['smiley','스마일','귀여운 오브젝트','귀여운 얼굴 반복','motif',{motif:'smile'}],
    ['raindrop','물방울','귀여운 오브젝트','말랑한 물방울 반복','raindrops',{}],
    ['doodle','낙서 믹스','키치·낙서','하트·별·링·물결 낙서','doodles',{}],
    ['confetti','파스텔 컨페티','키치·낙서','색종이 조각을 흩뿌린 느낌','confetti',{}],
    ['sticker-mix','스티커 믹스','키치·낙서','다양한 미니 도형이 섞인 느낌','doodles',{}],
    ['sprinkles','스프링클','키치·낙서','짧은 선과 도형의 키치 패턴','confetti',{}],
    ['graphic-circle-frame','그래픽 원·링 프레임','그래픽 배경','다양한 크기의 원·링·점 원을 가장자리에 균형 있게 배치한 프레임','graphic-composition',{layout:'frame'}],
    ['graphic-pill-frame','그래픽 롱 캡슐 프레임','그래픽 배경','기다란 둥근 막대와 캡슐을 중심으로 가장자리에 흐름을 만드는 프레임','graphic-composition',{layout:'center-space'}],
    ['graphic-dotted-frame','그래픽 점선 프레임','그래픽 배경','점선·도트·점 원을 중심으로 가볍고 정돈된 프레임을 만드는 스타일','graphic-composition',{layout:'frame'}],
    ['graphic-stripe-frame','그래픽 스트라이프 프레임','그래픽 배경','평행 막대·스트라이프 원·긴 선을 섞은 사선형 프레임','graphic-composition',{layout:'diagonal'}],
    ['graphic-balanced-mix','그래픽 밸런스 믹스','그래픽 배경','큰 요소와 작은 요소를 고르게 분산하고 중앙 여백을 유지하는 혼합 스타일','graphic-composition',{layout:'scatter'}],
    ['graphic-corner-focus','그래픽 코너 집중형','그래픽 배경','둥근 막대·원·링·점·스파클을 코너에 집중하고 중앙은 비워 두는 2D 그래픽','graphic-composition',{layout:'corner'}],
    ['graphic-diagonal-flow','그래픽 사선 흐름형','그래픽 배경','좌상단→우하단 사선 흐름으로 막대·원·점선·패턴 포인트가 이어지는 구성','graphic-composition',{layout:'diagonal'}],
    ['graphic-frame','그래픽 프레임형','그래픽 배경','화면 가장자리를 따라 원·링·둥근 막대·도트가 둘러싸는 벡터풍 프레임 구성','graphic-composition',{layout:'frame'}],
    ['graphic-center-space','그래픽 중앙 여백형','그래픽 배경','캐릭터·타이포를 위한 중앙 여백을 넓게 확보하고 주변만 깔끔하게 꾸미는 구성','graphic-composition',{layout:'center-space'}],
    ['graphic-scatter','그래픽 전체 분산형','그래픽 배경','같은 그래픽 감성으로 외곽 전체에 다양한 도형을 가볍게 분산한 구성','graphic-composition',{layout:'scatter'}],
    ['sunburst-bg','썬버스트 배경','빛·광택','중앙에서 햇살이 퍼지는 네모 배경','sunburst-bg',{}],
    ['soft-sunburst-bg','소프트 썬버스트','빛·광택','부드럽게 퍼지는 파스텔 햇살 배경','soft-sunburst-bg',{}],
    ['glossy-sun-bg','글로시 선샤인','빛·광택','광택 곡선과 반짝이가 들어간 네모 배경','glossy-sun-bg',{}],
    ['sparkle-glow-bg','스파클 글로우','빛·광택','중앙 글로우와 반짝이 포인트가 있는 배경','sparkle-glow-bg',{}],
  ].map(([id,name,category,desc,type,opt])=>({id,name,category,desc,type,opt}));

  const defaults={
    'mini-checker':{size:34,gap:8,jitter:4,detail:22},'tiny-dot':{size:34,gap:22,jitter:4,detail:20},'gingham':{size:70,gap:8,jitter:0,detail:25},
    'wavy-checker':{size:92,gap:10,jitter:18,detail:65},'hand-checker':{size:75,gap:8,jitter:40,detail:45},'soft-plaid':{size:84,gap:34,jitter:0,stroke:4,opacity:58},'layered-fabric-plaid':{size:76,gap:18,jitter:0,stroke:4,detail:42,opacity:100},'airy-plaid':{size:110,gap:46,jitter:0,stroke:3,opacity:42},'powder-gingham':{size:76,gap:8,jitter:6,detail:52,opacity:76},'fabric-checker':{size:88,gap:18,jitter:14,detail:58,opacity:84},'milk-checker':{size:48,gap:10,jitter:8,detail:18,opacity:55},'soft-gingham':{size:74,gap:12,jitter:2,detail:36,opacity:86},'handmade-plaid':{size:86,gap:18,jitter:28,stroke:3,opacity:84},'textured-checker':{size:58,gap:10,jitter:10,detail:72,opacity:92},'sketch-plaid':{size:90,gap:28,jitter:34,stroke:2,opacity:52},'marshmallow-check':{size:58,gap:12,jitter:6,detail:28,opacity:86},'picnic-check':{size:66,gap:10,jitter:2,detail:30,opacity:88},'windowpane-check':{size:118,gap:42,jitter:0,stroke:3,opacity:48},'layered-check':{size:92,gap:24,jitter:8,stroke:3,detail:52,opacity:82},'micro-gingham':{size:38,gap:6,jitter:0,detail:22,opacity:84},'tri-color-check':{size:64,gap:0,jitter:0,detail:28,stroke:0,opacity:92},'diamond-check':{size:60,gap:8,jitter:0,detail:20,opacity:86},'diamond-gingham':{size:72,gap:10,jitter:2,detail:34,opacity:86},'flat-checker':{size:62,gap:0,jitter:0,detail:18,stroke:0,opacity:92},'flat-tri-check':{size:64,gap:0,jitter:0,detail:24,stroke:0,opacity:92},'no-gap-checker':{size:76,gap:0,jitter:0,detail:16,stroke:0,opacity:94},'soft-no-gap-check':{size:72,gap:0,jitter:0,detail:28,stroke:0,opacity:92},'soft-overlap-check':{size:68,gap:0,jitter:0,detail:22,stroke:0,opacity:88},'airy-overlap-check':{size:82,gap:0,jitter:0,detail:18,stroke:0,opacity:72},'no-gap-tri-check':{size:72,gap:0,jitter:0,detail:26,stroke:0,opacity:94,triHatch:true,triHatchStrength:40,triHatchAlternate:true},'torn-checker':{size:92,gap:0,jitter:0,detail:28,stroke:0,opacity:96},'pencil-check':{size:70,gap:10,jitter:12,detail:78,opacity:92},'pastel-crayon-check':{size:72,gap:12,jitter:14,detail:82,opacity:92},'irregular-dot':{size:62,gap:34,jitter:60,detail:45},
    'doodle-dot':{size:64,gap:32,jitter:60,detail:70},'ring-dot':{size:64,gap:30,jitter:30,detail:50},'grid':{size:70,gap:26,jitter:0,stroke:3},
    'hand-grid':{size:72,gap:22,jitter:48,stroke:3},'dashed-grid':{size:180,gap:0,jitter:0,stroke:2,opacity:100,detail:20,dashedLineColor:'#FFFFFF',dashedLineOpacity:38,dashedLineWidth:2,dashLength:9,dashGap:12,gridX:180,gridY:180},'heart-dashed-grid':{size:126,gap:0,jitter:0,stroke:2,opacity:100,detail:20,dashedLineColor:'#FFFFFF',dashedLineOpacity:52,dashedLineWidth:2,dashLength:7,dashGap:10,gridX:128,gridY:128,dashedHeartColor:'#FFFFFF',dashedHeartOpacity:92,dashedHeartSize:14,dashedHeartGap:4,dashedHeartEvery:1},'stripe':{size:54,gap:22,jitter:0},'diagonal-stripe':{size:48,gap:24,jitter:0},
    'wavy-stripe':{size:54,gap:20,jitter:12,detail:68},'scribble-stripe':{size:52,gap:22,jitter:70,detail:60},'zigzag':{size:66,gap:35,stroke:6},
    'hearts':{size:56,gap:46,jitter:28},'bows':{size:64,gap:56,jitter:28},'sparkles':{size:48,gap:40,jitter:34},'kira-sparkle':{size:34,gap:28,jitter:24,detail:68},'tiny-bows':{size:40,gap:30,jitter:18,detail:36},'puff-hearts':{size:44,gap:34,jitter:20,detail:40},'candy-stars':{size:42,gap:32,jitter:24,detail:38},'flowers':{size:68,gap:54,jitter:34},'daisy-dot':{size:42,gap:34,jitter:26,detail:44},
    'groovy-flower':{size:95,gap:34,jitter:28,detail:62},'cherry':{size:76,gap:55,jitter:30},'strawberry':{size:72,gap:50,jitter:30},
    'cloud':{size:84,gap:55,jitter:35},'moonstar':{size:62,gap:48,jitter:45},'smiley':{size:58,gap:48,jitter:32},'raindrop':{size:58,gap:42,jitter:42},
    'doodle':{size:60,gap:48,jitter:55,stroke:4},'confetti':{size:62,gap:26,jitter:70},
    'graphic-circle-frame':{size:92,gap:20,jitter:0,stroke:3,detail:58,opacity:100,graphicSafeArea:64,graphicBarScale:85,graphicCircleScale:125,graphicSmallScale:95,graphicLargeScale:120,graphicBalance:90,graphicMotifMode:'circles'},
    'graphic-pill-frame':{size:96,gap:20,jitter:0,stroke:3,detail:56,opacity:100,graphicSafeArea:68,graphicBarScale:135,graphicCircleScale:80,graphicSmallScale:92,graphicLargeScale:125,graphicBalance:90,graphicMotifMode:'bars'},
    'graphic-dotted-frame':{size:88,gap:20,jitter:0,stroke:3,detail:62,opacity:100,graphicSafeArea:66,graphicBarScale:80,graphicCircleScale:95,graphicSmallScale:100,graphicLargeScale:105,graphicBalance:94,graphicMotifMode:'dotted'},
    'graphic-stripe-frame':{size:98,gap:18,jitter:0,stroke:3,detail:64,opacity:100,graphicSafeArea:60,graphicBarScale:130,graphicCircleScale:105,graphicSmallScale:95,graphicLargeScale:120,graphicBalance:88,graphicMotifMode:'geometric'},
    'graphic-balanced-mix':{size:92,gap:20,jitter:0,stroke:3,detail:68,opacity:100,graphicSafeArea:62,graphicBarScale:105,graphicCircleScale:105,graphicSmallScale:100,graphicLargeScale:115,graphicBalance:92,graphicMotifMode:'mixed'},
    'graphic-corner-focus':{size:90,gap:22,jitter:0,stroke:3,detail:56,opacity:100,graphicSafeArea:64,graphicBarScale:105,graphicCircleScale:105,graphicSmallScale:95,graphicLargeScale:115,graphicBalance:92,graphicMotifMode:'mixed'},
    'graphic-diagonal-flow':{size:94,gap:18,jitter:0,stroke:3,detail:60,opacity:100,graphicSafeArea:60,graphicBarScale:125,graphicCircleScale:95,graphicSmallScale:95,graphicLargeScale:120,graphicBalance:90,graphicMotifMode:'geometric'},
    'graphic-frame':{size:92,gap:20,jitter:0,stroke:3,detail:62,opacity:100,graphicSafeArea:66,graphicBarScale:105,graphicCircleScale:115,graphicSmallScale:95,graphicLargeScale:115,graphicBalance:94,graphicMotifMode:'mixed'},
    'graphic-center-space':{size:90,gap:24,jitter:0,stroke:3,detail:48,opacity:100,graphicSafeArea:72,graphicBarScale:105,graphicCircleScale:95,graphicSmallScale:90,graphicLargeScale:115,graphicBalance:96,graphicMotifMode:'minimal'},
    'graphic-scatter':{size:90,gap:18,jitter:0,stroke:3,detail:66,opacity:100,graphicSafeArea:60,graphicBarScale:100,graphicCircleScale:100,graphicSmallScale:100,graphicLargeScale:110,graphicBalance:88,graphicMotifMode:'sparkle'},
    'sunburst-bg':{size:90,gap:0,jitter:0,stroke:0,detail:68,opacity:100},'soft-sunburst-bg':{size:90,gap:0,jitter:0,stroke:0,detail:48,opacity:100},'glossy-sun-bg':{size:90,gap:0,jitter:0,stroke:0,detail:54,opacity:100},'sparkle-glow-bg':{size:90,gap:0,jitter:0,stroke:0,detail:58,opacity:100}
  };
  window.PatternEngine={presets,defaults,render};
})();
