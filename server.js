const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const path = require('path');
const ROOT = __dirname; // absolute path to project root
const DATA_FILE = path.join(ROOT, 'data.json');

console.log('[Server] Root directory:', ROOT);
console.log('[Server] Files present:', require('fs').readdirSync(ROOT).join(', '));

// ── Data ─────────────────────────────────────────
function loadData() {
  try { if(fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); } catch(e){}
  return { users:{}, rooms:{} };
}
function saveData(data) { fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2)); }
function hash(str) { return crypto.createHash('sha256').update(str).digest('hex'); }
function generateToken() { return crypto.randomBytes(32).toString('hex'); }

// ── HTTP Server ───────────────────────────────────
const server = http.createServer((req,res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS'){res.writeHead(200);res.end();return;}

  const url = new URL(req.url,`http://localhost:${PORT}`);
  const pathname = url.pathname;

  if(pathname==='/'||pathname==='/index.html'){
    fs.readFile(path.join(ROOT,'index.html'),(err,data)=>{
      if(err){res.writeHead(404);res.end('Not found');return;}
      res.writeHead(200,{'Content-Type':'text/html'});res.end(data);
    });
    return;
  }

  // ── Static files (css/, js/) ──────────────────────
  const MIME = {'.css':'text/css','.js':'application/javascript','.html':'text/html','.png':'image/png','.ico':'image/x-icon'};
  const ext = pathname.match(/\.[a-z]+$/i)?.[0];
  if(ext && MIME[ext]) {
    const safe = pathname.replace(/\.\./g,'').replace(/\/\/+/g,'/');
    const filePath = path.join(ROOT, safe);
    fs.readFile(filePath, (err, data) => {
      if(err){ console.log('[404]', filePath, err.code); res.writeHead(404); res.end('Not found'); return; }
      console.log('[200]', safe);
      res.writeHead(200,{'Content-Type':MIME[ext],'Cache-Control':'public,max-age=3600'});
      res.end(data);
    });
    return;
  }

  if(pathname.startsWith('/api/')){
    let body='';
    req.on('data',chunk=>body+=chunk);
    req.on('end',()=>{
      try{ handleAPI(pathname,req.method,body?JSON.parse(body):{},req,res); }
      catch(e){ res.writeHead(400,{'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Invalid JSON'})); }
    });
    return;
  }
  res.writeHead(404);res.end('Not found');
});

// ── WebSocket ─────────────────────────────────────
let WebSocket;
try { WebSocket = require('ws'); } catch(e) { console.log('ws not installed'); }

// uid -> ws connection
const onlineUsers = new Map(); // uid -> {ws, name, uid}
const wsRooms = new Map();     // roomId -> {host, guest, state}
const snakeGames = new Map();
const pongGames = new Map();

// ── SERVER-SIDE SNAKE LOOP ────────────────────────────────────
function startSnakeServer(roomId) {
  if (snakeGames.has(roomId)) return;
  const COLS=27, ROWS=22, TICK=100; // 100ms tick = 10 updates/sec

  function randomSnakeFood(snakes) {
    let f, tries=0;
    do {
      f = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) };
      tries++;
    } while (tries<200 && snakes.some(s=>s&&s.some(seg=>seg&&seg.x===f.x&&seg.y===f.y)));
    return f;
  }

  const state = {
    p1: { snake:[{x:7,y:11},{x:6,y:11},{x:5,y:11}], dir:{x:1,y:0}, nextDir:{x:1,y:0}, score:0, dead:false },
    p2: { snake:[{x:19,y:11},{x:20,y:11},{x:21,y:11}], dir:{x:-1,y:0}, nextDir:{x:-1,y:0}, score:0, dead:false },
    food: randomSnakeFood([]),
    over: false, tick: 0
  };

  function tick() {
    const room = wsRooms.get(roomId);
    if (!room || state.over) { clearInterval(loop); snakeGames.delete(roomId); return; }
    if (!room.host || !room.guest) return; // wait for both

    state.tick++;

    ['p1','p2'].forEach(pid => {
      const p = state[pid];
      if (p.dead) return;

      // Apply buffered direction
      p.dir = p.nextDir;

      const head = { x: p.snake[0].x + p.dir.x, y: p.snake[0].y + p.dir.y };

      // Wrap-around (no walls)
      head.x = (head.x + COLS) % COLS;
      head.y = (head.y + ROWS) % ROWS;
      // Self collision
      if (p.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        p.dead = true; return;
      }

      p.snake.unshift(head);

      // Food
      if (head.x === state.food.x && head.y === state.food.y) {
        p.score += 10;
        state.food = randomSnakeFood([state.p1.snake, state.p2.snake]);
      } else {
        p.snake.pop();
      }
    });

    // Cross-collision (head into other snake)
    if (!state.p1.dead && !state.p2.dead) {
      const h1=state.p1.snake[0], h2=state.p2.snake[0];
      const p1HitsP2 = state.p2.snake.some(s=>s.x===h1.x&&s.y===h1.y);
      const p2HitsP1 = state.p1.snake.some(s=>s.x===h2.x&&s.y===h2.y);
      if (p1HitsP2) state.p1.dead = true;
      if (p2HitsP1) state.p2.dead = true;
    }

    if (state.p1.dead || state.p2.dead) state.over = true;

    // Broadcast — send only 10 head segments to reduce bandwidth
    const msg = JSON.stringify({
      type: 'snakeState',
      p1: { snake: state.p1.snake.slice(0,20), score: state.p1.score, dead: state.p1.dead, len: state.p1.snake.length },
      p2: { snake: state.p2.snake.slice(0,20), score: state.p2.score, dead: state.p2.dead, len: state.p2.snake.length },
      food: state.food, over: state.over, tick: state.tick
    });

    if (room.host?.readyState===1)  room.host.send(msg);
    if (room.guest?.readyState===1) room.guest.send(msg);

    if (state.over) { clearInterval(loop); snakeGames.delete(roomId); }
  }

  const loop = setInterval(tick, TICK);
  snakeGames.set(roomId, { state, loop });
  console.log('Snake server started for room', roomId);
}

