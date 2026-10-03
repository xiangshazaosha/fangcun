import * as THREE from '../../vendor/three.module.min.js';


const canvas=document.querySelector('#ocean');
const params=new URLSearchParams(location.search);
if(params.get('logo')==='0')document.querySelector('#brand').hidden=true;
const interactive=params.get('interactive')!=='0';
if(!interactive)canvas.style.pointerEvents='none';

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.98;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xe8e1d3);
const camera=new THREE.OrthographicCamera(-17.78,17.78,10,-10,.1,100);
camera.position.set(0,0,24);camera.lookAt(0,0,0);

const texture=new THREE.TextureLoader().load(new URL('./assets/coast-base-v2.png',import.meta.url).href);
texture.colorSpace=THREE.SRGBColorSpace;
texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
texture.minFilter=THREE.LinearMipmapLinearFilter;

// 允许高频连续点击；槽位只在波纹完整结束后复用，避免新波纹覆盖旧波纹。
const MAX_RIPPLES=24;
const ripples=Array.from({length:MAX_RIPPLES},()=>new THREE.Vector4(9,9,-99,0));
const uniforms={
  uTexture:{value:texture},uTime:{value:0},uAspect:{value:innerWidth/innerHeight},
  uMotion:{value:matchMedia('(prefers-reduced-motion: reduce)').matches?.28:1},uRipples:{value:ripples}
};

