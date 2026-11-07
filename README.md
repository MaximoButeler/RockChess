# THE ROOOOCK! CHESS — Multijugador online

Ajedrez entre dos jugadores por una sala privada enlazada, con tablero para arrastrar o hacer clic, premovidas, capturas de peones con partículas, efectos de torre y rey con boca animada y grito al recibir jaque mate.

## Requisitos

- Node.js 20 o superior
- Acceso a Internet **solo para instalar dependencias y publicar** (una vez publicado, los jugadores acceden desde su navegador)

## Probar desde tu PC

1. Descomprimí el ZIP.
2. Abrí una terminal en la carpeta `roooock_multijugador`.
3. Ejecutá `npm install`.
4. Ejecutá `npm start`.
5. Abrí http://localhost:3000.
6. Presioná «Crear partida privada». Para probar la otra persona, abrí el enlace desde otro navegador o ventana privada (con una identidad distinta). Desde el mismo navegador y perfil, se recuperará la misma identidad, no una segunda cuenta.

## Para mandar un enlace a tus amigos (Render)

Se requiere publicar una única vez: el HTML por sí solo no permite conectar dos computadoras.

1. Subí **todos** los archivos de esta carpeta (incluida `public/audio/`) a un repositorio nuevo en https://github.com/.
2. Entrá a https://dashboard.render.com/ y creá `New > Web Service` usando ese repositorio.
3. Elegí **Node** y configurá Build Command: `npm install` y Start Command: `npm start`.
4. Usá una única instancia de servicio. Al finalizar el deploy, abrí la URL `https://...onrender.com` que Render te asigna.
5. Creá una sala y compartí el enlace con tus amigos. El segundo visitante distinto ingresa con negras.

`render.yaml` está incluido por si preferís crear el servicio desde un Blueprint de Render.

**Importante**: salas y movimientos se guardan en memoria, así que un reinicio del servidor los borra. La disponibilidad, hibernación y costos del hosting dependen de tu plan. No está publicado automáticamente por este ZIP.

## Controles

- Clic en una pieza y clic en su destino, o arrastrar y soltar.
- Cuando es el turno del rival, elegí tu pieza y destino para preparar una premovida. Cuando vuelva tu turno, se valida y ejecuta si es legal.
- `Esc` o clic derecho: cancelar premovida.
- Al promover un peón, elegí la pieza deseada.
- Activá «Efectos» para escuchar los MP3 incluidos.
- La interfaz se orienta automáticamente para blancas o negras; los espectadores pueden mirar.

## Reglas y seguridad

El servidor valida todas las jugadas usando chess.js. La sincronización es mediante WebSockets. Los códigos de sala son aleatorios, pero una sala por enlace **no es equivalente a un sistema de autenticación seguro**: no compartas el enlace públicamente si querés privacidad. Las reglas incluyen enroque, captura al paso, promoción, jaque y jaque mate. Se puede abandonar y pedir revancha.

## Estructura

- `server.js`: servidor HTTP + WebSocket y validación de movimientos
- `public/index.html`: interfaz
- `public/app.js`: controles, juego online, premovidas y animaciones
- `public/style.css`: estilo y animaciones
- `public/audio`: los tres audios suministrados por el usuario
- `package.json`: dependencias y comandos

## Limitaciones de esta versión

- No tiene reloj, chat ni Elo.
- Las premovidas no hacen predicción de legalidad por adelantado: se verifican cuando vuelve tu turno.
- El sonido requiere que el navegador haya permitido la reproducción mediante una interacción previa.
- No incorpora servidor persistente ni base de datos.
- No se pudo realizar una prueba completa con `npm install` y dos clientes en el entorno de generación; se verificó la sintaxis con Node.
