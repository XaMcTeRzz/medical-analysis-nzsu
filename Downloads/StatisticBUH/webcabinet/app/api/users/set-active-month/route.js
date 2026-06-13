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
      console.warn('Supabase error, using fallback:', err);
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

async function saveUsers(users) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Declining local save in production');
    return false;
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'users.json');
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving users file:', err);
    return false;
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

    const { month } = await request.json();
    if (!month) {
      return NextResponse.json({ success: false, error: 'Місяць не вказано' }, { status: 400 });
    }

    const lowerMonth = month.toLowerCase().trim();

    // Update active salary month for all users (non-admins)
    const updatedUsers = users.map(user => {
      if (user.role === 'admin') return user;

      if (user.stats?.salaries && user.stats.salaries[lowerMonth]) {
        user.stats.salary = user.stats.salaries[lowerMonth];
      }
      return user;
    });

    if (sql) {
      try {
        for (const user of updatedUsers) {
          await sql`
            UPDATE users 
            SET stats = ${JSON.stringify(user.stats)}::jsonb, position = ${user.position}
            WHERE id = ${user.id}
          `;
        }
      } catch (err) {
        console.error('Neon error setting active month:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // Save locally
    if (process.env.NODE_ENV !== 'production') {
      await saveUsers(updatedUsers);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set active month error:', error);
    return NextResponse.json({ success: false, error: 'Внутрішня помилка сервера' }, { status: 500 });
  }
}
