const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  try {
    const dotenvPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(dotenvPath)) {
      const envContent = fs.readFileSync(dotenvPath, 'utf8');
      const match = envContent.match(/^DATABASE_URL=(.*)$/m);
      if (match) {
        process.env.DATABASE_URL = match[1].trim();
      }
    }
  } catch (e) {
    // ignore
  }
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not defined!');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function clearDoctors() {
  console.log('Очищення бази даних Neon PostgreSQL від лікарів...');
  try {
    const result = await sql`DELETE FROM users WHERE role <> 'admin'`;
    console.log('Базу успішно очищено! Усі користувачі, крім admin, видалені.');
  } catch (error) {
    console.error('Помилка очищення бази:', error.message);
  }
}

clearDoctors();