// Pong physics run entirely on the host client.
// The server only relays paddle/sync/bounce messages between players.
// This stub exists to prevent ReferenceError if the game type is 'pong'.
function startPongServer(roomId) {
  console.log('[Pong] client-side relay mode for room', roomId);
}

if(WebSocket) {
  const wss = new WebSocket.Server({ server });
  console.log('WebSocket server ready');

  wss.on('connection', (ws) => {
    ws.uid = null;
    ws.name = null;
    ws.roomId = null;
    ws.role = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);

        // ── AUTH: user comes online ──
        if(msg.type === 'ping') {
          send(ws,{type:'pong',ts:msg.ts});
        }

        if(msg.type === 'igchat') {
          // Forward to players in same room
          const roomId=msg.roomId||'';
          const data2=loadData();
          const room=roomId?data2.rooms[roomId]:null;
          // Get UIDs of players in this room
          const roomUids=room?[room.host?.uid,room.guest?.uid].filter(Boolean):[];
          wss.clients.forEach(c=>{
            if(c.readyState===WebSocket.OPEN&&c.uid!==ws.uid){
              // Send to players in same room OR if no roomId, all online friends
              const inRoom=roomUids.length?roomUids.includes(c.uid):true;
              if(inRoom) send(c,{...msg,uid:ws.uid});
            }
          });
        }

        if(msg.type === 'game_status') {
          ws.currentGame=msg.game||'';
          // Update onlineUsers entry
          const ou=onlineUsers.get(ws.uid);
          if(ou)ou.currentGame=ws.currentGame;
          // Broadcast to all connected clients
          wss.clients.forEach(c=>{
            if(c.readyState===WebSocket.OPEN&&c.uid!==ws.uid)
              send(c,{type:'game_status',uid:ws.uid,game:ws.currentGame,roomId:msg.roomId||''});
          });
        }

       if(msg.type === 'avatar_update') {
  const data = loadData();
  const user2 = data.users
    ? Object.values(data.users).find(u => u.uid === ws.uid)
    : null;

  if(user2) {
    user2.avatar = msg.avatar || '';
    saveData(data);
  }

  ws.avatar = msg.avatar || '';
  wss.clients.forEach(c => {
    if(c.readyState === WebSocket.OPEN && c.uid !== ws.uid) {
      send(c,{ type:'avatar_update', uid:ws.uid, avatar:ws.avatar });
    }
  });
}

        if(msg.type === 'auth') {
          const data = loadData();
          const user = Object.values(data.users).find(u=>u.token===msg.token);
          if(!user) { send(ws,{type:'auth_fail'}); return; }
          ws.uid = user.uid;
          ws.name = user.name;
          onlineUsers.set(user.uid, {ws, name:user.name, uid:user.uid});
          console.log(`[WS] ${user.name} online`);
          // Confirm auth
          send(ws,{type:'auth_ok', uid:user.uid, name:user.name});
          // Broadcast online status to friends
          broadcastPresence(user.uid, user.name, true);
          // Send current online friends list
          sendFriendsList(ws, user.uid, data);
        }

        // ── FRIEND REQUEST ──
        if(msg.type === 'friend_request') {
          const data = loadData();
          const fromUser = data.users && Object.values(data.users).find(u=>u.uid===ws.uid);
          const toUser = Object.values(data.users).find(u=>u.uid===msg.toUid);
          if(!fromUser||!toUser) return;
          if(!toUser.friendRequests) toUser.friendRequests=[];
          if(!toUser.friends) toUser.friends=[];
          if(toUser.friends.includes(ws.uid)) return;
          if(!toUser.friendRequests.includes(ws.uid)) {
            toUser.friendRequests.push(ws.uid);
            saveData(data);
          }
          // Notify recipient if online
          const toWs = onlineUsers.get(msg.toUid)?.ws;
          if(toWs) send(toWs,{type:'friend_request', fromUid:ws.uid, fromName:ws.name});
        }

        // ── FRIEND ACCEPT ──
        if(msg.type === 'friend_accept') {
          const data = loadData();
          const me = Object.values(data.users).find(u=>u.uid===ws.uid);
          const them = Object.values(data.users).find(u=>u.uid===msg.fromUid);
          if(!me||!them) return;
          if(!me.friends) me.friends=[];
          if(!them.friends) them.friends=[];
          if(!me.friends.includes(msg.fromUid)) me.friends.push(msg.fromUid);
          if(!them.friends.includes(ws.uid)) them.friends.push(ws.uid);
          me.friendRequests=(me.friendRequests||[]).filter(id=>id!==msg.fromUid);
          saveData(data);
          // Notify both
          send(ws,{type:'friend_added', uid:msg.fromUid, name:them.name});
          const themWs = onlineUsers.get(msg.fromUid)?.ws;
          if(themWs) send(themWs,{type:'friend_added', uid:ws.uid, name:me.name});
        }

        // ── FRIEND DECLINE ──
        if(msg.type === 'friend_decline') {
          const data = loadData();
          const me = Object.values(data.users).find(u=>u.uid===ws.uid);
          if(me) {
            me.friendRequests=(me.friendRequests||[]).filter(id=>id!==msg.fromUid);
            saveData(data);
          }
        }

        // ── SEARCH USERS ──
        if(msg.type === 'search_users') {
          const data = loadData();
          const q=(msg.query||'').toLowerCase().trim();
          if(q.length<2) { send(ws,{type:'search_results',results:[]}); return; }
          const results = Object.values(data.users)
            .filter(u=>u.uid!==ws.uid && u.name.toLowerCase().includes(q))
            .slice(0,10)
            .map(u=>({uid:u.uid, name:u.name, online:onlineUsers.has(u.uid)}));
          send(ws,{type:'search_results', results});
        }

        // ── DIRECT MESSAGE ──
        if(msg.type === 'dm') {
          const ts=Date.now();
          // Store message
          const data2=loadData();
          if(!data2.dms)data2.dms={};
          const key=[ws.uid,msg.toUid].sort().join('_');
          if(!data2.dms[key])data2.dms[key]=[];
          data2.dms[key].push({fromUid:ws.uid,fromName:ws.name,toUid:msg.toUid,text:msg.text,ts});
          // Keep last 200 messages per conversation
          if(data2.dms[key].length>200)data2.dms[key]=data2.dms[key].slice(-200);
          saveData(data2);
          // Deliver to recipient if online
          const toWs = onlineUsers.get(msg.toUid)?.ws;
          if(toWs) send(toWs,{type:'dm', fromUid:ws.uid, fromName:ws.name, text:msg.text, ts});
          // Confirm to sender
          send(ws,{type:'dm_sent', toUid:msg.toUid, text:msg.text, ts});
        }

        // ── GAME INVITE ──
        if(msg.type === 'game_invite') {
          const toWs = onlineUsers.get(msg.toUid)?.ws;
          if(toWs) send(toWs,{type:'game_invite', fromUid:ws.uid, fromName:ws.name, game:msg.game, roomId:msg.roomId});
        }

        // ── GAME ROOM: JOIN ──
        if(msg.type === 'join') {
          const { roomId, role, name } = msg;
          ws.roomId = roomId; ws.role = role; ws.playerName = name||ws.name;
          if(role==='spectator'){
            // Spectator - just add to room watchers
            if(!wsRooms.has(roomId)) wsRooms.set(roomId,{host:null,guest:null,state:{},spectators:[]});
            const room=wsRooms.get(roomId);
            if(!room.spectators)room.spectators=[];
            room.spectators.push(ws);
            send(ws,{type:'spectating',roomId});
            if(room.lastState) send(ws,{type:'sync',...room.lastState});
          } else {
          if(!wsRooms.has(roomId)) wsRooms.set(roomId,{host:null,guest:null,state:{},spectators:[]});
          const room = wsRooms.get(roomId);
          room[role] = ws;
          // Cache game type from DB into wsRooms for quick access
          if(!room.gameType){
            try{const d=loadData();room.gameType=(d.rooms&&d.rooms[roomId]&&d.rooms[roomId].game)||'';}catch(e){}
          }
          if(room.host && room.guest) {
            send(room.host,{type:'start',opponentName:room.guest.playerName,role:'host'});
            send(room.guest,{type:'start',opponentName:room.host.playerName,role:'guest'});
            // Detect game type from room data
            try{
              const data3=loadData();
              const gameRoom=data3.rooms&&data3.rooms[roomId];
              const gameType=(gameRoom&&gameRoom.game)||room.gameType||'';
              console.log('[WS] Both joined room',roomId,'game:',gameType);
              if(gameType==='snake') setTimeout(()=>startSnakeServer(roomId),100);
              else if(gameType==='pong') setTimeout(()=>startPongServer(roomId),100);
            }catch(e){console.error('game start error:',e);}
          } else { send(ws,{type:'waiting',roomId}); }
          } // end else spectator
        }

        // ── GAME SYNC ──
        if(msg.type === 'snakeDir') {
          const game=snakeGames.get(ws.roomId);
          if(game){
            const pid=ws.role==='host'?'p1':'p2';
            const d=msg.dir;
            const cur=game.state[pid].dir;
            // Buffer next direction, prevent 180° reversal
            if(!(d.x===-cur.x&&d.y===-cur.y)){
              game.state[pid].nextDir=d;
            }
          }
        }

        if(msg.type === 'battle_shot' || msg.type === 'battle_result' || msg.type === 'battle_rematch') {
          // Forward to the other player in the same room
          const room = wsRooms.get(ws.roomId);
          if(!room) return;
          const other = ws.role==='host'?room.guest:room.host;
          if(other&&other.readyState===WebSocket.OPEN) other.send(JSON.stringify(msg));
        }

        if(msg.type === 'paddleSync') {
          // Update server-side pong state
          const game=pongGames.get(ws.roomId);
          if(game){
            if(msg.p1y!==undefined)game.state.p1y=msg.p1y*game.state.H;
            if(msg.p2y!==undefined)game.state.p2y=msg.p2y*game.state.H;
          }
          // Also relay for client prediction
          const room=wsRooms.get(ws.roomId);
          if(room){
            const other=ws.role==='host'?room.guest:room.host;
            if(other&&other.readyState===WebSocket.OPEN)other.send(JSON.stringify(msg));
          }
        }

        if(msg.type === 'sync') {
          const room = wsRooms.get(ws.roomId);
          if(!room) return;
          // Update last activity
          const da=loadData();
          if(da.rooms&&da.rooms[ws.roomId]){da.rooms[ws.roomId].lastActivity=Date.now();saveData(da);}
          const other = ws.role==='host'?room.guest:room.host;
          if(other&&other.readyState===WebSocket.OPEN) send(other,{type:'sync',...msg.data});
          room.lastState=msg.data;
          (room.spectators||[]).forEach(sp=>{
            if(sp&&sp.readyState===WebSocket.OPEN) send(sp,{type:'sync',...msg.data});
          });
        }

        if(msg.type === 'frame') {
          // Forward canvas frame to all spectators
          const room = wsRooms.get(ws.roomId);
          if(!room) return;
          (room.spectators||[]).forEach(sp=>{
            if(sp&&sp.readyState===WebSocket.OPEN) sp.send(JSON.stringify({type:'frame',data:msg.data}));
          });
        }

        // ── PADDLE ──
        if(msg.type === 'paddle') {
          const room = wsRooms.get(ws.roomId);
          if(!room||!room.host) return;
          if(room.host.readyState===WebSocket.OPEN) send(room.host,{type:'paddle',p2y:msg.p2y});
        }

        // ── BOUNCE ──
        if(msg.type === 'bounce') {
          const room = wsRooms.get(ws.roomId);
          if(!room||!room.host) return;
          if(room.host.readyState===WebSocket.OPEN) send(room.host,{type:'bounce',bx:msg.bx,by:msg.by,bvx:msg.bvx,bvy:msg.bvy,p2y:msg.p2y});
        }

        // ── REMATCH ──
        if(msg.type === 'rematch') {
          const room = wsRooms.get(ws.roomId);
          if(!room) return;
          if(!room.rematchVotes) room.rematchVotes=new Set();
          room.rematchVotes.add(ws.role);
          if(room.rematchVotes.has('host')&&room.rematchVotes.has('guest')) {
            room.rematchVotes.clear(); room.state={};
            // Restart game loop for rematch
            if(snakeGames.has(ws.roomId)){
              const old=snakeGames.get(ws.roomId);
              if(old&&old.loop)clearInterval(old.loop);
              snakeGames.delete(ws.roomId);
            }
            if(pongGames.has(ws.roomId)){
              const old=pongGames.get(ws.roomId);
              if(old&&old.loop)clearInterval(old.loop);
              pongGames.delete(ws.roomId);
            }
            if(room.host) send(room.host,{type:'rematch_go'});
            if(room.guest) send(room.guest,{type:'rematch_go'});
            // Restart game loop after short delay
            try{
              const data2=loadData();
              const gameRoom=data2.rooms&&data2.rooms[ws.roomId];
              const gameType=(gameRoom&&gameRoom.game)||room.gameType||'';
              setTimeout(()=>{
                if(gameType==='snake') startSnakeServer(ws.roomId);
                else if(gameType==='pong') startPongServer(ws.roomId);
              },300);
            }catch(e){}
          } else {
            const other = ws.role==='host'?room.guest:room.host;
            if(other) send(other,{type:'rematch_request',from:ws.role});
          }
        }

      } catch(e) { console.error('WS error:',e.message); }
    });

    ws.on('close', () => {
      if(ws.uid) {
        onlineUsers.delete(ws.uid);
        broadcastPresence(ws.uid, ws.name, false, ws.avatar);
      }
      if(ws.roomId) {
        const room = wsRooms.get(ws.roomId);
        if(room) {
          if(ws.role==='spectator'){
            room.spectators=(room.spectators||[]).filter(s=>s!==ws);
          } else {
            const other = ws.role==='host'?room.guest:room.host;
            if(other&&other.readyState===WebSocket.OPEN) send(other,{type:'opponent_left'});
            room[ws.role]=null;
            // Mark room as closed
            const data2=loadData();
            if(data2.rooms&&data2.rooms[ws.roomId]){
              // For started games: only close if NO other players connected
              if(data2.rooms[ws.roomId].state==='started'){
                const roomPlayers=data2.rooms[ws.roomId].players||[];
                const anyOnline=roomPlayers.some(p=>p.uid!==ws.uid&&onlineUsers.has(p.uid));
                if(!anyOnline){
                  data2.rooms[ws.roomId].state='closed';data2.rooms[ws.roomId].closedAt=Date.now();
                  saveData(data2);
                }
              } else {
                data2.rooms[ws.roomId].state='closed';data2.rooms[ws.roomId].closedAt=Date.now();
                saveData(data2);
              }
            }
            if(!room.host&&!room.guest) wsRooms.delete(ws.roomId);
          }
        }
      }
    });
  });
}

