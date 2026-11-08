
(()=>{
 const $p=id=>document.getElementById(id);
 const overlay=$p('prankOverlay'),fill=$p('prankFill'),pct=$p('prankPercent'),logs=$p('prankLogs'),msg=$p('prankMessage');
 let tick=0,progress=0,timer=null,active=false;
 const lines=[
  'C:\\ROCKCHESS> scan --match-result=checkmate',
  '[OK] Conexión al tablero establecida',
  'C:\\ROCKCHESS> initialize --dramatic-mode',
  '[ALERTA] Rey derrotado detectado',
  'C:\\ROCKCHESS> simulate malware-download',
  '[SIMULACIÓN] Preparando paquetes de susto...',
  'C:\\ROCKCHESS> write fake-payload --target=chess-board',
  '[SIMULACIÓN] Cargando texturas tenebrosas...',
  'C:\\ROCKCHESS> activate --panic-animation',
  '[SIMULACIÓN] Generando 1000 sustos por segundo...',
  'C:\\ROCKCHESS> verify --defeated-king',
  '[OK] Jaque mate confirmado',
  'C:\\ROCKCHESS> show secret-message',
  '[FINAL] No hay virus. Solo perdiste al ajedrez :)'
 ];
 function stop(){if(timer)clearInterval(timer);timer=null;active=false;}
 function close(){stop();overlay.classList.remove('prank-on');}
 function done(){stop();progress=100;fill.style.width='100%';pct.textContent='100%';msg.textContent='Instalación finalizada. Abriendo resultado...';window.location.assign('https://www.youtube.com/shorts/TALzm8kBBRk');}
 function start(){stop();active=true;tick=0;progress=0;fill.style.width='0%';pct.textContent='0%';logs.textContent='';msg.textContent='Actividad inusual detectada después del jaque mate. Iniciando secuencia...';overlay.classList.add('prank-on');timer=setInterval(()=>{
  if(!active)return;
  tick++;
  progress=Math.min(100,progress+ (tick>45?3.5:1.8)+Math.random()*2);
  fill.style.width=progress.toFixed(1)+'%';pct.textContent=Math.floor(progress)+'%';
  if(tick%3===0){const line=lines[Math.min(lines.length-1,Math.floor(tick/3)-1)];logs.textContent+='> '+line+'\n';logs.scrollTop=logs.scrollHeight;}
  if(progress>=100 || tick>=72)done();
 },130);}
 window.triggerRockChessPrank=start;
 window.addEventListener('message',e=>{if(e.source===$p('classicFrame')?.contentWindow && e.data?.type==='rockchess-mate-prank')start();});
 $p('prankClose').addEventListener('click',close);
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('prank-on')){e.stopImmediatePropagation();close();}},true);
})();
