# Bastion

Bastion est un jeu de **tower defense** qui se joue dans le navigateur, sur ordinateur, tablette et téléphone.

Des ennemis suivent une route. Vous placez des tours le long de cette route pour les arrêter avant la sortie.

![Aperçu du jeu](public/og-image.png)

## Ce que contient le jeu

- **6 niveaux**, de plus en plus difficiles.
- **4 tours** : Archer, Canon, Givre et Laser. Chaque tour peut être améliorée deux fois.
- **5 types d'ennemis**, dont un boss.
- **4 pouvoirs spéciaux** (Gel, Météores, Ruée vers l'or, Surcharge). On les débloque en finissant des niveaux. Chaque pouvoir dure quelques secondes, puis doit se recharger.
- **3 difficultés** : Facile, Normal, Difficile.
- **Sauvegarde automatique** dans le navigateur.
- **Français et anglais**.
- **Mode sombre**.

## Lancer le projet

Il faut avoir [Node.js](https://nodejs.org) installé (version 18 ou plus).

```bash
npm install        # installe les dépendances (une seule fois)
npm run dev        # lance le jeu en local, l'adresse s'affiche dans le terminal
```

Autres commandes utiles :

| Commande | À quoi elle sert |
|---|---|
| `npm run build` | Crée la version finale du site dans le dossier `dist/`. |
| `npm run preview` | Affiche la version finale en local, pour la vérifier avant de la mettre en ligne. |
| `npm test` | Un robot joue tous les niveaux pour vérifier que le jeu fonctionne et qu'il est bien équilibré. |

## Mettre le site en ligne

1. Lancez `npm run build`.
2. Envoyez le dossier `dist/` sur votre hébergeur (Netlify, GitHub Pages, etc.).
3. Remplacez l'adresse `https://bastion-td.example/` par la vraie adresse du site dans ces trois fichiers : `index.html`, `public/robots.txt` et `public/sitemap.xml`. Cela aide Google à bien référencer le jeu.

## Comment le code est organisé

Le code est séparé en trois parties :

- **`src/core/`** : le moteur du jeu (les règles, les tours, les ennemis, les vagues…). Il ne dépend pas de Vue, ce qui permet de le tester tout seul.
- **`src/services/`** : les outils partagés (sauvegarde, traduction, thème clair ou sombre).
- **`src/components/`** : l'interface, faite avec Vue.

Chaque fichier commence par un commentaire qui explique son rôle. Les détails techniques sont dans les commentaires du code.

### Quelques modifications courantes

**Ajouter une langue**
1. Copiez `src/locales/en.js` et renommez la copie (par exemple `de.js` pour l'allemand).
2. Traduisez les textes, sans changer les noms des clés.
3. Ajoutez la langue dans `src/services/index.js`.

**Changer un niveau** (route, rochers, or de départ) : modifiez `src/core/config/LevelCatalog.js`.

**Changer la puissance d'une tour** : modifiez `src/core/entities/towers/types.js`.

**Changer la difficulté** : modifiez `src/core/config/Difficulty.js`.

Après un changement d'équilibrage, lancez `npm test` pour voir si les niveaux restent jouables.

## Jouer au clavier

Cliquez d'abord sur le plateau de jeu, puis :

| Touche | Action |
|---|---|
| Flèches | Déplacer la sélection |
| `1` à `4` | Construire une tour |
| `Entrée` | Sélectionner la case |
| `U` | Améliorer la tour |
| `S` | Vendre la tour |
| `Espace` | Lancer la vague |
| `P` | Pause |
| `Échap` | Annuler la sélection |

## Travailler à plusieurs

Avant de modifier le code, lisez [CONTRIBUTING.md](CONTRIBUTING.md). Il explique comment nommer les branches et écrire les messages de commit.

Les changements de chaque version sont listés dans [CHANGELOG.md](CHANGELOG.md).
