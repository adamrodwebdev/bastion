# Bastion Tower Defense sur CrazyGames

Kit de soumission et contrôle de chaque exigence de CrazyGames, lues en entier le 14/10/2026 sur
docs.crazygames.com (exigences techniques, de jeu, de publicité et de qualité, couvertures), et la page
FAQ sur les nouvelles soumissions relue le 20/10/2026. Le jeu entre en **Basic Launch** : public restreint
pendant 7 à 21 jours, publicités désactivées par le portail ; le **Full Launch** se décide ensuite sur la
durée de jeu, la conversion et la rétention.

## Fichiers

- **Archive** : `npm run package:crazygames` construit la version CrazyGames, contrôle les exigences
  mesurables, puis crée `release/bastion-tower-defense-crazygames-<version>.zip` (`index.html` à la racine,
  0,6 Mo, 5 fichiers). Les publicités y restent coupées (Basic Launch) ; pour le Full Launch :
  `VITE_CRAZYGAMES_ADS=on npm run package:crazygames`.
- **Couvertures** (PNG, titre seul, sans bordure) : `cover-landscape-1920x1080.png`,
  `cover-portrait-800x1200.png`, `cover-square-800x800.png`. Elles sont peintes par le moteur du jeu (la même
  bataille mise en scène que sur Playgama), sans image générée.
- **Vidéos d'aperçu** (obligatoires, MP4 H.264, 18 s, sans son, environ 26 Mo chacune) :
  `preview-landscape-1920x1080.mp4` (1080p, 16:9) et `preview-portrait-1080x1620.mp4` (1080p, 2:3). Elles
  s'ouvrent sur la couverture, puis la bataille joue en temps réel (pas d'accéléré) ; ni barre noire, ni
  curseur, ni texte promotionnel. Trop lourdes pour le dépôt, elles ne sont pas versionnées : `npm run dev`,
  puis `/marketing/crazygames/kit.html` refait les couvertures et filme chaque vidéo (le fichier est proposé
  au téléchargement).

## Formulaire (Developer Portal › Submit a game)

- **Name** : Bastion Tower Defense
- **Category** : Strategy, tags Tower Defense, Medieval, Strategy, 2 Player
- **Devices** : ordinateur et mobile ; **Orientation** : paysage et portrait (sur un téléphone tenu en hauteur,
  le plateau pivote)
- **Languages** : English, French, Indonesian (la langue du portail est suivie, anglais sinon)
- **Progress save** : *Automatic Progress Save* (le jeu enregistre dans le stockage du navigateur, que CrazyGames
  synchronise pour les joueurs connectés)
- **Multiplayer** : non (le mode à deux se joue sur le même écran, sans réseau)

**Description** :

> Bastion Tower Defense is a medieval tower defense campaign of 100 levels across 10 chapters, from the green
> border to the besieged capital. Build and upgrade 10 towers – archers, barracks whose soldiers block the
> road, bombards, frost towers, ballistae, catapults, braziers and storm towers – then unlock their elite
> versions. Face 18 kinds of enemies, flyers, invisible foes and a boss at the end of every chapter, cast 10
> special powers and spend your crowns in the Workshop. Play alone, or with a friend on the same screen in
> co-op or in a duel.

**Controls** :

> Select a free tile next to the road, then pick a tower. Select a tower to upgrade it, sell it or change its
> target. Call the next wave early with the war-horn flag for bonus gold, and use your powers during waves.
> Mouse or touch. Keyboard: arrows move the cursor, 1 to 0 build, Enter selects, U upgrades, S sells, Space
> starts a wave, Q to T cast powers, P pauses, Backspace or right-click cancels.

## Exigences et leur contrôle (revue du 20/10/2026)