const oceanMaterial=new THREE.ShaderMaterial({
  uniforms,
  vertexShader:`
    varying vec2 vWorld;
    void main(){vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xy;gl_Position=projectionMatrix*viewMatrix*w;}
  `,
  fragmentShader:`
    precision highp float;
    varying vec2 vWorld;
    uniform sampler2D uTexture;
    uniform float uTime,uAspect,uMotion;
    uniform vec4 uRipples[${MAX_RIPPLES}];
    const float TEX_ASPECT=1.779;

    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
    }
    float waveNet(vec2 p,float t){
      p*=18.0;
      float a=sin(p.x+sin(p.y*.82+t*.72)*1.7-t*.34);
      float b=sin(p.y*1.13+sin(p.x*.76-t*.55)*1.6+t*.27);
      float c=sin((p.x+p.y)*.58+sin(p.y*.41+t*.31)*1.8);
      float web=abs(a+b*.72+c*.38);
      return pow(clamp(1.0-web*.58,0.0,1.0),5.0);
    }
    // 与底图海岸线一致的弯曲边界；y=0 为画面底部，y=1 为顶部。
    float shorelineX(float y){
      return .266+.078*y+.006*sin(y*12.8+.7)+.003*sin(y*31.0);
    }
    vec2 coverUv(vec2 p){
      vec2 uv=p/vec2(20.0*uAspect,20.0)+.5;
      if(uAspect<TEX_ASPECT)uv.x=(uv.x-.5)*(uAspect/TEX_ASPECT)+.5;
      else uv.y=(uv.y-.5)*(TEX_ASPECT/uAspect)+.5;
      return uv;
    }
    void main(){
      float t=uTime*uMotion;
      vec2 uv=coverUv(vWorld);
      float shore=shorelineX(uv.y);
      // 在泡沫线内侧柔和收口，沙滩像素不会再参与水面折射或波纹高光。
      float water=smoothstep(shore+.002,shore+.018,uv.x);
      float nearWater=(1.0-smoothstep(shore+.045,shore+.50,uv.x))*water;
      float deep=smoothstep(.55,.98,uv.x);

      // 非周期性的轻微表面折射，使底图动起来但不破坏自然纹理。
      vec2 surface=vec2(
        sin(uv.y*34.0+t*.42)+sin(uv.y*71.0-t*.31+noise(uv*9.0)*2.0),
        cos(uv.x*29.0-t*.36)+sin(uv.x*57.0+t*.27)
      )*.00072*water;

      vec2 lensOffset=vec2(0.0);
      float lensBody=0.0,specular=0.0,darkRim=0.0,wake=0.0;
      for(int i=0;i<${MAX_RIPPLES};i++){
        float age=t-uRipples[i].z;
        if(age>0.0&&age<7.2){
          vec2 center=uRipples[i].xy;
          vec2 delta=(uv-center)*vec2(TEX_ASPECT,1.0);
          float d=length(delta);
          float radius=min(.48,.012+age*.075);
          float q=d/max(radius,.001);
          float birth=smoothstep(0.0,.34,age);
          float life=(1.0-smoothstep(4.7,7.2,age))*birth;
          float inside=(1.0-smoothstep(.96,1.0,q))*life*uRipples[i].w;
          float dome=sqrt(max(0.0,1.0-q*q));
          vec2 radial=normalize(delta+vec2(.00001));

          // 真实凸透镜：内部向中心采样，边缘出现相反方向的折射压缩。
          lensOffset+=(center-uv)*inside*(.035+.070*dome);
          lensOffset+=radial/vec2(TEX_ASPECT,1.0)*sin((q-age*.32)*20.0)*inside*.0018;
          lensBody+=inside*dome;

          float rim=exp(-abs(d-radius)*82.0)*life*uRipples[i].w;
          float lightSide=smoothstep(-.35,.82,dot(radial,normalize(vec2(-.68,.74))));
          float shadeSide=smoothstep(-.35,.78,dot(radial,normalize(vec2(.62,-.78))));
          specular+=rim*(.10+.90*lightSide);
          darkRim+=rim*(.16+.84*shadeSide);

          // 水泡过后留下非发光的宽缓扰动。
          float behind=smoothstep(.8,2.0,age)*life;
          wake+=inside*behind*(.5+.5*sin((d-age*.041)*95.0+sin(uv.y*42.0)));
        }
      }

      // 多个实例只做有界叠加，不使用 max 在实例间硬切换，避免连续点击时“跳帧”。
      lensBody=1.0-exp(-lensBody);
      lensOffset=clamp(lensOffset,vec2(-.018),vec2(.018));
      // 波纹的折射、亮边、暗边和余波全部裁切在水域内；靠岸时自然被岸线截断。
      lensOffset*=water;
      lensBody*=water;
      specular*=water;
      darkRim*=water;
      wake*=water;

      vec2 sampleUv=clamp(uv+surface+lensOffset,vec2(.001),vec2(.999));
      vec3 color=texture2D(uTexture,sampleUv).rgb;

      // 只叠加少量会移动的焦散；主体细节来自自然底图。
      float caustic=waveNet(uv+surface*6.0,t)*nearWater;
      caustic+=waveNet(uv*1.63-vec2(t*.003,0.0),t*.71)*nearWater*.24;
      color+=vec3(.22,.52,.48)*caustic*(.20+.43*lensBody+wake*.55);

      // 玻璃水泡不是白色圆盘：一侧高光、一侧暗边、内部仅轻微提亮。
      color+=vec3(.08,.20,.18)*lensBody*.34;
      color+=vec3(.67,.82,.77)*specular*.48;
      color-=vec3(.07,.19,.21)*darkRim*.72;
      color-=vec3(.01,.035,.045)*deep*.08;
      gl_FragColor=vec4(color,1.0);
    }
  `
});
const plane=new THREE.Mesh(new THREE.PlaneGeometry(64,38),oceanMaterial);
scene.add(plane);

scene.add(new THREE.HemisphereLight(0xe9ffff,0x17373d,1.55));
const sun=new THREE.DirectionalLight(0xffffff,2.15);sun.position.set(-7,-4,15);scene.add(sun);

const koiTexture=new THREE.TextureLoader().load(new URL('./assets/koi-top-v1.png',import.meta.url).href);
koiTexture.colorSpace=THREE.SRGBColorSpace;
koiTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();

