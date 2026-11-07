'use strict';
const $=id=>document.getElementById(id);
const glyph={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'\u265F\uFE0E'};
const paths={rook:'/audio/rook-move.mp3',capture:'/audio/rook-capture.mp3',mate:'/audio/checkmate.mp3'};
const sounds=Object.fromEntries(Object.entries(paths).map(([k,v])=>[k,new Audio(v)]));
Object.values(sounds).forEach(a=>{a.preload='auto';a.volume=.88;});
let soundUnlocked=false;
function playSound(name){if(!$('sound').checked)return;const a=sounds[name];if(!a)return;try{a.pause();a.currentTime=0;const p=a.play();if(p)p.catch(()=>{});}catch{}}
document.addEventListener('pointerdown',()=>{soundUnlocked=true;},{once:true});
const STORE='roooock_chess_multiplayer_identity';
let identity;try{identity=JSON.parse(localStorage.getItem(STORE)||'null');}catch{}
if(!identity||!/^[0-9a-f]{32}$/.test(identity.token||'')){
 identity={token:Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join(''),name:'Jugador'};
 localStorage.setItem(STORE,JSON.stringify(identity));
}
$('name').value=identity.name==='Jugador'?'':identity.name;
const code=location.pathname.match(/^\/sala\/([0-9a-f]{16})$/i)?.[1]?.toLowerCase();
let socket=null,state=null,selected=null,premove=null,drag=null,retry=null,manualClose=false,pending=null,lastSignature=null,requesting=false;
function note(s){$('notice').textContent=s||'';}
function saveName(){identity.name=($('name').value||'Jugador').trim().slice(0,24)||'Jugador';localStorage.setItem(STORE,JSON.stringify(identity));}
$('create').onclick=async()=>{saveName();$('create').disabled=true;try{const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(identity)});const data=await response.json();if(!response.ok)throw Error(data.error||'Error al crear sala');location.href='/sala/'+data.code;}catch(e){alert(e.message);$('create').disabled=false;}};
$('home').onclick=()=>{manualClose=true;socket?.close();location.href='/';};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('copy').textContent='¡Copiado!';setTimeout(()=>$('copy').textContent='Copiar enlace de invitación',1400);}catch{$('invite').select();document.execCommand('copy');}};
$('resign').onclick=()=>{if(confirm('¿Seguro que querés abandonar?'))send({type:'resign'});};
$('rematch').onclick=()=>send({type:'rematch'});
$('cancelPremove').onclick=cancelPremove;
$('cancelPromotion').onclick=()=>{pending=null;$('promotion').classList.add('hidden');};
document.addEventListener('keydown',e=>{if(e.key==='Escape')cancelPremove();});
function cancelPremove(){premove=null;selected=null;note('Premovida cancelada.');renderBoard();}
function send(x){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(x));else note('Sin conexión al servidor.');}
function parseFen(fen){const pieces={};fen.split(' ')[0].split('/').forEach((row,r)=>{let f=0;for(const ch of row){if(/\d/.test(ch))f+=+ch;else{pieces['abcdefgh'[f]+(8-r)]=ch;f++;}}});return pieces;}
const mine=(p,role)=>!!p&&role!=='spectator'&&(role==='w'?p===p.toUpperCase():p===p.toLowerCase());
function isTurn(){return state&&state.role===state.turn;}
function canInput(){return state&&!state.finished&&['w','b'].includes(state.role)&&!!state.players.b.name;}
function candidatePseudo(from,to,pieces){const p=pieces[from];if(!mine(p,state.role)||from===to)return false;const target=pieces[to];if(target&&mine(target,state.role))return false;return true;}
function submitMove(from,to,promotion){selected=null;renderBoard();send({type:'move',from,to,...(promotion?{promotion}:{})});}
function moveRequest(from,to,pieces){if(!canInput())return;
 if(isTurn()){
  const choices=state.legal.filter(m=>m.from===from&&m.to===to);
  if(!choices.length){note('Movimiento ilegal.');return;}
  if(choices.some(x=>x.promotion)){promotionDialog(from,to,false);return;}
  submitMove(from,to);return;
 }
 if(candidatePseudo(from,to,pieces)){
   // La premovida se valida en el servidor cuando regresa el turno.
   if(pieces[from].toLowerCase()==='p'&&('18'.includes(to[1])))promotionDialog(from,to,true);
   else queuePremove(from,to,undefined);
 }else note('Elegí una pieza propia y una casilla de destino.');
}
function queuePremove(from,to,promotion){premove={from,to,promotion};selected=null;note('Premovida preparada. Se ejecutará al volver tu turno si es legal.');renderBoard();}
function promotionDialog(from,to,pre){pending={from,to,pre};$('promotionChoices').replaceChildren();const white=state.role==='w';for(const p of ['q','r','b','n']){const btn=document.createElement('button');btn.textContent=glyph[white?p.toUpperCase():p];btn.title={q:'Dama',r:'Torre',b:'Alfil',n:'Caballo'}[p];btn.onclick=()=>{if(pre)queuePremove(from,to,p);else submitMove(from,to,p);pending=null;$('promotion').classList.add('hidden');};$('promotionChoices').append(btn);}$('promotion').classList.remove('hidden');}
function squarePress(sq,pieces){if(!canInput()||pending)return;
 if(selected){const from=selected;if(from===sq){selected=null;renderBoard();return;}
  if(mine(pieces[sq],state.role)){selected=sq;renderBoard();return;}
  selected=null;moveRequest(from,sq,pieces);return;
 }
 if(mine(pieces[sq],state.role)){selected=sq;renderBoard();}
}
function locateSquare(x,y){const el=document.elementFromPoint(x,y)?.closest?.('.square');return el?.dataset?.square||null;}
function onPointerDown(e,sq,pieces){if(e.button!==0||!canInput()||pending||!mine(pieces[sq],state.role))return;
 const original=e.currentTarget;drag={from:sq,x:e.clientX,y:e.clientY,started:false,piece:pieces[sq],origin:original,pointerId:e.pointerId};
 try{original.setPointerCapture(e.pointerId);}catch{}
}
function onPointerMove(e){if(!drag)return;const dist=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);
 if(!drag.started&&dist>7){drag.started=true;const ghost=document.createElement('div');ghost.className='drag-ghost '+(drag.piece===drag.piece.toUpperCase()?'white':'black');ghost.textContent=glyph[drag.piece];ghost.style.fontSize=getComputedStyle(drag.origin.querySelector('.piece')).fontSize;document.body.append(ghost);drag.ghost=ghost;drag.origin.classList.add('drag-origin');}
 if(drag.started){drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';}
}
function onPointerUp(e,pieces){if(!drag)return;const d=drag;drag=null;d.origin.classList.remove('drag-origin');d.ghost?.remove();
 if(d.started){const target=locateSquare(e.clientX,e.clientY);if(target){selected=null;moveRequest(d.from,target,pieces);}else renderBoard();}
 else squarePress(d.from,pieces);
}
function drawMateKing(pieces){if(!state?.finished||!state.status.toLowerCase().includes('jaque mate'))return;
 const loser=state.turn;const target=Object.keys(pieces).find(s=>pieces[s]===(loser==='w'?'K':'k'));
 if(!target)return;const tile=$('board').querySelector(`[data-square="${target}"]`);if(!tile)return;tile.classList.add('king-screaming');const mouth=document.createElement('span');mouth.className='king-mouth';tile.append(mouth);
}
function renderBoard(){if(!state)return;const pieces=parseFen(state.fen),flip=state.role==='b';const validTargets=new Set(state.legal.filter(m=>m.from===selected).map(m=>m.to));const board=$('board');board.replaceChildren();
 for(let vr=0;vr<8;vr++)for(let vf=0;vf<8;vf++){
  const rank=flip?vr+1:8-vr,file='abcdefgh'[flip?7-vf:vf],square=file+rank;
  const el=document.createElement('button');el.className='square '+((vf+vr)%2?'dark':'light');el.type='button';el.dataset.square=square;el.setAttribute('aria-label',square);
  if(state.lastMove&&[state.lastMove.from,state.lastMove.to].includes(square))el.classList.add('last');
  if(selected===square)el.classList.add('selected');if(premove?.from===square)el.classList.add('premove-from');if(premove?.to===square)el.classList.add('premove-to');
  if(validTargets.has(square)&&isTurn())el.classList.add(pieces[square]?'capture':'target');
  if(pieces[square]){const span=document.createElement('span');span.className='piece '+(pieces[square]===pieces[square].toUpperCase()?'white':'black');span.textContent=glyph[pieces[square]];el.append(span);}
  if(vf===0){const c=document.createElement('span');c.className='coord rank';c.textContent=rank;el.append(c);}
  if(vr===7){const c=document.createElement('span');c.className='coord file';c.textContent=file;el.append(c);}
  el.addEventListener('pointerdown',e=>onPointerDown(e,square,pieces));
  el.addEventListener('pointermove',onPointerMove);
  el.addEventListener('pointerup',e=>{if(drag)onPointerUp(e,pieces);else squarePress(square,pieces);});
  el.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null;renderBoard();});
  el.addEventListener('contextmenu',e=>{e.preventDefault();cancelPremove();});
  board.append(el);
 }
 drawMateKing(pieces);
}
function explosion(sq){const tile=$('board').querySelector(`[data-square="${sq}"]`);if(!tile)return;const board=$('board'),fx=$('fx'),a=tile.getBoundingClientRect(),b=board.getBoundingClientRect(),x=a.left-b.left+a.width/2,y=a.top-b.top+a.height/2;
 const label=document.createElement('div');label.className='impact';label.textContent='💥';label.style.left=x+'px';label.style.top=y+'px';fx.append(label);setTimeout(()=>label.remove(),750);
 for(let i=0;i<15;i++){const p=document.createElement('div');p.className='particle';p.style.left=x+'px';p.style.top=y+'px';const r=18+Math.random()*55,angle=i/15*Math.PI*2;p.style.setProperty('--dx',Math.cos(angle)*r+'px');p.style.setProperty('--dy',Math.sin(angle)*r+'px');fx.append(p);setTimeout(()=>p.remove(),760);}
}
function receiveEffects(prev,cur){const lm=cur.lastMove;if(!lm)return;const sig=`${cur.room}:${cur.history.length}:${cur.history.at(-1)}`;if(sig===lastSignature)return;lastSignature=sig;
 if(cur.history.length===0)return;
 if(lm.piece==='r')playSound(lm.captured?'capture':'rook');
 if(lm.captured==='p'||(lm.flags||'').includes('e'))setTimeout(()=>explosion(lm.to),50);
}
function render(){if(!state)return;$('lobby').classList.add('hidden');$('game').classList.remove('hidden');$('roomLabel').textContent='Sala '+state.room;$('roleLabel').textContent=state.role==='w'?'Jugás con blancas':state.role==='b'?'Jugás con negras':'Modo espectador';$('invite').value=location.href;
 const nick=c=>(state.players[c].name||'Esperando rival')+(state.players[c].online?' ●':' ○');
 $('topPlayer').textContent=(state.role==='b'?'♔ Blancas · ':'♚ Negras · ')+nick(state.role==='b'?'w':'b');$('bottomPlayer').textContent=(state.role==='b'?'♚ Negras · ':'♔ Blancas · ')+nick(state.role==='b'?'b':'w');
 $('status').textContent=!state.players.b.name?'Esperando rival: copiá y compartí el enlace.':state.status;
 $('spectators').textContent='Espectadores: '+state.spectators;$('resign').disabled=state.finished||state.role==='spectator';$('rematch').classList.toggle('hidden',!state.finished||state.role==='spectator');$('rematch').disabled=state.rematch.includes(state.role);$('rematch').textContent=state.rematch.includes(state.role)?'Esperando respuesta…':'Pedir revancha';
 $('history').replaceChildren();state.history.forEach((m,i)=>{const c=document.createElement('div');c.className='move';const n=document.createElement('span');n.textContent=(Math.floor(i/2)+1)+(i%2?'…':'.');c.append(n,document.createTextNode(m));$('history').append(c);});if(!state.history.length)$('history').textContent='Todavía no hay jugadas.';
 $('cancelPremove').disabled=!premove;renderBoard();
 $('mateBanner').classList.toggle('hidden',!state.finished||!state.status.toLowerCase().includes('jaque mate'));
}
function connect(){if(!code)return;clearTimeout(retry);$('connection').textContent='Conectando…';const scheme=location.protocol==='https:'?'wss:':'ws:';socket=new WebSocket(`${scheme}//${location.host}/ws`);
 socket.onopen=()=>{$('connection').textContent='● Conectado';send({type:'join',room:code,token:identity.token,name:identity.name});};
 socket.onmessage=event=>{let x;try{x=JSON.parse(event.data);}catch{return;}if(x.type==='error'){requesting=false;note(x.message);if(premove)premove=null;renderBoard();return;}if(x.type!=='state')return;
  const old=state,oldMate=old?.finished&&old.status.toLowerCase().includes('jaque mate');state=x;
  const fresh=old?.room!==x.room||old?.history.length>x.history.length;
  if(fresh){premove=null;lastSignature=null;requesting=false;}
  selected=null;render();
  if(old&&!fresh&&x.history.length>old.history.length)receiveEffects(old,x);
  const mate=x.finished&&x.status.toLowerCase().includes('jaque mate');if(mate&&!oldMate)playSound('mate');
  if(premove&&isTurn()&&!x.finished&&x.players.b.name){const p=premove;premove=null;const choices=x.legal.filter(m=>m.from===p.from&&m.to===p.to&&(!m.promotion||m.promotion===(p.promotion||'q')));if(choices.length){note('Premovida ejecutada.');send({type:'move',from:p.from,to:p.to,...(choices[0].promotion?{promotion:choices[0].promotion}:{})});}else note('Premovida cancelada: ya no es legal.');renderBoard();}
 };
 socket.onclose=()=>{$('connection').textContent='● Reconectando…';if(!manualClose)retry=setTimeout(connect,2200);};socket.onerror=()=>{};
}
if(code)connect();else $('connection').textContent='● Listo para crear sala';
