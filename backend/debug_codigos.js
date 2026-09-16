import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('backup_poa_pac_2026-08-28T17-06-32.sql');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

const codigos = [];
let inSubtareas = false;
let colIdx = {};

(async () => {
  for await (const line of rl) {
    if (line.includes('INSERT INTO subtareas (')) {
      inSubtareas = true;
      const colsMatch = line.match(/\(([^)]+)\)/);
      if (colsMatch) {
        const cols = colsMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
        cols.forEach((col, idx) => { colIdx[col] = idx; });
      }
      continue;
    }

    if (line.match(/^\(\d+/)) {
      if (inSubtareas) {
        const cleaned = line.replace(/,$/, '').replace(/;$/, '').trim();
        const content = cleaned.substring(1, cleaned.length - 1);
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < content.length; i++) {
          const char = content[i];
          const prev = i > 0 ? content[i - 1] : '';
          if (char === "'" && prev !== '\\') {
            inQuotes = !inQuotes;
            current += char;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const codigo = values[colIdx['codigo_olympo']];
        if (codigo) codigos.push(codigo);
      }
    }

    if (line.includes('INSERT INTO subtareas_etapas')) {
      inSubtareas = false;
    }
  }

  console.log(`Códigos extraídos: ${codigos.length}\n`);
  console.log('Primeros 30:');
  codigos.slice(0, 30).forEach((c, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${c}`);
  });
})();