// A short articulated spine preserves segment length instead of shearing the whole sprite.
const koiVertexShader=`
  varying vec2 vUv;
  uniform float uSwimPhase,uEffort,uTurn;
  void main(){
    vUv=uv;vec3 p=position;
    float along=max(0.0,.84-uv.y)*3.45;
    float stepLength=along/12.0;
    vec2 center=vec2(0.0,(.84-.5)*3.45);
    float angle=0.0;
    for(int j=0;j<12;j++){
      float s=(float(j)+.5)*stepLength/(.82*3.45);
      angle=(.30+.25*uEffort)*pow(s,1.65)*sin(uSwimPhase-s*5.8)
        -uTurn*.24*s;
      center+=vec2(sin(angle),-cos(angle))*stepLength;
    }
    if(uv.y<.84){
      float s=along/(.82*3.45);
      angle=(.30+.25*uEffort)*pow(s,1.65)*sin(uSwimPhase-s*5.8)-uTurn*.24*s;
      // Cross-sections follow the spine, so the tail rotates rather than stretching sideways.
      p.xy=center+vec2(cos(angle),sin(angle))*position.x;
    }
    float fin=smoothstep(.10,.26,abs(uv.x-.5))*
      smoothstep(.47,.58,uv.y)*(1.0-smoothstep(.70,.78,uv.y));
    p.x*=1.0-fin*(.035+.025*sin(uSwimPhase*.65));
    p.z+=fin*.025*sin(uSwimPhase*.65);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
  }
`;
function makeKoi(seed,index){
  const g=new THREE.Group();
  const koiUniforms={
    uMap:{value:koiTexture},uSwimPhase:{value:seed*Math.PI*2},
    uEffort:{value:0},uTurn:{value:0},uOpacity:{value:.88+seed*.06},uShadow:{value:0}
  };
  const koiMat=new THREE.ShaderMaterial({
    uniforms:koiUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:koiVertexShader,
    fragmentShader:`
      varying vec2 vUv;uniform sampler2D uMap;uniform float uOpacity,uShadow;
      void main(){
        vec4 tex=texture2D(uMap,vUv);if(tex.a<.025)discard;
        vec3 color=mix(tex.rgb,vec3(.54,.72,.69),.045);
        color=mix(color,vec3(.027,.196,.227),uShadow);
        gl_FragColor=vec4(color,tex.a*uOpacity*smoothstep(.0,.08,tex.a));
      }
    `
  });
  const geometry=new THREE.PlaneGeometry(2.30,3.45,32,80);
  const koi=new THREE.Mesh(geometry,koiMat);koi.position.z=.34;g.add(koi);
  // Shadow uses exactly the same articulated pose, not a rigid second fish.
  const shadowMat=koiMat.clone();
  shadowMat.uniforms={...koiUniforms,uOpacity:{value:.065},uShadow:{value:1}};
  const shadow=new THREE.Mesh(geometry,shadowMat);shadow.position.set(.10,-.12,.08);g.add(shadow);
  const scale=.76+seed*.22;g.scale.setScalar(scale);g.position.z=.38;scene.add(g);
  return{g,koi,koiUniforms,shadow,pos:new THREE.Vector2(),vel:new THREE.Vector2(),
    heading:0,seed,index,flee:0,seen:new Set(),speed:.25,effort:0,turn:0,
    swimPhase:seed*Math.PI*2,escape:new THREE.Vector2()};
}

const fish=Array.from({length:3},(_,i)=>makeKoi((i+1)/4,i));
const starts=[[3.0,4.6],[10.8,1.8],[6.8,-5.0]];
fish.forEach((f,i)=>{
  f.pos.set(...starts[i]);const a=[-.32,2.35,.55][i];
  f.vel.set(Math.cos(a),Math.sin(a)).multiplyScalar(f.speed);
  f.heading=Math.atan2(-f.vel.x,f.vel.y);
});

let aspect=innerWidth/innerHeight,elapsed=0,last=performance.now(),paused=params.get('paused')==='1',rippleIndex=0,lastAction=-20,nextAuto=4.2,rippleSerial=0;
const rippleEvents=[];
const motion=matchMedia('(prefers-reduced-motion: reduce)').matches?.28:1;

function resize(){
  aspect=innerWidth/innerHeight;const hh=10;
  camera.left=-hh*aspect;camera.right=hh*aspect;camera.top=hh;camera.bottom=-hh;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight,false);uniforms.uAspect.value=aspect;
}
resize();addEventListener('resize',resize);

