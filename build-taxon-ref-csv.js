// build-taxon-ref-csv.js
// Usage:
//   node build-taxon-ref-csv.js taxon.txt taxon_ref.csv

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

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function buildCsv(inputPath, outputPath) {
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
        acceptedNameUsageID: h.indexOf('acceptedNameUsageID'),
        scientificName: h.indexOf('scientificName'),
        acceptedNameUsage: h.indexOf('acceptedNameUsage'),
        vernacularName: h.indexOf('vernacularName'),
        kingdom: h.indexOf('kingdom'),
        class: h.indexOf('class'),
        order: h.indexOf('order')
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

    const scientificname_clean = normalize(scientificName);
    if (!scientificname_clean || byScientific.has(scientificname_clean)) continue;

    const acceptedNameUsage = (cols[idx.acceptedNameUsage] || '').trim() || scientificName;
    const vernacularRaw = (cols[idx.vernacularName] || '').trim();
    const vernacularName = normalizeVernacular((vernacularRaw.split(',')[0] || '').trim());

    const groupLabel = getGroup(
      (cols[idx.kingdom] || '').trim(),
      (cols[idx.class] || '').trim(),
      (cols[idx.order] || '').trim()
    );

    byScientific.set(scientificname_clean, {
      scientificname_clean,
      scientificname: scientificName,
      acceptednameusage: acceptedNameUsage,
      vernacularname: vernacularName,
      group_label: groupLabel,
      scientificnameid: (cols[idx.scientificNameID] || '').trim(),
      acceptednameusageid: (cols[idx.acceptedNameUsageID] || '').trim()
    });
  }

  const headers = [
    'scientificname_clean',
    'scientificname',
    'acceptednameusage',
    'vernacularname',
    'group_label',
    'scientificnameid',
    'acceptednameusageid'
  ];

  const rows = [headers.join(';')];
  for (const row of byScientific.values()) {
    rows.push(headers.map(h => csvEscape(row[h])).join(';'));
  }

  fs.writeFileSync(outputPath, rows.join('\n'), 'utf8');
  console.log(`OK: ${byScientific.size} lignes écrites dans ${outputPath}`);
}

const input = process.argv[2] || 'taxon.txt';
const output = process.argv[3] || 'taxon_ref.csv';

buildCsv(input, output).catch((err) => {
  console.error(err);
  process.exit(1);
});

