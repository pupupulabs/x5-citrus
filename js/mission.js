export const HALF_X = 23, HALF_Z = 17;
export const EXIT = { x: 0, z: -14.8 };
export const HERO = { x: 0, z: 11.7 };

export const TEAMS = [
  { name: 'Бегун', color: '#ff5b75', skin: '#a3d267', speed: 4.6, hp: 1, style: 'runner' },
  { name: 'Громила', color: '#a2ec68', skin: '#b5c67a', speed: 2.65, hp: 4, style: 'heavy' },
  { name: 'Зигзаг', color: '#67a9ff', skin: '#91cfaa', speed: 3.55, hp: 2, style: 'swerve' },
  { name: 'Стайный', color: '#e193ff', skin: '#82bba0', speed: 3.2, hp: 1, style: 'pack' },
];

export const SECTORS = [
  { name: 'Зал после закрытия', accent: '#ff69aa', fill: '#9c70dc', floor: '#382b55', goal: 10,
    mission: 'Собери карты в торговом зале.', exit: 'Выход за кассами',
    shelves: [[-11,-3,7,2.3],[11,-3,7,2.3],[-11,5,7,2.3],[11,5,7,2.3],[-14,-10,4,2.1],[14,-10,4,2.1]],
    opening: [[0,-8,-.4],[2,8,-6.7]], cards: [[-4,9],[4,7],[-8,1],[7,-6],[-17,8],[17,-7],[0,-9]], cadence: 2.05, teams: [0,2,1,3,2,0] },
  { name: 'Холодный склад', accent: '#54eada', fill: '#447ae7', floor: '#283e64', goal: 15,
    mission: 'Собери карты между стеллажами. Зомби заходят с флангов.', exit: 'Шлюз в конце склада',
    shelves: [[-10,-5,2.6,9],[10,-5,2.6,9],[-10,7,2.6,6],[10,7,2.6,6],[0,-2,4,2]],
    opening: [[2,-5,-7],[3,4,-8]], cards: [[-4,11],[4,8],[-15,10],[16,3],[-6,-7],[6,-10],[16,-12],[-15,-10]], cadence: 1.65, teams: [2,3,0,2,1,3] },
  { name: 'Последняя касса', accent: '#ffa24d', fill: '#eb70a1', floor: '#4c2c48', goal: 20,
    mission: 'Финальная волна. Заряжай импульс картами и держи проход к выходу.', exit: 'Ворота эвакуации',
    shelves: [[-11,-8,8,2.5],[11,-8,8,2.5],[-12,7,5,2.1],[12,7,5,2.1],[-5,0,3.6,2.2],[5,0,3.6,2.2]],
    opening: [[1,0,-6],[0,-5,6],[3,6,4]], cards: [[-3,8],[3,8],[0,3],[-10,12],[13,11],[-17,-4],[16,-3],[-5,-11],[5,-11]], cadence: 1.23, teams: [3,1,0,2,3,0] },
];

export const MAX_HP = 5;
export const CHARGE = 3;
const heroRadius = .52;
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const clamp = (x,lo,hi) => Math.max(lo,Math.min(hi,x));
const pads = [[-21,-13],[21,10],[21,-13],[-21,12],[-17,-15],[17,15],[18,-15],[-18,15]];

export function blocked(sector,x,z,radius) {
  return Math.abs(x)>HALF_X-radius || Math.abs(z)>HALF_Z-radius ||
    sector.shelves.some(([sx,sz,w,d])=>Math.abs(x-sx)<w/2+radius && Math.abs(z-sz)<d/2+radius);
}

function move(sector,item,dx,dz,radius) {
  if (!blocked(sector,item.x+dx,item.z,radius)) item.x+=dx;
  if (!blocked(sector,item.x,item.z+dz,radius)) item.z+=dz;
}

export function createRun() {
  return { stage:0, total:0, score:0, bestChain:1, hp:MAX_HP, charge:0, id:0 };
}

export function setup(run) {
  Object.assign(run,{
    player: { ...HERO, angle:Math.PI },
    count:0, time:0, chain:1, chainTimer:0, cooldown:0, shield:0, open:false,
    nextWave:1.3, wave:0, pathAt:0, cards:[], enemies:[], bullets:[], events:[],
  });
  const sector=SECTORS[run.stage];
  for (const [x,z] of sector.cards) run.cards.push({ id:++run.id,x,z });
  for (const [team,x,z] of sector.opening) addEnemy(run,team,x,z);
}