function screenToTexture(x,y){
  let u=x/innerWidth,v=1-y/innerHeight;
  const texAspect=1.779;
  if(aspect<texAspect)u=(u-.5)*(aspect/texAspect)+.5;
  else v=(v-.5)*(texAspect/aspect)+.5;
  return new THREE.Vector2(u,v);
}
function worldToTexture(p){
  let u=p.x/(20*aspect)+.5,v=p.y/20+.5;const texAspect=1.779;
  if(aspect<texAspect)u=(u-.5)*(aspect/texAspect)+.5;
  else v=(v-.5)*(texAspect/aspect)+.5;
  return new THREE.Vector2(u,v);
}
function shorelineX(y){return .266+.078*y+.006*Math.sin(y*12.8+.7)+.003*Math.sin(y*31);}
function addRipple(uv,strength=1){
  // 只允许在实际水域起波，边界与片元着色器使用同一条海岸线。
  if(uv.x<shorelineX(uv.y)+.008)return;
  const shaderNow=elapsed*motion;
  let slot=-1;
  for(let offset=0;offset<MAX_RIPPLES;offset++){
    const candidate=(rippleIndex+offset)%MAX_RIPPLES;
    const born=ripples[candidate].z;
    if(born<0||shaderNow-born>7.3){slot=candidate;break;}
  }
  // 极端情况下 7 秒内超过 24 次点击：宁可暂不新增，也不让正在扩散的波纹跳失。
  if(slot<0)return;
  ripples[slot].set(uv.x,uv.y,shaderNow,strength);rippleIndex=(slot+1)%MAX_RIPPLES;lastAction=elapsed;
  rippleEvents.push({id:++rippleSerial,uv:uv.clone(),start:elapsed,strength});
  while(rippleEvents.length>MAX_RIPPLES)rippleEvents.shift();
}
// A moving pointer leaves a restrained wake; clicks retain the stronger wavefront.
let hoverUv=null,hoverAt=-20,lastHoverRipple=-20,lastHoverUv=null;
function hoverWater(x,y){
  if(paused||!Number.isFinite(x)||!Number.isFinite(y)){hoverUv=null;lastHoverUv=null;return;}
  const uv=screenToTexture(x*innerWidth,y*innerHeight);
  if(uv.x<shorelineX(uv.y)+.008){hoverUv=null;return;}
  hoverUv=uv;hoverAt=elapsed;
  if(elapsed-lastHoverRipple>.65&&(!lastHoverUv||uv.distanceTo(lastHoverUv)>.025)){
    addRipple(uv,.16);lastHoverRipple=elapsed;lastHoverUv=uv.clone();
  }
}
if(interactive){
  canvas.addEventListener('pointerdown',e=>{if(e.button===0)addRipple(screenToTexture(e.clientX,e.clientY),1);});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')hoverWater(e.clientX/innerWidth,e.clientY/innerHeight);});
  canvas.addEventListener('pointerleave',()=>hoverWater(null,null));
  canvas.addEventListener('pointercancel',()=>hoverWater(null,null));
}

