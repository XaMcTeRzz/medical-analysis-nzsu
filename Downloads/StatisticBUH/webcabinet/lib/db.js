const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL environment variable is not defined!');
}

const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

module.exports = { sql };
