import * as T from '../vendor/three.module.min.js';
import { CARD_WIDTH, CARD_HEIGHT } from './card-art.js';
import { HALF_X, HALF_Z, HERO, EXIT, SECTORS, TEAMS } from './mission.js?v=zombie-types';

const unit = new T.BoxGeometry(1,1,1);
const round = new T.SphereGeometry(1,16,10);
const hoop = new T.TorusGeometry(1,.063,6,54);
const material = (color,options={}) => new T.MeshStandardMaterial({ color,roughness:.65,...options });
const light = color => new T.MeshBasicMaterial({color});
const signFont = '900 68px system-ui,sans-serif';

function texture(w,h,draw) {
  const canvas=document.createElement('canvas');
  canvas.width=w;
  canvas.height=h;
  draw(canvas.getContext('2d'),w,h);
  const tex=new T.CanvasTexture(canvas);
  tex.colorSpace=T.SRGBColorSpace;
  tex.anisotropy=4;
  return tex;
}

function mesh(parent,geometry,mat,x,y,z,sx=1,sy=1,sz=1) {
  const m=new T.Mesh(geometry,mat);
  m.position.set(x,y,z);
  m.scale.set(sx,sy,sz);
  parent.add(m);
  return m;
}

const block=(parent,mat,x,y,z,w,h,d)=>mesh(parent,unit,mat,x,y,z,w,h,d);
const sphere=(parent,mat,x,y,z,w,h,d)=>mesh(parent,round,mat,x,y,z,w,h,d);

function tileTexture(sector) {
  return texture(1024,768,(c,w,h)=>{
    const step=64;
    const hue=new T.Color(sector.floor);
    for(let row=0;row<h/step;row++) {
      for(let col=0;col<w/step;col++) {
        const x=col*step,y=row*step;
        const shade=.88+((col*7+row*11)%9)/40;
        c.fillStyle=hue.clone().multiplyScalar(shade).getStyle();
        c.fillRect(x,y,step,step);
        c.strokeStyle='#1b11394c';
        c.strokeRect(x+.6,y+.6,step-1.2,step-1.2);
        c.fillStyle='#fff1e71c';
        c.fillRect(x+5,y+5,2,2);
      }
    }
    for(const [x,y,r,color] of [[190,197,275,'#e455ba65'],[815,174,240,'#8274ed78'],
      [200,625,225,'#5c97fd55'],[805,535,260,'#c651ba5e'],[511,38,190,'#ffac6650']]) {
      const glow=c.createRadialGradient(x,y,0,x,y,r);
      glow.addColorStop(0,color);glow.addColorStop(1,'#401d6800');
      c.fillStyle=glow;c.fillRect(x-r,y-r,r*2,r*2);
    }
    c.fillStyle='#ffa26618';
    c.fillRect(w*.44,0,w*.12,h);
    c.strokeStyle='#ffc38383';
    c.lineWidth=3;
    c.setLineDash([18,10]);
    c.strokeRect(25,26,w-50,h-52);
    c.strokeStyle='#fff1bb62';
    c.beginPath();
    for(const x of [w*.44,w*.56]) { c.moveTo(x,30); c.lineTo(x,h-30); }
    c.stroke();
    c.setLineDash([]);
    c.font='850 43px system-ui,sans-serif';
    c.textAlign='center';
    c.fillStyle='#f9e3d76e';
    c.fillText('X5',w*.5,h*.91);
  });
}

let shadowMap,cardMap,glowMap;
const cardGlow = new T.PlaneGeometry(2.8,2.8);
function prepareTextures(artwork) {
  shadowMap=texture(128,128,(c,w)=>{
    const g=c.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);
    g.addColorStop(0,'#160d31cb');g.addColorStop(.56,'#160d3170');g.addColorStop(1,'#160d3100');
    c.fillStyle=g;c.fillRect(0,0,w,w);
  });
  glowMap=texture(128,128,(c,w)=>{
    const g=c.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);
    g.addColorStop(0,'#ff9d5c97');g.addColorStop(.31,'#ff743b70');g.addColorStop(1,'#ff894500');
    c.fillStyle=g;c.fillRect(0,0,w,w);
  });
  cardMap = new T.CanvasTexture(artwork);
  cardMap.colorSpace = T.SRGBColorSpace;
  cardMap.anisotropy = 4;
}

