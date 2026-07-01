#!/usr/bin/env node
// Build : src/Dashboard-production.dc.html + src/support.js  ->  ../index.html
//
// L'inline se fait par REMPLACEMENT DE TEXTE (jamais via un parseur HTML).
// C'est volontaire et important : le template <x-dc> utilise des attributs
// d'événements en camelCase (onMouseMove, onTouchStart, …). Un parseur HTML
// réécrirait ces noms en minuscules (onmousemove…), ce que le runtime ne
// remappe pas toujours vers les événements React → tooltip + drag de l'axe
// cassés. Le remplacement textuel préserve la casse exacte.
//
// Aucune dépendance npm. Usage : `node src/build.mjs`

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const srcDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(srcDir, '..');

const dc = readFileSync(join(srcDir, 'Dashboard-production.dc.html'), 'utf8');
const support = readFileSync(join(srcDir, 'support.js'), 'utf8');

const tagRe = /<script\s+src=["']\.\/support\.js["']>\s*<\/script>/;
if (!tagRe.test(dc)) {
  throw new Error(
    'Balise <script src="./support.js"></script> introuvable dans Dashboard-production.dc.html'
  );
}

// Neutralise tout `</script>` littéral pour éviter une fermeture prématurée de
// la balise inline (n'apparaît que dans des chaînes/regex JS : sans effet au run).
const safeSupport = support.replace(/<\/script>/gi, '<\\/script>');

const html = dc.replace(tagRe, () => `<script>\n${safeSupport}\n</script>`);

writeFileSync(join(repoRoot, 'index.html'), html);
console.log(`index.html généré (${(html.length / 1024).toFixed(1)} Ko)`);
