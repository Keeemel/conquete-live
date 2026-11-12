# Rapport de reprise — Conquête des pays (TikTok LIVE)

Ce document sert de passation à la personne ou à l’IA qui reprendra le projet. Il résume l’architecture actuelle, les décisions à préserver, les validations déjà faites et les problèmes encore ouverts.

## 1. Projet et priorité actuelle

Jeu web vertical de conquête de territoires piloté par les événements d’un LIVE TikTok : commentaires, likes, cadeaux, abonnements et partages.

**Priorité signalée par l’utilisateur :** l’image reçue sur TikTok semble encore en 16:9 et doit être agrandie/zoomée, ce qui dégrade sa qualité. Le jeu est pourtant conçu en portrait 9:16. La configuration OBS/LIVE Studio et le résultat réellement diffusé n’ont pas encore été vérifiés ensemble. Diagnostiquer le canevas, la sortie et la scène TikTok avant de proposer un zoom ou de modifier le jeu.

### Consignes impératives pour la reprise

- L’utilisateur indique que les commentaires du LIVE arrivent maintenant correctement. **Ne pas réécrire ni remplacer le flux TikTok/TikFinity sans preuve d’un défaut concret.**
- L’utilisateur a déjà précisé qu’il utilise TikFinity Web et s’est agacé des consignes répétées d’installation de TikFinity Desktop. Le dépôt utilise par défaut un WebSocket local; ne pas présumer du mode réellement employé ni lui redemander d’installer Desktop.
- Conserver les règles de gameplay, la voix Edge-TTS actuelle et les fonctions existantes, sauf demande explicite.
- Les essais de migration vers Kokoro et Qwen ont été annulés. Ils ne sont pas à reprendre : le moteur actuel est Edge-TTS.
- Ne jamais afficher ni copier les valeurs des fichiers de configuration contenant des clés ou identifiants.
- Le dossier n’est pas un dépôt Git. Il n’y a donc pas d’historique Git fiable pour distinguer les modifications antérieures.

## 2. Environnement constaté

- Dossier : `C:\Users\kemel\Downloads\conquete-live (1)\conquete-live`
- Windows, Node.js `v24.20.0`, npm `11.19.0`
- Environnement Python `.venv` : Python `3.15.2`, paquet `edge-tts 7.3.1`
- Dépendances Node : `ws` et `tiktok-live-connector` (voir `package.json`)
- Dépendance Python : `edge-tts>=7.2,<8` (voir `requirements.txt`)
- Aucun dossier `.git` présent.

## 3. Architecture

1. `server.js` démarre le serveur HTTP du jeu sur le port `3000` par défaut, ainsi que son serveur WebSocket.
2. Le serveur reçoit les événements TikFinity sur `ws://127.0.0.1:21213/` par défaut, ou utilise le mode direct facultatif `tiktok-live-connector` si un pseudo TikTok est fourni.
3. `handleEvent()` normalise les événements entrants puis les diffuse aux navigateurs connectés : `chat`, `like`, `gift`, `viewers`, état de connexion, etc.
4. `public/index.html` est l’overlay du jeu : interface, état logique, événements, effets et audio. Le plateau est rendu dans une scène Phaser 3 locale; le navigateur se connecte au WebSocket du même serveur.
5. `host.js` gère les textes, les priorités, la file, les limites de fréquence et la génération vocale. Il appelle `edge_tts_worker.py`, qui utilise `edge-tts` et renvoie le MP3 au serveur; celui-ci le transmet à l’overlay. En cas d’échec, la page essaie la voix du navigateur.

### Événements actuellement traités

- `chat` : le texte du commentaire est envoyé au jeu; un nom de pays reconnu peut faire rejoindre ce pays.
- `like` : ajoute de la puissance au pays attribué au spectateur et déclenche un effet visuel.
- `follow` et `share` : contribuent aussi au jeu et peuvent déclencher une annonce.
- `roomUser` : met à jour le nombre de spectateurs affiché.
- `gift` : totalise les diamants et répétitions, puis choisit un palier. Les seuils par défaut sont `MID=5` et `BIG=50`, modifiables par configuration.

