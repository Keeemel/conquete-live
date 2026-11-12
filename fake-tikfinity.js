// Simulates TikFinity's local WebSocket (ws://127.0.0.1:21213/) so you can test
// the game WITHOUT being live. Run:  node fake-tikfinity.js   (then start the game)
const { WebSocketServer } = require('ws');
const PORT = +process.env.TIKFINITY_PORT || 21213;
const wss = new WebSocketServer({ port: PORT, host: '127.0.0.1' });
const names = ['Lucas', 'Yanis', 'Sarah', 'Karim', 'Emma', 'Nour', 'Mehdi', 'Chloe'];
const countries = ['France', 'Maroc', 'Brésil', 'Algérie', 'USA', 'Turquie', 'Espagne', 'Portugal', 'Allemagne', 'Japon'];
const pick = a => a[Math.random() * a.length | 0];
const bcast = o => wss.clients.forEach(c => c.readyState === 1 && c.send(JSON.stringify(o)));
wss.on('listening', () => console.log('🧪 Fake TikFinity on ws://127.0.0.1:' + PORT));
wss.on('connection', ws => {
  console.log('🔌 Game connected');
  ws.send(JSON.stringify({ event: 'config', data: {} }));
});
setInterval(() => {
  const nickname = pick(names), uniqueId = nickname.toLowerCase(), r = Math.random();
  if (r < .25) bcast({ event: 'chat', data: { nickname, uniqueId, comment: pick(countries) } });
  else if (r < .75) bcast({ event: 'like', data: { nickname, uniqueId, likeCount: 1 + Math.random() * 10 | 0, totalLikeCount: 999 } });
  else if (r < .85) bcast({ event: 'follow', data: { nickname, uniqueId } });
  else if (r < .92) bcast({ event: 'share', data: { nickname, uniqueId } });
  else if (r < .985) bcast({ event: 'gift', data: { nickname, uniqueId, giftName: 'Rose', diamondCount: 1, repeatCount: 1 + Math.random() * 3 | 0, giftType: 1, repeatEnd: true } });
  else bcast({ event: 'gift', data: { nickname, uniqueId, giftName: 'Lion', diamondCount: 29999, repeatCount: 1, giftType: 0 } });
}, 600);
setInterval(() => bcast({ event: 'roomUser', data: { viewerCount: 20 + Math.random() * 30 | 0 } }), 5000);