function send(ws, data) {
  if(ws&&ws.readyState===(WebSocket?WebSocket.OPEN:1)) ws.send(JSON.stringify(data));
}

function broadcastPresence(uid, name, online, avatar) {
  // Tell all online friends about this user's status
  const data = loadData();
  const user = Object.values(data.users).find(u=>u.uid===uid);
  if(!user) return;
  const friends = user.friends||[];
  friends.forEach(fid=>{
    const fw = onlineUsers.get(fid)?.ws;
    if(fw) send(fw,{type:'presence', uid, name, online, avatar:avatar||user.avatar||''});
  });
}

function sendFriendsList(ws, uid, data) {
  const user = Object.values(data.users).find(u=>u.uid===uid);
  if(!user) return;
  const friends=(user.friends||[]).map(fid=>{
    const fu=Object.values(data.users).find(u=>u.uid===fid);
    const onlineUser=onlineUsers.get(fid);
    return fu?{uid:fid,name:fu.name,avatar:fu.avatar||'',online:onlineUsers.has(fid),currentGame:onlineUser?.currentGame||''}:null;
  }).filter(Boolean);
  const requests=(user.friendRequests||[]).map(fid=>{
    const fu=Object.values(data.users).find(u=>u.uid===fid);
    return fu?{uid:fid,name:fu.name}:null;
  }).filter(Boolean);
  send(ws,{type:'friends_list',friends,requests});
}

