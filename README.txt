WORLD CONQUEST - TikFinity connection
=====================================
1. Install Node.js (LTS) and Python 3.
2. Start your TikTok LIVE and connect with the TikFinity mode you already use. The game expects
   the configured local WebSocket (default: ws://127.0.0.1:21213/).
3. In this project folder, double-click start.bat.
   The first launch creates a local Python environment and installs Edge-TTS and the Node.js
   dependencies, including the Phaser game engine. Phaser is served locally by the game (no
   Phaser CDN connection is needed). The server connects to
   TikFinity at ws://127.0.0.1:21213/ and retries if TikFinity is not running.
   To install or refresh dependencies manually, run: npm install
4. In OBS / TikTok LIVE Studio: add a "Browser" source, URL http://localhost:3000,
   width 540, height 960 (vertical).
   - Demo bots are turned off while the server is connected.
   - To keep the bots: http://localhost:3000/?demo

How it plays
- Type a country's name (or its flag) in the LIVE comments to join it.
- The game starts with 12 countries. If someone names another recognized country or territory
  (about 250 are supported, in French or English), it replaces the lowest-ranked country in the
  live top 12. Its territories and supporters move with it on the map. Newly
  selected countries stay active across rounds until the game is restarted.
- Likes build power and capture territories: a capture now needs 12 likes, or 10 for a country
  that is behind.
- A new subscription immediately adds 30 power points to the viewer's country, with a bright map
  pulse and banner. The AI host names the viewer and announces the boost.
- Normal expansion favors nearby neutral border tiles around the current center of a country's
  territory. It reaches enemy border tiles only when no adjacent neutral tiles remain; targeted
  gift attacks keep their existing behavior.
- If one country completely surrounds another with its own territory and has more tiles, the
  surrounded country is eliminated for the rest of the round. All its tiles are annexed at once;
  the map shows an annexation animation and the AI host announces it. The country returns next round.
- The territory world is rendered by Phaser as a top-down pixel-art map. The same 99 logical
  territories, adjacency, scoring and capture rules remain. The 12 countries start with one
  protected home tile each, in four balanced rows of three; the remaining tiles are neutral. Each
  territory has a precomputed, slightly irregular pixel region; when ownership changes, only that
  region spreads from its border in a short pixel-by-pixel animation. Likes and gifts still update
  the same game state; the timer is 10 minutes and the gift effects are stronger. Each country's capital is
  marked with its flag instead of a country-code label.
- Gift guide: six TikTok gifts are shown over the bottom-right of the country ranking, in its
  unused right margin so the country flags and scores remain visible.
  The original PNG is
  preserved; the displayed copy is cropped only to remove transparent margins. The original
  ten countries use bundled local SVGs; the UK, Italy and dynamically selected countries load
  flags from FlagCDN. Gift effects use vector/canvas animations. A Shield blocks two attacks;
  Rocket launches two projectiles; Rose summons two allies; Bouquet summons five; Firework
  captures up to 12 nearby territories; Zeus captures up to 18 and stuns opponents for 9 s.
  Allies attack automatically and each can block one incoming attack. FRENZY doubles effects.
- Other gifts keep the existing diamond-tier behavior: small gifts support, MID gifts reinforce,
  and BIG gifts trigger an invasion. The gift image is a visual guide; map effects are adapted to
  this territory-conquest game (there are no separate player characters or enemy units).
- The top donor becomes that country's General. Reaching the gift goal triggers FRENZY x2 for 20 s.
- Above each country's flag, the map displays its three leading supporters for the current round.
  Their score combines received likes (one point per like), the existing follow/share boosts, and the
  gift value already used by the country donation ranking. TikTok profile photos are shown when the
  event supplies a secure image URL; otherwise the viewer's initial is used. Scores reset next round.
- The 10-minute timer and gift goal stay above the central pixel-art map; the gift guide overlays the
  unused bottom-right margin of the ranking, while
  the ranking stays in the lower, secondary area that TikTok chat may cover.
- Round ends at 0:00 or when a country owns 60% of the map. The end screen shows the country top 3
  and, underneath, one row of the five leading viewers with profile photos when available. A crown
  marks the top viewer, whom the AI host congratulates after announcing the country podium.
  Wins are kept between rounds.

Settings
- Gift thresholds (diamonds): MID=5 (Panda) and BIG=50 (Lion). Change them without editing:
      set MID=10 && set BIG=100 && node server.js
- Round length (10 minutes), win %, like cost (6; 5 for trailing countries), frenzy and power values:
  CFG block at the top of public/index.html.
- Another game port: set PORT=3001 && node server.js
- Another TikFinity WebSocket URL: set TIKFINITY_WS_URL=ws://127.0.0.1:21213/ && node server.js
Shortcut: press D for the test simulator.
Note: TikFinity must remain open and connected to the LIVE. The game receives
TikFinity events over its local WebSocket; event availability depends on TikFinity.
If the server repeatedly reports a closed connection, check that TikFinity Desktop
is open and connected to your active LIVE. The server log now includes the
WebSocket close code and reason; share those lines when troubleshooting.

Test WITHOUT being live
- Double-click test-sans-live.bat: it starts a fake TikFinity (fake-tikfinity.js) that sends
  chat / likes / gifts, starts the game and opens http://localhost:3000.
- Close the fake TikFinity window and open the real TikFinity before going live.

Direct mode (WITHOUT TikFinity)
- Double-click start-direct.bat, type your TikTok username, and start your LIVE.
  Same thing from a terminal:  node server.js your_username
- Unofficial connection (tiktok-live-connector): it can break if TikTok changes something,
  and the free signing service can rate-limit. If you get "rate limit" errors, create a free
  key on eulerstream.com and start with:  set EULER_KEY=your_key
- The account must be LIVE, otherwise the game keeps retrying until it starts.

AI voice (the live host)
- A host ("Max") welcomes viewers who choose a country and explains that their likes add points
  and power to that country (at most once every 9 seconds to avoid voice spam). Arrivals get
  priority in the voice queue so more new viewer names are announced. It also thanks
  gifters and shares; announces each subscriber's visible power boost, lead changes, new generals,
  FRENZY, the last 10 seconds, the top 3 countries, and congratulates the strongest viewer at round
  end. It also gives a ranking update every ~45 s. If nothing happens for ~30 s it reminds viewers
  how to play.
- French announcements refer to the LIVE comments (not an animal) and use country-appropriate
  prepositions, for example: "Les likes de Raibi rapportent des points au Maroc !"
- Real like events show a pink heart and pulse over the liked country's home flag. Gifts get a
  prominent impact card, dedicated sound/animation, and the gameplay effect shown in the guide.
- Short event notifications use one compact strip above the ranking, outside the map; rapid events
  replace the current message instead of stacking over gameplay.
- Voice announcements use the Python `edge-tts` package with `fr-FR-HenriNeural`. Internet is
  required for speech generation, but no account, subscription, or API key is needed. The first
  launch installs it automatically in `.venv`.
- Change `EDGE_TTS_VOICE` in config.env to select another Edge-TTS voice.
- The game sends generated MP3 audio to the browser overlay. If Edge-TTS fails, the installed
  French browser voice is used instead.
- Optionally add an Anthropic key only if you want Claude to write recap / round-end / big-gift
  announcements; it is not used for speech generation.
- If Edge-TTS is unavailable, the browser fallback selects an installed French voice when possible
  and the game keeps running.
- Viewer names are cleaned before being read (digits/emojis removed). Add words to blocklist.txt
  to have names containing them replaced by "un viewer". Chat text is never read out loud.
- OBS: in the Browser Source properties tick "Control audio via OBS" so the voice goes into the
  stream's audio mixer. In a normal browser, click the page once (autoplay rule).
- Mute: press D in the game page and untick "AI host voice", or open http://localhost:3000/?voice=0

Music and sound effects
- The supplied soundtrack is `public/music.mp3` (about 137 MB). It loops in the background and is
  streamed by the server, so the whole file is not loaded into memory. Keep a track you are allowed
  to use for LIVE broadcasts in that location.
- Music volume is controlled by the existing slider and automatically lowers while the host speaks.
- Sound effects: player joins, tile captured, gifts (3 sizes), INVASION, new leader, new general,
  FRENZY, new round, countdown ticks, round-win fanfare.
- Sound effects are synthesized by the browser; the soundtrack is streamed separately.
- Settings: press D on the game page (Music, Effects, volume sliders), or use the page address:
    http://localhost:3000/?music=0      no music
    http://localhost:3000/?sfx=0        no sound effects
    http://localhost:3000/?mv=15&sv=40  music volume 15%, effects volume 40%
- OBS: tick "Control audio via OBS" in the Browser Source so you can balance music / voice in the mixer.

Going live WITHOUT the OBS Virtual Camera (TikTok LIVE Studio)
1. Double-click start-live-studio.bat: it starts the game and opens it in its own small window
   (Microsoft Edge, no tabs / address bar, sound allowed). Keep that window open and visible.
2. In TikTok LIVE Studio add a "Window capture" source and pick that game window
   (if the picture is black, use "Display capture" instead). Use a portrait scene.
3. Add the PC sound ("desktop / system audio") so viewers hear the music and the host voice.
   It also captures other PC sounds, so close music players, videos, etc.
Alternative: OBS can send the live straight to TikTok with a Server URL + Stream key, if TikTok
gives your account one (no virtual camera needed). Another option to try: a "Link" source in
LIVE Studio pointing to http://localhost:3000 (its internal browser can be outdated).
