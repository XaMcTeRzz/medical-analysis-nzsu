import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sql } from '../../../../lib/db';

// Функція для конвертування ID в UUID
function idToUUID(id) {
  if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash('md5').update(String(id || '')).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// Функція для отримання користувачів (з Neon або файлової системи)
async function getUsers() {
  if (sql) {
    try {
      const data = await sql`SELECT * FROM users`;
      if (data) {
        return data;
      }
    } catch (err) {
      console.warn('Помилка завантаження користувачів із Neon:', err?.message || err);
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
    console.error('Помилка читання файлу користувачів:', err);
    return [];
  }
}

// Функція для оновлення файлу користувачів (для локальної розробки)
async function saveUsers(users) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Відмова від збереження локальних даних у production');
    return false;
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'users.json');
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Помилка збереження користувачів:', err);
    return false;
  }
}

// Функція для оновлення пароля в базі даних
async function updatePasswordInDatabase(userId, newPassword) {
  if (sql) {
    try {
      await sql`UPDATE users SET password = ${newPassword} WHERE id = ${userId}`;
      console.log('Пароль оновлено в Neon PostgreSQL');
      return { success: true };
    } catch (err) {
      console.error('Помилка оновлення пароля в Neon:', err);
      return { success: false, error: err.message || 'Neon update failed' };
    }
  }

  if (process.env.NODE_ENV === 'production') {
    const message = 'DATABASE_URL не налаштовано в production. Збереження пароля неможливе.';
    console.error(message);
    return { success: false, error: message };
  }

  const users = await getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return { success: false, error: 'Користувача не знайдено у локальному файлі' };
  }
  
  users[userIndex].password = newPassword;
  return { success: await saveUsers(users) };
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const authId = cookieStore.get('auth')?.value;

    if (!authId) {
      return NextResponse.json({ success: false, error: 'Не авторизовано' }, { status: 401 });
    }

    const users = await getUsers();

    // Check if the current user is admin
    const currentUser = users.find(u => u.id === authId);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Немає прав доступу' }, { status: 403 });
    }

    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ success: false, error: 'Некоректні дані' }, { status: 400 });
    }

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return NextResponse.json({ success: false, error: 'Користувача не знайдено' }, { status: 404 });
    }

    // Update the password
    const result = await updatePasswordInDatabase(userId, newPassword);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Помилка при оновленні пароля' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: 'Внутрішня помилка сервера' }, { status: 500 });
  }
}
