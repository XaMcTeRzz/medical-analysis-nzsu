const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const crypto = require('crypto');
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
  console.error('❌ DATABASE_URL environment variable is not defined! Please set it before running this script.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

function idToUUID(id) {
  const hash = crypto.createHash('md5').update(id).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  login TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  position TEXT,
  stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

const CREATE_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_users_login ON public.users(login);
`;

async function setupNeon() {
  try {
    console.log('🔗 Connecting to Neon PostgreSQL...');
    
    console.log('🔧 Creating users table (if it doesn\'t exist)...');
    await sql.query(CREATE_TABLE_SQL);
    console.log('🔧 Creating users index (if it doesn\'t exist)...');
    await sql.query(CREATE_INDEX_SQL);
    console.log('✅ Table and index verified.');

    console.log('📖 Reading users.json...');
    let users = JSON.parse(fs.readFileSync('data/users.json', 'utf8'));
    console.log(`✅ Loaded ${users.length} users`);

    console.log('🔄 Converting user IDs to UUID format...');
    users = users.map(u => ({
      ...u,
      id: idToUUID(u.id)
    }));

    console.log('🗑️  Clearing old user data in database...');
    await sql`DELETE FROM users WHERE role <> 'admin'`;

    console.log('📤 Importing users into Neon PostgreSQL...');
    for (const user of users) {
      await sql`
        INSERT INTO users (id, login, password, role, name, position, stats)
        VALUES (${user.id}, ${user.login}, ${user.password}, ${user.role}, ${user.name}, ${user.position}, ${JSON.stringify(user.stats)}::jsonb)
        ON CONFLICT (login) 
        DO UPDATE SET 
          password = EXCLUDED.password,
          name = EXCLUDED.name,
          position = EXCLUDED.position,
          stats = EXCLUDED.stats
      `;
      console.log(`  Processed: ${user.login} (${user.name})`);
    }

    console.log('\n✨ Neon PostgreSQL database setup successfully completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Critical Error setting up Neon:', error.message);
    process.exit(1);
  }
}

setupNeon();