function spawn(run,teamIndex,offset=0) {
  const [x,z]=pads[(run.wave+offset)%pads.length];
  addEnemy(run,teamIndex,x,z);
}

function addEnemy(run,teamIndex,x,z) {
  const team=TEAMS[teamIndex];
  const angle=Math.atan2(run.player.x-x,run.player.z-z);
  run.enemies.push({ id:++run.id,x,z,team:teamIndex,hp:team.hp,angle,stun:0,moving:false });
}

const gridW=46,gridH=34;
function paths(sector,player) {
  const field=new Int16Array(gridW*gridH).fill(-1);
  const origin=gridId(player.x,player.z);
  const queue=[origin];
  field[origin]=0;
  for(let i=0;i<queue.length;i++) {
    const cell=queue[i], x=cell%gridW, z=Math.floor(cell/gridW);
    for (const [nx,nz] of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]]) {
      const next=nz*gridW+nx;
      if (nx<0||nz<0||nx>=gridW||nz>=gridH||field[next]>=0) continue;
      if (blocked(sector,nx-HALF_X+.5,nz-HALF_Z+.5,.55)) continue;
      field[next]=field[cell]+1;
      queue.push(next);
    }
  }
  return field;
}
function gridId(x,z) { return Math.floor(z+HALF_Z)*gridW+Math.floor(x+HALF_X); }
function follow(run,sector,enemy) {
  const player=run.player;
  const dx=player.x-enemy.x,dz=player.z-enemy.z;
  const span=Math.ceil(Math.hypot(dx,dz)/1.1);
  let direct=true;
  for(let i=1;i<span;i++) {
    if (blocked(sector,enemy.x+dx*i/span,enemy.z+dz*i/span,.56)) { direct=false; break; }
  }
  if (direct) return Math.atan2(dx,dz);
  const cell=gridId(enemy.x,enemy.z);
  const cx=cell%gridW,cz=Math.floor(cell/gridW);
  let best=cell, lowest=run.path[cell]<0?Infinity:run.path[cell];
  for(const [nx,nz] of [[cx-1,cz],[cx+1,cz],[cx,cz-1],[cx,cz+1]]) {
    if(nx<0||nz<0||nx>=gridW||nz>=gridH) continue;
    const candidate=nz*gridW+nx;
    if (run.path[candidate]>=0 && run.path[candidate]<lowest) { best=candidate; lowest=run.path[candidate]; }
  }
  const tx=best%gridW-HALF_X+.5,tz=Math.floor(best/gridW)-HALF_Z+.5;
  return Math.atan2(tx-enemy.x,tz-enemy.z);
}

export function fire(run,target) {
  if (run.cooldown>0) return false;
  const p=run.player;
  if (target) p.angle=Math.atan2(target.x-p.x,target.z-p.z);
  const dx=Math.sin(p.angle), dz=Math.cos(p.angle);
  run.bullets.push({id:++run.id,x:p.x+dx*.77,z:p.z+dz*.77,dx,dz,life:.68});
  run.cooldown=.165;
  run.events.push({type:'fire',x:p.x+dx*.89,z:p.z+dz*.89});
  return true;
}

function hurt(run,enemy,amount) {
  enemy.hp-=amount;
  run.events.push({type:'hit',x:enemy.x,z:enemy.z,team:enemy.team});
  if (enemy.hp>0) return;
  run.cards.push({id:++run.id,x:enemy.x,z:enemy.z});
  run.events.push({type:'drop',x:enemy.x,z:enemy.z,team:enemy.team});
}

export function pulse(run) {
  if(run.charge<CHARGE) return false;
  run.charge=0;
  run.shield=Math.max(run.shield,.65);
  run.events.push({type:'pulse',x:run.player.x,z:run.player.z});
  const sector=SECTORS[run.stage];
  for(const enemy of run.enemies) {
    if(distance(enemy,run.player)>7) continue;
    hurt(run,enemy,2);
    const angle=Math.atan2(enemy.x-run.player.x,enemy.z-run.player.z);
    move(sector,enemy,Math.sin(angle)*.7,Math.cos(angle)*.7,.5);
    enemy.stun=1.45;
  }
  for(const card of run.cards) if(distance(card,run.player)<=9) card.magnet=true;
  return true;
}

