# Dashboard température — source

Dashboard navigateur affichant les températures par pièce (jauges de confort, courbes
interactives, heatmap, sélecteur temporel par glissement). Les données sont chargées en
direct depuis `data.json` (à la racine du repo, à côté de `index.html`).

## Architecture

| Fichier | Rôle |
|---|---|
| `Dashboard-production.dc.html` | **Source à éditer.** Un *Design Component* : un seul fichier qui contient le template (markup, styles inline), la classe logique `class Component extends DCLogic { … }` (fetch des données, calculs min/moy/max, confort, gestion du zoom/drag de l'axe) et les métadonnées. |
| `support.js` | **Runtime** SC/DCLogic (le « framework »). Parse `<x-dc>`, gère `{{ … }}`, `<sc-for>`, `<sc-if>`, le streaming et le montage de la classe `Component`. À n'éditer **que** pour corriger le framework (ex. `EVENT_MAP` complété : les événements `mousemove` / `touch*` / `pointer*` étaient absents → tooltip et drag de l'axe cassés). |
| `build.mjs` | **Script de build** (Node, sans dépendance) : copie `Dashboard-production.dc.html` en `index.html` (racine) en corrigeant le chemin de `support.js`. |
| `index.html` (à la racine du repo) | **Build déployé, généré par `build.mjs`** : copie de `Dashboard-production.dc.html` référençant `./src/support.js`. **Ne jamais éditer à la main** — régénéré depuis la source. |

Pas de toolchain npm/webpack requise pour développer.

## Développer en local

```
# servir le dossier (data.json doit être accessible à côté)
python3 -m http.server 8000
# puis ouvrir http://localhost:8000/Dashboard-production.dc.html
```

`Dashboard-production.dc.html` charge `./support.js` et `./data.json` en relatif.
Repli automatique sur l'URL raw GitHub si `./data.json` est absent.

## Build (→ index.html)

```
node src/build.mjs
```

`build.mjs` copie `Dashboard-production.dc.html` en `index.html` à la racine, en
remplaçant simplement `./support.js` par `./src/support.js` (index.html est à la racine,
`support.js` reste dans `src/`). C'est une **copie texte** — ni parseur HTML, ni inline —
pour deux raisons :

1. **Casse des événements** : un parseur HTML met les attributs en minuscules
   (`onMouseMove` → `onmousemove`), ce qui casse la liaison des événements. La copie
   texte préserve la casse exacte.
2. **Auto-lecture** : `support.js` se relit via `fetch(location.href)` et extrait
   `<x-dc>…</x-dc>` par recherche de texte. Comme son propre code contient les littéraux
   `<x-dc` / `</x-dc>`, l'**inliner** le ferait s'auto-extraire comme template (la source
   du framework s'affichait alors à l'écran). Il reste donc en fichier externe.

Le `.dc.html` contient un `<template id="__bundler_thumbnail">` (vignette SVG) — conservé tel quel.

## Déploiement automatique (CI)

`.github/workflows/deploy.yml` régénère `index.html` à chaque push touchant `src/**`,
puis le commit sur `main` (GitHub Pages sert la racine du repo). Déclenchable aussi à la
main via l'onglet *Actions* → *Run workflow*.

> Si le `git push` du workflow échoue : Settings → Actions → General →
> *Workflow permissions* → **Read and write permissions**.

## Source des données

`componentDidMount()` fait `fetch('./data.json')` (repli sur l'URL raw GitHub).
Schéma attendu : tableau d'objets `{ "Heure": ISO8601, "<Pièce>": number|"" , … }`.
`""` = capteur absent → la pièce est grisée tant qu'elle n'a pas de relevé, et les trous
cohérents (écart de temps + de température plausibles) sont reliés en pointillé.
`Paris` est traité comme la référence extérieure.