function animate(now){
  requestAnimationFrame(animate);const dt=Math.max(0,Math.min(.04,(now-last)/1000));last=now;
  if(!paused){
    elapsed+=dt;uniforms.uTime.value=elapsed;
    if(elapsed>nextAuto&&elapsed-lastAction>6){
      addRipple(new THREE.Vector2(.46+Math.random()*.37,.22+Math.random()*.56),.55);
      nextAuto=elapsed+10+Math.random()*4;
    }
    fish.forEach((f,i)=>{
      const fishUv=worldToTexture(f.pos);
      // 扩散的波前抵达锦鲤时才触发反应：急转、加速、快速摆尾，随后逐渐恢复巡游。
      for(const ev of rippleEvents){
        const age=(elapsed-ev.start)*motion;if(age<=0||age>7.2||f.seen.has(ev.id))continue;
        const delta=fishUv.clone().sub(ev.uv);delta.x*=1.779;
        const distance=delta.length(),waveRadius=.012+age*.075;
        if(Math.abs(distance-waveRadius)<.028){
          const escape=new THREE.Vector2(delta.x/1.779,delta.y).normalize();
          if(escape.lengthSq()<.001)escape.copy(f.vel).normalize();
          f.escape.copy(escape);
          f.flee=Math.max(f.flee,ev.strength<.4?.8+ev.strength*1.5:4.65+ev.strength*.75);f.seen.add(ev.id);
        }
      }
      const step=dt*motion;
      f.flee=Math.max(0,f.flee-step);
      const targetEffort=THREE.MathUtils.smoothstep(f.flee,0,4.5);
      f.effort+=(targetEffort-f.effort)*(1-Math.exp(-step*3.8));
      const forward=new THREE.Vector2(-Math.sin(f.heading),Math.cos(f.heading));
      const desired=f.flee>0?f.escape.clone():forward.clone();
      if(f.flee<=0){
        const wander=Math.sin(elapsed*motion*.29+f.seed*11)*.28;
        desired.rotateAround(new THREE.Vector2(),wander);
      }
      if(hoverUv&&elapsed-hoverAt<.35){
        const away=fishUv.clone().sub(hoverUv);away.x*=1.779;
        const distance=away.length();
        if(distance<.15&&distance>.001)desired.addScaledVector(away.normalize(),(1-distance/.15)*1.4);
      }
      // Anticipatory steering avoids frame-rate-dependent wall impulses and abrupt U-turns.
      const left=-2.6,right=Math.min(15.0,10*aspect-1.5),top=7.4,bottom=-7.4;
      desired.x+=Math.max(0,(left+2.5-f.pos.x)/2.5)*2.6;
      desired.x-=Math.max(0,(f.pos.x-right+2.5)/2.5)*2.6;
      desired.y+=Math.max(0,(bottom+2.0-f.pos.y)/2.0)*2.6;
      desired.y-=Math.max(0,(f.pos.y-top+2.0)/2.0)*2.6;
      fish.forEach(o=>{if(o!==f){const d=f.pos.distanceTo(o.pos);if(d<2.2)
        desired.addScaledVector(f.pos.clone().sub(o.pos).normalize(),(2.2-d)*.65);}});
      const target=Math.atan2(-desired.x,desired.y);
      const delta=Math.atan2(Math.sin(target-f.heading),Math.cos(target-f.heading));
      const turnRate=THREE.MathUtils.clamp(delta*2.1,-(.50+f.effort*1.3),.50+f.effort*1.3);
      f.heading+=turnRate*step;
      f.turn+=(turnRate-f.turn)*(1-Math.exp(-step*4));
      // Accumulated phase stays continuous when startled or slowing down.
      // A gentle stroke/glide envelope breaks the metronomic tail wag.
      const glide=.80+.20*Math.sin(elapsed*motion*.72+f.seed*9);
      f.swimPhase+=step*(4.0+f.effort*7.0)*glide;
      const stroke=.92+.08*Math.sin(f.swimPhase*2-.6);
      const targetSpeed=(.27+i*.025+f.effort*1.60)*stroke;
      f.speed+=(targetSpeed-f.speed)*(1-Math.exp(-step*(f.effort>.2?2.8:1.3)));
      // Translation follows the nose, eliminating the old sideways skating during turns.
      f.vel.set(-Math.sin(f.heading),Math.cos(f.heading)).multiplyScalar(f.speed);
      f.pos.addScaledVector(f.vel,step);
      f.g.rotation.z=f.heading;f.g.position.set(f.pos.x,f.pos.y,.40);
      f.koiUniforms.uSwimPhase.value=f.swimPhase;
      f.koiUniforms.uEffort.value=f.effort;
      f.koiUniforms.uTurn.value=f.turn;
      const liveIds=new Set(rippleEvents.map(ev=>ev.id));
      for(const id of f.seen)if(!liveIds.has(id))f.seen.delete(id);

    });
    while(rippleEvents.length&&(elapsed-rippleEvents[0].start)*motion>7.3)rippleEvents.shift();
  }
  if(!paused)renderer.render(scene,camera);
}
requestAnimationFrame(animate);

window.OceanBackground={
  pause(){paused=true;hoverUv=null;},resume(){paused=false;},
  hover:hoverWater,
  ripple(x=.66,y=.5){addRipple(screenToTexture(x*innerWidth,y*innerHeight),1);},
  state(){return fish.map(f=>({x:f.pos.x,y:f.pos.y,speed:f.vel.length(),flee:f.flee,heading:f.heading,swimPhase:f.swimPhase,effort:f.effort}))},
  rippleState(){
    const now=elapsed*motion;
    return ripples.map((r,index)=>({index,age:now-r.z,active:r.z>=0&&now-r.z<=7.2,x:r.x,y:r.y,strength:r.w}));
  }
};
addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='ocean-background')return;
  if(e.data.action==='pause')window.OceanBackground.pause();if(e.data.action==='resume')paused=false;
  if(e.data.action==='ripple')window.OceanBackground.ripple(e.data.x,e.data.y);
  if(e.data.action==='hover')hoverWater(e.data.x,e.data.y);
});

if(parent!==window)parent.postMessage({type:'ocean-background',action:'ready'},location.origin);
