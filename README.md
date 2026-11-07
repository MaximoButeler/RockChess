# RockChess V5 — Multijugador (2 y 3 jugadores)

Versión web con menú de selección de modalidad, salas privadas, movimientos por arrastre o clic y premovidas, sonidos originales, explosiones cinematográficas repetibles y sacudida del tablero.

## Modo de juego
- **2 jugadores**: ajedrez estándar en tablero 8×8, reglas validadas con chess.js.
- **3 jugadores**: variante experimental 12×12; blancas abajo, negras arriba y doradas a la izquierda. Queda eliminado quien recibe mate (o ahogado, según estas reglas adaptadas). El último jugador en pie gana. No usa enroque ni captura al paso en la variante.

## Publicar actualización en GitHub y Render
1. Descargá y descomprimí este ZIP.
2. En GitHub Desktop, cloná `MaximoButeler/RockChess` si todavía no lo hiciste.
3. Copiá **el contenido de esta carpeta** (archivos `server.js`, `package.json`, `render.yaml`, carpeta `public`, etc.) a la raíz del repositorio local. Reemplazá los archivos existentes, sin crear una carpeta adicional.
4. En GitHub Desktop: **Commit to main** y **Push origin**.
5. En Render > RockChess > Deploys, verificá que arranque el despliegue automático; si no, usá **Manual Deploy > Deploy latest commit**.
6. Cuando aparezca **Live**, abrí tu URL de Render, elegí 2 o 3 jugadores y creá sala privada. Probá con navegadores/dispositivos diferentes.

## Desarrollo local
Node.js 20+; `npm install`, después `npm start` y abrir `http://localhost:3000`.

## Limitaciones
- Los estados de partida están en memoria; si Render reinicia su servicio, las salas se pierden.
- Render gratuito puede dormir el servidor tras inactividad.
- No se verificó aquí una partida completa entre navegadores conectados.
- La versión para dos jugadores y la de tres jugadores comparten la pantalla de inicio, pero son reglas distintas.
