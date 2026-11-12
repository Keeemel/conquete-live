// Bridges TikFinity's local WebSocket events to the game overlay.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocket, WebSocketServer } = require('ws');
// Optional settings file (API keys, voice choice…): config.env, one KEY=value per line.
try {
  for (const l of fs.readFileSync(path.join(__dirname, 'config.env'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch (e) { /* no config.env: defaults */ }
const { createHost } = require('./host');

const PORT = process.env.PORT || 3000;
const TIKFINITY_URL = process.env.TIKFINITY_WS_URL || 'ws://127.0.0.1:21213/';
const MID = +process.env.MID || 5, BIG = +process.env.BIG || 50;
const INDEX = path.join(__dirname, 'public', 'index.html');
const PHASER_BUNDLE = path.join(__dirname, 'node_modules', 'phaser', 'dist', 'phaser.min.js');
const GIFT_GUIDE = path.join(__dirname, 'public', 'gift-guide-cropped.png');
const GIFT_GUIDE_ORIGINAL = path.join(__dirname, 'public', 'gift-guide.png');
const MUSIC = path.join(__dirname, 'public', 'music.mp3');
const FLAG_CODES = new Set(['br', 'de', 'dz', 'es', 'fr', 'jp', 'ma', 'pt', 'tr', 'us']);
// Direct mode (no TikFinity): node server.js <tiktok_username>  or  TIKTOK_USER=<name>
const USERNAME = String(process.argv[2] || process.env.TIKTOK_USER || '').replace(/^@/, '').trim();
const EULER_KEY = process.env.EULER_KEY || '';

function servePng(res, file, fallback) {
  fs.readFile(file, (err, data) => {
    if (err && fallback) return servePng(res, fallback);
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' });
    res.end(data);
  });
}

function serveMusic(req, res) {
  fs.stat(MUSIC, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); return res.end('Music not found'); }
    const headers = {
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600'
    };
    const stream = (options) => {
      const file = fs.createReadStream(MUSIC, options);
      file.on('error', error => {
        console.error('Music stream error:', error.message);
        if (!res.headersSent) { res.writeHead(500); res.end('Music unavailable'); }
        else res.destroy(error);
      });
      file.pipe(res);
    };
    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, Object.assign({}, headers, { 'Content-Length': stat.size }));
      if (req.method === 'HEAD') return res.end();
      return stream();
    }
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size });
      return res.end();
    }
    let start, end;
    if (match[1]) {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : stat.size - 1;
    } else {
      const suffix = Number(match[2]);
      if (!Number.isSafeInteger(suffix) || suffix <= 0) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size });
        return res.end();
      }
      start = Math.max(0, stat.size - suffix);
      end = stat.size - 1;
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= stat.size || end < start) {
      res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size });
      return res.end();
    }
    end = Math.min(end, stat.size - 1);
    res.writeHead(206, Object.assign({}, headers, {
      'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
      'Content-Length': end - start + 1
    }));
    if (req.method === 'HEAD') return res.end();
    stream({ start, end });
  });
}

