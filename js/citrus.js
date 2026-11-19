import { MAX_HP, CHARGE, SECTORS, createRun, setup, fire as shoot, pulse, tick } from './mission.js?v=zombie-types';
import { buildView } from './store.js?v=apelsin';
import { loadCardArtwork } from './card-art.js';

const $=id=>document.getElementById(id);
const dialog=$('dialog');
const stage=$('game');
const controls=new Set();
const buttons=new Set();
const moves=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
const soundKey='x5-citrus-3d-sound';
const recordKey='x5-citrus-3d-record';
const chant=[110,0,110,130.81,0,98,110,0,146.83,0,130.81,110,0,98,82.41,98];
const script=[
  '02:13. В кассовом зале погас свет, но погоня только началась.',
  '03:46. Холодильники гудят. Из-за стеллажей уже идут новые зомби.',
  '05:22. Успей к эвакуации и не оставь карты на последней кассе.',
];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let game, visual, audio, joy, pointer, mode='cover', dialogMode='help';
let muted=false, record=0, flash=0, toast=0, scoreTime=0, beat=0;
let previous=null, time=0;
try {
  muted=localStorage.getItem(soundKey)==='off';
  record=Number(localStorage.getItem(recordKey))||0;
} catch { /* Приватный режим. */ }

function startAudio() {
  try {
    audio??=new AudioContext();
    audio.resume().catch(()=>{});
  } catch { /* Игра доступна без звука. */ }
}

