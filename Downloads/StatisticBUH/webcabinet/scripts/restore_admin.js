const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not defined!');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const usersFilePath = path.join(__dirname, '../data/users.json');

function idToUUID(id) {
  const hash = crypto.createHash('md5').update(id).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

async function restoreAdmin() {
    const adminUser = {
        id: idToUUID('admin'),
        login: 'admin',
        password: 'password', // fallback
        role: 'admin',
        name: 'Адміністратор',
        stats: {}
    };
    adminUser.password = '59847216';

    let usersData = [];
    if (fs.existsSync(usersFilePath)) {
        usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    }

    // Replace if exists in JSON
    usersData = usersData.filter(u => u.login !== 'admin');
    usersData.unshift(adminUser);
    fs.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2), 'utf8');
    
    // Add to Neon
    console.log('Restoring admin to Neon PostgreSQL...');
    try {
        await sql`
            INSERT INTO users (id, login, password, role, name, position, stats)
            VALUES (${adminUser.id}, ${adminUser.login}, ${adminUser.password}, ${adminUser.role}, ${adminUser.name}, 'Адміністратор', ${JSON.stringify(adminUser.stats)}::jsonb)
            ON CONFLICT (login) 
            DO UPDATE SET 
                password = EXCLUDED.password,
                name = EXCLUDED.name,
                stats = EXCLUDED.stats
        `;
        console.log('Admin restored to Neon successfully');
    } catch (err) {
        console.error('Error inserting admin to Neon:', err);
    }
}
restoreAdmin();
