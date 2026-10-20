# Journal des versions

Toutes les modifications importantes du projet sont notées ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et les numéros de version suivent le [versionnage sémantique](https://semver.org/lang/fr/) :

- **MAJEUR** (2.0.0) : changement qui casse quelque chose, par exemple d'anciennes sauvegardes qui ne se chargent plus.
- **MINEUR** (1.1.0) : nouvelle fonctionnalité, comme un nouveau niveau, une nouvelle tour ou une nouvelle langue.
- **CORRECTIF** (1.0.1) : correction de bug ou réglage d'équilibrage.

## [Non publié]

### Ajouté

- **Version Playgama** (`npm run package:playgama`) avec le Playgama Bridge SDK v2 : publicités entre deux niveaux et vidéos facultatives, sauvegardes sur la plateforme, langue de la plateforme à chaque lancement, son et pause de la plateforme (y compris pendant les publicités qu'elle lance), messages de niveau. Aucune publicité n'est proposée quand un bloqueur est détecté. Le paquet contrôle les exigences de Playgama et de ses partenaires, et trois couvertures sont peintes par le moteur du jeu (`marketing/playgama/`).
- **Bouton son** dans l'en-tête, sur tous les écrans : coupe la musique et les bruitages, et s'en souvient.
- Réglage **Vibrations** (écran Réglages, partie « Son », sur les téléphones qui le permettent) : une courte vibration quand on construit, améliore ou vend une tour, lance une vague, utilise un pouvoir ou perd une vie.
- Le coût d'une construction ou d'une amélioration s'élève au-dessus de la tour (« −60 »), comme le gain d'une vente.
- **Refonte graphique complète**, toujours dessinée par le code (aucune image à télécharger) :
  - terrain peint pour chacun des 10 chapitres : herbe texturée, routes pavées, eau animée, arbres et rochers propres au décor ;
  - les 10 tours sont de vrais bâtiments, en bois au niveau 1, en pierre ensuite, avec des ornements dorés pour l'élite ; leurs parties bougent (l'archer vise, le canon recule, la catapulte lance, le cristal de givre flotte, les braseros brûlent, les drapeaux flottent) ;
  - les 18 ennemis et les soldats sont de vrais personnages animés : ils marchent, frappent et tombent ;
  - le camp de Mordrac marque l'entrée, la porte du château marque la sortie ;
  - mode sombre transformé en nuit, avec torches et lueurs ;
  - météo selon le chapitre : pollen, lucioles, poussière, brume, neige, feuilles, pluie et éclairs, cendres, oiseaux, pétales ;
  - sang, débris, fumée et braises ;
  - panorama animé sur l'écran d'accueil ;
  - icônes des tours et des ennemis redessinées dans toute l'interface.
- **Indonésien** (Bahasa Indonesia), en plus du français et de l'anglais. La langue est choisie automatiquement selon le navigateur, et peut être changée dans l'en-tête.
- **Écran Apprendre** pour les nouveaux joueurs :
  - 4 leçons guidées (Premiers pas, Bloquer la route, Vagues et pouvoirs, Connaître l'ennemi) avec Maître Gontran, un cercle doré sur les boutons à toucher et une case du plateau qui brille ;
  - 25 couronnes la première fois que chaque leçon est réussie ;
  - le guide du défenseur : règles, types de dégâts, fiches des tours, des ennemis et des pouvoirs, commandes à deux.
- Sur l'accueil, une carte « Nouveau dans le royaume ? » propose la première leçon tant que le joueur n'a pas commencé.
- Réglages **Sang** et **Particules** (écran Réglages, partie « Affichage »). Le sang est désactivé par défaut dans les versions CrazyGames et Poki.
- **Menu de construction radial** (grands écrans ; sur téléphone, le tiroir de construction le remplace) : toucher ou cliquer une case libre affiche autour d'elle les tours du niveau (de 2 à 10), dans l'ordre de la boutique, avec leur prix et l'aperçu de portée au survol. Les tours trop chères sont grisées. Toucher à nouveau la case ferme le menu. Sur un petit plateau qui ne peut pas contenir l'anneau, les tours s'alignent dans un bandeau le long d'un bord. La boutique reste disponible.
- **Drapeau d'appel** sur la première case de chaque route que prendra la prochaine vague : il lance la vague, et son anneau se vide avec le compte à rebours en affichant le bonus d'or de l'appel anticipé.
- **Chevrons sur les routes** avant chaque vague : ils défilent vers la porte le long des routes (et des couloirs aériens) que prendra la vague suivante. Ils restent immobiles si les animations sont réduites.

### Modifié

- Sur un écran en largeur, le plateau ne pivote plus en portrait (seuls les écrans tenus en hauteur le font pivoter).
- Sur un téléphone très étroit, le choix de la langue se réduit à son icône globe pour laisser la place au bouton son.
- **HUD sur la carte** : sur téléphone en portrait, les vies, l'or, la vague et les boutons forment un bandeau au-dessus de la carte ; sur les écrans plus grands (et les téléphones à l'horizontale), ce sont des plaques posées dans les coins de la carte, qui gagne la hauteur de l'ancienne ligne de HUD. La barre du boss est posée en haut de la carte.
- **Vagues en dents de scie** : la menace ne monte plus en ligne droite. Après la première vague, les vagues vont par trois (respiration ×0,8, montée ×1, pic ×1,2), et la dernière vague est renforcée (×1,15) pour rester le point culminant du niveau. Une vague qui présente un nouvel ennemi ne fait jamais de pic. Réglé avec le robot : les 100 niveaux restent gagnables en Facile et en Normal.
- Les écrans autres que l'accueil sont chargés à la demande : la première page reste rapide sur téléphone.
- Les langues sont chargées à la demande : seule celle du joueur est téléchargée.
- Images de présentation (`marketing/`, `public/og-image.png`) refaites avec les nouveaux graphismes.
- Nouveau thème musical des menus, aux sonorités futuristes : nappe de synthétiseur qui « respire » au rythme de la grosse caisse, arpèges avec écho, mélodie glissée, basse et batterie électroniques. Le morceau se construit en boucle de 16 mesures (introduction, partie rythmée, pause avec montée).
- **Interface modernisée** : surfaces plus douces, boutons qui s'enfoncent quand on les touche, en-tête translucide.
- **Animations et transitions** : passage en fondu d'un écran à l'autre, entrée du menu d'accueil, niveaux d'un chapitre qui arrivent les uns après les autres, chiffres du jeu (vies, or, vague) qui réagissent quand ils changent, tour qui bondit quand on l'améliore, pouvoir qui brille quand il est de nouveau prêt, étoiles tamponnées en fin de niveau. Tout est coupé si l'appareil demande moins d'animations.
- **Jeu sur téléphone, tenu droit ou à l'horizontale : tout au doigt, sur un seul écran qui ne défile jamais.** La carte prend toute la hauteur que laissent le bandeau du HUD et la bande des pouvoirs, et ne change plus de taille quand la barre d'adresse du navigateur apparaît. L'en-tête du site est masqué pendant la partie ; le bouton son passe dans le HUD.
  - **Tiroir de construction** à la place du menu radial : toucher une case libre ouvre les tours du niveau, posées sur la carte du côté opposé à la case (dans la colonne de droite à l'horizontale). Un premier appui sur une tour montre sa portée et son aperçu sur la case, un second la construit. À partir de cinq tours, la rangée se fait glisser au doigt ; une tour trop chère tremble.
  - **Panneau de la tour compact**, posé sur la carte sans cacher la tour : améliorer, changer de cible d'un appui, vendre en deux appuis (le second confirme).
  - **Vagues au drapeau** : plus de bouton de vague ; une pastille à côté du drapeau montre la prochaine vague, et la toucher en donne le détail. Quitter passe dans le menu pause.
  - **Pouvoirs en simple icône**, dans une bande sous la carte ; un pouvoir indisponible dit pourquoi, et viser un pouvoir affiche une bulle avec un bouton Annuler.
  - Maître Gontran parle du drapeau et du tiroir, et ses bulles ne déplacent jamais la carte.

### Corrigé

- Le bouton **Améliorer** suit maintenant l'or réel : il se grise quand l'or manque et se réactive dès qu'il suffit. Après un achat, le niveau, le prix suivant et la valeur de revente se mettent à jour (ils restaient bloqués sur ceux du premier affichage). Même correction dans le mode Duel.

### Mise en ligne

- Version Playgama publiée dans le bac à sable (Sandbox) de Playgama : https://playgama.ai/play/4f2wgyuhvp.

## [2.0.0] - 2026-10-05

Bastion change de dimension : le jeu rejoint le royaume de Catapulte Mania et devient une vraie campagne.

### Ajouté

- **Campagne de 100 niveaux** en 10 chapitres, chacun avec son décor, ses routes et son boss. Certains niveaux ont plusieurs routes ou des rivières.
- **Histoire** : un prologue, un épisode par chapitre et un épilogue, avec la reine Ysolde, le vieux roi Aubert, Maître Gontran et le duc Mordrac. Une réplique de briefing pour chacun des 100 niveaux. Écran « Chronique » pour relire les épisodes.
- **10 tours** (7 nouvelles : Caserne, Baliste, Tour de guet, Trésorerie, Catapulte, Brasero et Tour d'orage ; le Laser disparaît) avec 4 types de dégâts (physique, feu, magie, pur) et une **version d'élite** par tour.
- **18 ennemis** (13 nouveaux) : volants, invisibles, soigneurs, sapeurs, golems, béliers, nécromanciens, tours de siège, champions et le duc Mordrac.
- **10 pouvoirs** à chronomètre (7 nouveaux ; la Surcharge disparaît). Avant chaque niveau, on choisit ceux que l'on emporte.
- **300 succès** : 3 défis par niveau, dans 19 familles différentes.
- **Atelier** : améliorations permanentes achetées avec des couronnes gagnées en jouant (victoires, étoiles, défis).
- **Deux joueurs sur le même écran** : campagne en **coopération** (100 niveaux, sa propre progression) et **duel** en écran partagé sur 8 arènes.
- **Aide pas à pas** dans les premiers niveaux et à chaque nouvelle tour ou nouveau pouvoir.
- Appel anticipé des vagues, avec de l'or en bonus.
- **Musique et bruitages** générés par le navigateur, avec réglage du volume.
- Versions pour **CrazyGames** et **Poki** (`npm run build:crazygames`, `npm run build:poki`), avec publicités facultatives (revivre, doubler les couronnes).
- Content-Security-Policy stricte ajoutée au moment du build.
- Vérification automatique des traductions (`npm run check:i18n`).

### Modifié

- Nouvelle direction artistique « bannière héraldique » commune avec Catapulte Mania, en clair comme en sombre.
- Le robot de test joue désormais les 100 niveaux, dans les 3 difficultés.

### Compatibilité

- Les sauvegardes de la version 1 sont converties automatiquement. Une partie en cours de la version 1 ne peut pas être reprise.

### Mise en ligne

- Mise en ligne sur Netlify (https://bastion-tower-defense.netlify.app), avec déploiement automatique à chaque push sur `main`.
- En-têtes de cache et de sécurité (`netlify.toml`).

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

[Non publié]: https://github.com/adamrodwebdev/bastion/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/adamrodwebdev/bastion/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/adamrodwebdev/bastion/releases/tag/v1.0.0