Le traitement des cadeaux en série ignore les répétitions intermédiaires lorsque TikTok indique `repeatEnd === false`. Toute modification de cette logique doit être couverte par un test de simulation.

## 4. Lancement et test sans LIVE

- `start.bat` : prépare `.venv` et Edge-TTS si nécessaire, installe les dépendances Node manquantes, puis démarre `server.js`.
- Adresse locale habituelle : `http://localhost:3000`
- `test-sans-live.bat` : démarre `fake-tikfinity.js`, qui simule commentaires, likes, cadeaux, follows, partages et spectateurs. À utiliser pour les régressions sans LIVE réel.
- `start-direct.bat` : mode alternatif sans TikFinity, avec pseudo TikTok et connexion non officielle. Ce mode est plus fragile et n’est pas nécessaire si le flux actuel fonctionne.
- `start-live-studio.bat` : lance le jeu dans une fenêtre Edge destinée à une capture de fenêtre dans TikTok LIVE Studio.
- `ouvrir-jeu.bat` : ouvre la page de jeu après le démarrage du serveur.

`package.json` ne définit pas de commande de test automatisée; les scripts npm déclarés sont `start` et `fake`.

## 5. Gameplay

- Le jeu commence avec 12 pays; les noms sont reconnus dans plusieurs langues (environ 250 pays/territoires selon le README).
- Si un spectateur choisit un pays reconnu absent de la sélection, celui-ci remplace le pays le moins bien classé parmi les 12. Les territoires, soutiens et couleurs sont transférés; les nouveaux pays restent actifs jusqu’au redémarrage.
- Les likes alimentent la puissance et permettent de conquérir des territoires voisins : il faut maintenant 12 likes par capture, ou 10 pour un pays en retard.
- La croissance normale privilégie les cases neutres les plus proches du centre du territoire; les cases ennemies ne sont visées que s’il n’y a plus de case neutre adjacente. Les attaques ciblées des cadeaux gardent leur sélection existante.
- Un pays est éliminé pour le reste de la manche si toutes ses cases sont encerclées par un seul pays qui possède strictement plus de territoires. Toutes ses cases, capitale comprise, sont alors annexées immédiatement; le classement marque l’élimination, les interactions du pays sont bloquées jusqu’à la manche suivante, et l’animateur vocal l’annonce.
- La carte logique compte 99 territoires. Les 12 pays commencent chacun sur une case de capitale protégée, répartis en quatre rangées de trois; les autres cases démarrent neutres.
- La manche dure 10 minutes et se termine aussi lorsqu’un pays possède 60 % de la carte. Les résultats sont conservés entre manches.
- Le meilleur donateur d’un pays en devient le général. L’objectif de cadeaux déclenche une frénésie ×2 pendant 20 secondes.
- Le comportement de jeu et les types d’effets sont dans `public/index.html`; les seuils monétaires et autres paramètres sont définis dans la configuration du jeu et/ou côté serveur.

### Cadeaux spéciaux

Six effets sont décrits dans le guide visuel : Shield bloque deux attaques; Rocket lance deux projectiles; Rose appelle deux alliés; Bouquet en appelle cinq; Firework conquiert jusqu’à 12 territoires proches; Zeus en conquiert jusqu’à 18 et étourdit les adversaires pendant 9 s. La frénésie double les valeurs. Les cadeaux génériques conservent les paliers soutien/renfort/invasion, avec des caps augmentés à 3/8/20 territoires avant bonus Lion. Il s’agit d’effets sur les territoires; le jeu n’a pas d’unités/personnages séparés.

## 6. Interface, ressources et audio