| Exigence | Statut | Preuve |
|---|---|---|
| Taille ≤ 250 Mo, ≤ 1 500 fichiers, téléchargement initial ≤ 50 Mo (≤ 20 Mo pour l'accueil mobile) | ✓ | Contrôle du paquet : 0,6 Mo, 5 fichiers |
| Chemins relatifs, `index.html` à la racine | ✓ | Contrôle du paquet |
| SDK v3 dans le `<head>`, `init()` attendu, aucun appel si l'environnement est `disabled` | ✓ | Contrôle du paquet ; `CrazyGamesAdService.init` |
| `gameplayStart` à chaque partie et reprise, `gameplayStop` en pause, menu et fin | ✓ | Journal du SDK (environnement `local`) : chargement, partie, pause, reprise |
| `muteAudio` du portail prioritaire sur le son du jeu | ✓ | Lu au lancement et suivi (`addSettingsChangeListener`) |
| Basic Launch : aucune offre de publicité qui ne marcherait pas | ✓ | Publicités coupées ; écran de fin sans vidéo (perdu : Recommencer, Carte ; gagné : Niveau suivant, Recommencer, Carte) |
| Aucune autre publicité, aucun autre portail, aucune analytique, aucun lien sortant | ✓ | Contrôle du paquet (adresses et SDK) ; pied de page du site masqué |
| Pas de bouton plein écran dans le jeu | ✓ | Contrôle du paquet |
| `Échap` jamais utilisé (il fait sortir du plein écran) | ✓ | Pause sur `P`, annulation sur Retour arrière ou clic droit ; test de bout en bout |
| Clavier AZERTY | ✓ | Touches 1 à 0 et duel lus par position (`event.code`) |
| Pas de menu contextuel sur le plateau | ✓ | Clic droit pris par le jeu (annuler) ; test de bout en bout |
| Texte lisible à un ratio de pixels de 1 aux tailles de cadre (907×510, 1216×684, 1077×606, 821×462, 1366×768, 1920×1080, 1536×864, 1280×720, 800×450, 1080×607) | ✓ | Plus petit texte : 12 px ; écran-titre en deux colonnes sur les cadres bas (bouton principal visible) |
| Jouable en paysage sur ordinateur, souris et clavier, toucher sur mobile | ✓ | Tests de bout en bout à 390×844, 360×640, 915×412, 1280×800, 1536×730 |
| Physique identique à 144 et 165 Hz | ✓ | Boucle à pas fixe (`GameLoop`) |
| Nouveau joueur en jeu en un clic au plus | ✓ | « Jouer » lance le niveau 1 avec Maître Gontran ; mesuré : 1 clic, environ 3 s, à toutes les tailles |
| Tutoriel dans le jeu, court, qu'on peut fermer | ✓ | Bulles de Gontran sur la carte, croix rouge |
| Anglais, traductions de qualité, langue du SDK | ✓ | `systemInfo.locale`, anglais sinon ; 715 clés dans les 3 langues |
| PEGI 12, pas de contenu pour enfants | ✓ | Fantasy médiévale, sang coupé par défaut sur les portails |
| Couvertures 1920×1080, 800×1200, 800×800 : titre seul, sans bordure ni logo | ✓ | `cover-*.png` de ce dossier (les anciennes images de `marketing/` portent du texte et un cadre : ne pas les envoyer) |
| Vidéos 1080p paysage 16:9 et portrait 2:3, 15 à 20 s, ≤ 50 Mo, sans son | ✓ | 18 s, 26 Mo, MP4 |

## Risques à surveiller

- **Qualité jugée à l'œil** : les trois jeux déjà envoyés par ce compte (Stackrift, Ballmania, Catapulte Mania)
  ont été refusés avec la même phrase, « The overall quality of the game does not yet meet the expectations of
  our platform ». CrazyGames prévient que des envois répétés non conformes peuvent restreindre les suivants.
- **Nom** : « Bastion » est aussi le titre d'un jeu connu de Supergiant Games (2011). CrazyGames demande un nom
  qu'on ne puisse pas confondre avec un autre jeu.
- **Style** : les portraits des personnages (Gontran, Ysolde, Mordrac) sont en pixel art, le reste du jeu en
  dessin vectoriel lisse ; les consignes de qualité demandent un style unique.
- **Religion** : « War priest » et « Blessing » restent de la fantasy médiévale (sans risque PEGI 12 ici, mais
  exclu par les règles de Playgama).