function tone(from,to,duration,volume=.04,type='triangle') {
  if(muted||audio?.state!=='running')return;
  const v=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;
  v.type=type;
  v.frequency.setValueAtTime(from,now);
  v.frequency.exponentialRampToValueAtTime(to,now+duration);
  g.gain.setValueAtTime(.001,now);
  g.gain.exponentialRampToValueAtTime(volume,now+.008);
  g.gain.exponentialRampToValueAtTime(.001,now+duration);
  v.connect(g).connect(audio.destination);
  v.start(now);v.stop(now+duration);
}
function audioBeat(dt) {
  scoreTime+=dt;
  const step=Math.floor(scoreTime/.19);
  if(step===beat)return;
  beat=step;
  const note=chant[step%chant.length];
  if(note)tone(note,note*.99,.19,.017,'triangle');
  if(step%4===0)tone(59,39,.15,.024,'sine');
}
function syncSound() {
  $('sound').textContent=muted?'Звук выкл.':'Звук вкл.';
  $('sound').setAttribute('aria-pressed',String(!muted));
}
function clearInputs() {
  controls.clear();buttons.clear();
  pointer=null;joy=null;
  $('joystick').hidden=true;
}
function hint(text,seconds=1.6) {
  $('toast').textContent=text;
  $('toast').hidden=false;
  toast=seconds;
}
function hud() {
  const sector=SECTORS[game.stage];
  $('chapter').textContent=`СЕКТОР ${game.stage+1} / ${SECTORS.length}`;
  $('district').textContent=sector.name;
  $('cards').textContent=`${game.count} / ${sector.goal}`;
  $('progress').max=sector.goal;
  $('progress').value=game.count;
  $('armor').textContent='◆'.repeat(Math.max(0,game.hp))+'◇'.repeat(MAX_HP-Math.max(0,game.hp));
  $('armor').setAttribute('aria-label',`Броня ${game.hp} из ${MAX_HP}`);
  $('combo').textContent=`×${game.chain}`;
  $('energy').textContent=`${game.charge}/${CHARGE}`;
  $('pulse').disabled=mode!=='playing'||game.charge<CHARGE;
  const text=game.open?`Выход открыт · ${sector.exit} в дальней стене.`:sector.mission;
  if($('objective').textContent!==text)$('objective').textContent=text;
}
function showDialog(kind,eyebrow,title,text,next,home=true) {
  dialogMode=kind;
  $('dialog-eyebrow').textContent=eyebrow;
  $('dialog-title').textContent=title;
  $('dialog-text').textContent=text;
  $('dialog-text').hidden=!text;
  $('help-items').hidden=kind!=='help';
  $('next').textContent=next;
  $('home').hidden=!home;
  if(!dialog.open)dialog.showModal();
}
async function load() {
  const isNew=!visual;
  mode='loading';
  $('cover').hidden=true;
  stage.hidden=false;
  try {
    if(!visual) {
      const artwork=await loadCardArtwork();
      const icon=$('card-artwork');
      icon.src=artwork.toDataURL();
      visual=buildView($('view'),$('labels'),artwork);
    }
    visual.load(game.stage);
  } catch(error) {
    console.error(error);
    stage.hidden=true;
    $('cover').hidden=false;
    mode='cover';
    showDialog('error','ГРАФИКА','Не удалось открыть 3D-сцену',
      'Для этой версии нужен браузер с WebGL 2 и включённым аппаратным ускорением.','Закрыть',false);
    return false;
  }
  mode='playing';
  $('pause').hidden=false;
  flash=0;
  $('damage').style.opacity='0';
  clearInputs();
  hud();
  visual.draw(game,0,time,false);
  hint(script[game.stage],2.5);
  if(isNew)tone(220,440,.32,.05);
  return true;
}
function launch() {
  if(mode==='loading')return;
  startAudio();
  game=createRun();
  setup(game);
  load();
}
function goHome() {
  if(dialog.open)dialog.close();
  clearInputs();
  mode='cover';
  stage.hidden=true;
  $('cover').hidden=false;
  $('pause').hidden=true;
  $('launch').focus();
}
function pause() {
  if(mode!=='playing')return;
  mode='paused';
  clearInputs();
  showDialog('paused',SECTORS[game.stage].name,'Пауза',`Собрано карт «Апельсин»: ${game.total}`,'Продолжить');
  hud();
}
function resume() {
  mode='playing';
  dialog.close();
  hud();
}
function finish(status) {
  mode=status;
  clearInputs();
  $('pause').hidden=true;
  if(status==='sector') {
    hud();
    showDialog(status,'СЕКТОР ПРОЙДЕН','Карты спасены',`Следующая остановка — «${SECTORS[game.stage+1].name}». Перед входом восстановится одно деление брони.`,'На следующий сектор');
    return;
  }
  if(status==='won'&&game.score>record) {
    record=game.score;
    try {localStorage.setItem(recordKey,String(record));} catch {}
  }
  const result=`Карты: ${game.total} · Лучшая цепочка: ×${game.bestChain} · Очки: ${game.score}${record?' · Рекорд: '+record:''}`;
  showDialog(status,status==='won'?'05:59 · ЭВАКУАЦИЯ':'ОПЕРАЦИЯ ПРЕРВАНА',status==='won'?'Мы успели до рассвета':'Броня пробита',result,'Новая попытка');
  hud();
}
function usePulse() {
  if(mode==='playing'&&pulse(game))hud();
}

$('launch').addEventListener('click',launch);
$('help').addEventListener('click',()=>showDialog('help','УПРАВЛЕНИЕ','Как играть','','Понятно',false));
$('pause').addEventListener('click',pause);
$('home').addEventListener('click',goHome);
$('pulse').addEventListener('click',usePulse);
$('sound').addEventListener('click',()=>{
  muted=!muted;
  if(!muted)startAudio();
  try {localStorage.setItem(soundKey,muted?'off':'on');} catch {}
  syncSound();
});
$('next').addEventListener('click',()=>{
  if(dialogMode==='paused') {resume();return;}
  dialog.close();
  if(dialogMode==='help'||dialogMode==='error')return;
  if(dialogMode==='sector') {
    game.stage++;
    game.hp=Math.min(MAX_HP,game.hp+1);
    setup(game);
    load();
  } else launch();
});
dialog.addEventListener('cancel',event=>{
  event.preventDefault();
  if(dialogMode==='paused')resume();
  else if(dialogMode==='help'||dialogMode==='error')dialog.close();
});
window.addEventListener('keydown',event=>{
  if(mode!=='playing')return;
  const k=event.code;
  if(!moves.has(k)&&!['Space','KeyE','Escape','KeyP'].includes(k))return;
  event.preventDefault();
  if(moves.has(k)||k==='Space')controls.add(k);
  else if(!event.repeat) {
    if(k==='KeyE')usePulse();else pause();
  }
});
window.addEventListener('keyup',event=>controls.delete(event.code));
window.addEventListener('blur',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});

