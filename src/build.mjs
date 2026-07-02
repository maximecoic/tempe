#!/usr/bin/env node
// Build : src/Dashboard-production.dc.html  ->  ../index.html (racine, servi par Pages)
//
// index.html est une COPIE TEXTE du .dc.html ; on n'ajuste QUE le chemin de
// support.js (index.html est à la racine, support.js reste dans src/).
//
// Deux raisons de NE PAS inliner support.js et de NE PAS parser le HTML :
//  1. Casse des événements — le template <x-dc> utilise des attributs camelCase
//     (onMouseMove, onTouchStart…). Un parseur HTML les met en minuscules
//     (onmousemove…) → liaison React cassée. La copie texte préserve la casse.
//  2. Auto-lecture — support.js se relit via fetch(location.href) et extrait
//     `<x-dc>…</x-dc>` par simple recherche de texte. Son propre code contient
//     les littéraux `<x-dc` / `</x-dc>` ; inliné, il s'auto-extrairait comme
//     « template » (bug observé : la source du framework s'affichait à l'écran,
//     avec `sc-camel-root-name`). On le garde donc en fichier externe.
//
// Aucune dépendance npm. Usage : `node src/build.mjs`

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const srcDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(srcDir, '..');

const dc = readFileSync(join(srcDir, 'Dashboard-production.dc.html'), 'utf8');

// index.html vit à la racine, support.js dans src/ → on corrige la seule
// référence relative. `.dc.html` reste ouvrable tel quel en dev.
const from = '<script src="./support.js"></script>';
const to = '<script src="./src/support.js"></script>';
if (!dc.includes(from)) {
  throw new Error(`Balise introuvable dans Dashboard-production.dc.html : ${from}`);
}
const html = dc.replace(from, () => to);

writeFileSync(join(repoRoot, 'index.html'), html);
console.log(`index.html généré (${(html.length / 1024).toFixed(1)} Ko) — support.js référencé (./src/support.js)`);
