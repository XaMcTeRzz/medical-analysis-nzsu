/**
 * Відновлення паролів у Neon:
 * - admin          → 59847216  (оригінальний пароль адміна)
 * - решта           → перші 2 букви логіну (транслітерація прізвища) + "2026"
 *                    Наприклад: bihovshchyts.sofiya → Bi2026
 *
 * Запуск:
 *   $env:DATABASE_URL="..."; node scripts/restore_passwords.js
 */
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не задано');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

function getPasswordFromLogin(login, role) {
  if (role === 'admin' || login === 'admin') {
    return '59847216'; // оригінальний пароль адміна
  }
  // Перші 2 символи логіну (до крапки) → капіталізація першої + "2026"
  const base = login.split('.')[0].substring(0, 2);
  return base.charAt(0).toUpperCase() + base.slice(1) + '2026';
}

async function restorePasswords() {
  console.log('🔄 Відновлення простих паролів у Neon PostgreSQL...\n');
  
  const users = await sql`SELECT id, login, role FROM users`;
  console.log(`📋 Знайдено ${users.length} користувачів\n`);

  let updated = 0;
  for (const user of users) {
    const password = getPasswordFromLogin(user.login, user.role);
    await sql`UPDATE users SET password = ${password} WHERE id = ${user.id}`;
    console.log(`  ✅ [${user.login}] → ${user.role === 'admin' ? '(admin)' : password}`);
    updated++;
  }

  console.log(`\n✨ Готово! Оновлено ${updated} паролів.`);
}

restorePasswords().catch(err => {
  console.error('❌ Помилка:', err.message);
  process.exit(1);
});