function poster(parent,title,subtitle,color,x,y,z,w,h) {
  const map=texture(1024,384,(c,width,height)=>{
    c.fillStyle='#30154d';c.fillRect(0,0,width,height);
    c.fillStyle=color;c.fillRect(0,0,21,height);
    c.fillStyle='#ffeed9';c.font=signFont;c.fillText(title,66,172);
    c.fillStyle=color;c.font='850 48px system-ui,sans-serif';c.fillText(subtitle,69,267);
    c.fillStyle='#ffffff28';for(let i=0;i<10;i++)c.fillRect(765+i*17,198,9,69);
  });
  mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map}),x,y,z);
}

function floorShadow(parent, x,z,size) {
  const m=mesh(parent,new T.PlaneGeometry(size,size*.72), new T.MeshBasicMaterial({
    map:shadowMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,
  }),x,.025,z);
  m.rotation.x=-Math.PI/2;
  return m;
}

function environment(world,sector) {
  const floor=mesh(world,new T.PlaneGeometry(HALF_X*2+2,HALF_Z*2+2),material('#fff',{map:tileTexture(sector),roughness:.74}),0,0,0);
  floor.rotation.x=-Math.PI/2;
  floor.receiveShadow=true;

  const wall=material('#483064');
  const trim=material('#824f9f');
  const cold=light(sector.accent);
  const cream=material('#ebbcab');
  const marker=material('#3b245f');
  const darker=material('#332348');
  block(world,wall,0,1.8,-17.55,48,3.65,1);
  block(world,wall,-23.6,1.02,0,.95,2.05,35);
  block(world,wall,23.6,1.02,0,.95,2.05,35);
  block(world,darker,0,.24,17.7,48,.48,.85);
  block(world,cold,0,3.43,-16.99,46,.085,.07);
  for(const x of [-23.1,23.1]) {
    block(world,cold,x,1.96,0,.05,.075,33);
    for(let i=-14;i<=14;i+=4) {
      block(world,trim,x,1.12,i,.23,2.1,.55);
      block(world,light('#ffddc8'),x,1.54,i,.28,.11,.31);
    }
  }
  for(const x of [-20,-13,-6,6,13,20]) {
    block(world,trim,x,1.7,-16.96,.24,3.3,.22);
    block(world,cream,x,2.64,-16.77,.19,.84,.13);
  }
  poster(world,'КАРТА АПЕЛЬСИН','X5 · НОЧНАЯ СМЕНА',sector.accent,-11,2.15,-16.95,11.6,2.8);
  poster(world,'ЭВАКУАЦИЯ','СОБЕРИ КАРТЫ →',sector.accent,11,2.15,-16.95,10.4,2.8);

  const hues=['#f7994d','#ffa4b2','#89c9fa','#a7df88','#c6a7fc','#ffd675','#eee2dc'];
  const matrices=hues.map(()=>[]);
  const dummy=new T.Object3D();
  sector.shelves.forEach(([x,z,w,d],i)=>{
    const narrow=w<d;
    const length=narrow?d:w, depth=narrow?w:d;
    const g=new T.Group();
    g.position.set(x,0,z);
    if(narrow) g.rotation.y=Math.PI/2;
    world.add(g);
    const base=block(g,darker,0,.16,0,length,.32,depth);
    base.castShadow=true;
    block(g,trim,0,.94,0,length,1.36,.23);
    for(const y of [.45,.98,1.51]) {
      block(g,cream,0,y,0,length,.12,depth);
      for(const side of [-1,1])block(g,cold,0,y+.013,side*depth/2,length,.04,.038);
    }
    for(const a of [-1,1]) {
      block(g,material(i%2?'#c462a8':'#7b62bf'),a*(length/2-.075),.96,0,.15,1.76,depth);
      block(g,cream,a*(length/2-.07),1.49,0,.17,.12,depth+.04);
    }
    if(length>4.1) {
      block(g,marker,-length/2+.85,1.59,0,1.28,.21,depth+.08);
      const stripe=light(i%2?'#ff99bf':'#a7c5ff');
      for(const side of [-1,1])for(let k=0;k<4;k++) {
        block(g,stripe,-length/2+.47+k*.17,1.59,side*(depth/2+.053),.08,.036,.018);
      }
    }
    g.updateMatrixWorld(true);
    for(let row=0;row<3;row++) {
      const cells=Math.floor((length-.4)/.43);
      for(let n=0;n<cells;n++) {
        for(const side of [-1,1]) {
          if((n+row*3+i+side)%11<1) continue;
          const width=.27+((n*3+i)%4)*.04,height=.19+((n+i+row*3)%4)*.055;
          dummy.position.set(-length/2+.38+n*.43,.53+row*.53+height/2,side*(depth/2-.33));
          dummy.scale.set(width,height,.34);
          dummy.updateMatrix();
          matrices[(Math.floor(n/2)+row*2+i+side+7)%hues.length].push(g.matrixWorld.clone().multiply(dummy.matrix));
        }
      }
    }
    floorShadow(world,x,z,Math.max(w,d)+1.4);
  });
  matrices.forEach((items,i)=>{
    if(!items.length)return;
    const m=new T.InstancedMesh(unit,material(hues[i]),items.length);
    items.forEach((matrix,j)=>m.setMatrixAt(j,matrix));
    world.add(m);
  });

  const crate=material('#e89365');
  const crateInset=material('#af5680');
  for(const [x,z,yaw] of [[-20,0,.12],[20,0,-.07],[-17,15,.11],[17,15,-.11],[-19,-15,0],[19,-15,0]]) {
    const stack=new T.Group();
    stack.position.set(x,-.21,z);
    stack.rotation.y=yaw;
    world.add(stack);
    block(stack,crate,0,.37,0,1.8,.7,1.1);
    block(stack,crateInset,0,.39,.56,1.53,.45,.04);
    block(stack,cream,-.25,.77,0,.87,.11,.79);
    // Low edge markings stay out of the collision grid.
    stack.scale.y=.32;
  }

  const gate=new T.Group();
  gate.position.set(EXIT.x,0,EXIT.z);
  world.add(gate);
  const edge=light('#ff8e5d');
  const jade=material('#683c78');
  for(const x of [-2.3,2.3]) {
    block(gate,jade,x,1.43,0,.47,2.86,.44);
    block(gate,edge,x,1.44,.25,.12,2.7,.09);
  }
  block(gate,jade,0,2.82,0,4.95,.31,.49);
  block(gate,edge,0,2.8,.28,4.55,.12,.07);
  const gateField=block(gate,new T.MeshBasicMaterial({color:'#ff8151',transparent:true,opacity:.28,depthWrite:false}),0,1.42,0,4.23,2.68,.08);
  const ring=mesh(gate,hoop,edge,0,.045,.92,1.55,1.55,1.55);
  ring.rotation.x=-Math.PI/2;
  return {edge,gateField};
}

