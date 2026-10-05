# Contribuer au projet

Ce guide explique comment travailler sur Bastion à plusieurs sans se marcher dessus.

## Les branches

- `main` contient toujours une version qui fonctionne. On n'écrit jamais directement dessus.
- Pour chaque tâche, créez une branche à partir de `main` :

| Type de travail | Nom de branche |
|---|---|
| Nouvelle fonctionnalité | `feat/nom-court` (ex. `feat/tour-poison`) |
| Correction de bug | `fix/nom-court` (ex. `fix/sauvegarde-safari`) |
| Documentation | `docs/nom-court` |
| Nettoyage du code sans changement visible | `refactor/nom-court` |

Quand la tâche est terminée, ouvrez une **pull request** vers `main`. Un collègue la relit avant de la fusionner.

## Les messages de commit

On suit la convention [Conventional Commits](https://www.conventionalcommits.org/fr/). Un message commence par un type, suivi d'une courte phrase :

```
type(zone): ce que fait le commit
```

| Type | Quand l'utiliser |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation seulement |
| `style` | Mise en forme du code, sans changement de comportement |
| `refactor` | Réorganisation du code, sans changement de comportement |
| `perf` | Amélioration des performances |
| `test` | Ajout ou modification de tests |
| `chore` | Configuration, dépendances, outillage |

La zone est facultative : `core`, `ui`, `i18n`, `save`, `seo`…

Exemples :

```
feat(core): ajoute la tour Poison
fix(save): la partie ne se chargeait pas après une mise à jour
docs: explique comment ajouter une langue
```

## Les versions

1. Pendant le développement, notez chaque changement visible dans la section **[Non publié]** de [CHANGELOG.md](CHANGELOG.md).
2. Pour publier une version :
   - choisissez le nouveau numéro (voir les règles en haut du CHANGELOG) ;
   - renommez la section **[Non publié]** avec ce numéro et la date ;
   - mettez à jour `version` dans `package.json` ;
   - faites un commit `chore(release): v1.1.0` ;
   - créez un tag : `git tag -a v1.1.0 -m "v1.1.0"` puis `git push --follow-tags` (ou créez la « Release » directement depuis la page GitHub du dépôt, qui crée le tag pour vous).

**Attention aux sauvegardes.** Si vous changez la forme des données sauvegardées, augmentez `Game.SAVE_VERSION` dans `src/core/Game.js`. Les anciennes parties seront alors ignorées au lieu de faire planter le jeu. Ce type de changement compte comme une version **majeure**.

## Avant d'ouvrir une pull request

- [ ] `npm run build` fonctionne sans erreur.
- [ ] `npm test` termine sans erreur, et les 100 niveaux restent gagnables en Facile et en Normal.
- [ ] `npm run check:i18n` ne signale aucun texte manquant.
- [ ] Le jeu a été testé sur un écran de téléphone (outils de développement du navigateur) et en mode sombre.
- [ ] Si le changement touche le mode à deux joueurs, il a été testé en coopération **et** en duel.
- [ ] Les nouveaux textes sont traduits dans **tous** les fichiers de `src/locales/`, avec les mêmes clés.
- [ ] Les nouveaux fichiers commencent par un commentaire `@file` qui explique leur rôle.
- [ ] Les méthodes publiques ont un commentaire JSDoc (`@param`, `@returns`).
- [ ] Le CHANGELOG est à jour.

## Règles de code

- **Langue** : le code et les commentaires sont en anglais. Les textes affichés au joueur sont dans `src/locales/`, jamais écrits en dur dans les composants.
- **Le moteur reste indépendant** : rien dans `src/core/` ne doit importer Vue ni manipuler le DOM. Seul `Renderer.js` dessine, sur un canvas qu'on lui fournit.
- **Ajouter une tour, un ennemi ou un pouvoir** : créez une sous-classe (`Tower`, `Enemy` ou `Power`), enregistrez-la dans la fabrique correspondante, indiquez son niveau d'apparition dans `src/core/config/unlocks.js`, puis ajoutez ses textes dans les traductions. Lancez ensuite `npm test` : le robot dira si la campagne reste gagnable.
- **Le hasard est contrôlé** : utilisez toujours `game.random()` (ou `SeededRandom`) et jamais `Math.random()` pour les règles du jeu (seuls les effets visuels peuvent s'en servir). Ainsi, un niveau se joue toujours de la même façon, ce qui permet de le tester.
- **Publicités** : tout le code des portails est dans `src/services/ads/`. Le reste du jeu ne parle qu'à l'interface `AdService`, qui ne fait rien sur notre site.
- **Mise en forme** : 2 espaces, guillemets simples, point-virgule, 120 caractères par ligne au maximum. Le fichier `.editorconfig` règle votre éditeur automatiquement.

## Version de démonstration

`npm run build:standalone` crée le dossier `standalone/`, une version qui fonctionne sans Vite (Vue est chargé depuis un CDN). Elle sert uniquement aux démos rapides. Pour la mise en ligne, utilisez toujours `npm run build`.