const view=$('view'),fire=$('fire');
view.addEventListener('pointerdown',event=>{
  if(mode!=='playing'||event.button!==0)return;
  if(event.pointerType==='touch') {
    const rect=view.getBoundingClientRect();
    if(event.clientX-rect.left>rect.width*.65||joy)return;
    joy={id:event.pointerId,x:event.clientX,z:event.clientY,dx:0,dz:0};
    const stick=$('joystick');
    stick.style.left=`${event.clientX-rect.left}px`;
    stick.style.top=`${event.clientY-rect.top}px`;
    stick.firstElementChild.style.transform='';
    stick.hidden=false;
  } else {
    pointer={x:event.clientX,y:event.clientY};
    buttons.add(event.pointerId);
    shoot(game,visual.aim(pointer.x,pointer.y,game.enemies));
  }
  view.setPointerCapture(event.pointerId);
});
view.addEventListener('pointermove',event=>{
  if(mode!=='playing')return;
  if(event.pointerType==='touch') {
    if(joy?.id!==event.pointerId)return;
    const dx=event.clientX-joy.x,dz=event.clientY-joy.z;
    const norm=Math.max(38,Math.hypot(dx,dz));
    joy.dx=dx/norm;joy.dz=dz/norm;
    $('joystick').firstElementChild.style.transform=`translate(${29*joy.dx}px,${29*joy.dz}px)`;
  } else pointer={x:event.clientX,y:event.clientY};
});
function release(event) {
  if(joy?.id===event.pointerId) {joy=null;$('joystick').hidden=true;}
  buttons.delete(event.pointerId);
}
for(const name of ['pointerup','pointercancel','lostpointercapture']) {
  view.addEventListener(name,release);
  fire.addEventListener(name,release);
}
fire.addEventListener('pointerdown',event=>{
  if(mode!=='playing'||event.button!==0)return;
  event.preventDefault();
  pointer=null;
  buttons.add(event.pointerId);
  fire.setPointerCapture(event.pointerId);
});

function handleEvents() {
  for(const event of game.events) {
    visual.spawnEffect(event);
    switch(event.type) {
      case 'fire': tone(250,89,.08,.026);break;
      case 'damage': flash=1;tone(132,42,.23,.08,'sine');break;
      case 'drop': tone(103,58,.16,.045);break;
      case 'card':
        tone(410*1.12**event.chain,745*1.1**event.chain,.14,.055,'sine');
        if(event.chain>1&&!game.open)hint(`Карта · Цепочка ×${event.chain}`,.9);
        break;
      case 'pulse': tone(86,469,.45,.09,'sine');hint('Цитрус-импульс',1.1);break;
      case 'open': tone(480,960,.46,.055);hint('Ворота открыты. К эвакуации!',3.3);break;
    }
  }
  game.events.length=0;
}
const down=(...codes)=>codes.some(code=>controls.has(code));
function frame(now) {
  const dt=previous===null?0:Math.min(.038,(now-previous)/1000);
  previous=now;
  if(mode==='playing') {
    if(!reduceMotion)time+=dt;
    const x=joy?.dx??(Number(down('KeyD','ArrowRight'))-Number(down('KeyA','ArrowLeft')));
    const z=joy?.dz??(Number(down('KeyS','ArrowDown'))-Number(down('KeyW','ArrowUp')));
    const aim=pointer&&(!controls.has('Space')||buttons.size)
      ?visual.aim(pointer.x,pointer.y,game.enemies):null;
    const status=tick(game,dt,{x,z,aim,fire:controls.has('Space')||buttons.size>0});
    handleEvents();
    flash=Math.max(0,flash-dt*3.8);
    $('damage').style.opacity=String(flash*.8);
    toast=Math.max(0,toast-dt);
    $('toast').hidden=toast===0;
    hud();
    audioBeat(dt);
    visual.draw(game,dt,time,Math.hypot(x,z)>.05);
    if(status!=='playing')finish(status);
  }
  requestAnimationFrame(frame);
}
syncSound();
requestAnimationFrame(frame);
