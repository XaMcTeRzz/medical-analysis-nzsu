import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sql } from '../../../../lib/db';

function idToUUID(id) {
  if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash('md5').update(String(id || '')).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

async function getUsers() {
  if (sql) {
    try {
      const data = await sql`SELECT * FROM users`;
      if (data) {
        return data;
      }
    } catch (err) {
      console.warn('Error loading users from Neon:', err?.message || err);
    }
  }

  const filePath = path.join(process.cwd(), 'data', 'users.json');
  try {
    const fileData = fs.readFileSync(filePath, 'utf8');
    let users = JSON.parse(fileData);
    users = users.map(u => ({
      ...u,
      id: idToUUID(u.id)
    }));
    return users;
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const authId = cookieStore.get('auth')?.value;

    if (!authId) {
      return NextResponse.json({ success: false, error: 'Не авторизовано' }, { status: 401 });
    }

    const users = await getUsers();
    const currentUser = users.find(u => u.id === authId);

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Немає прав доступу' }, { status: 403 });
    }

    // Delete in Neon if configured
    if (sql) {
      try {
        await sql`DELETE FROM users WHERE role <> 'admin'`;
        console.log('Database cleared in Neon PostgreSQL');
      } catch (err) {
        console.error('Error deleting from Neon:', err);
        return NextResponse.json({ success: false, error: err.message || 'Neon deletion failed' }, { status: 500 });
      }
    }

    // Also clear the local JSON file if it exists (only in development)
    if (process.env.NODE_ENV !== 'production') {
      try {
        const usersFilePath = path.join(process.cwd(), 'data', 'users.json');
        if (fs.existsSync(usersFilePath)) {
          const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
          const adminsOnly = usersData.filter(u => u.role === 'admin');
          fs.writeFileSync(usersFilePath, JSON.stringify(adminsOnly, null, 2));
        }
      } catch (err) {
        console.warn('Не вдалося очистити users.json локально:', err.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