- La page a un format de base de **540 × 960 (9:16)**. `fit()` adapte l’application à la taille de la fenêtre.
- Phaser `3.90.0` est installé via npm. `server.js` expose son bundle local à `/phaser.min.js`; l’overlay n’a pas besoin de télécharger Phaser depuis un CDN.
- La scène Phaser remplace le plateau hexagonal par une carte pixelisée vue du dessus. Le monde de 540 × 500 CSS px utilise toute la largeur de l’overlay et est rendu à une grille de 108 × 100 pixels de 5 px. Les 99 territoires logiques gardent leur graphe d’adjacence; une partition pixelisée pré-calculée, légèrement irrégulière, mappe chaque territoire sur une zone exclusive de l’image.
- Lors d’une capture déjà décidée par le gameplay, seuls les pixels du territoire affecté sont propagés à partir de la frontière, en progression irrégulière. Les frontières, les drapeaux aux capitales, les boucliers, les renforts, les projectiles et les effets ont un rendu pixel art. Le reste du HUD et de l’interface demeure en HTML/CSS.
- Le HUD place l’objectif au-dessus du plateau, le guide cadeau en superposition dans la marge libre en bas à droite du classement, sans masquer les drapeaux ni les scores, les notifications dans une bande au-dessus du classement et le classement dans la partie basse.
- `public/index.html` contient l’état/règles et la scène Phaser. Les pixels des régions sont attribués une fois au démarrage; les captures ne recalculent que la zone affectée et ses voisins visuels. L’image originale des cadeaux est conservée dans `public/gift-guide.png`; l’image recadrée utilisée à l’écran est `public/gift-guide-cropped.png`.
- Les dix drapeaux de départ sont dans `public/flags/`. Les autres pays utilisent FlagCDN avec un fallback emoji si le drapeau ne peut pas être chargé.
- `public/music.mp3` est la piste fournie par l’utilisateur (environ 137 Mo), diffusée en flux par `server.js` avec support des requêtes HTTP Range. L’utilisateur l’a présentée comme libre de droits; le projet n’a pas vérifié indépendamment sa licence.
- Les effets sonores sont synthétisés dans le navigateur. Les réglages de musique, d’effets et de voix sont disponibles dans le jeu; `?music=0`, `?sfx=0` et `?voice=0` permettent de les couper pour un aperçu.
- Les navigateurs peuvent bloquer l’audio avant une interaction utilisateur. Dans OBS, activer le contrôle audio de la source navigateur si l’audio doit apparaître dans le mixeur.

## 7. Voix actuelle — à conserver

- Moteur : Python `edge-tts`, voix française par défaut `fr-FR-HenriNeural`, débit `+3 %`.
- `host.js` gère les annonces, leur cache, leurs priorités, leurs interruptions et leurs limitations de fréquence. `edge_tts_worker.py` effectue la génération MP3.
- Si Edge-TTS ne répond pas, le jeu tente `speechSynthesis` dans le navigateur.
- Kokoro et Qwen ne sont pas intégrés dans l’état actuel; leurs essais ont été annulés à la demande de l’utilisateur. Ne pas réintroduire ces moteurs.
- La clé Anthropic est optionnelle et concerne uniquement la rédaction de certaines annonces. Elle n’est pas nécessaire pour Edge-TTS.

## 8. Fichiers à connaître

- `server.js` — serveur HTTP, WebSocket, intégration TikFinity/directe, routage des événements et diffusion des ressources.
- `package.json` et `package-lock.json` — Phaser `3.90.0` et dépendances Node.
- `host.js` — textes et logique de l’animateur vocal.
- `edge_tts_worker.py` — génération de la voix Edge-TTS.
- `public/index.html` — jeu, interface, règles, animations, musique, effets, commandes vocales côté navigateur.
- `public/flags/` — drapeaux SVG locaux des pays de départ.
- `public/gift-guide.png` et `public/gift-guide-cropped.png` — guide de cadeaux original et version affichée.
- `public/music.mp3` — piste audio intégrée.
- `fake-tikfinity.js` et `test-sans-live.bat` — simulation d’événements pour les tests locaux.
- `README.txt` — instructions utilisateur existantes; certaines consignes TikFinity peuvent ne pas correspondre à l’installation réellement utilisée par l’utilisateur.
- `config.env.example` — exemple sans secrets; base de la configuration documentée.

## 9. État des vérifications et limites

Pour cette mise à jour, la syntaxe du script inline a été vérifiée et l’aperçu local a chargé Phaser `3.90.0` sur un canvas 540 × 500. Le navigateur a affiché les 12 pays, le compte à rebours à 10:00 et leurs drapeaux.

Essais navigateur avec les bots désactivés :