// ── API ───────────────────────────────────────────
function handleAPI(pathname, method, body, req, res) {
  const data = loadData();
  const sendJSON = (code,obj) => {
    res.writeHead(code,{'Content-Type':'application/json'});
    res.end(JSON.stringify(obj));
  };
  const authHeader = req.headers.authorization||'';
  const token = authHeader.replace('Bearer ','');
  const getUser = () => Object.values(data.users).find(u=>u.token===token);

  if(pathname==='/api/register'&&method==='POST'){
    const {name,email,password}=body;
    if(!name||!email||!password) return sendJSON(400,{error:'Alle Felder ausfüllen'});
    if(password.length<6) return sendJSON(400,{error:'Passwort min. 6 Zeichen'});
    if(data.users[email]) return sendJSON(400,{error:'E-Mail bereits registriert'});
    const uid=crypto.randomBytes(16).toString('hex');
    const tok=generateToken();
    data.users[email]={uid,name,email,password:hash(password),token:tok,scores:{},total:0,friends:[],friendRequests:[],created:Date.now()};
    saveData(data);
    return sendJSON(200,{ok:true,token:tok,uid,name,email});
  }

  if(pathname==='/api/login'&&method==='POST'){
    const {email,password}=body;
    const user=data.users[email];
    if(!user||user.password!==hash(password)) return sendJSON(401,{error:'E-Mail oder Passwort falsch'});
    user.token=generateToken();
    saveData(data);
    return sendJSON(200,{ok:true,token:user.token,uid:user.uid,name:user.name,email,avatar:user.avatar||'',scores:user.scores,total:user.total,friends:user.friends||[],friendRequests:user.friendRequests||[]});
  }

  if(pathname==='/api/leaderboard'&&method==='GET'){
    const allUsers=Object.values(data.users).map(u=>({
      name:u.name,uid:u.uid,avatar:u.avatar||'',total:u.total||0,
      bestGame:Object.entries(u.scores||{}).sort((a,b)=>b[1]-a[1])[0]
    })).sort((a,b)=>b.total-a.total).slice(0,20);
    return sendJSON(200,{leaderboard:allUsers,online:[...onlineUsers.values()].map(u=>u.uid)});
  }

  if(pathname==='/api/leaderboard/snakeclassic'&&method==='GET'){
    const lb=Object.values(data.users)
      .filter(u=>u.scores&&u.scores.snakeclassic)
      .map(u=>({name:u.name,uid:u.uid,avatar:u.avatar||'',score:u.scores.snakeclassic}))
      .sort((a,b)=>b.score-a.score)
      .slice(0,10);
    return sendJSON(200,{leaderboard:lb});
  }

  if(pathname==='/api/change-password'&&method==='POST'){
    const user=getUser();
    if(!user) return sendJSON(401,{error:'Nicht eingeloggt'});
    if(user.password!==hash(body.oldPassword||'')) return sendJSON(400,{error:'Aktuelles Passwort falsch'});
    if(!body.newPassword||body.newPassword.length<6) return sendJSON(400,{error:'Passwort zu kurz'});
    user.password=hash(body.newPassword);
    saveData(data);
    return sendJSON(200,{ok:true});
  }

  if(pathname==='/api/delete-account'&&method==='POST'){
    const user=getUser();
    if(!user) return sendJSON(401,{error:'Nicht eingeloggt'});
    // Remove from all friends lists
    Object.values(data.users).forEach(u=>{
      u.friends=(u.friends||[]).filter(f=>f!==user.uid);
      u.friendRequests=(u.friendRequests||[]).filter(f=>f!==user.uid);
    });
    delete data.users[user.email];
    saveData(data);
    return sendJSON(200,{ok:true});
  }

  if(pathname==='/api/avatar'&&method==='POST'){
    const user=getUser();
    if(!user) return sendJSON(401,{error:'Nicht eingeloggt'});
    user.avatar=body.avatar||'';
    saveData(data);
    return sendJSON(200,{ok:true,avatar:user.avatar});
  }

  if(pathname==='/api/scores'&&method==='POST'){
    const user=getUser();
    if(!user) return sendJSON(401,{error:'Nicht eingeloggt'});
    const {game,score}=body;
    if(!user.scores[game]||score>user.scores[game]) user.scores[game]=score;
    user.total=Object.values(user.scores).reduce((a,b)=>a+b,0);
    saveData(data);
    return sendJSON(200,{ok:true,scores:user.scores,total:user.total});
  }

  // Search users
  if(pathname === '/api/users/search' && method === 'GET'){
  const user = getUser();
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const q = (requestUrl.searchParams.get('q') || '').toLowerCase().trim();
    if(!q||q.length<2) return sendJSON(200,{results:[]});
    const me=user?.uid;
    const myData=user;
    const results=Object.values(data.users)
      .filter(u=>u.uid!==me&&u.name.toLowerCase().includes(q))
      .slice(0,10)
      .map(u=>({
        uid:u.uid,name:u.name,
        online:onlineUsers.has(u.uid),
        pending:(myData?.friendRequests||[]).includes(u.uid)||(u.friendRequests||[]).includes(me)
      }));
    return sendJSON(200,{results});
  }

  // Send friend request
  if(pathname==='/api/friends/requests'&&method==='GET'){
    const user=getUser();
    if(!user) return sendJSON(401,{error:'Nicht eingeloggt'});
    const requests=(user.friendRequests||[]).map(fid=>{
      const fu=Object.values(data.users).find(u=>u.uid===fid);
      return fu?{uid:fid,name:fu.name,avatar:fu.avatar||''}:null;
    }).filter(Boolean);
    const friends=(user.friends||[]).map(fid=>{
      const fu=Object.values(data.users).find(u=>u.uid===fid);
      return fu?{uid:fid,name:fu.name,avatar:fu.avatar||'',online:onlineUsers.has(fid)}:null;
    }).filter(Boolean);
    return sendJSON(200,{requests,friends});
  }

  if(pathname==='/api/friends/remove'&&method==='POST'){
    const user=getUser();
    if(!user) return sendJSON(401,{error:'Nicht eingeloggt'});
    const {uid:removeUid}=body;
    user.friends=(user.friends||[]).filter(id=>id!==removeUid);
    const other=Object.values(data.users).find(u=>u.uid===removeUid);
    if(other) other.friends=(other.friends||[]).filter(id=>id!==user.uid);
    saveData(data);
    return sendJSON(200,{ok:true});
  }

  if(pathname==='/api/friends/request'&&method==='POST'){
    const user=getUser();
    if(!user) return sendJSON(401,{error:'Nicht eingeloggt'});
    const {toUid}=body;
    const toUser=Object.values(data.users).find(u=>u.uid===toUid);
    if(!toUser) return sendJSON(404,{error:'Nutzer nicht gefunden'});
    if(!toUser.friendRequests) toUser.friendRequests=[];
    if(!toUser.friends) toUser.friends=[];
    if(toUser.friends.includes(user.uid)) return sendJSON(200,{ok:true,already:true});
    if(!toUser.friendRequests.includes(user.uid)) toUser.friendRequests.push(user.uid);
    saveData(data);
    // Notify via WS if online
    const toWs=onlineUsers.get(toUid)?.ws;
    if(toWs) send(toWs,{type:'friend_request',fromUid:user.uid,fromName:user.name});
    return sendJSON(200,{ok:true});
  }

  // Accept friend request
  if(pathname==='/api/friends/accept'&&method==='POST'){
    const user=getUser();
    if(!user) return sendJSON(401,{error:'Nicht eingeloggt'});
    const {fromUid}=body;
    const fromUser=Object.values(data.users).find(u=>u.uid===fromUid);
    if(!fromUser) return sendJSON(404,{error:'Nutzer nicht gefunden'});
    if(!user.friends) user.friends=[];
    if(!fromUser.friends) fromUser.friends=[];
    if(!user.friends.includes(fromUid)) user.friends.push(fromUid);
    if(!fromUser.friends.includes(user.uid)) fromUser.friends.push(user.uid);
    user.friendRequests=(user.friendRequests||[]).filter(id=>id!==fromUid);
    saveData(data);
    const fromWs=onlineUsers.get(fromUid)?.ws;
    if(fromWs) send(fromWs,{type:'friend_added',uid:user.uid,name:user.name});
    return sendJSON(200,{ok:true});
  }

  // Get DM history
  if(pathname.match(/\/api\/dm\/\w+/)&&method==='GET'){
    const user=getUser();
    if(!user) return sendJSON(401,{error:'Nicht eingeloggt'});
    const otherUid=pathname.split('/')[3];
    const key=[user.uid,otherUid].sort().join('_');
    const msgs=(data.dms||{})[key]||[];
    return sendJSON(200,{messages:msgs});
  }

  // List all active lobbies
  if(pathname==='/api/lobbies'&&method==='GET'){
    const now=Date.now();
    // Clean up old rooms (>30min)
    Object.keys(data.rooms||{}).forEach(id=>{
      const r=data.rooms[id];
      // Keep started games for 2h, closed games cleanup immediately, others 30min
      if(r.state==='started'&&(now-r.created)<7200000) return;
      if(r.state==='closed'&&(now-(r.closedAt||r.created||0))>600000) { delete data.rooms[id]; return; }
      if((now-r.created)>1800000) delete data.rooms[id];
    });
    saveData(data);
    // Also check which rooms have active WS connections
    // Only show rooms with ACTIVE WebSocket connections
    const activeRoomIds=new Set([...wsRooms.keys()].filter(id=>{
      const r=wsRooms.get(id);
      return (r.host&&r.host.readyState===1)||(r.guest&&r.guest.readyState===1);
    }));
    const now2=Date.now();
    // Auto-expire rooms with no activity for 2 minutes
    Object.keys(data.rooms||{}).forEach(id=>{
      const r=data.rooms[id];
      const lastActivity=r.lastActivity||r.created||0;
      if(r.state!=='closed'&&(now2-lastActivity)>120000){
        data.rooms[id].state='closed';
      }
    });
    saveData(data);
    const lobbies=Object.values(data.rooms||{})
      .filter(r=>{
        if(r.state==='closed') return false;
        const lastActivity=r.lastActivity||r.created||0;
        return (now2-lastActivity)<120000; // only show if active in last 2min
      })
      .map(r=>({
        roomId:r.roomId,game:r.game,
        host:r.host,guest:r.guest,
        players:r.players||[r.host],
        state:r.state==='started'?'playing':r.state,vsAI:r.vsAI||false,
        maxPlayers:r.game==='kniffel'?6:2,
        spectators:(wsRooms.get(r.roomId)?.spectators||[]).filter(s=>s.readyState===1).length,
        created:r.created
      }))
      .sort((a,b)=>b.created-a.created)
      .slice(0,20);
    return sendJSON(200,{lobbies});
  }

  // Create public lobby (vs AI or waiting)
  if(pathname==='/api/lobbies/create'&&method==='POST'){
    const user=getUser()||{uid:'anon',name:body.hostName||'Spieler'};
    const {game,vsAI,roomId:existingRoomId}=body;
    // If roomId provided, just update that room to be public
    if(existingRoomId&&data.rooms[existingRoomId]){
      data.rooms[existingRoomId].vsAI=!!vsAI;
      data.rooms[existingRoomId].state=vsAI?'playing':'waiting';
      saveData(data);
      return sendJSON(200,{ok:true,roomId:existingRoomId});
    }
    const roomId=Math.random().toString(36).substr(2,6).toUpperCase();
    data.rooms[roomId]={
      game,roomId,vsAI:!!vsAI,
      host:{uid:user.uid,name:user.name},
      guest:null,players:[{uid:user.uid,name:user.name}],
      spectators:0,
      state:vsAI?'playing':'waiting',
      sync:{},created:Date.now()
    };
    saveData(data);
    return sendJSON(200,{ok:true,roomId});
  }

  // Spectate a room (increment spectator count)
  if(pathname.match(/\/api\/rooms\/\w+\/spectate/)&&method==='POST'){
    const roomId=pathname.split('/')[3];
    const room=data.rooms[roomId];
    if(!room) return sendJSON(404,{error:'Raum nicht gefunden'});
    room.spectators=(room.spectators||0)+1;
    saveData(data);
    return sendJSON(200,{ok:true,room});
  }

  // Kniffel: get room players
  if(pathname.match(/\/api\/rooms\/\w+\/players/)&&method==='GET'){
    const roomId=pathname.split('/')[3];
    const room=data.rooms[roomId];
    if(!room) return sendJSON(404,{error:'Raum nicht gefunden'});
    return sendJSON(200,{players:room.players||[room.host],state:room.state,roomId});
  }

  // Kniffel: join as additional player
  if(pathname.match(/\/api\/rooms\/\w+\/join-multi/)&&method==='POST'){
    const user=getUser()||{uid:'anon'+Date.now(),name:body.name||'Spieler'};
    const roomId=pathname.split('/')[3];
    const room=data.rooms[roomId];
    if(!room) return sendJSON(404,{error:'Raum nicht gefunden'});
    if(room.state==='started') return sendJSON(400,{error:'Spiel bereits gestartet'});
    if(!room.players) room.players=[room.host];
    if(room.players.length>=6) return sendJSON(400,{error:'Raum voll (max 6)'});
    if(!room.players.find(p=>p.uid===user.uid)){
      room.players.push({uid:user.uid,name:user.name});
    }
    saveData(data);
    // Notify ALL current players via WS
    (room.players||[]).forEach(p=>{
      const pw=onlineUsers.get(p.uid)?.ws;
      if(pw) send(pw,{type:'player_joined',player:{uid:user.uid,name:user.name},players:room.players});
    });
    return sendJSON(200,{ok:true,players:room.players});
  }

  // Kniffel: host starts the game
  if(pathname.match(/\/api\/rooms\/\w+\/start/)&&method==='POST'){
    const user=getUser();
    const roomId=pathname.split('/')[3];
    const room=data.rooms[roomId];
    if(!room) return sendJSON(404,{error:'Raum nicht gefunden'});
    if(room.host?.uid!==user?.uid) return sendJSON(403,{error:'Nur der Host kann starten'});
    room.state='started';
    saveData(data);
    // Notify all players via WS
    (room.players||[]).forEach(p=>{
      const pw=onlineUsers.get(p.uid)?.ws;
      if(pw) send(pw,{type:'game_start',players:room.players,roomId});
    });
    return sendJSON(200,{ok:true,players:room.players});
  }

  if(pathname==='/api/online'&&method==='GET'){
    const onlineList=[...onlineUsers.values()].map(u=>({uid:u.uid,name:u.name}));
    return sendJSON(200,{online:onlineList,count:onlineList.length});
  }

  if(pathname==='/api/rooms/create'&&method==='POST'){
    const user=getUser()||{uid:token||'anon',name:body.hostName||'Spieler'};
    const {game}=body;
    const roomId=Math.random().toString(36).substr(2,6).toUpperCase();
    data.rooms[roomId]={game,roomId,host:{uid:user.uid,name:user.name},guest:null,players:[{uid:user.uid,name:user.name}],state:'waiting',moves:[],sync:{},created:Date.now(),lastActivity:Date.now()};
    saveData(data);
    return sendJSON(200,{ok:true,roomId});
  }

  if(pathname.match(/\/api\/rooms\/\w+$/)&&method==='GET'){
    const roomId=pathname.split('/')[3];
    const room=data.rooms[roomId];
    if(!room) return sendJSON(404,{error:'Raum nicht gefunden'});
    return sendJSON(200,room);
  }

  if(pathname.match(/\/api\/rooms\/\w+\/join$/)&&method==='POST'){
    const user=getUser()||{uid:token||'anon',name:body.guestName||'Spieler 2'};
    const roomId=pathname.split('/')[3];
    const room=data.rooms[roomId];
    if(!room) return sendJSON(404,{error:'Raum nicht gefunden'});
    if(room.state!=='waiting') return sendJSON(400,{error:'Raum ist voll'});
    room.guest={uid:user.uid,name:user.name};
    room.state='playing';
    saveData(data);
    return sendJSON(200,{ok:true,room});
  }

  if(pathname.match(/\/api\/rooms\/\w+\/sync/)&&method==='POST'){
    const roomId=pathname.split('/')[3];
    const room=data.rooms[roomId];
    if(!room) return sendJSON(404,{error:'Raum nicht gefunden'});
    room.sync={...room.sync,...body,ts:Date.now()};
    room.lastActivity=Date.now(); // keep alive
    saveData(data);
    return sendJSON(200,room.sync);
  }

  if(pathname.match(/\/api\/rooms\/\w+\/sync/)&&method==='GET'){
    const roomId=pathname.split('/')[3];
    const room=data.rooms[roomId];
    if(!room) return sendJSON(404,{});
    return sendJSON(200,room);
  }

  if(pathname.match(/\/api\/rooms\/\w+\/rematch/)&&method==='POST'){
    const roomId=pathname.split('/')[3];
    // Room might be deleted after game end — recreate from WS memory if needed
    if(!data.rooms[roomId]){
      const wsRoom=wsRooms.get(roomId);
      if(!wsRoom) return sendJSON(404,{error:'Raum nicht gefunden'});
      data.rooms[roomId]={id:roomId,state:'rematch',rematch:{},created:Date.now(),
        host:wsRoom.host?.uid||'',game:wsRoom.game||'',players:[]};
    }
    const room=data.rooms[roomId];
    if(!room.rematch) room.rematch={};
    const {player}=body;
    // If bothReady already set recently, both players get the signal
    const alreadyReady=room.rematch.readyAt&&(Date.now()-room.rematch.readyAt)<10000;
    if(!alreadyReady) room.rematch[player]=true;
    const bothReady=alreadyReady||(room.rematch.host&&room.rematch.guest);
    if(bothReady){
      if(!alreadyReady){
        // First time bothReady: reset room for new game
        room.rematch={readyAt:Date.now()};
        room.state='waiting';
        room.closedAt=null;
        room.sync={};
        saveData(data);
      }
      return sendJSON(200,{bothReady:true,roomId});
    }
    saveData(data);
    return sendJSON(200,{bothReady:false});
  }

  sendJSON(404,{error:'Not found'});
}

server.listen(PORT,'0.0.0.0',()=>{
  console.log(`GameHub Server on port ${PORT}`);
});