const shoes=material('#2e2547');
const pants=material('#3c345d');
const tooth=material('#fff1cb');
const pupil=light('#27132d');
const kit=material('#ff7b31',{metalness:.1});
const creamArmor=material('#ffcfab');
const weapon=material('#654276',{metalness:.29});
const visor=material('#176469',{roughness:.27,metalness:.25});
const teal=light('#a0ffee');

function character(parent,index) {
  const group=new T.Group();
  group.scale.setScalar(1.21);
  parent.add(group);
  const zombie=index>=0;
  const team=TEAMS[index];
  const uniform=zombie?material(team.color):kit;
  const skin=zombie?material(team.skin):creamArmor;
  const torso=sphere(group,uniform,0,1.03,0,.47,.51,.31);
  torso.castShadow=true;
  block(group,pants,0,.66,0,.63,.21,.43);
  const arms=[], legs=[];
  for(const side of [-1,1]) {
    const arm=new T.Group();
    arm.position.set(side*.44,1.26,.02);
    group.add(arm);
    sphere(arm,uniform,0,-.22,0,.16,.32,.155);
    sphere(arm,skin,0,-.5,.06,.15,.23,.145);
    arms.push(arm);
    const leg=new T.Group();
    leg.position.set(side*.21,.65,0);
    group.add(leg);
    sphere(leg,pants,0,-.23,0,.17,.29,.16);
    sphere(leg,shoes,0,-.53,.084,.19,.14,.24);
    legs.push(leg);
  }
  const head=new T.Group();
  head.position.set(0,1.83,.04);
  group.add(head);
  sphere(head,skin,0,0,0,.395,.42,.35);
  if(zombie) {
    for(const x of [-.31,.31])sphere(head,skin,x,-.02,0,.11,.135,.1);
    for(const x of [-.14,.14]) {
      sphere(head,tooth,x,.08,.297,.10,.115,.075);
      sphere(head,pupil,x,.064,.358,.045,.057,.03);
    }
    block(head,pupil,0,-.13,.316,.21,.09,.07);
    block(head,tooth,-.045,-.105,.359,.051,.04,.024);
    const hair=material(index===2?'#48778e':'#475060');
    if(index===0) {
      sphere(head,uniform,0,.28,0,.4,.18,.35);
      block(head,uniform,0,.25,.28,.63,.064,.37);
    } else if(index===1) {
      sphere(head,hair,0,.27,-.04,.39,.18,.32);
      sphere(group,uniform,0,1.04,-.28,.48,.45,.18);
      group.scale.set(1.48,1.33,1.49);
    } else if(index===2) {
      block(head,hair,0,.307,-.025,.68,.25,.54);
      block(head,uniform,0,.18,.273,.66,.085,.1);
    } else {
      sphere(head,uniform,0,.21,-.11,.405,.26,.31);
      block(group,creamArmor,0,1.1,.312,.28,.18,.043);
      group.scale.set(1.02,1.12,1.02);
    }
  } else {
    sphere(head,visor,0,.035,.22,.32,.24,.22);
    block(head,teal,-.105,.109,.403,.19,.038,.029);
    for(const x of [-.35,.35])sphere(head,kit,x,.018,0,.12,.23,.16);
    sphere(group,weapon,0,1.05,-.27,.34,.47,.23);
    block(group,creamArmor,0,1.06,-.47,.45,.53,.12);
    block(group,teal,0,1.13,-.536,.26,.08,.026);
    block(group,weapon,.49,1.17,.54,.24,.24,.71);
    block(group,kit,.49,1.183,.68,.3,.22,.51);
    block(group,teal,.49,1.2,.97,.19,.1,.095);
  }
  return {group,head,arms,legs};
}