- Carte initiale : 99 territoires logiques, 12 pays actifs et 12 territoires occupés (une capitale par pays), disposés en quatre rangées de trois.
- Chaque capitale est protégée; l’interface affiche les 12 pays et démarre la manche à 10:00.
- Likes : neuf likes n’ont pas capturé de territoire pour un pays en retard; le dixième a fait passer la France de 1 à 2 territoires. Pour un pays déjà en avance, onze likes n’ont rien capturé; le douzième a pris une case.
- Renforts : Rose a ajouté 2 alliés et Bouquet 5.
- Shield : 2 protections; Rocket : 2 projectiles et jusqu’à 2 captures.
- Firework : 11 captures observées (maximum configuré : 12); Zeus : 18 captures annoncées et 11 pays étourdis.
- Lion avec 100 diamants : +24 territoires pour la France et déclenchement de la frénésie par l’objectif de soutien.
- Propagation : le test Lion a fait passer la France de 4 à 28 cases en une masse compacte; les 11 autres pays n’ont perdu aucune case, confirmant la priorité donnée aux cases neutres.
- Élimination : une invasion de 36 cases a permis à la France d’encercler l’Algérie et les États-Unis; les deux pays sont passés à 0 case et la France a récupéré les territoires. Les lignes sont marquées « ÉLIMINÉ » et leurs interactions like/cadeau sont bloquées.
- Animation et voix : les cases annexées changent de couleur avec les effets d’élimination; le journal Edge-TTS a confirmé l’annonce « Élimination ! La France annexe immédiatement tout le territoire de l’Algérie ! ».
- Fin de manche : après une fin forcée via le simulateur, les 12 pays sont revenus à une capitale chacun et l’état éliminé a été réinitialisé.
- Un Shield offert pendant la frénésie a ajouté 2 protections à l’Italie.
- L’ajout d’Afghanistan a remplacé un pays actif; le total est resté à 12. Le drapeau de l’Afghanistan s’est affiché après le remplacement.
- Les drapeaux du Royaume-Uni et de l’Italie s’affichent également dans la configuration initiale à 12 pays.
- Simulation réelle du flux local `fake-tikfinity.js` → `server.js` → overlay : messages de commentaire, likes et cadeaux reçus; l’intégration réseau TikTok n’a pas été modifiée.

Les autres validations antérieures incluent la lecture et les requêtes Range du MP3 ainsi que le chemin de génération Edge-TTS.

Ces tests ne démontrent **pas** que la sortie OBS/TikTok est correctement configurée ni que le stream fonctionne en conditions réelles. Aucun essai final n’a confirmé le format reçu par TikTok.

Le dernier problème utilisateur non résolu est donc :

> La sortie semble en 16:9 et nécessite un zoom sur TikTok, avec une qualité d’image médiocre.

Vérifier concrètement, dans cet ordre :

1. Le ratio de la scène OBS/LIVE Studio et les dimensions du canevas.
2. La résolution de sortie/stream et l’option éventuelle de redimensionnement de sortie OBS.
3. Le mode portrait de la scène/du LIVE TikTok, et non uniquement le format de la source.
4. Les dimensions et le cadrage de la Browser Source; la page est prévue pour 540 × 960, mais la qualité à l’encodage 1080 × 1920 reste à valider.
5. Un enregistrement local de test avant un vrai LIVE; ne pas masquer un canevas incorrect par un zoom arbitraire.

Une autre vérification visuelle de la dernière disposition des notifications et des débordements de messages successifs était encore prévue dans les notes précédentes. Elle n’est pas certifiée ici.

## 10. Prudence sur les données et modifications

`config.env`, `.env.local` et `username.txt` peuvent contenir des informations privées ou sensibles. Ne pas en lire/recopier les valeurs dans un rapport public, une capture ou un message. Utiliser uniquement `config.env.example` pour documenter les variables.

Comme il n’y a pas de dépôt Git, créer une copie de sauvegarde avant toute modification importante. Pour une évolution, isoler les changements, ne pas toucher au connecteur d’événements sans reproduction fiable, puis tester d’abord avec `test-sans-live.bat`.
