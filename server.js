import express from 'express';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { Chess } from 'chess.js';
import { initial3, legal3, apply3, inCheck3 } from './public/three.js';
const app=express(),server=http.createServer(app),wss=new WebSocketServer({server,path:'/ws',maxPayload:4096});
const root=path.dirname(fileURLToPath(import.meta.url)),rooms=new Map(),colors=['w','b','g'];
app.use(express.json({limit:'5kb'}));app.use(express.static(path.join(root,'public')));
const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));};
const name=x=>typeof x==='string'?x.trim().slice(0,24).replace(/[<>]/g,'')||'Jugador':'Jugador';
const tokenOK=x=>typeof x==='string'&&/^[a-f0-9]{32}$/.test(x);
const label=c=>({w:'Blancas',b:'Negras',g:'Doradas'})[c];
function status(room){if(room.mode===2){const c=room.chess;if(room.resigned)return `${label(room.resigned==='w'?'b':'w')} ganan por abandono`;if(c.isCheckmate())return `Jaque mate · ${label(c.turn()==='w'?'b':'w')} ganan`;if(c.isDraw())return 'Tablas';return `${label(c.turn())} juegan${c.isCheck()?' · JAQUE':''}`;}
const s=room.three;if(s.winner)return `${label(s.winner)} ganan · último rey en pie`;return `${label(s.turn)} juegan${s.check?' · JAQUE':''}`;}
const ended=room=>room.mode===2?!!room.resigned||room.chess.isGameOver():!!room.three.winner;
const required=room=>room.mode===2?2:3;
const ready=room=>colors.slice(0,required(room)).every(c=>!!room.players[c]);
const roleFor=(room,token)=>colors.find(c=>room.players[c]?.token===token)||'spectator';
function snapshot(room,role){const c=room.mode===2?room.chess:room.three;return {type:'state',mode:room.mode,code:room.code,role,turn:room.mode===2?c.turn():c.turn,finished:ended(room),ready:ready(room),status:status(room),players:Object.fromEntries(colors.slice(0,required(room)).map(color=>[color,{name:room.players[color]?.name||null,online:[...room.clients].some(ws=>ws.token===room.players[color]?.token&&ws.readyState===WebSocket.OPEN)}])),
 board:room.mode===3?c.board:null,fen:room.mode===2?c.fen():null,legal:!ended(room)&&ready(room)&&role===(room.mode===2?c.turn():c.turn)?room.mode===2?c.moves({verbose:true}).map(m=>({from:m.from,to:m.to,promotion:m.promotion||null})):legal3(c):[],last:room.mode===2?room.chess.history({verbose:true}).at(-1)||null:c.last,history:room.mode===2?c.history():c.history,eliminated:room.mode===3?c.eliminated:[],winner:room.mode===3?c.winner:null,check:room.mode===2?c.isCheck():c.check||false,checkmate:room.mode===2?c.isCheckmate():c.eliminated.some(x=>x.reason==='Jaque mate')||false,effects:room.effects,seq:room.seq,rematch:[...room.rematch]};}
