import express from 'express';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { Chess } from 'chess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '8kb' }));
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8 * 1024 });
const rooms = new Map();
const TOKEN_RE = /^[a-f0-9]{32}$/;
const ROOM_RE = /^[a-f0-9]{16}$/;
const now = () => Date.now();
const send = (ws, obj) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); };
const tokenOK = x => typeof x === 'string' && TOKEN_RE.test(x);
const sanitizeName = x => typeof x === 'string' ? x.trim().slice(0, 24).replace(/[<>]/g, '') || 'Jugador' : 'Jugador';
const roomOf = code => rooms.get(code?.toLowerCase());
const statusOf = room => {
  const chess = room.chess;
  if (room.resigned) return `${room.resigned === 'w' ? 'Negras' : 'Blancas'} ganan por abandono`;
  if (chess.isCheckmate()) return `Jaque mate · ganan ${chess.turn() === 'w' ? 'negras' : 'blancas'}`;
  if (chess.isStalemate()) return 'Tablas por ahogado';
  if (chess.isThreefoldRepetition()) return 'Tablas por repetición';
  if (chess.isInsufficientMaterial()) return 'Tablas por material insuficiente';
  if (chess.isDraw()) return 'Tablas';
  return `${chess.turn() === 'w' ? 'Blancas' : 'Negras'} juegan${chess.isCheck() ? ' · jaque' : ''}`;
};
const finished = room => Boolean(room.resigned) || room.chess.isGameOver();
function roleFor(room, token) {
  if (room.players.w?.token === token) return 'w';
  if (room.players.b?.token === token) return 'b';
  return 'spectator';
}
function snapshot(room, role) {
  const moves = !finished(room) && room.chess.turn() === role
    ? room.chess.moves({ verbose: true }).map(m => ({ from: m.from, to: m.to, promotion: m.promotion || null }))
    : [];
  return {
    type: 'state', room: room.code, role, fen: room.chess.fen(),
    turn: room.chess.turn(), status: statusOf(room), finished: finished(room),
    players: Object.fromEntries(['w','b'].map(c => [c, {
      name: room.players[c]?.name || null,
      online: !!room.players[c] && [...room.clients].some(ws => ws.readyState === WebSocket.OPEN && ws.token === room.players[c].token)
    }])),
    history: room.chess.history(), legal: moves,
    lastMove: room.chess.history({ verbose: true }).at(-1) || null,
    rematch: [...room.rematch], spectators: [...room.clients].filter(ws => ws.role === 'spectator').length
  };
}
function broadcast(room) { for (const ws of room.clients) send(ws, snapshot(room, ws.role)); }
function error(ws, message) { send(ws, { type: 'error', message }); }

app.post('/api/rooms', (req, res) => {
  const { token, name } = req.body || {};
  if (!tokenOK(token)) return res.status(400).json({ error: 'Identificador de jugador inválido.' });
  const code = crypto.randomBytes(8).toString('hex');
  rooms.set(code, { code, chess: new Chess(), players: { w: { token, name: sanitizeName(name) }, b: null }, clients: new Set(), rematch: new Set(), resigned: null, touched: now() });
  res.status(201).json({ code });
});
app.get('/api/health', (_req,res) => res.json({ ok: true }));
app.get('/sala/:code', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(String(raw)); } catch { return error(ws, 'Mensaje inválido.'); }
    if (msg.type === 'join') {
      if (ws.room) return error(ws, 'Ya te conectaste a una sala.');
      const room = roomOf(msg.room);
      if (!room) return error(ws, 'La sala no existe o el servidor se reinició. Creá una sala nueva.');
      if (!tokenOK(msg.token)) return error(ws, 'Identificador de jugador inválido.');
      if (!room.players.b && room.players.w.token !== msg.token) room.players.b = { token: msg.token, name: sanitizeName(msg.name) };
      ws.token = msg.token; ws.room = room; ws.role = roleFor(room, msg.token);
      room.clients.add(ws); room.touched = now(); broadcast(room);
      return;
    }
    const room = ws.room;
    if (!room) return error(ws, 'Primero tenés que entrar a una sala.');
    room.touched = now();
    if (msg.type === 'move') {
      if (finished(room)) return error(ws, 'La partida ya terminó.');
      if (!room.players.b) return error(ws, 'Esperá a que entre tu rival.');
      if (ws.role !== room.chess.turn()) return error(ws, 'No es tu turno.');
      if (!/^[a-h][1-8]$/.test(msg.from) || !/^[a-h][1-8]$/.test(msg.to)) return error(ws, 'Casillas inválidas.');
      if (msg.promotion != null && !['q','r','b','n'].includes(msg.promotion)) return error(ws, 'Promoción inválida.');
      try { room.chess.move({ from: msg.from, to: msg.to, ...(msg.promotion ? { promotion: msg.promotion } : {}) }); }
      catch { return error(ws, 'Movimiento ilegal.'); }
      room.rematch.clear(); broadcast(room); return;
    }
    if (msg.type === 'resign') {
      if (!['w','b'].includes(ws.role) || finished(room)) return error(ws, 'No podés abandonar esta partida.');
      room.resigned = ws.role; broadcast(room); return;
    }
    if (msg.type === 'rematch') {
      if (!['w','b'].includes(ws.role) || !room.players.b || !finished(room)) return error(ws, 'La revancha no está disponible todavía.');
      room.rematch.add(ws.role);
      if (room.rematch.has('w') && room.rematch.has('b')) {
        room.chess = new Chess(); room.resigned = null; room.rematch.clear();
      }
      broadcast(room); return;
    }
  });
  ws.on('close', () => { const room = ws.room; if (room) {room.clients.delete(ws);room.touched = now();broadcast(room);} });
  ws.on('error', () => {});
});
const keepalive = setInterval(() => {
  for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); }
  for (const [code, room] of rooms) if (!room.clients.size && now()-room.touched > 12*60*60*1000) rooms.delete(code);
}, 30_000);
keepalive.unref();
const port = Number(process.env.PORT) || 3000;
server.listen(port, '0.0.0.0', () => console.log(`Ajedrez Amigos en http://localhost:${port}`));
