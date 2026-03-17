import 'dotenv/config';
import { initMySQL, query } from '../data/mysql.js';

async function run() {
  await initMySQL();

  const estados = await query(`
    UPDATE seguimiento_etapas
    SET estado = 'pendiente',
        fecha_real = NULL,
        observaciones = NULL
  `);

  const seguimientos = await query('DELETE FROM seguimientos_diarios');

  console.log('Limpieza demo completada');
  console.log(`- Estados reiniciados: ${estados.affectedRows ?? 0}`);
  console.log(`- Comentarios/seguimientos eliminados: ${seguimientos.affectedRows ?? 0}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error preparando demo:', error);
    process.exit(1);
  });