export function tick(run,dt,input) {
  const sector=SECTORS[run.stage], p=run.player;
  run.time+=dt;
  run.shield=Math.max(0,run.shield-dt);
  run.cooldown=Math.max(0,run.cooldown-dt);
  run.chainTimer=Math.max(0,run.chainTimer-dt);
  if(!run.chainTimer) run.chain=1;
  const length=Math.hypot(input.x,input.z);
  if(length) {
    move(sector,p,input.x/Math.max(1,length)*8.2*dt,input.z/Math.max(1,length)*8.2*dt,heroRadius);
    if(!input.aim) p.angle=Math.atan2(input.x,input.z);
  }
  if(input.aim) p.angle=Math.atan2(input.aim.x-p.x,input.aim.z-p.z);
  if(input.fire && run.cooldown===0) {
    let target=input.aim;
    if(!target) {
      let closest=Infinity;
      for(const enemy of run.enemies) {
        if(enemy.hp<=0) continue;
        const d=distance(p,enemy);
        if(d>=closest || obstructed(sector,p,enemy)) continue;
        closest=d;
        target=enemy;
      }
    }
    fire(run,target);
  }

  if(run.time>=run.nextWave) {
    if(run.enemies.length<21) {
      const teamIndex=sector.teams[run.wave%sector.teams.length];
      spawn(run,teamIndex);
      if(teamIndex===3) spawn(run,teamIndex,3);
      run.wave++;
    }
    run.nextWave=run.time+sector.cadence*(run.open?.73:1);
  }

  const bulletSpeed=41;
  for(const bullet of run.bullets) {
    const length=bulletSpeed*dt;
    for(let d=0;d<length;d+=.26) {
      const step=Math.min(.26,length-d);
      bullet.x+=bullet.dx*step;
      bullet.z+=bullet.dz*step;
      if(blocked(sector,bullet.x,bullet.z,.05)) { bullet.life=0; break; }
      const enemy=run.enemies.find(item=>item.hp>0&&distance(bullet,item)<(item.team===1?.83:.63));
      if(enemy) { hurt(run,enemy,1); bullet.life=0; break; }
    }
    bullet.life-=dt;
  }
  run.bullets=run.bullets.filter(b=>b.life>0);
  run.enemies=run.enemies.filter(e=>e.hp>0);

  if(run.time>=run.pathAt) { run.path=paths(sector,p); run.pathAt=run.time+.25; }
  for(const enemy of run.enemies) {
    enemy.stun=Math.max(0,enemy.stun-dt);
    enemy.moving=enemy.stun===0;
    if(enemy.moving) {
      const dir=follow(run,sector,enemy);
      const sway=enemy.team===2 ? Math.sin(run.time*6+enemy.id)*.38 : 0;
      enemy.angle=dir;
      const speed=TEAMS[enemy.team].speed*(run.open?1.14:1)*dt;
      move(sector,enemy,Math.sin(dir+sway)*speed,Math.cos(dir+sway)*speed,.51);
      // Give clustered zombies separate silhouettes and approach paths.
      for(const other of run.enemies) {
        if(other===enemy) continue;
        const gap=distance(enemy,other);
        if(gap>.001&&gap<.95) move(sector,enemy,(enemy.x-other.x)*dt*2,(enemy.z-other.z)*dt*2,.49);
      }
    }
    if(run.shield===0 && distance(enemy,p)<1.08) {
      run.hp--;
      run.shield=1.25;
      run.events.push({type:'damage',x:p.x,z:p.z});
    }
  }
  let chainCollected=false;
  run.cards=run.cards.filter(card=>{
    const d=distance(card,p);
    if(d>1.06) {
      if(card.magnet) {
        const pull=Math.min(1,dt*9);
        card.x+=(p.x-card.x)*pull;
        card.z+=(p.z-card.z)*pull;
      }
      return true;
    }
    run.chain=run.chainTimer?Math.min(5,run.chain+1):1;
    run.bestChain=Math.max(run.bestChain,run.chain);
    run.chainTimer=3.2;
    run.count++; run.total++; run.score+=run.chain*100;
    run.charge=Math.min(CHARGE,run.charge+1);
    chainCollected=true;
    run.events.push({type:'card',x:card.x,z:card.z,chain:run.chain});
    return false;
  });
  if(!run.open && chainCollected && run.count>=sector.goal) {
    run.open=true;
    run.events.push({type:'open'});
  }
  if(run.hp<=0) return 'lost';
  if(run.open && distance(p,EXIT)<1.65) return run.stage===SECTORS.length-1?'won':'sector';
  return 'playing';
}

function obstructed(sector,from,to) {
  const steps=Math.ceil(distance(from,to)/.8);
  for(let i=1;i<steps;i++) {
    const k=i/steps;
    if(blocked(sector,from.x+(to.x-from.x)*k,from.z+(to.z-from.z)*k,.06)) return true;
  }
  return false;
}
