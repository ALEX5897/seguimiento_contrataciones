import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_FILE = 'c:/Users/acasa/OneDrive - QuitoTurismo/Documentos/Desarrollo/Seguimiento_contrataciones/carga_masiva/Matriz_Base_carga_masiva_POA_2026_.xlsx';

try {
  console.log('Leyendo matriz...\n');
  const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headers = rows[0] || [];

  console.log('=== ENCABEZADOS DE LA MATRIZ ===\n');
  headers.forEach((header, index) => {
    console.log(`${index}: ${header}`);
  });

  console.log('\n=== SQL PARA TABLA PROCESOS ===\n');

  // Crear SQL basado en encabezados
  let sql = 'CREATE TABLE procesos (\n';
  sql += '  id INT PRIMARY KEY AUTO_INCREMENT,\n';

  const tipoDatos = (nombre) => {
    const lower = String(nombre).toLowerCase();
    if (lower.includes('presupuesto') || lower.includes('costo') || lower.includes('monto')) return 'DECIMAL(15,2)';
    if (lower.includes('fecha') || lower.includes('vigencia') || lower.includes('anio')) return 'DATE';
    if (lower.includes('id') || lower === 'id') return 'INT';
    if (lower.includes('activo') || lower.includes('tinyint')) return 'TINYINT';
    return 'VARCHAR(255)';
  };

  headers.forEach((header, index) => {
    if (header && header.trim()) {
      const columnName = header.trim().toLowerCase().replace(/ /g, '_');
      const tipo = tipoDatos(header);
      sql += `  ${columnName} ${tipo},\n`;
    }
  });

  sql += '  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n';
  sql += '  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n';
  sql += '  INDEX idx_codigo_olympo (codigo_olympo),\n';
  sql += '  INDEX idx_version_id (version_id)\n';
  sql += ');\n';

  console.log(sql);

  console.log('\n=== MAPPING DE CAMPOS (ENCABEZADOS → COLUMNA SQL) ===\n');
  headers.forEach((header, index) => {
    if (header && header.trim()) {
      const columnName = header.trim().toLowerCase().replace(/ /g, '_');
      console.log(`"${header}" → ${columnName}`);
    }
  });

  console.log(`\n✅ Total de campos en matriz: ${headers.length}`);

} catch (error) {
  console.error('Error:', error.message);
}