function roundedCardGeometry() {
  const x = CARD_WIDTH / 2, y = CARD_HEIGHT / 2, radius = .055;
  const outline = new T.Shape();
  outline.moveTo(-x + radius, -y);
  outline.lineTo(x - radius, -y);
  outline.quadraticCurveTo(x, -y, x, -y + radius);
  outline.lineTo(x, y - radius);
  outline.quadraticCurveTo(x, y, x - radius, y);
  outline.lineTo(-x + radius, y);
  outline.quadraticCurveTo(-x, y, -x, y - radius);
  outline.lineTo(-x, -y + radius);
  outline.quadraticCurveTo(-x, -y, -x + radius, -y);

  const geometry = new T.ExtrudeGeometry(outline, { depth: .055, bevelEnabled: false, curveSegments: 5 });
  geometry.translate(0, 0, -.0275);
  const { position, uv, normal } = geometry.attributes;
  const face = geometry.groups.find(group => group.materialIndex === 0);
  for (let i = face.start; i < face.start + face.count; i++) {
    const side = normal.getZ(i) < 0 ? -1 : 1;
    uv.setXY(i, .5 + side * position.getX(i) / CARD_WIDTH, .5 + position.getY(i) / CARD_HEIGHT);
  }
  return geometry;
}

const cardBody = roundedCardGeometry();

function modelCard(parent) {
  const g=new T.Group();
  const face=new T.MeshBasicMaterial({map:cardMap,toneMapped:false});
  const side=light('#ff7f26');
  mesh(g,cardBody,[face,side],0,0,0);
  const root=new T.Group();
  const glow=mesh(root,cardGlow,new T.MeshBasicMaterial({map:glowMap,transparent:true,
    blending:T.AdditiveBlending,depthWrite:false}),0,.034,0);
  glow.rotation.x=-Math.PI/2;
  root.add(g);parent.add(root);
  return {group:root,card:g,glow};
}

