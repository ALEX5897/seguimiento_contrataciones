import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

try {
  console.log('🔧 Actualizando configuración de notificaciones en BD...\n');

  // Opción 1: Limpiar registros defectuosos
  await connection.execute(
    'DELETE FROM configuracion_notificaciones WHERE remitente_email LIKE "%noreply@quitoturismo%" OR remitente_email IS NULL OR remitente_email = ""'
  );
  console.log('✅ Registros defectuosos eliminados');

  // Opción 2: Insertar/actualizar con valores correctos
  await connection.execute(
    `INSERT INTO configuracion_notificaciones
    (enabled, remitente_nombre, remitente_email, tipo_servidor, smtp_host, smtp_port,
     smtp_secure, requiere_auth, smtp_user, smtp_password, notificar_etapas_atrasadas,
     dias_atraso_minimo, hora_envio, zona_horaria, supervisor_emails, asunto_plantilla,
     plantilla_html, pie_mensaje)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    enabled = 1,
    remitente_nombre = VALUES(remitente_nombre),
    remitente_email = VALUES(remitente_email),
    tipo_servidor = VALUES(tipo_servidor),
    smtp_host = VALUES(smtp_host),
    smtp_port = VALUES(smtp_port),
    smtp_secure = VALUES(smtp_secure),
    requiere_auth = VALUES(requiere_auth),
    smtp_user = VALUES(smtp_user),
    smtp_password = VALUES(smtp_password)`,
    [
      'Sistema Seguimiento',
      'no-reply@quito-turismo.gob.ec',
      'office365',
      'smtp.office365.com',
      587,
      false,
      true,
      'no-reply@quito-turismo.gob.ec',
      'Q7#mN2!xLp',
      true,
      2,
      '08:00',
      'America/Guayaquil',
      '',
      'Seguimiento de contrataciones - {{motivo}}',
      '',
      'Este es un mensaje automático del Sistema de Seguimiento de Contrataciones - QuitoTurismo'
    ]
  );
  console.log('✅ Configuración actualizada correctamente');

  // Verificar
  const [result] = await connection.execute('SELECT * FROM configuracion_notificaciones LIMIT 1');
  console.log('\n✅ Configuración final:');
  console.log('  Email:', result[0]?.remitente_email || '(vacío)');
  console.log('  Usuario SMTP:', result[0]?.smtp_user || '(vacío)');
  console.log('  Host:', result[0]?.smtp_host || '(vacío)');

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await connection.end();
}
