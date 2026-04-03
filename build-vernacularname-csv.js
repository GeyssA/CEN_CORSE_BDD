// build-vernacularname-csv.js
// Convertit vernacularname.txt (TSV) en vernacularname.csv (même convention que taxon_ref.csv : séparateur ;).
// Usage:
//   node build-vernacularname-csv.js vernacularname.txt vernacularname.csv

const fs = require('fs');
const readline = require('readline');

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

  const rows = [];
  for await (const line of rl) {
    if (!line) continue;
    const cols = line.split('\t');
    rows.push(cols.map(csvEscape).join(';'));
  }

  fs.writeFileSync(outputPath, rows.join('\n'), 'utf8');
  console.log(`OK: ${rows.length} lignes écrites dans ${outputPath}`);
}

const input = process.argv[2] || 'vernacularname.txt';
const output = process.argv[3] || 'vernacularname.csv';

buildCsv(input, output).catch((err) => {
  console.error(err);
  process.exit(1);
});