const server = http.createServer((req, res) => {
  const p = req.url.split('?')[0];
  if (p === '/favicon.ico') { res.writeHead(204); return res.end(); }
  if (p === '/phaser.min.js') {
    fs.stat(PHASER_BUNDLE, (err, stat) => {
      if (err || !stat.isFile()) { res.writeHead(503); return res.end('Phaser is not installed. Run npm install.'); }
      res.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=86400'
      });
      const bundle = fs.createReadStream(PHASER_BUNDLE);
      bundle.on('error', error => {
        console.error('Phaser bundle error:', error.message);
        if (!res.headersSent) { res.writeHead(500); res.end('Phaser unavailable'); }
        else res.destroy(error);
      });
      bundle.pipe(res);
    });
    return;
  }
  if (p === '/music.mp3') return serveMusic(req, res);
  if (p === '/gift-guide-cropped.png') {
    servePng(res, GIFT_GUIDE, GIFT_GUIDE_ORIGINAL);
    return;
  }
  if (p === '/gift-guide.png') {
    servePng(res, GIFT_GUIDE_ORIGINAL);
    return;
  }
  const flag = /^\/flags\/([a-z]{2})\.svg$/.exec(p);
  if (flag && FLAG_CODES.has(flag[1])) {
    fs.readFile(path.join(__dirname, 'public', 'flags', flag[1] + '.svg'), (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
      res.end(data);
    });
    return;
  }
  if (p !== '/' && p !== '/index.html') { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(INDEX, (err, data) => {
    if (err) { res.writeHead(500); return res.end('Error'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.log('❌ Port ' + PORT + ' is already used. Close the other window or run with PORT=3001');
  else console.log('Server error:', e.message);
  process.exit(1);
});

const wss = new WebSocketServer({ server, maxPayload: 4096 });
const send = o => {
  const s = JSON.stringify(o);
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(s); });
};
const name = d => {
  const user = d.user && typeof d.user === 'object' ? d.user : d;
  return String(user.nickname || user.uniqueId || user.unique_id || user.username || 'Viewer').slice(0, 14);
};
const avatar = d => {
  const user = d.user && typeof d.user === 'object' ? d.user : d;
  const imageUrl = image => typeof image === 'string' ? image
    : image && Array.isArray(image.urlList) ? image.urlList[0] : '';
  let picture = '';
  for (const profile of user === d ? [d] : [user, d]) {
    picture = profile.profilePictureUrl || profile.profile_picture_url
      || (Array.isArray(profile.profilePictureUrls) && profile.profilePictureUrls[0])
      || imageUrl(profile.profilePicture) || imageUrl(profile.avatarMedium || profile.avatar_medium)
      || imageUrl(profile.avatarThumb || profile.avatar_thumb) || imageUrl(profile.avatar) || '';
    if (picture) break;
  }
  return typeof picture === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(picture)
    ? picture.slice(0, 2048) : '';
};

const seenIgnored = new Set();
let likeLog = 0;
let tikfinity = null, retry = null, connected = false, viewers = 0, retryDelay = 5000;
const host = createHost(o => send(o));
const OVERLAY_EVENTS = new Set(['hello', 'join', 'like', 'follow', 'roundstart', 'roundend', 'lead', 'elimination', 'frenzy', 'general', 'close', 'recap']);
const cid = x => typeof x === 'string' && /^[A-Z]{2}$/.test(x) ? x : null;
const countryName = x => String(x || '').normalize('NFKC').replace(/[^\p{L}\p{M} .'\-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
const num = (x, max) => Math.max(0, Math.min(max, Math.floor(+x) || 0));
wss.on('connection', ws => {
  // The overlay reports game moments (lead change, round end…) so the host can comment them.
  // Everything is validated: known events, two-letter country ids, short strings and numbers.
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw.toString()); } catch (e) { return; }
    if (!m || m.t !== 'host' || !OVERLAY_EVENTS.has(m.ev)) return;
    if (m.ev === 'hello') return host.event('welcome');
    host.event(m.ev, {
      u: String(m.u == null ? '' : m.u).slice(0, 24),
      c: cid(m.c), c2: cid(m.c2), c3: cid(m.c3),
      cn: countryName(m.cn), c2n: countryName(m.c2n), c3n: countryName(m.c3n),
      n: num(m.n, 999), p: num(m.p, 1000000000), left: num(m.left, 3600)
    });
  });
  if (connected) ws.send(JSON.stringify({ t: 'status', x: 'TikFinity connected' }));
  if (viewers) ws.send(JSON.stringify({ t: 'viewers', n: viewers }));
});

function handleEvent(message) {
  if (!message || typeof message.event !== 'string') return;
  const event = message.event.toLowerCase().replace(/[_-]/g, '');
  const d = message.data && typeof message.data === 'object' ? message.data : {};
  const u = name(d);

  if (event === 'config') return; // handshake sent by TikFinity on connect
  if (event === 'chat') {
    const comment = d.comment || d.message || d.text || d.content || '';
    console.log('💬 ' + u + ': ' + String(comment).slice(0, 60));
    send({ t: 'chat', u, x: String(comment), a: avatar(d) });
  }
  else if (event === 'like') {
    const n = Math.max(1, Math.min(200, Math.floor(Number(d.likeCount || d.like_count || d.count) || 1)));
    if (likeLog++ < 5 || likeLog % 25 === 0) console.log('❤️ like from ' + u + ' (+' + n + ')  [' + likeLog + ' like events so far]');
    send({ t: 'like', u, n, a: avatar(d) });
  }
  else if (event === 'follow') { console.log('➕ follow from ' + u); send({ t: 'follow', u, n: 30, a: avatar(d) }); }
  else if (event === 'share') { console.log('🔁 share from ' + u); send({ t: 'like', u, n: 15, a: avatar(d) }); host.event('share', { u }); }
  else if (event === 'roomuser') {
    viewers = d.viewerCount || d.viewer_count || d.viewers || 0;
    send({ t: 'viewers', n: viewers });
  } else if (event === 'gift') {
    if (Number(d.giftType) === 1 && d.repeatEnd === false) return;
    const total = (Number(d.diamondCount || d.diamond_count) || 1) * (Number(d.repeatCount || d.repeat_count) || 1);
    const tier = total >= BIG ? 2 : total >= MID ? 1 : 0;
    const giftName = d.giftName || d.gift_name || d.name || 'Gift';
    console.log('🎁', u, giftName, '=', total, 'diamonds');
    send({ t: 'gift', u, tier, v: total, g: giftName, a: avatar(d) });
    host.event('gift', { u, tier, g: String(giftName).slice(0, 20) });
  } else if (event === 'subscribe') {
    send({ t: 'follow', u, n: 30, a: avatar(d) });
  } else if (!seenIgnored.has(event)) {
    seenIgnored.add(event); // log each unused event type only once
    console.log('ℹ️ event type not used by the game (shown once): ' + message.event);
  }
}

