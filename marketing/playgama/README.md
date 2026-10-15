# Bastion Tower Defense sur Playgama

Kit de soumission et contrôle de chaque exigence de Playgama, lues en entier le 14/10/2026 sur le wiki
développeur (exigences, FAQ, Bridge SDK v2). Le titre est en trois mots, **Bastion Tower Defense** :
Playgama demande 2 à 4 mots, identiques dans le jeu et dans la fiche. La version Playgama l'affiche sur
l'écran titre (« Bastion », puis « Tower Defense » sous le logo) et dans le titre de la page.

## Fichiers

- **Archive** : `npm run package:playgama` construit la version Playgama, contrôle les exigences mesurables
  (et celles des sites partenaires), puis crée `release/bastion-tower-defense-playgama-<version>.zip`
  (`index.html` à la racine, chemins à barres obliques, 0,2 Mo environ).
- **Couvertures** (PNG, moins de 10 Mo chacune) : `cover-landscape-1920x1080.png`,
  `cover-portrait-1080x1920.png`, `cover-square-800x800.png`. Elles sont peintes par le moteur du jeu (une
  bataille mise en scène sur le niveau 7), sans image générée : `npm run dev`, puis
  `/marketing/playgama/kit.html` pour les refaire et les enregistrer.

## Mise en ligne

- **Sandbox** : publiée le 15/10/2026 avec `bastion-tower-defense-playgama-2.0.0.zip`, page publique
  https://playgama.ai/play/4f2wgyuhvp. La revue pour le catalogue s'ouvre à 100 parties et 5 min de jeu en
  moyenne (carte « Playgama Sandbox » de la console).
