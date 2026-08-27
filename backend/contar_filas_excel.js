#!/usr/bin/env node
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelPath = path.join(__dirname, '..', 'Matriz_Base_POA_2026_1.xlsx');

const workbook = XLSX.readFile(excelPath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const datos = XLSX.utils.sheet_to_json(worksheet);

console.log(`\n📊 ANÁLISIS DEL EXCEL:\n`);
console.log(`✅ Total de filas/procesos en Excel: ${datos.length}`);

// Contar procesos sin código
const sinCodigo = datos.filter(d => !d.codigo_olympo || d.codigo_olympo === 'N/A').length;
console.log(`📌 Procesos sin código_olympo: ${sinCodigo}`);

// Contar duplicados
const codigosMap = new Map();
datos.forEach(d => {
  const codigo = d.codigo_olympo || 'N/A';
  codigosMap.set(codigo, (codigosMap.get(codigo) || 0) + 1);
});

const duplicados = Array.from(codigosMap.entries()).filter(([k, v]) => v > 1);
console.log(`🔍 Códigos duplicados: ${duplicados.length}`);
if (duplicados.length > 0) {
  duplicados.slice(0, 5).forEach(([codigo, cantidad]) => {
    console.log(`   - Código ${codigo}: ${cantidad} veces`);
  });
  if (duplicados.length > 5) {
    console.log(`   ... y ${duplicados.length - 5} más`);
  }
}
