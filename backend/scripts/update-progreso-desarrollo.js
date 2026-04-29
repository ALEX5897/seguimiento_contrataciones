// Script: update-progreso-desarrollo.js
// Descripción: Actualiza el archivo progreso_desarrollo.md con la fecha y hora de compilación.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const progresoPath = path.join(__dirname, '..', 'progreso_desarrollo.md');
const now = new Date();

const content = `# Progreso del Desarrollo\n\nEste archivo almacena automáticamente el progreso del desarrollo cada vez que se compila el proyecto.\n\n## Última actualización: ${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0,8)}\n\n- Compilación realizada automáticamente.\n\n---\n\n> Este archivo será sobrescrito en cada compilación. Para mantener historial, use control de versiones (git) o implemente backups adicionales.\n`;

fs.writeFileSync(progresoPath, content, 'utf8');
console.log('Archivo progreso_desarrollo.md actualizado.');
