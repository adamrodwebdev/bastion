# Journal des versions

Toutes les modifications importantes du projet sont notées ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et les numéros de version suivent le [versionnage sémantique](https://semver.org/lang/fr/) :

- **MAJEUR** (2.0.0) : changement qui casse quelque chose, par exemple d'anciennes sauvegardes qui ne se chargent plus.
- **MINEUR** (1.1.0) : nouvelle fonctionnalité, comme un nouveau niveau, une nouvelle tour ou une nouvelle langue.
- **CORRECTIF** (1.0.1) : correction de bug ou réglage d'équilibrage.

## [Non publié]

### Ajouté

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

### Modifié

- Les écrans autres que l'accueil sont chargés à la demande : la première page reste rapide sur téléphone.
- Les langues sont chargées à la demande : seule celle du joueur est téléchargée.
- Images de présentation (`marketing/`, `public/og-image.png`) refaites avec les nouveaux graphismes.

- Nouveau thème musical des menus, aux sonorités futuristes : nappe de synthétiseur qui « respire » au rythme de la grosse caisse, arpèges avec écho, mélodie glissée, basse et batterie électroniques. Le morceau se construit en boucle de 16 mesures (introduction, partie rythmée, pause avec montée).

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
