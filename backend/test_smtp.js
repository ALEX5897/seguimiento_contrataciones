import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT, 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD;
const secure = process.env.SMTP_SECURE === 'true';
const requireTLS = process.env.SMTP_REQUIRE_TLS === 'true';

console.log('🔧 PRUEBA DE CONEXIÓN SMTP');
console.log('============================');
console.log('Host:', host);
console.log('Port:', port);
console.log('User:', user);
console.log('Password length:', pass?.length || 0);
console.log('Password (primeros 3):', pass?.substring(0, 3) + '***');
console.log('Secure:', secure);
console.log('RequireTLS:', requireTLS);
console.log('============================\n');

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  requireTLS,
  auth: {
    user,
    pass
  },
  logger: true,
  debug: true
});

console.log('📧 Verificando conexión SMTP...\n');

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Conexión SMTP correcta!');
    process.exit(0);
  }
});