function broadcast(room){for(const ws of room.clients)send(ws,snapshot(room,ws.role));}
function restart(room){room.chess=room.mode===2?new Chess():null;room.three=room.mode===3?initial3():null;room.resigned=null;room.effects=null;room.seq=0;room.rematch.clear();}
app.get('/api/health',(_req,res)=>res.json({ok:true}));
app.post('/api/rooms',(req,res)=>{if(!tokenOK(req.body?.token)||![2,3].includes(req.body?.mode))return res.status(400).json({error:'Datos inválidos'});const code=crypto.randomBytes(8).toString('hex');const room={code,mode:req.body.mode,players:{w:{token:req.body.token,name:name(req.body.name)},b:null,g:null},clients:new Set(),rematch:new Set(),chat:[],touched:Date.now()};restart(room);rooms.set(code,room);res.status(201).json({code});});
app.get('/sala/:code',(_req,res)=>res.sendFile(path.join(root,'public/index.html')));
wss.on('connection',ws=>{ws.isAlive=true;ws.on('pong',()=>ws.isAlive=true);ws.on('message',raw=>{let m;try{m=JSON.parse(String(raw));}catch{return send(ws,{type:'error',message:'Mensaje inválido'});}if(m.type==='join'){
 if(ws.room)return;const room=rooms.get(m.code);if(!room||!tokenOK(m.token))return send(ws,{type:'error',message:'Sala inexistente o identificación inválida'});
 if(!roleFor(room,m.token)||roleFor(room,m.token)==='spectator'){const available=colors.slice(0,required(room)).find(c=>!room.players[c]);if(available)room.players[available]={token:m.token,name:name(m.name)};}
 ws.room=room;ws.token=m.token;ws.role=roleFor(room,m.token);room.clients.add(ws);send(ws,{type:'chat_history',items:room.chat});broadcast(room);return;
 }const room=ws.room;if(!room)return send(ws,{type:'error',message:'Entrá a una sala'});room.touched=Date.now();if(m.type==='chat'){
 if(typeof m.text!=='string')return send(ws,{type:'error',message:'Mensaje inválido'});
 const value=m.text.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,300);
 if(!value)return;
 if(ws.lastChatAt && Date.now()-ws.lastChatAt<700)return send(ws,{type:'error',message:'Esperá un momento antes de escribir de nuevo'});
 ws.lastChatAt=Date.now();
 const item={id:crypto.randomBytes(6).toString('hex'),name:name(room.players[ws.role]?.name||m.name||(ws.role==='spectator'?'Espectador':'Jugador')),role:ws.role,text:value,at:Date.now()};
 room.chat.push(item);if(room.chat.length>60)room.chat.shift();
 for(const peer of room.clients)send(peer,{type:'chat',item});
 send(ws,{type:'chat_ack',clientId:typeof m.clientId==='string'?m.clientId.slice(0,80):''});return;
 }
 if(m.type==='move'){
 if(ended(room)||!ready(room)||ws.role!==(room.mode===2?room.chess.turn():room.three.turn))return send(ws,{type:'error',message:'No es tu turno o la partida está cerrada'});
 try{const oldEliminations=room.mode===3?room.three.eliminated.length:0;let move;if(room.mode===2){if(!/^[a-h][1-8]$/.test(m.from)||!/^[a-h][1-8]$/.test(m.to))throw Error('Casilla inválida');move=room.chess.move({from:m.from,to:m.to,...(m.promotion?{promotion:m.promotion}:{})});}
 else{if(!Number.isInteger(m.from)||!Number.isInteger(m.to))throw Error('Casilla inválida');room.three=apply3(room.three,m);move=room.three.last;}
 room.seq++;const capture=move.captured||null,piece=move.piece;
 room.effects={seq:room.seq,piece,capture,promotion:move.promotion||null,castle:move.flags?.includes('k')||move.flags?.includes('q')||false,check:room.mode===2?room.chess.isCheck():!!room.three.check,mate:room.mode===2?room.chess.isCheckmate():room.three.eliminated.slice(oldEliminations).some(x=>x.reason==='Jaque mate'),captureIndex:capture?crypto.randomInt(4):null,pawnIndex:piece==='p'?crypto.randomInt(2):null};
 broadcast(room);
 }catch{return send(ws,{type:'error',message:'Movimiento ilegal'});}return;}
 if(m.type==='resign'&&ws.role!=='spectator'&&!ended(room)){
 if(room.mode===2)room.resigned=ws.role;else{const s=room.three;s.eliminated.push({color:ws.role,reason:'Abandono'});s.alive=s.alive.filter(c=>c!==ws.role);for(let i=0;i<144;i++)if(s.board[i]?.startsWith(ws.role+':'))s.board[i]=null;if(s.alive.length===1)s.winner=s.alive[0];else if(s.turn===ws.role)s.turn=s.alive[0];}broadcast(room);return;}
 if(m.type==='rematch'&&ws.role!=='spectator'&&ended(room)){room.rematch.add(ws.role);if(colors.slice(0,required(room)).every(c=>room.rematch.has(c)))restart(room);broadcast(room);}
 });ws.on('close',()=>{if(ws.room){ws.room.clients.delete(ws);ws.room.touched=Date.now();broadcast(ws.room);}});ws.on('error',()=>{});});
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive)ws.terminate();else{ws.isAlive=false;ws.ping();}}for(const [code,room] of rooms)if(!room.clients.size&&Date.now()-room.touched>12*3600_000)rooms.delete(code);},30000);heartbeat.unref();
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('RockChess 2 & 3 activo'));
