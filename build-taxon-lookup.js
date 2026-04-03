// Génère un lookup compact pour la vue lisible.
// Usage:
//   node build-taxon-lookup.js taxon.txt taxon-lookup.min.json

const fs = require('fs');
const readline = require('readline');

function normalize(s) {
  return String(s || '').trim().toLowerCase().replace(/\.$/, '');
}

function normalizeVernacular(s) {
  if (!s || !String(s).trim()) return '';
  return String(s)
    .replace(/\s*\(L['eE]\)\s*$/i, '')
    .replace(/\s*\(Le\)\s*$/i, '')
    .replace(/\s*\(La\)\s*$/i, '')
    .replace(/\s*\(Les\)\s*$/i, '')
    .trim();
}

const REPTILE_ORDERS = new Set(['Squamata', 'Chelonii', 'Testudines', 'Crocodylia', 'Rhynchocephalia', 'Serpentes']);

function getGroup(kingdom, clazz, order) {
  if (kingdom === 'Plantae') return 'Plantes';
  if (clazz === 'Amphibia') return 'Amphibiens';
  if (clazz === 'Reptilia') return 'Reptiles';
  if ((clazz && REPTILE_ORDERS.has(clazz)) || (order && REPTILE_ORDERS.has(order))) return 'Reptiles';
  if (clazz === 'Aves') return 'Oiseaux';
  if (clazz === 'Arachnida') return 'Arachnides';
  if (clazz === 'Mammalia') return 'Mammifères';
  if (['Actinopterygii', 'Chondrichthyes', 'Sarcopterygii', 'Petromyzonti', 'Myxini'].includes(clazz)) return 'Poissons';
  if (order === 'Lepidoptera') return 'Lépidoptères';
  if (order === 'Odonata') return 'Odonates';
  if (order === 'Orthoptera') return 'Orthoptères';
  return '';
}

async function build(inputPath, outputPathJson) {
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath, { encoding: 'utf8' }),
    crlfDelay: Infinity
  });

  let headerDone = false;
  let idx = {};
  const byScientific = new Map();

  for await (const line of rl) {
    if (!headerDone) {
      const h = line.split('\t');
      idx = {
        scientificNameID: h.indexOf('scientificNameID'),
        scientificName: h.indexOf('scientificName'),
        acceptedNameUsage: h.indexOf('acceptedNameUsage'),
        kingdom: h.indexOf('kingdom'),
        class: h.indexOf('class'),
        order: h.indexOf('order'),
        vernacularName: h.indexOf('vernacularName')
      };
      if (Object.values(idx).some(v => v === -1)) {
        throw new Error('Colonnes manquantes dans taxon.txt');
      }
      headerDone = true;
      continue;
    }

    if (!line) continue;
    const cols = line.split('\t');
    const scientificName = (cols[idx.scientificName] || '').trim();
    if (!scientificName) continue;

    const key = normalize(scientificName);
    if (!key || byScientific.has(key)) continue;

    const vernacularRaw = (cols[idx.vernacularName] || '').trim();
    const vernacularName = normalizeVernacular((vernacularRaw.split(',')[0] || '').trim());
    const acceptedNameUsage = (cols[idx.acceptedNameUsage] || '').trim() || scientificName;
    const group = getGroup(
      (cols[idx.kingdom] || '').trim(),
      (cols[idx.class] || '').trim(),
      (cols[idx.order] || '').trim()
    );

    byScientific.set(key, {
      scientificNameID: (cols[idx.scientificNameID] || '').trim(),
      scientificName,
      acceptedNameUsage,
      vernacularName,
      group
    });
  }

  const entries = Array.from(byScientific.values());
  const payload = { generatedAt: new Date().toISOString(), entries };
  fs.writeFileSync(outputPathJson, JSON.stringify(payload), 'utf8');

  const outputPathJs = outputPathJson.replace(/\.json$/i, '.js');
  const jsPayload = `window.TAXON_LOOKUP = ${JSON.stringify(payload)};`;
  fs.writeFileSync(outputPathJs, jsPayload, 'utf8');

  console.log(`OK: ${entries.length} entrées écrites dans ${outputPathJson}`);
  console.log(`OK: script JS écrit dans ${outputPathJs}`);
}

const input = process.argv[2] || 'taxon.txt';
const output = process.argv[3] || 'taxon-lookup.min.json';

build(input, output).catch((e) => {
  console.error(e);
  process.exit(1);
});