export function buildView(view,labels,artwork) {
  prepareTextures(artwork);
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  view.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','3D-сцена магазина');

  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(45,1,.1,140);
  const world=new T.Group(), objects=new T.Group();
  scene.add(world,objects);
  const hemi=new T.HemisphereLight('#ffe2ea','#a566ce',1.23);
  const sun=new T.DirectionalLight('#ffe4cf',1.65);
  sun.position.set(-8,18,5);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-24,right:24,top:22,bottom:-22,near:1,far:55});
  sun.shadow.bias=-.00035;
  const rim=new T.DirectionalLight('#a294ff',1.75);
  rim.position.set(13,8,-20);
  scene.add(hemi,sun,rim);
  const ray=new T.Raycaster(), mouse=new T.Vector2(), hit=new T.Vector3();
  const floorPlane=new T.Plane(new T.Vector3(0,1,0),0);
  const point=new T.Vector3();
  const focus=new T.Vector3();
  const target=new T.Vector3();
  let dims={w:1,h:1};
  const resize=()=>{
    const w=Math.round(view.clientWidth),h=Math.round(view.clientHeight);
    if(!w||!h)return;
    dims={w,h};
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.45));
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(view);
  const clones=new Map(), cards=new Map(), bullets=new Map(), effects=[];
  const bulletMat=light('#fff399');
  const effectGeometry=new T.IcosahedronGeometry(.11,0);
  let hero,gate,openTag,cameraReady=false,lastOpen=false;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function release(root) {
    const mats=new Set(), geometries=new Set();
    root.traverse(o=>{
      if(!o.isMesh)return;
      const all=Array.isArray(o.material)?o.material:[o.material];
      all.forEach(m=>mats.add(m));
      if(![unit,round,hoop,cardGlow,cardBody,effectGeometry].includes(o.geometry))geometries.add(o.geometry);
    });
    for(const m of mats) {
      if([pants,shoes,kit,tooth,pupil,creamArmor,weapon,visor,teal,bulletMat].includes(m))continue;
      if(m.map&&![shadowMap,cardMap,glowMap].includes(m.map))m.map.dispose();
      m.dispose();
    }
    for(const g of geometries)g.dispose();
  }

  function load(stage) {
    release(world);release(objects);
    world.clear();objects.clear();labels.replaceChildren();
    clones.clear();cards.clear();bullets.clear();effects.length=0;
    const sector=SECTORS[stage];
    scene.background=new T.Color('#2c1a48');
    scene.fog=new T.Fog('#3b2854',33,92);
    rim.color.set(sector.fill);
    gate=environment(world,sector);
    hero=character(objects,-1);
    openTag=document.createElement('span');
    openTag.className='exit-label';
    openTag.textContent='ВЫХОД ОТКРЫТ';
    labels.append(openTag);
    cameraReady=false;lastOpen=false;
    focus.set(HERO.x,0,HERO.z);
    resize();
  }

  function at(label,x,y,z) {
    point.set(x,y,z).project(camera);
    const outside=point.z<0||point.z>1||Math.abs(point.x)>1.13||Math.abs(point.y)>.99;
    label.hidden=outside;
    if(!outside) {
      label.style.left=`${(point.x+1)*dims.w/2}px`;
      label.style.top=`${(1-point.y)*dims.h/2}px`;
    }
  }

  function anim(model,p,t,moving) {
    const a=model.group;
    a.position.set(p.x,0,p.z);
    a.rotation.y=p.angle;
    const stride=moving?Math.sin(t*10)*.65:0;
    model.legs[0].rotation.x=stride;
    model.legs[1].rotation.x=-stride;
    model.arms[0].rotation.x=-stride;
    model.arms[1].rotation.x=p.team===undefined?-1.06:-1.24+stride*.3;
    if(p.team!==undefined)model.arms[0].rotation.x=-1.15-stride*.3;
    model.head.rotation.z=moving?Math.sin(t*7)*.09:0;
    a.position.y=moving ? Math.abs(stride)*.09 : 0;
  }

  function sync(map,items,create,update) {
    const ids=new Set();
    for(const item of items) {
      ids.add(item.id);
      if(!map.has(item.id))map.set(item.id,create(item));
      update(map.get(item.id),item);
    }
    for(const [id,entry] of map) {
      if(ids.has(id))continue;
      entry.group.removeFromParent();
      entry.label?.remove();
      release(entry.group);
      map.delete(id);
    }
  }

  function spawnEffect(event) {
    if(!['pulse','card','drop','fire','hit'].includes(event.type))return;
    const color=event.team===undefined?'#ffa84b':TEAMS[event.team].color;
    const length=event.type==='pulse'?.62:event.type==='fire'?.085:.38;
    const g=new T.Group();
    g.position.set(event.x,event.type==='fire'?1.12:.32,event.z);
    const mat=new T.MeshBasicMaterial({color,transparent:true,depthWrite:false});
    if(event.type==='pulse') {
      const ring=mesh(g,hoop,mat,0,0,0);ring.rotation.x=-Math.PI/2;
    } else {
      const n=event.type==='fire'?1:event.type==='hit'?4:9;
      for(let i=0;i<n;i++) {
        const spark=mesh(g,effectGeometry,mat,0,0,0,event.type==='fire'?2:1,1,1);
        spark.userData.angle=i*2.399;
      }
    }
    objects.add(g);
    effects.push({g,mat,t:0,length,type:event.type});
  }

  function draw(run,dt,time,moving) {
    if(!gate)return;
    const p=run.player;
    const narrow=camera.aspect<.85;
    const zoom=narrow?1.16:1;
    target.set(p.x*(narrow?.98:.64),0,p.z*(narrow?.92:.64)-2.2);
    if(cameraReady) focus.lerp(target,1-Math.exp(-Math.max(dt,.012)*5));
    else {focus.copy(target);cameraReady=true;}
    camera.position.set(focus.x+(narrow?1.1:3.5),19.8*zoom,focus.z+18.2*zoom);
    camera.lookAt(focus.x,0,focus.z);
    camera.updateMatrixWorld();
    if(lastOpen!==run.open) {
      lastOpen=run.open;
      gate.edge.color.set(run.open?'#88ffad':'#ff8e5d');
      gate.gateField.visible=!run.open;
    }
    anim(hero,p,time,moving);
    if(run.shield>0&&!reduced)hero.group.visible=Math.floor(run.shield*16)%3!==0;
    else hero.group.visible=true;

    sync(clones,run.enemies,item=>{
      const model=character(objects,item.team);
      const tag=document.createElement('span');
      const team=TEAMS[item.team];
      tag.className='enemy-label';
      tag.style.setProperty('--team',team.color);
      tag.textContent=team.name.toUpperCase();
      labels.append(tag);
      return {...model,label:tag};
    },(model,item)=>{
      anim(model,item,time+item.id,item.moving);
      at(model.label,item.x,item.team===1?3.22:2.89,item.z);
    });
    sync(cards,run.cards,()=>modelCard(objects),(model,item)=>{
      model.group.position.set(item.x,0,item.z);
      const wave=reduced?0:Math.sin(time*3+item.id);
      model.card.position.y=1.17+wave*.14;
      model.card.rotation.set(-.65,.22+wave*.24,.1);
      model.glow.material.opacity=.76+wave*.17;
    });
    sync(bullets,run.bullets,()=>({group:block(objects,bulletMat,0,1.13,0,.108,.105,.98)}),(model,item)=>{
      model.group.position.set(item.x,1.13,item.z);
      model.group.rotation.y=Math.atan2(item.dx,item.dz);
    });

    for(let i=effects.length-1;i>=0;i--) {
      const e=effects[i];
      e.t+=dt;
      const fraction=e.t/e.length;
      if(fraction>=1) {
        e.g.removeFromParent();e.mat.dispose();effects.splice(i,1);continue;
      }
      e.mat.opacity=1-fraction;
      if(e.type==='pulse')e.g.scale.setScalar(.65+fraction*7.6);
      else for(const spark of e.g.children) {
        const a=spark.userData.angle,d=fraction*(e.type==='drop'?2.4:1.18);
        spark.position.set(Math.cos(a)*d,Math.sin(fraction*Math.PI)*.62,Math.sin(a)*d);
      }
    }
    if(run.open) at(openTag,EXIT.x,3.42,EXIT.z);
    else openTag.hidden=true;
    renderer.render(scene,camera);
  }

  function aim(clientX,clientY,enemies) {
    const r=renderer.domElement.getBoundingClientRect();
    const x=clientX-r.left,y=clientY-r.top;
    let best=null, threshold=26;
    for(const enemy of enemies) {
      point.set(enemy.x,1.53,enemy.z).project(camera);
      if(point.z<0||point.z>1)continue;
      const d=Math.hypot((point.x+1)*r.width/2-x,(1-point.y)*r.height/2-y);
      if(d<threshold) {threshold=d;best=enemy;}
    }
    if(best)return best;
    mouse.set(x/r.width*2-1,-(y/r.height*2-1));
    ray.setFromCamera(mouse,camera);
    const p=ray.ray.intersectPlane(floorPlane,hit);
    return p?{x:p.x,z:p.z}:null;
  }
  return {load,draw,aim,spawnEffect};
}
