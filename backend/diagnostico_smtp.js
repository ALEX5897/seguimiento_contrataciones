import dotenv from 'dotenv';

const ENV_PATH = process.env.DOTENV_CONFIG_PATH || '.env';
console.log(`📋 Cargando variables desde: ${ENV_PATH}`);

const envLoaded = dotenv.config({ path: ENV_PATH });
if (envLoaded.error) {
  console.error('❌ Error cargando .env:', envLoaded.error);
} else {
  console.log('✅ .env cargado exitosamente');
}

console.log('\n📧 VARIABLES SMTP DETECTADAS:');
console.log('SMTP_HOST:', process.env.SMTP_HOST || '(no definida)');
console.log('SMTP_PORT:', process.env.SMTP_PORT || '(no definida)');
console.log('SMTP_USER:', process.env.SMTP_USER || '(no definida)');
console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '✅ (definida)' : '❌ (no definida)');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ (definida)' : '❌ (no definida)');
console.log('SMTP_SECURE:', process.env.SMTP_SECURE || '(no definida)');
console.log('SMTP_REQUIRE_TLS:', process.env.SMTP_REQUIRE_TLS || '(no definida)');
console.log('NOTIFICATIONS_ENABLED:', process.env.NOTIFICATIONS_ENABLED || '(no definida)');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || '(no definida)');
console.log('EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME || '(no definida)');
