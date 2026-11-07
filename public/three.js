// Variante RockChess 3: tablero 12x12, tres bandos y eliminación por mate.
export const factions=['w','b','g'];
export const layout={w:{forward:[0,-1],start:10,promo:0},b:{forward:[0,1],start:1,promo:11},g:{forward:[1,0],start:1,promo:11}};
const line=['r','n','b','q','k','b','n','r'];
export const xy=i=>[i%12,Math.floor(i/12)];
export const ix=(x,y)=>y*12+x;
export const inside=(x,y)=>x>=0&&x<12&&y>=0&&y<12;
export const pname=p=>p?.split(':')[1]||'';
export const owner=p=>p?.split(':')[0]||'';
export function initial3(){const board=Array(144).fill(null);
 for(let i=0;i<8;i++){let x=i+2,y=i+2;board[ix(x,0)]='b:'+line[i];board[ix(x,1)]='b:p';board[ix(x,11)]='w:'+line[i];board[ix(x,10)]='w:p';board[ix(0,y)]='g:'+line[i];board[ix(1,y)]='g:p';}
 return {board,turn:'w',alive:['w','b','g'],last:null,history:[],winner:null,eliminated:[],seq:0};}
function squaresFor(s,from,attack=false){const p=s.board[from];if(!p)return [];const color=owner(p),kind=pname(p),[x,y]=xy(from),out=[];
 const add=(a,b)=>{if(!inside(a,b))return false;const dest=ix(a,b),other=s.board[dest];if(!other||owner(other)!==color){if(!other||pname(other)!=='k')out.push(dest);}return !other;};
 if(kind==='p'){
  const [dx,dy]=layout[color].forward;
  if(!attack&&inside(x+dx,y+dy)&&!s.board[ix(x+dx,y+dy)]){
   out.push(ix(x+dx,y+dy));const start=color==='g'?x:y;
   if(start===layout[color].start&&inside(x+2*dx,y+2*dy)&&!s.board[ix(x+2*dx,y+2*dy)])out.push(ix(x+2*dx,y+2*dy));
  }
  for(const sign of [-1,1]){const tx=x+(dy?sign:dx),ty=y+(dx?sign:dy);if(!inside(tx,ty))continue;const idx=ix(tx,ty),q=s.board[idx];if(attack||q&&owner(q)!==color&&pname(q)!=='k')out.push(idx);}
  return out;
 }
 if(kind==='n'){for(const [dx,dy] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]])add(x+dx,y+dy);return out;}
 const dirs=[];if(['r','q','k'].includes(kind))dirs.push([1,0],[-1,0],[0,1],[0,-1]);if(['b','q','k'].includes(kind))dirs.push([1,1],[-1,-1],[1,-1],[-1,1]);
 for(const [dx,dy] of dirs){let j=1;while(inside(x+j*dx,y+j*dy)){const cont=add(x+j*dx,y+j*dy);if(!cont||kind==='k')break;j++;}}return out;
}
function isAttacked(s,square,defender){for(let i=0;i<144;i++){const p=s.board[i];if(!p||owner(p)===defender||!s.alive.includes(owner(p)))continue;
 if(squaresFor(s,i,true).includes(square))return true;
 // squaresFor doesn't return occupied kings, so detect king rays separately below
 const kind=pname(p),[x,y]=xy(i),[tx,ty]=xy(square),dx=tx-x,dy=ty-y;
 if(kind==='k'&&Math.max(Math.abs(dx),Math.abs(dy))===1)return true;
 if(kind==='n'&&[12,21].includes(10*Math.min(Math.abs(dx),Math.abs(dy))+Math.max(Math.abs(dx),Math.abs(dy))))return true;
 if(kind==='p'){const [fx,fy]=layout[owner(p)].forward;if(fy!==0&&dy===fy&&Math.abs(dx)===1)return true;if(fx!==0&&dx===fx&&Math.abs(dy)===1)return true;}
 if(['r','b','q'].includes(kind)){const orth=(dx===0||dy===0),diag=Math.abs(dx)===Math.abs(dy);if((kind==='r'&&orth||kind==='b'&&diag||kind==='q'&&(orth||diag))&&(dx!==0||dy!==0)){
 const sx=Math.sign(dx),sy=Math.sign(dy);let cx=x+sx,cy=y+sy,clear=true;while(cx!==tx||cy!==ty){if(s.board[ix(cx,cy)]){clear=false;break;}cx+=sx;cy+=sy;}if(clear)return true;
 }}
 }return false;}
export function inCheck3(s,color){const king=s.board.findIndex(p=>p===color+':k');return king>=0&&isAttacked(s,king,color);}
export function legal3(s,color=s.turn){if(!s.alive.includes(color)||s.winner)return [];const result=[];for(let f=0;f<144;f++){if(owner(s.board[f])!==color)continue;for(const to of squaresFor(s,f)){
  const clone={...s,board:s.board.slice()};clone.board[to]=clone.board[f];clone.board[f]=null;
  if(!inCheck3(clone,color))result.push({from:f,to,promotion:pname(s.board[f])==='p'&&((color==='g'?xy(to)[0]:xy(to)[1])===layout[color].promo)?'q':null});
 }}return result;}
export function apply3(s,m){if(!legal3(s).some(q=>q.from===m.from&&q.to===m.to))throw Error('Jugada ilegal');const next={...s,board:s.board.slice(),alive:[...s.alive],eliminated:[...s.eliminated],history:[...s.history],seq:s.seq+1};const piece=next.board[m.from],captured=next.board[m.to],who=owner(piece),promoted=pname(piece)==='p'&&(who==='g'?xy(m.to)[0]:xy(m.to)[1])===layout[who].promo;
 next.board[m.to]=promoted?who+':'+(['q','r','b','n'].includes(m.promotion)?m.promotion:'q'):piece;next.board[m.from]=null;
 next.last={from:m.from,to:m.to,piece:pname(piece),captured:pname(captured)||null,color:who,promotion:promoted};next.history.push(`${who.toUpperCase()}: ${m.from} → ${m.to}${captured?' ×':''}`);
 // Turnos en orden, eliminando a quien ya no puede hacer jugadas.
 let candidate=who;for(let n=0;n<3;n++){
  let nextColor=factions[(factions.indexOf(candidate)+1)%3];candidate=nextColor;if(!next.alive.includes(candidate))continue;
  next.turn=candidate;
  if(legal3(next,candidate).length)break;
  next.eliminated.push({color:candidate,reason:inCheck3(next,candidate)?'Jaque mate':'Ahogado',kingSquare:next.board.indexOf(candidate+':k')});
  next.alive=next.alive.filter(c=>c!==candidate);
  for(let j=0;j<144;j++)if(owner(next.board[j])===candidate)next.board[j]=null;
  if(next.alive.length===1){next.winner=next.alive[0];next.turn=next.winner;break;}
 }
 next.check=!next.winner&&inCheck3(next,next.turn);
 return next;
}
