import {owner,pname,xy,ix,inside,legal3,inCheck3} from './three.js';
const $=id=>document.getElementById(id);
const cinemaCanvas=document.getElementById('cinematic-fx');
const cinemaCtx=cinemaCanvas.getContext('2d');
let blasts=[],flashes=[],waves=[],fxLast=performance.now(),pixelScale=1,canvasWidth=0,canvasHeight=0;
function resizeCinema(){pixelScale=Math.min(devicePixelRatio||1,2);canvasWidth=innerWidth;canvasHeight=innerHeight;cinemaCanvas.width=Math.round(canvasWidth*pixelScale);cinemaCanvas.height=Math.round(canvasHeight*pixelScale);cinemaCtx.setTransform(pixelScale,0,0,pixelScale,0,0);}
resizeCinema();addEventListener('resize',resizeCinema);
function spawnCinematicExplosion(squareIndex){
 const cell=document.querySelector(`#board [data-idx="${squareIndex}"]`);if(!cell)return;
 const r=cell.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
 const scale=Math.max(.75,Math.min(1.4,r.width/50));
 flashes.push({x,y,age:0,life:.28,r:190*scale});
 waves.push({x,y,age:0,life:.77,r:210*scale});
 waves.push({x,y,age:-.08,life:1.02,r:285*scale});
 const kinds=['fire','smoke','spark','shard'];
 for(let i=0;i<185;i++){
  const kind=i<70?0:i<116?1:i<161?2:3;
  const a=Math.random()*Math.PI*2,v=(kind===2?130+Math.random()*340:kind===1?25+Math.random()*110:80+Math.random()*250)*scale;
  blasts.push({x:x+(Math.random()-.5)*14,y:y+(Math.random()-.5)*14,vx:Math.cos(a)*v,vy:Math.sin(a)*v,kind,age:0,life:kind===1?1.2+Math.random()*1.1:kind===0?.4+Math.random()*.5:kind===2?.45+Math.random()*.7:.8+Math.random()*.7,size:(kind===1?14+Math.random()*18:kind===0?9+Math.random()*13:kind===2?1.5+Math.random()*2.5:3+Math.random()*5)*scale});
 }
 // Limit old particles under rapid consecutive captures; never disable new animations.
 if(blasts.length>1400)blasts=blasts.slice(-1400);
 if(flashes.length>12)flashes=flashes.slice(-12);
 if(waves.length>24)waves=waves.slice(-24);
 const b=document.getElementById('board');b.classList.remove('impact-shake');void b.offsetWidth;b.classList.add('impact-shake');
 setTimeout(()=>b.classList.remove('impact-shake'),480);
}
function drawCinematic(now){
 const dt=Math.max(0,Math.min((now-fxLast)/1000,.04));fxLast=now;
 if(blasts.length||flashes.length||waves.length){
  const ctx=cinemaCtx;ctx.clearRect(0,0,canvasWidth,canvasHeight);
  ctx.globalCompositeOperation='screen';
  for(const f of flashes){f.age+=dt;let t=f.age/f.life;if(t>=1)continue;let r=f.r*(.4+t*.9);
   let g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,r);g.addColorStop(0,`rgba(255,255,241,${.88*(1-t)})`);g.addColorStop(.2,`rgba(255,202,74,${.72*(1-t)})`);g.addColorStop(.52,`rgba(255,64,9,${.3*(1-t)})`);g.addColorStop(1,'rgba(255,40,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(f.x,f.y,r,0,7);ctx.fill();}
  for(const w of waves){w.age+=dt;const t=w.age/w.life;if(t<0||t>=1)continue;ctx.strokeStyle=`rgba(255,${Math.round(200-145*t)},60,${.78*(1-t)})`;ctx.lineWidth=7*(1-t)+1;ctx.beginPath();ctx.arc(w.x,w.y,w.r*Math.pow(t,.68),0,7);ctx.stroke();}
  ctx.globalCompositeOperation='source-over';
  for(const p of blasts){p.age+=dt;const t=p.age/p.life;if(t>=1)continue;p.x+=p.vx*dt;p.y+=p.vy*dt;
   if(p.kind===1){p.vy-=28*dt;p.vx*=Math.pow(.97,dt*60);}
   else {p.vy+=(p.kind===3?350:p.kind===2?120:-30)*dt;p.vx*=Math.pow(.986,dt*60);}
   ctx.save();ctx.translate(p.x,p.y);
   if(p.kind===1){const radius=p.size*(.55+t*2.2);let g=ctx.createRadialGradient(0,0,0,0,0,radius);g.addColorStop(0,`rgba(52,51,53,${.47*(1-t)})`);g.addColorStop(.55,`rgba(75,64,59,${.25*(1-t)})`);g.addColorStop(1,'rgba(36,36,40,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,radius,0,7);ctx.fill();}
   else if(p.kind===0){ctx.globalCompositeOperation='lighter';const radius=p.size*(1.1-.6*t);let g=ctx.createRadialGradient(0,0,0,0,0,radius);g.addColorStop(0,`rgba(255,252,206,${1-t})`);g.addColorStop(.25,`rgba(255,201,42,${1-t})`);g.addColorStop(.7,`rgba(255,73,10,${(1-t)*.72})`);g.addColorStop(1,'rgba(255,16,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,Math.max(.5,radius),0,7);ctx.fill();}
   else if(p.kind===2){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(255,${Math.round(160+80*(1-t))},68,${1-t})`;ctx.lineWidth=p.size;ctx.beginPath();ctx.moveTo(-p.size*4,0);ctx.lineTo(p.size*2,0);ctx.stroke();}
   else{ctx.fillStyle=`rgba(135,95,61,${1-t})`;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);}
   ctx.restore();}
  ctx.globalCompositeOperation='source-over';
  blasts=blasts.filter(p=>p.age<p.life);waves=waves.filter(w=>w.age<w.life);flashes=flashes.filter(f=>f.age<f.life);
 }else if(drawCinematic.wasActive){cinemaCtx.clearRect(0,0,canvasWidth,canvasHeight);}
 drawCinematic.wasActive=!!(blasts.length||waves.length||flashes.length);
 requestAnimationFrame(drawCinematic);
}
requestAnimationFrame(drawCinematic);

const colors={w:'Blancas',b:'Negras',g:'Doradas'};
const glyph={k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
const allSounds=['rook-move','rook-capture','knight','bishop','queen','castle','promotion','queen-captured','check-1','check-2','checkmate','pawn-1','pawn-2','explosion-1','explosion-2','explosion-3','explosion-4'];
const sounds=Object.fromEntries(allSounds.map(n=>[n,new Audio('/audio/'+n+'.mp3')]));Object.values(sounds).forEach(a=>{a.preload='auto';a.volume=.78;});
let timers=[];function audio(n){if(!$('sound').checked||!sounds[n])return;const a=sounds[n];try{a.pause();a.currentTime=0;a.play().catch(()=>{});}catch{}}
function queue(n,t=0){timers.push(setTimeout(()=>audio(n),t));}
function effects(effect,previous){if(!effect||effect.seq===previous)return;timers.forEach(clearTimeout);timers=[];
 let delay=0;const add=(s,t=390)=>{queue(s,delay);delay+=t;};
 if(effect.castle)add('castle');else if(effect.promotion)add('promotion');else if(effect.piece==='p')add('pawn-'+((effect.pawnIndex??0)+1));else if(effect.piece==='n')add('knight');else if(effect.piece==='b')add('bishop');else if(effect.piece==='r')add(effect.capture?'rook-capture':'rook-move');else if(effect.piece==='q')add('queen');
 if(effect.capture){add('explosion-'+((effect.captureIndex??0)+1),460);if(effect.capture==='q')add('queen-captured');}
 if(effect.mate)add('checkmate',500);else if(effect.check)add('check-1',450);
}
const ID='rockchess_three_user';let identity;try{identity=JSON.parse(localStorage.getItem(ID)||'null')}catch{};if(!identity||!/^[0-9a-f]{32}$/.test(identity.token||'')){identity={token:Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join(''),name:'Jugador'};localStorage.setItem(ID,JSON.stringify(identity));}
$('nick').value=identity.name==='Jugador'?'':identity.name;
let mode=2,ws=null,state=null,select=null,premove=null,drag=null,lastSeq=0,waitingPromotion=null;
function note(t){$('notice').textContent=t||'';}
function send(msg){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));else note('Sin conexión.');}
document.querySelectorAll('.mode').forEach(btn=>btn.addEventListener('click',()=>{mode=Number(btn.dataset.mode);document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b===btn));$('create').textContent=`CREAR SALA DE ${mode} JUGADORES →`;}));
$('create').onclick=async()=>{identity.name=$('nick').value.trim().slice(0,24)||'Jugador';localStorage.setItem(ID,JSON.stringify(identity));$('create').disabled=true;try{const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...identity,mode})});const json=await response.json();if(!response.ok)throw Error(json.error||'Error');location.href='/sala/'+json.code;}catch(e){alert(e.message);$('create').disabled=false;}};
$('home').onclick=()=>location.href='/';$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('copy').textContent='¡ENLACE COPIADO!';setTimeout(()=>$('copy').textContent='Copiar invitación',1400)}catch{$('invite').select();document.execCommand('copy');}};
$('cancel').onclick=()=>{premove=null;select=null;renderBoard();note('Premovida cancelada')};$('resign').onclick=()=>{if(confirm('¿Abandonar la partida?'))send({type:'resign'})};$('rematch').onclick=()=>send({type:'rematch'});$('cancelPromo').onclick=()=>{$('promotion').classList.add('hidden');waitingPromotion=null;};document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('cancel').click()}});

// Chat real por WebSocket: el servidor confirma cada envío; si no hay conexión no se borra el texto.
const chatSeen=new Set();let chatJoined=false;let pendingChats=new Map();
function chatConnection(online){
 chatJoined=online;
 $('chatInput').disabled=!online;$('chatSend').disabled=!online;
 $('chatInput').placeholder=online?'Escribí a tus amigos…':'Esperando conexión con la sala…';
 $('chatStatus').textContent=online?'● En línea':'● Desconectado';
 $('chatStatus').classList.toggle('online',online);
}
function chatFeedback(t,failed=false){$('chatFeedback').textContent=t;$('chatFeedback').classList.toggle('fail',failed);}
function addChat(item){
 if(!item||typeof item.text!=='string'||chatSeen.has(item.id))return;
 chatSeen.add(item.id);
 const row=document.createElement('div');row.className='chat-msg'+(item.role===state?.role?' mine':'');
 const author=document.createElement('div');author.className='who';
 author.textContent=(item.name||'Jugador')+(item.role==='spectator'?' · espectador':'');
 const when=document.createElement('span');when.className='when';when.textContent=new Date(item.at||Date.now()).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});author.append(when);
 const body=document.createElement('div');body.textContent=item.text;
 row.append(author,body);$('chatMessages').append(row);
 if($('chatMessages').children.length>65)$('chatMessages').children[0].remove();
 $('chatMessages').scrollTop=$('chatMessages').scrollHeight;
}
function submitRoomChat(e){
 e?.preventDefault();e?.stopPropagation();const input=$('chatInput');const value=input.value.trim();if(!value){chatFeedback('Escribí un mensaje para enviarlo.');return;}
 if(!chatJoined||ws?.readyState!==WebSocket.OPEN){chatFeedback('No hay conexión con la sala. El mensaje no se envió.',true);return;}
 const id='msg-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
 pendingChats.set(id,value);
 try{ws.send(JSON.stringify({type:'chat',text:value,clientId:id}));input.value='';chatFeedback('Enviando mensaje…');input.focus();}
 catch{pendingChats.delete(id);chatFeedback('Error al enviar. Reintentá.',true);input.value=value;}
}
$('chatForm').addEventListener('submit',submitRoomChat);
$('chatSend').addEventListener('click',submitRoomChat);
$('chatInput').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&!e.shiftKey)submitRoomChat(e);});
$('chatInput').addEventListener('pointerdown',e=>e.stopPropagation());
chatConnection(false);
let prankMateKey='';
function maybePrank(prev,data){
 if(!data||data.role==='spectator'||!data.checkmate)return;
 const defeated=data.mode===2?data.finished&&data.turn===data.role:data.eliminated?.some(x=>x.color===data.role&&x.reason==='Jaque mate');
 if(!defeated)return;
 const key=data.code+':'+data.seq+':'+data.role;
 if(key===prankMateKey)return;prankMateKey=key;
 if(!prev||prev.seq!==data.seq)setTimeout(()=>window.triggerRockChessPrank?.(),data.effects?.piece==='r'&&data.effects?.capture?2150:800);
}
const code=location.pathname.match(/^\/sala\/([a-f0-9]{16})$/)?.[1];if(code){$('lobby').classList.add('hidden');$('game').classList.remove('hidden');$('invite').value=location.href;connect();}
function connect(){chatConnection(false);let url=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';ws=new WebSocket(url);ws.onopen=()=>{$('net').textContent='● Conectado';send({type:'join',code,token:identity.token,name:identity.name});};ws.onclose=()=>{chatConnection(false);$('net').textContent='● Reconectando';chatFeedback('Chat desconectado. Si estabas escribiendo, tu texto se conserva.',true);setTimeout(connect,1700)};ws.onmessage=e=>{let data;try{data=JSON.parse(e.data)}catch{return};if(data.type==='error'){note(data.message);chatFeedback(data.message,true);return;}if(data.type==='chat_history'){chatConnection(true);$('chatMessages').replaceChildren();chatSeen.clear();for(const item of data.items||[])addChat(item);chatFeedback('Conectado a la sala. Podés enviar mensajes.');return;}if(data.type==='chat'){addChat(data.item);return;}if(data.type==='chat_ack'){if(pendingChats.has(data.clientId)){pendingChats.delete(data.clientId);chatFeedback('Mensaje enviado ✓');}return;}if(data.type!=='state')return;
 const prev=state;state=data;mode=data.mode;
 const changed=!!prev&&prev.seq!==data.seq;
 const rookCinema=changed&&data.effects?.piece==='r'&&!!data.effects?.capture;
 if(changed){if(rookCinema){timers.forEach(clearTimeout);timers=[];queue('rook-capture',160);if(data.effects.mate)queue('checkmate',2000);else if(data.effects.check)queue('check-1',1950);}
 else effects(data.effects,prev.seq);}

 render();maybePrank(prev,data);if(changed){if(rookCinema){if(!cinematicRookCapture(prev,data))blast(data.last?.to);else queue('explosion-'+((data.effects.captureIndex??0)+1),1770);}else if(data.effects?.capture)blast(data.last?.to);}if(prev&&premove&&state.turn===state.role&&state.ready&&!state.finished){const p=premove;premove=null;if(state.legal.some(m=>m.from===p.from&&m.to===p.to)){send({type:'move',...p});note('Premovida ejecutada.')}else note('Premovida cancelada: dejó de ser legal.');}
 };}
function normalize2(){const b=Array(64).fill(null),rows=state.fen.split(' ')[0].split('/');rows.forEach((row,y)=>{let x=0;for(let ch of row){if(/\d/.test(ch))x+=Number(ch);else{b[y*8+x]=(ch===ch.toUpperCase()?'w:':'b:')+ch.toLowerCase();x++}}});return b;}
const coord2=i=>'abcdefgh'[i%8]+(8-Math.floor(i/8));const index2=s=>(8-Number(s[1]))*8+'abcdefgh'.indexOf(s[0]);
function mine(p){return !!p&&owner(p)===state?.role;}function current(){return state?.turn===state?.role;}function canPlay(){return state&&!state.finished&&state.ready&&state.role!=='spectator'&&!state.eliminated?.some(e=>e.color===state.role);}
function legalTargets(from){return new Set(state.legal.filter(m=>m.from===from).map(m=>m.to));}
function choose(from,to){if(!canPlay())return;if(current()){
 const moves=state.legal.filter(m=>m.from===from&&m.to===to);if(!moves.length){note('Movimiento ilegal');return;}
 if(moves.some(m=>m.promotion)&&mode===2){promote(from,to,false);return;}send({type:'move',from,to});select=null;
 }else{premove={from,to};select=null;note('Premovida preparada');}renderBoard();}
function promote(from,to,isPre){waitingPromotion={from,to,isPre};$('promoChoices').replaceChildren();for(const t of ['q','r','b','n']){const btn=document.createElement('button');btn.textContent=glyph[t];btn.onclick=()=>{if(isPre)premove={from,to,promotion:t};else send({type:'move',from,to,promotion:t});$('promotion').classList.add('hidden');waitingPromotion=null;renderBoard();};$('promoChoices').append(btn);}$('promotion').classList.remove('hidden');}
function press(i){if(!canPlay()||waitingPromotion)return;const pieces=mode===2?normalize2():state.board,p=pieces[i];if(select!=null){if(i===select){select=null;renderBoard();return;}if(mine(p)){select=i;renderBoard();return;}const from=select;select=null;if(!current()&&mode===2&&pname(pieces[from])==='p'&&[0,7].includes(Math.floor(i/8))){promote(from,i,true);return;}choose(mode===2?coord2(from):from,mode===2?coord2(i):i);return;}if(mine(p)){select=i;renderBoard();}}
function locate(e){const el=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-idx]');return el?Number(el.dataset.idx):null;}
// Visual-only spring/inertia physics. Legal moves remain validated by the server.
let dragAnimation=null;
function dragTick(t){
 if(!drag||!drag.started||!drag.ghost){dragAnimation=null;return;}
 const d=drag;
 const dt=Math.min(.035,Math.max(.007,(t-(d.lastFrame||t-16))/1000));d.lastFrame=t;
 const tension=64,damping=13;
 const ax=(d.targetX-d.posX)*tension-d.velX*damping;
 const ay=(d.targetY-d.posY)*tension-d.velY*damping;
 d.velX+=ax*dt;d.velY+=ay*dt;d.posX+=d.velX*dt;d.posY+=d.velY*dt;
 // Moment of inertia based on the actual grabbed point (off-center grabs twist more).
 const armX=d.grabX,armY=d.grabY;
 const torque=(armX*ay-armY*ax)*.013;
 d.angularVel+=(torque-d.angle*14-d.angularVel*8)*dt;
 d.angle+=d.angularVel*dt;
 d.angle=Math.max(-40,Math.min(40,d.angle));
 d.ghost.style.left=d.posX+'px';d.ghost.style.top=d.posY+'px';
 d.ghost.style.transform=`translate(-50%,-50%) rotate(${d.angle.toFixed(2)}deg)`;
 dragAnimation=requestAnimationFrame(dragTick);
}
function down(e,i){
 if(e.button!==0)return;
 const pieces=mode===2?normalize2():state.board;
 if(!canPlay()||!mine(pieces[i]))return;
 const cell=e.currentTarget.getBoundingClientRect(),size=cell.width;
 // Grab location is measured relative to the center of the piece, not simply the cursor.
 drag={i,x:e.clientX,y:e.clientY,targetX:e.clientX,targetY:e.clientY,
  posX:e.clientX,posY:e.clientY,velX:0,velY:0,angle:0,angularVel:0,
  grabX:(e.clientX-(cell.left+cell.width/2))/Math.max(1,size/2),
  grabY:(e.clientY-(cell.top+cell.height/2))/Math.max(1,size/2),
  size,p:pieces[i],started:false,pointerId:e.pointerId};
 try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
}
function move(e){
 if(!drag||e.pointerId!==drag.pointerId)return;
 const d=drag;d.targetX=e.clientX;d.targetY=e.clientY;
 if(!d.started&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>5){
  d.started=true;d.ghost=document.createElement('div');
  d.ghost.className='piece drag-piece dynamic-piece '+owner(d.p);
  d.ghost.textContent=glyph[pname(d.p)];d.ghost.style.fontSize=(d.size*.79)+'px';
  d.ghost.style.left=d.posX+'px';d.ghost.style.top=d.posY+'px';
  document.body.append(d.ghost);
  const origin=$('board').querySelector(`[data-idx="${d.i}"] .piece`);
  if(origin)origin.style.visibility='hidden';
  dragAnimation=requestAnimationFrame(dragTick);
 }
}
function up(e){
 if(!drag||e.pointerId!==drag.pointerId)return;
 const d=drag;drag=null;
 if(d.started){
  // Find target BEFORE starting the landing animation.
  const to=locate(e);
  if(d.ghost){
   const ghost=d.ghost;const initialX=d.posX,initialY=d.posY,initialAngle=d.angle;
   const target=to!==null?$('board').querySelector(`[data-idx="${to}"]`):$('board').querySelector(`[data-idx="${d.i}"]`);
   const box=target?.getBoundingClientRect();
   if(box){
    ghost.animate([{left:initialX+'px',top:initialY+'px',transform:`translate(-50%,-50%) rotate(${initialAngle}deg)`,opacity:1},
     {left:(box.left+box.width/2)+'px',top:(box.top+box.height/2)+'px',transform:'translate(-50%,-50%) rotate(0deg)',opacity:.7}],
     {duration:280,easing:'cubic-bezier(.12,.7,.22,1)'}).onfinish=()=>ghost.remove();
    setTimeout(()=>ghost.remove(),350);
   }else ghost.remove();
  }
  if(to!==null){
   const from=mode===2?coord2(d.i):d.i,dest=mode===2?coord2(to):to;
   if(!current()&&mode===2&&pname(d.p)==='p'&&[0,7].includes(Math.floor(to/8)))promote(from,dest,true);
   else choose(from,dest);
  }else renderBoard();
 }else press(d.i);
}
// Rook captures: synced from server move events, visible to both sides.
let cinematicCapture=null;
function cinematicRookCapture(previous,next){
 const last=next.last;if(!last||last.from==null||last.to==null)return false;
 const from=next.mode===2?index2(last.from):last.from;
 const to=next.mode===2?index2(last.to):last.to;
 const fromCell=$('board').querySelector(`[data-idx="${from}"]`);
 const toCell=$('board').querySelector(`[data-idx="${to}"]`);
 if(!fromCell||!toCell)return false;
 const a=fromCell.getBoundingClientRect(),b=toCell.getBoundingClientRect();
 const old=previous.mode===2?(()=>{const rows=previous.fen.split(' ')[0].split('/'),pieces=Array(64).fill(null);rows.forEach((row,y)=>{let x=0;for(const ch of row){if(/\d/.test(ch))x+=Number(ch);else pieces[y*8+x++]=(ch===ch.toUpperCase()?'w:':'b:')+ch.toLowerCase();}});return pieces[from];})():previous.board[from];
 if(!old||pname(old)!=='r')return false;
 const destPiece=toCell.querySelector('.piece');if(destPiece)destPiece.classList.add('cinema-hidden');
 const ghost=document.createElement('div');ghost.className='piece cinema-rook '+owner(old);ghost.textContent='♜';
 ghost.style.fontSize=(b.width*.82)+'px';ghost.style.left=(a.left+a.width/2)+'px';ghost.style.top=(a.top+a.height/2)+'px';
 document.body.append(ghost);
 const duration=1800;
 const anim=ghost.animate([
 {left:(a.left+a.width/2)+'px',top:(a.top+a.height/2)+'px',transform:'translate(-50%,-50%) scale(1) rotate(-8deg)',offset:0},
 {left:(a.left+a.width/2+(b.left-a.left)*.25)+'px',top:(a.top+a.height/2+(b.top-a.top)*.25)+'px',transform:'translate(-50%,-50%) scale(1.32) rotate(-5deg)',offset:.45},
 {left:(b.left+b.width/2)+'px',top:(b.top+b.height/2)+'px',transform:'translate(-50%,-50%) scale(1.08) rotate(0deg)',offset:1}
 ],{duration,easing:'cubic-bezier(.3,.05,.35,1)',fill:'forwards'});
 const msg=document.createElement('div');msg.className='cinema-title';msg.textContent='THE ROOOOCK!';document.body.append(msg);
 setTimeout(()=>msg.classList.add('cinema-show'),80);
 const cleanup=()=>{ghost.remove();msg.remove();destPiece?.classList.remove('cinema-hidden');};
 anim.onfinish=()=>{cleanup();spawnCinematicExplosion(to);};
 setTimeout(()=>{cleanup();},duration+300);
 return true;
}
function renderBoard(){if(!state)return;const b=$('board'),multi=mode===3,n=multi?12:8,pieces=multi?state.board:normalize2();b.classList.toggle('three',multi);const flip=state.role==='b'&&mode===2;const legal=select!=null&&current()?legalTargets(multi?select:coord2(select)):new Set();b.replaceChildren();for(let r=0;r<n;r++)for(let col=0;col<n;col++){
 const x=flip?n-1-col:col,y=flip?n-1-r:r,idx=y*n+x,p=pieces[idx];const el=document.createElement('div');el.className='square '+((x+y)%2?'dark':'light');el.dataset.idx=idx;
 if(select===idx)el.classList.add('selected');if(premove&&(premove.from===(multi?idx:coord2(idx))||premove.to===(multi?idx:coord2(idx))))el.classList.add('premove');if(state.last&&(state.last.from===(multi?idx:coord2(idx))||state.last.to===(multi?idx:coord2(idx))))el.classList.add('last');if(legal.has(multi?idx:coord2(idx)))el.classList.add(p?'capture':'legal');
 if(p){const piece=document.createElement('span');piece.className='piece '+owner(p);piece.textContent=glyph[pname(p)];el.append(piece);}
 if(multi?inCheck3({board:pieces,alive:['w','b','g']},state.turn)&&p===state.turn+':k':state.check&&p===state.turn+':k')el.classList.add('checkking');
 if(col===0){const co=document.createElement('span');co.className='coord rank';co.textContent=n-y;el.append(co);}if(r===n-1){const co=document.createElement('span');co.className='coord file';co.textContent='abcdefghijkl'[x];el.append(co);}
 el.addEventListener('pointerdown',e=>down(e,idx));el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null;});el.addEventListener('contextmenu',e=>{e.preventDefault();$('cancel').click()});b.append(el);
 }
 if((mode===2&&state.finished&&state.status.includes('Jaque mate'))||(mode===3&&state.eliminated?.length)){for(const el of b.children){const idx=Number(el.dataset.idx);const p=pieces[idx];if((mode===2&&p&&pname(p)==='k'&&owner(p)===state.turn)||(mode===3&&state.eliminated?.some(e=>e.kingSquare===idx&&e.reason==='Jaque mate'))){if(!p){const ghost=document.createElement('span');ghost.className='piece b';ghost.textContent='♚';el.append(ghost);}el.classList.add('screaming');const mouth=document.createElement('span');mouth.className='king-mouth';el.append(mouth);}}}
}
function blast(dest){if(dest==null)return;const target=mode===2?index2(dest):dest;requestAnimationFrame(()=>spawnCinematicExplosion(target));}
function render(){if(!state)return;$('roomName').textContent=state.code.toUpperCase();$('modeLabel').textContent=mode===2?'DUELO CLÁSICO · 2 JUGADORES':'TRIPLE AMENAZA · 3 JUGADORES';$('role').textContent='Jugás: '+(colors[state.role]||'Espectador');$('status').textContent=state.status+(!state.ready?' · Esperando jugadores…':'');$('rematch').classList.toggle('hidden',!state.finished);$('resign').disabled=state.finished||state.role==='spectator';$('players').replaceChildren();$('seats').replaceChildren();for(const c of Object.keys(state.players)){const player=state.players[c],s=document.createElement('div');s.className='seat '+(state.turn===c?'turn ':'')+(state.eliminated?.some(x=>x.color===c)?'dead':'');s.textContent=`${c==='w'?'♔':c==='b'?'♚':'♛'} ${colors[c]} · ${player.name||'Esperando…'} ${player.online?'●':'○'}`;$('players').append(s);$('seats').append(s.cloneNode(true));}
 $('history').textContent=state.history.length?state.history.map((h,i)=>`${i+1}. ${h}`).join('\n'):'Todavía no hay jugadas.';$('history').style.whiteSpace='pre-wrap';$('variantInfo').textContent=mode===3?'Variante de 3 bandos en tablero 12×12. Peones dorados avanzan a la derecha. Sin enroque ni captura al paso en esta modalidad. Eliminación por mate o ahogado; gana quien queda en pie.':'Ajedrez clásico 8×8: todas las reglas oficiales, enroque, promoción y captura al paso.';renderBoard();}
