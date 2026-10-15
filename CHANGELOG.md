# Journal des versions

Toutes les modifications importantes du projet sont notées ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et les numéros de version suivent le [versionnage sémantique](https://semver.org/lang/fr/) :

- **MAJEUR** (2.0.0) : changement qui casse quelque chose, par exemple d'anciennes sauvegardes qui ne se chargent plus.
- **MINEUR** (1.1.0) : nouvelle fonctionnalité, comme un nouveau niveau, une nouvelle tour ou une nouvelle langue.
- **CORRECTIF** (1.0.1) : correction de bug ou réglage d'équilibrage.

## [Non publié]

### Ajouté

- Nouvelle direction artistique dessinée par le code : terrains peints par biome (prairie, canyon, lagune, volcan, forteresse, abysse), route usée, décors (arbres, mesas, mares, roches de lave, ruines, cristaux), grotte d'entrée et porte du bastion.
- Mode sombre transformé en crépuscule : éclairage de nuit, lanternes des tours, projectiles lumineux, particules d'ambiance (pollen, lucioles, poussière, braises, feuilles, neige, feux follets).
- Tours et ennemis redessinés avec des silhouettes distinctes ; chaque amélioration change l'apparence de la tour.
- Effets de jeu : débris, fumée, pièces, tremblement d'écran (désactivé si les animations sont réduites), chiffres flottants.
- Sons et musique générés dans le navigateur (aucun fichier audio), avec des boutons pour couper les bruitages et la musique.
- Appel anticipé de la vague : une fois la vague en cours entièrement sortie, la suivante peut être lancée tout de suite contre un bonus d'or qui diminue en 18 secondes.
- Annonce de la vague : drapeau à l'entrée, chevrons sur la route, pastilles de progression avec la dernière vague marquée.
- Les cartes des niveaux et l'écran titre montrent les vraies cartes peintes ; la boutique montre les vraies tours.
- Maquette vivante de la prochaine itération (`npm run mockup`).
- Menu de construction radial : toucher une case libre affiche les quatre tours autour d'elle, avec l'aperçu de portée ; les tours trop chères sont grisées ; toucher à nouveau la case ferme le menu.
- Barre de vie du boss en haut du plateau (en bas si l'entrée des ennemis est en haut), et court ralenti quand il tombe.
- Drapeau d'appel de vague sur la grotte : un anneau montre le temps restant et le bonus d'or.

### Modifié

- Le HUD (vies, or, vague, score, pause, vitesse) devient un bandeau en bois au-dessus de la carte sur téléphone, et des plaques posées sur la carte sur les écrans plus grands : le plateau gagne de la hauteur.
- Rythme des vagues en dents de scie (montée, pic, respiration) ; chaque nouvel ennemi arrive d'abord seul, avec un conseil.

### Amélioré

- Sur téléphone en mode portrait, la boutique de tours tient sur une seule ligne : le plateau, la boutique et le bouton de vague sont visibles sans faire défiler l'écran.

## [1.0.0] - 2026-10-01

Première version.

### Ajouté

- Moteur de jeu en JavaScript orienté objet, indépendant de Vue (`src/core`).
- 6 niveaux de difficulté croissante, avec des vagues générées automatiquement.
- 4 tours (Archer, Canon, Givre, Laser), chacune avec 3 niveaux et 3 modes de ciblage.
- 5 types d'ennemis : fantassin, coureur, blindé, soigneur et boss.
- 4 pouvoirs spéciaux à chronomètre, débloqués en finissant les niveaux 1 à 4.
- 3 difficultés : Facile, Normal, Difficile.
- Sauvegarde dans le localStorage : progression, réglages et partie en cours.
- Traduction en français et en anglais, avec détection de la langue du navigateur.
- Mode clair, mode sombre ou réglage automatique selon le système.
- Interface adaptée au téléphone, à la tablette et à l'ordinateur. Le plateau pivote en mode portrait.
- Commandes au clavier et prise en charge des lecteurs d'écran.
- SEO : balises meta, Open Graph, données structurées, sitemap, robots.txt et manifest.
- Test automatique d'équilibrage (`npm test`).

[Non publié]: https://github.com/adamrodwebdev/bastion/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/adamrodwebdev/bastion/releases/tag/v1.0.0
