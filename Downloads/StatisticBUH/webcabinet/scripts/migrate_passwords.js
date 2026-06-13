/**
 * Скрипт міграції: хешує всі plain-text паролі в Neon PostgreSQL за допомогою bcrypt.
 * Запускати ОДИН РАЗ після деплою нового коду.
 * 
 * Використання:
 *   node scripts/migrate_passwords.js
 */
const { neon } = require('@neondatabase/serverless');
const { hashPassword, isHashed } = require('../lib/auth');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не знайдено. Перевірте .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migratePasswords() {
  console.log('🔐 Починаємо міграцію паролів...');

  const users = await sql`SELECT id, login, password FROM users`;
  console.log(`📋 Знайдено ${users.length} користувачів`);

  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    if (isHashed(user.password)) {
      console.log(`  ⏭️  [${user.login}] — вже захешований, пропускаємо`);
      skipped++;
      continue;
    }

    const hashed = await hashPassword(user.password);
    await sql`UPDATE users SET password = ${hashed} WHERE id = ${user.id}`;
    console.log(`  ✅ [${user.login}] — пароль захешовано`);
    migrated++;
  }

  console.log(`\n✨ Міграція завершена! Оновлено: ${migrated}, Пропущено: ${skipped}`);
}

migratePasswords().catch(err => {
  console.error('❌ Помилка міграції:', err.message);
  process.exit(1);
});
