# Journal des versions

Toutes les modifications importantes du projet sont notées ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et les numéros de version suivent le [versionnage sémantique](https://semver.org/lang/fr/) :

- **MAJEUR** (2.0.0) : changement qui casse quelque chose, par exemple d'anciennes sauvegardes qui ne se chargent plus.
- **MINEUR** (1.1.0) : nouvelle fonctionnalité, comme un nouveau niveau, une nouvelle tour ou une nouvelle langue.
- **CORRECTIF** (1.0.1) : correction de bug ou réglage d'équilibrage.

## [Non publié]

### Ajouté

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

[Non publié]: https://github.com/adamrodwebdev/bastion/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/adamrodwebdev/bastion/releases/tag/v1.0.0