- **Outil QA** (build hébergé, Bridge v2.3.1) : initialisation, `game_ready` unique, langue de la plateforme,
  lecture groupée et écriture des sauvegardes, pause et son de la plateforme : validés. Publicités non testées
  (bloqueur dans le Chrome de l'auteur). Chrome bloque l'outil QA sur un jeu servi en `localhost` (accès au
  réseau local) : lui donner l'adresse du build hébergé, visible dans la page Sandbox
  (`https://sb-<id>.games.playgama.net/…/index.html`).
- **Nouvelle version** : `npm run package:playgama`, puis Update Game › déposer l'archive › Save Changes ›
  Continue › choisir le build › Publish to Sandbox. Le lien public et les sauvegardes des joueurs restent.

## Formulaire (Dashboard › Add Game)

- **Title** : Bastion Tower Defense
- **Game Engine** : js (JavaScript sans moteur)
- **Supported Devices** : Desktop, Android, iOS
- **Screen Orientation** : landscape et portrait (le plateau pivote sur un téléphone tenu en hauteur)
- **Game Languages** : English, French, Indonesian
- **Game Features** : aucune (le mode à deux se joue sur le même écran, sans réseau ; ni classement ni achat)
- **Distribution** : partenaires par défaut, **en excluant Yandex Games** (le russe y est exigé). La liste
  de Playgama ne propose pas Playhop à part. Attention : cocher « I want to exclude specific platforms »
  sélectionne les 13 plateformes, il faut décocher toutes les autres.
- **Link** : https://bastion-tower-defense.netlify.app/
- **Agent et modèle** : Claude Code, Claude Opus, version exacte `claude-opus-5-5`. Le code a été écrit avec
  Claude Code sous la direction de l'auteur ; les graphismes sont dessinés par le code (Canvas), sans image
  générée par IA ; la musique et les sons sont synthétisés en direct.

**Description** :

> Bastion Tower Defense is a medieval tower defense campaign of 100 levels across 10 chapters, from the green
> border to the besieged capital. Build and upgrade 10 towers – archers, barracks whose soldiers block the
> road, bombards, frost towers, ballistae, catapults, braziers and storm towers – then unlock their elite
> versions. Face 18 kinds of enemies, flyers, invisible foes and a boss at the end of every chapter, cast 10
> special powers and spend your crowns in the Workshop. Play alone, or with a friend on the same screen in
> co-op or in a duel.

**How to play** :

> Enemies follow the road to your castle: stop them before they get through. Tap or click a free tile next to
> the road, then pick a tower in the ring that opens (or in the shop). Tap a tower to upgrade it, sell it or
> change its target. Call the next wave early with the war-horn flag for bonus gold, and use your powers
> during waves. Keyboard: arrows move the cursor, 1 to 0 build, Enter selects, U upgrades, S sells, Space
> starts a wave, Q to T cast powers, P pauses.

## Exigences et leur contrôle (revue du 15/10/2026)

| Exigence | Statut | Preuve |
|---|---|---|
| Bridge v2 dans le `<head>`, `bridge.initialize()` attendu avant tout | ✓ | `PlaygamaAdService.init`, démarrage avant le chargement des sauvegardes ; contrôlé par le paquet |
| `playgama-bridge-config.json` à côté d'`index.html` | ✓ | Émis par le build (interstitiel `between_levels`, récompenses `revive` et `double_crowns`) |
| Langue de la plateforme à chaque lancement, anglais sinon | ✓ | `platform.language` prioritaire sur le choix enregistré ; langue absente → anglais |
| Choix de la langue compréhensible sans lire | ✓ | Icône globe dans l'en-tête, langues écrites dans leur propre langue |
| Sauvegardes par `bridge.storage` seulement, une lecture groupée au lancement | ✓ | `BridgeStorage` : un `storage.get` des 3 clés, écritures seulement quand une valeur change ; aucun accès à `localStorage` (vérifié dans Chrome) |
| Progression conservée (rechargement, rotation, publicité) | ✓ | Partie en cours retrouvée après rechargement (Chrome, faux Bridge) |
| Pause et son de la plateforme | ✓ | `PAUSE_STATE_CHANGED` met la partie (ou le duel) en pause ; `AUDIO_STATE_CHANGED` coupe le son ; états lus au lancement |
| Publicité lancée par Playgama lui-même | ✓ | États `INTERSTITIAL/REWARDED_STATE_CHANGED` suivis en permanence : pause et silence |
| Son coupé quand la page est cachée | ✓ | Contexte audio suspendu (`visibilitychange`) |
| Bouton muet | ✓ | En-tête, sur tous les écrans (réglage enregistré) |
| `game_ready` une fois, au premier écran interactif | ✓ | Après le montage de l'écran titre |
| Messages de niveau | ✓ | `level_started`, `level_paused`, `level_resumed`, `level_completed`, `level_failed` |
| Interstitiel aux pauses naturelles | ✓ | Entre deux niveaux seulement, jamais avant 2 niveaux terminés dans la session, 3 min au moins entre deux |
| Pas de publicité sous le doigt ; jeu en pause et muet pendant | ✓ | Voile « Publicité en cours… » ; pause et silence |
| Publicités récompensées facultatives et annoncées | ✓ | « Seconde chance : +5 vies (vidéo) » une fois par niveau, « Doubler les couronnes (vidéo) » ; récompense seulement à l'état `rewarded` |
| Bloqueur de publicité | ✓ | `checkAdBlock()` au lancement : aucune publicité proposée ni demandée ; une publicité restée « en chargement » est abandonnée au bout de 12 s |
| Aucune requête externe hormis Bridge ; pas d'analytique | ✓ | Contrôle du paquet et des requêtes dans Chrome |
| Pas de lien sortant, pas de verrouillage de domaine | ✓ | Balises sociales et liens du site retirés du build |
| Pas de barre de défilement de la page | ✓ | Défilement dans la zone principale du jeu ; vérifié à 360×640, 390×844, 915×412, 1280×720, 1920×1080 et 2560×1440 |
| Plateau étendu jusqu'aux bords sur ordinateur | ✓ | Pleine largeur pour l'écran de jeu ; le plateau ne pivote que sur un écran en portrait |
| Contrôles ordinateur et tactiles | ✓ | Souris, clavier, toucher (menu radial) |
| Archive ≤ 300 Mo, `index.html` à la racine, noms latins | ✓ | Contrôle du paquet (0,57 Mo, 5 fichiers) |
| Partenaires : MSN < 50 Mo, YouTube ≤ 30 Mo et ≤ 8 000 fichiers, Facebook ≤ 500 fichiers, GameSnacks < 10 Mio par fichier | ✓ | Contrôle du paquet |
| Pas de sang ni de violence explicite (GameDistribution) | ✓ | Sang coupé par défaut sur les portails (réglage) |
| Difficulté croissante, progression, son | ✓ | 100 niveaux, robot de `npm test`, musique et bruitages synthétisés |
| Titre de 2 à 4 mots identique dans le jeu et la fiche | ✓ | « Bastion Tower Defense » |
| Yandex Games : russe | — | Non traduit : Yandex Games exclu dans la fiche |

## Risques à surveiller

- **Nom** : « Bastion » est aussi le titre d'un jeu connu de Supergiant Games (2011). « Bastion Tower
  Defense » s'en distingue, mais un modérateur strict pourrait le relever.
- **Religion** : l'ennemi « War priest » (prêtre de guerre) et le pouvoir « Blessing » (bénédiction) restent
  dans un univers de fantasy médiévale ; les règles de contenu de Playgama excluent les thèmes religieux.
- **Bloqueur dans le Chrome de l'auteur** : Malwarebytes Browser Guard bloque le SDK publicitaire de Playgama ;
  tester les publicités avec un navigateur sans bloqueur (outil QA de la console).