function connectTikFinity() {
  const socket = tikfinity = new WebSocket(TIKFINITY_URL);
  socket.on('open', () => {
    retryDelay = 5000;
    connected = true;
    console.log('✅ WebSocket connected to TikFinity at ' + TIKFINITY_URL + ' (waiting for LIVE events)');
    send({ t: 'status', x: 'TikFinity connected' });
  });
  socket.on('message', raw => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch (e) {
      console.log('⚠️ Invalid TikFinity message:', e.message);
      return;
    }
    handleEvent(message);
  });
  socket.on('error', e => {
    const detail = e.message || e.code || 'no error details provided';
    console.log('⚠️ TikFinity WebSocket error:', detail);
  });
  socket.on('close', (code, reason) => {
    if (socket !== tikfinity) return;
    connected = false;
    const detail = reason.toString() || 'no reason provided';
    const delay = retryDelay;
    retryDelay = Math.min(retryDelay * 2, 30000);
    console.log('⏳ TikFinity closed the connection (code ' + code + ', ' + detail + '); retrying in ' + delay / 1000 + ' seconds…');
    send({ t: 'status', x: 'TikFinity disconnected (close code ' + code + ')' });
    if (!retry) retry = setTimeout(() => { retry = null; connectTikFinity(); }, delay);
  });
}


// ---- Direct mode: connects to the TikTok LIVE by username (unofficial, via tiktok-live-connector) ----
function connectDirect() {
  let WebcastPushConnection;
  try { ({ WebcastPushConnection } = require('tiktok-live-connector/legacy')); }
  catch (e) { console.log('❌ Missing dependency. Run: npm install'); process.exit(1); }
  const opts = EULER_KEY ? { signApiKey: EULER_KEY } : {};
  const conn = new WebcastPushConnection(USERNAME, opts);
  let again = null;
  const later = why => {
    connected = false;
    const delay = retryDelay;
    retryDelay = Math.min(retryDelay * 2, 30000);
    console.log('⏳ ' + why + ' — retrying in ' + delay / 1000 + ' seconds…');
    send({ t: 'status', x: 'TikTok disconnected' });
    if (!again) again = setTimeout(() => { again = null; go(); }, delay);
  };
  const go = () => {
    console.log('🔌 Connecting to the LIVE of @' + USERNAME + ' …');
    conn.connect().then(state => {
      retryDelay = 5000; connected = true;
      console.log('✅ Connected to the LIVE of @' + USERNAME + (state && state.roomId ? ' (room ' + state.roomId + ')' : ''));
      send({ t: 'status', x: 'TikFinity connected' }); // same label: the overlay turns the demo bots off
    }).catch(err => {
      const m = String((err && (err.message || err.exception && err.exception.message)) || err);
      console.log('⚠️ Could not connect: ' + m);
      if (/offline|not live|isn.t live|LIVE has ended/i.test(m)) console.log('   → Start your LIVE first, then this window reconnects by itself.');
      later('Connection failed');
    });
  };
  ['chat', 'gift', 'like', 'follow', 'share', 'roomUser', 'subscribe'].forEach(ev =>
    conn.on(ev, data => handleEvent({ event: ev, data })));
  conn.on('disconnected', () => later('Disconnected from TikTok'));
  conn.on('streamEnd', () => console.log('ℹ️ The LIVE has ended.'));
  conn.on('error', e => console.log('⚠️ TikTok error:', (e && (e.message || e.info)) || e));
  go();
}

server.listen(PORT, () => {
  console.log('🎮 Game: http://localhost:' + PORT + '  (OBS / LIVE Studio Browser Source, 540x960)');
  if (USERNAME) connectDirect();
  else {
    console.log('🔌 Waiting for TikFinity at ' + TIKFINITY_URL);
    connectTikFinity();
  }
});
